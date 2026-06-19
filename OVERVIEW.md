# Mint — Vue d'ensemble du projet

## Ce que fait l'application

Mint est une application mobile React Native (Expo) de suivi de courses à pied / trail en temps réel. Elle met en relation deux types d'utilisateurs : les **organisateurs** de courses et les **coureurs** participants. L'accent est mis sur le live-tracking GPS via WebSocket et la visualisation sur carte Leaflet.

---

## Fonctionnalités existantes

### Authentification & profil
- Inscription / connexion avec JWT
- Mode visiteur (accès en lecture seule)
- Page profil (consultation des données utilisateur)
- Deux rôles distincts : `coureur` et `organisateur`, avec accès différenciés

### Gestion des organisations (côté organisateur)
- Création d'une organisation
- Consultation des organisations existantes

### Gestion des courses (côté organisateur)
- Création d'une course avec : nom, dates début/fin, discipline, organisation, fichier GPX, sponsors
- Paiement Stripe intégré à la création (freemium : 2 coureurs gratuits, puis 1,50 €/coureur)
- Invitation de coureurs par e-mail (saisie manuelle ou import CSV)
- Ajout de coureurs supplémentaires depuis la page de détail (modal dédié)
- Suivi du nombre d'invitations en attente par course

### Courses & invitations (côté coureur)
- Liste des courses auxquelles le coureur participe
- Rejoindre / quitter une course librement
- Réception d'invitations avec statut (pending / accepted / declined)
- Notification des invitations en attente
- Accepter ou refuser une invitation directement depuis la page de détail de la course
- Les courses avec invitation pending sont filtrées des listes "Mes courses" / "Mes participations"

### Page de détail d'une course (`RaceDetails`)
- Carte Leaflet avec tracé GPX
- Statut en temps réel (À venir / En cours / Terminée) avec compte à rebours
- Live-tracking : positions GPS des coureurs via WebSocket (socket.io)
- Classement en direct (top 5)
- Modal liste des participants avec classement
- Affichage des sponsors
- Boutons Rejoindre / Quitter / Retour
- Interface différenciée propriétaire (bouton ajout coureurs) / coureur / spectateur

### Statistiques (Premium coureur uniquement)
- Historique des courses terminées
- Classement final, distance totale, vitesse moyenne/max/min
- Historique de progression par course

### Premium (Stripe)
- Abonnement payant pour les coureurs (déblocage des stats avancées)
- Paiement à la création de course pour les organisateurs (au-delà de 2 coureurs)

---

## Fonctionnalités manquantes / à développer

### Catalogue public de courses
- Il n'existe pas d'écran permettant de **parcourir toutes les courses disponibles** pour s'y inscrire librement. Un coureur ne peut rejoindre une course que s'il connaît déjà son ID ou s'il y est invité.

### Recherche & filtres
- Aucune recherche par nom, lieu, date ou discipline sur la liste des courses.

### Notifications push
- Les invitations sont visibles dans l'app mais il n'y a pas de **notification push** (Expo Notifications) pour alerter le coureur en temps réel.

### Historique de position / replay
- Pas de replay d'une course passée : on ne peut pas revoir le tracé parcouru par les coureurs après la fin de la course.

### Chat / messagerie
- Aucune communication en temps réel entre organisateur et coureurs (annonces, alertes météo, abandon d'un coureur…).

### Gestion des abandons & incidents
- Pas de bouton "abandon" pour un coureur, ni d'alerte organisateur en cas de problème.

### Edition d'une course
- Un organisateur ne peut pas **modifier** une course après sa création (nom, dates, GPX, sponsors).

### Suppression d'une course / désinscription propre
- La désinscription (`handleLeaveRace`) fonctionne mais redirige uniquement en arrière ; pas de confirmation claire ni de gestion côté organisateur si un coureur se désinscrit.

### Photos & résultats post-course
- Pas de galerie photos, pas de page résultats officiels consultable après la course.

### Partage social
- Le bouton "partager" existe dans l'UI mais n'est pas branché (`TouchableOpacity` vide).

### Tableau de bord organisateur
- Pas de vue synthétique pour un organisateur : nombre de courses actives, revenus Stripe, taux de participation global.

### Tests automatisés
- Aucun test unitaire ou E2E détecté dans le projet.
