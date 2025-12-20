' Folder Architect - Build Executable
' Creates a standalone .exe file without showing terminal

Option Explicit

Dim WshShell, fso, appPath, result, distPath

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
appPath = fso.GetParentFolderName(WScript.ScriptFullName)
distPath = appPath & "\dist"

' Check if node_modules exists
If Not fso.FolderExists(appPath & "\node_modules") Then
    MsgBox "Dependencies not installed!" & vbCrLf & vbCrLf & _
           "Please run INSTALL.vbs first.", vbExclamation, "Folder Architect"
    WScript.Quit 1
End If

' Kill any running Electron processes first
WshShell.Run "taskkill /f /im electron.exe", 0, True
WshShell.Run "taskkill /f /im ""Folder Architect.exe""", 0, True
WshShell.Run "taskkill /f /im node.exe", 0, True

' Wait a moment for processes to close
WScript.Sleep 2000

' Force delete the dist folder using rd command (more reliable than VBS)
If fso.FolderExists(distPath) Then
    WshShell.Run "cmd /c rd /s /q """ & distPath & """", 0, True
    WScript.Sleep 1000
End If

' Double-check it's gone, if not try again
If fso.FolderExists(distPath) Then
    WScript.Sleep 2000
    WshShell.Run "cmd /c rd /s /q """ & distPath & """", 0, True
    WScript.Sleep 1000
End If

' Clear the winCodeSign cache (fixes symlink permission errors on Windows)
Dim cachePath
cachePath = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\electron-builder\Cache\winCodeSign"
If fso.FolderExists(cachePath) Then
    On Error Resume Next
    fso.DeleteFolder cachePath, True
    On Error GoTo 0
    WScript.Sleep 500
End If

MsgBox "Building Folder Architect..." & vbCrLf & vbCrLf & _
       "This will create a standalone executable." & vbCrLf & _
       "The process may take a few minutes." & vbCrLf & vbCrLf & _
       "IMPORTANT: Make sure the app is closed!" & vbCrLf & vbCrLf & _
       "Click OK to start building.", vbInformation, "Folder Architect - Build"

' Run the build command silently
WshShell.CurrentDirectory = appPath
result = WshShell.Run("cmd /c npm run build:win > build_log.txt 2>&1", 0, True)

If result = 0 Then
    MsgBox "Build Complete!" & vbCrLf & vbCrLf & _
           "Your executable has been created in:" & vbCrLf & _
           distPath & vbCrLf & vbCrLf & _
           "Look for 'Folder Architect Setup.exe' or" & vbCrLf & _
           "'FolderArchitect-Portable.exe'", vbInformation, "Folder Architect - Build"

    ' Open the dist folder
    WshShell.Run "explorer """ & distPath & """", 1, False
Else
    MsgBox "Build failed!" & vbCrLf & vbCrLf & _
           "Common causes:" & vbCrLf & _
           "- The app is still running (close it first)" & vbCrLf & _
           "- Files are locked by another program" & vbCrLf & vbCrLf & _
           "Check build_log.txt for details.", vbExclamation, "Folder Architect - Build"
End If
