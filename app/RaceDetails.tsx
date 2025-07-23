import Map from "@/components/Map/Map";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { useAuth } from "../context/auth";

interface RaceDetails {
  id: string;
  name: string;
  distance?: number;
  location?: string;
  date?: string;
  participants?: number;
  maxParticipants?: number;
  category?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  positive_elevation?: number;
}

interface TrackData {
  type: string;
  coordinates: [number, number, number?][];
}

export default function RaceDetailsScreen() {
  const { raceId } = useLocalSearchParams<{ raceId: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [race, setRace] = useState<RaceDetails | null>(null);
  const [trackCoordinates, setTrackCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRaceData = async () => {
      if (!raceId) return;

      setLoading(true);
      try {
        const API_URL =
          process.env.EXPO_PUBLIC_API_URL ||
          "http://mint-dev.charles-chrismann.fr/api";
        const authHeader = token?.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;

        // Récupérer les informations de la course
        const raceResponse = await fetch(`${API_URL}/races/${raceId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });

        if (raceResponse.ok) {
          const raceData = await raceResponse.json();
          setRace(raceData);
        } else {
          throw new Error("Impossible de récupérer les données de la course");
        }

        // Récupérer le tracé de la course
        const trackResponse = await fetch(`${API_URL}/races/${raceId}/track`, {
          method: "GET",
          headers: {
            Authorization: authHeader,
          },
        });

        if (trackResponse.ok) {
          const trackData: TrackData = await trackResponse.json();

          if (
            trackData.type === "LineString" &&
            Array.isArray(trackData.coordinates)
          ) {
            const coordinates = trackData.coordinates.map(
              (coord: [number, number, number?]) => ({
                latitude: coord[1],
                longitude: coord[0],
              })
            );

            // Optimisation ultra-agressive pour les performances
            let optimizedCoords = coordinates;

            if (coordinates.length > 20) {
              // Stratégie en 3 étapes :
              // 1. On garde toujours début et fin
              // 2. On prend quelques points clés au milieu (max 15 points intermédiaires)
              // 3. Le composant Map fera le rendu vectoriel

              const maxPoints = 15;
              const step = Math.max(
                1,
                Math.floor((coordinates.length - 2) / maxPoints)
              );

              optimizedCoords = [
                coordinates[0], // Premier point obligatoire
                ...coordinates.slice(1, -1).filter((_, i) => i % step === 0),
                coordinates[coordinates.length - 1], // Dernier point obligatoire
              ];

              // S'assurer qu'on ne dépasse jamais 20 points au total
              if (optimizedCoords.length > 20) {
                const newStep = Math.ceil(optimizedCoords.length / 18);
                optimizedCoords = [
                  optimizedCoords[0],
                  ...optimizedCoords
                    .slice(1, -1)
                    .filter((_, i) => i % newStep === 0),
                  optimizedCoords[optimizedCoords.length - 1],
                ];
              }
            }

            console.log(
              `Tracé optimisé: ${coordinates.length} → ${optimizedCoords.length} points`
            );
            setTrackCoordinates(optimizedCoords);
          }
        } else {
          console.warn("Impossible de récupérer le tracé de la course");
        }
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
        setError("Impossible de charger les données de la course");
      } finally {
        setLoading(false);
      }
    };

    fetchRaceData();
  }, [raceId, token]);

  // Calculer la région pour centrer la carte sur le tracé (mémorisé)
  const mapRegion = useMemo(() => {
    if (!trackCoordinates || trackCoordinates.length === 0) return undefined;

    const latitudes = trackCoordinates.map((c) => c.latitude);
    const longitudes = trackCoordinates.map((c) => c.longitude);
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
  }, [trackCoordinates]);

  // Calculer la distance du tracé (mémorisé)
  const calculatedDistance = useMemo(() => {
    if (!trackCoordinates || trackCoordinates.length < 2) return 0;

    let total = 0;
    for (let i = 1; i < trackCoordinates.length; i++) {
      const prev = trackCoordinates[i - 1];
      const curr = trackCoordinates[i];
      const R = 6371; // Rayon de la Terre en km
      const dLat = ((curr.latitude - prev.latitude) * Math.PI) / 180;
      const dLon = ((curr.longitude - prev.longitude) * Math.PI) / 180;
      const lat1 = (prev.latitude * Math.PI) / 180;
      const lat2 = (curr.latitude * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) *
          Math.sin(dLon / 2) *
          Math.cos(lat1) *
          Math.cos(lat2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      total += R * c;
    }
    return total;
  }, [trackCoordinates]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A1F763" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
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
    <SafeAreaView style={styles.container}>
      {/* Header avec design similaire à home */}
      <View style={styles.headerContainer}>
        <BlurView style={styles.header} intensity={40} tint="dark">
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButtonHeader}
              onPress={() => router.back()}
            >
              <Icon name="arrow-left" size={24} color="#A1F763" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>
                {race?.name || "Détails de la course"}
              </Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>
        </BlurView>
      </View>

      {/* Informations de la course */}
      <View style={styles.raceInfoContainer}>
        <BlurView style={styles.raceInfoBlur} intensity={20} tint="dark">
          <View style={styles.raceInfoContent}>
            <Text style={styles.raceName}>{race?.name}</Text>
            <View style={styles.raceDetails}>
              {calculatedDistance > 0 && (
                <View style={styles.detailItem}>
                  <Icon name="map-marker-distance" size={16} color="#A1F763" />
                  <Text style={styles.detailText}>
                    {calculatedDistance.toFixed(2)} km
                  </Text>
                </View>
              )}
              {race?.location && (
                <View style={styles.detailItem}>
                  <Icon name="map-marker" size={16} color="#A1F763" />
                  <Text style={styles.detailText}>{race.location}</Text>
                </View>
              )}
              {race?.date && (
                <View style={styles.detailItem}>
                  <Icon name="calendar" size={16} color="#A1F763" />
                  <Text style={styles.detailText}>{race.date}</Text>
                </View>
              )}
              {race?.participants && race?.maxParticipants && (
                <View style={styles.detailItem}>
                  <Icon name="account-group" size={16} color="#A1F763" />
                  <Text style={styles.detailText}>
                    {race.participants}/{race.maxParticipants} participants
                  </Text>
                </View>
              )}
              {race?.positive_elevation && (
                <View style={styles.detailItem}>
                  <Icon name="trending-up" size={16} color="#A1F763" />
                  <Text style={styles.detailText}>
                    {race.positive_elevation}m D+
                  </Text>
                </View>
              )}
              {race?.category && (
                <View style={styles.detailItem}>
                  <Icon name="tag" size={16} color="#A1F763" />
                  <Text style={styles.detailText}>{race.category}</Text>
                </View>
              )}
            </View>
          </View>
        </BlurView>
      </View>

      {/* Carte avec le même style que home */}
      <View style={styles.mapContainer}>
        <Map
          user={{ email: user?.email }}
          gpxCoordinates={trackCoordinates}
          region={mapRegion}
        />
        <Image
          source={require("@/assets/images/radial-gradient.png")}
          style={styles.radialGradient}
          resizeMode="cover"
        />
      </View>

      {/* Bouton d'action */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.joinButton}>
          <Text style={styles.joinButtonText}>REJOINDRE</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    position: "relative",
    margin: 0,
    padding: 0,
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
    padding: 20,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#A1F763",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: "#181818",
    fontSize: 16,
    fontWeight: "600",
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
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  backButtonHeader: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#A1F763",
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  raceInfoContainer: {
    position: "absolute",
    top: 140,
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
  raceInfoBlur: {
    borderRadius: 20,
    backgroundColor: "rgba(105, 105, 105, 0.18)",
    overflow: "hidden",
  },
  raceInfoContent: {
    padding: 20,
  },
  raceName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#A1F763",
    marginBottom: 16,
    textAlign: "center",
  },
  raceDetails: {
    gap: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    color: "#fff",
    fontSize: 16,
    opacity: 0.9,
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
  radialGradient: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "130%",
    height: "130%",
    transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
    zIndex: 1,
    pointerEvents: "none",
  },
  actionContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 5,
  },
  joinButton: {
    backgroundColor: "#A1F763",
    borderRadius: 15,
    height: 85,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
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
    color: "#3B3B3B",
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
