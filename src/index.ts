import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

export type FeedbackType =
  | "viewed"
  | "saved"
  | "shared"
  | "dismissed"
  | "booked"
  | "stayed"
  | "liked"
  | "disliked";

export type FeedbackListingContext = {
  listingId: string;
  listingSnapshotId: string;
  areaLabel: string;
  amenities: string[];
  hostTags: string[];
  hostTrustSignals: string[];
};

export type UserFeedbackProfile = {
  totalFeedback: number;
  positiveFeedbackCount: number;
  negativeFeedbackCount: number;
  listingScores: Map<string, number>;
  areaScores: Map<string, number>;
  amenityScores: Map<string, number>;
  hostTagScores: Map<string, number>;
  hostSignalScores: Map<string, number>;
};

export type PreferenceSummaryEntry = {
  label: string;
  score: number;
};

export type UserMemorySummary = {
  totalFeedback: number;
  positiveFeedbackCount: number;
  negativeFeedbackCount: number;
  preferredAreas: PreferenceSummaryEntry[];
  avoidedAreas: PreferenceSummaryEntry[];
  preferredAmenities: PreferenceSummaryEntry[];
  avoidedAmenities: PreferenceSummaryEntry[];
  preferredHostTags: PreferenceSummaryEntry[];
  avoidedHostTags: PreferenceSummaryEntry[];
  preferredHostSignals: PreferenceSummaryEntry[];
  avoidedHostSignals: PreferenceSummaryEntry[];
};

export type RecentFeedbackItem = {
  feedbackId: unknown;
  tripId: unknown;
  listingId: unknown;
  feedbackType: unknown;
  feedbackScore: number | undefined;
  note: string | undefined;
  title: string | undefined;
  url: string | undefined;
  createdAt: unknown;
};

export type SavedListingFeedback = {
  feedbackId: string;
  userId: string;
  listingId: string;
  listingSnapshotId: string;
  feedbackType: FeedbackType;
  feedbackScore: number | undefined;
  note: string | undefined;
  tripId: string | undefined;
  createdAt: string;
};

export type FeedbackScoreEvaluation = {
  score: number;
  exactListingScore: number;
  areaAffinityScore: number;
  matchedPositiveAmenities: string[];
  matchedNegativeAmenities: string[];
};

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function normalizeFeedbackType(value: unknown): FeedbackType | undefined {
  const normalized = normalizeText(value)?.toLowerCase();
  switch (normalized) {
    case "viewed":
    case "saved":
    case "shared":
    case "dismissed":
    case "booked":
    case "stayed":
    case "liked":
    case "disliked":
      return normalized;
    default:
      return undefined;
  }
}

export function feedbackWeightForType(type: FeedbackType, explicitScore?: number): number {
  if (explicitScore !== undefined && Number.isFinite(explicitScore)) {
    return explicitScore;
  }
  switch (type) {
    case "booked":
    case "stayed":
      return 3.5;
    case "liked":
      return 2.5;
    case "saved":
      return 2;
    case "shared":
      return 1.2;
    case "viewed":
      return 0.2;
    case "dismissed":
      return -2;
    case "disliked":
      return -3;
    default:
      return 0;
  }
}

export function loadUserFeedbackProfile(
  db: DatabaseSync,
  userId: string,
  listings: FeedbackListingContext[],
): UserFeedbackProfile {
  const rows = db.prepare(`
    SELECT
      listing_id AS listingId,
      feedback_type AS feedbackType,
      feedback_score AS feedbackScore
    FROM user_listing_feedback
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 250
  `).all(userId) as Record<string, unknown>[];

  const listingById = new Map(listings.map((listing) => [listing.listingId, listing]));
  const profile: UserFeedbackProfile = {
    totalFeedback: rows.length,
    positiveFeedbackCount: 0,
    negativeFeedbackCount: 0,
    listingScores: new Map<string, number>(),
    areaScores: new Map<string, number>(),
    amenityScores: new Map<string, number>(),
    hostTagScores: new Map<string, number>(),
    hostSignalScores: new Map<string, number>(),
  };

  for (const row of rows) {
    const listingId = normalizeText(row.listingId);
    const feedbackType = normalizeFeedbackType(row.feedbackType);
    if (!listingId || !feedbackType) continue;
    const score = feedbackWeightForType(feedbackType, numberOrUndefined(row.feedbackScore));
    if (score > 0) profile.positiveFeedbackCount += 1;
    if (score < 0) profile.negativeFeedbackCount += 1;

    profile.listingScores.set(listingId, (profile.listingScores.get(listingId) ?? 0) + score);

    const listing = listingById.get(listingId);
    if (!listing) continue;

    profile.areaScores.set(listing.areaLabel, (profile.areaScores.get(listing.areaLabel) ?? 0) + score);

    for (const amenity of listing.amenities.slice(0, 25)) {
      profile.amenityScores.set(amenity, (profile.amenityScores.get(amenity) ?? 0) + score);
    }
    for (const hostTag of listing.hostTags.slice(0, 12)) {
      profile.hostTagScores.set(hostTag, (profile.hostTagScores.get(hostTag) ?? 0) + score);
    }
    for (const hostSignal of listing.hostTrustSignals.slice(0, 12)) {
      profile.hostSignalScores.set(hostSignal, (profile.hostSignalScores.get(hostSignal) ?? 0) + score);
    }
  }

  return profile;
}

