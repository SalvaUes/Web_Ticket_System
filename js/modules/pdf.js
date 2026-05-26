// DESCRIPCION GENERAL: utilidades y funcion de exportacion PDF
import { getTickets } from "./storage.js"; // leer tickets desde storage sin tocar app.js

// UTILIDADES: formateo de fecha
export function formatDate(isoString) { // formatea ISO a texto legible
  if (!isoString) return "-"; // placeholder cuando no hay fecha
  try { return new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(new Date(isoString)); } // usar Intl
  catch (e) { return isoString; } // fallback
}

// NORMALIZACION DE ETIQUETAS: estado
export function normalizeStateLabel(state) { const labels = { abierto: "Abierto", en_progreso: "En Progreso", cerrado: "Cerrado" }; return labels[state] || state; } // devuelve etiqueta legible

// NORMALIZACION DE ETIQUETAS: prioridad
export function normalizePriorityLabel(priority) { const labels = { baja: "Baja", media: "Media", alta: "Alta", critica: "Critica" }; return labels[priority] || priority; } // devuelve etiqueta legible

// EXPORTAR PDF: funcion principal que genera y descarga el PDF
export function exportPdfReport(tickets) { // tickets: array de objetos ticket
  if (!Array.isArray(tickets)) tickets = []; // asegurar array
  if (!window.jspdf || !window.jspdf.jsPDF) { alert("No se pudo cargar jsPDF por favor añade la libreria antes de usar Exportar PDF"); return; }

  const { jsPDF } = window.jspdf; // obtener constructor jsPDF
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }); // documento A4

  const total = tickets.length; // total de tickets
  const abiertos = tickets.filter(t => t.estado === "abierto").length; // cuenta abiertos
  const enProgreso = tickets.filter(t => t.estado === "en_progreso").length; // cuenta en progreso
  const cerrados = tickets.filter(t => t.estado === "cerrado").length; // cuenta cerrados
  const generacion = formatDate(new Date().toISOString()); // fecha generacion

  doc.setFillColor(20, 39, 78); doc.rect(0, 0, 210, 28, "F"); // header fondo
  doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.text("SoporteHub - Reporte de Tickets", 14, 16); // titulo header
  doc.setFontSize(10); doc.text(`Generado: ${generacion}`, 14, 23); // fecha generacion

  doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.text("Resumen general", 14, 40); if (doc.roundedRect) doc.roundedRect(14, 44, 182, 22, 3, 3); // resumen visual
  doc.setFontSize(10); doc.text(`Total: ${total}`, 18, 53); doc.text(`Abiertos: ${abiertos}`, 58, 53); doc.text(`En progreso: ${enProgreso}`, 110, 53); doc.text(`Cerrados: ${cerrados}`, 160, 53); // numeros resumen

  const body = tickets.length ? tickets.map((t, i) => [ String(i + 1), t.titulo || "", normalizeStateLabel(t.estado), normalizePriorityLabel(t.prioridad), t.descripcion || "", formatDate(t.creadoEn) ]) : [["-", "Sin tickets registrados", "-", "-", "-", "-"]]; // cuerpo tabla

  if (doc.autoTable) { // si plugin disponible crear tabla
    doc.autoTable({ startY: 72, head: [["#", "Titulo", "Estado", "Prioridad", "Descripcion", "Creado"]], body, theme: "grid", styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak", valign: "middle" }, headStyles: { fillColor: [20, 39, 78], textColor: [255, 255, 255] }, alternateRowStyles: { fillColor: [245, 247, 250] }, columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 35 }, 2: { cellWidth: 28 }, 3: { cellWidth: 22 }, 4: { cellWidth: 70 }, 5: { cellWidth: 25 } } }); // generar tabla
  }

  doc.save(`SoporteHub_Tickets_${new Date().toISOString().slice(0, 10)}.pdf`); // descargar PDF
}

// REGISTRO DEL BOTON: conectar el boton sin tocar app.js
const btnExport = document.getElementById("btn-export"); // obtener referencia del boton
if (btnExport && !btnExport.dataset.pdfBound) { // evitar doble registro
  btnExport.dataset.pdfBound = "true"; // marcar como registrado
  btnExport.addEventListener("click", () => exportPdfReport(getTickets())); // generar PDF con datos actuales
}
