// Operaciones puras de CRUD y validaciones

export function validateTicket(ticket) {
  const errors = {};

  if (!ticket.titulo || ticket.titulo.trim().length < 3) {
    errors.titulo = "El titulo debe tener al menos 3 caracteres.";
  }

  if (!ticket.descripcion || ticket.descripcion.trim().length < 10) {
    errors.descripcion = "La descripcion debe tener al menos 10 caracteres.";
  }

  if (!["abierto", "en_progreso", "cerrado"].includes(ticket.estado)) {
    errors.estado = "Estado no valido.";
  }

  if (!["baja", "media", "alta", "critica"].includes(ticket.prioridad)) {
    errors.prioridad = "Prioridad no valida.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function createTicket(ticket) {
  try {
    const validation = validateTicket(ticket);

    if (!validation.isValid) {
      throw validation.errors;
    }

    return {
      id: crypto.randomUUID(),
      titulo: ticket.titulo.trim(),
      descripcion: ticket.descripcion.trim(),
      estado: ticket.estado,
      prioridad: ticket.prioridad,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString()
    };
  } catch (error) {
    throw error;
  }
}

export function updateTicket(tickets, id, newData) {
  try {
    return tickets.map((ticket) => {
      if (ticket.id !== id) return ticket;

      const candidato = {
        ...ticket,
        ...newData,
        actualizadoEn: new Date().toISOString()
      };

      const validation = validateTicket(candidato);
      if (!validation.isValid) {
        throw validation.errors;
      }

      return candidato;
    });
  } catch (error) {
    throw error;
  }
}

export function deleteTicket(tickets, id) {
  try {
    return tickets.filter(ticket => ticket.id !== id);
  } catch (error) {
    console.error("Error al eliminar ticket:", error);
    return tickets;
  }
}

export function filterTickets(tickets, filters) {
  try {
    return tickets.filter(ticket => {
      const text = `${ticket.titulo} ${ticket.descripcion}`.toLowerCase();

      const matchSearch = text.includes(filters.search.toLowerCase());
      const matchEstado = filters.estado ? ticket.estado === filters.estado : true;
      const matchPrioridad = filters.prioridad ? ticket.prioridad === filters.prioridad : true;

      return matchSearch && matchEstado && matchPrioridad;
    });
  } catch (error) {
    console.error("Error al filtrar tickets:", error);
    return tickets;
  }
}