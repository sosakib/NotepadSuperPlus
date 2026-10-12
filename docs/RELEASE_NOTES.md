# Notepad Super Plus 1.5.0

**Feature release** · Windows 10/11 x64 · MIT

A major UI/UX and ergonomics update bringing an integrated studio title bar, seamless window controls, space-saving inline document tabs, rich file-type awareness, and refined desktop interactions inspired by the showcase film.

Updating is recommended for all users — install over the top; settings, recent files, and your session are preserved.

## Highlights

### 1. Integrated Studio Title Bar & Window Controls
- **Frameless window integration**: Native OS caption bar replaced by a sleek, integrated custom title bar (`decorations: false`).
- **Native-feel controls**: Custom Minimize, Maximize / Restore, and Close buttons with pixel-perfect Windows hover treatments (including crimson destructive close).
- **Deep drag regions**: Full support for Aero Snap, window snapping (`Win`+arrows, `Win`+`Z`), drag-to-top maximize, and title bar double-click.

### 2. Inline Tab Bar & Studio Layout
- **Recovered vertical space**: Tab strip integrated directly into the top bar beside the brand identity and new-file button, reclaiming 32–40px of screen real estate for your content.
- **File-type icons**: Document tabs now display file icons resolved dynamically by programming language and file format.

### 3. Showcase Film UI/UX Enhancements
- **Smooth animated sidebar**: Expanding and collapsing the sidebar uses a smooth cubic-bezier easing curve (`200ms cubic-bezier(0.16, 1, 0.3, 1)`), respecting OS reduced-motion preferences.
- **Active activity rail indicator**: Distinct 3px rounded pill indicator on the active tool rail button with subtle background highlights.
- **Theme Chip & Popover**: Real-time swatch showing the active theme, opening a keyboard-navigable 10-theme picker popover with live selection rings.
- **iOS-style segmented mode switch**: Pill-shaped segmented control seamlessly switching between Source, Preview, and Split view modes.
- **Live debounced search**: Real-time 200ms debounced search-as-you-type in the workspace search panel with safe matched-snippet highlight marks.
- **Custom task list checkboxes**: 18px rounded checkboxes in Markdown preview with crisp borders, accent fills, and clean white checkmarks.

### 4. Extended File & Language Support
- **Full language labeling**: Status bar labels cover all 223 highlightable extensions supported by CodeMirror (previously 56). Dotfiles (`.gitignore`, `.env`) and common non-syntax formats (`.bat`, `.csv`, `.log`) are cleanly identified.
- **Expanded Explorer context menu**: "Open with Notepad Super Plus" registered for ~85 formats via non-intrusive Windows `SystemFileAssociations`.
- **Dialog filter groups**: File open and save dialogs now offer structured groups for Code, Web & styles, Data & config, and Text.
- **Safe preview gating**: Non-Markdown files open strictly in Source mode to prevent unwanted rendering or outline mangling.

## Quality and Security

- **408 TypeScript tests** passing across 25 test suites.
- **50 Rust tests** passing.
- Window capability manifest verified under strict least-privilege constraints.
- Content Security Policy locked down: zero remote script execution, no `unsafe-eval`.

## Known Limitations

| | |
|---|---|
| **Installers are unsigned** | SmartScreen will warn on download. A code-signing certificate is a purchase, not an engineering step. See [INSTALL.md](https://github.com/sosakib/NotepadSuperPlus/blob/main/docs/INSTALL.md) for verification steps. |
| **Cold start is 0.6–1.5 s** | Most of this is Tauri/WebView2 runtime initialization before app code executes. |
| **Snap flyout on hover** | Native Windows 11 snap-layout hover menu requires unsafe win32 subclassing which is prohibited by `#![forbid(unsafe_code)]`. Windows Snap via `Win`+`Z`, Aero Snap, and drag-to-edge work as expected. |
| **Fonts are not bundled** | Inter, Geist, and JetBrains Mono are named in font stacks; on stock systems, Segoe UI and Consolas render cleanly. |

## Install

Download `Notepad.Super.Plus_1.5.0_x64-setup.exe` and run it — it upgrades previous versions in place.
Full instructions and verification details: [INSTALL.md](https://github.com/sosakib/NotepadSuperPlus/blob/main/docs/INSTALL.md).

```powershell
Get-FileHash '.\Notepad.Super.Plus_1.5.0_x64-setup.exe' -Algorithm SHA256
```

Compare against `SHA256SUMS.txt` in the release assets.

## Feedback

[GitHub Issues](https://github.com/sosakib/NotepadSuperPlus/issues) ·
full history in [CHANGELOG.md](https://github.com/sosakib/NotepadSuperPlus/blob/main/CHANGELOG.md)
