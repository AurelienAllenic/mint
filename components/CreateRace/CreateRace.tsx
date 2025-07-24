import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { BlurView } from "expo-blur";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/auth";

interface RaceDiscipline {
  id: number;
  name: string;
}

interface Organization {
  id: number;
  name: string;
}

interface User {
  _id: string;
  id?: string; // pour compatibilité si jamais
  email: string;
  firstname?: string;
  lastname?: string;
}

interface CreateRaceProps {
  user: any;
  initialGpxUri?: string;
}

const CreateRace: React.FC<CreateRaceProps> = ({ user, initialGpxUri }) => {
  const [raceName, setRaceName] = useState("Course du Lac de Paris");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7); // Dans 7 jours
    date.setHours(9, 0, 0, 0); // 9h00
    return date;
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7); // Dans 7 jours
    date.setHours(12, 0, 0, 0); // 12h00
    return date;
  });
  const [raceDisciplines, setRaceDisciplines] = useState<RaceDiscipline[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<number | null>(
    null
  );
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<
    number | null
  >(null);
  const [showCreateOrganization, setShowCreateOrganization] = useState(false);
  const [newOrganizationName, setNewOrganizationName] = useState("");
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRunners, setSelectedRunners] = useState<string[]>([]);
  const [showAddRunners, setShowAddRunners] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [gpxFileUri, setGpxFileUri] = useState<string | null>(
    initialGpxUri || null
  );
  const [gpxFileName, setGpxFileName] = useState<string | null>(null);
  const [gpxFileContent, setGpxFileContent] = useState<string | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const router = useRouter();
  const { token } = useAuth();
  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  // Charger les données de référence au démarrage
  useEffect(() => {
    const loadReferenceData = async () => {
      console.log("=== DÉBUT DU CHARGEMENT DES DONNÉES ===");
      console.log("API_URL:", API_URL);
      console.log("Token:", token ? "PRÉSENT" : "ABSENT");

      setLoadingData(true);
      try {
        const authHeader = token?.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;

        console.log("Auth header créé:", authHeader ? "OK" : "ERREUR");

        // Charger les disciplines (si endpoint disponible)
        try {
          const disciplinesResponse = await fetch(
            `${API_URL}/race-disciplines`,
            {
              headers: { Authorization: authHeader },
            }
          );
          if (disciplinesResponse.ok) {
            const disciplines = await disciplinesResponse.json();
            setRaceDisciplines(disciplines);
          }
        } catch (e) {
          console.log("Erreur chargement disciplines:", e);
        }

        // Charger les organisations (si endpoint disponible)
        try {
          const organizationsResponse = await fetch(
            `${API_URL}/organizations`,
            {
              headers: { Authorization: authHeader },
            }
          );
          if (organizationsResponse.ok) {
            const orgs = await organizationsResponse.json();
            setOrganizations(orgs);
          }
        } catch (e) {
          console.log("Erreur chargement organisations:", e);
        }

        // Charger les utilisateurs pour les runners
        try {
          console.log("=== TENTATIVE DE CHARGEMENT DES UTILISATEURS ===");
          console.log("URL appelée:", `${API_URL}/users`);
          console.log("Authorization header:", authHeader);

          const usersResponse = await fetch(`${API_URL}/users`, {
            headers: { Authorization: authHeader },
          });

          console.log("Status de la réponse users:", usersResponse.status);
          console.log("Response OK?", usersResponse.ok);

          if (usersResponse.ok) {
            const usersList = await usersResponse.json();
            console.log("=== UTILISATEURS CHARGÉS DEPUIS L'API ===");
            console.log("Type de usersList:", typeof usersList);
            console.log("Array.isArray(usersList):", Array.isArray(usersList));
            console.log("Nombre d'utilisateurs:", usersList.length);
            console.log("Premier utilisateur:", usersList[0]);
            console.log("Liste complète:", usersList);
            console.log("=== FIN CHARGEMENT UTILISATEURS ===");

            setUsers(usersList);
          } else {
            const errorText = await usersResponse.text();
            console.log(
              "ERREUR lors du chargement des utilisateurs:",
              usersResponse.status,
              errorText
            );
          }
        } catch (e) {
          console.log("EXCEPTION lors du chargement des utilisateurs:", e);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
      } finally {
        setLoadingData(false);
      }
    };

    loadReferenceData();
  }, [token, API_URL]);

  const pickGpxFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/gpx+xml", "application/xml", "text/xml", "*/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setError(null);
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        setError("Aucun fichier sélectionné");
        return;
      }

      const file = result.assets[0];
      const uri = file.uri;
      const fileName = file.name || "fichier_gpx";

      if (!uri) {
        setError("URI du fichier introuvable");
        return;
      }

      // Vérifier que le fichier est bien un GPX
      if (
        fileName &&
        !fileName.toLowerCase().includes(".gpx") &&
        !fileName.toLowerCase().includes(".xml")
      ) {
        console.warn(
          "Le fichier sélectionné ne semble pas être un fichier GPX"
        );
      }

      try {
        // Lire le contenu du fichier GPX
        const gpxContent = await FileSystem.readAsStringAsync(uri);

        if (!gpxContent || gpxContent.trim().length === 0) {
          setError("Le fichier GPX est vide");
          return;
        }

        // Validation basique du contenu GPX
        if (!gpxContent.includes("<gpx") && !gpxContent.includes("<trk")) {
          console.warn(
            "Le fichier ne semble pas contenir de données GPX valides"
          );
        }

        setGpxFileUri(uri);
        setGpxFileName(fileName);
        setGpxFileContent(gpxContent);
        setError(null);

        console.log("Fichier GPX sélectionné et lu:", {
          uri,
          fileName,
          contentLength: gpxContent.length,
          size: file.size || "unknown",
          mimeType: file.mimeType || "unknown",
        });
      } catch (readError) {
        console.error("Erreur lors de la lecture du fichier GPX:", readError);
        setError(
          `Impossible de lire le fichier GPX: ${
            readError instanceof Error ? readError.message : String(readError)
          }`
        );
        return;
      }
    } catch (err) {
      console.error("Erreur lors de la sélection du fichier:", err);
      setError(
        `Erreur lors de la sélection du fichier GPX: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  const createOrganization = async () => {
    if (!newOrganizationName.trim()) {
      setError("Le nom de l'organisation est requis");
      return;
    }

    setCreatingOrganization(true);
    setError(null);

    try {
      const authHeader = token?.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;

      // Le backend s'en chargera automatiquement avec req.userId du token JWT
      const response = await fetch(`${API_URL}/organizations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          name: newOrganizationName.trim(),
        }),
      });

      if (response.ok) {
        const newOrg = await response.json();

        // Ajouter la nouvelle organisation à la liste
        setOrganizations((prev) => [...prev, newOrg]);

        // Sélectionner automatiquement la nouvelle organisation
        setSelectedOrganization(newOrg.id);

        // Réinitialiser le formulaire de création
        setNewOrganizationName("");
        setShowCreateOrganization(false);

        Alert.alert("Succès", "Organisation créée avec succès !");
      } else {
        const errorText = await response.text();
        setError(`Erreur lors de la création de l'organisation: ${errorText}`);
      }
    } catch (err) {
      console.error("Erreur lors de la création de l'organisation:", err);
      setError(`Erreur: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCreatingOrganization(false);
    }
  };

  const validateForm = (): boolean => {
    if (!raceName.trim()) {
      setError("Le nom de la course est requis");
      return false;
    }

    if (!selectedOrganization) {
      setError("Une organisation est requise");
      return false;
    }

    // Pour l'instant, le fichier GPX n'est plus requis car le backend ne le gère pas encore
    // if (!gpxFileUri) {
    //   setError("Un fichier GPX est requis");
    //   return false;
    // }

    if (startDate >= endDate) {
      setError("La date de fin doit être postérieure à la date de début");
      return false;
    }

    return true;
  };

  const createRace = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      if (!token) {
        setError("Token d'authentification manquant");
        setLoading(false);
        return;
      }

      // Envoyer les données en JSON avec le contenu GPX inclus
      const raceData = {
        name: raceName.trim(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        organization: selectedOrganization!,
        runners: selectedRunners,
        // Inclure le contenu GPX directement dans le JSON si disponible
        gpxFile: gpxFileContent || "",
      };

      // Log pour déboguer
      console.log("=== ENVOI DE LA COURSE EN JSON AVEC GPX ===");
      console.log("- Nom:", raceName.trim());
      console.log("- Date début:", startDate.toISOString());
      console.log("- Date fin:", endDate.toISOString());
      console.log("- Organisation:", selectedOrganization);
      console.log("- Runners:", selectedRunners);
      console.log("- Fichier GPX:", gpxFileName || "Aucun");
      console.log(
        "- Contenu GPX longueur:",
        gpxFileContent ? gpxFileContent.length : 0
      );
      console.log("Données JSON à envoyer:", {
        ...raceData,
        gpxFile: gpxFileContent ? `[${gpxFileContent.length} caractères]` : "",
      });

      const response = await fetch(`${API_URL}/race`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token.startsWith("Bearer ")
            ? token
            : `Bearer ${token}`,
        },
        body: JSON.stringify(raceData),
      });

      if (response.ok) {
        const newRace = await response.json();
        Alert.alert("Succès", "Course créée avec succès !", [
          {
            text: "Voir la course",
            onPress: () => router.push(`/RaceDetails?raceId=${newRace.id}`),
          },
          {
            text: "Retour",
            onPress: () => router.back(),
          },
        ]);

        // Reset du formulaire avec valeurs par défaut
        setRaceName("Course du Lac de Paris");
        const newStartDate = new Date();
        newStartDate.setDate(newStartDate.getDate() + 7);
        newStartDate.setHours(9, 0, 0, 0);
        setStartDate(newStartDate);

        const newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + 7);
        newEndDate.setHours(12, 0, 0, 0);
        setEndDate(newEndDate);

        setSelectedOrganization(null);
        setSelectedRunners([]);
        setGpxFileUri(null);
        setGpxFileName(null);
        setGpxFileContent(null);
      } else {
        const errorText = await response.text();
        console.log("Erreur API:", response.status, errorText);
        setError(`Erreur lors de la création: ${errorText}`);
      }
    } catch (err) {
      console.error("Erreur lors de la création de la course:", err);
      setError(`Erreur: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loadingData) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A1F763" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <BlurView style={styles.header} intensity={40} tint="dark">
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Icon name="arrow-left" size={24} color="#A1F763" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Créer une course</Text>
            <View style={styles.headerSpacer} />
          </View>
        </BlurView>
      </View>

      {/* Background */}
      <Image
        source={require("@/assets/images/radial-gradient.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          <BlurView style={styles.formBlur} intensity={40} tint="dark">
            <View style={styles.formContent}>
              {/* Nom de la course */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nom de la course *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Course du Lac de Paris"
                  placeholderTextColor="#888"
                  value={raceName}
                  onChangeText={setRaceName}
                />
              </View>

              {/* Dates */}
              <View style={styles.dateRow}>
                <View style={styles.dateGroup}>
                  <Text style={styles.label}>Date de début *</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Icon name="calendar" size={20} color="#A1F763" />
                    <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dateGroup}>
                  <Text style={styles.label}>Date de fin *</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Icon name="calendar" size={20} color="#A1F763" />
                    <Text style={styles.dateText}>{formatDate(endDate)}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Organisation */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Organisation *</Text>

                {!showCreateOrganization ? (
                  <>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <View style={styles.optionButtons}>
                        <TouchableOpacity
                          style={styles.createOrgButton}
                          onPress={() => setShowCreateOrganization(true)}
                        >
                          <Icon name="plus" size={16} color="#A1F763" />
                          <Text style={styles.createOrgButtonText}>
                            Créer une organisation
                          </Text>
                        </TouchableOpacity>
                        {organizations.map((org, index) => (
                          <TouchableOpacity
                            key={org.id || `org-${index}`}
                            style={[
                              styles.optionButton,
                              selectedOrganization === org.id &&
                                styles.optionButtonSelected,
                            ]}
                            onPress={() => setSelectedOrganization(org.id)}
                          >
                            <Text
                              style={[
                                styles.optionButtonText,
                                selectedOrganization === org.id &&
                                  styles.optionButtonTextSelected,
                              ]}
                            >
                              {org.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </>
                ) : (
                  <View style={styles.createOrgForm}>
                    <Text style={styles.subLabel}>Nouvelle organisation :</Text>

                    <TextInput
                      style={styles.input}
                      placeholder="Nom de l'organisation"
                      placeholderTextColor="#888"
                      value={newOrganizationName}
                      onChangeText={setNewOrganizationName}
                    />

                    <View style={styles.createOrgActions}>
                      <TouchableOpacity
                        style={styles.cancelOrgButton}
                        onPress={() => {
                          setShowCreateOrganization(false);
                          setNewOrganizationName("");
                        }}
                      >
                        <Text style={styles.cancelOrgButtonText}>Annuler</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.saveOrgButton,
                          creatingOrganization && styles.saveOrgButtonDisabled,
                        ]}
                        onPress={createOrganization}
                        disabled={creatingOrganization}
                      >
                        {creatingOrganization ? (
                          <ActivityIndicator size="small" color="#3B3B3B" />
                        ) : (
                          <Text style={styles.saveOrgButtonText}>Créer</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Fichier GPX */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Fichier GPX (optionnel)</Text>
                <TouchableOpacity
                  style={styles.fileButton}
                  onPress={pickGpxFile}
                >
                  <Icon name="file-upload" size={24} color="#A1F763" />
                  <Text style={styles.fileButtonText}>
                    {gpxFileName ? gpxFileName : "Choisir un fichier GPX"}
                  </Text>
                </TouchableOpacity>
                {gpxFileName && gpxFileContent && (
                  <View style={styles.fileSelected}>
                    <Icon name="check-circle" size={16} color="#A1F763" />
                    <Text style={styles.fileSelectedText}>
                      Fichier sélectionné ({gpxFileContent.length} caractères)
                    </Text>
                  </View>
                )}
              </View>

              {/* Sélection des participants */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Participants</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowUserDropdown(!showUserDropdown)}
                >
                  <Icon name="account-multiple" size={20} color="#A1F763" />
                  <Text style={styles.dropdownButtonText}>
                    {selectedRunners.length > 0
                      ? `${selectedRunners.length} participant(s) sélectionné(s)`
                      : "Sélectionner des participants"}
                  </Text>
                  <Icon
                    name={showUserDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#A1F763"
                  />
                </TouchableOpacity>

                {/* Liste déroulante des utilisateurs */}
                {showUserDropdown && (
                  <View style={styles.dropdownContainer}>
                    <ScrollView
                      style={styles.dropdownList}
                      nestedScrollEnabled={true}
                    >
                      {users.length > 0 ? (
                        users.map((user) => {
                          const userId = user._id || user.id;
                          if (!userId) return null;
                          const isSelected = selectedRunners.includes(userId);
                          return (
                            <TouchableOpacity
                              key={userId}
                              style={[
                                styles.dropdownItem,
                                isSelected && styles.dropdownItemSelected,
                              ]}
                              onPress={() => {
                                if (isSelected) {
                                  setSelectedRunners((prev) =>
                                    prev.filter((id) => id !== userId)
                                  );
                                } else {
                                  setSelectedRunners((prev) => [
                                    ...prev,
                                    userId,
                                  ]);
                                }
                              }}
                            >
                              <View style={styles.userInfo}>
                                <Text
                                  style={[
                                    styles.userEmail,
                                    isSelected && styles.userEmailSelected,
                                  ]}
                                >
                                  {user.email}
                                </Text>
                                {(user.firstname || user.lastname) && (
                                  <Text
                                    style={[
                                      styles.userName,
                                      isSelected && styles.userNameSelected,
                                    ]}
                                  >
                                    {user.firstname} {user.lastname}
                                  </Text>
                                )}
                              </View>
                              {isSelected && (
                                <Icon name="check" size={20} color="#A1F763" />
                              )}
                            </TouchableOpacity>
                          );
                        })
                      ) : (
                        <Text style={styles.noUsersText}>
                          Aucun utilisateur disponible
                        </Text>
                      )}
                    </ScrollView>
                  </View>
                )}

                {/* Affichage des participants sélectionnés */}
                {selectedRunners.length > 0 && (
                  <View style={styles.selectedUsersContainer}>
                    <Text style={styles.selectedUsersLabel}>
                      Participants sélectionnés :
                    </Text>
                    <View style={styles.selectedUsersList}>
                      {selectedRunners.map((userId) => {
                        const user = users.find(
                          (u) => (u._id || u.id) === userId
                        );
                        if (!user) return null;
                        return (
                          <View key={userId} style={styles.selectedUserChip}>
                            <Text style={styles.selectedUserChipText}>
                              {user.email}
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                setSelectedRunners((prev) =>
                                  prev.filter((id) => id !== userId)
                                );
                              }}
                              style={styles.removeUserButton}
                            >
                              <Icon name="close" size={16} color="#3B3B3B" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {/* Erreur */}
              {error && (
                <View style={styles.errorContainer}>
                  <Icon name="alert-circle" size={20} color="#ff6b6b" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </View>
          </BlurView>
        </View>
      </ScrollView>

      {/* Bouton de création */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={createRace}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#3B3B3B" />
          ) : (
            <Text style={styles.createButtonText}>CRÉER LA COURSE</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, selectedDate) => {
            setShowStartDatePicker(false);
            if (selectedDate) {
              // Sur Android, on affiche ensuite le time picker
              if (Platform.OS === "android") {
                const newDate = new Date(selectedDate);
                newDate.setHours(startDate.getHours());
                newDate.setMinutes(startDate.getMinutes());
                setStartDate(newDate);
                setShowStartTimePicker(true);
              } else {
                setStartDate(selectedDate);
              }
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              if (Platform.OS === "android") {
                const newDate = new Date(selectedDate);
                newDate.setHours(endDate.getHours());
                newDate.setMinutes(endDate.getMinutes());
                setEndDate(newDate);
                setShowEndTimePicker(true);
              } else {
                setEndDate(selectedDate);
              }
            }
          }}
        />
      )}

      {showStartTimePicker && (
        <DateTimePicker
          value={startDate}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, selectedTime) => {
            setShowStartTimePicker(false);
            if (selectedTime) {
              const newDate = new Date(startDate);
              newDate.setHours(selectedTime.getHours());
              newDate.setMinutes(selectedTime.getMinutes());
              setStartDate(newDate);
            }
          }}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={endDate}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, selectedTime) => {
            setShowEndTimePicker(false);
            if (selectedTime) {
              const newDate = new Date(endDate);
              newDate.setHours(selectedTime.getHours());
              newDate.setMinutes(selectedTime.getMinutes());
              setEndDate(newDate);
            }
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#181818",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#A1F763",
    fontSize: 16,
    marginTop: 16,
  },
  headerContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    borderRadius: 20,
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  header: {
    borderRadius: 20,
    backgroundColor: "rgba(105, 105, 105, 0.18)",
    overflow: "hidden",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#A1F763",
  },
  headerSpacer: {
    width: 40,
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    zIndex: -1,
  },
  scrollContainer: {
    flex: 1,
    marginTop: 140,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  formContainer: {
    margin: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  formBlur: {
    borderRadius: 20,
    backgroundColor: "rgba(105, 105, 105, 0.18)",
    overflow: "hidden",
  },
  formContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#A1F763",
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
    marginBottom: 8,
    opacity: 0.8,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  dateGroup: {
    flex: 1,
  },
  dateButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  dateText: {
    fontSize: 14,
    color: "#fff",
    flex: 1,
  },
  distanceOptions: {
    marginBottom: 16,
  },
  distanceButtons: {
    flexDirection: "row",
    gap: 8,
  },
  distanceButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  distanceButtonSelected: {
    backgroundColor: "#A1F763",
    borderColor: "#A1F763",
  },
  distanceButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
  distanceButtonTextSelected: {
    color: "#3B3B3B",
  },
  customDistanceContainer: {
    marginTop: 12,
  },
  optionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  optionButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  optionButtonSelected: {
    backgroundColor: "#A1F763",
    borderColor: "#A1F763",
  },
  optionButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
  optionButtonTextSelected: {
    color: "#3B3B3B",
  },
  fileButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  fileButtonText: {
    fontSize: 16,
    color: "#fff",
    flex: 1,
  },
  fileSelected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  fileSelectedText: {
    fontSize: 14,
    color: "#A1F763",
    fontWeight: "500",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.3)",
  },
  errorText: {
    fontSize: 14,
    color: "#ff6b6b",
    flex: 1,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 5,
  },
  createButton: {
    backgroundColor: "#A1F763",
    borderRadius: 15,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: "#3B3B3B",
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  createOrgButton: {
    backgroundColor: "rgba(161, 247, 99, 0.2)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#A1F763",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  createOrgButtonText: {
    fontSize: 14,
    color: "#A1F763",
    fontWeight: "500",
  },
  createOrgForm: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(161, 247, 99, 0.3)",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  createOrgActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  cancelOrgButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  cancelOrgButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  saveOrgButton: {
    flex: 1,
    backgroundColor: "#A1F763",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  saveOrgButtonDisabled: {
    opacity: 0.6,
  },
  saveOrgButtonText: {
    color: "#3B3B3B",
    fontWeight: "600",
  },
  selectedRunners: {
    marginBottom: 16,
  },
  runnersContainer: {
    flexDirection: "row",
    gap: 8,
  },
  runnerChip: {
    backgroundColor: "#A1F763",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  runnerChipText: {
    fontSize: 14,
    color: "#3B3B3B",
    fontWeight: "500",
  },
  removeRunnerButton: {
    padding: 2,
  },
  addRunnersButton: {
    backgroundColor: "rgba(161, 247, 99, 0.2)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#A1F763",
  },
  addRunnersButtonText: {
    fontSize: 16,
    color: "#A1F763",
    fontWeight: "500",
  },
  addRunnersModal: {
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(161, 247, 99, 0.3)",
    maxHeight: 400,
  },
  addRunnersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(161, 247, 99, 0.3)",
  },
  addRunnersTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#A1F763",
  },
  closeAddRunnersButton: {
    padding: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
  },
  runnersList: {
    flex: 1,
    height: 300,
  },
  runnerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  runnerItemSelected: {
    backgroundColor: "rgba(161, 247, 99, 0.1)",
    borderBottomColor: "rgba(161, 247, 99, 0.3)",
  },
  runnerItemInfo: {
    flex: 1,
  },
  runnerItemText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
    marginBottom: 2,
  },
  runnerItemTextSelected: {
    color: "#A1F763",
  },
  runnerItemEmail: {
    fontSize: 14,
    color: "#888",
  },
  runnerItemEmailSelected: {
    color: "#A1F763",
    opacity: 0.8,
  },
  addRunnerIcon: {
    marginLeft: 12,
  },
  addRunnersFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(161, 247, 99, 0.3)",
  },
  finishSelectionButton: {
    backgroundColor: "#A1F763",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  finishSelectionButtonText: {
    color: "#3B3B3B",
    fontWeight: "600",
    fontSize: 16,
  },
  noRunnersText: {
    textAlign: "center",
    color: "#888",
    padding: 20,
    fontStyle: "italic",
  },
  // Nouveaux styles pour la liste déroulante des utilisateurs
  dropdownButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "space-between",
  },
  dropdownButtonText: {
    fontSize: 16,
    color: "#fff",
    flex: 1,
  },
  dropdownContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(161, 247, 99, 0.3)",
    maxHeight: 300,
    overflow: "hidden",
  },
  dropdownList: {
    maxHeight: 280,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  dropdownItemSelected: {
    backgroundColor: "rgba(161, 247, 99, 0.1)",
    borderBottomColor: "rgba(161, 247, 99, 0.3)",
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  userEmailSelected: {
    color: "#A1F763",
  },
  userName: {
    fontSize: 14,
    color: "#888",
    marginTop: 2,
  },
  userNameSelected: {
    color: "#A1F763",
    opacity: 0.8,
  },
  noUsersText: {
    textAlign: "center",
    color: "#888",
    padding: 20,
    fontStyle: "italic",
  },
  selectedUsersContainer: {
    marginTop: 12,
    backgroundColor: "rgba(161, 247, 99, 0.05)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(161, 247, 99, 0.2)",
  },
  selectedUsersLabel: {
    fontSize: 14,
    color: "#A1F763",
    fontWeight: "500",
    marginBottom: 8,
  },
  selectedUsersList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedUserChip: {
    backgroundColor: "#A1F763",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectedUserChipText: {
    fontSize: 12,
    color: "#3B3B3B",
    fontWeight: "500",
  },
  removeUserButton: {
    padding: 2,
  },
});

export default CreateRace;
