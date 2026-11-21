// ==========================================================================
// IMPORTACIÓN DE CONFIGURACIÓN Y MÓDULOS DE FIREBASE
// ==========================================================================
import { db } from '../conexion/firebase-config.js';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { 
    getAuth, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const auth = getAuth();
const btnCerrarSesionAdmin = document.getElementById('btn-cerrar-sesion-admin');

if (btnCerrarSesionAdmin) {
    btnCerrarSesionAdmin.addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'index.html';
    });
}

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html';
    }
});

// ==========================================================================
// CONFIGURACIÓN GLOBAL Y ESTADOS
// ==========================================================================
let gruas = []; 
let dispositivosGps = []; 
let paginaActual = 1;
const filasPorPagina = 5;
let filtroPlanillaActual = 'activos'; // 'activos' | 'inactivos'

const gruasCollectionRef = collection(db, "gruas");
const gpsCollectionRef = collection(db, "dispositivos_gps");

// Elementos del DOM - Navegación de Pestañas Inferiores Móviles
const vistas = document.querySelectorAll('.vista');
const navBotones = document.querySelectorAll('.nav-btn');
const subnavBotones = document.querySelectorAll('.subnav-btn');

// Elementos del DOM - Ventana Modal del Formulario
const modalFormulario = document.getElementById('modal-formulario');
const btnAbrirFormulario = document.getElementById('btn-abrir-formulario');
const btnCerrarModalX = document.getElementById('btn-cerrar-modal-x');

// Elementos del DOM - Formulario Interno
const formGrua = document.getElementById('form-grua');
const txtIdEdicion = document.getElementById('txt-id-edicion');
const txtPlaca = document.getElementById('txt-placa');
const txtAlias = document.getElementById('txt-alias');
const selectEstado = document.getElementById('select-estado');
const selectPosicion = document.getElementById('select-posicion');
const selectGpsAsignado = document.getElementById('select-gps-asignado');
const dateSoat = document.getElementById('date-soat');
const datePoliza = document.getElementById('date-poliza');
const dateRtm = document.getElementById('date-rtm');
const txtTelefono = document.getElementById('txt-telefono');
const txtObservaciones = document.getElementById('txt-observaciones');
const btnGuardar = document.getElementById('btn-guardar');
const btnCancelar = document.getElementById('btn-cancelar');
const tituloFormulario = document.getElementById('titulo-formulario');

// Elementos del DOM - Listados y Controles Administrativos
const contenedorCards = document.getElementById('contenedor-cards');
const tbodyGruas = document.getElementById('tbody-gruas');
const tbodyGps = document.getElementById('tbody-gps');
const txtBuscar = document.getElementById('txt-buscar');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const infoPaginas = document.getElementById('info-paginas');

// ==========================================================================
// FORZAR MAYÚSCULAS EN TIEMPO REAL EN PLACA Y ALIAS
// ==========================================================================
if (txtPlaca) {
    txtPlaca.addEventListener('input', (e) => {
        const pos = e.target.selectionStart;
        e.target.value = e.target.value.toUpperCase();
        e.target.setSelectionRange(pos, pos);
    });
}

if (txtAlias) {
    txtAlias.addEventListener('input', (e) => {
        const pos = e.target.selectionStart;
        e.target.value = e.target.value.toUpperCase();
        e.target.setSelectionRange(pos, pos);
    });
}

// ==========================================================================
// CONTROL DE APERTURA Y CIERRE DE VENTANA MODAL
// ==========================================================================
if (btnAbrirFormulario) {
    btnAbrirFormulario.addEventListener('click', () => {
        limpiarFormularioAdministrativo();
        modalFormulario.classList.add('open');
    });
}

if (btnCerrarModalX) {
    btnCerrarModalX.addEventListener('click', () => modalFormulario.classList.remove('open'));
}

if (modalFormulario) {
    modalFormulario.addEventListener('click', (e) => {
        if (e.target === modalFormulario) modalFormulario.classList.remove('open');
    });
}

// Cerrar popovers abiertos en táctil si se toca fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('.item-inactiva-asomada')) {
        document.querySelectorAll('.item-inactiva-asomada.abierta').forEach(el => {
            el.classList.remove('abierta');
        });
    }
});

