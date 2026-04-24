import { postAcceptInvitation } from "@/utils/invitationAccept";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../context/auth";

/**
 * Landing lien d’invitation (e-mail / deep link).
 * Query : inviteToken + inviteRaceId (ou token + raceId).
 * Si non connecté → login avec les mêmes params ; si connecté → POST accept puis fiche course.
 */
export default function InviteLandingScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const params = useLocalSearchParams<{
    inviteToken?: string;
    inviteRaceId?: string;
    token?: string;
    raceId?: string;
  }>();
  const inviteToken = (params.inviteToken || params.token) as string | undefined;
  const raceId = (params.inviteRaceId || params.raceId) as string | undefined;
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (!inviteToken || !raceId) {
      router.replace("/");
      return;
    }

    const jwt = token;
    const loggedIn = !!user && !!jwt && !user.isVisitor;

    if (!loggedIn) {
      router.replace({
        pathname: "/login",
        params: {
          inviteToken: String(inviteToken),
          inviteRaceId: String(raceId),
        },
      });
      return;
    }

    started.current = true;
    (async () => {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      if (!API_URL || !jwt) {
        router.replace("/");
        return;
      }
      try {
        const res = await postAcceptInvitation(
          API_URL,
          jwt,
          String(inviteToken),
          String(raceId)
        );
        if (res.ok) {
          router.replace({
            pathname: "/RaceDetails",
            params: { raceId: String(raceId) },
          });
        } else {
          const err = await res.json().catch(() => ({}));
          Alert.alert(
            "Invitation",
            typeof err.message === "string"
              ? err.message
              : typeof err.error === "string"
                ? err.error
                : "Impossible d'accepter l'invitation."
          );
          router.replace("/");
        }
      } catch {
        Alert.alert("Invitation", "Erreur réseau.");
        router.replace("/");
      }
    })();
  }, [inviteToken, raceId, user, token, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#A1F763" />
      <Text style={styles.text}>Invitation…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    marginTop: 16,
    color: "#A1F763",
    fontSize: 15,
  },
});
