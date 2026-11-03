"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Code2, Gamepad2, House, Mail, Moon, UserRound } from "lucide-react";
import Link from "next/link";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { navData, profileData } from "~/data/site";

import { chapters, detailDescriptions, detailTitles } from "./chapters";
import { RoomDetails } from "./details";
import { useRoom } from "./hook";
import "./room.css";

const chapterIcons = [House, UserRound, BookOpen, Code2, Gamepad2, Mail];

export const Room = () => {
  const { containerRef, status, active, chapter, selected, setSelected, goTo, tvOn, toggleTv } = useRoom();
  return (
    <section className="room-home dark" data-chapter={chapter.id} data-popup={selected ? "open" : "closed"} aria-label="Hậu’s room — an interactive night tour">
      <div className="room-image-backdrop" aria-hidden="true"><div className="room-backdrop-print room-backdrop-luffy" /></div>
      <div className="room-atmosphere" aria-hidden="true" />

      <header className="room-header">
        <button className="room-brand" onClick={() => goTo(0)} aria-label="Back to room overview"><span>ht.</span><span>HAU TRAN<small>PERSONAL SPACE / 2026</small></span></button>
        <nav aria-label="Main">{navData.filter(item => ["/blog", "/showcase", "/about"].includes(item.href)).map(item => <Link key={item.href} href={item.href}>{item.title}<ArrowUpRight size={11} /></Link>)}</nav>
        <div className="room-night-label"><span /><Moon size={12} />AFTER HOURS<span className="room-timezone"> / GMT+7</span></div>
      </header>

      <div className="room-tour-heading" key={chapter.id}>
        <p className="room-eyebrow"><span />{chapter.subtitle}</p>
        {active === 0 ? <><h1>Behind the code,<br />there’s <em>a whole world.</em></h1><p className="room-welcome">A developer’s room. A few obsessions.<br />And a little piece of who I am.</p><button className="room-enter" onClick={() => goTo(1)}>Make yourself at home<ArrowDown size={15} /></button></> : <h1 className="room-chapter-title">{chapter.title}</h1>}
      </div>

      <div className="room-stage">
        <div ref={containerRef} className="room-canvas" />
        {status === "loading" && <div className="room-loading" role="status"><span className="room-loader" /><span>Turning on the lights…</span></div>}
        {status === "error" && <div className="room-loading room-fallback" role="status"><Moon size={30} /><p>Your browser couldn’t open the 3D room.</p><p>Use the chapter buttons below to explore all my information.</p></div>}

      </div>

      {active === 0 && <div className="room-intro-note"><span className="room-note-line" /><p>Code by day.<br /><em>Side quests by night.</em></p><span className="room-note-coordinate">10.8231° N · 106.6297° E</span></div>}

      <div className="room-tour-status" aria-live="polite"><span className="room-status-dot" />{status === "loading" ? "PREPARING YOUR VISIT" : `${String(active + 1).padStart(2, "0")} / ${String(chapters.length).padStart(2, "0")} — ${chapter.label.toUpperCase()}`}</div>
      <footer className="room-dock">
        <div className="room-scroll-hint"><span className="room-mouse"><i /></span><span>SCROLL TO EXPLORE<small>or use ← → / swipe</small></span></div>
        <nav className="room-chapters" aria-label="Room chapters">{chapters.map((item, index) => {
          const Icon = chapterIcons[index];
          return <button key={item.id} className={index === active ? "is-active" : ""} onClick={() => goTo(index)} aria-label={`View ${item.label}`} aria-current={index === active ? "step" : undefined}><span className="room-chapter-icon"><Icon size={17} strokeWidth={1.5} /></span><span>{item.label}</span></button>;
        })}</nav>
        <div className="room-step-buttons"><button onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Previous room angle"><ArrowLeft size={17} /></button><button onClick={() => goTo(active + 1)} disabled={active === chapters.length - 1} aria-label="Next room angle"><ArrowRight size={17} /></button></div>
      </footer>
      <div className="room-progress" aria-hidden="true"><span style={{ width: `${(active + 1) / chapters.length * 100}%` }} /></div>

      <Dialog modal={false} open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className={`room-popup dark translate-x-0 translate-y-0 room-popup-${selected ?? "about"}`} onOpenAutoFocus={event => event.preventDefault()} onInteractOutside={event => event.preventDefault()}>
          <div className="room-popup-art" aria-hidden="true" />
          <div className="room-popup-scroll">
            <DialogHeader><p className="room-popup-eyebrow">{selected === "dog" ? "BONUS / THE ROOMMATE" : chapter.subtitle}</p><DialogTitle>{selected ? detailTitles[selected] : profileData.name}</DialogTitle><DialogDescription>{selected ? detailDescriptions[selected] : "Welcome to my room"}</DialogDescription></DialogHeader>
            {selected && <RoomDetails selected={selected} tvOn={tvOn} toggleTv={toggleTv} />}
          </div>
          <div className="room-popup-footer"><span>{selected === "dog" ? "LET SLEEPING DOGS LIE" : "A LITTLE PART OF MY WORLD"}</span><button onClick={() => goTo(active < chapters.length - 1 ? active + 1 : 0)}>{active < chapters.length - 1 ? "Next corner" : "Back to the room"}<ArrowRight size={13} /></button></div>
        </DialogContent>
      </Dialog>
    </section>
  );
};
