import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/auth";

export default function VisitorScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const handleSubmit = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      Alert.alert("Code requis", "Veuillez entrer un code d'accès.");
      return;
    }

    setLoading(true);
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      if (!API_URL) {
        Alert.alert("Erreur", "Configuration manquante.");
        return;
      }

      const response = await fetch(`${API_URL}/visitor/code/${trimmed}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        const raceId = data.race?._id;
        if (!raceId) {
          Alert.alert("Erreur", "Course introuvable pour ce code.");
          return;
        }
        router.push({ pathname: "/RaceDetails", params: { raceId } });
      } else if (response.status === 404) {
        Alert.alert("Code invalide", "Ce code n'existe pas ou a expiré.");
      } else {
        Alert.alert("Erreur", "Impossible de vérifier le code.");
      }
    } catch {
      Alert.alert("Erreur", "Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcome}>Mode Visiteur</Text>
            <Text style={styles.username}>Accéder à une course</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout" size={20} color="#fff" />
            <Text style={styles.logoutText}>Quitter</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Icon name="ticket-outline" size={48} color="#A1F763" style={styles.icon} />
          <Text style={styles.title}>Code d'accès</Text>
          <Text style={styles.subtitle}>
            Entrez le code partagé par un participant pour accéder à une course en direct.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Ex : a3f9bc12"
            placeholderTextColor="#555"
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>ACCÉDER</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  header: {
    backgroundColor: "#1E1E1E",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(161, 247, 99, 0.2)",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcome: {
    color: "#A1F763",
    fontSize: 16,
    fontWeight: "600",
  },
  username: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(161, 247, 99, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  logoutText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#1E1E1E",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(161, 247, 99, 0.15)",
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  input: {
    width: "100%",
    backgroundColor: "#2A2A2A",
    color: "#fff",
    fontSize: 18,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(161, 247, 99, 0.3)",
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 20,
  },
  button: {
    width: "100%",
    backgroundColor: "#A1F763",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 1,
  },
});
