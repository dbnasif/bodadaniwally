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

  const [submissionsRes, nightPhotoRes, profilesRes, historyRes, drawsRes] = await Promise.all([
    supabase
      .from('submissions')
      .select('id, guest_id, guest_name, grupo, challenge_id, challenge_title, photo_path, completed_at, updated_at, deleted_at')
      .order('updated_at', { ascending: false }),
    supabase
      .from('night_photo')
      .select('id, guest_id, guest_name, grupo, photo_path, updated_at, deleted_at')
      .order('updated_at', { ascending: false }),
    supabase
      .from('guest_profile')
      .select('guest_id, first_name, last_name, email, created_at, updated_at'),
    supabase
      .from('guest_profile_history')
      .select('guest_id, old_first_name, old_last_name, new_first_name, new_last_name, changed_at')
      .order('changed_at', { ascending: false }),
    supabase
      .from('winner_draws')
      .select('id, drawn_at, max_points, candidates, winner_guest_id, winner_name')
      .order('drawn_at', { ascending: false }),
  ]);

  if (submissionsRes.error) {
    return { statusCode: 500, body: JSON.stringify({ error: submissionsRes.error.message }) };
  }
  if (nightPhotoRes.error) {
    return { statusCode: 500, body: JSON.stringify({ error: nightPhotoRes.error.message }) };
  }
  if (profilesRes.error) {
    return { statusCode: 500, body: JSON.stringify({ error: profilesRes.error.message }) };
  }
  if (historyRes.error) {
    return { statusCode: 500, body: JSON.stringify({ error: historyRes.error.message }) };
  }
  if (drawsRes.error) {
    return { statusCode: 500, body: JSON.stringify({ error: drawsRes.error.message }) };
  }

  const withUrl = (row: { photo_path: string }) => ({
    ...row,
    photo_url: supabase.storage.from('photos').getPublicUrl(row.photo_path).data.publicUrl,
  });

  const submissions = submissionsRes.data ?? [];
  const nightPhotos = nightPhotoRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const history = historyRes.data ?? [];

  // Grupo no se guarda en guest_profile (es un dato del dispositivo, no del
  // perfil) — lo inferimos de la primera fila que tengamos de esa persona.
  const grupoByGuest = new Map<string, string>();
  const challengeCountByGuest = new Map<string, number>();
  const nightPhotoByGuest = new Set<string>();
  for (const s of submissions) {
    if (!grupoByGuest.has(s.guest_id)) grupoByGuest.set(s.guest_id, s.grupo);
    // Las eliminadas no cuentan como desafío completado.
    if (!s.deleted_at) {
      challengeCountByGuest.set(s.guest_id, (challengeCountByGuest.get(s.guest_id) ?? 0) + 1);
    }
  }
  for (const n of nightPhotos) {
    if (!grupoByGuest.has(n.guest_id)) grupoByGuest.set(n.guest_id, n.grupo);
    if (!n.deleted_at) nightPhotoByGuest.add(n.guest_id);
  }

  const historyCountByGuest = new Map<string, number>();
  for (const h of history) {
    historyCountByGuest.set(h.guest_id, (historyCountByGuest.get(h.guest_id) ?? 0) + 1);
  }

  const participants = profiles
    .map((p) => ({
      guest_id: p.guest_id,
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email,
      grupo: grupoByGuest.get(p.guest_id) ?? null,
      challenges_count: challengeCountByGuest.get(p.guest_id) ?? 0,
      night_photo: nightPhotoByGuest.has(p.guest_id),
      name_changes: historyCountByGuest.get(p.guest_id) ?? 0,
      registered_at: p.created_at,
      updated_at: p.updated_at,
    }))
    .sort((a, b) => (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name, 'es'));

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      submissions: submissions.map(withUrl),
      nightPhotos: nightPhotos.map(withUrl),
      participants,
      nameChangeHistory: history,
      winnerDraws: drawsRes.data ?? [],
    }),
  };
};
