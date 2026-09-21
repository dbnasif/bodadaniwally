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

  const row = {
    guest_id: params.guestId,
    guest_name: params.guestName,
    grupo: params.grupo,
    challenge_id: params.challengeId,
    challenge_title: params.challengeTitle,
    photo_path: path,
  };

  // Probamos INSERT primero (primera vez que completa este desafío). Si la
  // fila ya existe, hacemos un UPDATE aparte en vez de usar upsert/ON
  // CONFLICT: evitamos así los casos límite de RLS + ON CONFLICT DO UPDATE
  // de Postgres, y dejamos cada operación con una sola policy involucrada.
  const { error: insertError } = await supabase.from('submissions').insert(row);

  if (insertError && insertError.code === '23505') {
    const { error: updateError } = await supabase
      .from('submissions')
      .update(row)
      .eq('guest_id', params.guestId)
      .eq('challenge_id', params.challengeId);

    if (updateError) {
      void supabase.storage.from('photos').remove([path]);
      // TODO(debug temporal): detalle técnico. Sacar una vez confirmado.
      return {
        status: 'error',
        message: `No pudimos actualizar tu misión. Detalle: [${updateError.code}] ${updateError.message} | hint: ${updateError.hint ?? '-'}`,
      };
    }
    return { status: 'ok' };
  }

  if (insertError) {
    void supabase.storage.from('photos').remove([path]);
    // TODO(debug temporal): detalle técnico. Sacar una vez confirmado.
    return {
      status: 'error',
      message: `No pudimos registrar tu misión. Detalle: [${insertError.code}] ${insertError.message} | hint: ${insertError.hint ?? '-'}`,
    };
  }

  return { status: 'ok' };
}
