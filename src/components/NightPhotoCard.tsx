import { useState } from 'react';
import type { Grupo } from '../config/challenges';
import { getGuestId, markNightPhotoDone } from '../lib/guest';
import { submitNightPhoto } from '../lib/submit';
import MissionModal from './MissionModal';

interface Props {
  grupo: Grupo;
  done: boolean;
  onCompleted: () => void;
  onViewRanking: () => void;
}

const DESCRIPTION =
  'Subí LA foto de la noche: esa que captura algo único, emocionante, absurdo o inolvidable.';

export default function NightPhotoCard({ grupo, done, onCompleted, onViewRanking }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="night-card">
      <span className="night-card-tag">PREMIO ESPECIAL</span>
      <h3 className="night-card-title">La Foto de la Noche</h3>
      <p className="night-card-copy">{DESCRIPTION}</p>
      <p className="night-card-fineprint">
        No suma puntos al ranking. Dani &amp; Wally van a elegir su favorita y hay premio aparte.
      </p>
      {done ? (
        <button className="challenge-done night-done" onClick={() => setOpen(true)}>
          ✓ FOTO DE LA NOCHE CARGADA <span className="challenge-done-edit">· cambiar mi foto</span>
        </button>
      ) : (
        <button className="btn-upload night-upload" onClick={() => setOpen(true)}>
          SUBIR MI FOTO
        </button>
      )}
      {open && (
        <MissionModal
          label="PREMIO ESPECIAL"
          title="La Foto de la Noche"
          description={DESCRIPTION}
          isEdit={done}
          showPoints={false}
          successTitle={done ? 'FOTO ACTUALIZADA' : '¡FOTO CARGADA!'}
          onSubmit={({ guestName, photoBlob }) =>
            submitNightPhoto({ guestId: getGuestId(), guestName, grupo, photoBlob })
          }
          onSuccessMark={markNightPhotoDone}
          onClose={() => setOpen(false)}
          onCompleted={onCompleted}
          onViewRanking={onViewRanking}
        />
      )}
    </div>
  );
}
