import MapComponent from "@/components/Map/Map";
import type { Sponsor } from "@/types/api";
import { postAcceptInvitation } from "@/utils/invitationAccept";
import { sponsorsFromRace } from "@/utils/sponsors";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/auth";
import AddRunnersModal from "../components/AddRunnersModal/AddRunnersModal";

interface RaceDetails {
  _id: string;
  id?: string;
  name: string;
  startDate: string;
  endDate?: string;
  organization?: {
    _id: string;
    name: string;
  };
  runners?: any[];
  gpxFile?: string;
  owner?: any;
  // Champs pour compatibilité avec l'ancien format
  start_date?: string;
  distance?: number;
  standard_distance?: {
    id: number;
    name: string;
    distance: string;
  };
  location?: string;
  date?: string;
  participants?: number;
  maxParticipants?: number;
  category?: string;
  description?: string;
  end_date?: string;
  positive_elevation?: number;
  sponsors?: any[];
  sponsor?: any;
}

export default function RaceDetailsScreen() {
  const { raceId } = useLocalSearchParams<{ raceId: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [race, setRace] = useState<RaceDetails | null>(null);
  const [trackCoordinates, setTrackCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showRaceInfo, setShowRaceInfo] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasLoadedRace, setHasLoadedRace] = useState(false); // Flag pour éviter les rechargements multiples

  // NOUVEAUX ÉTATS POUR WEBSOCKET
  const [socket, setSocket] = useState<Socket | null>(null);
  const [runnerPositions, setRunnerPositions] = useState<Map<string, { lon: number; lat: number; alt: number }>>(new Map());
  const [rankings, setRankings] = useState<{ userId: string; progress: number; rank: number }[]>([]);
  const [isRunner, setIsRunner] = useState(false);
  const [isRankingExpanded, setIsRankingExpanded] = useState(true); // Par défaut, le classement est déplié
  const [isJoiningRace, setIsJoiningRace] = useState(false); // Flag pour éviter les appels multiples
  const [showAddRunnersModal, setShowAddRunnersModal] = useState(false);
  const [hasPendingInvitation, setHasPendingInvitation] = useState(false);
  const [pendingInvitationToken, setPendingInvitationToken] = useState<string | null>(null);
  
  // Vérifier si l'utilisateur est le propriétaire de la course
  const raceSponsors: Sponsor[] = useMemo(
    () => (race ? sponsorsFromRace(race) : []),
    [race]
  );

  const isOwner = useMemo(() => {
    if (!race || !user) return false;
    const ownerId = race.owner?._id || race.owner?.id || race.owner;
    const userId = user._id || user.id;
    return String(ownerId) === String(userId);
  }, [race, user]);

  // Surveiller les changements de rankings pour debug (désactivé pour éviter les logs excessifs)
  // useEffect(() => {
  //   console.log('📊 [Ranking] État rankings mis à jour:', rankings);
  //   console.log('📊 [Ranking] Nombre de coureurs:', rankings.length);
  //   if (rankings.length > 0) {
  //     console.log('📊 [Ranking] Top 3:', rankings.slice(0, 3));
  //   }
  // }, [rankings]);

  // Mettre à jour l'heure actuelle chaque seconde pour le compte à rebours
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fonction pour recharger les données de la course (accessible depuis les callbacks)
  const fetchRaceData = useCallback(async () => {
      if (!raceId) {
        return;
      }
      
      // Ne pas recharger si déjà chargé pour cette course
      if (hasLoadedRace && race?._id === raceId) {
        return;
      }

      setLoading(true);
      try {
        const API_URL =
          process.env.EXPO_PUBLIC_API_URL ||
          "https://back-mint-node.vercel.app";
        const authHeader = token?.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;

        // Récupérer les informations de la course
        const raceResponse = await fetch(`${API_URL}/race/${raceId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });

        if (raceResponse.ok) {
          const raceData = await raceResponse.json();

          // Normaliser un id (backend peut renvoyer string ou objet type { $oid: "..." })
          const toIdStr = (v: any): string => {
            if (v == null) return "";
            if (typeof v === "string") return v.trim();
            if (typeof v === "object" && v.$oid) return String(v.$oid);
            if (typeof v === "object" && (v._id || v.id)) return String(v._id ?? v.id);
            return String(v);
          };

          // Vérifier si l'utilisateur a une invitation pending pour cette course
          if (token && user?.email) {
            try {
              const invResponse = await fetch(`${API_URL}/invitations/my-invitations`, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: authHeader,
                },
              });
              if (invResponse.ok) {
                const invData = await invResponse.json();
                const allInvitations = invData.invitations || [];
                const currentRaceId = toIdStr(raceData._id ?? raceId);

                // L'API my-invitations ne renvoie que des invitations en attente (pas de champ status dans la réponse)
                const pendingInv = allInvitations.find((inv: any) => {
                  const invRaceId = toIdStr(inv.race?._id ?? inv.race ?? inv.raceId?._id ?? inv.raceId);
                  return invRaceId === currentRaceId;
                });

                if (pendingInv) {
                  setHasPendingInvitation(true);
                  setPendingInvitationToken(pendingInv.token ?? null);
                } else {
                  setHasPendingInvitation(false);
                  setPendingInvitationToken(null);
                }
              } else {
                setHasPendingInvitation(false);
                setPendingInvitationToken(null);
              }
            } catch (_invErr) {
              setHasPendingInvitation(false);
              setPendingInvitationToken(null);
            }
          } else {
            setHasPendingInvitation(false);
            setPendingInvitationToken(null);
          }

          // Adapter les données pour l'affichage
          const adaptedRace: RaceDetails = {
            ...raceData,
            // Compatibilité avec l'ancien format
            start_date: raceData.startDate,
            end_date: raceData.endDate,
            location: raceData.organization?.name,
            participants: raceData.runners?.length || 0,
            maxParticipants: 100, // Valeur par défaut
            category: "Course",
          };
          setRace(adaptedRace);
          setHasLoadedRace(true); // Marquer comme chargé

          // Récupérer le tracé depuis le contenu GPX de la course
          if (raceData.gpxFile && raceData.gpxFile.trim() !== "") {
            try {
              // Parser directement le contenu GPX stocké en base
              const { parseGpx } = await import("@/utils/gpxParser");
              const coordinates = parseGpx(raceData.gpxFile);

              if (coordinates.length > 0) {
                // Optimisation pour les performances
                let optimizedCoords = coordinates;

                if (coordinates.length > 20) {
                  const maxPoints = 15;
                  const step = Math.max(
                    1,
                    Math.floor((coordinates.length - 2) / maxPoints)
                  );

                  optimizedCoords = [
                    coordinates[0], // Premier point obligatoire
                    ...coordinates
                      .slice(1, -1)
                      .filter((_, i) => i % step === 0),
                    coordinates[coordinates.length - 1], // Dernier point obligatoire
                  ];

                  // S'assurer qu'on ne dépasse jamais 20 points au total
                  if (optimizedCoords.length > 20) {
                    const newStep = Math.ceil(optimizedCoords.length / 18);
                    optimizedCoords = [
                      optimizedCoords[0],
                      ...optimizedCoords
                        .slice(1, -1)
                        .filter((_, i) => i % newStep === 0),
                      optimizedCoords[optimizedCoords.length - 1],
                    ];
                  }
                }

                setTrackCoordinates(optimizedCoords);
              } else {
                console.warn("Aucune coordonnée trouvée dans le contenu GPX");
              }
            } catch (gpxError) {
              console.warn(
                "Erreur lors du traitement du contenu GPX:",
                gpxError
              );
            }
          } else {
            console.warn("Aucun contenu GPX associé à cette course");
          }
        } else {
          throw new Error("Impossible de récupérer les données de la course");
        }
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
        setError("Impossible de charger les données de la course");
      } finally {
        setLoading(false);
      }
  }, [raceId, token]);

  useEffect(() => {
    // Réinitialiser le flag quand on change de course
    if (race?._id !== raceId) {
      setHasLoadedRace(false);
      setHasPendingInvitation(false); // Réinitialiser aussi l'invitation pending
      setPendingInvitationToken(null); // Réinitialiser le token
    }
    
    // Ne pas recharger si déjà chargé pour cette course
    if (hasLoadedRace && race?._id === raceId) {
      return;
    }

    fetchRaceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceId, token, fetchRaceData]); // hasLoadedRace n'est pas dans les dépendances pour éviter les boucles

  // NOUVEAU useEffect pour initialiser le WebSocket
  useEffect(() => {
    if (!race || !raceId || isJoiningRace || !hasLoadedRace) return; // Ne pas se reconnecter si la course n'est pas encore chargée

    const raceIdToUse = race._id || race.id;
    if (!raceIdToUse) return;

    // Vérifier si l'utilisateur est un coureur
    // IMPORTANT: Ne pas considérer comme runner si invitation est encore pending
    const userId = user?._id;
    const userIsInRunners = race.runners?.some(
      (runner: any) => String(runner._id ?? runner.id ?? "") === String(userId ?? "")
    ) || false;
    
    // Si invitation pending, ne pas considérer comme runner même s'il est dans runners
    const userIsRunner = userIsInRunners && !hasPendingInvitation;
    
    setIsRunner(userIsRunner);
    
    if (hasPendingInvitation && userIsInRunners) {
      console.log("[RaceDetails] ⚠️ Utilisateur dans runners mais invitation pending - mode SPECTATEUR forcé");
    }

    const WS_API_URL = "http://mint-dev-ws.charles-chrismann.fr";
    let newSocket: Socket;

    console.log('🔌 [WebSocket] Tentative de connexion à:', WS_API_URL);
    console.log('🔌 [WebSocket] Mode:', userIsRunner && token ? 'COUREUR (avec JWT)' : 'SPECTATEUR (sans auth)');

    // TEST TEMPORAIRE : Forcer la connexion sans auth pour diagnostiquer
    const FORCE_NO_AUTH = false; // Mettre à true pour tester sans JWT
    
    if (userIsRunner && token && !FORCE_NO_AUTH) {
      const cleanToken = token.startsWith("Bearer ") ? token.replace("Bearer ", "") : token;
      console.log('🔑 [WebSocket] JWT présent:', cleanToken.substring(0, 20) + '...');
      
      newSocket = io(WS_API_URL, {
        auth: { token: cleanToken },
        transports: ['polling', 'websocket'], // Essayer polling en premier
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000, // Augmenter le timeout
      });
    } else {
      if (FORCE_NO_AUTH) console.warn('⚠️ [WebSocket] MODE TEST : Connexion sans auth forcée');
      else console.log('👁️ [WebSocket] Connexion sans authentification');
      
      newSocket = io(WS_API_URL, {
        transports: ['polling', 'websocket'], // Essayer polling en premier
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000, // Augmenter le timeout
      });
    }

    // Écouter les mises à jour de positions et rankings
    newSocket.on('positions', (updateData: { positions: [string, number, number, number][], ranking: [string, number][] }) => {
      console.log('═══════════════════════════════════════════════════════');
      console.log('📊 [STATS] Données complètes reçues du WebSocket:');
      console.log(JSON.stringify(updateData, null, 2));
      console.log('═══════════════════════════════════════════════════════');
      
      // Le serveur envoie "ranking" (sans 's'), pas "rankings"
      const { positions, ranking: rankingsData } = updateData;
      
      // ========== STATISTIQUES DES POSITIONS ==========
      console.log('📍 [STATS] === POSITIONS ===');
      console.log(`📍 [STATS] Nombre total de positions: ${positions?.length || 0}`);
      
      if (positions && positions.length > 0) {
        positions.forEach(([userId, lon, lat, alt], index) => {
          const isCurrentUser = userId === user?._id;
          const prefix = isCurrentUser ? '👤 [STATS] VOUS' : `📍 [STATS] Coureur #${index + 1}`;
          console.log(`${prefix} - ID: ${userId.substring(0, 8)}...`);
          console.log(`   📍 Coordonnées: lat=${lat.toFixed(6)}, lon=${lon.toFixed(6)}, alt=${alt.toFixed(2)}m`);
        });
      }
      
      // ========== STATISTIQUES DU CLASSEMENT ==========
      console.log('🏆 [STATS] === CLASSEMENT ===');
      console.log(`🏆 [STATS] Nombre de coureurs classés: ${rankingsData?.length || 0}`);
      
      if (rankingsData && rankingsData.length > 0) {
        rankingsData.forEach(([userId, progress], index) => {
          const rank = index + 1;
          const isCurrentUser = userId === user?._id;
          const prefix = isCurrentUser ? '👤 [STATS] VOUS' : `🏆 [STATS] #${rank}`;
          const progressKm = (progress / 1000).toFixed(2);
          const progressM = progress.toFixed(0);
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
          
          console.log(`${prefix} ${medal} - ID: ${userId.substring(0, 8)}...`);
          console.log(`   📏 Progression: ${progressM}m (${progressKm}km)`);
          console.log(`   🏅 Rang: #${rank}`);
        });
        
        // Statistiques globales
        const totalDistance = rankingsData.reduce((sum, [, progress]) => sum + progress, 0);
        const avgDistance = totalDistance / rankingsData.length;
        const maxDistance = Math.max(...rankingsData.map(([, progress]) => progress));
        const minDistance = Math.min(...rankingsData.map(([, progress]) => progress));
        
        console.log('📊 [STATS] === STATISTIQUES GLOBALES ===');
        console.log(`📊 [STATS] Distance totale parcourue (tous coureurs): ${(totalDistance / 1000).toFixed(2)}km`);
        console.log(`📊 [STATS] Distance moyenne: ${(avgDistance / 1000).toFixed(2)}km`);
        console.log(`📊 [STATS] Distance max: ${(maxDistance / 1000).toFixed(2)}km`);
        console.log(`📊 [STATS] Distance min: ${(minDistance / 1000).toFixed(2)}km`);
        
        // Votre position dans le classement
        const userRanking = rankingsData.findIndex(([uid]) => uid === user?._id);
        if (userRanking !== -1) {
          const userRank = userRanking + 1;
          const userProgress = rankingsData[userRanking][1];
          console.log('👤 [STATS] === VOTRE STATISTIQUE ===');
          console.log(`👤 [STATS] Votre rang: #${userRank}`);
          console.log(`👤 [STATS] Votre progression: ${(userProgress / 1000).toFixed(2)}km (${userProgress.toFixed(0)}m)`);
          if (userRank > 1) {
            const leaderProgress = rankingsData[0][1];
            const gap = leaderProgress - userProgress;
            console.log(`👤 [STATS] Écart avec le leader: ${(gap / 1000).toFixed(2)}km (${gap.toFixed(0)}m)`);
          }
        }
      } else {
        console.warn('⚠️ [STATS] Aucune donnée de ranking disponible');
      }
      
      console.log('═══════════════════════════════════════════════════════');
      
      // Mettre à jour les positions (en conservant les anciennes)
      setRunnerPositions(prevPositions => {
        const updatedPositions = new Map(prevPositions);
        positions.forEach(([userId, lon, lat, alt]) => {
          updatedPositions.set(userId, { lon, lat, alt });
        });
        return updatedPositions;
      });

      // Mettre à jour le ranking
      if (rankingsData && rankingsData.length > 0) {
        const newRankings = rankingsData.map(([userId, progress], index) => ({
          userId,
          progress,
          rank: index + 1
        }));
        // console.log('✅ [Ranking] Nouveau classement calculé:', newRankings);
        setRankings(newRankings);
      } else {
        // console.warn('⚠️ [Ranking] Aucune donnée de ranking dans la réponse');
        // Si pas de rankings mais des positions, on peut créer un classement basique
        if (positions && positions.length > 0) {
          // console.log('⚠️ [Ranking] Pas de ranking du serveur, calcul basé sur les positions');
          const fallbackRankings = positions.map(([userId], index) => ({
            userId,
            progress: 0, // On ne peut pas calculer la progression sans le GPX
            rank: index + 1
          }));
          setRankings(fallbackRankings);
        } else {
          setRankings([]);
        }
      }
    });

    newSocket.on('connect', () => {
      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ [STATS] === CONNEXION WEBSOCKET ===');
      console.log(`✅ [STATS] Socket ID: ${newSocket.id}`);
      console.log(`✅ [STATS] Transport utilisé: ${newSocket.io.engine.transport.name}`);
      console.log(`✅ [STATS] Mode: ${userIsRunner ? 'COUREUR' : 'SPECTATEUR'}`);
      console.log(`✅ [STATS] Course ID: ${raceIdToUse}`);
      console.log(`✅ [STATS] Nombre de participants: ${race.runners?.length || 0}`);
      console.log(`✅ [STATS] Timestamp: ${new Date().toISOString()}`);
      console.log('═══════════════════════════════════════════════════════');
      
      newSocket.emit('join-race', raceIdToUse);
      console.log('✅ [STATS] Événement join-race émis');
    });

    // Écouter tous les événements pour debug
    newSocket.onAny((eventName, ...args) => {
      console.log(`📡 [WebSocket] Événement reçu: ${eventName}`, args);
    });

    newSocket.on('connect_error', (error: any) => {
      console.error('❌ [WebSocket] Erreur de connexion:', error.message);
      console.error('❌ [WebSocket] Détails complets:', JSON.stringify(error, null, 2));
      
      // Si c'est un problème d'auth, essayer de se reconnecter sans auth
      if (error.message === 'Unauthorized' || error.message.includes('websocket error')) {
        console.warn('⚠️ [WebSocket] Le serveur rejette la connexion. Vérifiez le JWT_SECRET.');
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ [WebSocket] Déconnecté:', reason);
      if (reason === 'io server disconnect') {
        console.warn('⚠️ [WebSocket] Le serveur a fermé la connexion');
      } else if (reason === 'transport error') {
        console.error('⚠️ [WebSocket] Erreur de transport - le serveur est-il accessible ?');
      }
    });

    newSocket.io.on('error', (error) => {
      console.error('❌ [WebSocket] Erreur du moteur:', error);
    });

    newSocket.io.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 [WebSocket] Tentative de reconnexion #${attemptNumber}`);
    });

    newSocket.io.on('reconnect_failed', () => {
      console.error('❌ [WebSocket] Toutes les tentatives de reconnexion ont échoué');
      console.error('💡 [WebSocket] Le serveur http://mint-dev-ws.charles-chrismann.fr est-il en ligne ?');
    });

    setSocket(newSocket);

    return () => {
      console.log('🧹 [WebSocket] Nettoyage - déconnexion');
      newSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race, raceId, isJoiningRace, hasLoadedRace, user?._id, hasPendingInvitation, token]);


  // NOUVEAU useEffect pour envoyer la position du coureur
  useEffect(() => {
    if (!isRunner || !socket || !raceId || !race) {
      return;
    }

    const raceIdToUse = race._id || race.id;
    if (!raceIdToUse) return;

    let subscription: Location.LocationSubscription | null = null;

    // Demander les permissions de localisation
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.warn('❌ Permission de localisation refusée');
        return;
      }

      // Surveiller la position et l'envoyer au WebSocket
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (location) => {
          if (socket && socket.connected) {
            const positionData = {
              raceId: raceIdToUse,
              position: {
                lon: location.coords.longitude,
                lat: location.coords.latitude,
                alt: location.coords.altitude || 0,
              }
            };
            
            // Logger les statistiques de position envoyées
            console.log('📤 [STATS] === POSITION ENVOYÉE ===');
            console.log(`📤 [STATS] Course ID: ${raceIdToUse}`);
            console.log(`📤 [STATS] Coordonnées: lat=${location.coords.latitude.toFixed(6)}, lon=${location.coords.longitude.toFixed(6)}`);
            console.log(`📤 [STATS] Altitude: ${(location.coords.altitude || 0).toFixed(2)}m`);
            if (location.coords.accuracy) {
              console.log(`📤 [STATS] Précision: ±${location.coords.accuracy.toFixed(2)}m`);
            }
            if (location.coords.speed) {
              console.log(`📤 [STATS] Vitesse: ${(location.coords.speed * 3.6).toFixed(2)}km/h`);
            }
            if (location.coords.heading) {
              console.log(`📤 [STATS] Direction: ${location.coords.heading.toFixed(1)}°`);
            }
            console.log(`📤 [STATS] Timestamp: ${new Date(location.timestamp).toISOString()}`);
            console.log('═══════════════════════════════════════════════════════');
            
            socket.emit('position', positionData);
          } else {
            console.warn('⚠️ [STATS] Socket non connecté, position non envoyée');
          }
        }
      );
    })();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isRunner, socket, raceId, race]);

  // Calculer la région pour centrer la carte sur le tracé (mémorisé)
  const mapRegion = useMemo(() => {
    if (!trackCoordinates || trackCoordinates.length === 0) {
      console.log("Aucune coordonnée de tracé, pas de région calculée");
      return undefined;
    }

    const latitudes = trackCoordinates.map((c) => c.latitude);
    const longitudes = trackCoordinates.map((c) => c.longitude);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const region = {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.01, (maxLat - minLat) * 1.2),
      longitudeDelta: Math.max(0.01, (maxLng - minLng) * 1.2),
    };

    return region;
  }, [trackCoordinates]);

  // Calculer la distance du tracé (mémorisé)
  const calculatedDistance = useMemo(() => {
    if (!trackCoordinates || trackCoordinates.length < 2) return 0;

    let total = 0;
    for (let i = 1; i < trackCoordinates.length; i++) {
      const prev = trackCoordinates[i - 1];
      const curr = trackCoordinates[i];
      const R = 6371; // Rayon de la Terre en km
      const dLat = ((curr.latitude - prev.latitude) * Math.PI) / 180;
      const dLon = ((curr.longitude - prev.longitude) * Math.PI) / 180;
      const lat1 = (prev.latitude * Math.PI) / 180;
      const lat2 = (curr.latitude * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) *
          Math.sin(dLon / 2) *
          Math.cos(lat1) *
          Math.cos(lat2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      total += R * c;
    }
    return total;
  }, [trackCoordinates]);

  // Fonction pour gérer l'inscription à la course
  const handleAcceptInvitation = async () => {
    if (!pendingInvitationToken || !token) return;

    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://back-mint-node.vercel.app";
      const authHeader = token?.startsWith("Bearer ") ? token : `Bearer ${token}`;
      
      const raceIdToUse = String(race?._id || race?.id || raceId || "");
      const response = await postAcceptInvitation(
        API_URL,
        token,
        pendingInvitationToken,
        raceIdToUse
      );

      if (response.ok) {
        Alert.alert("Succès", "Invitation acceptée ! Vous pouvez maintenant participer à la course.");
        // Recharger les données de la course pour mettre à jour le statut
        setHasLoadedRace(false);
        setHasPendingInvitation(false);
        setPendingInvitationToken(null);
        // Recharger la course
        if (raceIdToUse) {
          const raceResponse = await fetch(`${API_URL}/race/${raceIdToUse}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
            },
          });
          if (raceResponse.ok) {
            const raceData = await raceResponse.json();
            const adaptedRace: RaceDetails = {
              ...raceData,
              start_date: raceData.startDate,
              end_date: raceData.endDate,
              location: raceData.organization?.name,
              participants: raceData.runners?.length || 0,
              maxParticipants: 100,
              category: "Course",
            };
            setRace(adaptedRace);
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
        Alert.alert("Erreur", errorData.error || "Impossible d'accepter l'invitation");
      }
    } catch (error) {
      console.error("[RaceDetails] Erreur acceptation invitation:", error);
      Alert.alert("Erreur", "Impossible d'accepter l'invitation");
    }
  };

  const handleDeclineInvitation = async () => {
    if (!pendingInvitationToken) return;

    Alert.alert(
      "Décliner l'invitation",
      "Êtes-vous sûr de vouloir décliner cette invitation ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Décliner",
          style: "destructive",
          onPress: async () => {
            try {
              const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://back-mint-node.vercel.app";
              const authHeader = token?.startsWith("Bearer ") ? token : `Bearer ${token}`;
              
              const response = await fetch(`${API_URL}/invitations/token/${pendingInvitationToken}/reject`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: authHeader,
                },
              });

              if (response.ok) {
                Alert.alert("Succès", "Invitation déclinée.", [
                  {
                    text: "OK",
                    onPress: () => router.back(), // Retourner en arrière après déclinaison
                  },
                ]);
                setHasPendingInvitation(false);
                setPendingInvitationToken(null);
              } else {
                const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
                Alert.alert("Erreur", errorData.error || "Impossible de décliner l'invitation");
              }
            } catch (error) {
              console.error("[RaceDetails] Erreur déclinaison invitation:", error);
              Alert.alert("Erreur", "Impossible de décliner l'invitation");
            }
          },
        },
      ]
    );
  };

  const handleJoinRace = async () => {
    if (!race?._id && !race?.id || isJoiningRace) return; // Éviter les appels multiples

    setIsJoiningRace(true);
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://back-mint-node.vercel.app";
      const raceIdToUse = race._id || race.id;
      const authHeader = token?.startsWith("Bearer ") ? token : `Bearer ${token}`;

      console.log(`Tentative d'inscription à la course ${raceIdToUse}`);

      const response = await fetch(`${API_URL}/race/${raceIdToUse}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
      });

      if (response.ok) {
        // Mettre à jour uniquement la liste des runners sans recharger toute la course
        // Cela évite de déclencher le useEffect du WebSocket
        const raceResponse = await fetch(`${API_URL}/race/${raceIdToUse}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });

        if (raceResponse.ok) {
          const raceData = await raceResponse.json();
          // Mettre à jour uniquement les runners SANS créer un nouvel objet race
          // Cela évite de déclencher le useEffect du WebSocket
          const userId = user?._id;
          const userIsRunner = raceData.runners?.some(
            (runner: any) => (runner._id || runner.id) === userId
          ) || false;
          setIsRunner(userIsRunner);
          
          // Mettre à jour race de manière optimisée
          setRace(prevRace => {
            if (!prevRace) return prevRace;
            // Ne mettre à jour que si les runners ont vraiment changé
            const runnersChanged = JSON.stringify(prevRace.runners) !== JSON.stringify(raceData.runners);
            if (!runnersChanged) return prevRace;
            
            return {
              ...prevRace,
              runners: raceData.runners,
              participants: raceData.runners?.length || 0,
            };
          });
          console.log("✅ Inscription réussie, statut mis à jour");
        }
      } else {
        const errorText = await response.text();
        alert(`Erreur: ${errorText}`);
      }
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error);
      alert("Erreur lors de l'inscription à la course");
    } finally {
      setIsJoiningRace(false);
    }
  };

    // Fonction pour quitter la course
    const handleLeaveRace = async () => {
      if (!race?._id && !race?.id) return;
  
      try {
        const API_URL = process.env.EXPO_PUBLIC_API_URL;
        const raceIdToUse = race._id || race.id;
        const authHeader = token?.startsWith("Bearer ") ? token : `Bearer ${token}`;
  
        console.log(`Tentative de désinscription de la course ${raceIdToUse}`);
  
        const response = await fetch(`${API_URL}/race/${raceIdToUse}/leave`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });
  
        if (response.ok) {
          alert(`Vous avez quitté la course "${race.name}"`);
          // Recharger les données de la course
          router.back(); // Ou recharger la page
        } else {
          const errorText = await response.text();
          alert(`Erreur: ${errorText}`);
        }
      } catch (error) {
        console.error("Erreur lors de la désinscription:", error);
        alert("Erreur lors de la désinscription de la course");
      }
    };

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);

      return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return dateString;
    }
  };

  // Fonction pour formater la distance
  const formatDistance = (distanceInMeters: number) => {
    if (distanceInMeters >= 1000) {
      return `${(distanceInMeters / 1000).toFixed(1)} km`;
    }
    return `${distanceInMeters} m`;
  };

  // Fonction pour déterminer le statut de la course
  const getRaceStatus = () => {
    if (!race?.startDate) return { status: "unknown", color: "#888" };

    const now = currentTime;
    const startDate = new Date(race.startDate);
    const endDate = race.endDate ? new Date(race.endDate) : null;

    if (now < startDate) {
      return { status: "upcoming", color: "#FFB020", label: "À venir" };
    } else if (endDate && now > endDate) {
      return { status: "finished", color: "#666", label: "Terminée" };
    } else {
      return { status: "ongoing", color: "#A1F763", label: "En cours" };
    }
  };

  // Fonction pour calculer le temps restant
  const getTimeRemaining = () => {
    if (!race?.startDate) return null;

    const now = currentTime;
    const startDate = new Date(race.startDate);
    const endDate = race.endDate ? new Date(race.endDate) : null;
    const raceStatus = getRaceStatus();

    let targetDate: Date;
    let prefix: string;

    if (raceStatus.status === "upcoming") {
      targetDate = startDate;
      prefix = "Commence dans";
    } else if (raceStatus.status === "ongoing" && endDate) {
      targetDate = endDate;
      prefix = "Se termine dans";
    } else {
      return null;
    }

    const timeDiff = targetDate.getTime() - now.getTime();

    if (timeDiff <= 0) return null;

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${prefix} ${days}j ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${prefix} ${hours}h ${minutes}m ${seconds}s`;
    } else {
      return `${prefix} ${minutes}m ${seconds}s`;
    }
  };

  // Fonction de rendu d'un participant (mémorisée)
  const renderParticipantItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <View style={styles.participantItem}>
      <View style={styles.participantAvatar}>
        <Text style={styles.participantAvatarText}>
          {item.firstname?.charAt(0)?.toUpperCase() ||
            item.name?.charAt(0)?.toUpperCase() ||
            item.email?.charAt(0)?.toUpperCase() ||
            (index + 1).toString()}
        </Text>
      </View>
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>
          {item.firstname && item.lastname
            ? `${item.firstname} ${item.lastname}`
            : item.name ||
              item.email ||
              `Participant ${index + 1}`}
        </Text>
        {item.email && (
          <Text style={styles.participantEmail}>{item.email}</Text>
        )}
        {item.progress !== undefined && (
          <Text style={styles.participantProgress}>
            {item.progress.toFixed(0)} m parcourus
          </Text>
        )}
      </View>
      <View style={styles.participantNumber}>
        <Text style={styles.participantNumberText}>
          {item.rank ? (
            item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`
          ) : (
            `#${index + 1}`
          )}
        </Text>
      </View>
    </View>
  ), []);

  // Fonction keyExtractor mémorisée
  const keyExtractor = useCallback((item: any, index: number) => 
    item._id || item.id || `participant-${index}`, []
  );

  // Mémoriser les participants avec leur classement
  const participants = useMemo(() => {
    const runners = race?.runners || [];
    
    // Si on a des rankings, les ajouter aux participants
    if (rankings.length > 0) {
      return runners.map((runner: any) => {
        const runnerId = runner._id || runner.id;
        const ranking = rankings.find(r => r.userId === runnerId);
        return {
          ...runner,
          rank: ranking?.rank,
          progress: ranking?.progress
        };
      }).sort((a, b) => {
        // Trier par rang (si disponible)
        if (a.rank && b.rank) return a.rank - b.rank;
        if (a.rank) return -1;
        if (b.rank) return 1;
        return 0;
      });
    }
    
    return runners;
  }, [race?.runners, rankings]);

  // Composant Modal pour les participants (ne se re-render que si nécessaire)
  const ParticipantsModal = useMemo(() => {
    if (!showParticipantsModal) return null;
    
    return (
      <Modal
        visible={true}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowParticipantsModal(false)}
      >
        <View style={styles.modalContainer}>
          <BlurView style={styles.modalHeader} intensity={40} tint="dark">
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>
                Participants ({participants.length})
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowParticipantsModal(false)}
              >
                <Icon name="close" size={24} color="#A1F763" />
              </TouchableOpacity>
            </View>
          </BlurView>

          <View style={styles.modalContent}>
            {participants.length === 0 ? (
              <View style={styles.emptyParticipants}>
                <Icon name="account-off" size={60} color="#888" />
                <Text style={styles.emptyParticipantsText}>
                  Aucun participant
                </Text>
                <Text style={styles.emptyParticipantsSubText}>
                  Cette course n&apos;a pas encore de participants inscrits.
                </Text>
              </View>
            ) : (
              <FlatList
                data={participants}
                keyExtractor={keyExtractor}
                renderItem={renderParticipantItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.participantsList}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={10}
                windowSize={10}
              />
            )}
          </View>
        </View>
      </Modal>
    );
  }, [showParticipantsModal, participants, keyExtractor, renderParticipantItem]);

  // NOUVELLE fonction pour obtenir le nom d'un coureur depuis son ID (mémorisée)
  const getRunnerName = useCallback((userId: string) => {
    const runner = race?.runners?.find((r: any) => (r._id || r.id) === userId);
    if (runner) {
      return runner.firstname && runner.lastname
        ? `${runner.firstname} ${runner.lastname}`
        : runner.email || `Coureur ${userId.substring(0, 8)}`;
    }
    return `Coureur ${userId.substring(0, 8)}`;
  }, [race?.runners]);

  // Mémoriser les positions pour éviter de recréer le tableau à chaque render
  const runnerPositionsArray = useMemo(() => {
    return Array.from(runnerPositions.entries()).map(([userId, pos]) => ({
      userId,
      latitude: pos.lat,
      longitude: pos.lon,
    }));
  }, [runnerPositions]);

  // Fonction de rendu pour le ranking (mémorisée)
  const renderRankingItem = useCallback(({ item }: { item: { userId: string; progress: number; rank: number } }) => (
    <View style={styles.rankingItem}>
      <View style={styles.rankingPosition}>
        <Text style={styles.rankingPositionText}>
          {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`}
        </Text>
      </View>
      <View style={styles.rankingInfo}>
        <Text style={styles.rankingName}>{getRunnerName(item.userId)}</Text>
        <Text style={styles.rankingProgress}>
          {item.progress.toFixed(0)} m parcourus
        </Text>
      </View>
    </View>
  ), [getRunnerName]);

  // KeyExtractor pour le ranking
  const rankingKeyExtractor = useCallback((item: { userId: string; progress: number; rank: number }) => item.userId, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A1F763" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header avec design identique à home */}
      <View style={styles.headerContainer}>
        <BlurView style={styles.header} intensity={40} tint="dark">
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButtonHeader}
              onPress={() => router.back()}
            >
              <Icon name="arrow-left" size={24} color="#A1F763" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>
                {race?.name || "Détails de la course"}
              </Text>
              {/* Indicateur de statut de la course */}
              {race?.startDate && (
                <View style={styles.statusContainer}>
                  <View
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: getRaceStatus().color },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: getRaceStatus().color },
                    ]}
                  >
                    {getRaceStatus().label}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.headerSpacer} />
          </View>
        </BlurView>
      </View>

      {/* Panneau de compte à rebours pour les courses en cours ou à venir */}
      {getTimeRemaining() && (
        <View style={styles.countdownContainer}>
          <BlurView style={styles.countdownBlur} intensity={40} tint="dark">
            <View style={styles.countdownContent}>
              <Icon
                name={
                  getRaceStatus().status === "ongoing"
                    ? "timer"
                    : "clock-outline"
                }
                size={24}
                color={getRaceStatus().color}
              />
              <Text
                style={[styles.countdownText, { color: getRaceStatus().color }]}
              >
                {getTimeRemaining()}
              </Text>
            </View>
          </BlurView>
        </View>
      )}

      {/* Informations de la course directement sur la page */}
      {showRaceInfo && (
        <View style={styles.raceInfoContainer}>
          <BlurView style={styles.raceInfoBlur} intensity={40} tint="dark">
            <View style={styles.raceInfoContent}>
              {/* Grille d'informations */}
              <View style={styles.infoGrid}>
                {/* Statut de la course */}
                {race?.startDate && (
                  <View
                    style={[
                      styles.infoCard,
                      getRaceStatus().status === "ongoing" &&
                        styles.ongoingRaceCard,
                    ]}
                  >
                    <View
                      style={[
                        styles.infoIconContainer,
                        { backgroundColor: getRaceStatus().color },
                      ]}
                    >
                      <Icon
                        name={
                          getRaceStatus().status === "ongoing"
                            ? "play"
                            : getRaceStatus().status === "upcoming"
                            ? "clock-outline"
                            : "check"
                        }
                        size={24}
                        color="#0F0F0F"
                      />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Statut</Text>
                      <Text
                        style={[
                          styles.infoValue,
                          { color: getRaceStatus().color },
                        ]}
                      >
                        {getRaceStatus().label}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Distance */}
                {(calculatedDistance > 0 || race?.distance) && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoIconContainer}>
                      <Icon
                        name="map-marker-distance"
                        size={24}
                        color="#0F0F0F"
                      />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Distance</Text>
                      <Text style={styles.infoValue}>
                        {calculatedDistance > 0
                          ? `${calculatedDistance.toFixed(2)} km`
                          : race?.distance
                          ? formatDistance(race.distance)
                          : "Inconnue"}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Date de début */}
                {(race?.startDate || race?.start_date) && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoIconContainer}>
                      <Icon name="calendar-start" size={24} color="#0F0F0F" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Début</Text>
                      <Text style={styles.infoValue}>
                        {formatDate(race.startDate || race.start_date!)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Date de fin */}
                {(race?.endDate || race?.end_date) && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoIconContainer}>
                      <Icon name="calendar-end" size={24} color="#0F0F0F" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Fin</Text>
                      <Text style={styles.infoValue}>
                        {formatDate(race.endDate || race.end_date!)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Organisation */}
                {race?.organization?.name && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoIconContainer}>
                      <Icon name="domain" size={24} color="#0F0F0F" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Organisation</Text>
                      <Text style={styles.infoValue}>
                        {race.organization.name}
                      </Text>
                    </View>
                  </View>
                )}

                {raceSponsors.length > 0 && (
                  <View style={styles.sponsorsBanner}>
                    <Text style={styles.sponsorsBannerLabel}>Sponsors</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.sponsorsScrollContent}
                    >
                      {raceSponsors.map((sp) => (
                        <TouchableOpacity
                          key={sp.id}
                          style={styles.sponsorLogoWrap}
                          disabled={!sp.websiteUrl}
                          onPress={() => {
                            if (sp.websiteUrl) {
                              Linking.openURL(sp.websiteUrl).catch(() => {});
                            }
                          }}
                          activeOpacity={0.85}
                        >
                          {sp.image ? (
                            <Image
                              source={{ uri: sp.image }}
                              style={styles.sponsorLogoImg}
                              resizeMode="contain"
                            />
                          ) : (
                            <View style={styles.sponsorLogoPlaceholder}>
                              <Text style={styles.sponsorLogoInitial}>
                                {(sp.name || "?").slice(0, 1).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <Text style={styles.sponsorLogoName} numberOfLines={2}>
                            {sp.name || "Sponsor"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Participants */}
                {race?.runners && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoIconContainer}>
                      <Icon name="account-group" size={24} color="#0F0F0F" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Participants</Text>
                      <Text style={styles.infoValue}>
                        {race.runners.length} inscrit
                        {race.runners.length > 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </BlurView>
        </View>
      )}

      {/* NOUVEAU : Affichage du ranking si disponible */}
      {rankings.length > 0 ? (
        <View style={styles.rankingContainer}>
          <BlurView style={styles.rankingBlur} intensity={40} tint="dark">
            <TouchableOpacity 
              style={styles.rankingHeader}
              onPress={() => setIsRankingExpanded(!isRankingExpanded)}
              activeOpacity={0.7}
            >
              <Icon name="trophy" size={24} color="#A1F763" />
              <Text style={styles.rankingTitle}>Classement en direct</Text>
              <Icon 
                name={isRankingExpanded ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#A1F763" 
                style={styles.rankingChevron}
              />
            </TouchableOpacity>
            {isRankingExpanded && (
              <FlatList
                data={rankings.slice(0, 5)} // Top 5
                keyExtractor={rankingKeyExtractor}
                renderItem={renderRankingItem}
                removeClippedSubviews={true}
                maxToRenderPerBatch={5}
                initialNumToRender={5}
              />
            )}
          </BlurView>
        </View>
      ) : socket && socket.connected ? (
        // Afficher un message si connecté mais pas de données
        <View style={styles.rankingContainer}>
          <BlurView style={styles.rankingBlur} intensity={40} tint="dark">
            <View style={styles.rankingHeader}>
              <Icon name="trophy-outline" size={24} color="#888" />
              <Text style={[styles.rankingTitle, { color: '#888' }]}>En attente du classement...</Text>
            </View>
          </BlurView>
        </View>
      ) : null}

      {/* Carte avec le même style que home */}
      <View style={styles.mapContainer}>
        <MapComponent
          user={{ email: user?.email }}
          gpxCoordinates={trackCoordinates}
          region={mapRegion}
          forceTrackCentering={true}
          runnerPositions={runnerPositionsArray}
        />
        <Image
          source={require("@/assets/images/radial-gradient.png")}
          style={styles.radialGradient}
          resizeMode="cover"
        />
      </View>

      {/* Boutons d'action avec le style home */}
      <View style={styles.container__btns}>
        {!user?.isVisitor && (
          // Interface pour utilisateur connecté : rejoindre (sauf propriétaire) et retour
          <View style={styles.mainButtonsContainer}>
            {!isOwner && hasPendingInvitation ? (
              <View style={styles.pendingInvitationContainer}>
                <BlurView style={styles.pendingInvitationBlur} intensity={40} tint="dark">
                  <Icon name="email-outline" size={24} color="#A1F763" />
                  <Text style={styles.pendingInvitationText}>
                    Vous avez une invitation en attente pour cette course
                  </Text>
                  <View style={styles.invitationButtonsContainer}>
                    <TouchableOpacity
                      style={styles.acceptInvitationButton}
                      onPress={handleAcceptInvitation}
                    >
                      <Icon name="check" size={20} color="#000" />
                      <Text style={styles.acceptInvitationButtonText}>Accepter</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineInvitationButton}
                      onPress={handleDeclineInvitation}
                    >
                      <Icon name="close" size={20} color="#fff" />
                      <Text style={styles.declineInvitationButtonText}>Refuser</Text>
                    </TouchableOpacity>
                  </View>
                </BlurView>
              </View>
            ) : !isOwner ? (
              <TouchableOpacity
                style={isRunner ? styles.leaveButton : styles.joinButton}
                onPress={isRunner ? handleLeaveRace : handleJoinRace}
                activeOpacity={0.8}
                disabled={isJoiningRace}
              >
                <BlurView
                  style={styles.joinButtonBlur}
                  intensity={40}
                  tint="dark"
                >
                  <Text style={styles.joinButtonText}>
                    {isJoiningRace ? 'INSCRIPTION...' : (isRunner ? 'QUITTER' : 'REJOINDRE')}
                  </Text>
                </BlurView>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.mainButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.mainButtonText}>RETOUR</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.roundButton}>
            <BlurView style={styles.roundButtonBlur} intensity={40} tint="dark">
              <Icon name="share" size={28} color="#fff" />
            </BlurView>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.roundButton}
            onPress={() => setShowParticipantsModal(true)}
          >
            <BlurView style={styles.roundButtonBlur} intensity={40} tint="dark">
              <Icon name="account-group" size={28} color="#fff" />
            </BlurView>
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity
              style={styles.roundButton}
              onPress={() => setShowAddRunnersModal(true)}
            >
              <BlurView style={styles.roundButtonBlur} intensity={40} tint="dark">
                <Icon name="account-plus" size={28} color="#A1F763" />
              </BlurView>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.roundButton}
            onPress={() => setShowRaceInfo(!showRaceInfo)}
          >
            <BlurView style={styles.roundButtonBlur} intensity={40} tint="dark">
              <Icon name="information-outline" size={28} color="#fff" />
            </BlurView>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal des participants */}
      {ParticipantsModal}

      {/* Modal pour ajouter des coureurs (propriétaire uniquement) */}
      {isOwner && race && (
        <AddRunnersModal
          visible={showAddRunnersModal}
          onClose={() => setShowAddRunnersModal(false)}
          raceId={race._id || race.id || raceId}
          currentRunnersCount={race.runners?.length || 0}
          onSuccess={() => {
            // Recharger les données de la course
            setHasLoadedRace(false);
            fetchRaceData();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    position: "relative",
    margin: 0,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#181818",
  },
  loadingText: {
    color: "#A1F763",
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#181818",
    padding: 20,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#A1F763",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: "#181818",
    fontSize: 16,
    fontWeight: "600",
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
  backButtonHeader: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#A1F763",
    textAlign: "center",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 40,
  },
  countdownContainer: {
    position: "absolute",
    top: 140,
    left: 20,
    right: 20,
    borderRadius: 15,
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },
  countdownBlur: {
    borderRadius: 15,
    backgroundColor: "rgba(105, 105, 105, 0.18)",
    overflow: "hidden",
  },
  countdownContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  countdownText: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  raceInfoContainer: {
    position: "absolute",
    top: 200, // Position ajustée pour laisser de la place au compte à rebours
    left: 20,
    right: 20,
    borderRadius: 20,
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },
  raceInfoBlur: {
    borderRadius: 20,
    backgroundColor: "rgba(105, 105, 105, 0.18)",
    overflow: "hidden",
  },
  raceInfoContent: {
    padding: 16,
  },
  mapContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    zIndex: -1,
  },
  radialGradient: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "130%",
    height: "130%",
    transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
    zIndex: 1,
    pointerEvents: "none",
  },
  container__btns: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 5,
  },
  mainButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 15,
  },
  joinButton: {
    backgroundColor: "rgba(105, 105, 105, 0.18)",
    borderRadius: 15,
    flex: 1,
    height: 85,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
    overflow: "hidden",
  },
  leaveButton: {
    backgroundColor: "rgba(255, 107, 107, 0.3)", // Rouge transparent
    borderRadius: 15,
    flex: 1,
    height: 85,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.5)",
  },
  joinButtonBlur: {
    borderRadius: 15,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pendingInvitationContainer: {
    width: "100%",
    marginBottom: 12,
  },
  pendingInvitationBlur: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(161, 247, 99, 0.3)",
  },
  pendingInvitationText: {
    color: "#A1F763",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 16,
    textAlign: "center",
  },
  invitationButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  acceptInvitationButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#A1F763",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  acceptInvitationButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  declineInvitationButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    borderWidth: 1,
    borderColor: "#FF6B6B",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  declineInvitationButtonText: {
    color: "#FF6B6B",
    fontSize: 16,
    fontWeight: "700",
  },
  joinButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  mainButton: {
    backgroundColor: "#A1F763",
    borderRadius: 15,
    flex: 1,
    height: 85,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
    overflow: "hidden",
  },
  mainButtonText: {
    color: "#3B3B3B",
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  bottomButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 0,
    marginBottom: 30,
    gap: 15,
  },
  roundButton: {
    backgroundColor: "rgba(105, 105, 105, 0.18)",
    borderRadius: 15,
    flex: 1,
    height: 55,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
    overflow: "hidden",
  },
  roundButtonBlur: {
    borderRadius: 15,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  // Styles pour la modal des participants
  modalContainer: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  modalHeader: {
    backgroundColor: "rgba(105, 105, 105, 0.18)",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  modalHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#A1F763",
  },
  modalCloseButton: {
    padding: 8,
    backgroundColor: "rgba(161, 247, 99, 0.1)",
    borderRadius: 8,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyParticipants: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyParticipantsText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    textAlign: "center",
  },
  emptyParticipantsSubText: {
    color: "#888",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  participantsList: {
    paddingVertical: 20,
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#A1F763",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  participantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#A1F763",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  participantAvatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212121",
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  participantEmail: {
    fontSize: 14,
    color: "#888",
  },
  participantProgress: {
    fontSize: 12,
    color: "#A1F763",
    marginTop: 4,
    fontWeight: "600",
  },
  participantNumber: {
    backgroundColor: "rgba(161, 247, 99, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(161, 247, 99, 0.3)",
  },
  participantNumberText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#A1F763",
  },
  // Styles pour les informations de course affichées directement
  infoGrid: {
    gap: 8,
  },
  infoCard: {
    backgroundColor: "rgba(15, 15, 15, 0.8)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(42, 42, 42, 0.6)",
    flexDirection: "row",
    alignItems: "center",
  },
  ongoingRaceCard: {
    borderColor: "#A1F763",
    backgroundColor: "rgba(161, 247, 99, 0.1)",
    shadowColor: "#A1F763",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#A1F763",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
    marginBottom: 1,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
    lineHeight: 16,
  },
  sponsorsBanner: {
    width: "100%",
    marginTop: 4,
    marginBottom: 8,
    padding: 12,
    backgroundColor: "rgba(15, 15, 15, 0.8)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(42, 42, 42, 0.6)",
  },
  sponsorsBannerLabel: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sponsorsScrollContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingRight: 8,
  },
  sponsorLogoWrap: {
    width: 88,
    marginRight: 12,
    alignItems: "center",
  },
  sponsorLogoImg: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  sponsorLogoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "rgba(161, 247, 99, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  sponsorLogoInitial: {
    fontSize: 22,
    fontWeight: "700",
    color: "#A1F763",
  },
  sponsorLogoName: {
    marginTop: 6,
    fontSize: 11,
    color: "#ccc",
    textAlign: "center",
    width: "100%",
  },
  rankingContainer: {
    position: 'absolute',
    top: 200, // Positionné sous le header (top: 60) et le countdown (top: 140)
    left: 10,
    right: 10,
    zIndex: 9, // En dessous du header (zIndex: 10) mais au-dessus de la carte
  },
  rankingBlur: {
    borderRadius: 12,
    overflow: 'hidden',
    padding: 12,
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  rankingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  rankingChevron: {
    marginLeft: 'auto',
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  rankingPosition: {
    width: 40,
    alignItems: 'center',
  },
  rankingPositionText: {
    color: '#A1F763',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rankingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rankingName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rankingProgress: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
});
