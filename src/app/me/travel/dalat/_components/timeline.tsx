import { Camera, ChevronDown, CloudSun, Coffee, Footprints, Gift, House, Utensils, Wine } from "lucide-react";

import { PlaceLink } from "./place-link";
import { games, type TripDay } from "./trip-data";

const eventIcons = {
  food: Utensils,
  coffee: Coffee,
  explore: Camera,
  home: House,
  party: Wine,
  cloud: CloudSun,
  walk: Footprints,
  gift: Gift,
};

export const Timeline = ({ day }: { day: TripDay }) => (
  <div className="dalat-day-panel">
    <div className="dalat-day-heading">
      <div><p className="dalat-eyebrow">CHƯƠNG {day.number}</p><h3>{day.title}</h3><p>{day.description}</p></div>
      <span className="dalat-day-number" aria-hidden="true">{day.number}</span>
    </div>
    <ol className="dalat-timeline">
      {day.events.map((event) => {
        const Icon = eventIcons[event.kind];
        return (
          <li key={event.title} className={`dalat-event dalat-event-${event.kind}`}>
            <span className="dalat-event-marker"><Icon size={17} aria-hidden="true" /></span>
            <div className="dalat-event-body">
              <div className="dalat-event-meta"><span>{event.time}</span>{event.tag && <span className="dalat-event-tag">{event.tag}</span>}</div>
              <h4>{event.title}</h4>
              <p>{event.note}</p>
              <div className="dalat-event-places">
                {event.places.map((place) => <PlaceLink key={place.id} place={place} compact />)}
              </div>
              {event.places.some((place) => place.id === "pine-kart") && (
                <details className="dalat-game-details">
                  <summary>Trò nào hợp tụi mình?<ChevronDown size={15} aria-hidden="true" /></summary>
                  <div>{games.map((game) => <p key={game.id}><strong>{game.label} · {game.name}</strong>{game.note}</p>)}</div>
                </details>
              )}
            </div>
          </li>
        );
      })}
    </ol>
    <p className="dalat-day-end"><span />{day.id === "ngay-3" ? "Hết chuyến đi, còn đầy kỷ niệm." : "Cứ thong thả, mình còn có nhau."}<span /></p>
  </div>
);
