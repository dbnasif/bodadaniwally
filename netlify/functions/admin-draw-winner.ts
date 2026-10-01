import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { randomInt } from 'crypto';

// Sortea un ganador único entre quienes están empatados en el puntaje más
// alto del ranking. Cada corrida queda registrada en winner_draws (quiénes
// competían, con cuántos puntos, quién salió) — así, si hay que repetirlo
// porque falló, queda trazabilidad de que fue por eso.
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  const password = event.headers['x-admin-password'];
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'No autorizado' }) };
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

  const { data: ranking, error } = await supabase.from('ranking').select('guest_id, guest_name, points');

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
  if (!ranking || ranking.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Todavía no hay nadie en el ranking.' }) };
  }

  const maxPoints = Math.max(...ranking.map((r) => r.points));
  const candidates = ranking.filter((r) => r.points === maxPoints);
  const winner = candidates[randomInt(candidates.length)];

  const { error: logError } = await supabase.from('winner_draws').insert({
    max_points: maxPoints,
    candidates,
    winner_guest_id: winner.guest_id,
    winner_name: winner.guest_name,
  });

  if (logError) {
    return { statusCode: 500, body: JSON.stringify({ error: logError.message }) };
  }

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ maxPoints, candidates, winner }),
  };
};
