import { useState } from 'react';
import { getChallengesForGrupo } from '../config/challenges';
import { resolveGrupo, getCompleted } from '../lib/guest';
import ChallengeCard from '../components/ChallengeCard';
import { LeafSprig, PawPrint } from '../components/Ornaments';

interface Props {
  onNavigate: (path: string) => void;
}

export default function Misiones({ onNavigate }: Props) {
  const [grupo] = useState(() => resolveGrupo());
  const [completed, setCompleted] = useState(() => getCompleted());

  function refreshCompleted() {
    setCompleted(getCompleted());
  }

  if (!grupo) {
    return (
      <div className="page center-page">
        <h1>Misión Secreta</h1>
        <p>Escaneá el código QR de tu tarjeta para ver tus desafíos.</p>
      </div>
    );
  }

  const challenges = getChallengesForGrupo(grupo);
  const doneCount = challenges.filter((c) => completed.has(c.id)).length;

  return (
    <div className="page">
      <header className="hero hero-card">
        <LeafSprig className="leaf-corner leaf-corner-left" />
        <LeafSprig className="leaf-corner leaf-corner-right" />
        <img
          src="/papri.png"
          alt=""
          className="papri-slot-img"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <h1 className="hero-title">Misión Secreta</h1>
        <p>Te tocaron estos 5 desafíos.</p>
        <p className="hero-sub">Hacé los que quieras, subí las fotos y sumá puntos.</p>
        <PawPrint className="paw-divider" />
        <div className="hero-progress">
          {doneCount} / {challenges.length} completados
        </div>
      </header>

      <div className="challenge-list">
        {challenges.map((c) => (
          <ChallengeCard
            key={c.id}
            challenge={c}
            grupo={grupo}
            completed={completed.has(c.id)}
            onCompleted={refreshCompleted}
            onViewRanking={() => onNavigate('/ranking')}
          />
        ))}
      </div>

      <p className="prize-note">Completá desafíos, sumá puntos y subí en el ranking. Hay premio.</p>

      <button className="ranking-fab" onClick={() => onNavigate('/ranking')}>
        🏆 RANKING
      </button>
    </div>
  );
}
