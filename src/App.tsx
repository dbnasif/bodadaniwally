import { useEffect, useState } from 'react';
import Misiones from './pages/Misiones';
import Ranking from './pages/Ranking';
import Admin from './pages/Admin';

function getPath(): string {
  return window.location.pathname.replace(/\/+$/, '') || '/';
}

export default function App() {
  const [path, setPath] = useState(getPath());

  useEffect(() => {
    const onPop = () => setPath(getPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function navigate(to: string) {
    // Conservamos ?grupo= al volver a "mis desafíos" para que el refresh siga funcionando.
    window.history.pushState({}, '', to);
    setPath(getPath());
    window.scrollTo(0, 0);
  }

  if (path === '/admin') return <Admin />;
  if (path === '/ranking') return <Ranking onNavigate={navigate} />;
  return <Misiones onNavigate={navigate} />;
}
