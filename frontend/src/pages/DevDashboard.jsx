import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Download, UploadCloud, Shield, Activity, AlertTriangle, Monitor, Globe, Wifi, Cpu, Eye, StopCircle, Mic } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, RadialLinearScale, Filler } from 'chart.js';
import { Line, Radar } from 'react-chartjs-2';
import IntegrityGrid from '../components/IntegrityGrid';
import { useTheme } from '../ThemeContext';

// Register ChartJS components including RadialLinearScale for Radar charts
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, RadialLinearScale, Filler);

const DevDashboard = () => {
    const { theme, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('live');
    const [ws, setWs] = useState(null);
    const [stream, setStream] = useState(null);
    const [isStreaming, setIsStreaming] = useState(false);

    // Stats & Data
    const [sessionStats, setSessionStats] = useState({
        avg_risk: 0,
        classification: 'Inert',
        flagged_count: 0,
        layer_averages: { quality: 0, artifact: 0, liveness: 0, temporal: 0, deepfake: 0 }
    });
    const [frameData, setFrameData] = useState({
        quality: 0,
        artifact: 0,
        liveness: 0,
        deepfake: 0,
        flags: []
    });
    const [riskHistory, setRiskHistory] = useState([]);
    const [evidence, setEvidence] = useState([]);
    const [signals, setSignals] = useState({
        browser: 'Analyzing...',
        os: 'Analyzing...',
        screen: '...',
        connection: '4g'
    });

    // Refs
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const timelineRef = useRef(null);
    const captureIntervalRef = useRef(null);
    const startTimeRef = useRef(null);

    // Initial Setup
    useEffect(() => {
        // Connect WebSocket
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(`${protocol}//${window.location.host}/ws/live`);

        socket.onopen = () => console.log('WS Connected');
        socket.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'results') {
                updateUI(msg.frame, msg.session);
            }
        };
        setWs(socket);

        // Gather Passive Signals
        const ua = navigator.userAgent;
        setSignals({
            browser: getBrowserInfo(ua),
            os: getOSInfo(ua),
            screen: `${window.screen.width}x${window.screen.height}`,
            cores: navigator.hardwareConcurrency || 4,
            memory: navigator.deviceMemory || 8,
            lang: navigator.language,
            connection: navigator.connection ? navigator.connection.effectiveType : '4g'
        });

        return () => socket.close();
    }, []);

    // Enumerate Cameras
    const [cameras, setCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState('');

    useEffect(() => {
        const loadCameras = async () => {
            try {
                // Request permission first to get labels
                const initial = await navigator.mediaDevices.getUserMedia({ video: true });
                initial.getTracks().forEach(t => t.stop());

                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(d => d.kind === 'videoinput');
                setCameras(videoDevices);
                const laptopCam = videoDevices.find(d => d.label.toLowerCase().includes('integrated') || d.label.toLowerCase().includes('webcam'));
                if (laptopCam) setSelectedCamera(laptopCam.deviceId);
            } catch (err) {
                console.error("Camera access error", err);
            }
        };
        loadCameras();
    }, []);


    // Update UI from WebSocket Data
    const updateUI = (frame, session) => {
        setSessionStats({
            ...session,
            layer_averages: session.layer_averages || { quality: 0, artifact: 0, liveness: 0, temporal: 0, deepfake: 0 }
        });
        setFrameData(frame);

        setRiskHistory(prev => {
            const newPoint = { t: frame.timestamp, v: frame.risk };
            // Keep last 60 seconds of history for timeline
            const cutoff = frame.timestamp - 60;
            const filtered = prev.filter(p => p.t > cutoff);
            return [...filtered, newPoint];
        });

        if (frame.evidence_path) {
            setEvidence(prev => [{
                path: frame.evidence_path,
                flag: frame.flags[0] || 'High Risk',
                timestamp: frame.timestamp,
                risk: frame.risk
            }, ...prev]);
        }
    };

    const stopStream = () => {
        if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
        if (stream) stream.getTracks().forEach(t => t.stop());
        setStream(null);
        setIsStreaming(false);
    };

    const captureFrame = () => {
        if (!ws || ws.readyState !== WebSocket.OPEN || !videoRef.current) return;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.5);
        ws.send(JSON.stringify({
            type: 'frame',
            data: base64,
            timestamp: (Date.now() - startTimeRef.current) / 1000
        }));
    };

    const startStream = async () => {
        try {
            const constraints = {
                video: {
                    deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
                    width: 1280,
                    height: 720
                }
            };
            const s = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
            setIsStreaming(true);
            setEvidence([]);
            setRiskHistory([]);
            startTimeRef.current = Date.now();
            captureIntervalRef.current = setInterval(captureFrame, 333);
        } catch (err) {
            alert("Camera Error: " + err.message);
        }
    };

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResults, setUploadResults] = useState(null);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/analyze-session', { method: 'POST', body: formData });
            const data = await res.json();
            setUploadResults(data);
            setSessionStats(data); // Update main stats with upload results
        } catch (err) {
            alert("Upload failed: " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    // Export Report
    const downloadReport = () => {
        const report = {
            timestamp: new Date().toISOString(),
            session_stats: sessionStats,
            passive_signals: signals,
            evidence_log: evidence,
            risk_history: riskHistory
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shadow_kyc_report_${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // --- Chart Configs ---

    // Radar Chart Data (Dynamic Layer Scores)
    const radarData = {
        labels: ['Data Quality', 'Artifacts', 'Liveness', 'Temporal', 'Deepfake'],
        datasets: [{
            label: 'Integrity Score',
            data: [
                (frameData.quality || 0) * 100,
                (frameData.artifact || 0) * 100,
                (frameData.liveness || 0) * 100,
                (sessionStats.layer_averages?.temporal || 0) * 100,
                (frameData.deepfake || 0) * 100,
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
                pointLabels: { color: 'var(--text-secondary)', font: { size: 11, weight: 600 } },
                ticks: { display: false, max: 100, min: 0 }
            }
        },
        plugins: { legend: { display: false } }
    };

    // Render
    const isHighRisk = sessionStats.classification === 'HIGH_RISK';
    const riskColor = isHighRisk ? '#ef4444' : (sessionStats.classification === 'MEDIUM_RISK' ? '#f59e0b' : '#5F5449');


    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-color)',
            color: 'var(--text-main)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            padding: '1.5rem',
            display: 'flex', flexDirection: 'column',
            position: 'relative', overflow: 'hidden'
        }}>
            {/* Background Effects */}
            <div className="spotlight" />
            <div className="spotlight" style={{ top: 'auto', bottom: '-20vw', left: '-10vw', right: 'auto', width: '80vw', height: '80vw', animationDelay: '1s' }} />

            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#5F5449' }}>
                        SHADOW <span style={{ color: '#756A5E' }}>KYC</span>
                    </h1>
                    <p style={{ fontSize: '0.9rem', color: 'rgba(95, 84, 73, 0.7)', fontWeight: 600 }}>Integrity Analyzer v2.0</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="glass-card" style={{
                        display: 'flex',
                        padding: '0.35rem',
                        borderRadius: '0.9rem',
                        gap: '0.25rem',
                        alignItems: 'center'
                    }}>
                        <button
                            onClick={() => setActiveTab('live')}
                            style={{
                                padding: '0.6rem 1.25rem', borderRadius: '0.6rem', border: 'none',
                                background: activeTab === 'live' ? '#FFC107' : 'rgba(0,0,0,0.05)',
                                color: activeTab === 'live' ? '#1A1A1A' : 'var(--text-muted)',
                                cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
                                boxShadow: activeTab === 'live' ? '0 4px 12px rgba(255, 193, 7, 0.4)' : 'none'
                            }}
                        >
                            Live Session
                        </button>
                        <button
                            onClick={() => setActiveTab('upload')}
                            style={{
                                padding: '0.6rem 1.25rem', borderRadius: '0.6rem', border: 'none',
                                background: activeTab === 'upload' ? '#FFC107' : 'rgba(0,0,0,0.05)',
                                color: activeTab === 'upload' ? '#1A1A1A' : 'var(--text-muted)',
                                cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
                                boxShadow: activeTab === 'upload' ? '0 4px 12px rgba(255, 193, 7, 0.4)' : 'none'
                            }}
                        >
                            Analyze Video
                        </button>
                    </div>

                    <button
                        className="glass-card"
                        style={{
                            color: 'var(--text-main)',
                            borderRadius: '0.75rem', padding: '0.8rem 1.25rem',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
                        }}
                        onClick={downloadReport}
                    >
                        <Download size={18} /> Export JSON
                    </button>
                    {activeTab === 'live' && (
                        !isStreaming ?
                            <button className="btn-primary" onClick={startStream} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Play size={18} /> Start Session
                            </button> :
                            <button className="glass-card" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '0.8rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }} onClick={stopStream}>
                                <StopCircle size={18} /> Stop Session
                            </button>
                    )}
                </div>
            </header>

            {activeTab === 'live' ? (
                <div className="dashboard-grid animate-fade-in" style={{ position: 'relative', zIndex: 1, display: 'grid', gap: '1.5rem' }}>
                    {/* Video Stream Section */}
                    <div style={{
                        position: 'relative', height: '60vh', minHeight: '480px', width: '100%',
                        background: '#0f172a', borderRadius: '1.5rem', overflow: 'hidden',
                        border: '4px solid rgba(0, 0, 0, 0.1)',
                        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0f172a' }}>
                            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <canvas ref={canvasRef} style={{ display: 'none' }} />

                            {/* Camera Select Overlay */}
                            {!isStreaming && (
                                <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                                    <select
                                        value={selectedCamera}
                                        onChange={(e) => setSelectedCamera(e.target.value)}
                                        style={{
                                            background: 'rgba(15, 23, 42, 0.8)', color: 'white',
                                            border: '1px solid rgba(255, 255, 255, 0.2)', padding: '0.75rem 1.5rem',
                                            borderRadius: '2rem', backdropFilter: 'blur(10px)',
                                            fontWeight: 600, cursor: 'pointer', outline: 'none',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                                        }}
                                    >
                                        {cameras.map(c => <option key={c.deviceId} value={c.deviceId}>{c.label}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* HUD Overlay */}
                            {isStreaming && (
                                <>
                                    <div className="hud-overlay" style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', right: '1.5rem', zIndex: 10, display: 'flex', gap: '1rem' }}>
                                        <div className="hud-metric" style={{ background: 'rgba(95, 84, 73, 0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', padding: '0.5rem 1rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Eye size={16} color="#ffffff" />
                                            <span style={{ fontWeight: 700 }}>Quality: {Math.round(frameData.quality * 100)}%</span>
                                        </div>
                                        <div className="hud-metric" style={{ background: 'rgba(95, 84, 73, 0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', padding: '0.5rem 1rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Activity size={16} color="#ffffff" />
                                            <span style={{ fontWeight: 700 }}>Artifacts: {Math.round(frameData.artifact * 100)}%</span>
                                        </div>
                                        <div className="hud-metric" style={{ background: 'rgba(95, 84, 73, 0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', padding: '0.5rem 1rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Monitor size={16} color="#ffffff" />
                                            <span style={{ fontWeight: 700 }}>Liveness: {Math.round(frameData.liveness * 100)}%</span>
                                        </div>
                                    </div>

                                    {/* Low Confidence Alert */}
                                    {frameData.quality < 0.4 && (
                                        <div className="hud-warning" style={{ background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: '1px solid #f87171', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
                                            <AlertTriangle size={32} style={{ marginBottom: '0.5rem' }} />
                                            <h3 style={{ fontWeight: 800 }}>Low Confidence Mode</h3>
                                            <p style={{ fontSize: '0.8rem', opacity: 0.9 }}>Poor lighting or blur detected.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Interactive Timeline */}
                        <div style={{
                            height: '60px', background: 'white', borderTop: '1px solid rgba(0,0,0,0.1)',
                            position: 'relative', display: 'flex', alignItems: 'center', padding: '0 1.5rem',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <div className="timeline-track" ref={timelineRef} style={{ background: 'rgba(0,0,0,0.05)', borderRadius: '6px', flex: 1, height: '6px', position: 'relative' }}>
                                {riskHistory.map((point, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            position: 'absolute', top: '-10px', bottom: '-10px', width: '3px',
                                            left: `${((point.t - (riskHistory[0]?.t || 0)) / 60) * 100}%`,
                                            background: point.v > 0.7 ? '#ef4444' : (point.v > 0.4 ? '#f59e0b' : '#5F5449'),
                                            opacity: 0.8
                                        }}
                                    />
                                ))}
                            </div>
                            <div style={{ marginLeft: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                LIVE MONITOR
                            </div>
                        </div>
                    </div>

                    {/* Integrity Detailed Breakdown */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <IntegrityGrid frameData={frameData} layerAverages={sessionStats.layer_averages} />
                    </div>

                    {/* BOTTOM ROW: Metrics & Evidence */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', width: '100%' }}>

                        {/* Col 1: Primary Risk Score */}
                        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                            <div style={{ position: 'relative', width: '150px', height: '150px', marginBottom: '1.5rem' }}>
                                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="2.5" />
                                    <path
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                                        fill="none"
                                        stroke="url(#gradientGrey)"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeDasharray={`${sessionStats.avg_risk * 100}, 100`}
                                    />
                                    <defs>
                                        <linearGradient id="gradientGrey" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#1A1A1A" />
                                            <stop offset="100%" stopColor="#808080" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{Math.round(sessionStats.avg_risk * 100)}</span>
                                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px' }}>RISK SCORE</span>
                                </div>
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: riskColor }}>
                                {sessionStats.classification.replace('_', ' ')}
                            </h2>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                {sessionStats.flagged_count} Anomalies Detected
                            </p>
                        </div>

                        {/* Col 2: Layer Intelligence (Radar) */}
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Shield size={16} color="#FFC107" /> Integrity Layers
                            </h3>
                            <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Radar data={radarData} options={radarOptions} />
                            </div>
                        </div>

                        {/* Col 3: Evidence Feed */}
                        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', height: '400px' }}>
                            <h3 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertTriangle size={16} color="#ef4444" /> Forensic Evidence
                            </h3>
                            <div className="evidence-list" style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {evidence.map((ev, i) => (
                                    <div key={i} style={{
                                        background: 'rgba(0,0,0,0.03)', borderRadius: '0.75rem', padding: '0.75rem',
                                        display: 'flex', gap: '1rem', marginBottom: '0.75rem',
                                        border: '1px solid rgba(0,0,0,0.05)',
                                        transition: 'all 0.2s', cursor: 'pointer'
                                    }}>
                                        <div style={{ width: '60px', height: '45px', background: '#0f172a', borderRadius: '0.5rem', overflow: 'hidden', flexShrink: 0 }}>
                                            <img src={`/${ev.path}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{ev.flag}</span>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: ev.risk > 0.7 ? '#ef4444' : '#f59e0b' }}>{Math.round(ev.risk * 100)}%</span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                Timestamp: {ev.timestamp?.toFixed(2)}s
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {evidence.length === 0 && (
                                    <div style={{
                                        padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem',
                                        background: 'rgba(0,0,0,0.02)', borderRadius: '1rem', border: '1px dashed rgba(0,0,0,0.1)'
                                    }}>
                                        No anomalies detected yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="glass-card animate-fade-in" style={{ padding: '5rem', textAlign: 'center', marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <div
                        className="upload-zone"
                        style={{
                            cursor: 'pointer', border: '2px dashed rgba(0,0,0,0.1)', padding: '4rem', borderRadius: '2rem',
                            transition: 'all 0.3s', background: 'rgba(255,255,255,0.5)', width: '100%', maxWidth: '600px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center'
                        }}
                    >
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255, 193, 7, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem',
                            border: '1px solid rgba(255, 193, 7, 0.3)'
                        }}>
                            <UploadCloud size={40} color="#FFC107" />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                            Drop session video here
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
                            Supports MP4, WEBM, AVI up to 500MB
                        </p>
                        <input type="file" onChange={handleUpload} style={{ display: 'none' }} id="up" />
                        <button
                            onClick={() => document.getElementById('up').click()}
                            className="btn-primary"
                        >
                            <UploadCloud size={18} /> Select Video File
                        </button>
                    </div>

                    {isUploading && (
                        <div style={{ marginTop: '3rem' }}>
                            <div className="loader" style={{ width: '40px', height: '40px', margin: '0 auto 1rem', borderTopColor: '#10b981', borderLeftColor: '#10b981' }}></div>
                            <p style={{ color: '#10b981', fontWeight: 600 }}>Processing integrity layers...</p>
                        </div>
                    )}

                    {/* Upload Results - also glass */}
                    {uploadResults && (
                        <div className="glass-card" style={{
                            marginTop: '3rem', textAlign: 'left', width: '100%', maxWidth: '800px',
                            padding: '2rem', borderRadius: '1.5rem',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: uploadResults.risk_score > 0.7 ? '#ef4444' : '#10b981' }} />
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                    Analysis Results: {uploadResults.classification}
                                </h2>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Global Risk Score</p>
                                    <p style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{Math.round(uploadResults.risk_score * 100)}%</p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Flags Detected</p>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                                        {uploadResults.reason_codes.map((code, i) => (
                                            <span key={i} style={{
                                                background: 'rgba(95, 84, 73, 0.1)', color: '#5F5449', border: '1px solid rgba(95, 84, 73, 0.3)',
                                                padding: '0.35rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: 600
                                            }}>
                                                {code}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            <style>{`
        .evidence-list::-webkit-scrollbar { width: 6px; }
        .evidence-list::-webkit-scrollbar-track { background: transparent; }
        .evidence-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .evidence-list::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
    `}</style>
        </div>
    );
};

// Helper Functions
const getBrowserInfo = (ua) => {
    if (ua.includes("Chrome")) return "Chrome / Blink";
    if (ua.includes("Firefox")) return "Firefox / Gecko";
    if (ua.includes("Safari")) return "Safari / WebKit";
    return "Unknown Browser";
};

const getOSInfo = (ua) => {
    if (ua.includes("Win")) return "Windows 11/10";
    if (ua.includes("Mac")) return "macOS";
    if (ua.includes("Linux")) return "Linux";
    return "Unknown OS";
};

export default DevDashboard;
