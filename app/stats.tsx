import { useAuth } from "@/context/auth";
import Constants from "expo-constants";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { profileStyles } from "../style/profile.styles";
// Note: expo-ads-admob requires native support (not available in Expo Go).
// Avoid rendering the native AdMob component in development to prevent
// `Value is undefined, expected an Object` Hermes errors when the native
// module isn't available. Use a placeholder in dev instead.

export default function StatsPage() {
  const [AdMobBannerComp, setAdMobBannerComp] = useState<any | null>(null);

  useEffect(() => {
    // Ne pas tenter d'importer AdMob dans Expo Go (appOwnership === 'expo')
    // car le module natif n'est pas inclus.
    if (Constants.appOwnership === "expo") return;

    let mounted = true;
    (async () => {
      try {
        const mod = await import("expo-ads-admob");
        if (mounted && mod?.AdMobBanner) {
          setAdMobBannerComp(() => mod.AdMobBanner);
        }
      } catch (e) {
        console.warn("expo-ads-admob unavailable:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);


  const router = useRouter();
  const [isPremium, setIsPremium] = useState(false);
  const { token } = useAuth();
  const API_URL = process.env.EXPO_PUBLIC_API_URL!;

  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (!token || !API_URL) return;
      try {
        const authHeader = token.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;

        const response = await fetch(`${API_URL}/users/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("Statut premium de l'utilisateur ! :", data.isPremium);
          if (data.isPremium) {
            setIsPremium(true);
          }
        }
      } catch (error) {
        console.error(
          "Erreur lors de la vérification du statut premium :",
          error
        );
      }
    };

    checkPremiumStatus();
  }, [token]);

  return (
    <View style={profileStyles.container}>
      <View style={profileStyles.header}>
        <TouchableOpacity
          style={profileStyles.backButton}
          onPress={() => router.push("/")}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={profileStyles.headerTitle}>Statistiques</Text>
        <View style={{ width: 40 }} />
      </View>

      {isPremium ? (
        <View style={styles.pageContainer}>
          <Text style={{ color: "#fff", fontSize: 18 }}>
            Statistiques avancées à venir bientôt !
          </Text>
        </View>
      ) : (
        <View style={styles.pageContainer}>
          <View style={styles.banner}>
            <Icon name="crown" size={28} color="#fff" />
            <Text style={styles.bannerText}>
              Vous souhaitez accèder à des statistiques plus avancées ?
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.button}
              onPress={() => router.push("/premium")}
            >
              <Text style={styles.buttonText}>S'abonner à premium</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: "#0f1112",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
    marginBottom: 8,
  },
  headerLeft: {
    padding: 8,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
  },
  banner: {
    width: "100%",
    backgroundColor: "#D4AF37",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  bannerText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 16,
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#B8860B",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
});
