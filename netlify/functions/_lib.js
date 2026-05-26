/**
 * _lib.js — Utilidades compartidas para todas las funciones
 * No se expone como endpoint (prefijo _)
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');
const crypto           = require('crypto');

// ── Supabase client (singleton) ─────────────────────────────
let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase env vars no configuradas.');
  _supabase = createClient(url, key, {
    auth: { persistSession: false }
  });
  return _supabase;
}

// ── CORS headers ─────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin' : process.env.SITE_URL || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type'                : 'application/json',
  'Cache-Control'               : 'no-store',
};

// ── Respuestas estandarizadas ────────────────────────────────
function ok(data, status = 200) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(data) };
}
function err(msg, status = 400) {
  return { statusCode: status, headers: CORS, body: JSON.stringify({ error: msg }) };
}
function preflight() {
  return { statusCode: 204, headers: CORS, body: '' };
}

// ── Token HMAC-SHA256 (sin dependencias externas) ────────────
const TOKEN_TTL = 8 * 60 * 60 * 1000; // 8 horas en ms

function crearToken() {
  const secret  = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no configurado.');
  const payload = JSON.stringify({ iat: Date.now(), exp: Date.now() + TOKEN_TTL });
  const data64  = Buffer.from(payload).toString('base64url');
  const firma   = crypto.createHmac('sha256', secret).update(data64).digest('hex');
  return `${data64}.${firma}`;
}

function verificarToken(authHeader) {
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
    const token  = authHeader.slice(7);
    const [data64, firma] = token.split('.');
    if (!data64 || !firma) return false;

    const secret     = process.env.JWT_SECRET;
    const firmaEsper = crypto.createHmac('sha256', secret).update(data64).digest('hex');
    const ok         = crypto.timingSafeEqual(
      Buffer.from(firma,      'hex'),
      Buffer.from(firmaEsper, 'hex')
    );
    if (!ok) return false;

    const { exp } = JSON.parse(Buffer.from(data64, 'base64url').toString());
    return Date.now() < exp;
  } catch {
    return false;
  }
}

// ── Sanitizar string de entrada ──────────────────────────────
function sanitize(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().slice(0, 500);
}

module.exports = { getSupabase, ok, err, preflight, crearToken, verificarToken, sanitize };
