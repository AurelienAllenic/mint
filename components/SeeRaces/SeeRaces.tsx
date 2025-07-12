import * as FileSystem from "expo-file-system";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface User {
  email: string;
  name: string;
  role: string;
}

interface Race {
  id: string;
  name: string;
  createdBy: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  startLocation: { latitude: number; longitude: number };
  endLocation: { latitude: number; longitude: number };
  routeLength: number;
  runnersCount: number;
  gpxFileName: string;
}

const DATA_DIR = `${FileSystem.documentDirectory}data/`;
const RACES_FILE_PATH = `${DATA_DIR}races.json`;

const UserRacesList: React.FC<{ user: User }> = ({ user }) => {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les courses au montage du composant
  useEffect(() => {
    const loadRaces = async () => {
      setLoading(true);
      try {
        const dirInfo = await FileSystem.getInfoAsync(DATA_DIR);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(DATA_DIR, {
            intermediates: true,
          });
        }

        if (!(await FileSystem.getInfoAsync(RACES_FILE_PATH)).exists) {
          await FileSystem.writeAsStringAsync(RACES_FILE_PATH, "[]");
        }

        const raw = await FileSystem.readAsStringAsync(RACES_FILE_PATH);
        const allRaces: Race[] = JSON.parse(raw);
        // Filtrer les courses créées par l'utilisateur connecté
        const userRaces = allRaces.filter(
          (race) => race.createdBy === user.email
        );
        setRaces(userRaces);
      } catch (err) {
        console.error("Erreur lors du chargement des courses :", err);
        setError("Impossible de charger les courses");
      } finally {
        setLoading(false);
      }
    };

    loadRaces();
  }, [user.email]);

  // Rendu de chaque élément de la liste
  const renderRaceItem = ({ item }: { item: Race }) => (
    <TouchableOpacity style={styles.raceCard}>
      <Text style={styles.raceTitle}>{item.name}</Text>
      <Text style={styles.raceInfo}>
        📅 Début : {item.startDate} à {item.startTime}
      </Text>
      <Text style={styles.raceInfo}>
        🏁 Fin : {item.endDate} à {item.endTime}
      </Text>
      <Text style={styles.raceInfo}>👥 Coureurs : {item.runnersCount}</Text>
      <Text style={styles.raceInfo}>
        📏 Distance : {item.routeLength} points
      </Text>
      <Text style={styles.raceInfo}>
        📍 Départ : ({item.startLocation.latitude.toFixed(4)},{" "}
        {item.startLocation.longitude.toFixed(4)})
      </Text>
      <Text style={styles.raceInfo}>
        📍 Arrivée : ({item.endLocation.latitude.toFixed(4)},{" "}
        {item.endLocation.longitude.toFixed(4)})
      </Text>
      <Text style={styles.raceInfo}>📄 Fichier GPX : {item.gpxFileName}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={styles.clearError}>Effacer</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <Text style={styles.loadingText}>Chargement des courses...</Text>
      ) : races.length === 0 ? (
        <Text style={styles.emptyText}>
          Aucune course créée pour le moment.
        </Text>
      ) : (
        <FlatList
          data={races}
          renderItem={renderRaceItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  raceCard: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  raceTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  raceInfo: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
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
  clearError: {
    color: "#007AFF",
    textAlign: "center",
  },
  loadingText: {
    fontSize: 16,
    textAlign: "center",
    color: "#555",
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    color: "#888",
    marginTop: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
});

export default UserRacesList;
