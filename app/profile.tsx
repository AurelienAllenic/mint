import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/auth";
import { profileStyles } from "../style/profile.styles";

export default function ProfileScreen() {
  const { user, logout, token, updateUser } = useAuth();
  const router = useRouter();
  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  // Rediriger les visiteurs vers la page visiteur
  useEffect(() => {
    if (user?.isVisitor) {
      router.replace("/visitor");
    } else if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  // Charger les données du profil depuis l'API
  useEffect(() => {
    const loadProfile = async () => {
      if (!token || !API_URL || user?.isVisitor || !user) return;

      try {
        const authHeader = token?.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;

        const response = await fetch(`${API_URL}/users/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });

        if (response.ok) {
          const profileData = await response.json();

          // Mettre à jour les états locaux avec les données du serveur
          setFirstname(profileData.firstname || "");
          setLastname(profileData.lastname || "");
          setEmail(profileData.email || "");
          setProfileImage(profileData.profileImage || "");

          // Mettre à jour le contexte avec les données fraîches
          updateUser({
            firstname: profileData.firstname,
            lastname: profileData.lastname,
            profileImage: profileData.profileImage,
          });
        }
      } catch (error) {
        console.error("Erreur lors du chargement du profil:", error);
      }
    };

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, API_URL, user?._id]); // Retirer updateUser et user complet des dépendances

  const [isEditing, setIsEditing] = useState(false);
  const [firstname, setFirstname] = useState(user?.firstname || "");
  const [lastname, setLastname] = useState(user?.lastname || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileImage, setProfileImage] = useState(user?.profileImage || "");
  const [isLoading, setIsLoading] = useState(false);

  // Mettre à jour les états locaux seulement au montage initial
  useEffect(() => {
    if (user && !isEditing) {
      setFirstname(user.firstname || "");
      setLastname(user.lastname || "");
      setEmail(user.email || "");
      setProfileImage(user.profileImage || "");
    }
  }, [user?._id]); // Seulement quand l'ID utilisateur change (changement d'utilisateur)

  const handleSave = async () => {
    if (!token) {
      Alert.alert(
        "Erreur",
        "Vous devez être connecté pour modifier votre profil",
      );
      return;
    }

    if (!API_URL) {
      Alert.alert("Erreur", "Configuration API manquante");
      return;
    }

    setIsLoading(true);

    try {
      const authHeader = token?.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;

      const response = await fetch(`${API_URL}/users/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          firstname: firstname.trim() || null,
          lastname: lastname.trim() || null,
          profileImage: profileImage.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Erreur lors de la mise à jour du profil",
        );
      }

      const updatedUserData = await response.json();

      // Mettre à jour le contexte utilisateur avec les nouvelles données
      updateUser({
        firstname: updatedUserData.user.firstname,
        lastname: updatedUserData.user.lastname,
        profileImage: updatedUserData.user.profileImage,
      });

      Alert.alert("Succès", "Profil mis à jour avec succès !");
      setIsEditing(false);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      Alert.alert(
        "Erreur",
        error instanceof Error ? error.message : "Une erreur est survenue",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Êtes-vous sûr de vouloir vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        style: "destructive",
        onPress: () => {
          logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <ScrollView style={profileStyles.container}>
      {/* Header avec bouton retour */}
      <View style={profileStyles.header}>
        <TouchableOpacity
          style={profileStyles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={profileStyles.headerTitle}>Mon Profil</Text>
        <TouchableOpacity
          style={profileStyles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Icon
            name={isEditing ? "check" : "pencil"}
            size={24}
            color="#A1F763"
          />
        </TouchableOpacity>
      </View>

      {/* Photo de profil */}
      <View style={profileStyles.profileImageContainer}>
        <Image
          source={
            user?.profileImage && user.profileImage.length > 0
              ? { uri: user.profileImage }
              : require("@/assets/images/pp.png")
          }
          style={profileStyles.profileImage}
        />

        {isEditing && (
          <TouchableOpacity style={profileStyles.changePhotoButton}>
            <Icon name="camera" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Informations du profil */}
      <View style={profileStyles.profileInfo}>
        <View style={profileStyles.inputGroup}>
          <Text style={profileStyles.label}>Prénom</Text>
          <TextInput
            style={[
              profileStyles.input,
              !isEditing && profileStyles.inputDisabled,
            ]}
            value={firstname}
            onChangeText={setFirstname}
            editable={isEditing}
            placeholder="Prénom"
            placeholderTextColor="#666"
          />
        </View>

        <View style={profileStyles.inputGroup}>
          <Text style={profileStyles.label}>Nom</Text>
          <TextInput
            style={[
              profileStyles.input,
              !isEditing && profileStyles.inputDisabled,
            ]}
            value={lastname}
            onChangeText={setLastname}
            editable={isEditing}
            placeholder="Nom"
            placeholderTextColor="#666"
          />
        </View>

        <View style={profileStyles.inputGroup}>
          <Text style={profileStyles.label}>Email</Text>
          <TextInput
            style={[profileStyles.input, profileStyles.inputDisabled]}
            value={email}
            editable={false}
            placeholder="Email"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={profileStyles.helperText}>
            L&apos;email ne peut pas être modifié
          </Text>
        </View>

        {isEditing && (
          <View style={profileStyles.inputGroup}>
            <Text style={profileStyles.label}>Image de profil (URL)</Text>
            <TextInput
              style={profileStyles.input}
              value={profileImage}
              onChangeText={setProfileImage}
              placeholder="URL de l'image de profil"
              placeholderTextColor="#666"
              autoCapitalize="none"
            />
          </View>
        )}

        {isEditing && (
          <View style={profileStyles.actionButtons}>
            <TouchableOpacity
              style={[profileStyles.button, profileStyles.cancelButton]}
              onPress={() => {
                setIsEditing(false);
                setFirstname(user?.firstname || "");
                setLastname(user?.lastname || "");
                setEmail(user?.email || "");
                setProfileImage(user?.profileImage || "");
              }}
            >
              <Text style={profileStyles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[profileStyles.button, profileStyles.saveButton]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={profileStyles.saveButtonText}>Sauvegarder</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Section des paramètres */}
      <View style={profileStyles.settingsSection}>
        <Text style={profileStyles.sectionTitle}>Paramètres</Text>

        <TouchableOpacity style={profileStyles.settingItem}>
          <Icon name="bell-outline" size={24} color="#fff" />
          <Text style={profileStyles.settingText}>Notifications</Text>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={profileStyles.settingItem}>
          <Icon name="lock-outline" size={24} color="#fff" />
          <Text style={profileStyles.settingText}>Changer le mot de passe</Text>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={profileStyles.settingItem}>
          <Icon name="help-circle-outline" size={24} color="#fff" />
          <Text style={profileStyles.settingText}>Aide</Text>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={profileStyles.settingItem}>
          <Icon name="information-outline" size={24} color="#fff" />
          <Text style={profileStyles.settingText}>À propos</Text>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Bouton de déconnexion */}
      <TouchableOpacity
        style={profileStyles.logoutButton}
        onPress={handleLogout}
      >
        <Icon name="logout" size={24} color="#ff4444" />
        <Text style={profileStyles.logoutButtonText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
