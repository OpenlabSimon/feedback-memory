import { DatabaseSync } from "node:sqlite";
export type FeedbackType = "viewed" | "saved" | "shared" | "dismissed" | "booked" | "stayed" | "liked" | "disliked";
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
export declare function normalizeFeedbackType(value: unknown): FeedbackType | undefined;
export declare function feedbackWeightForType(type: FeedbackType, explicitScore?: number): number;
export declare function loadUserFeedbackProfile(db: DatabaseSync, userId: string, listings: FeedbackListingContext[]): UserFeedbackProfile;
export declare function buildUserMemorySummary(feedbackProfile: UserFeedbackProfile): UserMemorySummary;
export declare function loadRecentFeedback(db: DatabaseSync, userId: string, limit?: number): RecentFeedbackItem[];
export declare function buildTasteSummary(memorySummary: UserMemorySummary): string;
export declare function scoreFeedback(listing: Pick<FeedbackListingContext, "listingId" | "areaLabel" | "amenities">, feedbackProfile: UserFeedbackProfile): FeedbackScoreEvaluation;
export declare function saveListingFeedback(db: DatabaseSync, args: {
    userId: string;
    listing: Pick<FeedbackListingContext, "listingId" | "listingSnapshotId">;
    feedbackType: FeedbackType;
    feedbackScore?: number;
    note?: string;
    tripId?: string;
    createdAt?: string;
}): SavedListingFeedback;
