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

// ==========================================================================
// CONFIGURACIÓN GLOBAL Y ESTADOS
// ==========================================================================
let gruas = []; 
let dispositivosGps = []; 
let paginaActual = 1;
const filasPorPagina = 5;

const gruasCollectionRef = collection(db, "gruas");
const gpsCollectionRef = collection(db, "dispositivos_gps");

// Elementos del DOM - Navegación de Pestañas Inferiores Móviles
const vistas = document.querySelectorAll('.vista');
const navBotones = document.querySelectorAll('.nav-btn');

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

// ==========================================================================
// ESCUCHA SIMULTÁNEA EN TIEMPO REAL
// ==========================================================================
function inicializarSincronizacionFirestore() {
    onSnapshot(gruasCollectionRef, (snapshot) => {
        gruas = [];
        snapshot.forEach((doc) => {
            gruas.push({ id: doc.id, ...doc.data() });
        });
        procesarYRenderizarTodo();
    });

    onSnapshot(gpsCollectionRef, (snapshot) => {
        dispositivosGps = [];
        snapshot.forEach((doc) => {
            dispositivosGps.push({ id: doc.id, ...doc.data() });
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
            // Es EXACTAMENTE hoy, le quedan horas de vigencia
            tipoAlerta = 'proximo'; 
            documentosDetalle.push(`${nombre} (¡Vence HOY!)`);
        }else if (diferenciaDias <= 15 && tipoAlerta !== 'vencido') {
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
// RENDER VISTA 1: PLANILLA LINEAL EN PARALELO SEMÁFORO INDEPENDIENTE
// ==========================================================================
function renderizarPlanillaLineal() {
    if (!contenedorCards) return;
    contenedorCards.innerHTML = '';
    
    const gruasVisibles = gruas.filter(grua => grua.visible !== false);

    gruasVisibles.sort((a, b) => {
        const ordenOperativo = { 'activo': 1, 'operativo': 2, 'recorrido': 3, 'inactivo': 4 };
        const pesoA = ordenOperativo[a.estado] || 5;
        const pesoB = ordenOperativo[b.estado] || 5;
        if (pesoA !== pesoB) return pesoA - pesoB;
        return (a.alias || '').toLowerCase().localeCompare((b.alias || '').toLowerCase());
    });

    if (gruasVisibles.length === 0) {
        contenedorCards.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8; font-size:0.75rem;">No hay grúas configuradas.</div>`;
        return;
    }

    gruasVisibles.forEach(grua => {
        const { tipoAlerta, detalle } = evaluarAlertasGrua(grua);
        const fila = document.createElement('div');
        
        fila.className = `fila-grua-lineal borde-${grua.estado}`;
        
        // DECLARACIÓN ÚNICA SANEADA (Elimina error de identificador duplicado)
        let alertaHTML = `<span class="alerta-indicador"></span>`;
        if (tipoAlerta === 'vencido') {
            alertaHTML = `<span class="alerta-indicador" style="cursor:pointer;" title="¡VENCIDO!: ${detalle}" onclick="window.redireccionarAEdicion('${grua.id}')">❌</span>`;
        } else if (tipoAlerta === 'proximo') {
            alertaHTML = `<span class="alerta-indicador" style="cursor:pointer;" title="Próximo a vencer: ${detalle}" onclick="window.redireccionarAEdicion('${grua.id}')">⚠️</span>`;
        }

        const placaTexto = grua.placa ? grua.placa.toUpperCase() : 'SIN PLACA';

        fila.innerHTML = `
            <div class="alias-tag" title="${placaTexto}">${grua.alias || 'S/A'}</div>
            
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

        contenedorCards.appendChild(fila);
    });
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

        tr.innerHTML = `
            <td style="font-weight:700; text-transform:uppercase;">${grua.placa || '--'}</td>
            <td>${grua.alias || '--'}</td>
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
            estadoHTML = `<span style="font-weight:700; color:#3ab089;">🚛 ASIGNADO → ${gruaAsociada.alias || 'S/A'}</span>`;
        }

        let fechaTexto = 'Sin Reportes';
        if (gps.ultimaActualizacion) {
            const fechaJS = gps.ultimaActualizacion.toDate ? gps.ultimaActualizacion.toDate() : new Date(gps.ultimaActualizacion);
            
            // Cambiamos a toLocaleString para agregar día, mes y año junto a la hora
            fechaTexto = fechaJS.toLocaleString('es-ES', { 
                day: '2-digit',
                month: 'short',
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true // Cambia a false si prefieres formato de 24 horas
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
                alias: grua.alias,
                placa: grua.placa,
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

    const { tipoAlerta, detalle } = evaluarAlertasGrua(grua);
    let msg = `*CENTRAL DE MONITOREO*\n\nGrúa *${grua.alias || 'S/A'}* (${grua.placa || ''}):\n`;
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
    txtPlaca.value = grua.placa || '';
    txtAlias.value = grua.alias || '';
    selectEstado.value = grua.estado || 'inactivo';
    selectPosicion.value = grua.posicion || '';
    
    // Forzamos actualización de sincronía previa para habilitar el ID en el selector
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
        alias: txtAlias.value.trim(),
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
