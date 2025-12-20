' Folder Architect - Silent Launcher
' Launches the app without showing any terminal window

Option Explicit

Dim WshShell, fso, appPath

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
appPath = fso.GetParentFolderName(WScript.ScriptFullName)

' Check if node_modules exists
If Not fso.FolderExists(appPath & "\node_modules") Then
    MsgBox "Dependencies not installed!" & vbCrLf & vbCrLf & _
           "Please run INSTALL.vbs first.", vbExclamation, "Folder Architect"
    WScript.Quit 1
End If

' Launch the app silently (no terminal window)
WshShell.CurrentDirectory = appPath
WshShell.Run "npm start", 0, False
