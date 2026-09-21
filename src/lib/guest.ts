// Identidad y estado del invitado, todo en localStorage. Sin cuentas, sin login.
import { type Grupo, isGrupo } from '../config/challenges';

const GUEST_ID_KEY = 'boda_guest_id';
const GUEST_NAME_KEY = 'boda_guest_name';
const COMPLETED_KEY = 'boda_completed';
const GRUPO_KEY = 'boda_grupo';
const NIGHT_PHOTO_KEY = 'boda_night_photo_done';

export function getGuestId(): string {
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function getGuestName(): string | null {
  return localStorage.getItem(GUEST_NAME_KEY);
}

export function setGuestName(name: string) {
  localStorage.setItem(GUEST_NAME_KEY, name.trim());
}

export function getCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markCompleted(challengeId: string) {
  const set = getCompleted();
  set.add(challengeId);
  localStorage.setItem(COMPLETED_KEY, JSON.stringify([...set]));
}

// "La Foto de la Noche" es independiente de los 5 desafíos: no vive en el
// mismo Set de `getCompleted()` porque no debe contarse como un desafío más.
export function isNightPhotoDone(): boolean {
  return localStorage.getItem(NIGHT_PHOTO_KEY) === '1';
}

export function markNightPhotoDone() {
  localStorage.setItem(NIGHT_PHOTO_KEY, '1');
}

/**
 * El grupo llega por ?grupo=A en la URL del QR. Se persiste en localStorage
 * para que la página siga funcionando si el invitado vuelve a entrar sin el query param.
 */
export function resolveGrupo(): Grupo | null {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('grupo')?.toUpperCase();
  if (isGrupo(fromUrl)) {
    localStorage.setItem(GRUPO_KEY, fromUrl);
    return fromUrl;
  }
  const stored = localStorage.getItem(GRUPO_KEY);
  if (isGrupo(stored)) return stored;
  return null;
}
