/**
 * CONFIGURACIÓN GLOBAL DE LA APLICACIÓN
 * Aquí se definen los feriados y otras variables de negocio.
 */

// Lista de feriados nacionales Argentina 2026 + Feriados de Empresa
const FERIADOS_DATA = {
    // Nacionales Inamovibles
    "2026-01-01": "Año Nuevo",
    "2026-02-16": "Carnaval",
    "2026-02-17": "Carnaval",
    "2026-03-24": "Día Nacional de la Memoria por la Verdad y la Justicia",
    "2026-04-02": "Día del Veterano y de los Caídos en la Guerra de Malvinas",
    "2026-05-01": "Día del Trabajador",
    "2026-05-25": "Día de la Revolución de Mayo",
    "2026-06-20": "Paso a la Inmortalidad del General Manuel Belgrano",
    "2026-07-09": "Día de la Independencia",
    "2026-12-08": "Inmaculada Concepción de María",
    "2026-12-25": "Navidad",

    // Nacionales Trasladables / Puentes
    "2026-03-23": "Feriado con fines turísticos",
    "2026-06-15": "Paso a la Inmortalidad del General Güemes",
    "2026-07-10": "Feriado con fines turísticos",
    "2026-08-17": "Paso a la Inmortalidad del Gral. José de San Martín",
    "2026-10-12": "Día del Respeto a la Diversidad Cultural",
    "2026-11-23": "Día de la Soberanía Nacional",
    "2026-12-07": "Feriado con fines turísticos",

    // FERIADOS DE EMPRESA / GREMIO
    "2026-09-21": "Día del Trabajador Perfumista"
};

/**
 * Verifica si una fecha es feriado y retorna su nombre.
 * @param {string} fechaStr Formato YYYY-MM-DD
 * @returns {string|null} Nombre del feriado o null si no es feriado.
 */
export function getDetalleFeriado(fechaStr) {
    if (!fechaStr) return null;
    return FERIADOS_DATA[fechaStr] || null;
}

/**
 * Exporta la lista completa por si se necesita en otra parte.
 */
export const FERIADOS = Object.freeze(FERIADOS_DATA);
