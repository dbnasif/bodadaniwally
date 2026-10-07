import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page center-page bug-screen">
          <span className="bug-screen-icon">🐛</span>
          <h1>Encontraste un bicho</h1>
          <p>
            Hecha con amor y conocimiento cuestionable de programación. Fingí demencia y seguí
            sacando fotos — o recargá la página.
          </p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            RECARGAR
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
