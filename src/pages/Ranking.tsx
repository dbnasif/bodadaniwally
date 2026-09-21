import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface Props {
  onNavigate: (path: string) => void;
}

interface RankingRow {
  guest_id: string;
  guest_name: string;
  points: number;
  reached_at: string;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Ranking({ onNavigate }: Props) {
  const [rows, setRows] = useState<RankingRow[] | null>(null);
  const [error, setError] = useState('');

  async function load() {
    const { data, error: err } = await supabase
      .from('ranking')
      .select('*')
      .order('points', { ascending: false })
      .order('reached_at', { ascending: true });

    if (err) {
      setError('No pudimos cargar el ranking. Probá de nuevo.');
      return;
    }
    setError('');
    setRows((data ?? []) as RankingRow[]);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return (
    <div className="page">
      <header className="hero hero-card hero-card-bg small">
        <h1>🏆 RANKING</h1>
      </header>

      {error && <p className="error-text">{error}</p>}
      {!rows && !error && <p className="muted center-text">Cargando...</p>}
      {rows && rows.length === 0 && (
        <p className="muted center-text">Todavía nadie subió fotos. ¡Sé el primero!</p>
      )}

      {rows && rows.length > 0 && (
        <ol className="ranking-list">
          {rows.map((r, i) => (
            <li key={r.guest_id} className={i < 3 ? 'top' : ''}>
              <span className="rank-pos">{MEDALS[i] ?? i + 1}</span>
              <span className="rank-name">{r.guest_name}</span>
              <span className="rank-points">{r.points} pts</span>
            </li>
          ))}
        </ol>
      )}

      <button className="btn-primary ranking-back" onClick={() => onNavigate('/')}>
        VOLVER A MIS DESAFÍOS
      </button>
    </div>
  );
}
