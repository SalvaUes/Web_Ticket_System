// Capa de persistencia

const TICKETS_KEY = "soportehub_tickets";
const FILTERS_KEY = "soportehub_filters";

export function getTickets() {
  try {
    const data = localStorage.getItem(TICKETS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error al obtener tickets:", error);
    return [];
  }
}

export function saveTickets(tickets) {
  try {
    localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  } catch (error) {
    if (error.name === "QuotaExceededError") {
      console.warn("LocalStorage lleno: no se pudieron guardar los tickets.", error);
      alert("No hay espacio suficiente para guardar más tickets. Elimine tickets antiguos e intente nuevamente.");
      return;
    }

    console.error("Error al guardar tickets:", error);
  }
}

export function getFilters() {
  try {
    const data = sessionStorage.getItem(FILTERS_KEY);
    return data ? JSON.parse(data) : {
      search: "",
      estado: "",
      prioridad: ""
    };
  } catch (error) {
    console.error("Error al obtener filtros:", error);
    return {
      search: "",
      estado: "",
      prioridad: ""
    };
  }
}

export function saveFilters(filters) {
  try {
    sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  } catch (error) {
    console.error("Error al guardar filtros:", error);
  }
}

export function clearTickets() {
  try {
    localStorage.removeItem(TICKETS_KEY);
  } catch (error) {
    console.error("Error al limpiar tickets:", error);
  }
}