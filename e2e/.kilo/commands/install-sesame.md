---
description: Install Sesame and register it as an MCP server.
---

<!-- generated from templates/commands/install-sesame.md by scripts/build-kilo-commands.js — do not edit; version: 2.1.0 -->

Install Sesame and register it with Kilo.

1. Check whether Sesame is already installed:

   ```bash
   SESAME_COMMAND="$HOME/.local/share/sesame/venv/bin/sesame"
   if [ -x "$SESAME_COMMAND" ]; then
     echo "Sesame binary found: $SESAME_COMMAND"
   else
     echo "Sesame binary not found; continue with installation."
   fi
   ```

2. Install Sesame if needed. Verify GitHub CLI authentication first, then download and inspect the installer before executing it:

   ```bash
   SESAME_COMMAND="$HOME/.local/share/sesame/venv/bin/sesame"
   if [ -x "$SESAME_COMMAND" ]; then
     echo "Sesame binary already installed: $SESAME_COMMAND"
   else
     gh auth status
     TMP_INSTALL="$(mktemp)"
     if ! gh api "repos/Anaconda-Sandbox/sesame/contents/install" -H "Accept: application/vnd.github.raw+json" > "$TMP_INSTALL"; then
       echo "Installer download failed — check gh auth status and repository access." >&2
       rm -f "$TMP_INSTALL"
       exit 1
     fi
     if [ ! -s "$TMP_INSTALL" ]; then
       echo "Installer download failed — installer payload was empty." >&2
       rm -f "$TMP_INSTALL"
       exit 1
     fi
     less "$TMP_INSTALL"
     bash "$TMP_INSTALL"
     INSTALL_EXIT_CODE=$?
     rm -f "$TMP_INSTALL"
     if [ "$INSTALL_EXIT_CODE" -ne 0 ]; then
       echo "Sesame installer failed with exit code $INSTALL_EXIT_CODE. Do not update MCP configuration." >&2
       exit 1
     fi
     if [ ! -x "$SESAME_COMMAND" ]; then
       echo "Sesame installation completed, but the executable was not found at $SESAME_COMMAND. Do not update MCP configuration; verify the installer output and install location." >&2
       exit 1
     fi
     echo "Sesame binary installed: $SESAME_COMMAND"
   fi
   ```

   On Windows, run these commands in PowerShell:

   ```powershell
   $possibleSesamePaths = @(
     "$env:LOCALAPPDATA\sesame\venv\Scripts\sesame.exe",
     "$env:LOCALAPPDATA\Programs\sesame\venv\Scripts\sesame.exe",
     "$env:LOCALAPPDATA\Programs\Sesame\venv\Scripts\sesame.exe"
   )
   $sesameCommand = $possibleSesamePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
   if ($sesameCommand) {
     Write-Host "Sesame binary already installed: $sesameCommand"
   } else {
     gh auth status
     if ($LASTEXITCODE -ne 0) {
       Write-Error "GitHub CLI authentication failed."
       return
     }
     $tmpInstall = Join-Path $env:TEMP 'sesame-install.ps1'
     gh api "repos/Anaconda-Sandbox/sesame/contents/install.ps1" -H "Accept: application/vnd.github.raw+json" | Out-File -FilePath $tmpInstall -Encoding utf8
     if ($LASTEXITCODE -ne 0 -or -not (Get-Content $tmpInstall -Raw)) {
       Write-Error "Installer download failed — check gh auth status and repository access."
       Remove-Item -Path $tmpInstall -Force -ErrorAction SilentlyContinue
       return
     }
     Get-Content $tmpInstall
     powershell -ExecutionPolicy Bypass -File $tmpInstall
     $installExitCode = $LASTEXITCODE
     Remove-Item -Path $tmpInstall -Force -ErrorAction SilentlyContinue
     if ($installExitCode -ne 0) {
       Write-Error "Sesame installer failed with exit code $installExitCode. Do not update MCP configuration."
       return
     }
     $sesameCommand = $possibleSesamePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
     if (-not $sesameCommand) {
       Write-Error "Sesame installation completed, but sesame.exe was not found. Do not update MCP configuration; verify the installer output and install location."
       return
     }
     Write-Host "Sesame binary installed: $sesameCommand"
   }
   ```

3. Register Sesame in Kilo. Check these project configuration paths from highest to lowest precedence: `.kilo/kilo.jsonc`, `.kilo/kilo.json`, `kilo.jsonc`, and `kilo.json`.

   - If none exists, create `.kilo/kilo.jsonc` with the standard setup wiring and this MCP entry. Replace `/absolute/path/to/sesame` with the installed Sesame executable's absolute path (for example, `C:\\Users\\you\\AppData\\Local\\sesame\\venv\\Scripts\\sesame.exe`).

     ```jsonc
     {
       "$schema": "https://app.kilo.ai/config.json",
       "skills": { "paths": [".claude/skills"] },
       "instructions": ["CLAUDE.md", ".kilo/instructions/agent-routing.md"],
       "mcp": {
         "sesame": {
           "type": "local",
           "command": ["/absolute/path/to/sesame"],
         },
       },
     }
     ```

   - If a configuration exists, do not edit it. Print this top-level block with the installed Sesame executable's absolute path in `command`, tell the user to merge it by hand, and stop. In this illustrative block, replace `/absolute/path/to/sesame` with that path. The block omits trailing commas so it is valid for either `.json` or `.jsonc`:

     ```jsonc
     "mcp": {
       "sesame": {
         "type": "local",
         "command": ["/absolute/path/to/sesame"]
       }
     }
     ```

4. Add Sesame to `PATH` if desired, restart Kilo, then run `/mcps` and confirm that `sesame` is enabled.
