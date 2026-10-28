document.addEventListener("DOMContentLoaded", () => {
  const editorTextareas = document.querySelectorAll("textarea[data-text-editor], textarea.js-text-editor");
  const editors = Array.from(editorTextareas).map((textarea) => {
    return createTextEditor(textarea, {
      uploadUrl: "upload.php",
      placeholder: textarea.getAttribute("placeholder") || "請輸入要發佈的內容..."
    });
  });

  const form = document.querySelector("#article-form");
  const responsePanel = document.querySelector("#response-panel");
  const responseTitle = document.querySelector("#response-title");
  const responseMeta = document.querySelector("#response-meta");
  const responseContent = document.querySelector("#response-content");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    editors.forEach((editor) => {
      if (editor.textarea.name) {
        formData.set(editor.textarea.name, editor.getHtml());
      }
    });

    try {
      const response = await fetch("submit.php", {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error((data.error && data.error.message) || "送出失敗");
      }

      responsePanel.hidden = false;
      responseTitle.textContent = data.data.title || "未填寫標題";
      responseMeta.textContent = `提交時間：${data.data.submitted_at}`;
      responseContent.innerHTML = "";

      data.data.contents.forEach((item) => {
        const section = document.createElement("section");
        section.className = "response__language";
        section.innerHTML = `
          <h3>${item.label}</h3>
          <div>${item.content || "<p>未填寫內容。</p>"}</div>
        `;
        responseContent.appendChild(section);
      });

      form.reset();
      editors.forEach((editor) => editor.setHtml("<p></p>"));
    } catch (error) {
      window.alert(error.message || "送出失敗");
    }
  });
});
