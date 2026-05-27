
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
        <span class ="bar-label">${p.icon} ${p.label}</span>
        <div class ="bar-track" aria-hidden="true">
         <div class ="bar-fill ${p.cls}" style="width:${pct}%" title="${pct}%"></div>
        </div>
        <span class ="bar-count" aria-hidden="true">${count}</span>
        </div>
        `;


    }).join('');

    //Panel de estadisticas por trabajador
    function renderWorkerStats(stats) {
        const container = document.getElementById('worker-stats');
        if(!container) return;

        const hora = stats.processedAt 
        ? new Date(stats.processedAt).toLocaleTimeString('es',{
            hour: '2-digit',minute: '2-digit',second: '2-digit'
        }) 
        : '--:--:--';
        
        const resolucion = stats.avgResolucionHours !== null
        ? `${stats.avgResolucionHours} horas`
        : 'Sin datos';

        //Clase condicional si hay tickets abiertos, se resaltan en rojo
        const critClass = stats.criticalOpen > 0 ? 'stat-value--danger' : 'stat-value--safe';

        const recenTitle = stats.mostRecent
        ? truncate(stats.mostRecent.titulo,28)
        :'Ninguno';

        container.innerHTML = `
        <div class="stats-grid">

            <div class="stat-item">
                <span class="stat-label">⚠️ Críticos Sin Cerrar</span>
                <span class="stat-value ${critClass}">${stats.criticalOpen}</span>
            </div>

            <div class="stat-item">
                <span class="stat-label">✅ Tasa de Resolución</span>
                <span class="stat-value">${stats.resolutionRate ?? 0} % </span>
            </div> 

            <div class="stat-item" >
                <span class="stat-label">⏱️ Resolución Promedio</span>
                <span class="stat-value">${resolucion}</span>
            </div>

            <div class="stat-item">
                <span class="stat-label">🎫 Último Ticket</span>
                <span class="stat-value stat-value--small">${recenTitle}</span>
            </div> 
            
            <div class="stat-item stat-item--full">
                <span class="stat-label">🤖 Worker procesó a las</span>
                <span class="stat-value stat-value--time">${hora}</span>
            </div>

        </div>
        `;

        
}

    //Panel de geolocalizacion y clima
    export async function initGeo() {
        const container = document.getElementById('geo-info');
        if(!container) return;

        //Mostrar estado de carga
        container.innerHTML =  `
        <div class="geo-loading">
            <span class="geo-spinner" aria-hidden="true"></span>
            <p class="muted">Solicitando ubicación...</p>
        </div>
        `;

        try {
            const {coords, weather, location} = await getLocationAndWeather();
            renderGeo(container, coords, weather, location);

    }catch (error) {
        container.innerHTML = `
        <div class="geo-error" role="alert">
            <span aria-hidden="true">⚠️</span>
            <p class="muted"> ${error.message}</p>
            <p class="muted" style="font-size: 0.75rem;margin-top: 0.25rem">
                Habilita la ubicación en tu navegador y vuelve a intentarlo.
            </p>
        </div>
        `;

        }
    }  
    
    //Pinta el panel de geolocalizacion y clima con las datos obtenidos de las API
    function renderGeo(container, coords, weather, location) {
        container.innerHTML = `
        <div class="geo-grid">
         <div class="geo-item">
          <span class="geo-icon" aria-hidden="true">📍</span>
         <div>
            <strong>${escapeHtml(location.city)}</strong>
            <p class="muted geo-sub"> ${location.region ? escapeHtml(location.region) + ',':''} ${escapeHtml(location.country)}</p>">
        </div>
        </div>
        <div class="geo-item">
            <span class="geo-icon" aria-hidden="true">🌤️</span>
            <div>
            <strong>${weather.condition}</strong>
            <p class="muted geo-sub"> ${weather.timezone}</p>
            </div>
            </div>

            <div class="geo-item">
            <span class="geo-icon" aria-hidden="true">💧</span>
            <div>
            <strong>${weather.humidity}%</strong>
            <p class="muted geo-sub">Humedad ${weather.windSpeed} km/h</p>
            </div>
            </div>
        </div>
        
        <p class="geo-accuracy muted">📡 Precisión GPS: ±${coords.accuracy} m</p>

        `;
    }

    //Las Utilidades Internas  
    function setTextContent(id, value) {
        const el = document.getElementById(id);
        if(el) el.textContent = value;
    }
    
    function animateValue(id) {
        const el = document.getElementById(id);
        if(!el) return;
        el.classList.remove('metric-pop');
        requestAnimationFrame(() => el.classList.add('metric-pop'));
    }

    function truncate(str, max) {
        if(!str) return '';
        return str.length > max ? str.slice(0, max-3) + '...' : str;
    }

    function escapeHtml(str = '') {
        return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
        
    }



}
