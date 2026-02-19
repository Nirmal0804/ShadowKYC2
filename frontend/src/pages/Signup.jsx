import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Shield, User, Lock, Mail, Building, ArrowRight, Fingerprint, CheckCircle, Sun, Moon } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useTheme } from '../ThemeContext';

const Signup = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [role, setRole] = useState('user');
    const [step, setStep] = useState(1); // 1 = form, 2 = success
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        organization: '', // for tenant
    });

    const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (form.password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    role,
                    organization: form.organization || null,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.detail || 'Signup failed. Please try again.');
                setLoading(false);
                return;
            }

            setStep(2); // Show success screen
        } catch (err) {
            setError('Connection error. Is the server running?');
            setLoading(false);
        }
    };

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
                            onClick={() => navigate('/login')}
                            style={{
                                padding: '0.7rem 1.75rem', borderRadius: '3rem', border: '1px solid var(--nav-border)',
                                background: 'var(--glass-bg)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.9rem',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            Sign In
                        </button>
                    }
                />
            </div>

            {/* Left Side: Animated Visual Section */}
            <div style={{
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
                    position: 'absolute', top: '5%', left: '0',
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
                            <div className="dot" style={{ position: 'absolute', top: '20%', left: '30%', width: '3px', height: '3px', background: '#FFC107', borderRadius: '50%' }} />
                            <div className="dot" style={{ position: 'absolute', bottom: '25%', right: '25%', width: '3px', height: '3px', background: '#FFC107', borderRadius: '50%' }} />
                        </div>

                        {/* Biometric Data Bars */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {[
                                { label: 'ENROLLMENT_READY', val: 0 },
                                { label: 'SECURITY_HARDENING', val: 100 },
                                { label: 'NETWORK_LATENCY', val: 15 }
                            ].map((item, idx) => (
                                <div key={idx}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{item.label}</span>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent)' }}>{item.val}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '4px', background: 'var(--nav-border)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ width: `${item.val}%`, height: '100%', background: `linear-gradient(90deg, var(--accent), #FFC107)` }} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Status Badge */}
                        <div style={{
                            marginTop: '2.5rem', padding: '0.8rem',
                            background: 'rgba(124, 58, 237, 0.05)',
                            border: '1px solid rgba(124, 58, 237, 0.1)',
                            borderRadius: '1rem',
                            display: 'flex', alignItems: 'center', gap: '0.8rem'
                        }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--accent)', letterSpacing: '0.05em' }}>WAITING FOR ENROLLMENT</span>
                        </div>
                    </div>

                    {/* Orbital Data Nodes (Floating 3D) */}
                    {[
                        { icon: <Lock size={18} />, label: 'GATEWAY_SECURE', color: '#3B82F6', delay: '0s', pos: { top: '10%', left: '-15%' } },
                        { icon: <Fingerprint size={18} />, label: 'ENROLL_ID', color: '#FFC107', delay: '2s', pos: { top: '40%', right: '-20%' } },
                        { icon: <Shield size={18} />, label: 'PROTOCAL_A7', color: '#8B5CF6', delay: '4s', pos: { bottom: '15%', left: '-10%' } }
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
                        Join the Integrity Layer
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '1rem', fontWeight: 500, opacity: 0.8 }}>
                        Initialize your identity inside SHADOW's decentralized forensic perimeter.
                    </p>
                </div>
            </div>

            {/* Right Side: Signup Form Container */}
            <div style={{
                width: '100%',
                maxWidth: '480px',
                zIndex: 2,
            }} className="animate-fade-in">

                {/* Success State */}
                {step === 2 ? (
                    <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'rgba(255, 193, 7, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                            border: '1px solid rgba(255, 193, 7, 0.4)',
                        }}>
                            <CheckCircle size={40} color="#FFC107" />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                            Account Created!
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                            Your {role === 'tenant' ? 'Bank Officer' : 'Client'} account has been set up successfully.
                        </p>
                        <Link to="/login" style={{ textDecoration: 'none' }}>
                            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                                Proceed to Login <ArrowRight size={20} />
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className="glass-card" style={{ padding: '2.5rem' }}>
                        <center><h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem', color: 'var(--text-main)', letterSpacing: '-0.03em' }}>Create Account</h2></center>
                        <center><p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem', fontWeight: 500 }}>
                            Join the SHADOW KYC Network
                        </p></center>

                        {/* Role Toggle */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr',
                            background: 'var(--input-bg)',
                            borderRadius: '1rem', padding: '6px',
                            marginBottom: '1.5rem', border: '1px solid var(--nav-border)',
                        }}>
                            {[
                                { id: 'user', label: 'Client', icon: <User size={14} /> },
                                { id: 'tenant', label: 'Bank Officer', icon: <Shield size={14} /> },
                            ].map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => setRole(r.id)}
                                    style={{
                                        padding: '0.6rem 0.5rem',
                                        borderRadius: '0.75rem',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        transition: 'all 0.3s',
                                        background: role === r.id ? 'var(--accent)' : 'transparent',
                                        color: role === r.id ? 'white' : 'var(--text-muted)',
                                        boxShadow: role === r.id ? '0 4px 12px rgba(124, 58, 237, 0.2)' : 'none',
                                    }}
                                >
                                    {r.icon} {r.label}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSignup} style={{ display: 'grid', gap: '1rem' }}>
                            {/* Name */}
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Full Name</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        className="glass-input"
                                        value={form.name}
                                        onChange={update('name')}
                                        placeholder="John Doe"
                                        required
                                        style={{ paddingLeft: '3rem', height: '48px' }}
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        className="glass-input"
                                        type="email"
                                        value={form.email}
                                        onChange={update('email')}
                                        placeholder="you@example.com"
                                        required
                                        style={{ paddingLeft: '3rem', height: '48px' }}
                                    />
                                </div>
                            </div>

                            {/* Organization (Tenant Only) */}
                            {role === 'tenant' && (
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Organization</label>
                                    <div style={{ position: 'relative' }}>
                                        <Building size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            className="glass-input"
                                            value={form.organization}
                                            onChange={update('organization')}
                                            placeholder="Bank Name / FinTech Co."
                                            required
                                            style={{ paddingLeft: '3rem', height: '48px' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Password */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            className="glass-input"
                                            type={showPassword ? 'text' : 'password'}
                                            value={form.password}
                                            onChange={update('password')}
                                            placeholder="••••••••"
                                            required
                                            style={{ paddingLeft: '2.5rem', paddingRight: '2rem', height: '48px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                                                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0
                                            }}
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Confirm</label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            className="glass-input"
                                            type={showConfirm ? 'text' : 'password'}
                                            value={form.confirmPassword}
                                            onChange={update('confirmPassword')}
                                            placeholder="••••••••"
                                            required
                                            style={{ paddingLeft: '2.5rem', paddingRight: '2rem', height: '48px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            style={{
                                                position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                                                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0
                                            }}
                                        >
                                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Password Strength Visual */}
                            {form.password && (
                                <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '4px' }}>
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} style={{
                                            flex: 1, height: '4px', borderRadius: '2px',
                                            background: form.password.length >= i * 3
                                                ? (i <= 2 ? '#FFC107' : '#10b981')
                                                : 'var(--nav-border)',
                                            transition: 'background 0.3s',
                                        }} />
                                    ))}
                                </div>
                            )}

                            {error && (
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                                    borderRadius: '0.75rem', padding: '0.75rem 1rem',
                                    color: '#ef4444', fontSize: '0.85rem', fontWeight: 700
                                }}>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={loading}
                                style={{
                                    width: '100%', height: '52px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                                    opacity: loading ? 0.7 : 1, fontSize: '1rem', fontWeight: 800
                                }}
                            >
                                {loading ? (
                                    <><div className="loader" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Creating Account...</>
                                ) : (
                                    <>Sign Up <ArrowRight size={20} /></>
                                )}
                            </button>
                        </form>

                        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>Already have an account? </span>
                            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 800, textDecoration: 'none', fontSize: '0.95rem' }}>
                                Sign In
                            </Link>
                        </div>
                    </div>
                )}
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
                @media (max-width: 1024px) {
                    div[style*="flex: 0 1 600px"] { display: none !important; }
                    div[style*="maxWidth: 480px"] { margin: 0 auto !important; }
                    header { padding: 0 2rem !important; }
                }
            `}</style>
        </div>
    );
};

export default Signup;
