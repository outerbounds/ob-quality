import 'dotenv/config';

import { logger } from '@anaconda/playwright-utils';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const normalizeUrl = (url: string): string => (url.endsWith('/') ? url.slice(0, -1) : url);

const AUTH_BASE_URL = normalizeUrl(process.env.URL_AUTH ?? 'https://auth.anaconda.com');
const APP_URL = normalizeUrl(process.env.URL ?? 'https://ui.dev-valay.outerbounds.xyz/dashboard');

interface LoginResponse {
  redirect: string;
}

const performAuthRequest = async (operation: string, request: () => Promise<APIResponse>): Promise<APIResponse> => {
  try {
    return await request();
  } catch (error) {
    throw new Error(`${operation} request failed`, { cause: error });
  }
};

const assertSuccessfulResponse = (response: APIResponse, operation: string): void => {
  if (!response.ok()) {
    throw new Error(`${operation} failed with HTTP ${String(response.status())}`);
  }
};

const getRedirectLocation = (response: APIResponse, operation: string): string => {
  const status = response.status();

  if (status < 300 || status >= 400) {
    throw new Error(`${operation} expected an HTTP redirect but received HTTP ${String(status)}`);
  }

  const location = response.headers().location;

  if (!location) {
    throw new Error(`${operation} returned HTTP ${String(status)} without a Location header`);
  }

  return location;
};

const getLoginFlow = (loginUrl: string): string => {
  const parsedUrl = new URL(loginUrl, AUTH_BASE_URL);
  const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
  const flow = pathParts.at(-1);

  if (parsedUrl.origin !== new URL(AUTH_BASE_URL).origin || !flow || !parsedUrl.pathname.startsWith('/ui/login/')) {
    throw new Error('Authentication service returned an unexpected login URL');
  }

  return flow;
};

/** Begins the application OAuth flow and returns the auth.anaconda.com login-flow identifier. */
const authorize = async (request: APIRequestContext): Promise<string> => {
  const appResponse = await performAuthRequest('Application OAuth initialization', async () =>
    request.get(APP_URL, {
      failOnStatusCode: false,
      maxRedirects: 0,
    }),
  );
  const authorizeUrl = getRedirectLocation(appResponse, 'Application OAuth initialization');
  const parsedAuthorizeUrl = new URL(authorizeUrl, APP_URL);

  if (
    parsedAuthorizeUrl.origin !== new URL(AUTH_BASE_URL).origin ||
    parsedAuthorizeUrl.pathname !== '/api/auth/oauth2/authorize'
  ) {
    throw new Error('Application returned an unexpected OAuth authorization URL');
  }

  const authorizeResponse = await performAuthRequest('OAuth authorization', async () =>
    request.get(parsedAuthorizeUrl.href, {
      failOnStatusCode: false,
      maxRedirects: 0,
    }),
  );
  const loginUrl = getRedirectLocation(authorizeResponse, 'OAuth authorization');

  return getLoginFlow(loginUrl);
};

/** Submits credentials to the API and returns the OAuth callback URL. */
const login = async (request: APIRequestContext, flow: string, email: string, password: string): Promise<string> => {
  const response = await performAuthRequest('Password authentication', async () =>
    request.post(`${AUTH_BASE_URL}/api/auth/login/password/${encodeURIComponent(flow)}`, {
      data: { email, password },
      failOnStatusCode: false,
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
    }),
  );

  assertSuccessfulResponse(response, 'Password authentication');

  const payload = (await response.json()) as Partial<LoginResponse>;
  if (!payload.redirect) {
    throw new Error('Password authentication did not return an OAuth callback URL');
  }

  return new URL(payload.redirect, AUTH_BASE_URL).href;
};

const ensureDirectoryExists = (filePath: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

/**
 * Authenticates through the auth API and saves cookies without creating a browser or page.
 * The consuming Playwright project creates its browser context later with this storage state.
 */
export const loginAndSaveStorage = async (
  request: APIRequestContext,
  email: string,
  password: string,
  storagePath: string,
): Promise<void> => {
  if (!email || !password) {
    throw new Error('API authentication requires a configured automation-user email and password');
  }

  logger.info('Creating authenticated storage state through the API');

  const flow = await authorize(request);
  const callbackUrl = await login(request, flow, email, password);
  if (new URL(callbackUrl).origin !== new URL(AUTH_BASE_URL).origin) {
    throw new Error('Password authentication returned an unexpected OAuth callback URL');
  }
  const callbackResponse = await performAuthRequest('OAuth callback', async () =>
    request.get(callbackUrl, {
      failOnStatusCode: false,
    }),
  );

  assertSuccessfulResponse(callbackResponse, 'OAuth callback');

  if (new URL(callbackResponse.url()).origin !== new URL(APP_URL).origin) {
    throw new Error('OAuth callback did not finish on the configured application origin');
  }

  ensureDirectoryExists(storagePath);
  await request.storageState({ path: storagePath });
  logger.info('Authenticated storage state saved successfully');
};
