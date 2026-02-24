import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, User, Eye, EyeOff, Loader, Lock, Mail, ArrowRight, CheckCircle, Fingerprint, Sun, Moon, AlertTriangle } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useTheme } from '../ThemeContext';
import { supabase, supabaseAvailable } from '../lib/supabase';

const Login = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [role, setRole] = useState('user'); // 'user' | 'tenant'
    const [email, setEmail] = useState('client@test.com');
    const [password, setPassword] = useState('password123');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Auto-fill demo credentials for convenience
    useEffect(() => {
        if (role === 'user') setEmail('client@test.com');
        else setEmail('tenant@test.com');
    }, [role]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // ── Path A: Supabase Auth (when configured) ────────────────────
            if (supabaseAvailable) {
                const { data, error: sbError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (!sbError && data?.session) {
                    const sbUser = data.user;
                    const appUser = {
                        id: sbUser.id,
                        name: sbUser.user_metadata?.full_name || sbUser.email,
                        email: sbUser.email,
                        role,
                    };
                    localStorage.setItem('shadow_token', data.session.access_token);
                    localStorage.setItem('shadow_role', role);
                    localStorage.setItem('shadow_user', JSON.stringify(appUser));
                    navigate('/home');
                    return;
                }
                // Supabase failed — fall through to custom auth
            }

            // ── Path B: Custom /auth/login (local backend) ─────────────────
            const res = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.detail || 'Invalid email or password.');
                setLoading(false);
                return;
            }

            // Store token and user from custom auth
            localStorage.setItem('shadow_token', data.access_token);
            localStorage.setItem('shadow_role', data.user.role);
            localStorage.setItem('shadow_user', JSON.stringify(data.user));
            navigate('/home');

        } catch (err) {
            setError('Connection error. Is the server running?');
            setLoading(false);
        }
    };

    // ── Google OAuth handler ──────────────────────────────────────────────────
    const handleGoogleLogin = async (selectedRole = 'user') => {
        if (!supabaseAvailable) {
            setError('Google login requires Supabase configuration. Use email/password instead.');
            return;
        }
        setError('');
        localStorage.setItem('pending_role', selectedRole);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + '/login' },
        });
        if (error) setError(error.message);
    };

    // ── Pickup Supabase session after OAuth redirect ───────────────────────────
    useEffect(() => {
        if (!supabaseAvailable) return; // skip if no Supabase
        const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
                const sbUser = session.user;
                const assignedRole = localStorage.getItem('pending_role') || 'user';
                const appUser = {
                    id: sbUser.id,
                    name: sbUser.user_metadata?.full_name || sbUser.email,
                    email: sbUser.email,
                    role: assignedRole,
                };
                localStorage.setItem('shadow_token', session.access_token);
                localStorage.setItem('shadow_role', assignedRole);
                localStorage.setItem('shadow_user', JSON.stringify(appUser));
                localStorage.removeItem('pending_role');
                navigate('/home');
            }
        });
        return () => listener?.subscription?.unsubscribe();
    }, []);


    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10%',
            padding: '80px 5% 0',
            position: 'relative',
            background: 'var(--bg-color)',
            overflow: 'hidden',
        }}>
            {/* Background Effects */}
            <div className="spotlight" style={{ opacity: 0.4 }} />

            {/* Header */}
            {/* Header - Fixed to Top */}
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 100 }}>
                <Navbar
                    links={[
                        { label: 'Home', path: '/' },
                        { label: 'Solutions', path: '#' },
                        { label: 'About Us', path: '#' },
                        { label: 'Contact', path: '#' },
                    ]}
                    rightContent={
                        <button
                            onClick={() => navigate('/signup')}
                            style={{
                                padding: '0.7rem 1.75rem', borderRadius: '3rem', border: '1px solid var(--nav-border)',
                                background: 'var(--glass-bg)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.9rem',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            Create Account
                        </button>
                    }
                />
            </div>
            {/* Left Side: Login Form Container */}
            <div style={{
                width: '100%',
                maxWidth: '480px', // Matched to signup form
                zIndex: 2,
            }} className="animate-fade-in">
                <div className="glass-card" style={{ padding: '2.5rem' }}>
                    <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem', color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                            Welcome back
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500 }}>
                            Sign in to your secure KYC portal
                        </p>
                    </div>

                    {/* Role Toggle for Email/Password login */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                        background: 'var(--input-bg)',
                        borderRadius: '1rem', padding: '6px',
                        marginBottom: '2rem', border: '1px solid var(--nav-border)',
                    }}>
                        {[
                            { id: 'user', label: 'Client', icon: <User size={16} /> },
                            { id: 'tenant', label: 'Officer', icon: <Shield size={16} /> },
                        ].map(r => (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => setRole(r.id)}
                                style={{
                                    padding: '0.75rem 0.5rem',
                                    borderRadius: '0.75rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    background: role === r.id ? 'var(--accent)' : 'transparent',
                                    color: role === r.id ? 'white' : 'var(--text-muted)',
                                    boxShadow: role === r.id ? '0 4px 12px rgba(124, 58, 237, 0.2)' : 'none',
                                }}
                            >
                                {r.icon} {r.label}
                            </button>
                        ))}
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} style={{ display: 'grid', gap: '1.5rem' }}>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', display: 'block', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>
                                Email Address
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    className="glass-input"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    style={{ paddingLeft: '3.5rem', height: '54px', fontSize: '0.95rem' }}
                                />
                            </div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>
                                    Password
                                </label>
                                <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>
                                    Forgot?
                                </Link>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    className="glass-input"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    style={{ paddingLeft: '3.5rem', paddingRight: '3.5rem', height: '54px', fontSize: '0.95rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0,
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '1rem', padding: '1rem',
                                color: '#ef4444', fontSize: '0.85rem', fontWeight: 700,
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                animation: 'shake 0.4s ease-in-out'
                            }}>
                                <AlertTriangle size={18} />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{
                                width: '100%',
                                height: '54px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                                opacity: loading ? 0.8 : 1,
                                fontSize: '1rem',
                                fontWeight: 800,
                            }}
                        >
                            {loading ? (
                                <><div className="loader" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Signing in...</>
                            ) : (
                                <>Sign In <ArrowRight size={20} /></>
                            )}
                        </button>
                    </form>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', margin: '1.5rem 0' }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--nav-border)' }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700 }}>ACCOUNT</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--nav-border)' }} />
                    </div>

                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 600 }}>
                        New to SHADOW? <Link to="/signup" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 800 }}>Create an account</Link>
                    </p>
                </div>

                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2.5rem', fontWeight: 600, letterSpacing: '0.02em', opacity: 0.7 }}>
                    ESTABLISHED 2026 · SHADOW INTEGRITY · v2.5.0
                </p>
            </div>

            {/* Right Side: Animated Visual Section */}
            <div className="visual-section" style={{
                flex: '0 1 600px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                perspective: '1200px',
            }}>
                {/* Digital Background Grid */}
                <div style={{
                    position: 'absolute', width: '150%', height: '150%',
                    backgroundImage: `linear-gradient(var(--nav-border) 1px, transparent 1px), linear-gradient(90deg, var(--nav-border) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px',
                    opacity: 0.1,
                    transform: 'rotateX(60deg) translateY(-20%)',
                    zIndex: 0,
                    maskImage: 'radial-gradient(circle, black, transparent 80%)'
                }} />

                {/* Floating "SHADOW" Text */}
                <div style={{
                    position: 'absolute', top: '5%', right: '0',
                    fontSize: '12rem', fontWeight: 900,
                    opacity: 0.04, color: 'var(--accent)',
                    userSelect: 'none', transform: 'translateZ(-100px)'
                }}>SHADOW</div>

                {/* The "Identity Nexus" - A 3D Floating Interactive Core */}
                <div style={{
                    position: 'relative',
                    width: '400px',
                    height: '500px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transformStyle: 'preserve-3d',
                    animation: 'float3D 8s infinite ease-in-out',
                }}>
                    {/* Glowing Aura Rings */}
                    {[...Array(3)].map((_, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            width: `${300 + i * 80}px`,
                            height: `${300 + i * 80}px`,
                            border: `1px solid ${i === 0 ? 'var(--accent)' : 'var(--nav-border)'}`,
                            borderRadius: '50%',
                            opacity: 0.3 - i * 0.1,
                            transform: `rotateX(75deg) rotateY(${i * 30}deg)`,
                            animation: `spinPulse ${10 + i * 5}s infinite linear`,
                        }} />
                    ))}

                    {/* Central Identity Card (Holographic) */}
                    <div style={{
                        width: '300px', height: '420px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(30px)',
                        borderRadius: '2.5rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 50px 100px -20px rgba(0,0,0,0.4), inset 0 0 40px rgba(255, 193, 7, 0.05)',
                        position: 'relative',
                        zIndex: 10,
                        padding: '2.5rem',
                        overflow: 'hidden',
                        transform: 'translateZ(50px)',
                    }}>
                        {/* Dynamic Scanning Matrix */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: `radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.05) 0%, transparent 70%)`,
                        }} />

                        {/* Scanning Laser Beam */}
                        <div style={{
                            position: 'absolute', left: 0, width: '100%', height: '3px',
                            background: 'linear-gradient(90deg, transparent, #FFC107, transparent)',
                            boxShadow: '0 0 20px #FFC107',
                            animation: 'scanVertical 3s infinite ease-in-out',
                            zIndex: 15
                        }} />

                        {/* Top ID Elements */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {[1, 2, 3].map(i => <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)', opacity: 0.6 + (i * 0.1) }} />)}
                            </div>
                            <Shield size={20} color="#FFC107" style={{ opacity: 0.8 }} />
                        </div>

                        {/* Portrait Mockup */}
                        <div style={{
                            width: '120px', height: '120px',
                            borderRadius: '1.5rem',
                            background: 'var(--input-bg)',
                            border: '1px solid var(--nav-border)',
                            margin: '0 auto 2.5rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative'
                        }}>
                            <User size={64} color="var(--text-muted)" style={{ opacity: 0.3 }} />
                            {/* Scanning points */}
                            <div className="dot" style={{ position: 'absolute', top: '20%', left: '30%', width: '3px', height: '3px', background: '#FFC107', borderRadius: '50%' }} />
                            <div className="dot" style={{ position: 'absolute', bottom: '25%', right: '25%', width: '3px', height: '3px', background: '#FFC107', borderRadius: '50%' }} />
                        </div>

                        {/* Biometric Data Bars */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {[
                                { label: 'FACIAL_TEXTURE', val: 98 },
                                { label: 'LIVENESS_INDEX', val: 99 },
                                { label: 'ENTITY_TRUST', val: 87 }
                            ].map((item, idx) => (
                                <div key={idx}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{item.label}</span>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: item.val > 90 ? '#10B981' : 'var(--accent)' }}>{item.val}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '4px', background: 'var(--nav-border)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ width: `${item.val}%`, height: '100%', background: `linear-gradient(90deg, var(--accent), #FFC107)`, animation: `revealWidth 1.5s ease-out ${idx * 0.2}s forwards` }} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Status Badge */}
                        <div style={{
                            marginTop: '2.5rem', padding: '0.8rem',
                            background: 'rgba(16, 185, 129, 0.05)',
                            border: '1px solid rgba(16, 185, 129, 0.1)',
                            borderRadius: '1rem',
                            display: 'flex', alignItems: 'center', gap: '0.8rem'
                        }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981' }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#10B981', letterSpacing: '0.05em' }}>INTEGRITY VERIFIED</span>
                        </div>
                    </div>

                    {/* Orbital Data Nodes (Floating 3D) */}
                    {[
                        { icon: <Lock size={18} />, label: 'ENCRYPTION', color: '#3B82F6', delay: '0s', pos: { top: '10%', left: '-15%' } },
                        { icon: <Fingerprint size={18} />, label: 'BIOMETRICS', color: '#FFC107', delay: '2s', pos: { top: '40%', right: '-20%' } },
                        { icon: <Shield size={18} />, label: 'SHADOW_GATE', color: '#8B5CF6', delay: '4s', pos: { bottom: '15%', left: '-10%' } }
                    ].map((node, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            ...node.pos,
                            padding: '0.75rem 1rem',
                            background: 'var(--glass-bg)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid var(--nav-border)',
                            borderRadius: '0.75rem',
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            animation: `floatNode 6s infinite ease-in-out ${node.delay}`,
                            zIndex: 20,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                            transformStyle: 'preserve-3d',
                            transform: 'translateZ(80px)'
                        }}>
                            <div style={{ color: node.color }}>{node.icon}</div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '0.02em' }}>{node.label}</span>
                        </div>
                    ))}
                </div>

                {/* Tagline */}
                <div style={{ width: '100%', maxWidth: '440px', textAlign: 'center', padding: '0 1rem', zIndex: 10, marginTop: '2rem', transform: 'translateY(20px)' }}>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.75rem', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                        Neural Trust Protocol
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '1rem', fontWeight: 500, opacity: 0.8 }}>
                        Zero-trust biometric verification executing in a hardened enclave environment.
                    </p>
                </div>
            </div>

            {/* Optimized Animations */}
            <style>{`
@keyframes float3D {
    0%, 100% { transform: translateY(0) rotateX(5deg) rotateY(-5deg); }
    50% { transform: translateY(-20px) rotateX(-5deg) rotateY(10deg); }
}
@keyframes scanVertical {
    0%, 100% { top: 10%; opacity: 0; }
    50% { top: 90%; opacity: 1; }
}
@keyframes floatNode {
    0%, 100% { transform: translateY(0) translateZ(80px); }
    50% { transform: translateY(-15px) translateZ(100px); }
}
@keyframes spinPulse {
                    from { transform: rotateX(75deg) rotateZ(0deg); }
                    to { transform: rotateX(75deg) rotateZ(360deg); }
}
@keyframes revealWidth {
                    from { width: 0%; }
}
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}
@media(max-width: 1024px) {
    .visual-section { display: none !important; }
    div[style*="maxWidth: 480px"] { margin: 0 auto !important; }
    header { padding: 0 2rem !important; }
}
`}</style>
        </div>
    );
};

export default Login;
