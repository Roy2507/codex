<?php
declare(strict_types=1);

$submittedTitle = '';
$submittedContent = '';
$submittedAt = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $submittedTitle = trim((string) ($_POST['title'] ?? ''));
    $submittedContent = trim((string) ($_POST['content'] ?? ''));
    $submittedAt = date('Y-m-d H:i:s');
}
?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PHP createTextEditor</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="app-shell">
    <section class="hero">
      <p class="eyebrow">PHP Publishing Tool</p>
      <h1>createTextEditor</h1>
      <p class="hero-copy">
        這是一個適合 PHP 網站接入的進階文字編輯器。使用者可以輸入標題、編輯內容、套用基本格式，
        然後透過表單直接送到後端發佈。
      </p>
    </section>

    <section class="editor-host">
      <form method="post" class="publish-form">
        <div id="editor-root"></div>
        <div class="form-actions">
          <button type="submit" class="submit-button">送出發佈資料</button>
        </div>
      </form>
    </section>

    <?php if ($submittedAt !== null): ?>
      <section class="result-panel">
        <p class="result-label">PHP 收到的資料</p>
        <p class="result-time">提交時間：<?= htmlspecialchars($submittedAt, ENT_QUOTES, 'UTF-8') ?></p>
        <h2 class="result-title">
          <?= htmlspecialchars($submittedTitle !== '' ? $submittedTitle : '未填寫標題', ENT_QUOTES, 'UTF-8') ?>
        </h2>
        <div class="result-body">
          <?= $submittedContent !== '' ? $submittedContent : '<p>未填寫內容。</p>' ?>
        </div>
      </section>
    <?php endif; ?>
  </main>

  <script src="script.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      createTextEditor({
        target: '#editor-root',
        fieldName: 'content',
        titleName: 'title',
        titlePlaceholder: '請輸入文章標題',
        placeholder: '請輸入要發佈的內容...',
        initialTitle: <?= json_encode($submittedTitle !== '' ? $submittedTitle : '網站發佈內容', JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>,
        initialContent: <?= json_encode($submittedContent !== '' ? $submittedContent : '<p>這裡可以輸入文章內容，並用工具列做基本排版。</p><p>送出後，PHP 就能直接接到這份資料。</p>', JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>
      });
    });
  </script>
</body>
</html>
