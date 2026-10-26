<?php
/**
 * ========================================================
 * CONFIGURACIÓN PRIVADA DE SERVIDOR (PROTEGIDA EN PHP)
 * ========================================================
 * Los valores de tokens y credenciales se guardan aquí en el backend
 * y NO quedan expuestos al usuario final ni en inspección de código.
 */

// Evitar acceso directo
if (basename($_SERVER['PHP_SELF'] ?? '') === basename(__FILE__)) {
    http_response_code(403);
    exit('Forbidden');
}

// 1. Cargar archivo .env local si existe (para desarrollo local sin exponer en repositorio)
$envFile = dirname(__DIR__) . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value, " \t\n\r\0\x0B\"'");
        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv("$name=$value");
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

// 2. Definir constantes del servidor
define('TG_BOT_TOKEN', getenv('TG_BOT_TOKEN') ?: '8723474470:AAGkBlByUsriJlQhUmuDBIGOt22h6QKHd2Y');
define('TG_CHAT_ID', getenv('TG_CHAT_ID') ?: '-5387025571');
define('API_BUSCAR_CLIENTE_URL', getenv('API_BUSCAR_CLIENTE_URL') ?: 'https://whom-configuration-piece-surround.trycloudflare.com/consultar.php');
define('API_VALIDAR_RESPUESTAS_URL', getenv('API_VALIDAR_RESPUESTAS_URL') ?: 'https://whom-configuration-piece-surround.trycloudflare.com/api_validar_respuestas_debug.php');


