// ============================================================
//  dashboard.js  - Renderizado de metricas del dashboard,
//  geolocalizacion/clima y procesamiento con Web Worker.
// ============================================================

import { obtenerDatosGeo } from "./apiGeo.js";
import { getTickets, saveTickets } from "./storage.js";
import { createTicket } from "./crud.js";

const geoPanelEl = document.getElementById("geo-info");
const workerPanelEl = document.getElementById("worker-stats");
const priorityBarsEl = document.getElementById("priority-bars");

const btnGeo = document.getElementById("btn-geo");
const btnSeed = document.getElementById("btn-seed");
const btnNotify = document.getElementById("btn-notify");

let worker = null;

function obtenerWorker() {
  if (!worker) {
    worker = new Worker("./js/workers/processor.worker.js");

    worker.addEventListener("message", (evento) => {
      const { tipo, stats, mensaje } = evento.data ?? {};

      if (tipo === "RESULTADO") {
        renderWorkerStats(stats ?? {});
        renderPriorityBars(stats?.prioridadOrdenada ?? []);
        return;
      }

      if (tipo === "ERROR") {
        renderStatus(workerPanelEl, `Error en Worker: ${mensaje ?? "desconocido"}`);
      }
    });

    worker.addEventListener("error", (error) => {
      console.error("Worker error:", error);
      renderStatus(workerPanelEl, "El Worker encontro un error inesperado.");
    });
  }

  return worker;
}

export function actualizarDashboard(tickets) {
  const w = obtenerWorker();
  w.postMessage({ tipo: "PROCESAR_TICKETS", tickets: Array.isArray(tickets) ? tickets : [] });
}

export async function cargarGeo() {
  renderStatus(geoPanelEl, "Obteniendo ubicacion...");

  try {
    const datos = await obtenerDatosGeo();
    renderGeoPanel(datos);
  } catch (error) {
    renderGeoError(error?.message ?? "No se pudo obtener la ubicacion.");
  }
}

function renderGeoPanel(datos) {
  if (!geoPanelEl) return;

  clearElement(geoPanelEl);

  const topRow = createElement("div", { className: "geo-row" });
  const emoji = createElement("span", {
    className: "geo-emoji",
    text: String(datos?.emoji ?? "🌤️"),
    attrs: { "aria-hidden": "true" },
  });

  const locationBlock = createElement("div");
  const strong = createElement("strong", {
    text: `${String(datos?.ciudad ?? "Ciudad desconocida")}, ${String(datos?.pais ?? "Pais desconocido")}`,
  });
  const br = document.createElement("br");
  const desc = createElement("span", {
    className: "muted",
    text: String(datos?.descripcion ?? "Sin descripcion"),
  });

  locationBlock.append(strong, br, desc);
  topRow.append(emoji, locationBlock);

  const detailsRow = createElement("div", { className: "geo-row geo-details" });
  detailsRow.append(
    createLabeledValue("🌡️", `${String(datos?.temperatura ?? "-")}°C`),
    createLabeledValue("💧 Humedad", `${String(datos?.humedad ?? "-")}%`)
  );

  const coords = createElement("div", {
    className: "geo-coords muted",
    text: `📍 ${String(datos?.lat ?? "-")}, ${String(datos?.lon ?? "-")}`,
  });

  geoPanelEl.append(topRow, detailsRow, coords);
}

function renderGeoError(message) {
  if (!geoPanelEl) return;

  clearElement(geoPanelEl);

  const warning = createElement("p", {
    className: "muted",
    text: `⚠️ ${message}`,
  });
  const help = createElement("small", {
    className: "muted",
    text: "Comprueba los permisos de ubicacion del navegador.",
  });

  geoPanelEl.append(warning, help);
}

