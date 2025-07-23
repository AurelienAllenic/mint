import Map from "@/components/Map/Map";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { useAuth } from "../context/auth";

interface RaceDetails {
  id: number;
  name: string;
  start_date: string;
  distance: number;
  standard_distance?: {
    id: number;
    name: string;
    distance: string;
  };
  location?: string;
  date?: string;
  participants?: number;
  maxParticipants?: number;
  category?: string;
  description?: string;
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

  // Fonction pour gérer l'inscription à la course
  const handleJoinRace = async () => {
    if (!race?.id) return;

    try {
      // Ici vous pouvez ajouter la logique d'inscription à la course
      console.log(
        `Tentative d'inscription à la course ${race.id}: ${race.name}`
      );

      // Pour l'instant, on affiche juste une alerte
      alert(`Inscription demandée pour "${race.name}"`);
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error);
      alert("Erreur lors de l'inscription à la course");
    }
  };

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Fonction pour formater la distance
  const formatDistance = (distanceInMeters: number) => {
    if (distanceInMeters >= 1000) {
      return `${(distanceInMeters / 1000).toFixed(1)} km`;
    }
    return `${distanceInMeters} m`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A1F763" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header avec design identique à home */}
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

      {/* Informations de la course avec le style home */}
      <View style={styles.raceInfoContainer}>
        <BlurView style={styles.raceInfoBlur} intensity={40} tint="dark">
          <View style={styles.raceInfoContent}>
            <Text style={styles.raceName}>{race?.name}</Text>
            <View style={styles.raceDetails}>
              {/* Distance calculée depuis le tracé ou distance de l'API */}
              {(calculatedDistance > 0 || race?.distance) && (
                <View style={styles.detailItem}>
                  <Icon name="map-marker-distance" size={18} color="#A1F763" />
                  <Text style={styles.detailText}>
                    {calculatedDistance > 0
                      ? `${calculatedDistance.toFixed(2)} km`
                      : race?.distance
                      ? formatDistance(race.distance)
                      : "Distance inconnue"}
                  </Text>
                </View>
              )}

              {/* Date de début */}
              {race?.start_date && (
                <View style={styles.detailItem}>
                  <Icon name="calendar-start" size={18} color="#A1F763" />
                  <Text style={styles.detailText}>
                    {formatDate(race.start_date)}
                  </Text>
                </View>
              )}

              {/* Catégorie standard */}
              {race?.standard_distance && (
                <View style={styles.detailItem}>
                  <Icon name="trophy" size={18} color="#A1F763" />
                  <Text style={styles.detailText}>
                    {race.standard_distance.name}
                  </Text>
                </View>
              )}

              {/* Informations additionnelles si disponibles */}
              {race?.location && (
                <View style={styles.detailItem}>
                  <Icon name="map-marker" size={18} color="#A1F763" />
                  <Text style={styles.detailText}>{race.location}</Text>
                </View>
              )}

              {race?.positive_elevation && (
                <View style={styles.detailItem}>
                  <Icon name="trending-up" size={18} color="#A1F763" />
                  <Text style={styles.detailText}>
                    {race.positive_elevation}m D+
                  </Text>
                </View>
              )}
            </View>

            {race?.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionText}>{race.description}</Text>
              </View>
            )}
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

      {/* Boutons d'action avec le style home */}
      <View style={styles.container__btns}>
        <View style={styles.mainButtonsContainer}>
          <TouchableOpacity
            style={styles.joinButton}
            onPress={handleJoinRace}
            activeOpacity={0.8}
          >
            <BlurView style={styles.joinButtonBlur} intensity={40} tint="dark">
              <Text style={styles.joinButtonText}>REJOINDRE</Text>
            </BlurView>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mainButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.mainButtonText}>RETOUR</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.roundButton}>
            <BlurView style={styles.roundButtonBlur} intensity={40} tint="dark">
              <Icon name="share" size={28} color="#fff" />
            </BlurView>
          </TouchableOpacity>
          <TouchableOpacity style={styles.roundButton}>
            <BlurView style={styles.roundButtonBlur} intensity={40} tint="dark">
              <Icon name="heart-outline" size={28} color="#fff" />
            </BlurView>
          </TouchableOpacity>
          <TouchableOpacity style={styles.roundButton}>
            <BlurView style={styles.roundButtonBlur} intensity={40} tint="dark">
              <Icon name="information-outline" size={28} color="#fff" />
            </BlurView>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
    gap: 12,
  },
  detailText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
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
  container__btns: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 5,
  },
  mainButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 15,
  },
  joinButton: {
    backgroundColor: "rgba(105, 105, 105, 0.18)",
    borderRadius: 15,
    flex: 1,
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
    overflow: "hidden",
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
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  mainButton: {
    backgroundColor: "#A1F763",
    borderRadius: 15,
    flex: 1,
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
    overflow: "hidden",
  },
  mainButtonText: {
    color: "#3B3B3B",
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  bottomButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 0,
    marginBottom: 30,
    gap: 15,
  },
  roundButton: {
    backgroundColor: "rgba(105, 105, 105, 0.18)",
    borderRadius: 15,
    flex: 1,
    height: 55,
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
    overflow: "hidden",
  },
  roundButtonBlur: {
    borderRadius: 15,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  descriptionContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "rgba(161, 247, 99, 0.1)",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#A1F763",
  },
  descriptionText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  },
});
