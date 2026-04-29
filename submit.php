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
        'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ];

    $allowedAttributes = [
        'a' => ['href', 'target', 'rel', 'style'],
        'img' => ['src', 'alt', 'style'],
        'table' => ['style'],
        'thead' => ['style'],
        'tbody' => ['style'],
        'tr' => ['style'],
        'th' => ['style'],
        'td' => ['style'],
        'p' => ['style'],
        'h1' => ['style'],
        'h2' => ['style'],
        'h3' => ['style'],
        'h4' => ['style'],
        'blockquote' => ['style'],
        'ul' => ['style'],
        'ol' => ['style'],
        'li' => ['style'],
        'strong' => ['style'],
        'em' => ['style'],
        'u' => ['style'],
        's' => ['style']
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
                    $safeStyle = sanitizeStyle($attribute->value);
                    if ($safeStyle === '') {
                        $attributesToRemove[] = $attribute->name;
                    } else {
                        $child->setAttribute('style', $safeStyle);
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

function sanitizeStyle(string $styleText): string
{
    $allowedProperties = [
        'text-align',
        'color',
        'background-color',
        'font-size',
        'font-weight',
        'font-style',
        'text-decoration',
        'width',
        'height',
        'max-width',
        'min-width',
        'border',
        'border-collapse',
        'padding',
        'margin'
    ];

    $safeDeclarations = [];
    foreach (explode(';', $styleText) as $declaration) {
        $parts = explode(':', $declaration, 2);
        if (count($parts) !== 2) {
            continue;
        }

        $property = strtolower(trim($parts[0]));
        $value = trim($parts[1]);
        $lowerValue = strtolower($value);

        if (!in_array($property, $allowedProperties, true) || $value === '') {
            continue;
        }

        if (
            strpos($lowerValue, 'expression') !== false ||
            strpos($lowerValue, 'javascript:') !== false ||
            strpos($lowerValue, 'vbscript:') !== false ||
            strpos($lowerValue, 'url(') !== false
        ) {
            continue;
        }

        if (in_array($property, ['width', 'height', 'max-width', 'min-width', 'font-size', 'padding', 'margin'], true)) {
            if (!preg_match('/^-?\d+(\.\d+)?(px|em|rem|%|vh|vw)?$/i', $value)) {
                continue;
            }
            if (preg_match('/^-?\d+(\.\d+)?$/', $value)) {
                $value .= 'px';
            }
        } elseif ($property === 'text-align') {
            if (!preg_match('/^(left|center|right|justify)$/i', $value)) {
                continue;
            }
        } elseif ($property === 'font-weight') {
            if (!preg_match('/^(normal|bold|[1-9]00)$/i', $value)) {
                continue;
            }
        } elseif ($property === 'font-style') {
            if (!preg_match('/^(normal|italic|oblique)$/i', $value)) {
                continue;
            }
        } elseif ($property === 'text-decoration') {
            if (!preg_match('/^(none|underline|line-through|overline)$/i', $value)) {
                continue;
            }
        } elseif ($property === 'border-collapse') {
            if (!preg_match('/^(collapse|separate)$/i', $value)) {
                continue;
            }
        } elseif ($property === 'border') {
            if (!preg_match('/^(\d+(\.\d+)?px\s+)?(solid|dashed|dotted|double)\s+(#[0-9a-f]{3,8}|[a-z]+|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))$/i', $value)) {
                continue;
            }
        } elseif (in_array($property, ['color', 'background-color'], true)) {
            if (!preg_match('/^(#[0-9a-f]{3,8}|[a-z]+|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0|1|0?\.\d+)\s*\))$/i', $value)) {
                continue;
            }
        }

        $safeDeclarations[] = $property . ':' . $value;
    }

    return implode(';', $safeDeclarations);
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
