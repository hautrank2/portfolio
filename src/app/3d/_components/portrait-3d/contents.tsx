import { ArrowUpRight, Award, GraduationCap, Mail, MapPin } from "lucide-react";

import { cvData } from "~/data/cv";
import { projectData } from "~/data/projects";
import { profileData, socialData } from "~/data/site";

import { PortraitPanel } from "./panel";

export const ExperiencePanel = () => (
  <PortraitPanel index="01" file="experience.log" title="Experience">
    {cvData.experiences.map((item) => (
      <div key={item.company} className="p3d-entry">
        <div className="p3d-entry-head">
          <strong>{item.role}</strong>
          <span>{item.period}</span>
        </div>
        <p className="p3d-entry-sub">{item.company}</p>
        {item.note && <p className="p3d-muted">{item.note}</p>}
        <ul className="p3d-list">
          {item.highlights.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </div>
    ))}
  </PortraitPanel>
);

export const ProjectsPanel = () => (
  <PortraitPanel index="02" file="projects.json" title="Projects">
    {cvData.projects.map((item) => (
      <div key={item.name} className="p3d-entry">
        <div className="p3d-entry-head">
          <strong>{item.name}</strong>
          <span>{item.period}</span>
        </div>
        <p className="p3d-entry-sub">{item.kind} · {item.role}</p>
        {item.highlights[0] && <p className="p3d-muted">{item.highlights[0]}</p>}
        <div className="p3d-tags">{item.stack.map((name) => <span key={name}>{name}</span>)}</div>
      </div>
    ))}
    <p className="p3d-label">Side projects</p>
    <div className="p3d-links">
      {projectData.filter((item) => item.featured).map((item) => {
        const link = item.links.find((entry) => entry.kind === "website") ?? item.links[0];
        return link ? (
          <a key={item.slug} href={link.url} target="_blank" rel="noopener noreferrer">
            {item.title}<ArrowUpRight size={13} />
          </a>
        ) : null;
      })}
    </div>
  </PortraitPanel>
);

export const EducationPanel = () => (
  <PortraitPanel index="03" file="education.md" title="Education">
    {cvData.education.map((item) => (
      <div key={item.school} className="p3d-entry">
        <div className="p3d-entry-head">
          <strong><GraduationCap size={15} />{item.specialty}</strong>
          <span>{item.period}</span>
        </div>
        <p className="p3d-entry-sub">{item.school}</p>
        <div className="p3d-stats">
          <span><small>Major</small>{item.major}</span>
          <span><small>GPA</small>{item.gpa}</span>
        </div>
      </div>
    ))}
    <p className="p3d-label">Certifications</p>
    <ul className="p3d-certs">
      {cvData.certifications.map((item) => (
        <li key={item.name}>
          <Award size={14} />
          <span><strong>{item.name}</strong><small>{item.issuer}</small></span>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Certificate: ${item.name}`}>
              <ArrowUpRight size={14} />
            </a>
          )}
        </li>
      ))}
    </ul>
  </PortraitPanel>
);

export const ContactPanel = () => (
  <PortraitPanel index="04" file="contact.sh" title="Contact">
    <p className="p3d-muted">Have an idea, a question, or a project in mind? I&apos;d love to hear about it.</p>
    <a className="p3d-email" href={`mailto:${profileData.email}`}>
      <Mail size={16} />{profileData.email}<ArrowUpRight size={15} />
    </a>
    <div className="p3d-links">
      {socialData.filter((item) => item.title !== "Email").map((item) => (
        <a key={item.title} href={item.href} target="_blank" rel="noopener noreferrer">
          {item.title} <small>{item.handle}</small><ArrowUpRight size={13} />
        </a>
      ))}
    </div>
    <p className="p3d-small"><MapPin size={12} />{profileData.location.toUpperCase()} · GMT+7</p>
  </PortraitPanel>
);
