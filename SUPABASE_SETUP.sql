-- CONFIGURACION DE BASE DE DATOS PARA EVECA
-- -----------------------------------------------------------
-- 1. CREAR TABLA DE AUDITORIA
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES auth.users(id),
  accion TEXT NOT NULL,
  tabla TEXT NOT NULL,
  registro_id TEXT,
  detalles JSONB,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 2. CREAR TABLA DE CONSECUTIVOS
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS consecutivos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proceso_id UUID REFERENCES procesos(id),
  tipo_id UUID REFERENCES tipos_documento(id),
  ultimo_numero INTEGER DEFAULT 0,
  ultimo_codigo TEXT,
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(proceso_id, tipo_id)
);

-- -----------------------------------------------------------
-- 3. SEGURIDAD (RLS)
-- -----------------------------------------------------------
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE consecutivos ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- 4. POLITICAS PARA AUDITORIA
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Permitir inserción a autenticados" ON auditoria;
CREATE POLICY "Permitir inserción a autenticados" ON auditoria 
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Ver logs solo administradores" ON auditoria;
CREATE POLICY "Ver logs solo administradores" ON auditoria 
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM perfiles
    WHERE id = auth.uid() AND (rol = 'superadmin' OR rol = 'administrador')
  )
);

-- -----------------------------------------------------------
-- 5. POLITICAS PARA CONSECUTIVOS
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Ver consecutivos" ON consecutivos;
CREATE POLICY "Ver consecutivos" ON consecutivos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Control total de consecutivos para administradores" ON consecutivos;
CREATE POLICY "Control total de consecutivos para administradores" 
ON consecutivos FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM perfiles 
    WHERE id = auth.uid() AND (rol = 'superadmin' OR rol = 'administrador')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM perfiles 
    WHERE id = auth.uid() AND (rol = 'superadmin' OR rol = 'administrador')
  )
);

-- -----------------------------------------------------------
-- 6. REGLA DE SUPERADMIN MAESTRO
-- -----------------------------------------------------------
-- Asegurar que el perfil existe con el rol correcto (UPSERT)
INSERT INTO perfiles (id, email, nombre_completo, rol, estado)
SELECT id, email, 'Administrador Maestro', 'superadmin', 'activo'
FROM auth.users 
WHERE email = 'jefaturasostenibilidad@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET rol = 'superadmin', estado = 'activo';

-- Asegurar permisos de borrado total para Superadmin
DROP POLICY IF EXISTS "Control total de consecutivos para administradores" ON consecutivos;
CREATE POLICY "Control total de consecutivos para administradores" 
ON consecutivos FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM perfiles 
    WHERE id = auth.uid() AND (rol = 'superadmin' OR rol = 'administrador')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM perfiles 
    WHERE id = auth.uid() AND (rol = 'superadmin' OR rol = 'administrador')
  )
);
