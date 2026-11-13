// ==========================================
// 1. CONEXIÓN SUPABASE
// ==========================================

const SUPABASE_URL = "https://hfyxxuwnjdocygmxbhmc.supabase.co";
const SUPABASE_KEY = "sb_publishable_CR5dzRzSf-87shQvPTUS1g_JoqBsqdy";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("MATH BATTLE conectado");

// ==========================================
// 2. VARIABLES GENERALES
// ==========================================

let codigoEstudianteMB = "";
let preguntasPracticaMB = [];
let preguntaActualMB = 0;
let puntosMB = 0;
let respondidaMB = false;
let modoExamenFinalMB = false;
let respuestasExamenMB = {};
let datosExamenFinalMB = null;
let temporizadorExamenMB = null;
let entregaEnProcesoMB = false;

// ==========================================
// 3. INICIO DE SESIÓN
// ==========================================

document.getElementById("loginBtn").addEventListener("click", async () => {
  const codigo = document.getElementById("studentCode").value.trim();
  const mensaje = document.getElementById("loginMessage");

  if (!codigo) {
    mensaje.textContent = "Ingresa tu código.";
    return;
  }

  mensaje.textContent = "Verificando...";
  const { data, error } = await db.rpc("login_estudiante", { p_codigo: codigo });

  if (error || !data) {
    mensaje.textContent = "Error: " + (error?.message || "Código inválido");
    console.error(error);
    return;
  }

  const estudiante = Array.isArray(data) ? data[0] : data;
  if (!estudiante) {
    mensaje.textContent = "No se encontró el estudiante.";
    return;
  }

  codigoEstudianteMB = codigo;
  mensaje.textContent = "¡Inicio de sesión correcto!";
  document.getElementById("login").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  document.getElementById("studentName").textContent = estudiante.nombre;

  await cargarMiResultadoMB();
  await cargarRankingMB();
  console.log("Perfil y ranking cargados");
});

// ==========================================
// 4. SELECCIÓN DE JUEGOS
// ==========================================

document.querySelectorAll(".game-card").forEach((boton) => {
  boton.addEventListener("click", () => {
    const juego = Number(boton.dataset.game);
    if (juego === 6) {
      iniciarExamenFinal();
      return;
    }
    modoExamenFinalMB = false;
    respuestasExamenMB = {};
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("setup").classList.remove("hidden");
    console.log("Minijuego seleccionado:", juego);
  });
});

// ==========================================
// 5. CARGAR PREGUNTA
// ==========================================

async function cargarPreguntaMB() {
  const pregunta = preguntasPracticaMB[preguntaActualMB];
  if (!pregunta) {
    console.error("No se encontró la pregunta.");
    return;
  }

  document.getElementById("questionText").textContent = pregunta.enunciado;
  document.getElementById("questionCounter").textContent =
    `Pregunta ${preguntaActualMB + 1} de ${preguntasPracticaMB.length}`;
  document.getElementById("feedback").textContent = "";
  document.getElementById("nextBtn").classList.add("hidden");

  const respuestas = document.getElementById("answers");
  respuestas.innerHTML = "";
  respondidaMB = false;

  pregunta.opciones.forEach((opcion) => {
    const boton = document.createElement("button");
    boton.className = "answer-btn";
    boton.textContent = opcion;

    boton.addEventListener("click", () => {
      if (respondidaMB || entregaEnProcesoMB) return;
      respondidaMB = true;

      if (modoExamenFinalMB) {
        respuestasExamenMB[pregunta.id] = opcion;
        document.getElementById("feedback").textContent = "Respuesta guardada.";
      } else {
        const correcta = opcion.trim() === pregunta.respuesta_correcta.trim();
        if (correcta) {
          puntosMB++;
          document.getElementById("feedback").textContent = "¡Correcto! 🎉";
        } else {
          document.getElementById("feedback").textContent =
            "Incorrecto. " + (pregunta.explicacion || "");
        }
      }

      respuestas.querySelectorAll("button").forEach((b) => { b.disabled = true; });
      document.getElementById("nextBtn").classList.remove("hidden");
    });

    respuestas.appendChild(boton);
  });
}

// ==========================================
// 6. INICIAR MINIJUEGOS
// ==========================================

