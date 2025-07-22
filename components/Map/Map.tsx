import * as FileSystem from "expo-file-system";
import React, { useEffect, useRef, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import MapView, {
  Callout,
  Marker,
  PROVIDER_GOOGLE,
  Polyline,
} from "react-native-maps";
import { calculateGPXRegion } from "../../utils/gpxParser";

const FILE_PATH = FileSystem.documentDirectory + "/locations.json";

// Types pour la sécurité et la correction des erreurs
interface UserLocation {
  user: string;
  lat: number;
  long: number;
}
interface LatLng {
  latitude: number;
  longitude: number;
}

interface MapProps {
  user: { email?: string };
  gpxCoordinates: { latitude: number; longitude: number }[];
  region?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

const Map: React.FC<MapProps> = ({ user, gpxCoordinates, region }) => {
  const [location] = useState<LatLng | null>(null);
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Ajuster la vue quand le GPX change
  useEffect(() => {
    if (gpxCoordinates && gpxCoordinates.length > 0 && mapRef.current) {
      const region = calculateGPXRegion(gpxCoordinates);
      // On annule toute animation précédente avant de centrer sur le nouveau tracé
      mapRef.current.animateToRegion(region, 1000);
    }
  }, [gpxCoordinates]);

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
      } catch (err: any) {
        setError(
          "Erreur lors du chargement du fichier: " + (err?.message || err)
        );
        console.error("Lecture fichier erreur :", err);
      }
    })();
  }, []);

  const DOWNSAMPLE_STEP = 10; // Garde 1 point sur 15
  function downsampleCoordinates(
    coords: LatLng[],
    step: number = DOWNSAMPLE_STEP
  ) {
    if (!coords || coords.length <= step) return coords;
    return coords.filter((_, i) => i % step === 0);
  }

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
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        customMapStyle={darkMapStyle}
      >
        {/* Affichage du tracé GPX : un seul tracé à la fois, pas de superposition */}
        {gpxCoordinates && gpxCoordinates.length > 1 && (
          <Polyline
            coordinates={downsampleCoordinates(gpxCoordinates)}
            strokeColor="#A1F763"
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        )}
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

      {/* <View style={styles.buttonContainer}>
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
      </View> */}
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
    height: "100%",
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

// Ajout du style dark officiel Google Maps
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "administrative.country",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
  {
    featureType: "administrative.land_parcel",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#bdbdbd" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#181818" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#1b1b1b" }],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ color: "#2c2c2c" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a8a8a" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#373737" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3c3c3c" }],
  },
  {
    featureType: "road.highway.controlled_access",
    elementType: "geometry",
    stylers: [{ color: "#4e4e4e" }],
  },
  {
    featureType: "road.local",
    elementType: "geometry",
    stylers: [{ color: "#212121" }],
  },
  {
    featureType: "transit",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#000000" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#3d3d3d" }],
  },
];

export default Map;
