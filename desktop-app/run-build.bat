@echo off
cd /d c:\Users\4edes\Documents\4E_Docs\4E_HTML\FolderStructure\desktop-app
echo Starting build at %date% %time% > build_output.txt
call node_modules\.bin\electron-builder.cmd --win --x64 >> build_output.txt 2>&1
echo Build completed at %date% %time% >> build_output.txt
