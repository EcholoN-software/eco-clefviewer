import { app, BrowserWindow, ipcMain, dialog, IpcMainEvent, crashReporter } from 'electron';
import { join } from "path";
import { FSWatcher, watch } from "chokidar";
import { once } from "events";
import { createReadStream, existsSync } from "fs";
import { createInterface } from "readline";
import { IPCEvent } from './src/app/shared/ipcevents';
import { createLogMessage, LogMessage } from './src/app/shared/logmessage';

crashReporter.start({
  uploadToServer: false
});

let mainWindow: BrowserWindow | null;
let watcher: FSWatcher;
let currentFile: string;
let parsedLines = 0;
const title = "Eco Clef Viewer";

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 810,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    title
  });

  const pathname = join(__dirname, `/eco-clefviewer/index.html`);
  const url = `file://${pathname}`;

  mainWindow.loadURL(
    String(Object.assign(new URL(url), {
      pathname,
      protocol: "file:",
      slashes: true
    }))
  );

  mainWindow.on('closed', () => {
    mainWindow = null;
    closeWatcher();
  })
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow()
});

ipcMain.on(IPCEvent.APPREADY, (event) => {
  if (mainWindow && process.argv.length > 1 && process.argv[1].toLowerCase().endsWith('.clef') && existsSync(process.argv[1])) {
    openFile(process.argv[1], event);
  }
});

ipcMain.on(IPCEvent.OPENFILE, (event) => {
  if (mainWindow) {
    dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'CLEF', extensions: ['clef'] }
      ],
    }).then(result => {
      if (!result.canceled && result.filePaths.length > 0) {
        openFile(result.filePaths[0], event);
      }
    });
  }
});

ipcMain.on(IPCEvent.FILEDROP, (event, path) => {
  if (typeof path === 'string' && path.toLowerCase().endsWith('.clef') && existsSync(path)) {
    openFile(path, event);
  } else {
    event.sender.send(IPCEvent.ERROR, 'Filetype unsupported or file does not exist.');
  }
});

ipcMain.on(IPCEvent.WATCHFILE, (event) => {
  if (currentFile != null) {
    watcher = watch(currentFile, { usePolling: true, interval: 1000 });
    watcher.on('change', () => processLog(currentFile, event, true));
  }
});

ipcMain.on(IPCEvent.UNWATCHFILE, (event) => {
  if (currentFile != null) {
    closeWatcher(event);
  }
});

/**
 * Triggers file parsing, sets window title, saves current file path
 * and sends status to IpcRenderer.
 * @param path Filepath
 * @param event IpcMainEvent to use for responses
 */
function openFile(path: string, event: IpcMainEvent) {
  mainWindow?.setTitle(`${title} - ${path}`);
  currentFile = path;
  event.sender.send(IPCEvent.PARSINGFILE);
  processLog(path, event);
}

/**
 * Closes the filewatcher if it exists
 * @param event IpcMainEvent to use for error reporting
 */
function closeWatcher(event?: IpcMainEvent) {
  if (watcher instanceof FSWatcher) {
    watcher.close().catch(err => {
      console.error(err);
      if (event != null) {
        event.sender.send(IPCEvent.ERROR, err);
      }
    });
  }
}

/**
 * Processes log file, creates LogMessage array and sends it to
 * the ipcRenderer.
 * @param path Path of the log to parse
 * @param event IpcMainEvent to use for response
 * @param change True if it is a filechange, false if it is a initial parsing
 */
async function processLog(path: string, event: IpcMainEvent, change = false) {
  if (!change) {
    parsedLines = 0;
  }
  try {
    const rl = createInterface({
      input: createReadStream(path),
      crlfDelay: Infinity
    });

    let lines = 0;

    const log: LogMessage[] = [];

    rl.on('line', (line) => {
      lines++;
      try {
        if (change && lines > parsedLines) {
          log.push(createLogMessage(JSON.parse(line)));
          parsedLines++;
        } else if (!change) {
          log.push(createLogMessage(JSON.parse(line)));
          parsedLines++;
          if (parsedLines % 10000 == 0) {
            event.sender.send(IPCEvent.FILECHUNK, log);
            log.length = 0;
          }
        }
      } catch (err) {
        event.sender.send(IPCEvent.ERROR, err);
      }
    });

    await once(rl, 'close');

    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`Memory usage approximately ${Math.round(used * 100) / 100} MB`);
    event.sender.send(change ? IPCEvent.FILECHANGE : IPCEvent.FILELOADED, log);
  } catch (err) {
    event.sender.send(IPCEvent.ERROR, err);
  }
};