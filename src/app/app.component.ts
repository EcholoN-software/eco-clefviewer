import { AfterViewInit, Component, HostBinding, NgZone, OnInit } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FilterConfig } from './filter/filter.component';
import { IpcService } from './ipc/ipc.service';
import { IPCEvent } from './shared/ipcevents';
import { LogMessage } from './shared/logmessage';
import { AppSettings } from './shared/appsettings';

const DARKMODE_NAME = 'darkMode';

export enum Messages {
  no_log = "No log loaded",
  parsing = "Parsing log",
  not_supported = "This log type is not supported",
  error = "An error occurred, see console for more info",
  success_parsing = "Log parsed successfully"
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {

  @HostBinding('class') className = '';

  file: File;
  log: LogMessage[] = [];

  filterConfig: FilterConfig;
  selectedItems: string[] = [];
  filteredItems: string[] = [];
  filteredLevels: string[] = [];
  levels: string[] = [];
  loading = false;
  watchMode = false;
  appsettings: AppSettings = {darkmode: true, drawerOpen: false};
  appVersion = "N/A";

  constructor(private snackBar: MatSnackBar, private readonly ipcService: IpcService, private zone: NgZone) {

    this.ipcService.on(IPCEvent.APPVERSION, (event, version) => {
      this.zone.run(() => {
        this.appVersion = version;
      });
    });

    this.ipcService.on(IPCEvent.LOADSETTINGS, (event, settings: AppSettings) => {
      this.zone.run(() => {
        this.appsettings = settings;
        if (this.appsettings.darkmode) {
          this.className = DARKMODE_NAME;
        }
      });
    });

    this.ipcService.on(IPCEvent.FILECHUNK, (event, chunk) => {
      this.zone.run(() => {
        if (Array.isArray(chunk) && chunk.length > 0) {
          this.log = [...this.log, ...chunk];
        }
      });
    });

    this.ipcService.on(IPCEvent.FILELOADED, (event, lastchunk) => {
      this.zone.run(() => {
        if (Array.isArray(lastchunk) && lastchunk.length > 0) {
          this.log = [...this.log, ...lastchunk];
          this.filterConfig = this.createFilterConfig(this.log);
          this.showMessage(Messages.success_parsing);
          this.loading = false;
        }
      });
    });

    this.ipcService.on(IPCEvent.PARSINGFILE, () => {
      this.zone.run(() => {
        this.loading = true;
        this.showMessage(Messages.parsing);
      });
    });

    this.ipcService.on(IPCEvent.FILECHANGE, (event, newLines) => {
      this.zone.run(() => {
        if (Array.isArray(newLines) && newLines.length > 0) {
          this.log = [...this.log, ...newLines];
          this.filterConfig = this.createFilterConfig(this.log);
        }
      });
    });

    this.ipcService.on(IPCEvent.ERROR, (event, error) => {
      this.zone.run(() => {
        this.showMessage(Messages.error, true);
        console.error(error);
      });
    });

    document.ondragover = () => {
      return false;
    };

    document.ondragleave = () => {
      return false;
    };

    document.ondragend = () => {
      return false;
    };

    document.ondrop = (dragEvent: DragEvent) => {
      dragEvent.preventDefault();
      if (dragEvent.dataTransfer?.files && dragEvent.dataTransfer.files.length > 0) {
        ipcService.send(IPCEvent.FILEDROP, dragEvent.dataTransfer.files[0].path);
      }
      return false;
    };
  }

  ngOnInit(): void {
    if (this.appsettings.darkmode) this.className = DARKMODE_NAME
  }

  ngAfterViewInit(): void {
    this.ipcService.send(IPCEvent.APPREADY);
  }

  onWatchModeChange(event: MatCheckboxChange) {
    this.watchMode = event.checked;
    this.ipcService.send(event.checked ? IPCEvent.WATCHFILE : IPCEvent.UNWATCHFILE);
  }

  openFile() {
    this.ipcService.send(IPCEvent.OPENFILE);
  }

  /**
   * Creates config for filter. Parsing contexts of each LogMessage,
   * splitting them by '.' and creating an object structure out of it.
   * Also creates array with all found log levels
   * @param messages Messages to parse
   * @returns FilterConfig which was created
   */
  private createFilterConfig(messages: LogMessage[]): FilterConfig {
    const filter: any = {};
    const levels: string[] = [];
    messages.forEach(message => {
      const sourceContext = message.params['SourceContext'];
      if (sourceContext != null && typeof (sourceContext) == 'string') {
        let current = filter;
        const path = sourceContext.split('.');
        while (path.length > 0 && current != null) {
          const name = path.shift();
          if (name != null) {
            if (current[name] == null) {
              current[name] = {};
              current = current[name];
            } else {
              current = current[name];
            }
          } else {
            current = null;
          }
        }
      }

      const level = message.l;
      if (levels.indexOf(level) === -1) {
        levels.push(level);
      }
    });
    return { filter, levels };
  }

  /**
   * Shows a toast message for 2.5s.
   * @param message Message to show
   */
  private showMessage(message: string, error = false) {
    this.snackBar.open(message, undefined, {
      panelClass: error ? 'error-notification' : 'info-notification'
    });
  }

  onDarkModeToggle(event: MatSlideToggleChange) {
    this.className = event.checked ? DARKMODE_NAME : '';
    this.appsettings.darkmode = event.checked;
    this.ipcService.send(IPCEvent.SAVESETTINGS, this.appsettings);
  }

  toggleDrawer() {
    this.appsettings.drawerOpen = !this.appsettings.drawerOpen;
    this.ipcService.send(IPCEvent.SAVESETTINGS, this.appsettings);
  }
}
