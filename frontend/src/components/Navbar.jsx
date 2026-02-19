import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '../ThemeContext';

const Navbar = ({
    links = [],
    rightContent = null,
    showThemeToggle = true,
    logoClickable = true,
    user = null,
    role = null,
    onLogout = null,
    onProfileClick = null
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const themeContext = useTheme();
    const theme = themeContext?.theme || 'light';
    const toggleTheme = themeContext?.toggleTheme || (() => { });

    const defaultLinks = [
        { label: 'Home', path: '/home' },
        { label: 'Solutions', path: '#' },
        { label: 'About Us', path: '#' },
        { label: 'Contact', path: '#' },
    ];

    const displayLinks = (links && links.length > 0) ? links : (links === null ? [] : defaultLinks);

    return (
        <nav style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1.25rem 2rem',
            borderBottom: '1px solid var(--nav-border)',
            background: 'var(--nav-bg)',
            backdropFilter: 'blur(20px)',
            position: 'sticky', top: 0, zIndex: 100,
            transition: 'all 0.3s ease'
        }}>
            {/* Logo Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                    style={{
                        width: '40px', height: '40px', borderRadius: '0.75rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', cursor: logoClickable ? 'pointer' : 'default'
                    }}
                    onClick={() => logoClickable && navigate('/')}
                >
                    <img src="/logo.svg" alt="SHADOW KYC" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <span
                    style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-main)', cursor: logoClickable ? 'pointer' : 'default' }}
                    onClick={() => logoClickable && navigate('/')}
                >
                    SHADOW <span style={{ color: '#FFC107' }}>KYC</span>
                </span>
            </div>

            {/* Right Group: Links + Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                {/* Links */}
                {displayLinks.length > 0 && (
                    <div style={{ display: 'flex', gap: '2rem', color: 'var(--nav-link)', fontWeight: 600, fontSize: '0.95rem' }}>
                        {displayLinks.map((link, idx) => {
                            const isHash = link.path === '#';
                            // Logic for active state
                            const isActive = link.active || (location.pathname === link.path);

                            if (isHash) {
                                return (
                                    <span key={idx} style={{ cursor: 'pointer', transition: 'color 0.2s', color: isActive ? 'var(--nav-link-active)' : 'inherit' }}>
                                        {link.label}
                                    </span>
                                );
                            }
                            return (
                                <Link key={idx} to={link.path} style={{ textDecoration: 'none', color: isActive ? 'var(--nav-link-active)' : 'inherit', transition: 'color 0.2s' }}>
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* Theme Toggle */}
                {showThemeToggle && (
                    <button
                        onClick={toggleTheme}
                        style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            border: '1px solid var(--nav-border)',
                            background: 'var(--glass-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all 0.3s',
                            color: 'var(--text-main)',
                        }}
                    >
                        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} color="#FFC107" />}
                    </button>
                )}

                {/* User Profile Pill */}
                {user && (
                    <div
                        onClick={onProfileClick}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--nav-border)',
                            borderRadius: '2rem', padding: '0.4rem 1.25rem',
                            backdropFilter: 'blur(5px)',
                            cursor: onProfileClick ? 'pointer' : 'default',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--nav-border)'}
                    >
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: 'rgba(255, 193, 7, 0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-main)',
                            border: '1px solid rgba(255, 193, 7, 0.3)',
                        }}>
                            {user.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{user.name || 'User'}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                {role === 'tenant' ? 'Bank Officer' : (role === 'client' ? 'Client' : (role || 'User'))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Logout Button */}
                {onLogout && (
                    <button onClick={onLogout} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '0.75rem', padding: '0.5rem 1rem',
                        color: '#fca5a5', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                        transition: 'all 0.2s',
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    >
                        <LogOut size={16} /> Logout
                    </button>
                )}

                {/* Custom Right Content */}
                {rightContent}
            </div>
        </nav>
    );
};

export default Navbar;
