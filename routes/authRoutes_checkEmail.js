// Route à ajouter dans vos routes d'authentification
// Exemple : router.get("/auth/check-email", authController.checkEmail);

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Vérifier si un email existe (public - pas besoin d'auth)
router.get("/check-email", authController.checkEmail);

module.exports = router;
