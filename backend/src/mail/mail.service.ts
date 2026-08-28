import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly transporter: Transporter | null;
    private readonly from: string;

    constructor(private readonly config: ConfigService) {
        const user = this.config.get<string>('GMAIL_USER');
        const pass = this.config.get<string>('GMAIL_APP_PASSWORD');
        this.from = this.config.get<string>('MAIL_FROM') || (user ? `LuxDrive <${user}>` : 'LuxDrive');
        this.transporter = user && pass
            ? nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: { user, pass },
                // Fail fast instead of hanging a request if Gmail is slow/throttling.
                connectionTimeout: 15000,
                greetingTimeout: 15000,
                socketTimeout: 20000,
            })
            : null;
        if (!this.transporter) {
            this.logger.warn('GMAIL_USER/GMAIL_APP_PASSWORD not set — outgoing emails are disabled.');
        }
    }

    /**
     * Low-level send. Never throws: email is best-effort and must not break the
     * request that triggered it. Returns true on success, false otherwise.
     */
    async sendEmail(
        to: string,
        subject: string,
        html: string,
        replyTo?: string,
        text?: string,
    ): Promise<boolean> {
        if (!this.transporter) {
            this.logger.warn(`Email to ${to} skipped (mailer disabled): ${subject}`);
            return false;
        }
        try {
            // Hard cap: nodemailer's socket timeouts don't always fire when the SMTP
            // server accepts the connection then stalls (e.g. Gmail throttling), so we
            // race the send against our own deadline and never wait longer than this.
            await Promise.race([
                this.transporter.sendMail({ from: this.from, to, subject, html, replyTo, text }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('send timed out after 25s')), 25000),
                ),
            ]);
            this.logger.log(`Email sent to ${to}: ${subject}`);
            return true;
        } catch (err: any) {
            this.logger.error(`Failed to send email to ${to}: ${err?.message ?? err}`);
            return false;
        }
    }

    private fmtDate(iso: string): string {
        return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    private fmtPrice(n: number): string {
        return `${n.toLocaleString('en-US')} MAD`;
    }

    /** The standard vehicle / dates / total rows shared by every booking email. */
    private bookingRows(d: BookingEmailData): Array<[string, string]> {
        return [
            ['Vehicle', `${d.vehicleMake} ${d.vehicleModel}`],
            ['Pick-up', this.fmtDate(d.startDate)],
            ['Return', this.fmtDate(d.endDate)],
            ['Total', this.fmtPrice(d.totalPrice)],
        ];
    }

    /**
     * Render a branded email into both an HTML body and a plain-text fallback
     * (better deliverability + accessibility) from the same structured content.
     */
    private renderEmail(c: RenderableEmail): { html: string; text: string } {
        const accent = c.accent || '#7e2637';
        const rowHtml = c.rows
            .map(
                ([label, value]) => `
                <tr>
                    <td style="padding:8px 0;color:#8a7f6f;font-size:13px;">${label}</td>
                    <td style="padding:8px 0;color:#1c1712;font-size:14px;font-weight:600;text-align:right;">${value}</td>
                </tr>`,
            )
            .join('');
        const html = `
        <div style="background:#f4f1ec;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
            <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e0d6;">
                <div style="background:${accent};padding:28px 32px;">
                    <div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:0.5px;">${c.agencyName}</div>
                    <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px;">${c.headerSubtitle}</div>
                </div>
                <div style="padding:32px;">
                    <p style="color:#1c1712;font-size:16px;margin:0 0 8px;">Hi ${c.greetingName || 'there'},</p>
                    <p style="color:#4a4238;font-size:14px;line-height:1.6;margin:0 0 24px;">${c.intro}</p>
                    <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;border-bottom:1px solid #eee;">${rowHtml}
                    </table>
                    <p style="color:#8a7f6f;font-size:13px;line-height:1.6;margin:24px 0 0;">${c.footerNote}</p>
                </div>
                <div style="padding:16px 32px;background:#faf8f4;border-top:1px solid #eee;color:#a99a83;font-size:12px;text-align:center;">
                    ${c.agencyName} · Sent via LuxDrive
                </div>
            </div>
        </div>`;
        const text = [
            `${c.agencyName} — ${c.headerSubtitle}`,
            '',
            `Hi ${c.greetingName || 'there'},`,
            '',
            c.intro,
            '',
            ...c.rows.map(([label, value]) => `${label}: ${value}`),
            '',
            c.footerNote,
            '',
            `${c.agencyName} · Sent via LuxDrive`,
        ].join('\n');
        return { html, text };
    }

    /** Notify a client that their booking was confirmed by the agency. */
    async sendBookingConfirmation(data: BookingEmailData): Promise<boolean> {
        if (!data.customerEmail) {
            this.logger.warn('Booking confirmation skipped — customer has no email.');
            return false;
        }
        const { html, text } = this.renderEmail({
            agencyName: data.agencyName,
            headerSubtitle: 'Booking confirmed',
            greetingName: data.customerFirstName,
            intro: 'Great news — your reservation has been confirmed. Here are your booking details:',
            rows: this.bookingRows(data),
            footerNote: 'If you have any questions, just reply to this email. We look forward to seeing you!',
        });
        // Replies go to the agency's own inbox when it has a public email set.
        return this.sendEmail(
            data.customerEmail,
            `Your booking with ${data.agencyName} is confirmed`,
            html,
            data.agencyReplyTo || undefined,
            text,
        );
    }

    /** Notify a client that their booking was cancelled by the agency. */
    async sendBookingCancellation(data: BookingEmailData): Promise<boolean> {
        if (!data.customerEmail) {
            this.logger.warn('Booking cancellation skipped — customer has no email.');
            return false;
        }
        const { html, text } = this.renderEmail({
            agencyName: data.agencyName,
            headerSubtitle: 'Booking cancelled',
            greetingName: data.customerFirstName,
            intro: 'We\'re sorry to let you know that the following reservation has been cancelled:',
            rows: this.bookingRows(data),
            footerNote: 'If this was unexpected or you\'d like to rebook, just reply to this email and we\'ll help.',
            accent: '#8a6d3b',
        });
        return this.sendEmail(
            data.customerEmail,
            `Your booking with ${data.agencyName} was cancelled`,
            html,
            data.agencyReplyTo || undefined,
            text,
        );
    }

    /** Acknowledge to a client that their booking request was received (still pending). */
    async sendBookingReceived(data: BookingEmailData): Promise<boolean> {
        if (!data.customerEmail) {
            this.logger.warn('Booking acknowledgement skipped — customer has no email.');
            return false;
        }
        const { html, text } = this.renderEmail({
            agencyName: data.agencyName,
            headerSubtitle: 'Request received',
            greetingName: data.customerFirstName,
            intro: 'Thanks for your booking request! We\'ve received it and the agency will confirm shortly. Here\'s a summary:',
            rows: this.bookingRows(data),
            footerNote: 'You\'ll get another email once the agency confirms. No action is needed for now.',
            accent: '#3b5b7e',
        });
        return this.sendEmail(
            data.customerEmail,
            `We received your booking request — ${data.agencyName}`,
            html,
            data.agencyReplyTo || undefined,
            text,
        );
    }

    /** Notify the agency that a new booking request came in and needs review. */
    async sendNewBookingAgencyNotice(data: NewBookingAgencyNoticeData): Promise<boolean> {
        if (!data.agencyEmail) {
            this.logger.warn('Agency new-booking notice skipped — agency has no public email.');
            return false;
        }
        const { html, text } = this.renderEmail({
            agencyName: data.agencyName,
            headerSubtitle: 'New booking request',
            greetingName: data.agencyName,
            intro: 'A new booking request just came in and is waiting for your confirmation:',
            rows: [
                ['Customer', data.customerFullName],
                ['Email', data.customerEmail],
                ['Phone', data.customerPhone || '—'],
                ['Vehicle', `${data.vehicleMake} ${data.vehicleModel}`],
                ['Pick-up', this.fmtDate(data.startDate)],
                ['Return', this.fmtDate(data.endDate)],
                ['Total', this.fmtPrice(data.totalPrice)],
            ],
            footerNote: 'Log in to your LuxDrive dashboard to confirm or decline. Reply to reach the client directly.',
            accent: '#3b5b7e',
        });
        // Reply-to the client so the agency can respond to them directly.
        return this.sendEmail(
            data.agencyEmail,
            `New booking request from ${data.customerFullName}`,
            html,
            data.customerEmail || undefined,
            text,
        );
    }
}

interface RenderableEmail {
    agencyName: string;
    headerSubtitle: string;
    greetingName?: string;
    intro: string;
    rows: Array<[string, string]>;
    footerNote: string;
    accent?: string;
}

export interface BookingEmailData {
    customerEmail: string;
    customerFirstName: string;
    agencyName: string;
    /** Agency's public contact email; used as the reply-to so client replies reach them. */
    agencyReplyTo?: string;
    vehicleMake: string;
    vehicleModel: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
}

export interface NewBookingAgencyNoticeData {
    /** Agency's public email — the recipient of this notice. */
    agencyEmail: string;
    agencyName: string;
    customerFullName: string;
    customerEmail: string;
    customerPhone?: string;
    vehicleMake: string;
    vehicleModel: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
}
