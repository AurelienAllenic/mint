import Map from "@/components/Map/Map";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useAuth } from "../../context/auth";
import { GPXPoint, parseGpx } from "../../utils/gpxParser";

export default function HomeScreen() {
  const { user, logout, token, updateUser } = useAuth();
  const router = useRouter();

  // Rediriger les visiteurs vers la page visiteur
  useEffect(() => {
    if (user?.isVisitor) {
      router.replace("/visitor");
    }
  }, [user, router]);

  // Charger les données du profil depuis l'API une seule fois au montage
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!token || !user || user.isVisitor) return;

      try {
        const API_URL = process.env.EXPO_PUBLIC_API_URL;
        if (!API_URL) return;

        const authHeader = token?.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;

        const response = await fetch(`${API_URL}/users/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });

        if (response.ok) {
          const profileData = await response.json();
          console.log("Fresh profile data loaded:", profileData);
          
          // Mettre à jour le contexte avec les données fraîches
          updateUser({
            firstname: profileData.firstname,
            lastname: profileData.lastname,
            profileImage: profileData.profileImage,
          });
        }
      } catch (error) {
        console.error("Erreur lors du chargement du profil utilisateur:", error);
      }
    };

    loadUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionnellement vide - une seule fois au montage

  // Debug logs pour l'objet user - seulement quand l'utilisateur change
  useEffect(() => {
    if (user) {
      console.log("=== DEBUG USER OBJECT ===");
      console.log("User object:", user);
      console.log("User _id:", user?._id);
      console.log("User firstname:", user?.firstname);
      console.log("User lastname:", user?.lastname);
      console.log("User email:", user?.email);
      console.log("User profileImage:", user?.profileImage);
      console.log("Token:", token);
      console.log("========================");
    }
  }, [user, token]);

  const [gpxCoordinates] = useState<GPXPoint[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showRaceMenu, setShowRaceMenu] = useState(false);
  const [races, setRaces] = useState<
    { id: string; name: string; distance?: number }[]
  >([]);
  const [loadingRaces, setLoadingRaces] = useState(false);
  const [selectedRaceRoute, setSelectedRaceRoute] = useState<
    { latitude: number; longitude: number }[] | null
  >(null);
  const raceMenuAnim = useState(new Animated.Value(0))[0];

  // Fonction pour gérer la déconnexion
  const handleLogout = () => {
    logout();
    setShowProfileMenu(false);
    router.replace("/login");
  };

  // Fonction pour basculer l'affichage du menu profil
  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  // Fetch des courses
  useEffect(() => {
    if (showRaceMenu) {
      const fetchRaces = async () => {
        setLoadingRaces(true);
        try {
          const API_URL = process.env.EXPO_PUBLIC_API_URL;
          if (!API_URL) return;
          const authHeader = token?.startsWith("Bearer ")
            ? token
            : `Bearer ${token}`;
          const response = await fetch(`${API_URL}/races`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
            },
          });
          const rawText = await response.text();
          console.log("Réponse brute /api/races:", rawText);
          console.log("Status:", response.status, "Token:", authHeader);
          let data = [];
          try {
            data = JSON.parse(rawText);
          } catch (e) {
            console.log("Erreur de parsing JSON /api/races:", e);
          }
          if (response.ok && Array.isArray(data)) {
            setRaces(data);
          } else {
            setRaces([]);
          }
        } catch (err) {
          setRaces([]);
          console.log("Erreur fetch /api/races:", err);
        } finally {
          setLoadingRaces(false);
        }
      };
      fetchRaces();
    }
  }, [showRaceMenu, token]);

  // Calcul de la région centrée sur le tracé sélectionné
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

  useEffect(() => {
    if (showRaceMenu) {
      Animated.timing(raceMenuAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(raceMenuAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [showRaceMenu, raceMenuAnim]);

  function calculateDistance(
    coords: { latitude: number; longitude: number }[]
  ): number {
    if (!coords || coords.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
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
  }

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        setShowProfileMenu(false);
        setShowRaceMenu(false);
      }}
    >
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <BlurView style={styles.header} intensity={40} tint="dark">
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.welcome}>Bienvenue !</Text>
                <Text style={styles.username}>
                  {user?.firstname && user?.lastname
                    ? `${user.firstname} ${user.lastname}`
                    : "Visiteur"}
                </Text>
              </View>
              <View style={styles.profileContainer}>
                <TouchableOpacity onPress={toggleProfileMenu}>
                  <Image
                    source={
                      user?.profileImage && user.profileImage.length > 0
                        ? { uri: user.profileImage }
                        : require("@/assets/images/pp.png")
                    }
                    style={styles.avatar}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>

          {/* Menu dropdown déplacé à l'extérieur du BlurView */}
          {showProfileMenu && (
            <View style={styles.profileMenu}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowProfileMenu(false);
                  router.push("/profile");
                }}
              >
                <Icon name="account" size={20} color="#fff" />
                <Text style={styles.menuText}>Mon Profil</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <Icon name="logout" size={20} color="#fff" />
                <Text style={styles.menuText}>Se déconnecter</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Menu déroulant des courses */}
        {showRaceMenu && (
          <Animated.View
            style={[
              styles.raceMenu,
              {
                opacity: raceMenuAnim,
                transform: [
                  {
                    translateX: raceMenuAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [320, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.raceMenuHeader}>
              <Text style={styles.raceMenuTitle}>Courses créées</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowRaceMenu(false)}
                accessibilityLabel="Fermer le menu"
              >
                <Icon name="close" size={28} color="#181818" />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
              >
                {loadingRaces ? (
                  <Text style={{ margin: 16, color: "#181818" }}>
                    Chargement...
                  </Text>
                ) : (
                  <>
                    {races.length === 0 ? (
                      <Text style={{ margin: 16, color: "#888" }}>
                        Aucune course trouvée
                      </Text>
                    ) : (
                      races.map((race) => (
                        <TouchableOpacity
                          key={race.id}
                          style={styles.raceItem}
                          disabled={loadingRaces}
                          onPress={async () => {
                            if (loadingRaces) return;
                            setLoadingRaces(true);
                            try {
                              const API_URL = process.env.EXPO_PUBLIC_API_URL;
                              if (!API_URL)
                                throw new Error("API URL manquante");
                              const authHeader = token?.startsWith("Bearer ")
                                ? token
                                : `Bearer ${token}`;
                              const gpxTrackUrl = `${API_URL}/races/${race.id}/track`;
                              const gpxResponse = await fetch(gpxTrackUrl, {
                                method: "GET",
                                headers: { Authorization: authHeader },
                              });
                              let gpxCoordinates: {
                                latitude: number;
                                longitude: number;
                              }[] = [];
                              let gpxError = false;
                              if (gpxResponse.ok) {
                                const gpxText = await gpxResponse.text();
                                try {
                                  const geojson = JSON.parse(gpxText);
                                  if (
                                    geojson.type === "LineString" &&
                                    Array.isArray(geojson.coordinates)
                                  ) {
                                    gpxCoordinates = geojson.coordinates.map(
                                      ([lng, lat]: [number, number]) => ({
                                        latitude: lat,
                                        longitude: lng,
                                      })
                                    );
                                  } else {
                                    gpxCoordinates = parseGpx(gpxText);
                                  }
                                } catch {
                                  try {
                                    gpxCoordinates = parseGpx(gpxText);
                                  } catch (e) {
                                    console.error("Erreur de parsing GPX:", e);
                                    gpxError = true;
                                  }
                                }
                                if (gpxCoordinates.length > 200) {
                                  const step = Math.ceil(
                                    gpxCoordinates.length / 200
                                  );
                                  gpxCoordinates = gpxCoordinates.filter(
                                    (
                                      point: {
                                        latitude: number;
                                        longitude: number;
                                      },
                                      i: number
                                    ) =>
                                      i === 0 ||
                                      i === gpxCoordinates.length - 1 ||
                                      i % step === 0
                                  );
                                }
                                // Calculer la distance
                                const dist = calculateDistance(gpxCoordinates);
                                console.log(
                                  `Distance calculée pour ${
                                    race.name
                                  }: ${dist.toFixed(2)} km`
                                );
                              } else {
                                gpxError = true;
                              }
                              if (gpxError || gpxCoordinates.length === 0) {
                                Alert.alert(
                                  "Erreur",
                                  "Impossible d'afficher le tracé GPX de cette course."
                                );
                                setSelectedRaceRoute(null);
                              } else {
                                setSelectedRaceRoute(gpxCoordinates);
                              }
                            } catch (e) {
                              console.error(
                                "Erreur lors du chargement de la course :",
                                e
                              );
                              Alert.alert(
                                "Erreur",
                                "Une erreur est survenue lors de l'affichage de cette course."
                              );
                              setSelectedRaceRoute(null);
                            } finally {
                              setLoadingRaces(false);
                              setShowRaceMenu(false);
                            }
                          }}
                        >
                          <Text style={styles.raceName}>{race.name}</Text>
                          <Text style={styles.raceDistance}>
                            {race.distance
                              ? `${race.distance} m`
                              : "Distance inconnue"}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          </Animated.View>
        )}
        {/* Loader global pour le chargement du tracé d'une course */}
        {loadingRaces && (
          <View style={styles.loaderOverlay} pointerEvents="box-none">
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#A1F763" />
              <Text style={styles.loaderText}>Chargement du tracé...</Text>
            </View>
          </View>
        )}
        <View style={styles.container__btns}>
          <View style={styles.mainButtonsContainer}>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => router.push("/create-race")}
            >
              <BlurView
                style={styles.joinButtonBlur}
                intensity={40}
                tint="dark"
              >
                <Text style={styles.joinButtonText}>CRÉER</Text>
              </BlurView>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mainButton}
              onPress={() => router.push("/rejoindre")}
            >
              <Text style={styles.mainButtonText}>REJOINDRE</Text>
            </TouchableOpacity>
          </View>
          {/* <TouchableOpacity
            style={[
              styles.mainButton,
              { marginTop: 10, backgroundColor: "#fff" },
            ]}
            onPress={handleImportGPX}
          >
            <Text style={[styles.mainButtonText, { color: "#A1F763" }]}>
              Importer GPX
            </Text>
          </TouchableOpacity> */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.roundButton}>
              <BlurView
                style={styles.roundButtonBlur}
                intensity={40}
                tint="dark"
              >
                <Icon name="account-group" size={24} color="#fff" />
              </BlurView>
            </TouchableOpacity>
            <TouchableOpacity style={styles.roundButton}>
              <BlurView
                style={styles.roundButtonBlur}
                intensity={40}
                tint="dark"
              >
                <Icon name="chart-line" size={24} color="#fff" />
              </BlurView>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.roundButton}
              // onPress={() => setShowRaceMenu((v) => !v)}
            >
              <BlurView
                style={styles.roundButtonBlur}
                intensity={40}
                tint="dark"
              >
                <Icon name="cog" size={24} color="#fff" />
              </BlurView>
            </TouchableOpacity>

            {/* <TouchableOpacity style={homeStyles.button} onPress={createOrganisation}>
        <Text style={homeStyles.buttonText}>Créer une organisation</Text>
      </TouchableOpacity>
      <TouchableOpacity style={homeStyles.button} onPress={seeOrganisation}>
        <Text style={homeStyles.buttonText}>Voir les organisations</Text>
      </TouchableOpacity>
      <TouchableOpacity style={homeStyles.button} onPress={seeRaces}>
        <Text style={homeStyles.buttonText}>Voir les courses disponibles</Text>
      </TouchableOpacity> */}
          </View>
        </View>

        <View style={styles.mapContainer}>
          <Map
            user={{ email: user?.email }}
            gpxCoordinates={selectedRaceRoute || gpxCoordinates}
            region={
              selectedRaceRoute
                ? getRegionFromCoordinates(selectedRaceRoute)
                : undefined
            }
          />
          <Image
            source={require("@/assets/images/radial-gradient.png")}
            style={styles.radialGradient}
            resizeMode="cover"
          />
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between", // Alignement vertical
    position: "relative", // Ajouté pour que l'absolu soit bien calculé
    margin: 0, // S'assurer qu'il n'y a pas de marge
    padding: 0,
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
  welcome: {
    color: "#A1F763",
    fontSize: 16,
    fontWeight: "600",
  },
  username: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderColor: "#fff",
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
    pointerEvents: "none", // Permet aux interactions de passer à travers
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
  profileContainer: {
    position: "relative",
  },
  profileMenu: {
    position: "absolute",
    top: 70,
    right: 0,
    backgroundColor: "#2A2A2A",
    borderRadius: 12,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    width: 180,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  menuText: {
    justifyContent: "center",
    width: "100%",
    alignItems: "center",
    color: "#fff",
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "500",
  },
  raceMenu: {
    position: "absolute",
    top: 0, // occupe toute la hauteur
    right: 0,
    width: 320,
    height: "100%", // toute la hauteur de l'écran
    backgroundColor: "#181818",
    zIndex: 100,
    borderLeftWidth: 2,
    borderLeftColor: "#A1F763",
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    paddingBottom: 24,
  },
  raceMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 60,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#A1F763",
  },
  closeButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 4,
    marginLeft: 8,
    shadowColor: "#8EFF00",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  raceMenuTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#A1F763",
    textAlign: "left",
  },
  raceItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    backgroundColor: "#232323",
  },
  raceName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#A1F763",
  },
  raceDistance: {
    fontSize: 14,
    color: "#fff",
    marginTop: 2,
    fontWeight: "400",
  },
  loaderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  loaderBox: {
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 32,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  loaderText: {
    fontSize: 18,
    color: "#181818",
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 16,
  },
});
