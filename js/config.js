/**
 * CONFIGURACIÓN GLOBAL DE LA APLICACIÓN
 * Aquí se definen los feriados y otras variables de negocio.
 */

// Lista de feriados nacionales Argentina 2026 (Backup estático)
const FERIADOS_ESTATICOS = {
    "2026-01-01": "Año Nuevo",
    "2026-02-16": "Carnaval",
    "2026-02-17": "Carnaval",
    "2026-03-23": "Feriado con fines turísticos",
    "2026-03-24": "Día Nacional de la Memoria por la Verdad y la Justicia",
    "2026-04-02": "Día del Veterano y de los Caídos en la Guerra de Malvinas",
    "2026-05-01": "Día del Trabajador",
    "2026-05-25": "Día de la Revolución de Mayo",
    "2026-06-15": "Paso a la Inmortalidad del General Güemes",
    "2026-06-20": "Paso a la Inmortalidad del General Manuel Belgrano",
    "2026-07-09": "Día de la Independencia",
    "2026-07-10": "Feriado con fines turísticos",
    "2026-08-17": "Paso a la Inmortalidad del Gral. José de San Martín",
    "2026-10-12": "Día del Respeto a la Diversidad Cultural",
    "2026-11-23": "Día de la Soberanía Nacional",
    "2026-12-07": "Feriado con fines turísticos",
    "2026-12-08": "Inmaculada Concepción de María",
    "2026-12-25": "Navidad",
    "2026-09-21": "Día del Trabajador Perfumista"
};

// Cache para feriados cargados desde la base de datos
let FERIADOS_DINAMICOS = {};

/**
 * Carga los feriados desde Supabase y los mezcla con los estáticos.
 */
import { obtenerFeriadosDB } from "./api.js";

export async function cargarFeriados() {
    try {
        const res = await obtenerFeriadosDB();
        if (res.ok) {
            const nuevos = {};
            res.data.forEach(f => {
                nuevos[f.fecha] = f.nombre;
            });
            FERIADOS_DINAMICOS = nuevos;
            console.log("[Config] Feriados sincronizados desde DB");
        }
    } catch (err) {
        console.warn("[Config] No se pudo sincronizar con DB, usando backup estático.");
    }
}

/**
 * Verifica si una fecha es feriado y retorna su nombre.
 * Prioriza los dinámicos (DB) sobre los estáticos.
 */
export function getDetalleFeriado(fechaStr) {
    if (!fechaStr) return null;
    return FERIADOS_DINAMICOS[fechaStr] || FERIADOS_ESTATICOS[fechaStr] || null;
}

export const FERIADOS = FERIADOS_ESTATICOS;

// Cache para configuración de RRHH
let CONFIG_RRHH_CACHE = {
    limite_mensual_50: 40,
    limite_mensual_100: 20,
    palabras_clave_demora: "menor jornada,tarde,demora"
};

import { obtenerFeriadosDB, obtenerConfigRRHH } from "./api.js";

/**
 * Carga TODA la configuración (Feriados y RRHH)
 */
export async function inicializarConfiguracion() {
    await cargarFeriados();
    await cargarConfigRRHH();
}

async function cargarConfigRRHH() {
    try {
        const res = await obtenerConfigRRHH();
        if (res.ok && res.data) {
            CONFIG_RRHH_CACHE = res.data;
            console.log("[Config] Configuración RRHH sincronizada");
        }
    } catch (err) {
        console.warn("[Config] Error al cargar config RRHH, usando valores por defecto.");
    }
}

export function getConfigRRHH() {
    return CONFIG_RRHH_CACHE;
}

/**
 * Analiza un registro para determinar si es una ausencia o una demora
 * @returns { tipo: 'ausencia'|'demora'|'ok', detalle: string }
 */
export function analizarTipoEvento(registro) {
    const aus = String(registro.ausencias || "").toLowerCase();
    const config = getConfigRRHH();
    const keywords = config.palabras_clave_demora.split(",").map(k => k.trim().toLowerCase());

    if (aus === "") return { tipo: 'ok', detalle: '' };

    // Si tiene texto, verificar si es una demora por palabras clave
    const esDemora = keywords.some(k => aus.includes(k));
    
    if (esDemora) {
        return { tipo: 'demora', detalle: registro.ausencias };
    } else {
        return { tipo: 'ausencia', detalle: registro.ausencias };
    }
}
