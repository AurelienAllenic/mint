import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
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
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mesRaces, setMesRaces] = useState<Race[]>([]);
  const [racesProches, setRacesProches] = useState<Race[]>([]);
  const [racesSponsos, setRacesSponsos] = useState<Race[]>([]);
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

  function getTimeUntil(startDate?: string, endDate?: string): string {
    if (!startDate) return "";
    const now = new Date();
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    const diffMs = start.getTime() - now.getTime();
    if (diffMs <= 0 && end && end.getTime() > now.getTime()){
      return "En cours";
    }
    else if (diffMs <= 0) {
      return "Terminé";
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
    const diffSeconds = Math.floor((diffMs / 1000) % 60);

    let result = "";
    if (diffDays > 0) result += `${diffDays}j `;
    if (diffHours > 0 || diffDays > 0) result += `${diffHours}h `;
    result += `${diffMinutes}min`;
    result += ` ${diffSeconds}s`;
    return result.trim();
  }

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

          setMesRaces(coursesAvecImages.slice(0, 3));
          setRacesProches(coursesAvecImages.slice(3, 8));
          setRacesSponsos(coursesAvecImages.slice(8));
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
  }, [token]);

  const RaceCard = ({ race }: { race: Race }) => {
    const scaleValue = new Animated.Value(1);

    const now = new Date();

    const onPressIn = () => {
      Animated.spring(scaleValue, {
        toValue: 0.95,
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
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
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
            {race.image ? (
              <Image
                source={{ uri: race.image }}
                style={styles.raceImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.raceImagePlaceholder}>
                <Icon name="image-off" size={40} color="#A1F763" />
              </View>
            )}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.9)"]}
              style={styles.raceGradient}
            />
            <View style={styles.raceCardContent}>
              <View style={styles.raceHeader}>
                <Text style={styles.raceName} numberOfLines={2}>
                  {race.name}
                </Text>
                <Icon name="chevron-right" size={24} color="#A1F763" />
              </View>
              <View style={styles.raceInfo}>
                {race.distance && (
                  <View style={styles.raceDetail}>
                    <Icon
                      name="map-marker-distance"
                      size={14}
                      color="#A1F763"
                    />
                    <Text style={styles.raceDetailText}>
                      {race.distance} km
                    </Text>
                  </View>
                )}
                {race.location && (
                  <View style={styles.raceDetail}>
                    <Icon name="map-marker" size={14} color="#A1F763" />
                    <Text style={styles.raceDetailText} numberOfLines={1}>
                      {race.location}
                    </Text>
                  </View>
                )}
                {race.participants && race.maxParticipants && (
                  <View style={styles.raceDetail}>
                    <Icon name="account-group" size={14} color="#A1F763" />
                    <Text style={styles.raceDetailText}>
                      {race.participants}/{race.maxParticipants}
                    </Text>
                  </View>
                )}
                {race.date && (
                  <View style={styles.raceDetail}>
                    <Icon name="calendar" size={14} color="#A1F763" />
                    <Text style={styles.raceDetailText}>{race.date}</Text>
                  </View>
                )}
                {race.date && (
                  <View style={styles.raceDetail}>
                    <Icon name="calendar" size={14} color="#A1F763" />
                    <Text style={styles.raceDetailText}>
                      Début dans : {getTimeUntil(race.startDate)}{" "}
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
    paddingTop: 20,
    paddingBottom: 40,
  },
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
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    color: "#888",
    fontSize: 16,
    marginTop: 10,
    fontFamily: "HelveticaNowMicroRegular",
  },
  horizontalScrollContent: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  raceCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 0.8,
    marginRight: CARD_MARGIN,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1E1E1E",
    shadowColor: "#A1F763",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  raceImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  raceImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1E1E1E",
    justifyContent: "center",
    alignItems: "center",
  },
  raceGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "70%",
  },
  raceCardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  raceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  raceName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    marginRight: 8,
    fontFamily: "HelveticaNowMicroBold",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  raceInfo: {
    gap: 8,
  },
  raceDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  raceDetailText: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    fontFamily: "HelveticaNowMicroRegular",
  },
});
