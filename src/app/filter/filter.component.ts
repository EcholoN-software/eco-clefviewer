import { SelectionModel } from '@angular/cdk/collections';
import { FlatTreeControl } from '@angular/cdk/tree';
import { Component, EventEmitter, Injectable, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { BehaviorSubject } from 'rxjs';

/** Config for filter */
export interface FilterConfig {
  filter: Object;
  levels: string[];
}

/** Node for item */
export class FilterItemNode {
  children: FilterItemNode[];
  item: string;
}

/** Flat item node with expandable and level information */
export class FilterItemFlatNode {
  item: string;
  level: number;
  expandable: boolean;
}

/**
 * Database, it can build a tree structured Json object.
 */
@Injectable()
export class FilterDatabase {
  dataChange = new BehaviorSubject<FilterItemNode[]>([]);

  get data(): FilterItemNode[] {
    return this.dataChange.value;
  }

  setData(data: any) {
    const fileTree = this.buildFileTree(data, 0);
    this.dataChange.next(fileTree);
  }

  /**
   * Build the file structure tree. The `value` is the Json object, or a sub-tree of a Json object.
   * The return value is the list of `FilterItemNode`.
   */
  buildFileTree(obj: { [key: string]: any }, level: number): FilterItemNode[] {
    return Object.keys(obj).reduce<FilterItemNode[]>((accumulator, key) => {
      const value = obj[key];
      const node = new FilterItemNode();
      node.item = key;

      if (value != null) {
        if (typeof value === 'object') {
          node.children = this.buildFileTree(value, level + 1);
        } else {
          node.item = value;
        }
      }

      return accumulator.concat(node);
    }, []);
  }
}

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss'],
  providers: [FilterDatabase],
})
export class FilterComponent implements OnChanges {
  /** Map from flat node to nested node. This helps us finding the nested node to be modified */
  flatNodeMap = new Map<FilterItemFlatNode, FilterItemNode>();

  /** Map from nested node to flattened node. This helps us to keep the same object for selection */
  nestedNodeMap = new Map<FilterItemNode, FilterItemFlatNode>();

  treeControl: FlatTreeControl<FilterItemFlatNode>;
  treeFlattener: MatTreeFlattener<FilterItemNode, FilterItemFlatNode>;
  dataSource: MatTreeFlatDataSource<FilterItemNode, FilterItemFlatNode>;

  /** The selection */
  filterSelection = new SelectionModel<FilterItemFlatNode>(true /* multiple */);

  /** All levels */
  levels: string[] = [];

  /** Config */
  @Input() config: FilterConfig;
  /** Paths of items which are selected */
  @Input() selectedItems: string[] = [];
  /** Levels which are selected */
  @Input() selectedLevels: string[] = [];

  @Output() selectedItemsChange: EventEmitter<string[]> = new EventEmitter<string[]>();
  @Output() selectedLevelsChange: EventEmitter<string[]> = new EventEmitter<string[]>();



