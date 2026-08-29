'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { verifyCustomerEmail, setCustomerToken } from '@/utils/customerAuth';

function VerifyEmailInner() {
    const params = useSearchParams();
    const token = params.get('token');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [firstName, setFirstName] = useState('');
    const ran = useRef(false);

    useEffect(() => {
        // Guard against React StrictMode double-invoke consuming the single-use token twice.
        if (ran.current) return;
        ran.current = true;

        if (!token) {
            setStatus('error');
            setMessage('This verification link is missing its token.');
            return;
        }
        verifyCustomerEmail(token)
            .then((res) => {
                setCustomerToken(res.access_token);
                setFirstName(res.customer?.firstName || '');
                setStatus('success');
            })
            .catch((err) => {
                setStatus('error');
                setMessage(err.message || 'This verification link is invalid or has expired.');
            });
    }, [token]);

    return (
        <div style={{ minHeight: '100vh', background: '#14110d', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'var(--font-sans)' }}>
            <div style={{ width: '100%', maxWidth: '440px', background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '16px', padding: '40px 32px', textAlign: 'center' }}>
                {status === 'loading' && (
                    <>
                        <Loader2 size={40} className="animate-spin" style={{ color: '#7e2637', margin: '0 auto 16px' }} />
                        <h1 style={{ fontSize: '20px', margin: 0 }}>Verifying your email…</h1>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <div style={{ fontSize: '52px', color: '#6fa07a', marginBottom: '12px' }}>✓</div>
                        <h1 style={{ fontSize: '24px', margin: '0 0 10px' }}>Email verified{firstName ? `, ${firstName}` : ''}!</h1>
                        <p style={{ color: '#a99a83', fontSize: '15px', lineHeight: 1.6, margin: '0 auto 28px', maxWidth: '320px' }}>
                            Your account is now active and you&apos;re signed in. You can book faster next time.
                        </p>
                        <Link href="/" style={{ display: 'inline-block', background: '#7e2637', color: 'white', textDecoration: 'none', padding: '13px 32px', borderRadius: '10px', fontWeight: 700 }}>
                            Continue
                        </Link>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div style={{ fontSize: '52px', color: 'var(--error)', marginBottom: '12px' }}>✕</div>
                        <h1 style={{ fontSize: '22px', margin: '0 0 10px' }}>Verification failed</h1>
                        <p style={{ color: '#a99a83', fontSize: '15px', lineHeight: 1.6, margin: '0 auto 28px', maxWidth: '340px' }}>{message}</p>
                        <p style={{ color: '#8a7f6f', fontSize: '13px', margin: '0 auto', maxWidth: '340px' }}>
                            You can request a new link from the sign-in screen using “Resend verification email”.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: '#14110d' }} />}>
            <VerifyEmailInner />
        </Suspense>
    );
}
