// Módulo para interactuar con Supabase

// ============================================================
// CONFIGURACIÓN — Reemplazar con tus credenciales reales
// ============================================================
const supabaseUrl = "https://edfrbxgzeknkqrzscgqk.supabase.co";
const supabaseKey = "sb_publishable_EzjcSjadXXDzh0SI35zxmA_pbHzaw-T";

const { createClient } = window.supabase;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================
// INSERTAR REGISTROS
// ============================================================

/**
 * Inserta un array de registros en la tabla registros_diarios.
 * Usa upsert con constraint legajo+fecha para evitar duplicados.
 * @param {Array<Object>} registros - Array de objetos mapeados desde el Excel
 * @returns {Object} { ok: boolean, insertados: number, error: string|null }
 */
export async function insertarRegistros(registros) {
    if (!registros || registros.length === 0) {
        console.warn("[API] No hay registros para insertar.");
        return { ok: false, insertados: 0, error: "Array vacío" };
    }

    console.log(`[API] Insertando ${registros.length} registros...`);

    // Limpiar campos que no van a la DB (por si vienen extras del mapeo)
    const campos = [
        'legajo', 'nombre', 'fecha',
        'hora_ingreso', 'hora_salida',
        'horas_trabajadas',
        'horas_50_auto', 'horas_100_auto', 'horas_feriado_auto',
        'horas_50_manager', 'horas_100_manager', 'horas_feriado_manager',
        'horas_nocturnas_manager', 'noches_manager',
        'ausencias', 'comentarios', 'estado'
    ];

    const registrosLimpios = registros.map(r => {
        const limpio = {};
        for (const campo of campos) {
            if (r[campo] !== undefined) {
                limpio[campo] = r[campo];
            }
        }
        return limpio;
    });

    try {
        const { data, error } = await supabase
            .from("registros_diarios")
            .insert(registrosLimpios);

        if (error) {
            console.error("[API] Error al insertar registros:", error.message);
            return { ok: false, insertados: 0, error: error.message };
        }

        const count = data ? data.length : registrosLimpios.length;
        console.log(`[API] ✅ ${count} registros insertados correctamente.`);
        return { ok: true, insertados: count, error: null };

    } catch (err) {
        console.error("[API] Excepción inesperada:", err);
        return { ok: false, insertados: 0, error: err.message };
    }
}

// ============================================================
// UPSERT (alternativa para reimportaciones)
// ============================================================

/**
 * Inserta o actualiza registros usando el constraint uq_legajo_fecha.
 * Útil cuando se reimporta un Excel con datos corregidos.
 * @param {Array<Object>} registros
 * @returns {Object} { ok: boolean, procesados: number, error: string|null }
 */
export async function upsertRegistros(registros) {
    if (!registros || registros.length === 0) {
        console.warn("[API] No hay registros para upsert.");
        return { ok: false, procesados: 0, error: "Array vacío" };
    }

    console.log(`[API] Upsert de ${registros.length} registros...`);

    const campos = [
        'legajo', 'nombre', 'fecha',
        'hora_ingreso', 'hora_salida',
        'horas_trabajadas',
        'horas_50_auto', 'horas_100_auto', 'horas_feriado_auto',
        'horas_50_manager', 'horas_100_manager', 'horas_feriado_manager',
        'horas_nocturnas_manager', 'noches_manager',
        'ausencias', 'comentarios', 'estado'
    ];

    const registrosLimpios = registros.map(r => {
        const limpio = {};
        for (const campo of campos) {
            if (r[campo] !== undefined) {
                limpio[campo] = r[campo];
            }
        }
        return limpio;
    });

    try {
        const { data, error } = await supabase
            .from("registros_diarios")
            .upsert(registrosLimpios, { onConflict: 'legajo,fecha' });

        if (error) {
            console.error("[API] Error en upsert:", error.message);
            return { ok: false, procesados: 0, error: error.message };
        }

        const count = data ? data.length : registrosLimpios.length;
        console.log(`[API] ✅ Upsert completado: ${count} registros procesados.`);
        return { ok: true, procesados: count, error: null };

    } catch (err) {
        console.error("[API] Excepción inesperada en upsert:", err);
        return { ok: false, procesados: 0, error: err.message };
    }
}

