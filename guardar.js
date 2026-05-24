/**
 * POST /api/guardar
 * Guarda un nuevo participante en Supabase.
 * Endpoint público (el formulario de registro es abierto).
 * Validación completa en servidor.
 */

'use strict';

const { getSupabase, ok, err, preflight, sanitize } = require('./_lib');

// Campos requeridos mínimos
const REQUERIDOS = ['nombre', 'apellido', 'cedula', 'correo', 'region'];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST')    return err('Método no permitido.', 405);

  // ── Parsear body ──────────────────────────────────────────
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return err('JSON inválido.', 400); }

  // ── Validación de campos requeridos ──────────────────────
  for (const campo of REQUERIDOS) {
    if (!body[campo] || !String(body[campo]).trim()) {
      return err(`El campo "${campo}" es obligatorio.`, 422);
    }
  }

  // ── Validar formato de correo ─────────────────────────────
  const emailRE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRE.test(body.correo)) return err('Correo electrónico inválido.', 422);

  // ── Construir registro sanitizado ────────────────────────
  const registro = {
    nombre:      sanitize(body.nombre),
    apellido:    sanitize(body.apellido),
    cedula:      sanitize(body.cedula),
    celular:     sanitize(body.celular),
    correo:      sanitize(body.correo).toLowerCase(),
    planilla:    sanitize(body.planilla),
    pocicion:    sanitize(body.pocicion),
    escuela:     sanitize(body.escuela),
    siace:       sanitize(body.siace),
    region:      sanitize(body.region),
    distrito:    sanitize(body.distrito),
    sede:        sanitize(body.sede),
    capacitador: sanitize(body.capacitador),
  };

  // ── Guardar en Supabase ───────────────────────────────────
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('participantes')
      .insert(registro);

    if (error) {
      // Cédula duplicada (unique constraint)
      if (error.code === '23505')
        return err('Ya existe un registro con esa cédula.', 409);
      throw error;
    }

    return ok({ exito: true, mensaje: 'Registro guardado correctamente.' }, 201);
  } catch (e) {
    console.error('[guardar] Error Supabase:', e.message);
    return err('Error al guardar el registro.', 500);
  }
};
