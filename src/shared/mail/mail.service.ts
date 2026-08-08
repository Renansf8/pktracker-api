import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { env } from '../config/env';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend = new Resend(env.resendApiKey);

  async sendPasswordResetEmail(to: string, resetLink: string) {
    const { error } = await this.resend.emails.send({
      from: env.resendFromEmail,
      to,
      subject: 'Recuperação de senha - PKTracker',
      html: `
        <p>Você solicitou a redefinição da sua senha no PKTracker.</p>
        <p><a href="${resetLink}">Clique aqui para criar uma nova senha</a></p>
        <p>Este link expira em 30 minutos. Se você não solicitou isso, ignore este email.</p>
      `,
    });

    if (error) {
      this.logger.error(
        `Failed to send password reset email: ${error.message}`,
      );
    }
  }
}
