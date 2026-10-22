import { ArrowUpRight, Backpack, CalendarCheck, CircleOff, Info, MapPin } from "lucide-react";

import { cn } from "~/lib/utils";

import { mapHref, type Place } from "./trip-data";

type PlaceLinkProps = { place: Place; className?: string; compact?: boolean };

export const PlaceLink = ({ place, className, compact = false }: PlaceLinkProps) => {
  const tips = [
    { Icon: CalendarCheck, label: "Đặt trước", text: place.reservation, kind: "reservation" },
    { Icon: Backpack, label: "Chuẩn bị", text: place.bring, kind: "bring" },
    { Icon: CircleOff, label: "Nên để ở home", text: place.leaveBehind, kind: "leave" },
    { Icon: Info, label: "Lưu ý", text: place.notice, kind: "notice" },
  ].filter((tip) => tip.text);

  return (
    <div className={cn("dalat-place-card", compact && "dalat-place-card-compact", className)}>
      <a
        href={mapHref(place)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${place.name} — xem vị trí trên Google Maps (mở tab mới)`}
        className={cn("dalat-place", compact && "dalat-place-compact")}
      >
        <span className="dalat-place-pin"><MapPin size={17} aria-hidden="true" /></span>
        <span className="dalat-place-copy">
          <strong>{place.name}</strong>
          <span>{place.address}</span>
        </span>
        <span className="dalat-place-arrow"><ArrowUpRight size={18} aria-hidden="true" /><span>Maps</span></span>
      </a>
      {tips.length > 0 && (
        <ul className="dalat-place-tips" aria-label={`Ghi chú cho ${place.name}`}>
          {tips.map(({ Icon, label, text, kind }) => (
            <li key={kind} className={`dalat-place-tip dalat-place-tip-${kind}`}>
              <Icon size={12} aria-hidden="true" />
              <span><strong>{label}:</strong> {text}</span>
            </li>
          ))}
        </ul>
      )}
      {place.bookingUrl && (
        <a className="dalat-place-booking" href={place.bookingUrl} target="_blank" rel="noopener noreferrer">
          Xem thông tin & đặt chỗ <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      )}
    </div>
  );
};
