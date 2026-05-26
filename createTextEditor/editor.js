(function () {
  const BLOCK_SELECTOR = "p, h1, h2, h3, h4, h5, h6, blockquote, li, td, th";
  const ALLOWED_TAGS = new Set([
    "P", "BR", "H1", "H2", "H3", "H4", "BLOCKQUOTE",
    "UL", "OL", "LI", "STRONG", "EM", "U", "S", "A",
    "IMG", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD"
  ]);
  const ALLOWED_STYLE_PROPS = new Set([
    "text-align",
    "color",
    "background-color",
    "font-size",
    "font-weight",
    "font-style",
    "text-decoration",
    "width",
    "height",
    "max-width",
    "min-width",
    "border",
    "border-collapse",
    "padding",
    "margin"
  ]);

  class TextEditor {
    constructor(textarea, options = {}) {
      this.textarea = textarea;
      this.options = options;
      this.uploadUrl = options.uploadUrl || "upload.php";
      this.placeholder = options.placeholder || textarea.getAttribute("placeholder") || "請輸入內容...";
      this.state = {
        sourceMode: false,
        savedRange: null,
        history: [],
        historyIndex: -1,
        selectedImage: null,
        selectedCell: null,
        tableMenuOpen: false
      };

      this.build();
      this.bindEvents();
      this.setHtml(this.textarea.value || "<p></p>", false);
      this.saveHistory(this.textarea.value || "<p></p>", this.captureSelectionBookmark());
      this.updateStatus();
    }

    build() {
      this.textarea.hidden = true;
      this.textarea.classList.add("editor-textarea");

      this.container = document.createElement("section");
      this.container.className = "te";
      this.container.innerHTML = `
        <div class="te__toolbar">
          <div class="te__group">
            <button type="button" class="te__button" data-action="undo" title="復原">復原</button>
            <button type="button" class="te__button" data-action="redo" title="重做">重做</button>
          </div>
          <div class="te__group">
            <select class="te__select" data-role="block" title="段落格式">
              <option value="p">段落</option>
              <option value="h2">標題 2</option>
              <option value="h3">標題 3</option>
              <option value="blockquote">引用</option>
            </select>
          </div>
          <div class="te__group">
            <button type="button" class="te__button" data-action="strong" title="粗體"><strong>B</strong></button>
            <button type="button" class="te__button" data-action="em" title="斜體"><em>I</em></button>
            <button type="button" class="te__button" data-action="u" title="底線"><u>U</u></button>
            <button type="button" class="te__button" data-action="s" title="刪除線"><s>S</s></button>
          </div>
          <div class="te__group">
            <button type="button" class="te__button" data-action="align" data-value="left" title="靠左">靠左</button>
            <button type="button" class="te__button" data-action="align" data-value="center" title="置中">置中</button>
            <button type="button" class="te__button" data-action="align" data-value="right" title="靠右">靠右</button>
          </div>
          <div class="te__group">
            <button type="button" class="te__button" data-action="unordered-list" title="項目清單">清單</button>
            <button type="button" class="te__button" data-action="ordered-list" title="編號清單">編號</button>
            <button type="button" class="te__button" data-action="link" title="連結">連結</button>
            <button type="button" class="te__button" data-action="image" title="圖片">圖片</button>
          </div>
          <div class="te__group te__table-tools">
            <button type="button" class="te__button" data-action="table-menu" title="表格">表格</button>
            <div class="te__table-menu" hidden>
              <label class="te__menu-field">
                <span>列數</span>
                <input class="te__number" type="number" min="1" max="20" value="2" data-role="table-rows" title="列數">
              </label>
              <label class="te__menu-field">
                <span>欄數</span>
                <input class="te__number" type="number" min="1" max="12" value="2" data-role="table-cols" title="欄數">
              </label>
              <button type="button" class="te__button" data-action="table-insert" title="插入表格">插入表格</button>
            </div>
          </div>
          <div class="te__group">
            <button type="button" class="te__button" data-action="code" title="原始碼">原始碼</button>
            <button type="button" class="te__button" data-action="clear" title="清空">清空</button>
          </div>
        </div>
        <div class="te__image-tools" hidden>
          <label class="te__image-label">圖片寬度</label>
          <input class="te__range" type="range" min="10" max="100" value="100" data-role="image-width-range">
          <input class="te__number" type="number" min="10" max="100" value="100" data-role="image-width-number">
          <span class="te__muted">%</span>
          <button type="button" class="te__button" data-action="image-original">自動</button>
        </div>
        <div class="te__cell-tools" hidden>
          <label class="te__image-label">儲存格寬度</label>
          <input class="te__range" type="range" min="5" max="100" value="25" data-role="cell-width-range">
          <input class="te__number" type="number" min="5" max="100" value="25" data-role="cell-width-number">
          <span class="te__muted">%</span>
          <button type="button" class="te__button" data-action="cell-auto">自動</button>
          <button type="button" class="te__button" data-action="row-before">上方加列</button>
          <button type="button" class="te__button" data-action="row-after">下方加列</button>
          <button type="button" class="te__button" data-action="row-delete">刪除列</button>
          <button type="button" class="te__button" data-action="col-before">左側加欄</button>
          <button type="button" class="te__button" data-action="col-after">右側加欄</button>
          <button type="button" class="te__button" data-action="col-delete">刪除欄</button>
        </div>
        <div class="te__body">
          <div class="te__surface" contenteditable="true"></div>
          <textarea class="te__source" hidden></textarea>
        </div>
        <div class="te__status">
          <span data-role="words">0 字</span>
          <span data-role="blocks">0 段</span>
          <span data-role="mode">視覺模式</span>
        </div>
      `;

      this.surface = this.container.querySelector(".te__surface");
      this.source = this.container.querySelector(".te__source");
      this.blockSelect = this.container.querySelector('[data-role="block"]');
      this.wordsNode = this.container.querySelector('[data-role="words"]');
      this.blocksNode = this.container.querySelector('[data-role="blocks"]');
      this.modeNode = this.container.querySelector('[data-role="mode"]');
      this.tableRowsInput = this.container.querySelector('[data-role="table-rows"]');
      this.tableColsInput = this.container.querySelector('[data-role="table-cols"]');
      this.tableMenu = this.container.querySelector(".te__table-menu");
      this.imageTools = this.container.querySelector(".te__image-tools");
      this.imageWidthRange = this.container.querySelector('[data-role="image-width-range"]');
      this.imageWidthNumber = this.container.querySelector('[data-role="image-width-number"]');
      this.cellTools = this.container.querySelector(".te__cell-tools");
      this.cellWidthRange = this.container.querySelector('[data-role="cell-width-range"]');
      this.cellWidthNumber = this.container.querySelector('[data-role="cell-width-number"]');
      this.surface.dataset.placeholder = this.placeholder;

      this.textarea.insertAdjacentElement("afterend", this.container);
    }

    bindEvents() {
      this.container.querySelector(".te__toolbar").addEventListener("mousedown", (event) => {
        this.saveSelection();

        if (event.target.closest("button[data-action]")) {
          event.preventDefault();
        }
      });

      this.container.querySelectorAll("[data-action]").forEach((button) => {
        button.addEventListener("click", () => this.handleAction(button.dataset.action, button.dataset.value));
      });

      this.blockSelect.addEventListener("change", () => {
        if (!this.state.sourceMode) {
          this.applyBlock(this.blockSelect.value);
        }
      });

      this.surface.addEventListener("mouseup", () => this.saveSelection());
      this.surface.addEventListener("keyup", () => this.saveSelection());
      this.surface.addEventListener("focus", () => this.saveSelection());
      this.surface.addEventListener("input", () => {
        this.normalizeStructure();
        this.syncToTextarea();
      });

      this.surface.addEventListener("click", (event) => {
        if (event.target instanceof HTMLImageElement) {
          this.clearCellSelection();
          this.selectEditorImage(event.target);
        } else if (event.target instanceof Element && event.target.closest("td, th")) {
          this.clearImageSelection();
          this.selectTableCell(event.target.closest("td, th"));
        } else {
          this.clearImageSelection();
          this.clearCellSelection();
        }
      });

      this.source.addEventListener("input", () => {
        this.textarea.value = minifyHtml(this.cleanupHtml(this.source.value));
        this.updateStatus();
      });

      this.imageWidthRange.addEventListener("input", () => this.resizeSelectedImage(this.imageWidthRange.value));
      this.imageWidthNumber.addEventListener("change", () => this.resizeSelectedImage(this.imageWidthNumber.value));
      this.cellWidthRange.addEventListener("input", () => this.resizeSelectedCell(this.cellWidthRange.value));
      this.cellWidthNumber.addEventListener("change", () => this.resizeSelectedCell(this.cellWidthNumber.value));

      this.tableMenu.addEventListener("click", (event) => event.stopPropagation());
    }

    handleAction(action, value) {
      if (action === "undo") {
        this.moveHistory(-1);
        return;
      }

      if (action === "redo") {
        this.moveHistory(1);
        return;
      }

      if (action === "code") {
        this.toggleSourceMode();
        return;
      }

      if (action === "clear") {
        this.setHtml("<p></p>");
        this.focusEnd();
        return;
      }

      if (action === "image-original") {
        this.resetSelectedImageSize();
        return;
      }

      if (action === "cell-auto") {
        this.resetSelectedCellSize();
        return;
      }

      if (action === "row-before") {
        this.insertTableRow("before");
        return;
      }

      if (action === "row-after") {
        this.insertTableRow("after");
        return;
      }

      if (action === "row-delete") {
        this.deleteTableRow();
        return;
      }

      if (action === "col-before") {
        this.insertTableColumn("before");
        return;
      }

      if (action === "col-after") {
        this.insertTableColumn("after");
        return;
      }

      if (action === "col-delete") {
        this.deleteTableColumn();
        return;
      }

      if (action === "table-menu") {
        this.toggleTableMenu();
        return;
      }

      if (this.state.sourceMode) {
        return;
      }

      if (action === "strong" || action === "em" || action === "u" || action === "s") {
        this.applyInline(action);
        return;
      }

      if (action === "align") {
        this.applyAlignment(value);
        return;
      }

      if (action === "unordered-list") {
        this.applyList("ul");
        return;
      }

      if (action === "ordered-list") {
        this.applyList("ol");
        return;
      }

      if (action === "link") {
        const url = window.prompt("請輸入連結網址", "https://");
        if (url) {
          this.applyLink(url);
        }
        return;
      }

      if (action === "image") {
        this.selectImage();
        return;
      }

      if (action === "table-insert") {
        this.insertTable();
        this.hideTableMenu();
      }
    }

    toggleSourceMode() {
      this.state.sourceMode = !this.state.sourceMode;
      this.source.hidden = !this.state.sourceMode;
      this.surface.hidden = this.state.sourceMode;
      this.clearImageSelection();
      this.clearCellSelection();

      if (this.state.sourceMode) {
        this.source.value = beautifyHtml(this.textarea.value);
      } else {
        this.setHtml(this.source.value);
        this.focusEnd();
      }

      this.updateStatus();
    }

    setHtml(html, pushHistory = true) {
      const cleanHtml = this.cleanupHtml(html);
      this.surface.innerHTML = cleanHtml;
      this.source.value = cleanHtml;
      this.textarea.value = minifyHtml(cleanHtml);
      this.normalizeStructure();

      if (pushHistory) {
        this.saveHistory(cleanHtml, this.captureSelectionBookmark());
      }

      this.updateStatus();
    }

    getHtml() {
      const html = this.state.sourceMode
        ? this.cleanupHtml(this.source.value)
        : this.cleanupHtml(this.surface.innerHTML);
	  this.textarea.value = minifyHtml(html);
      return this.textarea.value;
    }

    syncToTextarea() {
      const selectedImage = this.state.selectedImage;
      if (selectedImage) {
        selectedImage.classList.remove("te__image--selected");
      }
      const selectedCell = this.state.selectedCell;
      if (selectedCell) {
        selectedCell.classList.remove("te__cell--selected");
      }

      const cleanHtml = this.cleanupHtml(this.surface.innerHTML);
      if (selectedImage) {
        selectedImage.classList.add("te__image--selected");
        this.state.selectedImage = selectedImage;
      } else if (selectedCell) {
        selectedCell.classList.add("te__cell--selected");
        this.state.selectedCell = selectedCell;
      }

      this.source.value = beautifyHtml(cleanHtml);
      this.textarea.value = minifyHtml(cleanHtml);
      this.saveHistory(cleanHtml, this.captureSelectionBookmark());
      this.updateStatus();
    }

    syncSelectedImageToTextarea() {
      const cleanHtml = this.cleanupHtml(this.surface.innerHTML);
      this.source.value = beautifyHtml(cleanHtml);
      this.textarea.value = minifyHtml(cleanHtml);
      this.saveHistory(cleanHtml, this.captureSelectionBookmark());
      this.updateStatus();
    }

    saveHistory(html, bookmark = null) {
      const entry = {
        html,
        bookmark
      };
      const lastValue = this.state.history[this.state.historyIndex];
      if (lastValue && lastValue.html === html) {
        if (bookmark) {
          lastValue.bookmark = bookmark;
        }
        return;
      }

      this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
      this.state.history.push(entry);
      this.state.historyIndex = this.state.history.length - 1;
    }

    updateCurrentHistoryBookmark(bookmark = null) {
      const currentEntry = this.state.history[this.state.historyIndex];
      if (!currentEntry) {
        return;
      }

      currentEntry.bookmark = bookmark || this.captureSelectionBookmark();
    }

    moveHistory(step) {
      const nextIndex = this.state.historyIndex + step;
      if (nextIndex < 0 || nextIndex >= this.state.history.length) {
        return;
      }

      this.state.historyIndex = nextIndex;
      const entry = this.state.history[nextIndex];
      this.setHtml(entry.html, false);
      if (entry.bookmark) {
        this.restoreSelectionBookmark(entry.bookmark);
      } else {
        this.focusEnd();
      }
    }

    saveSelection() {
      const range = this.getEditorRange();
      if (range) {
        this.state.savedRange = range.cloneRange();
      }
    }

    restoreSelection() {
      const liveRange = this.getEditorRange();
      if (liveRange) {
        this.state.savedRange = liveRange.cloneRange();
        return liveRange;
      }

      const selection = window.getSelection();
      if (!this.state.savedRange) {
        this.focusEnd();
        return this.getEditorRange();
      }

      selection.removeAllRanges();
      selection.addRange(this.state.savedRange);
      return this.state.savedRange;
    }

    getEditorRange() {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return null;
      }

      const range = selection.getRangeAt(0);
      const ancestor = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentNode
        : range.commonAncestorContainer;

      return this.surface.contains(ancestor) ? range : null;
    }

    focusEnd() {
      this.surface.focus();
      const range = document.createRange();
      range.selectNodeContents(this.surface);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      this.state.savedRange = range.cloneRange();
    }

    insertNode(node, placeCaretInside = false) {
      const range = this.restoreSelection();
      if (!range) {
        return;
      }

      range.deleteContents();
      range.insertNode(node);

      const nextRange = document.createRange();
      if (placeCaretInside) {
        nextRange.selectNodeContents(node);
        nextRange.collapse(false);
      } else {
        nextRange.setStartAfter(node);
        nextRange.collapse(true);
      }

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(nextRange);
      this.state.savedRange = nextRange.cloneRange();
    }

    wrapSelection(wrapper) {
      const range = this.restoreSelection();
      if (!range) {
        return false;
      }

      const fragment = range.extractContents();
      wrapper.appendChild(fragment);
      range.insertNode(wrapper);

      const nextRange = document.createRange();
      nextRange.selectNodeContents(wrapper);
      nextRange.collapse(false);

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(nextRange);
      this.state.savedRange = nextRange.cloneRange();
      return true;
    }

    applyInline(tagName) {
      const range = this.restoreSelection();
      if (!range) {
        return;
      }

      if (range.collapsed) {
        const node = document.createElement(tagName);
        node.appendChild(document.createTextNode("\u200B"));
        this.insertNode(node, true);
      } else {
        this.wrapSelection(document.createElement(tagName));
      }

      this.normalizeStructure();
      this.syncToTextarea();
    }

    applyBlock(tagName) {
      const range = this.restoreSelection();
      if (!range) {
        return;
      }

      const block = this.closestBlock(range.commonAncestorContainer);
      if (block && block !== this.surface) {
        const replacement = document.createElement(tagName);
        Array.from(block.attributes).forEach((attribute) => {
          replacement.setAttribute(attribute.name, attribute.value);
        });
        while (block.firstChild) {
          replacement.appendChild(block.firstChild);
        }
        block.parentNode.replaceChild(replacement, block);
      } else {
        this.wrapSelection(document.createElement(tagName));
      }

      this.normalizeStructure();
      this.syncToTextarea();
    }

    applyAlignment(alignment) {
      const range = this.restoreSelection();
      if (!range) {
        return;
      }

      const block = this.closestBlock(range.commonAncestorContainer);
      if (block && block !== this.surface) {
        this.setStyleDeclaration(block, "text-align", alignment);
      }

      this.syncToTextarea();
    }

    applyList(listTag) {
      const range = this.restoreSelection();
      if (!range) {
        return;
      }

      this.updateCurrentHistoryBookmark(this.createRangeBookmarks(range, this.getBookmarkBlocks()));

      const currentItem = this.closestAncestor(range.commonAncestorContainer, "li");
      const currentList = currentItem ? currentItem.parentElement : null;
      const selectedItems = range.collapsed
        ? (currentItem ? [currentItem] : [])
        : this.getSelectedListItems(range);
      if (selectedItems.length > 0 && selectedItems.every((item) => item.parentElement && item.parentElement.tagName.toLowerCase() === listTag)) {
        this.unwrapSelectedListItems(selectedItems, range);
        this.normalizeStructure();
        this.syncToTextarea();
        return;
      }

      if (currentItem && currentList && currentList.tagName.toLowerCase() === listTag) {
        const caretOffset = this.getTextOffsetInNode(currentItem, range.startContainer, range.startOffset);
        const paragraph = this.unwrapListItem(currentItem);
        this.placeCaretAtTextOffset(paragraph, caretOffset);
        this.normalizeStructure();
        this.syncToTextarea();
        return;
      }

      const otherListTag = listTag === "ul" ? "ol" : "ul";
      if (selectedItems.length > 0 && selectedItems.every((item) => item.parentElement && item.parentElement.tagName.toLowerCase() === otherListTag)) {
        this.convertSelectedListItems(selectedItems, listTag, range);
        this.normalizeStructure();
        this.syncToTextarea();
        return;
      }

      const selectedBlocks = this.getSelectedListBlocks(range).filter((block) => block.tagName !== "LI");
      const list = document.createElement(listTag);
      const bookmarks = this.createRangeBookmarks(range, selectedBlocks);

      if (selectedBlocks.length === 0) {
        const item = document.createElement("li");
        item.innerHTML = "<br>";
        list.appendChild(item);
        range.deleteContents();
        this.insertNode(list);
      } else {
        selectedBlocks.forEach((block) => {
          const item = document.createElement("li");
          item.innerHTML = block.innerHTML || "<br>";
          list.appendChild(item);
        });

        selectedBlocks[0].parentNode.insertBefore(list, selectedBlocks[0]);
        selectedBlocks.forEach((block) => block.remove());
        this.restoreRangeFromBookmarks(bookmarks, Array.from(list.children));
      }

      this.normalizeStructure();
      this.syncToTextarea();
    }

    applyLink(url) {
      const safeUrl = String(url).trim();
      if (safeUrl === "") {
        return;
      }

      const link = document.createElement("a");
      link.href = safeUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      const range = this.restoreSelection();
      if (!range) {
        return;
      }

      if (range.collapsed) {
        link.textContent = safeUrl;
        this.insertNode(link);
      } else {
        this.wrapSelection(link);
      }

      this.syncToTextarea();
    }

    insertTable() {
      const rows = clampInteger(this.tableRowsInput.value, 1, 20, 2);
      const cols = clampInteger(this.tableColsInput.value, 1, 12, 2);
      const table = document.createElement("table");
      const tbody = document.createElement("tbody");

      this.setStyleDeclaration(table, "width", "100%");
      this.setStyleDeclaration(table, "border-collapse", "collapse");

      for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
        const row = document.createElement("tr");
        for (let colIndex = 0; colIndex < cols; colIndex += 1) {
          const cell = document.createElement(rowIndex === 0 ? "th" : "td");
          // cell.textContent = rowIndex === 0 ? `標題 ${colIndex + 1}` : "內容";
          if (rowIndex === 0) {
            cell.textContent = `標題 ${colIndex + 1}`;
          } else {
            cell.style.textAlign = 'center';
            cell.textContent = "內容";
          }
          row.appendChild(cell);
        }
        tbody.appendChild(row);
      }

      table.appendChild(tbody);
      this.insertNode(table);
      this.insertNode(document.createElement("p"));
      this.normalizeStructure();
      this.syncToTextarea();
    }

    toggleTableMenu() {
      this.state.tableMenuOpen = !this.state.tableMenuOpen;
      this.tableMenu.hidden = !this.state.tableMenuOpen;
    }

    hideTableMenu() {
      this.state.tableMenuOpen = false;
      this.tableMenu.hidden = true;
    }

    selectImage() {
      const picker = document.createElement("input");
      picker.type = "file";
      picker.accept = "image/jpeg,image/png,image/gif,image/webp";
      picker.addEventListener("change", async () => {
        const file = picker.files && picker.files[0];
        if (!file) {
          return;
        }

        const formData = new FormData();
        formData.append("upload", file);

        try {
          const response = await fetch(this.uploadUrl, {
            method: "POST",
            body: formData
          });
          const data = await response.json();

          if (!response.ok || !data.url) {
            throw new Error((data.error && data.error.message) || "圖片上傳失敗。");
          }

          const paragraph = document.createElement("p");
          const image = document.createElement("img");
          image.src = data.url;
          image.alt = file.name;
          this.setStyleDeclaration(image, "max-width", "100%");
          this.setStyleDeclaration(image, "height", "auto");
          paragraph.appendChild(image);
          this.insertNode(paragraph);
          this.selectEditorImage(image);
          this.normalizeStructure();
          this.syncToTextarea();
        } catch (error) {
          window.alert(error.message || "圖片上傳失敗。");
        }
      }, { once: true });
      picker.click();
    }

    selectEditorImage(image) {
      this.clearImageSelection();
      this.state.selectedImage = image;
      image.classList.add("te__image--selected");
      this.imageTools.hidden = false;

      const widthValue = readPercentWidth(image) || 100;
      this.imageWidthRange.value = widthValue;
      this.imageWidthNumber.value = widthValue;
    }

    clearImageSelection() {
      if (this.state.selectedImage) {
        this.state.selectedImage.classList.remove("te__image--selected");
      }
      this.state.selectedImage = null;
      this.imageTools.hidden = true;
    }

    resizeSelectedImage(value) {
      const image = this.state.selectedImage;
      if (!image) {
        return;
      }

      const width = clampInteger(value, 10, 100, 100);
      this.imageWidthRange.value = width;
      this.imageWidthNumber.value = width;
      this.setStyleDeclaration(image, "width", `${width}%`);
      this.setStyleDeclaration(image, "height", "auto");
      this.setStyleDeclaration(image, "max-width", "100%");
      this.syncSelectedImageToTextarea();
    }

    selectTableCell(cell) {
      this.clearCellSelection();
      this.state.selectedCell = cell;
      cell.classList.add("te__cell--selected");
      this.cellTools.hidden = false;

      const widthValue = readPercentWidth(cell) || estimateCellWidth(cell);
      this.cellWidthRange.value = widthValue;
      this.cellWidthNumber.value = widthValue;
    }

    clearCellSelection() {
      if (this.state.selectedCell) {
        this.state.selectedCell.classList.remove("te__cell--selected");
      }
      this.state.selectedCell = null;
      this.cellTools.hidden = true;
    }

    resizeSelectedCell(value) {
      const cell = this.state.selectedCell;
      if (!cell) {
        return;
      }

      const width = clampInteger(value, 5, 100, 25);
      this.cellWidthRange.value = width;
      this.cellWidthNumber.value = width;
      this.setStyleDeclaration(cell, "width", `${width}%`);
      this.syncSelectedCellToTextarea();
    }

    resetSelectedCellSize() {
      const cell = this.state.selectedCell;
      if (!cell) {
        return;
      }

      cell.style.removeProperty("width");
      this.cellWidthRange.value = estimateCellWidth(cell);
      this.cellWidthNumber.value = estimateCellWidth(cell);
      this.syncSelectedCellToTextarea();
    }

    insertTableRow(position) {
      const cell = this.state.selectedCell;
      const row = cell ? cell.closest("tr") : null;
      if (!row) {
        return;
      }

      const newRow = document.createElement("tr");
      Array.from(row.children).forEach((existingCell) => {
        const newCell = document.createElement(existingCell.tagName.toLowerCase());
        newCell.innerHTML = "<br>";
        newRow.appendChild(newCell);
      });

      if (position === "before") {
        row.parentNode.insertBefore(newRow, row);
      } else {
        row.parentNode.insertBefore(newRow, row.nextSibling);
      }

      this.selectTableCell(newRow.children[Math.min(cell.cellIndex, newRow.children.length - 1)]);
      this.syncSelectedCellToTextarea();
    }

    deleteTableRow() {
      const cell = this.state.selectedCell;
      const row = cell ? cell.closest("tr") : null;
      const table = cell ? cell.closest("table") : null;
      if (!row || !table) {
        return;
      }

      const rows = Array.from(table.querySelectorAll("tr"));
      if (rows.length <= 1) {
        table.remove();
        this.clearCellSelection();
        this.syncToTextarea();
        return;
      }

      const nextRow = row.nextElementSibling || row.previousElementSibling;
      const nextIndex = Math.min(cell.cellIndex, nextRow.children.length - 1);
      row.remove();
      this.selectTableCell(nextRow.children[nextIndex]);
      this.syncSelectedCellToTextarea();
    }

    insertTableColumn(position) {
      const cell = this.state.selectedCell;
      const table = cell ? cell.closest("table") : null;
      if (!cell || !table) {
        return;
      }

      const targetIndex = cell.cellIndex + (position === "after" ? 1 : 0);
      table.querySelectorAll("tr").forEach((row) => {
        const referenceCell = row.children[targetIndex] || null;
        const sampleCell = row.children[Math.max(0, Math.min(cell.cellIndex, row.children.length - 1))];
        const newCell = document.createElement(sampleCell ? sampleCell.tagName.toLowerCase() : "td");
        newCell.innerHTML = "<br>";
        row.insertBefore(newCell, referenceCell);
      });

      const selectedRow = cell.closest("tr");
      this.selectTableCell(selectedRow.children[targetIndex]);
      this.syncSelectedCellToTextarea();
    }

    deleteTableColumn() {
      const cell = this.state.selectedCell;
      const table = cell ? cell.closest("table") : null;
      if (!cell || !table) {
        return;
      }

      const columnIndex = cell.cellIndex;
      const maxColumns = Math.max(...Array.from(table.querySelectorAll("tr")).map((row) => row.children.length));
      if (maxColumns <= 1) {
        table.remove();
        this.clearCellSelection();
        this.syncToTextarea();
        return;
      }

      let nextCell = null;
      table.querySelectorAll("tr").forEach((row) => {
        const cellToRemove = row.children[columnIndex];
        if (!cellToRemove) {
          return;
        }

        if (!nextCell && row === cell.closest("tr")) {
          nextCell = row.children[columnIndex + 1] || row.children[columnIndex - 1] || null;
        }
        cellToRemove.remove();
      });

      if (nextCell && nextCell.isConnected) {
        this.selectTableCell(nextCell);
      } else {
        this.clearCellSelection();
      }
      this.syncSelectedCellToTextarea();
    }

    syncSelectedCellToTextarea() {
      const selectedCell = this.state.selectedCell;
      if (selectedCell) {
        selectedCell.classList.remove("te__cell--selected");
      }

      const cleanHtml = this.cleanupHtml(this.surface.innerHTML);
      this.source.value = beautifyHtml(cleanHtml);
      this.textarea.value = minifyHtml(cleanHtml);
      this.saveHistory(cleanHtml, this.captureSelectionBookmark());
      this.updateStatus();

      if (selectedCell) {
        selectedCell.classList.add("te__cell--selected");
        this.state.selectedCell = selectedCell;
      }
    }

    resetSelectedImageSize() {
      const image = this.state.selectedImage;
      if (!image) {
        return;
      }

      image.style.removeProperty("width");
      this.setStyleDeclaration(image, "height", "auto");
      this.setStyleDeclaration(image, "max-width", "100%");
      this.imageWidthRange.value = 100;
      this.imageWidthNumber.value = 100;
      this.syncSelectedImageToTextarea();
    }

    closestBlock(node) {
      let current = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
      while (current && current !== this.surface) {
        if (current.matches && current.matches(BLOCK_SELECTOR)) {
          return current;
        }
        current = current.parentNode;
      }
      return this.surface;
    }

    closestAncestor(node, tagName) {
      let current = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
      const targetTag = tagName.toUpperCase();
      while (current && current !== this.surface) {
        if (current.tagName === targetTag) {
          return current;
        }
        current = current.parentNode;
      }
      return null;
    }

    getSelectedListBlocks(range) {
      const blockSelector = "p, h1, h2, h3, h4, blockquote, li";
      const blocks = Array.from(this.surface.querySelectorAll(blockSelector)).filter((block) => {
        return range.intersectsNode(block);
      });

      if (blocks.length > 0) {
        return blocks;
      }

      const block = this.closestBlock(range.commonAncestorContainer);
      return block && block !== this.surface ? [block] : [];
    }

    unwrapListItem(item) {
      const list = item.parentElement;
      const paragraph = document.createElement("p");
      paragraph.innerHTML = item.innerHTML || "<br>";
      list.parentNode.insertBefore(paragraph, list.nextSibling);
      item.remove();

      if (list.children.length === 0) {
        list.remove();
      }

      return paragraph;
    }

    getSelectedListItems(range) {
      if (range.collapsed) {
        const item = this.closestAncestor(range.commonAncestorContainer, "li");
        return item ? [item] : [];
      }

      return Array.from(this.surface.querySelectorAll("li")).filter((item) => {
        return range.intersectsNode(item);
      });
    }

    unwrapSelectedListItems(items, range) {
      const bookmarks = this.createRangeBookmarks(range, items);
      const paragraphs = this.rebuildListsWithSelectedItems(items, "unwrap");
      this.restoreRangeFromBookmarks(bookmarks, paragraphs);
    }

    convertSelectedListItems(items, listTag, range) {
      const bookmarks = this.createRangeBookmarks(range, items);
      const convertedItems = this.rebuildListsWithSelectedItems(items, "convert", listTag);
      this.restoreRangeFromBookmarks(bookmarks, convertedItems);
    }

    rebuildListsWithSelectedItems(items, mode, targetListTag = null) {
      const groups = [];

      items.forEach((item) => {
        const list = item.parentElement;
        let group = groups.find((entry) => entry.list === list);
        if (!group) {
          group = {
            list,
            items: []
          };
          groups.push(group);
        }
        group.items.push(item);
      });

      const rebuiltTargets = [];
      groups.forEach((group) => {
        const selectedSet = new Set(group.items);
        const fragment = document.createDocumentFragment();
        let currentUnselectedList = null;
        let currentConvertedList = null;

        Array.from(group.list.children).forEach((item) => {
          if (selectedSet.has(item)) {
            currentUnselectedList = null;

            if (mode === "unwrap") {
              const paragraph = document.createElement("p");
              paragraph.innerHTML = item.innerHTML || "<br>";
              fragment.appendChild(paragraph);
              rebuiltTargets.push(paragraph);
              return;
            }

            if (!currentConvertedList) {
              currentConvertedList = document.createElement(targetListTag);
              fragment.appendChild(currentConvertedList);
            }

            const convertedItem = document.createElement("li");
            convertedItem.innerHTML = item.innerHTML || "<br>";
            currentConvertedList.appendChild(convertedItem);
            rebuiltTargets.push(convertedItem);
            return;
          }

          currentConvertedList = null;
          if (!currentUnselectedList) {
            currentUnselectedList = document.createElement(group.list.tagName.toLowerCase());
            copyElementAttributes(group.list, currentUnselectedList);
            fragment.appendChild(currentUnselectedList);
          }

          const clonedItem = document.createElement("li");
          clonedItem.innerHTML = item.innerHTML || "<br>";
          currentUnselectedList.appendChild(clonedItem);
        });

        group.list.parentNode.replaceChild(fragment, group.list);
      });

      return rebuiltTargets;
    }

    placeCaretAtTextOffset(node, offset) {
      const textPosition = findTextPosition(node, offset);
      const range = document.createRange();
      range.setStart(textPosition.node, textPosition.offset);
      range.collapse(true);

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      this.state.savedRange = range.cloneRange();
    }

    captureSelectionBookmark() {
      const range = this.getEditorRange() || this.state.savedRange;
      if (!range) {
        return null;
      }

      const blocks = this.getBookmarkBlocks();
      if (blocks.length === 0) {
        return null;
      }

      return this.createRangeBookmarks(range, blocks);
    }

    restoreSelectionBookmark(bookmark) {
      const blocks = this.getBookmarkBlocks();
      this.restoreRangeFromBookmarks(bookmark, blocks);
    }

    getBookmarkBlocks() {
      const blocks = Array.from(this.surface.querySelectorAll("p, h1, h2, h3, h4, blockquote, li, td, th"));
      return blocks.length > 0 ? blocks : [this.surface];
    }

    createRangeBookmarks(range, blocks) {
      if (blocks.length === 0) {
        return {
          collapsed: true,
          startBlockIndex: 0,
          endBlockIndex: 0,
          startOffset: 0,
          endOffset: 0
        };
      }

      const startBlockIndex = blocks.findIndex((block) => block.contains(range.startContainer));
      const endBlockIndex = blocks.findIndex((block) => block.contains(range.endContainer));
      const safeStartIndex = startBlockIndex === -1 ? 0 : startBlockIndex;
      const safeEndIndex = endBlockIndex === -1 ? safeStartIndex : endBlockIndex;

      return {
        collapsed: range.collapsed,
        startBlockIndex: safeStartIndex,
        endBlockIndex: safeEndIndex,
        startOffset: this.getTextOffsetInNode(blocks[safeStartIndex], range.startContainer, range.startOffset),
        endOffset: this.getTextOffsetInNode(blocks[safeEndIndex], range.endContainer, range.endOffset)
      };
    }

    restoreRangeFromBookmarks(bookmarks, newBlocks) {
      if (newBlocks.length === 0) {
        return;
      }

      const startBlock = newBlocks[Math.min(bookmarks.startBlockIndex, newBlocks.length - 1)];
      const endBlock = newBlocks[Math.min(bookmarks.endBlockIndex, newBlocks.length - 1)];
      const startPosition = findTextPosition(startBlock, bookmarks.startOffset);
      const endPosition = bookmarks.collapsed
        ? startPosition
        : findTextPosition(endBlock, bookmarks.endOffset);

      const nextRange = document.createRange();
      nextRange.setStart(startPosition.node, startPosition.offset);
      if (bookmarks.collapsed) {
        nextRange.collapse(true);
      } else {
        nextRange.setEnd(endPosition.node, endPosition.offset);
      }

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(nextRange);
      this.state.savedRange = nextRange.cloneRange();
    }

    restoreRangeInConvertedBlocks(originalRange, blocks) {
      const selectedBlocks = blocks.flatMap((block) => Array.from(block.querySelectorAll("li")));
      if (selectedBlocks.length === 0) {
        this.placeCaretAtTextOffset(blocks[0], 0);
        return;
      }

      const firstItem = selectedBlocks[0];
      const offset = this.getTextOffsetInNode(firstItem, originalRange.startContainer, originalRange.startOffset);
      this.placeCaretAtTextOffset(firstItem, offset);
    }

    getTextOffsetInNode(root, container, offset) {
      if (!root) {
        return 0;
      }

      let total = 0;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();

      while (node) {
        if (node === container) {
          return total + offset;
        }
        total += node.textContent.length;
        node = walker.nextNode();
      }

      return Math.min(total, offset);
    }

    normalizeStructure() {
      Array.from(this.surface.childNodes).forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "") {
          const paragraph = document.createElement("p");
          paragraph.textContent = node.textContent;
          this.surface.replaceChild(paragraph, node);
        }
      });

      if (this.surface.innerHTML.trim() === "") {
        this.surface.innerHTML = "<p></p>";
      }
    }

    cleanupHtml(html) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = String(html || "");

      wrapper.querySelectorAll("script, iframe, object, embed, link, meta").forEach((node) => node.remove());

      wrapper.querySelectorAll("*").forEach((node) => {
        if (!ALLOWED_TAGS.has(node.tagName)) {
          unwrapNode(node);
          return;
        }

        Array.from(node.attributes).forEach((attribute) => {
          const name = attribute.name.toLowerCase();
          if (name.startsWith("on")) {
            node.removeAttribute(attribute.name);
            return;
          }

          if (name === "style") {
            const safeStyle = sanitizeStyle(attribute.value);
            if (safeStyle) {
              node.setAttribute("style", safeStyle);
            } else {
              node.removeAttribute("style");
            }
            return;
          }

          if (node.tagName === "A" && !["href", "target", "rel"].includes(name)) {
            node.removeAttribute(attribute.name);
            return;
          }

          if (node.tagName === "IMG" && !["src", "alt"].includes(name)) {
            node.removeAttribute(attribute.name);
            return;
          }

          if (!["A", "IMG"].includes(node.tagName)) {
            node.removeAttribute(attribute.name);
          }
        });

        if (node.tagName === "A" && node.hasAttribute("href")) {
          node.setAttribute("target", "_blank");
          node.setAttribute("rel", "noopener noreferrer");
        }
      });

      return wrapper.innerHTML.trim() || "<p></p>";
    }

    setStyleDeclaration(node, property, value) {
      const style = parseStyle(node.getAttribute("style") || "");
      style.set(property, value);
      node.setAttribute("style", serializeStyle(style));
    }

    updateStatus() {
      const text = (this.state.sourceMode ? this.source.value : this.surface.textContent).trim();
      const wordCount = text ? text.split(/\s+/).length : 0;
      const blockCount = this.surface.querySelectorAll(BLOCK_SELECTOR).length;

      this.wordsNode.textContent = `${wordCount} 字`;
      this.blocksNode.textContent = `${blockCount} 段`;
      this.modeNode.textContent = this.state.sourceMode ? "原始碼模式" : "視覺模式";
    }
  }

  function clampInteger(value, min, max, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, parsed));
  }

  function readPercentWidth(element) {
    const match = (element.getAttribute("style") || "").match(/(?:^|;)\s*width\s*:\s*(\d+(?:\.\d+)?)%/i);
    return match ? clampInteger(match[1], 10, 100, 100) : null;
  }

  function estimateCellWidth(cell) {
    const row = cell.parentElement;
    if (!row) {
      return 25;
    }

    const cells = row.querySelectorAll("th, td").length || 4;
    return clampInteger(Math.round(100 / cells), 5, 100, 25);
  }

  function findTextPosition(root, targetOffset) {
    const safeOffset = Math.max(0, targetOffset);
    let remaining = safeOffset;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    let lastTextNode = null;

    while (node) {
      lastTextNode = node;
      const length = node.textContent.length;
      if (remaining <= length) {
        return { node, offset: remaining };
      }
      remaining -= length;
      node = walker.nextNode();
    }

    if (lastTextNode) {
      return { node: lastTextNode, offset: lastTextNode.textContent.length };
    }

    root.appendChild(document.createTextNode(""));
    return { node: root.firstChild, offset: 0 };
  }

  function parseStyle(styleText) {
    const style = new Map();
    String(styleText || "").split(";").forEach((declaration) => {
      const separatorIndex = declaration.indexOf(":");
      if (separatorIndex === -1) {
        return;
      }

      const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
      const value = declaration.slice(separatorIndex + 1).trim();
      if (isSafeStyleDeclaration(property, value)) {
        style.set(property, normalizeStyleValue(property, value));
      }
    });
    return style;
  }

  function serializeStyle(style) {
    return Array.from(style.entries())
      .map(([property, value]) => `${property}:${value}`)
      .join(";");
  }

  function sanitizeStyle(styleText) {
    return serializeStyle(parseStyle(styleText));
  }

  function isSafeStyleDeclaration(property, value) {
    const normalizedValue = String(value || "").trim().toLowerCase();
    if (!ALLOWED_STYLE_PROPS.has(property) || normalizedValue === "") {
      return false;
    }

    if (
      normalizedValue.includes("expression") ||
      normalizedValue.includes("javascript:") ||
      normalizedValue.includes("vbscript:") ||
      normalizedValue.includes("url(")
    ) {
      return false;
    }

    if (["width", "height", "max-width", "min-width", "font-size", "padding", "margin"].includes(property)) {
      return /^-?\d+(\.\d+)?(px|em|rem|%|vh|vw)?$/i.test(normalizedValue);
    }

    if (property === "text-align") {
      return /^(left|center|right|justify)$/i.test(normalizedValue);
    }

    if (property === "font-weight") {
      return /^(normal|bold|[1-9]00)$/i.test(normalizedValue);
    }

    if (property === "font-style") {
      return /^(normal|italic|oblique)$/i.test(normalizedValue);
    }

    if (property === "text-decoration") {
      return /^(none|underline|line-through|overline)$/i.test(normalizedValue);
    }

    if (property === "border-collapse") {
      return /^(collapse|separate)$/i.test(normalizedValue);
    }

    if (property === "border") {
      return /^(\d+(\.\d+)?px\s+)?(solid|dashed|dotted|double)\s+(#[0-9a-f]{3,8}|[a-z]+|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))$/i.test(normalizedValue);
    }

    if (["color", "background-color"].includes(property)) {
      return /^(#[0-9a-f]{3,8}|[a-z]+|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0|1|0?\.\d+)\s*\))$/i.test(normalizedValue);
    }

    return false;
  }

  function normalizeStyleValue(property, value) {
    if (["width", "height", "max-width", "min-width", "font-size", "padding", "margin"].includes(property) && /^-?\d+(\.\d+)?$/i.test(value)) {
      return `${value}px`;
    }
    return value.trim();
  }
  
  function beautifyHtml(html) {
    const compactHtml = minifyHtml(html);
    if (compactHtml === "") {
      return "";
    }

    const tokens = compactHtml
      .replace(/></g, ">\n<")
      .split("\n")
      .map((token) => token.trim())
      .filter(Boolean);
    const lines = [];
    let depth = 0;

    tokens.forEach((token) => {
      if (/^<\/[^>]+>/.test(token)) {
        depth = Math.max(depth - 1, 0);
      }

      lines.push(`${"  ".repeat(depth)}${token}`);

      if (isOpeningHtmlToken(token) && !isVoidHtmlToken(token)) {
        depth += 1;
      }
    });

    return lines.join("\n");
  }

  function minifyHtml(html) {
    return String(html || "")
      .replace(/>\s+</g, "><")
      .replace(/\s{2,}/g, " ")
      .replace(/\n+/g, "")
      .trim();
  }

  function isOpeningHtmlToken(token) {
    return /^<([a-z][\w-]*)(\s[^>]*)?>$/i.test(token) && !/^<\//.test(token);
  }

  function isVoidHtmlToken(token) {
    return /^<(br|hr|img|input|meta|link)(\s[^>]*)?>$/i.test(token) || /\/>$/.test(token);
  }



  function unwrapNode(node) {
    const parent = node.parentNode;
    if (!parent) {
      return;
    }

    while (node.firstChild) {
      parent.insertBefore(node.firstChild, node);
    }
    parent.removeChild(node);
  }

  function copyElementAttributes(source, target) {
    Array.from(source.attributes).forEach((attribute) => {
      if (attribute.name.toLowerCase() === "style") {
        target.setAttribute(attribute.name, attribute.value);
      }
    });
  }

  function resolveTextarea(target) {
    if (target instanceof HTMLTextAreaElement) {
      return target;
    }

    if (typeof target === "string") {
      const element = document.querySelector(target);
      if (element instanceof HTMLTextAreaElement) {
        return element;
      }
    }

    throw new Error("createTextEditor: target textarea not found.");
  }

  window.createTextEditor = function createTextEditor(target, options = {}) {
    const textarea = resolveTextarea(target);
    return new TextEditor(textarea, options);
  };
})();
