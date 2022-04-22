# Eco Clef Viewer
![build status](https://github.com/EcholoN-software/eco-clefviewer/actions/workflows/main.yml/badge.svg)

A simple logviewer to view, search and filter logfiles in the [CLEF Format](https://clef-json.org/).

![Screenshot with list, open item and expanded filter](demo_screenshot.png)

## Features

Demo logmessage: `{"@t":"2022-03-02T02:08:13.0327296Z","@mt":"Demo logmessage WITH template '{Template}'", "Template":"This is a Template", "SourceContext":"Demo.Context.WithTemplate","ProcessId":12345,"ThreadId":1}`

- Using the "@l" property to highlight "Warning" and "Error" loglevels
  - Filter also uses this property so you can filter by loglevel
- Parsing the "@mt" property, containing a possible message template, to correctly display the logmessage
  - If the logmessage contains a linebreak only the first line is displayed. The rest of the message is visible when expanding the message.
- Using the "SourceContext" property to build the tree for filtering. (Source context is expected to be dot seperated: "Example.Source.Context")
- Darkmode (can be toggled at the bottom of the filter sidebar)
- Watchmode
  - Can be enabled after selecting a file
  - Waits for changes, automatically jumps to the end to the logfile and displays them if any occur.
- File extension registration - .clef files will be automatically associated to Eco Clef Viewer
- Drag and Drop - you can simply drag a .clef file into the window to open it

To open the developer tools, in case of an error to read the console output, you can press `Ctrl + Shift + I`.

**BEWARE! The selected file will be completely stored in your memory. So depending on your memory size, be careful!**

## Development
Here are the npm commands you can use while developing, just use `npm run <command>`:
- start: simply starts the angular web app without the electron part
- build: builds the angular frontend
- electron:build: builds the angular frontend, and electron application and runs it
- electron:nobuild: only builds the electon application and runs it without building the frontend again
- dist:windows: builds the windows binaries
- dist:linux: builds the linux binaries
- dist: build the windows and linux binaries