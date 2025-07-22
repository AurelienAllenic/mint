import Map from "@/components/Map/Map";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useAuth } from "../../context/auth";
import { GPXPoint, parseGPXFile } from "../../utils/gpxParser";

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [gpxCoordinates, setGpxCoordinates] = useState<GPXPoint[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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

  // Fonction pour importer un fichier GPX
  const handleImportGPX = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/gpx+xml", "*/*"], // Accepter plus de types au cas où
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.assets && result.assets.length > 0) {
        const gpxUri = result.assets[0].uri;

        // Parser le GPX et l'afficher sur la carte
        const coordinates = await parseGPXFile(gpxUri);
        setGpxCoordinates(coordinates);

        Alert.alert(
          "GPX importé avec succès",
          `${coordinates.length} points chargés sur la carte`,
          [
            {
              text: "Voir sur la carte",
              style: "default",
            },
            {
              text: "Créer une course",
              onPress: () =>
                router.push({
                  pathname: "/create-race",
                  params: { gpxUri },
                }),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de charger le fichier GPX");
      console.error("Erreur import GPX:", error);
    }
  };

  const createOrganisation = () => {
    router.push({
      pathname: "/create-organisation",
    });
  };

  const seeOrganisation = () => {
    router.push({
      pathname: "/see-organisations",
    });
  };

  const seeRaces = () => {
    router.push({
      pathname: "/see-races",
      params: { user: JSON.stringify(user) },
    });
  };


  return (
    <TouchableWithoutFeedback onPress={() => setShowProfileMenu(false)}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Bienvenue !</Text>
            <Text style={styles.username}>{user?.name || "Utilisateur"}</Text>
          </View>
          <View style={styles.profileContainer}>
            <TouchableOpacity onPress={toggleProfileMenu}>
              <Image
                source={require("@/assets/images/pp.png")}
                style={styles.avatar}
              />
            </TouchableOpacity>

            {/* Menu dropdown */}
            {showProfileMenu && (
              <View style={styles.profileMenu}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleLogout}
                >
                  <Icon name="logout" size={20} color="#fff" />
                  <Text style={styles.menuText}>Se déconnecter</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        <View style={styles.mapContainer}>
          <Map user={{ email: user?.email }} gpxCoordinates={gpxCoordinates} />
        </View>
        <View style={styles.container__btns}>
          <TouchableOpacity
            style={styles.mainButton}
            onPress={() => router.push("/create-race")}
          >
            <Text style={styles.mainButtonText}>Créer une course</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.mainButton,
              { marginTop: 10, backgroundColor: "#fff" },
            ]}
            onPress={handleImportGPX}
          >
            <Text style={[styles.mainButtonText, { color: "#A1F763" }]}>
              Importer GPX
            </Text>
          </TouchableOpacity>
          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.roundButton}>
              <Icon name="account-group" size={32} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.roundButtonCenter}>
              <Icon name="account" size={32} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.roundButton}
              onPress={() => setGpxCoordinates([])}
            >
              <Icon name="map-outline" size={32} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
    <ScrollView style={styles.container}>
      <Text style={homeStyles.title}>Bienvenue {user?.name}</Text>
      <TextInput placeholder="Rechercher un coureur" style={homeStyles.input} />
      <Map user={user} />
      <TouchableOpacity style={homeStyles.button} onPress={logout}>
        <Text style={homeStyles.buttonText}>Se déconnecter</Text>
      </TouchableOpacity>
      <TouchableOpacity style={homeStyles.button} onPress={createOrganisation}>
        <Text style={homeStyles.buttonText}>Créer une organisation</Text>
      </TouchableOpacity>
      <TouchableOpacity style={homeStyles.button} onPress={seeOrganisation}>
        <Text style={homeStyles.buttonText}>Voir les organisations</Text>
      </TouchableOpacity>
      <TouchableOpacity style={homeStyles.button} onPress={createRace}>
        <Text style={homeStyles.buttonText}>Créer une course</Text>
      </TouchableOpacity>
      <TouchableOpacity style={homeStyles.button} onPress={seeRaces}>
        <Text style={homeStyles.buttonText}>Voir les courses disponibles</Text>
      </TouchableOpacity>
    </ScrollView>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 60,
    marginHorizontal: 24,
    padding: 16, // Ajout de padding pour espacer le contenu
  },
  welcome: {
    color: "#A1F763",
    fontSize: 20,
    fontWeight: "600",
  },
  username: {
    color: "#fff",
    fontSize: 28,
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
  container__btns: {
    flex: 1,
    justifyContent: "flex-end", // Aligner les boutons en bas
    marginBottom: 20, // Espace en bas
    padding: 30,
  },
  mainButton: {
    backgroundColor: "#A1F763",
    borderRadius: 16,
    width: "100%",
    paddingVertical: 24,
    alignItems: "center",
    shadowColor: "#8EFF00",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  mainButtonText: {
    color: "#181818",
    fontWeight: "bold",
    fontSize: 18,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  bottomButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 30,
    gap: 1,
  },
  roundButton: {
    backgroundColor: "#A1F763", // Vert clair
    borderRadius: 20, // Plus arrondi
    width: 125,
    height: 75,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8EFF00",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  roundButtonCenter: {
    backgroundColor: "#fff", // Bouton central blanc
    borderRadius: 20,
    width: 88,
    height: 75,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8EFF00",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
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
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    minWidth: 150,
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
    width: "100%",
    alignItems: "center",

    color: "#fff",
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "500",
  },
});
