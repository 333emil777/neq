<?php
/**
 * ========================================================
 * MÓDULO DE SEGURIDAD GLOBAL - PHP
 * ========================================================
 * Incluye:
 * - Cabeceras HTTP de seguridad (Anti-clickjacking, XSS, Sniffing)
 * - Detección y bloqueo de bots, crawlers, scrapers y emuladores
 * - Limitación de tasa de solicitudes (Rate Limiting) por IP
 * - Detección real de IP de cliente (compatible con Cloudflare / Proxies)
 * - Sanitización estricta de entradas
 */

// Evitar acceso directo al archivo
if (basename($_SERVER['PHP_SELF'] ?? '') === basename(__FILE__)) {
    http_response_code(403);
    exit(json_encode(['ok' => false, 'error' => 'Acceso denegado']));
}

/**
 * Envía cabeceras HTTP de seguridad estrictas
 */
function send_security_headers() {
    if (!headers_sent()) {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('X-XSS-Protection: 1; mode=block');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    }
}

/**
 * Obtiene la IP real del cliente considerando Cloudflare, proxies y balanceadores
 */
function get_client_ip() {
    $headers = [
        'HTTP_CF_CONNECTING_IP', // Cloudflare
        'HTTP_X_REAL_IP',
        'HTTP_CLIENT_IP',
        'HTTP_X_FORWARDED_FOR',
        'REMOTE_ADDR'
    ];

    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $ips = explode(',', $_SERVER[$header]);
            $ip = trim($ips[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            } elseif (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }

    return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
}

/**
 * Verifica si el User-Agent corresponde a bots, rastreadores, librerías de scraping o emuladores
 */
function is_bot_user_agent() {
    $ua = strtolower($_SERVER['HTTP_USER_AGENT'] ?? '');

    // User-agent vacío o demasiado corto
    if (empty($ua) || strlen($ua) < 14) {
        return true;
    }

    $blockedSignatures = [
        'bot', 'crawl', 'spider', 'slurp', 'mediapartners', 'curl', 'wget',
        'python', 'httpclient', 'libwww', 'headless', 'phantomjs', 'selenium',
        'puppeteer', 'playwright', 'scrapy', 'postman', 'insomnia', 'http-client',
        'go-http-client', 'okhttp', 'java', 'aiohttp', 'requests', 'urllib',
        'axios', 'zgrab', 'nikto', 'sqlmap', 'nmap', 'semrush', 'ahrefsbot',
        'mj12bot', 'dotbot', 'petalbot', 'yandex', 'baiduspider', 'screaming frog'
    ];

    foreach ($blockedSignatures as $sig) {
        if (strpos($ua, $sig) !== false) {
            return true;
        }
    }

    return false;
}

/**
 * Sistema de Rate Limiting por IP para prevenir fuerza bruta y flood de solicitudes
 */
function check_rate_limit($actionKey = 'global', $maxAttempts = 30, $windowSeconds = 60) {
    $ip = get_client_ip();
    $tempDir = sys_get_temp_dir() . '/nequi_sec_limits';

    if (!is_dir($tempDir)) {
        @mkdir($tempDir, 0777, true);
    }

    $hash = hash('sha256', $ip . '_' . $actionKey);
    $filePath = $tempDir . '/' . $hash . '.json';
    $now = time();

    $data = ['count' => 0, 'first_time' => $now];

    if (file_exists($filePath)) {
        $content = @file_get_contents($filePath);
        $decoded = json_decode($content, true);
        if (is_array($decoded) && isset($decoded['count'], $decoded['first_time'])) {
            $data = $decoded;
        }
    }

    if (($now - $data['first_time']) > $windowSeconds) {
        $data = ['count' => 1, 'first_time' => $now];
    } else {
        $data['count']++;
    }

    @file_put_contents($filePath, json_encode($data), LOCK_EX);

    if ($data['count'] > $maxAttempts) {
        http_response_code(429);
        header('Retry-After: ' . ($windowSeconds - ($now - $data['first_time'])));
        exit(json_encode([
            'ok' => false,
            'error' => 'Demasiadas solicitudes. Por favor espera unos momentos antes de reintentar.'
        ]));
    }
}

/**
 * Sanitiza recursivamente cadenas y arreglos
 */
function sanitize_input($data) {
    if (is_array($data)) {
        foreach ($data as $key => $value) {
            $data[$key] = sanitize_input($value);
        }
    } else {
        $data = trim((string)$data);
        $data = stripslashes($data);
        $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    }
    return $data;
}

/**
 * Bloquea la petición si es un bot identificado
 */
function enforce_bot_protection() {
    if (is_bot_user_agent()) {
        http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
        exit('Acceso denegado: Agente no autorizado.');
    }
}
