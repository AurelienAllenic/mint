import * as FileSystem from "expo-file-system";
import * as Location from "expo-location";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";

// Types
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
  startDate: string; // ISO string for JSON serialization
  endDate: string; // ISO string for JSON serialization
  createdBy: string; // Foreign key: email of the creator
}

const exportRaceAsJson = async (race: Race) => {
  try {
    const exportPath = `${FileSystem.documentDirectory}race-${race.id}.json`;
    await FileSystem.writeAsStringAsync(
      exportPath,
      JSON.stringify(race, null, 2)
    );

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(exportPath, {
        mimeType: "application/json",
        dialogTitle: "Partager la course",
      });
    } else {
      Alert.alert(
        "Partage non disponible",
        "Impossible de partager ce fichier sur cet appareil."
      );
    }
  } catch (err) {
    console.error("Erreur export JSON:", err);
    Alert.alert("Erreur", "Impossible d'exporter le résumé de la course.");
  }
};

// File paths in persistent storage
const DATA_DIR = `${FileSystem.documentDirectory}data/`;
const USERS_FILE_PATH = `${DATA_DIR}users.json`;
const RACES_FILE_PATH = `${DATA_DIR}races.json`;

// Initialize JSON files in persistent storage
const initializeJsonFiles = async () => {
  console.log("Début de l'initialisation des fichiers JSON");
  try {
    // Ensure data directory exists
    const dirInfo = await FileSystem.getInfoAsync(DATA_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DATA_DIR, { intermediates: true });
      console.log("Dossier data créé dans", DATA_DIR);
    } else {
      console.log("Dossier data existe déjà:", DATA_DIR);
    }

    // Initialize users.json only if it doesn't exist
    const usersFileInfo = await FileSystem.getInfoAsync(USERS_FILE_PATH);
    if (!usersFileInfo.exists) {
      await FileSystem.writeAsStringAsync(USERS_FILE_PATH, JSON.stringify([]));
      console.log("users.json créé avec une liste vide dans", USERS_FILE_PATH);
    } else {
      console.log("users.json existe déjà, aucune réécriture effectuée");
    }

    // Initialize races.json only if it doesn't exist
    const racesFileInfo = await FileSystem.getInfoAsync(RACES_FILE_PATH);
    if (!racesFileInfo.exists) {
      await FileSystem.writeAsStringAsync(RACES_FILE_PATH, JSON.stringify([]));
      console.log("races.json créé avec succès dans", RACES_FILE_PATH);
    } else {
      console.log("races.json existe déjà dans", RACES_FILE_PATH);
    }
    console.log("Initialisation des fichiers JSON terminée avec succès");
  } catch (err) {
    console.error("Erreur lors de l'initialisation des fichiers JSON:", err);
  }
};

