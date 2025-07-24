"use client";

import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/auth";
import { loginStyles } from "../style/login.styles";

export default function LoginScreen() {
  const [email, setEmail] = useState("enzo@gmail.com");
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
        // Login normal
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
      } else {
        // Login invité
        const API_URL = process.env.EXPO_PUBLIC_API_URL;
        console.log("API_URL pour invité:", API_URL);

        response = await fetch(`${API_URL}/auth/visitor-token`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        console.log("Visitor response status:", response.status);

        if (response.ok) {
          data = await response.json();
          console.log("Visitor response JSON:", data);
        } else {
          console.log("Visitor endpoint failed with status:", response.status);
          const errorText = await response.text();
          console.log("Error response text:", errorText);
          // Utiliser le fallback pour les invités
          data = null;
        }
      }

      if (response.ok && !isVisitor) {
        console.log("=== LOGIN SUCCESS ===");
        console.log("Backend response data:", data);
        console.log("TechnicalUser:", data.technicalUser);
        console.log("TechnicalUser _id:", data.technicalUser._id);
        console.log("TechnicalUser _id type:", typeof data.technicalUser._id);

        // Extraire l'ID depuis l'ObjectId si nécessaire
        let userId = data.technicalUser._id || data.technicalUser.id;

        // Si l'ID n'est pas dans la réponse, l'extraire du token JWT
        if (!userId && data.access_token) {
          try {
            const payload = JSON.parse(atob(data.access_token.split(".")[1]));
            console.log("JWT Payload:", payload);
            userId = payload.userId || payload.id || payload.sub;
            console.log("ID extrait du JWT:", userId);
          } catch (e) {
            console.log("Erreur lors de l'extraction du JWT:", e);
          }
        }

        // Si c'est un objet ObjectId, extraire la string
        if (typeof userId === "object" && userId.$oid) {
          userId = userId.$oid;
        } else if (typeof userId === "object" && userId.toString) {
          userId = userId.toString();
        }

        console.log("User ID final:", userId);

        login({
          email: data.technicalUser.email,
          firstname: data.userProfile.firstname,
          lastname: data.userProfile.lastname,
          profileImage: data.userProfile.profileImage || data.profileImage,
          _id: userId,
          token: data.access_token,
          isConnected: !isVisitor,
          isVisitor: false,
        });
        router.replace("/");
      } else if (isVisitor && response.ok && data) {
        console.log("=== VISITOR LOGIN SUCCESS ===");
        console.log("Visitor response data:", data);

        login({
          email: "visitor@example.com",
          name: "Visiteur",
          firstname: "Visiteur",
          lastname: "",
          _id: data.userId || "visitor-id", // Utiliser l'ID depuis la réponse visitor-token
          token: data.access_token || data.token,
          isConnected: false, // Les invités ne sont pas "connectés" au sens strict
          isVisitor: true,
        });
        router.replace("/");
      } else if (isVisitor) {
        // Fallback si l'endpoint visitor-token échoue
        console.log("Visitor token failed, using fallback");
        login({
          email: "visitor@example.com",
          name: "Visiteur",
          firstname: "Visiteur",
          lastname: "",
          _id: "visitor-id",
          token: "visitor-token",
          isConnected: false,
          isVisitor: true,
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
          <Text style={loginStyles.socialButtonText}>Continuer avec Apple</Text>
        </TouchableOpacity>
      </View>

      <View style={loginStyles.inviteSection}>
        <View style={{ alignItems: "center" }}>
          <Text style={loginStyles.termsText}>ou</Text>
          <TouchableOpacity
            style={[loginStyles.button, { marginTop: 8 }]}
            onPress={() => handleLogin(true)}
          >
            <Text style={loginStyles.buttonText}>
              Accèder en tant qu&apos;invité
            </Text>
          </TouchableOpacity>
        </View>
        {/* <Text style={loginStyles.inviteLabel}>J’ai un code invité</Text>
        <TextInput
          style={loginStyles.inviteInput}
          placeholder="KTYZPQ"
          placeholderTextColor="#A1A1A1"
          value={inviteCode}
          onChangeText={setInviteCode}
        /> */}
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
    </View>
  );
}
