' Folder Architect - Silent Installer
' This script installs dependencies and sets up the app without showing any terminal

Option Explicit

Dim WshShell, fso, scriptPath, appPath, result

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
scriptPath = fso.GetParentFolderName(WScript.ScriptFullName)
appPath = scriptPath

' Check if Node.js is installed
On Error Resume Next
result = WshShell.Run("node --version", 0, True)
On Error GoTo 0

If result <> 0 Then
    MsgBox "Node.js is not installed!" & vbCrLf & vbCrLf & _
           "Please install Node.js from https://nodejs.org" & vbCrLf & _
           "Then run this installer again.", vbExclamation, "Folder Architect - Setup"
    WScript.Quit 1
End If

' Show progress message
MsgBox "Installing Folder Architect..." & vbCrLf & vbCrLf & _
       "This will install required dependencies." & vbCrLf & _
       "Please wait while setup completes." & vbCrLf & vbCrLf & _
       "Click OK to continue.", vbInformation, "Folder Architect - Setup"

' Install npm dependencies silently
WshShell.CurrentDirectory = appPath
result = WshShell.Run("cmd /c npm install > install_log.txt 2>&1", 0, True)

If result = 0 Then
    ' Create desktop shortcut
    CreateDesktopShortcut appPath

    MsgBox "Installation Complete!" & vbCrLf & vbCrLf & _
           "Folder Architect has been installed successfully." & vbCrLf & _
           "A shortcut has been created on your desktop." & vbCrLf & vbCrLf & _
           "Double-click 'Folder Architect' to launch the app.", vbInformation, "Folder Architect - Setup"
Else
    MsgBox "Installation failed!" & vbCrLf & vbCrLf & _
           "Please check install_log.txt for details.", vbExclamation, "Folder Architect - Setup"
End If

Sub CreateDesktopShortcut(appFolder)
    Dim desktopPath, shortcut, vbsLauncher

    desktopPath = WshShell.SpecialFolders("Desktop")

    ' Create a VBS launcher that hides the console
    vbsLauncher = appFolder & "\LaunchApp.vbs"

    Dim launcher
    Set launcher = fso.CreateTextFile(vbsLauncher, True)
    launcher.WriteLine "Set WshShell = CreateObject(""WScript.Shell"")"
    launcher.WriteLine "WshShell.CurrentDirectory = """ & appFolder & """"
    launcher.WriteLine "WshShell.Run ""npm start"", 0, False"
    launcher.Close

    ' Create shortcut to the VBS launcher
    Set shortcut = WshShell.CreateShortcut(desktopPath & "\Folder Architect.lnk")
    shortcut.TargetPath = vbsLauncher
    shortcut.WorkingDirectory = appFolder
    shortcut.Description = "Folder Architect - Create folder structures easily"
    shortcut.IconLocation = appFolder & "\assets\icon.ico,0"
    shortcut.Save
End Sub
