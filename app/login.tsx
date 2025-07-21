"use client";

import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/auth";
import { loginStyles } from "../style/login.styles";

export default function LoginScreen() {
  const [email, setEmail] = useState("user@example.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (isVisitor: boolean) => {
    try {

      var response : Response = new Response();
      var data : any = {};
      if (!isVisitor) {
        const API_URL = process.env.EXPO_PUBLIC_API_URL;
        console.log("API_URL:", API_URL);

        response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          body: JSON.stringify({ email, password }),
          headers: { "Content-Type": "application/json" },
        });

        console.log("Response status:", response.status);
        data = await response.json();
        console.log("Response JSON:", data);
      }

      if (response.ok && !isVisitor) {
        login({
          email: data.technicalUser.email,
          name: `${data.userProfile.firstname} ${data.userProfile.lastname}`,
          token: data.access_token,
          isConnected: !isVisitor,
        });
        router.replace("/");
      }
      else if (isVisitor) {
        login({ email: "visitor@example.com", name: "Visiteur", token: "visitor-token", isConnected: !isVisitor });
        router.replace("/");
      }
      else {
        setError(data.message || "Email ou mot de passe incorrect");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Erreur réseau, veuillez réessayer");
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
        <TouchableOpacity style={loginStyles.button} onPress={() => handleLogin(false)}>
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
      <View style={{ alignItems: "center", marginTop: 24 }}>
        <Text style={loginStyles.termsText}>Vous êtes un visiteur ?</Text>
        <TouchableOpacity
          style={[loginStyles.button, { marginTop: 8 }]}
          onPress={() => handleLogin(true)}
        >
          <Text style={loginStyles.buttonText}>Accèder aux courses</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
