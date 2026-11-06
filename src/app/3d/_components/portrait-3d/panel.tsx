import type { PortraitPanelProps } from "./type";

/** A terminal-style window: title bar with a fake file name, bracketed corners, scanlines. */
export const PortraitPanel = ({ index, file, title, children }: PortraitPanelProps) => (
  <article className="p3d-panel" aria-labelledby={`p3d-${file}`}>
    <header className="p3d-panel-bar">
      <span className="p3d-panel-dots" aria-hidden="true"><i /><i /><i /></span>
      <code>~/hau/{file}</code>
      <span className="p3d-panel-index">{index}</span>
    </header>
    <div className="p3d-panel-body">
      <p className="p3d-panel-eyebrow">{index} / {title.toUpperCase()}</p>
      <h2 id={`p3d-${file}`}>{title}</h2>
      {children}
    </div>
  </article>
);
