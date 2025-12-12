import { usePremiumStatus } from "@/utils/getPremiumStatus";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function StatsPage() {
  const router = useRouter();
  const isPremium = usePremiumStatus();

  return (
    <View style={styles.container}>
      {isPremium ? (
        <View style={styles.banner}>
          <Icon name="crown" size={28} color="#fff" />
          <Text style={styles.bannerText}>
            Statistiques avancées — arrivent prochainement !
          </Text>
        </View>
      ) : (
        <View style={styles.banner}>
          <Icon name="crown" size={28} color="#fff" />
          <Text style={styles.bannerText}>
            Vous souhaitez accèder à des statistiques plus avancées ?
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.button}
            onPress={() => router.push("/premium")}
          >
            <Text style={styles.buttonText}>S'abonner à premium</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1112",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  banner: {
    width: "100%",
    backgroundColor: "#D4AF37",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  bannerText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 16,
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#B8860B",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
});
