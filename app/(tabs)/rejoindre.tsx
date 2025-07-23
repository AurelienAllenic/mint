import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { BlurView } from "expo-blur";
import { useAuth } from "../../context/auth";

interface Race {
  id: string;
  name: string;
  distance?: number;
  location?: string;
  date?: string;
  participants?: number;
  maxParticipants?: number;
  category?: string;
}

export default function RejoindreScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mesRaces, setMesRaces] = useState<Race[]>([]);
  const [racesProches, setRacesProches] = useState<Race[]>([]);
  const [racesSponsos, setRacesSponsos] = useState<Race[]>([]);

  // Simulation de données pour l'exemple
  useEffect(() => {
    const fetchRaces = async () => {
      setLoading(true);
      try {
        const API_URL = process.env.EXPO_PUBLIC_API_URL;
        if (!API_URL) return;

        const authHeader = token?.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;

        // Récupérer toutes les courses
        const response = await fetch(`${API_URL}/races`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            // Pour l'exemple, on catégorise les courses
            setMesRaces(data.slice(0, 3)); // Premières 3 courses comme "mes courses"
            setRacesProches(data.slice(3, 8)); // Suivantes comme "proches"
            setRacesSponsos(data.slice(8)); // Reste comme "sponsos"
          }
        } else {
          // Données factices pour la démonstration avec plus d'informations
          const fakeData: Race[] = [
            {
              id: "1",
              name: "Marathon de Paris",
              distance: 42.2,
              location: "Paris, France",
              date: "15 Avril 2025",
              participants: 2500,
              maxParticipants: 3000,
              category: "Marathon",
            },
            {
              id: "2",
              name: "Trail du Mont Blanc",
              distance: 21.1,
              location: "Chamonix, France",
              date: "22 Juin 2025",
              participants: 150,
              maxParticipants: 200,
              category: "Trail",
            },
            {
              id: "3",
              name: "Course Solidaire",
              distance: 10,
              location: "Lyon, France",
              date: "5 Mai 2025",
              participants: 45,
              maxParticipants: 100,
              category: "Course caritative",
            },
            {
              id: "4",
              name: "Semi-Marathon de Bordeaux",
              distance: 21.1,
              location: "Bordeaux, France",
              date: "12 Septembre 2025",
              participants: 800,
              maxParticipants: 1000,
              category: "Semi-Marathon",
            },
            {
              id: "5",
              name: "10km de Marseille",
              distance: 10,
              location: "Marseille, France",
              date: "3 Octobre 2025",
              participants: 300,
              maxParticipants: 500,
              category: "10km",
            },
            {
              id: "6",
              name: "Run For The Ocean",
              distance: 15,
              location: "Nice, France",
              date: "20 Août 2025",
              participants: 120,
              maxParticipants: 250,
              category: "Course écologique",
            },
          ];

          setMesRaces(fakeData.slice(0, 2)); // Marathon de Paris + Trail du Mont Blanc
          setRacesProches(fakeData.slice(2, 5)); // Course Solidaire + Semi-Marathon + 10km
          setRacesSponsos(fakeData.slice(5)); // Run For The Ocean
        }
      } catch (error) {
        console.error("Erreur lors du chargement des courses:", error);
        Alert.alert("Erreur", "Impossible de charger les courses");
      } finally {
        setLoading(false);
      }
    };

    fetchRaces();
  }, [token]);

  const RaceCard = ({ race }: { race: Race }) => (
    <TouchableOpacity
      style={styles.raceCard}
      onPress={() => {
        // Navigation vers les détails de la course
        router.push({
          pathname: "/RaceDetails",
          params: { raceId: race.id },
        });
      }}
    >
      <BlurView style={styles.raceCardBlur} intensity={20} tint="dark">
        <View style={styles.raceCardContent}>
          <View style={styles.raceHeader}>
            <Text style={styles.raceName}>{race.name}</Text>
            <Icon name="chevron-right" size={24} color="#A1F763" />
          </View>
          <View style={styles.raceInfo}>
            {race.distance && (
              <Text style={styles.raceDetail}>📍 {race.distance} km</Text>
            )}
            {race.location && (
              <Text style={styles.raceDetail}>🌍 {race.location}</Text>
            )}
            {race.participants && race.maxParticipants && (
              <Text style={styles.raceDetail}>
                👥 {race.participants}/{race.maxParticipants}
              </Text>
            )}
            {race.date && <Text style={styles.raceDetail}>📅 {race.date}</Text>}
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const CategorySection = ({
    title,
    races,
    icon,
  }: {
    title: string;
    races: Race[];
    icon: string;
  }) => (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Icon name={icon as any} size={24} color="#A1F763" />
        <Text style={styles.categoryTitle}>{title}</Text>
      </View>
      {races.length === 0 ? (
        <Text style={styles.emptyText}>Aucune course disponible</Text>
      ) : (
        races.map((race) => <RaceCard key={race.id} race={race} />)
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rejoindre une course</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A1F763" />
          <Text style={styles.loadingText}>Chargement des courses...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <CategorySection
            title="Mes courses"
            races={mesRaces}
            icon="account-check"
          />

          <CategorySection
            title="Autour de vous"
            races={racesProches}
            icon="map-marker-radius"
          />

          <CategorySection
            title="Les sponsos"
            races={racesSponsos}
            icon="star"
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#181818",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#A1F763",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#A1F763",
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 12,
  },
  emptyText: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
    padding: 20,
    fontStyle: "italic",
  },
  raceCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 3,
  },
  raceCardBlur: {
    backgroundColor: "rgba(105, 105, 105, 0.18)",
  },
  raceCardContent: {
    padding: 16,
  },
  raceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  raceName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#A1F763",
    flex: 1,
  },
  raceInfo: {
    gap: 4,
  },
  raceDetail: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.8,
  },
});