// ==========================================================================
// SUB-BARRA DE FILTRO EN PLANILLA (ACTIVOS / INACTIVOS)
// ==========================================================================
subnavBotones.forEach(btn => {
    btn.addEventListener('click', () => {
        filtroPlanillaActual = btn.getAttribute('data-filtro-estado');
        subnavBotones.forEach(b => b.classList.toggle('active', b === btn));
        renderizarPlanillaLineal();
    });
});

// ==========================================================================
// ESCUCHA SIMULTÁNEA EN TIEMPO REAL
// ==========================================================================
function inicializarSincronizacionFirestore() {
    onSnapshot(gruasCollectionRef, (snapshot) => {
        gruas = [];
        snapshot.forEach((docSnap) => {
            gruas.push({ id: docSnap.id, ...docSnap.data() });
        });
        procesarYRenderizarTodo();
    });

    onSnapshot(gpsCollectionRef, (snapshot) => {
        dispositivosGps = [];
        snapshot.forEach((docSnap) => {
            dispositivosGps.push({ id: docSnap.id, ...docSnap.data() });
        });
        procesarYRenderizarTodo();
    });
}

function procesarYRenderizarTodo() {
    actualizarSelectGpsDisponibles();
    renderizarPlanillaLineal();
    renderizarTablaAdministrativa();
    renderizarTablaGps();
    enviarDatosAlMapa();
}

inicializarSincronizacionFirestore();

// ==========================================================================
// CONTROL SELECT DINÁMICO DE DISPOSITIVOS DISPONIBLES
// ==========================================================================
function actualizarSelectGpsDisponibles() {
    if (!selectGpsAsignado) return;
    
    const idEdicionActual = txtIdEdicion.value;
    const gruaEnEdicion = gruas.find(g => g.id === idEdicionActual);
    const gpsDeEstaGrua = gruaEnEdicion ? gruaEnEdicion.id_gps_asignado : null;

    const gpsOcupados = gruas
        .filter(g => g.id !== idEdicionActual && g.id_gps_asignado)
        .map(g => g.id_gps_asignado);

    let htmlOptions = '<option value="">-- Sin GPS Asignado (En Bodega) --</option>';
    
    dispositivosGps.forEach(gps => {
        if (!gpsOcupados.includes(gps.id) || gps.id === gpsDeEstaGrua) {
            const labelAsignado = gps.id === gpsDeEstaGrua ? ' (Asignado Actual)' : '';
            htmlOptions += `<option value="${gps.id}">${gps.id}${labelAsignado}</option>`;
        }
    });
    
    selectGpsAsignado.innerHTML = htmlOptions;
}

// ==========================================================================
// LÓGICA DE NAVEGACIÓN ENTRE VISTAS (MENÚ INFERIOR)
// ==========================================================================
function cambiarVista(targetVista) {
    navBotones.forEach(b => {
        if (b.getAttribute('data-target') === targetVista) b.classList.add('active');
        else b.classList.remove('active');
    });

    vistas.forEach(v => {
        if (v.id === targetVista) v.classList.add('active');
        else v.classList.remove('active');
    });

    if (targetVista === 'vista-visualizar') {
        renderizarPlanillaLineal();
        if (typeof window.reajustarDimensionesMapa === 'function') {
            window.reajustarDimensionesMapa();
        }
    } else if (targetVista === 'vista-registro') {
        renderizarTablaAdministrativa();
        renderizarTablaGps();
    }
}

navBotones.forEach(btn => {
    btn.addEventListener('click', () => cambiarVista(btn.getAttribute('data-target')));
});

