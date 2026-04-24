const Invitation = require("../models/Invitation");
const Race = require("../models/Race");
const User = require("../models/User");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Configuration SMTP (à adapter selon votre fournisseur)
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true pour 465, false pour autres ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Générer un token unique pour l'invitation
const generateToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Créer des invitations pour des emails
exports.createInvitations = async (req, res) => {
  try {
    const { raceId } = req.params;
    const { emails } = req.body; // Array d'emails
    const inviterId = req.userId;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: "Liste d'emails requise" });
    }

    // Vérifier que la course existe et que l'utilisateur est le propriétaire
    const race = await Race.findById(raceId);
    if (!race) {
      return res.status(404).json({ error: "Course non trouvée" });
    }

    if (race.owner.toString() !== inviterId) {
      return res.status(403).json({ error: "Seul le propriétaire peut inviter des coureurs" });
    }

    const inviter = await User.findById(inviterId);
    const invitations = [];
    const transporter = createTransporter();

    for (const email of emails) {
      // Vérifier si une invitation existe déjà pour cet email et cette course
      let invitation = await Invitation.findOne({ raceId, email });

      if (!invitation) {
        // Créer une nouvelle invitation
        const token = generateToken();
        invitation = new Invitation({
          raceId,
          email,
          token,
          invitedBy: inviterId,
        });
        await invitation.save();
      } else if (invitation.status === "declined") {
        // Réactiver une invitation déclinée
        invitation.status = "pending";
        invitation.token = generateToken();
        invitation.declinedAt = undefined;
        await invitation.save();
      }

      // Envoyer l'email d'invitation avec deep link pour ouvrir directement l'app
      // Format Android Intent pour une meilleure compatibilité avec les clients email
      // Le scheme "mint://" est configuré dans app.json
      const deepLink = `mint://race-invitation?token=${invitation.token}&raceId=${raceId}`;
      // Format Android Intent pour une meilleure compatibilité
      const invitationUrl = `intent://race-invitation?token=${invitation.token}&raceId=${raceId}#Intent;scheme=mint;package=com.mint.app;end`;
      
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject: `Invitation à la course "${race.name}"`,
          html: `
            <h2>Invitation à la course "${race.name}"</h2>
            <p>Bonjour,</p>
            <p>Vous avez été invité(e) par ${inviter?.email || "un organisateur"} à participer à la course <strong>"${race.name}"</strong>.</p>
            <p><strong>Date de début :</strong> ${new Date(race.startDate).toLocaleDateString("fr-FR")}</p>
            ${race.endDate ? `<p><strong>Date de fin :</strong> ${new Date(race.endDate).toLocaleDateString("fr-FR")}</p>` : ""}
            <p>Cliquez sur le lien ci-dessous pour accepter l'invitation :</p>
            <p><a href="${invitationUrl}" style="background-color: #A1F763; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Rejoindre la course</a></p>
            <p>Ou copiez ce lien : ${invitationUrl}</p>
            <p>Ce lien expirera dans 30 jours.</p>
          `,
        });
      } catch (emailError) {
        console.error(`Erreur envoi email à ${email}:`, emailError);
        // Continuer même si l'email échoue
      }

      invitations.push(invitation);
    }

    res.status(201).json({
      message: `${invitations.length} invitation(s) créée(s)`,
      invitations: invitations.map(inv => ({
        _id: inv._id,
        email: inv.email,
        status: inv.status,
        token: inv.token,
      })),
    });
  } catch (error) {
    console.error("Erreur création invitations:", error);
    res.status(500).json({ error: error.message });
  }
};

// Récupérer les invitations d'un utilisateur
exports.getMyInvitations = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Récupérer les invitations pour l'email de l'utilisateur
    const invitations = await Invitation.find({
      email: user.email,
      status: "pending",
      expiresAt: { $gt: new Date() },
    })
      .populate("raceId", "name startDate endDate organization")
      .populate("invitedBy", "email firstname lastname")
      .sort({ createdAt: -1 });

    res.status(200).json({ invitations });
  } catch (error) {
    console.error("Erreur récupération invitations:", error);
    res.status(500).json({ error: error.message });
  }
};

// Valider une invitation via token (depuis le lien email)
exports.validateInvitation = async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await Invitation.findOne({ token })
      .populate("raceId")
      .populate("invitedBy");

    if (!invitation) {
      return res.status(404).json({ error: "Invitation non trouvée" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({
        error: invitation.status === "accepted" ? "Invitation déjà acceptée" : "Invitation déclinée",
        status: invitation.status,
      });
    }

    if (new Date() > invitation.expiresAt) {
      return res.status(400).json({ error: "Invitation expirée" });
    }

    res.status(200).json({
      invitation: {
        _id: invitation._id,
        raceId: invitation.raceId._id,
        raceName: invitation.raceId.name,
        email: invitation.email,
        invitedBy: invitation.invitedBy?.email,
      },
    });
  } catch (error) {
    console.error("Erreur validation invitation:", error);
    res.status(500).json({ error: error.message });
  }
};

// Accepter une invitation
exports.acceptInvitation = async (req, res) => {
  try {
    const { id } = req.params; // ID de l'invitation
    const userId = req.userId;

    const invitation = await Invitation.findById(id).populate("raceId");

    if (!invitation) {
      return res.status(404).json({ error: "Invitation non trouvée" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Vérifier que l'email correspond
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return res.status(403).json({ error: "Cette invitation ne vous est pas destinée" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({
        error: invitation.status === "accepted" ? "Invitation déjà acceptée" : "Invitation déclinée",
      });
    }

    // Vérifier que l'utilisateur est un coureur
    if (user.role !== "coureur") {
      return res.status(403).json({ error: "Seuls les coureurs peuvent accepter une invitation" });
    }

    // Ajouter l'utilisateur à la course
    const race = invitation.raceId;
    if (!race.runners.includes(userId)) {
      race.runners.push(userId);
      await race.save();
    }

    // Marquer l'invitation comme acceptée
    invitation.status = "accepted";
    invitation.acceptedAt = new Date();
    await invitation.save();

    res.status(200).json({
      message: "Invitation acceptée avec succès",
      race: race,
    });
  } catch (error) {
    console.error("Erreur acceptation invitation:", error);
    res.status(500).json({ error: error.message });
  }
};

// Décliner une invitation
exports.declineInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const invitation = await Invitation.findById(id);

    if (!invitation) {
      return res.status(404).json({ error: "Invitation non trouvée" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return res.status(403).json({ error: "Cette invitation ne vous est pas destinée" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ error: "Invitation déjà traitée" });
    }

    invitation.status = "declined";
    invitation.declinedAt = new Date();
    await invitation.save();

    res.status(200).json({ message: "Invitation déclinée" });
  } catch (error) {
    console.error("Erreur déclin invitation:", error);
    res.status(500).json({ error: error.message });
  }
};
