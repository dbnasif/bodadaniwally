import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Resetea el ranking (borra "submissions", que es lo único que cuenta
// puntos) DESPUÉS de guardar un backup completo de submissions +
// night_photo + guest_profile en la tabla ranking_backups.
//
// No toca night_photo ni guest_profile: "resetear el ranking" es
// específicamente sobre los puntos/desafíos, no sobre la Foto de la Noche
// ni los datos de identificación de los invitados.
//
// Protegido con tres capas: la contraseña de /admin (igual que admin-data),
// más un email de una lista permitida, más un código — pensado para que
// esto no se dispare por accidente ni con solo la contraseña de admin.
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

  const [submissionsRes, nightPhotoRes, profilesRes] = await Promise.all([
    supabase.from('submissions').select('*'),
    supabase.from('night_photo').select('*'),
    supabase.from('guest_profile').select('*'),
  ]);

  if (submissionsRes.error || nightPhotoRes.error || profilesRes.error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          submissionsRes.error?.message ?? nightPhotoRes.error?.message ?? profilesRes.error?.message,
      }),
    };
  }

  const { error: backupError } = await supabase.from('ranking_backups').insert({
    created_by: email,
    data: {
      submissions: submissionsRes.data,
      night_photo: nightPhotoRes.data,
      guest_profile: profilesRes.data,
    },
  });

  if (backupError) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `No se pudo guardar el backup, no se borró nada: ${backupError.message}` }),
    };
  }

  const { error: deleteError } = await supabase.from('submissions').delete().not('id', 'is', null);

  if (deleteError) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: `El backup se guardó bien, pero falló el borrado: ${deleteError.message}`,
      }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      backedUpSubmissions: submissionsRes.data?.length ?? 0,
    }),
  };
};
