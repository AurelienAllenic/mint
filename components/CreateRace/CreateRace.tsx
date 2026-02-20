import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
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
  id?: string;
  email: string;
  firstname?: string;
  lastname?: string;
  role?: string;
}

interface CreateRaceProps {
  user: any;
  initialGpxUri?: string;
}

const CreateRace: React.FC<CreateRaceProps> = ({ user, initialGpxUri }) => {
  const [raceName, setRaceName] = useState("Course du Lac de Paris");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setHours(9, 0, 0, 0);
    return date;
  });
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setHours(12, 0, 0, 0);
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

  // NOUVEAUX ÉTATS POUR LE PAIEMENT
  const [isPaid, setIsPaid] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const router = useRouter();
  const { token } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const STRIPE_PUBLIC_KEY = process.env.EXPO_PUBLIC_STRIPE_KEY;

  // CONSTANTES DE PAIEMENT
  const FREE_RUNNERS = 2;
  const PRICE_PER_RUNNER = 1.5;

  // CALCULS DE PAIEMENT
  const extraRunners = Math.max(0, selectedRunners.length - FREE_RUNNERS);
  const totalPayment = extraRunners * PRICE_PER_RUNNER;
  const needsPayment = selectedRunners.length > FREE_RUNNERS && !isPaid;

  useEffect(() => {
    const loadReferenceData = async () => {
      setLoadingData(true);
      try {
        const authHeader = token?.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;

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

        try {
          const usersResponse = await fetch(`${API_URL}/users`, {
            headers: { Authorization: authHeader },
          });

          if (usersResponse.ok) {
            const usersList = await usersResponse.json();
            const list = Array.isArray(usersList) ? usersList : [];
            // Afficher uniquement les coureurs si le back envoie le champ role (évite l'erreur "organisateurs ne peuvent pas rejoindre")
            const coureursOnly = list.filter((u: User) => u.role === "coureur");
            setUsers(coureursOnly.length > 0 ? coureursOnly : list);
          } else {
            const errorText = await usersResponse.text();
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

  // Réinitialiser isPaid si on repasse en dessous de 2 coureurs
  useEffect(() => {
    if (selectedRunners.length <= FREE_RUNNERS) {
      setIsPaid(false);
    }
  }, [selectedRunners.length]);

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
        const gpxContent = await FileSystem.readAsStringAsync(uri);

        if (!gpxContent || gpxContent.trim().length === 0) {
          setError("Le fichier GPX est vide");
          return;
        }

        if (!gpxContent.includes("<gpx") && !gpxContent.includes("<trk")) {
          console.warn(
            "Le fichier ne semble pas contenir de données GPX valides"
          );
        }

        setGpxFileUri(uri);
        setGpxFileName(fileName);
        setGpxFileContent(gpxContent);
        setError(null);
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
        setOrganizations((prev) => [...prev, newOrg]);
        setSelectedOrganization(newOrg.id);
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

  // FONCTION DE PAIEMENT
  const handlePayment = async () => {
    setIsProcessingPayment(true);
    setError(null);

    try {
      const authHeader = token?.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;

      // Appel au backend pour créer le PaymentIntent
      const response = await fetch(`${API_URL}/race/create-payment-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          amount: totalPayment, // ex. 3 pour 2 coureurs extra (2 * 1.5 = 3)
          currency: "eur",
          quantity: extraRunners, // optionnel, pour vérif backend
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la création du paiement");
      }

      const { clientSecret } = await response.json();

      // Initialiser la Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Ton App de Courses", // Remplace par le nom de ton app
        paymentIntentClientSecret: clientSecret,
        // Si tu veux ajouter Apple Pay/Google Pay : applePay: true, googlePay: true (mais configure d'abord dans Stripe dashboard)
      });

      if (initError) {
        throw new Error(`Erreur init: ${initError.message}`);
      }

      // Afficher la Payment Sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === "Canceled") {
          Alert.alert("Paiement annulé");
        } else {
          throw new Error(`Erreur paiement: ${presentError.message}`);
        }
        return;
      }

      // Paiement réussi !
      const piId = clientSecret.split("_secret_")[0]; // Extrait l'ID du PaymentIntent
      setPaymentIntentId(piId);
      setIsPaid(true);

      setSelectedRunners((prev) => [...prev]);

      Alert.alert(
        "Succès",
        `Paiement de ${totalPayment.toFixed(2)}€ effectué !`
      );
    } catch (err) {
      console.error("Erreur lors du paiement:", err);
      setError(
        `Erreur lors du paiement: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      Alert.alert("Erreur", "Le paiement a échoué. Veuillez réessayer.");
    } finally {
      setIsProcessingPayment(false);
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

    if (startDate >= endDate) {
      setError("La date de fin doit être postérieure à la date de début");
      return false;
    }

    // BLOQUER LA CRÉATION SI PLUS DE 2 COUREURS ET PAS PAYÉ
    if (needsPayment) {
      setError(
        `Vous devez payer ${totalPayment.toFixed(
          2
        )}€ pour ajouter ${extraRunners} coureur(s) supplémentaire(s)`
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

      // Ne envoyer que des coureurs : le back refuse les organisateurs dans runners
      const runnerIds = selectedRunners.filter((id) =>
        users.some((u) => (u._id || u.id) === id)
      );

      const raceData = {
        name: raceName.trim(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        organization: selectedOrganization!,
        runners: runnerIds,
        gpxFile: gpxFileContent || "",
        ...(paymentIntentId ? { paymentIntentId } : {}),
      };

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
        // Récupérer les données de la course créée (incluant l'ID)
        const createdRace = await response.json();
        const raceId = createdRace._id || createdRace.id;

        // Appeler l'API externe pour la gestion des positions en temps réel
        const WS_API_URL = "http://mint-dev-ws.charles-chrismann.fr";
        const SIGNATURE_SECRET = process.env.EXPO_PUBLIC_SIGNATURE_SECRET;

        if (!SIGNATURE_SECRET) {
          console.warn("SIGNATURE_SECRET non défini, l'appel à l'API externe sera ignoré");
        } else if (raceId && gpxFileContent && selectedRunners.length > 0) {
          try {
            const wsRaceData = {
              id: raceId,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              runnerIds: selectedRunners,
              gpx: gpxFileContent,
            };

            const wsResponse = await fetch(`${WS_API_URL}/races`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                authorization: `Bearer ${SIGNATURE_SECRET}`,
              },
              body: JSON.stringify(wsRaceData),
            });

            if (!wsResponse.ok) {
              const wsErrorText = await wsResponse.text();
              console.error("Erreur lors de l'appel à l'API WebSocket:", wsErrorText);
              // Ne pas bloquer la création si l'API externe échoue
              Alert.alert(
                "Avertissement",
                "Course créée mais l'API de suivi en temps réel n'a pas pu être initialisée. " +
                "La course fonctionnera normalement mais le suivi en temps réel pourrait être limité."
              );
            } else {
              console.log("API WebSocket initialisée avec succès");
            }
          } catch (wsError) {
            console.error("Erreur lors de l'appel à l'API WebSocket:", wsError);
            // Ne pas bloquer la création si l'API externe échoue
            Alert.alert(
              "Avertissement",
              "Course créée mais l'API de suivi en temps réel n'a pas pu être initialisée. " +
              "La course fonctionnera normalement mais le suivi en temps réel pourrait être limité."
            );
          }
        }

        Alert.alert("Succès", "Course créée avec succès !", [
          {
            text: "Retour",
            onPress: () => router.back(),
          },
        ]);

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
        setIsPaid(false);
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
    <StripeProvider publishableKey={STRIPE_PUBLIC_KEY || ""}>
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
                      <Text style={styles.dateText}>
                        {formatDate(startDate)}
                      </Text>
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
                      <Text style={styles.subLabel}>
                        Nouvelle organisation :
                      </Text>

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
                          <Text style={styles.cancelOrgButtonText}>
                            Annuler
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.saveOrgButton,
                            creatingOrganization &&
                              styles.saveOrgButtonDisabled,
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
                                  <Icon
                                    name="check"
                                    size={20}
                                    color="#A1F763"
                                  />
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

                  {/* SECTION PAIEMENT - Affichée si plus de 2 coureurs */}
                  {selectedRunners.length > FREE_RUNNERS && (
                    <View style={styles.paymentSection}>
                      <View style={styles.paymentInfo}>
                        <Icon name="information" size={20} color="#FFB020" />
                        <Text style={styles.paymentInfoText}>
                          Pour ajouter plus de {FREE_RUNNERS} coureurs, payez{" "}
                          {PRICE_PER_RUNNER.toFixed(2)}€ par coureur
                          supplémentaire
                        </Text>
                      </View>

                      <View style={styles.paymentCalculation}>
                        <View style={styles.calculationRow}>
                          <Text style={styles.calculationLabel}>
                            Coureurs gratuits :
                          </Text>
                          <Text style={styles.calculationValue}>
                            {FREE_RUNNERS}
                          </Text>
                        </View>
                        <View style={styles.calculationRow}>
                          <Text style={styles.calculationLabel}>
                            Coureurs payants :
                          </Text>
                          <Text style={styles.calculationValue}>
                            {extraRunners}
                          </Text>
                        </View>
                        <View style={styles.calculationRow}>
                          <Text style={styles.calculationLabel}>
                            Prix unitaire :
                          </Text>
                          <Text style={styles.calculationValue}>
                            {PRICE_PER_RUNNER.toFixed(2)}€
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.calculationRow,
                            styles.calculationTotal,
                          ]}
                        >
                          <Text style={styles.calculationTotalLabel}>
                            Total à payer :
                          </Text>
                          <Text style={styles.calculationTotalValue}>
                            {extraRunners} × {PRICE_PER_RUNNER.toFixed(2)}€ ={" "}
                            {totalPayment.toFixed(2)}€
                          </Text>
                        </View>
                      </View>

                      {!isPaid ? (
                        <TouchableOpacity
                          style={[
                            styles.paymentButton,
                            isProcessingPayment && styles.paymentButtonDisabled,
                          ]}
                          onPress={handlePayment}
                          disabled={isProcessingPayment}
                        >
                          {isProcessingPayment ? (
                            <ActivityIndicator size="small" color="#3B3B3B" />
                          ) : (
                            <>
                              <Icon
                                name="credit-card"
                                size={20}
                                color="#3B3B3B"
                              />
                              <Text style={styles.paymentButtonText}>
                                Payer {totalPayment.toFixed(2)}€
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.paymentSuccess}>
                          <Icon name="check-circle" size={24} color="#A1F763" />
                          <Text style={styles.paymentSuccessText}>
                            Paiement effectué avec succès !
                          </Text>
                        </View>
                      )}
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
            style={[
              styles.createButton,
              (loading || needsPayment) && styles.createButtonDisabled,
            ]}
            onPress={createRace}
            disabled={loading || needsPayment}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#3B3B3B" />
            ) : (
              <Text style={styles.createButtonText}>
                {needsPayment ? "PAIEMENT REQUIS" : "CRÉER LA COURSE"}
              </Text>
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
    </StripeProvider>
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
    opacity: 0.5,
    backgroundColor: "#666",
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
  // NOUVEAUX STYLES POUR LA SECTION PAIEMENT
  paymentSection: {
    marginTop: 16,
    backgroundColor: "rgba(255, 176, 32, 0.05)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 176, 32, 0.3)",
  },
  paymentInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  paymentInfoText: {
    flex: 1,
    fontSize: 14,
    color: "#FFB020",
    lineHeight: 20,
  },
  paymentCalculation: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  calculationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  calculationLabel: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.8,
  },
  calculationValue: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  calculationTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(161, 247, 99, 0.2)",
  },
  calculationTotalLabel: {
    fontSize: 15,
    color: "#A1F763",
    fontWeight: "600",
  },
  calculationTotalValue: {
    fontSize: 15,
    color: "#A1F763",
    fontWeight: "700",
  },
  paymentButton: {
    backgroundColor: "#A1F763",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  paymentButtonDisabled: {
    opacity: 0.6,
  },
  paymentButtonText: {
    fontSize: 16,
    color: "#3B3B3B",
    fontWeight: "700",
  },
  paymentSuccess: {
    backgroundColor: "rgba(161, 247, 99, 0.1)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#A1F763",
  },
  paymentSuccessText: {
    fontSize: 15,
    color: "#A1F763",
    fontWeight: "600",
  },
});

export default CreateRace;