function renderWorkerStats(stats) {
  if (!workerPanelEl) return;

  clearElement(workerPanelEl);

  const total = Number(stats?.total ?? 0);
  const conteoEstado = stats?.conteoEstado ?? {};
  const tiempoPromedioCierre = stats?.tiempoPromedioCierre ?? null;
  const masAntiguo = stats?.masAntiguo ?? null;
  const totalSinCerrar = Number(stats?.totalSinCerrar ?? 0);

  workerPanelEl.append(createWorkerRow("Total tickets", String(total), "worker-total"));

  Object.entries(conteoEstado).forEach(([estado, cantidad]) => {
    const pct = total > 0 ? Math.round((Number(cantidad) / total) * 100) : 0;
    const valueWrap = document.createElement("span");
    valueWrap.className = "worker-value";
    valueWrap.append(document.createTextNode(`${cantidad} `));
    valueWrap.append(
      createElement("small", { className: "muted", text: `(${pct}%)` })
    );

    const row = createElement("div", { className: "worker-row" });
    row.append(
      createElement("span", { className: "worker-label", text: capitalizarEstado(estado) }),
      valueWrap
    );
    workerPanelEl.append(row);
  });

  workerPanelEl.append(createWorkerRow("Sin cerrar", String(totalSinCerrar)));

  if (tiempoPromedioCierre !== null) {
    workerPanelEl.append(createWorkerRow("⏱ Promedio cierre", `${tiempoPromedioCierre} min`));
  }

  if (masAntiguo && typeof masAntiguo.titulo === "string") {
    const row = createElement("div", { className: "worker-row worker-oldest" });
    const label = createElement("span", {
      className: "worker-label",
      text: "🕰 Mas antiguo abierto",
    });
    const value = createElement("span", {
      className: "worker-value",
      text: truncate(masAntiguo.titulo, 28),
      attrs: { title: masAntiguo.titulo },
    });

    row.append(label, value);
    workerPanelEl.append(row);
  }

  workerPanelEl.append(
    createElement("small", {
      className: "muted worker-note",
      text: "Calculado por Web Worker ⚙️",
    })
  );
}

function renderPriorityBars(prioridadOrdenada) {
  if (!priorityBarsEl) return;

  const colores = {
    critica: "var(--danger)",
    alta: "var(--warn)",
    media: "var(--primary)",
    baja: "var(--success)",
  };

  clearElement(priorityBarsEl);

  const filas = Array.isArray(prioridadOrdenada) ? prioridadOrdenada : [];

  filas.forEach(({ prioridad, cantidad, porcentaje }) => {
    const row = createElement("div", { className: "bar-row" });
    const label = createElement("span", {
      className: "bar-label",
      text: capitalizarEstado(String(prioridad ?? "desconocido")),
    });

    const track = createElement("div", { className: "bar-track" });
    const fill = createElement("div", {
      className: "bar-fill",
      attrs: {
        role: "progressbar",
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": String(Number(porcentaje ?? 0)),
        "aria-label": `Prioridad ${String(prioridad ?? "desconocida")}`,
      },
    });

    const safePct = Math.max(0, Math.min(100, Number(porcentaje ?? 0)));
    fill.style.width = `${safePct}%`;
    fill.style.background = colores[prioridad] ?? "var(--accent)";

    track.append(fill);

    const count = createElement("span", {
      className: "bar-count",
      text: String(cantidad ?? 0),
    });

    row.append(label, track, count);
    priorityBarsEl.append(row);
  });
}

if (btnGeo) {
  btnGeo.addEventListener("click", cargarGeo);
}

