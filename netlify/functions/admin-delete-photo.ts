import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Borrado "suave": marca deleted_at (o lo limpia, para restaurar). Nunca
// borra la fila ni el archivo de Storage — solo la saca del ranking y de
// la vista pública. Los admins la siguen viendo en /admin.
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  const password = event.headers['x-admin-password'];
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'No autorizado' }) };
  }

  let table = '';
  let id = '';
  let action: 'delete' | 'restore' = 'delete';
  try {
    const body = JSON.parse(event.body || '{}');
    table = String(body.table || '');
    id = String(body.id || '');
    action = body.action === 'restore' ? 'restore' : 'delete';
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Body inválido' }) };
  }

  if (table !== 'submissions' && table !== 'night_photo') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Tabla inválida' }) };
  }
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Falta el id' }) };
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

  const { error } = await supabase
    .from(table)
    .update({ deleted_at: action === 'delete' ? new Date().toISOString() : null })
    .eq('id', id);

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
