/**
 * src/content/profile.ts
 *
 * The single source of truth for every fact and every visible string on the site.
 * - Facts come only from Ashin's CV. Do not add projects, clients, testimonials, awards,
 *   view counts, percentages or dates that are not on the CV.
 * - Copy is first person. Never refer to Ashin with third-person pronouns.
 * - Text that renders in capitals is written in normal case here and uppercased with CSS.
 * - Mango Media and Freelance have no dates on the CV: their `dates` stay null.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type ToolId = 'premiere-pro' | 'after-effects' | 'photoshop' | 'illustrator' | '3ds-max' | 'maya';
export type DisciplineId = 'video-motion' | 'graphic-design' | '3d-modeling';
export type ServiceId = 'video-editing' | 'motion-graphics' | '3d' | 'graphic-design';
export type RoleId = 'techbrein' | 'samvedha' | 'mango-media' | 'freelance';
export type EducationId = 'diploma' | 'higher-secondary' | 'secondary';

/** Whole calendar years exactly as printed on the CV, inclusive. */
export type YearSpan = { readonly from: number; readonly to: number };

/** An H2 display line: `lead` in the display style, then `cut` set condensed and amber. */
export type DisplayLine = { readonly lead: string; readonly cut: string };

export type Tool = {
  readonly id: ToolId;
  readonly name: string;
  readonly shortName: string;
  readonly vendor: 'Adobe' | 'Autodesk';
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
  /** null = the CV gives no dates. Such a role never goes on a dated axis and is never given years. */
  readonly dates: YearSpan | null;
  /** Duration exactly as the CV states it. `short` is shown, `spoken` is for screen readers. */
  readonly duration: { readonly short: string; readonly spoken: string };
  /** CV bullets, verbatim. */
  readonly bullets: readonly string[];
  /** Only the tools this role's CV bullets name. */
  readonly tools: readonly ToolId[];
};

export type EducationEntry = {
  readonly id: EducationId;
  readonly qualification: string;
  readonly institution: string;
  readonly place: string | null;
  readonly board: string | null;
  readonly dates: YearSpan;
  readonly featured: boolean;
};

export type Language = {
  readonly name: string;
  readonly nativeName: string | null;
  readonly lang: 'ml' | 'en';
};

export type PublicImagePath = `/images/${string}`;
export type PublicMediaPath = `/media/${string}`;

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
  readonly sources: readonly { readonly src: PublicMediaPath; readonly type: 'video/mp4' | 'video/webm' }[];
  readonly poster: PublicImagePath;
  /** Plain-text description of what the reel shows (accessibility and SEO). */
  readonly description: string;
  readonly durationLabel: string | null;
} & (
  | { readonly captions: Captions; readonly audioNote: string | null }
  | { readonly captions: null; readonly audioNote: string }
);

export type Project = {
  readonly id: string;
  readonly title: string;
  readonly role: string;
  readonly tools: readonly ToolId[];
  /** Only when Ashin supplies it. */
  readonly year: number | null;
  /** Only when Ashin supplies it and may name the client. */
  readonly client: string | null;
  readonly summary: string;
  readonly image: { readonly src: PublicImagePath; readonly alt: string } | null;
  readonly link: { readonly href: string; readonly label: string } | null;
};

export type CvFile = { readonly href: `/files/${string}.pdf`; readonly label: string };

// ─── Copy (every visible string) ───────────────────────────────────────────

