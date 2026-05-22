
// Renderizado de metricas, conexion con el Web
// Worker y composicion del panel de geolocalizacion/clima.

import { geolocalizacionAndWeather } from './apiGeo.js';


//Seccion que nos permite actualizar los componentes del Dashboard
export function renderMetrics(stats) {
    setTextContent('m-total',stats.total);
    setTextContent('m-abierto',stats.byEstado.abierto);
    setTextContent('m-progreso',stats.byEstado.en_progreso);
    setTextContent('m-cerrado',stats.byEstado.cerrado);

    //Animacion para cuando cambia el numero
    animateValue('m-total');
    animateValue('m-abierto');
    animateValue('m-progreso');
    animateValue('m-cerrado');    

    //Renderiza los sub-paneles del Dashboard.
    renderPriorityBars(stats.total, stats.byPrioridad);
    renderWorkerStats(stats);

}

function renderPriorityBars(total, byPrioridad) {
    const container = document.getElementById('priority-bars');
    if(!container) return;

    const priorities = [
        {key: 'critica', label: 'Crítica', cls: 'bar-critica', icon:'🔴' },
        {key: 'alta', label: 'Alta', cls: 'bar-alta', icon: '🟠'},
        {key: 'media', label: 'Media', cls: 'bar-media', icon: '🟡'},
        {key: 'baja', label: 'Baja', cls: 'bar-baja', icon: '🟢'}

    ];
    if (total == 0) {
        container.innerHTML = '<p class = "muted">Sin Tickets todavía</p> ';
        return;
    }

    container.innerHTML = priorities.map(p=> {
        const count = byPrioridad[p.key] || 0;
        const pct = Math.round((count/total)*100);
        return `
        <div class ="bar-row" role ="group" aria-label="${p.label}: ${count} tickets, ${pct}%">
        <span class ="bar-label">${p.icon} ${p.label}</spam>
        <div class ="bar-track" aria-hidden="true">
         <div class ="bar-fill ${p.cls}" style="width:${pct}%" title="${pct}%"></div>
        </div>
        <span class ="bar-count" aria-hidden="true">${count}</span>
        </div>
        `;


    }).join('');


}


