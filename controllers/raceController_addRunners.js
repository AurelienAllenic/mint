// À ajouter dans raceController.js

// Ajouter des coureurs à une course existante (avec paiement si nécessaire)
exports.addRunnersToRace = async (req, res) => {
  try {
    const { id } = req.params; // raceId
    const { emails, paymentIntentId } = req.body; // emails = array d'emails
    const userId = req.userId;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: "Liste d'emails requise" });
    }

    // Vérifier que la course existe et que l'utilisateur est le propriétaire
    const race = await Race.findById(id);
    if (!race) {
      return res.status(404).json({ error: "Course non trouvée" });
    }

    if (race.owner.toString() !== userId) {
      return res.status(403).json({ error: "Seul le propriétaire peut ajouter des coureurs" });
    }

    // Calculer le nombre de coureurs actuels et le nombre à ajouter
    const currentRunnersCount = race.runners.length;
    const newRunnersCount = emails.length;
    const totalAfterAdd = currentRunnersCount + newRunnersCount;
    const FREE_RUNNERS = 2;
    const PRICE_PER_RUNNER = 1.5;

    // Calculer combien de coureurs supplémentaires (au-delà des 2 gratuits)
    let extraRunners = 0;
    if (currentRunnersCount < FREE_RUNNERS) {
      // Il reste des places gratuites
      const freeSlotsRemaining = FREE_RUNNERS - currentRunnersCount;
      extraRunners = Math.max(0, newRunnersCount - freeSlotsRemaining);
    } else {
      // Tous les nouveaux coureurs sont payants
      extraRunners = newRunnersCount;
    }

    // Vérifier le paiement si nécessaire
    if (extraRunners > 0) {
      if (!paymentIntentId) {
        return res.status(400).json({
          error: `Paiement requis pour ajouter ${extraRunners} coureur(s) supplémentaire(s)`,
          requiredAmount: extraRunners * PRICE_PER_RUNNER,
        });
      }

      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (pi.status !== "succeeded") {
          return res.status(400).json({ error: "Paiement non confirmé" });
        }

        const expectedAmount = Math.round(extraRunners * PRICE_PER_RUNNER * 100); // En centimes
        if (pi.amount !== expectedAmount) {
          return res.status(400).json({
            error: "Montant paiement incorrect",
            expected: expectedAmount,
            received: pi.amount,
          });
        }
      } catch (error) {
        console.error("Erreur vérification paiement:", error);
        return res.status(500).json({ error: "Erreur vérification paiement" });
      }
    }

    // Créer les invitations pour chaque email
    const Invitation = require("../models/Invitation");
    const crypto = require("crypto");
    const nodemailer = require("nodemailer");

    const generateToken = () => crypto.randomBytes(32).toString("hex");

    const createTransporter = () => {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    };

    const transporter = createTransporter();
    const invitations = [];

    for (const email of emails) {
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await User.findOne({ email: email.toLowerCase() });

      if (existingUser) {
        // Si l'utilisateur existe et est un coureur, l'ajouter directement
        if (existingUser.role === "coureur" && !race.runners.includes(existingUser._id)) {
          race.runners.push(existingUser._id);
        }
        // Sinon, créer une invitation (même si l'utilisateur existe mais n'est pas coureur)
      }

      // Créer ou mettre à jour l'invitation
      let invitation = await Invitation.findOne({ raceId: id, email: email.toLowerCase() });

      if (!invitation) {
        const token = generateToken();
        invitation = new Invitation({
          raceId: id,
          email: email.toLowerCase(),
          token,
          invitedBy: userId,
        });
        await invitation.save();
      } else if (invitation.status === "declined") {
        invitation.status = "pending";
        invitation.token = generateToken();
        invitation.declinedAt = undefined;
        await invitation.save();
      }

      // Envoyer l'email d'invitation avec deep link pour ouvrir directement l'app
      // Le scheme "mint://" est configuré dans app.json
      const invitationUrl = `mint://race-invitation?token=${invitation.token}&raceId=${id}`;
      
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject: `Invitation à la course "${race.name}"`,
          html: `
            <h2>Invitation à la course "${race.name}"</h2>
            <p>Bonjour,</p>
            <p>Vous avez été invité(e) à participer à la course <strong>"${race.name}"</strong>.</p>
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
      }

      invitations.push(invitation);
    }

    await race.save();

    res.status(200).json({
      message: `${emails.length} invitation(s) envoyée(s)`,
      race: await Race.findById(id).populate("runners").populate("organization").populate("owner"),
      invitations: invitations.map(inv => ({
        _id: inv._id,
        email: inv.email,
        status: inv.status,
      })),
    });
  } catch (error) {
    console.error("Erreur ajout coureurs:", error);
    res.status(500).json({ error: error.message });
  }
};