export const copy = {
  meta: {
    title: 'Ashin N — Video Editor & 3D Artist, Kannur, Kerala',
    description:
      'Video Editor & 3D Artist in Kannur, Kerala, India. I have over 2 years of professional experience in video editing, motion graphics, graphic design and 3D modeling.',
    siteName: 'Ashin N',
    ogAlt: 'Ashin N, Video Editor & 3D Artist, Kannur, Kerala, India',
    keywords: [
      'Ashin N', 'video editor', '3D artist', 'motion graphics', 'graphic design', '3D modeling',
      'Kannur', 'Kerala', 'Adobe Premiere Pro', 'Adobe After Effects', 'Autodesk Maya', 'Autodesk 3ds Max',
    ],
  },
  a11y: {
    skipLink: 'Skip to content',
    newTab: '(opens in a new tab)',
    datesNotListed: 'dates not listed',
    yearRangeJoiner: 'to',
  },
  sequence: {
    name: 'Sequence 01',
    short: 'Seq 01',
    inPoint: 'In',
    outPoint: 'Out',
    end: 'End of sequence',
  },
  motion: {
    rec: 'Rec',
    standby: 'Standby',
    action: 'pause motion',
    hint: 'Stops the 3D reel, running timecodes, film grain and the blinking light.',
    rowLabel: 'Motion',
  },
  copyButton: {
    idle: 'Copy',
    done: 'Copied',
    failed: 'Copy failed',
    emailSuffix: 'email address',
    emailAnnouncement: 'Email address copied',
  },
  header: {
    homeLabel: 'Ashin N, back to top',
    navLabel: 'Sections',
    contact: 'Contact',
    menu: 'Menu',
    close: 'Close',
    menuLabel: 'Site menu',
    menuNavLabel: 'Site sections',
    menuContactTitle: 'Get in touch',
    email: 'Email',
    call: 'Call',
    whatsapp: 'WhatsApp',
    linkedin: 'LinkedIn',
  },
  hero: {
    hudLabel: 'Opening',
    eyebrow: 'Portfolio · Kannur, Kerala, India',
    lead:
      'I have over 2 years of professional experience in video editing, motion graphics, graphic design and 3D modeling, across media production, creative agencies and freelance projects.',
    ctaEmail: 'Email me',
    ctaTimeline: 'See my timeline',
    ctaShowreel: 'Watch my showreel',
    ctaWhatsApp: 'WhatsApp',
    ctaLinkedIn: 'LinkedIn',
    slate: {
      label: 'Slate',
      ariaLabel: 'At a glance',
      tools: 'Tools',
      latest: 'Latest',
      workedAt: 'Worked at',
      training: 'Training',
      contact: 'Contact',
    },
  },
  monitor: {
    program: 'Program',
    source: 'Source',
    reelClock: 'Reel · 25p',
    portraitAspect: '4:5',
    status: {
      standby: 'Standby',
      buffering: 'Buffering…',
      live: 'Live',
      unavailable: 'Static preview · 3D needs WebGL',
      fallback: 'Static preview',
    },
    viewIn3d: 'View in 3D',
    loading3d: 'Loading 3D…',
    hintPointer: 'Drag the reel to jog',
    hintTouch: 'Swipe sideways to jog',
    groupLabel: '3D film reel',
    groupDescription:
      'A decorative 3D film reel. Drag it sideways, or use the transport buttons, to jog it one frame at a time.',
    transportLabel: 'Reel transport',
    back: 'Back one frame',
    forward: 'Forward one frame',
    play: 'Play reel',
    pause: 'Pause reel',
    modes: { play: 'Play', pause: 'Pause', jog: 'Jog', shuttle: 'Shuttle' },
  },
  about: {
    eyebrow: 'About',
    display: { lead: 'Two crafts, one ', cut: 'timeline.' },
    paragraphs: [
      'I’m a video editor and 3D artist with over 2 years of professional experience across media production, creative agencies and freelance projects. I work in video editing, motion graphics, graphic design and 3D modeling, using Adobe Creative Suite and Autodesk software.',
      'I hold a Diploma in 3D Animation & VFX, and I’m looking for a role where I can apply my creative and technical skills to help a company meet its goals.',
    ],
    propertiesTitle: 'Clip properties',
    properties: {
      experience: 'Experience',
      roles: 'Roles',
      tools: 'Core tools',
      training: 'Training',
      languages: 'Languages',
      basedIn: 'Based in',
    },
  },
  services: {
    eyebrow: 'What I do',
    display: { lead: 'From brief to ', cut: 'final delivery.' },
    intro: 'I work across four crafts, in Adobe Creative Suite and Autodesk software.',
    toolsLabel: 'Tools',
  },
  skills: {
    eyebrow: 'Toolkit',
    display: { lead: 'Six core tools, three ', cut: 'disciplines.' },
    intro: 'Adobe Creative Suite for editing, motion and design. Autodesk software for 3D modeling and animation.',
    extensionsLabel: 'Project files',
    otherTitle: 'Also in my kit',
  },
  experience: {
    eyebrow: 'Experience',
    display: { lead: 'Where I’ve ', cut: 'worked.' },
    intro:
      'Roles with dates sit on the ruler. My internship at Mango Media and my freelance work sit in the bin with their durations.',
    timeline: {
      panelLabel: 'Timeline · Career',
      groupLabel: 'Career timeline, years as listed on my CV, not to scale',
      rulerNote: 'Years as listed on my CV · not to scale',
      tracks: { v2: 'Training', v1: 'Roles', a1: 'Tools' },
      trackCodes: { v2: 'V2', v1: 'V1', a1: 'A1' },
      marker: 'Huddle Global 2026 · Exhibitor',
      bin: 'Bin · Duration only',
    },
    edl: {
      label: 'Edit decision list',
      columns: { event: 'Event', track: 'Track', inOut: 'In–Out', duration: 'Dur', role: 'Role' },
      binTrack: 'Bin',
      toolsLabel: 'Tools named',
    },
  },
  highlight: {
    eyebrow: 'Highlight',
    display: { lead: 'Huddle Global ', cut: '2026.' },
    kicker: 'Exhibitor for TechBrein Solutions',
    body:
      'I represented TechBrein Solutions as an exhibitor at Huddle Global 2026, presenting the company’s work and engaging with event visitors.',
    markerLabel: 'Marker · Exhibitor',
  },
  education: {
    eyebrow: 'Education',
    display: { lead: 'Trained in 3D animation & ', cut: 'VFX.' },
  },
  contact: {
    eyebrow: 'Contact',
    display: { lead: 'Let’s make the next ', cut: 'cut.' },
    intro: 'Whether you’re hiring or have a project in mind, email me, call or message me on WhatsApp.',
    availability:
      'Seeking a role where I can apply my creative and technical skills to help a company meet its goals.',
    emailLabel: 'Email',
    rows: {
      phone: 'Phone',
      whatsapp: 'WhatsApp',
      linkedin: 'LinkedIn',
      location: 'Location',
      languages: 'Languages',
    },
    actions: {
      call: 'Call',
      whatsapp: 'Message on WhatsApp',
      linkedin: 'View profile',
      linkedinSuffix: 'on LinkedIn',
    },
    ready: 'Ready',
  },
  work: {
    eyebrow: 'Work',
    display: { lead: '', cut: 'Selects.' },
    introReelAndProjects: 'My showreel, then selected projects.',
    introReel: 'My showreel.',
    introProjects: 'Selected projects.',
    showreelLabel: 'Showreel',
    descriptionLabel: 'What’s in the reel',
    durationLabel: 'Duration',
    roleLabel: 'My role',
    toolsLabel: 'Tools',
    yearLabel: 'Year',
    clientLabel: 'Client',
  },
  footer: {
    creditsLabel: 'Credits',
    linksLabel: 'Contact links',
    backToTop: 'Back to top',
    copyright: '© Ashin N',
  },
} as const;

