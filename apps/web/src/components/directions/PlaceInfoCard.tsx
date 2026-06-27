"use client";

import { useState } from "react";
import { Stars } from "./Stars";
import type { PlaceDetails, Review, TravelMode } from "./types";
import type { ExploreSpot } from "@/types";

const MODE_LABEL: Record<TravelMode, string> = {
  walking: "walk",
  driving: "drive",
  transit: "bus",
};

const TODAY_IDX = (new Date().getDay() + 6) % 7;

function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);
  const text = review.text?.text ?? "";
  const long = text.length > 140;

  return (
    <div className="py-3 border-b border-ink/6 last:border-0">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700 shrink-0">
          {review.authorAttribution.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{review.authorAttribution.displayName}</p>
          <p className="text-xs text-ink-muted">{review.relativePublishTimeDescription}</p>
        </div>
      </div>
      <Stars rating={review.rating} size={12} />
      {text && (
        <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">
          {expanded || !long ? text : `${text.slice(0, 140)}…`}
          {long && (
            <button onClick={() => setExpanded(!expanded)} className="ml-1 text-primary-600 font-semibold">
              {expanded ? "Less" : "More"}
            </button>
          )}
        </p>
      )}
    </div>
  );
}

interface Props {
  spot: ExploreSpot;
  details: PlaceDetails | null;
  googleMapsUrl: string | null;
  onClose: () => void;
  routeDuration?: string | null;
  mode?: TravelMode;
}

