import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminLogin } from '../../utils/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await adminLogin(email, password);
      localStorage.setItem('adminToken', result.token);
      localStorage.setItem('adminUser', JSON.stringify(result.user));
      toast.success('Login successful');
      navigate('/admin/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Admin Login</h1>
          <p className="text-slate-400">Sign in to manage elections</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-primary-500 focus:outline-none text-white"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-primary-500 focus:outline-none text-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-4 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:bg-slate-700 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center mt-6">
          <a href="/" className="text-slate-400 hover:text-primary-400 text-sm">
            ← Back to voting platform
          </a>
        </p>
      </div>
    </div>
  );
}
