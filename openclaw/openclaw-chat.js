document.addEventListener("DOMContentLoaded", () => {
  const chatForm = document.querySelector("#openclaw-chat-form");
  const chatInput = document.querySelector("#openclaw-chat-input");
  const chatLog = document.querySelector("#openclaw-chat-log");
  const sendButton = document.querySelector("#openclaw-send-chat");
  const clearButton = document.querySelector("#openclaw-clear-chat");
  const sessionId = getSessionId();console.log(sessionId);
  const messages = [];

  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const content = chatInput.value.trim();
    if (!content) {
      return;
    }

    addMessage("user", "你", content);
    messages.push({ role: "user", content });
    chatInput.value = "";
    setLoading(true);

    const pendingMessage = addMessage("assistant", "OpenClaw", "思考中...");

    try {
      const response = await fetch("chat.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          sessionId,
          messages
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error((data.error && data.error.message) || "OpenClaw 回應失敗。");
      }

      pendingMessage.querySelector(".chat-message__bubble").textContent = data.data.reply;
      messages.push({ role: "assistant", content: data.data.reply });
    } catch (error) {
      pendingMessage.classList.add("chat-message--error");
      pendingMessage.querySelector(".chat-message__meta").textContent = "錯誤";
      pendingMessage.querySelector(".chat-message__bubble").textContent = error.message || "無法連線到 OpenClaw。";
      messages.pop();
    } finally {
      setLoading(false);
      chatInput.focus();
      chatLog.scrollTop = chatLog.scrollHeight;
    }
  });

  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      chatForm.requestSubmit();
    }
  });

  clearButton.addEventListener("click", () => {
    messages.length = 0;
    chatLog.innerHTML = "";
    addMessage("assistant", "OpenClaw", "對話已清除，可以開始新的聊天。");
    chatInput.focus();
  });

  function addMessage(role, label, content) {
    const message = document.createElement("article");
    message.className = `chat-message chat-message--${role}`;

    const meta = document.createElement("div");
    meta.className = "chat-message__meta";
    meta.textContent = label;

    const bubble = document.createElement("div");
    bubble.className = "chat-message__bubble";
    bubble.textContent = content;

    message.append(meta, bubble);
    chatLog.append(message);
    chatLog.scrollTop = chatLog.scrollHeight;
    return message;
  }

  function setLoading(isLoading) {
    sendButton.disabled = isLoading;
    chatInput.disabled = isLoading;
    sendButton.textContent = isLoading ? "送出中" : "送出";
  }

  function getSessionId() {
    const key = "openclaw-chat-session";
    const existing = window.sessionStorage.getItem(key);
    if (existing) {
      return existing;
    }

    const next = `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.sessionStorage.setItem(key, next);
    return next;
  }
});
