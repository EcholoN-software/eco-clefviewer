export enum IPCEvent {
  APPREADY = 'appready',
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