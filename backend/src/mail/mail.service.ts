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
        return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    private fmtPrice(n: number): string {
        return `${n.toLocaleString('fr-FR')} MAD`;
    }

    /** A leading "Référence" row, or nothing when there is no reference. */
    private refRow(reference?: string): Array<[string, string]> {
        return reference ? [['Référence', reference]] : [];
    }

    /** The vehicle / dates / total rows shared by every booking email. */
    private vehicleRows(d: VehicleLine): Array<[string, string]> {
        return [
            ['Véhicule', `${d.vehicleMake} ${d.vehicleModel}`],
            ['Départ', this.fmtDate(d.startDate)],
            ['Retour', this.fmtDate(d.endDate)],
            ['Total', this.fmtPrice(d.totalPrice)],
        ];
    }

    /** Reference + vehicle rows for the client-facing booking emails. */
    private bookingRows(d: BookingEmailData): Array<[string, string]> {
        return [...this.refRow(d.reference), ...this.vehicleRows(d)];
    }

    /**
     * Render a branded email into both an HTML body and a plain-text fallback
     * (better deliverability + accessibility) from the same structured content.
     */
    /** Escape user-controlled text before interpolating it into an HTML email body. */
    private escapeHtml(s: string): string {
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private renderEmail(c: RenderableEmail): { html: string; text: string } {
        const accent = c.accent || '#7e2637';
        const esc = (s: string) => this.escapeHtml(s);
        const agencyName = esc(c.agencyName);
        const greeting = c.greetingName ? ' ' + esc(c.greetingName) : '';
        const rowHtml = c.rows
            .map(
                ([label, value]) => `
                <tr>
                    <td style="padding:8px 0;color:#8a7f6f;font-size:13px;">${esc(label)}</td>
                    <td style="padding:8px 0;color:#1c1712;font-size:14px;font-weight:600;text-align:right;">${esc(value)}</td>
                </tr>`,
            )
            .join('');
        const html = `
        <div style="background:#f4f1ec;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
            <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e0d6;">
                <div style="background:${accent};padding:28px 32px;">
                    <div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:0.5px;">${agencyName}</div>
                    <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px;">${esc(c.headerSubtitle)}</div>
                </div>
                <div style="padding:32px;">
                    <p style="color:#1c1712;font-size:16px;margin:0 0 8px;">Bonjour${greeting},</p>
                    <p style="color:#4a4238;font-size:14px;line-height:1.6;margin:0 0 24px;">${esc(c.intro)}</p>
                    <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;border-bottom:1px solid #eee;">${rowHtml}
                    </table>
                    <p style="color:#8a7f6f;font-size:13px;line-height:1.6;margin:24px 0 0;">${esc(c.footerNote)}</p>
                </div>
                <div style="padding:16px 32px;background:#faf8f4;border-top:1px solid #eee;color:#a99a83;font-size:12px;text-align:center;">
                    ${agencyName} · Envoyé via LuxDrive
                </div>
            </div>
        </div>`;
        const text = [
            `${c.agencyName} — ${c.headerSubtitle}`,
            '',
            `Bonjour${c.greetingName ? ' ' + c.greetingName : ''},`,
            '',
            c.intro,
            '',
            ...c.rows.map(([label, value]) => `${label}: ${value}`),
            '',
            c.footerNote,
            '',
            `${c.agencyName} · Envoyé via LuxDrive`,
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
            headerSubtitle: 'Réservation confirmée',
            greetingName: data.customerFirstName,
            intro: 'Bonne nouvelle — votre réservation est confirmée. Voici les détails de votre réservation :',
            rows: this.bookingRows(data),
            footerNote: 'Pour toute question, il vous suffit de répondre à cet email. À très bientôt !',
        });
        // Replies go to the agency's own inbox when it has a public email set.
        return this.sendEmail(
            data.customerEmail,
            `Votre réservation avec ${data.agencyName} est confirmée`,
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
            headerSubtitle: 'Réservation annulée',
            greetingName: data.customerFirstName,
            intro: 'Nous sommes désolés de vous informer que la réservation suivante a été annulée :',
            rows: this.bookingRows(data),
            footerNote: 'Si cela est inattendu ou si vous souhaitez réserver à nouveau, répondez à cet email et nous vous aiderons.',
            accent: '#8a6d3b',
        });
        return this.sendEmail(
            data.customerEmail,
            `Votre réservation avec ${data.agencyName} a été annulée`,
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
            headerSubtitle: 'Demande reçue',
            greetingName: data.customerFirstName,
            intro: 'Merci pour votre demande de réservation ! Nous l\'avons bien reçue et l\'agence la confirmera prochainement. Voici un récapitulatif :',
            rows: this.bookingRows(data),
            footerNote: 'Vous recevrez un autre email dès que l\'agence aura confirmé. Aucune action n\'est requise pour le moment.',
            accent: '#3b5b7e',
        });
        return this.sendEmail(
            data.customerEmail,
            `Nous avons bien reçu votre demande de réservation — ${data.agencyName}`,
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
            headerSubtitle: 'Nouvelle demande de réservation',
            greetingName: data.agencyName,
            intro: 'Une nouvelle demande de réservation vient d\'arriver et attend votre confirmation :',
            rows: [
                ...this.refRow(data.reference),
                ['Client', data.customerFullName],
                ['Email', data.customerEmail],
                ['Téléphone', data.customerPhone || '—'],
                ...this.vehicleRows(data),
            ],
            footerNote: 'Connectez-vous à votre tableau de bord LuxDrive pour confirmer ou refuser. Répondez pour contacter directement le client.',
            accent: '#3b5b7e',
        });
        // Reply-to the client so the agency can respond to them directly.
        return this.sendEmail(
            data.agencyEmail,
            `Nouvelle demande de réservation de ${data.customerFullName}`,
            html,
            data.customerEmail || undefined,
            text,
        );
    }

    /** Send an account email-verification link to a newly-registered client. */
    async sendVerificationEmail(to: string, firstName: string, verifyUrl: string): Promise<boolean> {
        const name = this.escapeHtml(firstName || '');
        const url = this.escapeHtml(verifyUrl);
        const html = `
        <div style="background:#f4f1ec;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
            <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e0d6;">
                <div style="background:#7e2637;padding:28px 32px;">
                    <div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:0.5px;">LuxDrive</div>
                    <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px;">Confirmez votre adresse email</div>
                </div>
                <div style="padding:32px;">
                    <p style="color:#1c1712;font-size:16px;margin:0 0 8px;">Bonjour${name ? ' ' + name : ''},</p>
                    <p style="color:#4a4238;font-size:14px;line-height:1.6;margin:0 0 24px;">
                        Merci de votre inscription. Pour activer votre compte, veuillez confirmer votre adresse email :
                    </p>
                    <p style="text-align:center;margin:0 0 24px;">
                        <a href="${url}" style="display:inline-block;background:#7e2637;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:10px;">Confirmer mon email</a>
                    </p>
                    <p style="color:#8a7f6f;font-size:13px;line-height:1.6;margin:0;">
                        Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.
                    </p>
                </div>
                <div style="padding:16px 32px;background:#faf8f4;border-top:1px solid #eee;color:#a99a83;font-size:12px;text-align:center;">
                    LuxDrive
                </div>
            </div>
        </div>`;
        const text = [
            'LuxDrive — Confirmez votre adresse email',
            '',
            `Bonjour${firstName ? ' ' + firstName : ''},`,
            '',
            'Merci de votre inscription. Pour activer votre compte, confirmez votre adresse email en ouvrant ce lien :',
            verifyUrl,
            '',
            'Ce lien expire dans 24 heures. Si vous n\'avez pas créé de compte, ignorez cet email.',
        ].join('\n');
        return this.sendEmail(to, 'Confirmez votre adresse email — LuxDrive', html, undefined, text);
    }
}

/** The vehicle + rental fields both client and agency emails render into rows. */
interface VehicleLine {
    vehicleMake: string;
    vehicleModel: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
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
    /** Human-friendly booking reference (e.g. LX-3F9A2C). */
    reference?: string;
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
    /** Human-friendly booking reference (e.g. LX-3F9A2C). */
    reference?: string;
    customerFullName: string;
    customerEmail: string;
    customerPhone?: string;
    vehicleMake: string;
    vehicleModel: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
}
