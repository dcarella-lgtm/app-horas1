-- ============================================================
-- TABLA: registros_diarios
-- Almacena los registros diarios de horas extras por empleado.
-- Preparada para Supabase (PostgreSQL).
-- ============================================================

-- Habilitar extensión para UUIDs si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tabla principal
CREATE TABLE IF NOT EXISTS registros_diarios (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identificación del empleado
    legajo                  TEXT NOT NULL,
    nombre                  TEXT NOT NULL,

    -- Fecha del registro
    fecha                   DATE NOT NULL,

    -- Marcaciones (fracción decimal del día, ej: 0.333 = 08:00)
    hora_ingreso            NUMERIC DEFAULT 0,
    hora_salida             NUMERIC DEFAULT 0,

    -- Horas calculadas automáticamente
    horas_trabajadas        NUMERIC DEFAULT 0,
    horas_50_auto           NUMERIC DEFAULT 0,
    horas_100_auto          NUMERIC DEFAULT 0,
    horas_feriado_auto      NUMERIC DEFAULT 0,

    -- Horas ajustadas por el manager
    horas_50_manager        NUMERIC DEFAULT 0,
    horas_100_manager       NUMERIC DEFAULT 0,
    horas_feriado_manager   NUMERIC DEFAULT 0,
    horas_nocturnas_manager NUMERIC DEFAULT 0,
    noches_manager          NUMERIC DEFAULT 0,

    -- Metadata
    ausencias               TEXT DEFAULT '',
    comentarios             TEXT DEFAULT '',
    estado                  TEXT DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'revision')),

    -- Auditoría
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),

    -- Restricción: un solo registro por legajo + fecha
    CONSTRAINT uq_legajo_fecha UNIQUE (legajo, fecha)
);

-- ============================================================
-- ÍNDICES
-- ============================================================

-- Búsquedas rápidas por legajo
CREATE INDEX IF NOT EXISTS idx_registros_legajo
    ON registros_diarios (legajo);

-- Búsquedas por fecha (reportes por período)
CREATE INDEX IF NOT EXISTS idx_registros_fecha
    ON registros_diarios (fecha);

-- Filtrado por estado (dashboard: pendientes, aprobados, etc.)
CREATE INDEX IF NOT EXISTS idx_registros_estado
    ON registros_diarios (estado);

-- ============================================================
-- TRIGGER: actualizar updated_at automáticamente
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_registros_updated_at
    BEFORE UPDATE ON registros_diarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS (Row Level Security) — base preparada
-- ============================================================

ALTER TABLE registros_diarios ENABLE ROW LEVEL SECURITY;

-- Política pública de lectura (ajustar según roles más adelante)
CREATE POLICY "Lectura pública de registros"
    ON registros_diarios
    FOR SELECT
    USING (true);

-- Política de inserción (ajustar según auth)
CREATE POLICY "Inserción de registros"
    ON registros_diarios
    FOR INSERT
    WITH CHECK (true);

-- Política de actualización (ajustar según auth)
CREATE POLICY "Actualización de registros"
    ON registros_diarios
    FOR UPDATE
    USING (true)
    WITH CHECK (true);
