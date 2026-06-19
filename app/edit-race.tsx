import CreateRace from "@/components/CreateRace/CreateRace";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/auth";

export default function EditRacePage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const { raceId } = useLocalSearchParams<{ raceId?: string }>();

  const [race, setRace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRace = async () => {
      if (!raceId) {
        setError("Course introuvable.");
        setLoading(false);
        return;
      }
      try {
        const API_URL =
          process.env.EXPO_PUBLIC_API_URL ||
          "https://back-mint-node.vercel.app";
        const res = await fetch(`${API_URL}/race/${raceId}`);
        if (!res.ok) {
          throw new Error("Impossible de charger la course.");
        }
        const data = await res.json();
        setRace(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    };
    fetchRace();
  }, [raceId]);

  // Non connecté / visiteur
  if (!user || user.isVisitor) {
    router.replace(user?.isVisitor ? "/visitor" : "/login");
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#A1F763" />
        <Text style={styles.infoText}>Redirection...</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#A1F763" />
        <Text style={styles.infoText}>Chargement de la course...</Text>
      </View>
    );
  }

  // Seul le propriétaire de la course peut la modifier
  const ownerId = race?.owner?._id || race?.owner?.id || race?.owner;
  const userId = user._id || user.id;
  const isOwner = race && String(ownerId) === String(userId);

  if (error || !race || !isOwner) {
    return (
      <View style={styles.restrictedContainer}>
        <Icon name="cancel" size={80} color="#FF6B6B" />
        <Text style={styles.restrictedTitle}>Accès refusé</Text>
        <Text style={styles.restrictedText}>
          {error
            ? error
            : "Seul l'organisateur qui a créé cette course peut la modifier."}
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <CreateRace user={user} editRace={race} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: "#181818",
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: {
    color: "#A1F763",
    fontSize: 16,
    marginTop: 16,
  },
  restrictedContainer: {
    flex: 1,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  restrictedTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 20,
    marginBottom: 10,
  },
  restrictedText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    opacity: 0.8,
  },
  backButton: {
    backgroundColor: "#A1F763",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  backButtonText: {
    color: "#3B3B3B",
    fontWeight: "900",
    fontSize: 16,
  },
});
