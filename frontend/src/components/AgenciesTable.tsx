'use client';

import React, { useEffect, useState } from 'react';
import { getApiUrl } from '@/utils/api';

interface AgencyUser {
    id: string;
    email: string;
    createdAt: string;
    isApproved: boolean;
    agency?: {
        id: string;
        name: string;
    };
    fleetCount?: number;
    totalRevenue?: number;
}

export default function AgenciesTable() {
    const [agencies, setAgencies] = useState<AgencyUser[]>([]);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchList();
    }, []);

    async function fetchList() {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${getApiUrl()}/api/agency`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setAgencies(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(id: string) {
        const token = localStorage.getItem('access_token');
        await fetch(`${getApiUrl()}/api/agency/${id}/approve`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
        fetchList();
    }

    async function handleSuspend(id: string) {
        const token = localStorage.getItem('access_token');
        await fetch(`${getApiUrl()}/api/agency/${id}/suspend`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
        fetchList();
    }

    const filtered = agencies.filter(a => {
        if (statusFilter === 'approved' && !a.isApproved) return false;
        if (statusFilter === 'pending' && a.isApproved) return false;
        if (!query) return true;
        const q = query.toLowerCase();
        return (a.agency?.name || '').toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
    });

    return (
        <div className="glass darkPage" style={{ padding: 24 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2>Agencies</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input placeholder="Search by name or email" value={query} onChange={e => setQuery(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, background: '#0b1220', color: '#e6eef8', border: '1px solid #1f2937' }} />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={{ padding: '8px 12px', borderRadius: 8, background: '#0b1220', color: '#e6eef8', border: '1px solid #1f2937' }}>
                        <option value="all">All</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                    </select>
                </div>
            </header>

            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e6eef8' }}>
                <thead style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: 12 }}>
                    <tr>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>Agency</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>Email</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>Fleet</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>Revenue (MAD)</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>Registered</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>Status</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan={7} style={{ padding: 20 }}>Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                        <tr><td colSpan={7} style={{ padding: 20 }}>No agencies found.</td></tr>
                    ) : (
                        filtered.map(a => (
                            <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '12px' }}>{a.agency?.name || 'N/A'}</td>
                                <td style={{ padding: '12px' }}>{a.email}</td>
                                <td style={{ padding: '12px' }}>{a.fleetCount ?? 0}</td>
                                <td style={{ padding: '12px' }}>{(a.totalRevenue ?? 0).toLocaleString()}</td>
                                <td style={{ padding: '12px' }}>{new Date(a.createdAt).toLocaleDateString()}</td>
                                <td style={{ padding: '12px' }}>{a.isApproved ? 'Approved' : 'Pending'}</td>
                                <td style={{ padding: '12px', display: 'flex', gap: 8 }}>
                                    {a.isApproved ? (
                                        <button onClick={() => handleSuspend(a.id)} style={{ background: '#b91c1c', color: '#fff', padding: '8px 10px', borderRadius: 8 }}>Suspend</button>
                                    ) : (
                                        <button onClick={() => handleApprove(a.id)} style={{ background: '#059669', color: '#fff', padding: '8px 10px', borderRadius: 8 }}>Approve</button>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
