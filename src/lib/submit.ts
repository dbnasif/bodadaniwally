import { supabase } from '../supabaseClient';
import type { Grupo } from '../config/challenges';

export type SubmitResult = { status: 'ok' } | { status: 'error'; message: string };

/**
 * Convierte el nombre del invitado en algo seguro para usar como nombre de
 * archivo: sin acentos, sin espacios, sin caracteres raros.
 */
function slugify(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
  return slug || 'invitado';
}

function timestampSlug(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours()
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

async function uploadToStorage(path: string, blob: Blob): Promise<string | null> {
  const { error } = await supabase.storage
    .from('photos')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  return error ? 'No pudimos subir la foto. Revisá tu conexión e intentá de nuevo.' : null;
}

/**
 * Probamos INSERT primero. Si la fila ya existe (23505), hacemos un UPDATE
 * aparte en vez de usar upsert/ON CONFLICT: evitamos así los casos límite de
 * RLS + ON CONFLICT DO UPDATE de Postgres, y cada operación ejercita una
 * sola policy. Reutilizado tanto por los desafíos normales como por la
 * Foto de la Noche.
 */
async function insertOrUpdate(
  table: 'submissions' | 'night_photo',
  row: Record<string, unknown>,
  matchColumns: Record<string, unknown>
): Promise<string | null> {
  const { error: insertError } = await supabase.from(table).insert(row);
  if (!insertError) return null;

  if (insertError.code !== '23505') {
    return 'No pudimos registrar tu misión. Intentá de nuevo.';
  }

  let query = supabase.from(table).update(row);
  for (const [column, value] of Object.entries(matchColumns)) {
    query = query.eq(column, value as string);
  }
  const { error: updateError } = await query;
  return updateError ? 'No pudimos actualizar tu misión. Intentá de nuevo.' : null;
}

// ---------------------------------------------------------------------
// Desafíos normales (grupo A-E)
// ---------------------------------------------------------------------

export interface SubmitChallengeParams {
  guestId: string;
  guestName: string;
  grupo: Grupo;
  challengeId: string;
  challengeTitle: string;
  photoBlob: Blob;
}

/**
 * name_challenge_fecha-hora_id-corto.jpg — legible para revisar el bucket
 * a mano. El id corto al final evita que dos invitados con el mismo nombre
 * (frecuente) se pisen el archivo entre sí en el mismo desafío.
 */
function buildChallengePhotoPath(params: SubmitChallengeParams): string {
  const namePart = slugify(params.guestName);
  const uniquePart = params.guestId.slice(0, 8);
  const fileName = `${namePart}_${params.challengeId}_${timestampSlug(new Date())}_${uniquePart}.jpg`;
  return `${params.grupo}/${params.challengeId}/${fileName}`;
}

export async function submitChallenge(params: SubmitChallengeParams): Promise<SubmitResult> {
  const path = buildChallengePhotoPath(params);

  const uploadError = await uploadToStorage(path, params.photoBlob);
  if (uploadError) return { status: 'error', message: uploadError };

  const row = {
    guest_id: params.guestId,
    guest_name: params.guestName,
    grupo: params.grupo,
    challenge_id: params.challengeId,
    challenge_title: params.challengeTitle,
    photo_path: path,
  };

  const writeError = await insertOrUpdate('submissions', row, {
    guest_id: params.guestId,
    challenge_id: params.challengeId,
  });

  if (writeError) {
    void supabase.storage.from('photos').remove([path]);
    return { status: 'error', message: writeError };
  }

  return { status: 'ok' };
}

// ---------------------------------------------------------------------
// "La Foto de la Noche" — competencia paralela, fuera del ranking normal.
// Guardada en su propia tabla (night_photo), nunca toca "submissions".
// ---------------------------------------------------------------------

export interface SubmitNightPhotoParams {
  guestId: string;
  guestName: string;
  grupo: Grupo;
  photoBlob: Blob;
}

function buildNightPhotoPath(params: SubmitNightPhotoParams): string {
  const namePart = slugify(params.guestName);
  const uniquePart = params.guestId.slice(0, 8);
  const fileName = `${namePart}_${timestampSlug(new Date())}_${uniquePart}.jpg`;
  return `foto-de-la-noche/${fileName}`;
}

export async function submitNightPhoto(params: SubmitNightPhotoParams): Promise<SubmitResult> {
  const path = buildNightPhotoPath(params);

  const uploadError = await uploadToStorage(path, params.photoBlob);
  if (uploadError) return { status: 'error', message: uploadError };

  const row = {
    guest_id: params.guestId,
    guest_name: params.guestName,
    grupo: params.grupo,
    photo_path: path,
  };

  const writeError = await insertOrUpdate('night_photo', row, { guest_id: params.guestId });

  if (writeError) {
    void supabase.storage.from('photos').remove([path]);
    return { status: 'error', message: writeError };
  }

  return { status: 'ok' };
}
