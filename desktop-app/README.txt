================================================================================
                        FOLDER ARCHITECT - DESKTOP APP
              Create Any Folder Structure Instantly - No Terminal!
================================================================================

WHAT IS THIS?
-------------
Folder Architect is a powerful desktop application that lets you:

  - Create ANY folder structure with unlimited nested subfolders
  - Use professional templates for different industries
  - Save your own custom templates for reuse
  - Apply naming conventions (prefix, suffix, numbering, case styles)
  - Create folders INSTANTLY on your system with one click
  - Connect via WebSocket for remote control


================================================================================
                           UNDERSTANDING THE UI
================================================================================

PROJECT NAME
------------
The main folder that will contain your entire structure. This is the "root"
of your project. Example: "My_Video_Project"


ADD ROOT FOLDER vs ADD SUBFOLDER
--------------------------------
- "Add Root Folder" = Add a TOP-LEVEL folder inside your project
  Example: Your project "Video_Project" could have root folders like:
    - 01_Pre-Production
    - 02_Production
    - 03_Post-Production

- "Add Subfolder" (+ button on hover) = Add a NESTED folder inside another
  Example: Inside "01_Pre-Production" you might add:
    - Scripts
    - Storyboards
    - Casting

Think of it like a tree:
  Video_Project/                    <-- Project Name (the container)
    +-- 01_Pre-Production/          <-- Root Folder (top level)
    |     +-- Scripts/              <-- Subfolder (nested inside)
    |     +-- Storyboards/          <-- Subfolder
    +-- 02_Production/              <-- Root Folder
          +-- Footage/              <-- Subfolder
                +-- Camera_A/       <-- Sub-subfolder (infinite nesting!)


DESTINATION FOLDER
------------------
This is WHERE on your computer you want to create the folder structure.
Click "Browse" to select a location (like Desktop, Documents, or a drive).

Example:
  - Destination: C:\Users\YourName\Documents
  - Project Name: Video_Project
  - Result: Creates C:\Users\YourName\Documents\Video_Project\...


================================================================================
                              QUICK START
================================================================================

STEP 1: INSTALL (One-Time Setup)
--------------------------------
Double-click: INSTALL.vbs

This will:
  - Install all required dependencies
  - Create a desktop shortcut
  - No terminal windows will appear!

Note: You need Node.js installed. Get it from: https://nodejs.org


STEP 2: LAUNCH THE APP
----------------------
Double-click: START.vbs

Or use the desktop shortcut "Folder Architect" created during install.


STEP 3: CREATE YOUR FOLDERS
----------------------------
1. Select a template OR create your own structure
2. Click "Browse" to choose where to create the folders
3. Click "Create Folder Structure"
4. Done! All folders are created instantly!


STEP 4 (OPTIONAL): BUILD STANDALONE .EXE
-----------------------------------------
To create a shareable .exe file with your own icon:

1. First, create the icon:
   - Open generate-icon.html in a browser
   - Click "Download All Sizes"
   - Go to https://icoconvert.com/
   - Upload icon-256.png and convert to ICO
   - Save as assets/icon.ico
   - Also save icon-256.png as assets/icon.png

2. Then build:
   Double-click: BUILD.vbs

This creates:
  - dist/FolderArchitect-Portable-1.0.0.exe (run anywhere, no install)
  - dist/Folder Architect Setup 1.0.0.exe (installer with shortcuts)


================================================================================
                              TEMPLATES
================================================================================

