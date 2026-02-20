// Service complet pour l'envoi d'emails d'invitation
// À intégrer dans votre services/emailService.js

const nodemailer = require("nodemailer");

// Créer le transporteur SMTP avec configuration optimisée
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true pour 465, false pour 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // ⬇️ Augmenter les timeouts pour éviter les erreurs
    connectionTimeout: 60000, // 60 secondes
    greetingTimeout: 30000,   // 30 secondes
    socketTimeout: 60000,     // 60 secondes
    // Pour Gmail
    requireTLS: true,
    tls: {
      rejectUnauthorized: false, // Pour développement uniquement
    },
  });
};

// Envoyer un email d'invitation à une course
const sendRaceInvitation = async (email, raceName, token, raceId) => {
  const transporter = createTransporter();
  
  // ⬇️ Utiliser le deep link scheme pour ouvrir directement l'app
  // Format Android Intent pour une meilleure compatibilité avec les clients email
  // Le scheme "mint://" est configuré dans app.json
  const deepLink = `mint://race-invitation?token=${token}&raceId=${raceId}&email=${encodeURIComponent(email)}`;
  // Format Android Intent pour une meilleure compatibilité
  const invitationUrl = `intent://race-invitation?token=${token}&raceId=${raceId}&email=${encodeURIComponent(email)}#Intent;scheme=mint;package=com.mint.app;end`;
  
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: `Invitation à la course "${raceName}"`,
    html: `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            border: 1px solid #e0e0e0;
          }
          h2 {
            color: #0F0F0F;
            margin-top: 0;
          }
          .button {
            display: inline-block;
            background-color: #A1F763;
            color: #000;
            padding: 15px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            margin: 20px 0;
            transition: opacity 0.3s;
          }
          .button:hover {
            opacity: 0.9;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>🏃 Invitation à la course "${raceName}"</h2>
          <p>Bonjour,</p>
          <p>Vous avez été invité(e) à participer à la course <strong>"${raceName}"</strong>.</p>
          <p>Cliquez sur le bouton ci-dessous pour accepter l'invitation et rejoindre la course :</p>
          <div style="text-align: center;">
            <a href="${invitationUrl}" class="button">Rejoindre la course</a>
          </div>
          <p>Ou copiez ce lien dans votre navigateur :</p>
          <p style="word-break: break-all; color: #666; font-size: 12px;">${invitationUrl}</p>
          <div class="footer">
            <p>Ce lien expirera dans 30 jours.</p>
            <p>Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    // Version texte pour les clients email qui ne supportent pas HTML
    text: `
      Invitation à la course "${raceName}"
      
      Bonjour,
      
      Vous avez été invité(e) à participer à la course "${raceName}".
      
      Pour accepter l'invitation, cliquez sur le lien suivant :
      ${invitationUrl}
      
      Ce lien expirera dans 30 jours.
      
      Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
    `,
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = {
  createTransporter,
  sendRaceInvitation,
};
