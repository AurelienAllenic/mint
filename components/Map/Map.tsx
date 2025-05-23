import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { Button, Modal, StyleSheet, Text, TextInput, View } from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";

const Map = () => {
  const [location, setLocation] = useState(null);
  const [locations, setLocations] = useState([]);
  const [user, setUser] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Load user and locations from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        // Check if user is "logged in"
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          setUser(storedUser);
          setIsAuthenticated(true);
        }

        // Load locations from AsyncStorage
        const storedLocations = await AsyncStorage.getItem("locations");
        if (storedLocations) {
          setLocations(JSON.parse(storedLocations));
        }
      } catch (err) {
        setError("Erreur lors du chargement des données: " + err.message);
      }
    })();
  }, []);

  // Get current location and save it
  const getLocation = async () => {
    try {
      setLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Permission de géolocalisation refusée");
        setLoading(false);
        return;
      }

      let position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = position.coords;
      setLocation({ latitude, longitude });

      if (!isAuthenticated) {
        setError(
          "Vous devez entrer un nom d'utilisateur pour ajouter une localisation."
        );
        setLoading(false);
        return;
      }

      // Create new location object
      const newLocation = {
        latitude,
        longitude,
        user,
        timestamp: new Date().toISOString(),
      };

      // Update locations state and AsyncStorage
      const updatedLocations = [...locations, newLocation];
      setLocations(updatedLocations);
      await AsyncStorage.setItem("locations", JSON.stringify(updatedLocations));

      setLoading(false);
    } catch (err) {
      setError("Erreur lors de l'obtention de la localisation: " + err.message);
      setLoading(false);
    }
  };

  // Handle "login" (store user in AsyncStorage)
  const handleLogin = async () => {
    if (!user) {
      setError("Veuillez entrer un nom d'utilisateur.");
      return;
    }

    try {
      await AsyncStorage.setItem("user", user);
      setIsAuthenticated(true);
      setShowLoginModal(false);
      setError(null);
    } catch (err) {
      setError("Erreur lors de la connexion: " + err.message);
    }
  };

  // Handle logout (clear user and locations for simplicity)
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("locations");
      setIsAuthenticated(false);
      setUser("");
      setLocations([]);
      setLocation(null);
      setError(null);
    } catch (err) {
      setError("Erreur lors de la déconnexion: " + err.message);
    }
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Erreur: {error}</Text>
      </View>
    );
  }
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isAuthenticated && (
        <Button
          title="Se connecter"
          onPress={() => setShowLoginModal(true)}
          color="#007bff"
        />
      )}
      <Modal visible={showLoginModal} animationType="slide" transparent={true}>
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Connexion</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom d'utilisateur"
              value={user}
              onChangeText={setUser}
            />
            <Button
              title="Se connecter"
              onPress={handleLogin}
              color="#4CAF50"
            />
            <Button
              title="Annuler"
              onPress={() => setShowLoginModal(false)}
              color="#ccc"
            />
          </View>
        </View>
      </Modal>
      {isAuthenticated && (
        <View style={styles.buttonContainer}>
          <Button
            title="Ajouter ma localisation"
            onPress={getLocation}
            color="#28a745"
          />
          <Button title="Déconnexion" onPress={handleLogout} color="#dc3545" />
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
                latitude: 51.505,
                longitude: -0.09,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }
        }
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
          >
            <Callout>
              <Text>
                Ta position actuelle:{"\n"}
                Latitude: {location.latitude}
                {"\n"}
                Longitude: {location.longitude}
              </Text>
            </Callout>
          </Marker>
        )}
        {locations.map((loc, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: loc.latitude,
              longitude: loc.longitude,
            }}
          >
            <Callout>
              <Text>
                Utilisateur: {loc.user}
                {"\n"}
                Latitude: {loc.latitude}
                {"\n"}
                Longitude: {loc.longitude}
                {"\n"}
                Timestamp: {new Date(loc.timestamp).toLocaleString()}
              </Text>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 10,
  },
  map: {
    width: "100%",
    height: 500,
  },
  modal: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 8,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 10,
  },
  input: {
    width: "100%",
    padding: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
  },
  errorText: {
    color: "red",
    fontSize: 16,
  },
  loadingText: {
    fontSize: 16,
  },
});

export default Map;
