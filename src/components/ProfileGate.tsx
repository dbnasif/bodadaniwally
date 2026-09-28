import { useState } from 'react';
import { getGuestId, getGuestProfile, setGuestProfile } from '../lib/guest';
import { submitGuestProfile } from '../lib/submit';

interface Props {
  onDone: () => void;
}

/**
 * Se muestra la primera vez que alguien escanea el QR, antes de ver sus
 * desafíos: pide nombre/apellido/email una sola vez, para toda la sesión.
 */
export default function ProfileGate({ onDone }: Props) {
  const initial = getGuestProfile();
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [email, setEmail] = useState(initial.email);

  function handleContinue() {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst || !trimmedLast) return;
    const trimmedEmail = email.trim();
    setGuestProfile({ firstName: trimmedFirst, lastName: trimmedLast, email: trimmedEmail });
    void submitGuestProfile({
      guestId: getGuestId(),
      firstName: trimmedFirst,
      lastName: trimmedLast,
      email: trimmedEmail,
    });
    onDone();
  }

  return (
    <div className="page">
      <div className="hero hero-card hero-card-bg">
        <h1 className="hero-title">Misión Fotográfica</h1>
        <p>¡Bienvenido/a! Contanos quién sos antes de arrancar.</p>

        <div className="modal-step">
          <label className="field-label" htmlFor="gate-first-name">
            Nombre
          </label>
          <input
            id="gate-first-name"
            autoFocus
            type="text"
            inputMode="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={40}
          />

          <label className="field-label" htmlFor="gate-last-name">
            Apellido
          </label>
          <input
            id="gate-last-name"
            type="text"
            inputMode="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
            maxLength={40}
          />

          <label className="field-label" htmlFor="gate-email">
            Email (opcional)
          </label>
          <input
            id="gate-email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={80}
          />
          <p className="muted field-hint">
            Dejanos tu mail si querés que después del casamiento te compartamos las fotos de los
            desafíos 📸
          </p>

          <button
            className="btn-primary"
            disabled={!firstName.trim() || !lastName.trim()}
            onClick={handleContinue}
          >
            COMENZAR
          </button>
        </div>
      </div>
    </div>
  );
}
