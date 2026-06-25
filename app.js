import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Inicializar Mapa (Centrado por defecto, ej: Colombia)
const map = L.map('map', { zoomControl: false }).setView([4.6097, -74.0817], 12);
L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// Estructuras en memoria para evitar duplicados
const marcadores = {};

// Conversión utilitaria
const nodosAKmh = (knots) => Math.round((knots || 0) * 1.852);

// 2. Escuchar Firebase en Tiempo Real
const gruasRef = collection(db, "gruas");

onSnapshot(gruasRef, (snapshot) => {
    const listaContenedor = document.getElementById('lista-gruas');
    
    if (snapshot.empty) {
        listaContenedor.innerHTML = '<p class="placeholder">No hay grúas activas.</p>';
        return;
    }

    let htmlLista = '';

    snapshot.forEach((doc) => {
        const id = doc.id;
        const data = doc.data();
        const { lat, lng, velocidad, orientacion, nombre } = data;
        
        const velKmh = nodosAKmh(velocidad);
        const rumbo = orientacion ? `${Math.round(orientacion)}°` : 'N/D';
        const label = nombre || `Grúa ${id}`;

        // Acumular HTML para la barra lateral
        htmlLista += `
            <div class="grua-card" id="card-${id}">
                <h4>${label}</h4>
                <div class="grua-meta">
                    <span>⚡ ${velKmh} km/h</span>
                    <span>🧭 ${rumbo}</span>
                </div>
            </div>
        `;

        // Actualizar o crear marcador en el mapa
        if (marcadores[id]) {
            marcadores[id].setLatLng([lat, lng]);
            marcadores[id].setPopupContent(`<b>${label}</b><br>Velocidad: ${velKmh} km/h<br>Rumbo: ${rumbo}`);
        } else {
            marcadores[id] = L.marker([lat, lng])
                .addTo(map)
                .bindPopup(`<b>${label}</b><br>Velocidad: ${velKmh} km/h<br>Rumbo: ${rumbo}`);
        }
    });

    listaContenedor.innerHTML = htmlLista;

    // Añadir eventos de click a las tarjetas de la lista para centrar el mapa en la grúa
    snapshot.forEach((doc) => {
        const id = doc.id;
        const data = doc.data();
        document.getElementById(`card-${id}`).addEventListener('click', () => {
            map.setView([data.lat, data.lng], 16);
            marcadores[id].openPopup();
        });
    });
});