<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => ['message' => 'Only POST requests are allowed.']
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function sanitizeSubmittedHtml(string $html): string
{
    if (trim($html) === '') {
        return '';
    }

    $allowedTags = [
        'p', 'br', 'h1', 'h2', 'h3', 'h4', 'blockquote',
        'ul', 'ol', 'li', 'strong', 'em', 'u', 's', 'a',
        'img', 'table', 'tbody', 'tr', 'th', 'td'
    ];

    $allowedAttributes = [
        'a' => ['href', 'target', 'rel'],
        'img' => ['src', 'alt'],
        'th' => ['style'],
        'td' => ['style'],
        'p' => ['style'],
        'h1' => ['style'],
        'h2' => ['style'],
        'h3' => ['style'],
        'h4' => ['style'],
        'blockquote' => ['style']
    ];

    $dom = new DOMDocument('1.0', 'UTF-8');
    libxml_use_internal_errors(true);
    $dom->loadHTML(
        '<?xml encoding="utf-8" ?><div id="wrapper">' . $html . '</div>',
        LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
    );
    libxml_clear_errors();

    $wrapper = $dom->getElementById('wrapper');
    if (!$wrapper instanceof DOMElement) {
        return '';
    }

    $stack = [$wrapper];
    while ($stack !== []) {
        /** @var DOMElement $node */
        $node = array_pop($stack);
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
                $attributeName = strtolower($attribute->name);

                if (str_starts_with($attributeName, 'on')) {
                    $attributesToRemove[] = $attribute->name;
                    continue;
                }

                if (!in_array($attributeName, $allowedForTag, true)) {
                    $attributesToRemove[] = $attribute->name;
                    continue;
                }

                if ($attributeName === 'style') {
                    $match = preg_match('/text-align\s*:\s*(left|center|right)/i', $attribute->value, $matched);
                    if ($match !== 1) {
                        $attributesToRemove[] = $attribute->name;
                    } else {
                        $child->setAttribute('style', 'text-align:' . strtolower($matched[1]));
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

            $stack[] = $child;
        }
    }

    $output = '';
    foreach ($wrapper->childNodes as $childNode) {
        $output .= $dom->saveHTML($childNode);
    }

    return trim($output);
}

$title = trim((string) ($_POST['title'] ?? ''));
$content = (string) ($_POST['editor'] ?? '');
$safeContent = sanitizeSubmittedHtml($content);

echo json_encode([
    'success' => true,
    'data' => [
        'title' => $title,
        'content' => $safeContent,
        'submitted_at' => date('Y-m-d H:i:s')
    ]
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
