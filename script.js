function createTextEditor(options = {}) {
  const mountPoint = resolveMountPoint(options.target);
  const fieldName = options.fieldName || "content";
  const titleName = options.titleName || "title";
  const initialTitle = options.initialTitle || "";
  const initialContent = normalizeInitialContent(options.initialContent || "");
  const titlePlaceholder = options.titlePlaceholder || "請輸入標題";
  const placeholder = options.placeholder || "請輸入內容...";

  const shell = document.createElement("section");
  shell.className = "editor-shell";
  shell.innerHTML = `
    <div class="editor-toolbar">
      <div class="toolbar-group">
        <button type="button" class="toolbar-button" data-command="bold"><strong>B</strong></button>
        <button type="button" class="toolbar-button" data-command="italic"><em>I</em></button>
        <button type="button" class="toolbar-button" data-command="insertUnorderedList">清單</button>
        <button type="button" class="toolbar-button" data-command="formatBlock" data-value="h2">標題</button>
        <button type="button" class="toolbar-button" data-command="formatBlock" data-value="blockquote">引用</button>
        <button type="button" class="toolbar-button" data-action="link">連結</button>
      </div>
      <div class="toolbar-group">
        <select class="toolbar-select" data-role="font-size" aria-label="字體大小">
          <option value="16">字級 16</option>
          <option value="18" selected>字級 18</option>
          <option value="20">字級 20</option>
        </select>
        <button type="button" class="toolbar-button" data-action="clear">清空</button>
      </div>
    </div>
    <div class="editor-layout">
      <div class="editor-main">
        <input class="editor-title" type="text">
        <div class="editor-surface" contenteditable="true"></div>
        <input type="hidden" data-role="title-field">
        <textarea hidden data-role="content-field"></textarea>
      </div>
      <aside class="editor-side">
        <div class="stat-card">
          <p class="card-title">字數統計</p>
          <p class="stat-value" data-role="word-count">0</p>
          <p class="stat-copy">送出前可快速確認內容長度。</p>
        </div>
        <div class="stat-card">
          <p class="card-title">段落數</p>
          <p class="stat-value" data-role="paragraph-count">0</p>
          <p class="stat-copy">幫助使用者檢查文章結構是否完整。</p>
        </div>
        <div class="preview-card">
          <p class="card-title">HTML 預覽</p>
          <h2 class="preview-title" data-role="preview-title"></h2>
          <div class="preview-body" data-role="preview-body"></div>
          <p class="preview-copy">送出時，會將這份 HTML 內容寫入隱藏欄位供 PHP 接收。</p>
        </div>
      </aside>
    </div>
  `;

  const titleInput = shell.querySelector(".editor-title");
  const editorSurface = shell.querySelector(".editor-surface");
  const titleField = shell.querySelector('[data-role="title-field"]');
  const contentField = shell.querySelector('[data-role="content-field"]');
  const wordCount = shell.querySelector('[data-role="word-count"]');
  const paragraphCount = shell.querySelector('[data-role="paragraph-count"]');
  const previewTitle = shell.querySelector('[data-role="preview-title"]');
  const previewBody = shell.querySelector('[data-role="preview-body"]');
  const fontSizeSelect = shell.querySelector('[data-role="font-size"]');
  const clearButton = shell.querySelector('[data-action="clear"]');
  const linkButton = shell.querySelector('[data-action="link"]');

  titleInput.name = titleName;
  titleInput.placeholder = titlePlaceholder;
  titleInput.value = initialTitle;

  titleField.name = titleName;
  contentField.name = fieldName;
  editorSurface.dataset.placeholder = placeholder;
  editorSurface.innerHTML = initialContent;

  const sync = () => {
    const html = cleanupEditorHtml(editorSurface.innerHTML);
    const plainText = editorSurface.textContent.trim();
    const paragraphs = extractParagraphs(editorSurface);

    titleField.value = titleInput.value;
    contentField.value = html;
    previewTitle.textContent = titleInput.value.trim() || "未命名文章";
    previewBody.innerHTML = html || "<p>尚未輸入內容。</p>";
    wordCount.textContent = String(plainText ? plainText.split(/\s+/).length : 0);
    paragraphCount.textContent = String(paragraphs);
  };

  shell.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("click", () => {
      const command = button.dataset.command;
      const value = button.dataset.value || null;
      editorSurface.focus();
      document.execCommand(command, false, value);
      sync();
    });
  });

  linkButton.addEventListener("click", () => {
    const url = window.prompt("請輸入連結網址");
    if (!url) {
      return;
    }

    editorSurface.focus();
    document.execCommand("createLink", false, url);
    sync();
  });

  clearButton.addEventListener("click", () => {
    titleInput.value = "";
    editorSurface.innerHTML = "";
    sync();
    editorSurface.focus();
  });

  fontSizeSelect.addEventListener("change", () => {
    editorSurface.style.fontSize = `${fontSizeSelect.value}px`;
  });

  titleInput.addEventListener("input", sync);
  editorSurface.addEventListener("input", sync);
  editorSurface.addEventListener("blur", () => {
    editorSurface.innerHTML = cleanupEditorHtml(editorSurface.innerHTML);
    sync();
  });

  mountPoint.replaceChildren(shell);
  editorSurface.style.fontSize = `${fontSizeSelect.value}px`;
  sync();

  return {
    element: shell,
    getTitle: () => titleInput.value,
    getContent: () => contentField.value,
    setTitle: (value) => {
      titleInput.value = value;
      sync();
    },
    setContent: (value) => {
      editorSurface.innerHTML = normalizeInitialContent(value);
      sync();
    },
    clear: () => {
      titleInput.value = "";
      editorSurface.innerHTML = "";
      sync();
    }
  };
}

function resolveMountPoint(target) {
  if (target instanceof HTMLElement) {
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

function normalizeInitialContent(value) {
  const trimmed = String(value).trim();
  return trimmed === "" ? "" : trimmed;
}

function cleanupEditorHtml(html) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;

  wrapper.querySelectorAll("script, style").forEach((node) => node.remove());

  wrapper.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on")) {
        node.removeAttribute(attribute.name);
      }
    });
  });

  return wrapper.innerHTML.trim();
}

function extractParagraphs(editorSurface) {
  const blocks = editorSurface.querySelectorAll("p, div, li, blockquote, h1, h2, h3, h4, h5, h6");
  const count = [...blocks].filter((block) => block.textContent.trim() !== "").length;
  if (count > 0) {
    return count;
  }

  return editorSurface.textContent.trim() === "" ? 0 : 1;
}

window.createTextEditor = createTextEditor;
