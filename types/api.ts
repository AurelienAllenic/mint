/**
 * Types alignés sur le contrat API (courses, sponsors, invitations-summary).
 */

export type Sponsor = {
  id: string;
  name: string;
  image: string | null;
  websiteUrl: string | null;
};

/** Course telle que renvoyée par le back (extrait utile au front). */
export type RaceWithSponsors = {
  _id: string;
  name: string;
  organization?: unknown;
  /** Plusieurs sponsors (IDs peuplés ou objets selon le back). */
  sponsors?: Sponsor[] | string[];
  /** @deprecated Compat : un seul sponsor ; migrer vers sponsors[]. */
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
