import Map from "@/components/Map/Map";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { useAuth } from "../context/auth";

interface Race {
  id: string;
  name: string;
  distance?: number;
  location?: string;
  date?: string;
  participants?: number;
  maxParticipants?: number;
  category?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  createdBy?: string;
  route?: { latitude: number; longitude: number }[];
}

export default function RaceDetails() {
  const { raceId } = useLocalSearchParams<{ raceId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [race, setRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [raceRoute] = useState<
    { latitude: number; longitude: number }[] | null
  >(null);
  const [isParticipating, setIsParticipating] = useState(false);

  console.log("RaceDetails - raceId reçu:", raceId);

  useEffect(() => {
    const fetchRaceDetails = async () => {
      try {
        console.log("Début du chargement des détails pour raceId:", raceId);

        // Utilisons toujours les données factices pour l'instant
        const fakeRaces: { [key: string]: Race } = {
          "1": {
            id: "1",
            name: "Marathon de Paris",
            distance: 42.2,
            location: "Paris, France",
            date: "15 Avril 2025",
            participants: 2500,
            maxParticipants: 3000,
            category: "Marathon",
            description:
              "Un magnifique marathon à travers les rues historiques de Paris. Découvrez la capitale française sous un nouveau jour en courant le long de la Seine, passant par les monuments les plus emblématiques comme la Tour Eiffel, Notre-Dame et les Champs-Élysées.",
            startTime: "08:00",
            endTime: "14:00",
            createdBy: "Organisation Paris Running",
          },
          "2": {
            id: "2",
            name: "Trail du Mont Blanc",
            distance: 21.1,
            location: "Chamonix, France",
            date: "22 Juin 2025",
            participants: 150,
            maxParticipants: 200,
            category: "Trail",
            description:
              "Un trail exceptionnel dans les Alpes françaises avec des vues imprenables sur le Mont Blanc. Un défi pour les coureurs expérimentés qui souhaitent découvrir la beauté de la haute montagne.",
            startTime: "07:00",
            endTime: "12:00",
            createdBy: "Chamonix Trail Club",
          },
          "3": {
            id: "3",
            name: "Course Solidaire",
            distance: 10,
            location: "Lyon, France",
            date: "5 Mai 2025",
            participants: 45,
            maxParticipants: 100,
            category: "Course caritative",
            description:
              "Une course solidaire pour soutenir les associations locales. Tous les bénéfices seront reversés à des œuvres caritatives de la région lyonnaise.",
            startTime: "09:00",
            endTime: "11:00",
            createdBy: "Lyon Solidaire",
          },
          "4": {
            id: "4",
            name: "Semi-Marathon de Bordeaux",
            distance: 21.1,
            location: "Bordeaux, France",
            date: "12 Septembre 2025",
            participants: 800,
            maxParticipants: 1000,
            category: "Semi-Marathon",
            description:
              "Parcourez les plus beaux quartiers de Bordeaux et ses vignobles environnants. Une course qui allie sport et découverte du patrimoine viticole bordelais.",
            startTime: "08:30",
            endTime: "12:30",
            createdBy: "Bordeaux Running",
          },
          "5": {
            id: "5",
            name: "10km de Marseille",
            distance: 10,
            location: "Marseille, France",
            date: "3 Octobre 2025",
            participants: 300,
            maxParticipants: 500,
            category: "10km",
            description:
              "Un 10km le long de la côte méditerranéenne avec vue sur la mer. Départ du Vieux-Port et arrivée sur les plages du Prado.",
            startTime: "09:30",
            endTime: "11:30",
            createdBy: "Marseille Méditerranée",
          },
          "6": {
            id: "6",
            name: "Run For The Ocean",
            distance: 15,
            location: "Nice, France",
            date: "20 Août 2025",
            participants: 120,
            maxParticipants: 250,
            category: "Course écologique",
            description:
              "Une course engagée pour la protection des océans. Parcours le long de la Promenade des Anglais avec des actions de sensibilisation à l'environnement marin.",
            startTime: "08:00",
            endTime: "11:00",
            createdBy: "Ocean Protection Nice",
          },
        };

        const selectedRace = fakeRaces[raceId || "1"];
        console.log("Course sélectionnée:", selectedRace);

        if (selectedRace) {
          setRace(selectedRace);
          console.log("Course mise en état:", selectedRace.name);
        } else {
          console.log("Course non trouvée pour ID:", raceId);
          Alert.alert("Erreur", "Course non trouvée");
        }

        setLoading(false);
        console.log("Chargement terminé");
      } catch (error) {
        console.error("Erreur lors du chargement de la course:", error);
        Alert.alert("Erreur", "Une erreur est survenue");
        setLoading(false);
      }
    };

    fetchRaceDetails();
  }, [raceId]);

  const handleJoinRace = () => {
    if (isParticipating) {
      Alert.alert(
        "Quitter la course",
        "Êtes-vous sûr de vouloir quitter cette course ?",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Quitter",
            style: "destructive",
            onPress: () => {
              setIsParticipating(false);
              Alert.alert("Succès", "Vous avez quitté la course");
            },
          },
        ]
      );
    } else {
      Alert.alert(
        "Rejoindre la course",
        `Voulez-vous rejoindre "${race?.name}" ?`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Rejoindre",
            onPress: () => {
              setIsParticipating(true);
              Alert.alert("Succès", "Vous avez rejoint la course !");
            },
          },
        ]
      );
    }
  };

  const getRegionFromCoordinates = (
    coords: { latitude: number; longitude: number }[]
  ) => {
    if (!coords || coords.length === 0) return undefined;
    const latitudes = coords.map((c) => c.latitude);
    const longitudes = coords.map((c) => c.longitude);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.01, (maxLat - minLat) * 1.2),
      longitudeDelta: Math.max(0.01, (maxLng - minLng) * 1.2),
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A1F763" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!race) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Course non trouvée</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header avec informations de la course */}
      <View style={styles.headerContainer}>
        <BlurView style={styles.header} intensity={40} tint="dark">
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backIconButton}
              onPress={() => router.back()}
            >
              <Icon name="arrow-left" size={24} color="#A1F763" />
            </TouchableOpacity>
            <View style={styles.raceInfo}>
              <Text style={styles.raceName}>{race.name}</Text>
              <Text style={styles.raceCategory}>
                {race.category || "Course"}
              </Text>
            </View>
            <TouchableOpacity style={styles.shareButton}>
              <Icon name="share-variant" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>

      {/* Panneau d'informations flottant */}
      <View style={styles.infoPanel}>
        <BlurView style={styles.infoPanelBlur} intensity={40} tint="dark">
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Icon name="map-marker" size={20} color="#A1F763" />
                <Text style={styles.infoLabel}>Lieu</Text>
                <Text style={styles.infoValue}>
                  {race.location || "Non défini"}
                </Text>
              </View>

              <View style={styles.infoItem}>
                <Icon name="calendar" size={20} color="#A1F763" />
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>
                  {race.date || "Non définie"}
                </Text>
              </View>

              <View style={styles.infoItem}>
                <Icon name="directions" size={20} color="#A1F763" />
                <Text style={styles.infoLabel}>Distance</Text>
                <Text style={styles.infoValue}>
                  {race.distance ? `${race.distance} km` : "Non définie"}
                </Text>
              </View>

              <View style={styles.infoItem}>
                <Icon name="account-group" size={20} color="#A1F763" />
                <Text style={styles.infoLabel}>Participants</Text>
                <Text style={styles.infoValue}>
                  {race.participants && race.maxParticipants
                    ? `${race.participants}/${race.maxParticipants}`
                    : "Non défini"}
                </Text>
              </View>

              {race.startTime && (
                <View style={styles.infoItem}>
                  <Icon name="clock" size={20} color="#A1F763" />
                  <Text style={styles.infoLabel}>Heure</Text>
                  <Text style={styles.infoValue}>{race.startTime}</Text>
                </View>
              )}

              <View style={styles.infoItem}>
                <Icon name="trophy" size={20} color="#A1F763" />
                <Text style={styles.infoLabel}>Statut</Text>
                <Text style={styles.infoValue}>
                  {isParticipating ? "Inscrit" : "Non inscrit"}
                </Text>
              </View>
            </View>

            {race.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionTitle}>Description</Text>
                <Text style={styles.descriptionText}>{race.description}</Text>
              </View>
            )}

            <View style={styles.organizerContainer}>
              <Text style={styles.organizerTitle}>Organisateur</Text>
              <Text style={styles.organizerName}>
                {race.createdBy || "Organisation"}
              </Text>
            </View>
          </ScrollView>
        </BlurView>
      </View>

      {/* Boutons d'action */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.joinButton,
            isParticipating && styles.joinButtonActive,
          ]}
          onPress={handleJoinRace}
        >
          <BlurView style={styles.joinButtonBlur} intensity={40} tint="dark">
            <Text
              style={[
                styles.joinButtonText,
                isParticipating && styles.joinButtonTextActive,
              ]}
            >
              {isParticipating ? "QUITTER" : "REJOINDRE"}
            </Text>
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity style={styles.chatButton}>
          <BlurView style={styles.chatButtonBlur} intensity={40} tint="dark">
            <Icon name="message" size={24} color="#fff" />
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* Carte en arrière-plan */}
      <View style={styles.mapContainer}>
        <Map
          user={{ email: user?.email }}
          gpxCoordinates={raceRoute || []}
          region={raceRoute ? getRegionFromCoordinates(raceRoute) : undefined}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#181818",
  },
  loadingText: {
    color: "#A1F763",
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#181818",
  },
  errorText: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#A1F763",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#181818",
    fontWeight: "bold",
  },
  headerContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    borderRadius: 20,
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },
  header: {
    borderRadius: 20,
    backgroundColor: "rgba(105, 105, 105, 0.18)",
    overflow: "hidden",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  backIconButton: {
    padding: 8,
  },
  raceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  raceName: {
    color: "#A1F763",
    fontSize: 18,
    fontWeight: "bold",
  },
  raceCategory: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.8,
  },
  shareButton: {
    padding: 8,
  },
  infoPanel: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 120,
    maxHeight: 350,
    borderRadius: 20,
    zIndex: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },
  infoPanelBlur: {
    borderRadius: 20,
    backgroundColor: "rgba(105, 105, 105, 0.18)",
    overflow: "hidden",
  },
  scrollContainer: {
    maxHeight: 330,
  },
  scrollContent: {
    padding: 20,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  infoItem: {
    width: "48%",
    alignItems: "center",
    marginBottom: 16,
  },
  infoLabel: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  infoValue: {
    color: "#A1F763",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 2,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionTitle: {
    color: "#A1F763",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  descriptionText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  organizerContainer: {
    marginBottom: 10,
  },
  organizerTitle: {
    color: "#A1F763",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  organizerName: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.9,
  },
  actionButtons: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    gap: 12,
    zIndex: 5,
  },
  joinButton: {
    flex: 1,
    backgroundColor: "rgba(105, 105, 105, 0.18)",
    borderRadius: 15,
    height: 55,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },
  joinButtonActive: {
    backgroundColor: "rgba(161, 247, 99, 0.3)",
  },
  joinButtonBlur: {
    borderRadius: 15,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  joinButtonText: {
    color: "#A1F763",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  joinButtonTextActive: {
    color: "#FF4444",
  },
  chatButton: {
    backgroundColor: "rgba(105, 105, 105, 0.18)",
    borderRadius: 15,
    width: 55,
    height: 55,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },
  chatButtonBlur: {
    borderRadius: 15,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mapContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    zIndex: -1,
  },
});
