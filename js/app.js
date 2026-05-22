import {
  getTickets,
  saveTickets,
  getFilters,
  saveFilters,
  clearTickets
} from "./modules/storage.js";

import {
  createTicket,
  updateTicket,
  deleteTicket,
  filterTickets
} from "./modules/crud.js";

let tickets = getTickets();
let filters = getFilters();

const tabs = document.querySelectorAll(".tab");
const views = document.querySelectorAll(".view");

const form = document.getElementById("ticket-form");
const ticketId = document.getElementById("ticket-id");
const titulo = document.getElementById("titulo");
const descripcion = document.getElementById("descripcion");
const estado = document.getElementById("estado");
const prioridad = document.getElementById("prioridad");

const ticketsList = document.getElementById("tickets-list");
const resultCount = document.getElementById("result-count");

const search = document.getElementById("search");
const filterEstado = document.getElementById("filter-estado");
const filterPrioridad = document.getElementById("filter-prioridad");

const mTotal = document.getElementById("m-total");
const mAbierto = document.getElementById("m-abierto");
const mProgreso = document.getElementById("m-progreso");
const mCerrado = document.getElementById("m-cerrado");

const btnCancel = document.getElementById("btn-cancel");
const btnClear = document.getElementById("btn-clear");
const formTitle = document.getElementById("form-title");

function showView(viewName) {
  views.forEach(view => view.classList.remove("active"));
  tabs.forEach(tab => tab.classList.remove("active"));

  document.getElementById(`view-${viewName}`).classList.add("active");
  document.querySelector(`[data-tab="${viewName}"]`).classList.add("active");
}

function renderDashboard() {
  mTotal.textContent = tickets.length;
  mAbierto.textContent = tickets.filter(t => t.estado === "abierto").length;
  mProgreso.textContent = tickets.filter(t => t.estado === "en_progreso").length;
  mCerrado.textContent = tickets.filter(t => t.estado === "cerrado").length;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function renderTickets() {
  const filtered = filterTickets(tickets, filters);

  ticketsList.innerHTML = "";

  if (filtered.length === 0) {
    ticketsList.innerHTML = `<p class="muted">No hay tickets para mostrar.</p>`;
  }

  filtered.forEach(ticket => {
    const card = document.createElement("article");
    card.className = "ticket-card";

    card.innerHTML = `
      <div>
        <h3>${escapeHTML(ticket.titulo)}</h3>
        <p>${escapeHTML(ticket.descripcion)}</p>
        <small>Estado: ${escapeHTML(ticket.estado)} | Prioridad: ${escapeHTML(ticket.prioridad)}</small>
      </div>

      <div class="actions-row">
        <button class="btn btn-secondary" data-edit="${ticket.id}" type="button">Editar</button>
        <button class="btn btn-danger" data-delete="${ticket.id}" type="button">Eliminar</button>
      </div>
    `;

    ticketsList.appendChild(card);
  });

  resultCount.textContent = `${filtered.length} resultados`;
  renderDashboard();
}

function clearErrors() {
  document.querySelectorAll(".error").forEach(error => {
    error.textContent = "";
  });
}

function showErrors(errors) {
  Object.entries(errors).forEach(([field, message]) => {
    const errorElement = document.querySelector(`[data-error="${field}"]`);
    if (errorElement) {
      errorElement.textContent = message;
    }
  });
}

function resetForm() {
  form.reset();
  ticketId.value = "";
  formTitle.textContent = "Crear Ticket";
  clearErrors();
}

form.addEventListener("submit", event => {
  event.preventDefault();

  try {
    clearErrors();

    const data = {
      titulo: titulo.value,
      descripcion: descripcion.value,
      estado: estado.value,
      prioridad: prioridad.value
    };

    if (ticketId.value) {
      tickets = updateTicket(tickets, ticketId.value, data);
    } else {
      const newTicket = createTicket(data);
      tickets.push(newTicket);
    }

    saveTickets(tickets);
    resetForm();
    renderTickets();
    showView("tickets");

  } catch (error) {
    showErrors(error);
  }
});

ticketsList.addEventListener("click", event => {
  try {
    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;

    if (editId) {
      const ticket = tickets.find(t => t.id === editId);

      if (!ticket) return;

      ticketId.value = ticket.id;
      titulo.value = ticket.titulo;
      descripcion.value = ticket.descripcion;
      estado.value = ticket.estado;
      prioridad.value = ticket.prioridad;

      formTitle.textContent = "Editar Ticket";
      showView("nuevo");
    }

    if (deleteId) {
      const confirmDelete = confirm("¿Seguro que desea eliminar este ticket?");

      if (!confirmDelete) return;

      tickets = deleteTicket(tickets, deleteId);
      saveTickets(tickets);
      renderTickets();
    }

  } catch (error) {
    console.error("Error en accion del listado:", error);
  }
});

function debounce(callback, delay = 300) {
  let timeoutId;

  return (...args) => {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}

const handleSearchInput = debounce(() => {
  filters.search = search.value;
  saveFilters(filters);
  renderTickets();
}, 300);

search.addEventListener("input", handleSearchInput);
filterEstado.addEventListener("change", () => {
  filters.estado = filterEstado.value;
  saveFilters(filters);
  renderTickets();
});

filterPrioridad.addEventListener("change", () => {
  filters.prioridad = filterPrioridad.value;
  saveFilters(filters);
  renderTickets();
});

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    showView(tab.dataset.tab);
  });
});

btnCancel.addEventListener("click", () => {
  resetForm();
  showView("tickets");
});

btnClear.addEventListener("click", () => {
  const confirmClear = confirm("¿Seguro que desea borrar todos los tickets?");

  if (!confirmClear) return;

  tickets = [];
  clearTickets();
  renderTickets();
});

search.value = filters.search;
filterEstado.value = filters.estado;
filterPrioridad.value = filters.prioridad;

renderTickets();
renderDashboard();