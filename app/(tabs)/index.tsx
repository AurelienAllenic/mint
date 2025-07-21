import Map from "@/components/Map/Map";
import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "../../context/auth";
import { homeStyles } from "../../style/home.styles";

export default function HomeScreen() {
  const { user, logout } = useAuth();

  const createRace = () => {
    router.push({
      pathname: "/create-race",
      params: { user: JSON.stringify(user) },
    });
  };

  const createOrganisation = () => {
    router.push({
      pathname: "/create-organisation",
    });
  };

  const seeOrganisation = () => {
    router.push({
      pathname: "/see-organisations",
    });
  };

  const seeRaces = () => {
    router.push({
      pathname: "/see-races",
      params: { user: JSON.stringify(user) },
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={homeStyles.title}>Bienvenue {user?.name}</Text>
      <TextInput placeholder="Rechercher un coureur" style={homeStyles.input} />
      <Map user={user} />
      <TouchableOpacity style={homeStyles.button} onPress={logout}>
        <Text style={homeStyles.buttonText}>Se déconnecter</Text>
      </TouchableOpacity>
      { user?.isConnected && (
        <>
          <TouchableOpacity style={homeStyles.button} onPress={createOrganisation}>
            <Text style={homeStyles.buttonText}>Créer une organisation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={homeStyles.button} onPress={createRace}>
            <Text style={homeStyles.buttonText}>Créer une course</Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity style={homeStyles.button} onPress={seeOrganisation}>
        <Text style={homeStyles.buttonText}>Voir les organisations</Text>
      </TouchableOpacity>
      <TouchableOpacity style={homeStyles.button} onPress={seeRaces}>
        <Text style={homeStyles.buttonText}>Voir les courses disponibles</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
    backgroundColor: "#fff",
  },
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
