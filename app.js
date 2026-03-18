document.addEventListener("DOMContentLoaded", () => {
  const editor = createTextEditor("#editor", {
    uploadUrl: "upload.php",
    placeholder: "請輸入要發佈的內容..."
  });

  const form = document.querySelector("#article-form");
  const responsePanel = document.querySelector("#response-panel");
  const responseTitle = document.querySelector("#response-title");
  const responseMeta = document.querySelector("#response-meta");
  const responseContent = document.querySelector("#response-content");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    formData.set("editor", editor.getHtml());

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
      responseContent.innerHTML = data.data.content || "<p>未填寫內容。</p>";
    } catch (error) {
      window.alert(error.message || "送出失敗");
    }
  });
});
