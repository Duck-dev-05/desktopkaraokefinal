import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          backgroundColor: '#0a0a0f',
          color: '#fff',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#ff3366', marginBottom: '1rem' }}>Rất tiếc, đã có lỗi xảy ra!</h1>
          <p style={{ color: '#a0a0a0', marginBottom: '2rem' }}>
            Ứng dụng gặp sự cố không mong muốn.
          </p>
          <div style={{
            backgroundColor: '#1a1a24',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '2rem',
            maxWidth: '600px',
            overflowX: 'auto'
          }}>
            <code style={{ color: '#ff7799', fontSize: '0.85rem' }}>
              {this.state.error?.message || "Unknown error"}
            </code>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6b33ff',
              color: 'white',
              border: 'none',
              borderRadius: '24px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Tải Lại Ứng Dụng
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
