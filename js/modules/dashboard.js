// ============================================================
//  dashboard.js  –  Renderizado de metricas, barras de prioridad,
//  panel de geolocalizacion/clima y conexion con el Web Worker.
// ============================================================

import { obtenerDatosGeo } from "./apiGeo.js";

// ── Referencias al DOM ──────────────────────────────────────
const geoPanelEl    = document.getElementById("geo-info");
const workerPanelEl = document.getElementById("worker-stats");
const priorityBarsEl = document.getElementById("priority-bars");
const btnGeo        = document.getElementById("btn-geo");

// ── Instancia unica del Web Worker ──────────────────────────
let worker = null;

function obtenerWorker() {
  if (!worker) {
    worker = new Worker("./js/workers/processor.worker.js");

    worker.addEventListener("message", (evento) => {
      const { tipo, stats, mensaje } = evento.data;

      if (tipo === "RESULTADO") {
        renderWorkerStats(stats);
        renderPriorityBars(stats.prioridadOrdenada);
      }

      if (tipo === "ERROR") {
        workerPanelEl.innerHTML = `<p class="muted">Error en Worker: ${mensaje}</p>`;
      }
    });

    worker.addEventListener("error", (e) => {
      console.error("Worker error:", e);
      workerPanelEl.innerHTML = `<p class="muted">El Worker encontro un error inesperado.</p>`;
    });
  }
  return worker;
}


// ── API publica: inicializar dashboard ──────────────────────

/**
 * Llamar desde app.js cada vez que cambie el array de tickets.
 * Dispara el Worker y, si es la primera vez, la geolocalizacion.
 * @param {Array} tickets
 */
export function actualizarDashboard(tickets) {
  // Worker: calculos pesados en segundo plano
  const w = obtenerWorker();
  w.postMessage({ tipo: "PROCESAR_TICKETS", tickets });
}

/**
 * Solicita (o refresca) los datos de geolocalizacion y clima.
 * Se llama al cargar la pagina y al pulsar "Actualizar ubicacion".
 */
export async function cargarGeo() {
  geoPanelEl.innerHTML = `<p class="muted">📡 Obteniendo ubicacion...</p>`;

  try {
    const datos = await obtenerDatosGeo();
    renderGeoPanel(datos);
  } catch (error) {
    geoPanelEl.innerHTML = `
      <p class="muted">⚠️ ${error.message}</p>
      <small class="muted">Comprueba los permisos de ubicacion del navegador.</small>
    `;
  }
}


// ── Renderizadores privados ──────────────────────────────────

/**
 * Pinta el panel de geolocalizacion con los datos recibidos.
 * @param {Object} datos  Retorno de obtenerDatosGeo()
 */
function renderGeoPanel(datos) {
  geoPanelEl.innerHTML = `
    <div class="geo-row">
      <span class="geo-emoji">${datos.emoji}</span>
      <div>
        <strong>${datos.ciudad}, ${datos.pais}</strong>
        <br />
        <span class="muted">${datos.descripcion}</span>
      </div>
    </div>
    <div class="geo-row geo-details">
      <span>🌡️ <strong>${datos.temperatura}°C</strong></span>
      <span>💧 Humedad: <strong>${datos.humedad}%</strong></span>
    </div>
    <div class="geo-coords muted">
      📍 ${datos.lat}, ${datos.lon}
    </div>
  `;
}

/**
 * Pinta las estadisticas producidas por el Web Worker.
 * @param {Object} stats  Retorno de procesarTickets() del Worker
 */
