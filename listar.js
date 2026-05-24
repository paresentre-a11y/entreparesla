/**
 * GET /api/listar
 * Devuelve todos los participantes.
 * PROTEGIDO: requiere Bearer token válido en Authorization header.
 * Soporta filtros por query params: region, capacitador, escuela, pocicion, q (búsqueda).
 */

'use strict';

const { getSupabase, ok, err, preflight, verificarToken } = require('./_lib');

const COLUMNAS = [
  'id','nombre','apellido','cedula','celular','correo',
  'planilla','pocicion','escuela','siace','region',
  'distrito','sede','capacitador','fecha_registro'
];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET')     return err('Método no permitido.', 405);

  // ── Verificar token ──────────────────────────────────────
  if (!verificarToken(event.headers['authorization']))
    return err('No autorizado. Inicie sesión nuevamente.', 401);

  // ── Leer filtros desde query string ─────────────────────
  const q = event.queryStringParameters || {};

  try {
    const supabase = getSupabase();
    let query = supabase
      .from('participantes')
      .select(COLUMNAS.join(','))
      .order('fecha_registro', { ascending: false })
      .limit(5000); // Límite de seguridad

    // Filtros exactos
    if (q.region)      query = query.ilike('region',      `%${q.region}%`);
    if (q.capacitador) query = query.ilike('capacitador', `%${q.capacitador}%`);
    if (q.escuela)     query = query.ilike('escuela',     `%${q.escuela}%`);
    if (q.pocicion)    query = query.ilike('pocicion',    `%${q.pocicion}%`);

    // Búsqueda general (nombre o cédula)
    if (q.q) {
      const busq = q.q.replace(/[%_]/g, '\\$&'); // escapar wildcards
      query = query.or(
        `nombre.ilike.%${busq}%,apellido.ilike.%${busq}%,cedula.ilike.%${busq}%`
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;

    // Formatear fechas para mostrar
    const registros = (data || []).map(r => ({
      ...r,
      fecha: r.fecha_registro
        ? new Date(r.fecha_registro).toLocaleString('es-PA')
        : ''
    }));

    return ok({ exito: true, datos: registros, total: registros.length });
  } catch (e) {
    console.error('[listar] Error:', e.message);
    return err('Error al obtener los registros.', 500);
  }
};
