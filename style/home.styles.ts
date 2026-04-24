import { StyleSheet } from "react-native";

const colors = {
  primary: "#8EFF00", 
  inputBg: "#FFFFFF",
  inputBorder: "#F2F2F2",
  inputBorderFocus: "#8EFF00",
  text: "#000000",
  textSecondary: "#6B7280",
  error: "#EF4444",
};

export const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  header: {
    marginTop: 40,
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: 7,
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  inputFocused: {
    borderColor: colors.inputBorderFocus,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: -8,
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
    fontStyle: "italic",
  },
  forgotPassword: {
    alignSelf: "center",
    marginTop: 16,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  logo: {
    width: 300,
    height: 70,
  },
  socialButtonsContainer: {
    marginTop: 24,
    gap: 12,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  socialButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  termsText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 24,
  },
});
