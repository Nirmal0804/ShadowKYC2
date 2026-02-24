import React, { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Shield, Upload, CheckCircle, AlertCircle, FileText,
    Camera, ArrowRight, X, Eye, Loader, Lock, Video
} from 'lucide-react';
import { useTheme } from '../ThemeContext';

// ── Accepted document types ───────────────────────────────────────────────────
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MAX_SIZE_MB = 5;
const DOCS = [
    {
        id: 'gov_id',
        label: 'Government ID',
        sublabel: 'Aadhaar / PAN / Passport / Voter ID',
        icon: <FileText size={24} />,
        color: '#FFC107',
        required: true,
    },
    {
        id: 'selfie',
        label: 'Live Selfie Photo',
        sublabel: 'Clear photo of your face (no sunglasses)',
        icon: <Camera size={24} />,
        color: '#FFC107',
        required: true,
    },
    {
        id: 'address_proof',
        label: 'Address Proof',
        sublabel: 'Utility bill / Bank statement (optional)',
        icon: <FileText size={24} />,
        color: '#FFC107',
        required: false,
    },
];

// ── Single upload slot ────────────────────────────────────────────────────────
const UploadSlot = ({ doc, file, onFile, onRemove, error }) => {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(doc.id, f);
    }, [doc.id, onFile]);

    const preview = file && file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : null;

    return (
        <div
            style={{
                background: file
                    ? 'rgba(255, 193, 7, 0.1)'
                    : dragging ? 'rgba(255, 193, 7, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                border: `2px dashed ${error ? '#ef4444'
                    : file ? '#FFC107'
                        : dragging ? '#FFC107'
                            : 'rgba(0, 0, 0, 0.1)'
                    }`,
                borderRadius: '1.25rem',
                padding: '1.25rem 1.5rem',
                transition: 'all 0.2s',
                cursor: file ? 'default' : 'pointer',
                boxShadow: dragging ? '0 10px 25px -5px rgba(95, 84, 73, 0.2)' : 'none',
                transform: dragging ? 'scale(1.01)' : 'scale(1)',
            }}
            onClick={() => !file && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
        >
            <input
                ref={inputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                style={{ display: 'none' }}
                onChange={(e) => { if (e.target.files[0]) onFile(doc.id, e.target.files[0]); }}
            />

            {file ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '1rem',
                        background: preview ? 'transparent' : `${doc.color}15`,
                        border: `1px solid ${doc.color}30`,
                        overflow: 'hidden', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {preview
                            ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <FileText size={24} color={doc.color} />
                        }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem', color: 'var(--text-main)' }}>{doc.label}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                        <CheckCircle size={22} color="#10b981" />
                        <button
                            onClick={(e) => { e.stopPropagation(); onRemove(doc.id); }}
                            style={{
                                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '0.5rem', padding: '0.4rem',
                                color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '52px', height: '52px', borderRadius: '1rem',
                        background: 'rgba(0, 0, 0, 0.03)', border: '1px solid rgba(0, 0, 0, 0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, color: 'var(--text-muted)',
                    }}>
                        {doc.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem', color: 'var(--text-main)' }}>
                            {doc.label}
                            {!doc.required && (
                                <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                    (optional)
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{doc.sublabel}</div>
                    </div>
                    <div style={{ color: 'var(--accent)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', flexShrink: 0, fontWeight: 700 }}>
                        <Upload size={18} />
                        <span>Upload</span>
                    </div>
                </div>
            )}

            {error && (
                <div style={{
                    marginTop: '0.75rem', padding: '0.5rem 0.8rem',
                    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '0.6rem', fontSize: '0.8rem', color: '#fca5a5',
                    display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500
                }}>
                    <AlertCircle size={14} /> {error}
                </div>
            )}
        </div>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const DocumentUpload = () => {
    const { theme, toggleTheme } = useTheme();
    const { sessionId } = useParams();
    const navigate = useNavigate();

    const [files, setFiles] = useState({});
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [approved, setApproved] = useState(false);

    const user = JSON.parse(localStorage.getItem('shadow_user') || '{}');

    const handleFile = (docId, file) => {
        if (!file) return;
        const newErrors = { ...errors };
        if (!ACCEPTED_TYPES.includes(file.type)) {
            newErrors[docId] = 'Only JPG, PNG, or PDF files are accepted.';
            setErrors(newErrors);
            return;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            newErrors[docId] = `File too large. Max ${MAX_SIZE_MB} MB.`;
            setErrors(newErrors);
            return;
        }
        delete newErrors[docId];
        setErrors(newErrors);
        setFiles(prev => ({ ...prev, [docId]: file }));
    };

    const removeFile = (docId) => {
        setFiles(prev => { const n = { ...prev }; delete n[docId]; return n; });
        setErrors(prev => { const n = { ...prev }; delete n[docId]; return n; });
    };

    const requiredDocs = DOCS.filter(d => d.required);
    const allRequiredUploaded = requiredDocs.every(d => files[d.id]);
    const uploadedCount = Object.keys(files).length;

    const handleSubmit = async () => {
        setSubmitError('');

        // Client-side required check
        const newErrors = {};
        requiredDocs.forEach(d => {
            if (!files[d.id]) newErrors[d.id] = 'This document is required.';
        });
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setSubmitting(true);
        try {
            // Build FormData — session_id goes in the URL as a query param
            const formData = new FormData();
            Object.entries(files).forEach(([key, file]) => {
                formData.append(key, file);
            });

            const url = `/session/upload-docs?session_id=${encodeURIComponent(sessionId)}`;
            const res = await fetch(url, {
                method: 'POST',
                // Do NOT set Content-Type — browser sets multipart boundary automatically
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('shadow_token') || ''}`,
                },
                body: formData,
            });

            let data = {};
            try { data = await res.json(); } catch (_) { }

            if (res.ok && data.approved) {
                // Store approval in sessionStorage so UserCamera doesn't redirect back
                sessionStorage.setItem(`doc_approved_${sessionId}`, '1');
                setApproved(true);
            } else {
                const msg = data.detail || data.message || 'Document verification failed. Please try again.';
                setSubmitError(msg);
            }
        } catch (err) {
            setSubmitError('Could not reach server. Please check your connection.');
        } finally {
            setSubmitting(false);
        }
    };

    const enterSession = () => navigate(`/client/${sessionId}`);

    // ── Approved success screen ───────────────────────────────────────────────
    if (approved) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: '2rem', padding: '2rem',
                position: 'relative', overflow: 'hidden',
                background: 'var(--bg-color)',
                color: 'var(--text-main)'
            }} className="animate-fade-in">
                {/* Background Effects */}
                <div className="spotlight" />
                <div className="spotlight" style={{ top: 'auto', bottom: '-20vw', left: '-10vw', right: 'auto', width: '80vw', height: '80vw', animationDelay: '1s' }} />

                <div className="glass-card" style={{
                    padding: '3rem', textAlign: 'center',
                    maxWidth: '500px', width: '100%',
                }}>
                    <div style={{
                        width: '90px', height: '90px', borderRadius: '50%',
                        background: 'rgba(255, 193, 7, 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        boxShadow: '0 0 0 10px rgba(255, 193, 7, 0.1), 0 0 0 20px rgba(255, 193, 7, 0.05)',
                        animation: 'successPulse 2s ease-in-out infinite',
                        border: '1px solid rgba(255, 193, 7, 0.4)',
                    }}>
                        <CheckCircle size={48} color="#FFC107" />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                        Documents Verified!
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '0.25rem', fontWeight: 500 }}>
                        Your identity has been confirmed.
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        You are now cleared to join the live KYC session.
                    </p>

                    {/* Checklist */}
                    <div style={{
                        background: 'rgba(95, 84, 73, 0.1)', border: '1px solid rgba(95, 84, 73, 0.2)',
                        borderRadius: '1rem', padding: '1.25rem 1.75rem',
                        display: 'flex', flexDirection: 'column', gap: '0.75rem',
                        marginTop: '2rem', marginBottom: '2rem', textAlign: 'left'
                    }}>
                        {Object.keys(files).map(key => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#10b981', fontWeight: 600 }}>
                                <CheckCircle size={18} color="#10b981" />
                                {DOCS.find(d => d.id === key)?.label || key}
                            </div>
                        ))}
                    </div>

                    {/* Enter session button */}
                    <button
                        onClick={enterSession}
                        className="btn-primary"
                        style={{
                            width: '100%',
                            display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center',
                            padding: '1rem 2rem',
                            fontSize: '1.05rem',
                            animation: 'fadeUp 0.5s ease 0.3s both',
                        }}
                    >
                        <Video size={22} />
                        Enter Live Session
                        <ArrowRight size={20} />
                    </button>
                </div>

                <style>{`
                    @keyframes successPulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.05); }
                    }
                    @keyframes fadeUp {
                        from { opacity: 0; transform: translateY(16px); }
                        to   { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </div>
        );
    }

    // ── Upload form ───────────────────────────────────────────────────────────
    return (
        <div style={{
            minHeight: '100vh',
            position: 'relative', overflow: 'hidden',
            background: 'var(--bg-color)',
            color: 'var(--text-main)'
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
                    {/* Step indicator */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem' }}>
                        {[1, 2, 3].map(s => (
                            <div key={s} style={{
                                width: '20px', height: '4px', borderRadius: '2px',
                                background: 2 >= s ? '#FFC107' : 'rgba(0,0,0,0.05)'
                            }} />
                        ))}
                    </div>
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0, 0, 0, 0.05)',
                        borderRadius: '0.5rem', padding: '0.4rem 0.85rem',
                        fontSize: '0.8rem', fontWeight: 700, letterSpacing: '2px', color: 'var(--text-secondary)',
                    }}>
                        SESSION: {sessionId}
                    </div>
                </div>
            </nav>

            {/* Content */}
            <div style={{
                maxWidth: '680px', margin: '0 auto',
                padding: '3.5rem 2rem',
                position: 'relative', zIndex: 1,
            }} className="animate-fade-in">
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '72px', height: '72px', borderRadius: '1.5rem',
                        background: 'rgba(255, 193, 7, 0.15)',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.25rem',
                    }}>
                        <Lock size={32} color="#FFC107" />
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: '#1A1A1A' }}>
                        Document Verification
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '450px', margin: '0 auto', fontWeight: 500 }}>
                        Upload your identity documents to be verified before joining the live session.
                    </p>
                </div>

                {/* Main Card */}
                <div className="glass-card" style={{ padding: '2.5rem' }}>
                    {/* User strip */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        background: 'rgba(0, 0, 0, 0.03)', border: '1px solid rgba(0, 0, 0, 0.05)',
                        borderRadius: '1rem', padding: '0.85rem 1.25rem', marginBottom: '1.5rem',
                    }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: 'rgba(255, 193, 7, 0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '0.9rem', flexShrink: 0, color: '#1A1A1A',
                            border: '1px solid rgba(255, 193, 7, 0.3)'
                        }}>
                            {user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{user?.name || 'Client'}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>KYC Applicant</div>
                        </div>
                        <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, background: 'white', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.05)' }}>
                            {uploadedCount} / {DOCS.length} uploaded
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{
                        height: '6px', background: 'rgba(0,0,0,0.1)',
                        borderRadius: '3px', marginBottom: '1.5rem', overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${(uploadedCount / DOCS.length) * 100}%`,
                            background: 'var(--accent-gradient)',
                            borderRadius: '3px', transition: 'width 0.4s ease',
                        }} />
                    </div>

                    {/* Upload slots */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                        {DOCS.map(doc => (
                            <UploadSlot
                                key={doc.id}
                                doc={doc}
                                file={files[doc.id]}
                                onFile={handleFile}
                                onRemove={removeFile}
                                error={errors[doc.id]}
                            />
                        ))}
                    </div>

                    {/* Info box */}
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '1rem', padding: '1rem 1.25rem',
                        marginBottom: '1.5rem',
                        display: 'flex', gap: '0.85rem', alignItems: 'flex-start',
                    }}>
                        <Eye size={18} color="#60a5fa" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div style={{ fontSize: '0.85rem', color: '#93c5fd', lineHeight: 1.6 }}>
                            <strong style={{ color: '#60a5fa' }}>Accepted:</strong> JPG, PNG, PDF · Max {MAX_SIZE_MB} MB per file &nbsp;·&nbsp;
                            <strong style={{ color: '#60a5fa' }}>Required:</strong> Government ID + Selfie
                        </div>
                    </div>

                    {/* Error */}
                    {submitError && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '1rem', padding: '1rem',
                            marginBottom: '1.5rem',
                            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                            color: '#fca5a5', fontSize: '0.9rem', lineHeight: 1.5,
                            fontWeight: 500
                        }}>
                            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                            {submitError}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={!allRequiredUploaded || submitting}
                        className={allRequiredUploaded && !submitting ? "btn-primary" : ""}
                        style={{
                            width: '100%', padding: '1.1rem',
                            background: allRequiredUploaded
                                ? undefined // handled by class
                                : 'rgba(0, 0, 0, 0.05)',
                            border: allRequiredUploaded ? 'none' : '1px solid rgba(0, 0, 0, 0.05)',
                            borderRadius: '1rem',
                            color: allRequiredUploaded ? 'var(--button-text)' : 'rgba(0, 0, 0, 0.3)',
                            fontWeight: 800, fontSize: '1.05rem',
                            cursor: allRequiredUploaded && !submitting ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                            transition: 'all 0.2s',
                        }}
                    >
                        {submitting ? (
                            <>
                                <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                Verifying Documents...
                            </>
                        ) : (
                            <>
                                {allRequiredUploaded ? <CheckCircle size={22} /> : <Lock size={20} />}
                                {allRequiredUploaded ? 'Submit & Verify Documents' : 'Upload Required Documents to Continue'}
                                {allRequiredUploaded && <ArrowRight size={20} />}
                            </>
                        )}
                    </button>

                    <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8rem', color: 'rgba(95, 84, 73, 0.5)', fontWeight: 500 }}>
                        🔒 All documents are encrypted and processed securely
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default DocumentUpload;
