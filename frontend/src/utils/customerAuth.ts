import { getApiUrl } from './api';

export const CUSTOMER_TOKEN_KEY = 'customer_token';

export function getCustomerToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}

export function setCustomerToken(token: string) {
    localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
}

export function clearCustomerToken() {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
}

async function parse(res: Response) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
}

export async function customerRegister(fullName: string, email: string, password: string) {
    const res = await fetch(`${getApiUrl()}/api/auth/customer/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
    });
    return parse(res);
}

export async function customerLogin(email: string, password: string) {
    const res = await fetch(`${getApiUrl()}/api/auth/customer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    return parse(res);
}

export async function fetchCustomerMe(token: string) {
    const res = await fetch(`${getApiUrl()}/api/customer/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return parse(res);
}

export async function verifyCustomerEmail(token: string) {
    const res = await fetch(`${getApiUrl()}/api/auth/customer/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
    });
    return parse(res);
}

export async function resendCustomerVerification(email: string) {
    const res = await fetch(`${getApiUrl()}/api/auth/customer/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    return parse(res);
}
