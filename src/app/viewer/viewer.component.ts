import { animate, state, style, transition, trigger } from '@angular/animations';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { LogMessage } from '../shared/logmessage';

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.scss'],
  animations: [
    trigger('detailExpand',
      [
        state('collapsed, void', style({ height: '0px' })),
        state('expanded', style({ height: '*' })),
        transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
        transition('expanded <=> void', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
      ]),
  ],
})
export class ViewerComponent implements AfterViewInit, OnChanges {

  @Input() log: LogMessage[];
  @Input() filteredItems: string[];
  @Input() filteredLevels: string[] = [];
  @Input() watchMode: boolean;
  @Output() filteredItemsChange: EventEmitter<string[]> = new EventEmitter<string[]>();

  menuTopLeftPosition = { x: '0', y: '0' };
  currentPage = 1;
  pageAmount = 0;
  displayedColumns: string[] = ['time', 'level', 'message'];
  dataSource = new MatTableDataSource<LogMessage>([]);
  expandedElement: LogMessage | null = null;

  @ViewChild('paginator') paginator: MatPaginator;
  @ViewChild(MatMenuTrigger, { static: true }) trigger: MatMenuTrigger;
  @ViewChild('pageNumber') pageNumberInput: ElementRef<HTMLInputElement>;
  @ViewChild('searchInput') searchInput: ElementRef<HTMLInputElement>;
  @ViewChild('tableContainer') tableContainer: ElementRef<HTMLElement>;

  constructor() { }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['log'] && this.log != null && this.log.length > 0) {
      this.setDataSourceData(this.log);
      this.pageAmount = Math.ceil(this.log.length / this.paginator.pageSize);
      if (this.watchMode && this.currentPage < this.pageAmount) {
        // To wait for paginator to catch up
        setTimeout(() => {
          this.paginator.lastPage();
        }, 10);
        this.tableContainer.nativeElement.scrollTop = this.tableContainer?.nativeElement?.scrollHeight;
      }
      this.applyFilter();
    }
    if ((changes['filteredItems'] && this.filteredItems != null) || (changes['filteredLevels'] && this.filteredLevels != null)) {
      this.applyFilter();
    }
  }

  onRightClick(event: MouseEvent, element: LogMessage) {
    event.preventDefault();
    this.menuTopLeftPosition.x = event.clientX + 'px';
    this.menuTopLeftPosition.y = event.clientY + 'px';
    this.trigger.menuData = { item: element };
    this.trigger.openMenu();
  }

  changePage(page: string) {
    const pageNumber = Number(page);
    if (!isNaN(pageNumber) && this.paginator.getNumberOfPages() >= pageNumber && pageNumber >= 1) {
      this.paginator.pageIndex = pageNumber - 1;
      this.paginator.page.emit({
        length: this.paginator.length,
        pageIndex: pageNumber - 1,
        pageSize: this.paginator.pageSize
      });
    } else {
      this.pageNumberInput.nativeElement.value = this.currentPage.toString();
    }
  }

  onPageChange(page: PageEvent) {
    this.pageAmount = Math.ceil(page.length / page.pageSize);
    this.currentPage = page.pageIndex + 1;
  }

  /** Filter for specific endpoint */
  filterForEndpoint(element: LogMessage) {
    const sourceContext = element.params['SourceContext'];
    if (sourceContext) {
      this.filteredItems = [sourceContext];
      this.applyFilter();
      this.filteredItemsChange.emit(this.filteredItems);
    }
  }

  /** Apply the selected filter */
  private applyFilter() {
    let filtered = this.log;
    if (this.filteredItems.length > 0) {
      filtered = filtered.filter(message => this.filteredItems.some(filterTerm => {
        const sourceContext = message.params['SourceContext'];
        if (sourceContext != null && typeof (sourceContext) == 'string') {
          return sourceContext.startsWith(filterTerm);
        }
        return false;
      }));
    }

    if (this.filteredLevels.length > 0) {
      filtered = filtered.filter(message => this.filteredLevels.includes(message.l));
    }

    this.setDataSourceData(filtered);

    this.paginator?.page.emit({
      length: this.dataSource.data.length,
      pageIndex: Math.ceil(this.dataSource.data.length / this.paginator.pageSize) >= this.paginator.pageIndex ? this.paginator.pageIndex : 0,
      pageSize: this.paginator.pageSize
    });
  }

  private setDataSourceData(data: LogMessage[]) {
    this.dataSource.data = data;
  }

  /** Apply free text search */
  applySearch() {
    const value = this.searchInput?.nativeElement?.value;
    if (value != null && typeof value === 'string' && value.length > 0) {
      this.dataSource.filter = value.trim().toLowerCase();
    } else {
      this.dataSource.filter = '';
    }
    this.applyFilter();
  }
}