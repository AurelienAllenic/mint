const mongoose = require("mongoose");

const InvitationSchema = new mongoose.Schema({
  raceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Race",
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "declined"],
    default: "pending",
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  acceptedAt: {
    type: Date,
  },
  declinedAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
  },
}, {
  timestamps: true,
});

// Index pour recherche rapide
InvitationSchema.index({ email: 1, raceId: 1 });
InvitationSchema.index({ token: 1 });
InvitationSchema.index({ status: 1 });

module.exports = mongoose.model("Invitation", InvitationSchema);
