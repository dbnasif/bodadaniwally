import { supabase } from '../supabaseClient';
import type { Grupo } from '../config/challenges';

export interface SubmitParams {
  guestId: string;
  guestName: string;
  grupo: Grupo;
  challengeId: string;
  challengeTitle: string;
  photoBlob: Blob;
}

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

/**
 * name_challenge_fecha-hora_id-corto.jpg — legible para revisar el bucket
 * a mano. El id corto al final evita que dos invitados con el mismo nombre
 * (frecuente) se pisen el archivo entre sí en el mismo desafío.
 */
function buildPhotoPath(params: SubmitParams): string {
  const namePart = slugify(params.guestName);
  const uniquePart = params.guestId.slice(0, 8);
  const fileName = `${namePart}_${params.challengeId}_${timestampSlug(new Date())}_${uniquePart}.jpg`;
  return `${params.grupo}/${params.challengeId}/${fileName}`;
}

export async function submitChallenge(params: SubmitParams): Promise<SubmitResult> {
  const path = buildPhotoPath(params);

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(path, params.photoBlob, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) {
    return {
      status: 'error',
      message: 'No pudimos subir la foto. Revisá tu conexión e intentá de nuevo.',
    };
  }

  // upsert: si (guest_id, challenge_id) ya existe, ACTUALIZA la fila en vez
  // de fallar — así una edición reemplaza la foto sin sumar un punto nuevo
  // (la fila sigue siendo una sola, el conteo de puntos no cambia).
  const { error: upsertError } = await supabase
    .from('submissions')
    .upsert(
      {
        guest_id: params.guestId,
        guest_name: params.guestName,
        grupo: params.grupo,
        challenge_id: params.challengeId,
        challenge_title: params.challengeTitle,
        photo_path: path,
      },
      { onConflict: 'guest_id,challenge_id' }
    );

  if (upsertError) {
    // La foto ya se subió pero no se pudo registrar la misión: limpiamos el archivo huérfano.
    void supabase.storage.from('photos').remove([path]);
    // TODO(debug temporal): detalle técnico para diagnosticar. Sacar una vez confirmado.
    return {
      status: 'error',
      message: `La foto se subió pero no pudimos registrar tu misión. Detalle: [${upsertError.code}] ${upsertError.message}`,
    };
  }

  return { status: 'ok' };
}
