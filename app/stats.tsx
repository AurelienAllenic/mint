import { usePremiumStatus } from "@/utils/getPremiumStatus";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/auth";

interface RaceStats {
  raceId: string;
  raceName: string;
  startDate: string;
  endDate: string;
  finalRank: number;
  totalParticipants: number;
  totalDistance: number; // en mètres
  progressHistory: { timestamp: string; progress: number; rank: number }[];
  averageSpeed?: number;
  maxSpeed?: number;
  minSpeed?: number;
}

export default function StatsPage() {
  const router = useRouter();
  const isPremium = usePremiumStatus();
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [completedRaces, setCompletedRaces] = useState<any[]>([]);
  const [selectedRace, setSelectedRace] = useState<string | null>(null);
  const [raceStats, setRaceStats] = useState<RaceStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Récupérer les courses terminées
  useEffect(() => {
    if (!isPremium || !token) return;

    const fetchCompletedRaces = async () => {
      setLoading(true);
      try {
        const API_URL =
          process.env.EXPO_PUBLIC_API_URL ||
          "https://back-mint-node.vercel.app";
        const authHeader = token.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;

        const response = await fetch(`${API_URL}/race`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const now = new Date();
          const userId = user?._id;

          // Filtrer UNIQUEMENT les courses terminées que le coureur connecté a complétées
          const completed = data.filter((race: any) => {
            // 1. La course doit être terminée
            if (!race.endDate) return false;
            const endDate = new Date(race.endDate);
            const isFinished = endDate < now;
            if (!isFinished) return false;

            // 2. L'utilisateur doit être dans les participants
            const isParticipant = race.runners?.some((runner: any) => {
              const runnerId = runner._id || runner.id || runner;
              return String(runnerId) === String(userId);
            });
            if (!isParticipant) return false;

            // 3. On considère qu'une course est "complétée" si elle est terminée et que l'utilisateur y a participé
            // (Le backend devrait avoir un flag "completed" ou des stats pour confirmer)
            return true;
          });

          console.log(
            `📊 [Stats] Courses complétées trouvées: ${completed.length}`,
          );
          setCompletedRaces(completed);
        }
      } catch (error) {
        console.error(
          "Erreur lors du chargement des courses terminées:",
          error,
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedRaces();
  }, [isPremium, token, user?._id]);

  // Récupérer les stats d'une course
  const fetchRaceStats = async (raceId: string) => {
    setLoadingStats(true);
    setSelectedRace(raceId);
    try {
      const API_URL =
        process.env.EXPO_PUBLIC_API_URL || "https://back-mint-node.vercel.app";
      const authHeader = token?.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;

      // TODO: Remplacer par l'endpoint réel du backend pour les stats
      // Pour l'instant, on simule avec les données de la course
      const response = await fetch(`${API_URL}/race/${raceId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
      });

      if (response.ok) {
        const raceData = await response.json();
        const userId = user?._id;

        // Vérifier que l'utilisateur connecté a bien participé à cette course
        const userParticipated = raceData.runners?.some((runner: any) => {
          const runnerId = runner._id || runner.id || runner;
          return String(runnerId) === String(userId);
        });

        if (!userParticipated) {
          console.warn(
            "⚠️ [Stats] L'utilisateur n'a pas participé à cette course",
          );
          setLoadingStats(false);
          return;
        }

        // Essayer d'abord l'endpoint de stats (si disponible)
        try {
          const statsResponse = await fetch(`${API_URL}/race/${raceId}/stats`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
            },
          });

          if (statsResponse.ok) {
            // Si l'endpoint stats existe, utiliser les vraies données
            const statsData = await statsResponse.json();
            const stats: RaceStats = {
              raceId: statsData.raceId || raceId,
              raceName: statsData.raceName || raceData.name,
              startDate: statsData.startDate || raceData.startDate,
              endDate: statsData.endDate || raceData.endDate,
              finalRank: statsData.finalRank,
              totalParticipants:
                statsData.totalParticipants || raceData.runners?.length || 0,
              totalDistance: statsData.totalDistance,
              progressHistory: statsData.progressHistory || [],
              averageSpeed: statsData.averageSpeed,
              maxSpeed: statsData.maxSpeed,
              minSpeed: statsData.minSpeed,
            };
            console.log(
              `✅ [Stats] Stats réelles chargées pour: ${raceData.name}`,
            );
            setRaceStats(stats);
            return;
          }
        } catch (statsError) {
          console.log(
            "ℹ️ [Stats] Endpoint /stats non disponible, utilisation de données simulées",
          );
        }

        // Sinon, simuler des stats (à remplacer par les vraies stats du backend)
        const stats: RaceStats = {
          raceId: raceData._id || raceData.id,
          raceName: raceData.name,
          startDate: raceData.startDate,
          endDate: raceData.endDate,
          finalRank: 1, // À récupérer du backend
          totalParticipants: raceData.runners?.length || 0,
          totalDistance: 25000, // À récupérer du backend (en mètres)
          progressHistory: [
            { timestamp: raceData.startDate, progress: 0, rank: 1 },
            {
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              progress: 10000,
              rank: 1,
            },
            {
              timestamp: new Date(Date.now() - 1800000).toISOString(),
              progress: 20000,
              rank: 1,
            },
            { timestamp: raceData.endDate, progress: 25000, rank: 1 },
          ],
        };

        console.log(
          `📊 [Stats] Stats simulées chargées pour: ${raceData.name}`,
        );
        setRaceStats(stats);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (!isPremium) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/")}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.banner}>
          <Icon name="crown" size={28} color="#fff" />
          <Text style={styles.bannerText}>
            Vous souhaitez accèder à des statistiques plus avancées ?
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.button}
            onPress={() => router.push("/premium")}
          >
            <Text style={styles.buttonText}>S'abonner à premium</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#A1F763" />
        <Text style={styles.loadingText}>Chargement des courses...</Text>
      </View>
    );
  }

  if (raceStats) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setRaceStats(null)}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color="#A1F763" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{raceStats.raceName}</Text>
        </View>

        {/* Stats principales */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="trophy" size={32} color="#A1F763" />
            <Text style={styles.statValue}>#{raceStats.finalRank}</Text>
            <Text style={styles.statLabel}>Rang final</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="map-marker-distance" size={32} color="#A1F763" />
            <Text style={styles.statValue}>
              {(raceStats.totalDistance / 1000).toFixed(2)} km
            </Text>
            <Text style={styles.statLabel}>Distance totale</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="account-group" size={32} color="#A1F763" />
            <Text style={styles.statValue}>{raceStats.totalParticipants}</Text>
            <Text style={styles.statLabel}>Participants</Text>
          </View>
        </View>

        {/* Graphique de progression */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Progression de la course</Text>
          <ProgressChart data={raceStats.progressHistory} />
        </View>

        {/* Graphique de classement */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Évolution du classement</Text>
          <RankingChart data={raceStats.progressHistory} />
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/")}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statistiques avancées</Text>
        <Icon name="chart-line" size={28} color="#A1F763" />
      </View>

      {completedRaces.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="trophy-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>Aucune course terminée</Text>
          <Text style={styles.emptySubtext}>
            Participez à des courses pour voir vos statistiques ici
          </Text>
        </View>
      ) : (
        <FlatList
          data={completedRaces}
          keyExtractor={(item) => item._id || item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.raceCard}
              onPress={() => fetchRaceStats(item._id || item.id)}
            >
              <BlurView style={styles.raceCardBlur} intensity={40} tint="dark">
                <View style={styles.raceCardContent}>
                  <View style={styles.raceCardHeader}>
                    <Text style={styles.raceCardTitle}>{item.name}</Text>
                    <Icon name="chevron-right" size={24} color="#A1F763" />
                  </View>
                  <Text style={styles.raceCardDate}>
                    {new Date(item.endDate).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                  <Text style={styles.raceCardParticipants}>
                    {item.runners?.length || 0} participants
                  </Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

// Composant graphique de progression (version simplifiée avec barres)
const ProgressChart = ({ data }: { data: RaceStats["progressHistory"] }) => {
  const maxProgress = Math.max(...data.map((d) => d.progress));

  return (
    <View style={styles.chartWrapper}>
      <View style={styles.barChartContainer}>
        {data.map((d, index) => {
          const height = (d.progress / maxProgress) * 100;
          return (
            <View key={index} style={styles.barChartItem}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      height: `${height}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>
                {(d.progress / 1000).toFixed(1)}km
              </Text>
              <Text style={styles.barTimeLabel}>
                {new Date(d.timestamp).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Composant graphique de classement (version simplifiée avec barres)
const RankingChart = ({ data }: { data: RaceStats["progressHistory"] }) => {
  const maxRank = Math.max(...data.map((d) => d.rank));
  const minRank = 1;

  return (
    <View style={styles.chartWrapper}>
      <View style={styles.barChartContainer}>
        {data.map((d, index) => {
          const rankRatio = ((d.rank - minRank) / (maxRank - minRank)) * 100;
          const height = 100 - rankRatio; // Inversé pour que #1 soit en haut
          return (
            <View key={index} style={styles.barChartItem}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.rankingBar,
                    {
                      height: `${height}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>#{d.rank}</Text>
              <Text style={styles.barTimeLabel}>
                {new Date(d.timestamp).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1112",
  },
  centerContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    padding: 8,
    backgroundColor: "rgba(161, 247, 99, 0.1)",
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#A1F763",
    flex: 1,
    textAlign: "center",
  },
  banner: {
    width: "90%",
    backgroundColor: "#D4AF37",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: "center",
    marginVertical: 20,
    alignSelf: "center",
  },
  bannerText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 16,
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#B8860B",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  loadingText: {
    color: "#A1F763",
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
  },
  emptySubtext: {
    color: "#888",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  listContent: {
    padding: 20,
  },
  raceCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  raceCardBlur: {
    borderRadius: 16,
    backgroundColor: "rgba(105, 105, 105, 0.18)",
    overflow: "hidden",
  },
  raceCardContent: {
    padding: 16,
  },
  raceCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  raceCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  raceCardDate: {
    fontSize: 14,
    color: "#888",
    marginBottom: 4,
  },
  raceCardParticipants: {
    fontSize: 12,
    color: "#A1F763",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(161, 247, 99, 0.1)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(161, 247, 99, 0.3)",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#A1F763",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: "rgba(15, 15, 15, 0.8)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  chartWrapper: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
    padding: 16,
  },
  barChartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    width: "100%",
    height: 200,
  },
  barChartItem: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 4,
  },
  barContainer: {
    width: "100%",
    height: 150,
    justifyContent: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  progressBar: {
    width: "100%",
    backgroundColor: "#A1F763",
    borderRadius: 4,
    minHeight: 4,
  },
  rankingBar: {
    width: "100%",
    backgroundColor: "#FF6B6B",
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    color: "#A1F763",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 8,
    textAlign: "center",
  },
  barTimeLabel: {
    color: "#888",
    fontSize: 10,
    marginTop: 4,
    textAlign: "center",
  },
});
