/**
 * Types alignés sur le contrat API (courses, sponsors, invitations-summary).
 */

export type Sponsor = {
  id: string;
  name: string;
  image: string | null;
  /** Présent seulement si le back expose ce champ (ex. évolution future). */
  websiteUrl?: string | null;
};

/** Course telle que renvoyée par le back (extrait utile au front). */
export type RaceWithSponsors = {
  _id: string;
  name: string;
  organization?: unknown;
  /** Si le back ajoute un tableau plus tard. */
  sponsors?: Sponsor[] | string[];
  /** Référence optionnelle unique (contrat actuel mint-back-node). */
  sponsor?: Sponsor | string | null;
};

export type InvitationsSummary = {
  pendingCount: number;
  acceptedParticipantsCount: number;
  participantsCount?: number;
  accepted_count?: number;
  participants_accepted?: number;
  pending?: number;
  pending_count?: number;
};
