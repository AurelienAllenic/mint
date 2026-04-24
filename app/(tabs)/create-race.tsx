import CreateRace from "@/components/CreateRace/CreateRace";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/auth";

export default function CreateRacePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { gpxUri } = useLocalSearchParams<{ gpxUri?: string }>();

  // Si l'utilisateur n'est pas connecté ou est un visiteur, rediriger
  if (!user || user.isVisitor) {
    router.replace(user?.isVisitor ? "/visitor" : "/login");
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#A1F763" />
        <Text>Redirection...</Text>
      </View>
    );
  }

  // Si l'utilisateur est un coureur, il ne peut pas créer de course
  if (user.role === "coureur") {
    return (
      <View style={styles.restrictedContainer}>
        <Icon name="cancel" size={80} color="#FF6B6B" />
        <Text style={styles.restrictedTitle}>Accès refusé</Text>
        <Text style={styles.restrictedText}>
          Seuls les organisateurs peuvent créer des courses. Votre compte
          coureur ne vous permet pas d'accéder à cette fonctionnalité.
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

  return <CreateRace user={user} initialGpxUri={gpxUri} />;
}

const styles = StyleSheet.create({
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
