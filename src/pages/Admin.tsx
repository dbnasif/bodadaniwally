import { useEffect, useMemo, useState } from 'react';
import { GRUPOS } from '../config/challenges';

interface AdminRow {
  id: string;
  guest_name: string;
  grupo: string;
  challenge_id: string;
  challenge_title: string;
  photo_url: string;
  completed_at: string;
  updated_at: string;
}

const PASSWORD_KEY = 'boda_admin_pw';

export default function Admin() {
  const [password, setPassword] = useState(() => sessionStorage.getItem(PASSWORD_KEY) || '');
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [filterName, setFilterName] = useState('');
  const [filterGrupo, setFilterGrupo] = useState('');
  const [filterChallenge, setFilterChallenge] = useState('');

  async function tryLoad(pw: string) {
    if (!pw) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/.netlify/functions/admin-data', {
        headers: { 'x-admin-password': pw },
      });
      if (res.status === 401) {
        setError('Contraseña incorrecta.');
        setAuthed(false);
        return;
      }
      if (!res.ok) throw new Error('request failed');
      const data = (await res.json()) as AdminRow[];
      setRows(data);
      setAuthed(true);
      sessionStorage.setItem(PASSWORD_KEY, pw);
    } catch {
      setError('No pudimos cargar los datos. Probá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (password) void tryLoad(password);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter(
      (r) =>
        (!filterName || r.guest_name.toLowerCase().includes(filterName.toLowerCase())) &&
        (!filterGrupo || r.grupo === filterGrupo) &&
        (!filterChallenge || r.challenge_id.toLowerCase().includes(filterChallenge.toLowerCase()))
    );
  }, [rows, filterName, filterGrupo, filterChallenge]);

  const rankingSummary = useMemo(() => {
    if (!rows) return [];
    const map = new Map<string, { name: string; points: number }>();
    for (const r of rows) {
      const existing = map.get(r.guest_name);
      if (existing) existing.points += 1;
      else map.set(r.guest_name, { name: r.guest_name, points: 1 });
    }
    return [...map.values()].sort((a, b) => b.points - a.points);
  }, [rows]);

  if (!authed) {
    return (
      <div className="page center-page">
        <h1>Admin</h1>
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void tryLoad(password)}
        />
        <button className="btn-primary" disabled={loading} onClick={() => void tryLoad(password)}>
          {loading ? 'Entrando...' : 'ENTRAR'}
        </button>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  return (
    <div className="page admin-page">
      <h1>Admin — Misión Secreta</h1>

      <section>
        <h2>Ranking completo ({rankingSummary.length} invitados)</h2>
        <ol className="ranking-list">
          {rankingSummary.map((r) => (
            <li key={r.name}>
              <span className="rank-name">{r.name}</span>
              <span className="rank-points">{r.points} pts</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2>Cargas ({filtered.length})</h2>
        <div className="admin-filters">
          <input
            placeholder="Filtrar por nombre"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />
          <select value={filterGrupo} onChange={(e) => setFilterGrupo(e.target.value)}>
            <option value="">Todos los grupos</option>
            {GRUPOS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <input
            placeholder="Filtrar por desafío (ej: A01)"
            value={filterChallenge}
            onChange={(e) => setFilterChallenge(e.target.value)}
          />
          <button className="btn-text" onClick={() => void tryLoad(password)}>
            Actualizar
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Nombre</th>
                <th>Grupo</th>
                <th>Desafío</th>
                <th>Foto subida</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const wasEdited = r.updated_at !== r.completed_at;
                return (
                  <tr key={r.id}>
                    <td>
                      <a href={r.photo_url} target="_blank" rel="noreferrer">
                        <img className="admin-thumb" src={r.photo_url} alt="" loading="lazy" decoding="async" />
                      </a>
                    </td>
                    <td>{r.guest_name}</td>
                    <td>{r.grupo}</td>
                    <td>
                      {r.challenge_id} · {r.challenge_title}
                    </td>
                    <td>
                      {new Date(r.updated_at).toLocaleString('es-AR')}
                      {wasEdited && <span className="admin-edited-tag"> (editada)</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
