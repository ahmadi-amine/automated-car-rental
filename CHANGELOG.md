# Changelog

All notable changes to LuxDrive are documented here. Dates are in `YYYY-MM-DD`.

## [Unreleased]

### Added
- **Client accounts** — optional, email-verified registration on the public booking page;
  guest booking still works. Isolated customer JWT auth, sign-in control, and booking-form
  prefill for signed-in clients.
- **Email verification** — new accounts must confirm their email before a session is issued;
  login is blocked until verified. Single-use, 24h hashed tokens, `/verify-email` page, and a
  resend flow. Closes a guest-account takeover risk.
- **Transactional emails (Gmail SMTP, French, HTML + plain-text):**
  - Client "request received" acknowledgement on booking.
  - Agency "new booking request" notice (reply-to = client).
  - Client "booking confirmed" / "booking cancelled" on status change.
  - Account email-verification link.
  - Human-friendly booking reference (`LX-XXXXXX`) on every email and the success screen.
- **`/api/health`** endpoint (liveness + database probe) for load balancers / uptime monitors.
- Deployment aids: Docker Compose healthchecks and ordered startup, graceful shutdown hooks,
  and completed `.env.example` files (root, backend, frontend).

### Changed
- Booking emails send best-effort (fire-and-forget) so a slow mail server never blocks a request.
- Email prices formatted with French thousands grouping to match the localized content.

### Security
- HTML-escape all user-supplied input in email bodies (prevents injection into agency/client mail).
- Length bounds on public booking input; equalized login timing to avoid account enumeration.
- Indexed `Customer.email` and the verification-token column for faster lookups.

### Fixed
- Docker Compose now passes the email/verification environment variables to the backend service.