// ==========================================================================
// CÁLCULO LOGÍSTICO DE VENCIMIENTOS
// ==========================================================================
function evaluarAlertasGrua(grua) {
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    
    let tipoAlerta = 'normal'; 
    let documentosDetalle = [];
    let diasMinimos = Infinity;

    const fechasEvaluar = {
        'SOAT': grua.soat,
        'Póliza': grua.poliza,
        'RTM': grua.rtm
    };

    for (const [nombre, fechaStr] of Object.entries(fechasEvaluar)) {
        if (!fechaStr) continue;
        
        const partes = fechaStr.split('-');
        const fechaDoc = new Date(partes[0], partes[1] - 1, partes[2]);
        
        const diferenciaTiempo = fechaDoc - hoy;
        const diferenciaDias = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));

        if (diferenciaDias < 0) {
            tipoAlerta = 'vencido';
            documentosDetalle.push(`${nombre}`);
        } else if (diferenciaDias === 0) {
            tipoAlerta = 'proximo'; 
            documentosDetalle.push(`${nombre} (¡Vence HOY!)`);
        } else if (diferenciaDias <= 15 && tipoAlerta !== 'vencido') {
            tipoAlerta = 'proximo';
            documentosDetalle.push(`${nombre} (${diferenciaDias}d)`);
        }
        
        if (diferenciaDias < diasMinimos) diasMinimos = diferenciaDias;
    }

    return { tipoAlerta, detalle: documentosDetalle.join(', '), diasMinimos };
}

function obtenerHoraActualAMPM() {
    const ahora = new Date();
    let horas = ahora.getHours();
    const minutos = ahora.getMinutes().toString().padStart(2, '0');
    const ampm = horas >= 12 ? 'PM' : 'AM';
    horas = horas % 12 || 12; 
    return `${horas.toString().padStart(2, '0')}:${minutos} ${ampm}`;
}

// ==========================================================================
// RENDER VISTA 1: PLANILLA LINEAL CON FILTRO Y ASOMO DE INACTIVAS
// ==========================================================================
function crearFilaGruaElement(grua) {
    const { tipoAlerta, detalle } = evaluarAlertasGrua(grua);
    const fila = document.createElement('div');
    
    fila.className = `fila-grua-lineal borde-${grua.estado}`;
    
    let alertaHTML = `<span class="alerta-indicador"></span>`;
    if (tipoAlerta === 'vencido') {
        alertaHTML = `<span class="alerta-indicador" style="cursor:pointer;" title="¡VENCIDO!: ${detalle}" onclick="window.redireccionarAEdicion('${grua.id}')">❌</span>`;
    } else if (tipoAlerta === 'proximo') {
        alertaHTML = `<span class="alerta-indicador" style="cursor:pointer;" title="Próximo a vencer: ${detalle}" onclick="window.redireccionarAEdicion('${grua.id}')">⚠️</span>`;
    }

    const placaTexto = grua.placa ? grua.placa.toUpperCase() : 'SIN PLACA';
    const aliasTexto = grua.alias ? grua.alias.toUpperCase() : 'S/A';

    fila.innerHTML = `
        <div class="alias-tag" title="${placaTexto}">${aliasTexto}</div>
        
        <select class="select-planilla select-estado-accion bg-${grua.estado}" data-id="${grua.id}">
            <option value="activo" ${grua.estado === 'activo' ? 'selected' : ''}>ACTIVO</option>
            <option value="inactivo" ${grua.estado === 'inactivo' ? 'selected' : ''}>INACTIVO</option>
            <option value="recorrido" ${grua.estado === 'recorrido' ? 'selected' : ''}>RECORRIDO</option>
            <option value="operativo" ${grua.estado === 'operativo' ? 'selected' : ''}>OPERATIVO</option>
        </select>
        
        <select class="select-planilla select-posicion-plano" data-id="${grua.id}" ${grua.estado === 'inactivo' ? 'disabled' : ''}>
            <option value="" ${grua.posicion === '' ? 'selected' : ''}>--</option>
            <option value="QSY" ${grua.posicion === 'QSY' ? 'selected' : ''}>QSY</option>
            <option value="QAP" ${grua.posicion === 'QAP' ? 'selected' : ''}>QAP</option>
            <option value="ruta" ${grua.posicion === 'ruta' ? 'selected' : ''}>RUTA</option>
            <option value="patios" ${grua.posicion === 'patios' ? 'selected' : ''}>PATIOS</option>
            <option value="CT" ${grua.posicion === 'CT' ? 'selected' : ''}>CT</option>
        </select>
        
        <input type="text" class="input-obs-planilla" value="${grua.observaciones || ''}" placeholder="--" data-id="${grua.id}">
        
        <div style="display:flex; align-items:center; justify-content:center; width:20px;">${alertaHTML}</div>
    `;

    const selectEst = fila.querySelector('.select-estado-accion');
    const selectPos = fila.querySelector('.select-posicion-plano');
    const inputObs = fila.querySelector('.input-obs-planilla');

    selectEst.addEventListener('change', (e) => {
        const nuevoEstado = e.target.value;
        if (nuevoEstado === 'inactivo') {
            const gruaDocRef = doc(db, "gruas", grua.id);
            updateDoc(gruaDocRef, { estado: nuevoEstado, posicion: '', observaciones: '' });
        } else {
            actualizarCampoGrua(grua.id, 'estado', nuevoEstado);
        }
    });

    selectPos.addEventListener('change', (e) => {
        const nuevaPosicion = e.target.value;
        actualizarCampoGrua(grua.id, 'posicion', nuevaPosicion);
        if (nuevaPosicion === '') {
            actualizarCampoGrua(grua.id, 'observaciones', '');
            inputObs.value = '';
        } else {
            const horaStr = obtenerHoraActualAMPM();
            actualizarCampoGrua(grua.id, 'observaciones', horaStr);
            inputObs.value = horaStr;
        }
    });

    inputObs.addEventListener('blur', (e) => actualizarCampoGrua(grua.id, 'observaciones', e.target.value));
    inputObs.addEventListener('keypress', (e) => { if (e.key === 'Enter') inputObs.blur(); });

    // Evento interactivo con el Mapa Globalizado Seguro
    fila.addEventListener('click', (e) => {
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' || e.target.classList.contains('alerta-indicador')) return;
        
        if (window.mapObject && window.marcadoresActivos && window.datosCacheGruas) {
            const marker = window.marcadoresActivos[grua.id];
            const cache = window.datosCacheGruas[grua.id];
            if (marker && cache) {
                window.mapObject.setView([cache.lat, cache.lng], 16, { animate: true });
                marker.openPopup();
            }
        }
    });

    return fila;
}

