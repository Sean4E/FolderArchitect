' Silent build script - no popups
Option Explicit
Dim WshShell, fso, appPath
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appPath = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = appPath
WshShell.Run "cmd /c npx electron-builder --win --x64 > build_output.txt 2>&1", 0, True