14 Professional Templates Included:

  1. Film / Video Production
     Pre-production, Production, Post-production, Delivery, Admin

  2. Software Development
     src, tests, docs, config, scripts, public

  3. Game Development
     Assets (Art, Audio, Animations), Scripts, Scenes, Plugins

  4. Photography Project
     RAW, Edited, Exports (Web, Print, Social), Client, Admin

  5. Architecture / Design
     Briefing, Concept, Development, 3D Models, Renders, Documentation

  6. Music Production
     Project Files, Audio, MIDI, Mix, Master, Assets

  7. Course / Module (Education)
     Course Info, Weekly content, Resources, Assessments

  8. Marketing Campaign
     Strategy, Creative, Media, Execution, Reports

  9. Legal / Case Files
     Client Info, Case Documents, Correspondence, Research, Billing

  10. 3D / Blender Project
      Assets (Models, Textures, Materials), Scenes, Animation, Renders

  11. Research Project
      Literature, Data, Code, Figures, Writing, Presentations, Admin

  12. Event Planning
      Planning, Venue, Vendors, Guests, Program, Marketing, Post-Event

  13. Startup / Business
      Company, Product, Finance, Team, Marketing, Sales, Operations

  14. Personal Organizer
      Documents, Work, Projects, Photos, Learning


================================================================================
                           NAMING CONVENTIONS
================================================================================

PREFIX
------
Added to the FRONT of every folder name.
Example: Prefix "PRJ_" turns "Assets" into "PRJ_Assets"

SUFFIX
------
Added to the END of every folder name.
Example: Suffix "_2024" turns "Assets" into "Assets_2024"

AUTO-NUMBER
-----------
Adds 01_, 02_, 03_ etc. to folders at the same level.
Keeps folders sorted in order.

SEPARATOR STYLE
---------------
How words are separated:
  - Underscore: folder_name
  - Hyphen: folder-name
  - Space: folder name
  - Dot: folder.name
  - None: foldername

CASE STYLE
----------
How letters are capitalized:
  - Original: Keep as typed
  - lowercase: all small letters
  - UPPERCASE: ALL CAPS
  - Title Case: First Letter Of Each Word
  - camelCase: firstWordLowerRestCapitalized
  - PascalCase: EveryWordCapitalized


================================================================================
                           WEBSOCKET MODE
================================================================================

Folder Architect includes a WebSocket server for remote control:

1. Go to Menu > WebSocket > Start Server
2. The server runs on port 9876
3. Connect from any WebSocket client

WebSocket Commands:
  - load-template: Load a template by ID
  - create-folders: Create folders at specified path
  - get-templates: Get list of all templates
  - sync-state: Sync current state with other clients

Use Cases:
  - Control the app from automation scripts
  - Integrate with other tools
  - Build workflow automation


================================================================================
                              VS CODE USERS
================================================================================

This project is configured to run on port 5501 with Live Server.
(Your color palette app uses port 5500)

The settings are in: .vscode/settings.json

If you still have issues:
1. Close the other project's Live Server first
2. Or change the port in settings.json to another number (5502, 5503, etc.)


================================================================================
                              FILE STRUCTURE
================================================================================

desktop-app/
  +-- index.html          Main application UI
  +-- main.js             Electron main process
  +-- preload.js          Secure bridge to renderer
  +-- package.json        Dependencies and build configuration
  |
  +-- INSTALL.vbs         One-click installer (no terminal)
  +-- START.vbs           Launch app (no terminal)
  +-- BUILD.vbs           Build executable (no terminal)
  +-- README.txt          This file
  |
  +-- generate-icon.html  Tool to create app icons
  |
  +-- assets/
      +-- icon.svg        Vector icon source
      +-- icon.ico        Windows icon (create with generator)
      +-- icon.png        PNG icon (create with generator)


================================================================================
                              TROUBLESHOOTING
================================================================================

Q: "Node.js is not installed" error
A: Download and install Node.js from https://nodejs.org

Q: App doesn't start
A: Run INSTALL.vbs first to install dependencies

Q: Templates don't appear
A: The Content Security Policy was fixed - they should appear now.
   If not, try reloading with Ctrl+R

Q: Build fails
A: Make sure you have icon.ico in the assets folder.
   Check build_log.txt for details.

Q: WebSocket won't connect
A: Make sure port 9876 is not blocked by firewall

Q: Live Server opens wrong project
A: Check .vscode/settings.json - this project uses port 5501


================================================================================
                                CREDITS
================================================================================

Created with love for professionals who manage folder structures.

Built with:
  - Electron (desktop framework)
  - Node.js (runtime)
  - Pure HTML/CSS/JS (no frameworks needed!)

================================================================================
