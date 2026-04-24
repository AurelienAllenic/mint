import { router } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require("@/assets/images/welcome-bg.png")}
        style={styles.background}
        resizeMode="cover"
      />
      <View style={styles.contentWrapper}>
        <Image
          source={require("@/assets/images/welcome-logo.png")}
          style={styles.topLogo}
          resizeMode="contain"
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            Reste <Text style={styles.green}>proche</Text>,{"\n"}
            même à <Text style={styles.green}>distance</Text>
          </Text>
        </View>

        <Text style={styles.subtitle}>Au cœur de la course</Text>
        <Text style={styles.description}>
          Suivez vos proches en temps réel, partagez chaque étape, vivez chaque
          victoire.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.buttonText}>Commencer maintenant</Text>
        </TouchableOpacity>
        <Text style={styles.footer}>
          J’ai déjà un compte ?{" "}
          <Text style={styles.link} onPress={() => router.push("/login")}>
            Se connecter
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topLogo: {
    position: "absolute",
    top: 80,
    left: 30,
    width: 40,
    height: 40,
    zIndex: 3,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    alignSelf: "center",
  },
  contentWrapper: {
    flex: 1,
    width: "100%",
    padding: 30,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 40,
    marginTop: 80,
    zIndex: 2,
  },
  title: {
    fontSize: 70,
    fontWeight: "900",
    color: "#fff",
    textAlign: "left",
    lineHeight: 75,
    marginBottom: 30,
    zIndex: 2,
    fontFamily: "Montserrat",
  },
  green: {
    color: "#A1F763",
    zIndex: 2,
    fontFamily: "Montserrat",
  },
  subtitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
    zIndex: 2,
    fontFamily: "Montserrat",
  },
  description: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.8,
    zIndex: 2,
    fontFamily: "Montserrat",
  },
  button: {
    backgroundColor: "#A1F763",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 24,
    width: "100%",
    alignItems: "center",
    zIndex: 2,
  },
  buttonText: {
    color: "#3B3B3B",
    fontWeight: "bold",
    fontSize: 20,
    zIndex: 2,
    fontFamily: "Montserrat",
  },
  footer: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
    zIndex: 2,
    fontFamily: "Montserrat",
  },
  link: {
    color: "#fff",
    textDecorationLine: "underline",
    fontWeight: "bold",
    zIndex: 2,
    fontFamily: "Montserrat",
  },
});
