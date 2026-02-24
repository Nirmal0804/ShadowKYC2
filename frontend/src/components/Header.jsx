import React from 'react';
import { Users, AlertTriangle, ShieldCheck, Bell } from 'lucide-react';

const Header = ({ stats }) => {
    // Fallback if stats isn't ready
    const metrics = stats || {
        sessions: 3,
        verified: 142,
        blocked: 5
    };

    return (
        <header style={{
            height: '80px',
            position: 'fixed', top: 0, left: '260px', right: 0,
            background: 'rgba(11, 14, 20, 0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 2rem',
            zIndex: 40
        }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', letterSpacing: '-0.3px' }}>
                Monitor Session
                <span style={{ fontSize: '0.85rem', color: '#64748B', marginLeft: '1rem', fontWeight: 500 }}>Live forensic feed</span>
            </h2>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '2rem', paddingRight: '2rem', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Live Sessions</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F59E0B' }}>
                            <span style={{ width: '8px', height: '8px', background: '#F59E0B', borderRadius: '50%', display: 'inline-block', marginRight: '0.5rem' }} />
                            {metrics.sessions} Active
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Today's Verified</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10B981' }}>
                            <ShieldCheck size={14} style={{ marginRight: '0.5rem', display: 'inline' }} />
                            {metrics.verified}
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Blocked Fraud</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#EF4444' }}>
                            <AlertTriangle size={14} style={{ marginRight: '0.5rem', display: 'inline' }} />
                            {metrics.blocked}
                        </div>
                    </div>
                </div>

                <button style={{
                    position: 'relative', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '50%', width: '40px', height: '40px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}>
                    <Bell size={20} color="#94A3B8" />
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '10px', height: '10px', background: '#EF4444', borderRadius: '50%', border: '2px solid #0B0E14' }} />
                </button>

                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', border: '2px solid rgba(255,255,255,0.1)' }} />
            </div>
        </header>
    );
};

export default Header;
