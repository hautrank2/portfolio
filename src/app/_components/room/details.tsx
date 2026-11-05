import { ArrowUpRight, BriefcaseBusiness, GraduationCap, Mail, MapPin, PawPrint, Tv } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { profileData, socialData, stackData } from "~/data/site";

import { collectionRows } from "./collection";
import { roomTechnologies } from "./tech";

import type { RoomDetailsProps } from "./type";

export const RoomDetails = ({ selected, tvOn, toggleTv }: RoomDetailsProps) => {
  if (selected === "about") return (
    <div className="room-detail-stack">
      <div className="room-profile"><Image src={profileData.avatar} alt={profileData.name} width={58} height={58} /><div><strong>{profileData.name}</strong><span>@{profileData.handle}</span><span><MapPin size={11} />Ho Chi Minh City, Vietnam</span></div></div>
      <p>{profileData.tagline}</p>
      <p className="room-muted">{profileData.bio}</p>
      <div className="room-facts"><span><BriefcaseBusiness size={15} /><small>Currently</small><strong>Frontend developer · VNTT</strong></span><span><GraduationCap size={15} /><small>Studied at</small><strong>{profileData.university.name} · Software Engineering</strong></span></div>
      <div className="room-tags">{stackData.map(stack => <span key={stack.title}>{stack.title}</span>)}</div>
      <Button asChild variant="outline" className="rounded-full"><Link href="/about">The longer story <ArrowUpRight size={14} /></Link></Button>
    </div>
  );

  if (selected === "collection") return (
    <div className="room-detail-stack">
      <p className="room-muted">Six illuminated shelves of tiny 3D characters. Shelf one starts at the top; the Straw Hats wear their outfits from just after the timeskip.</p>
      {collectionRows.map((row, index) => <div className="room-collection-row" key={row.title}><p className="room-small">SHELF {index + 1}</p><h3>{row.title}</h3><div className="room-tags">{row.figures.map(figure => <span key={figure.name}>{figure.name}</span>)}</div></div>)}
    </div>
  );

  if (selected === "tech") return (
    <div className="room-detail-stack">
      <p className="room-muted">A few tools behind the code — from frontend and APIs to containers and the cloud.</p>
      <div className="room-tech-grid">{roomTechnologies.map(technology => <div key={technology.file}><Image src={`/img/room/tech/${technology.file}.svg`} alt="" width={36} height={36} /><span>{technology.name}</span></div>)}</div>
      <Button onClick={toggleTv} variant="outline" className="rounded-full">{tvOn ? "Turn TV off" : "Turn TV on"}<Tv size={14} /></Button>
      <p className="room-muted">The TV faces the bed. Beyond the window: the stepped silhouette of Landmark 81 after dark.</p>
    </div>
  );

  if (selected === "life") return (
    <div className="room-detail-stack">
      <Image src="/img/room/luffy-gear-five-reference.png" alt="Luffy Gear 5, a five-panel wall print" width={640} height={640} className="rounded-lg" />
      <div><p className="room-section-title">A room full of favourite worlds</p><p className="room-muted">Harry Kane, Kevin De Bruyne and Virgil van Dijk on the football wall. Luffy Gear 5 above the bed, the Survey Corps jacket on its hanger, Goku’s orange gi and Luffy’s straw hat on the clothing rack.</p></div>
      <p className="room-muted">Naruto’s Leaf headband rests beside the bedside lamp. A tiny Corgi sleeps on the rug, and six shelves of chibi figures keep the room company.</p>
    </div>
  );

  if (selected === "dog") return (
    <div className="room-detail-stack"><PawPrint size={44} className="text-primary" strokeWidth={1} /><p>A soft rug, oversized ears, tiny paws, and the hum of a developer’s laptop. Life is good.</p><p className="room-muted">Boss đang ngủ, có thể thấy bụng phập phồng nhè nhẹ. Cứ khám phá tiếp nhé, đừng đánh thức boss 💤</p></div>
  );

  return (
    <div className="room-detail-stack">
      <div className="room-contact-mark"><Mail size={32} strokeWidth={1} /></div>
      <p>I like building websites that are friendly, useful, and a pleasure to use. If that sounds like your kind of project, I’d love to hear about it.</p>
      <a className="room-email" href={`mailto:${profileData.email}`}>{profileData.email}<ArrowUpRight size={17} /></a>
      <div className="room-socials">{socialData.filter(social => social.title !== "Email").map(social => <a key={social.title} href={social.href} target="_blank" rel="noopener noreferrer"><strong>{social.title}</strong><span>{social.handle}<ArrowUpRight size={13} /></span></a>)}</div>
      <p className="room-small">HO CHI MINH CITY, VIETNAM · GMT+7</p>
      <p className="room-muted">Thanks for stopping by my little corner of the internet.</p>
    </div>
  );
};
