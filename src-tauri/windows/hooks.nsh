; NSIS installer hooks for Notepad Super Plus (referenced from tauri.conf.json →
; bundle.windows.nsis.installerHooks).
;
; Adds an explicit "Open with Notepad Super Plus" entry to the Explorer context
; menu for every supported extension, and removes it again on uninstall.
; SystemFileAssociations is used so the entry appears regardless of which app
; owns the extension's default ProgID — the Windows-recommended way to extend
; a file type's verbs without stealing the default handler.
;
; SHCTX resolves to HKCU for per-user installs and HKLM for per-machine installs,
; matching wherever the rest of the install is registered.

!macro NSP_REGISTER_CONTEXT_MENU EXT
  WriteRegStr SHCTX "Software\Classes\SystemFileAssociations\${EXT}\shell\NotepadSuperPlus" "" "Open with Notepad Super Plus"
  WriteRegStr SHCTX "Software\Classes\SystemFileAssociations\${EXT}\shell\NotepadSuperPlus" "Icon" "$INSTDIR\${MAINBINARYNAME}.exe"
  WriteRegStr SHCTX "Software\Classes\SystemFileAssociations\${EXT}\shell\NotepadSuperPlus\command" "" '"$INSTDIR\${MAINBINARYNAME}.exe" "%1"'
!macroend

!macro NSP_UNREGISTER_CONTEXT_MENU EXT
  DeleteRegKey SHCTX "Software\Classes\SystemFileAssociations\${EXT}\shell\NotepadSuperPlus"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  !insertmacro NSP_REGISTER_CONTEXT_MENU ".md"
  !insertmacro NSP_REGISTER_CONTEXT_MENU ".markdown"
  !insertmacro NSP_REGISTER_CONTEXT_MENU ".mdown"
  !insertmacro NSP_REGISTER_CONTEXT_MENU ".mkd"
  !insertmacro NSP_REGISTER_CONTEXT_MENU ".mdx"
  !insertmacro NSP_REGISTER_CONTEXT_MENU ".txt"
  ; Tell Explorer the associations changed so menus refresh without a relog.
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  !insertmacro NSP_UNREGISTER_CONTEXT_MENU ".md"
  !insertmacro NSP_UNREGISTER_CONTEXT_MENU ".markdown"
  !insertmacro NSP_UNREGISTER_CONTEXT_MENU ".mdown"
  !insertmacro NSP_UNREGISTER_CONTEXT_MENU ".mkd"
  !insertmacro NSP_UNREGISTER_CONTEXT_MENU ".mdx"
  !insertmacro NSP_UNREGISTER_CONTEXT_MENU ".txt"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend
