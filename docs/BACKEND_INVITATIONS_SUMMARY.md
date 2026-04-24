  # Backend : `GET /invitations/race/:raceId/invitations-summary`

  **À implémenter dans ton API Node** (hors dépôt front). L’app **mint** consomme déjà cet endpoint ; sans lui, l’UI affiche seulement le nombre de `runners` (comportement de secours).

  ## Objectif produit

  Pour le **propriétaire** d’une course, deux compteurs :

  | Libellé UI (app) | Champ JSON | Signification |
  |------------------|------------|---------------|
  | Participants | `acceptedParticipantsCount` | Coureurs comptés comme inscrits (voir règle ci-dessous). |
  | En attente | `pendingCount` | Invitations `pending` encore valides (non expirées). |

  ## Contrat HTTP

  ```
  GET /invitations/race/:raceId/invitations-summary
  Authorization: Bearer <token>
  ```

  - **401** si non authentifié  
  - **403** si l’utilisateur n’est pas le **propriétaire** de la course (`race.owner`)  
  - **404** si la course n’existe pas  
  - **200** et corps JSON :

```json
{
  "pendingCount": 1,
  "acceptedParticipantsCount": 0,
  "participantsCount": 0,
  "accepted_count": 0,
  "participants_accepted": 0,
  "pending": 1,
  "pending_count": 1
}
```

- **Champs officiels** : `pendingCount`, `acceptedParticipantsCount` (nombres, pas `null` ni chaînes).  
- **Alias** (compat front, redondants) : `participantsCount`, `accepted_count`, `participants_accepted`, `pending`, `pending_count`.  
L’app lit d’abord les champs officiels, puis les alias ; **`0` est affiché** (pas traité comme valeur « vide »).

  - **`pendingCount`** : nombre de documents d’invitation avec `status: "pending"` et `expiresAt` (ou équivalent) **strictement après** la date courante.  
  - Après **`POST .../accept`** sur une invitation, ce document ne doit **plus** être compté en `pending` (statut `accepted` / suppression / hors périmètre de la requête).

  - **`acceptedParticipantsCount`** : parmi les `runners` de la course (utilisateurs peuplés avec au moins `email`), compter ceux dont l’e-mail **n’est pas** dans l’ensemble des e-mails des invitations encore `pending`.  
    - Objectif : ne pas afficher comme « participant » quelqu’un qui est dans `runners` mais dont l’invitation est toujours en attente.  
    - Si un runner n’a pas d’e-mail peuplé, tu peux le compter comme accepté (ou exclure selon ta règle métier).

  Adapte les noms de champs à ton schéma (`race` vs `raceId`, modèle `RaceInvitation` vs `Invitation`, etc.).

  ## Exemple de logique (Node / Mongoose)

  ```js
  exports.getRaceInvitationSummary = async (req, res) => {
    const { raceId } = req.params;
    const userId = req.userId;

    const race = await Race.findById(raceId);
    if (!race) return res.status(404).json({ error: "Course non trouvée" });
    if (race.owner.toString() !== userId) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const now = new Date();
    const pendingList = await RaceInvitation.find({
      race: raceId, // ou raceId selon ton schéma
      status: "pending",
      expiresAt: { $gt: now },
    }).select("email");

    const pendingEmails = new Set(pendingList.map((i) => i.email.toLowerCase()));
    const pendingCount = pendingList.length;

    await race.populate({ path: "runners", select: "email" });

    let acceptedParticipantsCount = 0;
    for (const runner of race.runners) {
      const email = (runner.email || "").toLowerCase();
      if (!email) {
        acceptedParticipantsCount += 1;
        continue;
      }
      if (!pendingEmails.has(email)) acceptedParticipantsCount += 1;
    }

    res.json({ pendingCount, acceptedParticipantsCount });
  };
  ```

  Enregistre la route sur le routeur monté sous le préfixe `/invitations` (URL finale identique à celle attendue par l’app).

  ## Côté app mobile (déjà en place)

  Uniquement si `user.role === "organisateur"` :

  | Fichier | Comportement |
  |---------|----------------|
  | `app/(tabs)/rejoindre.tsx` | Une requête par course (Mes courses) ; **En attente** puis **Participants** si l’API répond. |
  | `app/RaceDetails.tsx` | Propriétaire + organisateur : même endpoint ; rechargement si la liste des coureurs change. |

  Sinon (autre rôle), affichage classique : nombre de `runners` seul.

  Si la réponse n’est pas `200` pour un organisateur, **En attente : —** et **Participants** d’après `runners.length`.

  ---

  ## Cohérence avec `POST /race/:raceId/add-runners` (et création de course avec e-mails)

  L’app mobile :

  - appelle **`POST .../add-runners`** puis **`GET .../invitations-summary`** (après un court délai côté client) ;
  - attend que **`pendingCount`** reflète **immédiatement** les invitations créées par `add-runners`.

  **Recommandation backend :**

  1. **`POST add-runners`** doit répondre **`200` uniquement après** que les documents d’invitation (`status: "pending"`, etc.) sont **persistés** en base (transaction ou `await` sur les `insert` / `save`).  
    - Si l’e-mail est envoyé **après** la réponse HTTP, ce n’est pas bloquant tant que les lignes d’invitation existent déjà.

  2. **`GET invitations-summary`** doit lire les **mêmes** données que celles écrites par `add-runners` (même collection, pas de cache stale non invalidé).

  3. Si vous utilisez des **files / workers** pour créer les invitations de façon asynchrone, le mobile peut afficher un décalage : dans ce cas, soit exposez un endpoint qui ne répond `200` qu’une fois le job terminé, soit documentez le délai attendu pour que l’équipe front ajuste le retry.

  4. **Création de course** avec liste d’e-mails : même exigence — à la fin du flux HTTP de création, les invitations **pending** doivent être en base avant que le client recharge la liste et appelle `invitations-summary`.
