import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { BlurView } from "expo-blur";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/auth";

interface ReportProblemModalProps {
  visible: boolean;
  onClose: () => void;
  raceId: string;
  raceName?: string;
}

const PROBLEM_OPTIONS: { key: string; label: string; icon: string }[] = [
  { key: "blessure", label: "Blessure", icon: "bandage" },
  { key: "malaise", label: "Malaise", icon: "heart-pulse" },
  { key: "balisage", label: "Problème de balisage / parcours", icon: "map-marker-alert" },
  { key: "danger", label: "Danger sur le parcours", icon: "alert" },
  { key: "abandon", label: "Abandon", icon: "flag-remove" },
  { key: "autre", label: "Autre", icon: "dots-horizontal" },
];

export default function ReportProblemModal({
  visible,
  onClose,
  raceId,
  raceName,
}: ReportProblemModalProps) {
  const { token } = useAuth();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const API_URL =
    process.env.EXPO_PUBLIC_API_URL || "https://back-mint-node.vercel.app";

  const resetAndClose = () => {
    setSelectedKey(null);
    setDetails("");
    onClose();
  };

  const handleSend = async () => {
    if (!selectedKey) {
      Alert.alert("Erreur", "Veuillez sélectionner un type de problème.");
      return;
    }
    if (selectedKey === "autre" && details.trim() === "") {
      Alert.alert("Erreur", "Veuillez décrire le problème rencontré.");
      return;
    }
    if (!token) {
      Alert.alert("Erreur", "Vous devez être connecté.");
      return;
    }

    const selectedOption = PROBLEM_OPTIONS.find((o) => o.key === selectedKey);

    setSending(true);
    try {
      const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      const response = await fetch(`${API_URL}/race/${raceId}/report-problem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          reason: selectedKey,
          reasonLabel: selectedOption?.label,
          details: details.trim(),
        }),
      });

      if (response.ok) {
        Alert.alert(
          "Signalement envoyé",
          "L'organisateur de la course a été notifié de votre problème.",
          [{ text: "OK", onPress: resetAndClose }]
        );
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Erreur inconnue" }));
        Alert.alert(
          "Erreur",
          errorData.error || "Impossible d'envoyer le signalement."
        );
      }
    } catch (error) {
      console.error("Erreur envoi signalement:", error);
      Alert.alert("Erreur", "Impossible de contacter le serveur.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={resetAndClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalCard}>
          <BlurView style={styles.modalBlur} intensity={60} tint="dark">
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Icon name="alert-octagon" size={26} color="#FF6B6B" />
                <Text style={styles.title}>Signaler un problème</Text>
              </View>
              <TouchableOpacity onPress={resetAndClose} style={styles.closeBtn}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {raceName ? (
              <Text style={styles.subtitle}>Course : {raceName}</Text>
            ) : null}

            <ScrollView
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
            >
              {PROBLEM_OPTIONS.map((option) => {
                const isSelected = selectedKey === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                    onPress={() => setSelectedKey(option.key)}
                    activeOpacity={0.8}
                  >
                    <Icon
                      name={option.icon as any}
                      size={22}
                      color={isSelected ? "#FF6B6B" : "#fff"}
                    />
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Icon name="check-circle" size={20} color="#FF6B6B" />
                    )}
                  </TouchableOpacity>
                );
              })}

              <TextInput
                style={styles.detailsInput}
                placeholder={
                  selectedKey === "autre"
                    ? "Décrivez le problème (obligatoire)"
                    : "Détails supplémentaires (optionnel)"
                }
                placeholderTextColor="#888"
                value={details}
                onChangeText={setDetails}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!selectedKey || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!selectedKey || sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="send" size={20} color="#fff" />
                  <Text style={styles.sendButtonText}>
                    Envoyer le signalement
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </BlurView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    maxHeight: "85%",
  },
  modalBlur: {
    backgroundColor: "rgba(20, 20, 20, 0.92)",
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    color: "#FF6B6B",
    fontSize: 22,
    fontWeight: "900",
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    color: "#aaa",
    fontSize: 14,
    marginBottom: 14,
  },
  optionsList: {
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionRowSelected: {
    backgroundColor: "rgba(255, 107, 107, 0.12)",
    borderColor: "#FF6B6B",
  },
  optionLabel: {
    color: "#fff",
    fontSize: 16,
    flex: 1,
  },
  optionLabelSelected: {
    color: "#FF6B6B",
    fontWeight: "700",
  },
  detailsInput: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    fontSize: 15,
    minHeight: 80,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#E53935",
    paddingVertical: 14,
    borderRadius: 12,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
});
