// À ajouter dans votre authController.js

const User = require("../models/User");

// Vérifier si un email existe déjà dans la base de données
exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email requis" });
    }

    // Rechercher l'utilisateur par email (insensible à la casse)
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select("email role"); // Ne retourner que email et role pour la sécurité

    res.status(200).json({
      exists: !!user,
      role: user?.role || null,
      email: user?.email || null,
    });
  } catch (error) {
    console.error("Erreur vérification email:", error);
    res.status(500).json({ 
      error: "Erreur lors de la vérification de l'email",
      message: error.message 
    });
  }
};
