import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ROLES, ROLE_LABELS } from '../../utils/rbac';
import { Lock, Mail, Shield, CheckCircle2 } from 'lucide-react';

export const Login = () => {
  const { login, availableUsers } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@company.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (userEmail) => {
    setEmail(userEmail);
    setLoading(true);
    try {
      await login(userEmail, 'password123');
      navigate('/dashboard');
    } catch (e) {
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] dark:bg-[#132A20] flex items-center justify-center p-4 dot-grid-bg">
      <div className="w-full max-w-md bg-[#EFEEE8] dark:bg-[#1B3A2C] border border-[#E1DFD7] dark:border-[#264A39] rounded-xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#2FA84C] text-white font-display text-2xl font-bold mb-2 shadow-sm">
            C
          </div>
          <h1 className="text-2xl font-bold font-display text-[#14181A] dark:text-[#EDF3EC]">
            CRM & Operations
          </h1>
          <p className="text-xs text-[#6B7168] dark:text-[#95A99B]">
            Enterprise single source of truth for leads, projects, and finance
          </p>
        </div>

        {error && (
          <div className="p-3 rounded bg-[#B5533E]/10 border border-[#B5533E]/30 text-xs text-[#B5533E] font-medium">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Work Email"
            type="email"
            icon={Mail}
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            icon={Lock}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={loading}
          >
            Sign In to Platform
          </Button>
        </form>

        {/* Demo Role Selector */}
        <div className="pt-4 border-t border-[#E1DFD7] dark:border-[#264A39] space-y-3">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#6B7168] dark:text-[#95A99B] text-center flex items-center justify-center gap-1">
            <Shield className="w-3.5 h-3.5 text-[#2FA84C]" /> Instant Role Demo Login
          </div>
          <div className="grid grid-cols-2 gap-2">
            {availableUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleDemoLogin(u.email)}
                className="p-2 rounded bg-[#FAFAF7] dark:bg-[#132A20] border border-[#E1DFD7] dark:border-[#264A39] hover:border-[#2FA84C] text-left transition-colors text-xs"
              >
                <div className="font-semibold text-[#14181A] dark:text-[#EDF3EC] truncate">
                  {u.name}
                </div>
                <div className="text-[10px] font-mono text-[#2FA84C] dark:text-[#3FCB63] capitalize">
                  {u.role.replace('_', ' ')}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
