import { db } from './firebase-config.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuración de las grúas de prueba con sus posiciones iniciales
const gruasSimuladas = {
    "grua_01": {
        nombre: "Grúa Platón #01",
        lat: 3.4516,  // Coordenadas de ejemplo (Cali)
        lng: -76.5320,
        velocidad: 20,
        orientacion: 90
    },
    "grua_02": {
        nombre: "Grúa Pesada #02",
        lat: 3.4400,
        lng: -76.5200,
        velocidad: 0,
        orientacion: 180
    }
};

// Función para simular movimiento aleatorio ligero
function moverGruas() {
    Object.keys(gruasSimuladas).forEach(async (id) => {
        const grua = gruasSimuladas[id];

        // Si la grúa se está moviendo, variamos su posición sutilmente
        if (Math.random() > 0.2) { 
            grua.lat += (Math.random() - 0.5) * 0.001;
            grua.lng += (Math.random() - 0.5) * 0.001;
            grua.velocidad = Math.floor(Math.random() * 35) + 10; // Velocidad entre 10 y 45 nudos
            grua.orientacion = Math.floor(Math.random() * 360);   // Rumbo aleatorio
        } else {
            // Simular que se detuvo en un servicio
            grua.velocidad = 0;
        }

        // Guardar o actualizar en Firestore
        try {
            await setDoc(doc(db, "gruas", id), grua);
            console.log(`Actualizada ${grua.nombre} -> Lat: ${grua.lat.toFixed(4)}, Lng: ${grua.lng.toFixed(4)}`);
        } catch (error) {
            console.error("Error actualizando Firebase:", error);
        }
    });
}

// Ejecutar la simulación inmediatamente y luego cada 3 segundos
moverGruas();
setInterval(moverGruas, 3000);