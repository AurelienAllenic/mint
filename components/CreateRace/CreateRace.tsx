import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import React, { useState } from "react";
import { ActivityIndicator, Button, Text, TextInput, View } from "react-native";
import { useAuth } from "../../context/auth"; // adapte ce chemin selon ton projet

const CreateRace = () => {
  const [raceName, setRaceName] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [gpxFileUri, setGpxFileUri] = useState<string | null>(null);
  const [gpxFileName, setGpxFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation<any>();
  const { token } = useAuth();
  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  const pickGpxFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });

    if (result.assets && result.assets.length > 0) {
      const file = result.assets[0];
      setGpxFileUri(file.uri);
      setGpxFileName(file.name);
    }
  };

  const createRace = async () => {
    if (!raceName.trim()) {
      setError("Nom de la course requis");
      return;
    }

    setLoading(true);
    try {
      if (!token) {
        setError("Token d'authentification manquant. Veuillez vous connecter.");
        setLoading(false);
        return;
      }

      // Essayer avec JSON au lieu de FormData
      let body: any = {
        name: raceName.trim(),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        distance: "0",
        positive_elevation: "0"
      };

      if (gpxFileUri) {
        // Envoyer le fichier GPX en string dans le JSON
        let gpxContent = await FileSystem.readAsStringAsync(gpxFileUri);
        console.log("Taille originale du fichier GPX:", gpxContent.length, "caractères");
        
        // Compresser le GPX en supprimant les espaces et retours à la ligne inutiles
        gpxContent = gpxContent
          .replace(/>\s+</g, '><')  // Supprimer espaces entre balises
          .replace(/\s+/g, ' ')     // Remplacer multiples espaces par un seul
          .trim();                  // Supprimer espaces début/fin
        
        console.log("Taille compressée:", gpxContent.length, "caractères");
        console.log("Compression:", Math.round((1 - gpxContent.length / (await FileSystem.readAsStringAsync(gpxFileUri)).length) * 100), "%");
        
        body.file = gpxContent;  // Champ "file" comme dans la doc
        
        console.log("Fichier GPX compressé envoyé en string dans JSON");
        console.log("Body final à envoyer:", {
          ...body,
          file: `[GPX content - ${gpxContent.length} chars]`  // Ne pas logger tout le contenu
        });
      }

      const response = await fetch(`${API_URL}/races`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token.startsWith("Bearer ")
            ? token
            : `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (response.ok) {
        const newRace = await response.json();
        setRaceName("");
        setGpxFileName(null);
        setGpxFileUri(null);
        setError(null);
        setLoading(false);
        navigation.navigate("RaceDetails", { raceId: newRace.id });
      } else {
        const errorText = await response.text();
        console.log("Erreur 400 - détails:", errorText);
        console.log("Request body envoyé:", JSON.stringify({
          ...body,
          file: body.file ? `[${body.file.length} chars]` : 'pas de fichier'
        }));
        setError(`Erreur HTTP ${response.status}: ${errorText}`);
        setLoading(false);
      }
    } catch (err) {
      console.error("Erreur lors de la création de la course:", err);
      setError(
        `Erreur lors de la création de la course: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Nom de la course :</Text>
      <TextInput
        placeholder="Nom de la course"
        value={raceName}
        onChangeText={setRaceName}
        style={{ borderBottomWidth: 1, marginBottom: 10 }}
      />

      <Text>Date de début :</Text>
      <DateTimePicker
        value={startDate}
        mode="datetime"
        onChange={(e, date) => date && setStartDate(date)}
      />

      <Text>Date de fin :</Text>
      <DateTimePicker
        value={endDate}
        mode="datetime"
        onChange={(e, date) => date && setEndDate(date)}
      />

      <Button title="Choisir un fichier GPX" onPress={pickGpxFile} />
      {gpxFileName && <Text>Fichier sélectionné : {gpxFileName}</Text>}

      {error && (
        <Text style={{ color: "red", marginVertical: 10 }}>{error}</Text>
      )}

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <Button title="Créer la course" onPress={createRace} />
      )}
    </View>
  );
};

export default CreateRace;
