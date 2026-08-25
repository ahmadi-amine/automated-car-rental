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
}
