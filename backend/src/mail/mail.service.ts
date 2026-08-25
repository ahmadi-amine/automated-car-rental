import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly resend: Resend | null;
    private readonly from: string;

    constructor(private readonly config: ConfigService) {
        const apiKey = this.config.get<string>('RESEND_API_KEY');
        this.from = this.config.get<string>('MAIL_FROM', 'LuxDrive <onboarding@resend.dev>');
        this.resend = apiKey ? new Resend(apiKey) : null;
        if (!this.resend) {
            this.logger.warn('RESEND_API_KEY is not set — outgoing emails are disabled.');
        }
    }

    /**
     * Low-level send. Never throws: email is best-effort and must not break the
     * request that triggered it. Returns true on success, false otherwise.
     */
    async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
        if (!this.resend) {
            this.logger.warn(`Email to ${to} skipped (mailer disabled): ${subject}`);
            return false;
        }
        try {
            const { error } = await this.resend.emails.send({ from: this.from, to, subject, html });
            if (error) {
                this.logger.error(`Failed to send email to ${to}: ${error.message}`);
                return false;
            }
            this.logger.log(`Email sent to ${to}: ${subject}`);
            return true;
        } catch (err: any) {
            this.logger.error(`Failed to send email to ${to}: ${err?.message ?? err}`);
            return false;
        }
    }

    /** Notify a client that their booking was confirmed by the agency. */
    async sendBookingConfirmation(data: BookingConfirmationData): Promise<boolean> {
        if (!data.customerEmail) {
            this.logger.warn('Booking confirmation skipped — customer has no email.');
            return false;
        }
        const subject = `Your booking with ${data.agencyName} is confirmed`;
        return this.sendEmail(data.customerEmail, subject, this.bookingConfirmationTemplate(data));
    }

    private bookingConfirmationTemplate(d: BookingConfirmationData): string {
        const fmtDate = (iso: string) =>
            new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const fmtPrice = (n: number) => `${n.toLocaleString('en-US')} MAD`;
        const accent = '#7e2637';
        const row = (label: string, value: string) => `
            <tr>
                <td style="padding:8px 0;color:#8a7f6f;font-size:13px;">${label}</td>
                <td style="padding:8px 0;color:#1c1712;font-size:14px;font-weight:600;text-align:right;">${value}</td>
            </tr>`;
        return `
        <div style="background:#f4f1ec;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
            <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e0d6;">
                <div style="background:${accent};padding:28px 32px;">
                    <div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:0.5px;">${d.agencyName}</div>
                    <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px;">Booking confirmed</div>
                </div>
                <div style="padding:32px;">
                    <p style="color:#1c1712;font-size:16px;margin:0 0 8px;">Hi ${d.customerFirstName || 'there'},</p>
                    <p style="color:#4a4238;font-size:14px;line-height:1.6;margin:0 0 24px;">
                        Great news — your reservation has been confirmed. Here are your booking details:
                    </p>
                    <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;border-bottom:1px solid #eee;">
                        ${row('Vehicle', `${d.vehicleMake} ${d.vehicleModel}`)}
                        ${row('Pick-up', fmtDate(d.startDate))}
                        ${row('Return', fmtDate(d.endDate))}
                        ${row('Total', fmtPrice(d.totalPrice))}
                    </table>
                    <p style="color:#8a7f6f;font-size:13px;line-height:1.6;margin:24px 0 0;">
                        If you have any questions, just reply to this email. We look forward to seeing you!
                    </p>
                </div>
                <div style="padding:16px 32px;background:#faf8f4;border-top:1px solid #eee;color:#a99a83;font-size:12px;text-align:center;">
                    ${d.agencyName} · Sent via LuxDrive
                </div>
            </div>
        </div>`;
    }
}

export interface BookingConfirmationData {
    customerEmail: string;
    customerFirstName: string;
    agencyName: string;
    vehicleMake: string;
    vehicleModel: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
}