export type Copy = typeof copy;

// ─── Profile ────────────────────────────────────────────────────────────────

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
    readonly phone: { readonly display: string; readonly href: `tel:${string}`; readonly e164: string };
    readonly whatsapp: { readonly display: string; readonly href: `https://wa.me/${string}` };
    readonly linkedin: { readonly display: string; readonly href: `https://www.linkedin.com/in/${string}` };
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
  readonly cv: CvFile | null;
  readonly copy: Copy;
};

export const profile: Profile = {
  name: 'Ashin N',
  initials: 'AN',
  role: 'Video Editor & 3D Artist',
  roleParts: { before: 'Video Editor', after: '3D Artist' },
  experienceLabel: '2+ years',
  location: {
    display: 'Kannur, Kerala, India',
    locality: 'Kannur',
    region: 'Kerala',
    country: 'India',
    countryCode: 'IN',
  },
  contact: {
    email: 'ashindesigner20@gmail.com',
    phone: { display: '+91 62820 90266', href: 'tel:+916282090266', e164: '+916282090266' },
    whatsapp: { display: '+91 62820 90266', href: 'https://wa.me/916282090266' },
    linkedin: {
      display: 'linkedin.com/in/ashin-n-543a2829a',
      href: 'https://www.linkedin.com/in/ashin-n-543a2829a',
    },
  },
  languages: [
    { name: 'Malayalam', nativeName: null, lang: 'ml' },
    { name: 'English', nativeName: null, lang: 'en' },
  ],
  tools: [
    { id: 'premiere-pro', name: 'Adobe Premiere Pro', shortName: 'Premiere Pro', vendor: 'Adobe', extensions: ['.prproj'] },
    { id: 'after-effects', name: 'Adobe After Effects', shortName: 'After Effects', vendor: 'Adobe', extensions: ['.aep'] },
    { id: 'photoshop', name: 'Adobe Photoshop', shortName: 'Photoshop', vendor: 'Adobe', extensions: ['.psd'] },
    { id: 'illustrator', name: 'Adobe Illustrator', shortName: 'Illustrator', vendor: 'Adobe', extensions: ['.ai'] },
    { id: '3ds-max', name: 'Autodesk 3ds Max', shortName: '3ds Max', vendor: 'Autodesk', extensions: ['.max'] },
    { id: 'maya', name: 'Autodesk Maya', shortName: 'Maya', vendor: 'Autodesk', extensions: ['.ma', '.mb'] },
  ],
  skillGroups: [
    { id: 'video-motion', title: 'Video editing & motion graphics', tools: ['premiere-pro', 'after-effects'] },
    { id: 'graphic-design', title: 'Graphic design', tools: ['photoshop', 'illustrator'] },
    { id: '3d-modeling', title: '3D modeling & animation', tools: ['3ds-max', 'maya'] },
  ],
  otherSkills: ['3D Animation', 'VFX', 'Visual Storytelling', 'Content Creation', 'Post-Production'],
  services: [
    {
      id: 'video-editing',
      title: 'Video editing',
      body: 'I edit and produce video content for company and client projects, and I contribute to production from planning through post-production to final delivery.',
      tools: ['premiere-pro', 'after-effects'],
    },
    {
      id: 'motion-graphics',
      title: 'Motion graphics',
      body: 'I design motion graphics for video projects, and I create content that supports brand and marketing needs.',
      tools: ['after-effects', 'illustrator'],
    },
    {
      id: '3d',
      title: '3D modeling & animation',
      body: 'I model and animate in 3D. I trained in 3D animation and VFX, and I have produced 3D visuals for individual and business clients.',
      tools: ['3ds-max', 'maya'],
    },
    {
      id: 'graphic-design',
      title: 'Graphic design',
      body: 'I design graphics in Photoshop and Illustrator, and I have produced graphics for individual and business clients.',
      tools: ['photoshop', 'illustrator'],
    },
  ],
  roles: [
    {
      id: 'techbrein',
      title: 'Video Editor & Content Creator',
      company: 'TechBrein Solutions',
      orgLabel: 'TechBrein Solutions',
      location: 'Calicut',
      dates: { from: 2025, to: 2026 },
      duration: { short: '1 yr+', spoken: '1 year plus' },
      bullets: [
        'Edit and produce video content for company and client projects using Adobe Premiere Pro, After Effects and Photoshop.',
        'Create engaging content and design motion graphics to support brand and marketing needs.',
        'Contribute to video production work, from planning through post-production and final delivery.',
        'Represented TechBrein Solutions as an exhibitor at Huddle Global 2026, presenting the company’s work and engaging with event visitors.',
      ],
      tools: ['premiere-pro', 'after-effects', 'photoshop'],
    },
    {
      id: 'samvedha',
      title: 'Motion Graphics Designer',
      company: 'Samvedha Creatives',
      orgLabel: 'Samvedha Creatives',
      location: 'Calicut',
      dates: { from: 2024, to: 2024 },
      duration: { short: '7 mo', spoken: '7 months' },
      bullets: [
        'Designed motion graphics for video projects using Adobe After Effects and Illustrator.',
        'Assisted the creative team with video production tasks.',
      ],
      tools: ['after-effects', 'illustrator'],
    },
    {
      id: 'mango-media',
      title: 'Intern',
      company: 'Mango Media',
      orgLabel: 'Mango Media',
      location: 'Kannur',
      dates: null,
      duration: { short: '3 mo', spoken: '3 months' },
      bullets: [
        'Gained hands-on experience in video editing and design workflows.',
        'Assisted with post-production and creative projects.',
      ],
      tools: [],
    },
    {
      id: 'freelance',
      title: 'Freelance Video Editor & Graphic Designer',
      company: null,
      orgLabel: 'Freelance',
      location: null,
      dates: null,
      duration: { short: '1 yr+', spoken: '1 year plus' },
      bullets: [
        'Produced video edits, graphics and 3D visuals for individual and business clients.',
        'Managed projects independently, from brief to final delivery.',
      ],
      tools: [],
    },
  ],
  highlight: {
    event: 'Huddle Global 2026',
    year: 2026,
    capacity: 'Exhibitor',
    organisation: 'TechBrein Solutions',
    roleId: 'techbrein',
  },
  education: [
    {
      id: 'diploma',
      qualification: 'Diploma in 3D Animation & VFX',
      institution: 'Sree Sankaracharya Computer Center',
      place: 'Thalassery',
      board: null,
      dates: { from: 2022, to: 2024 },
      featured: true,
    },
    {
      id: 'higher-secondary',
      qualification: 'Higher Secondary Education',
      institution: 'PRMHSS Panoor',
      place: null,
      board: 'Kerala State Board',
      dates: { from: 2018, to: 2020 },
      featured: false,
    },
    {
      id: 'secondary',
      qualification: 'Secondary Education',
      institution: 'RGMHSS Mokeri',
      place: null,
      board: 'Kerala State Board',
      dates: { from: 2015, to: 2018 },
      featured: false,
    },
  ],
  // Portrait: not supplied yet. To add it:
  //   1. Save a 4:5 portrait, at least 1600 px tall, as public/images/ashin-portrait.jpg
  //   2. Replace `null` below with:
  //        { src: '/images/ashin-portrait.jpg', alt: 'Portrait of Ashin N', focus: '50% 30%' }
  // Until the file exists, About shows the colour-bars placeholder (a missing file also falls back).
  photo: null,
  // No showreel and no work samples yet. The Work section, its nav item and the hero
  // "Watch my showreel" button render only once one of these is filled.
  showreel: null,
  projects: [],
  // Optional CV download: put the PDF in public/files, then set
  //   { href: '/files/ashin-n-cv.pdf', label: 'Download my CV (PDF)' }
  cv: null,
  copy,
};
