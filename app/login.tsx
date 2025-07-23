"use client";

import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/auth";
import { loginStyles } from "../style/login.styles";

export default function LoginScreen() {
  const [email, setEmail] = useState("enzolemercier@gmail.com");
  const [password, setPassword] = useState("password");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (isVisitor: boolean) => {
    try {
      let response: Response = new Response();
      let data: any = {};
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
        console.log("=== LOGIN SUCCESS ===");
        console.log("Backend response data:", data);

        login({
          email: data.technicalUser.email,
          firstname: data.userProfile.firstname,
          lastname: data.userProfile.lastname,
          token: data.access_token,
          isConnected: !isVisitor,
        });
        router.replace("/");
      } else if (isVisitor) {
        login({
          email: "visitor@example.com",
          name: "Visiteur",
          token: "visitor-token",
          isConnected: !isVisitor,
        });
        router.replace("/");
      } else {
        setError(data.message || "Email ou mot de passe incorrect");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Erreur réseau, veuillez réessayer");
    }
  };

  return (
    <View style={loginStyles.container}>
      <View style={loginStyles.logoContainer}>
        <Image
          source={require("@/assets/images/welcome-logo.png")}
          style={loginStyles.logo}
          resizeMode="contain"
        />
        <Text style={loginStyles.title}>Connexion</Text>
      </View>

      <View style={loginStyles.inputSection}>
        <TextInput
          style={loginStyles.input}
          placeholder="Email"
          placeholderTextColor="#A1A1A1"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          onFocus={() => setFocusedInput("email")}
          onBlur={() => setFocusedInput(null)}
        />
        <TextInput
          style={loginStyles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#A1A1A1"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          onFocus={() => setFocusedInput("password")}
          onBlur={() => setFocusedInput(null)}
        />
        <TouchableOpacity>
          <Text style={loginStyles.forgotPassword}>Mot de passe oublié ?</Text>
        </TouchableOpacity>
      </View>

      {error !== "" && <Text style={loginStyles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={loginStyles.button}
        onPress={() => handleLogin(false)}
      >
        <Text style={loginStyles.buttonText}>Se connecter</Text>
      </TouchableOpacity>

      <View style={loginStyles.divider} />

      <View style={loginStyles.socialSection}>
        <TouchableOpacity style={loginStyles.socialButton}>
          <Image
            source={require("@/assets/images/google.png")}
            style={loginStyles.socialIcon}
          />
          <Text style={loginStyles.socialButtonText}>
            Continuer avec Google
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={loginStyles.socialButton}>
          <Image
            source={require("@/assets/images/apple.png")}
            style={loginStyles.socialIcon}
          />
          <Text style={loginStyles.socialButtonText}>
            Continuer avec Google
          </Text>
        </TouchableOpacity>
      </View>

      <View style={loginStyles.inviteSection}>
        <Text style={loginStyles.inviteLabel}>J’ai un code invité</Text>
        <TextInput
          style={loginStyles.inviteInput}
          placeholder="KTYZPQ"
          placeholderTextColor="#A1A1A1"
          value={inviteCode}
          onChangeText={setInviteCode}
        />
      </View>

      <Text style={loginStyles.termsText}>
        En continuant, vous acceptez nos conditions de service et notre
        <Text style={loginStyles.link}> politique de confidentialité.</Text>
      </Text>
      <Text style={loginStyles.termsText}>
        Vous n&apos;avez pas de compte ?{" "}
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
