-- ================================================================
--  SISTEMA ENTRE PARES — Script de configuración Supabase
--  Ejecutar en: Supabase → SQL Editor → New query
-- ================================================================

-- 1. Tabla principal
CREATE TABLE IF NOT EXISTS participantes (
  id              BIGSERIAL    PRIMARY KEY,
  nombre          TEXT         NOT NULL,
  apellido        TEXT         NOT NULL,
  cedula          TEXT         NOT NULL UNIQUE,
  celular         TEXT,
  correo          TEXT         NOT NULL,
  planilla        TEXT,
  pocicion        TEXT,
  escuela         TEXT,
  siace           TEXT,
  region          TEXT         NOT NULL,
  distrito        TEXT,
  sede            TEXT,
  capacitador     TEXT,
  fecha_registro  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 2. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_part_region      ON participantes(region);
CREATE INDEX IF NOT EXISTS idx_part_capacitador ON participantes(capacitador);
CREATE INDEX IF NOT EXISTS idx_part_escuela     ON participantes(escuela);
CREATE INDEX IF NOT EXISTS idx_part_cedula      ON participantes(cedula);
CREATE INDEX IF NOT EXISTS idx_part_fecha       ON participantes(fecha_registro DESC);

-- 3. Row Level Security (la app usa service_role desde el servidor)
ALTER TABLE participantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "solo_service_role" ON participantes
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Metadatos
COMMENT ON TABLE  participantes              IS 'Participantes - Sistema Entre Pares MEDUCA Panamá';
COMMENT ON COLUMN participantes.cedula       IS 'Cédula de identidad panameña (único)';
COMMENT ON COLUMN participantes.pocicion     IS 'Posición o cargo del participante';
COMMENT ON COLUMN participantes.siace        IS 'Código SIACE del centro educativo';
COMMENT ON COLUMN participantes.sede         IS 'Sede donde se realiza la capacitación';
COMMENT ON COLUMN participantes.fecha_registro IS 'Fecha y hora de registro (UTC)';

-- 5. Vista de resumen por región (opcional, útil para reportes)
CREATE OR REPLACE VIEW resumen_por_region AS
SELECT
  region,
  COUNT(*)                                         AS total,
  COUNT(DISTINCT escuela)                          AS escuelas,
  COUNT(DISTINCT capacitador)                      AS capacitadores,
  MIN(fecha_registro)::DATE                        AS primera_fecha,
  MAX(fecha_registro)::DATE                        AS ultima_fecha
FROM participantes
GROUP BY region
ORDER BY total DESC;

-- ✅ Script completado. Verifica en Table Editor → participantes
