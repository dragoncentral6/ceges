/// ==========================================================================
// INICIALIZACIÓN DEL MAPA GENERAL (LEAFLET GLOBAL)
// ==========================================================================
const map = L.map('map', { zoomControl: false }).setView([3.43722, -76.52250], 13);
L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Hacer las estructuras visibles para app.js de manera directa
window.mapObject = map;
window.marcadoresActivos = {};
window.datosCacheGruas = {};

// ==========================================================================
// ESCALA DINÁMICA DE ICONOS ADAPTADOS AL ZOOM
// ==========================================================================
const mapearDimensionesPorZoom = (zoom) => {
    if (zoom <= 11) return { icono: 24, font: 9, padding: 3, offset: -14 };
    if (zoom === 12) return { icono: 28, font: 10, padding: 4, offset: -16 };
    if (zoom === 13) return { icono: 32, font: 11, padding: 4, offset: -18 }; 
    if (zoom === 14) return { icono: 36, font: 12, padding: 5, offset: -20 };
    return { icono: 40, font: 13, padding: 6, offset: -24 }; 
};

const generarIconoSvgGrua = (rumbo, size) => {
    return L.divIcon({
        className: 'icono-grua-contenedor',
        html: `
            <svg class="icono-grua-imagen" style="transform: rotate(${rumbo}deg); width: ${size}px; height: ${size}px;" viewBox="0 0 24 24" fill="#2563eb" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 8h-3V4H4c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM7 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5 0.67 1.5 1.5-.67 1.5-1.5 1.5zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5 0.67 1.5 1.5-.67 1.5-1.5 1.5zM15 12H4V6h11v6z"/>
            </svg>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -(size / 2)]
    });
};

// ==========================================================================
// INTERFAZ GLOBAL: RECEPCIÓN Y RENDERIZACIÓN DE TELEMETRÍA
// ==========================================================================
window.actualizarMapaConDatos = function(listaGruasProcesadas) {
    const conUbicacion = listaGruasProcesadas.filter(g => g.lat !== undefined && g.lng !== undefined && g.lat !== 0);
    const idsReportados = conUbicacion.map(g => g.id);

    // Limpiar del mapa grúas que pasaron a inactivas o se borraron
    Object.keys(window.marcadoresActivos).forEach(id => {
        if (!idsReportados.includes(id)) {
            map.removeLayer(window.marcadoresActivos[id]);
            delete window.marcadoresActivos[id];
        }
    });

    if (conUbicacion.length === 0) return;

    const escala = mapearDimensionesPorZoom(map.getZoom());

    conUbicacion.forEach((grua) => {
        const id = grua.id;
        const { lat, lng, velocidad, orientacion, ultimaActualizacion, alias } = grua;

        // Guardar en caché global para eventos de redimensión por rueda de zoom
        window.datosCacheGruas[id] = { lat, lng, orientacion, alias };

        let fechaTexto = 'Sin reportes';
        if (ultimaActualizacion) {
            const fechaJS = ultimaActualizacion.toDate ? ultimaActualizacion.toDate() : new Date(ultimaActualizacion);
            fechaTexto = fechaJS.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + 
                          ' - ' + fechaJS.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        }

        const velKmh = Math.round(velocidad || 0);
        const rumboGrados = orientacion !== undefined && orientacion !== -1 ? Math.round(orientacion) : 0;
        const rumboTexto = orientacion !== undefined && orientacion !== -1 ? `${rumboGrados}°` : 'N/D';
        
        const label = `${alias || 'S/A'}`;
        const popupTexto = `
            <div class="popup-mapa-info">
                <h4>Grúa ${label}</h4>
                <p>⚡ <b>Velocidad:</b> ${velKmh} km/h</p>
                <p>🧭 <b>Rumbo:</b> ${rumboTexto}</p>
                <p>🕒 <b>Reporte:</b> ${fechaTexto}</p>
            </div>
        `;

        if (window.marcadoresActivos[id]) {
            window.marcadoresActivos[id].setLatLng([lat, lng]);
            window.marcadoresActivos[id].setIcon(generarIconoSvgGrua(rumboGrados, escala.icono));
            window.marcadoresActivos[id].setPopupContent(popupTexto);
            window.marcadoresActivos[id].setTooltipContent(label);
        } else {
            window.marcadoresActivos[id] = L.marker([lat, lng], { icon: generarIconoSvgGrua(rumboGrados, escala.icono) })
                .addTo(map)
                .bindPopup(popupTexto)
                .bindTooltip(label, {
                    permanent: true,
                    direction: 'top',
                    offset: [0, escala.offset],
                    className: 'etiqueta-alias-mapa'
                });
        }
    });

    const coordsActivas = conUbicacion.map(g => [g.lat, g.lng]);
    if (coordsActivas.length > 0 && !map.dataTargetEnfocado) {
        map.fitBounds(coordsActivas, { maxZoom: 14, padding: [40, 40] });
        map.dataTargetEnfocado = true; 
    }
};

// ==========================================================================
// DETECTOR DE CAMBIO DE ESCALA (ZOOM END)
// ==========================================================================
map.on('zoomend', () => {
    const escala = mapearDimensionesPorZoom(map.getZoom());

    Object.keys(window.marcadoresActivos).forEach(id => {
        const cached = window.datosCacheGruas[id];
        if (cached && window.marcadoresActivos[id]) {
            const rumbo = cached.orientacion !== undefined && cached.orientacion !== -1 ? Math.round(cached.orientacion) : 0;
            
            window.marcadoresActivos[id].setIcon(generarIconoSvgGrua(rumbo, escala.icono));
            
            const tooltip = window.marcadoresActivos[id].getTooltip();
            if (tooltip) {
                window.marcadoresActivos[id].unbindTooltip();
                window.marcadoresActivos[id].bindTooltip(cached.alias || 'S/A', {
                    permanent: true,
                    direction: 'top',
                    offset: [0, escala.offset],
                    className: 'etiqueta-alias-mapa'
                });
            }
        }
    });

    const root = document.documentElement;
    root.style.setProperty('--map-tooltip-font', `${escala.font}px`);
    root.style.setProperty('--map-tooltip-padding', `${escala.padding}px`);
});

window.reajustarDimensionesMapa = function() {
    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 150);
};

window.reajustarDimensionesMapa();