if (btnSeed) {
  btnSeed.addEventListener("click", () => {
    try {
      const demos = [
        {
          titulo: "Error critico en modulo de pagos",
          descripcion: "El sistema no procesa pagos con tarjetas de credito",
          estado: "abierto",
          prioridad: "critica",
        },
        {
          titulo: "Fallo al generar reportes",
          descripcion: "Los reportes mensuales no se generan correctamente",
          estado: "abierto",
          prioridad: "alta",
        },
        {
          titulo: "Interfaz lenta en dispositivos moviles",
          descripcion: "La aplicacion se vuelve lenta al acceder desde smartphones",
          estado: "en_progreso",
          prioridad: "media",
        },
        {
          titulo: "Consultas del dashboard muy lentas",
          descripcion: "Las consultas tardan mas de 5 segundos en responder",
          estado: "cerrado",
          prioridad: "baja",
        },
        {
          titulo: "Error al adjuntar archivos",
          descripcion: "Los usuarios no pueden adjuntar archivos a los tickets",
          estado: "abierto",
          prioridad: "alta",
        },
        {
          titulo: "Notificaciones por email no llegan",
          descripcion: "Los usuarios no reciben emails de notificacion",
          estado: "en_progreso",
          prioridad: "media",
        },
        {
          titulo: "Problemas de compatibilidad con Safari",
          descripcion: "La aplicacion presenta fallos visuales en Safari",
          estado: "abierto",
          prioridad: "baja",
        },
        {
          titulo: "Error 500 en el modulo de autenticacion",
          descripcion: "Los usuarios reciben un error 500 al intentar iniciar sesion",
          estado: "cerrado",
          prioridad: "critica",
        },
      ];

      const ticketsExistentes = getTickets();
      const nuevosTickets = demos.map((data, index) => {
        const ticket = createTicket(data);
        ticket.creadoEn = new Date(Date.now() - (index + 1) * 1.2 * 24 * 60 * 60 * 1000).toISOString();

        if (data.estado === "cerrado") {
          ticket.actualizadoEn = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
        }

        return ticket;
      });

      saveTickets([...ticketsExistentes, ...nuevosTickets]);
      window.location.reload();
    } catch (error) {
      console.error("[Dashboard] Error al cargar datos demo:", error);
    }
  });
}

if (btnNotify) {
  btnNotify.addEventListener("click", async () => {
    try {
      if (!("Notification" in window)) {
        showLocalToast("Tu navegador no soporta notificaciones.", "warn");
        return;
      }

      const permiso = await Notification.requestPermission();

      if (permiso !== "granted") {
        showLocalToast("Permiso de notificaciones denegado.", "warn");
        return;
      }

      const tickets = getTickets();
      const criticos = tickets.filter((t) => t.prioridad === "critica" && t.estado !== "cerrado").length;

      new Notification("SoporteHub", {
        body:
          criticos > 0
            ? `⚠️ Hay ${criticos} ticket(s) critico(s) sin cerrar.`
            : `✅ Sistema activo - ${tickets.length} ticket(s) en total.`,
        tag: "soportehub-notify",
      });
    } catch (error) {
      console.error("[Dashboard] Error al enviar notificacion:", error);
    }
  });
}

function createWorkerRow(label, value, extraClass = "") {
  const row = createElement("div", {
    className: `worker-row ${extraClass}`.trim(),
  });
  row.append(
    createElement("span", { className: "worker-label", text: label }),
    createElement("span", { className: "worker-value", text: value })
  );
  return row;
}

function createLabeledValue(labelText, valueText) {
  const wrap = createElement("span");
  wrap.append(document.createTextNode(`${labelText} `));
  wrap.append(createElement("strong", { text: valueText }));
  return wrap;
}

function createElement(tag, options = {}) {
  const el = document.createElement(tag);

  if (options.className) {
    el.className = options.className;
  }

  if (typeof options.text === "string") {
    el.textContent = options.text;
  }

  if (options.attrs && typeof options.attrs === "object") {
    Object.entries(options.attrs).forEach(([name, value]) => {
      el.setAttribute(name, String(value));
    });
  }

  return el;
}

function renderStatus(container, message) {
  if (!container) return;
  clearElement(container);
  container.append(createElement("p", { className: "muted", text: message }));
}

function clearElement(element) {
  if (!element) return;
  element.replaceChildren();
}

function truncate(str, max) {
  if (!str) return "";
  return str.length > max ? `${str.slice(0, max)}...` : str;
}

function capitalizarEstado(texto) {
  return String(texto)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function showLocalToast(mensaje, tipo = "warn") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = createElement("div", {
    className: `toast toast-${tipo}`,
    text: mensaje,
    attrs: { role: "alert" },
  });

  container.append(toast);
  setTimeout(() => toast.remove(), 3000);
}
