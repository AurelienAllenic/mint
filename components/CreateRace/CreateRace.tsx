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

interface StandardDistance {
  id: number;
  name: string;
  distance: string;
}

interface RaceDiscipline {
  id: number;
  name: string;
}

interface Organization {
  id: number;
  name: string;
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
  const [customDistance, setCustomDistance] = useState("21.1");
  const [positiveElevation, setPositiveElevation] = useState("150");
  const [standardDistances, setStandardDistances] = useState<
    StandardDistance[]
  >([]);
  const [selectedStandardDistance, setSelectedStandardDistance] = useState<
    number | null
  >(null);
  const [raceDisciplines, setRaceDisciplines] = useState<RaceDiscipline[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<number | null>(
    null
  );
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<
    number | null
  >(null);
  const [gpxFileUri, setGpxFileUri] = useState<string | null>(
    initialGpxUri || null
  );
  const [gpxFileName, setGpxFileName] = useState<string | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { token } = useAuth();
  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  // Charger les données de référence au démarrage
  useEffect(() => {
    const loadReferenceData = async () => {
      setLoadingData(true);
      try {
        const authHeader = token?.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;

        // Charger les distances standards
        try {
          const standardDistancesResponse = await fetch(
            `${API_URL}/standard-distances`,
            {
              headers: { Authorization: authHeader },
            }
          );
          if (standardDistancesResponse.ok) {
            const distances = await standardDistancesResponse.json();
            setStandardDistances(distances);
          }
        } catch (e) {
          console.log("Erreur chargement distances standards:", e);
        }

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
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setGpxFileUri(file.uri);
        setGpxFileName(file.name);
        setError(null);
      }
    } catch (err) {
      console.error("Erreur lors de la sélection du fichier:", err);
      setError("Erreur lors de la sélection du fichier GPX");
    }
  };

  const validateForm = (): boolean => {
    if (!raceName.trim()) {
      setError("Le nom de la course est requis");
      return false;
    }

    if (!positiveElevation.trim()) {
      setError("Le dénivelé positif est requis");
      return false;
    }

    if (!gpxFileUri) {
      setError("Un fichier GPX est requis");
      return false;
    }

    if (startDate >= endDate) {
      setError("La date de fin doit être postérieure à la date de début");
      return false;
    }

    // Validation distance : soit standard soit custom
    if (!selectedStandardDistance && !customDistance.trim()) {
      setError(
        "Veuillez sélectionner une distance standard ou saisir une distance personnalisée"
      );
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

      // Créer FormData pour l'upload multipart
      const formData = new FormData();

      formData.append("name", raceName.trim());
      formData.append("start_date", startDate.toISOString());
      formData.append("end_date", endDate.toISOString());
      formData.append("positive_elevation", positiveElevation);

      // Distance : soit standard soit custom
      if (selectedStandardDistance) {
        formData.append(
          "standard_distance_id",
          selectedStandardDistance.toString()
        );
      } else if (customDistance.trim()) {
        // Convertir en mètres si nécessaire
        const distanceInMeters = parseFloat(customDistance) * 1000; // Supposant que l'utilisateur saisit en km
        formData.append("distance", distanceInMeters.toString());
      }

      // Champs optionnels
      if (selectedOrganization) {
        formData.append("organization_id", selectedOrganization.toString());
      }
      if (selectedDiscipline) {
        formData.append("race_discipline_id", selectedDiscipline.toString());
      }

      // Fichier GPX
      if (gpxFileUri) {
        const fileInfo = await FileSystem.getInfoAsync(gpxFileUri);
        if (fileInfo.exists) {
          formData.append("file", {
            uri: gpxFileUri,
            type: "application/gpx+xml",
            name: gpxFileName || "track.gpx",
          } as any);
        }
      }

      const response = await fetch(`${API_URL}/races`, {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: token.startsWith("Bearer ")
            ? token
            : `Bearer ${token}`,
        },
        body: formData,
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

        setCustomDistance("21.1");
        setPositiveElevation("150");
        setSelectedStandardDistance(null);
        setSelectedDiscipline(null);
        setSelectedOrganization(null);
        setGpxFileUri(null);
        setGpxFileName(null);
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

              {/* Distance */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Distance</Text>

                {/* Distance standard */}
                {standardDistances.length > 0 && (
                  <View style={styles.distanceOptions}>
                    <Text style={styles.subLabel}>Distance standard :</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <View style={styles.distanceButtons}>
                        {standardDistances.map((distance) => (
                          <TouchableOpacity
                            key={distance.id}
                            style={[
                              styles.distanceButton,
                              selectedStandardDistance === distance.id &&
                                styles.distanceButtonSelected,
                            ]}
                            onPress={() => {
                              setSelectedStandardDistance(distance.id);
                              setCustomDistance(""); // Reset custom distance
                            }}
                          >
                            <Text
                              style={[
                                styles.distanceButtonText,
                                selectedStandardDistance === distance.id &&
                                  styles.distanceButtonTextSelected,
                              ]}
                            >
                              {distance.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* Distance personnalisée */}
                <View style={styles.customDistanceContainer}>
                  <Text style={styles.subLabel}>
                    Distance personnalisée (km) :
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="21.1"
                    placeholderTextColor="#888"
                    value={customDistance}
                    onChangeText={(text) => {
                      setCustomDistance(text);
                      setSelectedStandardDistance(null); // Reset standard distance
                    }}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Dénivelé positif */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Dénivelé positif (m) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="150"
                  placeholderTextColor="#888"
                  value={positiveElevation}
                  onChangeText={setPositiveElevation}
                  keyboardType="numeric"
                />
              </View>

              {/* Organisation */}
              {organizations.length > 0 && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Organisation (optionnel)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.optionButtons}>
                      <TouchableOpacity
                        style={[
                          styles.optionButton,
                          selectedOrganization === null &&
                            styles.optionButtonSelected,
                        ]}
                        onPress={() => setSelectedOrganization(null)}
                      >
                        <Text
                          style={[
                            styles.optionButtonText,
                            selectedOrganization === null &&
                              styles.optionButtonTextSelected,
                          ]}
                        >
                          Aucune
                        </Text>
                      </TouchableOpacity>
                      {organizations.map((org) => (
                        <TouchableOpacity
                          key={org.id}
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
                </View>
              )}

              {/* Discipline */}
              {raceDisciplines.length > 0 && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Discipline (optionnel)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.optionButtons}>
                      <TouchableOpacity
                        style={[
                          styles.optionButton,
                          selectedDiscipline === null &&
                            styles.optionButtonSelected,
                        ]}
                        onPress={() => setSelectedDiscipline(null)}
                      >
                        <Text
                          style={[
                            styles.optionButtonText,
                            selectedDiscipline === null &&
                              styles.optionButtonTextSelected,
                          ]}
                        >
                          Aucune
                        </Text>
                      </TouchableOpacity>
                      {raceDisciplines.map((discipline) => (
                        <TouchableOpacity
                          key={discipline.id}
                          style={[
                            styles.optionButton,
                            selectedDiscipline === discipline.id &&
                              styles.optionButtonSelected,
                          ]}
                          onPress={() => setSelectedDiscipline(discipline.id)}
                        >
                          <Text
                            style={[
                              styles.optionButtonText,
                              selectedDiscipline === discipline.id &&
                                styles.optionButtonTextSelected,
                            ]}
                          >
                            {discipline.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Fichier GPX */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Fichier GPX *</Text>
                <TouchableOpacity
                  style={styles.fileButton}
                  onPress={pickGpxFile}
                >
                  <Icon name="file-upload" size={24} color="#A1F763" />
                  <Text style={styles.fileButtonText}>
                    {gpxFileName ? gpxFileName : "Choisir un fichier GPX"}
                  </Text>
                </TouchableOpacity>
                {gpxFileName && (
                  <View style={styles.fileSelected}>
                    <Icon name="check-circle" size={16} color="#A1F763" />
                    <Text style={styles.fileSelectedText}>
                      Fichier sélectionné
                    </Text>
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
          mode="datetime"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(false);
            if (selectedDate) {
              setStartDate(selectedDate);
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="datetime"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              setEndDate(selectedDate);
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
});

export default CreateRace;
