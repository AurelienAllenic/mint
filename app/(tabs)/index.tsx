import { Image } from "expo-image";
import { Button, StyleSheet, Text, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { useAuth } from "../../context/auth";
import { homeStyles } from "../../style/home.styles";
import Map from "@/components/Map/Map";

export default function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <ScrollView style={homeStyles.container}>
      <Text style={homeStyles.title}>Bienvenue {user?.name}</Text>
      <TextInput
        placeholder="Rechercher un coureur"
        style={homeStyles.input}
      />
      <Map user={user} />
      <TouchableOpacity style={homeStyles.button} onPress={logout}>
        <Text style={homeStyles.buttonText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
