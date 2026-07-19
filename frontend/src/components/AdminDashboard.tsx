'use client';

import React from 'react';
import { LayoutDashboard, Users, Settings, CheckCircle, Clock } from 'lucide-react';
import Sparkline from './Sparkline';

interface AdminDashboardProps {
    agencies: any[];
    stats: {
        totalAgencies: number;
        pendingAgencies: number;
        totalVehicles: number;
        totalBookings: number;
        totalRevenue: number;
    };
    onApprove: (id: string) => void;
}

export default function AdminDashboard({ agencies, stats, onApprove }: AdminDashboardProps) {
    return (
        <>
            <header className="header">
                <h1>Admin Dashboard</h1>
            </header>

            <section className="statsGrid">
                <div className="statCard">
                    <div className="statHeader">
                        <h3>Total Platform Revenue</h3>
                        <span className="statMeta">30d</span>
                    </div>
                    <div className="statBody">
                        <div>
                            <p className="statValue" aria-hidden>{stats.totalRevenue?.toLocaleString() || 0} MAD</p>
                            <div className="statSmall">Monthly net revenue across all agencies</div>
                        </div>
                        <div className="statChart">
                            <Sparkline values={[1200, 1500, 1800, 1600, 4200, 3800, stats.totalRevenue || 0]} stroke="#10b981" />
                        </div>
                    </div>
                </div>

                <div className="statCard">
                    <div className="statHeader">
                        <h3>Total Agencies</h3>
                        <span className="statMeta">All time</span>
                    </div>
                    <div className="statBody">
                        <div>
                            <p className="statValue">{stats.totalAgencies}</p>
                            <div className="statSmall">Active agency accounts</div>
                        </div>
                        <div className="statChart">
                            <Sparkline values={[50, 55, 60, 62, 70, 72, stats.totalAgencies || 0]} stroke="#6b7280" />
                        </div>
                    </div>
                </div>

                <div className="statCard">
                    <div className="statHeader">
                        <h3>Pending Approvals</h3>
                        <span className="statMeta">Real-time</span>
                    </div>
                    <div className="statBody">
                        <div>
                            <p className="statValue" style={{ color: stats.pendingAgencies > 0 ? '#f59e0b' : 'inherit' }}>{stats.pendingAgencies}</p>
                            <div className="statSmall">Agencies awaiting admin approval</div>
                        </div>
                        <div className="statChart">
                            <Sparkline values={[2,1,0,3,1,stats.pendingAgencies || 0]} stroke="#f59e0b" />
                        </div>
                    </div>
                </div>

                <div className="statCard">
                    <div className="statHeader">
                        <h3>Vehicles Listed</h3>
                        <span className="statMeta">30d</span>
                    </div>
                    <div className="statBody">
                        <div>
                            <p className="statValue">{stats.totalVehicles}</p>
                            <div className="statSmall">Available and listed vehicles</div>
                        </div>
                        <div className="statChart">
                            <Sparkline values={[900,920,940,950,960,970, stats.totalVehicles || 0]} stroke="#93c5fd" />
                        </div>
                    </div>
                </div>

                <div className="statCard">
                    <div className="statHeader">
                        <h3>Total Bookings</h3>
                        <span className="statMeta">7d</span>
                    </div>
                    <div className="statBody">
                        <div>
                            <p className="statValue">{stats.totalBookings}</p>
                            <div className="statSmall">Recent confirmed bookings</div>
                        </div>
                        <div className="statChart">
                            <Sparkline values={[30,28,35,40,38,42, stats.totalBookings || 0]} stroke="#60a5fa" />
                        </div>
                    </div>
                </div>
            </section>

            <section className="recentActivity glass">
                <h2>Registered Agencies</h2>
                {agencies.length === 0 ? (
                    <div className="emptyState">
                        <p>No agencies registered yet.</p>
                    </div>
                ) : (
                    <div className="tableContainer">
                        <table className="dataTable">
                            <thead>
                                <tr>
                                    <th>Agency Name</th>
                                    <th>Email</th>
                                    <th>Registered On</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agencies.map((agencyUser) => (
                                    <tr key={agencyUser.id}>
                                        <td className="agencyNameCol">{agencyUser.agency?.name || 'N/A'}</td>
                                        <td>{agencyUser.email}</td>
                                        <td>{new Date(agencyUser.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            {agencyUser.isApproved ? (
                                                <span className="statusBadge approved">
                                                    <CheckCircle size={14} /> Approved
                                                </span>
                                            ) : (
                                                <span className="statusBadge pending">
                                                    <Clock size={14} /> Pending
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {!agencyUser.isApproved && (
                                                <button
                                                    onClick={() => onApprove(agencyUser.id)}
                                                    className="approveBtn"
                                                >
                                                    Approve
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </>
    );
}
