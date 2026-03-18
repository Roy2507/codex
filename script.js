(function () {
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
          <button type="button" class="tool-button" data-command="undo">復原</button>
          <button type="button" class="tool-button" data-command="redo">重做</button>
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
          <button type="button" class="tool-button" data-command="bold"><strong>B</strong></button>
          <button type="button" class="tool-button" data-command="italic"><em>I</em></button>
          <button type="button" class="tool-button" data-command="underline"><u>U</u></button>
          <button type="button" class="tool-button" data-command="strikeThrough"><s>S</s></button>
        </div>
        <div class="text-editor__group">
          <button type="button" class="tool-button" data-command="justifyLeft">靠左</button>
          <button type="button" class="tool-button" data-command="justifyCenter">置中</button>
          <button type="button" class="tool-button" data-command="justifyRight">靠右</button>
        </div>
        <div class="text-editor__group">
          <button type="button" class="tool-button" data-command="insertUnorderedList">清單</button>
          <button type="button" class="tool-button" data-command="insertOrderedList">編號</button>
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
    let sourceMode = false;

    surface.dataset.placeholder = placeholder;
    surface.innerHTML = normalizeHtml(sourceField.value);
    source.value = surface.innerHTML;

    function focusSurface() {
      if (!sourceMode) {
        surface.focus();
      }
    }

    function syncFromSurface() {
      const cleanHtml = cleanupEditorHtml(surface.innerHTML);
      surface.innerHTML = cleanHtml;
      source.value = cleanHtml;
      sourceField.value = cleanHtml;
      updateStatus();
    }

    function syncFromSource() {
      const cleanHtml = cleanupEditorHtml(source.value);
      source.value = cleanHtml;
      surface.innerHTML = cleanHtml;
      sourceField.value = cleanHtml;
      updateStatus();
    }

    function updateStatus() {
      const text = (sourceMode ? source.value : surface.textContent).trim();
      const wordCount = text ? text.split(/\s+/).length : 0;
      const blockCount = countBlocks(surface);
      wordsNode.textContent = `${wordCount} 字`;
      blocksNode.textContent = `${blockCount} 段`;
      modeNode.textContent = sourceMode ? "原始碼模式" : "視覺模式";
    }

    function runCommand(command, value) {
      focusSurface();
      document.execCommand(command, false, value || null);
      syncFromSurface();
    }

    shell.querySelectorAll("[data-command]").forEach((button) => {
      button.addEventListener("click", () => {
        if (sourceMode) {
          return;
        }
        runCommand(button.dataset.command);
      });
    });

    blockSelect.addEventListener("change", () => {
      if (sourceMode) {
        return;
      }
      runCommand("formatBlock", blockSelect.value);
    });

    fontSizeSelect.addEventListener("change", () => {
      surface.style.fontSize = `${fontSizeSelect.value}px`;
    });

    shell.querySelector('[data-action="link"]').addEventListener("click", () => {
      if (sourceMode) {
        return;
      }
      const url = window.prompt("請輸入連結網址", "https://");
      if (!url) {
        return;
      }
      runCommand("createLink", url);
    });

    shell.querySelector('[data-action="table"]').addEventListener("click", () => {
      if (sourceMode) {
        return;
      }
      focusSurface();
      const tableHtml = "<table><tbody><tr><th>標題 1</th><th>標題 2</th></tr><tr><td>內容</td><td>內容</td></tr></tbody></table><p></p>";
      document.execCommand("insertHTML", false, tableHtml);
      syncFromSurface();
    });

    shell.querySelector('[data-action="code"]').addEventListener("click", () => {
      sourceMode = !sourceMode;
      source.hidden = !sourceMode;
      surface.hidden = sourceMode;
      if (sourceMode) {
        source.value = sourceField.value;
      } else {
        syncFromSource();
      }
      updateStatus();
    });

    shell.querySelector('[data-action="clear"]').addEventListener("click", () => {
      surface.innerHTML = "";
      source.value = "";
      sourceField.value = "";
      updateStatus();
      focusSurface();
    });

    shell.querySelector('[data-action="image"]').addEventListener("click", async () => {
      if (sourceMode) {
        return;
      }
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
          const response = await fetch(uploadUrl, {
            method: "POST",
            body: formData
          });
          const data = await response.json();
          if (!response.ok || !data.url) {
            throw new Error((data.error && data.error.message) || "圖片上傳失敗");
          }

          focusSurface();
          document.execCommand(
            "insertHTML",
            false,
            `<p><img src="${escapeAttribute(data.url)}" alt="${escapeAttribute(file.name)}"></p>`
          );
          syncFromSurface();
        } catch (error) {
          window.alert(error.message || "圖片上傳失敗");
        }
      });
      picker.click();
    });

    surface.addEventListener("input", syncFromSurface);
    source.addEventListener("input", syncFromSource);

    root.replaceChildren(shell);
    surface.style.fontSize = `${fontSizeSelect.value}px`;
    updateStatus();

    return {
      element: shell,
      getHtml: () => sourceField.value,
      setHtml: (html) => {
        const value = normalizeHtml(html);
        surface.innerHTML = value;
        source.value = value;
        sourceField.value = value;
        updateStatus();
      }
    };
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

  function normalizeHtml(value) {
    const html = String(value || "").trim();
    return html === "" ? "<p></p>" : html;
  }

  function cleanupEditorHtml(html) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;

    wrapper.querySelectorAll("script, style, iframe").forEach((node) => node.remove());

    wrapper.querySelectorAll("*").forEach((node) => {
      Array.from(node.attributes).forEach((attribute) => {
        if (attribute.name.toLowerCase().startsWith("on")) {
          node.removeAttribute(attribute.name);
        }
      });
    });

    return wrapper.innerHTML.trim() || "<p></p>";
  }

  function countBlocks(surface) {
    const blocks = surface.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote, table");
    const used = Array.from(blocks).filter((node) => node.textContent.trim() !== "" || node.tagName === "TABLE");
    return used.length || 0;
  }

  function escapeAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
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