function summarizePreferenceMap(
  scoreMap: Map<string, number>,
  polarity: "positive" | "negative",
  limit = 5,
): PreferenceSummaryEntry[] {
  const entries = [...scoreMap.entries()]
    .filter(([, score]) => (polarity === "positive" ? score > 0.5 : score < -0.5))
    .sort((left, right) =>
      polarity === "positive" ? right[1] - left[1] : left[1] - right[1],
    )
    .slice(0, limit)
    .map(([label, score]) => ({
      label,
      score: Number(score.toFixed(2)),
    }));
  return entries;
}

export function buildUserMemorySummary(feedbackProfile: UserFeedbackProfile): UserMemorySummary {
  return {
    totalFeedback: feedbackProfile.totalFeedback,
    positiveFeedbackCount: feedbackProfile.positiveFeedbackCount,
    negativeFeedbackCount: feedbackProfile.negativeFeedbackCount,
    preferredAreas: summarizePreferenceMap(feedbackProfile.areaScores, "positive"),
    avoidedAreas: summarizePreferenceMap(feedbackProfile.areaScores, "negative"),
    preferredAmenities: summarizePreferenceMap(feedbackProfile.amenityScores, "positive"),
    avoidedAmenities: summarizePreferenceMap(feedbackProfile.amenityScores, "negative"),
    preferredHostTags: summarizePreferenceMap(feedbackProfile.hostTagScores, "positive"),
    avoidedHostTags: summarizePreferenceMap(feedbackProfile.hostTagScores, "negative"),
    preferredHostSignals: summarizePreferenceMap(feedbackProfile.hostSignalScores, "positive"),
    avoidedHostSignals: summarizePreferenceMap(feedbackProfile.hostSignalScores, "negative"),
  };
}

export function loadRecentFeedback(db: DatabaseSync, userId: string, limit = 20): RecentFeedbackItem[] {
  return (db.prepare(`
      SELECT
        f.feedback_id AS feedbackId,
        f.trip_id AS tripId,
        f.listing_id AS listingId,
        f.feedback_type AS feedbackType,
        f.feedback_score AS feedbackScore,
        f.note,
        ls.title,
        ls.url,
        f.created_at AS createdAt
      FROM user_listing_feedback f
      LEFT JOIN latest_listing_snapshots ls
        ON ls.listing_id = f.listing_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      LIMIT ?
    `).all(userId, limit) as Record<string, unknown>[])
    .map((row) => ({
      feedbackId: row.feedbackId,
      tripId: row.tripId,
      listingId: row.listingId,
      feedbackType: row.feedbackType,
      feedbackScore: numberOrUndefined(row.feedbackScore),
      note: normalizeText(row.note),
      title: normalizeText(row.title),
      url: normalizeText(row.url),
      createdAt: row.createdAt,
    }));
}

