import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA9iDdqFnLFACBg3zH_BTy1ocIEahibVjs",
  authDomain: "ejemplo-crud-8c78a.firebaseapp.com",
  projectId: "ejemplo-crud-8c78a",
  storageBucket: "ejemplo-crud-8c78a.firebasestorage.app",
  messagingSenderId: "809437790985",
  appId: "1:809437790985:web:5670aa02d4fc7ed02809d8"
};

// 1. Inicializar la App básica
const app = initializeApp(firebaseConfig);

// 2. Inicializar Firestore configurando de forma estricta el uso de pestañas estables (Evita el error QUIC)
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true, // 👈 Esto fuerza una conexión estable libre de errores de protocolo QUIC
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

export { db };
