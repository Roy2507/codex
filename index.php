<?php
declare(strict_types=1);

function sanitizeSubmittedHtml(string $html): string
{
    if (trim($html) === '') {
        return '';
    }

    $allowedTags = [
        'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'blockquote',
        'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 's',
        'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ];

    $allowedAttributes = [
        'a' => ['href', 'target', 'rel'],
        'img' => ['src', 'alt'],
        'td' => ['colspan', 'rowspan'],
        'th' => ['colspan', 'rowspan']
    ];

    $dom = new DOMDocument('1.0', 'UTF-8');
    libxml_use_internal_errors(true);
    $dom->loadHTML(
        '<?xml encoding="utf-8" ?><div id="editor-root-wrapper">' . $html . '</div>',
        LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
    );
    libxml_clear_errors();

    $wrapper = $dom->getElementById('editor-root-wrapper');
    if (!$wrapper instanceof DOMElement) {
        return '';
    }

    $nodes = [$wrapper];
    while ($nodes !== []) {
        /** @var DOMElement $node */
        $node = array_pop($nodes);
        $children = [];

        foreach ($node->childNodes as $child) {
            if ($child instanceof DOMElement) {
                $children[] = $child;
            }
        }

        foreach ($children as $child) {
            $tagName = strtolower($child->tagName);
            if (!in_array($tagName, $allowedTags, true)) {
                while ($child->firstChild !== null) {
                    $node->insertBefore($child->firstChild, $child);
                }
                $node->removeChild($child);
                continue;
            }

            $allowedForTag = $allowedAttributes[$tagName] ?? [];
            $attributesToRemove = [];

            foreach ($child->attributes as $attribute) {
                $name = strtolower($attribute->name);
                $value = $attribute->value;

                if (str_starts_with($name, 'on')) {
                    $attributesToRemove[] = $attribute->name;
                    continue;
                }

                if (!in_array($name, $allowedForTag, true)) {
                    $attributesToRemove[] = $attribute->name;
                    continue;
                }

                if (($tagName === 'a' && $name === 'href') || ($tagName === 'img' && $name === 'src')) {
                    $lowerValue = strtolower(trim($value));
                    if (
                        !str_starts_with($lowerValue, 'http://') &&
                        !str_starts_with($lowerValue, 'https://') &&
                        !str_starts_with($lowerValue, '/') &&
                        !str_starts_with($lowerValue, './') &&
                        !str_starts_with($lowerValue, '../')
                    ) {
                        $attributesToRemove[] = $attribute->name;
                    }
                }
            }

            foreach ($attributesToRemove as $attributeName) {
                $child->removeAttribute($attributeName);
            }

            if ($tagName === 'a' && $child->hasAttribute('href')) {
                $child->setAttribute('rel', 'noopener noreferrer');
                $child->setAttribute('target', '_blank');
            }

            $nodes[] = $child;
        }
    }

    $output = '';
    foreach ($wrapper->childNodes as $childNode) {
        $output .= $dom->saveHTML($childNode);
    }

    return trim($output);
}

$submittedTitle = '';
$submittedContent = '';
$renderedContent = '';
$submittedAt = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $submittedTitle = trim((string) ($_POST['title'] ?? ''));
    $submittedContent = (string) ($_POST['content'] ?? '');
    $renderedContent = sanitizeSubmittedHtml($submittedContent);
    $submittedAt = date('Y-m-d H:i:s');
}
?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PHP Rich Text Editor</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="app-shell">
    <section class="hero">
      <p class="eyebrow">PHP Publishing Tool</p>
      <h1>createTextEditor</h1>
      <p class="hero-copy">
        這個版本改成真正的富文本編輯器體驗，接近 UEditor 這類文章發佈工具。
        使用者可以編排段落、標題、清單、引用、表格、連結與圖片，然後直接透過 PHP 表單送出。
      </p>
    </section>

    <section class="editor-card">
      <form method="post" class="publish-form">
        <div class="field-stack">
          <label class="field-label" for="post-title">文章標題</label>
          <input
            id="post-title"
            class="title-input"
            type="text"
            name="title"
            value="<?= htmlspecialchars($submittedTitle !== '' ? $submittedTitle : '網站發佈內容', ENT_QUOTES, 'UTF-8') ?>"
            placeholder="請輸入文章標題"
          >
        </div>

        <div class="field-stack">
          <label class="field-label" for="editor-source">文章內容</label>
          <textarea
            id="editor-source"
            name="content"
            placeholder="請輸入要發佈的內容..."
          ><?= htmlspecialchars($submittedContent !== '' ? $submittedContent : '<h2>開始撰寫內容</h2><p>這裡可以輸入文章、貼上內容、插入圖片與建立連結。</p><p>送出之後，PHP 會收到完整的 HTML 內容。</p>', ENT_QUOTES, 'UTF-8') ?></textarea>
          <div id="editor-root"></div>
        </div>

        <div class="form-actions">
          <button type="submit" class="submit-button">送出發佈資料</button>
        </div>
      </form>
    </section>

    <?php if ($submittedAt !== null): ?>
      <section class="result-card">
        <p class="result-label">PHP 已接收到資料</p>
        <p class="result-time">提交時間：<?= htmlspecialchars($submittedAt, ENT_QUOTES, 'UTF-8') ?></p>
        <h2 class="result-title">
          <?= htmlspecialchars($submittedTitle !== '' ? $submittedTitle : '未填寫標題', ENT_QUOTES, 'UTF-8') ?>
        </h2>
        <div class="result-body">
          <?= $renderedContent !== '' ? $renderedContent : '<p>未填寫內容。</p>' ?>
        </div>
      </section>
    <?php endif; ?>
  </main>

  <script src="script.js"></script>
</body>
</html>
