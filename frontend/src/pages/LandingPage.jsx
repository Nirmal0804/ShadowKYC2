import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Smartphone, Fingerprint, User, BarChart, CheckCircle, ArrowRight, Sun, Moon } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useTheme } from '../ThemeContext';

const LandingPage = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-color)',
            position: 'relative',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            overflowX: 'hidden',
            color: 'var(--text-main)',
        }}>
            {/* Background Blobs */}
            <div style={{
                position: 'absolute', top: '-10%', left: '-5%',
                width: '50vw', height: '50vw',
                background: '#F3F4F6', borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
                zIndex: 0, opacity: 0.7
            }} />
            <div style={{
                position: 'absolute', bottom: '-10%', left: '-10%',
                width: '40vw', height: '40vw',
                background: '#F3F4F6', borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                zIndex: 0, opacity: 0.7
            }} />
            <div style={{
                position: 'absolute', top: 0, right: 0,
                width: '30vw', height: '60vh',
                background: '#F8FAFC', borderRadius: '0 0 0 100%',
                zIndex: 0
            }} />

            {/* Navigation */}
            {/* Navigation - Fixed */}
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 100 }}>
                <Navbar
                    links={[
                        { label: 'Home', path: '#' },
                        { label: 'Solutions', path: '#' },
                        { label: 'About Us', path: '#' },
                        { label: 'Contact', path: '#' },
                    ]}
                    rightContent={
                        <button
                            onClick={() => navigate('/login')}
                            style={{
                                padding: '0.75rem 1.75rem', borderRadius: '3rem', border: '1px solid var(--nav-border)',
                                background: 'var(--glass-bg)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.95rem',
                                cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s'
                            }}
                        >
                            Login / Sign Up
                        </button>
                    }
                />
            </div>

            {/* Hero Section */}
            <main style={{
                display: 'grid', gridTemplateColumns: '45% 55%',
                padding: '4rem 4rem', minHeight: 'calc(100vh - 100px)',
                position: 'relative', zIndex: 1
            }}>
                {/* Left: Text */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '2rem' }}>
                    <h1 style={{
                        fontSize: '5rem', fontWeight: 800, lineHeight: 1,
                        color: '#1E293B', marginBottom: '1.5rem', letterSpacing: '-2px'
                    }}>
                        KYC <br />
                        <span style={{ fontSize: '2.5rem', fontWeight: 600, color: '#64748B', letterSpacing: 'normal' }}>Intelligence Layer</span>
                    </h1>
                    <p style={{
                        fontSize: '1.1rem', color: '#64748B', lineHeight: 1.6, marginBottom: '2.5rem',
                        maxWidth: '500px'
                    }}>
                        Advanced identity verification powered by real-time forensic analysis.
                        Detect deepfakes, verify liveness, and secure your platform with
                        banking-grade compliance infrastructure.
                    </p>
                    <button
                        onClick={() => navigate('/signup')}
                        className="btn-primary"
                        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2.5rem', fontSize: '1rem' }}
                    >
                        GET STARTED <ArrowRight size={18} />
                    </button>
                </div>

                {/* Right: Illustration Composition */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4rem' }}>

                    {/* Main Phone Frame */}
                    <div style={{
                        width: '280px', height: '540px', background: 'white',
                        borderRadius: '40px', border: '8px solid #E2E8F0',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                        position: 'relative', zIndex: 5, display: 'flex', flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        {/* Notch */}
                        <div style={{ width: '40%', height: '25px', background: '#E2E8F0', borderRadius: '0 0 15px 15px', alignSelf: 'center', position: 'absolute', top: 0, zIndex: 10 }} />

                        {/* Screen Content */}
                        <div style={{ padding: '40px 20px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                            <div style={{ width: '100%', height: '140px', borderRadius: '20px', background: '#F8FAFC', border: '2px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={64} color="#CBD5E1" />
                            </div>

                            {/* Scanning Ring */}
                            <div style={{
                                position: 'absolute', top: '90px',
                                width: '160px', height: '160px', borderRadius: '50%',
                                border: '4px solid #FFC107',
                                boxShadow: '0 0 20px rgba(255, 193, 7, 0.4)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <div style={{ width: '100%', height: '2px', background: '#FFC107', animation: 'scan 2s infinite ease-in-out' }} />
                            </div>

                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ height: '12px', width: '60%', background: '#F1F5F9', borderRadius: '6px' }} />
                                <div style={{ height: '12px', width: '80%', background: '#F1F5F9', borderRadius: '6px' }} />
                            </div>

                            <div style={{
                                marginTop: 'auto', width: '80px', height: '80px',
                                borderRadius: '50%', background: 'rgba(255, 193, 7, 0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Fingerprint size={40} color="#FFC107" />
                            </div>
                        </div>
                    </div>

                    {/* Floating Shield (Security) */}
                    <div style={{
                        position: 'absolute', right: '10%', top: '20%',
                        background: 'white', padding: '1.5rem', borderRadius: '20px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                        animation: 'float 3s ease-in-out infinite'
                    }}>
                        <Shield size={40} color="#7C3AED" fill="#7C3AED" fillOpacity={0.2} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B' }}>Secure</span>
                    </div>

                    {/* Floating Chart (Analytics) */}
                    <div style={{
                        position: 'absolute', left: '5%', top: '15%',
                        background: 'white', padding: '1rem', borderRadius: '15px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                        animation: 'float 4s ease-in-out infinite 1s'
                    }}>
                        <BarChart size={32} color="#10B981" />
                    </div>

                    {/* Floating Coins (Finance) */}
                    <div style={{
                        position: 'absolute', right: '15%', bottom: '15%',
                        display: 'flex', alignItems: 'flex-end', gap: '5px'
                    }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#F59E0B', boxShadow: 'inset -2px -2px 0 rgba(0,0,0,0.1)' }} />
                        <div style={{ width: '30px', height: '45px', borderRadius: '15px/50%', background: '#F59E0B', boxShadow: 'inset -2px -2px 0 rgba(0,0,0,0.1)' }} />
                        <div style={{ width: '30px', height: '20px', borderRadius: '50%', background: '#FCD34D', boxShadow: 'inset -2px -2px 0 rgba(0,0,0,0.1)' }} />
                    </div>

                    {/* Person Element (Left) */}
                    <div style={{
                        position: 'absolute', left: '0%', bottom: '10%',
                        background: '#F8FAFC', padding: '1rem', borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        zIndex: 4
                    }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E2E8F0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={24} color="#94A3B8" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B' }}>Identity Verified</div>
                            <div style={{ fontSize: '0.7rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={10} /> Complete
                            </div>
                        </div>
                    </div>

                </div>
            </main>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-15px); }
                }
                @keyframes scan {
                    0% { transform: translateY(-70px); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(70px); opacity: 0; }
                }
                .nav-item:hover { color: #FFC107 !important; }
            `}</style>
        </div>
    );
};

export default LandingPage;