// ============================================================
// CONSULTAR REGISTROS
// ============================================================

/**
 * Obtiene registros filtrados por legajo, rango de fechas, o estado.
 * @param {Object} filtros - { legajo?, fechaDesde?, fechaHasta?, estado? }
 * @returns {Object} { ok: boolean, data: Array, error: string|null }
 */
export async function obtenerRegistros(filtros = {}) {
    try {
        let query = supabase
            .from("registros_diarios")
            .select("*")
            .order("fecha", { ascending: true });

        if (filtros.legajo) {
            query = query.eq("legajo", filtros.legajo);
        }
        if (filtros.fechaDesde) {
            query = query.gte("fecha", filtros.fechaDesde);
        }
        if (filtros.fechaHasta) {
            query = query.lte("fecha", filtros.fechaHasta);
        }
        if (filtros.estado) {
            query = query.eq("estado", filtros.estado);
        }

        const { data, error } = await query;

        if (error) {
            console.error("[API] Error al obtener registros:", error.message);
            return { ok: false, data: [], error: error.message };
        }

        console.log(`[API] ${data.length} registros obtenidos.`);
        return { ok: true, data, error: null };

    } catch (err) {
        console.error("[API] Excepción inesperada:", err);
        return { ok: false, data: [], error: err.message };
    }
}

// ============================================================
// GESTIÓN DE FERIADOS
// ============================================================

/**
 * Obtiene la lista de feriados personalizados desde Supabase.
 */
export async function obtenerFeriadosDB() {
    try {
        const { data, error } = await supabase
            .from("feriados")
            .select("*")
            .order("fecha", { ascending: true });

        if (error) throw error;
        return { ok: true, data };
    } catch (err) {
        console.error("[API] Error al obtener feriados:", err.message);
        return { ok: false, data: [], error: err.message };
    }
}

/**
 * Agrega un nuevo feriado a la base de datos.
 */
export async function agregarFeriadoDB(fecha, nombre) {
    try {
        const { data, error } = await supabase
            .from("feriados")
            .insert([{ fecha, nombre }])
            .select();

        if (error) throw error;
        return { ok: true, data: data[0] };
    } catch (err) {
        console.error("[API] Error al agregar feriado:", err.message);
        return { ok: false, error: err.message };
    }
}

/**
 * Elimina un feriado por su ID.
 */
export async function eliminarFeriadoDB(id) {
    try {
        const { error } = await supabase
            .from("feriados")
            .delete()
            .eq("id", id);

        if (error) throw error;
        return { ok: true };
    } catch (err) {
        console.error("[API] Error al eliminar feriado:", err.message);
        return { ok: false, error: err.message };
    }
}

// ============================================================
// CONFIGURACIÓN RRHH (Límites y Horarios)
// ============================================================

/**
 * Obtiene la configuración de límites y horarios de RRHH.
 */
export async function obtenerConfigRRHH() {
    try {
        const { data, error } = await supabase
            .from("config_rrhh")
            .select("*")
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // Ignorar si no hay filas
        return { ok: true, data: data || null };
    } catch (err) {
        console.error("[API] Error al obtener config RRHH:", err.message);
        return { ok: false, data: null, error: err.message };
    }
}

/**
 * Guarda o actualiza la configuración de RRHH.
 */
export async function guardarConfigRRHH(config) {
    try {
        const { data, error } = await supabase
            .from("config_rrhh")
            .upsert([config])
            .select();

        if (error) throw error;
        return { ok: true, data: data[0] };
    } catch (err) {
        console.error("[API] Error al guardar config RRHH:", err.message);
        return { ok: false, error: err.message };
    }
}
