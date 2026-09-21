import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Esta función corre en el servidor de Netlify. La service role key vive
// solo acá, como variable de entorno del sitio en Netlify. Nunca se manda
// al navegador, así que nunca queda expuesta en el frontend.
export const handler: Handler = async (event) => {
  const password = event.headers['x-admin-password'] ?? event.queryStringParameters?.password;

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password !== expected) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'No autorizado' }),
    };
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

  const { data, error } = await supabase
    .from('submissions')
    .select('id, guest_name, grupo, challenge_id, challenge_title, photo_path, completed_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }

  const withUrls = (data ?? []).map((row) => ({
    ...row,
    photo_url: supabase.storage.from('photos').getPublicUrl(row.photo_path).data.publicUrl,
  }));

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(withUrls),
  };
};
