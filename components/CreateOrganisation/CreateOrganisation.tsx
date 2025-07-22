import { useAuth } from "@/context/auth"; // adapte le chemin si besoin
import React, { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

const CreateOrganisation: React.FC = () => {
  const { user, token } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  console.log(token, "token");

  const createOrganisation = async () => {
    if (!orgName.trim()) {
      setError("Le nom de l'organisation est requis.");
      return;
    }

    if (!token) {
      setError("Utilisateur non authentifié.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      if (!API_URL) {
        throw new Error("API_URL non défini dans .env");
      }

      const response = await fetch(`${API_URL}/organization`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: orgName.trim(),
          createdBy: user?.email, // si nécessaire
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Erreur inconnue lors de la création"
        );
      }

      setSuccessMessage("Organisation créée avec succès !");
      setOrgName("");
    } catch (err: any) {
      console.error("Erreur création organisation:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Créer une organisation</Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {successMessage && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="Nom de l'organisation"
        value={orgName}
        onChangeText={setOrgName}
        editable={!loading}
      />

      <Button
        title={loading ? "Création en cours..." : "Créer l'organisation"}
        onPress={createOrganisation}
        disabled={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#888",
    borderRadius: 4,
    padding: 10,
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  errorBox: {
    backgroundColor: "#ffe6e6",
    padding: 10,
    marginBottom: 10,
    borderRadius: 4,
    borderColor: "#ff4d4d",
    borderWidth: 1,
  },
  errorText: {
    color: "#b00000",
  },
  successBox: {
    backgroundColor: "#e6ffec",
    padding: 10,
    marginBottom: 10,
    borderRadius: 4,
    borderColor: "#4CAF50",
    borderWidth: 1,
  },
  successText: {
    color: "#2e7d32",
  },
});

export default CreateOrganisation;
