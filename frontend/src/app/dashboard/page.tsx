'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, LogOut, LayoutDashboard, Users, Settings, Package, Calendar } from 'lucide-react';
import AdminDashboard from '../../components/AdminDashboard';
import AgenciesTable from '../../components/AgenciesTable';
import AgencyDashboard from '../../components/AgencyDashboard';
import './dashboard.css';
import { getApiUrl } from '@/utils/api';

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [token, setToken] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('dashboard');

    // Admin specific state
    const [agencies, setAgencies] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ totalAgencies: 0, pendingAgencies: 0, totalVehicles: 0, totalBookings: 0, totalRevenue: 0 });

    useEffect(() => {
        const storedToken = localStorage.getItem('access_token');
        if (!storedToken) {
            router.push('/login');
            return;
        }
        setToken(storedToken);

        try {
            const payload = JSON.parse(atob(storedToken.split('.')[1]));
            setUser(payload);

            if (payload.role === 'ADMIN') {
                fetchAgencies(storedToken);
                fetchAdminStats(storedToken);
            }
        } catch (e) {
            router.push('/login');
        }
        // Initialize activeTab from URL query param if present
        try {
            const params = new URLSearchParams(window.location.search);
            const v = params.get('view');
            if (v && ['dashboard', 'fleet', 'bookings', 'settings', 'agencies'].includes(v)) {
                setActiveTab(v);
            }
        } catch (err) {
            // ignore
        }
    }, [router]);

    const fetchAgencies = async (token: string) => {
        try {
            const res = await fetch(`${getApiUrl()}/api/agency`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAgencies(data);
            }
        } catch (err) {
            console.error('Failed to fetch agencies', err);
        }
    };

    const fetchAdminStats = async (token: string) => {
        try {
            const res = await fetch(`${getApiUrl()}/api/agency/admin-stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch admin stats', err);
        }
    };

    const handleApprove = async (agencyId: string) => {
        try {
            const res = await fetch(`${getApiUrl()}/api/agency/${agencyId}/approve`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                fetchAgencies(token!);
                fetchAdminStats(token!);
            }
        } catch (err) {
            console.error('Failed to approve agency', err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        router.push('/login');
    };

    const renderContent = () => {
        if (!user) return null;

            if (user.role === 'ADMIN') {
                switch (activeTab) {
                case 'dashboard':
                    return (
                        <AdminDashboard
                            agencies={agencies}
                            stats={stats}
                            onApprove={handleApprove}
                        />
                    );
                case 'agencies':
                    return (
                        <AgenciesTable />
                    );
                case 'settings':
                    return <div className="glass" style={{ padding: '40px', textAlign: 'center' }}>Admin Settings Coming Soon</div>;
                default:
                    return null;
            }
        } else if (user.role === 'AGENCY') {
            switch (activeTab) {
                case 'dashboard':
                case 'fleet':
                case 'bookings':
                case 'settings':
                    return <AgencyDashboard
                        token={token!}
                        view={activeTab as any}
                    />;
                default:
                    return null;
            }
        }
        return null;
    };

    if (!user || !token) return null;

    return (
        <div className="dashboardContainer">
            <aside className="sidebar glass">
                <div className="logoSection">
                    <Car size={32} className="logoIcon" />
                    <span className="logoText">LuxDrive</span>
                </div>

                <nav className="nav">
                    <div
                        className={`navItem ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('dashboard'); router.push('/dashboard?view=dashboard'); }}
                    >
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </div>

                    {user.role === 'ADMIN' && (
                        <div
                            className={`navItem ${activeTab === 'agencies' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('agencies'); router.push('/dashboard?view=agencies'); }}
                        >
                            <Users size={20} />
                            <span>Agencies</span>
                        </div>
                    )}

                    {user.role === 'AGENCY' && (
                        <>
                            <div
                                className={`navItem ${activeTab === 'fleet' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('fleet'); router.push('/dashboard?view=fleet'); }}
                            >
                                <Package size={20} />
                                <span>My Fleet</span>
                            </div>
                            <div
                                className={`navItem ${activeTab === 'bookings' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('bookings'); router.push('/dashboard?view=bookings'); }}
                            >
                                <Calendar size={20} />
                                <span>Bookings</span>
                            </div>
                        </>
                    )}

                    <div
                        className={`navItem ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('settings'); router.push('/dashboard?view=settings'); }}
                    >
                        <Settings size={20} />
                        <span>Settings</span>
                    </div>
                </nav>

                <button onClick={handleLogout} className="logoutBtn">
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </aside>

            <main className="mainContent">
                <header className="header" style={{ marginBottom: 0 }}>
                    <div className="userInfo" style={{ marginLeft: 'auto' }}>
                        <div className="userAvatar">
                            {user.email[0].toUpperCase()}
                        </div>
                        <span>{user.email}</span>
                    </div>
                </header>

                {renderContent()}
            </main>
        </div>
    );
}
