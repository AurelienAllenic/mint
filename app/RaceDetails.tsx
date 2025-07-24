import Map from "@/components/Map/Map";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
} from "react-native";
import { useAuth } from "../context/auth";

interface RaceDetails {
  _id: string;
  id?: string;
  name: string;
  startDate: string;
  endDate?: string;
  organization?: {
    _id: string;
    name: string;
  };
  runners?: any[];
  gpxFile?: string;
  owner?: any;
  // Champs pour compatibilité avec l'ancien format
  start_date?: string;
  distance?: number;
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
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showRaceInfo, setShowRaceInfo] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mettre à jour l'heure actuelle chaque seconde pour le compte à rebours
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchRaceData = async () => {
      if (!raceId) {
        console.log("❌ Pas de raceId fourni");
        return;
      }

      console.log("🚀 Début de fetchRaceData pour raceId:", raceId);
      setLoading(true);
      try {
        const API_URL =
          process.env.EXPO_PUBLIC_API_URL ||
          "https://back-mint-node.vercel.app";
        const authHeader = token?.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;

        console.log("📡 Appel API:", `${API_URL}/race/${raceId}`);
        console.log("🔑 En-tête auth:", authHeader?.substring(0, 20) + "...");

        // Récupérer les informations de la course
        const raceResponse = await fetch(`${API_URL}/race/${raceId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });

        console.log("📥 Statut de la réponse:", raceResponse.status);
        console.log("✅ Réponse OK:", raceResponse.ok);

        if (raceResponse.ok) {
          const raceData = await raceResponse.json();

          // Log détaillé des données de la course reçues
          console.log("=== DONNÉES RACE REÇUES ===");
          console.log("Race ID:", raceId);
          console.log("Race complète:", JSON.stringify(raceData, null, 2));
          console.log("gpxFile:", raceData.gpxFile);
          console.log("Type de gpxFile:", typeof raceData.gpxFile);
          console.log("gpxFile existe:", !!raceData.gpxFile);
          console.log("gpxFile est null:", raceData.gpxFile === null);
          console.log("gpxFile est undefined:", raceData.gpxFile === undefined);
          console.log("gpxFile est vide:", raceData.gpxFile === "");
          console.log("============================");

          // Adapter les données pour l'affichage
          const adaptedRace: RaceDetails = {
            ...raceData,
            // Compatibilité avec l'ancien format
            start_date: raceData.startDate,
            end_date: raceData.endDate,
            location: raceData.organization?.name,
            participants: raceData.runners?.length || 0,
            maxParticipants: 100, // Valeur par défaut
            category: "Course",
          };
          setRace(adaptedRace);

          // Récupérer le tracé depuis le contenu GPX de la course
          if (raceData.gpxFile && raceData.gpxFile.trim() !== "") {
            try {
              console.log("Traitement du contenu GPX de la course...");
              console.log("Taille du contenu GPX:", raceData.gpxFile.length);

              // Parser directement le contenu GPX stocké en base
              const { parseGpx } = await import("@/utils/gpxParser");
              const coordinates = parseGpx(raceData.gpxFile);

              if (coordinates.length > 0) {
                console.log(
                  `${coordinates.length} coordonnées extraites du GPX`
                );

                // Optimisation pour les performances
                let optimizedCoords = coordinates;

                if (coordinates.length > 20) {
                  const maxPoints = 15;
                  const step = Math.max(
                    1,
                    Math.floor((coordinates.length - 2) / maxPoints)
                  );

                  optimizedCoords = [
                    coordinates[0], // Premier point obligatoire
                    ...coordinates
                      .slice(1, -1)
                      .filter((_, i) => i % step === 0),
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
                console.log(
                  "Coordonnées finales pour la carte:",
                  optimizedCoords
                );
                setTrackCoordinates(optimizedCoords);
              } else {
                console.warn("Aucune coordonnée trouvée dans le contenu GPX");
              }
            } catch (gpxError) {
              console.warn(
                "Erreur lors du traitement du contenu GPX:",
                gpxError
              );
            }
          } else {
            console.warn("Aucun contenu GPX associé à cette course");
          }
        } else {
          throw new Error("Impossible de récupérer les données de la course");
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
    if (!trackCoordinates || trackCoordinates.length === 0) {
      console.log("Aucune coordonnée de tracé, pas de région calculée");
      return undefined;
    }

    const latitudes = trackCoordinates.map((c) => c.latitude);
    const longitudes = trackCoordinates.map((c) => c.longitude);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const region = {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.01, (maxLat - minLat) * 1.2),
      longitudeDelta: Math.max(0.01, (maxLng - minLng) * 1.2),
    };

    console.log("Région calculée pour le tracé:", region);
    console.log("Coordonnées utilisées:", { minLat, maxLat, minLng, maxLng });

    return region;
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
    if (!race?._id && !race?.id) return;

    try {
      const raceIdToUse = race._id || race.id;
      // Ici vous pouvez ajouter la logique d'inscription à la course
      console.log(
        `Tentative d'inscription à la course ${raceIdToUse}: ${race.name}`
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
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
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

  // Fonction pour déterminer le statut de la course
  const getRaceStatus = () => {
    if (!race?.startDate) return { status: 'unknown', color: '#888' };
    
    const now = currentTime;
    const startDate = new Date(race.startDate);
    const endDate = race.endDate ? new Date(race.endDate) : null;
    
    if (now < startDate) {
      return { status: 'upcoming', color: '#FFB020', label: 'À venir' };
    } else if (endDate && now > endDate) {
      return { status: 'finished', color: '#666', label: 'Terminée' };
    } else {
      return { status: 'ongoing', color: '#A1F763', label: 'En cours' };
    }
  };

  // Fonction pour calculer le temps restant
  const getTimeRemaining = () => {
    if (!race?.startDate) return null;
    
    const now = currentTime;
    const startDate = new Date(race.startDate);
    const endDate = race.endDate ? new Date(race.endDate) : null;
    const raceStatus = getRaceStatus();
    
    let targetDate: Date;
    let prefix: string;
    
    if (raceStatus.status === 'upcoming') {
      targetDate = startDate;
      prefix = 'Commence dans';
    } else if (raceStatus.status === 'ongoing' && endDate) {
      targetDate = endDate;
      prefix = 'Se termine dans';
    } else {
      return null;
    }
    
    const timeDiff = targetDate.getTime() - now.getTime();
    
    if (timeDiff <= 0) return null;
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    if (days > 0) {
      return `${prefix} ${days}j ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${prefix} ${hours}h ${minutes}m ${seconds}s`;
    } else {
      return `${prefix} ${minutes}m ${seconds}s`;
    }
  };

  // Composant pour afficher un participant
  const ParticipantItem = ({
    participant,
    index,
  }: {
    participant: any;
    index: number;
  }) => (
    <View style={styles.participantItem}>
      <View style={styles.participantAvatar}>
        <Text style={styles.participantAvatarText}>
          {participant.firstname?.charAt(0)?.toUpperCase() ||
            participant.name?.charAt(0)?.toUpperCase() ||
            participant.email?.charAt(0)?.toUpperCase() ||
            (index + 1).toString()}
        </Text>
      </View>
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>
          {participant.firstname && participant.lastname
            ? `${participant.firstname} ${participant.lastname}`
            : participant.name ||
              participant.email ||
              `Participant ${index + 1}`}
        </Text>
        {participant.email && (
          <Text style={styles.participantEmail}>{participant.email}</Text>
        )}
      </View>
      <View style={styles.participantNumber}>
        <Text style={styles.participantNumberText}>#{index + 1}</Text>
      </View>
    </View>
  );

  // Composant Modal pour les participants
  const ParticipantsModal = () => (
    <Modal
      visible={showParticipantsModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowParticipantsModal(false)}
    >
      <View style={styles.modalContainer}>
        <BlurView style={styles.modalHeader} intensity={40} tint="dark">
          <View style={styles.modalHeaderContent}>
            <Text style={styles.modalTitle}>
              Participants ({race?.runners?.length || 0})
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowParticipantsModal(false)}
            >
              <Icon name="close" size={24} color="#A1F763" />
            </TouchableOpacity>
          </View>
        </BlurView>

        <View style={styles.modalContent}>
          {!race?.runners || race.runners.length === 0 ? (
            <View style={styles.emptyParticipants}>
              <Icon name="account-off" size={60} color="#888" />
              <Text style={styles.emptyParticipantsText}>
                Aucun participant
              </Text>
              <Text style={styles.emptyParticipantsSubText}>
                Cette course n&apos;a pas encore de participants inscrits.
              </Text>
            </View>
          ) : (
            <FlatList
              data={race.runners}
              keyExtractor={(item, index) =>
                item._id || item.id || index.toString()
              }
              renderItem={({ item, index }) => (
                <ParticipantItem participant={item} index={index} />
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.participantsList}
            />
          )}
        </View>
      </View>
    </Modal>
  );

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
              {/* Indicateur de statut de la course */}
              {race?.startDate && (
                <View style={styles.statusContainer}>
                  <View 
                    style={[
                      styles.statusIndicator, 
                      { backgroundColor: getRaceStatus().color }
                    ]} 
                  />
                  <Text style={[styles.statusText, { color: getRaceStatus().color }]}>
                    {getRaceStatus().label}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.headerSpacer} />
          </View>
        </BlurView>
      </View>

      {/* Panneau de compte à rebours pour les courses en cours ou à venir */}
      {getTimeRemaining() && (
        <View style={styles.countdownContainer}>
          <BlurView style={styles.countdownBlur} intensity={40} tint="dark">
            <View style={styles.countdownContent}>
              <Icon 
                name={getRaceStatus().status === 'ongoing' ? 'timer' : 'clock-outline'} 
                size={24} 
                color={getRaceStatus().color} 
              />
              <Text style={[styles.countdownText, { color: getRaceStatus().color }]}>
                {getTimeRemaining()}
              </Text>
            </View>
          </BlurView>
        </View>
      )}

      {/* Informations de la course directement sur la page */}
      {showRaceInfo && (
        <View style={styles.raceInfoContainer}>
          <BlurView style={styles.raceInfoBlur} intensity={40} tint="dark">
            <View style={styles.raceInfoContent}>
              {/* Grille d'informations */}
              <View style={styles.infoGrid}>
                {/* Statut de la course */}
                {race?.startDate && (
                  <View style={[styles.infoCard, getRaceStatus().status === 'ongoing' && styles.ongoingRaceCard]}>
                    <View style={[styles.infoIconContainer, { backgroundColor: getRaceStatus().color }]}>
                      <Icon
                        name={getRaceStatus().status === 'ongoing' ? 'play' : getRaceStatus().status === 'upcoming' ? 'clock-outline' : 'check'}
                        size={24}
                        color="#0F0F0F"
                      />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Statut</Text>
                      <Text style={[styles.infoValue, { color: getRaceStatus().color }]}>
                        {getRaceStatus().label}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Distance */}
                {(calculatedDistance > 0 || race?.distance) && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoIconContainer}>
                      <Icon
                        name="map-marker-distance"
                        size={24}
                        color="#0F0F0F"
                      />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Distance</Text>
                      <Text style={styles.infoValue}>
                        {calculatedDistance > 0
                          ? `${calculatedDistance.toFixed(2)} km`
                          : race?.distance
                          ? formatDistance(race.distance)
                          : "Inconnue"}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Date de début */}
                {(race?.startDate || race?.start_date) && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoIconContainer}>
                      <Icon name="calendar-start" size={24} color="#0F0F0F" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Début</Text>
                      <Text style={styles.infoValue}>
                        {formatDate(race.startDate || race.start_date!)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Date de fin */}
                {(race?.endDate || race?.end_date) && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoIconContainer}>
                      <Icon name="calendar-end" size={24} color="#0F0F0F" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Fin</Text>
                      <Text style={styles.infoValue}>
                        {formatDate(race.endDate || race.end_date!)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Organisation */}
                {race?.organization?.name && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoIconContainer}>
                      <Icon name="domain" size={24} color="#0F0F0F" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Organisation</Text>
                      <Text style={styles.infoValue}>
                        {race.organization.name}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Participants */}
                {race?.runners && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoIconContainer}>
                      <Icon name="account-group" size={24} color="#0F0F0F" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Participants</Text>
                      <Text style={styles.infoValue}>
                        {race.runners.length} inscrit
                        {race.runners.length > 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </BlurView>
        </View>
      )}

      {/* Carte avec le même style que home */}
      <View style={styles.mapContainer}>
        <Map
          user={{ email: user?.email }}
          gpxCoordinates={trackCoordinates}
          region={mapRegion}
          forceTrackCentering={true}
        />
        <Image
          source={require("@/assets/images/radial-gradient.png")}
          style={styles.radialGradient}
          resizeMode="cover"
        />
      </View>

      {/* Boutons d'action avec le style home */}
      <View style={styles.container__btns}>
        {!user?.isVisitor && (
          // Interface pour utilisateur connecté : boutons rejoindre et retour
          <View style={styles.mainButtonsContainer}>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={handleJoinRace}
              activeOpacity={0.8}
            >
              <BlurView
                style={styles.joinButtonBlur}
                intensity={40}
                tint="dark"
              >
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
        )}

        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.roundButton}>
            <BlurView style={styles.roundButtonBlur} intensity={40} tint="dark">
              <Icon name="share" size={28} color="#fff" />
            </BlurView>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.roundButton}
            onPress={() => setShowParticipantsModal(true)}
          >
            <BlurView style={styles.roundButtonBlur} intensity={40} tint="dark">
              <Icon name="account-group" size={28} color="#fff" />
            </BlurView>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.roundButton}
            onPress={() => setShowRaceInfo(!showRaceInfo)}
          >
            <BlurView style={styles.roundButtonBlur} intensity={40} tint="dark">
              <Icon name="information-outline" size={28} color="#fff" />
            </BlurView>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal des participants */}
      <ParticipantsModal />
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
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 40,
  },
  countdownContainer: {
    position: "absolute",
    top: 140,
    left: 20,
    right: 20,
    borderRadius: 15,
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
  countdownBlur: {
    borderRadius: 15,
    backgroundColor: "rgba(105, 105, 105, 0.18)",
    overflow: "hidden",
  },
  countdownContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  countdownText: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  raceInfoContainer: {
    position: "absolute",
    top: 200, // Position ajustée pour laisser de la place au compte à rebours
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
    padding: 16,
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
  // Styles pour la modal des participants
  modalContainer: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  modalHeader: {
    backgroundColor: "rgba(105, 105, 105, 0.18)",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  modalHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#A1F763",
  },
  modalCloseButton: {
    padding: 8,
    backgroundColor: "rgba(161, 247, 99, 0.1)",
    borderRadius: 8,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyParticipants: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyParticipantsText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    textAlign: "center",
  },
  emptyParticipantsSubText: {
    color: "#888",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  participantsList: {
    paddingVertical: 20,
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#A1F763",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  participantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#A1F763",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  participantAvatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212121",
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  participantEmail: {
    fontSize: 14,
    color: "#888",
  },
  participantNumber: {
    backgroundColor: "rgba(161, 247, 99, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(161, 247, 99, 0.3)",
  },
  participantNumberText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#A1F763",
  },
  // Styles pour les informations de course affichées directement
  infoGrid: {
    gap: 8,
  },
  infoCard: {
    backgroundColor: "rgba(15, 15, 15, 0.8)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(42, 42, 42, 0.6)",
    flexDirection: "row",
    alignItems: "center",
  },
  ongoingRaceCard: {
    borderColor: "#A1F763",
    backgroundColor: "rgba(161, 247, 99, 0.1)",
    shadowColor: "#A1F763",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#A1F763",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
    marginBottom: 1,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
    lineHeight: 16,
  },
});
