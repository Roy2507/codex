<?php
declare(strict_types=1);

require('./openclaw-config.php');

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondJson(405, [
        'success' => false,
        'error' => ['message' => 'Only POST requests are allowed.']
    ]);
}

$rawBody = file_get_contents('php://input') ?: '';
$payload = json_decode($rawBody, true);

if (!is_array($payload)) {
    respondJson(400, [
        'success' => false,
        'error' => ['message' => 'Request body must be valid JSON.']
    ]);
}

$messages = normalizeMessages($payload['messages'] ?? []);
if ($messages === []) {
    respondJson(400, [
        'success' => false,
        'error' => ['message' => 'Please send at least one chat message.']
    ]);
}

$baseUrl = rtrim((string) getenvWithFallback('OPENCLAW_BASE_URL', 'http://127.0.0.1:18789'), '/');
$endpoint = $baseUrl . '/v1/responses';
$token = trim((string) getenvWithFallback('OPENCLAW_GATEWAY_TOKEN', getenvWithFallback('OPENCLAW_API_KEY', OPENCLAW_GATEWAY_TOKEN)));
$model = trim((string) getenvWithFallback('OPENCLAW_MODEL', 'openclaw'));
$agentId = trim((string) getenvWithFallback('OPENCLAW_AGENT_ID', 'main'));
$sessionId = sanitizeSessionId((string) ($payload['sessionId'] ?? 'web-chat'));
$sessionKey = trim((string) getenvWithFallback('OPENCLAW_SESSION_KEY', (string) ($payload['sessionKey'] ?? OPENCLAW_SESSION_KEY)));

$response = callOpenClaw($endpoint, $token, $agentId, $sessionKey, [
    'model' => $model,
    'input' => buildOpenResponsesInput($messages),
    'user' => $sessionId,
    'stream' => false
]);

if (!$response['ok']) {
    respondJson($response['status'], [
        'success' => false,
        'error' => ['message' => $response['message']]
    ]);
}

$reply = extractResponseText($response['body']);
if ($reply === '') {
    respondJson(502, [
        'success' => false,
        'error' => ['message' => 'OpenClaw returned an empty response.']
    ]);
}

respondJson(200, [
    'success' => true,
    'data' => [
        'reply' => $reply,
        'sessionId' => $sessionId,
        'raw' => $response['body']
    ]
]);

function getenvWithFallback(string $name, string $fallback): string
{
    $value = getenv($name);
    return $value === false ? $fallback : (string) $value;
}

function normalizeMessages($messages): array
{
    if (!is_array($messages)) {
        return [];
    }

    $normalized = [];
    $allowedRoles = ['system', 'developer', 'user', 'assistant'];
    foreach (array_slice($messages, -16) as $message) {
        if (!is_array($message)) {
            continue;
        }

        $role = (string) ($message['role'] ?? 'user');
        $content = trim((string) ($message['content'] ?? ''));
        if (!in_array($role, $allowedRoles, true) || $content === '') {
            continue;
        }

        $normalized[] = [
            'role' => $role,
            'content' => mb_substr($content, 0, 6000, 'UTF-8')
        ];
    }

    return $normalized;
}

function sanitizeSessionId(string $sessionId): string
{
    $clean = preg_replace('/[^a-zA-Z0-9:_-]/', '-', trim($sessionId));
    return $clean !== '' ? substr($clean, 0, 80) : 'web-chat';
}

function buildOpenResponsesInput(array $messages): array
{
    return array_map(static function (array $message): array {
        return [
            'type' => 'message',
            'role' => $message['role'],
            'content' => [
                [
                    'type' => 'input_text',
                    'text' => $message['content']
                ]
            ]
        ];
    }, $messages);
}

function callOpenClaw(string $endpoint, string $token, string $agentId, string $sessionKey, array $body): array
{
    if (!function_exists('curl_init')) {
        return [
            'ok' => false,
            'status' => 500,
            'message' => 'The PHP cURL extension is required to call OpenClaw.',
            'body' => null
        ];
    }

    $headers = [
        'Content-Type: application/json',
        'Accept: application/json'
    ];

    if ($token !== '') {
        $headers[] = 'Authorization: Bearer ' . $token;
    }

    if ($agentId !== '') {
        $headers[] = 'x-openclaw-agent-id: ' . $agentId;
    }

    if ($sessionKey !== '') {
        $headers[] = 'x-openclaw-session-key: ' . $sessionKey;
    }

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 90
    ]);

    $rawResponse = curl_exec($ch);
    $curlError = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $contentType = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);

    if ($rawResponse === false) {
        return [
            'ok' => false,
            'status' => 502,
            'message' => 'Could not connect to OpenClaw: ' . $curlError,
            'body' => null
        ];
    }

    $decoded = json_decode($rawResponse, true);
    if (!is_array($decoded)) {
        $responsePreview = trim(preg_replace('/\s+/', ' ', strip_tags((string) $rawResponse)));
        $responsePreview = mb_substr($responsePreview, 0, 500, 'UTF-8');

        return [
            'ok' => false,
            'status' => 502,
            'message' => sprintf(
                'OpenClaw returned a non-JSON response. HTTP status: %s. Content-Type: %s. Endpoint: %s. Response preview: %s',
                $status ?: 'unknown',
                $contentType !== '' ? $contentType : 'unknown',
                $endpoint,
                $responsePreview !== '' ? $responsePreview : '(empty response)'
            ),
            'body' => null
        ];
    }

    if ($status < 200 || $status >= 300) {
        return [
            'ok' => false,
            'status' => $status ?: 502,
            'message' => (string) ($decoded['error']['message'] ?? 'OpenClaw request failed.'),
            'body' => $decoded
        ];
    }

    return [
        'ok' => true,
        'status' => $status,
        'message' => '',
        'body' => $decoded
    ];
}

function extractResponseText(array $body): string
{
    if (isset($body['output_text']) && is_string($body['output_text'])) {
        return trim($body['output_text']);
    }

    $parts = [];
    foreach (($body['output'] ?? []) as $item) {
        if (!is_array($item)) {
            continue;
        }

        foreach (($item['content'] ?? []) as $content) {
            if (is_array($content) && isset($content['text']) && is_string($content['text'])) {
                $parts[] = $content['text'];
            }
        }
    }

    return trim(implode("\n", $parts));
}

function respondJson(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
