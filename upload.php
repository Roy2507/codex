<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'error' => ['message' => 'Only POST requests are allowed.']
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (!isset($_FILES['upload']) || !is_array($_FILES['upload'])) {
    http_response_code(400);
    echo json_encode([
        'error' => ['message' => 'No upload file was received.']
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$file = $_FILES['upload'];

if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode([
        'error' => ['message' => 'The image upload failed.']
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$maxSize = 5 * 1024 * 1024;
if (($file['size'] ?? 0) > $maxSize) {
    http_response_code(400);
    echo json_encode([
        'error' => ['message' => 'Image size must be 5MB or smaller.']
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$tmpName = (string) ($file['tmp_name'] ?? '');
if ($tmpName === '' || !is_uploaded_file($tmpName)) {
    http_response_code(400);
    echo json_encode([
        'error' => ['message' => 'Invalid uploaded file.']
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = (string) $finfo->file($tmpName);

$allowedMimeTypes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/gif' => 'gif',
    'image/webp' => 'webp'
];

if (!isset($allowedMimeTypes[$mimeType])) {
    http_response_code(400);
    echo json_encode([
        'error' => ['message' => 'Only JPG, PNG, GIF, and WEBP images are allowed.']
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$uploadDirectory = __DIR__ . DIRECTORY_SEPARATOR . 'uploads';
if (!is_dir($uploadDirectory) && !mkdir($uploadDirectory, 0775, true) && !is_dir($uploadDirectory)) {
    http_response_code(500);
    echo json_encode([
        'error' => ['message' => 'Could not create the upload directory.']
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$fileName = sprintf(
    '%s.%s',
    bin2hex(random_bytes(16)),
    $allowedMimeTypes[$mimeType]
);

$destination = $uploadDirectory . DIRECTORY_SEPARATOR . $fileName;
if (!move_uploaded_file($tmpName, $destination)) {
    http_response_code(500);
    echo json_encode([
        'error' => ['message' => 'Failed to save the uploaded image.']
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
$publicBasePath = $basePath === '' ? '' : $basePath;
$url = $scheme . '://' . $host . $publicBasePath . '/uploads/' . $fileName;

echo json_encode([
    'url' => $url
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
