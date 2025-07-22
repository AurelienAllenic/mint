import CreateRace from "@/components/CreateRace/CreateRace";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuth } from "../../context/auth";

export default function CreateRacePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { gpxUri } = useLocalSearchParams<{ gpxUri?: string }>();

  // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
  if (!user) {
    router.replace("/login");
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#A1F763" />
        <Text>Redirection...</Text>
      </View>
    );
  }

  return <CreateRace user={user} initialGpxUri={gpxUri} />;
}
