"use client";

import { router } from "expo-router";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View, Image } from "react-native";
import { useAuth } from "../context/auth";
import { loginStyles } from "../style/login.styles";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const { login } = useAuth();

  const handleLogin = async () => {

    const API_URL = process.env.EXPO_PUBLIC_API_URL;

    const matchingUser = await fetch(
      `${API_URL}/auth/login`,
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Response:", matchingUser);

    if (matchingUser.ok) {
      const data = await matchingUser.json();
      console.log("User data:", data);
      login({ email: data.email, name: data.name });
      router.replace("/");
    } else {
      setError("Email ou mot de passe incorrect");
    }
  };

  return (
    <View style={loginStyles.container}>
      <View style={loginStyles.header}>
        <Text style={loginStyles.title}>Connexion</Text>
      </View>

      <View style={loginStyles.inputContainer}>
        <Text style={loginStyles.inputLabel}>E-mail</Text>
        <TextInput
          placeholder="E-mail"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError("");
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[
            loginStyles.input,
            focusedInput === "email" && loginStyles.inputFocused,
          ]}
          onFocus={() => setFocusedInput("email")}
          onBlur={() => setFocusedInput(null)}
        />
      </View>

      <View style={loginStyles.inputContainer}>
        <Text style={loginStyles.inputLabel}>Mot de passe</Text>
        <TextInput
          placeholder="Mot de passe"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError("");
          }}
          secureTextEntry
          style={[
            loginStyles.input,
            focusedInput === "password" && loginStyles.inputFocused,
          ]}
          onFocus={() => setFocusedInput("password")}
          onBlur={() => setFocusedInput(null)}
        />
      </View>

      {error !== "" && <Text style={loginStyles.errorText}>{error}</Text>}

      <View style={loginStyles.buttonContainer}>
        <TouchableOpacity style={loginStyles.button} onPress={handleLogin}>
          <Text style={loginStyles.buttonText}>Connexion</Text>
        </TouchableOpacity>
      </View>

      <View style={loginStyles.socialButtonsContainer}>
        <TouchableOpacity style={loginStyles.socialButton}>
          <Image
            source={require("@/assets/images/google.png")}
            style={{ width: 20, height: 20 }}
          />
          <Text style={loginStyles.socialButtonText}>
            Continuer avec Google
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={loginStyles.socialButton}>
          <Image
            source={require("@/assets/images/apple.png")}
            style={{ width: 20, height: 20 }}
          />
          <Text style={loginStyles.socialButtonText}>Continuer avec Apple</Text>
        </TouchableOpacity>
      </View>

      <Text style={loginStyles.termsText}>
        En continuant, vous acceptez nos conditions de service et notre
        politique de confidentialité
      </Text>
      <Text style={loginStyles.termsText}>
        Vous n'avez pas de compte ?{" "}
        <Text style={loginStyles.link} onPress={() => router.push("/signup")}>
          Inscrivez-vous
        </Text>
      </Text>
    </View>
  );
}