function renderizarPlanillaLineal() {
    if (!contenedorCards) return;
    contenedorCards.innerHTML = '';
    
    const gruasVisibles = gruas.filter(grua => grua.visible !== false);
    const ordenarPorAlias = (a, b) =>
        (a.alias || '').toUpperCase().localeCompare((b.alias || '').toUpperCase());

    if (filtroPlanillaActual === 'inactivos') {
        contenedorCards.classList.remove('con-asomo-inactivos');
        const gruasInactivas = gruasVisibles
            .filter(g => g.estado === 'inactivo')
            .sort(ordenarPorAlias);

        if (gruasInactivas.length === 0) {
            contenedorCards.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8; font-size:0.75rem;">No hay grúas inactivas.</div>`;
            return;
        }

        gruasInactivas.forEach(grua => contenedorCards.appendChild(crearFilaGruaElement(grua)));
        return;
    }

    // Vista por defecto: Activos (activo, operativo, recorrido) + asomo sutil de inactivas a la derecha
    const gruasActivas = gruasVisibles
        .filter(g => g.estado !== 'inactivo')
        .sort((a, b) => {
            const ordenOperativo = { 'activo': 1, 'operativo': 2, 'recorrido': 3 };
            const pesoA = ordenOperativo[a.estado] || 5;
            const pesoB = ordenOperativo[b.estado] || 5;
            if (pesoA !== pesoB) return pesoA - pesoB;
            return ordenarPorAlias(a, b);
        });

    const gruasInactivasAsomadas = gruasVisibles
        .filter(g => g.estado === 'inactivo')
        .sort(ordenarPorAlias);

    contenedorCards.classList.toggle('con-asomo-inactivos', gruasInactivasAsomadas.length > 0);

    if (gruasActivas.length === 0) {
        contenedorCards.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8; font-size:0.75rem;">No hay grúas configuradas.</div>`;
    } else {
        gruasActivas.forEach(grua => contenedorCards.appendChild(crearFilaGruaElement(grua)));
    }

    if (gruasInactivasAsomadas.length > 0) {
        const carril = document.createElement('div');
        carril.className = 'carril-inactivas-asomadas';

        gruasInactivasAsomadas.forEach(grua => {
            const aliasMayus = (grua.alias || 'S/A').toUpperCase();
            const item = document.createElement('div');
            item.className = 'item-inactiva-asomada';
            item.title = `${aliasMayus} (Inactivo)`;
            item.innerHTML = `
                <span class="alias-asomado">${aliasMayus}</span>
                <div class="popover-pildoras-estado" role="group" aria-label="Activar ${aliasMayus}">
                    <button type="button" class="pildora-estado pildora-activo" data-estado="activo">ACT</button>
                    <button type="button" class="pildora-estado pildora-operativo" data-estado="operativo">OPE</button>
                    <button type="button" class="pildora-estado pildora-recorrido" data-estado="recorrido">REC</button>
                </div>
            `;

            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('pildora-estado')) return;
                e.stopPropagation();
                const yaAbierta = item.classList.contains('abierta');
                document.querySelectorAll('.item-inactiva-asomada.abierta').forEach(el => {
                    el.classList.remove('abierta');
                });
                if (!yaAbierta) item.classList.add('abierta');
            });

            item.querySelectorAll('.pildora-estado').forEach(pildora => {
                pildora.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const nuevoEstado = pildora.getAttribute('data-estado');
                    actualizarCampoGrua(grua.id, 'estado', nuevoEstado);
                });
            });

            carril.appendChild(item);
        });

        contenedorCards.appendChild(carril);
    }
}

