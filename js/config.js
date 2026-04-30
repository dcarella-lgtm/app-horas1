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

// Exponer para que config-ui.js pueda renderizar la lista
window.FERIADOS_ESTATICOS = FERIADOS_ESTATICOS;

// Cache para configuración
let FERIADOS_DINAMICOS = {};
let CONFIG_RRHH_CACHE = {
    limite_mensual_50: 40,
    limite_mensual_100: 20,
    palabras_clave_demora: "menor jornada,tarde,demora"
};

/**
 * Carga TODA la configuración (Feriados y RRHH)
 */
window.inicializarConfiguracion = async function() {
    console.log("[Config] Iniciando carga de configuración...");
    try {
        await Promise.allSettled([
            cargarFeriados(),
            cargarConfigRRHH()
        ]);
        console.log("[Config] Configuración inicializada.");
    } catch (err) {
        console.error("[Config] Error crítico en inicialización:", err);
    }
}

async function cargarFeriados() {
    if (typeof window.obtenerFeriadosDB !== "function") return;
    try {
        const res = await window.obtenerFeriadosDB();
        if (res.ok && res.data) {
            const nuevos = {};
            res.data.forEach(f => { nuevos[f.fecha] = f.nombre; });
            FERIADOS_DINAMICOS = nuevos;
            console.log("[Config] Feriados sincronizados");
        }
    } catch (err) { console.warn("[Config] No se pudo cargar feriados de DB."); }
}
window.cargarFeriados = cargarFeriados;

async function cargarConfigRRHH() {
    if (typeof window.obtenerConfigRRHH !== "function") return;
    try {
        const res = await window.obtenerConfigRRHH();
        if (res.ok && res.data) {
            CONFIG_RRHH_CACHE = res.data;
            console.log("[Config] Configuración RRHH sincronizada");
        }
    } catch (err) { console.warn("[Config] No se pudo cargar config RRHH."); }
}

window.getDetalleFeriado = function(fechaStr) {
    if (!fechaStr) return null;
    const dinamico = FERIADOS_DINAMICOS[fechaStr];
    if (dinamico === "__LABORABLE__") return null;
    if (dinamico) return dinamico;
    return FERIADOS_ESTATICOS[fechaStr] || null;
}

window.obtenerConfiguracion = function() {
    return CONFIG_RRHH_CACHE;
}

window.getConfigRRHH = function() {
    return CONFIG_RRHH_CACHE;
}

window.analizarTipoEvento = function(registro) {
    const aus = String(registro.ausencias || "").toLowerCase();
    if (!aus || aus.trim() === "") return { tipo: 'ok', detalle: '' };
    const keywords = (CONFIG_RRHH_CACHE.palabras_clave_demora || "").split(",").map(k => k.trim().toLowerCase());
    const esDemora = keywords.some(k => k && aus.includes(k));
    const tieneActividad = registro.hora_ingreso !== null && registro.hora_ingreso !== 0 && registro.hora_ingreso !== "";
    if (tieneActividad) {
        if (esDemora) return { tipo: 'demora', detalle: registro.ausencias };
        return { tipo: 'ok', detalle: '' };
    }
    return esDemora ? { tipo: 'demora', detalle: registro.ausencias } : { tipo: 'ausencia', detalle: registro.ausencias };
}

// ── Gestión de Supervisor Activo (Global) ──────────────────
const SUPERVISOR_KEY = "supervisorActivo";

window.getSupervisorActivo = function() {
    return localStorage.getItem(SUPERVISOR_KEY) || "";
};

window.setSupervisorActivo = function(valor) {
    if (valor) {
        localStorage.setItem(SUPERVISOR_KEY, valor);
    } else {
        localStorage.removeItem(SUPERVISOR_KEY);
    }
    // Notificar a otras partes de la app si es necesario
    window.dispatchEvent(new Event('supervisorChanged'));
};
