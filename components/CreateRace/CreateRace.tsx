import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system";
import * as Location from "expo-location";
import React, { useState } from "react";
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

// File paths
const USERS_FILE_PATH = `${FileSystem.documentDirectory}data/users.json`;
const RACES_FILE_PATH = `${FileSystem.documentDirectory}data/races.json`;

const CreateRace: React.FC<{ user: User }> = ({ user }) => {
  const [raceName, setRaceName] = useState("");
  const [runnerEmail, setRunnerEmail] = useState("");
  const [runners, setRunners] = useState<string[]>([]);
  const [startLocation, setStartLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [endLocation, setEndLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Add runner by email
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
      const users: User[] = JSON.parse(content);

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

  // Get location for start or end point
  const getLocation = async (isStart: boolean) => {
    setLoading(true);
    setError(null);

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Permission de géolocalisation refusée");
        setLoading(false);
        return;
      }

      let position;
      try {
        position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
      } catch (err) {
        const error = err as Error;
        console.warn("Localisation échouée, fallback à Paris:", error.message);
        position = { coords: { latitude: 48.8566, longitude: 2.3522 } };
      }

      const { latitude, longitude } = position.coords;
      if (isStart) {
        setStartLocation({ latitude, longitude });
      } else {
        setEndLocation({ latitude, longitude });
      }
      setError(null);
      setLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError("Erreur lors de l'obtention de la localisation: " + message);
      console.error("Erreur de localisation:", err);
      setLoading(false);
    }
  };

  // Create race
  const createRace = async () => {
    if (!raceName || !startLocation || !endLocation || runners.length === 0) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    if (endDate <= startDate) {
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
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        createdBy: user.email,
      };

      // Read or create races.json
      let races: Race[] = [];
      const fileInfo = await FileSystem.getInfoAsync(RACES_FILE_PATH);
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(RACES_FILE_PATH);
        races = JSON.parse(content);
      } else {
        await FileSystem.writeAsStringAsync(
          RACES_FILE_PATH,
          JSON.stringify([])
        );
      }

      // Append new race
      races.push(newRace);
      await FileSystem.writeAsStringAsync(
        RACES_FILE_PATH,
        JSON.stringify(races, null, 2)
      );

      // Reset form
      setRaceName("");
      setRunners([]);
      setStartLocation(null);
      setEndLocation(null);
      setStartDate(new Date());
      setEndDate(new Date());
      setError(null);
      setLoading(false);
      Alert.alert("Succès", "Course créée avec succès");
    } catch (err) {
      const error = err as Error;
      setError("Erreur lors de la création de la course: " + error.message);
      console.error("Erreur création course:", error);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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

      <View style={styles.buttonContainer}>
        <Button
          title="Définir point de départ"
          onPress={() => getLocation(true)}
          disabled={loading}
        />
        <Button
          title="Définir point d'arrivée"
          onPress={() => getLocation(false)}
          disabled={loading}
        />
      </View>

      <View style={styles.dateContainer}>
        <Text>Date de début:</Text>
        <Button
          title={startDate.toLocaleDateString()}
          onPress={() => setShowStartDatePicker(true)}
        />
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) setStartDate(selectedDate);
            }}
          />
        )}
      </View>
      <View style={styles.dateContainer}>
        <Text>Date de fin:</Text>
        <Button
          title={endDate.toLocaleDateString()}
          onPress={() => setShowEndDatePicker(true)}
        />
        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndDatePicker(false);
              if (selectedDate) setEndDate(selectedDate);
            }}
          />
        )}
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
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
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
  runnersContainer: {
    width: "100%",
    marginVertical: 10,
  },
  map: {
    width: "100%",
    height: 300,
    marginVertical: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    padding: 10,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginVertical: 5,
  },
});

export default CreateRace;
