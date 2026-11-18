/**
 * Central company + navigation configuration.
 * Everything here is verified information supplied by AT NEXORA Technologies.
 * Do not add clients, awards, statistics or social profiles that are not verified.
 */
export const company = {
  name: 'AT NEXORA Technologies',
  shortName: 'AT NEXORA',
  tagline: 'Engineering. Intelligence. Innovation.',
  description:
    'AT NEXORA Technologies is a global technology and digital engineering company delivering intelligent digital products, business intelligence solutions and AI-powered automation.',
  email: 'atnexoratechnologies@gmail.com',
  emailHref: 'mailto:atnexoratechnologies@gmail.com',
  phone: '+923475503548',
  phoneDisplay: '+92 347 5503548',
  phoneHref: 'tel:+923475503548',
  whatsappHref: 'https://wa.me/923475503548',
  /** Verified social profiles only. Leave empty until real profiles exist. */
  socials: [] as { label: string; href: string }[],
} as const;

export interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string; note: string }[];
}

export const mainNav: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about/' },
  {
    label: 'Services',
    href: '/services/',
    children: [
      { label: 'Digital Engineering', href: '/services/digital-engineering/', note: 'Websites, web apps, SaaS and custom software' },
      { label: 'Data Intelligence', href: '/services/data-intelligence/', note: 'Power BI, dashboards, analytics and data engineering' },
      { label: 'AI & Automation', href: '/services/ai-automation/', note: 'AI agents, chatbots and workflow automation' },
    ],
  },
  { label: 'Portfolio', href: '/portfolio/' },
  { label: 'Our Process', href: '/process/' },
  { label: 'Contact', href: '/contact/' },
];

export const footerNav = {
  services: [
    { label: 'Digital Engineering', href: '/services/digital-engineering/' },
    { label: 'Data Intelligence', href: '/services/data-intelligence/' },
    { label: 'AI & Automation', href: '/services/ai-automation/' },
    { label: 'All services', href: '/services/' },
  ],
  company: [
    { label: 'About', href: '/about/' },
    { label: 'Portfolio', href: '/portfolio/' },
    { label: 'Our Process', href: '/process/' },
    { label: 'FAQ', href: '/faq/' },
    { label: 'Contact', href: '/contact/' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy-policy/' },
    { label: 'Terms', href: '/terms/' },
  ],
};

/** Options used by the contact form and validated again on the server. */
export const inquiryServices = [
  'Digital Engineering',
  'Data Intelligence',
  'AI & Automation',
  'A combination of services',
  'Not sure yet',
] as const;

export const inquiryBudgets = [
  'Under $5,000',
  '$5,000 – $15,000',
  '$15,000 – $50,000',
  '$50,000+',
  'Not decided yet',
] as const;

export const principles = [
  {
    title: 'Engineering mindset',
    text: 'We treat every brief as a system to be understood before it is built. Architecture, constraints and trade-offs are discussed openly, early.',
  },
  {
    title: 'Quality-first delivery',
    text: 'Typed code, reviewed changes, tested releases. Quality is built into the way the work is done rather than inspected at the end.',
  },
  {
    title: 'Collaboration',
    text: 'You work directly with the people doing the work. Shared backlogs, regular demos and decisions made together.',
  },
  {
    title: 'Practical problem-solving',
    text: 'We choose the simplest solution that genuinely solves the problem, and say so when something does not need to be built.',
  },
  {
    title: 'Modern technology',
    text: 'Current, well-supported tools chosen for the job at hand, not for novelty, so what we deliver stays maintainable.',
  },
  {
    title: 'Transparent communication',
    text: 'Clear scope, honest estimates and plain-language updates. If a risk appears, you hear about it from us first.',
  },
] as const;
