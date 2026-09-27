import { useRef, useState, type ChangeEvent } from 'react';
import { getGuestId, getGuestProfile, isProfileComplete, setGuestProfile, getFullName } from '../lib/guest';
import { compressImage } from '../lib/image';
import { submitGuestProfile, type SubmitResult } from '../lib/submit';

interface Props {
  /** Texto pequeño arriba del todo, ej. "A01 · DRAMA INNECESARIO" o "PREMIO ESPECIAL". */
  label: string;
  title: string;
  description: string;
  isEdit: boolean;
  /** false para la Foto de la Noche: no suma puntos, no se muestra "+1 punto". */
  showPoints: boolean;
  successTitle: string;
  onSubmit: (args: { guestName: string; photoBlob: Blob }) => Promise<SubmitResult>;
  /** Se llama solo si onSubmit devolvió status 'ok', para que el padre actualice su propio estado local. */
  onSuccessMark: (photoUrl: string) => void;
  onClose: () => void;
  onCompleted: () => void;
  onViewRanking: () => void;
}

type Step = 'profile' | 'pick' | 'preview' | 'uploading' | 'success' | 'error';

export default function MissionModal({
  label,
  title,
  description,
  isEdit,
  showPoints,
  successTitle,
  onSubmit,
  onSuccessMark,
  onClose,
  onCompleted,
  onViewRanking,
}: Props) {
  const [step, setStep] = useState<Step>(isProfileComplete() ? 'pick' : 'profile');
  const [profileDraft, setProfileDraft] = useState(() => getGuestProfile());
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function confirmProfile() {
    const firstName = profileDraft.firstName.trim();
    const lastName = profileDraft.lastName.trim();
    if (!firstName || !lastName) return;
    const email = profileDraft.email.trim();
    setGuestProfile({ firstName, lastName, email });
    // No bloqueamos la carga de la foto esperando esto: es información de
    // contacto opcional/secundaria, no algo que le tenga que costar un
    // reintento al invitado si hay mala señal justo en este momento.
    void submitGuestProfile({ guestId: getGuestId(), firstName, lastName, email });
    setStep('pick');
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setStep('preview');
  }

  async function handleSubmit() {
    if (!file) return;
    setStep('uploading');
    setErrorMsg('');
    try {
      const blob = await compressImage(file).catch(() => file);
      if (!isProfileComplete()) {
        setStep('profile');
        return;
      }
      const result = await onSubmit({ guestName: getFullName(), photoBlob: blob });

      if (result.status === 'ok') {
        onSuccessMark(result.photoUrl);
        setStep('success');
      } else {
        setErrorMsg(result.message);
        setStep('error');
      }
    } catch {
      setErrorMsg('Algo salió mal subiendo la foto. Probá de nuevo.');
      setStep('error');
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>

        <div className="modal-challenge-label">{label}</div>

        {step === 'profile' && (
          <div className="modal-step">
            <h2>¿Cómo te llamás?</h2>
            <p className="muted">Así te identificamos. Solo te lo pedimos una vez.</p>
            <input
              autoFocus={!profileDraft.firstName}
              type="text"
              inputMode="text"
              placeholder="Nombre"
              value={profileDraft.firstName}
              onChange={(e) => setProfileDraft((p) => ({ ...p, firstName: e.target.value }))}
              maxLength={40}
            />
            <input
              autoFocus={!!profileDraft.firstName}
              type="text"
              inputMode="text"
              placeholder="Apellido"
              value={profileDraft.lastName}
              onChange={(e) => setProfileDraft((p) => ({ ...p, lastName: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && confirmProfile()}
              maxLength={40}
            />
            <input
              type="email"
              inputMode="email"
              placeholder="Email (opcional)"
              value={profileDraft.email}
              onChange={(e) => setProfileDraft((p) => ({ ...p, email: e.target.value }))}
              maxLength={80}
            />
            <p className="muted field-hint">
              Dejanos tu mail si querés que después del casamiento te compartamos las fotos de los
              desafíos 📸
            </p>
            <button
              className="btn-primary"
              disabled={!profileDraft.firstName.trim() || !profileDraft.lastName.trim()}
              onClick={confirmProfile}
            >
              CONTINUAR
            </button>
          </div>
        )}

        {step === 'pick' && (
          <div className="modal-step">
            <h2>{title}</h2>
            <p className="muted">{description}</p>
            {isEdit && <p className="edit-hint">Vas a reemplazar la foto que ya subiste.</p>}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button className="btn-primary" onClick={() => fileInputRef.current?.click()}>
              {isEdit ? 'ELEGIR OTRA FOTO' : 'ELEGIR O SACAR FOTO'}
            </button>
          </div>
        )}

        {step === 'preview' && previewUrl && (
          <div className="modal-step">
            <img className="preview-img" src={previewUrl} alt="Vista previa de la foto" />
            <button className="btn-primary" onClick={handleSubmit}>
              {isEdit ? 'GUARDAR CAMBIO' : 'ENVIAR'}
            </button>
            <button className="btn-text" onClick={() => fileInputRef.current?.click()}>
              Elegir otra foto
            </button>
          </div>
        )}

        {step === 'uploading' && (
          <div className="modal-step center">
            <div className="spinner" />
            <p>Subiendo tu foto...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="modal-step center">
            <h2>{successTitle}</h2>
            {showPoints && !isEdit && <p className="points">+1 punto</p>}
            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  onCompleted();
                  onClose();
                }}
              >
                VOLVER
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  onCompleted();
                  onViewRanking();
                }}
              >
                VER RANKING
              </button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="modal-step center">
            <p className="error-text">{errorMsg}</p>
            <button className="btn-primary" onClick={() => setStep('preview')}>
              REINTENTAR
            </button>
            <button className="btn-text" onClick={onClose}>
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
