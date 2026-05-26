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
