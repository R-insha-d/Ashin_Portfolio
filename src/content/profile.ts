/**
 * src/content/profile.ts
 *
 * Typed loader for src/content/portfolio.json: every fact and every visible string on the site
 * lives in that JSON file. Edit the JSON, not this file (editing notes are in its "_readme").
 *
 * `profile` is checked against the types below when the project type-checks / builds, so a
 * missing field or a wrong value type in the JSON fails `npm run build` with the exact field.
 * IDs are plain strings so entries can be added or removed freely.
 */
import data from './portfolio.json';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ToolId = string;
export type DisciplineId = string;
export type ServiceId = string;
export type RoleId = string;
export type EducationId = string;

/** Whole calendar years, inclusive. */
export type YearSpan = { readonly from: number; readonly to: number };

/** An H2 display line: `lead` in the display style, then `cut` set condensed and amber. */
export type DisplayLine = { readonly lead: string; readonly cut: string };

export type Tool = {
  readonly id: ToolId;
  readonly name: string;
  readonly shortName: string;
  /** For example "Adobe" or "Autodesk". */
  readonly vendor: string;
  /** Native project-file extensions, shown as chips. */
  readonly extensions: readonly string[];
};

export type SkillGroup = {
  readonly id: DisciplineId;
  readonly title: string;
  readonly tools: readonly ToolId[];
};

export type Service = {
  readonly id: ServiceId;
  readonly title: string;
  readonly body: string;
  readonly tools: readonly ToolId[];
};

export type Role = {
  readonly id: RoleId;
  readonly title: string;
  readonly company: string | null;
  /** Short organisation label for lists ("Freelance" for the freelance role). */
  readonly orgLabel: string;
  readonly location: string | null;
  /** null = no dates: the role stays off the year ruler and shows only its duration. */
  readonly dates: YearSpan | null;
  /** `short` is shown, `spoken` is read by screen readers. */
  readonly duration: { readonly short: string; readonly spoken: string };
  readonly bullets: readonly string[];
  /** Tool ids from `tools`. */
  readonly tools: readonly ToolId[];
};

export type EducationEntry = {
  readonly id: EducationId;
  readonly qualification: string;
  readonly institution: string;
  readonly place: string | null;
  readonly board: string | null;
  readonly dates: YearSpan;
  /** The featured entry is the "Training" line in the hero, About and timeline. */
  readonly featured: boolean;
};

export type Language = {
  readonly name: string;
  readonly nativeName: string | null;
  /** BCP 47 language tag, for example "ml" or "en". */
  readonly lang: string;
};

/** Paths under /public, for example "/images/ashin.jpg" or "/media/showreel.mp4". */
export type PublicImagePath = string;
export type PublicMediaPath = string;

/** Portrait. The file lives in /public/images. */
export type Photo = {
  readonly src: PublicImagePath;
  readonly alt: string;
  /** CSS object-position, for example '50% 30%'. */
  readonly focus?: string;
};

export type Captions = { readonly src: PublicMediaPath; readonly srcLang: string; readonly label: string };

export type Showreel = {
  readonly title: string;
  readonly sources: readonly { readonly src: PublicMediaPath; readonly type: string }[];
  readonly poster: PublicImagePath;
  /** Plain-text description of what the reel shows (accessibility and SEO). */
  readonly description: string;
  readonly durationLabel: string | null;
} & (
  | { readonly captions: Captions; readonly audioNote: string | null }
  | { readonly captions: null; readonly audioNote: string }
);

/** A project video: the full web version, an optional short muted preview loop, and a poster frame. */
export type ProjectVideo = {
  readonly src: PublicMediaPath;
  readonly preview: PublicMediaPath | null;
  readonly poster: PublicImagePath;
  /** Pixel size of the video, used for its aspect ratio (1080 x 1920 = vertical reel). */
  readonly width: number;
  readonly height: number;
  /** Shown on the card, for example "0:33". */
  readonly duration: string | null;
};

export type Project = {
  readonly id: string;
  readonly title: string;
  /** Free text; the Projects page builds its filter buttons from these, for example "2D Motion". */
  readonly category: string;
  /** true = also shown in the Work section on the home page. */
  readonly featured: boolean;
  readonly video: ProjectVideo | null;
  /** A still image, for projects without a video. */
  readonly image: { readonly src: PublicImagePath; readonly alt: string } | null;
  readonly role: string | null;
  readonly tools: readonly ToolId[];
  readonly year: number | null;
  readonly client: string | null;
  readonly summary: string | null;
  readonly link: { readonly href: string; readonly label: string } | null;
};

export type CvFile = { readonly href: string; readonly label: string };

/** Every interface string (headings, buttons, labels, SEO). Its shape comes from the JSON. */
export type Copy = typeof data.copy;

export type Profile = {
  readonly name: string;
  readonly initials: string;
  readonly role: string;
  readonly roleParts: { readonly before: string; readonly after: string };
  readonly experienceLabel: string;
  readonly location: {
    readonly display: string;
    readonly locality: string;
    readonly region: string;
    readonly country: string;
    readonly countryCode: string;
  };
  readonly contact: {
    readonly email: string;
    readonly phone: { readonly display: string; readonly href: string; readonly e164: string };
    readonly whatsapp: { readonly display: string; readonly href: string };
    readonly linkedin: { readonly display: string; readonly href: string };
  };
  readonly languages: readonly Language[];
  readonly tools: readonly Tool[];
  readonly skillGroups: readonly SkillGroup[];
  readonly otherSkills: readonly string[];
  readonly services: readonly Service[];
  readonly roles: readonly Role[];
  readonly highlight: {
    readonly event: string;
    readonly year: number;
    readonly capacity: string;
    readonly organisation: string;
    readonly roleId: RoleId;
  };
  readonly education: readonly EducationEntry[];
  readonly photo: Photo | null;
  readonly showreel: Showreel | null;
  readonly projects: readonly Project[];
  /** Order of the category filter buttons; categories not listed follow in project order. */
  readonly projectCategoryOrder: readonly string[];
  readonly cv: CvFile | null;
  readonly copy: Copy;
};

// ─── Data ───────────────────────────────────────────────────────────────────

export const profile: Profile = data;
export const copy: Copy = profile.copy;
