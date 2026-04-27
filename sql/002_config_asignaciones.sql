-- ============================================================
-- TABLA: config_asignaciones
-- Almacena la relación entre legajos, supervisores y equipos.
-- ============================================================

CREATE TABLE IF NOT EXISTS config_asignaciones (
    legajo      TEXT PRIMARY KEY,
    supervisor  TEXT DEFAULT '',
    equipo      TEXT DEFAULT '',
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE config_asignaciones ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según necesidad)
CREATE POLICY "Lectura pública de asignaciones" ON config_asignaciones FOR SELECT USING (true);
CREATE POLICY "Escritura pública de asignaciones" ON config_asignaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualización pública de asignaciones" ON config_asignaciones FOR UPDATE USING (true) WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER trg_asignaciones_updated_at
    BEFORE UPDATE ON config_asignaciones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
