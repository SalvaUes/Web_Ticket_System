// Web Worker que procesa estadisticas de
// tickets fuera del hilo principal para no bloquear la UI.

const stats = {
    type: 'STATS',
    data: {
        total,
        byEstado: { abierto, en_progreso, cerrado },
        byPrioridad: { baja, media, alta, critica },
        avResolutionHours,
        criticalOpen,
        resolutionRate,
        proccessedAt
    }
};