document.getElementById("startBtn").addEventListener("click", async () => {
  const tema = document.getElementById("topic").value;
  const botonInicio = document.getElementById("startBtn");
  modoExamenFinalMB = false;
  respuestasExamenMB = {};
  botonInicio.textContent = "CARGANDO...";

  const { data, error } = await db.rpc("obtener_preguntas_practica", { p_tema: tema });
  botonInicio.textContent = "COMENZAR DESAFÍO →";

  if (error || !data || data.length === 0) {
    alert("Error: " + (error?.message || "No hay preguntas disponibles"));
    console.error(error);
    return;
  }

  preguntasPracticaMB = data;
  preguntaActualMB = 0;
  puntosMB = 0;
  document.getElementById("setup").classList.add("hidden");
  document.getElementById("quiz").classList.remove("hidden");
  cargarPreguntaMB();
});

// ==========================================
// 7. SIGUIENTE PREGUNTA
// ==========================================

document.getElementById("nextBtn").addEventListener("click", async () => {
  if (entregaEnProcesoMB) return;

  if (modoExamenFinalMB && preguntaActualMB >= preguntasPracticaMB.length - 1) {
    await entregarExamenFinalMB();
    return;
  }

  preguntaActualMB++;
  if (preguntaActualMB < preguntasPracticaMB.length) {
    cargarPreguntaMB();
    return;
  }

  document.getElementById("quiz").classList.add("hidden");
  document.getElementById("result").classList.remove("hidden");
  document.getElementById("resultScore").textContent =
    puntosMB + " / " + preguntasPracticaMB.length;
  document.getElementById("resultDescription").textContent =
    "¡Terminaste tu desafío matemático!";
});

// ==========================================
// 8. SALIR DEL JUEGO
// ==========================================

document.getElementById("exitQuiz").addEventListener("click", () => {
  if (modoExamenFinalMB) {
    alert("No puedes salir del examen final antes de entregarlo.");
    return;
  }
  document.getElementById("quiz").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
});

// ==========================================
// 9. VOLVER AL INICIO
// ==========================================

document.getElementById("homeBtn").addEventListener("click", async () => {
  document.getElementById("result").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  await cargarMiResultadoMB();
  await cargarRankingMB();
});

// ==========================================
// 10. INICIAR EXAMEN FINAL
// ==========================================

async function iniciarExamenFinal() {
  if (!codigoEstudianteMB) {
    alert("Primero debes iniciar sesión.");
    return;
  }

  const { data, error } = await db.rpc("iniciar_examen", {
    p_codigo: codigoEstudianteMB
  });

  if (error) {
    alert("Error al iniciar examen: " + error.message);
    console.error(error);
    return;
  }

  console.log("Examen recibido:", data);
  if (!data || !data.preguntas || data.preguntas.length !== 10) {
    alert("No se recibieron las 10 preguntas del examen.");
    return;
  }

  datosExamenFinalMB = data;
  modoExamenFinalMB = true;
  respuestasExamenMB = {};
  entregaEnProcesoMB = false;
  preguntasPracticaMB = data.preguntas;
  preguntaActualMB = 0;
  puntosMB = 0;

  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("quiz").classList.remove("hidden");
  cargarPreguntaMB();
  iniciarCronometroExamenMB();
}

// ==========================================
// 11. CRONÓMETRO DEL EXAMEN FINAL
// ==========================================

