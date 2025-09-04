import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface AccountCreationEmail {
  clientName: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  // This should be configured with your actual email service endpoint
  private readonly emailApiUrl = '/api/email'; // Replace with your email service URL

  constructor(private readonly http: HttpClient) { }

  /**
   * Send account creation email to client
   * @param data Account creation data
   */
  sendAccountCreationEmail(data: AccountCreationEmail): Observable<any> {
    const emailTemplate = this.createAccountCreationTemplate(data);
    
    // For now, we'll simulate sending the email
    // In a real application, you would integrate with an email service like:
    // - SendGrid
    // - AWS SES
    // - Mailgun
    // - NodeMailer backend
    
    console.log('Sending account creation email:', emailTemplate);
    
    // Simulate HTTP call to email service
    return this.http.post(this.emailApiUrl + '/send-account-creation', emailTemplate);
  }

  /**
   * Create HTML template for account creation email
   * @param data Account creation data
   */
  createAccountCreationTemplate(data: AccountCreationEmail): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Votre compte MegaFast a été créé</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #556ee6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .credentials { background-color: white; padding: 15px; border-left: 4px solid #556ee6; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #556ee6; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bienvenue sur MegaFast</h1>
          </div>
          
          <div class="content">
            <h2>Bonjour ${data.clientName},</h2>
            
            <p>Votre compte client MegaFast a été créé avec succès par notre équipe administrative.</p>
            
            <div class="credentials">
              <h3>Vos informations de connexion :</h3>
              <p><strong>Email :</strong> ${data.email}</p>
              <p><strong>Mot de passe temporaire :</strong> <code>${data.temporaryPassword}</code></p>
            </div>
            
            <p><strong>Important :</strong> Pour des raisons de sécurité, nous vous recommandons fortement de changer ce mot de passe temporaire lors de votre première connexion.</p>
            
            <a href="${data.loginUrl}" class="button">Se connecter maintenant</a>
            
            <h3>Que pouvez-vous faire avec votre compte ?</h3>
            <ul>
              <li>Consulter vos commandes et factures</li>
              <li>Suivre le statut de vos demandes</li>
              <li>Mettre à jour vos informations de contact</li>
              <li>Accéder à l'historique de vos transactions</li>
            </ul>
            
            <p>Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter notre équipe support.</p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} MegaFast. Tous droits réservés.</p>
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre directement.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Bienvenue sur MegaFast

      Bonjour ${data.clientName},

      Votre compte client MegaFast a été créé avec succès.

      Vos informations de connexion :
      Email : ${data.email}
      Mot de passe temporaire : ${data.temporaryPassword}

      Connectez-vous à : ${data.loginUrl}

      Important : Changez votre mot de passe lors de votre première connexion.

      © ${new Date().getFullYear()} MegaFast. Tous droits réservés.
    `;

    return {
      to: data.email,
      subject: 'Votre compte MegaFast a été créé - Informations de connexion',
      html,
      text
    };
  }

  /**
   * Simulate email sending for development
   * This method should be replaced with actual email service integration
   */
  simulateEmailSending(emailData: EmailTemplate): Promise<boolean> {
    return new Promise((resolve) => {
      // Simulate network delay
      setTimeout(() => {
        console.log('📧 Email envoyé avec succès à:', emailData.to);
        console.log('Sujet:', emailData.subject);
        console.log('Contenu HTML:', emailData.html);
        resolve(true);
      }, 1000);
    });
  }

  /**
   * Generate a secure temporary password
   */
  generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    
    // Ensure at least one uppercase, one lowercase, one number, and one special char
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%'[Math.floor(Math.random() * 5)];
    
    // Fill remaining length with random chars
    for (let i = 4; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}