function actualizarCampoGrua(id, campo, valor) {
    const gruaDocRef = doc(db, "gruas", id);
    updateDoc(gruaDocRef, { [campo]: valor }).catch(err => console.error(err));
}

// ==========================================================================
// RENDER VISTA 2: PANEL DE ADMINISTRACIÓN DE FLOTA (TABLA)
// ==========================================================================
function renderizarTablaAdministrativa() {
    if (!tbodyGruas) return;
    tbodyGruas.innerHTML = '';
    const busqueda = txtBuscar.value.toLowerCase().trim();

    let filtradas = gruas.filter(g => {
        const placa = (g.placa || '').toLowerCase();
        const alias = (g.alias || '').toLowerCase();
        const observaciones = (g.observaciones || '').toLowerCase();
        return placa.includes(busqueda) || alias.includes(busqueda) || observaciones.includes(busqueda);
    });

    filtradas.sort((a, b) => {
        const alertaA = evaluarAlertasGrua(a).tipoAlerta;
        const alertaB = evaluarAlertasGrua(b).tipoAlerta;
        const mapaPrioridad = { 'vencido': 1, 'proximo': 2, 'normal': 3 };
        const pesoA = mapaPrioridad[alertaA] || 3;
        const pesoB = mapaPrioridad[alertaB] || 3;

        if (pesoA !== pesoB) return pesoA - pesoB;
        return (a.placa || '').localeCompare(b.placa || '');
    });

    const totalFilas = filtradas.length;
    const totalPaginas = Math.ceil(totalFilas / filasPorPagina) || 1;
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    btnPrev.disabled = paginaActual === 1;
    btnNext.disabled = paginaActual === totalPaginas;
    infoPaginas.textContent = `Pág. ${paginaActual} de ${totalPaginas}`;

    const inicio = (paginaActual - 1) * filasPorPagina;
    const itemsPagina = filtradas.slice(inicio, inicio + filasPorPagina);

    if (itemsPagina.length === 0) {
        tbodyGruas.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:15px;">Sin registros encontrados.</td></tr>`;
        return;
    }

    itemsPagina.forEach(grua => {
        const tr = document.createElement('tr');
        const esVisible = grua.visible !== false;
        const placaMayus = (grua.placa || '--').toUpperCase();
        const aliasMayus = (grua.alias || '--').toUpperCase();

        tr.innerHTML = `
            <td style="font-weight:700; text-transform:uppercase;">${placaMayus}</td>
            <td>${aliasMayus}</td>
            <td><span style="text-transform:uppercase; font-weight:600;">${grua.estado}</span></td>
            <td>${grua.posicion || '--'}</td>
            <td>
                <span class="badge-venc ${obtenerEstiloBadge(grua.soat)}">S: ${grua.soat || '--'}</span>
                <span class="badge-venc ${obtenerEstiloBadge(grua.poliza)}">P: ${grua.poliza || '--'}</span>
                <span class="badge-venc ${obtenerEstiloBadge(grua.rtm)}">R: ${grua.rtm || '--'}</span>
            </td>
            <td>
                <button type="button" class="btn-accion-acc" data-id="${grua.id}" data-action="notify">🔔</button>
                <button type="button" class="btn-accion-acc" data-id="${grua.id}" data-action="toggle-visibility">${esVisible ? '👁️' : '🙈'}</button>
                <button type="button" class="btn-accion-acc" data-id="${grua.id}" data-action="edit">✏️</button>
                <button type="button" class="btn-accion-acc" data-id="${grua.id}" data-action="delete">🗑️</button>
            </td>
        `;

        tr.querySelectorAll('.btn-accion-acc').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const action = btn.getAttribute('data-action');
                if (action === 'notify') notificarGruero(id);
                if (action === 'toggle-visibility') conmutarVisibilidad(id);
                if (action === 'edit') cargarEdicionGrua(id);
                if (action === 'delete') eliminarGrua(id);
            });
        });

        tbodyGruas.appendChild(tr);
    });
}

