import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Reset total: a diferencia de admin-reset-ranking (que solo borra
// submissions), esto borra TODO lo que dejó la gente probando la app antes
// del casamiento — submissions, night_photo, guest_profile,
// guest_profile_history y winner_draws — para arrancar de cero con los
// invitados reales. Guarda un backup completo en ranking_backups antes de
// borrar nada. No toca las fotos ya subidas al bucket de Storage (quedan
// huérfanas, no hace falta borrarlas).
//
// Mismas tres capas de protección que admin-reset-ranking: contraseña de
// /admin + email de una lista permitida + código.
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  const password = event.headers['x-admin-password'];
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword || password !== expectedPassword) {
    return { statusCode: 401, body: JSON.stringify({ error: 'No autorizado' }) };
  }

  let email = '';
  let code = '';
  try {
    const body = JSON.parse(event.body || '{}');
    email = String(body.email || '')
      .trim()
      .toLowerCase();
    code = String(body.code || '').trim();
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Body inválido' }) };
  }

  const allowedEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const expectedCode = process.env.ADMIN_RESET_CODE;

  if (!allowedEmails.length || !expectedCode) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Faltan configurar ADMIN_EMAILS / ADMIN_RESET_CODE en Netlify.' }),
    };
  }

  if (!allowedEmails.includes(email) || code !== expectedCode) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Email o código incorrectos.' }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Faltan variables de entorno de Supabase en Netlify.' }),
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const [submissionsRes, nightPhotoRes, profilesRes, historyRes, drawsRes] = await Promise.all([
    supabase.from('submissions').select('*'),
    supabase.from('night_photo').select('*'),
    supabase.from('guest_profile').select('*'),
    supabase.from('guest_profile_history').select('*'),
    supabase.from('winner_draws').select('*'),
  ]);

  const firstError =
    submissionsRes.error ?? nightPhotoRes.error ?? profilesRes.error ?? historyRes.error ?? drawsRes.error;
  if (firstError) {
    return { statusCode: 500, body: JSON.stringify({ error: firstError.message }) };
  }

  const { error: backupError } = await supabase.from('ranking_backups').insert({
    created_by: email,
    data: {
      kind: 'full_reset',
      submissions: submissionsRes.data,
      night_photo: nightPhotoRes.data,
      guest_profile: profilesRes.data,
      guest_profile_history: historyRes.data,
      winner_draws: drawsRes.data,
    },
  });

  if (backupError) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `No se pudo guardar el backup, no se borró nada: ${backupError.message}` }),
    };
  }

  const tables = ['submissions', 'night_photo', 'guest_profile', 'guest_profile_history', 'winner_draws'] as const;
  for (const table of tables) {
    const { error: deleteError } = await supabase.from(table).delete().not('id', 'is', null);
    if (deleteError) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: `El backup se guardó bien, pero falló el borrado de "${table}": ${deleteError.message}. Las tablas anteriores a esta en la lista ya quedaron vacías.`,
        }),
      };
    }
  }

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      backedUp: {
        submissions: submissionsRes.data?.length ?? 0,
        nightPhotos: nightPhotoRes.data?.length ?? 0,
        participants: profilesRes.data?.length ?? 0,
        nameChanges: historyRes.data?.length ?? 0,
        winnerDraws: drawsRes.data?.length ?? 0,
      },
    }),
  };
};
