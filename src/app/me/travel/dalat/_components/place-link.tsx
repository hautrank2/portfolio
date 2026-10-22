import { ArrowUpRight, MapPin } from "lucide-react";

import { cn } from "~/lib/utils";

import { mapHref, type Place } from "./trip-data";

type PlaceLinkProps = { place: Place; className?: string; compact?: boolean };

export const PlaceLink = ({ place, className, compact = false }: PlaceLinkProps) => (
  <a
    href={mapHref(place)}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`${place.name} — xem vị trí trên Google Maps (mở tab mới)`}
    className={cn("dalat-place", compact && "dalat-place-compact", className)}
  >
    <span className="dalat-place-pin"><MapPin size={17} aria-hidden="true" /></span>
    <span className="dalat-place-copy">
      <strong>{place.name}</strong>
      <span>{place.address}</span>
    </span>
    <span className="dalat-place-arrow"><ArrowUpRight size={18} aria-hidden="true" /><span>Maps</span></span>
  </a>
);
