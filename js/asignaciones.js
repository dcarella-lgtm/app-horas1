/**
 * Módulo de Asignaciones — Supervisor / Equipo
 * Sincronización con Supabase y respaldo en localStorage.
 */

import { obtenerAsignacionesDB, guardarAsignacionDB } from "./api.js";

const STORAGE_KEY = "asignaciones";

// Funciones para manejar listas maestras (Siguen siendo locales por ahora)
export function cargarListaSupervisores() {
    const raw = localStorage.getItem("lista_supervisores");
    if (raw) return JSON.parse(raw);
    const def = ["Juan", "María"];
    guardarListaSupervisores(def);
    return def;
}

export function guardarListaSupervisores(lista) {
    localStorage.setItem("lista_supervisores", JSON.stringify(lista));
}

export function cargarListaEquipos() {
    const raw = localStorage.getItem("lista_equipos");
    if (raw) return JSON.parse(raw);
    const def = ["Líquidos", "Sólidos"];
    guardarListaEquipos(def);
    return def;
}

export function guardarListaEquipos(lista) {
    localStorage.setItem("lista_equipos", JSON.stringify(lista));
}

/**
 * Carga las asignaciones desde localStorage (Cache rápido).
 */
export function cargarAsignaciones() {
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
export async function sincronizarAsignaciones() {
    console.log("[Asignaciones] Sincronizando con DB...");
    const res = await obtenerAsignacionesDB();
    if (res.ok && res.data) {
        const mapa = {};
        res.data.forEach(asig => {
            mapa[asig.legajo] = {
                supervisor: asig.supervisor,
                equipo: asig.equipo
            };
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapa));
        console.log(`[Asignaciones] ${res.data.length} asignaciones sincronizadas.`);
        return mapa;
    }
    return cargarAsignaciones();
}

/**
 * Guarda las asignaciones en localStorage.
 */
export function guardarAsignaciones(asignaciones) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(asignaciones));
}

/**
 * Obtiene la asignación de un legajo específico.
 */
export function obtenerAsignacion(legajo) {
    const todas = cargarAsignaciones();
    return todas[String(legajo)] || null;
}

/**
 * Actualiza la asignación de un legajo en DB y LocalStorage.
 * @param {string} legajo
 * @param {string} campo - "supervisor" o "equipo"
 * @param {string} valor
 */
export async function actualizarAsignacion(legajo, campo, valor) {
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