export function buildTasteSummary(memorySummary: UserMemorySummary): string {
  const positiveParts: string[] = [];
  const negativeParts: string[] = [];

  if (memorySummary.preferredAreas[0]?.label) positiveParts.push(memorySummary.preferredAreas[0].label);
  if (memorySummary.preferredAmenities[0]?.label) positiveParts.push(memorySummary.preferredAmenities[0].label);
  if (memorySummary.preferredHostSignals[0]?.label) positiveParts.push(memorySummary.preferredHostSignals[0].label);
  if (memorySummary.preferredHostTags[0]?.label) positiveParts.push(memorySummary.preferredHostTags[0].label);

  if (memorySummary.avoidedAreas[0]?.label) negativeParts.push(memorySummary.avoidedAreas[0].label);
  if (memorySummary.avoidedAmenities[0]?.label) negativeParts.push(memorySummary.avoidedAmenities[0].label);
  if (memorySummary.avoidedHostSignals[0]?.label) negativeParts.push(memorySummary.avoidedHostSignals[0].label);
  if (memorySummary.avoidedHostTags[0]?.label) negativeParts.push(memorySummary.avoidedHostTags[0].label);

  const clauses: string[] = [];
  if (positiveParts.length > 0) {
    clauses.push(`Leans toward ${positiveParts.slice(0, 3).join(", ")}`);
  }
  if (negativeParts.length > 0) {
    clauses.push(`avoids ${negativeParts.slice(0, 3).join(", ")}`);
  }
  return clauses.join("; ");
}

export function scoreFeedback(
  listing: Pick<FeedbackListingContext, "listingId" | "areaLabel" | "amenities">,
  feedbackProfile: UserFeedbackProfile,
): FeedbackScoreEvaluation {
  if (feedbackProfile.totalFeedback === 0) {
    return {
      score: 50,
      exactListingScore: 0,
      areaAffinityScore: 0,
      matchedPositiveAmenities: [],
      matchedNegativeAmenities: [],
    };
  }

  const exactListingScore = feedbackProfile.listingScores.get(listing.listingId) ?? 0;
  const areaAffinityScore = feedbackProfile.areaScores.get(listing.areaLabel) ?? 0;

  const positiveAmenityMatches = listing.amenities
    .filter((amenity) => (feedbackProfile.amenityScores.get(amenity) ?? 0) > 0)
    .sort((left, right) => (feedbackProfile.amenityScores.get(right) ?? 0) - (feedbackProfile.amenityScores.get(left) ?? 0))
    .slice(0, 3);
  const negativeAmenityMatches = listing.amenities
    .filter((amenity) => (feedbackProfile.amenityScores.get(amenity) ?? 0) < 0)
    .sort((left, right) => (feedbackProfile.amenityScores.get(left) ?? 0) - (feedbackProfile.amenityScores.get(right) ?? 0))
    .slice(0, 3);

  let score = 50;
  score += Math.max(-45, Math.min(45, exactListingScore * 18));
  score += Math.max(-18, Math.min(18, areaAffinityScore * 6));
  score += positiveAmenityMatches.reduce((sum, amenity) => sum + Math.min(6, (feedbackProfile.amenityScores.get(amenity) ?? 0) * 2), 0);
  score += negativeAmenityMatches.reduce((sum, amenity) => sum + Math.max(-7, (feedbackProfile.amenityScores.get(amenity) ?? 0) * 2), 0);

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    exactListingScore,
    areaAffinityScore,
    matchedPositiveAmenities: positiveAmenityMatches,
    matchedNegativeAmenities: negativeAmenityMatches,
  };
}

export function saveListingFeedback(
  db: DatabaseSync,
  args: {
    userId: string;
    listing: Pick<FeedbackListingContext, "listingId" | "listingSnapshotId">;
    feedbackType: FeedbackType;
    feedbackScore?: number;
    note?: string;
    tripId?: string;
    createdAt?: string;
  },
): SavedListingFeedback {
  const createdAt = args.createdAt ?? new Date().toISOString();
  const feedbackId = `feedback_${randomUUID()}`;
  const note = normalizeText(args.note);
  const tripId = normalizeText(args.tripId);
  const feedbackScore = numberOrUndefined(args.feedbackScore);

  db.prepare(`
    INSERT INTO user_listing_feedback (
      feedback_id,
      user_id,
      trip_id,
      listing_id,
      listing_snapshot_id,
      feedback_type,
      feedback_score,
      note,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    feedbackId,
    args.userId,
    tripId ?? null,
    args.listing.listingId,
    args.listing.listingSnapshotId,
    args.feedbackType,
    feedbackScore ?? null,
    note ?? null,
    createdAt,
  );

  return {
    feedbackId,
    userId: args.userId,
    listingId: args.listing.listingId,
    listingSnapshotId: args.listing.listingSnapshotId,
    feedbackType: args.feedbackType,
    feedbackScore,
    note,
    tripId,
    createdAt,
  };
}
