import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface User {
  id: string;
  email?: string;
  firstname?: string | null;
  lastname?: string | null;
  name?: string;
  role?: string;
}

interface Race {
  id: string;
  name: string;
  runners: string[];
  startLocation: { latitude: number; longitude: number };
  endLocation: { latitude: number; longitude: number };
  createdBy: string;
  route: { latitude: number; longitude: number }[];
  startDate: string; // ISO string (e.g., "2025-07-04")
  endDate: string; // ISO string
  startTime: string; // ISO string (e.g., "14:30:00")
  endTime: string; // ISO string
}

const DATA_DIR = `${FileSystem.documentDirectory}data/`;
const RACES_FILE_PATH = `${DATA_DIR}races.json`;

/**
 * Initialise les fichiers JSON nécessaires
 */
const initializeJsonFiles = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(DATA_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DATA_DIR, { intermediates: true });
    }

    if (!(await FileSystem.getInfoAsync(RACES_FILE_PATH)).exists) {
      await FileSystem.writeAsStringAsync(RACES_FILE_PATH, "[]");
    }
  } catch (err) {
    console.error("Erreur lors de l'initialisation des fichiers JSON :", err);
    Alert.alert("Erreur", "Impossible d'initialiser les fichiers de données");
  }
};

/**
 * Parse le contenu XML GPX et extrait les coordonnées
 * @param xml contenu XML du fichier GPX
 * @returns tableau de coordonnées {latitude, longitude}
 */
const parseGpx = (xml: string): { latitude: number; longitude: number }[] => {
  try {
    const matches = [
      ...xml.matchAll(/<trkpt lat="([\d.-]+)" lon="([\d.-]+)"/g),
    ];
    const coords = matches.map((m) => ({
      latitude: parseFloat(m[1]),
      longitude: parseFloat(m[2]),
    }));
    return coords.filter(
      (coord) => !isNaN(coord.latitude) && !isNaN(coord.longitude)
    );
  } catch (err) {
    console.error("Erreur lors du parsing GPX :", err);
    return [];
  }
};