export function PlaceInfoCard({ spot, details, googleMapsUrl, onClose, routeDuration, mode = "walking" }: Props) {
  const [tab, setTab] = useState<"overview" | "reviews">("overview");
  const [hoursOpen, setHoursOpen] = useState(false);

  const hours = details?.currentOpeningHours ?? (details?.regularOpeningHours as PlaceDetails["currentOpeningHours"]);
  const isOpen = details?.currentOpeningHours?.openNow;
  const todayTime = hours?.weekdayDescriptions?.[TODAY_IDX]?.replace(/^[^:]+:\s*/, "") ?? "";
  const phone = details?.nationalPhoneNumber;
  const website = details?.websiteUri;
  const reviewCount = details?.userRatingCount;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-white rounded-t-3xl -mt-6 shadow-2xl">

      {/* Title */}
      <div className="px-5 pt-3 pb-0">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/20" />
        <h2 className="text-xl font-bold text-ink leading-tight">{spot.title}</h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-bold text-amber-500">{spot.rating}</span>
          <Stars rating={spot.rating} />
          {reviewCount != null && <span className="text-xs text-ink-muted">({reviewCount.toLocaleString()})</span>}
          <span className="text-xs text-ink-muted">· {spot.category}</span>
        </div>
        {details?.currentOpeningHours != null && (
          <p className="mt-1 text-sm">
            <span className={isOpen ? "font-semibold text-green-600" : "font-semibold text-red-500"}>
              {isOpen ? "Open now" : "Closed"}
            </span>
            {todayTime && <span className="text-ink-muted"> · {todayTime}</span>}
          </p>
        )}
        <p className="mt-0.5 mb-3 text-sm text-ink-muted">
          {routeDuration ?? spot.walkTime} {MODE_LABEL[mode]} · {spot.distance}
        </p>
      </div>

      <div className="h-px bg-ink/8" />

      {/* Actions */}
      <div className="flex items-start gap-1 px-4 py-3">
        <ActionBtn
          label="Start"
          active={!!googleMapsUrl}
          accent
          href={googleMapsUrl ?? undefined}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>}
        />
        <ActionBtn
          label="Call"
          active={!!phone}
          href={phone ? `tel:${phone}` : undefined}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.92 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>}
        />
        <ActionBtn
          label="Save"
          active={false}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>}
        />
        <button onClick={onClose} className="flex flex-col items-center gap-1.5 flex-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/8">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </div>
          <span className="text-xs font-semibold text-ink-muted">Close</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="h-px bg-ink/8" />
      <div className="flex border-b border-ink/8">
        {(["overview", "reviews"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === t ? "border-b-2 border-primary-600 text-primary-600" : "text-ink-muted"}`}
          >
            {t === "reviews" && details?.reviews?.length ? `Reviews (${details.reviews.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div>
          {spot.imageUrl && (
            <div className="p-4 pb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={spot.imageUrl} alt={spot.title} className="w-full h-44 object-cover rounded-2xl" />
            </div>
          )}
          {spot.description && (
            <div className="px-5 pb-3">
              <p className="text-sm text-ink-muted leading-relaxed">{spot.description}</p>
            </div>
          )}
          {(hours?.weekdayDescriptions || website || phone) && <div className="h-2 bg-gray-50 my-2" />}

          {hours?.weekdayDescriptions && (
            <div className="px-5 py-3">
              <button onClick={() => setHoursOpen(!hoursOpen)} className="flex w-full items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ink-muted shrink-0">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span className={`text-sm font-semibold ${details?.currentOpeningHours != null ? (isOpen ? "text-green-600" : "text-red-500") : "text-ink"}`}>
                    {details?.currentOpeningHours != null ? (isOpen ? "Open now" : "Closed") : "Hours"}
                  </span>
                  {todayTime && !hoursOpen && <span className="text-sm text-ink-muted">· {todayTime}</span>}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  className={`text-ink-muted transition-transform ${hoursOpen ? "rotate-180" : ""}`}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {hoursOpen && (
                <div className="mt-2 ml-9 space-y-1">
                  {hours.weekdayDescriptions.map((line, i) => (
                    <p key={i} className={`text-sm ${i === TODAY_IDX ? "font-semibold text-ink" : "text-ink-muted"}`}>{line}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {website && (
            <div className="px-5 py-3 border-t border-ink/6">
              <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ink-muted shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <span className="text-sm text-primary-600 font-medium truncate">{website.replace(/^https?:\/\//, "")}</span>
              </a>
            </div>
          )}

          {phone && (
            <div className="px-5 py-3 border-t border-ink/6">
              <a href={`tel:${phone}`} className="flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ink-muted shrink-0">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.92 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <span className="text-sm text-ink font-medium">{phone}</span>
              </a>
            </div>
          )}
          <div className="h-10" />
        </div>
      )}

      {/* Reviews */}
      {tab === "reviews" && (
        <div className="px-5">
          {details?.reviews && details.reviews.length > 0 ? (
            <>
              <div className="flex items-center gap-3 py-4 border-b border-ink/8">
                <span className="text-4xl font-bold text-ink">{spot.rating}</span>
                <div>
                  <Stars rating={spot.rating} size={16} />
                  {reviewCount != null && <p className="text-xs text-ink-muted mt-1">{reviewCount.toLocaleString()} reviews</p>}
                </div>
              </div>
              {details.reviews.map((review, i) => <ReviewCard key={i} review={review} />)}
            </>
          ) : (
            <div className="py-10 text-center text-sm text-ink-muted">
              {details ? "No reviews available" : "Loading reviews…"}
            </div>
          )}
          <div className="h-10" />
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  label, active, accent, href, icon,
}: {
  label: string; active: boolean; accent?: boolean; href?: string; icon: React.ReactNode;
}) {
  const circle = `flex h-12 w-12 items-center justify-center rounded-full ${accent ? "bg-primary-50" : "bg-ink/8"}`;
  const text = `text-xs font-semibold ${accent ? "text-primary-600" : active ? "text-ink" : "text-ink-muted"}`;
  const wrapper = `flex flex-col items-center gap-1.5 flex-1 ${active ? "" : "opacity-30"}`;

  const inner = (
    <>
      <div className={circle} style={accent ? { color: "#4F46E5" } : undefined}>{icon}</div>
      <span className={text}>{label}</span>
    </>
  );

  if (href && active) {
    return <a href={href} target={href.startsWith("tel") ? undefined : "_blank"} rel="noopener noreferrer" className={wrapper}>{inner}</a>;
  }
  return <div className={wrapper}>{inner}</div>;
}
