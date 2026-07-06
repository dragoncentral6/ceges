// ==========================================================================
// CONFIGURACIÓN Y CONEXIÓN MODULAR DE FIREBASE
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Reemplaza estos datos con la configuración real de tu proyecto en la consola de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA9iDdqFnLFACBg3zH_BTy1ocIEahibVjs",
    authDomain: "ejemplo-crud-8c78a.firebaseapp.com",
    projectId: "ejemplo-crud-8c78a",
    storageBucket: "ejemplo-crud-8c78a.firebasestorage.app",
    messagingSenderId: "809437790985",
    appId: "1:809437790985:web:5670aa02d4fc7ed02809d8"
  };

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore y exportarlo
export const db = getFirestore(app);