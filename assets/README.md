# `assets/`

Static application assets bundled with the app: application icons (`.ico`/`.png` sets),
tray/menu glyphs, and any images shipped in the binary.

Populated as the shell and packaging stages land (Stages 2 and 13). Icon *sources* live in
`design/icons/`; this directory holds the exported, build-ready assets referenced by
`src-tauri/tauri.conf.json`. Added during Stage 0 to keep the directory tracked.
