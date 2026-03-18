(function () {
  const BLOCK_SELECTOR = "p, div, h1, h2, h3, h4, h5, h6, li, blockquote, td, th";
  const INLINE_TAGS = new Set(["STRONG", "EM", "U", "S", "A"]);

  function createTextEditor(options = {}) {
    const root = resolveElement(options.target);
    const sourceField = resolveElement(options.sourceField);
    const uploadUrl = options.uploadUrl || "upload.php";
    const placeholder = options.placeholder || "請輸入要發佈的內容...";

    const shell = document.createElement("section");
    shell.className = "text-editor";
    shell.innerHTML = `
      <div class="text-editor__toolbar">
        <div class="text-editor__group">
          <button type="button" class="tool-button" data-action="undo">復原</button>
          <button type="button" class="tool-button" data-action="redo">重做</button>
        </div>
        <div class="text-editor__group">
          <select class="tool-select" data-role="block">
            <option value="p">段落</option>
            <option value="h2">標題 2</option>
            <option value="h3">標題 3</option>
            <option value="blockquote">引用</option>
          </select>
          <select class="tool-select" data-role="font-size">
            <option value="16">16px</option>
            <option value="18" selected>18px</option>
            <option value="22">22px</option>
          </select>
        </div>
        <div class="text-editor__group">
          <button type="button" class="tool-button" data-action="strong"><strong>B</strong></button>
          <button type="button" class="tool-button" data-action="em"><em>I</em></button>
          <button type="button" class="tool-button" data-action="u"><u>U</u></button>
          <button type="button" class="tool-button" data-action="s"><s>S</s></button>
        </div>
        <div class="text-editor__group">
          <button type="button" class="tool-button" data-action="align-left">靠左</button>
          <button type="button" class="tool-button" data-action="align-center">置中</button>
          <button type="button" class="tool-button" data-action="align-right">靠右</button>
        </div>
        <div class="text-editor__group">
          <button type="button" class="tool-button" data-action="unordered-list">清單</button>
          <button type="button" class="tool-button" data-action="ordered-list">編號</button>
          <button type="button" class="tool-button" data-action="link">連結</button>
          <button type="button" class="tool-button" data-action="image">圖片</button>
          <button type="button" class="tool-button" data-action="table">表格</button>
          <button type="button" class="tool-button" data-action="code">原始碼</button>
          <button type="button" class="tool-button" data-action="clear">清空</button>
        </div>
      </div>
      <div class="text-editor__body">
        <div class="text-editor__surface" contenteditable="true" data-placeholder=""></div>
        <textarea class="text-editor__source" hidden></textarea>
      </div>
      <div class="text-editor__status">
        <span data-role="words">0 字</span>
        <span data-role="blocks">0 段</span>
        <span data-role="mode">視覺模式</span>
      </div>
    `;

    const surface = shell.querySelector(".text-editor__surface");
    const source = shell.querySelector(".text-editor__source");
    const wordsNode = shell.querySelector('[data-role="words"]');
    const blocksNode = shell.querySelector('[data-role="blocks"]');
    const modeNode = shell.querySelector('[data-role="mode"]');
    const blockSelect = shell.querySelector('[data-role="block"]');
    const fontSizeSelect = shell.querySelector('[data-role="font-size"]');

    const state = {
      sourceMode: false,
      savedRange: null,
      history: [],
      historyIndex: -1
    };

    surface.dataset.placeholder = placeholder;
    setEditorHtml(normalizeHtml(sourceField.value), false);
    root.replaceChildren(shell);
    surface.style.fontSize = `${fontSizeSelect.value}px`;
    focusSurfaceEnd();

    shell.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const action = button.dataset.action;
        if (action === "undo") {
          applyHistoryStep(-1);
          return;
        }

        if (action === "redo") {
          applyHistoryStep(1);
          return;
        }

        if (action === "code") {
          toggleSourceMode();
          return;
        }

        if (action === "clear") {
          surface.innerHTML = "<p></p>";
          persistChange();
          focusSurfaceEnd();
          return;
        }

        if (state.sourceMode) {
          return;
        }

        if (action === "link") {
          const url = window.prompt("請輸入連結網址", "https://");
          if (url) {
            applyLink(url);
          }
          return;
        }

        if (action === "image") {
          await uploadAndInsertImage(uploadUrl);
          return;
        }

        if (action === "table") {
          insertTable();
          return;
        }

        if (action === "unordered-list") {
          applyList("ul");
          return;
        }

        if (action === "ordered-list") {
          applyList("ol");
          return;
        }

        if (action === "align-left") {
          applyAlignment("left");
          return;
        }

        if (action === "align-center") {
          applyAlignment("center");
          return;
        }

        if (action === "align-right") {
          applyAlignment("right");
          return;
        }

        if (["strong", "em", "u", "s"].includes(action)) {
          applyInlineTag(action);
        }
      });
    });

    blockSelect.addEventListener("change", () => {
      if (!state.sourceMode) {
        applyBlock(blockSelect.value);
      }
    });

    fontSizeSelect.addEventListener("change", () => {
      surface.style.fontSize = `${fontSizeSelect.value}px`;
    });

    surface.addEventListener("mouseup", saveSelection);
    surface.addEventListener("keyup", saveSelection);
    surface.addEventListener("focus", saveSelection);
    surface.addEventListener("input", () => {
      normalizeEditorStructure();
      persistChange();
      saveSelection();
    });

    surface.addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        event.preventDefault();
        insertTextAtSelection("    ");
      }
    });

    source.addEventListener("input", () => {
      sourceField.value = cleanupEditorHtml(source.value);
      updateStatus();
    });

    updateStatus();

    function setEditorHtml(html, pushToHistory = true) {
      const cleanHtml = cleanupEditorHtml(html);
      surface.innerHTML = cleanHtml;
      source.value = cleanHtml;
      sourceField.value = cleanHtml;
      normalizeEditorStructure();
      if (pushToHistory) {
        pushHistory(cleanHtml);
      } else if (state.history.length === 0) {
        pushHistory(cleanHtml);
      }
      updateStatus();
    }

    function persistChange() {
      const cleanHtml = cleanupEditorHtml(surface.innerHTML);
      if (surface.innerHTML !== cleanHtml) {
        surface.innerHTML = cleanHtml;
      }
      source.value = cleanHtml;
      sourceField.value = cleanHtml;
      pushHistory(cleanHtml);
      updateStatus();
    }

    function pushHistory(html) {
      const last = state.history[state.historyIndex];
      if (last === html) {
        return;
      }

      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push(html);
      state.historyIndex = state.history.length - 1;
    }

    function applyHistoryStep(direction) {
      const nextIndex = state.historyIndex + direction;
      if (nextIndex < 0 || nextIndex >= state.history.length) {
        return;
      }

      state.historyIndex = nextIndex;
      setEditorHtml(state.history[state.historyIndex], false);
      focusSurfaceEnd();
    }

    function toggleSourceMode() {
      state.sourceMode = !state.sourceMode;
      source.hidden = !state.sourceMode;
      surface.hidden = state.sourceMode;

      if (state.sourceMode) {
        source.value = sourceField.value;
        source.focus();
      } else {
        setEditorHtml(source.value);
        focusSurfaceEnd();
      }

      updateStatus();
    }

    function saveSelection() {
      if (state.sourceMode) {
        return;
      }

      const range = getEditorRange(surface);
      if (range) {
        state.savedRange = range.cloneRange();
      }
    }

    function restoreSelection() {
      if (!state.savedRange) {
        focusSurfaceEnd();
        return getEditorRange(surface);
      }

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(state.savedRange);
      return state.savedRange;
    }

    function focusSurfaceEnd() {
      surface.focus();
      const range = document.createRange();
      range.selectNodeContents(surface);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      state.savedRange = range.cloneRange();
    }

    function applyInlineTag(tagName) {
      const range = restoreSelection();
      if (!range) {
        return;
      }

      surface.focus();
      if (range.collapsed) {
        const node = document.createElement(tagName);
        node.appendChild(document.createTextNode("\u200B"));
        insertNodeAtRange(range, node, true);
      } else {
        const wrapper = document.createElement(tagName);
        wrapRangeWithNode(range, wrapper);
      }

      normalizeEditorStructure();
      persistChange();
      saveSelection();
    }

    function applyBlock(tagName) {
      const range = restoreSelection();
      if (!range) {
        return;
      }

      const block = closestBlock(range.commonAncestorContainer, surface);
      if (!block || block === surface) {
        const newBlock = document.createElement(tagName);
        if (range.collapsed) {
          newBlock.innerHTML = "<br>";
          insertNodeAtRange(range, newBlock, false);
        } else {
          wrapRangeWithNode(range, newBlock);
        }
      } else {
        replaceTag(block, tagName);
      }

      normalizeEditorStructure();
      persistChange();
      saveSelection();
    }

    function applyAlignment(alignment) {
      const range = restoreSelection();
      if (!range) {
        return;
      }

      const block = closestBlock(range.commonAncestorContainer, surface);
      if (block && block !== surface) {
        block.style.textAlign = alignment;
      } else {
        surface.style.textAlign = alignment;
      }

      persistChange();
      saveSelection();
    }

    function applyList(listTag) {
      const range = restoreSelection();
      if (!range) {
        return;
      }

      const text = range.toString().trim();
      if (text === "") {
        const list = document.createElement(listTag);
        const item = document.createElement("li");
        item.innerHTML = "<br>";
        list.appendChild(item);
        insertNodeAtRange(range, list, false);
      } else {
        const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
        const list = document.createElement(listTag);
        lines.forEach((line) => {
          const item = document.createElement("li");
          item.textContent = line;
          list.appendChild(item);
        });
        range.deleteContents();
        insertNodeAtRange(range, list, false);
      }

      normalizeEditorStructure();
      persistChange();
      saveSelection();
    }

    function applyLink(url) {
      const range = restoreSelection();
      if (!range) {
        return;
      }

      const safeUrl = String(url).trim();
      if (safeUrl === "") {
        return;
      }

      const link = document.createElement("a");
      link.href = safeUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      if (range.collapsed) {
        link.textContent = safeUrl;
        insertNodeAtRange(range, link, false);
      } else {
        wrapRangeWithNode(range, link);
      }

      persistChange();
      saveSelection();
    }

    async function uploadAndInsertImage(url) {
      const picker = document.createElement("input");
      picker.type = "file";
      picker.accept = "image/jpeg,image/png,image/gif,image/webp";
      picker.click();

      picker.addEventListener("change", async () => {
        const file = picker.files && picker.files[0];
        if (!file) {
          return;
        }

        const formData = new FormData();
        formData.append("upload", file);

        try {
          const response = await fetch(url, {
            method: "POST",
            body: formData
          });
          const data = await response.json();
          if (!response.ok || !data.url) {
            throw new Error((data.error && data.error.message) || "圖片上傳失敗");
          }

          insertImage(data.url, file.name);
        } catch (error) {
          window.alert(error.message || "圖片上傳失敗");
        }
      }, { once: true });
    }

    function insertImage(url, altText) {
      const range = restoreSelection();
      if (!range) {
        return;
      }

      const paragraph = document.createElement("p");
      const image = document.createElement("img");
      image.src = url;
      image.alt = altText || "";
      paragraph.appendChild(image);
      insertNodeAtRange(range, paragraph, false);
      normalizeEditorStructure();
      persistChange();
      saveSelection();
    }

    function insertTable() {
      const range = restoreSelection();
      if (!range) {
        return;
      }

      const table = document.createElement("table");
      const tbody = document.createElement("tbody");

      for (let rowIndex = 0; rowIndex < 2; rowIndex += 1) {
        const row = document.createElement("tr");
        for (let cellIndex = 0; cellIndex < 2; cellIndex += 1) {
          const cell = document.createElement(rowIndex === 0 ? "th" : "td");
          cell.textContent = rowIndex === 0 ? `標題 ${cellIndex + 1}` : "內容";
          row.appendChild(cell);
        }
        tbody.appendChild(row);
      }

      table.appendChild(tbody);
      insertNodeAtRange(range, table, false);
      insertNodeAtRange(getEditorRange(surface), document.createElement("p"), false);
      normalizeEditorStructure();
      persistChange();
      saveSelection();
    }

    function insertTextAtSelection(text) {
      const range = restoreSelection();
      if (!range) {
        return;
      }

      const node = document.createTextNode(text);
      insertNodeAtRange(range, node, true);
      persistChange();
      saveSelection();
    }

    function insertNodeAtRange(range, node, placeCaretInside) {
      range.deleteContents();
      range.insertNode(node);

      const selection = window.getSelection();
      const nextRange = document.createRange();

      if (placeCaretInside) {
        nextRange.selectNodeContents(node);
        nextRange.collapse(false);
      } else {
        nextRange.setStartAfter(node);
        nextRange.collapse(true);
      }

      selection.removeAllRanges();
      selection.addRange(nextRange);
      state.savedRange = nextRange.cloneRange();
    }

    return {
      element: shell,
      getHtml: () => sourceField.value,
      setHtml: (html) => setEditorHtml(html),
      focus: focusSurfaceEnd
    };
  }

  function getEditorRange(surface) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const ancestor = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentNode
      : range.commonAncestorContainer;

    return surface.contains(ancestor) ? range : null;
  }

  function wrapRangeWithNode(range, wrapper) {
    const fragment = range.extractContents();
    wrapper.appendChild(fragment);
    range.insertNode(wrapper);

    const selection = window.getSelection();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(wrapper);
    nextRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(nextRange);
  }

  function closestBlock(node, root) {
    let current = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
    while (current && current !== root) {
      if (current.matches && current.matches(BLOCK_SELECTOR)) {
        return current;
      }
      current = current.parentNode;
    }
    return root;
  }

  function replaceTag(element, tagName) {
    if (element.tagName.toLowerCase() === tagName.toLowerCase()) {
      return element;
    }

    const replacement = document.createElement(tagName);
    Array.from(element.attributes).forEach((attribute) => {
      replacement.setAttribute(attribute.name, attribute.value);
    });

    while (element.firstChild) {
      replacement.appendChild(element.firstChild);
    }

    element.parentNode.replaceChild(replacement, element);
    return replacement;
  }

  function normalizeEditorStructure() {
    const surface = document.querySelector(".text-editor__surface");
    if (!surface) {
      return;
    }

    surface.querySelectorAll("*").forEach((node) => {
      Array.from(node.attributes).forEach((attribute) => {
        if (attribute.name.toLowerCase().startsWith("on")) {
          node.removeAttribute(attribute.name);
        }
      });
    });

    Array.from(surface.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "") {
        const paragraph = document.createElement("p");
        paragraph.textContent = node.textContent;
        surface.replaceChild(paragraph, node);
      }
    });

    if (surface.innerHTML.trim() === "") {
      surface.innerHTML = "<p></p>";
    }
  }

  function cleanupEditorHtml(html) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;

    wrapper.querySelectorAll("script, style, iframe").forEach((node) => node.remove());

    wrapper.querySelectorAll("*").forEach((node) => {
      if (!isAllowedElement(node)) {
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
          const textAlignMatch = attribute.value.match(/text-align\s*:\s*(left|center|right)/i);
          if (textAlignMatch) {
            node.setAttribute("style", `text-align:${textAlignMatch[1].toLowerCase()}`);
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

  function isAllowedElement(node) {
    const allowed = [
      "P", "BR", "HR", "H1", "H2", "H3", "H4", "BLOCKQUOTE",
      "UL", "OL", "LI", "STRONG", "EM", "U", "S", "A",
      "IMG", "TABLE", "TBODY", "THEAD", "TR", "TH", "TD"
    ];
    return allowed.includes(node.tagName) || INLINE_TAGS.has(node.tagName);
  }

  function unwrapNode(node) {
    const parent = node.parentNode;
    while (node.firstChild) {
      parent.insertBefore(node.firstChild, node);
    }
    parent.removeChild(node);
  }

  function countBlocks(surface) {
    const blocks = surface.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote, table");
    return Array.from(blocks).filter((node) => {
      return node.tagName === "TABLE" || node.textContent.trim() !== "";
    }).length;
  }

  function updateStatus() {
    const surface = document.querySelector(".text-editor__surface");
    const source = document.querySelector(".text-editor__source");
    const wordsNode = document.querySelector('[data-role="words"]');
    const blocksNode = document.querySelector('[data-role="blocks"]');
    const modeNode = document.querySelector('[data-role="mode"]');

    if (!surface || !source || !wordsNode || !blocksNode || !modeNode) {
      return;
    }

    const sourceMode = !source.hidden;
    const text = (sourceMode ? source.value : surface.textContent).trim();
    const wordCount = text ? text.split(/\s+/).length : 0;

    wordsNode.textContent = `${wordCount} 字`;
    blocksNode.textContent = `${countBlocks(surface)} 段`;
    modeNode.textContent = sourceMode ? "原始碼模式" : "視覺模式";
  }

  function normalizeHtml(value) {
    const html = String(value || "").trim();
    return html === "" ? "<p></p>" : html;
  }

  function resolveElement(target) {
    if (target instanceof HTMLElement || target instanceof HTMLTextAreaElement) {
      return target;
    }

    if (typeof target === "string") {
      const element = document.querySelector(target);
      if (element) {
        return element;
      }
    }

    throw new Error("createTextEditor: target element not found.");
  }

  window.createTextEditor = createTextEditor;

  document.addEventListener("DOMContentLoaded", () => {
    const sourceField = document.querySelector("#editor-source");
    if (!sourceField) {
      return;
    }

    sourceField.hidden = true;
    createTextEditor({
      target: "#editor-root",
      sourceField: sourceField,
      uploadUrl: "upload.php",
      placeholder: sourceField.getAttribute("placeholder") || "請輸入要發佈的內容..."
    });
  });
})();
