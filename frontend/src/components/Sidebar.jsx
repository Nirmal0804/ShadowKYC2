import React from 'react';
import { LayoutDashboard, BarChart2, Video, FileText, Settings, ShieldCheck } from 'lucide-react';

const Sidebar = ({ activeItem = 'Monitor Session' }) => {
    const navItems = [
        { label: 'Home', icon: LayoutDashboard },
        { label: 'Analytics', icon: BarChart2 },
        { label: 'Monitor Session', icon: Video, active: true },
        { label: 'Audit Logs', icon: FileText },
        { label: 'Settings', icon: Settings },
    ];

    return (
        <aside style={{
            width: '260px',
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            background: 'rgba(11, 14, 20, 0.95)',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem 1.5rem',
            zIndex: 50
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem', paddingLeft: '0.5rem' }}>
                <div style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 15px rgba(124, 58, 237, 0.4)'
                }}>
                    <ShieldCheck size={20} color="white" />
                </div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
                    SHADOW <span style={{ color: '#7C3AED' }}>KYC</span>
                </h1>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {navItems.map((item) => (
                    <button
                        key={item.label}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '1rem',
                            padding: '0.85rem 1rem',
                            borderRadius: '10px',
                            background: item.active ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                            border: item.active ? '1px solid rgba(124, 58, 237, 0.5)' : '1px solid transparent',
                            color: item.active ? '#FFD700' : '#94A3B8', // Yellow accent text for active
                            fontWeight: item.active ? 600 : 500,
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            transition: 'all 0.2s',
                            boxShadow: item.active ? '0 0 15px rgba(124, 58, 237, 0.15)' : 'none'
                        }}
                    >
                        <item.icon size={20} color={item.active ? '#FFD700' : '#94A3B8'} />
                        {item.label}
                    </button>
                ))}
            </nav>

            <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>System Status</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#10B981', fontWeight: 600 }}>
                    <div style={{ width: '8px', height: '8px', background: '#10B981', borderRadius: '50%', boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)' }} />
                    Operational
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
