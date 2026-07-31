# Installing Notepad Super Plus

Windows 10 or 11, 64-bit.

## Download

Grab the latest installer from the [Releases page](https://github.com/sosakib/NotepadSuperPlus/releases).

| File | Use this if |
|---|---|
| `Notepad Super Plus_<version>_x64-setup.exe` | **Recommended.** NSIS installer, per-user, no admin rights needed. |
| `Notepad Super Plus_<version>_x64_en-US.msi` | You deploy via Group Policy, Intune or another MSI-based tool. |

## The SmartScreen warning

**The installers are not code-signed yet**, so Windows will show:

> Windows protected your PC — Microsoft Defender SmartScreen prevented an unrecognised app from starting.

This is expected, and it is what an unsigned installer looks like regardless of what it contains.
To proceed: **More info → Run anyway**.

If you would rather verify before trusting it, check the checksum first (below), and note that
every line of this app is public — you can build it yourself from source.

Code signing is on the roadmap; it needs a purchased certificate.

## Verify the download (optional)

Each release ships `SHA256SUMS.txt`.

```powershell
Get-FileHash '.\Notepad Super Plus_0.1.0_x64-setup.exe' -Algorithm SHA256
```

Compare the result against the matching line in `SHA256SUMS.txt`. They should match exactly,
case-insensitively.

## What the installer does

- Installs to `%LOCALAPPDATA%\Programs\Notepad Super Plus` (per-user — no admin prompt)
- Adds a Start Menu entry
- Registers **"Open with Notepad Super Plus"** in Explorer's right-click menu for `.md`,
  `.markdown`, `.mdown`, `.mkd`, `.mdx` and `.txt`
- Declares file associations for those extensions — it does **not** steal your existing default
  handler
- Adds an entry to *Apps & features* for uninstalling

It does not install a service, a background task, a browser extension, or an updater.

## Uninstall

**Settings → Apps → Installed apps → Notepad Super Plus → Uninstall**, or run the uninstaller
from the install directory.

The uninstaller removes the app, its Start Menu entry, and the Explorer context-menu
registrations. Your documents are never touched.

Settings and recent-files history live in `%APPDATA%\app.notepadsuperplus` and are left behind
deliberately, so reinstalling restores your preferences. Delete that folder for a clean removal.

## Building from source instead

See [BUILD.md](BUILD.md). You need Node ≥ 20, pnpm 9, Rust ≥ 1.77 and the
[Tauri 2 Windows prerequisites](https://tauri.app/start/prerequisites/).

## Privacy

No telemetry, no analytics, no network calls. The app makes no outbound connections — there is
no update check, no crash reporter, and no remote resource loading in the Markdown preview. Your
files stay on your machine.
