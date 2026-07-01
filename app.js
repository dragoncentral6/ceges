import { db } from './firebase-config.js';
// CORREGIDO: Sincronizado a la versión 10.8.0 exacta de Firestore
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"; 

// Inicializar el Mapa centrado en Cali
const map = L.map('map', { zoomControl: false }).setView([3.43722, -76.52250], 13);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Capa base de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

//capa de trafico
L.tileLayer('https://{s}://{z}/{x}/{y}.png?key=TU_API_KEY', {
    maxZoom: 13,
    subdomains: ['a', 'b', 'c', 'd'] // Esto le enseña a Leaflet qué significa la {s}
}).addTo(map);

const marcadores = {};
const datosGruas = {};

// Generador de iconos dinámicos usando un SVG vectorial rotable
const crearIconoGrua = (rumbo) => {
    return L.divIcon({
        className: 'icono-grua-contenedor',
        html: `
            <svg class="icono-grua-imagen" style="transform: rotate(${rumbo}deg);" viewBox="0 0 24 24" fill="#2563eb" xmlns="http://w3.org">
                <!-- CORREGIDO: xmlns estándar de la W3C -->
                <!-- Icono de camión / grúa de rescate -->
                <path d="M20 8h-3V4H4c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM7 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5 0.67 1.5 1.5-.67 1.5-1.5 1.5zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5 0.67 1.5 1.5-.67 1.5-1.5 1.5zM15 12H4V6h11v6z"/>
            </svg>
        `,
        popupAnchor: [0, -16]
    });
};

const gruasRef = collection(db, "gruas"); 

onSnapshot(gruasRef, (snapshot) => {
    const listaContenedor = document.getElementById('lista-gruas');
    
    if (snapshot.empty) {
        listaContenedor.innerHTML = '<p class="placeholder">No hay grúas activas en el sistema.</p>';
        return;
    }

    let htmlLista = '';
    const ahora = new Date();

    snapshot.forEach((doc) => {
        const id = doc.id;
        const data = doc.data();
        const { lat, lng, velocidad, orientacion, ultimaActualizacion } = data;
        
        // Evitar fallos si faltan coordenadas esenciales
        if (lat === undefined || lng === undefined) return;

        datosGruas[id] = { lat, lng };

        // Procesamiento de marcas de tiempo y alertas por pérdida de señal
        let fechaTexto = 'Sin reportes';
        let claseInactiva = '';
        
        if (ultimaActualizacion) {
            const fechaJS = ultimaActualizacion.toDate();
            
            // Construcción de cadena de tiempo legible (Ej: 14:32 - 30 jun)
            fechaTexto = fechaJS.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + 
                          ' - ' + fechaJS.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

            // Si el diferencial supera los 5 minutos, se gatilla el estado de alerta
            const diferenciaMinutos = (ahora - fechaJS) / 1000 / 60;
            if (diferenciaMinutos > 5) {
                claseInactiva = 'inactiva';
            }
        }

        const velKmh = Math.round(velocidad || 0);
        const rumboGrados = orientacion !== undefined && orientacion !== -1 ? Math.round(orientacion) : 0;
        const rumboTexto = orientacion !== undefined && orientacion !== -1 ? `${rumboGrados}°` : 'N/D';
        
        const label = `Grúa #${id}`;
        const popupTexto = `
            <div class="leaflet-popup-content-value">
                <b>${label}</b><br>
                ⚡ Velocidad: ${velKmh} km/h<br>
                🧭 Rumbo: ${rumboTexto}<br>
                🕒 Último reporte: ${fechaTexto}
            </div>
        `;

        // Inyección estructural del HTML de las tarjetas laterales
        htmlLista += `
            <div class="grua-card ${claseInactiva}" data-id="${id}">
                <h4>${label}</h4>
                <div class="grua-meta">
                    <span>⚡ ${velKmh} km/h</span>
                    <span>🧭 ${rumboTexto}</span>
                </div>
                <span class="grua-fecha">🕒 Visto: ${fechaTexto}</span>
            </div>
        `;

        // Renderizado e instanciación de marcadores dinámicos sobre Leaflet
        if (marcadores[id]) {
            marcadores[id].setLatLng([lat, lng]);
            marcadores[id].setIcon(crearIconoGrua(rumboGrados));
            marcadores[id].setPopupContent(popupTexto);
        } else {
            marcadores[id] = L.marker([lat, lng], { icon: crearIconoGrua(rumboGrados) })
                .addTo(map)
                .bindPopup(popupTexto);
                
            // Ajustar encuadre general en el mapa al registrar dispositivos iniciales
            const todasLasCoordenadas = Object.values(datosGruas).map(g => [g.lat, g.lng]);
            if (todasLasCoordenadas.length > 0) {
                map.fitBounds(todasLasCoordenadas, { maxZoom: 14 });
            }
        }
    });

    listaContenedor.innerHTML = htmlLista;
});

// Event Listener delegado para selección e interactividad táctil/clic en tarjetas laterales
document.getElementById('lista-gruas').addEventListener('click', (e) => {
    const card = e.target.closest('.grua-card');
    if (!card) return;

    const id = card.getAttribute('data-id');
    const grua = datosGruas[id];

    if (grua && marcadores[id]) {
        map.setView([grua.lat, grua.lng], 16, { animate: true });
        marcadores[id].openPopup();
    }
});
