/**
 * Módulo de Asignaciones — Supervisor / Equipo
 * Sincronización con Supabase y respaldo en localStorage.
 */

// import { obtenerAsignacionesDB, guardarAsignacionDB } from "./api.js";

var STORAGE_KEY = "asignaciones";

/**
 * Carga las listas maestras desde Supabase y las guarda en LocalStorage.
 */
window.sincronizarListasMaestras = async function() {
    console.log("[Asignaciones] Sincronizando listas maestras...");
    try {
        const res = await window.obtenerListasDB();
        if (res.ok && res.data && res.data.length > 0) {
            res.data.forEach(item => {
                if (item.id === 'supervisores' && Array.isArray(item.valores)) {
                    localStorage.setItem("lista_supervisores", JSON.stringify(item.valores));
                }
                if (item.id === 'equipos' && Array.isArray(item.valores)) {
                    localStorage.setItem("lista_equipos", JSON.stringify(item.valores));
                }
            });
            console.log("[Asignaciones] Listas maestras sincronizadas con éxito.");
        } else {
            console.warn("[Asignaciones] No se recibieron listas de DB, usando locales.");
        }
    } catch (e) {
        console.error("[Asignaciones] Error crítico en sincronización:", e);
    }
}

window.cargarListaSupervisores = function() {
    try {
        var raw = localStorage.getItem("lista_supervisores");
        var lista = raw ? JSON.parse(raw) : null;
        if (Array.isArray(lista) && lista.length > 0) return lista;
    } catch(e) {}
    return []; // Sin datos
}

window.guardarListaSupervisores = async function(lista) {
    localStorage.setItem("lista_supervisores", JSON.stringify(lista));
    if (window.guardarListasDB) await window.guardarListasDB('supervisores', lista);
}

window.cargarListaEquipos = function() {
    try {
        var raw = localStorage.getItem("lista_equipos");
        var lista = raw ? JSON.parse(raw) : null;
        if (Array.isArray(lista) && lista.length > 0) return lista;
    } catch(e) {}
    return []; // Sin datos
}

window.guardarListaEquipos = async function(lista) {
    localStorage.setItem("lista_equipos", JSON.stringify(lista));
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
