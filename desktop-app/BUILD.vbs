' Folder Architect - Build Executable
' Creates a standalone .exe file without showing terminal

Option Explicit

Dim WshShell, fso, appPath, result, distPath, tempPath, objWMI, objProcess

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
appPath = fso.GetParentFolderName(WScript.ScriptFullName)
distPath = appPath & "\release"

' Check if node_modules exists
If Not fso.FolderExists(appPath & "\node_modules") Then
    MsgBox "Dependencies not installed!" & vbCrLf & vbCrLf & _
           "Please run INSTALL.vbs first.", vbExclamation, "Folder Architect"
    WScript.Quit 1
End If

' Kill any processes that might lock files
WshShell.Run "taskkill /f /im electron.exe", 0, True
WshShell.Run "taskkill /f /im ""Folder Architect.exe""", 0, True
WScript.Sleep 1000

' Use rename strategy to avoid lock issues
If fso.FolderExists(distPath) Then
    ' Rename old dist to a temp name (this usually works even with locks)
    tempPath = appPath & "\dist_old_" & Replace(Replace(Replace(Now, "/", ""), ":", ""), " ", "_")
    On Error Resume Next
    fso.MoveFolder distPath, tempPath
    If Err.Number <> 0 Then
        Err.Clear
        ' If rename fails, try force delete
        WshShell.Run "cmd /c rd /s /q """ & distPath & """", 0, True
        WScript.Sleep 3000

        ' If still exists, warn user
        If fso.FolderExists(distPath) Then
            Dim response
            response = MsgBox("The dist folder is locked by another process." & vbCrLf & vbCrLf & _
                   "Please close VS Code and any file explorer windows showing the dist folder." & vbCrLf & vbCrLf & _
                   "Click Retry after closing, or Cancel to abort.", vbRetryCancel + vbExclamation, "Folder Architect - Build")

            If response = vbRetry Then
                WshShell.Run "cmd /c rd /s /q """ & distPath & """", 0, True
                WScript.Sleep 2000
                If fso.FolderExists(distPath) Then
                    MsgBox "Still cannot delete dist folder. Please manually delete it and try again.", vbExclamation, "Folder Architect - Build"
                    WScript.Quit 1
                End If
            Else
                WScript.Quit 1
            End If
        End If
    End If
    On Error GoTo 0
End If

' Clean up old dist folders in background
On Error Resume Next
Dim folder
For Each folder In fso.GetFolder(appPath).SubFolders
    If Left(folder.Name, 9) = "dist_old_" Then
        WshShell.Run "cmd /c rd /s /q """ & folder.Path & """", 0, False
    End If
Next
On Error GoTo 0

MsgBox "Building Folder Architect..." & vbCrLf & vbCrLf & _
       "This will create a standalone executable." & vbCrLf & _
       "The process may take a few minutes." & vbCrLf & vbCrLf & _
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
           "- Files are locked by VS Code or file explorer" & vbCrLf & _
           "- Close any programs viewing the dist folder" & vbCrLf & vbCrLf & _
           "Check build_log.txt for details.", vbExclamation, "Folder Architect - Build"
End If
