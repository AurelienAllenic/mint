import * as FileSystem from "expo-file-system";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

import MapView, {
  Callout,
  Marker,
  PROVIDER_GOOGLE,
  Polyline,
} from "react-native-maps";
import { calculateGPXRegion } from "../../utils/gpxParser";

const FILE_PATH = FileSystem.documentDirectory + "locations.json"; // Pas besoin de '/' avant locations.json car documentDirectory termine déjà par '/'
const pointerImg = require("../../assets/images/pointer.png");

interface UserLocation {
  user: string;
  lat: number;
  long: number;
}
interface LatLng {
  latitude: number;
  longitude: number;
}

interface RunnerPosition {
  userId: string;
  latitude: number;
  longitude: number;
}

interface MapProps {
  user: any;
  gpxCoordinates?: LatLng[];
  region?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  forceTrackCentering?: boolean;
  runnerPositions?: RunnerPosition[]; // NOUVEAU
}

const Map: React.FC<MapProps> = ({
  user,
  gpxCoordinates,
  region,
  forceTrackCentering = false,
  runnerPositions = [], // NOUVEAU
}) => {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Pour gérer le loading, mieux avec setLoading
  const [hasCentered, setHasCentered] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (gpxCoordinates?.length && mapRef.current) {
      const regionCalculated = calculateGPXRegion(gpxCoordinates);
      setTimeout(() => {
        mapRef.current?.animateToRegion(regionCalculated, 2000);
        setHasCentered(true); // Empêcher le centrage sur la position utilisateur
      }, 500);
    } else if (region && mapRef.current) {
      // Si une région est fournie en prop (par exemple depuis RaceDetails), l'utiliser
      setTimeout(() => {
        mapRef.current?.animateToRegion(region, 2000);
        setHasCentered(true);
      }, 500);
    }
  }, [gpxCoordinates, region]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const fileInfo = await FileSystem.getInfoAsync(FILE_PATH);
        if (!fileInfo.exists) {
          console.warn("Fichier inexistant, création...");
          await FileSystem.writeAsStringAsync(FILE_PATH, JSON.stringify([]));
        }
        const content = await FileSystem.readAsStringAsync(FILE_PATH);
        const parsed: UserLocation[] = JSON.parse(content);
        setLocations(parsed);
        setError(null);
      } catch (err: any) {
        setError(
          "Erreur lors du chargement du fichier: " + (err?.message || err)
        );
        console.error("Lecture fichier erreur :", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Permission de localisation refusée");
        return;
      }
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 1,
        },
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        }
      );
    })();
    return () => {
      subscription?.remove();
    };
  }, [user]);

  useEffect(() => {
    if (
      location &&
      mapRef.current &&
      !hasCentered &&
      (!gpxCoordinates || gpxCoordinates.length === 0) &&
      !region &&
      !forceTrackCentering
    ) {
      // Ne centrer sur la position utilisateur que si :
      // - Il n'y a pas de tracé GPX
      // - Il n'y a pas de région fournie
      // - On ne force pas le centrage sur le tracé
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.07,
          longitudeDelta: 0.07,
        },
        500
      );
      setHasCentered(true);
    }
  }, [location, hasCentered, gpxCoordinates, region, forceTrackCentering]);

  // Fonction d'optimisation intelligente du tracé
  const optimizeTrack = (coords: LatLng[]) => {
    if (!coords || coords.length <= 30) return coords;

    // Algorithme de simplification Douglas-Peucker simplifié
    const simplified = [];
    const step = Math.max(1, Math.floor(coords.length / 25)); // Maximum 25 points

    // Toujours garder le premier point
    simplified.push(coords[0]);

    // Ajouter des points intermédiaires avec un pas adaptatif
    for (let i = step; i < coords.length - step; i += step) {
      simplified.push(coords[i]);
    }

    // Toujours garder le dernier point
    if (coords.length > 1) {
      simplified.push(coords[coords.length - 1]);
    }

    return simplified;
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
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        customMapStyle={[
          ...darkMapStyle,
          {
            featureType: "poi",
            elementType: "labels.icon",
            stylers: [{ visibility: "off" }],
          },
        ]}
      >
        {gpxCoordinates && gpxCoordinates.length > 1 && (
          <Polyline
            coordinates={optimizeTrack(gpxCoordinates)}
            strokeColor="#A1F763"
            strokeWidth={4}
            lineJoin="round"
            lineCap="round"
            miterLimit={10}
            geodesic={true}
            lineDashPattern={[1]}
          />
        )}
        {location && (
          <Marker coordinate={location} image={pointerImg}>
            <Callout>
              <Text>
                Position actuelle:{"\n"}
                Latitude: {location.latitude.toFixed(6)}
                {"\n"}
                Longitude: {location.longitude.toFixed(6)}
                {"\n"}
                Email: {user?.email ?? "test@example.com"}
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
                Latitude: {loc.lat.toFixed(6)}
                {"\n"}
                Longitude: {loc.long.toFixed(6)}
              </Text>
            </Callout>
          </Marker>
        ))}

        {/* NOUVEAU : Marqueurs pour les positions des coureurs */}
        {runnerPositions && runnerPositions.length > 0 && runnerPositions.map((runnerPos) => (
          <Marker
            key={runnerPos.userId}
            coordinate={{
              latitude: runnerPos.latitude,
              longitude: runnerPos.longitude,
            }}
            pinColor="#FF6B6B"
            title={`Coureur ${runnerPos.userId.substring(0, 8)}`}
          >
            <Callout>
              <Text style={{ fontWeight: 'bold' }}>Coureur</Text>
              <Text>ID: {runnerPos.userId.substring(0, 8)}</Text>
              <Text>Lat: {runnerPos.latitude.toFixed(6)}</Text>
              <Text>Lon: {runnerPos.longitude.toFixed(6)}</Text>
            </Callout>
          </Marker>
        ))}
      </MapView>
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
    zIndex: 10,
  },
  loadingContainer: {
    position: "absolute",
    top: 10,
    width: "100%",
    alignItems: "center",
    zIndex: 10,
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
  rankingContainer: {
    position: 'absolute',
    top: 100,
    left: 10,
    right: 10,
    zIndex: 1000,
  },
  rankingBlur: {
    borderRadius: 12,
    overflow: 'hidden',
    padding: 12,
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  rankingPosition: {
    width: 40,
    alignItems: 'center',
  },
  rankingPositionText: {
    color: '#A1F763',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rankingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rankingName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rankingProgress: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
});

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#A1F763" }] },
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
