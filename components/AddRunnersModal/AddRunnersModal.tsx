import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
import { BlurView } from "expo-blur";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/auth";

interface AddRunnersModalProps {
  visible: boolean;
  onClose: () => void;
  raceId: string;
  currentRunnersCount: number;
  onSuccess: () => void;
}

const FREE_RUNNERS = 2;
const PRICE_PER_RUNNER = 1.5;

const AddRunnersModalContent: React.FC<AddRunnersModalProps> = ({
  visible,
  onClose,
  raceId,
  currentRunnersCount,
  onSuccess,
}) => {
  const { token } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [emails, setEmails] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const STRIPE_PUBLIC_KEY = process.env.EXPO_PUBLIC_STRIPE_KEY;

  // Calculer le nombre de coureurs supplémentaires
  const newRunnersCount = emails.filter((e) => e.trim() !== "").length;
  const freeSlotsRemaining = Math.max(0, FREE_RUNNERS - currentRunnersCount);
  const extraRunners = Math.max(0, newRunnersCount - freeSlotsRemaining);
  const totalPayment = extraRunners * PRICE_PER_RUNNER;
  const needsPayment = extraRunners > 0 && !paymentIntentId;

  useEffect(() => {
    if (!visible) {
      // Réinitialiser quand le modal se ferme
      setEmails([""]);
      setPaymentIntentId(null);
      setError(null);
    }
  }, [visible]);

  const handleAddEmailField = () => {
    setEmails([...emails, ""]);
  };

  const handleRemoveEmailField = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index));
    }
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const handlePayment = async () => {
    if (!token || !API_URL) return;

    setIsProcessingPayment(true);
    setError(null);

    try {
      const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

      const response = await fetch(`${API_URL}/race/create-payment-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          amount: totalPayment,
          currency: "eur",
          quantity: extraRunners,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la création du paiement");
      }

      const { clientSecret } = await response.json();

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Mint",
        paymentIntentClientSecret: clientSecret,
      });

      if (initError) {
        throw new Error(`Erreur init: ${initError.message}`);
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === "Canceled") {
          Alert.alert("Paiement annulé");
        } else {
          throw new Error(`Erreur paiement: ${presentError.message}`);
        }
        return;
      }

      const piId = clientSecret.split("_secret_")[0];
      setPaymentIntentId(piId);
      Alert.alert("Succès", `Paiement de ${totalPayment.toFixed(2)}€ effectué !`);
    } catch (err) {
      console.error("Erreur lors du paiement:", err);
      setError(`Erreur lors du paiement: ${err instanceof Error ? err.message : String(err)}`);
      Alert.alert("Erreur", "Le paiement a échoué. Veuillez réessayer.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSubmit = async () => {
    const validEmails = emails.filter((e) => e.trim() !== "");
    
    if (validEmails.length === 0) {
      setError("Veuillez saisir au moins un email");
      return;
    }

    // Valider les emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = validEmails.filter((e) => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      setError(`Emails invalides : ${invalidEmails.join(", ")}`);
      return;
    }

    if (needsPayment) {
      setError(`Vous devez payer ${totalPayment.toFixed(2)}€ pour ajouter ${extraRunners} coureur(s) supplémentaire(s)`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const authHeader = token?.startsWith("Bearer ") ? token : `Bearer ${token}`;

      const response = await fetch(`${API_URL}/race/${raceId}/add-runners`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          emails: validEmails,
          ...(paymentIntentId ? { paymentIntentId } : {}),
        }),
      });

      if (response.ok) {
        Alert.alert("Succès", `${validEmails.length} invitation(s) envoyée(s) !`, [
          {
            text: "OK",
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ]);
      } else {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
        throw new Error(errorData.error || "Erreur lors de l'ajout des coureurs");
      }
    } catch (err) {
      console.error("Erreur ajout coureurs:", err);
      setError(err instanceof Error ? err.message : String(err));
      Alert.alert("Erreur", err instanceof Error ? err.message : "Erreur lors de l'ajout des coureurs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <BlurView intensity={80} tint="dark" style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ajouter des coureurs</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.infoText}>
              Les coureurs recevront un email d'invitation pour rejoindre la course.
            </Text>

            <Text style={styles.label}>Emails des coureurs</Text>
            {emails.map((email, index) => (
              <View key={index} style={styles.emailRow}>
                <TextInput
                  style={styles.emailInput}
                  placeholder="email@example.com"
                  value={email}
                  onChangeText={(value) => handleEmailChange(index, value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {emails.length > 1 && (
                  <TouchableOpacity
                    onPress={() => handleRemoveEmailField(index)}
                    style={styles.removeButton}
                  >
                    <Icon name="close-circle" size={24} color="#FF6B6B" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity onPress={handleAddEmailField} style={styles.addButton}>
              <Icon name="plus-circle" size={20} color="#A1F763" />
              <Text style={styles.addButtonText}>Ajouter un email</Text>
            </TouchableOpacity>

            {/* Affichage du coût */}
            {newRunnersCount > 0 && (
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentLabel}>
                  Coureurs gratuits restants : {freeSlotsRemaining}
                </Text>
                {extraRunners > 0 && (
                  <>
                    <Text style={styles.paymentLabel}>
                      Coureurs supplémentaires : {extraRunners}
                    </Text>
                    <Text style={styles.paymentAmount}>
                      Coût : {totalPayment.toFixed(2)}€
                    </Text>
                    {!paymentIntentId && (
                      <TouchableOpacity
                        onPress={handlePayment}
                        style={styles.payButton}
                        disabled={isProcessingPayment}
                      >
                        {isProcessingPayment ? (
                          <ActivityIndicator color="#000" />
                        ) : (
                          <>
                            <Icon name="credit-card" size={20} color="#000" />
                            <Text style={styles.payButtonText}>Payer {totalPayment.toFixed(2)}€</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                    {paymentIntentId && (
                      <View style={styles.paidBadge}>
                        <Icon name="check-circle" size={20} color="#A1F763" />
                        <Text style={styles.paidText}>Paiement effectué</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.submitButton, (loading || needsPayment) && styles.submitButtonDisabled]}
              disabled={loading || needsPayment}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.submitButtonText}>Envoyer les invitations</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </BlurView>
      </View>
    </Modal>
  );
};

const AddRunnersModal: React.FC<AddRunnersModalProps> = (props) => {
  const STRIPE_PUBLIC_KEY = process.env.EXPO_PUBLIC_STRIPE_KEY;

  if (!STRIPE_PUBLIC_KEY) {
    return null;
  }

  return (
    <StripeProvider publishableKey={STRIPE_PUBLIC_KEY}>
      <AddRunnersModalContent {...props} />
    </StripeProvider>
  );
};

export default AddRunnersModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "rgba(30, 30, 30, 0.95)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    padding: 20,
  },
  infoText: {
    color: "#A1F763",
    marginBottom: 20,
    fontSize: 14,
  },
  label: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  emailInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    marginRight: 10,
  },
  removeButton: {
    padding: 5,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  addButtonText: {
    color: "#A1F763",
    marginLeft: 8,
    fontSize: 14,
  },
  paymentInfo: {
    backgroundColor: "rgba(161, 247, 99, 0.1)",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  paymentLabel: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 5,
  },
  paymentAmount: {
    color: "#A1F763",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#A1F763",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  payButtonText: {
    color: "#000",
    fontWeight: "bold",
    marginLeft: 8,
  },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  paidText: {
    color: "#A1F763",
    marginLeft: 8,
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: "#A1F763",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: "rgba(161, 247, 99, 0.5)",
  },
  submitButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },
});
