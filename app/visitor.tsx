import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/auth";
import { getTimeUntil } from "../utils/getTimeUntil";

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
  distance?: number;
  location?: string;
  date?: string;
  participants?: number;
  maxParticipants?: number;
  category?: string;
  image?: string;
}

export default function VisitorScreen() {
  const router = useRouter();
  const { logout, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [races, setRaces] = useState<Race[]>([]);
  const [filteredRaces, setFilteredRaces] = useState<Race[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchRaces = async () => {
      setLoading(true);
      try {
        const API_URL = process.env.EXPO_PUBLIC_API_URL;
        if (!API_URL) {
          console.log("VISITOR: API_URL manquante");
          return;
        }

        const authHeader = token?.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;

        console.log("VISITOR: Fetching races from:", `${API_URL}/race/public`);
        console.log("VISITOR: Using public endpoint (no auth required)");

        let response = await fetch(`${API_URL}/race/public`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            // Pas d'Authorization header pour l'endpoint public
          },
        });

        // Si l'endpoint public ne fonctionne pas, essayer /race avec auth en fallback
        if (!response.ok) {
          console.log("VISITOR: /race/public failed, trying /race with auth");
          response = await fetch(`${API_URL}/race`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
            },
          });
        }

        console.log("VISITOR: Response status:", response.status);
        console.log("VISITOR: Response ok:", response.ok);

        const rawText = await response.text();
        console.log("VISITOR: Raw response:", rawText);

        if (response.ok) {
          let data;
          try {
            data = JSON.parse(rawText);
            console.log("VISITOR: Parsed data:", data);
            console.log(
              "VISITOR: Data length:",
              Array.isArray(data) ? data.length : "Not an array"
            );
          } catch (parseError) {
            console.error("VISITOR: JSON parse error:", parseError);
            return;
          }

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
            id: race._id,
            name: race.name,
            startDate: race.startDate,
            endDate: race.endDate,
            organization: race.organization,
            runners: race.runners,
            gpxFile: race.gpxFile,
            owner: race.owner,
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
            maxParticipants: 100,
            location: race.organization?.name || "Lieu non spécifié",
            category: "Course",
            image: race.image || getRandomImage(),
          }));

          setRaces(coursesAvecImages);
          setFilteredRaces(coursesAvecImages);
        } else {
          console.error("VISITOR: Response not ok:", response.status, rawText);
        }
      } catch (error) {
        console.error("VISITOR: Erreur lors du chargement des courses:", error);
        Alert.alert("Erreur", "Impossible de charger les courses");
      } finally {
        setLoading(false);
      }
    };

    fetchRaces();
  }, [token]);

  // Filtrer les courses selon la recherche
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredRaces(races);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = races.filter((race) => {
        // Recherche dans le nom de la course
        const nameMatch = race.name?.toLowerCase().includes(query);

        // Recherche dans le lieu/organisation
        const locationMatch = race.location?.toLowerCase().includes(query);

        // Recherche dans le nom de l'organisation
        const organizationMatch = race.organization?.name
          ?.toLowerCase()
          .includes(query);

        // Recherche dans la catégorie
        const categoryMatch = race.category?.toLowerCase().includes(query);

        return nameMatch || locationMatch || organizationMatch || categoryMatch;
      });
      setFilteredRaces(filtered);
    }
  }, [searchQuery, races]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const RaceCard = ({ race }: { race: Race }) => (
    <TouchableOpacity
      style={styles.raceCard}
      onPress={() => {
        router.push({
          pathname: "/RaceDetails",
          params: { raceId: race._id || race.id },
        });
      }}
    >
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
                Début dans : {getTimeUntil(race.startDate)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcome}>Mode Visiteur</Text>
            <Text style={styles.username}>Découvrir les courses</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout" size={20} color="#fff" />
            <Text style={styles.logoutText}>Quitter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="magnify" size={20} color="#A1F763" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une course..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Icon name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Liste des courses */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A1F763" />
          <Text style={styles.loadingText}>Chargement des courses...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {filteredRaces.length} course{filteredRaces.length > 1 ? "s" : ""}{" "}
              trouvée{filteredRaces.length > 1 ? "s" : ""}
            </Text>
          </View>

          {filteredRaces.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="alert-circle-outline" size={60} color="#888" />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? "Aucune course trouvée"
                  : "Aucune course disponible"}
              </Text>
              <Text style={styles.emptySubText}>
                {searchQuery
                  ? "Essayez avec d'autres mots-clés"
                  : "Revenez plus tard pour découvrir de nouvelles courses"}
              </Text>
            </View>
          ) : (
            <View style={styles.raceListContainer}>
              {filteredRaces.map((race, index) => (
                <RaceCard key={race._id || race.id || index} race={race} />
              ))}
            </View>
          )}

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              Mode visiteur - Connectez-vous pour créer des courses
            </Text>
          </View>
        </ScrollView>
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
    backgroundColor: "#1E1E1E",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(161, 247, 99, 0.2)",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcome: {
    color: "#A1F763",
    fontSize: 16,
    fontWeight: "600",
  },
  username: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(161, 247, 99, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  logoutText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#0A0A0A",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(161, 247, 99, 0.3)",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontFamily: "HelveticaNowMicroRegular",
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
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  statsText: {
    color: "#888",
    fontSize: 14,
    fontFamily: "HelveticaNowMicroRegular",
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
  raceListContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  raceCard: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  footerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: "center",
  },
  footerText: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
  },
});
