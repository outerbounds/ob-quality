---
description: Run the Sesame MCP installation for the user's OS — verify GitHub CLI and auth, download and inspect the installer from Anaconda-Sandbox/sesame, register the MCP server with Claude Code or Claude Desktop, and add sesame to PATH.
model: sonnet
allowed-tools: Read, Bash(mktemp:*), Bash(gh api:*), Bash(gh auth status:*), Bash(jq:*), Bash(mkdir:*), Bash(cp:*), Bash(command -v:*), Bash(which:*), Bash(grep:*), Bash(printf:*), Bash(dirname:*), Bash(less:*), Bash(source ~/.zshrc), Bash(source ~/.bashrc), Bash(claude mcp list:*), Bash(claude mcp add:*), Bash([:*)
version: 1.17.1
---

Run the Sesame MCP installation for the user's OS.

> **Scope:** Distributed to consumer projects by `npx anaconda-pw-setup` (source: `templates/commands/install-sesame.md` in `@anaconda/playwright-utils`). Installs the Sesame MCP server on this machine; downloading the installer requires GitHub authentication with access to the private `Anaconda-Sandbox/sesame` repository.

> **Approval steps (by design):** A few steps pause for your approval instead of running automatically — installing the GitHub CLI, `gh auth login`, and running the downloaded installer. They install software, authenticate, or execute a downloaded script, so they stay gated on purpose; approve each when prompted. Everything else (temp files, `gh api` reads, `jq`, config writes, and `claude mcp` registration) is pre-authorized.

0.  Check if Sesame is already installed and registered:

    Run these checks first — if Sesame is present, skip the installer entirely.
    - **macOS/Linux** — check binary and MCP registration:
      ```bash
      SESAME_BIN="$HOME/.local/share/sesame/venv/bin/sesame"
      if [ -x "$SESAME_BIN" ]; then
        echo "✓ Sesame binary found: $SESAME_BIN"
      else
        echo "✗ Sesame binary not found at $SESAME_BIN"
      fi
      claude mcp list 2>/dev/null | grep -i sesame \
        && echo "✓ Sesame is registered as an MCP server." \
        || echo "✗ Sesame is not registered — continue to Step 5."
      ```
    - **Windows** (PowerShell):
      ```powershell
      $possibleSesamePaths = @(
        "$env:LOCALAPPDATA\sesame\venv\Scripts\sesame.exe",
        "$env:LOCALAPPDATA\Programs\sesame\venv\Scripts\sesame.exe",
        "$env:LOCALAPPDATA\Programs\Sesame\venv\Scripts\sesame.exe"
      )
      $sesameCommand = $possibleSesamePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
      if ($sesameCommand) {
        Write-Host "✓ Sesame binary found: $sesameCommand" -ForegroundColor Green
      } else {
        Write-Host "✗ Sesame binary not found — proceed with installation." -ForegroundColor Yellow
      }
      $mcpList = claude mcp list 2>$null
      if ($mcpList -match 'sesame') {
        Write-Host "✓ Sesame is registered as an MCP server." -ForegroundColor Green
      } else {
        Write-Host "✗ Sesame is not registered — continue to Step 5." -ForegroundColor Yellow
      }
      ```

    **Decision:**
    - Binary found **and** MCP registered → already fully installed. Nothing to do. Stop here.
    - Binary found **but** MCP not registered → skip to Step 5 (MCP registration).
    - Binary not found → proceed from Step 1.

1.  Check if GitHub CLI is installed:

    > **Why:** The GitHub CLI (`gh`) is required to authenticate and download the Sesame installer from the private Anaconda-Sandbox repository.
    - **macOS/Linux**:
      ```bash
      which gh
      ```
    - **Windows** (PowerShell):
      ```powershell
      Get-Command gh
      ```

    If not installed, install it for your platform:
    - **macOS**:
      ```bash
      brew install gh
      ```
    - **Linux**:

      ```bash
      # Quick option (Debian/Ubuntu) — only works if the GitHub apt repo is already configured:
      sudo apt install gh
      ```

      Or install via the official GitHub CLI package repository:

      ```bash
      curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
      sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
      sudo apt update
      sudo apt install gh
      ```

      > **Note:** The `apt` example is for Debian/Ubuntu-based systems only. Linux package managers vary by distro. If you are on Fedora/RHEL, use `dnf`; on Arch, use `pacman`; on SUSE, use `zypper`; or follow the official docs at https://cli.github.com/manual/installation.

    - **Windows** (PowerShell):
      ```powershell
      winget install --id GitHub.cli
      ```
      Or visit https://cli.github.com for other installation methods.

2.  Check GitHub CLI authentication status:

    > **Why:** You must be authenticated with GitHub to access the private Anaconda-Sandbox/sesame repository. Without authentication, the install command in Step 3 will fail.
    - **macOS/Linux**:
      ```bash
      gh auth status
      ```
      If you are not authenticated, run:
      ```bash
      gh auth login
      ```
    - **Windows** (PowerShell):
      ```powershell
      gh auth status
      ```
      If you are not authenticated, run:
      ```powershell
      gh auth login
      ```

    **SAML SSO error (Anaconda-Sandbox org):** If `gh auth status` shows authenticated but the installer later fails with "SAML SSO" or "re-authorize" in the error, the GitHub CLI OAuth app is not yet authorized for the Anaconda-Sandbox org. Fix it without running any terminal command:
    1. Open this URL in your browser: https://github.com/settings/connections/applications
    2. Find **GitHub CLI** in the list and click **Configure SSO**
    3. Click **Authorize** next to **Anaconda-Sandbox**
    4. Re-run `/install-sesame`

3.  Run the install command safely:

    > **Why:** This downloads the Sesame installer script first, so you can inspect it before running it. The command below fetches the installer from the repository default branch.
    - **macOS/Linux**:
      ```bash
      TMP_INSTALL="$(mktemp)"
      gh api "repos/Anaconda-Sandbox/sesame/contents/install" -H "Accept: application/vnd.github.raw+json" > "$TMP_INSTALL" \
        && [ -s "$TMP_INSTALL" ] \
        || { echo "Installer download failed — check gh auth status and repo access." >&2; rm -f "$TMP_INSTALL"; exit 1; }
      less "$TMP_INSTALL"
      bash "$TMP_INSTALL"
      rm -f "$TMP_INSTALL"
      ```
    - **Windows** (PowerShell):
      ```powershell
      $tmpInstall = Join-Path $env:TEMP 'sesame-install.ps1'
      # Out-File -Encoding utf8 keeps the script byte-true ('>' writes UTF-16 in Windows PowerShell 5.1)
      gh api "repos/Anaconda-Sandbox/sesame/contents/install.ps1" -H "Accept: application/vnd.github.raw+json" | Out-File -FilePath $tmpInstall -Encoding utf8
      if ($LASTEXITCODE -ne 0 -or -not (Get-Content $tmpInstall -Raw)) {
        Write-Error "Installer download failed — check gh auth status and repo access."
        return
      }
      Get-Content $tmpInstall
      powershell -ExecutionPolicy Bypass -File $tmpInstall
      Remove-Item -Path $tmpInstall -Force -ErrorAction SilentlyContinue
      ```

4.  Check for and create Claude Desktop config if needed:

    > **Why:** Step 5 needs to merge Sesame into the Claude Desktop config file. This step ensures the config directory and file exist first — without them, the merge in Step 5 would fail. Creates an empty `{}` JSON file if none exists.
    - **macOS**:
      ```bash
      CONFIG_DIR="$HOME/Library/Application Support/Claude"
      CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
      mkdir -p "$CONFIG_DIR"
      if [ ! -f "$CONFIG_FILE" ]; then
        echo '{}' > "$CONFIG_FILE"
      fi
      ```
    - **Linux**:

      ```bash
      CONFIG_DIR="$HOME/.config/claude"
      CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
      mkdir -p "$CONFIG_DIR"
      if [ ! -f "$CONFIG_FILE" ]; then
        echo '{}' > "$CONFIG_FILE"
      fi
      ```

      > **Note:** Claude Desktop has no official Linux build; community builds vary and some use `~/.config/Claude` (capitalized). Verify your build's config directory first — or, if you are using Claude Code, skip the Desktop config entirely and use the `claude mcp add` flow in Step 5.

    - **Windows** (PowerShell):
      ```powershell
      $configDir = "$env:APPDATA\Claude"
      $configFile = "$configDir\claude_desktop_config.json"
      if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force -ErrorAction Stop | Out-Null
      }
      if (-not (Test-Path $configFile)) {
        @{} | ConvertTo-Json | Set-Content -Path $configFile -ErrorAction Stop
      }
      ```

5.  Add Sesame MCP server configuration to Claude Desktop config:

    > **Why:** Claude Desktop uses `claude_desktop_config.json` to know which MCP servers are available. This step adds the Sesame server entry to `mcpServers`, merging it with any existing servers (like anaconda-mcp) so nothing is overwritten.
    >
    > **Note:** The Sesame installer script currently uses `${HOME}/.local/share/sesame` for its data and virtualenv directories on both Linux and macOS. That is why the `SESAME_COMMAND` path is set to `$HOME/.local/share/sesame/venv/bin/sesame` here.

    **For Claude Code users:** If you are running this command inside Claude Code (not Claude Desktop), use the simpler `claude mcp add` command below instead—it avoids the jq dependency and JSON merging altogether:
    - **macOS/Linux**:
      ```bash
      claude mcp add sesame "$HOME/.local/share/sesame/venv/bin/sesame"
      ```
    - **Windows** (PowerShell):
      ```powershell
      $possibleSesamePaths = @(
        "$env:LOCALAPPDATA\sesame\venv\Scripts\sesame.exe",
        "$env:LOCALAPPDATA\Programs\sesame\venv\Scripts\sesame.exe",
        "$env:LOCALAPPDATA\Programs\Sesame\venv\Scripts\sesame.exe"
      )
      $sesameCommand = $possibleSesamePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
      if ($sesameCommand) {
        claude mcp add sesame "$sesameCommand"
      } else {
        Write-Error "Could not locate sesame.exe. Please verify the installed location."
      }
      ```

    **For Claude Desktop users:** Follow the manual config merge steps below:
    - **macOS**:

      ```bash
      CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
      SESAME_COMMAND="$HOME/.local/share/sesame/venv/bin/sesame"

      # Pre-flight check: ensure jq is available
      if ! command -v jq >/dev/null 2>&1; then
        echo "jq not found. Install jq manually or run: brew install jq" >&2
        exit 1
      fi

      # Start from an empty config when none exists yet (matches the Windows branch).
      [ -f "$CONFIG_FILE" ] || { mkdir -p "$(dirname "$CONFIG_FILE")" && printf '{}\n' > "$CONFIG_FILE"; }

      TMP_MERGED="$(mktemp)"
      trap 'rm -f "$TMP_MERGED"' EXIT

      # Set/replace only the sesame entry: other servers and top-level keys are preserved, and a
      # re-run replaces the entry wholesale (stale keys such as old args or env do not survive).
      # The && chain leaves the existing config untouched if jq fails (e.g. malformed JSON).
      jq --arg cmd "$SESAME_COMMAND" '.mcpServers.sesame = { command: $cmd }' "$CONFIG_FILE" > "$TMP_MERGED" \
        && cp "$TMP_MERGED" "$CONFIG_FILE" \
        && echo "✓ Sesame MCP server configuration added successfully."
      ```

      > **Note:** After updating `claude_desktop_config.json`, restart Claude Desktop so it reloads the new MCP server configuration.

    - **Linux**:

      ```bash
      CONFIG_FILE="$HOME/.config/claude/claude_desktop_config.json"
      SESAME_COMMAND="$HOME/.local/share/sesame/venv/bin/sesame"

      # Pre-flight check: ensure jq is available
      if ! command -v jq >/dev/null 2>&1; then
        echo "jq not found. Install jq manually or run: sudo apt install jq" >&2
        exit 1
      fi

      # Start from an empty config when none exists yet (matches the Windows branch).
      [ -f "$CONFIG_FILE" ] || { mkdir -p "$(dirname "$CONFIG_FILE")" && printf '{}\n' > "$CONFIG_FILE"; }

      TMP_MERGED="$(mktemp)"
      trap 'rm -f "$TMP_MERGED"' EXIT

      # Set/replace only the sesame entry: other servers and top-level keys are preserved, and a
      # re-run replaces the entry wholesale (stale keys such as old args or env do not survive).
      # The && chain leaves the existing config untouched if jq fails (e.g. malformed JSON).
      jq --arg cmd "$SESAME_COMMAND" '.mcpServers.sesame = { command: $cmd }' "$CONFIG_FILE" > "$TMP_MERGED" \
        && cp "$TMP_MERGED" "$CONFIG_FILE" \
        && echo "✓ Sesame MCP server configuration added successfully."
      ```

      > **Note:** After updating `claude_desktop_config.json`, restart Claude Desktop so it reloads the new MCP server configuration.

    - **Windows** (PowerShell):

      ```powershell
      $configFile = "$env:APPDATA\Claude\claude_desktop_config.json"
      $possibleSesamePaths = @(
        "$env:LOCALAPPDATA\sesame\venv\Scripts\sesame.exe",
        "$env:LOCALAPPDATA\Programs\sesame\venv\Scripts\sesame.exe",
        "$env:LOCALAPPDATA\Programs\Sesame\venv\Scripts\sesame.exe"
      )
      $sesameCommand = $possibleSesamePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
      if (-not $sesameCommand) {
        Write-Error "Could not locate sesame.exe. Please verify the installed location and update the config manually."
        return
      }

      # Read existing config or create empty object
      if (Test-Path $configFile) {
        $config = Get-Content $configFile -Raw | ConvertFrom-Json
      } else {
        $config = [pscustomobject]@{}
      }

      # Ensure mcpServers exists — created as [pscustomobject] to match what ConvertFrom-Json
      # yields, so the add below works identically on fresh and existing configs.
      if (-not $config.PSObject.Properties.Match('mcpServers')) {
        $config | Add-Member -MemberType NoteProperty -Name mcpServers -Value ([pscustomobject]@{})
      }

      # Add sesame configuration. -Force both creates and replaces the property: on re-run, the
      # sesame entry is replaced (not merged recursively). This is the intended behavior.
      $config.mcpServers | Add-Member -MemberType NoteProperty -Name sesame -Value @{ command = $sesameCommand } -Force

      # Write back to file
      $config | ConvertTo-Json -Depth 10 | Set-Content -Path $configFile
      Write-Host "✓ Sesame MCP server configuration added successfully." -ForegroundColor Green
      ```

      > **Note:** After updating `claude_desktop_config.json`, restart Claude Desktop so it reloads the new MCP server configuration.

6.  Add sesame to PATH:

    > **Why:** Adding Sesame to your PATH allows you to run the `sesame` command from any terminal without specifying the full path. This makes it easier to use Sesame tools directly from the command line.

    > **Important:** Updating `~/.zshrc`, `~/.bashrc`, or PowerShell profile only affects _new_ shells launched after the change. If you are running this inside Claude Code, **you must restart Claude Code or open a new terminal** for the PATH change to take effect. Claude Code's Bash tool inherits the environment when it starts; it will not automatically pick up changes to your shell config.
    - **macOS**: Append to `~/.zshrc` (idempotent — skips when already present; optionally do the same for `~/.zprofile` for login shells):

      ```bash
      grep -qF 'sesame/venv/bin' ~/.zshrc 2>/dev/null \
        || echo 'export PATH="$HOME/.local/share/sesame/venv/bin:$PATH"' >> ~/.zshrc
      ```

      Then reload your shell and confirm:

      ```bash
      source ~/.zshrc
      command -v sesame >/dev/null && echo "✓ sesame is on PATH." || echo "sesame not found on PATH — check the install location." >&2
      ```

    - **Linux**: Append to `~/.bashrc` (idempotent — skips when already present):
      ```bash
      grep -qF 'sesame/venv/bin' ~/.bashrc 2>/dev/null \
        || echo 'export PATH="$HOME/.local/share/sesame/venv/bin:$PATH"' >> ~/.bashrc
      ```
      Then reload your shell and confirm:
      ```bash
      source ~/.bashrc
      command -v sesame >/dev/null && echo "✓ sesame is on PATH." || echo "sesame not found on PATH — check the install location." >&2
      ```
    - **Windows**: Add to PowerShell profile ($PROFILE) or system environment variables.

      > **Note:** `$env:PATH = "..."` only updates PATH for the current PowerShell session. To keep `sesame` on PATH after you close the terminal, add the line to your PowerShell profile or update the user environment variable. If running inside Claude Code, you must **restart Claude Code** after updating system environment variables for the changes to take effect.

      ```powershell
      # Immediate access in this session:
      $env:PATH = "$env:LOCALAPPDATA\sesame\venv\Scripts;$env:PATH"

      # Persist across new PowerShell sessions (idempotent — appends only once):
      if (-not (Test-Path (Split-Path $PROFILE))) { New-Item -ItemType Directory -Path (Split-Path $PROFILE) -Force | Out-Null }
      if (-not (Test-Path $PROFILE) -or -not (Select-String -Path $PROFILE -Pattern 'sesame\\venv\\Scripts' -Quiet)) {
        Add-Content -Path $PROFILE -Value 'if (Test-Path "$env:LOCALAPPDATA\sesame\venv\Scripts") { $env:PATH = "$env:LOCALAPPDATA\sesame\venv\Scripts;$env:PATH" }'
      }

      # Then reload your profile:
      & $PROFILE

      Write-Host "✓ Sesame added to PATH successfully." -ForegroundColor Green
      ```

7.  Verify the installation:

    > **Why:** This final step confirms that Sesame was installed correctly and is accessible.
    - **Claude Code users**: Run `/sesame:status` — it checks that the MCP server is properly configured and responding.
    - **Claude Desktop users**: Restart Claude Desktop, then confirm `sesame` appears in Settings → Developer (local MCP servers) and responds in a chat.
