Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\4edes\Documents\4E_Docs\4E_HTML\FolderStructure\desktop-app"
WshShell.Run "npm start", 0, False
