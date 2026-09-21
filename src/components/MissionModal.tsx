import { useRef, useState, type ChangeEvent } from 'react';
import { getGuestName, setGuestName } from '../lib/guest';
import { compressImage } from '../lib/image';
import type { SubmitResult } from '../lib/submit';

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
  onSuccessMark: () => void;
  onClose: () => void;
  onCompleted: () => void;
  onViewRanking: () => void;
}

type Step = 'name' | 'pick' | 'preview' | 'uploading' | 'success' | 'error';

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
        setStep('name');
        return;
      }
      const result = await onSubmit({ guestName, photoBlob: blob });

      if (result.status === 'ok') {
        onSuccessMark();
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
