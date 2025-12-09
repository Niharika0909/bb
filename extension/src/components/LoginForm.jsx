import React, { useState } from 'react';
import StatusToast from './StatusToast';
import { login } from '../utils/api';
import { setToken } from '../utils/auth';

export default function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !apiKey) {
      showToast('❌ Email and API Key required', 'error');
      return;
    }

    setLoading(true);
    showToast('Logging in...', 'loading');

    try {
      const response = await login(email, apiKey);
      await setToken(response.token);
      showToast('✓ Logged in successfully', 'success');
      setTimeout(() => {
        onLogin();
      }, 500);
    } catch (error) {
      showToast(`❌ ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-header">
        <h2>MRM Research Capture</h2>
        <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
          Sign in to continue
        </p>
      </div>

      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-input"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">API Key</label>
          <input
            type="password"
            className="form-input"
            placeholder="Your API key from MRM"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="button button-primary"
          disabled={loading}
          style={{ marginTop: '16px' }}
        >
          {loading ? '⏳ Signing in...' : 'Sign In'}
        </button>
      </form>

      {toast && <StatusToast message={toast.message} type={toast.type} />}
    </div>
  );
}
