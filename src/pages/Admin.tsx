import { useEffect, useMemo, useState } from 'react';
import { GRUPOS } from '../config/challenges';

interface SubmissionRow {
  id: string;
  guest_name: string;
  grupo: string;
  challenge_id: string;
  challenge_title: string;
  photo_url: string;
  completed_at: string;
  updated_at: string;
}

interface NightPhotoRow {
  id: string;
  guest_name: string;
  grupo: string;
  photo_url: string;
  updated_at: string;
}

interface ParticipantRow {
  guest_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  grupo: string | null;
  challenges_count: number;
  night_photo: boolean;
  name_changes: number;
  registered_at: string;
  updated_at: string;
}

interface NameChangeRow {
  guest_id: string;
  old_first_name: string | null;
  old_last_name: string | null;
  new_first_name: string;
  new_last_name: string;
  changed_at: string;
}

interface AdminData {
  submissions: SubmissionRow[];
  nightPhotos: NightPhotoRow[];
  participants: ParticipantRow[];
  nameChangeHistory: NameChangeRow[];
}

const PASSWORD_KEY = 'boda_admin_pw';

export default function Admin() {
  const [password, setPassword] = useState(() => sessionStorage.getItem(PASSWORD_KEY) || '');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'misiones' | 'noche' | 'participantes' | 'reset'>('misiones');

  const [filterName, setFilterName] = useState('');
  const [filterGrupo, setFilterGrupo] = useState('');
  const [filterChallenge, setFilterChallenge] = useState('');
  const [filterParticipant, setFilterParticipant] = useState('');

  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{ ok: boolean; message: string } | null>(null);

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
      if (!res.ok) {
        // TODO(debug temporal): detalle técnico. Sacar una vez confirmado.
        const body = await res.json().catch(() => null);
        throw new Error(`[${res.status}] ${body?.error ?? 'sin detalle'}`);
      }
      const result = (await res.json()) as AdminData;
      setData(result);
      setAuthed(true);
      sessionStorage.setItem(PASSWORD_KEY, pw);
    } catch (err) {
      setError(`No pudimos cargar los datos. Detalle: ${err instanceof Error ? err.message : 'desconocido'}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (password) void tryLoad(password);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleReset() {
    const email = resetEmail.trim();
    const code = resetCode.trim();
    if (!email || !code) return;

    const confirmed = window.confirm(
      'Esto va a borrar TODOS los puntos del ranking (se guarda un backup completo antes de borrar, y no toca la Foto de la Noche ni los perfiles). ¿Confirmás?'
    );
    if (!confirmed) return;

    setResetLoading(true);
    setResetResult(null);
    try {
      const res = await fetch('/.netlify/functions/admin-reset-ranking', {
        method: 'POST',
        headers: { 'x-admin-password': password, 'content-type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const body = await res.json();
      if (res.ok) {
        setResetResult({
          ok: true,
          message: `Listo. Se guardó el backup y se resetearon ${body.backedUpSubmissions} filas.`,
        });
        void tryLoad(password);
      } else {
        setResetResult({ ok: false, message: body.error || 'No se pudo resetear.' });
      }
    } catch {
      setResetResult({ ok: false, message: 'Error de conexión. No se tocó nada.' });
    } finally {
      setResetLoading(false);
    }
  }

  const rows = data?.submissions ?? [];
  const nightPhotos = data?.nightPhotos ?? [];
  const participants = data?.participants ?? [];
  const nameChangeHistory = data?.nameChangeHistory ?? [];

  function nameChangeTooltip(guestId: string): string {
    return nameChangeHistory
      .filter((h) => h.guest_id === guestId)
      .map(
        (h) =>
          `${new Date(h.changed_at).toLocaleString('es-AR')}: "${h.old_first_name ?? '?'} ${h.old_last_name ?? '?'}" → "${h.new_first_name} ${h.new_last_name}"`
      )
      .join('\n');
  }

  const filteredParticipants = useMemo(() => {
    const q = filterParticipant.toLowerCase();
    if (!q) return participants;
    return participants.filter(
      (p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q)
    );
  }, [participants, filterParticipant]);

  const filtered = useMemo(() => {
    return rows.filter(
      (r) =>
        (!filterName || r.guest_name.toLowerCase().includes(filterName.toLowerCase())) &&
        (!filterGrupo || r.grupo === filterGrupo) &&
        (!filterChallenge || r.challenge_id.toLowerCase().includes(filterChallenge.toLowerCase()))
    );
  }, [rows, filterName, filterGrupo, filterChallenge]);

  const rankingSummary = useMemo(() => {
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
      <h1>Admin — Misión Fotográfica</h1>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${tab === 'misiones' ? 'active' : ''}`}
          onClick={() => setTab('misiones')}
        >
          MISIONES
        </button>
        <button className={`admin-tab ${tab === 'noche' ? 'active' : ''}`} onClick={() => setTab('noche')}>
          FOTOS DE LA NOCHE ({nightPhotos.length})
        </button>
        <button
          className={`admin-tab ${tab === 'participantes' ? 'active' : ''}`}
          onClick={() => setTab('participantes')}
        >
          PARTICIPANTES ({participants.length})
        </button>
        <button className={`admin-tab admin-tab-danger ${tab === 'reset' ? 'active' : ''}`} onClick={() => setTab('reset')}>
          ⚠️ RESET
        </button>
      </div>

      {tab === 'misiones' && (
        <>
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
                            <img
                              className="admin-thumb"
                              src={r.photo_url}
                              alt=""
                              loading="lazy"
                              decoding="async"
                            />
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
        </>
      )}

      {tab === 'noche' && (
        <section>
          <h2>La Foto de la Noche — todas las candidaturas ({nightPhotos.length})</h2>
          <p className="muted">
            Una foto por invitado (la más reciente que subió), sin importar el grupo. Elegida
            manualmente, no afecta el ranking.
          </p>
          {nightPhotos.length === 0 ? (
            <p className="muted center-text">Todavía nadie subió su Foto de la Noche.</p>
          ) : (
            <div className="night-gallery">
              {nightPhotos.map((p) => (
                <a
                  key={p.id}
                  href={p.photo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="night-gallery-item"
                >
                  <img src={p.photo_url} alt="" loading="lazy" decoding="async" />
                  <div className="night-gallery-caption">
                    <strong>{p.guest_name}</strong>
                    <span>
                      Grupo {p.grupo} · {new Date(p.updated_at).toLocaleString('es-AR')}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'participantes' && (
        <section>
          <h2>Participantes ({filteredParticipants.length})</h2>
          <p className="muted">
            Nombre, apellido y email que cada invitado cargó en su perfil. El email es opcional,
            así que puede quedar vacío.
          </p>
          <div className="admin-filters">
            <input
              placeholder="Filtrar por nombre o email"
              value={filterParticipant}
              onChange={(e) => setFilterParticipant(e.target.value)}
            />
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th>Email</th>
                  <th>Grupo</th>
                  <th>Desafíos</th>
                  <th>Foto de la noche</th>
                  <th>Cambió el nombre</th>
                  <th>Registrado</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((p) => (
                  <tr key={p.guest_id}>
                    <td>{p.first_name}</td>
                    <td>{p.last_name}</td>
                    <td>{p.email || '—'}</td>
                    <td>{p.grupo || '—'}</td>
                    <td>{p.challenges_count}</td>
                    <td>{p.night_photo ? 'Sí' : 'No'}</td>
                    <td>
                      {p.name_changes > 0 ? (
                        <span title={nameChangeTooltip(p.guest_id)} className="admin-edited-tag">
                          Sí ({p.name_changes}) — pasá el mouse
                        </span>
                      ) : (
                        'No'
                      )}
                    </td>
                    <td>{new Date(p.registered_at).toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'reset' && (
        <section>
          <h2>⚠️ Resetear ranking</h2>
          <p className="muted">
            Borra los puntos de todos los invitados (la tabla de desafíos completados). Antes de
            borrar nada, guarda automáticamente una copia completa en la base. No toca la Foto de
            la Noche ni los perfiles de los invitados.
          </p>
          <div className="admin-filters">
            <input
              placeholder="Tu email de administrador"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
            <input
              placeholder="Código"
              type="password"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
            />
          </div>
          <button
            className="btn-primary reset-btn"
            disabled={resetLoading || !resetEmail.trim() || !resetCode.trim()}
            onClick={() => void handleReset()}
          >
            {resetLoading ? 'Reseteando...' : 'RESETEAR RANKING'}
          </button>
          {resetResult && (
            <p className={resetResult.ok ? 'profile-saved' : 'error-text'}>{resetResult.message}</p>
          )}
        </section>
      )}
    </div>
  );
}
