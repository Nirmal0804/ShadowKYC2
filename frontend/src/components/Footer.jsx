import React from 'react';
import { Shield, ArrowRight } from 'lucide-react';

const Footer = () => {
    return (
        <footer style={{
            width: '100%',
            padding: '4rem 2rem',
            background: 'var(--glass-bg)',
            borderTop: '1px solid var(--nav-border)',
            marginTop: 'auto',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: 'var(--text-main)',
            backdropFilter: 'blur(20px)',
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '3rem'
            }}>
                {/* Top Heading (Reference Style) */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        marginBottom: '0.5rem'
                    }}>
                        Verified Trust for the AI Era <span style={{ fontSize: '1.5rem' }}>🤝</span>
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        The new standard for identity verification and anti-spoofing.
                    </p>
                </div>

                {/* 4-Column Grid (Reference Structure) */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '2rem',
                    textAlign: 'left'
                }}>

                    {/* Column 1 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Product</h4>
                        <FooterLink>Verification Flow</FooterLink>
                        <FooterLink>Liveness Detection</FooterLink>
                        <FooterLink>Document Analysis</FooterLink>
                        <FooterLink>Fraud Intelligence</FooterLink>
                        <FooterLink>API Reference</FooterLink>
                    </div>

                    {/* Column 2 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Solutions</h4>
                        <FooterLink>Banks & Fintechs</FooterLink>
                        <FooterLink>Crypto Exchanges</FooterLink>
                        <FooterLink>Gaming Platforms</FooterLink>
                        <FooterLink>Telecommunications</FooterLink>
                        <FooterLink>Government</FooterLink>
                    </div>

                    {/* Column 3 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Company</h4>
                        <FooterLink>About Us</FooterLink>
                        <FooterLink>Careers</FooterLink>
                        <FooterLink>Press Kit</FooterLink>
                        <FooterLink>Contact Support</FooterLink>
                        <FooterLink>System Status</FooterLink>
                    </div>

                    {/* Column 4 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Legal & Trust</h4>
                        <FooterLink>Privacy Policy</FooterLink>
                        <FooterLink>Terms of Service</FooterLink>
                        <FooterLink>Cookie Policy</FooterLink>
                        <FooterLink>GDPR Compliance</FooterLink>
                        <div style={{
                            marginTop: '0.5rem',
                            fontWeight: 700,
                            color: 'var(--accent)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}>
                            Book a Demo <span style={{ fontSize: '1.2rem' }}>👋</span>
                        </div>
                    </div>

                </div>

                {/* Bottom Bar */}
                <div style={{
                    borderTop: '1px solid var(--nav-border)',
                    paddingTop: '2rem',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                        <Shield size={18} color="var(--accent)" />
                        <span style={{ color: 'var(--text-main)' }}>SHADOW KYC</span>
                    </div>
                    <div>&copy; 2026 Shadow Identity Intelligence. All rights reserved.</div>
                </div>
            </div>
        </footer>
    );
};

const FooterLink = ({ children }) => (
    <a href="#" style={{
        textDecoration: 'none',
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
        transition: 'color 0.2s ease',
        fontWeight: 500
    }}
        onMouseEnter={(e) => e.target.style.color = 'var(--accent)'}
        onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
    >
        {children}
    </a>
);

export default Footer;
