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

function isCoureurRole(role: unknown): boolean {
  return String(role ?? "").toLowerCase().trim() === "coureur";
}

function formatRoleLabel(role: unknown): string {
  const r = String(role ?? "").toLowerCase().trim();
  if (r === "coureur") return "Coureur";
  if (r === "organisateur") return "Organisateur";
  if (r === "visitor") return "Visiteur";
  if (!r) return "—";
  return String(role);
}

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
          setSponsorName(profileData.runnerSponsor?.name ?? "");
          setSponsorImage(profileData.runnerSponsor?.image ?? "");

          // Mettre à jour le contexte avec les données fraîches
          updateUser({
            firstname: profileData.firstname,
            lastname: profileData.lastname,
            profileImage: profileData.profileImage,
            runnerSponsor: profileData.runnerSponsor ?? null,
            role: profileData.role,
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
  const [sponsorName, setSponsorName] = useState(
    user?.runnerSponsor?.name ?? "",
  );
  const [sponsorImage, setSponsorImage] = useState(
    user?.runnerSponsor?.image ?? "",
  );
  const [isLoading, setIsLoading] = useState(false);

  // Synchroniser le formulaire avec le contexte (hors mode édition)
  useEffect(() => {
    if (user && !isEditing) {
      setFirstname(user.firstname || "");
      setLastname(user.lastname || "");
      setEmail(user.email || "");
      setProfileImage(user.profileImage || "");
      setSponsorName(user.runnerSponsor?.name ?? "");
      setSponsorImage(user.runnerSponsor?.image ?? "");
    }
  }, [user, isEditing]);

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

      const body: Record<string, unknown> = {
        firstname: firstname.trim() || null,
        lastname: lastname.trim() || null,
        profileImage: profileImage.trim() || null,
      };

      if (isCoureurRole(user?.role)) {
        const n = sponsorName.trim();
        body.runnerSponsor = n
          ? { name: n, image: sponsorImage.trim() || null }
          : null;
      }

      const response = await fetch(`${API_URL}/users/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg =
          typeof errorData.message === "string"
            ? errorData.message
            : typeof errorData.error === "string"
              ? errorData.error
              : "Erreur lors de la mise à jour du profil";
        if (response.status === 403) {
          throw new Error(
            "Le sponsor coureur n’est pas disponible pour ce type de compte.",
          );
        }
        if (response.status === 400) {
          throw new Error(msg);
        }
        throw new Error(msg);
      }

      const updatedPayload = await response.json();
      const u = updatedPayload.user ?? updatedPayload;

      /** Si le back ne renvoie pas `runnerSponsor` dans le JSON du PATCH, ne pas écraser avec null. */
      let resolvedRunnerSponsor:
        | { name: string; image: string | null }
        | null
        | undefined;
      if (u.runnerSponsor !== undefined) {
        resolvedRunnerSponsor = u.runnerSponsor ?? null;
      } else if (isCoureurRole(user?.role)) {
        resolvedRunnerSponsor = body.runnerSponsor as
          | { name: string; image: string | null }
          | null;
      }

      const updates: Parameters<typeof updateUser>[0] = {
        firstname: u.firstname,
        lastname: u.lastname,
        profileImage: u.profileImage,
      };
      if (u.role !== undefined) {
        updates.role = u.role;
      }
      if (resolvedRunnerSponsor !== undefined) {
        updates.runnerSponsor = resolvedRunnerSponsor;
      }

      updateUser(updates);

      if (resolvedRunnerSponsor !== undefined) {
        setSponsorName(resolvedRunnerSponsor?.name ?? "");
        setSponsorImage(resolvedRunnerSponsor?.image ?? "");
      }

      Alert.alert("Succès", "Profil mis à jour avec succès !");
      setIsEditing(false);

      // Recharger le profil pour coller à la base (sponsor inclus si le back le renvoie en GET)
      try {
        const authHeader = token?.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;
        const verifyRes = await fetch(`${API_URL}/users/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });
        if (verifyRes.ok) {
          const fresh = await verifyRes.json();
          setFirstname(fresh.firstname || "");
          setLastname(fresh.lastname || "");
          setEmail(fresh.email || "");
          setProfileImage(fresh.profileImage || "");
          setSponsorName(fresh.runnerSponsor?.name ?? "");
          setSponsorImage(fresh.runnerSponsor?.image ?? "");
          updateUser({
            firstname: fresh.firstname,
            lastname: fresh.lastname,
            profileImage: fresh.profileImage,
            runnerSponsor: fresh.runnerSponsor ?? null,
            role: fresh.role,
          });
        }
      } catch {
        /* le merge PATCH + resolvedRunnerSponsor suffit */
      }
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

        <View style={profileStyles.inputGroup}>
          <Text style={profileStyles.label}>Type de compte</Text>
          <TextInput
            style={[profileStyles.input, profileStyles.inputDisabled]}
            value={formatRoleLabel(user?.role)}
            editable={false}
            placeholder="—"
            placeholderTextColor="#666"
          />
        </View>

        {!isEditing && (
          <View style={profileStyles.editHint}>
            <Icon name="pencil-circle-outline" size={22} color="#A1F763" />
            <Text style={profileStyles.editHintText}>
              Pour modifier votre profil
              {isCoureurRole(user?.role)
                ? " et votre sponsor personnel (nom + logo), "
                : ", "}
              appuyez sur le{" "}
              <Text style={profileStyles.editHintEm}>crayon</Text> en haut à
              droite, puis sur{" "}
              <Text style={profileStyles.editHintEm}>Sauvegarder</Text> en bas
              de l’écran.
            </Text>
          </View>
        )}

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

        {isCoureurRole(user?.role) && (
          <>
            <Text style={profileStyles.sectionSubtitle}>
              Sponsor personnel (maillot / affichage)
            </Text>
            <Text style={profileStyles.helperText}>
              Réservé aux comptes coureur — distinct des sponsors de vos courses
              si vous êtes aussi organisateur. Laissez le nom vide et enregistrez
              pour retirer le sponsor.
            </Text>
            <View style={profileStyles.inputGroup}>
              <Text style={profileStyles.label}>Nom du sponsor</Text>
              <TextInput
                style={[
                  profileStyles.input,
                  !isEditing && profileStyles.inputDisabled,
                ]}
                value={sponsorName}
                onChangeText={setSponsorName}
                editable={isEditing}
                placeholder="Ex. Ma marque"
                placeholderTextColor="#666"
              />
            </View>
            <View style={profileStyles.inputGroup}>
              <Text style={profileStyles.label}>Logo (URL ou data URI)</Text>
              <TextInput
                style={[
                  profileStyles.input,
                  !isEditing && profileStyles.inputDisabled,
                ]}
                value={sponsorImage}
                onChangeText={setSponsorImage}
                editable={isEditing}
                placeholder="Optionnel"
                placeholderTextColor="#666"
                autoCapitalize="none"
              />
            </View>
            {sponsorImage.trim().length > 0 && (
              <View style={profileStyles.sponsorPreviewWrap}>
                <Image
                  source={{ uri: sponsorImage.trim() }}
                  style={profileStyles.sponsorPreviewImage}
                  resizeMode="contain"
                />
              </View>
            )}
          </>
        )}

        {user?.role != null &&
          String(user.role).length > 0 &&
          !isCoureurRole(user.role) && (
            <View style={profileStyles.organizerNote}>
              <Icon name="account-tie" size={22} color="rgba(255,255,255,0.6)" />
              <Text style={profileStyles.organizerNoteText}>
                Le sponsor personnel (nom + logo coureur) n’est disponible que
                pour les comptes « Coureur ». Les sponsors de course se gèrent
                lors de la création ou de l’édition d’une course.
              </Text>
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
                setSponsorName(user?.runnerSponsor?.name ?? "");
                setSponsorImage(user?.runnerSponsor?.image ?? "");
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
