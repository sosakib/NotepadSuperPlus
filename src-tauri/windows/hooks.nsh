; NSIS installer hooks for Notepad Super Plus (referenced from tauri.conf.json →
; bundle.windows.nsis.installerHooks).
;
; Adds an explicit "Open with Notepad Super Plus" entry to the Explorer context
; menu for every supported extension, and removes it again on uninstall.
; SystemFileAssociations is used so the entry appears regardless of which app
; owns the extension's default ProgID — the Windows-recommended way to extend
; a file type's verbs without stealing the default handler. Nothing here changes which
; application opens a file on double-click; that restraint is deliberate, and the reasoning
; is in docs/reports/V15_AUDIT.md §7.
;
; SHCTX resolves to HKCU for per-user installs and HKLM for per-machine installs,
; matching wherever the rest of the install is registered.
;
; ---------------------------------------------------------------------------
; Windows 11 placement
; ---------------------------------------------------------------------------
; A SystemFileAssociations verb is a *legacy* shell verb, so Windows 11 lists it under
; "Show more options" (Shift+F10) rather than in the compact top-level menu. Top-level
; placement requires an IExplorerCommand COM handler with package identity — an MSIX sparse
; package plus a signed COM DLL — which is a packaging project rather than a registry change,
; and is blocked while the installers are unsigned. Windows 10 shows the entry directly.
;
; ---------------------------------------------------------------------------
; One list, two uses
; ---------------------------------------------------------------------------
; The extensions are enumerated exactly once, in NSP_EACH_EXT, which takes the macro to apply
; as a parameter. Install and uninstall therefore provably iterate the same set. The previous
; version spelled the list out separately in each hook; at six extensions that was survivable,
; but any divergence between the two leaves registry keys behind after an uninstall, and the
; list is now long enough that divergence was only a matter of time.
;
; Extensionless names (Dockerfile, Makefile, LICENSE) cannot appear here — Windows keys the
; verb on the extension. Dotfiles can: Windows treats ".gitignore" as the extension itself.
;
; Each extension is registered exactly once. Do not additionally register the "text"
; perceived-type key: extensions carrying PerceivedType=text would then match twice and show
; two identical entries in the menu.

