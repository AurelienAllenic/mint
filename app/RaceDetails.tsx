import { useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useAuth } from "../context/auth";

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

const RaceDetails = () => {
  const routeNav = useRoute();
  const { token } = useAuth();
  const { raceId } = routeNav.params as { raceId: string };
  const [race, setRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRace = async () => {
      try {
        const API_URL = process.env.EXPO_PUBLIC_API_URL;
        if (!API_URL) {
          setError("API_URL non défini");
          setLoading(false);
          return;
        }
        const authHeader = token?.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;
        const response = await fetch(`${API_URL}/races/${raceId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setRace(data);
        } else {
          const text = await response.text();
          setError(`Erreur HTTP ${response.status}: ${text}`);
        }
      } catch (err) {
        setError("Erreur réseau ou serveur");
      } finally {
        setLoading(false);
      }
    };
    fetchRace();
  }, [raceId, token]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (error) return <Text style={{ color: "red", margin: 16 }}>{error}</Text>;
  if (!race) return <Text style={{ margin: 16 }}>Course introuvable</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{race.name}</Text>
      <Text style={styles.label}>ID : {race.id}</Text>
      <Text style={styles.label}>
        Départ : {race.startDate} {race.startTime}
      </Text>
      <Text style={styles.label}>
        Arrivée : {race.endDate} {race.endTime}
      </Text>
      <Text style={styles.label}>Créateur : {race.createdBy}</Text>
      <Text style={styles.label}>Coureurs : {race.runners?.join(", ")}</Text>
      {race.route && race.route.length > 0 && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={{
              latitude: race.route[0].latitude,
              longitude: race.route[0].longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Polyline
              coordinates={race.route}
              strokeColor="#007bff"
              strokeWidth={4}
            />
            <Marker coordinate={race.route[0]} title="Départ" />
            <Marker
              coordinate={race.route[race.route.length - 1]}
              title="Arrivée"
            />
          </MapView>
        </View>
      )}
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
  label: {
    fontSize: 16,
    marginBottom: 8,
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

export default RaceDetails;
