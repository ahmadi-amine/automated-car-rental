'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import ChatbotWidget from '@/components/ChatbotWidget';
import { getApiUrl } from '@/utils/api';
import { getCustomerToken, setCustomerToken, clearCustomerToken, customerRegister, customerLogin, fetchCustomerMe } from '@/utils/customerAuth';

export default function PublicAgencyPage() {
    const { slug } = useParams();
    const [agency, setAgency] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
    const [activeImg, setActiveImg] = useState<Record<string, string>>({});
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingStep, setBookingStep] = useState(1); // 1: form, 2: success
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [bookingForm, setBookingForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        startDate: '',
        endDate: '',
        licenseNumber: ''
    });

    // Date filtering state
    const [filterDates, setFilterDates] = useState({
        start: '',
        end: ''
    });

    // Quote (devis) state
    const [showQuote, setShowQuote] = useState(false);
    const [quoteVehicle, setQuoteVehicle] = useState<any>(null);
    const [quoteDates, setQuoteDates] = useState({ start: '', end: '' });
    const [quoteMeta, setQuoteMeta] = useState<{ number: string; date: string }>({ number: '', date: '' });

    // Optional client account
    const [customer, setCustomer] = useState<any>(null);

    useEffect(() => {
        const t = getCustomerToken();
        if (!t) return;
        fetchCustomerMe(t).then(setCustomer).catch(() => clearCustomerToken());
    }, []);

    const logoutCustomer = () => {
        clearCustomerToken();
        setCustomer(null);
    };

    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [authForm, setAuthForm] = useState({ fullName: '', email: '', password: '' });
    const [authError, setAuthError] = useState('');
    const [isAuthLoading, setIsAuthLoading] = useState(false);

    const openAuth = (mode: 'login' | 'register') => {
        setAuthMode(mode);
        setAuthForm({ fullName: '', email: '', password: '' });
        setAuthError('');
        setShowAuthModal(true);
    };

    const submitAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        setIsAuthLoading(true);
        try {
            const res = authMode === 'register'
                ? await customerRegister(authForm.fullName, authForm.email, authForm.password)
                : await customerLogin(authForm.email, authForm.password);
            setCustomerToken(res.access_token);
            setCustomer(res.customer);
            setShowAuthModal(false);
        } catch (err: any) {
            setAuthError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsAuthLoading(false);
        }
    };

    useEffect(() => {
        if (slug) {
            fetchAgency();
        }
    }, [slug, filterDates]);

    const fetchAgency = async () => {
        try {
            let url = `${getApiUrl()}/api/agency/public/${slug}`;
            if (filterDates.start && filterDates.end) {
                url += `?startDate=${filterDates.start}&endDate=${filterDates.end}`;
            }
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setAgency(data);
            }
        } catch (err) {
            console.error('Failed to fetch agency', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDateFilterChange = (field: 'start' | 'end', value: string) => {
        setFilterDates(prev => ({ ...prev, [field]: value }));
        // Also sync booking form
        setBookingForm(prev => ({ ...prev, [field === 'start' ? 'startDate' : 'endDate']: value }));
    };

    const handleBookNow = (vehicle: any) => {
        setSelectedVehicle(vehicle);
        setShowBookingModal(true);
        setBookingStep(1);
    };

    // Normalize a date string (YYYY-MM-DD or ISO) to YYYY-MM-DD (treat as local date without timezone shifts)
    const normalizeDateOnly = (d: string) => {
        if (!d) return d;
        // If already in YYYY-MM-DD form, return that
        const iso = d.split('T')[0];
        return iso;
    };

    const handleBookingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = {
                ...bookingForm,
                startDate: normalizeDateOnly(bookingForm.startDate),
                endDate: normalizeDateOnly(bookingForm.endDate),
                vehicleId: selectedVehicle.id
            };

            const res = await fetch(`${getApiUrl()}/api/bookings/public`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setBookingStep(2);
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to place booking');
            }
        } catch (err) {
            console.error('Booking error', err);
            alert('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const calculateTotal = () => {
        if (!bookingForm.startDate || !bookingForm.endDate || !selectedVehicle) return 0;
        // Parse as local dates (no timezone) to avoid timezone shifts
        const [ys, ms, ds] = normalizeDateOnly(bookingForm.startDate).split('-').map(Number);
        const [ye, me, de] = normalizeDateOnly(bookingForm.endDate).split('-').map(Number);
        const startUTC = Date.UTC(ys, ms - 1, ds);
        const endUTC = Date.UTC(ye, me - 1, de);
        const msPerDay = 1000 * 60 * 60 * 24;
        const diffDays = Math.round((endUTC - startUTC) / msPerDay);
        const nights = diffDays > 0 ? diffDays : 1;
        return nights * selectedVehicle.pricePerDay;
    };

    const nightsBetween = (s: string, e: string) => {
        if (!s || !e) return 0;
        const [ys, ms, ds] = s.split('-').map(Number);
        const [ye, me, de] = e.split('-').map(Number);
        const diff = Math.round((Date.UTC(ye, me - 1, de) - Date.UTC(ys, ms - 1, ds)) / 86400000);
        return diff > 0 ? diff : (s === e ? 1 : 0);
    };

    const openQuote = (v: any, dates?: { start: string; end: string }) => {
        setQuoteVehicle(v);
        setQuoteDates(dates ? { start: dates.start, end: dates.end } : { start: filterDates.start, end: filterDates.end });
        const now = new Date();
        const num = `Q-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
        setQuoteMeta({ number: num, date: now.toLocaleDateString() });
        setShowQuote(true);
    };

    const bookFromQuote = () => {
        setSelectedVehicle(quoteVehicle);
        setBookingForm(prev => ({ ...prev, startDate: quoteDates.start, endDate: quoteDates.end }));
        setShowQuote(false);
        setShowBookingModal(true);
        setBookingStep(1);
    };

    // Print the devis in its own clean window (exact copy of the on-screen document).
    const printDevis = () => {
        const el = document.querySelector('.devis-printable');
        if (!el) return;
        const clone = el.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('.no-print').forEach(n => n.remove());
        const w = window.open('', '_blank', 'width=820,height=1000');
        if (!w) { alert('Please allow pop-ups to print or download the quote.'); return; }
        w.document.open();
        w.document.write(
            `<!doctype html><html><head><meta charset="utf-8"><title>Devis ${quoteMeta.number}</title><style>` +
            `*{box-sizing:border-box;}` +
            `html,body{margin:0;padding:0;background:#fff;color:#1a1a1a;` +
            `font-family:'Segoe UI',Arial,Helvetica,sans-serif;` +
            `-webkit-print-color-adjust:exact;print-color-adjust:exact;}` +
            `table{border-collapse:collapse;width:100%;}` +
            `@page{margin:14mm;}` +
            `</style></head><body>${clone.outerHTML}</body></html>`
        );
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); w.close(); }, 350);
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#14110d', color: 'white' }}>
                <div className="loader">Loading profile...</div>
            </div>
        );
    }

    if (!agency) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#14110d', color: 'white' }}>
                <h1>Agency not found</h1>
            </div>
        );
    }

    const primaryColor = agency.primaryColor || '#7e2637';

    return (
        <div style={{ background: '#14110d', minHeight: '100vh', color: 'white', fontFamily: 'var(--font-sans)' }}>
            {/* Banner */}
            <div style={{ 
                height: '300px', 
                background: agency.bannerUrl ? `url(${agency.bannerUrl}) center/cover` : `linear-gradient(135deg, ${primaryColor}dd 0%, #14110d 100%)`,
                position: 'relative'
            }}>
                <div style={{ 
                    position: 'absolute', 
                    bottom: '-60px', 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    width: '120px',
                    height: '120px',
                    borderRadius: '24px',
                    background: '#241f18',
                    border: '4px solid #14110d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                }}>
                    {agency.logoUrl ? (
                        <img src={agency.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <span style={{ fontSize: '46px', fontWeight: 700, color: primaryColor }}>{agency.name?.charAt(0)?.toUpperCase()}</span>
                    )}
                </div>
            </div>

            {/* Header Info */}
            <div style={{ marginTop: '80px', textAlign: 'center', padding: '0 20px' }}>
                <h1 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '8px' }}>{agency.name}</h1>
                <p style={{ color: '#a99a83', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>{agency.description}</p>
                
                <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a99a83' }}>
                        <span>Min. Age: {agency.minAge}+</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a99a83' }}>
                        <span>Deposit: {agency.depositAmount} MAD</span>
                    </div>
                </div>
            </div>

            <main style={{ maxWidth: '1200px', margin: '60px auto', padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 350px', gap: '40px' }}>
                {/* Fleet Section */}
                <div>
                    <div className="glass" style={{ padding: '24px', borderRadius: '16px', marginBottom: '32px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', color: '#a99a83', textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Pick-up Date</label>
                            <input 
                                type="date" 
                                className="input" 
                                value={filterDates.start}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => handleDateFilterChange('start', e.target.value)}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', color: '#a99a83', textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Return Date</label>
                            <input 
                                type="date" 
                                className="input" 
                                value={filterDates.end}
                                min={filterDates.start || new Date().toISOString().split('T')[0]}
                                onChange={(e) => handleDateFilterChange('end', e.target.value)}
                            />
                        </div>
                    </div>

                    <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        Agency Fleet
                        <span style={{ padding: '4px 12px', background: 'rgba(240,232,214,0.05)', borderRadius: '20px', fontSize: '14px', color: primaryColor }}>{agency.vehicles?.length || 0} Total</span>
                    </h2>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                        {agency.vehicles?.map((v: any) => {
                            const thumbs = [v.imageUrl, ...(v.images || [])].filter(Boolean);
                            const cur = activeImg[v.id] || v.imageUrl || (v.images && v.images[0]);
                            const idx = Math.max(0, thumbs.indexOf(cur));
                            const goTo = (dir: number) => setActiveImg(prev => ({ ...prev, [v.id]: thumbs[(idx + dir + thumbs.length) % thumbs.length] }));
                            return (
                            <div key={v.id} className="glass" style={{ borderRadius: '16px', overflow: 'hidden', transition: '0.3s' }}>
                                <div style={{ height: '200px', background: '#241f18', position: 'relative' }}>
                                    {cur ? (
                                        <img src={cur} alt={v.make} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                            No photo
                                        </div>
                                    )}
                                    <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                                        {v.isBooked && (
                                            <div style={{ padding: '4px 12px', background: '#ef4444', color: 'white', fontWeight: '700', borderRadius: '20px', fontSize: '12px', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)' }}>
                                                ALREADY BOOKED
                                            </div>
                                        )}
                                        <div style={{ padding: '4px 12px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', borderRadius: '20px', fontSize: '12px' }}>
                                            {v.category}
                                        </div>
                                    </div>
                                    {thumbs.length > 1 && (
                                        <>
                                            <button
                                                onClick={() => goTo(-1)}
                                                aria-label="Previous photo"
                                                style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(10,8,6,0.55)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                                            ><ChevronLeft size={18} /></button>
                                            <button
                                                onClick={() => goTo(1)}
                                                aria-label="Next photo"
                                                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(10,8,6,0.55)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                                            ><ChevronRight size={18} /></button>
                                            <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(10,8,6,0.55)', color: 'white', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backdropFilter: 'blur(4px)' }}>
                                                {idx + 1} / {thumbs.length}
                                            </div>
                                        </>
                                    )}
                                </div>
                                {thumbs.length > 1 && (
                                    <div style={{ display: 'flex', gap: '6px', padding: '8px 12px 0', flexWrap: 'wrap' }}>
                                        {thumbs.map((t: string) => (
                                            <img
                                                key={t}
                                                src={t}
                                                alt=""
                                                onClick={() => setActiveImg(prev => ({ ...prev, [v.id]: t }))}
                                                style={{
                                                    width: '44px', height: '32px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer',
                                                    border: cur === t ? `2px solid ${primaryColor}` : '2px solid transparent', opacity: cur === t ? 1 : 0.65
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                                <div style={{ padding: '20px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{v.make} {v.model}</h3>
                                    <p style={{ color: '#a99a83', fontSize: '14px', marginBottom: v.description ? '8px' : '16px' }}>{v.year} • Automatic • Diesel</p>
                                    {v.description && (
                                        <p style={{ color: '#a99a83', fontSize: '13px', lineHeight: 1.5, marginBottom: '16px' }}>{v.description}</p>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(240,232,214,0.1)', paddingTop: '16px' }}>
                                        <div>
                                            <span style={{ fontSize: '20px', fontWeight: '800', color: primaryColor }}>{v.pricePerDay} MAD</span>
                                            <span style={{ fontSize: '14px', color: '#a99a83' }}> / day</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => openQuote(v)}
                                                style={{
                                                    background: 'transparent',
                                                    color: primaryColor,
                                                    padding: '8px 14px',
                                                    borderRadius: '10px',
                                                    fontWeight: '600',
                                                    fontSize: '14px',
                                                    cursor: 'pointer',
                                                    border: `1px solid ${primaryColor}`
                                                }}
                                            >
                                                Quote
                                            </button>
                                            <button
                                                onClick={() => !v.isBooked && handleBookNow(v)}
                                                disabled={v.isBooked}
                                                style={{
                                                    background: v.isBooked ? 'rgba(240,232,214,0.05)' : primaryColor,
                                                    color: v.isBooked ? '#837763' : 'white',
                                                    padding: '8px 20px',
                                                    borderRadius: '10px',
                                                    fontWeight: '600',
                                                    fontSize: '14px',
                                                    cursor: v.isBooked ? 'not-allowed' : 'pointer',
                                                    border: v.isBooked ? '1px solid rgba(240,232,214,0.1)' : 'none'
                                                }}
                                            >
                                                {v.isBooked ? 'Unavailable' : 'Book Now'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sidebar Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>About Agency</h3>
                        <p style={{ color: '#a99a83', lineHeight: '1.6', fontSize: '15px' }}>
                            {agency.bio || "No biography provided."}
                        </p>
                    </div>

                    <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Rental Conditions</h3>
                        <div style={{ color: '#a99a83', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {agency.rentalConditions ? agency.rentalConditions.split('\n').map((condition: string, i: number) => (
                                <div key={i} style={{ display: 'flex', gap: '10px' }}>
                                    <span style={{ flexShrink: 0, marginTop: '1px', color: primaryColor }}>•</span>
                                    <span>{condition}</span>
                                </div>
                            )) : "Standard rental terms apply."}
                        </div>
                    </div>

                    <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Contact Details</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#a99a83', fontSize: '14px' }}>
                            <div>{agency.address || 'Address not listed'}</div>
                            <div>{agency.phone || 'Phone not listed'}</div>
                            <div>{agency.publicEmail || agency.user?.email || 'Email not listed'}</div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Booking Modal */}
            {showBookingModal && (
                <div className="modalOverlay" style={{ 
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'rgba(10,8,6,0.72)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    padding: '20px'
                }}>
                    <div className="glass" style={{ 
                        width: '100%', maxWidth: '600px', borderRadius: '24px', 
                        padding: '32px', position: 'relative', boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
                    }}>
                        <button 
                            onClick={() => setShowBookingModal(false)}
                            style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.5 }}
                        >
                            <X size={24} />
                        </button>

                        {bookingStep === 1 ? (
                            <>
                                <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Complete Your Booking</h2>
                                <p style={{ color: '#a99a83', marginBottom: '24px' }}>Renting {selectedVehicle?.make} {selectedVehicle?.model}</p>

                                <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="inputGroup">
                                            <label className="label" style={{ color: '#a99a83', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>First Name</label>
                                            <input 
                                                type="text" className="input" required 
                                                value={bookingForm.firstName}
                                                onChange={(e) => setBookingForm({...bookingForm, firstName: e.target.value})}
                                            />
                                        </div>
                                        <div className="inputGroup">
                                            <label className="label" style={{ color: '#a99a83', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Last Name</label>
                                            <input 
                                                type="text" className="input" required 
                                                value={bookingForm.lastName}
                                                onChange={(e) => setBookingForm({...bookingForm, lastName: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="inputGroup">
                                            <label className="label" style={{ color: '#a99a83', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Email Address</label>
                                            <input 
                                                type="email" className="input" required 
                                                value={bookingForm.email}
                                                onChange={(e) => setBookingForm({...bookingForm, email: e.target.value})}
                                            />
                                        </div>
                                        <div className="inputGroup">
                                            <label className="label" style={{ color: '#a99a83', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Phone Number</label>
                                            <input 
                                                type="tel" className="input" required 
                                                value={bookingForm.phone}
                                                onChange={(e) => setBookingForm({...bookingForm, phone: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="inputGroup">
                                            <label className="label" style={{ color: '#a99a83', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Start Date</label>
                                            <input 
                                                type="date" className="input" required 
                                                value={bookingForm.startDate}
                                                min={new Date().toISOString().split('T')[0]}
                                                onChange={(e) => setBookingForm({...bookingForm, startDate: e.target.value})}
                                            />
                                        </div>
                                        <div className="inputGroup">
                                            <label className="label" style={{ color: '#a99a83', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>End Date</label>
                                            <input 
                                                type="date" className="input" required 
                                                value={bookingForm.endDate}
                                                min={bookingForm.startDate || new Date().toISOString().split('T')[0]}
                                                onChange={(e) => setBookingForm({...bookingForm, endDate: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className="inputGroup">
                                        <label className="label" style={{ color: '#a99a83', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Driving License Number (Optional)</label>
                                        <input 
                                            type="text" className="input" 
                                            value={bookingForm.licenseNumber}
                                            onChange={(e) => setBookingForm({...bookingForm, licenseNumber: e.target.value})}
                                        />
                                    </div>

                                    <div style={{ 
                                        marginTop: '12px', padding: '20px', background: 'rgba(240,232,214,0.03)', borderRadius: '16px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <div>
                                            <span style={{ color: '#a99a83', fontSize: '14px' }}>Total Amount</span>
                                            <h3 style={{ fontSize: '24px', fontWeight: '800', color: primaryColor }}>{calculateTotal()} MAD</h3>
                                        </div>
                                        <button 
                                            type="submit" disabled={isSubmitting}
                                            style={{ 
                                                background: primaryColor, color: 'white', padding: '16px 32px', borderRadius: '14px', 
                                                fontWeight: '800', flex: 1, maxWidth: '200px', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                            }}
                                        >
                                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Place Booking'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <div style={{ fontSize: '56px', color: '#6fa07a', marginBottom: '16px' }}>✓</div>
                                <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '12px' }}>Request Received!</h2>
                                <p style={{ color: '#a99a83', fontSize: '16px', lineHeight: '1.6', maxWidth: '400px', margin: '0 auto 32px' }}>
                                    Your booking request for the <strong>{selectedVehicle?.make} {selectedVehicle?.model}</strong> has been sent to the agency. They will contact you shortly to confirm.
                                </p>
                                <button 
                                    onClick={() => setShowBookingModal(false)}
                                    style={{ background: primaryColor, color: 'white', padding: '14px 40px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Quote (Devis) Modal */}
            {showQuote && quoteVehicle && (() => {
                const days = nightsBetween(quoteDates.start, quoteDates.end);
                const unit = quoteVehicle.pricePerDay;
                const subtotal = days * unit;
                const deposit = agency.depositAmount || 0;
                return (
                    <div className="modalOverlay no-print" onClick={() => setShowQuote(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,8,6,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '30px 20px', overflowY: 'auto' }}>
                        <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '620px' }}>
                            <div className="devis-printable" style={{ background: '#ffffff', color: '#1a1a1a', borderRadius: '10px', padding: '40px', fontFamily: 'var(--font-sans)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontSize: '22px', fontWeight: 700, color: '#111' }}>{agency.name}</div>
                                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', lineHeight: 1.6 }}>
                                            {agency.address && <div>{agency.address}</div>}
                                            {agency.phone && <div>{agency.phone}</div>}
                                            {(agency.publicEmail || agency.user?.email) && <div>{agency.publicEmail || agency.user?.email}</div>}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '0.05em', color: primaryColor }}>DEVIS</div>
                                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>N° {quoteMeta.number}</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>Date : {quoteMeta.date}</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>Valable 7 jours</div>
                                    </div>
                                </div>
                                <div style={{ height: '3px', background: primaryColor, borderRadius: '2px', margin: '16px 0 24px' }} />

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', fontSize: '13px' }}>
                                    <div>
                                        <div style={{ color: '#888', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.06em', marginBottom: '4px' }}>Véhicule</div>
                                        <div style={{ fontWeight: 600 }}>{quoteVehicle.make} {quoteVehicle.model} ({quoteVehicle.year})</div>
                                        <div style={{ color: '#666' }}>{quoteVehicle.category}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#888', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.06em', marginBottom: '4px' }}>Période de location</div>
                                        {days > 0 ? (
                                            <>
                                                <div style={{ fontWeight: 600 }}>{quoteDates.start} → {quoteDates.end}</div>
                                                <div style={{ color: '#666' }}>{days} jour(s)</div>
                                            </>
                                        ) : (
                                            <div style={{ color: '#b00' }}>Choisissez des dates ci-dessous</div>
                                        )}
                                    </div>
                                </div>

                                <div className="no-print" style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '4px' }}>Pick-up date</label>
                                        <input type="date" value={quoteDates.start} min={new Date().toISOString().split('T')[0]} onChange={(e) => setQuoteDates(p => ({ ...p, start: e.target.value }))} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', color: '#111', background: '#fff' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '4px' }}>Return date</label>
                                        <input type="date" value={quoteDates.end} min={quoteDates.start || new Date().toISOString().split('T')[0]} onChange={(e) => setQuoteDates(p => ({ ...p, end: e.target.value }))} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', color: '#111', background: '#fff' }} />
                                    </div>
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #eee', color: '#888', textAlign: 'left' }}>
                                            <th style={{ padding: '8px 0' }}>Description</th>
                                            <th style={{ padding: '8px 0', textAlign: 'center' }}>Jours</th>
                                            <th style={{ padding: '8px 0', textAlign: 'right' }}>Prix/jour</th>
                                            <th style={{ padding: '8px 0', textAlign: 'right' }}>Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: '10px 0' }}>Location {quoteVehicle.make} {quoteVehicle.model}</td>
                                            <td style={{ padding: '10px 0', textAlign: 'center' }}>{days}</td>
                                            <td style={{ padding: '10px 0', textAlign: 'right' }}>{unit} MAD</td>
                                            <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600 }}>{subtotal} MAD</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div style={{ marginLeft: 'auto', width: '260px', fontSize: '13px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                                        <span style={{ color: '#666' }}>Sous-total</span><span>{subtotal} MAD</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                                        <span style={{ color: '#666' }}>Caution (remboursable)</span><span>{deposit} MAD</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid #eee', marginTop: '4px', fontWeight: 700, fontSize: '15px' }}>
                                        <span>Total estimé</span><span style={{ color: primaryColor }}>{subtotal} MAD</span>
                                    </div>
                                </div>

                                <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #eee', fontSize: '11px', color: '#888', lineHeight: 1.7 }}>
                                    <div>Âge minimum du conducteur : {agency.minAge} ans · Caution : {deposit} MAD (remboursable).</div>
                                    <div>Estimation non contractuelle, valable 7 jours. Prix en MAD.</div>
                                    {agency.rentalConditions && <div style={{ marginTop: '6px' }}>{agency.rentalConditions}</div>}
                                </div>
                            </div>

                            <div className="no-print" style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                <button onClick={() => setShowQuote(false)} style={{ padding: '12px 20px', borderRadius: '10px', background: 'rgba(240,232,214,0.08)', color: 'white', border: '1px solid rgba(240,232,214,0.15)', cursor: 'pointer', fontWeight: 600 }}>Close</button>
                                <button onClick={printDevis} disabled={days <= 0} style={{ padding: '12px 20px', borderRadius: '10px', background: 'rgba(240,232,214,0.08)', color: 'white', border: '1px solid rgba(240,232,214,0.15)', cursor: days > 0 ? 'pointer' : 'not-allowed', fontWeight: 600, opacity: days > 0 ? 1 : 0.5 }}>Print / Download PDF</button>
                                <button onClick={bookFromQuote} disabled={days <= 0 || quoteVehicle.isBooked} style={{ padding: '12px 22px', borderRadius: '10px', background: primaryColor, color: 'white', border: 'none', cursor: (days > 0 && !quoteVehicle.isBooked) ? 'pointer' : 'not-allowed', fontWeight: 700, opacity: (days > 0 && !quoteVehicle.isBooked) ? 1 : 0.5 }}>Book this car</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <ChatbotWidget
                agencySlug={slug as string}
                primaryColor={primaryColor}
                agencyName={agency.name}
                onRequestQuote={(v, dates) => openQuote(v, dates)}
            />
        </div>
    );
}
