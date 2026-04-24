import * as FileSystem from "expo-file-system";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { DARK_MAP_STYLE } from "../../constants/map_styles";
import { calculateGPXRegion } from "../../utils/gpxParser";

const FILE_PATH = FileSystem.documentDirectory + "locations.json"; // Pas besoin de '/' avant locations.json car documentDirectory termine déjà par '/'

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

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

type ViewportMessage =
  | {
      type: "setView";
      latitude: number;
      longitude: number;
      latitudeDelta: number;
      longitudeDelta: number;
    }
  | {
      type: "fitBounds";
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
    };

interface MapProps {
  user: any;
  gpxCoordinates?: LatLng[];
  region?: MapRegion;
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
  const [mapReady, setMapReady] = useState(false);
  const [viewportCommand, setViewportCommand] =
    useState<ViewportMessage | null>(null);
  const webviewRef = useRef<WebView>(null);

  const sendMapMessage = (message: unknown) => {
    if (!webviewRef.current || !mapReady) {
      return;
    }
    webviewRef.current.postMessage(JSON.stringify(message));
  };

  const regionToBounds = (regionData: MapRegion) => ({
    minLat: regionData.latitude - regionData.latitudeDelta / 2,
    maxLat: regionData.latitude + regionData.latitudeDelta / 2,
    minLng: regionData.longitude - regionData.longitudeDelta / 2,
    maxLng: regionData.longitude + regionData.longitudeDelta / 2,
  });

  useEffect(() => {
    if (gpxCoordinates?.length) {
      const regionCalculated = calculateGPXRegion(gpxCoordinates);
      setViewportCommand({
        type: "setView",
        latitude: regionCalculated.latitude,
        longitude: regionCalculated.longitude,
        latitudeDelta: regionCalculated.latitudeDelta,
        longitudeDelta: regionCalculated.longitudeDelta,
      });
      setHasCentered(true);
      return;
    }

    if (region) {
      setViewportCommand({
        type: "setView",
        latitude: region.latitude,
        longitude: region.longitude,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
      });
      setHasCentered(true);
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
          "Erreur lors du chargement du fichier: " + (err?.message || err),
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
        },
      );
    })();
    return () => {
      subscription?.remove();
    };
  }, [user?.email]);

  useEffect(() => {
    if (
      location &&
      !hasCentered &&
      (!gpxCoordinates || gpxCoordinates.length === 0) &&
      !region &&
      !forceTrackCentering
    ) {
      // Ne centrer sur la position utilisateur que si :
      // - Il n'y a pas de tracé GPX
      // - Il n'y a pas de région fournie
      // - On ne force pas le centrage sur le tracé
      setViewportCommand({
        type: "setView",
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.07,
        longitudeDelta: 0.07,
      });
      setHasCentered(true);
    }
  }, [location, hasCentered, gpxCoordinates, region, forceTrackCentering]);

  useEffect(() => {
    const optimizedGpxCoordinates = optimizeTrack(gpxCoordinates ?? []);
    sendMapMessage({
      type: "updateData",
      payload: {
        gpxCoordinates: optimizedGpxCoordinates,
        location,
        locations,
        runnerPositions,
        userEmail: user?.email ?? "test@example.com",
      },
    });
  }, [
    mapReady,
    gpxCoordinates,
    location,
    locations,
    runnerPositions,
    user?.email,
  ]);

  useEffect(() => {
    if (!viewportCommand) return;

    if (viewportCommand.type === "fitBounds") {
      sendMapMessage({ type: "fitBounds", payload: viewportCommand });
      return;
    }

    const bounds = regionToBounds(viewportCommand);
    sendMapMessage({ type: "fitBounds", payload: bounds });
  }, [mapReady, viewportCommand]);

  useEffect(() => {
    if (mapReady) {
      return;
    }

    const timeout = setTimeout(() => {
      setError(
        (current) =>
          current ??
          "La carte Leaflet ne s'initialise pas (réseau/CDN indisponible).",
      );
    }, 5000);

    return () => clearTimeout(timeout);
  }, [mapReady]);

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

  const mapHtml = useMemo(
    () => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #111;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .leaflet-container {
      background: #111;
    }
    .map-tiles-dark {
      filter: brightness(3.25) contrast(2);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const post = (payload) => {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      } catch (_) {}
    };

    window.onerror = function(message) {
      post({ type: 'js-error', stage: 'window.onerror', message: String(message || 'unknown') });
    };

    if (!window.L) {
      post({ type: 'js-error', stage: 'leaflet-check', message: 'Leaflet CDN indisponible' });
    }

    const map = L.map('map', {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
    }).setView([48.8566, 2.3522], 12);

    const tileLayerConfig = ${JSON.stringify(DARK_MAP_STYLE)};
    const gpxColor = '#A1F763';
    const userColor = '#A1F763';

    const tileLayer = L.tileLayer(tileLayerConfig.url, {
      attribution: tileLayerConfig.attribution || '',
      subdomains: tileLayerConfig.subdomains || 'abc',
      maxZoom: 20,
      className: 'map-tiles-dark',
    });
    tileLayer.addTo(map);
    tileLayer.on('tileerror', () => post({ type: 'js-error', stage: 'tileerror', message: 'Erreur de chargement des tuiles carte' }));

    const gpxLayer = L.layerGroup().addTo(map);
    const usersLayer = L.layerGroup().addTo(map);
    const runnersLayer = L.layerGroup().addTo(map);

    const toLatLng = (coord) => [coord.latitude, coord.longitude];

    const drawData = (payload) => {
      if (!payload) return;

      gpxLayer.clearLayers();
      usersLayer.clearLayers();
      runnersLayer.clearLayers();

      const gpxCoordinates = payload.gpxCoordinates || [];
      const location = payload.location;
      const locations = payload.locations || [];
      const runnerPositions = payload.runnerPositions || [];
      const userEmail = payload.userEmail || 'test@example.com';

      if (gpxCoordinates.length > 1) {
        L.polyline(gpxCoordinates.map(toLatLng), {
          color: gpxColor,
          weight: 4,
          lineJoin: 'round',
        }).addTo(gpxLayer);
      }

      if (location) {
        L.circleMarker([location.latitude, location.longitude], {
          radius: 8,
          color: userColor,
          fillColor: userColor,
          fillOpacity: 1,
          weight: 2,
        })
          .bindPopup(
            'Position actuelle:<br/>Latitude: ' + Number(location.latitude).toFixed(6) +
            '<br/>Longitude: ' + Number(location.longitude).toFixed(6) +
            '<br/>Email: ' + userEmail
          )
          .addTo(usersLayer);
      }

      locations.forEach((loc) => {
        L.circleMarker([loc.lat, loc.long], {
          radius: 6,
          color: '#3B82F6',
          fillColor: '#3B82F6',
          fillOpacity: 0.9,
          weight: 2,
        })
          .bindPopup(
            'Email: ' + loc.user +
            '<br/>Latitude: ' + Number(loc.lat).toFixed(6) +
            '<br/>Longitude: ' + Number(loc.long).toFixed(6)
          )
          .addTo(usersLayer);
      });

      runnerPositions.forEach((runnerPos) => {
        const shortId = String(runnerPos.userId || '').substring(0, 8);
        L.circleMarker([runnerPos.latitude, runnerPos.longitude], {
          radius: 7,
          color: '#FF6B6B',
          fillColor: '#FF6B6B',
          fillOpacity: 1,
          weight: 2,
        })
          .bindPopup(
            '<b>Coureur</b><br/>ID: ' + shortId +
            '<br/>Lat: ' + Number(runnerPos.latitude).toFixed(6) +
            '<br/>Lon: ' + Number(runnerPos.longitude).toFixed(6)
          )
          .addTo(runnersLayer);
      });
    };

    const fitBounds = (payload) => {
      if (!payload) return;
      const sw = [payload.minLat, payload.minLng];
      const ne = [payload.maxLat, payload.maxLng];
      map.fitBounds([sw, ne], { padding: [24, 24], animate: true });
    };

    const handleMessage = (event) => {
      try {
        const message = JSON.parse(event.data || '{}');
        if (message.type === 'updateData') {
          drawData(message.payload);
        }
        if (message.type === 'fitBounds') {
          fitBounds(message.payload);
        }
      } catch (error) {
        post({ type: 'js-error', stage: 'handle-message', message: String(error || 'unknown') });
      }
    };

    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);

    post({ type: 'ready', stage: 'ready' });
  </script>
