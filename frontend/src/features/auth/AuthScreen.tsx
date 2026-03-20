'use client';

import { useState } from 'react';
import api from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/authStore';

interface AuthResponse {
  user: {
    id: string;
    displayName: string;
    email: string;
  };
  token: string;
}

export function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useAuthStore((s) => s.login);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const data = await api.post<AuthResponse>('/auth/login', {
          email,
          password,
        });
        login(data.user, data.token);
      } else {
        if (!displayName.trim()) {
          setError('Vui lòng nhập tên hiển thị');
          setLoading(false);
          return;
        }
        const data = await api.post<AuthResponse>('/auth/register', {
          displayName: displayName.trim(),
          email,
          password,
        });
        login(data.user, data.token);
      }
    } catch (err) {
      if (isLogin) {
        setError('Email hoặc mật khẩu không đúng');
      } else {
        setError('Không thể đăng ký. Email có thể đã tồn tại.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-black px-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-black tracking-tight text-red-500 mb-2">
          Weat
        </h1>
        <p className="text-white/60 text-sm">
          Cùng bạn bè tìm món ngon quanh đây
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {!isLogin && (
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tên hiển thị"
            className="w-full bg-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50"
          />
        )}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full bg-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
          required
          minLength={6}
          className="w-full bg-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50"
        />

        {error && (
          <p className="text-red-400 text-xs text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-500 hover:bg-red-600 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
        >
          {loading
            ? 'Đang xử lý...'
            : isLogin
              ? 'Đăng nhập'
              : 'Đăng ký'}
        </button>
      </form>

      {/* Toggle */}
      <button
        onClick={() => {
          setIsLogin(!isLogin);
          setError(null);
        }}
        className="mt-6 text-white/50 text-sm"
      >
        {isLogin ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
      </button>

      {/* Demo accounts hint */}
      <div className="mt-8 text-center">
        <p className="text-white/30 text-xs mb-1">Demo accounts:</p>
        <p className="text-white/40 text-xs">usera@weat.demo / password123</p>
        <p className="text-white/40 text-xs">userb@weat.demo / password123</p>
      </div>
    </div>
  );
}
