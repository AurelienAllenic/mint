const express = require("express");
const router = express.Router();
const invitationController = require("../controllers/invitationController");
const auth = require("../middleware/auth");

// Créer des invitations pour une course
router.post("/race/:raceId/invite", auth, invitationController.createInvitations);

// Récupérer mes invitations
router.get("/my-invitations", auth, invitationController.getMyInvitations);

// Valider une invitation via token (pour redirection login/signup)
router.get("/invitation/:token", invitationController.validateInvitation);

// Accepter une invitation
router.post("/invitation/:id/accept", auth, invitationController.acceptInvitation);

// Décliner une invitation
router.post("/invitation/:id/decline", auth, invitationController.declineInvitation);

module.exports = router;
