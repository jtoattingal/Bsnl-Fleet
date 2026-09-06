import React, { useState } from 'react';
import { BsnlLogo } from './BsnlLogo';
import { User } from '../types';
import { DEFAULT_VEHICLE_REGISTRATION } from '../constants';

interface LoginViewProps {
  onLogin: (user: User | null) => void;
  logoUrl?: string;
  vehicleImg?: string;
  vehicleRegistration?: string;
  users: User[];
  onApiLogin?: (credentials: { username?: string; password: string; type: 'admin' | 'user' }) => Promise<any>;
}

export function LoginView({
  onLogin,
  logoUrl = '',
  vehicleImg = '',
  vehicleRegistration = DEFAULT_VEHICLE_REGISTRATION,
  users,
  onApiLogin,
}: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    setLoading(true);

    if (onApiLogin) {
      try {
        const res = await onApiLogin({
          username: isAdmin ? 'admin' : username,
          password,
          type: isAdmin ? 'admin' : 'user',
        });
        if (res && res.success) {
          if (res.isAdmin) {
            onLogin(null);
          } else {
            onLogin(res.user);
          }
          setLoading(false);
          return;
        } else {
          setError(res?.error || (isAdmin ? 'Invalid admin credentials.' : 'Invalid username or password.'));
          setLoading(false);
          return;
        }
      } catch (e: any) {
        // Fallback to local check
      }
    }

    if (isAdmin) {
      if (username === 'admin' && password === 'Bsnlatt') {
        onLogin(null);
      } else {
        setError('Invalid admin credentials.');
      }
    } else {
      const match = users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password && u.active
      );
      if (match) {
        onLogin(match);
      } else {
        setError('Invalid username or password.');
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#EEF2F9] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <BsnlLogo logoUrl={logoUrl} />
          </div>
          <h1
            className="text-[#003087] font-bold text-xl tracking-tight mb-0.5"
            style={{ fontFamily: "'Work Sans', sans-serif" }}
          >
            Vehicle Digital Logbook
          </h1>
          <p className="text-[#5A6A82] text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
            Official Internal Application
          </p>
        </div>

        <div className="bg-white border border-[#D4DEF0] rounded overflow-hidden mb-5">
          <div className="h-32 bg-[#1A2A4A] flex items-center justify-center overflow-hidden">
            {vehicleImg ? (
              <img
                src={vehicleImg}
                alt="Vehicle"
                className="w-full h-full object-cover opacity-90"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="text-center">
                <div className="text-5xl mb-1">🚐</div>
              </div>
            )}
          </div>
          <div className="py-2 text-center">
            <span
              className="text-[#003087] font-bold text-base tracking-widest"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {vehicleRegistration}
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#D4DEF0] rounded p-5">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-[#1A2A4A] font-semibold text-base"
              style={{ fontFamily: "'Work Sans', sans-serif" }}
            >
              {isAdmin ? 'Admin Login' : 'User Login'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setIsAdmin(!isAdmin);
                setError('');
                setUsername('');
                setPassword('');
              }}
              className="text-[#0055C8] text-xs font-medium hover:underline cursor-pointer"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {isAdmin ? '← User Login' : 'Admin Login'}
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label
                className="block text-[#5A6A82] text-xs font-medium mb-1 uppercase tracking-wider"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                Username
              </label>
              <input
                className="w-full border border-[#C8D5EB] rounded px-3 py-2 text-sm text-[#1A2A4A] focus:outline-none focus:border-[#003087] focus:ring-1 focus:ring-[#003087]"
                style={{ fontFamily: "'Inter', sans-serif" }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder={isAdmin ? 'admin' : 'Enter username'}
                autoComplete="username"
              />
            </div>
            <div>
              <label
                className="block text-[#5A6A82] text-xs font-medium mb-1 uppercase tracking-wider"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                Password
              </label>
              <input
                type="password"
                className="w-full border border-[#C8D5EB] rounded px-3 py-2 text-sm text-[#1A2A4A] focus:outline-none focus:border-[#003087] focus:ring-1 focus:ring-[#003087]"
                style={{ fontFamily: "'Inter', sans-serif" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-red-600 text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-[#003087] hover:bg-[#00236A] text-white font-semibold py-2.5 rounded text-sm transition-colors cursor-pointer disabled:opacity-60"
              style={{ fontFamily: "'Work Sans', sans-serif" }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </div>

        <p
          className="text-center text-[#8A99AE] text-xs mt-4"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Attingal Network Division, Trivandrum Business Area · Confidential Internal System
        </p>
      </div>
    </div>
  );
}
