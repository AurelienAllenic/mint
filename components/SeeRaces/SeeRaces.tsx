import { useAuth } from "@/context/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

interface User {
  _id: string;
  email: string;
  role?: string;
}

interface Race {
  _id: string;
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
  gpxFile?: string;
  owner?: User;
}

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

const SeeRaces: React.FC = () => {
  const { token } = useAuth();
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRaces = async () => {
      if (!token) {
        setError("Utilisateur non authentifié.");
        setLoading(false);
        return;
      }
      try {
        const API_URL = process.env.EXPO_PUBLIC_API_URL;
        if (!API_URL) throw new Error("API_URL non définie");
        const response = await fetch(`${API_URL}/race`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (response.status === 401) {
          throw new Error("Non autorisé : veuillez vous reconnecter.");
        }
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
        }
        const data = await response.json();
        console.log("Réponse API /race:", data);
        const racesData = Array.isArray(data) ? data : data.races || [];
        // On parse les GPX si besoin (support URL ou texte)
        const processedRaces = await Promise.all(
          racesData.map(async (race: Race) => {
            let route = race.route || [];
            if (race.gpxFile && (!route || route.length === 0)) {
              if (race.gpxFile.startsWith("http")) {
                try {
                  const gpxRes = await fetch(race.gpxFile);
                  const gpxText = await gpxRes.text();
                  route = parseGpx(gpxText);
                } catch (e) {
                  console.error("Erreur fetch GPX:", e);
                }
              } else {
                route = parseGpx(race.gpxFile);
              }
            }
            return {
              ...race,
              route,
              startLocation: route.length > 0 ? route[0] : race.startLocation,
              endLocation:
                route.length > 0 ? route[route.length - 1] : race.endLocation,
            };
          })
        );
        setRaces(processedRaces);
      } catch (err: any) {
        setError(err.message || "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };
    fetchRaces();
  }, [token]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("fr-FR");

  const getInitialRegion = (
    coords: { latitude: number; longitude: number }[]
  ) => {
    if (!coords || coords.length === 0) {
      return {
        latitude: 48.8566,
        longitude: 2.3522,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }
    const lats = coords.map((c) => c.latitude);
    const lngs = coords.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.5 || 0.1,
      longitudeDelta: (maxLng - minLng) * 1.5 || 0.1,
    };
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Chargement des courses...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Erreur: {error}</Text>
      </View>
    );
  }
  if (races.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Aucune course trouvée.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Liste des courses</Text>
      <FlatList
        data={races}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.name}>{item.name}</Text>
            <Text>Date de début : {formatDate(item.startDate)}</Text>
            <Text>Date de fin : {formatDate(item.endDate)}</Text>
            <Text>Créateur : {item.owner?.email || "Inconnu"}</Text>
            {console.log("GPX route for", item.name, item.route)}
            {item.route && item.route.length > 0 ? (
              <MapView
                style={styles.map}
                region={getInitialRegion(item.route)}
                scrollEnabled={true}
                zoomEnabled={true}
              >
                <Marker
                  coordinate={item.route[0]}
                  pinColor="green"
                  title="Départ"
                />
                <Marker
                  coordinate={item.route[item.route.length - 1]}
                  pinColor="red"
                  title="Arrivée"
                />
                <Polyline
                  coordinates={item.route}
                  strokeColor="#007AFF"
                  strokeWidth={3}
                />
              </MapView>
            ) : (
              <Text style={{ color: "red" }}>Aucun tracé GPX</Text>
            )}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  item: {
    marginBottom: 24,
    backgroundColor: "#f4f4f4",
    padding: 12,
    borderRadius: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  error: {
    color: "red",
  },
  map: {
    width: "100%",
    height: 200,
    marginTop: 12,
    borderRadius: 8,
  },
});

export default SeeRaces;
