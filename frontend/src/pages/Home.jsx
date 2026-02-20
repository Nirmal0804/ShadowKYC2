import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, User, LogOut, Plus, ArrowRight, Monitor, Upload, FileVideo, CheckCircle, AlertTriangle, X, Loader, Sun, Moon, Mail, Building, Hash, Calendar, Bell, Clock, MessageSquare, FileText, History, BarChart3, HelpCircle, Settings, ChevronRight, Send, Eye, LayoutDashboard, BarChart2, Video, ShieldCheck } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import Navbar from '../components/Navbar';

const Home = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [sessionCode, setSessionCode] = useState('');
    const [creating, setCreating] = useState(false);
    const [user, setUser] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadResult, setUploadResult] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const fileInputRef = useRef(null);

    // Dashboard features
    const [activeTab, setActiveTab] = useState('home');
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [sessionHistory, setSessionHistory] = useState([]);
    const [appStatuses, setAppStatuses] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [tenantStats, setTenantStats] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [tenantTickets, setTenantTickets] = useState([]);
    const [showTicketForm, setShowTicketForm] = useState(false);
    const [ticketSubject, setTicketSubject] = useState('');
    const [ticketDesc, setTicketDesc] = useState('');
    const [ticketSubmitting, setTicketSubmitting] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('shadow_user');
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse user data", e);
                localStorage.removeItem('shadow_user');
            }
        }
    }, []);

    const role = localStorage.getItem('shadow_role') || 'user';

    // Fetch dashboard data
    const fetchNotifications = async (uid) => {
        try { const r = await fetch(`/notifications/${uid}`); const d = await r.json(); setNotifications(d.notifications || []); setUnreadCount((d.notifications || []).filter(n => !n.read).length); } catch (e) { }
    };
    const fetchHistory = async (uid) => {
        try { const r = await fetch(`/session/history/${uid}?role=${role}`); const d = await r.json(); setSessionHistory(d.history || []); } catch (e) { }
    };
    const fetchAppStatus = async (uid) => {
        try { const r = await fetch(`/application/status/${uid}`); const d = await r.json(); setAppStatuses(d.statuses || []); } catch (e) { }
    };
    const fetchTickets = async (uid) => {
        try { const r = await fetch(`/support/tickets/${uid}`); const d = await r.json(); setTickets(d.tickets || []); } catch (e) { }
    };
    const fetchTenantStats = async (uid) => {
        try { const r = await fetch(`/tenant/stats/${uid}`); const d = await r.json(); setTenantStats(d); } catch (e) { }
    };
    const fetchDocuments = async () => {
        try { const r = await fetch(`/tenant/documents`); const d = await r.json(); setDocuments(d.documents || []); } catch (e) { }
    };
    const fetchTenantTickets = async () => {
        try { const r = await fetch(`/tenant/tickets`); const d = await r.json(); setTenantTickets(d.tickets || []); } catch (e) { }
    };

    useEffect(() => {
        if (!user?.id) return;
        fetchNotifications(user.id);
        if (activeTab === 'history') fetchHistory(user.id);
        if (activeTab === 'pending') fetchHistory(user.id);
        if (activeTab === 'status') fetchAppStatus(user.id);
        if (activeTab === 'support') fetchTickets(user.id);
        if (activeTab === 'reports' && role === 'tenant') fetchTenantStats(user.id);
        if (activeTab === 'docs' && role === 'tenant') fetchDocuments();
        if (activeTab === 'queries' && role === 'tenant') fetchTenantTickets();
    }, [activeTab, user?.id]);

    const submitTicket = async () => {
        if (!ticketSubject.trim() || !ticketDesc.trim()) return;
        setTicketSubmitting(true);
        try {
            await fetch(`/support/ticket?user_id=${user.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: ticketSubject, description: ticketDesc }) });
            setTicketSubject(''); setTicketDesc(''); setShowTicketForm(false); fetchTickets(user.id);
        } catch (e) { alert('Failed to create ticket'); }
        setTicketSubmitting(false);
    };

    const markNotificationsRead = async () => {
        try { await fetch(`/notifications/${user.id}/read`, { method: 'POST' }); setUnreadCount(0); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); } catch (e) { }
    };

    const formatTime = (ts) => { if (!ts) return 'N/A'; return new Date(ts * 1000).toLocaleString(); };

    const logout = () => {
        localStorage.removeItem('shadow_token');
        localStorage.removeItem('shadow_role');
        localStorage.removeItem('shadow_user');
        navigate('/login');
    };

    const startSession = async () => {
        setCreating(true);
        try {
            const res = await fetch('/session/create', { method: 'POST' });
            const data = await res.json();
            if (data.session_id) {
                navigate(`/tenant/${data.session_id}`);
            }
        } catch (error) {
            alert('Failed to create session: ' + error.message);
        } finally {
            setCreating(false);
        }
    };

    const handleFileSelect = (file) => {
        if (file && file.type.startsWith('video/')) {
            setSelectedFile(file);
            setUploadResult(null);
            setUploadError(null);
        } else {
            setUploadError('Please select a valid video file (MP4, WebM, AVI, etc.)');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    };

    const uploadPreRecorded = async () => {
        if (!selectedFile) return;
        setUploading(true);
        setUploadProgress(0);
        setUploadError(null);
        setUploadResult(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            // Simulate progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) { clearInterval(progressInterval); return 90; }
                    return prev + Math.random() * 15;
                });
            }, 500);

            const res = await fetch('/analyze-session', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (!res.ok) {
                throw new Error(`Server error: ${res.status}`);
            }

            const data = await res.json();
            setUploadResult(data);
        } catch (error) {
            setUploadError('Analysis failed: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const joinSession = () => {
        if (sessionCode.trim().length === 6) {
            navigate(`/verify/${sessionCode.trim()}`);
        } else {
            alert('Please enter a valid 6-digit session code.');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-color)',
        }}>
            {/* Background Image with transparency */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: 'url(/tenant_bg.png)',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center center',
                backgroundAttachment: 'fixed',
                backgroundSize: 'cover',
                opacity: 0.3,
                zIndex: 0,
                pointerEvents: 'none',
            }} />
            {/* Background Effects */}
            <div className="spotlight" />
            <div className="spotlight" style={{ top: 'auto', bottom: '-20vw', left: '-10vw', right: 'auto', width: '80vw', height: '80vw', animationDelay: '1s' }} />

            {/* Role-based Layout */}
            {/* Role-based Layout */}
            <Navbar
                user={user}
                role={role}
                onLogout={logout}
                onProfileClick={() => setShowProfile(true)}
                onNotificationClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markNotificationsRead(); }}
                notificationCount={unreadCount}
                showNotifications={showNotifications}
                notifications={notifications}
                links={[
                    { label: 'Home', path: '#', active: activeTab === 'home', onClick: () => setActiveTab('home') },
                    { label: 'Solutions', path: '#' },
                    { label: 'About Us', path: '#' },
                    { label: 'Contact', path: '#' },
                ]}
            />

            {/* Main Content */}
            <div style={{
                flex: 1,
                maxWidth: '1000px',
                margin: '0 auto',
                padding: '4rem 2rem',
                position: 'relative', zIndex: 1,
            }} className="animate-fade-in">
                <div style={{ marginBottom: '3.5rem', textAlign: role === 'user' ? 'center' : 'left' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '1rem', color: 'var(--text-main)' }}>
                        {role === 'tenant' ? 'Officer Dashboard' : 'KYC Verification Portal'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 500, maxWidth: role === 'user' ? '600px' : 'none', margin: role === 'user' ? '0 auto' : '0' }}>
                        {role === 'tenant'
                            ? 'Create, manage, and monitor KYC verification sessions securely.'
                            : 'Complete your identity verification quickly and securely using your session code.'}
                    </p>
                </div>

                {role === 'tenant' ? (
                    /* Tenant View */
                    <>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center' }}>
                            {/* Create Session */}
                            <div className="glass-card" style={{
                                padding: '2rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                flex: '1 1 300px',
                                maxWidth: '100%'
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = '#5F5449'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                            >
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '1rem',
                                    background: 'rgba(255, 193, 7, 0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: '1.5rem', border: '1px solid rgba(255, 193, 7, 0.3)'
                                }}>
                                    <Plus size={28} color="#FFC107" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>Create New Session</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.6, fontWeight: 500 }}>
                                    Start a new KYC verification session. A secure 6-digit code will be generated for the client.
                                </p>
                                <button onClick={startSession} disabled={creating}
                                    className="btn-primary"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                                        padding: '0.85rem 1.5rem',
                                        fontSize: '0.95rem',
                                        cursor: creating ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {creating ? 'Generating Secure Code...' : <><Plus size={18} /> Start Session</>}
                                </button>
                            </div>


                            {/* Upload Pre-Recorded */}
                            <div className="glass-card" style={{
                                padding: '2rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                background: 'var(--glass-bg)',
                                flex: '1 1 300px',
                                maxWidth: '100%'
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'transparent'; }}
                            >
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '1rem',
                                    background: 'rgba(124, 58, 237, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: '1.5rem', border: '1px solid rgba(124, 58, 237, 0.25)'
                                }}>
                                    <Upload size={28} color="#7C3AED" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>Upload Pre-Recorded Video</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6, fontWeight: 500 }}>
                                    Upload a pre-recorded video for offline KYC integrity analysis and deepfake detection.
                                </p>

                                {/* Drop Zone */}
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    style={{
                                        border: `2px dashed ${dragOver ? '#7C3AED' : selectedFile ? '#10B981' : 'var(--nav-border)'}`,
                                        borderRadius: '1rem',
                                        padding: '1.5rem',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: dragOver ? 'rgba(124,58,237,0.08)' : selectedFile ? 'rgba(16,185,129,0.08)' : 'transparent',
                                        marginBottom: '1rem',
                                    }}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) => handleFileSelect(e.target.files[0])}
                                        style={{ display: 'none' }}
                                    />
                                    {selectedFile ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
                                            <FileVideo size={24} color="#10B981" />
                                            <div style={{ textAlign: 'left' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                                    {selectedFile.name}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                                                </div>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setUploadResult(null); }} style={{
                                                background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '50%',
                                                width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', marginLeft: 'auto',
                                            }}>
                                                <X size={14} color="#ef4444" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <FileVideo size={32} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
                                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                Drop video here or <span style={{ color: '#7C3AED', fontWeight: 700 }}>browse</span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                                MP4, WebM, AVI — Max 200MB
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Progress Bar */}
                                {uploading && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Analyzing video...</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7C3AED' }}>{Math.round(uploadProgress)}%</span>
                                        </div>
                                        <div style={{ height: '6px', background: 'var(--nav-border)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', width: `${uploadProgress}%`,
                                                background: 'linear-gradient(90deg, #7C3AED, #A78BFA)',
                                                borderRadius: '3px', transition: 'width 0.3s ease',
                                            }} />
                                        </div>
                                    </div>
                                )}

                                {/* Error Message */}
                                {uploadError && (
                                    <div style={{
                                        padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem',
                                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        fontSize: '0.85rem', fontWeight: 600, color: '#ef4444',
                                    }}>
                                        <AlertTriangle size={16} /> {uploadError}
                                    </div>
                                )}

                                {/* ═══════ FULL ANALYSIS RESULTS ═══════ */}
                                {uploadResult && (
                                    <div style={{ marginBottom: '1.25rem' }}>

                                        {/* ── Header: Overall Risk ── */}
                                        <div style={{
                                            padding: '1.25rem', borderRadius: '1rem', marginBottom: '1rem',
                                            background: (uploadResult.risk_pct || 0) > 65 ? 'rgba(239,68,68,0.06)' : (uploadResult.risk_pct || 0) > 35 ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.06)',
                                            border: `1px solid ${(uploadResult.risk_pct || 0) > 65 ? 'rgba(239,68,68,0.2)' : (uploadResult.risk_pct || 0) > 35 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                                <CheckCircle size={18} color="#10B981" />
                                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10B981' }}>Analysis Complete</span>
                                            </div>

                                            {/* Summary row */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                                                <div style={{ background: 'var(--glass-bg)', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center', border: '1px solid var(--nav-border)' }}>
                                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: (uploadResult.risk_pct || 0) > 65 ? '#ef4444' : (uploadResult.risk_pct || 0) > 35 ? '#f59e0b' : '#10B981' }}>
                                                        {uploadResult.risk_pct ?? Math.round((uploadResult.risk_score || 0) * 100)}%
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Risk Score</div>
                                                </div>
                                                <div style={{ background: 'var(--glass-bg)', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center', border: '1px solid var(--nav-border)' }}>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>{uploadResult.classification || 'N/A'}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Classification</div>
                                                </div>
                                                <div style={{ background: 'var(--glass-bg)', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center', border: '1px solid var(--nav-border)' }}>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>{uploadResult.flagged_frame_count ?? 0}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Flagged Frames</div>
                                                </div>
                                            </div>

                                            {/* Recommendation */}
                                            {uploadResult.recommendation && (
                                                <div style={{
                                                    padding: '0.75rem 1rem', borderRadius: '0.75rem',
                                                    background: 'var(--glass-bg)', border: '1px solid var(--nav-border)',
                                                    fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.5,
                                                }}>
                                                    <span style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Recommendation</span>
                                                    {uploadResult.recommendation}
                                                </div>
                                            )}
                                        </div>

                                        {/* ── 7 Layer Outputs (separate boxes) ── */}
                                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                            7-Layer Integrity Analysis
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
                                            {[
                                                { key: 'l1_liveness', label: 'L1 – Temporal Liveness', icon: '🔄', desc: 'Detects replay attacks, photo/screen presentations, and temporal inconsistencies.' },
                                                { key: 'l2_face_match', label: 'L2 – Face Match', icon: '👤', desc: 'Monitors face identity consistency across frames for swap detection.' },
                                                { key: 'l3_texture', label: 'L3 – Texture & Frequency', icon: '🔍', desc: 'Analyses pixel-level artifacts from deepfake generation models.' },
                                                { key: 'l4_geometry', label: 'L4 – Geometry & Depth', icon: '📐', desc: 'Validates facial landmark proportions and pseudo-3D depth integrity.' },
                                                { key: 'l5_lipsync', label: 'L5 – Lip-Sync Integrity', icon: '🗣️', desc: 'Checks lip movement consistency against expected speech patterns.' },
                                                { key: 'l6_environment', label: 'L6 – Environment', icon: '🌐', desc: 'Detects green screens, virtual backgrounds, and lighting anomalies.' },
                                            ].map(layer => {
                                                const raw = uploadResult.layer_scores?.[layer.key] ?? 0;
                                                const pct = Math.round(raw * 100);
                                                const isRisky = pct > 65;
                                                const isMod = pct > 35;
                                                const barColor = isRisky ? '#ef4444' : isMod ? '#f59e0b' : '#10B981';
                                                return (
                                                    <div key={layer.key} style={{
                                                        padding: '0.85rem', borderRadius: '0.85rem',
                                                        background: 'var(--glass-bg)', border: '1px solid var(--nav-border)',
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                                            <span style={{ fontSize: '1rem' }}>{layer.icon}</span>
                                                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' }}>{layer.label}</span>
                                                            <span style={{ marginLeft: 'auto', fontSize: '0.85rem', fontWeight: 800, color: barColor }}>{pct}%</span>
                                                        </div>
                                                        {/* Risk bar */}
                                                        <div style={{ height: '5px', background: 'var(--nav-border)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.4rem' }}>
                                                            <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{layer.desc}</div>
                                                    </div>
                                                );
                                            })}

                                            {/* L7 – Meta Fusion (overall) */}
                                            <div style={{
                                                padding: '0.85rem', borderRadius: '0.85rem', gridColumn: '1 / -1',
                                                background: 'var(--glass-bg)', border: '1px solid var(--nav-border)',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                                    <span style={{ fontSize: '1rem' }}>🧠</span>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' }}>L7 – Meta Fusion (Combined Risk)</span>
                                                    <span style={{ marginLeft: 'auto', fontSize: '0.85rem', fontWeight: 800, color: (uploadResult.risk_pct || 0) > 65 ? '#ef4444' : (uploadResult.risk_pct || 0) > 35 ? '#f59e0b' : '#10B981' }}>
                                                        {uploadResult.risk_pct ?? Math.round((uploadResult.risk_score || 0) * 100)}%
                                                    </span>
                                                </div>
                                                <div style={{ height: '5px', background: 'var(--nav-border)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.4rem' }}>
                                                    <div style={{
                                                        height: '100%', width: `${uploadResult.risk_pct ?? Math.round((uploadResult.risk_score || 0) * 100)}%`,
                                                        background: (uploadResult.risk_pct || 0) > 65 ? '#ef4444' : (uploadResult.risk_pct || 0) > 35 ? '#f59e0b' : '#10B981',
                                                        borderRadius: '3px', transition: 'width 0.5s ease',
                                                    }} />
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                                    Aggregates all 6 layer scores with weighted fusion to produce the final integrity verdict.
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Reason Codes / Flags ── */}
                                        {uploadResult.reason_codes && uploadResult.reason_codes.length > 0 && (
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                                                    Detected Anomalies ({uploadResult.reason_codes.length})
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                    {uploadResult.reason_codes.map((flag, i) => (
                                                        <span key={i} style={{
                                                            padding: '0.3rem 0.7rem', borderRadius: '2rem',
                                                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                                            fontSize: '0.75rem', fontWeight: 700, color: '#ef4444',
                                                        }}>{flag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Suspicious Timestamps ── */}
                                        {uploadResult.top_suspicious_timestamps && uploadResult.top_suspicious_timestamps.length > 0 && (
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                                                    Suspicious Timestamps ({uploadResult.top_suspicious_timestamps.length})
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                    {uploadResult.top_suspicious_timestamps.map((ts, i) => (
                                                        <span key={i} style={{
                                                            padding: '0.3rem 0.7rem', borderRadius: '2rem',
                                                            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                                                            fontSize: '0.75rem', fontWeight: 700, color: '#F59E0B',
                                                        }}>⏱ {ts.toFixed(1)}s</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Evidence Frames ── */}
                                        {uploadResult.evidence_frames && uploadResult.evidence_frames.length > 0 && (
                                            <div>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                                                    Captured Evidence ({uploadResult.evidence_frames.length})
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem' }}>
                                                    {uploadResult.evidence_frames.slice(0, 12).map((path, i) => (
                                                        <div key={i} style={{
                                                            borderRadius: '0.6rem', overflow: 'hidden', aspectRatio: '4/3',
                                                            border: '2px solid rgba(239,68,68,0.25)', background: '#0f172a',
                                                        }}>
                                                            <img src={`/${path}`} alt={`Evidence ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                )}

                                <button
                                    onClick={uploadPreRecorded}
                                    disabled={!selectedFile || uploading}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                                        padding: '0.85rem 1.5rem',
                                        fontSize: '0.95rem',
                                        background: (!selectedFile || uploading) ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '3rem',
                                        fontWeight: 700,
                                        cursor: (!selectedFile || uploading) ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: (!selectedFile || uploading) ? 'none' : '0 4px 12px rgba(124, 58, 237, 0.25)',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    {uploading ? (
                                        <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</>
                                    ) : (
                                        <><Upload size={18} /> Analyze Video</>
                                    )}
                                </button>
                            </div>

                            {/* Pending Verifications */}
                            <div className="glass-card" style={{
                                padding: '2rem', cursor: 'pointer', transition: 'all 0.3s',
                                flex: '1 1 300px',
                                maxWidth: '100%'
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'transparent'; }}
                                onClick={() => setActiveTab('pending')}
                            >
                                <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', border: '1px solid rgba(245,158,11,0.25)' }}>
                                    <Clock size={28} color="#F59E0B" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>Pending Verifications</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, fontWeight: 500 }}>
                                    Review sessions awaiting your decision and submit final verification outcomes.
                                </p>
                            </div>

                            {/* Document Review Panel */}
                            <div className="glass-card" style={{
                                padding: '2rem', cursor: 'pointer', transition: 'all 0.3s',
                                flex: '1 1 300px',
                                maxWidth: '100%'
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'transparent'; }}
                                onClick={() => setActiveTab('docs')}
                            >
                                <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', border: '1px solid rgba(16,185,129,0.25)' }}>
                                    <FileText size={28} color="#10B981" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>Document Review</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, fontWeight: 500 }}>
                                    Preview client-uploaded documents including Government IDs, selfies, and address proofs.
                                </p>
                            </div>

                            {/* Verification History */}
                            <div className="glass-card" style={{
                                padding: '2rem', cursor: 'pointer', transition: 'all 0.3s',
                                flex: '1 1 300px',
                                maxWidth: '100%'
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'transparent'; }}
                                onClick={() => setActiveTab('history')}
                            >
                                <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', border: '1px solid rgba(124,58,237,0.25)' }}>
                                    <History size={28} color="#7C3AED" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>Verification History</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, fontWeight: 500 }}>
                                    Browse all past verification sessions with decisions, risk scores, and evidence.
                                </p>
                            </div>

                            {/* Reports */}
                            <div className="glass-card" style={{
                                padding: '2rem', cursor: 'pointer', transition: 'all 0.3s',
                                flex: '1 1 300px',
                                maxWidth: '100%'
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'transparent'; }}
                                onClick={() => setActiveTab('reports')}
                            >
                                <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', border: '1px solid rgba(59,130,246,0.25)' }}>
                                    <BarChart3 size={28} color="#3B82F6" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>Reports</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, fontWeight: 500 }}>
                                    View aggregate statistics: total sessions, approvals, rejections, and fraud-suspected cases.
                                </p>
                            </div>

                            {/* User Queries */}
                            <div className="glass-card" style={{
                                padding: '2rem', cursor: 'pointer', transition: 'all 0.3s',
                                flex: '1 1 300px',
                                maxWidth: '100%'
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'transparent'; }}
                                onClick={() => setActiveTab('queries')}
                            >
                                <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', border: '1px solid rgba(239,68,68,0.25)' }}>
                                    <HelpCircle size={28} color="#ef4444" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>User Queries</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, fontWeight: 500 }}>
                                    View and manage support tickets raised by users. Respond to queries and provide assistance.
                                </p>
                            </div>

                        </div>


                        {/* Tenant: Pending Verifications Panel */}
                        {activeTab === 'pending' && (
                            <div className="glass-card" style={{ padding: '2rem', marginTop: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Clock size={24} color="#F59E0B" />
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>Pending Verifications</h3>
                                    </div>
                                    <button onClick={() => setActiveTab('home')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>✕ Close</button>
                                </div>
                                {sessionHistory.filter(s => !s.decision || s.decision === 'pending' || s.decision === 'manual_review').length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No pending verifications found.</p>
                                ) : (
                                    sessionHistory.filter(s => !s.decision || s.decision === 'pending' || s.decision === 'manual_review').map((s, i) => (
                                        <div key={i} style={{ padding: '1rem', borderRadius: '1rem', background: 'var(--input-bg)', border: '1px solid var(--nav-border)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>Session: {s.session_id}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatTime(s.timestamp)}</div>
                                            </div>
                                            <span style={{
                                                padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 700,
                                                background: 'rgba(245,158,11,0.1)', color: '#F59E0B',
                                            }}>{(s.decision || 'PENDING').replace('_', ' ').toUpperCase()}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Tenant: Document Review Panel */}
                        {activeTab === 'docs' && (
                            <div className="glass-card" style={{ padding: '2rem', marginTop: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <FileText size={24} color="#10B981" />
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>Document Review</h3>
                                    </div>
                                    <button onClick={() => setActiveTab('home')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>✕ Close</button>
                                </div>
                                {documents.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No documents uploaded for review.</p>
                                ) : (
                                    documents.map((doc, i) => (
                                        <div key={i} style={{ padding: '1.25rem', borderRadius: '1rem', background: 'var(--input-bg)', border: '1px solid var(--nav-border)', marginBottom: '1rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>Session: {doc.session_id}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Uploaded: {formatTime(doc.timestamp)}</div>
                                                </div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>ready for review</span>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                                                {doc.doc_urls.map((url, idx) => (
                                                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
                                                        <div style={{
                                                            background: 'var(--bg-color)', border: '1px solid var(--nav-border)', borderRadius: '0.75rem',
                                                            overflow: 'hidden', transition: 'transform 0.2s', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}
                                                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                                        >
                                                            {url.toLowerCase().endsWith('.pdf') ? (
                                                                <FileText size={32} color="var(--text-secondary)" />
                                                            ) : (
                                                                <img src={url} alt="Document" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem', textAlign: 'center', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {url.split('/').pop()}
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Tenant: History Panel (shown when activeTab=history) */}
                        {activeTab === 'history' && (
                            <div className="glass-card" style={{ padding: '2rem', marginTop: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <History size={24} color="#7C3AED" />
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>Verification History</h3>
                                    </div>
                                    <button onClick={() => setActiveTab('home')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>✕ Close</button>
                                </div>
                                {sessionHistory.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No sessions recorded yet.</p>
                                ) : sessionHistory.map((s, i) => (
                                    <div key={i} style={{ padding: '1rem', borderRadius: '1rem', background: 'var(--input-bg)', border: '1px solid var(--nav-border)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>Session: {s.session_id}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatTime(s.timestamp)}</div>
                                            {s.notes && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Notes: {s.notes}</div>}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            {s.risk_score != null && <span style={{ fontSize: '0.85rem', fontWeight: 700, color: s.risk_score > 65 ? '#ef4444' : s.risk_score > 35 ? '#F59E0B' : '#10B981' }}>{Math.round(s.risk_score)}%</span>}
                                            <span style={{
                                                padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 700,
                                                background: s.decision === 'approved' ? 'rgba(16,185,129,0.1)' : s.decision === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                                color: s.decision === 'approved' ? '#10B981' : s.decision === 'rejected' ? '#ef4444' : '#F59E0B',
                                            }}>{(s.decision || 'pending').replace('_', ' ').toUpperCase()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Tenant: Reports Panel */}
                        {activeTab === 'reports' && (
                            <div className="glass-card" style={{ padding: '2rem', marginTop: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <BarChart3 size={24} color="#3B82F6" />
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>Reports</h3>
                                    </div>
                                    <button onClick={() => setActiveTab('home')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>✕ Close</button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                                    {tenantStats && Object.entries({
                                        'Total Sessions': tenantStats.total,
                                        'Approved': tenantStats.approved,
                                        'Rejected': tenantStats.rejected,
                                        'Manual Review': tenantStats.manual_review,
                                        'Visit Branch': tenantStats.visit_branch,
                                        'Pending': tenantStats.pending,
                                        'Fraud Suspected': tenantStats.fraud_suspected,
                                    }).map(([label, val]) => (
                                        <div key={label} style={{ padding: '1.25rem', borderRadius: '1rem', background: 'var(--input-bg)', border: '1px solid var(--nav-border)', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: label === 'Fraud Suspected' ? '#ef4444' : label === 'Approved' ? '#10B981' : 'var(--text-main)' }}>{val}</div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '0.25rem' }}>{label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tenant: User Queries Panel */}
                        {activeTab === 'queries' && (
                            <div className="glass-card" style={{ padding: '2rem', marginTop: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <HelpCircle size={24} color="#ef4444" />
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>User Queries</h3>
                                    </div>
                                    <button onClick={() => setActiveTab('home')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>✕ Close</button>
                                </div>
                                {tenantTickets.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No user queries found.</p>
                                ) : (
                                    tenantTickets.map((t, i) => (
                                        <div key={i} style={{ padding: '1.25rem', borderRadius: '1rem', background: 'var(--input-bg)', border: '1px solid var(--nav-border)', marginBottom: '1rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.1rem' }}>{t.subject}</div>
                                                <span style={{
                                                    padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.7rem', fontWeight: 800,
                                                    background: t.status === 'open' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                    color: t.status === 'open' ? '#ef4444' : '#10B981',
                                                    textTransform: 'uppercase'
                                                }}>{t.status}</span>
                                            </div>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>{t.description}</p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                <div>User ID: {t.user_id}</div>
                                                <div>{formatTime(t.created_at)}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Tenant: Notifications Panel Removed (Moved to Navbar Dropdown) */}
                    </>
                ) : (
                    /* ─── User Dashboard ─── */
                    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                        {/* Navigation Tabs - Horizontal Wrap */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
                            {[
                                { id: 'home', icon: Monitor, label: 'Join Session' },
                                { id: 'documents', icon: FileText, label: 'Upload Documents' },
                                { id: 'status', icon: Eye, label: 'Application Status' },
                                { id: 'support', icon: HelpCircle, label: 'Raise Query' },
                                { id: 'history', icon: History, label: 'Session History' },
                            ].map(tab => (
                                <div key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'notifications') markNotificationsRead(); }}
                                    className="glass-card"
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                                        padding: '1.25rem', borderRadius: '1.5rem',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        background: activeTab === tab.id ? 'rgba(255,193,7,0.12)' : 'var(--glass-bg)',
                                        border: activeTab === tab.id ? '1px solid var(--accent)' : 'var(--glass-border)',
                                        flex: '1 1 160px',
                                        textAlign: 'center',
                                        minWidth: '140px'
                                    }}
                                >
                                    <tab.icon size={26} color={activeTab === tab.id ? '#FFC107' : 'var(--text-secondary)'} />
                                    <div style={{
                                        fontWeight: activeTab === tab.id ? 800 : 600,
                                        color: activeTab === tab.id ? 'var(--text-main)' : 'var(--text-secondary)',
                                        fontSize: '0.9rem',
                                        lineHeight: 1.2
                                    }}>
                                        {tab.label}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div>
                            {/* Join Session Tab */}
                            {activeTab === 'home' && (
                                <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '1.25rem', background: 'rgba(255,193,7,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(255,193,7,0.3)' }}>
                                        <User size={28} color="#FFC107" />
                                    </div>
                                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Start Live KYC Session</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>Enter the 6-digit code provided by the bank officer.</p>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.5rem', textAlign: 'left' }}>Session Code</label>
                                    <input className="glass-input" type="text" placeholder="_ _ _ _ _ _" value={sessionCode} onChange={e => setSessionCode(e.target.value)} maxLength={6}
                                        style={{ width: '100%', padding: '1rem', fontSize: '1.75rem', letterSpacing: '8px', textAlign: 'center', marginBottom: '1.5rem', fontWeight: 800 }} />
                                    <button onClick={joinSession} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        Verify Identity <ArrowRight size={18} />
                                    </button>
                                </div>
                            )}

                            {/* Upload Documents Tab */}
                            {activeTab === 'documents' && (
                                <div className="glass-card" style={{ padding: '2.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                        <FileText size={24} color="#7C3AED" />
                                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>Upload Documents</h3>
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                        Upload your identity documents before joining a session. Required: Government ID + Selfie.
                                    </p>
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        {['Aadhaar / PAN / Passport / DL', 'Selfie Photo', 'Address Proof (Optional)'].map((doc, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '1rem', background: 'var(--input-bg)', border: '1px solid var(--nav-border)' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '0.75rem', background: i < 2 ? 'rgba(124,58,237,0.1)' : 'rgba(100,116,139,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <FileText size={18} color={i < 2 ? '#7C3AED' : '#64748B'} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>{doc}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PDF, JPG, PNG • Max 5MB {i < 2 ? '(Required)' : ''}</div>
                                                </div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Not uploaded</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>
                                        💡 Documents will be uploaded when you join a session via the session code flow.
                                    </p>
                                </div>
                            )}

                            {/* Application Status Tab */}
                            {activeTab === 'status' && (
                                <div className="glass-card" style={{ padding: '2.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                        <Eye size={24} color="#10B981" />
                                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>Application Status</h3>
                                    </div>
                                    {appStatuses.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                            <Clock size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                                            <p style={{ fontWeight: 600 }}>No applications yet</p>
                                            <p style={{ fontSize: '0.85rem' }}>Complete a KYC session to see your verification status here.</p>
                                        </div>
                                    ) : appStatuses.map((s, i) => (
                                        <div key={i} style={{ padding: '1rem', borderRadius: '1rem', background: 'var(--input-bg)', border: '1px solid var(--nav-border)', marginBottom: '0.75rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>Session: {s.session_id}</span>
                                                <span style={{
                                                    padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 700,
                                                    background: s.status === 'approved' ? 'rgba(16,185,129,0.1)' : s.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                                    color: s.status === 'approved' ? '#10B981' : s.status === 'rejected' ? '#ef4444' : '#F59E0B',
                                                    border: `1px solid ${s.status === 'approved' ? 'rgba(16,185,129,0.3)' : s.status === 'rejected' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                                }}>{s.status?.replace('_', ' ').toUpperCase()}</span>
                                            </div>
                                            {s.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Notes: {s.notes}</p>}
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{formatTime(s.updated_at)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Support Tab */}
                            {activeTab === 'support' && (
                                <div className="glass-card" style={{ padding: '2.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <HelpCircle size={24} color="#F59E0B" />
                                            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>Support</h3>
                                        </div>
                                        <button onClick={() => setShowTicketForm(!showTicketForm)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                            <Plus size={16} /> New Ticket
                                        </button>
                                    </div>
                                    {showTicketForm && (
                                        <div style={{ padding: '1.25rem', borderRadius: '1rem', background: 'var(--input-bg)', border: '1px solid var(--nav-border)', marginBottom: '1rem' }}>
                                            <input className="glass-input" placeholder="Subject" value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem' }} />
                                            <textarea className="glass-input" placeholder="Describe your issue..." value={ticketDesc} onChange={e => setTicketDesc(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem', resize: 'vertical', fontFamily: 'inherit' }} />
                                            <button onClick={submitTicket} disabled={ticketSubmitting} className="btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
                                                {ticketSubmitting ? 'Submitting...' : <><Send size={14} /> Submit Ticket</>}
                                            </button>
                                        </div>
                                    )}
                                    {tickets.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                            <MessageSquare size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                                            <p style={{ fontWeight: 600 }}>No support tickets</p>
                                        </div>
                                    ) : tickets.map((t, i) => (
                                        <div key={i} style={{ padding: '1rem', borderRadius: '1rem', background: 'var(--input-bg)', border: '1px solid var(--nav-border)', marginBottom: '0.75rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>{t.subject}</span>
                                                <span style={{ padding: '0.15rem 0.5rem', borderRadius: '2rem', fontSize: '0.7rem', fontWeight: 700, background: t.status === 'resolved' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: t.status === 'resolved' ? '#10B981' : '#F59E0B' }}>{t.status?.toUpperCase()}</span>
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{t.description}</p>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{formatTime(t.created_at)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* History Tab */}
                            {activeTab === 'history' && (
                                <div className="glass-card" style={{ padding: '2.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                        <History size={24} color="#7C3AED" />
                                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>Session History</h3>
                                    </div>
                                    {sessionHistory.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                            <Clock size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                                            <p style={{ fontWeight: 600 }}>No sessions yet</p>
                                            <p style={{ fontSize: '0.85rem' }}>Your past KYC sessions will appear here.</p>
                                        </div>
                                    ) : sessionHistory.map((s, i) => (
                                        <div key={i} style={{ padding: '1rem', borderRadius: '1rem', background: 'var(--input-bg)', border: '1px solid var(--nav-border)', marginBottom: '0.75rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>Session: {s.session_id}</span>
                                                <span style={{
                                                    padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 700,
                                                    background: s.decision === 'approved' ? 'rgba(16,185,129,0.1)' : s.decision === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                                    color: s.decision === 'approved' ? '#10B981' : s.decision === 'rejected' ? '#ef4444' : '#F59E0B',
                                                }}>{(s.decision || 'pending').replace('_', ' ').toUpperCase()}</span>
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{formatTime(s.timestamp)}</p>
                                            {s.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Officer Notes: {s.notes}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Notifications Tab Removed (Moved to Navbar Dropdown) */}
                        </div>
                    </div>
                )}
            </div>

            {/* Profile Modal */}
            {showProfile && (
                <div
                    onClick={() => setShowProfile(false)}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999, animation: 'fade-in 0.2s ease-out',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className="glass-card"
                        style={{
                            padding: '2.5rem', width: '100%', maxWidth: '420px',
                            position: 'relative', animation: 'fade-in 0.3s ease-out',
                        }}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setShowProfile(false)}
                            style={{
                                position: 'absolute', top: '1rem', right: '1rem',
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: 'var(--glass-bg)', border: '1px solid var(--nav-border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s',
                            }}
                        >
                            <X size={16} />
                        </button>

                        {/* Avatar */}
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #FFC107, #F59E0B)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1rem',
                                fontSize: '2rem', fontWeight: 800, color: '#1A1A1A',
                                boxShadow: '0 8px 24px rgba(255, 193, 7, 0.3)',
                            }}>
                                {user?.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                                {user?.name || 'User'}
                            </h2>
                            <span style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.75rem', borderRadius: '2rem',
                                background: role === 'tenant' ? 'rgba(124,58,237,0.1)' : 'rgba(16,185,129,0.1)',
                                border: `1px solid ${role === 'tenant' ? 'rgba(124,58,237,0.3)' : 'rgba(16,185,129,0.3)'}`,
                                color: role === 'tenant' ? '#7C3AED' : '#10B981',
                                fontSize: '0.8rem', fontWeight: 700,
                            }}>
                                {role === 'tenant' ? '🏛 Bank Officer' : '👤 Client'}
                            </span>
                        </div>

                        {/* Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {/* User ID */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.85rem 1rem', borderRadius: '1rem',
                                background: 'var(--input-bg)', border: '1px solid var(--nav-border)',
                            }}>
                                <Hash size={18} color="#FFC107" />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>User ID</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'monospace' }}>{user?.id || 'N/A'}</div>
                                </div>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(user?.id || ''); }}
                                    style={{
                                        padding: '0.3rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.7rem',
                                        background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.3)',
                                        color: '#FFC107', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                >
                                    Copy
                                </button>
                            </div>

                            {/* Email */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.85rem 1rem', borderRadius: '1rem',
                                background: 'var(--input-bg)', border: '1px solid var(--nav-border)',
                            }}>
                                <Mail size={18} color="#7C3AED" />
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>{user?.email || 'N/A'}</div>
                                </div>
                            </div>

                            {/* Organization (Officers only) */}
                            {user?.organization && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '0.85rem 1rem', borderRadius: '1rem',
                                    background: 'var(--input-bg)', border: '1px solid var(--nav-border)',
                                }}>
                                    <Building size={18} color="#10B981" />
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Organization</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>{user.organization}</div>
                                    </div>
                                </div>
                            )}

                            {/* Role */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.85rem 1rem', borderRadius: '1rem',
                                background: 'var(--input-bg)', border: '1px solid var(--nav-border)',
                            }}>
                                <Shield size={18} color="#F59E0B" />
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>{user?.role === 'tenant' ? 'Bank Officer / Verifier' : 'Client / End User'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Logout from modal */}
                        <button
                            onClick={() => { setShowProfile(false); logout(); }}
                            style={{
                                width: '100%', marginTop: '1.5rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                padding: '0.85rem', borderRadius: '3rem',
                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                color: '#ef4444', fontSize: '0.9rem', fontWeight: 700,
                                cursor: 'pointer', transition: 'all 0.2s',
                                fontFamily: 'inherit',
                            }}
                        >
                            <LogOut size={18} /> Sign Out
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                ::placeholder { color: var(--input-placeholder); opacity: 1; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default Home;
