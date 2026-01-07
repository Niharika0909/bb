import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    const result = await login(email, password, requiresMfa ? mfaCode : null);

    if (result.requiresMfa) {
      setRequiresMfa(true);
      toast('Please enter your MFA code');
      return;
    }

    if (result.success) {
      toast.success('Login successful');
      navigate('/dashboard');
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-16 w-16 rounded-xl bg-primary-600 flex items-center justify-center">
            <span className="text-white font-bold text-2xl">MRM</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Model Risk Management
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access the platform
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-xl shadow-sm -space-y-px bg-white p-6 border border-gray-200">
            <div className="mb-4">
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {requiresMfa && (
              <div className="mb-4">
                <label htmlFor="mfaCode" className="label">
                  MFA Code
                </label>
                <input
                  id="mfaCode"
                  name="mfaCode"
                  type="text"
                  required
                  className="input"
                  placeholder="6-digit code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  maxLength={6}
                />
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 mt-2">{error}</div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full py-3"
            >
              {isLoading ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                Test Accounts
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div className="bg-white p-2 rounded border">
              <p className="font-medium text-gray-700">Admin</p>
              <p>admin@mrm.io</p>
            </div>
            <div className="bg-white p-2 rounded border">
              <p className="font-medium text-gray-700">Risk Manager</p>
              <p>risk.manager@mrm.io</p>
            </div>
            <div className="bg-white p-2 rounded border">
              <p className="font-medium text-gray-700">Validator</p>
              <p>validator@mrm.io</p>
            </div>
            <div className="bg-white p-2 rounded border">
              <p className="font-medium text-gray-700">Developer</p>
              <p>developer@mrm.io</p>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-gray-500">
            Password: Password123!
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
