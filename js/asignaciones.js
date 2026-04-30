/**
 * Módulo de Asignaciones — Supervisor / Equipo
 * Fuente única: Supabase. Sin fallback a localStorage para listas maestras.
 */

var STORAGE_KEY = "asignaciones";

// Variables en memoria para listas maestras (se llenan desde Supabase)
let _masterSupervisores = [];
let _masterEquipos = [];
let _maestrasSincronizadas = false;

/**
 * Sincroniza listas maestras DESDE Supabase.
 * Retorna una promesa que se resuelve cuando los datos están listos.
 */
window.sincronizarListasMaestras = async function() {
    console.log("[Asignaciones] Sincronizando listas maestras...");
    try {
        const res = await window.obtenerListasDB();
        if (res.ok && res.data) {
            const sups = res.data.find(i => i.id === 'supervisores');
            const eqs = res.data.find(i => i.id === 'equipos');

            _masterSupervisores = (sups && Array.isArray(sups.valores)) ? sups.valores : [];
            _masterEquipos = (eqs && Array.isArray(eqs.valores)) ? eqs.valores : [];

            _maestrasSincronizadas = true;
            console.log("[Asignaciones] Listas maestras sincronizadas:", _masterSupervisores.length, "supervisores,", _masterEquipos.length, "equipos");
            console.log("[Asignaciones] Supervisores:", JSON.stringify(_masterSupervisores));
            console.log("[Asignaciones] Equipos:", JSON.stringify(_masterEquipos));
        } else {
            console.warn("[Asignaciones] obtenerListasDB no devolvió datos.");
        }
    } catch (e) {
        console.error("[Asignaciones] Error crítico en sincronización:", e);
    }
}

/**
 * Devuelve la lista de supervisores (ya sincronizada).
 */
window.cargarListaSupervisores = function() {
    return _masterSupervisores;
}

/**
 * Guarda la lista de supervisores en Supabase y actualiza memoria.
 */
window.guardarListaSupervisores = async function(lista) {
    _masterSupervisores = lista;
    if (window.guardarListasDB) {
        const res = await window.guardarListasDB('supervisores', lista);
        console.log("[Asignaciones] Guardado supervisores en DB:", res);
    }
}

/**
 * Devuelve la lista de equipos (ya sincronizada).
 */
window.cargarListaEquipos = function() {
    return _masterEquipos;
}

/**
 * Guarda la lista de equipos en Supabase y actualiza memoria.
 */
window.guardarListaEquipos = async function(lista) {
    _masterEquipos = lista;
    if (window.guardarListasDB) {
        const res = await window.guardarListasDB('equipos', lista);
        console.log("[Asignaciones] Guardado equipos en DB:", res);
    }
}

/**
 * Carga las asignaciones (legajo → {supervisor, equipo}) desde localStorage.
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
 * Sincroniza las asignaciones individuales desde Supabase.
 */
window.sincronizarAsignaciones = async function() {
    console.log("[Asignaciones] Sincronizando con DB...");
    try {
        const res = await window.obtenerAsignacionesDB();
        if (res.ok && res.data) {
            var mapa = {};
            res.data.forEach(asig => {
                var key = String(asig.legajo).trim();
                mapa[key] = {
                    supervisor: String(asig.supervisor || "").trim(),
                    equipo: String(asig.equipo || "").trim()
                };
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mapa));
            console.log("[Asignaciones] " + res.data.length + " asignaciones sincronizadas correctamente.");
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

    await window.guardarAsignacionDB(asigDB);

    return todas;
}
