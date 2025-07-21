import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
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

interface User {
  email: string;
  name: string;
  role?: string; // Role est optionnel car il n'existe pas dans l'API
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

/**
 * Exporte une course au format texte et propose le partage
 * @param race course à exporter
 * @param gpxFileName nom du fichier GPX
 */
const exportRaceAsText = async (race: Race, gpxFileName: string | null) => {
  try {
    const path = `${FileSystem.documentDirectory}race-${race.id}.txt`;
    const content = `
Résumé de la course :
- ID : ${race.id}
- Nom : ${race.name}
- Créée par : ${race.createdBy}
- Nombre de coureurs : ${race.runners.length}
- Point de départ : (${race.startLocation.latitude}, ${
      race.startLocation.longitude
    })
- Point d'arrivée : (${race.endLocation.latitude}, ${
      race.endLocation.longitude
    })
- Longueur du tracé : ${race.route.length} points
- Fichier GPX : ${gpxFileName || "Aucun fichier sélectionné"}
- Date de début : ${race.startDate}
- Date de fin : ${race.endDate}
- Heure de début : ${race.startTime}
- Heure de fin : ${race.endTime}
    `.trim();
    await FileSystem.writeAsStringAsync(path, content);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, {
        mimeType: "text/plain",
        dialogTitle: "Partager le résumé de la course",
      });
    } else {
      Alert.alert(
        "Partage non disponible",
        "Impossible de partager sur cet appareil"
      );
    }
  } catch (err) {
    console.error("Erreur export TXT :", err);
    Alert.alert("Erreur", "Impossible d'exporter le résumé de la course");
  }
};

