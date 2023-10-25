export enum IPCEvent {
  APPREADY = 'appready',
  APPVERSION = 'appversion',
  LOADSETTINGS = 'loadsettings',
  SAVESETTINGS = 'savesettings',
  OPENFILE = 'openfile',
  FILELOADED = 'fileloaded',
  FILECHUNK = 'filechunk',
  PARSINGFILE = 'parsingfile',
  WATCHFILE = 'watchfile',
  UNWATCHFILE = 'unwatchfile',
  FILECHANGE = 'filechange',
  FILEDROP = 'filedrop',
  ERROR = 'error'
}