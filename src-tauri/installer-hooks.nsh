!include WinVer.nsh

!macro NSIS_HOOK_PREINSTALL
    ${If} ${AtMostWin8.1}
        MessageBox MB_OK|MB_ICONSTOP "This application requires Windows 10 or higher."
        Quit
    ${EndIf}
!macroend
