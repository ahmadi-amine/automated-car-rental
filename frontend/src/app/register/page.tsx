'use client';

import React, { useState } from 'react';
import { getApiUrl } from '@/utils/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Car, Mail, Lock, Building, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import './register.css';

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        agencyName: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(`${getApiUrl()}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            setIsSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 5000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="container">
                <div className="registerCard glass successState">
                    <CheckCircle2 size={64} className="successIcon" />
                    <h2>Registration Successful!</h2>
                    <p>Your agency account has been created and is now <strong>pending administrator approval</strong>.</p>
                    <p className="redirectNote">Redirecting to login in a few seconds...</p>
                    <Link href="/login" className="loginBtn">Go to Login Now</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="registerCard glass">
                <div className="header">
                    <div className="logo">
                        <Car size={40} className="logoIcon" />
                        <span className="title">LuxDrive</span>
                    </div>
                    <p className="subtitle">Join our exclusive B2B car rental network.</p>
                </div>

                {error && <div className="error">{error}</div>}

                <form className="form" onSubmit={handleSubmit}>
                    <div className="inputGroup">
                        <label className="label">Agency Name</label>
                        <div className="inputWrapper">
                            <Building className="inputIcon" size={20} />
                            <input
                                type="text"
                                name="agencyName"
                                className="input"
                                placeholder="Elite Rentals Co."
                                value={formData.agencyName}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="inputGroup">
                        <label className="label">Business Email</label>
                        <div className="inputWrapper">
                            <Mail className="inputIcon" size={20} />
                            <input
                                type="email"
                                name="email"
                                className="input"
                                placeholder="business@agency.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="inputGroup">
                        <label className="label">Password</label>
                        <div className="inputWrapper">
                            <Lock className="inputIcon" size={20} />
                            <input
                                type="password"
                                name="password"
                                className="input"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="submitBtn" disabled={isLoading}>
                        {isLoading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                Create Agency Account
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <p className="footerText">
                    Already have an account? <Link href="/login">Sign In</Link>
                </p>
            </div>
        </div>
    );
}
