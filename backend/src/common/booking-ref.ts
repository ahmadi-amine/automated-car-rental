/**
 * Derive a short, human-friendly booking reference from a booking UUID.
 * Deterministic (no storage needed): e.g. "3f9a2c1b-..." -> "LX-3F9A2C".
 */
export function bookingRef(id: string): string {
    return 'LX-' + id.replace(/-/g, '').slice(0, 6).toUpperCase();
}
