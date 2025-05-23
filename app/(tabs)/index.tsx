import { View, Text, Button } from "react-native";
import { useAuth } from "../../context/auth";
import users from "../../data/users.json"; 

export default function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={{ padding: 20 }}>
      <Text>Bienvenue {user?.name}</Text>
      <Button title="Se déconnecter" onPress={logout} />
    </View>
  );
}
