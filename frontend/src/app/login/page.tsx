'use client';

import React, { useState } from 'react';
import { getApiUrl } from '@/utils/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Car, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import './login.css';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(`${getApiUrl()}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // Store JWT in localStorage
            localStorage.setItem('access_token', data.access_token);

            // Redirect to dashboard (to be created)
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container">
            <div className="loginCard glass">
                <div className="header">
                    <div className="logo">
                        <Car size={40} className="logoIcon" />
                        <span className="title">LuxDrive</span>
                    </div>
                    <p className="subtitle">Welcome back! Please enter your credentials.</p>
                </div>

                {error && <div className="error">{error}</div>}

                <form className="form" onSubmit={handleSubmit}>
                    <div className="inputGroup">
                        <label className="label">Email Address</label>
                        <div className="inputWrapper">
                            <Mail className="inputIcon" size={20} />
                            <input
                                type="email"
                                className="input inputWithIcon"
                                placeholder="admin@carrental.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                                className="input inputWithIcon"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="submitBtn" disabled={isLoading}>
                        {isLoading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                Sign In
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <p className="footerText">
                    New agency? <Link href="/register">Register here</Link>
                </p>
            </div>
        </div>
    );
}
