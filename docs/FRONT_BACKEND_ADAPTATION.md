# Front — alignement API (courses, sponsors, invitations)

## 1. Sponsors multiples (`sponsors[]`)

- **Création / mise à jour de course** : envoyer `sponsors: string[]` (IDs). Tableau vide autorisé.
- **Lecture** : utiliser `race.sponsors` (tableau) ; compat lecture `race.sponsor` (unique) via `sponsorsFromRace()` dans `utils/sponsors.ts`.
- **UI** : `CreateRace` — sélection multi (chips + logos), « Tout retirer », modal « Nouveau sponsor » (`POST /sponsors` avec `name`, `image`, `websiteUrl`) ; **409** : message d’erreur renvoyé par l’API affiché tel quel.
- **Fiche course** : `RaceDetails` — bandeau logos + nom ; tap ouvre `websiteUrl` si défini.

## 2. Types TypeScript

Voir `types/api.ts` : `Sponsor`, `RaceWithSponsors`, `InvitationsSummary`.

## 3. Invitations-summary

Logique dans `app/(tabs)/rejoindre.tsx` : lecture prioritaire `acceptedParticipantsCount` / `pendingCount`, puis alias ; **affichage de 0** sans condition falsy (`Number.isFinite`, etc.).

## 4. Acceptation d’invitation après login

- **Utilitaire** : `utils/invitationAccept.ts` — `POST .../invitations/token/:token/accept?raceId=...` avec `Authorization: Bearer <JWT>`.
- **RaceDetails** / **notifications** : utilisent `postAcceptInvitation`.
- **Login** : après succès, si `inviteToken` + `inviteRaceId` (params), appel `postAcceptInvitation` puis navigation vers `RaceDetails`.
- **Landing** : route `app/invite.tsx` — query `inviteToken` + `inviteRaceId` (ou `token` + `raceId`). Si non connecté → redirection vers `/login` avec les mêmes params. Si connecté → accept puis `RaceDetails`.
- **Inscription** : `signup` transmet `inviteToken` / `inviteRaceId` vers `login` pour enchaîner l’accept après connexion.

## 5. Liens e-mail / deep linking

Configurer les liens (site ou schéma d’app) pour pointer vers `/invite?inviteToken=...&inviteRaceId=...` (ou équivalent hébergé qui ouvre l’app avec ces query params).
