import { router } from "expo-router";
import { useState } from "react";
import { Button, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/auth";
import users from "../data/users.json";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleLogin = () => {
    const matchingUser = users.find(
      (user) => user.email === email && user.password === password
    );

    if (matchingUser) {
      login({ email: matchingUser.email, name: matchingUser.name });
      router.replace("/");
    } else {
      setError("Email ou mot de passe incorrect");
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 10 }}>Connexion</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setError("");
        }}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ marginBottom: 10, borderWidth: 1, padding: 8 }}
      />
      <TextInput
        placeholder="Mot de passe"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setError("");
        }}
        secureTextEntry
        style={{ marginBottom: 10, borderWidth: 1, padding: 8 }}
      />
      {error !== "" && (
        <Text style={{ color: "red", marginBottom: 10 }}>{error}</Text>
      )}
      <Button title="Se connecter" onPress={handleLogin} />
    </View>
  );
}
