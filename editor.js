(function () {
  const BLOCK_SELECTOR = "p, h1, h2, h3, h4, h5, h6, blockquote, li, td, th";
  const ALLOWED_TAGS = new Set([
    "P", "BR", "H1", "H2", "H3", "H4", "BLOCKQUOTE",
    "UL", "OL", "LI", "STRONG", "EM", "U", "S", "A",
    "IMG", "TABLE", "TBODY", "TR", "TH", "TD"
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
        historyIndex: -1
      };

      this.build();
      this.bindEvents();
      this.setHtml(this.textarea.value || "<p></p>", false);
      this.saveHistory(this.textarea.value || "<p></p>");
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
            <button type="button" class="te__button" data-action="undo">復原</button>
            <button type="button" class="te__button" data-action="redo">重做</button>
          </div>
          <div class="te__group">
            <select class="te__select" data-role="block">
              <option value="p">段落</option>
              <option value="h2">標題 2</option>
              <option value="h3">標題 3</option>
              <option value="blockquote">引用</option>
            </select>
          </div>
          <div class="te__group">
            <button type="button" class="te__button" data-action="strong"><strong>B</strong></button>
            <button type="button" class="te__button" data-action="em"><em>I</em></button>
            <button type="button" class="te__button" data-action="u"><u>U</u></button>
            <button type="button" class="te__button" data-action="s"><s>S</s></button>
          </div>
          <div class="te__group">
            <button type="button" class="te__button" data-action="align" data-value="left">靠左</button>
            <button type="button" class="te__button" data-action="align" data-value="center">置中</button>
            <button type="button" class="te__button" data-action="align" data-value="right">靠右</button>
          </div>
          <div class="te__group">
            <button type="button" class="te__button" data-action="unordered-list">清單</button>
            <button type="button" class="te__button" data-action="ordered-list">編號</button>
            <button type="button" class="te__button" data-action="link">連結</button>
            <button type="button" class="te__button" data-action="image">圖片</button>
            <button type="button" class="te__button" data-action="table">表格</button>
            <button type="button" class="te__button" data-action="code">原始碼</button>
            <button type="button" class="te__button" data-action="clear">清空</button>
          </div>
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
      this.surface.dataset.placeholder = this.placeholder;

      this.textarea.insertAdjacentElement("afterend", this.container);
    }

    bindEvents() {
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

      this.source.addEventListener("input", () => {
        this.textarea.value = this.cleanupHtml(this.source.value);
        this.updateStatus();
      });
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

      if (action === "table") {
        this.insertTable();
      }
    }

    toggleSourceMode() {
      this.state.sourceMode = !this.state.sourceMode;
      this.source.hidden = !this.state.sourceMode;
      this.surface.hidden = this.state.sourceMode;

      if (this.state.sourceMode) {
        this.source.value = this.textarea.value;
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
      this.textarea.value = cleanHtml;
      this.normalizeStructure();

      if (pushHistory) {
        this.saveHistory(cleanHtml);
      }

      this.updateStatus();
    }

    getHtml() {
      return this.textarea.value;
    }

    syncToTextarea() {
      const cleanHtml = this.cleanupHtml(this.surface.innerHTML);
      if (this.surface.innerHTML !== cleanHtml) {
        this.surface.innerHTML = cleanHtml;
      }
      this.source.value = cleanHtml;
      this.textarea.value = cleanHtml;
      this.saveHistory(cleanHtml);
      this.updateStatus();
    }

    saveHistory(html) {
      const lastValue = this.state.history[this.state.historyIndex];
      if (lastValue === html) {
        return;
      }

      this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
      this.state.history.push(html);
      this.state.historyIndex = this.state.history.length - 1;
    }

    moveHistory(step) {
      const nextIndex = this.state.historyIndex + step;
      if (nextIndex < 0 || nextIndex >= this.state.history.length) {
        return;
      }

      this.state.historyIndex = nextIndex;
      this.setHtml(this.state.history[nextIndex], false);
      this.focusEnd();
    }

    saveSelection() {
      const range = this.getEditorRange();
      if (range) {
        this.state.savedRange = range.cloneRange();
      }
    }

    restoreSelection() {
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
        block.style.textAlign = alignment;
      }

      this.syncToTextarea();
    }

    applyList(listTag) {
      const range = this.restoreSelection();
      if (!range) {
        return;
      }

      const lines = range.toString().split(/\n+/).map((line) => line.trim()).filter(Boolean);
      const list = document.createElement(listTag);

      if (lines.length === 0) {
        const item = document.createElement("li");
        item.innerHTML = "<br>";
        list.appendChild(item);
      } else {
        lines.forEach((line) => {
          const item = document.createElement("li");
          item.textContent = line;
          list.appendChild(item);
        });
      }

      range.deleteContents();
      this.insertNode(list);
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
      const table = document.createElement("table");
      const tbody = document.createElement("tbody");

      for (let rowIndex = 0; rowIndex < 2; rowIndex += 1) {
        const row = document.createElement("tr");
        for (let colIndex = 0; colIndex < 2; colIndex += 1) {
          const cell = document.createElement(rowIndex === 0 ? "th" : "td");
          cell.textContent = rowIndex === 0 ? `標題 ${colIndex + 1}` : "內容";
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
            throw new Error((data.error && data.error.message) || "圖片上傳失敗");
          }

          const paragraph = document.createElement("p");
          const image = document.createElement("img");
          image.src = data.url;
          image.alt = file.name;
          paragraph.appendChild(image);
          this.insertNode(paragraph);
          this.normalizeStructure();
          this.syncToTextarea();
        } catch (error) {
          window.alert(error.message || "圖片上傳失敗");
        }
      }, { once: true });
      picker.click();
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

      wrapper.querySelectorAll("script, style, iframe").forEach((node) => node.remove());

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
            const match = attribute.value.match(/text-align\s*:\s*(left|center|right)/i);
            if (match) {
              node.setAttribute("style", `text-align:${match[1].toLowerCase()}`);
            } else {
              node.removeAttribute("style");
            }
            return;
          }

          if (node.tagName === "A" && !["href", "target", "rel", "style"].includes(attribute.name)) {
            node.removeAttribute(attribute.name);
            return;
          }

          if (node.tagName === "IMG" && !["src", "alt"].includes(attribute.name)) {
            node.removeAttribute(attribute.name);
            return;
          }

          if (!["A", "IMG", "TD", "TH"].includes(node.tagName) && attribute.name !== "style") {
            node.removeAttribute(attribute.name);
          }
        });
      });

      return wrapper.innerHTML.trim() || "<p></p>";
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
