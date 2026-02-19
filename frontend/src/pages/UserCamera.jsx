import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, AlertCircle, CheckCircle, Wifi, WifiOff, Shield, LogOut, RefreshCw } from 'lucide-react';
import { useTheme } from '../ThemeContext';

const UserCamera = () => {
    const { theme, toggleTheme } = useTheme();
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const wsRef = useRef(null);
    const streamRef = useRef(null);
    const intervalRef = useRef(null);

    const [status, setStatus] = useState('VALIDATING'); // VALIDATING | INVALID | READY | LIVE | COMPLETED
    const [wsConnected, setWsConnected] = useState(false);
    const [tenantConnected, setTenantConnected] = useState(false);
    const [qualityWarning, setQualityWarning] = useState(null);
    const [error, setError] = useState('');
    const [frameCount, setFrameCount] = useState(0);
    const [videoDevices, setVideoDevices] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState('');

    const user = JSON.parse(localStorage.getItem('shadow_user') || '{}');

    // Step 0: Initial Camera Setup (Auto-detect)
    useEffect(() => {
        const initCameras = async () => {
            try {
                // Request permission briefly to get labels
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach(t => t.stop());

                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices.filter(d => d.kind === 'videoinput');
                setVideoDevices(videoInputs);

                if (videoInputs.length > 0) {
                    // Prefer webcam/integrated, otherwise first available
                    const preferred = videoInputs.find(d =>
                        d.label.toLowerCase().includes('webcam') ||
                        d.label.toLowerCase().includes('integrated') ||
                        d.label.toLowerCase().includes('usb')
                    ) || videoInputs[0];
                    setSelectedCamera(preferred.deviceId);
                }
            } catch (err) {
                console.warn("Camera init warning:", err);
                // Don't block flow, allow manual start to trigger permission
            }
        };
        initCameras();
    }, []);

    // Step 1: Validate session exists AND documents were approved
    useEffect(() => {
        if (!sessionId) { setStatus('INVALID'); return; }

        // Check doc approval from sessionStorage (set by DocumentUpload on success)
        const docApproved = sessionStorage.getItem(`doc_approved_${sessionId}`);
        if (!docApproved) {
            // Not approved yet — send back to document upload gate
            navigate(`/verify/${sessionId}`, { replace: true });
            return;
        }

        // Validate session code exists on backend
        fetch(`/session/validate/${sessionId}`)
            .then(r => r.json())
            .then(data => {
                if (data.valid) {
                    setStatus('READY');
                    connectWebSocket();
                } else {
                    setStatus('INVALID');
                    setError('Session code not found. Please check the code and try again.');
                }
            })
            .catch(() => {
                setStatus('INVALID');
                setError('Could not reach server. Please check your connection.');
            });

        return () => {
            stopStream();
            if (wsRef.current) wsRef.current.close();
        };
    }, [sessionId]);

    const connectWebSocket = () => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(`${protocol}//${window.location.host}/ws/session/${sessionId}/client`);

        socket.onopen = () => {
            console.log('WS Connected as client:', sessionId);
            setWsConnected(true);
        };

        socket.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'ack') {
                if (msg.quality_warning) setQualityWarning(msg.quality_warning);
                else setQualityWarning(null);
                if (msg.tenant_connected !== undefined) setTenantConnected(msg.tenant_connected);
            } else if (msg.type === 'tenant_joined') {
                setTenantConnected(true);
            } else if (msg.type === 'tenant_left') {
                setTenantConnected(false);
            } else if (msg.type === 'completion') {
                setStatus('COMPLETED');
                stopStream();
            }
        };

        socket.onclose = () => {
            setWsConnected(false);
        };

        socket.onerror = (e) => {
            console.error('WS Error:', e);
            setError('WebSocket connection failed.');
        };

        wsRef.current = socket;
    };

    // Step 2: Start webcam (force front-facing / webcam)
    const startStream = async (deviceId = null) => {
        setError('');
        stopStream(); // Stop any existing stream first

        try {
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 },
                },
                audio: false,
            };

            if (deviceId && typeof deviceId === 'string') {
                constraints.video.deviceId = { exact: deviceId };
            } else if (selectedCamera) {
                constraints.video.deviceId = { exact: selectedCamera };
            } else {
                // Fallback to 'user' only if no specific device is known
                constraints.video.facingMode = 'user';
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            streamRef.current = stream;
            setStatus('LIVE');

            // Send frames at 5 FPS
            intervalRef.current = setInterval(captureAndSend, 200);

            // Video devices already enumerated on mount, but refresh here just in case
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter(d => d.kind === 'videoinput');
            setVideoDevices(videoInputs);
            if (videoInputs.length > 0 && !selectedCamera) {
                setSelectedCamera(videoInputs[0].deviceId);
            }

        } catch (err) {
            console.error('Camera Error:', err);
            if (err.name === 'NotAllowedError') {
                setError('Camera permission denied. Please allow camera access in your browser settings.');
            } else if (err.name === 'NotFoundError') {
                setError('No camera found. Please connect a webcam and try again.');
            } else {
                setError(`Camera error: ${err.message}`);
            }
        }
    };

    const handleSwitchCamera = () => {
        if (videoDevices.length < 2) return;

        const currentStream = streamRef.current;
        const currentTrack = currentStream?.getVideoTracks()[0];
        const currentDeviceId = currentTrack?.getSettings()?.deviceId;

        const currentIndex = videoDevices.findIndex(d => d.deviceId === currentDeviceId);
        // If current not found, default to 0, then move to 1. If found, next one.
        const nextIndex = (currentIndex + 1) % videoDevices.length;

        startStream(videoDevices[nextIndex].deviceId);
    };

    const stopStream = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    const captureAndSend = () => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        if (!videoRef.current || !canvasRef.current) return;
        if (videoRef.current.readyState < 2) return; // Not ready yet

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0);

        const base64 = canvas.toDataURL('image/jpeg', 0.6);
        ws.send(JSON.stringify({
            type: 'frame',
            data: base64,
            timestamp: Date.now() / 1000,
        }));
        setFrameCount(c => c + 1);
    };

    const endSession = () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'stop' }));
        }
        stopStream();
        setStatus('COMPLETED');
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex', flexDirection: 'column',
            background: 'var(--bg-color)',
            color: 'var(--text-main)',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
            {/* Background Effects */}
            <div className="spotlight" />
            <div className="spotlight" style={{ top: 'auto', bottom: '-20vw', left: '-10vw', right: 'auto', width: '80vw', height: '80vw', animationDelay: '1s' }} />

            {/* Navbar */}
            <nav style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1.25rem 2rem', borderBottom: '1px solid rgba(0,0,0,0.05)',
                background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)',
                position: 'sticky', top: 0, zIndex: 100,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, #FFC107, #F59E0B)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Shield size={20} color="white" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1A1A1A' }}>
                        SHADOW <span style={{ color: '#FFC107' }}>KYC</span>
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0, 0, 0, 0.05)',
                        borderRadius: '0.5rem', padding: '0.4rem 0.85rem',
                        fontSize: '0.8rem', fontWeight: 700, letterSpacing: '2px', color: 'var(--text-secondary)',
                    }}>
                        SESSION: {sessionId}
                    </div>

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        fontSize: '0.8rem', color: wsConnected ? '#10b981' : '#64748B', fontWeight: 600
                    }}>
                        {wsConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                        Engine: {wsConnected ? 'Connected' : 'Connecting...'}
                    </div>

                    <button onClick={() => navigate('/home')} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'white', border: '1px solid rgba(0, 0, 0, 0.05)',
                        borderRadius: '0.6rem', padding: '0.5rem 0.9rem',
                        color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                        transition: 'all 0.2s',
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                        <LogOut size={16} /> Exit
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '2rem', gap: '2rem',
                position: 'relative', zIndex: 1,
            }} className="animate-fade-in">

                {/* INVALID state */}
                {status === 'INVALID' && (
                    <div className="glass-card" style={{
                        padding: '3rem', textAlign: 'center', maxWidth: '480px',
                    }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                            <AlertCircle size={32} color="#ef4444" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: '#ef4444' }}>Invalid Session</h2>
                        <p style={{ color: '#fca5a5', marginBottom: '2rem', lineHeight: 1.6 }}>{error}</p>
                        <button onClick={() => navigate('/home')} className="btn-primary">
                            Back to Home
                        </button>
                    </div>
                )}

                {/* VALIDATING state */}
                {status === 'VALIDATING' && (
                    <div style={{ textAlign: 'center' }}>
                        <div className="loader" style={{ width: '48px', height: '48px', margin: '0 auto 1.5rem', border: '4px solid var(--text-main)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <p style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '1.1rem' }}>Connecting to session...</p>
                    </div>
                )}

                {/* READY / LIVE / COMPLETED */}
                {(status === 'READY' || status === 'LIVE' || status === 'COMPLETED') && (
                    <>
                        {/* User info + tenant status */}
                        <div className="glass-card" style={{
                            display: 'flex', alignItems: 'center', gap: '1.25rem',
                            padding: '1rem 2rem',
                            borderRadius: '1.25rem',
                        }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '50%',
                                background: 'rgba(255, 193, 7, 0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, fontSize: '1rem', color: '#1A1A1A', border: '1px solid rgba(255, 193, 7, 0.3)'
                            }}>
                                {user?.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>{user?.name || 'Client'}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>KYC Verification Session</div>
                            </div>
                            <div style={{ height: '40px', width: '1px', background: 'rgba(0,0,0,0.1)', margin: '0 0.5rem' }} />
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                Bank Officer: <span style={{
                                    color: tenantConnected ? '#10b981' : '#f59e0b',
                                    fontWeight: 700, marginLeft: '0.3rem'
                                }}>
                                    {tenantConnected ? '● Online' : '○ Waiting...'}
                                </span>
                            </div>
                        </div>

                        {/* Video Box */}
                        <div style={{
                            position: 'relative', width: '100%', maxWidth: '900px',
                            aspectRatio: '16/9', background: '#0f172a',
                            borderRadius: '1.5rem', overflow: 'hidden',
                            border: status === 'LIVE'
                                ? '4px solid #FFC107'
                                : '4px solid rgba(0,0,0,0.1)',
                            boxShadow: status === 'LIVE' ? '0 0 50px rgba(79, 235, 183, 0.15)' : '0 25px 50px -12px rgba(0,0,0,0.5)',
                            transition: 'all 0.3s'
                        }}>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{
                                    width: '100%', height: '100%',
                                    objectFit: 'cover',
                                    transform: 'scaleX(-1)', // Mirror effect for natural webcam feel
                                }}
                            />
                            <canvas ref={canvasRef} style={{ display: 'none' }} />

                            {/* REC indicator */}
                            {status === 'LIVE' && (
                                <div style={{
                                    position: 'absolute', top: '1.5rem', left: '1.5rem',
                                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                                    padding: '0.5rem 1rem', borderRadius: '2rem',
                                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                }}>
                                    <div style={{
                                        width: '10px', height: '10px', background: '#ef4444',
                                        borderRadius: '50%', animation: 'pulse 1.2s ease-in-out infinite',
                                    }} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>LIVE</span>
                                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 500 }}>· {frameCount} frames</span>
                                </div>
                            )}

                            {/* Tenant watching indicator */}
                            {status === 'LIVE' && tenantConnected && (
                                <div style={{
                                    position: 'absolute', top: '1.5rem', right: '1.5rem',
                                    background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(8px)',
                                    padding: '0.5rem 1rem', borderRadius: '2rem',
                                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                                    border: '1px solid rgba(255, 255, 255, 0.4)',
                                }}>
                                    <div style={{ width: '10px', height: '10px', background: '#5F5449', borderRadius: '50%' }} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>Bank Officer Watching</span>
                                </div>
                            )}

                            {/* Quality Warning */}
                            {qualityWarning && (
                                <div style={{
                                    position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
                                    background: 'rgba(239, 68, 68, 0.9)', backdropFilter: 'blur(8px)',
                                    padding: '0.75rem 1.25rem', borderRadius: '1rem',
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                }}>
                                    <AlertCircle size={20} color="white" />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>{qualityWarning}</span>
                                </div>
                            )}

                            {/* Start overlay (READY state) */}
                            {status === 'READY' && (
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)',
                                    gap: '1.5rem',
                                }}>
                                    <div style={{
                                        width: '80px', height: '80px', borderRadius: '50%',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 0 40px rgba(0, 0, 0, 0.2)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}>
                                        <Camera size={40} color="white" />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'white' }}>Ready to Verify</h3>
                                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', maxWidth: '300px', margin: '0 auto', lineHeight: 1.6 }}>
                                            Please ensure you are in a well-lit room and your face is clearly visible.
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '320px' }}>
                                        {videoDevices.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginLeft: '0.5rem' }}>Select Camera</label>
                                                <select
                                                    value={selectedCamera}
                                                    onChange={(e) => setSelectedCamera(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.75rem 1rem',
                                                        borderRadius: '0.75rem',
                                                        border: '1px solid rgba(0,0,0,0.1)',
                                                        background: 'white',
                                                        color: '#1A1A1A',
                                                        fontSize: '0.95rem',
                                                        fontWeight: 500,
                                                        outline: 'none',
                                                        cursor: 'pointer',
                                                        appearance: 'none', // Remove default arrow
                                                        backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%231A1A1A%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                                                        backgroundRepeat: 'no-repeat',
                                                        backgroundPosition: 'right 1rem top 50%',
                                                        backgroundSize: '0.65em auto',
                                                    }}
                                                >
                                                    {videoDevices.map(device => (
                                                        <option key={device.deviceId} value={device.deviceId}>
                                                            {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <button onClick={() => startStream(selectedCamera)} className="btn-primary" style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                                            padding: '1rem',
                                            fontSize: '1.1rem',
                                            width: '100%',
                                            marginTop: '0.5rem'
                                        }}>
                                            <Camera size={22} /> Start Verification
                                        </button>
                                    </div>
                                    {error && (
                                        <div style={{
                                            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                                            borderRadius: '0.75rem', padding: '0.75rem 1.25rem',
                                            color: '#fca5a5', fontSize: '0.9rem', maxWidth: '400px', textAlign: 'center', fontWeight: 500
                                        }}>
                                            {error}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Completed overlay */}
                            {status === 'COMPLETED' && (
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(255, 255, 255, 0.95)', gap: '1.5rem',
                                    backdropFilter: 'blur(10px)'
                                }}>
                                    <div style={{
                                        background: '#10b981', borderRadius: '50%', padding: '1.5rem',
                                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                                    }}>
                                        <CheckCircle size={64} color="white" />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1A1A1A', marginBottom: '0.5rem' }}>Verified!</h2>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 600, opacity: 0.9 }}>Your KYC session has been completed successfully.</p>
                                    </div>
                                    <button onClick={() => navigate('/home')} style={{
                                        padding: '1rem 2rem',
                                        background: '#1A1A1A',
                                        border: 'none',
                                        borderRadius: '1rem', color: 'white',
                                        fontWeight: 800, cursor: 'pointer', fontSize: '1rem',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                    }}>
                                        Return to Dashboard
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        {status === 'LIVE' && (
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(0, 0, 0, 0.1)',
                                    borderRadius: '1rem', padding: '0.85rem 1.5rem',
                                    fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500,
                                    display: 'flex', alignItems: 'center', gap: '0.75rem'
                                }}>
                                    <div style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%' }} />
                                    Keep your face centered and well-lit
                                </div>
                                <button onClick={endSession} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                                    padding: '0.85rem 1.5rem',
                                    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)',
                                    borderRadius: '1rem', color: '#ef4444',
                                    fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                                    boxShadow: '0 4px 6px rgba(239, 68, 68, 0.05)'
                                }}>
                                    End Session
                                </button>
                            </div>
                        )}

                        {/* Switch Camera Button (only if multiple cameras) */}
                        {status === 'LIVE' && videoDevices.length > 1 && (
                            <button
                                onClick={handleSwitchCamera}
                                style={{
                                    position: 'absolute', bottom: '2rem', right: '2rem',
                                    background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255, 255, 255, 0.4)',
                                    borderRadius: '50%', width: '56px', height: '56px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: 'white',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                    zIndex: 10,
                                    transition: 'transform 0.2s',
                                }}
                                title="Switch Camera"
                                onMouseEnter={e => e.currentTarget.style.transform = 'rotate(180deg)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'rotate(0deg)'}
                            >
                                <RefreshCw size={24} />
                            </button>
                        )}
                    </>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.85); }
                }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default UserCamera;
