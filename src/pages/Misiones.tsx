import { useState } from 'react';
import { getChallengesForGrupo } from '../config/challenges';
import { resolveGrupo, getCompleted, getCompletedPhotos, isNightPhotoDone, getGuestProfile } from '../lib/guest';
import ChallengeCard from '../components/ChallengeCard';
import NightPhotoCard from '../components/NightPhotoCard';
import ProfileModal from '../components/ProfileModal';
import ProfileGate from '../components/ProfileGate';
import { PawPrint } from '../components/Ornaments';

interface Props {
  onNavigate: (path: string) => void;
}

export default function Misiones({ onNavigate }: Props) {
  const [grupo] = useState(() => resolveGrupo());
  const [completed, setCompleted] = useState(() => getCompleted());
  const [completedPhotos, setCompletedPhotos] = useState(() => getCompletedPhotos());
  const [nightDone, setNightDone] = useState(() => isNightPhotoDone());
  const [profile, setProfile] = useState(() => getGuestProfile());
  const [profileOpen, setProfileOpen] = useState(false);

  function refreshCompleted() {
    setCompleted(getCompleted());
    setCompletedPhotos(getCompletedPhotos());
  }

  function refreshNightPhoto() {
    setNightDone(isNightPhotoDone());
  }

  function refreshProfile() {
    setProfile(getGuestProfile());
  }

  if (!grupo) {
    return (
      <div className="page center-page">
        <h1>Misión Fotográfica</h1>
        <p>Escaneá el código QR de tu tarjeta para ver tus desafíos.</p>
      </div>
    );
  }

  const profileComplete = !!profile.firstName && !!profile.lastName;

  // Primera vez que entra alguien: pedimos su nombre antes de mostrar los
  // desafíos, no al tocar "SUBIR FOTO" como antes.
  if (!profileComplete) {
    return <ProfileGate onDone={refreshProfile} />;
  }

  const challenges = getChallengesForGrupo(grupo);
  const doneCount = challenges.filter((c) => completed.has(c.id)).length;

  return (
    <div className="page">
      <header className="hero hero-card hero-card-bg">
        <button className="hero-profile-corner" onClick={() => setProfileOpen(true)}>
          Mi perfil
        </button>
        <h1 className="hero-title">Misión Fotográfica</h1>
        <p>Hola, {profile.firstName} 👋</p>
        <p>Te tocaron estos {challenges.length} desafíos.</p>
        <p className="hero-sub">Hacé los que quieras, subí las fotos y sumá puntos.</p>
        <PawPrint className="paw-divider" />
        <div className="hero-progress">
          {doneCount} / {challenges.length} completados
        </div>
        <p className="hero-special-note">+ Una misión especial fuera de competencia ✨</p>
      </header>

      <div className="challenge-list">
        {challenges.map((c) => (
          <ChallengeCard
            key={c.id}
            challenge={c}
            grupo={grupo}
            completed={completed.has(c.id)}
            photoUrl={completedPhotos[c.id]}
            onCompleted={refreshCompleted}
            onViewRanking={() => onNavigate('/ranking')}
          />
        ))}
      </div>

      <NightPhotoCard
        grupo={grupo}
        done={nightDone}
        onCompleted={refreshNightPhoto}
        onViewRanking={() => onNavigate('/ranking')}
      />

      <p className="prize-note">Completá desafíos, sumá puntos y subí en el ranking. Hay premio.</p>

      <button className="ranking-fab" onClick={() => onNavigate('/ranking')}>
        🏆 RANKING
      </button>

      {profileOpen && (
        <ProfileModal
          grupo={grupo}
          onClose={() => setProfileOpen(false)}
          onSaved={refreshProfile}
        />
      )}
    </div>
  );
}
