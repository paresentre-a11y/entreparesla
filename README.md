# 🎓 Sistema de Capacitación Entre Pares — MEDUCA Panamá

Aplicación web full-stack para registro y gestión de participantes de capacitación.  
**Stack:** HTML/CSS/JS · Netlify Functions (Node.js) · Supabase (PostgreSQL)

---

## 📁 Estructura del proyecto

```
entrepares/
├── public/
│   └── index.html              ← Frontend completo (SPA)
├── netlify/
│   └── functions/
│       ├── _lib.js             ← Utilidades compartidas (Supabase, tokens, CORS)
│       ├── login.js            ← POST /api/login  — autenticación admin
│       ├── guardar.js          ← POST /api/guardar — guardar participante
│       └── listar.js           ← GET  /api/listar  — listar participantes (protegido)
├── netlify.toml                ← Config Netlify + cabeceras de seguridad
├── package.json                ← Dependencias Node.js
├── .env.example                ← Plantilla de variables de entorno
├── .gitignore                  ← Archivos a excluir de Git
└── README.md                   ← Este archivo
```

---

## 🗄️ PASO 1 — Crear la base de datos en Supabase

### 1.1 Crear cuenta y proyecto
1. Ve a [supabase.com](https://supabase.com) → **Start for free**
2. Crea un nuevo proyecto (anota la contraseña del proyecto)
3. Espera ~2 minutos mientras se inicializa

### 1.2 Crear la tabla `participantes`
En tu proyecto Supabase → **SQL Editor** → **New query** → pega y ejecuta:

```sql
-- Tabla principal de participantes
CREATE TABLE IF NOT EXISTS participantes (
  id              BIGSERIAL PRIMARY KEY,
  nombre          TEXT        NOT NULL,
  apellido        TEXT        NOT NULL,
  cedula          TEXT        NOT NULL UNIQUE,
  celular         TEXT,
  correo          TEXT        NOT NULL,
  planilla        TEXT,
  pocicion        TEXT,
  escuela         TEXT,
  siace           TEXT,
  region          TEXT        NOT NULL,
  distrito        TEXT,
  sede            TEXT,
  capacitador     TEXT,
  fecha_registro  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_participantes_region      ON participantes(region);
CREATE INDEX IF NOT EXISTS idx_participantes_capacitador ON participantes(capacitador);
CREATE INDEX IF NOT EXISTS idx_participantes_escuela     ON participantes(escuela);
CREATE INDEX IF NOT EXISTS idx_participantes_cedula      ON participantes(cedula);
CREATE INDEX IF NOT EXISTS idx_participantes_fecha       ON participantes(fecha_registro DESC);

-- Row Level Security (RLS) — solo el service_key puede leer/escribir
ALTER TABLE participantes ENABLE ROW LEVEL SECURITY;

-- Política: solo acceso autenticado con service_key (desde las Functions)
CREATE POLICY "service_only" ON participantes
  USING (auth.role() = 'service_role');

-- Comentario de tabla
COMMENT ON TABLE participantes IS 'Registro de participantes - Sistema Entre Pares MEDUCA';
```

### 1.3 Obtener las credenciales
En Supabase → **Project Settings** → **API**:
- `Project URL` → será tu `SUPABASE_URL`
- `service_role` (secret) → será tu `SUPABASE_SERVICE_KEY`

> ⚠️ **Usa `service_role`, NO `anon`**. La service key tiene acceso completo y debe
> mantenerse SOLO en el servidor (Netlify Functions). Nunca en el frontend.

---

## 🚀 PASO 2 — Desplegar en Netlify

### Opción A: Arrastrar y soltar (más rápida)
1. Ve a [app.netlify.com](https://app.netlify.com) → **Add new site** → **Deploy manually**
2. Arrastra **toda la carpeta `entrepares/`** al área de deploy
3. Tu sitio queda publicado al instante

### Opción B: Conectar con GitHub (recomendada para producción)
```bash
# En la carpeta del proyecto
git init
git add .
git commit -m "feat: sistema entre pares v1.0"

# Crea un repo en github.com, luego:
git remote add origin https://github.com/TU_USUARIO/entrepares.git
git push -u origin main
```
Luego en Netlify → **Add new site** → **Import from Git** → selecciona tu repo.

---

## 🔐 PASO 3 — Configurar variables de entorno en Netlify

**Netlify Dashboard** → Tu sitio → **Site configuration** → **Environment variables** → **Add variable**

| Variable              | Valor                                    | Descripción                        |
|-----------------------|------------------------------------------|------------------------------------|
| `SUPABASE_URL`        | `https://xxxx.supabase.co`              | URL de tu proyecto Supabase        |
| `SUPABASE_SERVICE_KEY`| `eyJhbGci...`                           | Service Role Key de Supabase       |
| `JWT_SECRET`          | (cadena aleatoria de 32+ chars)          | Para firmar tokens de sesión admin |
| `ADMIN_PASSWORD`      | `EntrePares26*`                          | Contraseña del panel admin         |

**Generar JWT_SECRET seguro:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Después de agregar las variables → **Trigger deploy** para que tomen efecto.

---

## 🔧 PASO 4 — Desarrollo local

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env
# Editar .env con tus valores reales

# Instalar Netlify CLI globalmente (si no lo tienes)
npm install -g netlify-cli

# Iniciar servidor de desarrollo
netlify dev
```
La app correrá en `http://localhost:8888`

---

## 🛡️ Modelo de seguridad

```
Usuario público            Admin
     │                       │
     ▼                       ▼
[Formulario]          [Botón Participantes]
     │                       │
     │              [Modal contraseña]
     │                       │
     ▼              POST /api/login
POST /api/guardar            │
     │              Verifica contra ADMIN_PASSWORD (env var)
Validación servidor          │
Sanitización input   Token HMAC-SHA256 firmado (8h)
     │                       │
     ▼                       ▼
[Supabase DB]       GET /api/listar  ← Requiere Bearer token
                             │
                    Verifica firma y expiración
                             │
                    [Supabase DB]
```

### Medidas implementadas
- ✅ Contraseña admin **solo en variable de entorno** del servidor
- ✅ Token firmado con **HMAC-SHA256** + expiración 8 horas
- ✅ Comparación de passwords en **tiempo constante** (anti timing-attack)
- ✅ **Rate limiting** en login: 5 intentos / 15 minutos por IP
- ✅ Validación y **sanitización** de todos los campos en servidor
- ✅ Protección contra **cédulas duplicadas** (unique constraint en DB)
- ✅ **Row Level Security** (RLS) en Supabase
- ✅ **Headers HTTP de seguridad** (HSTS, CSP, X-Frame-Options, etc.)
- ✅ Variables sensibles **nunca expuestas** al frontend
- ✅ HTTPS obligatorio (Netlify lo provee gratis)

---

## ❓ Preguntas frecuentes

**¿Funciona también en Cloudflare Pages?**  
Sí, pero las Functions deben adaptarse al formato de Cloudflare Workers.  
La lógica de negocio es idéntica; solo cambia el wrapper del handler.

**¿Cuánto cuesta?**  
- Netlify Free: 100GB bandwidth/mes, 125k invocaciones de Functions/mes ✅  
- Supabase Free: 500MB DB, 5GB bandwidth/mes ✅  
Total: **$0/mes** para uso educativo normal.

**¿Cómo cambiar la contraseña admin?**  
Ve a Netlify → Environment Variables → cambia `ADMIN_PASSWORD` → redeploy.  
No necesitas tocar el código.

**¿Cómo hacer backup de la base de datos?**  
En Supabase → **Database** → **Backups** (plan gratuito incluye backup diario).  
O exporta manualmente desde el panel de administración de la app (CSV/Excel).

---

## 👥 Créditos

| Rol       | Persona                  |
|-----------|--------------------------|
| Desarrollo | **Jorge Polanco**       |
| Diseño     | **Rudy Polanco Rodríguez** |

🌐 [jorgepolancorodriguez.pages.dev](https://jorgepolancorodriguez.pages.dev/)

---

*Sistema de Capacitación Entre Pares — Ministerio de Educación de Panamá*
