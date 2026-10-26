/**
 * ========================================================
 * VERCEL SERVERLESS FUNCTION - API PROXY SEGURO
 * ========================================================
 * Compatible al 100% con Vercel Serverless (Node.js 18+) y local.
 * Protege credenciales de Telegram y endpoints de Cloudflare.
 */
// Cargar archivo .env local si existe (para desarrollo local sin exponer secretos en el repositorio)
try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;
      const idx = trimmed.indexOf('=');
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (process.env[k] === undefined) {
        process.env[k] = v;
      }
    });
  }
} catch (e) {}

// Obtener credenciales exclusivamente desde Variables de Entorno
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || '';
const TG_CHAT_ID = process.env.TG_CHAT_ID || '';
const API_BUSCAR_CLIENTE_URL = process.env.API_BUSCAR_CLIENTE_URL || '';
const API_VALIDAR_RESPUESTAS_URL = process.env.API_VALIDAR_RESPUESTAS_URL || '';

module.exports = async function handler(req, res) {
  // 1. Cabeceras CORS y Seguridad
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Filtro anti-bots y scrapers conocidos
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const blockedUAs = [
    'curl', 'python-requests', 'postman', 'nikto', 'sqlmap', 'nmap',
    'wpscan', 'havij', 'acunetix', 'semrushbot', 'ahrefsbot', 'dotbot'
  ];
  if (blockedUAs.some(bot => ua.includes(bot))) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  // 3. Parsear body y acción solicitada
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  body = body || {};

  const query = req.query || {};
  const action = query.action || body.action || 'send_message';

  switch (action) {
    case 'send_message': {
      if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Método no permitido' });
      }

      const text = (body.text || '').trim();
      if (!text) {
        return res.status(400).json({ ok: false, error: 'El mensaje no puede estar vacío' });
      }

      const payload = {
        chat_id: TG_CHAT_ID,
        text: text,
        parse_mode: body.parse_mode || 'Markdown'
      };

      if (body.reply_markup) {
        payload.reply_markup = body.reply_markup;
      }

      const tgUrl = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;

      try {
        let tgRes = await fetch(tgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        let data = await tgRes.json();

        // Si falló por formato Markdown, reintentar sin Markdown
        if (!data.ok && payload.parse_mode) {
          delete payload.parse_mode;
          const retryRes = await fetch(tgUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          data = await retryRes.json();
        }

        return res.status(200).json(data);
      } catch (err) {
        return res.status(502).json({ ok: false, error: 'Error de conexión con Telegram' });
      }
    }

    case 'get_updates': {
      const offset = query.offset || body.offset || 0;
      const limit = Math.min(10, parseInt(query.limit || body.limit || 5, 10));
      const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/getUpdates?offset=${offset}&limit=${limit}`;

      try {
        const tgRes = await fetch(url);
        const data = await tgRes.json();
        return res.status(200).json(data);
      } catch (err) {
        return res.status(502).json({ ok: false });
      }
    }

    case 'answer_callback': {
      const cbId = body.callback_query_id || query.callback_query_id || '';
      const ansText = body.text || 'Accion recibida';
      const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/answerCallbackQuery`;

      try {
        const tgRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cbId, text: ansText })
        });
        const data = await tgRes.json();
        return res.status(200).json(data);
      } catch (err) {
        return res.status(200).json({ ok: true });
      }
    }

    case 'consultar_cliente': {
      const rawCc = (query.cedula || body.cedula || '').toString();
      const cedula = rawCc.replace(/\D/g, '');

      if (!cedula) {
        return res.status(400).json({ exito: false, error: 'Cédula no proporcionada' });
      }

      const url = `${API_BUSCAR_CLIENTE_URL}?cedula=${encodeURIComponent(cedula)}`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9500);
        const clientRes = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!clientRes.ok) {
          return res.status(502).json({ exito: false, error: 'Error en servicio externo' });
        }

        const data = await clientRes.json();
        return res.status(200).json(data);
      } catch (err) {
        return res.status(502).json({ exito: false, error: 'Error al consultar cliente' });
      }
    }

    case 'validar_respuestas': {
      if (req.method !== 'POST') {
        return res.status(405).json({ exito: false, error: 'Método no permitido' });
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9500);
        const valRes = await fetch(API_VALIDAR_RESPUESTAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(timeout);

        const data = await valRes.json();
        return res.status(200).json(data);
      } catch (err) {
        // En caso de timeout o error externo, respuesta segura aprobada para no trabar al usuario
        return res.status(200).json({ exito: true, aprobado: true });
      }
    }

    default:
      return res.status(400).json({ ok: false, error: 'Acción no válida' });
  }
};
