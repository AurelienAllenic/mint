import { useAuth } from "@/context/auth"; // adapte le chemin si besoin
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Organization = {
  id: number;
  name: string;
};

const OrganizationsList = () => {
  const { token } = useAuth();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!token) {
        setError("Utilisateur non authentifié.");
        setLoading(false);
        return;
      }

      try {
        const API_URL = process.env.EXPO_PUBLIC_API_URL;
        if (!API_URL) throw new Error("API_URL non définie");

        const response = await fetch(`${API_URL}/organizations`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          throw new Error("Non autorisé : veuillez vous reconnecter.");
        }

        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        setOrganizations(data.organizations || data);
      } catch (err: any) {
        setError(err.message || "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [token]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Chargement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Erreur: {error}</Text>
      </View>
    );
  }

  if (organizations.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Aucune organisation trouvée.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Liste des organisations</Text>
      <FlatList
        data={organizations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <Text style={styles.item}>{item.name}</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  item: {
    fontSize: 16,
    marginBottom: 8,
  },
  error: {
    color: "red",
  },
});

export default OrganizationsList;
