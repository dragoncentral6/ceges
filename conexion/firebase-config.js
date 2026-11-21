// ==========================================================================
// CONFIGURACIÓN Y CONEXIÓN MODULAR DE FIREBASE
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Reemplaza estos datos con la configuración real de tu proyecto en la consola de Firebase
const firebaseConfig = {
      apiKey: "AIzaSyAO0AMQhLZBez3wn5KiumIuw44JbROMzoo",
      authDomain: "ceges-cf8ad.firebaseapp.com",
      projectId: "ceges-cf8ad",
      storageBucket: "ceges-cf8ad.firebasestorage.app",
      messagingSenderId: "673242495179",
      appId: "1:673242495179:web:177eae4112c792ade4c34e"
  };

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore y exportarlo
export const db = getFirestore(app);