const CreateRace: React.FC<{ user: User }> = ({ user }) => {
  const [raceName, setRaceName] = useState("");
  const [runnerEmail, setRunnerEmail] = useState("");
  const [runners, setRunners] = useState<string[]>([]);
  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");
  const [startLocation, setStartLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [endLocation, setEndLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeJsonFiles().catch((err) => {
      setError(
        "Erreur lors de l'initialisation des fichiers JSON: " + String(err)
      );
    });
  }, []);

  const addRunner = async () => {
    if (!runnerEmail) {
      setError("Veuillez entrer un email");
      return;
    }
    setLoading(true);
    try {
      const fileInfo = await FileSystem.getInfoAsync(USERS_FILE_PATH);
      if (!fileInfo.exists) {
        setError("Fichier users.json introuvable");
        setLoading(false);
        return;
      }
      const content = await FileSystem.readAsStringAsync(USERS_FILE_PATH);
      let users: User[] = [];
      try {
        users = JSON.parse(content);
        if (!Array.isArray(users)) {
          throw new Error("Le contenu de users.json n'est pas un tableau");
        }
      } catch (parseErr) {
        setError("Erreur de format dans users.json");
        setLoading(false);
        return;
      }
      console.log("Contenu complet de users.json:", users);
      const runner = users.find(
        (u) => u.email === runnerEmail && u.role === "coureur"
      );
      if (!runner) {
        setError("Aucun coureur trouvé avec cet email");
        setLoading(false);
        return;
      }
      if (runners.includes(runnerEmail)) {
        setError("Ce coureur est déjà ajouté");
        setLoading(false);
        return;
      }
      setRunners([...runners, runnerEmail]);
      setRunnerEmail("");
      setError(null);
      setLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError("Erreur lors de la lecture du fichier: " + message);
      console.error("Erreur lecture fichier:", err);
      setLoading(false);
    }
  };

  const geocodeAddress = async (address: string, isStart: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const geocodedLocations = await Location.geocodeAsync(address);
      if (geocodedLocations.length > 0) {
        const { latitude, longitude } = geocodedLocations[0];
        if (isStart) setStartLocation({ latitude, longitude });
        else setEndLocation({ latitude, longitude });
        setError(null);
      } else {
        setError("Adresse non trouvée");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError("Erreur lors de la géocodification: " + message);
      console.error("Erreur géocodification:", err);
    }
    setLoading(false);
  };

  const parseDate = (dateStr: string): Date | null => {
    const [day, month, year, hour, minute] = dateStr
      .split(/[\s/:]+/)
      .map(Number);
    if (
      day &&
      month &&
      year &&
      hour !== undefined &&
      minute !== undefined &&
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12 &&
      hour >= 0 &&
      hour <= 23 &&
      minute >= 0 &&
      minute <= 59
    ) {
      return new Date(year, month - 1, day, hour, minute);
    }
    return null;
  };

  const createRace = async () => {
    if (!raceName || !startLocation || !endLocation || runners.length === 0) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    const parsedStartDate = parseDate(startDate);
    const parsedEndDate = parseDate(endDate);
    if (!parsedStartDate || !parsedEndDate) {
      setError("Format de date invalide. Utilisez DD/MM/YYYY HH:MM");
      return;
    }
    if (parsedEndDate <= parsedStartDate) {
      setError("La date de fin doit être après la date de début");
      return;
    }

    setLoading(true);
    try {
      const newRace: Race = {
        id: Math.random().toString(36).substr(2, 9),
        name: raceName,
        runners,
        startLocation,
        endLocation,
        startDate: parsedStartDate.toISOString(),
        endDate: parsedEndDate.toISOString(),
        createdBy: user.email,
      };
      const fileInfo = await FileSystem.getInfoAsync(RACES_FILE_PATH);
      let races: Race[] = [];
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(RACES_FILE_PATH);
        races = JSON.parse(content);
      }
      races.push(newRace);
      await FileSystem.writeAsStringAsync(
        RACES_FILE_PATH,
        JSON.stringify(races, null, 2)
      );
      setRaceName("");
      setRunners([]);
      setStartAddress("");
      setEndAddress("");
      setStartLocation(null);
      setEndLocation(null);
      setStartDate("");
      setEndDate("");
      setError(null);
      setLoading(false);
      Alert.alert("Succès", "Course créée avec succès");
      await exportRaceAsJson(newRace);
    } catch (err) {
      const error = err as Error;
      setError("Erreur lors de la création de la course: " + error.message);
      console.error("Erreur création course:", err);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container} collapsable={false}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erreur: {error}</Text>
          <Button
            title="Effacer erreur"
            onPress={() => setError(null)}
            color="blue"
          />
        </View>
      )}
      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      )}
      <TextInput
        style={styles.input}
        placeholder="Nom de la course"
        value={raceName}
        onChangeText={setRaceName}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Email du coureur"
          value={runnerEmail}
          onChangeText={setRunnerEmail}
          keyboardType="email-address"
        />
        <Button title="Ajouter" onPress={addRunner} disabled={loading} />
      </View>
      {runners.length > 0 && (
        <View style={styles.runnersContainer}>
          <Text>Coureurs:</Text>
          {runners.map((email, index) => (
            <Text key={index}>{email}</Text>
          ))}
        </View>
      )}
      <MapView
        style={styles.map}
        region={
          startLocation || endLocation
            ? {
                latitude: startLocation?.latitude || endLocation!.latitude,
                longitude: startLocation?.longitude || endLocation!.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }
            : {
                latitude: 48.8566,
                longitude: 2.3522,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }
        }
      >
        {startLocation && (
          <Marker coordinate={startLocation} pinColor="green">
            <Callout>
              <Text>
                Départ: {"\n"}Lat: {startLocation.latitude}
                {"\n"}Long: {startLocation.longitude}
              </Text>
            </Callout>
          </Marker>
        )}
        {endLocation && (
          <Marker coordinate={endLocation} pinColor="red">
            <Callout>
              <Text>
                Arrivée: {"\n"}Lat: {endLocation.latitude}
                {"\n"}Long: {endLocation.longitude}
              </Text>
            </Callout>
          </Marker>
        )}
      </MapView>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Adresse de départ"
          value={startAddress}
          onChangeText={setStartAddress}
        />
        <Button
          title="Définir"
          onPress={() => geocodeAddress(startAddress, true)}
          disabled={loading || !startAddress}
        />
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Adresse d'arrivée"
          value={endAddress}
          onChangeText={setEndAddress}
        />
        <Button
          title="Définir"
          onPress={() => geocodeAddress(endAddress, false)}
          disabled={loading || !endAddress}
        />
      </View>
      <View style={styles.dateContainer}>
        <Text>Date et heure de début (DD/MM/YYYY HH:MM):</Text>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Ex: 13/06/2025 14:00"
          value={startDate}
          onChangeText={setStartDate}
          keyboardType="numeric"
        />
      </View>
      <View style={styles.dateContainer}>
        <Text>Date et heure de fin (DD/MM/YYYY HH:MM):</Text>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Ex: 13/06/2025 16:00"
          value={endDate}
          onChangeText={setEndDate}
          keyboardType="numeric"
        />
      </View>
      <Button
        title="Créer la course"
        onPress={createRace}
        disabled={loading}
        color="green"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "white",
  },
  errorContainer: {
    position: "absolute",
    top: 10,
    width: "100%",
    alignItems: "center",
    zIndex: 1,
  },
  loadingContainer: {
    position: "absolute",
    top: 10,
    width: "100%",
    alignItems: "center",
    zIndex: 1,
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
    backgroundColor: "white",
    padding: 5,
    borderRadius: 4,
  },
  loadingText: {
    fontSize: 16,
    textAlign: "center",
    backgroundColor: "white",
    padding: 5,
    borderRadius: 4,
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginVertical: 5,
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 5,
  },
  runnersContainer: { width: "100%", marginVertical: 10 },
  map: { width: "100%", height: 300, marginVertical: 10 },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginVertical: 5,
  },
});

export default CreateRace;