</body>
</html>
`,
    [],
  );

  const mapSource = useMemo(() => ({ html: mapHtml }), [mapHtml]);

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
      <WebView
        ref={webviewRef}
        style={styles.map}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        startInLoadingState
        source={mapSource}
        onHttpError={(event) => {
          const nativeEvent = event.nativeEvent;
          setError(
            `Erreur HTTP carte: ${nativeEvent.statusCode} ${nativeEvent.description}`,
          );
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data || "{}");
            if (data.type === "ready") {
              setMapReady(true);
              setError((current) =>
                current ===
                "La carte Leaflet ne s'initialise pas (réseau/CDN indisponible)."
                  ? null
                  : current,
              );
            }
            if (data.type === "js-error") {
              setError(
                `Erreur JavaScript carte: ${data.message || "inconnue"}`,
              );
            }
          } catch {
            // no-op
          }
        }}
        onError={() => {
          setError("Erreur de chargement de la carte Leaflet");
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111" },
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
    flex: 1,
    backgroundColor: "#111",
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
    position: "absolute",
    top: 100,
    left: 10,
    right: 10,
    zIndex: 1000,
  },
  rankingBlur: {
    borderRadius: 12,
    overflow: "hidden",
    padding: 12,
  },
  rankingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  rankingTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  rankingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  rankingPosition: {
    width: 40,
    alignItems: "center",
  },
  rankingPositionText: {
    color: "#A1F763",
    fontSize: 18,
    fontWeight: "bold",
  },
  rankingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rankingName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  rankingProgress: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
});

export default Map;
