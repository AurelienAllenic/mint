import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { useAuth } from "../context/auth";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [isEditing, setIsEditing] = useState(false);
  const [firstname, setFirstname] = useState(user?.firstname || "");
  const [lastname, setLastname] = useState(user?.lastname || "");
  const [email, setEmail] = useState(user?.email || "");

  const handleSave = async () => {
    // TODO: Implémenter la mise à jour du profil via API
    Alert.alert("Succès", "Profil mis à jour avec succès !");
    setIsEditing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Êtes-vous sûr de vouloir vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Déconnexion",
          style: "destructive",
          onPress: () => {
            logout();
            router.replace("/login");
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header avec bouton retour */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Profil</Text>
        <TouchableOpacity
          style={styles.editButton}
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
      <View style={styles.profileImageContainer}>
        <Image
          source={require("@/assets/images/pp.png")}
          style={styles.profileImage}
        />
        {isEditing && (
          <TouchableOpacity style={styles.changePhotoButton}>
            <Icon name="camera" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Informations du profil */}
      <View style={styles.profileInfo}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Prénom</Text>
          <TextInput
            style={[
              styles.input,
              !isEditing && styles.inputDisabled,
            ]}
            value={firstname}
            onChangeText={setFirstname}
            editable={isEditing}
            placeholder="Prénom"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom</Text>
          <TextInput
            style={[
              styles.input,
              !isEditing && styles.inputDisabled,
            ]}
            value={lastname}
            onChangeText={setLastname}
            editable={isEditing}
            placeholder="Nom"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[
              styles.input,
              !isEditing && styles.inputDisabled,
            ]}
            value={email}
            onChangeText={setEmail}
            editable={isEditing}
            placeholder="Email"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {isEditing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setIsEditing(false);
                setFirstname(user?.firstname || "");
                setLastname(user?.lastname || "");
                setEmail(user?.email || "");
              }}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Sauvegarder</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Section des paramètres */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Paramètres</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <Icon name="bell-outline" size={24} color="#fff" />
          <Text style={styles.settingText}>Notifications</Text>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Icon name="lock-outline" size={24} color="#fff" />
          <Text style={styles.settingText}>Changer le mot de passe</Text>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Icon name="help-circle-outline" size={24} color="#fff" />
          <Text style={styles.settingText}>Aide</Text>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Icon name="information-outline" size={24} color="#fff" />
          <Text style={styles.settingText}>À propos</Text>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Bouton de déconnexion */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Icon name="logout" size={24} color="#ff4444" />
        <Text style={styles.logoutButtonText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  editButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(161, 247, 99, 0.2)",
  },
  profileImageContainer: {
    alignItems: "center",
    marginVertical: 30,
    position: "relative",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#A1F763",
  },
  changePhotoButton: {
    position: "absolute",
    bottom: 0,
    right: "35%",
    backgroundColor: "#A1F763",
    padding: 8,
    borderRadius: 20,
  },
  profileInfo: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#A1F763",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "#ccc",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  cancelButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#A1F763",
  },
  saveButtonText: {
    color: "#000",
    fontWeight: "600",
  },
  settingsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    marginBottom: 8,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: "#fff",
    marginLeft: 16,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
    padding: 16,
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ff4444",
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ff4444",
    marginLeft: 8,
  },
};
