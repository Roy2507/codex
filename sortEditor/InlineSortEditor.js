class InlineSortEditor {
  static activeEditor = null;

  constructor(table, options = {}) {
    this.table = typeof table === 'string' ? document.querySelector(table) : table;
    if (!this.table) {
      throw new Error('InlineSortEditor: table element not found.');
    }

    this.options = {
      rowSelector: 'tbody tr',
      sortCellSelector: '[data-sort-cell]',
      sortValueAttribute: 'data-sort-value',
      editingClass: 'is-editing',
      changedClass: 'is-sort-changed',
      inputClass: 'inline-sort-input',
      saveSort: null,
      onBeforeSort: null,
      onAfterSort: null,
      ...options
    };

    this.current = null;
    this._handleClick = this._handleClick.bind(this);
    this._handleFocusOut = this._handleFocusOut.bind(this);
    this.table.addEventListener('click', this._handleClick);
  }

  destroy() {
    this.cancelEdit();
    this.table.removeEventListener('click', this._handleClick);
  }

  getRows() {
    return Array.from(this.table.querySelectorAll(this.options.rowSelector));
  }

  getSortCell(row) {
    return row.querySelector(this.options.sortCellSelector);
  }

  beginEdit(row) {
    const cell = this.getSortCell(row);
    if (!cell || this.current?.row === row) return;

    if (InlineSortEditor.activeEditor && InlineSortEditor.activeEditor !== this) {
      InlineSortEditor.activeEditor.commitEdit();
    }
    if (this.current) {
      this.commitEdit();
    }

    const oldValue = this._getRowSortValue(row);
    row.classList.add(this.options.editingClass);
    cell.dataset.originalText = cell.textContent;
    cell.textContent = '';

    const input = document.createElement('input');
    input.type = 'number';
    input.inputMode = 'numeric';
    input.className = this.options.inputClass;
    input.value = String(oldValue);
    input.setAttribute('aria-label', '排序碼');

    input.addEventListener('keydown', (event) => this._handleKeyDown(event));
    input.addEventListener('focusout', this._handleFocusOut);

    cell.appendChild(input);
    this.current = { row, cell, input, oldValue };
    InlineSortEditor.activeEditor = this;

    input.focus();
    input.select();
  }

  commitEdit() {
    if (!this.current) return false;

    const { row, input, oldValue } = this.current;
    const requestedValue = this._parseRequestedValue(input.value, oldValue);

    this._clearEditState();
    return this.sortRow(row, requestedValue, oldValue);
  }

  cancelEdit() {
    if (!this.current) return;

    const { row, cell, oldValue } = this.current;
    this._setRowSortValue(row, oldValue);
    cell.textContent = String(oldValue);
    this._clearEditState();
  }

  sortRow(row, requestedValue, oldValue = this._getRowSortValue(row)) {
    const rows = this.getRows();
    const fromIndex = rows.indexOf(row);
    if (fromIndex === -1) return false;

    const normalizedValue = this._normalizeRequestedValue(requestedValue, rows.length);
    const toIndex = normalizedValue - 1;
    const payload = {
      table: this.table,
      row,
      rows,
      fromIndex,
      toIndex,
      oldValue,
      requestedValue,
      normalizedValue
    };

    if (this._runHook('onBeforeSort', payload) === false) {
      this._renumberRows();
      return false;
    }

    if (fromIndex !== toIndex) {
      this._moveRow(row, toIndex);
    }

    this._renumberRows(row);

    const afterPayload = {
      ...payload,
      rows: this.getRows()
    };
    this._runHook('saveSort', afterPayload);
    this._runHook('onAfterSort', afterPayload);
    return true;
  }

  _handleClick(event) {
    const cell = event.target.closest(this.options.sortCellSelector);
    if (!cell || !this.table.contains(cell)) return;

    const row = cell.closest('tr');
    if (row) {
      this.beginEdit(row);
    }
  }

  _handleKeyDown(event) {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.commitEdit();
        break;
      case 'Escape':
        event.preventDefault();
        this.cancelEdit();
        break;
      case 'Tab':
        event.preventDefault();
        this._commitAndEditAdjacent(event.shiftKey ? -1 : 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this._stepInput(-1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this._stepInput(1);
        break;
      default:
        break;
    }
  }

  _handleFocusOut() {
    window.setTimeout(() => {
      if (this.current && !this.table.contains(document.activeElement)) {
        this.commitEdit();
      }
    }, 0);
  }

  _commitAndEditAdjacent(direction) {
    if (!this.current) return;

    const currentRow = this.current.row;
    const rowsBeforeSort = this.getRows();
    const fallbackIndex = rowsBeforeSort.indexOf(currentRow);

    this.commitEdit();

    const rowsAfterSort = this.getRows();
    const currentIndex = rowsAfterSort.indexOf(currentRow);
    const baseIndex = currentIndex === -1 ? fallbackIndex : currentIndex;
    const nextIndex = Math.min(Math.max(baseIndex + direction, 0), rowsAfterSort.length - 1);

    if (rowsAfterSort[nextIndex]) {
      this.beginEdit(rowsAfterSort[nextIndex]);
    }
  }

  _stepInput(direction) {
    if (!this.current) return;

    const currentValue = this._parseRequestedValue(this.current.input.value, this.current.oldValue);
    this.current.input.value = String(currentValue + direction);
    this.current.input.select();
  }

  _moveRow(row, toIndex) {
    const rows = this.getRows().filter((item) => item !== row);
    const referenceRow = rows[toIndex] || null;
    const parent = row.parentElement;
    parent.insertBefore(row, referenceRow);
  }

  _renumberRows(changedRow = null) {
    this.getRows().forEach((row, index) => {
      const value = index + 1;
      const cell = this.getSortCell(row);
      this._setRowSortValue(row, value);
      if (cell) {
        cell.textContent = String(value);
      }
      row.classList.toggle(this.options.changedClass, row === changedRow);
    });
  }

  _clearEditState() {
    if (!this.current) return;

    const { row, input } = this.current;
    input.removeEventListener('focusout', this._handleFocusOut);
    row.classList.remove(this.options.editingClass);
    this.current = null;

    if (InlineSortEditor.activeEditor === this) {
      InlineSortEditor.activeEditor = null;
    }
  }

  _getRowSortValue(row) {
    const attrValue = row.getAttribute(this.options.sortValueAttribute);
    const cell = this.getSortCell(row);
    return this._parseRequestedValue(attrValue || cell?.textContent, 1);
  }

  _setRowSortValue(row, value) {
    row.setAttribute(this.options.sortValueAttribute, String(value));
  }

  _parseRequestedValue(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  _normalizeRequestedValue(value, maxValue) {
    if (value <= 0) return 1;
    if (value > maxValue) return maxValue;
    return value;
  }

  _runHook(name, payload) {
    const hook = this.options[name];
    if (typeof hook !== 'function') return undefined;
    return hook(payload);
  }
}

export default InlineSortEditor;
