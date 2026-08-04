!include WinVer.nsh
!include MUI2.nsh

; ─────────────────────────────────────────────────────────────────
; PRE-INSTALL HOOK – Runs before files are copied
; ─────────────────────────────────────────────────────────────────
!macro NSIS_HOOK_PREINSTALL
    ; Require Windows 10 or higher
    ${If} ${AtMostWin8.1}
        MessageBox MB_OK|MB_ICONSTOP "Karaoke Pro requires Windows 10 (version 1903) or higher.$\n$\nPlease upgrade your operating system and try again.$\n$\nDownload Windows 10: https://microsoft.com/windows"
        Quit
    ${EndIf}
!macroend

; ─────────────────────────────────────────────────────────────────
; POST-INSTALL HOOK – Runs after files are copied
; ─────────────────────────────────────────────────────────────────
!macro NSIS_HOOK_POSTINSTALL
    ; Create a Desktop Shortcut
    CreateShortCut "$DESKTOP\Karaoke Pro.lnk" "$INSTDIR\Karaoke Pro.exe" "" "$INSTDIR\Karaoke Pro.exe" 0

    ; Create a Start Menu Entry
    CreateDirectory "$SMPROGRAMS\Karaoke Pro"
    CreateShortCut "$SMPROGRAMS\Karaoke Pro\Karaoke Pro.lnk" "$INSTDIR\Karaoke Pro.exe" "" "$INSTDIR\Karaoke Pro.exe" 0
    CreateShortCut "$SMPROGRAMS\Karaoke Pro\Uninstall Karaoke Pro.lnk" "$INSTDIR\uninstall.exe"

    ; Offer to launch the app after install
    MessageBox MB_YESNO|MB_ICONQUESTION "Karaoke Pro has been installed successfully!$\n$\nWould you like to launch Karaoke Pro now?" IDNO done
        Exec '"$INSTDIR\Karaoke Pro.exe"'
    done:
!macroend

; ─────────────────────────────────────────────────────────────────
; PRE-UNINSTALL HOOK – Runs before uninstallation
; ─────────────────────────────────────────────────────────────────
!macro NSIS_HOOK_PREUNINSTALL
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "This will completely remove Karaoke Pro from your computer.$\n$\nYour song history and playlists stored in your Documents folder will NOT be deleted." IDOK proceed
        Abort
    proceed:
!macroend

; ─────────────────────────────────────────────────────────────────
; POST-UNINSTALL HOOK – Runs after uninstallation
; ─────────────────────────────────────────────────────────────────
!macro NSIS_HOOK_POSTUNINSTALL
    ; Remove Desktop Shortcut
    Delete "$DESKTOP\Karaoke Pro.lnk"

    ; Remove Start Menu entries
    Delete "$SMPROGRAMS\Karaoke Pro\Karaoke Pro.lnk"
    Delete "$SMPROGRAMS\Karaoke Pro\Uninstall Karaoke Pro.lnk"
    RMDir "$SMPROGRAMS\Karaoke Pro"
!macroend
