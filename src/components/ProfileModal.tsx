import { useState } from 'react';
import type { Grupo } from '../config/challenges';
import { getGuestId, getGuestProfile, setGuestProfile } from '../lib/guest';
import { submitGuestProfile } from '../lib/submit';

interface Props {
  grupo: Grupo;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProfileModal({ grupo, onClose, onSaved }: Props) {
  const initial = getGuestProfile();
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [email, setEmail] = useState(initial.email);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst || !trimmedLast) return;

    setSaving(true);
    setError('');
    setSaved(false);

    setGuestProfile({ firstName: trimmedFirst, lastName: trimmedLast, email: email.trim() });
    const result = await submitGuestProfile({
      guestId: getGuestId(),
      firstName: trimmedFirst,
      lastName: trimmedLast,
      email: email.trim(),
    });

    setSaving(false);
    if (result.status === 'ok') {
      setSaved(true);
      onSaved();
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>

        <div className="modal-step">
          <h2>Mi perfil</h2>

          <label className="field-label" htmlFor="profile-first-name">
            Nombre
          </label>
          <input
            id="profile-first-name"
            type="text"
            inputMode="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={40}
          />

          <label className="field-label" htmlFor="profile-last-name">
            Apellido
          </label>
          <input
            id="profile-last-name"
            type="text"
            inputMode="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            maxLength={40}
          />

          <label className="field-label" htmlFor="profile-email">
            Email (opcional)
          </label>
          <input
            id="profile-email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={80}
          />
          <p className="muted field-hint">
            Dejanos tu mail si querés que después del casamiento te compartamos las fotos de los desafíos
            📸
          </p>

          <div className="profile-grupo">
            Grupo asignado: <strong>{grupo}</strong>
          </div>

          {error && <p className="error-text">{error}</p>}
          {saved && !error && <p className="profile-saved">Guardado ✓</p>}

          <button
            className="btn-primary"
            disabled={saving || !firstName.trim() || !lastName.trim()}
            onClick={handleSave}
          >
            {saving ? 'Guardando...' : 'GUARDAR'}
          </button>
        </div>
      </div>
    </div>
  );
}
