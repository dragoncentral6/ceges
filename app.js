import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Inicializar el Mapa (Centrado por defecto, ej: Colombia)
const map = L.map('map', { zoomControl: false }).setView([3.43722, -76.52250], 11);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Capa de mapa (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Estructura en memoria para almacenar marcadores y coordenadas actuales
const marcadores = {};
const datosGruas = {};

// Conversión utilitaria de Nudos (Traccar) a Km/h
const nodosAKmh = (knots) => Math.round((knots || 0) * 1.852);

// Escuchar actualizaciones de Firebase en tiempo real
const gruasRef = collection(db, "rules" || "gruas"); // Asegúrate de que la colección coincida con la de tu backend (usamos "gruas")

onSnapshot(gruasRef, (snapshot) => {
    const listaContenedor = document.getElementById('lista-gruas');
    
    if (snapshot.empty) {
        listaContenedor.innerHTML = '<p class="placeholder">No hay grúas activas en el sistema.</p>';
        return;
    }

    let htmlLista = '';

    snapshot.forEach((doc) => {
        const id = doc.id;
        const data = doc.data();
        const { lat, lng, velocidad, orientacion } = data;
        
        // Validar que existan coordenadas antes de procesar
        if (lat === undefined || lng === undefined) return;

        // Guardar en memoria local para interactividad posterior
        datosGruas[id] = { lat, lng };

        const velKmh = nodosAKmh(velocidad);
        const rumbo = orientacion !== undefined ? `${Math.round(orientacion)}°` : 'N/D';
        const label = `Grúa #${id}`;
        const popupTexto = `<div class="leaflet-popup-content-value"><b>${label}</b><br>⚡ Velocidad: ${velKmh} km/h<br>🧭 Orientación: ${rumbo}</div>`;

        // Construcción acumulativa del HTML de la lista lateral utilizando data-id
        htmlLista += `
            <div class="grua-card" data-id="${id}">
                <h4>${label}</h4>
                <div class="grua-meta">
                    <span>⚡ ${velKmh} km/h</span>
                    <span>🧭 ${rumbo}</span>
                </div>
            </div>
        `;

        // Si el marcador ya existe en el mapa, actualizar posición y popup
        if (marcadores[id]) {
            marcadores[id].setLatLng([lat, lng]);
            marcadores[id].setPopupContent(popupTexto);
        } else {
            // Si es un dispositivo nuevo, crear marcador e incluirlo en el mapa
            marcadores[id] = L.marker([lat, lng])
                .addTo(map)
                .bindPopup(popupTexto);
                
            // Ajustar automáticamente el zoom del mapa para abarcar todas las grúas la primera vez
            const todasLasCoordenadas = Object.values(datosGruas).map(g => [g.lat, g.lng]);
            if (todasLasCoordenadas.length > 0) {
                map.fitBounds(todasLasCoordenadas, { maxZoom: 14, padding: [50, 50] });
            }
        }
    });

    // Inyectar todo el HTML de golpe para evitar parpadeos visuales
    listaContenedor.innerHTML = htmlLista;
});

// DELEGACIÓN DE EVENTOS: Escucha clics en la lista lateral de manera segura y dinámica
document.getElementById('lista-gruas').addEventListener('click', (e) => {
    const card = e.target.closest('.grua-card');
    if (!card) return; // Si no hizo clic en una tarjeta, ignorar

    const id = card.getAttribute('data-id');
    const grua = datosGruas[id];

    if (grua && marcadores[id]) {
        map.setView([grua.lat, grua.lng], 16, { animate: true });
        marcadores[id].openPopup();
    }
});