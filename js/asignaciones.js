/**
 * Módulo de Asignaciones — Supervisor / Equipo
 * Persistencia en localStorage (sin backend).
 * Base para filtros por equipo en fases siguientes.
 */

const STORAGE_KEY = "asignaciones";

// Listas maestras de supervisores y equipos disponibles
export const SUPERVISORES = ["Juan", "María", "Pedro"];
export const EQUIPOS = ["Líquidos", "Sólidos", "Envasado"];

// Datos iniciales de ejemplo (se usan solo si no hay nada en localStorage)
const DEFAULTS = {
    "50026726": { supervisor: "Juan", equipo: "Líquidos" },
    "50046576": { supervisor: "María", equipo: "Sólidos" }
};

/**
 * Carga las asignaciones desde localStorage.
 * Si no existen, inicializa con los defaults y los persiste.
 */
export function cargarAsignaciones() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.warn("[Asignaciones] Error al parsear localStorage, usando defaults.", e);
        }
    }
    // Primera vez: guardar defaults
    guardarAsignaciones(DEFAULTS);
    return { ...DEFAULTS };
}

/**
 * Guarda las asignaciones en localStorage.
 * @param {Object} asignaciones - { legajo: { supervisor, equipo } }
 */
export function guardarAsignaciones(asignaciones) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(asignaciones));
}

/**
 * Obtiene la asignación de un legajo específico.
 * @param {string} legajo
 * @returns {{ supervisor: string, equipo: string } | null}
 */
export function obtenerAsignacion(legajo) {
    const todas = cargarAsignaciones();
    return todas[String(legajo)] || null;
}

/**
 * Actualiza la asignación de un legajo y persiste.
 * @param {string} legajo
 * @param {string} campo - "supervisor" o "equipo"
 * @param {string} valor
 * @returns {Object} asignaciones actualizadas
 */
export function actualizarAsignacion(legajo, campo, valor) {
    const todas = cargarAsignaciones();
    const key = String(legajo);
    if (!todas[key]) {
        todas[key] = { supervisor: "", equipo: "" };
    }
    todas[key][campo] = valor;
    guardarAsignaciones(todas);
    return todas;
}
