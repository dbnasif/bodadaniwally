// Identidad y estado del invitado, todo en localStorage. Sin cuentas, sin login.
import { type Grupo, isGrupo } from '../config/challenges';

const GUEST_ID_KEY = 'boda_guest_id';
const LEGACY_GUEST_NAME_KEY = 'boda_guest_name'; // versión vieja: un solo campo de nombre
const FIRST_NAME_KEY = 'boda_guest_first_name';
const LAST_NAME_KEY = 'boda_guest_last_name';
const EMAIL_KEY = 'boda_guest_email';
const COMPLETED_KEY = 'boda_completed';
const COMPLETED_PHOTOS_KEY = 'boda_completed_photos';
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

export interface GuestProfile {
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Compatibilidad con invitados de la versión anterior, que solo tenían
 * guardado un nombre único: lo usamos como "nombre" y dejamos "apellido"
 * vacío, así el próximo paso les pide únicamente lo que falta.
 */
function migrateLegacyName() {
  if (localStorage.getItem(FIRST_NAME_KEY)) return;
  const legacyName = localStorage.getItem(LEGACY_GUEST_NAME_KEY);
  if (legacyName) {
    localStorage.setItem(FIRST_NAME_KEY, legacyName);
  }
}

export function getGuestProfile(): GuestProfile {
  migrateLegacyName();
  return {
    firstName: localStorage.getItem(FIRST_NAME_KEY) || '',
    lastName: localStorage.getItem(LAST_NAME_KEY) || '',
    email: localStorage.getItem(EMAIL_KEY) || '',
  };
}

export function setGuestProfile(profile: GuestProfile) {
  localStorage.setItem(FIRST_NAME_KEY, profile.firstName.trim());
  localStorage.setItem(LAST_NAME_KEY, profile.lastName.trim());
  localStorage.setItem(EMAIL_KEY, profile.email.trim());
  // Mantenemos la clave vieja sincronizada por si algo la sigue leyendo.
  localStorage.setItem(LEGACY_GUEST_NAME_KEY, profile.firstName.trim());
}

export function isProfileComplete(): boolean {
  const p = getGuestProfile();
  return !!p.firstName && !!p.lastName;
}

export function getFullName(): string {
  const p = getGuestProfile();
  return [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
}

export function getCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** challenge_id -> URL pública de la foto subida, para mostrar la miniatura. */
export function getCompletedPhotos(): Record<string, string> {
  try {
    const raw = localStorage.getItem(COMPLETED_PHOTOS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function markCompleted(challengeId: string, photoUrl?: string) {
  const set = getCompleted();
  set.add(challengeId);
  localStorage.setItem(COMPLETED_KEY, JSON.stringify([...set]));

  if (photoUrl) {
    const photos = getCompletedPhotos();
    photos[challengeId] = photoUrl;
    localStorage.setItem(COMPLETED_PHOTOS_KEY, JSON.stringify(photos));
  }
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
