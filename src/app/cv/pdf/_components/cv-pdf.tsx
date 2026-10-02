import {
  Document,
  Font,
  Image,
  Link,
  Page,
  Circle,
  Line,
  Path,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import type { CvModel } from "~/types";

/*
 * The downloadable CV. react-pdf cannot read our Tailwind classes, so this is a
 * second rendering of the same `CvModel` that mirrors `cv-document.tsx`. Keep the
 * two in step: same sections, same order.
 */

const FONT_DIR = path.join(process.cwd(), "src", "assets", "fonts");

// Be Vietnam Pro rather than the built-in Helvetica, which has no Vietnamese
// diacritics — a name typed with dấu would come out as boxes.
Font.register({
  family: "BeVietnamPro",
  fonts: [
    { src: path.join(FONT_DIR, "BeVietnamPro-Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "BeVietnamPro-Medium.ttf"), fontWeight: 500 },
    { src: path.join(FONT_DIR, "BeVietnamPro-SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(FONT_DIR, "BeVietnamPro-Bold.ttf"), fontWeight: 700 },
  ],
});
// Long URLs should wrap at the page edge, not be hyphenated like prose.
Font.registerHyphenationCallback((word) => [word]);

/**
 * sRGB equivalents of the site's theme tokens in `globals.css` — PDF has no
 * oklch. `primary` is `--primary` (oklch(0.61 0.11 222)); the rest are the
 * light-theme `--foreground`, `--muted-foreground` and `.cv-paper` border.
 */
const color = {
  primary: "#0f91b2",
  primarySoft: "rgba(15, 145, 178, 0.1)",
  primaryLine: "rgba(15, 145, 178, 0.3)",
  foreground: "#020618",
  body: "#1f2937",
  muted: "#62748e",
  border: "#dadee5",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "BeVietnamPro",
    fontSize: 9.5,
    color: color.foreground,
    paddingTop: 36,
    paddingHorizontal: 40,
    // Room for the fixed footer.
    paddingBottom: 52,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingBottom: 16,
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 12,
    objectFit: "cover",
  },
  name: { fontSize: 22, fontWeight: 700, lineHeight: "26pt" },
  title: {
    fontSize: 11.5,
    fontWeight: 600,
    color: color.primary,
    marginTop: 3,
    lineHeight: "15pt",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 14,
    rowGap: 5,
    marginTop: 8,
    color: color.muted,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { lineHeight: "12pt" },
  metaLink: { color: color.muted, textDecoration: "none", lineHeight: "12pt" },
  section: { marginBottom: 22 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  // No `letterSpacing`: PDF stores it as gaps between glyphs, so copied text
  // and ATS parsers read the heading as "P R O J E C T S".
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    color: color.primary,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: color.primaryLine },
  // Line height is always absolute ("14pt") and set per text style. In
  // react-pdf 4.9 a unitless multiplier comes out ~1.8x too tall, and one
  // inherited from `page` also hides the `render` page-number Text entirely.
  paragraph: { color: color.body, marginBottom: 6, lineHeight: "15.5pt" },
  item: { marginBottom: 14 },
  itemHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
  },
  itemName: { fontWeight: 700, flexShrink: 1, lineHeight: "15pt" },
  itemDate: { fontSize: 8.5, color: color.muted, lineHeight: "15pt" },
  role: { fontWeight: 500, color: color.primary, lineHeight: "15pt" },
  note: { fontSize: 8.5, color: color.muted, lineHeight: "13pt" },
  line: { lineHeight: "15pt", color: color.body },
  label: { fontWeight: 600, color: color.foreground },
  bulletRow: { flexDirection: "row", marginTop: 4, color: color.body },
  bulletDot: { width: 10, color: color.primary, lineHeight: "15pt" },
  bulletText: { flex: 1, lineHeight: "15pt" },
  skillRow: { flexDirection: "row", marginBottom: 8 },
  skillLabel: { width: 80, fontWeight: 600, paddingTop: 1 },
  chips: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 3 },
  chip: {
    fontSize: 8,
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    borderRadius: 3,
    borderWidth: 0.75,
    borderColor: color.primaryLine,
    backgroundColor: color.primarySoft,
  },
  footer: {
    position: "absolute",
    bottom: 22,
    fontSize: 8,
    color: color.muted,
  },
});

const hasText = (value: string) => value.trim().length > 0;

const trimmed = (items: string[]) =>
  items.map((item) => item.trim()).filter(Boolean);

const displayUrl = (url: string) =>
  url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/**
 * A path under `public/` is read from disk — the PDF is rendered on the server
 * at build time, where there is no origin to fetch `/img/avt.jpg` from. Full
 * URLs are left for react-pdf to download. A missing file drops the photo
 * rather than failing the whole document.
 */
const loadAvatar = (avatar: string) => {
  if (!hasText(avatar)) return null;
  if (/^https?:\/\//.test(avatar)) return avatar;

  try {
    const data = readFileSync(path.join(process.cwd(), "public", avatar));
    const format: "png" | "jpg" = avatar.toLowerCase().endsWith(".png")
      ? "png"
      : "jpg";
    return { data, format };
  } catch {
    return null;
  }
};

/**
 * The same lucide glyphs the web sheet uses (`lucide-react` 1.33 icon nodes),
 * redrawn as PDF vectors — react-pdf cannot render the React icon components.
 */
const icons = {
  phone: [
    <Path
      key="p"
      d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
    />,
  ],
  mail: [
    <Path key="p" d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />,
    <Rect key="r" x="2" y="4" width="20" height="16" rx="2" />,
  ],
  cake: [
    <Path key="a" d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />,
    <Path key="b" d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />,
    <Path key="c" d="M2 21h20" />,
    <Path key="d" d="M7 8v3" />,
    <Path key="e" d="M12 8v3" />,
    <Path key="f" d="M17 8v3" />,
    <Path key="g" d="M7 4h.01" />,
    <Path key="h" d="M12 4h.01" />,
    <Path key="i" d="M17 4h.01" />,
  ],
  mapPin: [
    <Path
      key="p"
      d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
    />,
    <Circle key="c" cx="12" cy="10" r="3" />,
  ],
  link: [
    <Path key="a" d="M9 17H7A5 5 0 0 1 7 7h2" />,
    <Path key="b" d="M15 7h2a5 5 0 1 1 0 10h-2" />,
    <Line key="c" x1="8" x2="16" y1="12" y2="12" />,
  ],
};

type IconName = keyof typeof icons;

// Stroke and fill go on every shape: react-pdf does not inherit them from
// <Svg> the way a browser does, so the outlines came out as solid blobs.
const iconStroke = {
  stroke: color.primary,
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  fill: "none",
} as const;

const Icon = ({ name }: { name: IconName }) => (
  <Svg viewBox="0 0 24 24" width={9} height={9}>
    {icons[name].map((shape) => React.cloneElement(shape, iconStroke))}
  </Svg>
);

type SectionProps = {
  title: string;
  children: React.ReactNode;
  /**
   * Glue the heading to the whole first entry (default) — right for short,
   * unbreakable entries. Turn off for a long entry that may flow across pages;
   * the heading then only asks for a few lines of room below it.
   */
  keepWithFirst?: boolean;
};

/**
 * Never strands a heading at the bottom of a page with its content on the
 * next. (`minPresenceAhead` alone does not help when the first entry is itself
 * `wrap={false}`, hence the glued block.)
 */
const Section = ({ title, children, keepWithFirst = true }: SectionProps) => {
  const heading = (
    <View
      style={styles.sectionTitleRow}
      minPresenceAhead={keepWithFirst ? undefined : 80}
    >
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );

  if (!keepWithFirst) {
    return (
      <View style={styles.section}>
        {heading}
        {children}
      </View>
    );
  }

  const [first, ...rest] = React.Children.toArray(children);
  return (
    <View style={styles.section}>
      <View wrap={false}>
        {heading}
        {first}
      </View>
      {rest}
    </View>
  );
};

const Bullets = ({ items }: { items: string[] }) => (
  <>
    {trimmed(items).map((item, index) => (
      <View key={index} style={styles.bulletRow}>
        <Text style={styles.bulletDot}>•</Text>
        <Text style={styles.bulletText}>{item}</Text>
      </View>
    ))}
  </>
);

export type CvPdfProps = { cv: CvModel };

export const CvPdf = ({ cv }: CvPdfProps) => {
  const avatar = loadAvatar(cv.avatar);
  const contacts = (
    [
      {
        icon: "phone",
        value: cv.phone,
        href: `tel:${cv.phone.replace(/\s/g, "")}`,
      },
      { icon: "mail", value: cv.email, href: `mailto:${cv.email}` },
      { icon: "cake", value: cv.birthday },
      { icon: "mapPin", value: cv.location },
    ] satisfies { icon: IconName; value: string; href?: string }[]
  ).filter((contact) => hasText(contact.value));
  const links = cv.links.filter((link) => hasText(link.url));
  const objective = trimmed(cv.objective);

  return (
    <Document
      title={`${cv.name} — CV`}
      author={cv.name}
      subject={cv.title}
      language="en"
    >
      <Page size="A4" style={styles.page}>
        {/* Two fixed <Text>s rather than one fixed row <View>: react-pdf 4.9
            silently drops a `fixed` + absolutely positioned View, footer and
            page numbers included. */}
        <Text style={[styles.footer, { left: 40 }]} fixed>
          {cv.name}
          {hasText(cv.title) ? ` · ${cv.title}` : ""}
        </Text>
        <Text
          style={[styles.footer, { left: 40, right: 40, textAlign: "right" }]}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} / ${totalPages}`
          }
        />

        <View style={styles.header}>
          {avatar && (
            // react-pdf's <Image> is not an <img>: it has no `alt` prop to set.
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={avatar} style={styles.avatar} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{cv.name}</Text>
            {hasText(cv.title) && <Text style={styles.title}>{cv.title}</Text>}
            <View style={styles.metaRow}>
              {contacts.map(({ icon, value, href }, index) => (
                <View key={index} style={styles.metaItem}>
                  <Icon name={icon} />
                  {href ? (
                    <Link src={href} style={styles.metaLink}>
                      {value}
                    </Link>
                  ) : (
                    <Text style={styles.metaText}>{value}</Text>
                  )}
                </View>
              ))}
            </View>
            {links.length > 0 && (
              <View style={[styles.metaRow, { marginTop: 5 }]}>
                {links.map((link, index) => (
                  <View key={index} style={styles.metaItem}>
                    <Icon name="link" />
                    <Link src={link.url} style={styles.metaLink}>
                      {displayUrl(link.url)}
                    </Link>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {objective.length > 0 && (
          <Section title="Objective">
            {objective.map((paragraph, index) => (
              <Text key={index} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </Section>
        )}

        {cv.education.length > 0 && (
          <Section title="Education">
            {cv.education.map((edu, index) => (
              <View key={index} style={styles.item} wrap={false}>
                <View style={styles.itemHead}>
                  <Text style={styles.itemName}>{edu.school}</Text>
                  <Text style={styles.itemDate}>{edu.period}</Text>
                </View>
                <Text style={styles.line}>
                  {[
                    hasText(edu.major) ? `Major: ${edu.major}` : "",
                    hasText(edu.specialty) ? `Specialty: ${edu.specialty}` : "",
                  ]
                    .filter(Boolean)
                    .join("  ·  ")}
                </Text>
              </View>
            ))}
          </Section>
        )}

        {cv.skills.length > 0 && (
          <Section title="Skills">
            {cv.skills.map((group, index) => (
              <View key={index} style={styles.skillRow} wrap={false}>
                <Text style={styles.skillLabel}>{group.label}</Text>
                <View style={styles.chips}>
                  {trimmed(group.items).map((item, itemIndex) => (
                    <Text key={itemIndex} style={styles.chip}>
                      {item}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </Section>
        )}

        {cv.experiences.length > 0 && (
          <Section title="Experience" keepWithFirst={false}>
            {cv.experiences.map((exp, index) => (
              // A job is allowed to flow across pages (unlike a project): it is
              // one long block, and keeping it whole left half a page blank.
              <View key={index} style={styles.item}>
                <View style={styles.itemHead}>
                  <Text style={styles.itemName}>{exp.company}</Text>
                  <Text style={styles.itemDate}>{exp.period}</Text>
                </View>
                <Text style={styles.role}>{exp.role}</Text>
                {hasText(exp.note) && (
                  <Text style={styles.note}>{exp.note}</Text>
                )}
                <Bullets items={exp.highlights} />
              </View>
            ))}
          </Section>
        )}

        {cv.projects.length > 0 && (
          <Section title="Projects">
            {cv.projects.map((project, index) => {
              const stack = trimmed(project.stack);
              return (
                // Each project stays on one page; a page break moves the
                // whole block rather than splitting it mid-bullet.
                <View key={index} style={styles.item} wrap={false}>
                  <View style={styles.itemHead}>
                    <Text style={styles.itemName}>{project.name}</Text>
                    <Text style={styles.itemDate}>
                      {[project.kind, project.period]
                        .filter(hasText)
                        .join("  ·  ")}
                    </Text>
                  </View>
                  {hasText(project.role) && (
                    <Text style={styles.line}>
                      <Text style={styles.label}>Role: </Text>
                      {project.role}
                    </Text>
                  )}
                  {stack.length > 0 && (
                    <Text style={styles.line}>
                      <Text style={styles.label}>Tech stack: </Text>
                      {stack.join(", ")}
                    </Text>
                  )}
                  <Bullets items={project.highlights} />
                </View>
              );
            })}
          </Section>
        )}
      </Page>
    </Document>
  );
};

export const renderCvPdf = (cv: CvModel) => renderToBuffer(<CvPdf cv={cv} />);
