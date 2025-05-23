import { View, Text, Button } from "react-native";
import { useAuth } from "../../context/auth";
import users from "../../data/users.json"; 
import { Image } from "expo-image";
import { StyleSheet } from "react-native";

import Map from "@/components/Map/Map";
import ParallaxScrollView from "@/components/ParallaxScrollView";

export default function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <Text>Bienvenue {user?.name}</Text>
      <Button title="Se déconnecter" onPress={logout} />
      <Map />
    </ParallaxScrollView>
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