const CreateRace: React.FC<{ user: User }> = ({ user }) => {
  const [raceName, setRaceName] = useState("");
  const [runnerEmail, setRunnerEmail] = useState("");
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
  const [showSuggestions, setShowSuggestions] = useState(false);

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
          `Erreur réseau lors du chargement des coureurs: ${err.message}`
        );
      }
    };

    fetchRunners();

    // Données simulées pour tester si l'API ne fonctionne pas
    /*
    const mockUsers: User[] = [
      { email: "user1@example.com", name: "User 1" },
      { email: "user2@example.com", name: "User 2" },
    ];
    console.log("Utilisateurs simulés:", mockUsers);
    setAvailableRunners(mockUsers);
    */
  }, []);

  /**
   * Filtre les suggestions d'utilisateurs en fonction de l'email saisi
   */
  const filteredRunners = availableRunners
    .filter(
      (runner) =>
        runner.email.toLowerCase().includes(runnerEmail.toLowerCase()) &&
        !runners.includes(runner.email.toLowerCase())
    )
    .slice(0, 5); // Limiter à 5 suggestions max

  /**
   * Ajoute un coureur après validation de son email
   */
  const addRunner = async () => {
    const emailTrimmed = runnerEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      setError("Email du coureur requis");
      return;
    }
    setLoading(true);
    try {
      const runner = availableRunners.find(
        (u) => u.email.toLowerCase() === emailTrimmed
      );
      if (!runner) {
        setError("Utilisateur introuvable");
      } else if (runners.includes(emailTrimmed)) {
        setError("Utilisateur déjà ajouté");
      } else {
        setRunners((prev) => [...prev, emailTrimmed]);
        setRunnerEmail("");
        setShowSuggestions(false);
        setError(null);
      }
    } catch (err) {
      console.error("Erreur ajout coureur:", err);
      setError("Erreur lors de l'ajout de l'utilisateur");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sélectionne un coureur depuis les suggestions
   */
  const selectRunner = (email: string) => {
    if (!runners.includes(email.toLowerCase())) {
      setRunners((prev) => [...prev, email.toLowerCase()]);
      setRunnerEmail("");
      setShowSuggestions(false);
      setError(null);
    }
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

      if (res.type === "cancel") {
        setError(null);
        return;
      }

      const uri = res.uri || (res.assets && res.assets[0]?.uri);
      const fileName =
        res.name || (res.assets && res.assets[0]?.name) || "fichier_gpx";
      if (!uri) {
        setError("URI du fichier introuvable");
        return;
      }

      const xml = await FileSystem.readAsStringAsync(uri);
      const coords = parseGpx(xml);

      if (coords.length < 2) {
        setError("Fichier GPX invalide ou trop court");
        return;
      }

      setRoute(coords);
      setGpxFileName(fileName);
      setError(null);

      // Ajuster la région de la carte pour centrer sur le tracé
      if (coords.length > 0) {
        const latitudes = coords.map((coord) => coord.latitude);
        const longitudes = coords.map((coord) => coord.longitude);
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLon = Math.min(...longitudes);
        const maxLon = Math.max(...longitudes);

        setRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLon + maxLon) / 2,
          latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.01),
          longitudeDelta: Math.max((maxLon - minLon) * 1.5, 0.01),
        });
      }
    } catch (err) {
      console.error("Erreur import GPX :", err);
      setError("Erreur lors de l'import du fichier GPX");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Crée une nouvelle course et l'enregistre
   */
  const createRace = async () => {
    if (!raceName.trim()) {
      setError("Nom de la course requis");
      return;
    }
    if (runners.length === 0) {
      setError("Ajoute au moins un coureur");
      return;
    }
    if (route.length < 2) {
      setError("Importe un fichier GPX valide avant de créer");
      return;
    }
    if (!startDate || !endDate || !startTime || !endTime) {
      setError("Veuillez sélectionner les dates et heures de début et de fin");
      return;
    }
    if (startDate > endDate) {
      setError("La date de fin doit être postérieure à la date de début");
      return;
    }

    setLoading(true);
    try {
      const newRace: Race = {
        id: Math.random().toString(36).substring(2, 9),
        name: raceName.trim(),
        runners,
        startLocation: route[0],
        endLocation: route[route.length - 1],
        createdBy: user.email,
        route,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        startTime: startTime.toISOString().split("T")[1].substring(0, 8),
        endTime: endTime.toISOString().split("T")[1].substring(0, 8),
      };

      const raw = await FileSystem.readAsStringAsync(RACES_FILE_PATH);
      const races: Race[] = JSON.parse(raw);
      races.push(newRace);

      await FileSystem.writeAsStringAsync(
        RACES_FILE_PATH,
        JSON.stringify(races, null, 2)
      );

      console.log("Nouvelle course créée :", {
        id: newRace.id,
        name: newRace.name,
        createdBy: newRace.createdBy,
        runnersCount: newRace.runners.length,
        startLocation: newRace.startLocation,
        endLocation: newRace.endLocation,
        routeLength: newRace.route.length,
        gpxFileName: gpxFileName || "Aucun fichier sélectionné",
        startDate: newRace.startDate,
        endDate: newRace.endDate,
        startTime: newRace.startTime,
        endTime: newRace.endTime,
      });

      Alert.alert("Succès", "Course créée avec succès");
      setLastCreatedRace(newRace);

      // Réinitialiser le formulaire
      setRaceName("");
      setRunnerEmail("");
      setRunners([]);
      setRoute([]);
      setGpxFileName(null);
      setError(null);
      setStartDate(null);
      setEndDate(null);
      setStartTime(null);
      setEndTime(null);
      setRegion({
        latitude: 48.8566,
        longitude: 2.3522,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (err) {
      console.error("Erreur création course :", err);
      setError("Erreur lors de la création de la course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Effacer" onPress={() => setError(null)} />
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="Nom de la course"
        value={raceName}
        onChangeText={setRaceName}
        editable={!loading}
      />

      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Email du coureur"
          value={runnerEmail}
          onChangeText={(text) => {
            setRunnerEmail(text);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <Button title="Ajouter" onPress={addRunner} disabled={loading} />
      </View>

      {showSuggestions && filteredRunners.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={filteredRunners}
            keyExtractor={(item) => item.email}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => selectRunner(item.email)}
              >
                <Text>
                  {item.email} ({item.name})
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {runners.length > 0 && (
        <View style={{ marginBottom: 10 }}>
          {runners.map((email, i) => (
            <Text key={i}>• {email}</Text>
          ))}
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.label}>
          Date de début :{" "}
          {startDate ? startDate.toISOString().split("T")[0] : "Non définie"}
        </Text>
        <Button
          title="Choisir"
          onPress={() => setShowStartDatePicker(true)}
          disabled={loading}
        />
      </View>
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(Platform.OS === "ios" ? true : false);
            if (selectedDate) {
              setStartDate(selectedDate);
            }
          }}
        />
      )}

      <View style={styles.row}>
        <Text style={styles.label}>
          Heure de début :{" "}
          {startTime
            ? startTime.toISOString().split("T")[1].substring(0, 8)
            : "Non définie"}
        </Text>
        <Button
          title="Choisir"
          onPress={() => setShowStartTimePicker(true)}
          disabled={loading}
        />
      </View>
      {showStartTimePicker && (
        <DateTimePicker
          value={startTime || new Date()}
          mode="time"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(event, selectedTime) => {
            setShowStartTimePicker(Platform.OS === "ios" ? true : false);
            if (selectedTime) {
              setStartTime(selectedTime);
            }
          }}
        />
      )}

      <View style={styles.row}>
        <Text style={styles.label}>
          Date de fin :{" "}
          {endDate ? endDate.toISOString().split("T")[0] : "Non définie"}
        </Text>
        <Button
          title="Choisir"
          onPress={() => setShowEndDatePicker(true)}
          disabled={loading}
        />
      </View>
      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(Platform.OS === "ios" ? true : false);
            if (selectedDate) {
              setEndDate(selectedDate);
            }
          }}
        />
      )}

      <View style={styles.row}>
        <Text style={styles.label}>
          Heure de fin :{" "}
          {endTime
            ? endTime.toISOString().split("T")[1].substring(0, 8)
            : "Non définie"}
        </Text>
        <Button
          title="Choisir"
          onPress={() => setShowEndTimePicker(true)}
          disabled={loading}
        />
      </View>
      {showEndTimePicker && (
        <DateTimePicker
          value={endTime || new Date()}
          mode="time"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(event, selectedTime) => {
            setShowEndTimePicker(Platform.OS === "ios" ? true : false);
            if (selectedTime) {
              setEndTime(selectedTime);
            }
          }}
        />
      )}

      <Button
        title="Importer fichier GPX"
        onPress={importGpx}
        disabled={loading}
      />

      <MapView
        style={styles.map}
        region={region}
        scrollEnabled={true}
        zoomEnabled={true}
      >
        {route.length > 0 && (
          <>
            <Marker coordinate={route[0]} pinColor="green" title="Départ" />
            <Marker
              coordinate={route[route.length - 1]}
              pinColor="red"
              title="Arrivée"
            />
            <Polyline
              coordinates={route}
              strokeColor="#007AFF"
              strokeWidth={3}
            />
          </>
        )}
      </MapView>

      <Button title="Créer la course" onPress={createRace} disabled={loading} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#fff",
  },
  input: {
    borderWidth: 1,
    borderColor: "#888",
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    flex: 1,
    fontSize: 16,
  },
  map: {
    width: "100%",
    height: 300,
    marginVertical: 15,
  },
  errorBox: {
    backgroundColor: "#ffe6e6",
    padding: 10,
    marginBottom: 10,
    borderRadius: 4,
    borderColor: "#ff4d4d",
    borderWidth: 1,
  },
  errorText: {
    color: "#b00000",
    marginBottom: 5,
  },
  suggestionsContainer: {
    maxHeight: 150,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    marginBottom: 10,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});

export default CreateRace;