!macro NSP_EACH_EXT ACTION
  ; Markdown and text
  !insertmacro ${ACTION} ".md"
  !insertmacro ${ACTION} ".markdown"
  !insertmacro ${ACTION} ".mdown"
  !insertmacro ${ACTION} ".mkd"
  !insertmacro ${ACTION} ".mdx"
  !insertmacro ${ACTION} ".txt"
  !insertmacro ${ACTION} ".log"
  !insertmacro ${ACTION} ".rst"
  !insertmacro ${ACTION} ".tex"
  !insertmacro ${ACTION} ".diff"
  !insertmacro ${ACTION} ".patch"

  ; Data and configuration
  !insertmacro ${ACTION} ".json"
  !insertmacro ${ACTION} ".jsonc"
  !insertmacro ${ACTION} ".yaml"
  !insertmacro ${ACTION} ".yml"
  !insertmacro ${ACTION} ".toml"
  !insertmacro ${ACTION} ".xml"
  !insertmacro ${ACTION} ".ini"
  !insertmacro ${ACTION} ".cfg"
  !insertmacro ${ACTION} ".conf"
  !insertmacro ${ACTION} ".properties"
  !insertmacro ${ACTION} ".csv"
  !insertmacro ${ACTION} ".env"
  !insertmacro ${ACTION} ".gitignore"
  !insertmacro ${ACTION} ".gitattributes"
  !insertmacro ${ACTION} ".editorconfig"
  !insertmacro ${ACTION} ".dockerfile"

  ; Web and styles
  !insertmacro ${ACTION} ".html"
  !insertmacro ${ACTION} ".htm"
  !insertmacro ${ACTION} ".css"
  !insertmacro ${ACTION} ".scss"
  !insertmacro ${ACTION} ".sass"
  !insertmacro ${ACTION} ".less"
  !insertmacro ${ACTION} ".vue"
  !insertmacro ${ACTION} ".svelte"
  !insertmacro ${ACTION} ".svg"

  ; JavaScript and TypeScript
  !insertmacro ${ACTION} ".js"
  !insertmacro ${ACTION} ".jsx"
  !insertmacro ${ACTION} ".mjs"
  !insertmacro ${ACTION} ".cjs"
  !insertmacro ${ACTION} ".ts"
  !insertmacro ${ACTION} ".tsx"

  ; Compiled and systems languages
  !insertmacro ${ACTION} ".c"
  !insertmacro ${ACTION} ".h"
  !insertmacro ${ACTION} ".cpp"
  !insertmacro ${ACTION} ".cc"
  !insertmacro ${ACTION} ".cxx"
  !insertmacro ${ACTION} ".hpp"
  !insertmacro ${ACTION} ".cs"
  !insertmacro ${ACTION} ".go"
  !insertmacro ${ACTION} ".rs"
  !insertmacro ${ACTION} ".swift"
  !insertmacro ${ACTION} ".java"
  !insertmacro ${ACTION} ".kt"
  !insertmacro ${ACTION} ".kts"
  !insertmacro ${ACTION} ".dart"
  !insertmacro ${ACTION} ".zig"
  !insertmacro ${ACTION} ".m"
  !insertmacro ${ACTION} ".mm"

  ; Scripting languages
  !insertmacro ${ACTION} ".py"
  !insertmacro ${ACTION} ".rb"
  !insertmacro ${ACTION} ".php"
  !insertmacro ${ACTION} ".lua"
  !insertmacro ${ACTION} ".pl"
  !insertmacro ${ACTION} ".r"
  !insertmacro ${ACTION} ".scala"
  !insertmacro ${ACTION} ".groovy"
  !insertmacro ${ACTION} ".gradle"
  !insertmacro ${ACTION} ".ex"
  !insertmacro ${ACTION} ".exs"
  !insertmacro ${ACTION} ".erl"
  !insertmacro ${ACTION} ".hs"
  !insertmacro ${ACTION} ".jl"
  !insertmacro ${ACTION} ".clj"
  !insertmacro ${ACTION} ".elm"

  ; Query and schema
  !insertmacro ${ACTION} ".sql"
  !insertmacro ${ACTION} ".graphql"
  !insertmacro ${ACTION} ".proto"

  ; Shell
  !insertmacro ${ACTION} ".sh"
  !insertmacro ${ACTION} ".bash"
  !insertmacro ${ACTION} ".zsh"
  !insertmacro ${ACTION} ".ps1"
  !insertmacro ${ACTION} ".psm1"
  !insertmacro ${ACTION} ".psd1"
  !insertmacro ${ACTION} ".bat"
  !insertmacro ${ACTION} ".cmd"
!macroend

!macro NSP_REGISTER_CONTEXT_MENU EXT
  WriteRegStr SHCTX "Software\Classes\SystemFileAssociations\${EXT}\shell\NotepadSuperPlus" "" "Open with Notepad Super Plus"
  WriteRegStr SHCTX "Software\Classes\SystemFileAssociations\${EXT}\shell\NotepadSuperPlus" "Icon" "$INSTDIR\${MAINBINARYNAME}.exe"
  WriteRegStr SHCTX "Software\Classes\SystemFileAssociations\${EXT}\shell\NotepadSuperPlus\command" "" '"$INSTDIR\${MAINBINARYNAME}.exe" "%1"'
!macroend

!macro NSP_UNREGISTER_CONTEXT_MENU EXT
  DeleteRegKey SHCTX "Software\Classes\SystemFileAssociations\${EXT}\shell\NotepadSuperPlus"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  !insertmacro NSP_EACH_EXT NSP_REGISTER_CONTEXT_MENU
  ; Tell Explorer the associations changed so menus refresh without a relog.
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  !insertmacro NSP_EACH_EXT NSP_UNREGISTER_CONTEXT_MENU
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend
