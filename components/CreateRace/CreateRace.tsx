import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

interface User {
  email: string;
  name: string;
  role: string;
}

interface Race {
  id: string;
  name: string;
  runners: string[];
  startLocation: { latitude: number; longitude: number };
  endLocation: { latitude: number; longitude: number };
  createdBy: string;
  route: { latitude: number; longitude: number }[];
}

const DATA_DIR = `${FileSystem.documentDirectory}data/`;
const USERS_FILE_PATH = `${DATA_DIR}users.json`;
const RACES_FILE_PATH = `${DATA_DIR}races.json`;

/**
 * Initialise les fichiers JSON nécessaires en créant les dossiers/fichiers s'ils n'existent pas
 */
const initializeJsonFiles = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(DATA_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DATA_DIR, { intermediates: true });
    }

    if (!(await FileSystem.getInfoAsync(USERS_FILE_PATH)).exists) {
      await FileSystem.writeAsStringAsync(USERS_FILE_PATH, "[]");
    }
    if (!(await FileSystem.getInfoAsync(RACES_FILE_PATH)).exists) {
      await FileSystem.writeAsStringAsync(RACES_FILE_PATH, "[]");
    }
  } catch (err) {
    console.error("Erreur lors de l'initialisation des fichiers JSON :", err);
  }
};

/**
 * Parse le contenu XML GPX et extrait les coordonnées lat/lon
 * @param xml contenu XML du fichier GPX
 * @returns tableau de coordonnées {latitude, longitude}
 */
const parseGpx = (xml: string): { latitude: number; longitude: number }[] => {
  const matches = [...xml.matchAll(/<trkpt lat="([\d.-]+)" lon="([\d.-]+)"/g)];
  return matches.map((m) => ({
    latitude: parseFloat(m[1]),
    longitude: parseFloat(m[2]),
  }));
};

/**
 * Exporte une course au format JSON et propose le partage si possible
 * @param race course à exporter
 */
const exportRaceAsJson = async (race: Race) => {
  try {
    const path = `${FileSystem.documentDirectory}race-${race.id}.json`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(race, null, 2));

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, {
        mimeType: "application/json",
        dialogTitle: "Partager la course",
      });
    } else {
      Alert.alert(
        "Partage non disponible",
        "Impossible de partager sur cet appareil"
      );
    }
  } catch (err) {
    console.error("Erreur export JSON :", err);
    Alert.alert("Erreur", "Impossible d'exporter la course");
  }
};

const CreateRace: React.FC<{ user: User }> = ({ user }) => {
  const [raceName, setRaceName] = useState("");
  const [runnerEmail, setRunnerEmail] = useState("");
  const [runners, setRunners] = useState<string[]>([]);
  const [route, setRoute] = useState<{ latitude: number; longitude: number }[]>(
    []
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastCreatedRace, setLastCreatedRace] = useState<Race | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    initializeJsonFiles();
  }, []);

  /**
   * Ajoute un coureur après validation de son email dans users.json
   */
  const addRunner = async () => {
    const emailTrimmed = runnerEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      setError("Email du coureur requis");
      return;
    }
    setLoading(true);
    try {
      const usersRaw = await FileSystem.readAsStringAsync(USERS_FILE_PATH);
      const users: User[] = JSON.parse(usersRaw);
      const runner = users.find(
        (u) => u.email.toLowerCase() === emailTrimmed && u.role === "coureur"
      );
      if (!runner) {
        setError("Coureur introuvable");
      } else if (runners.includes(emailTrimmed)) {
        setError("Coureur déjà ajouté");
      } else {
        setRunners((prev) => [...prev, emailTrimmed]);
        setRunnerEmail("");
        setError(null);
      }
    } catch (err) {
      console.error("Erreur lecture users.json :", err);
      setError("Erreur lors de la lecture des utilisateurs");
    }
    setLoading(false);
  };

  /**
   * Importe un fichier GPX et extrait le tracé
   */
  const importGpx = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/gpx+xml", "application/xml", "text/xml", "*/*"],
      });

      if (res.type === "cancel") {
        setError(null);
        return;
      }

      // URI du fichier sélectionné
      const uri = res.uri || (res.assets && res.assets[0]?.uri);
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
      setError(null);
    } catch (err) {
      console.error("Erreur import GPX :", err);
      setError("Erreur lors de l'import du fichier GPX");
    }
  };

  /**
   * Crée une nouvelle course et l'enregistre dans races.json
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
      });

      Alert.alert("Succès", "Course créée avec succès");
      setLastCreatedRace(newRace);

      // Reset form
      setRaceName("");
      setRunnerEmail("");
      setRunners([]);
      setRoute([]);
      setError(null);
    } catch (err) {
      console.error("Erreur création course :", err);
      setError("Erreur lors de la création de la course");
    }
    setLoading(false);
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
          onChangeText={setRunnerEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <Button title="Ajouter" onPress={addRunner} disabled={loading} />
      </View>

      {runners.length > 0 && (
        <View style={{ marginBottom: 10 }}>
          {runners.map((email, i) => (
            <Text key={i}>• {email}</Text>
          ))}
        </View>
      )}

      <Button
        title="Importer fichier GPX"
        onPress={importGpx}
        disabled={loading}
      />

      <MapView style={styles.map} scrollEnabled={false} zoomEnabled={false}>
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

      {route.length > 1 && (
        <View style={{ marginTop: 10 }}>
          <Button
            title="Voir le tracé"
            onPress={() => setModalVisible(true)}
            color="#007AFF"
          />
        </View>
      )}

      {lastCreatedRace && (
        <View style={{ marginTop: 20 }}>
          <Button
            title="Exporter la course au format JSON"
            onPress={() => exportRaceAsJson(lastCreatedRace)}
          />
        </View>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <Button title="Fermer" onPress={() => setModalVisible(false)} />
          <MapView
            style={styles.modalMap}
            initialRegion={{
              latitude: route[0]?.latitude || 0,
              longitude: route[0]?.longitude || 0,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Polyline
              coordinates={route}
              strokeColor="#007AFF"
              strokeWidth={3}
            />
            <Marker coordinate={route[0]} pinColor="green" title="Départ" />
            <Marker
              coordinate={route[route.length - 1]}
              pinColor="red"
              title="Arrivée"
            />
          </MapView>
        </View>
      </Modal>
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
  map: {
    width: "100%",
    height: 200,
    marginVertical: 15,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalMap: {
    flex: 1,
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
});

export default CreateRace;
