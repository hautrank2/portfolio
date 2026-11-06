"use client";

import { ArrowDown, BriefcaseBusiness, Code2, MapPin, Sparkles } from "lucide-react";

import { profileData } from "~/data/site";

import { ContactPanel, EducationPanel, ExperiencePanel, ProjectsPanel } from "./contents";
import { usePortrait3d } from "./hook";
import { portraitSections } from "./sections";
import "./portrait-3d.css";

const panels = {
  intro: null,
  experience: <ExperiencePanel />,
  projects: <ProjectsPanel />,
  education: <EducationPanel />,
  contact: <ContactPanel />,
};

// Floating labels around the character on the first screen; `spot` places them in CSS.
const chips = [
  { spot: "a", icon: Sparkles, label: "01", text: profileData.role },
  { spot: "b", icon: BriefcaseBusiness, label: "02", text: "Frontend · VNTT" },
  { spot: "c", icon: Code2, label: "03", text: "React · Angular · Next.js" },
  { spot: "d", icon: MapPin, label: "04", text: profileData.location },
];

export const Portrait3d = () => {
  const { rootRef, stageRef, sectionRef, status, active, goTo } = usePortrait3d();

  return (
    <div ref={rootRef} className="p3d dark" data-status={status}>
      {/* sticky, not fixed: it stays put while the sections scroll over it, then leaves with them before the footer */}
      <div className="p3d-stage">
        <div className="p3d-grid" aria-hidden="true" />
        {/* the name sits BEHIND the character */}
        <p className="p3d-name" aria-hidden="true">{profileData.name}</p>
        <div ref={stageRef} className="p3d-canvas" />
        {status === "loading" && <p className="p3d-loading" role="status"><span />Waking him up…</p>}
        <ul className="p3d-chips" aria-hidden="true">
          {chips.map(({ spot, icon: Icon, label, text }) => (
            <li key={spot} data-spot={spot}><Icon size={13} /><small>{label}</small>{text}</li>
          ))}
        </ul>
        <nav className="p3d-hud" aria-label="Sections">
          {portraitSections.map((section, index) => (
            <button key={section.id} type="button" onClick={() => goTo(index)} data-active={index === active} aria-current={index === active ? "step" : undefined}>
              <span>{section.label}</span><i />
            </button>
          ))}
        </nav>
      </div>

      <div className="p3d-sections">
        {portraitSections.map((section, index) => (
          <section
            key={section.id}
            ref={sectionRef(index)}
            className="p3d-section"
            data-panel={section.panel}
            data-active={index === active}
            aria-label={section.label}
          >
            {section.id === "intro" ? (
              <div className="p3d-intro">
                <h1 className="sr-only">{profileData.name} — {profileData.role}</h1>
                <p>
                  Hello. I&apos;m {profileData.name}, a <mark>{profileData.role}</mark> who builds{" "}
                  <mark>friendly websites</mark> from Ho Chi Minh City.
                </p>
                <button type="button" className="p3d-scroll" onClick={() => goTo(1)}>
                  Scroll — watch him move<ArrowDown size={14} />
                </button>
              </div>
            ) : (
              panels[section.id]
            )}
          </section>
        ))}
      </div>
    </div>
  );
};
