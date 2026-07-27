import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { login } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import logoImg from '@/assets/logo.png';
import logoNameImg from '@/assets/logo name.png';

export function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await login(identifier, password);
      setSession(token, user);
      navigate(user.role === 'manager' ? '/dashboard' : '/transactions');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to log in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-background flex min-h-screen items-center justify-center px-4 py-12">
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/20 bg-white p-8 shadow-2xl">

        {/* ── LOGO & BRAND NAME ────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logoImg} alt="PayTrack Logo" className="mb-2 h-16 w-auto object-contain drop-shadow-sm" />
          <img src={logoNameImg} alt="PayTrack" className="h-8 w-auto object-contain" />
        </div>

        {/* ── LOGIN FORM ────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#0F234F]">
              Email / Username
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5F6C7B]" size={18} />
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter your username or email"
                required
                autoFocus
                className="pl-10 text-sm border-[#D8E0EA] focus:border-[#2F6BFF] focus:ring-2 focus:ring-[#2F6BFF]/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#0F234F]">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5F6C7B]" size={18} />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pl-10 text-sm border-[#D8E0EA] focus:border-[#2F6BFF] focus:ring-2 focus:ring-[#2F6BFF]/20"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── VISIBLE BLUE LOGIN BUTTON ──────────────────────────────── */}
          <Button
            type="submit"
            disabled={loading}
            className="mt-2 h-11 w-full rounded-xl bg-[#2F6BFF] text-base font-bold text-white shadow-lg shadow-[#2F6BFF]/30 transition-all hover:bg-[#1E52D8] active:scale-[0.99]"
          >
            {loading ? 'Signing in…' : 'Login'}
          </Button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => alert('Please contact your Station Manager to reset your password.')}
              className="text-xs font-semibold text-[#2F6BFF] transition-colors hover:text-[#1E52D8] hover:underline"
            >
              Forgot password?
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
