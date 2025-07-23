import { useAuth } from "@/context/auth";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
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
  _id: string;
  email: string;
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
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

const DATA_DIR = `${FileSystem.documentDirectory}data/`;
const RACES_FILE_PATH = `${DATA_DIR}races.json`;

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
  const { token } = useAuth();
  const [gpxFileName, setGpxFileName] = useState<string | null>(null);
  const [gpxFileContent, setGpxFileContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastCreatedRace, setLastCreatedRace] = useState<Race | null>(null);
  const [region, setRegion] = useState({
    latitude: 48.8566,
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
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [showOrgSuggestions, setShowOrgSuggestions] = useState(false);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const API_URL = process.env.EXPO_PUBLIC_API_URL;
        if (!API_URL || !user) return;
        const response = await fetch(`${API_URL}/organizations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const orgs = await response.json();
        // orgs: [{ id, name, ... }]
        setOrganizations(orgs);
      } catch (err) {
        setOrganizations([]);
      }
    };
    fetchOrganizations();
  }, [token, user]);

  // Suggestions filtrées pour l'organisation :
  // - si le champ est vide, on propose toutes les organisations
  // - sinon, on filtre par nom
  const filteredOrganizations =
    organizationName.trim() === ""
      ? organizations.slice(0, 5)
      : organizations
          .filter(
            (org) =>
              org.name &&
              org.name.toLowerCase().includes(organizationName.toLowerCase())
          )
          .slice(0, 5);

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
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
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
  }, []);

  const filteredRunners = availableRunners
    .filter(
      (runner) =>
        runner.email.toLowerCase().includes(runnerEmail.toLowerCase()) &&
        !runners.includes(runner._id)
    )
    .slice(0, 5);

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
      } else if (runners.includes(runner._id)) {
        setError("Utilisateur déjà ajouté");
      } else {
        setRunners((prev) => [...prev, runner._id]);
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

  const selectRunner = (id: string) => {
    if (!runners.includes(id)) {
      setRunners((prev) => [...prev, id]);
      setRunnerEmail("");
      setShowSuggestions(false);
      setError(null);
    }
  };

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
      setGpxFileContent(xml);
      setError(null);

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
      setError(`Erreur lors de l'import du fichier GPX: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createRace = async () => {
    console.log("Fonction createRace déclenchée");

    console.log("Début création course :", {
      raceName: raceName.trim(),
      runners: runners,
      routeLength: route.length,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      startTime: startTime?.toISOString(),
      endTime: endTime?.toISOString(),
      token: token ? "présent" : "absent",
      organizationId,
      user: { _id: user._id, email: user.email },
      gpxFileName,
      gpxFileContentLength: gpxFileContent ? gpxFileContent.length : null, // Loguer seulement la longueur
    });

    if (!raceName.trim()) {
      setError("Nom de la course requis");
      console.log("Erreur: Nom de la course vide");
      Alert.alert("Erreur", "Nom de la course requis");
      return;
    }
    if (runners.length === 0) {
      setError("Ajoute au moins un coureur");
      console.log("Erreur: Aucun coureur ajouté");
      Alert.alert("Erreur", "Ajoute au moins un coureur");
      return;
    }
    if (route.length < 2) {
      setError("Importe un fichier GPX valide avant de créer");
      console.log("Erreur: Route GPX invalide ou trop courte");
      Alert.alert("Erreur", "Importe un fichier GPX valide avant de créer");
      return;
    }
    if (!startDate || !endDate || !startTime || !endTime) {
      setError("Veuillez sélectionner les dates et heures de début et de fin");
      console.log("Erreur: Dates ou heures manquantes");
      Alert.alert(
        "Erreur",
        "Veuillez sélectionner les dates et heures de début et de fin"
      );
      return;
    }
    if (startDate > endDate) {
      setError("La date de fin doit être postérieure à la date de début");
      console.log("Erreur: Date de fin antérieure à la date de début");
      Alert.alert(
        "Erreur",
        "La date de fin doit être postérieure à la date de début"
      );
      return;
    }
    if (!token) {
      setError("Utilisateur non authentifié.");
      console.log("Erreur: Token absent");
      Alert.alert("Erreur", "Utilisateur non authentifié.");
      return;
    }
    if (!organizationId) {
      setError("Impossible de retrouver l'organisation de l'utilisateur.");
      console.log("Erreur: organizationId manquant");
      Alert.alert(
        "Erreur",
        "Impossible de retrouver l'organisation de l'utilisateur."
      );
      return;
    }
    const currentUser = user._id
      ? user
      : availableRunners.find((u) => u.email === user.email);
    if (!currentUser || !currentUser._id) {
      setError("ID utilisateur manquant.");
      console.log("Erreur: user._id est undefined ou utilisateur introuvable");
      Alert.alert("Erreur", "ID utilisateur manquant.");
      return;
    }

    setLoading(true);
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      if (!API_URL) {
        console.log("Erreur: API_URL non défini dans .env");
        throw new Error("API_URL non défini");
      }
      console.log("API_URL utilisée:", API_URL);

      const start = new Date(startDate);
      start.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
      const end = new Date(endDate);
      end.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

      const newRace: Race = {
        id: Math.random().toString(36).substring(2, 9),
        name: raceName.trim(),
        runners,
        startLocation: route[0],
        endLocation: route[route.length - 1],
        createdBy: currentUser._id,
        route,
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
        startTime: start.toISOString().split("T")[1].substring(0, 8),
        endTime: end.toISOString().split("T")[1].substring(0, 8),
      };

      // On passe le contenu du GPX (texte brut) dans gpx_file si dispo, sinon chaîne vide
      const payload = {
        name: raceName.trim(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        organization: organizationId,
        runners,
        owner: currentUser._id,
        gpxFile: gpxFileContent ? gpxFileContent : "",
        route,
      };

      console.log("Payload envoyé à l'API:", JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_URL}/race`, {
        // Corrigé : /race -> /races
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log("Statut HTTP de la réponse:", response.status);
      console.log(
        "En-têtes HTTP:",
        Object.fromEntries(response.headers.entries())
      );
      const text = await response.text();
      console.log("Réponse brute de l'API:", text);

      let result;
      try {
        result = JSON.parse(text);
      } catch (jsonErr) {
        console.error("Erreur de parsing JSON:", jsonErr);
        throw new Error(
          `La réponse de l'API n'est pas un JSON valide: ${text}`
        );
      }

      if (!response.ok) {
        const errorMessage = result.message || `Erreur HTTP ${response.status}`;
        console.log("Erreur API:", errorMessage);
        throw new Error(errorMessage);
      }

      console.log("Course créée avec succès:", result);
      setLastCreatedRace(newRace);
      Alert.alert("Succès", "Course créée avec succès");

      setRaceName("");
      setRunnerEmail("");
      setRunners([]);
      setRoute([]);
      setGpxFileName(null);
      setGpxFileContent(null);
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
      console.error("Erreur lors de la création de la course:", err);
      setError(`Erreur lors de la création de la course: ${err.message}`);
      Alert.alert(
        "Erreur",
        `Échec de la création de la course: ${err.message}`
      );
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

      {/* Sélection de l'organisation (champ texte + suggestions) */}
      <View style={{ marginBottom: 10 }}>
        <TextInput
          style={styles.input}
          placeholder="Organisation (créée par vous)"
          value={organizationName}
          onChangeText={(text) => {
            setOrganizationName(text);
            setShowOrgSuggestions(true);
          }}
          onFocus={() => setShowOrgSuggestions(true)}
          onBlur={() => setTimeout(() => setShowOrgSuggestions(false), 200)}
          editable={!loading}
        />
        {showOrgSuggestions && filteredOrganizations.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {filteredOrganizations.map((org) => (
              <TouchableOpacity
                key={org.id}
                style={styles.suggestionItem}
                onPress={() => {
                  setOrganizationId(org.id);
                  setOrganizationName(org.name);
                  setShowOrgSuggestions(false);
                }}
              >
                <Text>{org.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {organizationId && (
          <Text style={{ color: "#007AFF", marginTop: 2 }}>
            Organisation sélectionnée : {organizationName}
          </Text>
        )}
      </View>

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
          {filteredRunners.map((runner) => (
            <TouchableOpacity
              key={runner._id}
              style={styles.suggestionItem}
              onPress={() => selectRunner(runner._id)}
            >
              <Text>{runner.email}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {runners.length > 0 && (
        <View style={{ marginBottom: 10 }}>
          {runners.map((id, i) => {
            const runner = availableRunners.find((u) => u._id === id);
            return <Text key={i}>• {runner ? runner.email : `ID ${id}`}</Text>;
          })}
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
            if (selectedDate) setStartDate(selectedDate);
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
            if (selectedTime) setStartTime(selectedTime);
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
            if (selectedDate) setEndDate(selectedDate);
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
            if (selectedTime) setEndTime(selectedTime);
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

      <Button
        title="Créer la course"
        onPress={() => {
          console.log("Bouton Créer la course cliqué");
          createRace();
        }}
        disabled={loading}
      />
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
