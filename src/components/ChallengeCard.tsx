import { useState } from 'react';
import type { Challenge, Grupo } from '../config/challenges';
import { getGuestId, markCompleted } from '../lib/guest';
import { submitChallenge } from '../lib/submit';
import MissionModal from './MissionModal';

interface Props {
  challenge: Challenge;
  grupo: Grupo;
  completed: boolean;
  /** URL pública de la foto ya subida a este desafío, si la tenemos guardada. */
  photoUrl?: string;
  onCompleted: () => void;
  onViewRanking: () => void;
}

export default function ChallengeCard({
  challenge,
  grupo,
  completed,
  photoUrl,
  onCompleted,
  onViewRanking,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="challenge-card">
      <div className="challenge-number">{String(challenge.numero).padStart(2, '0')}</div>
      <div className="challenge-body">
        <h3>{challenge.title}</h3>
        <p>{challenge.description}</p>
        {completed && photoUrl ? (
          <div className="challenge-done-row">
            <a
              href={photoUrl}
              target="_blank"
              rel="noreferrer"
              className="challenge-thumb-link"
              aria-label="Ver foto en tamaño completo"
            >
              <img
                src={photoUrl}
                alt="Foto subida a este desafío"
                className="challenge-thumb"
                loading="lazy"
                decoding="async"
              />
            </a>
            <button className="btn-edit-photo" onClick={() => setOpen(true)}>
              Editar foto
            </button>
          </div>
        ) : completed ? (
          // Desafíos completados antes de esta versión, sin URL de foto guardada localmente.
          <button className="challenge-done" onClick={() => setOpen(true)}>
            ✓ COMPLETADO <span className="challenge-done-edit">· editar foto</span>
          </button>
        ) : (
          <button className="btn-upload" onClick={() => setOpen(true)}>
            SUBIR FOTO
          </button>
        )}
      </div>
      {open && (
        <MissionModal
          label={`${challenge.id} · ${challenge.title}`}
          title={challenge.title}
          description={challenge.description}
          isEdit={completed}
          showPoints
          successTitle={completed ? 'FOTO ACTUALIZADA' : '¡MISIÓN CUMPLIDA!'}
          onSubmit={({ guestName, photoBlob }) =>
            submitChallenge({
              guestId: getGuestId(),
              guestName,
              grupo,
              challengeId: challenge.id,
              challengeTitle: challenge.title,
              photoBlob,
            })
          }
          onSuccessMark={(url) => markCompleted(challenge.id, url)}
          onClose={() => setOpen(false)}
          onCompleted={onCompleted}
          onViewRanking={onViewRanking}
        />
      )}
    </div>
  );
}