function obtenerEstiloBadge(fechaStr) {
    if (!fechaStr) return 'vencido';
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const dias = Math.ceil((new Date(fechaStr + 'T00:00:00') - hoy) / (1000 * 60 * 60 * 24));
    if (dias <= 0) return 'vencido';
    if (dias <= 15) return 'alerta';
    return 'ok';
}

// ==========================================================================
// RENDER VISTA 2.2: INVENTARIO DE GPS
// ==========================================================================
function renderizarTablaGps() {
    if (!tbodyGps) return;
    tbodyGps.innerHTML = '';

    dispositivosGps.forEach(gps => {
        const gruaAsociada = gruas.find(g => g.id_gps_asignado === gps.id);
        
        let estadoHTML = `<span style="font-weight:600; color:#f59e0b;">📦 BODEGA</span>`;
        if (gruaAsociada) {
            const aliasAsociada = (gruaAsociada.alias || 'S/A').toUpperCase();
            estadoHTML = `<span style="font-weight:700; color:#3ab089;">🚛 ASIGNADO → ${aliasAsociada}</span>`;
        }

        let fechaTexto = 'Sin Reportes';
        if (gps.ultimaActualizacion) {
            const fechaJS = gps.ultimaActualizacion.toDate ? gps.ultimaActualizacion.toDate() : new Date(gps.ultimaActualizacion);
            
            fechaTexto = fechaJS.toLocaleString('es-ES', { 
                day: '2-digit',
                month: 'short',
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true
            });
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:700; color:#2563eb;">${gps.id}</td>
            <td>${gps.lat ? gps.lat.toFixed(5) : '--'}, ${gps.lng ? gps.lng.toFixed(5) : '--'}
                <br>
                <small style="color:#94a3b8">${fechaTexto}</small>
            </td>
            <td>${Math.round(gps.velocidad || 0)} km/h</td>
            <td>${estadoHTML}</td>
            <td style="text-align:center;">
                ${gruaAsociada ? `<button type="button" class="btn-primary" style="font-size:10px; padding:3px 8px;" data-id="${gruaAsociada.id}">Liberar</button>` : '--'}
            </td>
        `;

        const btnLiberar = tr.querySelector('button');
        if (btnLiberar) {
            btnLiberar.addEventListener('click', () => {
                if (confirm('¿Desvincular GPS de la grúa?')) {
                    updateDoc(doc(db, "gruas", btnLiberar.getAttribute('data-id')), { id_gps_asignado: "" });
                }
            });
        }

        tbodyGps.appendChild(tr);
    });
}

// ==========================================================================
// TRASLADO DE TELEMETRÍA DINÁMICA DE FIREBASE AL MAPA
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

// ==========================================================================
// OPERACIONES ACCIONES ADMINISTRATIVAS
// ==========================================================================
function notificarGruero(id) {
    const grua = gruas.find(g => g.id === id);
    if (!grua || !grua.telefono) return alert('Unidad sin teléfono móvil válido.');

    const aliasMayus = (grua.alias || 'S/A').toUpperCase();
    const placaMayus = (grua.placa || '').toUpperCase();
    const { tipoAlerta, detalle } = evaluarAlertasGrua(grua);
    let msg = `*CENTRAL DE MONITOREO*\n\nGrúa *${aliasMayus}* (${placaMayus}):\n`;
    if (tipoAlerta === 'vencido') msg += `⚠️ *ALERTA CRÍTICA*: Papeles Vencidos en ${detalle}.`;
    else if (tipoAlerta === 'proximo') msg += `🔔 *AVISO*: Renovación próxima en ${detalle}.`;
    else msg += `✅ Operación al día. ¡Buen viaje!`;

    window.open(`https://api.whatsapp.com/send?phone=${grua.telefono.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`, '_blank');
}

window.redireccionarAEdicion = function(id) {
    cargarEdicionGrua(id); 
    cambiarVista('vista-registro'); 
};

function conmutarVisibilidad(id) {
    const grua = gruas.find(g => g.id === id);
    if (grua) updateDoc(doc(db, "gruas", id), { visible: !(grua.visible !== false) });
}

function cargarEdicionGrua(id) {
    const grua = gruas.find(g => g.id === id);
    if (!grua) return;

    txtIdEdicion.value = grua.id;
    txtPlaca.value = (grua.placa || '').toUpperCase();
    txtAlias.value = (grua.alias || '').toUpperCase();
    selectEstado.value = grua.estado || 'inactivo';
    selectPosicion.value = grua.posicion || '';
    
    actualizarSelectGpsDisponibles();
    selectGpsAsignado.value = grua.id_gps_asignado || '';
    
    dateSoat.value = grua.soat || '';
    datePoliza.value = grua.poliza || '';
    dateRtm.value = grua.rtm || '';
    txtTelefono.value = grua.telefono || '';
    txtObservaciones.value = grua.observaciones || '';

    tituloFormulario.textContent = "Modificar Parámetros de Grúa";
    btnGuardar.textContent = "ACTUALIZAR DATOS";
    
    modalFormulario.classList.add('open');
}

function eliminarGrua(id) {
    if (confirm('¿Eliminar grúa?')) deleteDoc(doc(db, "gruas", id));
}

// ==========================================================================
// SUBMIT DE FORMULARIO DE ALTA / EDICIÓN
// ==========================================================================
formGrua.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idEdicion = txtIdEdicion.value;

    const datosGrua = {
        placa: txtPlaca.value.trim().toUpperCase(),
        alias: txtAlias.value.trim().toUpperCase(),
        estado: selectEstado.value,
        posicion: selectEstado.value === 'inactivo' ? '' : selectPosicion.value,
        id_gps_asignado: selectGpsAsignado.value, 
        soat: dateSoat.value,
        poliza: datePoliza.value,
        rtm: dateRtm.value,
        telefono: txtTelefono.value.trim(),
        observaciones: selectEstado.value === 'inactivo' && idEdicion ? '' : txtObservaciones.value.trim(),
        visible: true
    };

    if (gruas.some(g => g.placa === datosGrua.placa && g.id !== idEdicion)) {
        return alert('Error: Placa ya registrada en otra unidad.');
    }

    try {
        if (idEdicion) {
            await updateDoc(doc(db, "gruas", idEdicion), datosGrua);
        } else {
            await addDoc(gruasCollectionRef, datosGrua);
        }
        modalFormulario.classList.remove('open');
        limpiarFormularioAdministrativo();
    } catch (error) {
        console.error(error);
    }
});

btnCancelar.addEventListener('click', () => {
    modalFormulario.classList.remove('open');
    limpiarFormularioAdministrativo();
});

function limpiarFormularioAdministrativo() {
    formGrua.reset();
    txtIdEdicion.value = '';
    tituloFormulario.textContent = "Registrar Nueva Grúa";
    btnGuardar.textContent = "GUARDAR GRÚA";
    actualizarSelectGpsDisponibles();
}

txtBuscar.addEventListener('input', () => { paginaActual = 1; renderizarTablaAdministrativa(); });
btnPrev.addEventListener('click', () => { if (paginaActual > 1) { paginaActual--; renderizarTablaAdministrativa(); } });
btnNext.addEventListener('click', () => { paginaActual++; renderizarTablaAdministrativa(); });