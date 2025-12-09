import React, { useEffect, useState } from 'react';
import CaptureForm from './components/CaptureForm';
import LoginForm from './components/LoginForm';
import { verifyToken } from './utils/auth';
import './App.css';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await verifyToken();
      setIsAuthenticated(authenticated);
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="container">
        <p className="loading">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container">
      {isAuthenticated ? (
        <CaptureForm onLogout={() => setIsAuthenticated(false)} />
      ) : (
        <LoginForm onLogin={() => setIsAuthenticated(true)} />
      )}
    </div>
  );
}
