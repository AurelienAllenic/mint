import { router } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../context/auth";

export default function Index() {
  const { user } = useAuth();
  useEffect(() => {
    if (user) {
      router.replace("/(tabs)"); // Redirige vers HomeScreen si connecté
    } else {
      router.replace("/welcome"); // Redirige vers Welcome si non connecté
    }
  }, [user]);
  return null;
}
