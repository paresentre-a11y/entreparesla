/**
 * POST /api/login
 * Verifica la contraseña administrativa contra la variable de entorno.
 * Si es correcta, devuelve un token HMAC firmado (8 h de validez).
 * La contraseña NUNCA se almacena en el frontend.
 */

'use strict';

const crypto = require('crypto');
const { ok, err, preflight, crearToken } = require('./_lib');

// Límite simple en memoria (reinicia con cada instancia fría)
const intentos = new Map(); // ip → { count, resetAt }
const MAX_INTENTOS = 5;
const VENTANA_MS   = 15 * 60 * 1000; // 15 min

function limiteAlcanzado(ip) {
  const ahora = Date.now();
  const rec   = intentos.get(ip) || { count: 0, resetAt: ahora + VENTANA_MS };
  if (ahora > rec.resetAt) { intentos.delete(ip); return false; }
  return rec.count >= MAX_INTENTOS;
}

function registrarIntento(ip) {
  const ahora = Date.now();
  const rec   = intentos.get(ip) || { count: 0, resetAt: ahora + VENTANA_MS };
  if (ahora > rec.resetAt) { intentos.set(ip, { count: 1, resetAt: ahora + VENTANA_MS }); return; }
  rec.count++;
  intentos.set(ip, rec);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST')    return err('Método no permitido.', 405);

  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

  if (limiteAlcanzado(ip))
    return err('Demasiados intentos fallidos. Espere 15 minutos.', 429);

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return err('Cuerpo inválido.', 400); }

  const { password } = body;
  if (!password) return err('Contraseña requerida.', 400);

  const adminPwd = process.env.ADMIN_PASSWORD;
  if (!adminPwd) return err('Servidor mal configurado.', 500);

  // Comparación en tiempo constante para evitar timing attacks
  const pwdBuf    = Buffer.from(password);
  const adminBuf  = Buffer.from(adminPwd);
  const iguales   =
    pwdBuf.length === adminBuf.length &&
    crypto.timingSafeEqual(pwdBuf, adminBuf);

  if (!iguales) {
    registrarIntento(ip);
    return err('Contraseña incorrecta.', 401);
  }

  // Contraseña correcta → generar token
  try {
    const token = crearToken();
    return ok({ token, expiraEn: 8 * 3600 });
  } catch (e) {
    return err('Error al generar token: ' + e.message, 500);
  }
};
