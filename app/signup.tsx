"use client";

import { router } from "expo-router";
import { useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/auth";
import { loginStyles } from "../style/login.styles";

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const { login } = useAuth();

  var disabled =
    !name ||
    !email ||
    !password ||
    !confirmPassword ||
    (password === "" ? true : confirmPassword !== password);

  const handleSignup = async () => {

    const API_URL = process.env.EXPO_PUBLIC_API_URL;

    const emailExists = await fetch(
      `${API_URL}/auth/email-exists`,
      {
        method: "POST",
        body: JSON.stringify({ email: email }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Response:", emailExists);

    if (emailExists.ok) {
      const data = await emailExists.json();
      if (data.exists) {
        setError("User already exists");
      }
      return;
    }

    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      body: JSON.stringify({
        email: email,
        lastname: name,
        password: password,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Response:", res);

    if (!res.ok) {
      const errorData = await res.json();
      setError(errorData.message || "Une erreur est survenue");
      return;
    } else {
      router.replace("/login");
    }
  };

  return (
    <View style={loginStyles.container}>
      <View style={loginStyles.header}>
        <Text style={loginStyles.title}>Inscription</Text>
      </View>

      <View style={loginStyles.inputContainer}>
        <Text style={loginStyles.inputLabel}>Nom</Text>
        <TextInput
          placeholder="Nom"
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError("");
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[
            loginStyles.input,
            focusedInput === "name" && loginStyles.inputFocused,
          ]}
          onFocus={() => setFocusedInput("name")}
          onBlur={() => setFocusedInput(null)}
        />
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

      <View style={loginStyles.inputContainer}>
        <Text style={loginStyles.inputLabel}>Confirmation mot de passe</Text>
        <TextInput
          placeholder="Mot de passe"
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setError("");
          }}
          secureTextEntry
          style={[
            loginStyles.input,
            focusedInput === "confirmPassword" && loginStyles.inputFocused,
          ]}
          onFocus={() => setFocusedInput("confirmPassword")}
          onBlur={() => setFocusedInput(null)}
        />
      </View>

      {error !== "" && <Text style={loginStyles.errorText}>{error}</Text>}

      <View style={loginStyles.buttonContainer}>
        <TouchableOpacity
          style={[loginStyles.button, disabled && loginStyles.buttonDisabled]}
          onPress={handleSignup}
          disabled={disabled}
        >
          <Text style={loginStyles.buttonText}>Inscription</Text>
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
        Vous avez déjà un compte ?{" "}
        <Text style={loginStyles.link} onPress={() => router.push("/login")}>
          Connectez vous
        </Text>
      </Text>
    </View>
  );
}
