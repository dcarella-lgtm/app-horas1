/**
 * Módulo de Asignaciones — Supervisor / Equipo
 * Sincronización con Supabase y respaldo en localStorage.
 */

// import { obtenerAsignacionesDB, guardarAsignacionDB } from "./api.js";

var STORAGE_KEY = "asignaciones";

let masterSupervisores = [];
let masterEquipos = [];

window.sincronizarListasMaestras = async function() {
    console.log("[Asignaciones] Sincronizando listas maestras...");
    try {
        const res = await window.obtenerListasDB();
        if (res.ok && res.data) {
            const sups = res.data.find(i => i.id === 'supervisores');
            const eqs = res.data.find(i => i.id === 'equipos');
            
            masterSupervisores = (sups && Array.isArray(sups.valores)) ? sups.valores : [];
            masterEquipos = (eqs && Array.isArray(eqs.valores)) ? eqs.valores : [];
            
            console.log("[Asignaciones] Listas maestras sincronizadas:", masterSupervisores.length, "supervisores");
        }
    } catch (e) {
        console.error("[Asignaciones] Error crítico en sincronización:", e);
    }
}

window.cargarListaSupervisores = function() {
    return masterSupervisores;
}

window.guardarListaSupervisores = async function(lista) {
    masterSupervisores = lista;
    if (window.guardarListasDB) await window.guardarListasDB('supervisores', lista);
}

window.cargarListaEquipos = function() {
    return masterEquipos;
}

window.guardarListaEquipos = async function(lista) {
    masterEquipos = lista;
    if (window.guardarListasDB) await window.guardarListasDB('equipos', lista);
}

/**
 * Carga las asignaciones desde localStorage (Cache rápido).
 */
window.cargarAsignaciones = function() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.warn("[Asignaciones] Error al parsear localStorage", e);
        }
    }
    return {};
}

/**
 * Sincroniza las asignaciones locales con las de la Base de Datos.
 */
window.sincronizarAsignaciones = async function() {
    console.log("[Asignaciones] Sincronizando con DB...");
    try {
        const res = await window.obtenerAsignacionesDB();
        if (res.ok && res.data) {
            var mapa = {};
            res.data.forEach(asig => {
                // Limpieza profunda del legajo
                var key = String(asig.legajo).trim();
                mapa[key] = {
                    supervisor: String(asig.supervisor || "").trim(),
                    equipo: String(asig.equipo || "").trim()
                };
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mapa));
            console.log(`[Asignaciones] ${res.data.length} asignaciones sincronizadas correctamente.`);
            return mapa;
        }
    } catch (e) {
        console.error("[Asignaciones] Error en sincronizarAsignaciones:", e);
    }
    return window.cargarAsignaciones();
}

/**
 * Guarda las asignaciones en localStorage.
 */
function guardarAsignaciones(asignaciones) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(asignaciones));
}

/**
 * Obtiene la asignación de un legajo específico.
 */
function obtenerAsignacion(legajo) {
    const todas = cargarAsignaciones();
    return todas[String(legajo)] || null;
}

/**
 * Actualiza la asignación de un legajo en DB y LocalStorage.
 * @param {string} legajo
 * @param {string} campo - "supervisor" o "equipo"
 * @param {string} valor
 */
window.actualizarAsignacion = async function(legajo, campo, valor) {
    const todas = cargarAsignaciones();
    const key = String(legajo);
    
    if (!todas[key]) {
        todas[key] = { supervisor: "", equipo: "" };
    }
    
    todas[key][campo] = valor;
    
    // 1. Guardar en LocalStorage para feedback inmediato
    guardarAsignaciones(todas);
    
    // 2. Guardar en Supabase (Async)
    const asigDB = {
        legajo: key,
        supervisor: todas[key].supervisor,
        equipo: todas[key].equipo
    };
    
    await guardarAsignacionDB(asigDB);
    
    return todas;
}
