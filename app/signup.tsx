"use client";

import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect } from "react";
import { Alert, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../context/auth";
import { loginStyles } from "../style/login.styles";

export default function SignupScreen() {
  const { email: emailParam, inviteToken, inviteRaceId } = useLocalSearchParams<{ 
    email?: string;
    inviteToken?: string;
    inviteRaceId?: string;
  }>();
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState(emailParam || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"coureur" | "organisateur">("coureur");
  const [error, setError] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const { login } = useAuth();

  // Pré-remplir l'email si fourni dans les paramètres
  useEffect(() => {
    if (emailParam && emailParam !== email) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const disabled =
    !firstname ||
    !lastname ||
    !email ||
    !password ||
    !confirmPassword ||
    (password === "" ? true : confirmPassword !== password);

  const handleSignup = async () => {
    const API_URL = process.env.EXPO_PUBLIC_API_URL;
    setError(""); // Reset error

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        body: JSON.stringify({
          email: email,
          firstname: firstname,
          lastname: lastname,
          password: password,
          role: role,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.message || "Une erreur est survenue");
        return;
      } else {
        // Récupérer les données de la réponse de succès
        const successData = await res.json();
        console.log("=== SIGNUP SUCCESS RESPONSE ===");
        console.log("Success response:", successData);
        console.log("==============================");

        router.replace({
          pathname: "/login",
          params:
            inviteToken && inviteRaceId
              ? {
                  inviteToken: String(inviteToken),
                  inviteRaceId: String(inviteRaceId),
                }
              : {},
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error);
      setError("Erreur de connexion au serveur");
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
        <Text style={loginStyles.title}>Inscription</Text>
      </View>

      <View style={loginStyles.inputSection}>
        <TextInput
          style={loginStyles.input}
          placeholder="Prénom"
          placeholderTextColor="#A1A1A1"
          value={firstname}
          onChangeText={setFirstname}
          autoCapitalize="words"
          onFocus={() => setFocusedInput("firstname")}
          onBlur={() => setFocusedInput(null)}
        />
        <TextInput
          style={loginStyles.input}
          placeholder="Nom"
          placeholderTextColor="#A1A1A1"
          value={lastname}
          onChangeText={setLastname}
          autoCapitalize="words"
          onFocus={() => setFocusedInput("lastname")}
          onBlur={() => setFocusedInput(null)}
        />
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
        <View style={loginStyles.pickerContainer}>
          <Picker
            selectedValue={role}
            onValueChange={(itemValue) => setRole(itemValue as "coureur" | "organisateur")}
            style={loginStyles.picker}
            dropdownIconColor="#A1F763"
          >
            <Picker.Item label="Coureur" value="coureur" />
            <Picker.Item label="Organisateur" value="organisateur" />
          </Picker>
        </View>
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
        <TextInput
          style={loginStyles.input}
          placeholder="Confirmation mot de passe"
          placeholderTextColor="#A1A1A1"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          onFocus={() => setFocusedInput("confirmPassword")}
          onBlur={() => setFocusedInput(null)}
        />
      </View>

      {error !== "" && <Text style={loginStyles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[loginStyles.button, disabled && { opacity: 0.5 }]}
        onPress={handleSignup}
        disabled={disabled}
      >
        <Text style={loginStyles.buttonText}>Inscription</Text>
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

      <Text style={loginStyles.termsText}>
        En continuant, vous acceptez nos conditions de service et notre
        <Text style={loginStyles.link}> politique de confidentialité.</Text>
      </Text>
      <Text style={loginStyles.termsText}>
        Vous avez déjà un compte ?{" "}
        <Text style={loginStyles.link} onPress={() => router.push("/login")}>
          Connectez-vous
        </Text>
      </Text>
    </View>
  );
}
