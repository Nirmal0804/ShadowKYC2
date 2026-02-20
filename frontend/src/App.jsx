import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import DevDashboard from './pages/DevDashboard';
import TenantMonitor from './pages/TenantMonitor';
import UserCamera from './pages/UserCamera';
import DocumentUpload from './pages/DocumentUpload';

import LandingPage from './pages/LandingPage';

import { ThemeProvider } from './ThemeContext';

import Footer from './components/Footer';

// Protected Route: redirects to /login if not authenticated
const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('shadow_token');
    if (!token) return <Navigate to="/login" replace />;
    return children;
};

const App = () => {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-main)', transition: 'background 0.3s, color 0.3s' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/signup" element={<Signup />} />

                            {/* Protected Routes */}
                            <Route path="/home" element={
                                <ProtectedRoute><Home /></ProtectedRoute>
                            } />
                            <Route path="/dev" element={
                                <ProtectedRoute><DevDashboard /></ProtectedRoute>
                            } />
                            <Route path="/tenant/:sessionId" element={
                                <ProtectedRoute><TenantMonitor /></ProtectedRoute>
                            } />
                            {/* Document upload gate — must pass before live session */}
                            <Route path="/verify/:sessionId" element={
                                <ProtectedRoute><DocumentUpload /></ProtectedRoute>
                            } />
                            <Route path="/client/:sessionId" element={
                                <ProtectedRoute><UserCamera /></ProtectedRoute>
                            } />
                        </Routes>
                    </div>
                    <Footer />
                </div>
            </BrowserRouter>
        </ThemeProvider>
    );
};

export default App;
