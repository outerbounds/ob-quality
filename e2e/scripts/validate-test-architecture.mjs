import console from 'node:console';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const testsRoot = path.join(root, 'tests');
const domains = ['models', 'packages'];
const artifactDirectories = ['fixtures', 'pages', 'specs', 'testdata'];
const errors = [];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async entry => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(entryPath) : [entryPath];
    }),
  );

  return files.flat();
}

function relative(filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

function report(filePath, message) {
  errors.push(`${relative(filePath)}: ${message}`);
}

for (const artifactDirectory of artifactDirectories) {
  const directory = path.join(testsRoot, artifactDirectory);
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      report(path.join(directory, entry.name), `move TypeScript into a ${domains.join(' or ')} subdirectory`);
    }
  }
}

for (const domain of domains) {
  const oppositeDomain = domains.find(candidate => candidate !== domain);
  const domainFiles = (
    await Promise.all(artifactDirectories.map(directory => filesUnder(path.join(testsRoot, directory, domain))))
  )
    .flat()
    .filter(filePath => filePath.endsWith('.ts'));

  for (const filePath of domainFiles) {
    const source = await readFile(filePath, 'utf8');
    const forbiddenImports = [
      `@pages/${oppositeDomain}/`,
      `@testdata/${oppositeDomain}/`,
      `@${oppositeDomain}-fixture`,
      `tests/pages/${oppositeDomain}/`,
      `tests/testdata/${oppositeDomain}/`,
      `tests/fixtures/${oppositeDomain}/`,
    ];

    for (const forbiddenImport of forbiddenImports) {
      if (source.includes(forbiddenImport)) {
        report(filePath, `cross-domain import references ${forbiddenImport}`);
      }
    }

    if (relative(filePath).startsWith(`tests/specs/${domain}/`)) {
      const expectedFixture = `@${domain}-fixture`;
      const fixtureImports = source.match(/from ['"](@[^'"]*fixture[^'"]*)['"]/g) ?? [];

      if (!source.includes(`from '${expectedFixture}'`) && !source.includes(`from "${expectedFixture}"`)) {
        report(filePath, `spec must import test from ${expectedFixture}`);
      }

      if (fixtureImports.some(fixtureImport => !fixtureImport.includes(expectedFixture))) {
        report(filePath, `spec imports a fixture other than ${expectedFixture}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Test architecture validation failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Test architecture validation passed.');
}
