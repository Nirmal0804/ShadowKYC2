import React from 'react';
import { Activity, User, Cpu, Box, Mic, Globe, ShieldAlert, CheckCircle, AlertTriangle, Shield } from 'lucide-react';

const IntegrityCard = ({ title, value, type = 'integrity', icon: Icon, description }) => {
    // Value is 0.0 to 1.0
    // If type is 'integrity', 1.0 is GOOD (Green).
    // If type is 'risk', 0.0 is GOOD (Green).

    const isGood = type === 'integrity' ? value > 0.7 : value < 0.3;
    const isBad = type === 'integrity' ? value < 0.4 : value > 0.7;

    let statusColor = '#10B981'; // Green (Safe)
    let statusText = 'PASS';

    if (isBad) {
        statusColor = '#EF4444'; // Red (Fail)
        statusText = 'FAIL';
    } else if (!isGood) {
        statusColor = '#F59E0B'; // Yellow (Warn)
        statusText = 'WARN';
    }

    const percentage = Math.round(value * 100);

    return (
        <div style={{
            background: 'rgba(15, 23, 42, 0.95)', // High opacity dark blue/slate
            borderRadius: '1rem',
            padding: '1.25rem',
            border: `1px solid ${statusColor}40`,
            boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 0 20px ${statusColor}10`,
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <Icon size={18} color="#94A3B8" />
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {title}
                    </span>
                </div>
                <div style={{
                    padding: '0.25rem 0.75rem', borderRadius: '2rem',
                    fontSize: '0.7rem', fontWeight: 800,
                    background: `${statusColor}20`,
                    color: statusColor,
                    border: `1px solid ${statusColor}40`
                }}>
                    {statusText}
                </div>
            </div>

            {/* Main Score */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'white' }}>
                    {percentage}%
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>
                    {type === 'risk' ? 'RISK' : 'INTEGRITY'}
                </span>
            </div>

            {/* Description / Sub-metric */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem', marginTop: 'auto' }}>
                <span style={{ fontSize: '0.75rem', color: '#CBD5E1', fontWeight: 500 }}>
                    {description || 'System Analysis'}
                </span>
            </div>

            {/* Progress Bar background */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, height: '4px',
                width: `${percentage}%`,
                background: statusColor,
                opacity: 0.5,
                transition: 'width 1s ease'
            }} />
        </div>
    );
};

const IntegrityGrid = ({ frameData, layerAverages }) => {
    const d = frameData || {};

    // Default values if data stream hasn't started
    const layers = [
        {
            title: "L1: Temporal",
            value: d.liveness !== undefined ? d.liveness : 0,
            type: 'integrity',
            icon: Activity,
            description: "Blink & Micro-motion"
        },
        {
            title: "L2: Face Match",
            value: d.face_match !== undefined ? d.face_match : 0,
            type: 'integrity',
            icon: User,
            description: "Biometric Identity"
        },
        {
            title: "L3: Texture",
            value: d.texture !== undefined ? d.texture : 0,
            type: 'integrity',
            icon: Cpu,
            description: "Skin/Pixel Artifacts"
        },
        {
            title: "L4: Geometry",
            value: d.geometry !== undefined ? d.geometry : 0,
            type: 'integrity',
            icon: Box,
            description: "3D Depth & Pose"
        },
        {
            title: "L5: Lip-Sync",
            value: d.lipsync !== undefined ? d.lipsync : 0,
            type: 'integrity',
            icon: Mic,
            description: "Audio-Visual Sync"
        },
        {
            title: "L6: Environment",
            value: d.environment !== undefined ? d.environment : 0,
            type: 'integrity',
            icon: Globe,
            description: "Background/Lighting"
        },
        {
            title: "L7: Meta-Fusion",
            value: d.risk !== undefined ? d.risk : 0, // Assuming 'risk' key holds L7 output (0-1 Risk Score)
            type: 'risk',
            icon: Shield,
            description: "Aggregated Risk AI"
        }
    ];

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginTop: '1.5rem',
            width: '100%'
        }}>
            {layers.map((layer, i) => (
                <IntegrityCard key={i} {...layer} />
            ))}
        </div>
    );
};

export default IntegrityGrid;
