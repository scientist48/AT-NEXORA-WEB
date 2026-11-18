import type { MockupKind } from './projects';

export type ServiceSlug = 'digital-engineering' | 'data-intelligence' | 'ai-automation';

export interface Service {
  slug: ServiceSlug;
  index: string;
  name: string;
  /** One-line promise used on cards and heroes. */
  headline: string;
  /** Short description for overviews. */
  summary: string;
  /** Business value in one sentence. */
  value: string;
  /** Short capability labels for overview panels. */
  highlights: string[];
  theme: 'navy' | 'ice' | 'paper';
  mockup: MockupKind;
  hero: { title: string; intro: string };
  overview: string[];
  problems: { title: string; text: string }[];
  outcomes: { title: string; text: string }[];
  capabilities: { title: string; text: string; items: string[] }[];
  deliverables: string[];
  technologies: { group: string; items: string[] }[];
  methodology: { title: string; text: string }[];
  faqs: { q: string; a: string }[];
  seo: { title: string; description: string };
}

export const services: Service[] = [
  {
    slug: 'digital-engineering',
    index: '01',
    name: 'Digital Engineering',
    headline: 'Software that fits the way your business actually works.',
    summary:
      'Custom websites, web applications, SaaS products and business software, designed and engineered end to end.',
    value:
      'Replace workarounds and off-the-shelf compromises with software built around your processes, your customers and your growth.',
    highlights: [
      'Custom website development',
      'Web application development',
      'SaaS development',
      'Custom software solutions',
      'Frontend and backend engineering',
      'UI/UX design',
      'Business software development',
      'API integrations',
    ],
    theme: 'navy',
    mockup: 'board',
    hero: {
      title: 'Digital products, engineered properly.',
      intro:
        'From a marketing website to a multi-tenant SaaS platform, we design and build software that is fast, maintainable and shaped around how your business operates.',
    },
    overview: [
      'Good software is the result of many careful decisions: what to build, how to structure it, how it should feel to use and how it will be maintained a year from now. We take responsibility for all of them.',
      'Our digital engineering work covers the full path from interface design to backend services and integrations, so the product you launch is coherent from the first screen to the database.',
    ],
    problems: [
      {
        title: 'Off-the-shelf tools that almost fit',
        text: 'Teams bend their processes around generic software and fill the gaps with spreadsheets and manual steps.',
      },
      {
        title: 'Websites that are slow or hard to update',
        text: 'A site that loads slowly, breaks on mobile or needs a developer for every change costs enquiries every day.',
      },
      {
        title: 'Systems that do not talk to each other',
        text: 'Data is re-typed between tools because nothing is integrated, creating delays and errors.',
      },
      {
        title: 'A product idea without an engineering team',
        text: 'You know what the product should do, but need a team that can design, build and ship it.',
      },
    ],
    outcomes: [
      {
        title: 'Software shaped around your process',
        text: 'Custom-built tools remove workarounds, so teams spend time on work rather than on the tool.',
      },
      {
        title: 'A stronger first impression',
        text: 'A fast, accessible, well-designed website presents your business the way it deserves to be seen.',
      },
      {
        title: 'A foundation that can grow',
        text: 'Clean architecture and documented code mean new features can be added without starting again.',
      },
    ],
    capabilities: [
      {
        title: 'Websites',
        text: 'Company, product and marketing websites built for speed, search visibility and easy content updates.',
        items: ['Custom website development', 'Content-managed sites', 'Performance and SEO foundations', 'Accessible, responsive front ends'],
      },
      {
        title: 'Web applications & SaaS',
        text: 'Browser-based products with accounts, roles, billing-ready architecture and real-time interfaces.',
        items: ['Web application development', 'SaaS product development', 'Multi-tenant architecture', 'Admin and customer portals'],
      },
      {
        title: 'Business software',
        text: 'Internal tools that replace spreadsheets and manual processes with purpose-built systems.',
        items: ['Custom software solutions', 'Operations and workflow tools', 'Booking, inventory and CRM-style systems', 'Reporting built in'],
      },
      {
        title: 'UI/UX design',
        text: 'Interfaces designed around real tasks, validated before engineering begins.',
        items: ['User flows and wireframes', 'Interface and visual design', 'Design systems', 'Interactive prototypes'],
      },
      {
        title: 'Backend & APIs',
        text: 'Reliable services, clean data models and integrations with the tools you already use.',
        items: ['Backend engineering', 'REST and GraphQL APIs', 'Third-party API integrations', 'Authentication and access control'],
      },
    ],
    deliverables: [
      'Discovery summary and technical specification',
      'UX flows and interface designs',
      'Production source code in your repository',
      'Deployed application with environment configuration',
      'API and system documentation',
      'Handover session and post-launch support plan',
    ],
    technologies: [
      { group: 'Front end', items: ['TypeScript', 'React', 'Next.js', 'Astro', 'Tailwind CSS'] },
      { group: 'Back end', items: ['Node.js', 'Python', 'REST & GraphQL', 'PostgreSQL', 'MySQL'] },
      { group: 'Platform', items: ['Cloudflare', 'Vercel', 'AWS', 'Docker', 'CI/CD pipelines'] },
      { group: 'Design', items: ['Figma', 'Design systems', 'Prototyping', 'Accessibility (WCAG)'] },
    ],
    methodology: [
      { title: 'Specify', text: 'We turn goals into user flows, a data model and a clear, prioritised scope.' },
      { title: 'Design', text: 'Interfaces are designed and reviewed with you before production code is written.' },
      { title: 'Build', text: 'Short iterations with version control, code review and regular demos.' },
      { title: 'Harden', text: 'Cross-device testing, performance tuning, accessibility and security checks.' },
      { title: 'Ship & support', text: 'Deployment, documentation, handover and an agreed support arrangement.' },
    ],
    faqs: [
      {
        q: 'Do you build both the design and the code?',
        a: 'Yes. We handle UI/UX design, frontend, backend and integrations, so a single team is responsible for the whole product. We are also comfortable building from designs you already have.',
      },
      {
        q: 'Who owns the source code?',
        a: 'Ownership is defined in the project agreement. Our standard approach is that, once the work is paid for, the custom code written for your project is yours, delivered in a repository you control.',
      },
      {
        q: 'Can you work with our existing system?',
        a: 'Usually, yes. We begin with a short technical review of the existing codebase or platform, then recommend whether to extend, integrate with or gradually replace it.',
      },
      {
        q: 'How long does a typical project take?',
        a: 'It depends on scope. A focused website is measured in weeks; a custom application or SaaS product is usually delivered in phases. After discovery we give you a phased timeline rather than a single guess.',
      },
    ],
    seo: {
      title: 'Digital Engineering — Websites, Web Apps & SaaS',
      description:
        'Custom website development, web applications, SaaS products, business software, UI/UX design and API integrations by AT NEXORA Technologies.',
    },
  },
  {
    slug: 'data-intelligence',
    index: '02',
    name: 'Data Intelligence',
    headline: 'Turn scattered data into decisions you can defend.',
    summary:
      'Business intelligence, Power BI development, dashboards, analytics and the data engineering that keeps them accurate.',
    value:
      'Give every team one trusted view of performance, so decisions are made on current numbers instead of last month’s spreadsheet.',
    highlights: [
      'Business intelligence',
      'Power BI development',
      'Interactive dashboards',
      'Data analytics',
      'Data visualization',
      'Data transformation',
      'Data engineering',
      'Reporting and KPI systems',
    ],
    theme: 'ice',
    mockup: 'exec',
    hero: {
      title: 'One version of the truth, always current.',
      intro:
        'We connect your data sources, model them properly and build the dashboards and KPI systems your teams will actually open every morning.',
    },
    overview: [
      'Most organisations already have the data they need. It is simply spread across systems, exported into spreadsheets and interpreted differently by every department.',
      'Our data intelligence work brings that data together, defines metrics once and presents them in clear, interactive reports, with the engineering underneath to keep everything refreshed and reliable.',
    ],
    problems: [
      {
        title: 'Reporting that lives in spreadsheets',
        text: 'Hours are spent every week copying exports into files that are out of date as soon as they are sent.',
      },
      {
        title: 'Numbers that do not agree',
        text: 'Sales, finance and operations each calculate the same metric differently, so meetings debate the data instead of the decision.',
      },
      {
        title: 'Dashboards nobody uses',
        text: 'Reports exist, but they are slow, cluttered or do not answer the questions people really have.',
      },
      {
        title: 'Data trapped in separate systems',
        text: 'Valuable information sits in tools that were never connected, so the full picture is never visible.',
      },
    ],
    outcomes: [
      {
        title: 'Faster, better-informed decisions',
        text: 'Leaders see current performance at a glance and can drill into the detail behind any number.',
      },
      {
        title: 'Time back from manual reporting',
        text: 'Automated refreshes replace recurring copy-and-paste work with reports that update themselves.',
      },
      {
        title: 'Shared definitions',
        text: 'Metrics are defined once in a governed model, so every team reads the same figure the same way.',
      },
    ],
    capabilities: [
      {
        title: 'Business intelligence & Power BI',
        text: 'End-to-end BI solutions, from semantic model to published, secured reports.',
        items: ['Power BI development', 'Semantic modelling and DAX', 'Row-level security', 'Report publishing and governance'],
      },
      {
        title: 'Dashboards & visualization',
        text: 'Interactive dashboards designed around the decisions they need to support.',
        items: ['Interactive dashboards', 'Data visualization design', 'Executive and operational views', 'Embedded analytics'],
      },
      {
        title: 'Analytics',
        text: 'Analysis that explains what happened, why, and what is likely to follow.',
        items: ['Data analytics', 'Trend and cohort analysis', 'Forecasting models', 'Ad-hoc investigation'],
      },
      {
        title: 'Data engineering',
        text: 'Pipelines that collect, clean and shape data so reports stay accurate.',
        items: ['Data engineering', 'Data transformation (ETL/ELT)', 'Data warehouse modelling', 'Data quality checks'],
      },
      {
        title: 'Reporting & KPI systems',
        text: 'A structured framework of metrics, targets and scheduled reporting.',
        items: ['KPI definition workshops', 'Reporting and KPI systems', 'Scheduled and alert-based reporting', 'Documentation of metric logic'],
      },
    ],
    deliverables: [
      'Data source audit and metric definitions',
      'Documented data model',
      'Automated data pipelines and refresh schedules',
      'Published dashboards and reports',
      'Access and security configuration',
      'User guide and training session',
    ],
    technologies: [
      { group: 'BI & visualization', items: ['Power BI', 'DAX', 'Power Query', 'Embedded reports'] },
      { group: 'Data & storage', items: ['SQL', 'PostgreSQL', 'SQL Server', 'Cloud data warehouses'] },
      { group: 'Engineering', items: ['Python', 'ETL / ELT pipelines', 'Dataflows', 'Scheduling & orchestration'] },
      { group: 'Sources', items: ['Excel & CSV', 'REST APIs', 'ERP & CRM systems', 'Web analytics'] },
    ],
    methodology: [
      { title: 'Audit', text: 'We inventory your data sources, assess quality and learn which questions matter most.' },
      { title: 'Define', text: 'Metrics and KPIs are agreed and documented, so everyone means the same thing.' },
      { title: 'Model', text: 'Data is transformed into a clean, well-structured model designed for analysis.' },
      { title: 'Visualize', text: 'Dashboards are prototyped, reviewed with real users and refined.' },
      { title: 'Operate', text: 'Refreshes are automated, access is secured and your team is trained.' },
    ],
    faqs: [
      {
        q: 'We already have Power BI. Can you improve what exists?',
        a: 'Yes. Many engagements start with a review of existing reports and models. We look at performance, model structure and usability, then recommend targeted improvements or a rebuild where that is the better route.',
      },
      {
        q: 'What if our data is messy?',
        a: 'That is normal, and it is exactly what data transformation is for. We identify quality issues during the audit, clean and standardise data in the pipeline, and flag anything that needs fixing at the source.',
      },
      {
        q: 'Which data sources can you connect?',
        a: 'Databases, spreadsheets, cloud applications with APIs, ERP and CRM systems and flat-file exports are all common. If a system can export or expose its data, it can usually be brought into the model.',
      },
      {
        q: 'How do you keep sensitive data secure?',
        a: 'We work within your environment wherever possible, apply least-privilege access and configure role- or row-level security, so people only see the data they are entitled to see.',
      },
    ],
    seo: {
      title: 'Data Intelligence — Power BI, Dashboards & Analytics',
      description:
        'Business intelligence, Power BI development, interactive dashboards, data analytics, data engineering and KPI reporting systems by AT NEXORA Technologies.',
    },
  },
  {
    slug: 'ai-automation',
    index: '03',
    name: 'AI & Automation',
    headline: 'Put intelligent systems to work on the repetitive parts.',
    summary:
      'AI agents, chatbots, workflow automation and custom AI applications that connect to the systems you already run.',
    value:
      'Free people from repetitive, rule-based work and give customers faster answers, with humans kept in control of the decisions that matter.',
    highlights: [
      'AI agent development',
      'AI chatbot development',
      'Business process automation',
      'Workflow automation',
      'Intelligent integrations',
      'AI-powered business solutions',
      'Custom AI applications',
    ],
    theme: 'paper',
    mockup: 'flow',
    hero: {
      title: 'AI that does real work, safely.',
      intro:
        'We design AI agents, assistants and automated workflows that are grounded in your data, connected to your tools and built with clear guardrails.',
    },
    overview: [
      'AI is most useful when it is treated as engineering, not magic. That means well-defined tasks, access to the right information, measurable quality and a clear path to a human when one is needed.',
      'We build agents, chatbots and automations that slot into existing processes: answering questions from your own knowledge, moving information between systems and handling the routine steps that slow teams down.',
    ],
    problems: [
      {
        title: 'Skilled people doing repetitive work',
        text: 'Data entry, document handling and status updates consume hours that should go to higher-value work.',
      },
      {
        title: 'Slow responses to common questions',
        text: 'Customers and staff wait for answers that already exist somewhere in your documentation.',
      },
      {
        title: 'Processes that depend on manual hand-offs',
        text: 'Work stalls between systems and inboxes because every step needs someone to push it forward.',
      },
      {
        title: 'Uncertainty about where AI genuinely helps',
        text: 'There is pressure to “use AI”, but no clear view of which use cases are practical, safe and worth the investment.',
      },
    ],
    outcomes: [
      {
        title: 'Capacity without added headcount',
        text: 'Routine tasks run automatically, so teams can focus on judgement, relationships and exceptions.',
      },
      {
        title: 'Faster, more consistent responses',
        text: 'Assistants answer from approved knowledge at any hour and escalate when they should.',
      },
      {
        title: 'Fewer errors between systems',
        text: 'Automated hand-offs remove re-typing and make every step traceable.',
      },
    ],
    capabilities: [
      {
        title: 'AI agents',
        text: 'Agents that plan, use tools and complete multi-step tasks within defined limits.',
        items: ['AI agent development', 'Tool and API use', 'Human-in-the-loop approvals', 'Evaluation and monitoring'],
      },
      {
        title: 'AI chatbots & assistants',
        text: 'Conversational assistants grounded in your own content rather than guesswork.',
        items: ['AI chatbot development', 'Retrieval from your knowledge base', 'Website, app and messaging channels', 'Escalation to human teams'],
      },
      {
        title: 'Process & workflow automation',
        text: 'Rule-based and AI-assisted automation of recurring business processes.',
        items: ['Business process automation', 'Workflow automation', 'Document and email processing', 'Scheduled and event-driven jobs'],
      },
      {
        title: 'Intelligent integrations',
        text: 'Connecting systems so information flows without manual effort.',
        items: ['Intelligent integrations', 'CRM, ERP and helpdesk connections', 'Data extraction and classification', 'Notifications and routing'],
      },
      {
        title: 'Custom AI applications',
        text: 'Purpose-built applications with AI at the core of the product.',
        items: ['Custom AI applications', 'AI-powered business solutions', 'Search and summarisation tools', 'AI features in existing products'],
      },
    ],
    deliverables: [
      'Use-case assessment and solution design',
      'Working agent, assistant or automation',
      'Integrations with your systems',
      'Evaluation set and quality report',
      'Guardrails, logging and monitoring',
      'Operating guide and handover',
    ],
    technologies: [
      { group: 'Models', items: ['Leading LLM APIs', 'Open-source models', 'Embeddings', 'Prompt and context design'] },
      { group: 'Agent engineering', items: ['Tool calling', 'Retrieval (RAG)', 'Vector search', 'Evaluation harnesses'] },
      { group: 'Automation', items: ['n8n', 'Make', 'Zapier', 'Custom Python & Node.js services'] },
      { group: 'Integration', items: ['REST APIs & webhooks', 'CRM & helpdesk platforms', 'Email & messaging', 'Databases'] },
    ],
    methodology: [
      { title: 'Identify', text: 'We map processes and select use cases where automation is practical and valuable.' },
      { title: 'Prototype', text: 'A working prototype proves the approach on real examples before wider investment.' },
      { title: 'Ground', text: 'The system is connected to your data and tools, with permissions and guardrails.' },
      { title: 'Evaluate', text: 'Quality is measured against realistic scenarios, not just demonstrated once.' },
      { title: 'Deploy & monitor', text: 'Release with logging, review points and a plan for ongoing improvement.' },
    ],
    faqs: [
      {
        q: 'Will an AI system make things up?',
        a: 'Language models can produce incorrect answers, which is why design matters. We ground responses in your approved content, constrain what the system may do, test it against realistic cases and add human review where the stakes require it.',
      },
      {
        q: 'Is our data used to train public models?',
        a: 'We select providers and configurations whose terms do not use your business data for model training, and we tell you clearly where data is processed. For sensitive use cases we can discuss more restricted deployment options.',
      },
      {
        q: 'Do we need AI, or just automation?',
        a: 'Often straightforward rule-based automation is the right answer, and it is cheaper and more predictable. We recommend AI only where a task genuinely needs language understanding or judgement.',
      },
      {
        q: 'Can it connect to the tools we already use?',
        a: 'In most cases, yes. If a system offers an API, webhooks or structured exports, an agent or workflow can usually read from it and write to it with appropriate permissions.',
      },
    ],
    seo: {
      title: 'AI & Automation — AI Agents, Chatbots & Workflows',
      description:
        'AI agent development, AI chatbots, business process automation, workflow automation and custom AI applications by AT NEXORA Technologies.',
    },
  },
];