function renderWorkerStats(stats) {
  const { total, conteoEstado, tiempoPromedioCierre, masAntiguo, totalSinCerrar } = stats;

  // Filas de estado con porcentaje
  const filasEstado = Object.entries(conteoEstado)
    .map(([estado, cantidad]) => {
      const pct = total > 0 ? Math.round((cantidad / total) * 100) : 0;
      return `
        <div class="worker-row">
          <span class="worker-label">${capitalizarEstado(estado)}</span>
          <span class="worker-value">${cantidad} <small class="muted">(${pct}%)</small></span>
        </div>`;
    })
    .join("");

  const filaCierre = tiempoPromedioCierre !== null
    ? `<div class="worker-row">
         <span class="worker-label">⏱ Promedio cierre</span>
         <span class="worker-value">${tiempoPromedioCierre} min</span>
       </div>`
    : "";

  const filaAntiguo = masAntiguo
    ? `<div class="worker-row worker-oldest">
         <span class="worker-label">🕰 Mas antiguo abierto</span>
         <span class="worker-value" title="${masAntiguo.titulo}">
           ${masAntiguo.titulo.length > 28
             ? masAntiguo.titulo.slice(0, 28) + "…"
             : masAntiguo.titulo}
         </span>
       </div>`
    : "";

  workerPanelEl.innerHTML = `
    <div class="worker-row worker-total">
      <span class="worker-label">Total tickets</span>
      <span class="worker-value">${total}</span>
    </div>
    ${filasEstado}
    <div class="worker-row">
      <span class="worker-label">Sin cerrar</span>
      <span class="worker-value">${totalSinCerrar}</span>
    </div>
    ${filaCierre}
    ${filaAntiguo}
    <small class="muted worker-note">Calculado por Web Worker ⚙️</small>
  `;
}

/**
 * Pinta las barras de distribucion por prioridad en el dashboard.
 * @param {Array} prioridadOrdenada  [ { prioridad, cantidad, porcentaje }, … ]
 */
function renderPriorityBars(prioridadOrdenada) {
  if (!priorityBarsEl) return;

  const colores = {
    critica: "var(--danger)",
    alta:    "var(--warn)",
    media:   "var(--primary)",
    baja:    "var(--success)",
  };

  priorityBarsEl.innerHTML = prioridadOrdenada
    .map(({ prioridad, cantidad, porcentaje }) => `
      <div class="bar-row">
        <span class="bar-label">${capitalizarEstado(prioridad)}</span>
        <div class="bar-track">
          <div class="bar-fill"
               style="width:${porcentaje}%; background:${colores[prioridad] ?? "var(--accent)"};"
               role="progressbar"
               aria-valuenow="${porcentaje}"
               aria-valuemin="0"
               aria-valuemax="100">
          </div>
        </div>
        <span class="bar-count">${cantidad}</span>
      </div>
    `)
    .join("");
}