const CreateRace: React.FC<{ user: User }> = ({ user }) => {
  const [raceName, setRaceName] = useState("");
  const [runners, setRunners] = useState<string[]>([]);
  const [route, setRoute] = useState<{ latitude: number; longitude: number }[]>(
    []
  );
  const [gpxFileName, setGpxFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastCreatedRace, setLastCreatedRace] = useState<Race | null>(null);
  const [region, setRegion] = useState({
    latitude: 48.8566, // Paris par défaut
    longitude: 2.3522,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [availableRunners, setAvailableRunners] = useState<User[]>([]);
  // Ajout d'un state pour le token
  const [token, setToken] = useState<string>("");

  /**
   * Récupération automatique du token depuis AsyncStorage
   */
  useEffect(() => {
    const getToken = async () => {
      const value = await AsyncStorage.getItem("token");
      if (value) setToken(value);
    };
    getToken();
  }, []);

  /**
   * Charge les coureurs via l'API
   */
  useEffect(() => {
    initializeJsonFiles();

    const fetchRunners = async () => {
      try {
        const API_URL = process.env.EXPO_PUBLIC_API_URL;
        if (!API_URL) {
          setError("Erreur: API_URL non défini dans .env");
          console.error("Erreur: API_URL non défini");
          return;
        }
        console.log("API_URL:", API_URL);
        console.log("Requête envoyée à:", `${API_URL}/users`);
        const response = await fetch(`${API_URL}/users`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        console.log("Statut HTTP:", response.status);
        console.log(
          "En-têtes HTTP:",
          Object.fromEntries(response.headers.entries())
        );
        const text = await response.text();
        console.log("Réponse brute de l'API (complète):", text);
        if (response.ok) {
          try {
            const users: User[] = JSON.parse(text);
            console.log("Utilisateurs chargés:", users);
            setAvailableRunners(users);
          } catch (jsonErr) {
            console.error("Erreur de parsing JSON:", jsonErr);
            setError(`La réponse de l'API n'est pas un JSON valide: "${text}"`);
          }
        } else {
          setError(`Erreur HTTP ${response.status}: ${text}`);
          console.error(`Erreur HTTP ${response.status}: ${text}`);
        }
      } catch (err) {
        console.error("Erreur réseau:", err);
        setError(
          `Erreur réseau lors du chargement des coureurs: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    };

    fetchRunners();
  }, []);

  /**
   * Ajoute un coureur depuis la liste déroulante
   */
  const addRunner = (user: User) => {
    if (runners.includes(user.id)) {
      setError("Utilisateur déjà ajouté");
      return;
    }
    setRunners((prev) => [...prev, user.id]);
    setError(null);
  };

  /**
   * Importe un fichier GPX et met à jour le tracé et la région de la carte
   */
  const importGpx = async () => {
    try {
      setLoading(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/gpx+xml", "application/xml", "text/xml", "*/*"],
      });

      // Correction : utilisation de res.canceled et res.assets
      if (res.canceled) {
        setError(null);
        return;
      }

      const asset = res.assets && res.assets[0];
      const uri = asset?.uri;
      const fileName = asset?.name || "fichier_gpx";
      if (!uri) {
        setError("URI du fichier introuvable");
        return;
      }

      const xml = await FileSystem.readAsStringAsync(uri);
      const coords = parseGpx(xml);

      if (coords.length === 0) {
        setError("Aucune coordonnée valide trouvée dans le fichier GPX");
        return;
      }

      setRoute(coords);
      setGpxFileName(fileName);
      setError(null);

      // Ajustement de la région de la carte pour inclure tous les points
      const latitudes = coords.map((c) => c.latitude);
      const longitudes = coords.map((c) => c.longitude);
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);
      setRegion({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: (maxLat - minLat) * 1.2,
        longitudeDelta: (maxLng - minLng) * 1.2,
      });
    } catch (err) {
      console.error("Erreur import GPX :", err);
      setError("Erreur lors de l'import du fichier GPX");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Crée une nouvelle course
   */
  const createRace = async () => {
    if (!raceName.trim()) {
      setError("Nom de la course requis");
      return;
    }
    if (runners.length === 0) {
      setError("Au moins un coureur doit être sélectionné");
      return;
    }
    if (route.length === 0) {
      setError("Le tracé de la course est requis");
      return;
    }
    if (!startDate || !endDate) {
      setError("Les dates de début et de fin sont requises");
      return;
    }
    if (!startTime || !endTime) {
      setError("Les heures de début et de fin sont requises");
      return;
    }

    setLoading(true);
    try {
      // Log du token pour debug
      console.log("Token utilisé pour la requête:", token);
      const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      const newRace: Race = {
        id: `${Date.now()}`,
        name: raceName.trim(),
        runners: [...runners],
        startLocation: route[0],
        endLocation: route[route.length - 1],
        createdBy: user.email || `${user.firstname || ""} ${user.lastname || ""}`,
        route: [...route],
        startDate: startDate.toISOString().split("T")[0], // YYYY-MM-DD
        endDate: endDate.toISOString().split("T")[0], // YYYY-MM-DD
        startTime: startTime.toISOString().split("T")[1].slice(0, 8), // HH:mm:ss
        endTime: endTime.toISOString().split("T")[1].slice(0, 8), // HH:mm:ss
      };

      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      if (!API_URL) {
        setError("Erreur: API_URL non défini dans .env");
        console.error("Erreur: API_URL non défini");
        return;
      }

      const response = await fetch(`${API_URL}/races`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(newRace),
      });

      if (response.ok) {
        const savedRace = await response.json();
        setLastCreatedRace(savedRace);
        Alert.alert("Succès", "Course créée avec succès");
        // Réinitialiser le formulaire
        setRaceName("");
        setRunners([]);
        setRoute([]);
        setGpxFileName(null);
        setStartDate(null);
        setEndDate(null);
        setStartTime(null);
        setEndTime(null);
        setError(null);
      } else {
        const text = await response.text();
        setError(`Erreur lors de la création de la course: ${text}`);
        console.error(`Erreur lors de la création de la course: ${text}`);
      }
    } catch (err) {
      console.error("Erreur création course:", err);
      setError("Erreur lors de la création de la course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Créer une nouvelle course</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Nom de la course</Text>
        <TextInput
          style={styles.input}
          value={raceName}
          onChangeText={setRaceName}
          placeholder="Entrez le nom de la course"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Coureurs</Text>
        <FlatList
          data={availableRunners}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => addRunner(item)}
              style={styles.suggestion}
            >
              <Text>
                {(item.firstname || "") + " " + (item.lastname || "")}
              </Text>
            </TouchableOpacity>
          )}
          style={styles.suggestionsList}
        />
        {runners.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>Coureurs sélectionnés :</Text>
            {runners.map((id, i) => (
              <Text key={i}>• {id}</Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Tracé de la course (GPX)</Text>
        <TouchableOpacity onPress={importGpx} style={styles.gpxImportButton}>
          <Text style={styles.gpxImportButtonText}>
            {gpxFileName
              ? `Fichier GPX sélectionné : ${gpxFileName}`
              : "Importer un fichier GPX"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Date et heure de début</Text>
        <TouchableOpacity
          onPress={() => setShowStartDatePicker(true)}
          style={styles.dateTimePicker}
        >
          <Text>
            {startDate
              ? `Date de début : ${startDate.toLocaleDateString()}`
              : "Sélectionner la date de début"}
          </Text>
        </TouchableOpacity>
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowStartDatePicker(false);
              if (date) {
                setStartDate(date);
              }
            }}
          />
        )}
        <TouchableOpacity
          onPress={() => setShowStartTimePicker(true)}
          style={styles.dateTimePicker}
        >
          <Text>
            {startTime
              ? `Heure de début : ${startTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "Sélectionner l'heure de début"}
          </Text>
        </TouchableOpacity>
        {showStartTimePicker && (
          <DateTimePicker
            value={startTime || new Date()}
            mode="time"
            display="default"
            onChange={(event, time) => {
              setShowStartTimePicker(false);
              if (time) {
                setStartTime(time);
              }
            }}
          />
        )}
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Date et heure de fin</Text>
        <TouchableOpacity
          onPress={() => setShowEndDatePicker(true)}
          style={styles.dateTimePicker}
        >
          <Text>
            {endDate
              ? `Date de fin : ${endDate.toLocaleDateString()}`
              : "Sélectionner la date de fin"}
          </Text>
        </TouchableOpacity>
        {showEndDatePicker && (
          <DateTimePicker
            value={endDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowEndDatePicker(false);
              if (date) {
                setEndDate(date);
              }
            }}
          />
        )}
        <TouchableOpacity
          onPress={() => setShowEndTimePicker(true)}
          style={styles.dateTimePicker}
        >
          <Text>
            {endTime
              ? `Heure de fin : ${endTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "Sélectionner l'heure de fin"}
          </Text>
        </TouchableOpacity>
        {showEndTimePicker && (
          <DateTimePicker
            value={endTime || new Date()}
            mode="time"
            display="default"
            onChange={(event, time) => {
              setShowEndTimePicker(false);
              if (time) {
                setEndTime(time);
              }
            }}
          />
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        onPress={createRace}
        style={styles.createRaceButton}
        disabled={loading}
      >
        <Text style={styles.createRaceButtonText}>
          {loading ? "Création en cours..." : "Créer la course"}
        </Text>
      </TouchableOpacity>

      {lastCreatedRace && (
        <View style={styles.lastRaceInfo}>
          <Text style={styles.lastRaceText}>
            Dernière course créée : {lastCreatedRace.name}
          </Text>
          <TouchableOpacity
            onPress={() => {
              // TODO: Naviguer vers la page de la course créée
            }}
            style={styles.viewRaceButton}
          >
            <Text style={styles.viewRaceButtonText}>Voir la course</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
        >
          {route.length > 0 && (
            <Polyline coordinates={route} strokeColor="#000" strokeWidth={4} />
          )}
          {route.length > 0 && (
            <>
              <Marker coordinate={route[0]} title="Départ" />
              <Marker coordinate={route[route.length - 1]} title="Arrivée" />
            </>
          )}
        </MapView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  suggestion: {
    padding: 8,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  suggestionsList: {
    maxHeight: 100,
    marginTop: 4,
    borderRadius: 4,
    overflow: "hidden",
    borderColor: "#ccc",
    borderWidth: 1,
  },
  gpxImportButton: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 4,
    alignItems: "center",
  },
  gpxImportButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  dateTimePicker: {
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    marginBottom: 8,
  },
  error: {
    color: "red",
    marginBottom: 16,
    fontWeight: "500",
  },
  createRaceButton: {
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 16,
  },
  createRaceButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  lastRaceInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#e9ecef",
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  lastRaceText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  viewRaceButton: {
    backgroundColor: "#007bff",
    padding: 8,
    borderRadius: 4,
    alignItems: "center",
  },
  viewRaceButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  mapContainer: {
    height: 300,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 16,
  },
  map: {
    width: "100%",
    height: "100%",
  },
});

export default CreateRace;
