// ============================================================
//  processor.worker.js  –  Web Worker de estadisticas
//  Recibe el array de tickets via postMessage, realiza todos los
//  calculos pesados en segundo plano y devuelve los resultados
//  sin bloquear el hilo principal de la UI.
// ============================================================

/**
 * Escucha mensajes del hilo principal.
 * Payload esperado: { tipo: "PROCESAR_TICKETS", tickets: Array }
 * Responde con: { tipo: "RESULTADO", stats: Object }
 *              o { tipo: "ERROR",    mensaje: string }
 */
self.addEventListener("message", (evento) => {
  const { tipo, tickets } = evento.data;

  if (tipo !== "PROCESAR_TICKETS") return;

  try {
    if (!Array.isArray(tickets)) {
      throw new Error("El payload 'tickets' debe ser un array.");
    }

    const stats = procesarTickets(tickets);

    self.postMessage({ tipo: "RESULTADO", stats });

  } catch (error) {
    self.postMessage({ tipo: "ERROR", mensaje: error.message });
  }
});


// --- Funcion principal de calculo ---------------------------

/**
 * Realiza todos los calculos estadisticos sobre el array de tickets.
 * @param {Array} tickets
 * @returns {Object} Objeto con todas las metricas calculadas
 */
function procesarTickets(tickets) {
  const total = tickets.length;

  // ── Conteos por estado ──────────────────────────────────────
  const conteoEstado = contarPorCampo(tickets, "estado");

  // ── Conteos por prioridad ───────────────────────────────────
  const conteoPrioridad = contarPorCampo(tickets, "prioridad");

  // ── Porcentajes por estado ──────────────────────────────────
  const porcentajeEstado = calcularPorcentajes(conteoEstado, total);

  // ── Porcentajes por prioridad ───────────────────────────────
  const porcentajePrioridad = calcularPorcentajes(conteoPrioridad, total);

  // ── Top 5 tickets mas recientes ─────────────────────────────
  const masRecientes = [...tickets]
    .sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn))
    .slice(0, 5)
    .map(({ id, titulo, estado, prioridad, creadoEn }) => ({
      id, titulo, estado, prioridad, creadoEn,
    }));

  // ── Ticket mas antiguo sin cerrar ───────────────────────────
  const sinCerrar = tickets
    .filter((t) => t.estado !== "cerrado")
    .sort((a, b) => new Date(a.creadoEn) - new Date(b.creadoEn));

  const masAntiguo = sinCerrar.length > 0 ? sinCerrar[0] : null;

  // ── Tiempo promedio hasta cierre (ms) ──────────────────────
  const cerrados = tickets.filter((t) => t.estado === "cerrado");
  let tiempoPromedioCierre = null;

  if (cerrados.length > 0) {
    const sumaMs = cerrados.reduce((acc, t) => {
      const creado = new Date(t.creadoEn).getTime();
      const actualizado = new Date(t.actualizadoEn).getTime();
      return acc + (actualizado - creado);
    }, 0);
    tiempoPromedioCierre = Math.round(sumaMs / cerrados.length / 1000 / 60); // en minutos
  }

  // ── Distribucion por prioridad ordenada de mayor a menor ───
  const prioridadOrden = ["critica", "alta", "media", "baja"];
  const prioridadOrdenada = prioridadOrden.map((p) => ({
    prioridad: p,
    cantidad: conteoPrioridad[p] ?? 0,
    porcentaje: porcentajePrioridad[p] ?? 0,
  }));

  // ── Resultado completo ──────────────────────────────────────
  return {
    total,
    conteoEstado,
    conteoPrioridad,
    porcentajeEstado,
    porcentajePrioridad,
    prioridadOrdenada,
    masRecientes,
    masAntiguo: masAntiguo
      ? { id: masAntiguo.id, titulo: masAntiguo.titulo, creadoEn: masAntiguo.creadoEn }
      : null,
    tiempoPromedioCierre,       // minutos  |  null si no hay cerrados
    totalSinCerrar: sinCerrar.length,
  };
}


// --- Utilidades puras ----------------------------------------

/**
 * Cuenta la frecuencia de cada valor de un campo en el array.
 * @param {Array}  items
 * @param {string} campo
 * @returns {Object} Mapa { valor: cantidad }
 */
function contarPorCampo(items, campo) {
  return items.reduce((acc, item) => {
    const valor = item[campo] ?? "desconocido";
    acc[valor] = (acc[valor] ?? 0) + 1;
    return acc;
  }, {});
}

/**
 * Convierte un mapa de conteos en porcentajes redondeados.
 * @param {Object} conteos
 * @param {number} total
 * @returns {Object} Mapa { valor: porcentaje }
 */
function calcularPorcentajes(conteos, total) {
  if (total === 0) return {};

  return Object.fromEntries(
    Object.entries(conteos).map(([clave, cantidad]) => [
      clave,
      Math.round((cantidad / total) * 100),
    ])
  );
}
