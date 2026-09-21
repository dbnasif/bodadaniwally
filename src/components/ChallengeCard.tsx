import { useState } from 'react';
import type { Challenge, Grupo } from '../config/challenges';
import MissionModal from './MissionModal';

interface Props {
  challenge: Challenge;
  grupo: Grupo;
  completed: boolean;
  onCompleted: () => void;
  onViewRanking: () => void;
}

export default function ChallengeCard({ challenge, grupo, completed, onCompleted, onViewRanking }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="challenge-card">
      <div className="challenge-number">{String(challenge.numero).padStart(2, '0')}</div>
      <div className="challenge-body">
        <h3>{challenge.title}</h3>
        <p>{challenge.description}</p>
        {completed ? (
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
          challenge={challenge}
          grupo={grupo}
          isEdit={completed}
          onClose={() => setOpen(false)}
          onCompleted={onCompleted}
          onViewRanking={onViewRanking}
        />
      )}
    </div>
  );
}
