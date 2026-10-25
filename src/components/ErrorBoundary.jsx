import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="loading-screen">
                    <div className="panel" style={{ maxWidth: '36rem', textAlign: 'center', display: 'grid', gap: '1rem' }}>
                        <h2>⚠️ Что-то пошло не так</h2>
                        <p className="muted">Эта лаборатория столкнулась с ошибкой. Можно вернуться в меню и продолжить урок.</p>
                        <pre style={{ color: 'var(--danger)', whiteSpace: 'pre-wrap', fontSize: '0.8rem', margin: 0 }}>
                            {this.state.error && this.state.error.toString()}
                        </pre>
                        {this.props.onReset
                            ? <button className="btn btn-primary" onClick={this.props.onReset}>← В меню</button>
                            : <button className="btn btn-primary" onClick={() => window.location.reload()}>Перезагрузить</button>}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
