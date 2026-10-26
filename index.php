<?php
/**
 * ========================================================
 * ENTRADA PRINCIPAL SEGURA - NEQUI
 * ========================================================
 * Aplica protección con PHP:
 * - Filtro anti-bots y crawlers maliciosos
 * - Cabeceras de seguridad HTTP
 * - Control de tasa de peticiones (Rate Limit)
 * - Renderizado seguro de la aplicación
 */

require_once __DIR__ . '/config/security.php';

// 1. Enviar cabeceras de seguridad
send_security_headers();

// 2. Bloquear bots conocidos y herramientas automatizadas
enforce_bot_protection();

// 3. Rate limiting de visitas
check_rate_limit('page_index', 90, 60);

// 4. Cargar y mostrar la página principal
if (file_exists(__DIR__ . '/index.html')) {
    include __DIR__ . '/index.html';
} else {
    http_response_code(404);
    echo 'Página no encontrada';
}
