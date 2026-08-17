'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getApiUrl } from '@/utils/api';
import { Car, Plus, Package, Calendar, DollarSign, Trash2, Edit2, Loader2, X, MoreVertical, Upload, Camera, Search, ChevronDown, Zap, ChevronLeft, ChevronRight, Users, Mail, Phone, Receipt, FileText, TrendingUp } from 'lucide-react';
import { carApi, CarMake, CarModel } from '../utils/carApi';

interface AgencyDashboardProps {
    token: string;
    view?: 'dashboard' | 'fleet' | 'settings' | 'bookings' | 'clients' | 'expenses' | 'profitability';
}

// Searchable Select Component
interface SearchableSelectProps {
    label: string;
    options: { id: string | number; name: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
    loading?: boolean;
}

function SearchableSelect({ label, options, value, onChange, placeholder, disabled, loading }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="inputGroup" ref={containerRef}>
            <label className="label">{label}</label>
            <div className="searchableSelect">
                <button
                    type="button"
                    className="input searchSelectBtn"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                >
                    <span style={{ opacity: value ? 1 : 0.5 }}>
                        {loading ? 'Loading...' : (value || placeholder)}
                    </span>
                    <ChevronDown size={18} style={{ opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
                </button>

                {isOpen && (
                    <div className="searchDropdown glass">
                        <div className="searchInputWrapper">
                            <Search size={16} className="searchIconInside" />
                            <input
                                type="text"
                                className="searchInput"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map(opt => (
                                    <div
                                        key={opt.id}
                                        className={`searchOption ${value === opt.name ? 'selected' : ''}`}
                                        onClick={() => {
                                            onChange(opt.name);
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }}
                                    >
                                        {opt.name}
                                    </div>
                                ))
                            ) : (
                                <div className="noResults">No results found</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AgencyDashboard({ token, view = 'dashboard' }: AgencyDashboardProps) {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [agencyProfile, setAgencyProfile] = useState<any>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUploadingBanner, setIsUploadingBanner] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [bookings, setBookings] = useState<any[]>([]);
    const [isLoadingBookings, setIsLoadingBookings] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [noteDraft, setNoteDraft] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
    const [expenseVehicleFilter, setExpenseVehicleFilter] = useState('');
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseForm, setExpenseForm] = useState<{ vehicleId: string; type: string; amount: string; date: string; description: string }>({
        vehicleId: '', type: 'MAINTENANCE', amount: '', date: new Date().toISOString().split('T')[0], description: ''
    });
    const [isSavingExpense, setIsSavingExpense] = useState(false);
    const [expenseInvoiceFile, setExpenseInvoiceFile] = useState<File | null>(null);
    const [profitability, setProfitability] = useState<any[]>([]);
    const [isLoadingProfitability, setIsLoadingProfitability] = useState(false);
    const [makes, setMakes] = useState<CarMake[]>([]);
    const [models, setModels] = useState<CarModel[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [isGettingAiPrice, setIsGettingAiPrice] = useState(false);
    const [aiPriceSuggestion, setAiPriceSuggestion] = useState<{ suggestedPrice: number; reasoning: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedBooking, setSelectedBooking] = useState<any>(null);

    const initialFormState = {
        make: '',
        model: '',
        year: new Date().getFullYear(),
        registrationNumber: '',
        pricePerDay: 50,
        category: 'SEDAN',
        description: '',
    };

    const [formData, setFormData] = useState(initialFormState);
    const [profileFormData, setProfileFormData] = useState({
        name: '',
        slug: '',
        description: '',
        bio: '',
        primaryColor: '#7e2637',
        minAge: 21,
        depositAmount: 0,
        rentalConditions: '',
        phone: '',
        address: '',
        publicEmail: '',
    });

    useEffect(() => {
        fetchVehicles();
        fetchMakes();
        fetchProfile();
        fetchBookings();
        fetchCustomers();
        fetchExpenses();
        fetchProfitability();
    }, []);

    const fetchVehicles = async () => {
        try {
            const res = await fetch(`${getApiUrl()}/api/vehicles`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setVehicles(data);
            }
        } catch (err) {
            console.error('Failed to fetch vehicles', err);
        }
    };

    const fetchProfile = async () => {
        try {
            const res = await fetch(`${getApiUrl()}/api/agency/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAgencyProfile(data);
                setProfileFormData({
                    name: data.name || '',
                    slug: data.slug || '',
                    description: data.description || '',
                    bio: data.bio || '',
                    primaryColor: data.primaryColor || '#7e2637',
                    minAge: data.minAge || 21,
                    depositAmount: data.depositAmount || 0,
                    rentalConditions: data.rentalConditions || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    publicEmail: data.publicEmail || '',
                });
            }
        } catch (err) {
            console.error('Failed to fetch profile', err);
        }
    };

    const fetchBookings = async () => {
        setIsLoadingBookings(true);
        try {
            const res = await fetch(`${getApiUrl()}/api/bookings/agency`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBookings(data);
            }
        } catch (err) {
            console.error('Failed to fetch bookings', err);
        } finally {
            setIsLoadingBookings(false);
        }
    };

    const fetchCustomers = async () => {
        setIsLoadingCustomers(true);
        try {
            const res = await fetch(`${getApiUrl()}/api/customers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setCustomers(await res.json());
        } catch (err) {
            console.error('Failed to fetch customers', err);
        } finally {
            setIsLoadingCustomers(false);
        }
    };

    const openCustomer = async (id: string) => {
        setIsLoadingDetail(true);
        setSelectedCustomer({ loading: true });
        try {
            const res = await fetch(`${getApiUrl()}/api/customers/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedCustomer(data);
                setNoteDraft(data.note || '');
            } else {
                setSelectedCustomer(null);
            }
        } catch (err) {
            console.error('Failed to fetch customer', err);
            setSelectedCustomer(null);
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const saveNote = async () => {
        if (!selectedCustomer?.customer) return;
        setIsSavingNote(true);
        try {
            const res = await fetch(`${getApiUrl()}/api/customers/${selectedCustomer.customer.id}/notes`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ notes: noteDraft }),
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedCustomer((prev: any) => ({ ...prev, note: data.notes }));
            }
        } catch (err) {
            console.error('Failed to save note', err);
        } finally {
            setIsSavingNote(false);
        }
    };

    const fetchExpenses = async () => {
        setIsLoadingExpenses(true);
        try {
            const res = await fetch(`${getApiUrl()}/api/expenses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setExpenses(await res.json());
        } catch (err) {
            console.error('Failed to fetch expenses', err);
        } finally {
            setIsLoadingExpenses(false);
        }
    };

    const fetchProfitability = async () => {
        setIsLoadingProfitability(true);
        try {
            const res = await fetch(`${getApiUrl()}/api/vehicles/profitability`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setProfitability(await res.json());
        } catch (err) {
            console.error('Failed to fetch profitability', err);
        } finally {
            setIsLoadingProfitability(false);
        }
    };

    const expenseTypeLabel = (t: string) =>
        ({ REPAIR: 'Repair', MAINTENANCE: 'Maintenance', INSURANCE: 'Insurance', OTHER: 'Other' } as Record<string, string>)[t] || t;

    const submitExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseForm.vehicleId || expenseForm.amount === '') return;
        setIsSavingExpense(true);
        try {
            const res = await fetch(`${getApiUrl()}/api/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    vehicleId: expenseForm.vehicleId,
                    type: expenseForm.type,
                    amount: parseFloat(expenseForm.amount),
                    description: expenseForm.description || undefined,
                    date: expenseForm.date ? new Date(expenseForm.date).toISOString() : undefined,
                }),
            });
            if (res.ok) {
                const created = await res.json();
                if (expenseInvoiceFile) {
                    const fd = new FormData();
                    fd.append('invoice', expenseInvoiceFile);
                    await fetch(`${getApiUrl()}/api/expenses/${created.id}/invoice`, {
                        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
                    });
                }
                await fetchExpenses();
                setShowExpenseModal(false);
                setExpenseForm({ vehicleId: '', type: 'MAINTENANCE', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
                setExpenseInvoiceFile(null);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.message || 'Failed to save expense');
            }
        } catch (err) {
            console.error('Failed to save expense', err);
        } finally {
            setIsSavingExpense(false);
        }
    };

    const deleteExpense = async (id: string) => {
        if (!confirm('Delete this expense?')) return;
        try {
            const res = await fetch(`${getApiUrl()}/api/expenses/${id}`, {
                method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setExpenses(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            console.error('Failed to delete expense', err);
        }
    };

    const handleUpdateBookingStatus = async (id: string, status: string) => {
        try {
            const res = await fetch(`${getApiUrl()}/api/bookings/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                fetchBookings();
                fetchVehicles(); // To update vehicle status if confirmed
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to update status');
            }
        } catch (err) {
            console.error('Error updating status', err);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingProfile(true);
        try {
            const res = await fetch(`${getApiUrl()}/api/agency/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(profileFormData),
            });
            if (res.ok) {
                const data = await res.json();
                setAgencyProfile(data);
                alert('Profile updated successfully!');
            } else {
                const errData = await res.json();
                alert(errData.message || 'Failed to update profile');
            }
        } catch (err) {
            console.error('Error updating profile', err);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingBanner(true);
        const formData = new FormData();
        formData.append('banner', file);

        try {
            const res = await fetch(`${getApiUrl()}/api/agency/banner`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                setAgencyProfile(data);
                alert('Banner updated!');
            } else {
                alert('Failed to upload banner');
            }
        } catch (err) {
            console.error('Banner upload error', err);
        } finally {
            setIsUploadingBanner(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingLogo(true);
        const formData = new FormData();
        formData.append('logo', file);

        try {
            const res = await fetch(`${getApiUrl()}/api/agency/logo`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                setAgencyProfile(data);
                alert('Logo updated!');
            } else {
                alert('Failed to upload logo');
            }
        } catch (err) {
            console.error('Logo upload error', err);
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const fetchMakes = async () => {
        const data = await carApi.getMakes();
        setMakes(data);
    };

    const handleMakeChange = async (make: string) => {
        setFormData({ ...formData, make, model: '' });
        if (make) {
            setLoadingModels(true);
            const data = await carApi.getModelsForMake(make);
            setModels(data);
            setLoadingModels(false);
        } else {
            setModels([]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGetAiPrice = async () => {
        if (!formData.make || !formData.model) {
            alert('Please select vehicle make and model first.');
            return;
        }

        setIsGettingAiPrice(true);
        setAiPriceSuggestion(null);

        try {
            const city = agencyProfile?.address || 'Casablanca';
            // We use the 'suggest-price' endpoint. For new vehicles, we'll use a placeholder ID in the URL
            const res = await fetch(`${getApiUrl()}/api/vehicles/${isEditing ? editingId : 'new'}/suggest-price?location=${encodeURIComponent(city)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setAiPriceSuggestion(data);
            } else {
                const err = await res.json();
                alert(err.message || 'Failed to get suggestion.');
            }
        } catch (err) {
            console.error('AI Error:', err);
            alert('Failed to connect to AI Pricing Agent.');
        } finally {
            setIsGettingAiPrice(false);
        }
    };

    const uploadImage = async (vehicleId: string) => {
        if (!selectedFile) return;

        const uploadData = new FormData();
        uploadData.append('image', selectedFile);

        try {
            const res = await fetch(`${getApiUrl()}/api/vehicles/${vehicleId}/image`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: uploadData,
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to upload image');
            }
        } catch (err: any) {
            alert(`Image upload failed: ${err.message}`);
            throw err;
        }
    };

    const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setGalleryFiles(prev => [...prev, ...files]);
        files.forEach(f => {
            const reader = new FileReader();
            reader.onloadend = () => setGalleryPreviews(prev => [...prev, reader.result as string]);
            reader.readAsDataURL(f);
        });
        e.target.value = '';
    };

    const removeNewGalleryFile = (index: number) => {
        setGalleryFiles(prev => prev.filter((_, i) => i !== index));
        setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const uploadGallery = async (vehicleId: string) => {
        if (!galleryFiles.length) return;
        const fd = new FormData();
        galleryFiles.forEach(f => fd.append('images', f));
        try {
            await fetch(`${getApiUrl()}/api/vehicles/${vehicleId}/images`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
            });
        } catch (err) {
            console.error('Gallery upload failed', err);
        }
    };

    const deleteExistingGalleryImage = async (url: string) => {
        if (!editingId) return;
        try {
            const res = await fetch(`${getApiUrl()}/api/vehicles/${editingId}/images`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ url }),
            });
            if (res.ok) setExistingImages(prev => prev.filter(u => u !== url));
        } catch (err) {
            console.error('Failed to remove image', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!formData.make || !formData.model) {
            alert('Please select both a Make and a Model');
            return;
        }

        setIsLoading(true);
        try {
            const url = isEditing
                ? `${getApiUrl()}/api/vehicles/${editingId}`
                : `${getApiUrl()}/api/vehicles`;

            const method = isEditing ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                const vehicle = await res.json();
                const vehicleId = isEditing ? editingId! : vehicle.id;

                if (selectedFile) {
                    await uploadImage(vehicleId);
                }
                if (galleryFiles.length) {
                    await uploadGallery(vehicleId);
                }

                setShowAddModal(false);
                setIsEditing(false);
                setEditingId(null);
                setSelectedFile(null);
                setImagePreview(null);
                setGalleryFiles([]);
                setGalleryPreviews([]);
                setExistingImages([]);
                fetchVehicles();
                setFormData(initialFormState);
            } else {
                const errData = await res.json();
                alert(errData.message || `Failed to ${isEditing ? 'update' : 'add'} vehicle`);
            }
        } catch (err) {
            console.error(`Error ${isEditing ? 'updating' : 'adding'} vehicle`, err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = async (v: any) => {
        setIsEditing(true);
        setEditingId(v.id);
        setFormData({
            make: v.make,
            model: v.model,
            year: v.year,
            registrationNumber: v.registrationNumber,
            pricePerDay: v.pricePerDay,
            category: v.category,
            description: v.description || '',
        });
        setImagePreview(v.imageUrl || null);
        setExistingImages(v.images || []);
        setGalleryFiles([]);
        setGalleryPreviews([]);

        // Initialize models for the editing car's make
        setLoadingModels(true);
        const data = await carApi.getModelsForMake(v.make);
        setModels(data);
        setLoadingModels(false);

        setShowAddModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this vehicle?')) return;
        try {
            const res = await fetch(`${getApiUrl()}/api/vehicles/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                fetchVehicles();
            }
        } catch (err) {
            console.error('Error deleting vehicle', err);
        }
    };

    const closePortal = () => {
        setShowAddModal(false);
        setIsEditing(false);
        setEditingId(null);
        setSelectedFile(null);
        setImagePreview(null);
        setGalleryFiles([]);
        setGalleryPreviews([]);
        setExistingImages([]);
        setAiPriceSuggestion(null);
        setFormData(initialFormState);
    };

    const renderDashboard = () => {
        const totalRevenue = bookings.filter(b => b.status === 'CONFIRMED').reduce((acc, b) => acc + b.totalPrice, 0);
        const pendingBookings = bookings.filter(b => b.status === 'PENDING').length;
        const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED').length;

        // Calculate active rentals (bookings that include today)
        const today = new Date().toISOString().split('T')[0];
        const activeRentals = bookings.filter(b => {
            const start = new Date(b.startDate).toISOString().split('T')[0];
            const end = new Date(b.endDate).toISOString().split('T')[0];
            return b.status === 'CONFIRMED' && today >= start && today <= end;
        }).length;

        return (
        <>
            <header className="header">
                <h1>Overview</h1>
            </header>

            <section className="statsGrid">
                <div className="statCard glass">
                    <h3>Total Revenue</h3>
                    <p className="statValue" style={{ color: '#6fa07a' }}>{totalRevenue.toLocaleString()} MAD</p>
                </div>
                <div className="statCard glass">
                    <h3>Pending Requests</h3>
                    <p className="statValue">{pendingBookings}</p>
                </div>
                <div className="statCard glass">
                    <h3>Active Rentals</h3>
                    <p className="statValue">{activeRentals} / {confirmedBookings}</p>
                </div>
                <div className="statCard glass">
                    <h3>Total Cars</h3>
                    <p className="statValue">{vehicles.length}</p>
                </div>
            </section>

            <section className="recentActivity glass">
                <h2>Recent Bookings</h2>
                {bookings.length === 0 ? (
                    <div className="emptyState">
                        <p>No recent bookings to show.</p>
                    </div>
                ) : (
                    <div className="tableContainer">
                        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ color: '#a99a83', fontSize: '13px', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(240,232,214,0.05)' }}>Ref</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(240,232,214,0.05)' }}>Customer</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(240,232,214,0.05)' }}>Vehicle</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(240,232,214,0.05)' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.slice(0, 5).map(b => (
                                    <tr key={b.id}>
                                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(240,232,214,0.05)', fontFamily: 'monospace', fontSize: '12px' }}>#{b.id.split('-')[0]}</td>
                                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(240,232,214,0.05)' }}>{b.customer.firstName} {b.customer.lastName}</td>
                                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(240,232,214,0.05)' }}>{b.vehicle.make} {b.vehicle.model}</td>
                                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(240,232,214,0.05)' }}>
                                            <span className={`statusTag ${b.status.toLowerCase()}`} style={{ position: 'static', display: 'inline-block' }}>
                                                {b.status}
                                            </span>
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
    };

    const renderFleet = () => (
        <>
            <header className="header">
                <h1>My Fleet</h1>
                <button onClick={() => { setIsEditing(false); setShowAddModal(true); }} className="approveBtn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={18} /> Add New Vehicle
                </button>
            </header>

            <div className="fleetGrid">
                {vehicles.length === 0 ? (
                    <div className="emptyState glass" style={{ gridColumn: '1 / -1', height: '300px' }}>
                        <p>Your fleet is currently empty. Add your first car now!</p>
                    </div>
                ) : (
                    vehicles.map((v) => (
                        <div key={v.id} className="carCard glass">
                            <div className="carImageContainer">
                                {(v.imageUrl || v.images?.[0]) ? (
                                    <img src={v.imageUrl || v.images[0]} alt={`${v.make} ${v.model}`} className="carImage" />
                                ) : (
                                    <div className="carPlaceholder">
                                        <Car size={48} />
                                    </div>
                                )}
                            </div>
                            <div className="carDetails">
                                <div className="carHeader">
                                    <div>
                                        <h3>{v.make} {v.model}</h3>
                                        <p className="carYear">{v.year} • {v.category.toLowerCase()}</p>
                                    </div>
                                    <button className="carMenuBtn"><MoreVertical size={20} /></button>
                                </div>
                                <div className="carStats">
                                    <div className="carStat">
                                        <span className="statLabel">Price / Day</span>
                                        <span className="statPrice">{v.pricePerDay} MAD</span>
                                    </div>
                                    <div className="carStat">
                                        <span className="statLabel">Registration</span>
                                        <span className="statInfo">{v.registrationNumber}</span>
                                    </div>
                                </div>
                                <div className="carActions">
                                    <button onClick={() => handleEdit(v)} className="editBtn"><Edit2 size={16} /> Edit</button>
                                    <button onClick={() => handleDelete(v.id)} className="deleteBtn"><Trash2 size={16} /> Delete</button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    );

    const renderSettings = () => (
        <div className="settingsContainer">
            <header className="header">
                <h1>Agency Profile Customization</h1>
            </header>

            <div className="glass" style={{ padding: '32px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Branding Assets</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '32px' }}>
                    <div className="inputGroup">
                        <label className="label">Banner Image (Wide)</label>
                        <div 
                            style={{ 
                                width: '100%', 
                                height: '180px', 
                                background: '#14110d', 
                                borderRadius: '16px', 
                                overflow: 'hidden',
                                border: '2px dashed rgba(240,232,214,0.1)',
                                position: 'relative',
                                cursor: 'pointer'
                            }}
                            onClick={() => document.getElementById('bannerInput')?.click()}
                        >
                            {agencyProfile?.bannerUrl ? (
                                <img src={agencyProfile.bannerUrl} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                                    <Upload size={32} />
                                    <span style={{ fontSize: '14px', marginTop: '8px' }}>Click to upload banner</span>
                                </div>
                            )}
                            {isUploadingBanner && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Loader2 className="animate-spin" size={32} />
                                </div>
                            )}
                            <input id="bannerInput" type="file" hidden accept="image/*" onChange={handleBannerUpload} />
                        </div>
                    </div>

                    <div className="inputGroup">
                        <label className="label">Logo (Square)</label>
                        <div 
                            style={{ 
                                width: '180px', 
                                height: '180px', 
                                background: '#14110d', 
                                borderRadius: '16px', 
                                overflow: 'hidden',
                                border: '2px dashed rgba(240,232,214,0.1)',
                                position: 'relative',
                                cursor: 'pointer',
                                margin: '0 auto'
                            }}
                            onClick={() => document.getElementById('logoInput')?.click()}
                        >
                            {agencyProfile?.logoUrl ? (
                                <img src={agencyProfile.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                                    <Camera size={32} />
                                    <span style={{ fontSize: '14px', marginTop: '8px' }}>Logo</span>
                                </div>
                            )}
                            {isUploadingLogo && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Loader2 className="animate-spin" size={32} />
                                </div>
                            )}
                            <input id="logoInput" type="file" hidden accept="image/*" onChange={handleLogoUpload} />
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="glass" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div className="inputGroup">
                        <label className="label">Agency Name</label>
                        <input
                            type="text"
                            className="input"
                            value={profileFormData.name}
                            onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="inputGroup">
                        <label className="label">Public URL Slug</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ opacity: 0.5, fontSize: '14px' }}>/agency/</span>
                            <input
                                type="text"
                                className="input"
                                value={profileFormData.slug}
                                onChange={(e) => setProfileFormData({ ...profileFormData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="inputGroup">
                    <label className="label">Short Description</label>
                    <input
                        type="text"
                        className="input"
                        value={profileFormData.description}
                        onChange={(e) => setProfileFormData({ ...profileFormData, description: e.target.value })}
                        placeholder="A catchy one-liner for your agency"
                    />
                </div>

                <div className="inputGroup">
                    <label className="label">Full Bio / About Us</label>
                    <textarea
                        className="input"
                        style={{ minHeight: '120px', resize: 'vertical' }}
                        value={profileFormData.bio}
                        onChange={(e) => setProfileFormData({ ...profileFormData, bio: e.target.value })}
                        placeholder="Tell your clients why they should choose you..."
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                    <div className="inputGroup">
                        <label className="label">Brand Color</label>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <input
                                type="color"
                                style={{ width: '48px', height: '48px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                value={profileFormData.primaryColor}
                                onChange={(e) => setProfileFormData({ ...profileFormData, primaryColor: e.target.value })}
                            />
                            <input
                                type="text"
                                className="input"
                                value={profileFormData.primaryColor}
                                onChange={(e) => setProfileFormData({ ...profileFormData, primaryColor: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="inputGroup">
                        <label className="label">Min. Driver Age</label>
                        <input
                            type="number"
                            className="input"
                            value={profileFormData.minAge}
                            onChange={(e) => setProfileFormData({ ...profileFormData, minAge: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="inputGroup">
                        <label className="label">Default Deposit (MAD)</label>
                        <input
                            type="number"
                            className="input"
                            value={profileFormData.depositAmount}
                            onChange={(e) => setProfileFormData({ ...profileFormData, depositAmount: parseFloat(e.target.value) })}
                        />
                    </div>
                </div>

                <div className="inputGroup">
                    <label className="label">Rental Conditions & Policies</label>
                    <textarea
                        className="input"
                        style={{ minHeight: '120px', resize: 'vertical' }}
                        value={profileFormData.rentalConditions}
                        onChange={(e) => setProfileFormData({ ...profileFormData, rentalConditions: e.target.value })}
                        placeholder="Fuel policy, insurance details, cancellation rules..."
                    />
                </div>

                <div className="header" style={{ marginTop: '12px' }}>
                    <h2 style={{ fontSize: '1.2rem' }}>Contact Information</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                    <div className="inputGroup">
                        <label className="label">Public Email</label>
                        <input
                            type="email"
                            className="input"
                            value={profileFormData.publicEmail}
                            onChange={(e) => setProfileFormData({ ...profileFormData, publicEmail: e.target.value })}
                            placeholder="contact@agency.com"
                        />
                    </div>
                    <div className="inputGroup">
                        <label className="label">Phone Number</label>
                        <input
                            type="text"
                            className="input"
                            value={profileFormData.phone}
                            onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                            placeholder="+1 234 567 890"
                        />
                    </div>
                    <div className="inputGroup">
                        <label className="label">Location / Address</label>
                        <input
                            type="text"
                            className="input"
                            value={profileFormData.address}
                            onChange={(e) => setProfileFormData({ ...profileFormData, address: e.target.value })}
                            placeholder="City, Country"
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                    <button type="submit" className="submitBtn" disabled={isSavingProfile} style={{ flex: 1 }}>
                        {isSavingProfile ? <Loader2 className="animate-spin" size={20} /> : 'Save Profile Changes'}
                    </button>
                    {agencyProfile?.slug && (
                        <a
                            href={`/agency/${agencyProfile.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="input"
                            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', justifyContent: 'center' }}
                        >
                            <Search size={18} /> View Public Page
                        </a>
                    )}
                </div>
            </form>
        </div>
    );

    const renderBookings = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // First day of the month
        const firstDay = new Date(year, month, 1);
        // Last day of the month
        const lastDay = new Date(year, month + 1, 0);
        // Start day of calendar (may include days from previous month)
        const startDay = firstDay.getDay();

        const daysInMonth = lastDay.getDate();

        const days = [];
        // Add previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            days.push({ day: prevMonthLastDay - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthLastDay - i) });
        }
        // Add current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
        }
        // Add next month days
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
        }

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                            'July', 'August', 'September', 'October', 'November', 'December'];

        const getBookingsForDay = (date: Date) => {
            const dateStr = date.toISOString().split('T')[0];
            return bookings.filter(b => {
                const startStr = new Date(b.startDate).toISOString().split('T')[0];
                const endStr = new Date(b.endDate).toISOString().split('T')[0];
                return dateStr >= startStr && dateStr <= endStr;
            });
        };

        return (
        <div className="bookingsContainer">
            <header className="header">
                <h1>Rental Bookings</h1>
            </header>

            <div className="glass" style={{ borderRadius: '24px', padding: '24px' }}>
                {/* Calendar Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <button 
                        onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                        style={{ background: 'rgba(240,232,214,0.05)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <ChevronLeft size={20} /> Previous
                    </button>
                    <h2 style={{ color: 'white', margin: 0 }}>{monthNames[month]} {year}</h2>
                    <button 
                        onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                        style={{ background: 'rgba(240,232,214,0.05)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        Next <ChevronRight size={20} />
                    </button>
                </div>

                {/* Days of Week */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '12px' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} style={{ textAlign: 'center', color: '#a99a83', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase' }}>
                            {d}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', height: '500px' }}>
                    {days.map((d, idx) => {
                        const dayBookings = getBookingsForDay(d.date);
                        return (
                            <div 
                                key={idx} 
                                style={{ 
                                    background: d.isCurrentMonth ? 'rgba(240,232,214,0.03)' : 'transparent', 
                                    borderRadius: '12px', 
                                    padding: '8px', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '4px', 
                                    cursor: 'pointer',
                                    transition: '0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = d.isCurrentMonth ? 'rgba(240,232,214,0.08)' : 'rgba(240,232,214,0.03)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = d.isCurrentMonth ? 'rgba(240,232,214,0.03)' : 'transparent'}
                            >
                                <div style={{ 
                                    fontSize: '13px', 
                                    fontWeight: '600', 
                                    color: d.isCurrentMonth ? 'white' : '#6b6152',
                                    marginBottom: '4px' 
                                }}>
                                    {d.day}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                                    {dayBookings.slice(0, 3).map(b => (
                                        <div 
                                            key={b.id}
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setSelectedBooking(b); 
                                            }}
                                            style={{ 
                                                fontSize: '11px', 
                                                padding: '4px 6px', 
                                                borderRadius: '6px', 
                                                color: 'white', 
                                                fontWeight: '500',
                                                whiteSpace: 'nowrap', 
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                background: b.status === 'CONFIRMED' 
                                                    ? 'rgba(126,38,55,0.9)' 
                                                    : b.status === 'PENDING' 
                                                        ? 'rgba(181,80,46,0.85)'
                                                        : 'rgba(131,119,99,0.55)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {b.vehicle.make} {b.vehicle.model}
                                        </div>
                                    ))}
                                    {dayBookings.length > 3 && (
                                        <div style={{ fontSize: '10px', color: '#a99a83', textAlign: 'center' }}>
                                            +{dayBookings.length - 3} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Booking Detail Modal */}
            {selectedBooking && (
                <div className="modalOverlay" onClick={() => setSelectedBooking(null)}>
                    <div className="modalContent glass" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modalHeader" style={{ marginBottom: '24px' }}>
                            <h2>Booking Details</h2>
                            <button onClick={() => setSelectedBooking(null)} className="closeBtn"><X size={24} /></button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="statusTag" style={{ 
                                width: 'fit-content', 
                                background: selectedBooking.status === 'CONFIRMED' 
                                    ? 'rgba(126,38,55,0.3)' 
                                    : selectedBooking.status === 'PENDING' 
                                        ? 'rgba(181,80,46,0.3)' 
                                        : 'rgba(131,119,99,0.25)',
                                color: selectedBooking.status === 'CONFIRMED' 
                                    ? '#a8465a' 
                                    : selectedBooking.status === 'PENDING' 
                                        ? '#c06a44' 
                                        : '#a99a83'
                            }}>
                                {selectedBooking.status}
                            </div>

                            <div style={{ background: 'rgba(240,232,214,0.03)', borderRadius: '16px', padding: '16px' }}>
                                <h3 style={{ margin: '0 0 12px 0', color: 'white', fontSize: '16px' }}>Vehicle</h3>
                                <p style={{ margin: '0', color: '#a99a83', fontSize: '14px' }}>
                                    {selectedBooking.vehicle.make} {selectedBooking.vehicle.model} ({selectedBooking.vehicle.year})
                                </p>
                                <p style={{ margin: '4px 0 0 0', color: '#837763', fontSize: '12px' }}>
                                    Reg: {selectedBooking.vehicle.registrationNumber}
                                </p>
                            </div>

                            <div style={{ background: 'rgba(240,232,214,0.03)', borderRadius: '16px', padding: '16px' }}>
                                <h3 style={{ margin: '0 0 12px 0', color: 'white', fontSize: '16px' }}>Customer</h3>
                                <p style={{ margin: '0', color: '#a99a83', fontSize: '14px' }}>
                                    {selectedBooking.customer.firstName} {selectedBooking.customer.lastName}
                                </p>
                                <p style={{ margin: '4px 0 0 0', color: '#837763', fontSize: '12px' }}>
                                    {selectedBooking.customer.email}
                                </p>
                                <p style={{ margin: '4px 0 0 0', color: '#837763', fontSize: '12px' }}>
                                    {selectedBooking.customer.phone}
                                </p>
                            </div>

                            <div style={{ background: 'rgba(240,232,214,0.03)', borderRadius: '16px', padding: '16px' }}>
                                <h3 style={{ margin: '0 0 12px 0', color: 'white', fontSize: '16px' }}>Rental Period</h3>
                                <p style={{ margin: '0', color: '#a99a83', fontSize: '14px' }}>
                                    {new Date(selectedBooking.startDate).toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })} → {new Date(selectedBooking.endDate).toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(240,232,214,0.03)', borderRadius: '16px' }}>
                                <span style={{ color: '#a99a83', fontSize: '14px' }}>Total Price</span>
                                <span style={{ color: 'white', fontSize: '20px', fontWeight: '800' }}>{selectedBooking.totalPrice} MAD</span>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                {selectedBooking.status === 'PENDING' && (
                                    <button 
                                        onClick={() => {
                                            handleUpdateBookingStatus(selectedBooking.id, 'CONFIRMED');
                                            setSelectedBooking(null);
                                        }}
                                        className="approveBtn" style={{ flex: 1, padding: '12px', fontSize: '14px' }}
                                    >
                                        Confirm Booking
                                    </button>
                                )}

                                {(selectedBooking.status === 'PENDING' || selectedBooking.status === 'CONFIRMED') && (
                                    <button 
                                        onClick={() => {
                                            if (confirm('Are you sure you want to cancel this booking?')) {
                                                handleUpdateBookingStatus(selectedBooking.id, 'CANCELLED');
                                                setSelectedBooking(null);
                                            }
                                        }}
                                        style={{ flex: 1, padding: '12px', fontSize: '14px', background: 'rgba(198,90,72,0.16)', border: '1px solid #c65a48', color: '#c65a48', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}
                                    >
                                        Cancel Booking
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        );
    };

    const renderCustomers = () => {
        const q = customerSearch.trim().toLowerCase();
        const filtered = q
            ? customers.filter(c =>
                `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
                (c.email || '').toLowerCase().includes(q) ||
                (c.phone || '').toLowerCase().includes(q))
            : customers;

        return (
            <div>
                <header className="header" style={{ marginBottom: 24 }}>
                    <h1>Clients</h1>
                    <div style={{ position: 'relative', marginLeft: 'auto' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#837763' }} />
                        <input
                            className="input"
                            placeholder="Search clients..."
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            style={{ paddingLeft: 36, width: 280 }}
                        />
                    </div>
                </header>

                <div className="glass" style={{ padding: 8 }}>
                    {isLoadingCustomers ? (
                        <div className="emptyState">Chargement des clients...</div>
                    ) : filtered.length === 0 ? (
                        <div className="emptyState">No clients yet — they appear after their first booking.</div>
                    ) : (
                        <div className="tableContainer">
                            <table className="dataTable">
                                <thead>
                                    <tr>
                                        <th>Customer</th>
                                        <th>Contact</th>
                                        <th>Bookings</th>
                                        <th>Total Spent</th>
                                        <th>Last Rental</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(c => (
                                        <tr key={c.id} onClick={() => openCustomer(c.id)} style={{ cursor: 'pointer' }}>
                                            <td className="agencyNameCol">{c.firstName} {c.lastName}</td>
                                            <td>
                                                <div style={{ fontSize: 13 }}>{c.email}</div>
                                                <div style={{ fontSize: 12, color: '#a99a83' }}>{c.phone}</div>
                                            </td>
                                            <td>{c.reservationsCount} <span style={{ color: '#a99a83', fontSize: 12 }}>({c.confirmedCount} confirmed)</span></td>
                                            <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{Math.round(c.totalSpent).toLocaleString()} MAD</td>
                                            <td>{c.lastRentalDate ? new Date(c.lastRentalDate).toLocaleDateString() : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderExpenses = () => {
        const filtered = expenseVehicleFilter ? expenses.filter(e => e.vehicleId === expenseVehicleFilter) : expenses;
        const total = filtered.reduce((s, e) => s + e.amount, 0);
        return (
            <div>
                <header className="header" style={{ marginBottom: 24 }}>
                    <h1>Expenses</h1>
                    <button className="submitBtn" onClick={() => setShowExpenseModal(true)} style={{ width: 'auto', padding: '10px 18px', marginLeft: 'auto' }}>
                        <Plus size={18} /> Add Expense
                    </button>
                </header>

                <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'center' }}>
                    <select className="input" value={expenseVehicleFilter} onChange={(e) => setExpenseVehicleFilter(e.target.value)} style={{ width: 280 }}>
                        <option value="">All Vehicles</option>
                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.year})</option>)}
                    </select>
                    <div style={{ marginLeft: 'auto', fontSize: 14, color: '#a99a83' }}>
                        Total: <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 18 }}>{Math.round(total).toLocaleString()} MAD</span>
                    </div>
                </div>

                <div className="glass" style={{ padding: 8 }}>
                    {isLoadingExpenses ? (
                        <div className="emptyState">Loading...</div>
                    ) : filtered.length === 0 ? (
                        <div className="emptyState">No expenses recorded yet. Click &quot;Add Expense&quot; to get started.</div>
                    ) : (
                        <div className="tableContainer">
                            <table className="dataTable">
                                <thead>
                                    <tr>
                                        <th>Date</th><th>Vehicle</th><th>Type</th><th>Description</th><th>Amount</th><th>Invoice</th><th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(e => (
                                        <tr key={e.id}>
                                            <td>{new Date(e.date).toLocaleDateString()}</td>
                                            <td className="agencyNameCol">{e.vehicle?.make} {e.vehicle?.model}</td>
                                            <td>{expenseTypeLabel(e.type)}</td>
                                            <td style={{ color: '#a99a83', fontSize: 13, maxWidth: 240 }}>{e.description || '—'}</td>
                                            <td style={{ fontWeight: 700 }}>{Math.round(e.amount).toLocaleString()} MAD</td>
                                            <td>{e.invoiceUrl
                                                ? <a href={e.invoiceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><FileText size={14} /> View</a>
                                                : <span style={{ color: '#837763' }}>—</span>}</td>
                                            <td>
                                                <button onClick={() => deleteExpense(e.id)} className="iconBtn delete" title="Delete"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderProfitability = () => {
        const totRevenue = profitability.reduce((s, v) => s + v.revenue, 0);
        const totExpenses = profitability.reduce((s, v) => s + v.expensesTotal, 0);
        const netProfit = totRevenue - totExpenses;
        return (
            <div>
                <header className="header" style={{ marginBottom: 24 }}><h1>Profitability</h1></header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                    {[
                        { label: 'Total Revenue', value: totRevenue, color: 'var(--text-primary)' },
                        { label: 'Total Expenses', value: totExpenses, color: 'var(--text-primary)' },
                        { label: 'Net Profit', value: netProfit, color: netProfit >= 0 ? 'var(--success)' : 'var(--error)' },
                    ].map(s => (
                        <div key={s.label} className="statCard">
                            <h3>{s.label}</h3>
                            <div className="statValue" style={{ color: s.color }}>{Math.round(s.value).toLocaleString()} MAD</div>
                        </div>
                    ))}
                </div>

                <div className="glass" style={{ padding: 8 }}>
                    {isLoadingProfitability ? (
                        <div className="emptyState">Loading...</div>
                    ) : profitability.length === 0 ? (
                        <div className="emptyState">No vehicles yet.</div>
                    ) : (
                        <div className="tableContainer">
                            <table className="dataTable">
                                <thead>
                                    <tr>
                                        <th>Vehicle</th><th>Rentals</th><th>Revenue</th><th>Maintenance</th><th>Repairs</th><th>Total Expenses</th><th>Profit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profitability.map(v => (
                                        <tr key={v.id}>
                                            <td className="agencyNameCol">{v.make} {v.model} <span style={{ color: '#a99a83', fontWeight: 400 }}>({v.year})</span></td>
                                            <td>{v.rentalsCount}</td>
                                            <td>{Math.round(v.revenue).toLocaleString()} MAD</td>
                                            <td style={{ color: '#a99a83' }}>{Math.round(v.maintenanceCost).toLocaleString()} MAD</td>
                                            <td style={{ color: '#a99a83' }}>{Math.round(v.repairCost).toLocaleString()} MAD</td>
                                            <td>{Math.round(v.expensesTotal).toLocaleString()} MAD</td>
                                            <td style={{ fontWeight: 700, color: v.profit >= 0 ? 'var(--success)' : 'var(--error)' }}>{Math.round(v.profit).toLocaleString()} MAD</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderContent = () => {
        switch (view) {
            case 'dashboard': return renderDashboard();
            case 'fleet': return renderFleet();
            case 'settings': return renderSettings();
            case 'bookings': return renderBookings();
            case 'clients': return renderCustomers();
            case 'expenses': return renderExpenses();
            case 'profitability': return renderProfitability();
            default: return renderDashboard();
        }
    };

    return (
        <>
            {renderContent()}

            {selectedCustomer && (
                <div className="modalOverlay" onClick={() => setSelectedCustomer(null)}>
                    <div className="modalContent glass" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
                        {(isLoadingDetail || selectedCustomer.loading) ? (
                            <div className="emptyState"><Loader2 className="animate-spin" /></div>
                        ) : (
                            <>
                                <div className="modalHeader">
                                    <h2>{selectedCustomer.customer.firstName} {selectedCustomer.customer.lastName}</h2>
                                    <button onClick={() => setSelectedCustomer(null)} className="closeBtn"><X size={24} /></button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, color: '#a99a83', fontSize: 14 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={15} /> {selectedCustomer.customer.email}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Phone size={15} /> {selectedCustomer.customer.phone}</div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                                    {[
                                        { label: 'Bookings', value: selectedCustomer.stats.reservationsCount, accent: false },
                                        { label: 'Confirmed', value: selectedCustomer.stats.confirmedCount, accent: false },
                                        { label: 'Total Spent', value: `${Math.round(selectedCustomer.stats.totalSpent).toLocaleString()} MAD`, accent: true },
                                    ].map((s) => (
                                        <div key={s.label} style={{ padding: 14, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
                                            <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#a99a83', letterSpacing: '0.08em' }}>{s.label}</div>
                                            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: s.accent ? 'var(--accent)' : 'var(--text-primary)' }}>{s.value}</div>
                                        </div>
                                    ))}
                                </div>

                                <h3 style={{ fontSize: 15, marginBottom: 12 }}>Rental History</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                                    {selectedCustomer.bookings.map((b: any) => (
                                        <div key={b.id} style={{ padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{b.vehicle?.make} {b.vehicle?.model}</div>
                                                <div style={{ fontSize: 12, color: '#a99a83' }}>{new Date(b.startDate).toLocaleDateString()} → {new Date(b.endDate).toLocaleDateString()}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 700 }}>{Math.round(b.totalPrice).toLocaleString()} MAD</div>
                                                <span style={{
                                                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase',
                                                    background: b.status === 'CONFIRMED' ? 'var(--success-soft)' : b.status === 'CANCELLED' ? 'var(--error-soft)' : b.status === 'PENDING' ? 'rgba(214,160,75,0.14)' : 'rgba(131,119,99,0.14)',
                                                    color: b.status === 'CONFIRMED' ? 'var(--success)' : b.status === 'CANCELLED' ? 'var(--error)' : b.status === 'PENDING' ? 'var(--warning)' : 'var(--text-secondary)'
                                                }}>{b.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <h3 style={{ fontSize: 15, margin: '22px 0 10px' }}>Internal Notes</h3>
                                <textarea
                                    value={noteDraft}
                                    onChange={(e) => setNoteDraft(e.target.value)}
                                    placeholder="Notes visible only to your agency (preferences, incidents, remarks...)"
                                    rows={3}
                                    className="input"
                                    style={{ resize: 'vertical', width: '100%' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                                    <button
                                        className="submitBtn"
                                        onClick={saveNote}
                                        disabled={isSavingNote || noteDraft === (selectedCustomer.note || '')}
                                        style={{ width: 'auto', padding: '10px 22px' }}
                                    >
                                        {isSavingNote ? <Loader2 size={16} className="animate-spin" /> : 'Save Note'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {showExpenseModal && (
                <div className="modalOverlay" onClick={() => setShowExpenseModal(false)}>
                    <div className="modalContent glass" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modalHeader">
                            <h2>New Expense</h2>
                            <button onClick={() => setShowExpenseModal(false)} className="closeBtn"><X size={24} /></button>
                        </div>
                        <form onSubmit={submitExpense} className="modalForm">
                            <div className="inputGroup">
                                <label className="label">Vehicle</label>
                                <select className="input" required value={expenseForm.vehicleId} onChange={(e) => setExpenseForm({ ...expenseForm, vehicleId: e.target.value })}>
                                    <option value="">Select a vehicle</option>
                                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.year})</option>)}
                                </select>
                            </div>
                            <div className="formRow">
                                <div className="inputGroup">
                                    <label className="label">Type</label>
                                    <select className="input" value={expenseForm.type} onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value })}>
                                        <option value="MAINTENANCE">Maintenance</option>
                                        <option value="REPAIR">Repair</option>
                                        <option value="INSURANCE">Insurance</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div className="inputGroup">
                                    <label className="label">Amount (MAD)</label>
                                    <input type="number" min="0" step="0.01" className="input" required value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
                                </div>
                            </div>
                            <div className="inputGroup">
                                <label className="label">Date</label>
                                <input type="date" className="input" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
                            </div>
                            <div className="inputGroup">
                                <label className="label">Description (optional)</label>
                                <textarea rows={2} className="input" style={{ resize: 'vertical' }} value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
                            </div>
                            <div className="inputGroup">
                                <label className="label">Invoice (optional — image or PDF)</label>
                                <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="input" onChange={(e) => setExpenseInvoiceFile(e.target.files?.[0] || null)} />
                            </div>
                            <button type="submit" className="submitBtn" disabled={isSavingExpense}>
                                {isSavingExpense ? <Loader2 size={18} className="animate-spin" /> : 'Save Expense'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showAddModal && (
                <div className="modalOverlay">
                    <div className="modalContent glass" style={{ maxWidth: '750px' }}>
                        <div className="modalHeader">
                            <h2>{isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
                            <button onClick={closePortal} className="closeBtn"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modalForm">
                            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '32px' }}>
                                {/* Image Upload Component */}
                                <div className="imageUploadSection">
                                    <label className="label">Vehicle Photo</label>
                                    <div
                                        className="imageUploadBox glass"
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            height: '240px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            overflow: 'hidden',
                                            border: '2px dashed rgba(240,232,214,0.1)',
                                            position: 'relative'
                                        }}
                                    >
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <>
                                                <Camera size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                                <span style={{ fontSize: '12px', opacity: 0.5 }}>Click to Upload</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            style={{ display: 'none' }}
                                            accept="image/*"
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div className="formRow">
                                        <SearchableSelect
                                            label="Make"
                                            placeholder="Select Make"
                                            value={formData.make}
                                            options={makes.map(m => ({ id: m.Make_ID, name: m.Make_Name }))}
                                            onChange={handleMakeChange}
                                        />
                                        <SearchableSelect
                                            label="Model"
                                            placeholder="Select Model"
                                            value={formData.model}
                                            options={models.map(m => ({ id: m.Model_ID, name: m.Model_Name }))}
                                            onChange={(val) => setFormData({ ...formData, model: val })}
                                            disabled={!formData.make || loadingModels}
                                            loading={loadingModels}
                                        />
                                    </div>

                                    <div className="formRow">
                                        <div className="inputGroup">
                                            <label className="label">Year</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.year || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFormData({ ...formData, year: val === '' ? '' as any : parseInt(val) });
                                                }}
                                                required
                                            />
                                        </div>
                                        <div className="inputGroup">
                                            <label className="label">Category</label>
                                            <select
                                                className="input"
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                required
                                            >
                                                <option value="ECONOMY">Economy</option>
                                                <option value="SEDAN">Sedan</option>
                                                <option value="SUV">SUV</option>
                                                <option value="LUXURY">Luxury</option>
                                                <option value="SPORTS">Sports</option>
                                                <option value="VAN">Van</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="formRow">
                                        <div className="inputGroup">
                                            <label className="label">Reg. Number</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.registrationNumber}
                                                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                                                required
                                                placeholder="e.g. ABC-123"
                                            />
                                        </div>
                                        <div className="inputGroup">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label className="label">Price per Day (MAD)</label>
                                                <button 
                                                    type="button"
                                                    onClick={handleGetAiPrice}
                                                    disabled={isGettingAiPrice || !formData.make}
                                                    style={{ 
                                                        background: 'rgba(240,232,214,0.05)',
                                                        border: '1px solid rgba(240,232,214,0.1)', 
                                                        padding: '4px 10px', 
                                                        fontSize: '11px', 
                                                        borderRadius: '8px', 
                                                        color: agencyProfile?.primaryColor || '#7e2637',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        cursor: 'pointer',
                                                        fontWeight: '600',
                                                        transition: '0.2s'
                                                    }}
                                                >
                                                    {isGettingAiPrice ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                                    Get AI Suggestion
                                                </button>
                                            </div>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.pricePerDay || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFormData({ ...formData, pricePerDay: val === '' ? '' as any : parseFloat(val) });
                                                }}
                                                required
                                            />
                                        </div>
                                    </div>
                                    
                                    {aiPriceSuggestion && (
                                        <div className="glass" style={{ 
                                            padding: '16px', 
                                            borderRadius: '12px', 
                                            background: 'rgba(126,38,55,0.12)',
                                            border: '1px solid rgba(126,38,55,0.3)',
                                            marginTop: '8px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Zap size={16} style={{ color: '#7e2637' }} />
                                                    <span style={{ fontWeight: '700', fontSize: '14px' }}>AI Recommended: {aiPriceSuggestion.suggestedPrice} MAD</span>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, pricePerDay: aiPriceSuggestion.suggestedPrice });
                                                        setAiPriceSuggestion(null);
                                                    }}
                                                    style={{ 
                                                        background: '#7e2637',
                                                        color: '#f6ebe9',
                                                        border: 'none',
                                                        padding: '4px 12px', 
                                                        borderRadius: '6px', 
                                                        fontSize: '12px', 
                                                        cursor: 'pointer',
                                                        fontWeight: '700'
                                                    }}
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                            <p style={{ fontSize: '12px', opacity: 0.7, lineHeight: '1.4', margin: 0 }}>
                                                {aiPriceSuggestion.reasoning}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="inputGroup">
                                <label className="label">Description</label>
                                <textarea
                                    className="input"
                                    rows={3}
                                    style={{ resize: 'vertical' }}
                                    placeholder="Describe the vehicle (condition, options, notes for customers...)"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="inputGroup">
                                <label className="label">Photo Gallery</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                    {existingImages.map((url) => (
                                        <div key={url} style={{ position: 'relative', width: 92, height: 66, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <button type="button" onClick={() => deleteExistingGalleryImage(url)} title="Remove"
                                                style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(10,8,6,0.7)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}>
                                                <X size={13} />
                                            </button>
                                        </div>
                                    ))}
                                    {galleryPreviews.map((src, i) => (
                                        <div key={i} style={{ position: 'relative', width: 92, height: 66, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--accent)' }}>
                                            <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <button type="button" onClick={() => removeNewGalleryFile(i)} title="Remove"
                                                style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(10,8,6,0.7)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}>
                                                <X size={13} />
                                            </button>
                                        </div>
                                    ))}
                                    <label style={{ width: 92, height: 66, borderRadius: 8, border: '2px dashed var(--border-strong)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', gap: 2 }}>
                                        <Plus size={18} />
                                        <span style={{ fontSize: 10 }}>Add</span>
                                        <input type="file" accept="image/*" multiple onChange={handleGalleryChange} style={{ display: 'none' }} />
                                    </label>
                                </div>
                            </div>

                            <button type="submit" className="submitBtn" disabled={isLoading} style={{ marginTop: '12px' }}>
                                {isLoading ? <Loader2 className="animate-spin" size={20} /> : (isEditing ? 'Update Vehicle' : 'Add Vehicle')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
        </>
    );
}
