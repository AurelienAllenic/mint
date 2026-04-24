import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/auth";

interface Race {
  _id: string;
  name: string;
  date: string;
  location: string;
  distance?: number;
  status?: string;
}

export default function MyRacesPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;

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

  // Si l'utilisateur est un organisateur, il ne peut pas voir ses courses inscrites
  if (user.role === "organisateur") {
    return (
      <View style={styles.restrictedContainer}>
        <Icon name="cancel" size={80} color="#FF6B6B" />
        <Text style={styles.restrictedTitle}>Accès refusé</Text>
        <Text style={styles.restrictedText}>
          Cette page est réservée aux coureurs. Les organisateurs peuvent gérer
          leurs courses depuis la section de création de courses.
        </Text>
        <TouchableOpacity
          style={styles.backButtonRestricted}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fetchMyRaces = async () => {
    if (!token || !API_URL) return;

    try {
      const authHeader = token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;

      // Récupérer les invitations en attente : ne pas afficher ces courses dans "Mes courses"
      let pendingRaceIds: string[] = [];
      try {
        const invRes = await fetch(`${API_URL}/invitations/my-invitations`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });
        if (invRes.ok) {
          const invData = await invRes.json();
          const invitations = invData.invitations || [];
          // L'API my-invitations ne renvoie que des invitations pending ; pas de champ status dans la réponse
          pendingRaceIds = invitations
            .map((inv: any) => String(inv.race?._id ?? inv.race ?? inv.raceId?._id ?? inv.raceId ?? ""))
            .filter(Boolean);
        }
      } catch (_) {
        // ignorer si les invitations ne sont pas dispo
      }

      const response = await fetch(`${API_URL}/race/my-races`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const allRaces: Race[] = data.races || [];
        const filtered = allRaces.filter(
          (race) => !pendingRaceIds.includes(String(race._id))
        );
        setRaces(filtered);
      } else {
        console.error("Erreur lors de la récupération des courses");
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyRaces();
  }, []);

  useEffect(() => {
    fetchMyRaces();
  }, []);

  const handleRacePress = (raceId: string) => {
    router.push(`/RaceDetails?raceId=${raceId}`);
  };

  const renderRaceItem = ({ item }: { item: Race }) => (
    <TouchableOpacity
      style={styles.raceCard}
      onPress={() => handleRacePress(item._id)}
    >
      <View style={styles.raceHeader}>
        <Text style={styles.raceName}>{item.name}</Text>
        {item.status && (
          <View
            style={[
              styles.statusBadge,
              item.status === "upcoming" && styles.statusUpcoming,
              item.status === "completed" && styles.statusCompleted,
            ]}
          >
            <Text style={styles.statusText}>
              {item.status === "upcoming" ? "À venir" : "Terminée"}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.raceInfo}>
        <View style={styles.infoRow}>
          <Icon name="calendar" size={18} color="#A1F763" />
          <Text style={styles.infoText}>
            {new Date(item.date).toLocaleDateString("fr-FR")}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="map-marker" size={18} color="#A1F763" />
          <Text style={styles.infoText}>{item.location}</Text>
        </View>
        {item.distance && (
          <View style={styles.infoRow}>
            <Icon name="run" size={18} color="#A1F763" />
            <Text style={styles.infoText}>{item.distance} km</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A1F763" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/")}
      >
        <Icon name="arrow-left" size={24} color="#fff" />
      </TouchableOpacity>
      <View style={styles.header}>
        <Text style={styles.title}>Mes Courses</Text>
        <Text style={styles.subtitle}>
          Les courses auxquelles vous êtes inscrit
        </Text>
      </View>

      {races.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="run-fast" size={80} color="#A1F763" />
          <Text style={styles.emptyTitle}>Aucune course inscrite</Text>
          <Text style={styles.emptyText}>
            Explorez les courses disponibles et inscrivez-vous pour commencer !
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => router.push("/(tabs)/explore")}
          >
            <Text style={styles.exploreButtonText}>Explorer les courses</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={races}
          renderItem={renderRaceItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#A1F763"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#222",
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    backgroundColor: "#2C2C2C",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  header: {
    padding: 20,
    paddingTop: 115,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: "#fff",
    fontSize: 16,
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
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
  backButtonRestricted: {
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
  listContainer: {
    padding: 20,
  },
  raceCard: {
    backgroundColor: "#2C2C2C",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  raceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  raceName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10,
  },
  statusUpcoming: {
    backgroundColor: "#A1F763",
  },
  statusCompleted: {
    backgroundColor: "#6B7280",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  raceInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.9,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
    marginBottom: 30,
  },
  exploreButton: {
    backgroundColor: "#A1F763",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: "#3B3B3B",
    fontWeight: "900",
    fontSize: 16,
  },
});