// ── Utilidad ─────────────────────────────────────────────────
function capitalizarEstado(texto) {
  return texto.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Boton "Actualizar ubicacion" ─────────────────────────────
if (btnGeo) {
  btnGeo.addEventListener("click", cargarGeo);
}

// ── CONTRATO CON EL WORKER ───────────────────────────────
import { obtenerDatosGeo } from "./apiGeo.js";
import { getTickets, saveTickets } from "./storage.js";
import { createTicket } from "./crud.js";


// ── Referencias al DOM ──────────────────────────────────────
const geoPanelEl    = document.getElementById("geo-info");
const workerPanelEl = document.getElementById("worker-stats");
const priorityBarsEl = document.getElementById("priority-bars");
const btnGeo        = document.getElementById("btn-geo");
const btnSeed       = document.getElementById("btn-seed");
const btnNotify      = document.getElementById("btn-notify");


// ── Instancia única del Web Worker ──────────────────────────
let worker = null;

function obtenerWorker() {
  if (!worker) {
    worker = new Worker("./js/workers/processor.worker.js");
    worker.addEventListener("message", (evento) => {
      const { tipo, stats, mensaje } = evento.data;

      if (tipo === "RESULTADO") {
        renderWorkerStats(stats);
        renderPriorityBars(stats.prioridadOrdenada);
      }
      if (tipo === "ERROR") {
        workerPanelEl.innerHTML = `<p class="muted">Error en Worker: ${mensaje}</p>`;
      }
    });
    worker.addEventListener("error", (e) => {
      console.error("Worker error:", e);
      workerPanelEl.innerHTML = `<p class="muted">El Worker encontró un error inesperado.</p>`;
    });
  }
  return worker;
}


// ── API pública: llamada desde app.js ───────────────────────
/**
 * Envía los tickets al Worker para calcular estadísticas.
 * app.js llama esto cada vez que cambia el array de tickets.
 * @param {Array} tickets
 */
export function actualizarDashboard(tickets) {
  const w = obtenerWorker();
  w.postMessage({ tipo: "PROCESAR_TICKETS", tickets });
}

/*Solicita o refresca los datos de geolocalización y clima.
Se llama al cargar la página y al pulsar "Actualizar ubicación".*/
export async function cargarGeo() {
  geoPanelEl.innerHTML = `<div class="geo-loading">
    <p class="muted">Obteniendo ubicación...</p></div>`;
    
  try {
    const datos = await obtenerDatosGeo();
    renderGeoPanel(datos);
  } catch (error) {
    geoPanelEl.innerHTML = `
      <p class="muted">⚠️ ${error.message}</p>
      <small class="muted">Comprueba los permisos de ubicación del navegador.</small>
    `;
  }
}


// ── Renderizadores privados ──────────────────────────────────

function renderGeoPanel(datos) {
  geoPanelEl.innerHTML = `
    <div class="geo-row">
      <span class="geo-emoji">${datos.emoji}</span>
      <div>
        <strong>${escapeHtml(datos.ciudad)}, ${escapeHtml(datos.pais)}</strong>
        <br />
        <span class="muted">${escapeHtml(datos.descripcion)}</span>
      </div>
    </div>
    <div class="geo-row geo-details"> 
      <span>🌡️ <strong>${datos.temperatura}°C</strong></span>
      <span>💧 Humedad: <strong>${datos.humedad}%</strong></span>
    </div>
    <div class="geo-coords muted">
      📍 ${datos.lat}, ${datos.lon}
    </div>
  `;
}

/**Pinta el panel Procesador por Web Worker
 *usa el nombre de los campos exactos que devuelve procesor.worker.js
* @param {Object} stats — retorno de procesarTickets() del Worker
 */
function renderWorkerStats(stats) {
  const { total, conteoEstado, tiempoPromedioCierre, masAntiguo, totalSinCerrar } = stats;

  const filasEstado = Object.entries(conteoEstado)
    .map(([estado, cantidad]) => {
      const pct = total > 0 ? Math.round((cantidad / total) * 100) : 0;
      return `
        <div class="worker-row">
          <span class="worker-label">${capitalizarEstado(estado)}</span>
          <span class="worker-value">${cantidad} <small class="muted">(${pct}%)</small></span>
        </div>`;
    })
    .join("");

  const filaCierre = tiempoPromedioCierre !== null
    ? `<div class="worker-row">
          <span class="worker-label">⏱ Promedio cierre</span>
          <span class="worker-value">${tiempoPromedioCierre} min</span>
        </div>`
    : "";
  const filaAntiguo = masAntiguo 
    ? `<div class="worker-row worker-oldest">
          <span class="worker-label">🕰 Más antiguo abierto</span>
          <span class="worker-value">${truncate(masAntiguo.titulo, 28)}</span>">
        </div>`
    : "";

  workerPanelEl.innerHTML = `
    <div class="worker-row worker-total">
      <span class="worker-label">Total tickets</span>
      <span class="worker-value">${total}</span>
    </div>
    ${filasEstado}
    <div class="worker-row">
      <span class="worker-label">Sin cerrar</span>
      <span class="worker-value">${totalSinCerrar}</span>
    </div>
    ${filaCierre}
    ${filaAntiguo}
    <small class="muted worker-note">Calculado por Web Worker ⚙️</small>
  `;
}

/**
 * Pinta las barras de distribución por prioridad.
 * @param {Array} prioridadOrdenada — [{ prioridad, cantidad, porcentaje }, ...]
 */

function renderPriorityBars(prioridadOrdenada) {
  if (!priorityBarsEl) return;

  const colores = {
    critica: "var(--danger)",
    alta:    "var(--warn)",
    media:   "var(--primary)",
    baja:    "var(--success)",
  };

  priorityBarsEl.innerHTML = prioridadOrdenada
  .map(({ prioridad, cantidad, porcentaje }) => `
    <div class="bar-row">
      <span class="bar-label">${capitalizarEstado(prioridad)}</span>
      <div class="bar-track">
        <div class="bar-fill"
              style="width:${porcentaje}%; background:${colores[prioridad] ?? "var(--accent)"};"
              role="progressbar"
              aria-valuenow="${porcentaje}"
              aria-valuemin="0"
              aria-valuemax="100">
        </div>
      </div>
      <span class="bar-count">${cantidad}</span>
    </div>
  `)
  .join("");
}

// ── Botón "Cargar datos demo" ────────────────────────────────
if (btnSeed) {
  btnSeed.addEventListener("click", () => {
    try {
      const demos= [
        {titulo: "Error critico en modulo de pagos", descripcion: "El sistema no procesa pagos con tarjetas de crédito", estado: "abierto", prioridad: "critica", fechaCreacion: "2024-05-01T10:00:00Z"},
        {titulo: "Fallo al generar reportes", descripcion: "Los reportes mensuales no se generan correctamente", estado: "abierto", prioridad: "alta", fechaCreacion: "2024-05-03T14:30:00Z"},
        {titulo: "Interfaz lenta en dispositivos móviles", descripcion: "La aplicación se vuelve lenta al acceder desde smartphones", estado: "en_progreso", prioridad: "media", fechaCreacion: "2024-05-05T09:15:00Z"},
        {titulo: "Consultas del Dashboard muy lentas", descripcion: "Las consultas tardan mas de 5 segundos en responder", estado: "cerrado", prioridad: "baja", fechaCreacion: "2024-05-07T11:45:00Z"},
        {titulo: "Error al adjuntar archivos", descripcion: "Los usuarios no pueden adjuntar archivos a los tickets", estado: "abierto", prioridad: "alta", fechaCreacion: "2024-05-10T08:20:00Z"},
        {titulo: "Notificaciones por email no llegan", descripcion: "Los usuarios no reciben emails de notificación", estado: "en_progreso", prioridad: "media", fechaCreacion: "2024-05-12T16:00:00Z"},
        {titulo: "Problemas de compatibilidad con Safari", descripcion: "La aplicación presenta fallos visuales en Safari", estado: "abierto", prioridad: "baja", fechaCreacion: "2024-05-15T13:10:00Z"},
        {titulo: "Error 500 en el módulo de autenticación", descripcion: "Los usuarios reciben un error 500 al intentar iniciar sesión", estado: "cerrado", prioridad: "critica", fechaCreacion: "2024-05-18T17:25:00Z"},

      ];

      const ticketsExistentes = getTickets();
      const nuevosTickets = demos.map((data, i) => {
        const ticket = createTicket(data);
        ticket.creadoEn = new Date(Date.now() - (i+1)*1.2*24*60*60*1000).toISOString(); // Fechas escalonadas) ;
        if (data.estado === "cerrado") {
          ticket.actualizadoEn = new Date(Date.now() - 6*60*60*1000).toISOString(); // Cierre 20% después de creación
        }
        return ticket;
      });

      saveTickets([...ticketsExistentes, ...nuevosTickets]);
      window.location.reload(); // Recarga para reflejar los cambios
    } catch (error) {
      console.error("[Dashboard] Error al cargar datos demo:", error);
          }
          
        });
      }

      // ── Botón "Notificación de prueba" ───────────────────────────
      if (btnNotify) {
        btnNotify.addEventListener("click", () => {
          try {
            if (!("Notification" in window)) {
              alert("Tu navegador no soporta notificaciones.");
              return;
            }

            const permiso = await Notification.requestPermission();
            if (permiso === "granted") {
              const tickets = getTickets();
              const criticos = tickets.filter(t => t.prioridad === "critica" && t.estado !== "cerrado").length;

              new Notification("SoporteHub 🎫", {
                body : criticos > 0
                  ? `⚠️Hay ${criticos} tickets (s) criticos(s) sin cerrar.`
                  : `✅ Sistema activo · ${tickets.length} ticket(s) en total.`,
                  tag: "soportehub-notify"
              });
            } else {
              mostrarToastLocal("Permiso de notificaciones denegado.");
            }
          } catch (error) {
            console.error("[Dashboard] Error al enviar notificación:", error);
          }
        });
      }
      // ── Botón "Actualizar ubicación" ─────────────────────────────
      if (btnGeo) {
        btnGeo.addEventListener("click", cargarGeo);
      }

// ── Utilidades ───────────────────────────────────────────────
function setTextContent(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function animateValue(id, value) {
  const element = document.getElementById(id);
  if (!element) return;
  element.classList.remove("metric-pop");
  requestAnimationFrame(() => element.classList.add("metric-pop"));
}

function truncate(str, max) {
  if(!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function escapeHtml(str = "") {
  return str
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
}

function capitalizarEstado(texto) {
  return texto.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function mostrarToastLocal(mensaje, tipo = "warning") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensaje;
  toast.setAttribute("role", "alert");
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
