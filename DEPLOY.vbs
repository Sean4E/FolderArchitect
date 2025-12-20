' Folder Architect - Deploy to GitHub Pages
' This script pushes the web version to GitHub

Option Explicit

Dim WshShell, fso, appPath, result

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
appPath = fso.GetParentFolderName(WScript.ScriptFullName)

' Check if gh is authenticated
WshShell.CurrentDirectory = appPath
result = WshShell.Run("cmd /c ""C:\Program Files\GitHub CLI\gh.exe"" auth status > deploy_log.txt 2>&1", 0, True)

If result <> 0 Then
    MsgBox "GitHub CLI not authenticated!" & vbCrLf & vbCrLf & _
           "Please run the following in a terminal:" & vbCrLf & _
           "gh auth login" & vbCrLf & vbCrLf & _
           "Then run this script again.", vbExclamation, "Folder Architect - Deploy"

    ' Open terminal for login
    WshShell.Run "cmd /k ""C:\Program Files\GitHub CLI\gh.exe"" auth login", 1, False
    WScript.Quit 1
End If

MsgBox "Deploying Folder Architect to GitHub Pages..." & vbCrLf & vbCrLf & _
       "This will push the web version to:" & vbCrLf & _
       "https://sean4e.github.io/FolderArchitect" & vbCrLf & vbCrLf & _
       "Click OK to continue.", vbInformation, "Folder Architect - Deploy"

' Git commands
WshShell.Run "cmd /c git add . >> deploy_log.txt 2>&1", 0, True
WshShell.Run "cmd /c git commit -m ""Deploy Folder Architect"" >> deploy_log.txt 2>&1", 0, True
WshShell.Run "cmd /c git branch -M main >> deploy_log.txt 2>&1", 0, True
result = WshShell.Run("cmd /c git push -u origin main >> deploy_log.txt 2>&1", 0, True)

If result = 0 Then
    ' Enable GitHub Pages
    WshShell.Run "cmd /c ""C:\Program Files\GitHub CLI\gh.exe"" repo edit --enable-wiki=false >> deploy_log.txt 2>&1", 0, True

    MsgBox "Deployment Complete!" & vbCrLf & vbCrLf & _
           "Your app is now available at:" & vbCrLf & _
           "https://sean4e.github.io/FolderArchitect" & vbCrLf & vbCrLf & _
           "(It may take a few minutes to go live)" & vbCrLf & vbCrLf & _
           "You still need to enable Pages in GitHub settings.", vbInformation, "Folder Architect - Deploy"

    ' Open GitHub Pages settings
    WshShell.Run "cmd /c start https://github.com/Sean4E/FolderArchitect/settings/pages", 0, False
Else
    MsgBox "Deployment may have failed!" & vbCrLf & vbCrLf & _
           "Check deploy_log.txt for details." & vbCrLf & vbCrLf & _
           "If this is a new repo, you may need to:" & vbCrLf & _
           "1. Create the repo on GitHub first" & vbCrLf & _
           "2. Run this script again", vbExclamation, "Folder Architect - Deploy"
End If
