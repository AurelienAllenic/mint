import { getTimeUntil } from "@/utils/getTimeUntil";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/auth";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.8;
const CARD_MARGIN = width * 0.05;

interface Race {
  _id?: string;
  id?: string;
  name: string;
  startDate?: string;
  endDate?: string;
  organization?: {
    _id: string;
    name: string;
  };
  runners?: any[];
  gpxFile?: string;
  owner?: any;
  // Champs optionnels pour l'affichage
  distance?: number;
  location?: string;
  date?: string;
  participants?: number;
  maxParticipants?: number;
  category?: string;
  image?: string;
}

export default function RejoindreScreen() {
  const router = useRouter();
  const { token, user } = useAuth();

  // Rediriger les visiteurs vers la page visiteur
  useEffect(() => {
    if (user?.isVisitor) {
      router.replace("/visitor");
    }
  }, [user, router]);

  const [loading, setLoading] = useState(false);
  const [mesRaces, setMesRaces] = useState<Race[]>([]);
  const [mesParticipations, setMesParticipations] = useState<Race[]>([]);
  const [activeTab, setActiveTab] = useState<"courses" | "participations">(
    "courses"
  );
  const scrollY = new Animated.Value(0);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.8],
    extrapolate: "clamp",
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -20],
    extrapolate: "clamp",
  });

  useEffect(() => {
    const fetchRaces = async () => {
      setLoading(true);
      try {
        const API_URL = process.env.EXPO_PUBLIC_API_URL;
        if (!API_URL) return;

        const authHeader = token?.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;

        const response = await fetch(`${API_URL}/race`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });

        if (response.ok) {
          const data = await response.json();

          const trailImages = [
            "https://www.sitesdexception.fr/wp-content/uploads/2021/12/Trail-des-Cathares.jpg",
            "https://mesinfos.fr/content/articles/968/A151968/image-827110557111684162009034.png",
            "https://mesinfos.fr/content/articles/968/A151968/image-317964533121684162009039.png",
            "https://mesinfos.fr/content/articles/968/A151968/image-496377705131684162009042.png",
            "https://mesinfos.fr/content/articles/968/A151968/image-729770848141684162009046.png",
            "https://mesinfos.fr/content/articles/968/A151968/image-973913459151684162009048.png",
            "https://mesinfos.fr/content/articles/968/A151968/image-555232024161684162009055.png",
            "https://mesinfos.fr/content/articles/968/A151968/image-216753066181684162009079.png",
            "https://mesinfos.fr/content/articles/968/A151968/image-219702519171684162009064.png",
            "https://www.latransju.com/wp-content/uploads/2022/12/cv-lilian-menetrier-transju_trail-2022-dimanche-hd-52-date-jj-min-2048x1365.jpg",
          ];

          const getRandomImage = () => {
            return trailImages[Math.floor(Math.random() * trailImages.length)];
          };

          // Adapter les données de l'API au format attendu
          const coursesAvecImages = data.map((race: any) => ({
            _id: race._id,
            id: race._id, // Pour compatibilité
            name: race.name,
            startDate: race.startDate,
            endDate: race.endDate,
            organization: race.organization,
            runners: race.runners,
            gpxFile: race.gpxFile,
            owner: race.owner,
            // Calculer des informations d'affichage
            date: race.startDate
              ? new Date(race.startDate).toLocaleDateString("fr-FR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                })
              : undefined,
            dateToDateFormat: race.startDate,
            participants: race.runners?.length || 0,
            maxParticipants: 100, // Valeur par défaut
            location: race.organization?.name || "Lieu non spécifié",
            category: "Course",
            image: race.image || getRandomImage(),
          }));

          // Filtrer les courses selon les critères
          const userId = user?._id;
          console.log("ID utilisateur connecté:", userId);

          // Mes courses : où l'utilisateur est le propriétaire
          const mesCourses = coursesAvecImages.filter((race: any) => {
            const isOwner =
              race.owner?._id === userId ||
              race.owner?.id === userId ||
              race.owner === userId;
            return isOwner;
          });

          // Mes participations : où l'utilisateur est dans le tableau runners
          const mesParticipationsData = coursesAvecImages.filter(
            (race: any) => {
              // Afficher seulement les _id des runners
              if (race.runners && Array.isArray(race.runners)) {
                const runnersIds = race.runners
                  .map((runner: any) => runner._id)
                  .filter(Boolean);
                console.log(`Course "${race.name}" - Runners _id:`, runnersIds);
              }

              if (
                !race.runners ||
                !Array.isArray(race.runners) ||
                race.runners.length === 0
              ) {
                return false;
              }

              const isParticipant = race.runners.some((runner: any) => {
                let runnerId = null;
                if (typeof runner === "object" && runner !== null) {
                  runnerId = runner._id || runner.id;
                } else {
                  runnerId = runner;
                }

                const userIdStr = String(userId);
                const runnerIdStr = String(runnerId);
                return runnerIdStr === userIdStr;
              });

              return isParticipant;
            }
          );

          // console.log("Mes courses (propriétaire):", mesCourses);
          // console.log("Mes participations:", mesParticipationsData);

          setMesRaces(mesCourses);
          setMesParticipations(mesParticipationsData);
        } else {
          const trailImages = [
            "https://www.sitesdexception.fr/wp-content/uploads/2021/12/Trail-des-Cathares.jpg",
            "https://mesinfos.fr/content/articles/968/A151968/image-827110557111684162009034.png",
            "https://mesinfos.fr/content/articles/968/A151968/image-317964533121684162009039.png",
            "https://mesinfos.fr/content/articles/968/A151968/image-496377705131684162009042.png",
            "https://mesinfos.fr/content/articles/968/A151968/image-729770848141684162009046.png",
            "https://mesinfos.fr/content/articles/968/A151968/image-973913459151684162009048.png",
            "https://mesinfos.fr/content/articles/968/A151968/image-555232024161684162009055.png",
            "https://mesinfos.fr/content/articles/968/A151968/image-216753066181684162009079.png",
            "https://mesinfos.fr/content/articles/968/A151968/image-219702519171684162009064.png",
            "https://www.latransju.com/wp-content/uploads/2022/12/cv-lilian-menetrier-transju_trail-2022-dimanche-hd-52-date-jj-min-2048x1365.jpg",
          ];
        }
      } catch (error) {
        console.error("Erreur lors du chargement des courses:", error);
        Alert.alert("Erreur", "Impossible de charger les courses");
      } finally {
        setLoading(false);
      }
    };

    fetchRaces();
  }, [token, user]);

  const RaceCard = ({ race }: { race: Race }) => {
    const scaleValue = new Animated.Value(1);

    const onPressIn = () => {
      Animated.spring(scaleValue, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    };

    const onPressOut = () => {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View
        style={[
          styles.raceCardContainer,
          { transform: [{ scale: scaleValue }] },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onPress={() => {
            router.push({
              pathname: "/RaceDetails",
              params: { raceId: race._id || race.id },
            });
          }}
        >
          <View style={styles.raceCard}>
            <View style={styles.raceImageContainer}>
              {race.image ? (
                <Image
                  source={{ uri: race.image }}
                  style={styles.raceImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.raceImagePlaceholder}>
                  <Icon name="image-off" size={30} color="#A1F763" />
                </View>
              )}
            </View>

            <View style={styles.raceCardContent}>
              <View style={styles.raceHeader}>
                <Text style={styles.raceName} numberOfLines={2}>
                  {race.name}
                </Text>
                <Icon name="chevron-right" size={20} color="#A1F763" />
              </View>

              <View style={styles.raceInfo}>
                {race.location && (
                  <View style={styles.raceDetail}>
                    <Icon name="map-marker" size={14} color="#A1F763" />
                    <Text style={styles.raceDetailText} numberOfLines={1}>
                      {race.location}
                    </Text>
                  </View>
                )}
                {race.participants !== undefined && (
                  <View style={styles.raceDetail}>
                    <Icon name="account-group" size={14} color="#A1F763" />
                    <Text style={styles.raceDetailText}>
                      {race.participants} participant
                      {race.participants > 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
                {race.date && (
                  <View style={styles.raceDetail}>
                    <Icon name="calendar" size={14} color="#A1F763" />
                    <Text style={styles.raceDetailText}>
                      Début dans : {getTimeUntil(race.startDate, race.endDate)}{" "}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const TabButton = ({
    title,
    isActive,
    onPress,
    icon,
  }: {
    title: string;
    isActive: boolean;
    onPress: () => void;
    icon: string;
  }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.activeTabButton]}
      onPress={onPress}
    >
      <Icon
        name={icon as any}
        size={18}
        color={isActive ? "#212121" : "#A1F763"}
      />
      <Text
        style={[styles.tabButtonText, isActive && styles.activeTabButtonText]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const RaceList = ({ races }: { races: Race[] }) => {
    if (races.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle-outline" size={60} color="#888" />
          <Text style={styles.emptyText}>Aucune course disponible</Text>
          <Text style={styles.emptySubText}>
            {activeTab === "courses"
              ? "Vous n'avez créé aucune course pour le moment"
              : "Vous ne participez à aucune course pour le moment"}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.raceListContainer}>
        {races.map((race, index) => (
          <RaceCard key={race._id || race.id || index} race={race} />
        ))}
      </View>
    );
  };

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
        <LinearGradient
          colors={["#A1F763", "#5D9C3E"]}
          style={styles.categoryIconContainer}
        >
          <Icon name={icon as any} size={20} color="#212121" />
        </LinearGradient>
        <Text style={styles.categoryTitle}>{title}</Text>
      </View>
      {races.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle-outline" size={40} color="#888" />
          <Text style={styles.emptyText}>Aucune course disponible</Text>
        </View>
      ) : (
        <FlatList
          data={races}
          renderItem={({ item }) => <RaceCard race={item} />}
          keyExtractor={(item) => item._id || item.id || "unknown"}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScrollContent}
          snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
          decelerationRate="fast"
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rejoindre une course</Text>
        <View style={styles.placeholder} />
      </Animated.View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A1F763" />
          <Text style={styles.loadingText}>Chargement des courses...</Text>
        </View>
      ) : (
        <Animated.ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {/* Onglets */}
          <View style={styles.tabContainer}>
            <TabButton
              title="Mes courses"
              isActive={activeTab === "courses"}
              onPress={() => setActiveTab("courses")}
              icon="account-check"
            />
            <TabButton
              title="Mes participations"
              isActive={activeTab === "participations"}
              onPress={() => setActiveTab("participations")}
              icon="run"
            />
          </View>

          {/* Contenu selon l'onglet actif */}
          <RaceList
            races={activeTab === "courses" ? mesRaces : mesParticipations}
          />
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#0A0A0A",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(161, 247, 99, 0.2)",
    zIndex: 100,
  },
  backButton: {
    padding: 8,
    backgroundColor: "rgba(161, 247, 99, 0.1)",
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#A1F763",
    fontFamily: "HelveticaNowMicroBold",
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A0A0A",
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 16,
    fontFamily: "HelveticaNowMicroRegular",
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Nouveaux styles pour les onglets
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(161, 247, 99, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(161, 247, 99, 0.3)",
    gap: 8,
  },
  activeTabButton: {
    backgroundColor: "#A1F763",
    borderColor: "#A1F763",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A1F763",
    fontFamily: "HelveticaNowMicroBold",
  },
  activeTabButtonText: {
    color: "#212121",
  },
  // Nouveaux styles pour la liste de courses
  raceListContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  raceCardContainer: {
    marginBottom: 16,
  },
  raceCard: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#A1F763",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  raceImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 16,
  },
  raceImage: {
    width: "100%",
    height: "100%",
  },
  raceImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
  },
  raceCardContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  raceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  raceName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    marginRight: 8,
    fontFamily: "HelveticaNowMicroBold",
  },
  raceInfo: {
    gap: 4,
  },
  raceDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  raceDetailText: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.8,
    fontFamily: "HelveticaNowMicroRegular",
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    textAlign: "center",
    fontFamily: "HelveticaNowMicroBold",
  },
  emptySubText: {
    color: "#888",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    fontFamily: "HelveticaNowMicroRegular",
    lineHeight: 20,
  },
  // Anciens styles conservés pour compatibilité
  categorySection: {
    marginBottom: 32,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    fontFamily: "HelveticaNowMicroBold",
  },
  horizontalScrollContent: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  raceGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "70%",
  },
});