  constructor(private _database: FilterDatabase) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren,
    );
    this.treeControl = new FlatTreeControl<FilterItemFlatNode>(this.getLevel, this.isExpandable);
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

    _database.dataChange.subscribe(data => {
      this.dataSource.data = data;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config != null) {
      if (this.config.filter != null) {
        this._database.setData(this.config.filter);
        this.checkSelection();
      }
      if (this.config.levels != null) {
        this.levels = this.config.levels;
      }
    }
    if (changes['selectedItems'] && this.selectedItems != null) {
      this.checkSelection();
    }
  }

  /** Resets the filter */
  resetFilter() {
    this.selectedItems = [];
    this.selectedLevels = [];
    this.checkSelection();
    this.setSelectedItems();
    this.setSelectedLevels();
  }

  /** Expands only selected items */
  private checkSelection() {
    if (this.selectedItems != null) {
      this.treeControl.dataNodes.forEach(node => {
        this.filterSelection.deselect(node);
      });
      this.treeControl.collapseAll();
      this.selectedItems.forEach(item => {
        const found = this.findNodeFromPath(item);
        if (found) {
          if (found.expandable) {
            this.itemSelectionToggle(found);
          } else {
            this.leafItemSelectionToggle(found);
          }
        }
      });
    }
  }

  /** Finds a Node from its path */
  private findNodeFromPath(pathString: string): FilterItemFlatNode | undefined {
    let searchIn: FilterItemFlatNode[] = this.treeControl.dataNodes.filter(node => node.level === 0);
    let currentDepth = 0;
    let lastNode: FilterItemFlatNode | undefined = undefined;
    const path = pathString.split('.');
    let currentItem = path.shift();
    while (path.length > 0 || currentItem != null) {
      const found = searchIn.find(node => node.item === currentItem);
      if (found) {
        if (path.length > 0) {
          this.treeControl.expand(found);
        }
        lastNode = found;
        currentDepth++;
        searchIn = this.treeControl.getDescendants(lastNode).filter(node => node.level === currentDepth);
        currentItem = path.shift();
      } else {
        path.length = 0;
      }
    }
    return lastNode;
  }

  getLevel = (node: FilterItemFlatNode) => node.level;

  isExpandable = (node: FilterItemFlatNode) => node.expandable;

  getChildren = (node: FilterItemNode): FilterItemNode[] => node.children;

  hasChild = (_: number, _nodeData: FilterItemFlatNode) => _nodeData.expandable;

  /**
   * Transformer to convert nested node to flat node. Record the nodes in maps for later use.
   */
  transformer = (node: FilterItemNode, level: number) => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode =
      existingNode && existingNode.item === node.item ? existingNode : new FilterItemFlatNode();
    flatNode.item = node.item;
    flatNode.level = level;
    flatNode.expandable = !!node.children?.length;
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  };

  /** Gets paths of all selected items */
  private getAllSelectedPaths(nodes: FilterItemFlatNode[]): string[] {
    const data: string[] = [];
    nodes.forEach(node => {
      if (this.descendantsAllSelected(node)) {
        data.push(this.getStringPath(node));
      } else if (this.descendantsPartiallySelected(node)) {
        data.push(...this.getAllSelectedPaths(this.treeControl.getDescendants(node).filter(filteredNode => filteredNode.level === node.level + 1)));
      }
    });
    return data;
  }

  /** Gets path from a node */
  private getStringPath(node: FilterItemFlatNode): string {
    let name = node.item;
    if (node.level !== 0) {
      const parent = this.getParentNode(node);
      if (parent != null) {
        name = this.getStringPath(parent) + '.' + name;
      } else {
        throw new Error('Node on Level != 0 had no Parent.');
      }
    }
    return name;
  }

  /** Whether all the descendants of the node are selected. */
  descendantsAllSelected(node: FilterItemFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const descAllSelected =
      descendants.length > 0 &&
      descendants.every(child => {
        return this.filterSelection.isSelected(child);
      });
    return descAllSelected;
  }

  /** Whether part of the descendants are selected */
  descendantsPartiallySelected(node: FilterItemFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const result = descendants.some(child => this.filterSelection.isSelected(child));
    return result && !this.descendantsAllSelected(node);
  }

  /** Sets selected items and emits event */
  private setSelectedItems() {
    this.selectedItems = this.getAllSelectedPaths(this.treeControl.dataNodes.filter(node => node.level === 0));
    this.selectedItemsChange.emit(this.selectedItems);
  }

  /** Emits event for a change in selected levels */
  private setSelectedLevels() {
    this.selectedLevelsChange.emit(this.selectedLevels);
  }

  /** Add or remove level from selection based on checkbox event */
  levelToggle(event: MatCheckboxChange) {
    if (event.checked) {
      if (!this.selectedLevels.includes(event.source.value)) {
        this.selectedLevels = [...this.selectedLevels, event.source.value]
      }
    } else {
      if (this.selectedLevels.includes(event.source.value)) {
        this.selectedLevels = this.selectedLevels.filter(level => level !== event.source.value);
      }
    }
    this.setSelectedLevels();
  }

  /** Toggle the to-do item selection. Select/deselect all the descendants node */
  itemSelectionToggle(node: FilterItemFlatNode): void {
    this.filterSelection.toggle(node);
    const descendants = this.treeControl.getDescendants(node);
    this.filterSelection.isSelected(node)
      ? this.filterSelection.select(...descendants)
      : this.filterSelection.deselect(...descendants);

    // Force update for the parent
    descendants.forEach(child => this.filterSelection.isSelected(child));
    this.checkAllParentsSelection(node);
    this.setSelectedItems();
  }

  /** Toggle a leaf to-do item selection. Check all the parents to see if they changed */
  leafItemSelectionToggle(node: FilterItemFlatNode): void {
    this.filterSelection.toggle(node);
    this.checkAllParentsSelection(node);
    this.setSelectedItems();
  }

  /* Checks all the parents when a leaf node is selected/unselected */
  checkAllParentsSelection(node: FilterItemFlatNode): void {
    let parent: FilterItemFlatNode | null = this.getParentNode(node);
    while (parent) {
      this.checkRootNodeSelection(parent);
      parent = this.getParentNode(parent);
    }
  }

  /** Check root node checked state and change it accordingly */
  checkRootNodeSelection(node: FilterItemFlatNode): void {
    const nodeSelected = this.filterSelection.isSelected(node);
    const descendants = this.treeControl.getDescendants(node);
    const descAllSelected =
      descendants.length > 0 &&
      descendants.every(child => {
        return this.filterSelection.isSelected(child);
      });
    if (nodeSelected && !descAllSelected) {
      this.filterSelection.deselect(node);
    } else if (!nodeSelected && descAllSelected) {
      this.filterSelection.select(node);
    }
  }

  /* Get the parent node of a node */
  getParentNode(node: FilterItemFlatNode): FilterItemFlatNode | null {
    const currentLevel = this.getLevel(node);
    if (currentLevel < 1) {
      return null;
    }
    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;
    for (let i = startIndex; i >= 0; i--) {
      const currentNode = this.treeControl.dataNodes[i];

      if (this.getLevel(currentNode) < currentLevel) {
        return currentNode;
      }
    }
    return null;
  }
}