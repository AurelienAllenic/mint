import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/auth";

export default function PremiumPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.EXPO_PUBLIC_API_URL!;
  const STRIPE_PUBLIC_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLIC_KEY!;

  const handleSubscribe = async () => {
    if (!token) {
      Alert.alert("Erreur", "Vous devez être connecté.");
      return;
    }

    setLoading(true);

    try {
      const authHeader = token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;

      // 1. Appel backend
      const response = await fetch(`${API_URL}/race/create-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Erreur serveur");
      }

      const { setupIntentClientSecret } = await response.json();

      // 2. Initialiser PaymentSheet avec setupIntent
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Ton App de Courses",
        setupIntentClientSecret, // ← CLÉ ICI
        allowsDelayedPaymentMethods: true,
      });

      if (initError) {
        throw new Error(`Init échouée: ${initError.message}`);
      }

      // 3. Ouvrir la feuille
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === "Canceled") {
          Alert.alert("Annulé", "L'abonnement a été annulé.");
        } else {
          throw new Error(`Validation échouée: ${presentError.message}`);
        }
        return;
      }

      // SUCCÈS
      Alert.alert(
        "Succès",
        "Abonnement Premium activé ! Premier débit dans 1 mois.",
        [{ text: "Super !", onPress: () => router.replace("/") }]
      );
    } catch (err: any) {
      console.error("Erreur abonnement :", err);
      Alert.alert("Erreur", err.message || "Impossible de s'abonner.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <StripeProvider publishableKey={STRIPE_PUBLIC_KEY}>
      <View style={styles.container}>
        <Image
          source={require("@/assets/images/radial-gradient.png")}
          style={styles.radialGradient}
          resizeMode="cover"
        />

        <View style={styles.headerContainer}>
          <BlurView style={styles.header} intensity={40} tint="dark">
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.title}>Abonnements</Text>
                <Text style={styles.subtitle}>
                  Choisissez l'abonnement qui vous correspond {"\n"}le mieux.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.replace("/")}
                style={styles.closeBtn}
              >
                <Icon name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>

        <View style={styles.body}>
          {/* PLAN BASIQUE */}
          <TouchableOpacity style={[styles.planButton, styles.planGhost]}>
            <BlurView intensity={40} tint="dark" style={styles.planBlur}>
              <View style={styles.planTop}>
                <Text style={styles.planTitle}>Basique</Text>
                <Text style={styles.planPrice}>Gratuit</Text>
              </View>
              <View style={styles.planFeatures}>
                <View style={styles.featureRow}>
                  <Icon name="check" size={16} color="#fff" />
                  <Text style={styles.featureText}> Statistiques basiques</Text>
                </View>
                <View style={styles.featureRow}>
                  <Icon name="check" size={16} color="#fff" />
                  <Text style={styles.featureText}>
                    {" "}
                    Historique jusqu'à 1 an
                  </Text>
                </View>
                <View style={styles.featureRow}>
                  <Icon name="check" size={16} color="#fff" />
                  <Text style={styles.featureText}>
                    {" "}
                    Bannières publicitaires
                  </Text>
                </View>
              </View>
              <View style={styles.planCtaRow}>
                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={() => router.replace("/")}
                >
                  <Text style={styles.ctaButtonText}>Plan actuel</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </TouchableOpacity>

          {/* PLAN PREMIUM */}
          <TouchableOpacity style={[styles.planButton, styles.planPrimary]}>
            <View style={styles.planPrimaryContent}>
              <View style={styles.planTop}>
                <Text style={styles.planTitlePrimary}>Premium</Text>
                <Text style={styles.planPricePrimary}>4,99 €/mois</Text>
              </View>
              <View style={styles.planFeatures}>
                <View style={styles.featureRow}>
                  <Icon name="check" size={16} color="#A1F763" />
                  <Text style={styles.featureTextPrimary}>
                    {" "}
                    Statistiques avancées
                  </Text>
                </View>
                <View style={styles.featureRow}>
                  <Icon name="check" size={16} color="#A1F763" />
                  <Text style={styles.featureTextPrimary}>
                    {" "}
                    Historique complet jusqu'à la création du compte
                  </Text>
                </View>
                <View style={styles.featureRow}>
                  <Icon name="check" size={16} color="#A1F763" />
                  <Text style={styles.featureTextPrimary}>
                    {" "}
                    Comparaison des statistiques avec d'autres coureurs
                  </Text>
                </View>
                <View style={styles.featureRow}>
                  <Icon name="check" size={16} color="#A1F763" />
                  <Text style={styles.featureTextPrimary}>
                    {" "}
                    Zéro publicités
                  </Text>
                </View>
              </View>
              <View style={styles.planCtaRow}>
                <TouchableOpacity
                  style={[
                    styles.ctaButton,
                    styles.ctaButtonPrimary,
                    loading && styles.ctaButtonDisabled,
                  ]}
                  onPress={handleSubscribe}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#3B3B3B" />
                  ) : (
                    <Text
                      style={[
                        styles.ctaButtonText,
                        styles.ctaButtonTextPrimary,
                      ]}
                    >
                      S'abonner
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1112",
    position: "relative",
  },
  radialGradient: {
    position: "absolute",
    top: "30%",
    left: "-15%",
    width: "130%",
    height: "130%",
    opacity: 0.9,
    zIndex: 0,
    pointerEvents: "none",
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 60,
    zIndex: 10,
  },
  header: {
    borderRadius: 20,
    backgroundColor: "rgba(20,20,20,0.35)",
    overflow: "hidden",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  title: {
    color: "#A1F763",
    fontSize: 34,
    fontWeight: "900",
  },
  subtitle: {
    color: "#fff",
    fontSize: 16,
    marginTop: 6,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: 20,
    paddingTop: 40,
    zIndex: 5,
  },
  planButton: {
    borderRadius: 16,
    marginBottom: 18,
    overflow: "hidden",
  },
  planBlur: {
    padding: 18,
  },
  planGhost: {
    backgroundColor: "transparent",
  },
  planPrimary: {
    backgroundColor: "#232323",
  },
  planPrimaryContent: {
    padding: 18,
  },
  planTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  planTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  planTitlePrimary: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
  },
  planPrice: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  planPricePrimary: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  planFeatures: {
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  featureText: {
    color: "#fff",
    opacity: 0.95,
    fontSize: 16,
  },
  featureTextPrimary: {
    color: "#fff",
    fontSize: 16,
  },
  planCtaRow: {
    alignItems: "stretch",
    marginTop: 4,
  },
  planCtaTextGhost: {
    color: "#A1F763",
    fontWeight: "900",
    fontSize: 16,
  },
  planCtaTextPrimary: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  /* CTA button styles */
  ctaButton: {
    backgroundColor: "#d4d4d4",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
  },
  ctaButtonText: {
    color: "#3B3B3B",
    fontWeight: "900",
    fontSize: 18,
  },
  ctaButtonPrimary: {
    backgroundColor: "#A1F763",
  },
  ctaButtonTextPrimary: {
    color: "#3B3B3B",
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
});
