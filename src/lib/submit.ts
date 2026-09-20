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

export type SubmitResult =
  | { status: 'ok' }
  | { status: 'duplicate' }
  | { status: 'error'; message: string };

export async function submitChallenge(params: SubmitParams): Promise<SubmitResult> {
  const path = `${params.grupo}/${params.challengeId}/${params.guestId}-${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(path, params.photoBlob, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) {
    // TODO(debug temporal): mostramos el detalle técnico para diagnosticar el
    // deploy inicial. Sacar esto una vez confirmado que las subidas funcionan.
    return {
      status: 'error',
      message: `No pudimos subir la foto. Detalle: ${uploadError.message}`,
    };
  }

  const { error: insertError } = await supabase.from('submissions').insert({
    guest_id: params.guestId,
    guest_name: params.guestName,
    grupo: params.grupo,
    challenge_id: params.challengeId,
    challenge_title: params.challengeTitle,
    photo_path: path,
  });

  if (insertError) {
    // 23505 = violación de la restricción única (guest_id, challenge_id): ya estaba completado.
    if (insertError.code === '23505') {
      return { status: 'duplicate' };
    }
    // La foto ya se subió pero no se pudo registrar la misión: limpiamos el archivo huérfano.
    void supabase.storage.from('photos').remove([path]);
    return {
      status: 'error',
      message: 'La foto se subió pero no pudimos registrar tu misión. Intentá de nuevo.',
    };
  }

  return { status: 'ok' };
}
