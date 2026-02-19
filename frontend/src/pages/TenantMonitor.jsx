import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { Shield, AlertTriangle, Monitor, Activity, Eye, Globe, Copy, CheckCircle, LogOut, Wifi, WifiOff, User, X, LayoutDashboard, BarChart2, Video, FileText, Settings, ShieldCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import IntegrityGrid from '../components/IntegrityGrid';
import { useTheme } from '../ThemeContext';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const TenantMonitor = () => {
    const { theme, toggleTheme } = useTheme();
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const wsRef = useRef(null);

    const [wsConnected, setWsConnected] = useState(false);
    const [clientConnected, setClientConnected] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const [frameData, setFrameData] = useState({ liveness: 0, face_match: 0, texture: 0, geometry: 0, lipsync: 0, environment: 0, risk: 0, flags: [], top_reasons: [], recommendation: '' });
    const [sessionStats, setSessionStats] = useState({ avg_risk: 0, risk_pct: 0, classification: 'WAITING', flagged_count: 0, layer_averages: {} });
    const [evidence, setEvidence] = useState([]);
    const [sessionEnded, setSessionEnded] = useState(false);

    const user = JSON.parse(localStorage.getItem('shadow_user') || '{}');
    const role = localStorage.getItem('shadow_role') || 'tenant';

    const logout = () => {
        localStorage.removeItem('shadow_token');
        localStorage.removeItem('shadow_role');
        localStorage.removeItem('shadow_user');
        navigate('/login');
    };

    useEffect(() => {
        if (!sessionId) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(`${protocol}//${window.location.host}/ws/session/${sessionId}/tenant`);

        socket.onopen = () => {
            console.log('Tenant connected to session:', sessionId);
            setWsConnected(true);
        };

        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);

            if (message.type === 'results') {
                const { frame, session, image } = message;
                setClientConnected(true);
                setFrameData(frame || {});
                setSessionStats(session || {});

                if (frame?.evidence_path) {
                    setEvidence(prev => [
                        { path: frame.evidence_path, risk: frame.risk, flag: frame.flags?.[0] || 'Anomaly', timestamp: frame.timestamp },
                        ...prev.slice(0, 19), // Keep last 20
                    ]);
                }

                // Draw remote frame on canvas
                if (image && canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d');
                    const img = new Image();
                    img.onload = () => {
                        if (canvasRef.current) {
                            canvasRef.current.width = img.width;
                            canvasRef.current.height = img.height;
                            ctx.drawImage(img, 0, 0);
                        }
                    };
                    img.src = image;
                }
            } else if (message.type === 'client_joined') {
                setClientConnected(true);
            } else if (message.type === 'client_left') {
                setClientConnected(false);
            } else if (message.type === 'report') {
                setSessionEnded(true);
            }
        };

        socket.onclose = () => setWsConnected(false);
        wsRef.current = socket;

        return () => socket.close();
    }, [sessionId]);

    const copyCode = () => {
        navigator.clipboard.writeText(sessionId);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
    };

    const endSession = (status = 'ENDED') => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'end_session', status }));
        }
        setSessionEnded(true);
    };

    const approveSession = () => endSession('APPROVED');
    const rejectSession = () => endSession('REJECTED');

    const la = sessionStats.layer_averages || {};
    const radarData = {
        labels: ['L1 Liveness', 'L2 Face Match', 'L3 Texture', 'L4 Geometry', 'L5 Lip-Sync', 'L6 Environment'],
        datasets: [{
            label: 'Integrity Score',
            data: [
                (frameData.liveness || la.l1_liveness || 0) * 100,
                (frameData.face_match || la.l2_face_match || 0) * 100,
                (frameData.texture || la.l3_texture || 0) * 100,
                (frameData.geometry || la.l4_geometry || 0) * 100,
                (frameData.lipsync || la.l5_lipsync || 0) * 100,
                (frameData.environment || la.l6_environment || 0) * 100,
            ],
            backgroundColor: 'rgba(255, 193, 7, 0.15)',
            borderColor: '#FFC107',
            borderWidth: 2,
            pointBackgroundColor: '#1A1A1A',
            pointBorderColor: '#FFC107',
        }]
    };

    const radarOptions = {
        scales: {
            r: {
                angleLines: { color: 'rgba(0, 0, 0, 0.05)' },
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                pointLabels: { color: 'var(--text-secondary)', font: { size: 10, weight: 600 } },
                ticks: { display: false, max: 100, min: 0 },
            }
        },
        plugins: { legend: { display: false } },
        animation: { duration: 300 },
    };

    const riskScore = sessionStats.risk_pct || Math.round((sessionStats.avg_risk || 0) * 100);
    const riskColor = riskScore > 65 ? '#ef4444' : riskScore > 35 ? '#f59e0b' : '#5F5449';
    const riskLabel = riskScore > 65 ? 'HIGH RISK' : riskScore > 35 ? 'MODERATE' : 'CLEAR';
    const recommendation = frameData.recommendation || sessionStats.recommendation || '';


    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            backgroundColor: 'var(--bg-color)',
            color: 'var(--text-main)',
            backgroundImage: 'url(/tenant_bg.png)',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center center',
            backgroundAttachment: 'fixed',
            backgroundSize: 'cover',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background Effects */}
            <div className="spotlight" style={{ opacity: 0.5 }} />
            <div className="spotlight" style={{ top: 'auto', bottom: '-20vw', left: '-10vw', right: 'auto', width: '80vw', height: '80vw', animationDelay: '1s', opacity: 0.3 }} />

            {/* Dashboard Layout Components */}
            {/* Navbar */}
            <Navbar
                user={user}
                role={role}
                onLogout={logout}
                links={[
                    { label: 'Dashboard', path: '/home' },
                    { label: 'Session Monitor', path: '#', active: true },
                    { label: 'History', path: '/history' },
                ]}
            />

            <div style={{
                flex: 1,
                marginTop: '80px',
                minHeight: 'calc(100vh - 80px)',
                position: 'relative',
                zIndex: 1,
                padding: '1.5rem',
                overflowY: 'auto',
                maxWidth: '1400px',
                margin: '80px auto 0',
                width: '100%'
            }}>

                {/* Session Code Banner */}
                <div className="glass-card" style={{
                    padding: '1.25rem 2rem',
                    marginBottom: '1.5rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: '1rem',
                }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                            Share this code with the client
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{
                                fontSize: '2.5rem', fontWeight: 900, letterSpacing: '2px',
                                color: 'var(--text-main)', fontFamily: 'monospace',
                            }}>
                                {sessionId}
                            </span>
                            <button onClick={copyCode} style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                background: codeCopied ? 'rgba(95, 84, 73, 0.1)' : 'rgba(99,102,241,0.1)',
                                border: 'none',
                                borderRadius: '0.5rem', padding: '0.5rem 1rem',
                                color: codeCopied ? '#5F5449' : '#6366f1',
                                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
                                transition: 'all 0.2s',
                            }}>
                                {codeCopied ? <><CheckCircle size={16} /> Copied!</> : <><Copy size={16} /> Copy Code</>}
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{
                            background: 'white', borderRadius: '1rem', padding: '0.75rem 1.5rem', textAlign: 'center', border: '1px solid rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: riskColor }}>{riskScore}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Risk Score</div>
                        </div>
                        <div style={{
                            background: 'white', borderRadius: '1rem', padding: '0.75rem 1.5rem', textAlign: 'center', border: '1px solid rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: riskColor }}>{riskLabel}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Status</div>
                        </div>
                        <div style={{
                            background: 'white', borderRadius: '1rem', padding: '0.75rem 1.5rem', textAlign: 'center', border: '1px solid rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{sessionStats.flagged_count || 0}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Flags</div>
                        </div>
                    </div>
                </div>

                {/* Main Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 400px', gap: '1.5rem' }}>

                    {/* Left: Video Feed */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{
                            position: 'relative', background: '#0f172a',
                            borderRadius: '1.5rem', overflow: 'hidden',
                            aspectRatio: '16/9',
                            border: '4px solid rgba(0,0,0,0.1)',
                            boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)',
                        }}>
                            <div style={{ width: '100%', height: '100%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>

                            {/* HUD Overlay */}
                            {clientConnected && (
                                <div style={{
                                    position: 'absolute', top: '1.5rem', left: '1.5rem',
                                    display: 'flex', flexDirection: 'column', gap: '0.5rem',
                                }}>
                                    {[
                                        { icon: <Eye size={14} />, label: 'Quality', val: frameData.quality, color: frameData.quality > 0.7 ? '#ffffff' : '#f59e0b' },
                                        { icon: <Activity size={14} />, label: 'Liveness', val: frameData.liveness, color: '#ffffff' },
                                        { icon: <Monitor size={14} />, label: 'Artifacts', val: frameData.artifact, color: frameData.artifact > 0.5 ? '#ef4444' : '#ffffff' },
                                    ].map(m => (
                                        <div key={m.label} style={{
                                            background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)',
                                            padding: '0.4rem 0.8rem', borderRadius: '2rem',
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            fontSize: '0.75rem', fontWeight: 700, color: 'white',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            <span style={{ color: m.color }}>{m.icon}</span> {m.label}: {Math.round((m.val || 0) * 100)}%
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* LIVE badge */}
                            {clientConnected && (
                                <div style={{
                                    position: 'absolute', top: '1.5rem', right: '1.5rem',
                                    background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)',
                                    padding: '0.4rem 0.9rem', borderRadius: '2rem',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <div style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', animation: 'pulse 1.2s infinite' }} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444' }}>LIVE</span>
                                </div>
                            )}

                            {/* Waiting overlay */}
                            {!clientConnected && (
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(5px)',
                                    gap: '1rem',
                                }}>
                                    <div style={{
                                        width: '80px', height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                                        animation: 'pulse 2s ease-in-out infinite'
                                    }}>
                                        <Monitor size={32} color="rgba(255,255,255,0.5)" />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>Waiting for client to join...</p>
                                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                                            Share code <strong style={{ color: '#5F5449', background: 'rgba(95, 84, 73, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(95, 84, 73, 0.3)' }}>{sessionId}</strong> with the user
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Session Ended overlay */}
                            {sessionEnded && (
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(95, 84, 73, 0.95)', backdropFilter: 'blur(10px)',
                                    gap: '1.5rem',
                                }}>
                                    <div style={{
                                        width: '80px', height: '80px', background: 'white', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                                    }}>
                                        <CheckCircle size={40} color="#5F5449" />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>Session Ended</h3>
                                        <p style={{ color: 'white', fontWeight: 500, opacity: 0.9 }}>
                                            Final Risk Score: <strong style={{ color: 'white', fontSize: '1.1rem' }}>{riskScore}</strong>
                                        </p>
                                    </div>
                                    <button onClick={() => navigate('/home')} style={{
                                        padding: '0.75rem 2rem', background: 'white', color: '#5F5449', border: 'none',
                                        borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer'
                                    }}>
                                        Back to Dashboard
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Integrity Grid (New Detailed Cards) */}
                        <IntegrityGrid frameData={frameData} layerAverages={sessionStats.layer_averages} />
                    </div>

                    {/* Right: Metrics Panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Session Controls */}
                        {!sessionEnded && (
                            <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, margin: 0 }}>
                                    Session Actions
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <button
                                        onClick={approveSession}
                                        style={{
                                            padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #10B981',
                                            background: 'rgba(16, 185, 129, 0.1)', color: '#10B981',
                                            fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                                    >
                                        <CheckCircle size={18} /> Approve
                                    </button>
                                    <button
                                        onClick={rejectSession}
                                        style={{
                                            padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #ef4444',
                                            background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                            fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                    >
                                        <X size={18} /> Reject
                                    </button>
                                </div>
                                <button
                                    onClick={() => endSession('ENDED')}
                                    style={{
                                        padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--nav-border)',
                                        background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)',
                                        fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                                >
                                    <LogOut size={16} /> End Session
                                </button>
                            </div>
                        )}

                        {/* Radar Chart */}
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                                Layer Integrity
                            </h3>
                            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Radar data={radarData} options={radarOptions} />
                            </div>
                        </div>

                        {/* Risk Meter */}
                        <div className="glass-card" style={{
                            padding: '1.5rem',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                        }}>
                            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', alignSelf: 'flex-start', fontWeight: 700 }}>
                                Real-time Risk
                            </h3>
                            <div style={{ position: 'relative', width: '140px', height: '140px' }}>
                                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="2.5" />
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke={riskColor}
                                        strokeWidth="2.5" strokeDasharray={`${riskScore}, 100`}
                                        style={{ transition: 'stroke-dasharray 0.5s ease' }}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>{riskScore}</span>
                                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>RISK SCORE</span>
                                </div>
                            </div>
                            <div style={{
                                marginTop: '1rem', padding: '0.4rem 1rem',
                                background: riskScore > 65 ? 'rgba(239, 68, 68, 0.2)' : riskScore > 35 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(95, 84, 73, 0.2)',
                                border: '1px solid ' + (riskScore > 65 ? 'rgba(239, 68, 68, 0.4)' : riskScore > 35 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(95, 84, 73, 0.4)'),
                                borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 700, color: riskColor,
                            }}>
                                {riskLabel}
                            </div>
                            {recommendation && (
                                <div style={{
                                    marginTop: '1rem', padding: '0.75rem', width: '100%',
                                    background: 'rgba(0,0,0,0.03)',
                                    border: '1px solid rgba(0,0,0,0.05)',
                                    borderRadius: '0.75rem', fontSize: '0.75rem',
                                    color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5,
                                }}>
                                    {recommendation}
                                </div>
                            )}
                        </div>

                        {/* Evidence Feed */}
                        <div className="glass-card" style={{
                            padding: '1.5rem', flex: 1,
                            display: 'flex', flexDirection: 'column'
                        }}>
                            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                                Anomaly Feed
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {evidence.length === 0 ? (
                                    <div style={{
                                        padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem',
                                        background: 'rgba(0,0,0,0.02)', borderRadius: '1rem', border: '1px dashed rgba(0,0,0,0.1)'
                                    }}>
                                        No anomalies detected yet
                                    </div>
                                ) : evidence.map((ev, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        background: 'white', borderRadius: '0.75rem', padding: '0.6rem',
                                        border: '1px solid rgba(0,0,0,0.05)',
                                    }}>
                                        <div style={{ width: '50px', height: '36px', background: '#e2e8f0', borderRadius: '0.5rem', overflow: 'hidden', flexShrink: 0 }}>
                                            <img src={`/${ev.path}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.flag}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Risk: {Math.round((ev.risk || 0) * 100)}%</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.9); }
                }
                /* Custom scrollbar for evidence list */
                div::-webkit-scrollbar { width: 6px; }
                div::-webkit-scrollbar-track { background: transparent; }
                div::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                div::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
            `}</style>
        </div>
    );
};

export default TenantMonitor;
