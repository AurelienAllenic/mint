import * as FileSystem from "expo-file-system";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";

const FILE_PATH = FileSystem.documentDirectory + "/locations.json";

const Map = ({ user }) => {
  const [location, setLocation] = useState(null);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("User prop:", user);
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const fileInfo = await FileSystem.getInfoAsync(FILE_PATH);
        if (!fileInfo.exists) {
          console.warn("Fichier inexistant, création...");
          await FileSystem.writeAsStringAsync(FILE_PATH, JSON.stringify([]));
        }
        const content = await FileSystem.readAsStringAsync(FILE_PATH);
        const parsed = JSON.parse(content);
        setLocations(parsed);
        console.log("Données chargées :", parsed);
      } catch (err) {
        setError("Erreur lors du chargement du fichier: " + err.message);
        console.error("Lecture fichier erreur :", err);
      }
    })();
  }, []);

  const getLocation = async () => {
    try {
      setLoading(true);
      setError(null);
      const email = user?.email || "test@example.com";

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
          timeout: 10000,
        });
      } catch (err) {
        console.warn("Localisation échouée, fallback à Paris :", err.message);
        position = { coords: { latitude: 48.8566, longitude: 2.3522 } };
      }

      const { latitude, longitude } = position.coords;
      setLocation({ latitude, longitude });

      const newLocation = { user: email, lat: latitude, long: longitude };
      const updatedLocations = [...locations, newLocation];
      setLocations(updatedLocations);

      await FileSystem.writeAsStringAsync(
        FILE_PATH,
        JSON.stringify(updatedLocations, null, 2)
      );
      console.log("Données enregistrées dans :", FILE_PATH);
      setLoading(false);
    } catch (err) {
      setError("Erreur lors de l'obtention de la localisation: " + err.message);
      console.error("Erreur globale :", err);
      setLoading(false);
    }
  };

  const clearStorage = async () => {
    try {
      await FileSystem.writeAsStringAsync(FILE_PATH, JSON.stringify([]));
      setLocations([]);
      setLocation(null);
      setError("Fichier local vidé pour débogage.");
      console.log("Fichier JSON vidé");
    } catch (err) {
      setError("Erreur lors du vidage du fichier: " + err.message);
      console.error("Erreur vidage fichier :", err);
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
      <MapView
        style={styles.map}
        region={
          location
            ? {
                latitude: location.latitude,
                longitude: location.longitude,
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
        {location && (
          <Marker coordinate={location}>
            <Callout>
              <Text>
                Position actuelle:{"\n"}
                Latitude: {location.latitude}
                {"\n"}
                Longitude: {location.longitude}
                {"\n"}
                Email: {user?.email || "test@example.com"}
              </Text>
            </Callout>
          </Marker>
        )}
        {locations.map((loc, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: loc.lat, longitude: loc.long }}
          >
            <Callout>
              <Text>
                Email: {loc.user}
                {"\n"}
                Latitude: {loc.lat}
                {"\n"}
                Longitude: {loc.long}
              </Text>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={styles.buttonContainer}>
        <Button
          title="Ajouter un marqueur"
          onPress={getLocation}
          disabled={loading}
        />
        <Button
          title="Vider les données locales"
          onPress={clearStorage}
          color="red"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    padding: 10,
  },
  map: {
    width: "100%",
    height: 500,
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
});

export default Map;
