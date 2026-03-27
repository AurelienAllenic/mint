import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { postAcceptInvitation } from "@/utils/invitationAccept";
import { useAuth } from "../context/auth";

interface Invitation {
  _id: string;
  token: string; // Token pour accepter/refuser l'invitation
  raceId: {
    _id: string;
    name: string;
    startDate: string;
    endDate?: string;
    organization?: {
      name: string;
    };
  };
  email: string;
  status: "pending" | "accepted" | "declined";
  invitedBy: {
    email: string;
    firstname?: string;
    lastname?: string;
  };
  createdAt: string;
}

export default function NotificationsScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  const fetchInvitations = useCallback(async () => {
    if (!token || !API_URL) return;

    try {
      const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      const response = await fetch(`${API_URL}/invitations/my-invitations`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      } else {
        console.error("Erreur récupération invitations");
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, API_URL]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvitations();
  }, [fetchInvitations]);

  const handleAccept = async (invitationToken: string, raceId: string) => {
    try {
      if (!API_URL || !token) return;
      const response = await postAcceptInvitation(
        API_URL,
        token,
        invitationToken,
        raceId
      );

      if (response.ok) {
        const data = await response.json();
        Alert.alert("Succès", "Invitation acceptée !", [
          {
            text: "Voir la course",
            onPress: () => {
              const invitation = invitations.find((inv) => inv.token === invitationToken);
              if (invitation) {
                router.push(`/RaceDetails?raceId=${invitation.raceId._id}`);
              } else if (data.race?._id) {
                router.push(`/RaceDetails?raceId=${data.race._id}`);
              }
            },
          },
          { text: "OK" },
        ]);
        fetchInvitations();
      } else {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
        Alert.alert("Erreur", errorData.error || "Impossible d'accepter l'invitation");
      }
    } catch (error) {
      console.error("Erreur acceptation:", error);
      Alert.alert("Erreur", "Impossible d'accepter l'invitation");
    }
  };

  const handleDecline = async (invitationToken: string) => {
    Alert.alert(
      "Décliner l'invitation",
      "Êtes-vous sûr de vouloir décliner cette invitation ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Décliner",
          style: "destructive",
          onPress: async () => {
            try {
              const authHeader = token?.startsWith("Bearer ") ? token : `Bearer ${token}`;
              const response = await fetch(`${API_URL}/invitations/token/${invitationToken}/reject`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: authHeader,
                },
              });

              if (response.ok) {
                Alert.alert("Succès", "Invitation déclinée");
                fetchInvitations();
              } else {
                const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
                Alert.alert("Erreur", errorData.error || "Impossible de décliner l'invitation");
              }
            } catch (error) {
              console.error("Erreur déclin:", error);
              Alert.alert("Erreur", "Impossible de décliner l'invitation");
            }
          },
        },
      ]
    );
  };

  const renderInvitation = ({ item }: { item: Invitation }) => {
    const isPending = item.status === "pending";
    const raceDate = new Date(item.raceId.startDate).toLocaleDateString("fr-FR");

    return (
      <View style={styles.invitationCard}>
        <BlurView intensity={40} tint="dark" style={styles.invitationBlur}>
          <View style={styles.invitationHeader}>
            <View style={styles.invitationIconContainer}>
              <Icon
                name={isPending ? "email-outline" : item.status === "accepted" ? "check-circle" : "close-circle"}
                size={24}
                color={isPending ? "#A1F763" : item.status === "accepted" ? "#A1F763" : "#FF6B6B"}
              />
            </View>
            <View style={styles.invitationInfo}>
              <Text style={styles.invitationTitle}>{item.raceId.name}</Text>
              <Text style={styles.invitationSubtitle}>
                Invité par {item.invitedBy.firstname && item.invitedBy.lastname
                  ? `${item.invitedBy.firstname} ${item.invitedBy.lastname}`
                  : item.invitedBy.email}
              </Text>
              <Text style={styles.invitationDate}>Date : {raceDate}</Text>
              {item.raceId.organization?.name && (
                <Text style={styles.invitationOrg}>{item.raceId.organization.name}</Text>
              )}
            </View>
          </View>

          {isPending && (
            <View style={styles.invitationActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() =>
                  handleAccept(item.token, item.raceId._id)
                }
              >
                <Icon name="check" size={20} color="#000" />
                <Text style={styles.acceptButtonText}>Accepter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={() => handleDecline(item.token)}
              >
                <Icon name="close" size={20} color="#fff" />
                <Text style={styles.declineButtonText}>Décliner</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.status === "accepted" && (
            <TouchableOpacity
              style={styles.viewRaceButton}
              onPress={() => router.push(`/RaceDetails?raceId=${item.raceId._id}`)}
            >
              <Text style={styles.viewRaceButtonText}>Voir la course</Text>
              <Icon name="chevron-right" size={20} color="#A1F763" />
            </TouchableOpacity>
          )}
        </BlurView>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A1F763" />
        <Text style={styles.loadingText}>Chargement des invitations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes invitations</Text>
      </View>

      {invitations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="email-outline" size={80} color="#666" />
          <Text style={styles.emptyText}>Aucune invitation</Text>
          <Text style={styles.emptySubtext}>
            Vous recevrez une notification ici lorsque vous serez invité à une course.
          </Text>
        </View>
      ) : (
        <FlatList
          data={invitations}
          renderItem={renderInvitation}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1F763" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0F0F",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
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
    fontWeight: "600",
    marginTop: 20,
  },
  emptySubtext: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
  listContent: {
    padding: 20,
  },
  invitationCard: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: "hidden",
  },
  invitationBlur: {
    backgroundColor: "rgba(30, 30, 30, 0.8)",
    padding: 20,
  },
  invitationHeader: {
    flexDirection: "row",
    marginBottom: 15,
  },
  invitationIconContainer: {
    marginRight: 15,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  invitationSubtitle: {
    color: "#A1F763",
    fontSize: 14,
    marginBottom: 5,
  },
  invitationDate: {
    color: "#888",
    fontSize: 12,
    marginBottom: 3,
  },
  invitationOrg: {
    color: "#888",
    fontSize: 12,
  },
  invitationActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
  },
  acceptButton: {
    backgroundColor: "#A1F763",
  },
  acceptButtonText: {
    color: "#000",
    fontWeight: "bold",
    marginLeft: 8,
  },
  declineButton: {
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },
  declineButtonText: {
    color: "#FF6B6B",
    fontWeight: "600",
    marginLeft: 8,
  },
  viewRaceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(161, 247, 99, 0.1)",
    borderWidth: 1,
    borderColor: "#A1F763",
  },
  viewRaceButtonText: {
    color: "#A1F763",
    fontWeight: "600",
    marginRight: 8,
  },
});
