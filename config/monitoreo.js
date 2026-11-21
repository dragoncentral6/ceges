// ==========================================================================
// MONITOREO PÚBLICO (VISITANTE) + LOGIN ADMIN CON FIREBASE AUTH
// ==========================================================================
import { db } from '../conexion/firebase-config.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    collection, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const auth = getAuth();

let gruas = [];
let dispositivosGps = [];
let redirigiendoAControl = false;

const gruasCollectionRef = collection(db, "gruas");
const gpsCollectionRef = collection(db, "dispositivos_gps");

// Elementos DOM Login
const btnAbrirLogin = document.getElementById('btn-abrir-login');
const modalLoginAdmin = document.getElementById('modal-login-admin');
const btnCerrarLogin = document.getElementById('btn-cerrar-login');
const btnCancelarLogin = document.getElementById('btn-cancelar-login');
const formLoginAdmin = document.getElementById('form-login-admin');
const inputEmail = document.getElementById('login-email');
const inputPassword = document.getElementById('login-password');
const btnSubmitLogin = document.getElementById('btn-submit-login');
const errorMsg = document.getElementById('login-error-msg');

function abrirModalLogin() {
    if (!modalLoginAdmin) return;
    if (errorMsg) errorMsg.textContent = '';
    if (formLoginAdmin) formLoginAdmin.reset();
    modalLoginAdmin.classList.add('open');
    setTimeout(() => inputEmail && inputEmail.focus(), 50);
}

function cerrarModalLogin() {
    if (!modalLoginAdmin) return;
    modalLoginAdmin.classList.remove('open');
    if (errorMsg) errorMsg.textContent = '';
}

if (btnAbrirLogin) btnAbrirLogin.addEventListener('click', abrirModalLogin);
if (btnCerrarLogin) btnCerrarLogin.addEventListener('click', cerrarModalLogin);
if (btnCancelarLogin) btnCancelarLogin.addEventListener('click', cerrarModalLogin);

if (modalLoginAdmin) {
    modalLoginAdmin.addEventListener('click', (e) => {
        if (e.target === modalLoginAdmin) cerrarModalLogin();
    });
}

if (formLoginAdmin) {
    formLoginAdmin.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorMsg) errorMsg.textContent = '';

        const email = inputEmail.value.trim();
        const password = inputPassword.value;

        btnSubmitLogin.disabled = true;
        btnSubmitLogin.textContent = 'INGRESANDO...';

        try {
            await signInWithEmailAndPassword(auth, email, password);
            redirigiendoAControl = true;
            window.location.href = 'control.html';
        } catch (err) {
            console.error(err);
            if (errorMsg) {
                errorMsg.textContent = 'Correo o contraseña incorrectos.';
            }
        } finally {
            btnSubmitLogin.disabled = false;
            btnSubmitLogin.textContent = 'INGRESAR';
        }
    });
}

// Si ya hay sesión iniciada en Firebase Auth, envía directo a control.html
onAuthStateChanged(auth, (user) => {
    if (user && !redirigiendoAControl) {
        redirigiendoAControl = true;
        window.location.href = 'control.html';
    }
});

// ==========================================================================
// SINCRONIZACIÓN DE UBICACIONES DE GRÚAS HACIA EL MAPA
// ==========================================================================
function enviarDatosAlMapa() {
    if (typeof window.actualizarMapaConDatos !== 'function') return;

    const datosCrucesMapa = gruas
        .filter(grua => grua.estado !== 'inactivo' && grua.visible !== false)
        .map(grua => {
            const gps = dispositivosGps.find(g => g.id === grua.id_gps_asignado);
            return {
                id: grua.id,
                alias: (grua.alias || '').toUpperCase(),
                placa: (grua.placa || '').toUpperCase(),
                estado: grua.estado,
                lat: gps ? gps.lat : undefined,
                lng: gps ? gps.lng : undefined,
                velocidad: gps ? gps.velocidad : 0,
                orientacion: gps ? gps.orientacion : 0,
                ultimaActualizacion: gps ? gps.ultimaActualizacion : null
            };
        });

    window.actualizarMapaConDatos(datosCrucesMapa);
}

onSnapshot(gruasCollectionRef, (snapshot) => {
    gruas = [];
    snapshot.forEach((docSnap) => {
        gruas.push({ id: docSnap.id, ...docSnap.data() });
    });
    enviarDatosAlMapa();
});

onSnapshot(gpsCollectionRef, (snapshot) => {
    dispositivosGps = [];
    snapshot.forEach((docSnap) => {
        dispositivosGps.push({ id: docSnap.id, ...docSnap.data() });
    });
    enviarDatosAlMapa();
});

window.addEventListener('load', () => {
    if (typeof window.reajustarDimensionesMapa === 'function') {
        window.reajustarDimensionesMapa();
    }
    enviarDatosAlMapa();
});