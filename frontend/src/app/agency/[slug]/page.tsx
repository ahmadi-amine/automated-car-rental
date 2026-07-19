'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Car, Calendar, DollarSign, Info, MapPin, Phone, Mail, ShieldCheck, Clock, X, Loader2, CheckCircle2 } from 'lucide-react';
import ChatbotWidget from '@/components/ChatbotWidget';
import { getApiUrl } from '@/utils/api';

export default function PublicAgencyPage() {
    const { slug } = useParams();
    const [agency, setAgency] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
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

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0b10', color: 'white' }}>
                <div className="loader">Loading profile...</div>
            </div>
        );
    }

    if (!agency) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0b10', color: 'white' }}>
                <h1>Agency not found</h1>
            </div>
        );
    }

    const primaryColor = agency.primaryColor || '#3b82f6';

    return (
        <div style={{ background: '#0a0b10', minHeight: '100vh', color: 'white', fontFamily: 'Inter, sans-serif' }}>
            {/* Banner */}
            <div style={{ 
                height: '300px', 
                background: agency.bannerUrl ? `url(${agency.bannerUrl}) center/cover` : `linear-gradient(135deg, ${primaryColor}dd 0%, #0a0b10 100%)`,
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
                    background: '#16181d',
                    border: '4px solid #0a0b10',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                }}>
                    {agency.logoUrl ? (
                        <img src={agency.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <Car size={48} style={{ color: primaryColor }} />
                    )}
                </div>
            </div>

            {/* Header Info */}
            <div style={{ marginTop: '80px', textAlign: 'center', padding: '0 20px' }}>
                <h1 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '8px' }}>{agency.name}</h1>
                <p style={{ color: '#94a3b8', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>{agency.description}</p>
                
                <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                        <ShieldCheck size={18} style={{ color: primaryColor }} />
                        <span>Min. Age: {agency.minAge}+</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                        <DollarSign size={18} style={{ color: primaryColor }} />
                        <span>Deposit: {agency.depositAmount} MAD</span>
                    </div>
                </div>
            </div>

            <main style={{ maxWidth: '1200px', margin: '60px auto', padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 350px', gap: '40px' }}>
                {/* Fleet Section */}
                <div>
                    <div className="glass" style={{ padding: '24px', borderRadius: '16px', marginBottom: '32px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Pick-up Date</label>
                            <input 
                                type="date" 
                                className="input" 
                                value={filterDates.start}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => handleDateFilterChange('start', e.target.value)}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Return Date</label>
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
                        <span style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', fontSize: '14px', color: primaryColor }}>{agency.vehicles?.length || 0} Total</span>
                    </h2>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                        {agency.vehicles?.map((v: any) => (
                            <div key={v.id} className="glass" style={{ borderRadius: '16px', overflow: 'hidden', transition: '0.3s' }}>
                                <div style={{ height: '200px', background: '#16181d', position: 'relative' }}>
                                    {v.imageUrl ? (
                                        <img src={v.imageUrl} alt={v.make} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                                            <Car size={48} />
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
                                </div>
                                <div style={{ padding: '20px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{v.make} {v.model}</h3>
                                    <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>{v.year} • Automatic • Diesel</p>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                                        <div>
                                            <span style={{ fontSize: '20px', fontWeight: '800', color: primaryColor }}>{v.pricePerDay} MAD</span>
                                            <span style={{ fontSize: '14px', color: '#94a3b8' }}> / day</span>
                                        </div>
                                        <button 
                                            onClick={() => !v.isBooked && handleBookNow(v)}
                                            disabled={v.isBooked}
                                            style={{ 
                                                background: v.isBooked ? 'rgba(255,255,255,0.05)' : primaryColor, 
                                                color: v.isBooked ? '#64748b' : 'white', 
                                                padding: '8px 20px', 
                                                borderRadius: '10px', 
                                                fontWeight: '600',
                                                fontSize: '14px',
                                                cursor: v.isBooked ? 'not-allowed' : 'pointer',
                                                border: v.isBooked ? '1px solid rgba(255,255,255,0.1)' : 'none'
                                            }}
                                        >
                                            {v.isBooked ? 'Unavailable' : 'Book Now'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>About Agency</h3>
                        <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '15px' }}>
                            {agency.bio || "No biography provided."}
                        </p>
                    </div>

                    <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Rental Conditions</h3>
                        <div style={{ color: '#94a3b8', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {agency.rentalConditions ? agency.rentalConditions.split('\n').map((condition: string, i: number) => (
                                <div key={i} style={{ display: 'flex', gap: '10px' }}>
                                    <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: primaryColor }} />
                                    <span>{condition}</span>
                                </div>
                            )) : "Standard rental terms apply."}
                        </div>
                    </div>

                    <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Contact Details</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#94a3b8' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <MapPin size={18} />
                                <span>{agency.address || 'Address not listed'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Phone size={18} />
                                <span>{agency.phone || 'Phone not listed'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Mail size={18} />
                                <span>{agency.publicEmail || agency.user?.email || 'Email not listed'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Booking Modal */}
            {showBookingModal && (
                <div className="modalOverlay" style={{ 
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
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
                                <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Renting {selectedVehicle?.make} {selectedVehicle?.model}</p>

                                <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="inputGroup">
                                            <label className="label" style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>First Name</label>
                                            <input 
                                                type="text" className="input" required 
                                                value={bookingForm.firstName}
                                                onChange={(e) => setBookingForm({...bookingForm, firstName: e.target.value})}
                                            />
                                        </div>
                                        <div className="inputGroup">
                                            <label className="label" style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Last Name</label>
                                            <input 
                                                type="text" className="input" required 
                                                value={bookingForm.lastName}
                                                onChange={(e) => setBookingForm({...bookingForm, lastName: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="inputGroup">
                                            <label className="label" style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Email Address</label>
                                            <input 
                                                type="email" className="input" required 
                                                value={bookingForm.email}
                                                onChange={(e) => setBookingForm({...bookingForm, email: e.target.value})}
                                            />
                                        </div>
                                        <div className="inputGroup">
                                            <label className="label" style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Phone Number</label>
                                            <input 
                                                type="tel" className="input" required 
                                                value={bookingForm.phone}
                                                onChange={(e) => setBookingForm({...bookingForm, phone: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="inputGroup">
                                            <label className="label" style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Start Date</label>
                                            <input 
                                                type="date" className="input" required 
                                                value={bookingForm.startDate}
                                                min={new Date().toISOString().split('T')[0]}
                                                onChange={(e) => setBookingForm({...bookingForm, startDate: e.target.value})}
                                            />
                                        </div>
                                        <div className="inputGroup">
                                            <label className="label" style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>End Date</label>
                                            <input 
                                                type="date" className="input" required 
                                                value={bookingForm.endDate}
                                                min={bookingForm.startDate || new Date().toISOString().split('T')[0]}
                                                onChange={(e) => setBookingForm({...bookingForm, endDate: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className="inputGroup">
                                        <label className="label" style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Driving License Number (Optional)</label>
                                        <input 
                                            type="text" className="input" 
                                            value={bookingForm.licenseNumber}
                                            onChange={(e) => setBookingForm({...bookingForm, licenseNumber: e.target.value})}
                                        />
                                    </div>

                                    <div style={{ 
                                        marginTop: '12px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <div>
                                            <span style={{ color: '#94a3b8', fontSize: '14px' }}>Total Amount</span>
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
                                <CheckCircle2 size={80} style={{ color: '#10b981', marginBottom: '24px' }} />
                                <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '12px' }}>Request Received!</h2>
                                <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.6', maxWidth: '400px', margin: '0 auto 32px' }}>
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

            <ChatbotWidget 
                agencySlug={slug as string} 
                primaryColor={primaryColor} 
                agencyName={agency.name} 
            />
        </div>
    );
}