function iniciarCronometroExamenMB() {
  if (temporizadorExamenMB) clearInterval(temporizadorExamenMB);
  const inicio = new Date(datosExamenFinalMB.iniciado_en).getTime();
  const duracion = 40 * 60 * 1000;

  function actualizarTiempo() {
    const restante = Math.max(0, Math.ceil((inicio + duracion - Date.now()) / 1000));
    const minutos = Math.floor(restante / 60);
    const segundos = restante % 60;

    document.getElementById("timer").textContent =
      `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;

    if (restante <= 0) {
      clearInterval(temporizadorExamenMB);
      temporizadorExamenMB = null;
      entregarExamenFinalMB();
    }
  }

  actualizarTiempo();
  if (!entregaEnProcesoMB) temporizadorExamenMB = setInterval(actualizarTiempo, 1000);
}

// ==========================================
// 12. ENTREGA Y CALIFICACIÓN
// ==========================================

async function entregarExamenFinalMB() {
  if (entregaEnProcesoMB) return;
  if (!datosExamenFinalMB || !datosExamenFinalMB.sesion_id) {
    console.error("No hay una sesión de examen válida.");
    return;
  }

  entregaEnProcesoMB = true;
  document.getElementById("nextBtn").classList.add("hidden");
  document.getElementById("feedback").textContent = "Entregando y calificando tu examen...";

  const respuestas = preguntasPracticaMB.map((pregunta) => ({
    pregunta_id: pregunta.id,
    respuesta: respuestasExamenMB[pregunta.id] || ""
  }));

  const { data, error } = await db.rpc("entregar_examen", {
    p_codigo: codigoEstudianteMB,
    p_sesion: datosExamenFinalMB.sesion_id,
    p_respuestas: respuestas
  });

  if (error || !data || !data.success) {
    entregaEnProcesoMB = false;
    document.getElementById("feedback").textContent =
      "Error al entregar: " + (error?.message || "Intenta nuevamente.");
    document.getElementById("nextBtn").textContent = "REINTENTAR ENTREGA";
    document.getElementById("nextBtn").classList.remove("hidden");
    console.error(error);
    return;
  }

  if (temporizadorExamenMB) {
    clearInterval(temporizadorExamenMB);
    temporizadorExamenMB = null;
  }

  document.getElementById("quiz").classList.add("hidden");
  document.getElementById("result").classList.remove("hidden");
  document.getElementById("resultScore").textContent = data.nota + " / 45";
  document.getElementById("resultDescription").textContent =
    "Respuestas correctas: " + data.correctas + " de 10.";

  let revision = document.getElementById("examReview");
  if (revision) revision.remove();

  revision = document.createElement("div");
  revision.id = "examReview";
  const titulo = document.createElement("h3");
  titulo.textContent = "Revisión del examen";
  revision.appendChild(titulo);

  data.revision.forEach((item, indice) => {
    const bloque = document.createElement("div");
    const pregunta = document.createElement("h4");
    pregunta.textContent = "Pregunta " + (indice + 1) +
      (item.correcta ? " — Correcta" : " — Incorrecta");
    const tuRespuesta = document.createElement("p");
    tuRespuesta.textContent = "Tu respuesta: " + (item.respuesta_estudiante || "Sin responder");
    const respuestaCorrecta = document.createElement("p");
    respuestaCorrecta.textContent = "Respuesta correcta: " + item.respuesta_correcta;
    const explicacion = document.createElement("p");
    explicacion.textContent = "Explicación: " + (item.explicacion || "Sin explicación disponible.");
    bloque.append(pregunta, tuRespuesta, respuestaCorrecta, explicacion);
    revision.appendChild(bloque);
  });

  document.getElementById("resultDescription").parentNode.appendChild(revision);
  await cargarMiResultadoMB();
  await cargarRankingMB();
  entregaEnProcesoMB = false;
}

// ==========================================
// 13. CARGAR NOTA FINAL DEL ESTUDIANTE
// ==========================================

async function cargarMiResultadoMB() {
  const notaElemento = document.getElementById("myScore");
  notaElemento.textContent = "Cargando...";
  const { data, error } = await db.rpc("mi_resultado", { p_codigo: codigoEstudianteMB });

  if (error) {
    console.error("Error cargando nota:", error);
    notaElemento.textContent = "--";
    return;
  }
  if (!data || !data.realizado) {
    notaElemento.textContent = "Pendiente";
    return;
  }
  notaElemento.textContent = data.nota + " / 45";
}

// ==========================================
// 14. CARGAR TABLA DE POSICIONES
// ==========================================

async function cargarRankingMB() {
  const contenedor = document.getElementById("ranking");
  contenedor.textContent = "Cargando clasificación...";
  const { data, error } = await db.rpc("obtener_ranking");

  if (error) {
    console.error("Error cargando ranking:", error);
    contenedor.textContent = "No se pudo cargar la clasificación.";
    return;
  }

  contenedor.innerHTML = "";
  if (!data || data.length === 0) {
    contenedor.textContent = "Todavía no hay resultados.";
    return;
  }

  const tabla = document.createElement("table");
  tabla.style.width = "100%";
  const encabezado = document.createElement("tr");

  ["PUESTO", "ESTUDIANTE", "NOTA"].forEach((texto) => {
    const th = document.createElement("th");
    th.textContent = texto;
    encabezado.appendChild(th);
  });
  tabla.appendChild(encabezado);

  data.forEach((estudiante, indice) => {
    const fila = document.createElement("tr");
    const puesto = document.createElement("td");
    puesto.textContent = indice + 1;
    const nombre = document.createElement("td");
    nombre.textContent = estudiante.nombre;
    const nota = document.createElement("td");
    nota.textContent = estudiante.nota + " / 45";
    fila.append(puesto, nombre, nota);
    tabla.appendChild(fila);
  });

  contenedor.appendChild(tabla);
}

console.log("MATH BATTLE: JavaScript cargado correctamente");
