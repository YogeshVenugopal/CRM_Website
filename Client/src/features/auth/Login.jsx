import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABELS } from '../../utils/rbac';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Zap,
  BarChart3,
  Users,
  Briefcase,
  CheckCircle2,
  Loader2,
  Globe,
  GitBranch,
} from 'lucide-react';

const FEATURES = [
  { icon: BarChart3, title: 'Sales Pipeline', desc: 'Track deals from lead to close' },
  { icon: Users, title: 'Client 360°', desc: 'Complete customer visibility' },
  { icon: Briefcase, title: 'Project Delivery', desc: 'Handover & task management' },
  { icon: Zap, title: 'Real-time Reports', desc: 'Live business intelligence' },
];

const ROLE_COLORS = {
  admin: '#EF4444',
  management: '#8B5CF6',
  sales: '#3B5BFD',
  project_manager: '#F59E0B',
  employee: '#10B981',
  finance: '#EC4899',
};

const ROLE_ICONS = {
  admin: Shield,
  management: Users,
  sales: BarChart3,
  project_manager: Briefcase,
  employee: Zap,
  finance: CheckCircle2,
};

export const Login = () => {
  const { login, register, availableUsers } = useAuth();
  const navigate = useNavigate();

  const location = useLocation();
  const [mode, setMode] = useState(location.pathname === '/register' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regRole, setRegRole] = useState('sales');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  // Floating animation state
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % FEATURES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');

    if (regPassword !== regConfirm) {
      setRegError('Passwords do not match.');
      return;
    }
    if (regPassword.length < 8) {
      setRegError('Password must be at least 8 characters.');
      return;
    }
    if (!regName.trim()) {
      setRegError('Full name is required.');
      return;
    }

    setRegLoading(true);
    try {
      await register(regName, regEmail, regPassword, regRole);
      navigate('/dashboard');
    } catch (err) {
      setRegError(err.message || 'Registration failed. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleDemoLogin = async (userEmail) => {
    setEmail(userEmail);
    setPassword('password123');
    setError('');
    setLoading(true);
    try {
      await login(userEmail, 'password123');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Make sure the backend is running and users are seeded.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex">
      {/* ═══ LEFT PANEL — Brand Showcase ═══ */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#3B5BFD]/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[#8B5CF6]/15 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full bg-[#22D3EE]/10 blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Top — Brand */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#3B5BFD] flex items-center justify-center shadow-lg shadow-[#3B5BFD]/30">
                <span className="text-white font-display font-bold text-lg">C</span>
              </div>
              <span className="text-white/60 text-sm font-medium tracking-wide">CRM & Operations</span>
            </div>
          </div>

          {/* Center — Feature Showcase */}
          <div className="space-y-12">
            <div>
              <h1 className="text-4xl xl:text-5xl font-bold text-white font-display leading-tight max-w-lg">
                The single source of truth for your{' '}
                <span className="bg-gradient-to-r from-[#3B5BFD] via-[#818CF8] to-[#C084FC] bg-clip-text text-transparent">
                  entire business
                </span>
              </h1>
              <p className="text-white/50 text-base mt-4 max-w-md leading-relaxed">
                From lead capture to project delivery and invoicing — manage every stage of your business operations in one platform.
              </p>
            </div>

            {/* Rotating Feature Cards */}
            <div className="relative h-32">
              {FEATURES.map((feat, i) => {
                const Icon = feat.icon;
                const isActive = i === activeFeature;
                return (
                  <div
                    key={i}
                    className={`absolute inset-0 transition-all duration-500 ${
                      isActive
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-4 pointer-events-none'
                    }`}
                  >
                    <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 max-w-sm">
                      <div className="w-12 h-12 rounded-xl bg-[#3B5BFD]/20 flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6 text-[#818CF8]" />
                      </div>
                      <div>
                        <div className="text-white font-semibold text-sm">{feat.title}</div>
                        <div className="text-white/40 text-xs mt-0.5">{feat.desc}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Feature dots */}
            <div className="flex gap-2">
              {FEATURES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveFeature(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeFeature
                      ? 'w-8 bg-[#3B5BFD]'
                      : 'w-1.5 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Bottom — Trust indicators */}
          <div className="flex items-center gap-6 text-white/30 text-xs">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              <span>Enterprise RBAC</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              <span>Encrypted Sessions</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Audit Logging</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL — Auth Forms ═══ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-[#F8F9FC] relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #3B5BFD 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />

        <div className="relative w-full max-w-md space-y-8">
          {/* Mobile Brand */}
          <div className="lg:hidden text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#3B5BFD] shadow-lg shadow-[#3B5BFD]/30">
              <span className="text-white font-display font-bold text-xl">C</span>
            </div>
            <h1 className="text-xl font-bold font-display text-[#16181D]">CRM & Operations</h1>
          </div>

          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold font-display text-[#16181D]">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-[#8A8FA3]">
              {mode === 'login'
                ? 'Sign in to access your CRM dashboard'
                : 'Get started with the CRM platform'}
            </p>
          </div>

          {/* Mode Toggle Tabs */}
          <div className="flex bg-[#EEF1FA] rounded-xl p-1">
            <button
              onClick={() => { setMode('login'); setError(''); setRegError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-white text-[#16181D] shadow-sm'
                  : 'text-[#8A8FA3] hover:text-[#16181D]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); setRegError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-white text-[#16181D] shadow-sm'
                  : 'text-[#8A8FA3] hover:text-[#16181D]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 h-11 rounded-xl border border-[#E2E5EC] bg-white text-sm font-medium text-[#16181D] hover:bg-[#F8F9FC] hover:border-[#3B5BFD]/30 transition-all duration-200"
              >
                <Globe className="w-4 h-4 text-[#4285F4]" />
                Google
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 h-11 rounded-xl border border-[#E2E5EC] bg-white text-sm font-medium text-[#16181D] hover:bg-[#F8F9FC] hover:border-[#3B5BFD]/30 transition-all duration-200"
              >
                <GitBranch className="w-4 h-4" />
                GitHub
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E2E5EC]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-[#F8F9FC] text-[#8A8FA3]">or continue with email</span>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {(error || regError) && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#EF4444] font-medium">
              <div className="w-5 h-5 rounded-full bg-[#EF4444]/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold">!</span>
              </div>
              {error || regError}
            </div>
          )}

          {/* ═══ LOGIN FORM ═══ */}
          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#8A8FA3] pl-1">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A8FA3]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="w-full h-11 rounded-xl bg-white border border-[#E2E5EC] text-[#16181D] text-sm pl-10 pr-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#3B5BFD]/30 focus:border-[#3B5BFD] placeholder-[#B0B5C3]"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-xs font-semibold text-[#8A8FA3]">Password</label>
                  <button type="button" className="text-xs text-[#3B5BFD] hover:text-[#2A4AEB] font-medium">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A8FA3]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full h-11 rounded-xl bg-white border border-[#E2E5EC] text-[#16181D] text-sm pl-10 pr-11 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#3B5BFD]/30 focus:border-[#3B5BFD] placeholder-[#B0B5C3]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8A8FA3] hover:text-[#16181D] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2 pl-1">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center ${
                    rememberMe
                      ? 'bg-[#3B5BFD] border-[#3B5BFD]'
                      : 'border-[#D1D5DB] bg-white hover:border-[#3B5BFD]/50'
                  }`}
                >
                  {rememberMe && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className="text-xs text-[#8A8FA3]">Keep me signed in</span>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#3B5BFD] text-white text-sm font-semibold hover:bg-[#2A4AEB] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#3B5BFD]/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ═══ REGISTER FORM ═══ */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#8A8FA3] pl-1">Full Name</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full h-11 rounded-xl bg-white border border-[#E2E5EC] text-[#16181D] text-sm px-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#3B5BFD]/30 focus:border-[#3B5BFD] placeholder-[#B0B5C3]"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#8A8FA3] pl-1">Work Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A8FA3]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="w-full h-11 rounded-xl bg-white border border-[#E2E5EC] text-[#16181D] text-sm pl-10 pr-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#3B5BFD]/30 focus:border-[#3B5BFD] placeholder-[#B0B5C3]"
                  />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#8A8FA3] pl-1">Role</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full h-11 rounded-xl bg-white border border-[#E2E5EC] text-[#16181D] text-sm px-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#3B5BFD]/30 focus:border-[#3B5BFD]"
                >
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Password row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#8A8FA3] pl-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                      className="w-full h-11 rounded-xl bg-white border border-[#E2E5EC] text-[#16181D] text-sm px-4 pr-10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#3B5BFD]/30 focus:border-[#3B5BFD] placeholder-[#B0B5C3]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#8A8FA3] pl-1">Confirm</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full h-11 rounded-xl bg-white border border-[#E2E5EC] text-[#16181D] text-sm px-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#3B5BFD]/30 focus:border-[#3B5BFD] placeholder-[#B0B5C3]"
                  />
                </div>
              </div>

              {/* Show password toggle */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="flex items-center gap-2 text-xs text-[#8A8FA3] hover:text-[#16181D] pl-1 transition-colors"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPassword ? 'Hide passwords' : 'Show passwords'}
              </button>

              {/* Terms */}
              <p className="text-[11px] text-[#8A8FA3] pl-1 leading-relaxed">
                By creating an account, you agree to our{' '}
                <span className="text-[#3B5BFD] font-medium cursor-pointer">Terms of Service</span>
                {' '}and{' '}
                <span className="text-[#3B5BFD] font-medium cursor-pointer">Privacy Policy</span>.
              </p>

              {/* Submit */}
              <button
                type="submit"
                disabled={regLoading}
                className="w-full h-11 rounded-xl bg-[#3B5BFD] text-white text-sm font-semibold hover:bg-[#2A4AEB] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#3B5BFD]/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {regLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ═══ DEMO ROLE QUICK LOGIN ═══ */}
          {mode === 'login' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#E2E5EC]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B0B5C3]">Quick Demo</span>
                <div className="flex-1 h-px bg-[#E2E5EC]" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {availableUsers.map((u) => {
                  const RoleIcon = ROLE_ICONS[u.role] || Shield;
                  const color = ROLE_COLORS[u.role] || '#3B5BFD';
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleDemoLogin(u.email)}
                      disabled={loading}
                      className="group relative p-3 rounded-xl border border-[#E2E5EC] bg-white hover:border-transparent hover:shadow-lg transition-all duration-300 text-center disabled:opacity-50"
                      style={{ '--role-color': color }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <RoleIcon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="text-[11px] font-semibold text-[#16181D] truncate leading-tight">
                        {u.name.split(' ')[0]}
                      </div>
                      <div
                        className="text-[9px] font-mono font-bold uppercase tracking-wider mt-0.5"
                        style={{ color }}
                      >
                        {u.role.replace(/_/g, ' ')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
