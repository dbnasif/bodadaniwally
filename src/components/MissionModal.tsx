import { useRef, useState, type ChangeEvent } from 'react';
import type { Challenge, Grupo } from '../config/challenges';
import { getGuestId, getGuestName, setGuestName, markCompleted } from '../lib/guest';
import { compressImage } from '../lib/image';
import { submitChallenge } from '../lib/submit';

interface Props {
  challenge: Challenge;
  grupo: Grupo;
  onClose: () => void;
  onCompleted: () => void;
  onViewRanking: () => void;
}

type Step = 'name' | 'pick' | 'preview' | 'uploading' | 'success' | 'duplicate' | 'error';

export default function MissionModal({ challenge, grupo, onClose, onCompleted, onViewRanking }: Props) {
  const [step, setStep] = useState<Step>(getGuestName() ? 'pick' : 'name');
  const [nameInput, setNameInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function confirmName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setGuestName(trimmed);
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
      const guestName = getGuestName();
      if (!guestName) {
        // No debería pasar, pero por las dudas no perdemos la foto elegida.
        setStep('name');
        return;
      }
      const result = await submitChallenge({
        guestId: getGuestId(),
        guestName,
        grupo,
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        photoBlob: blob,
      });

      if (result.status === 'ok') {
        markCompleted(challenge.id);
        setStep('success');
      } else if (result.status === 'duplicate') {
        markCompleted(challenge.id);
        setStep('duplicate');
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

        <div className="modal-challenge-label">
          {challenge.id} · {challenge.title}
        </div>

        {step === 'name' && (
          <div className="modal-step">
            <h2>¿Cómo te llamás?</h2>
            <p className="muted">Así aparecés en el ranking. Solo te lo preguntamos una vez.</p>
            <input
              autoFocus
              type="text"
              inputMode="text"
              placeholder="Tu nombre o apodo"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmName()}
              maxLength={40}
            />
            <button className="btn-primary" disabled={!nameInput.trim()} onClick={confirmName}>
              CONTINUAR
            </button>
          </div>
        )}

        {step === 'pick' && (
          <div className="modal-step">
            <h2>{challenge.title}</h2>
            <p className="muted">{challenge.description}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button className="btn-primary" onClick={() => fileInputRef.current?.click()}>
              ELEGIR O SACAR FOTO
            </button>
          </div>
        )}

        {step === 'preview' && previewUrl && (
          <div className="modal-step">
            {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
            <img className="preview-img" src={previewUrl} alt="Vista previa de la foto" />
            <button className="btn-primary" onClick={handleSubmit}>
              ENVIAR MISIÓN
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

        {(step === 'success' || step === 'duplicate') && (
          <div className="modal-step center">
            <h2>{step === 'success' ? '¡MISIÓN CUMPLIDA!' : 'YA LA TENÍAS ✓'}</h2>
            {step === 'success' && <p className="points">+1 punto</p>}
            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  onCompleted();
                  onClose();
                }}
              >
                VOLVER A MIS DESAFÍOS
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
