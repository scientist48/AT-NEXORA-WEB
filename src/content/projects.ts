import type { ServiceSlug } from './services';

/** Coded interface studies rendered by `components/mockups/Mockup.astro`. */
export type MockupKind = 'board' | 'booking' | 'site' | 'exec' | 'ops' | 'pipeline' | 'chat' | 'flow';

/**
 * PORTFOLIO CONTENT
 *
 * Every entry below is a CONCEPT DEMONSTRATION: a self-initiated study showing
 * how AT NEXORA would approach a type of problem. None of them is client work,
 * and none reports results. When genuine client projects are available, add
 * them with `kind: 'client'` and verified outcomes only.
 */
export interface Project {
  slug: string;
  kind: 'concept' | 'client';
  title: string;
  category: ServiceSlug;
  categoryLabel: string;
  discipline: string;
  summary: string;
  brief: string;
  objectives: string[];
  approach: { title: string; text: string }[];
  features: string[];
  stack: string[];
  screens: { kind: MockupKind; caption: string }[];
  tone: 'navy' | 'ice' | 'paper';
  /** Verified outcomes only. Leave undefined for concept work. */
  outcomes?: string[];
  featured?: boolean;
}

export const projects: Project[] = [
  {
    slug: 'service-operations-platform',
    kind: 'concept',
    title: 'Service Operations Platform',
    category: 'digital-engineering',
    categoryLabel: 'Digital Engineering',
    discipline: 'SaaS web application',
    summary:
      'A multi-tenant web application concept for scheduling, dispatching and tracking field service work.',
    brief:
      'Service businesses often coordinate jobs through phone calls, spreadsheets and messaging groups. This concept explores a single platform where jobs are planned, assigned and tracked from request to completion.',
    objectives: [
      'Give dispatchers one board showing every job and its status',
      'Let customers book and reschedule without calling',
      'Keep the architecture multi-tenant from day one',
      'Stay fast and usable on a phone in the field',
    ],
    approach: [
      { title: 'Model the workflow', text: 'We mapped a job lifecycle from request to invoice and designed the data model around those states.' },
      { title: 'Design the board', text: 'A drag-and-drop planning board became the centre of the product, with detail panels instead of page changes.' },
      { title: 'Engineer for tenants', text: 'Tenant isolation, role-based access and an API-first backend so integrations are straightforward.' },
    ],
    features: ['Planning board with live status', 'Customer booking portal', 'Role-based access', 'Activity history per job', 'REST API for integrations'],
    stack: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'REST API', 'Tailwind CSS'],
    screens: [
      { kind: 'board', caption: 'Planning board — jobs grouped by status' },
      { kind: 'booking', caption: 'Customer booking portal — slot selection' },
    ],
    tone: 'navy',
    featured: true,
  },
  {
    slug: 'executive-revenue-dashboard',
    kind: 'concept',
    title: 'Executive Revenue Dashboard',
    category: 'data-intelligence',
    categoryLabel: 'Data Intelligence',
    discipline: 'Power BI report design',
    summary:
      'A Power BI dashboard concept giving leadership a single, current view of revenue, margin and pipeline.',
    brief:
      'Leadership teams frequently receive performance numbers as static slides assembled by hand. This concept shows a governed, interactive report where every headline figure can be traced to its detail.',
    objectives: [
      'Present headline KPIs with clear targets and trends',
      'Allow drill-down from summary to region, product and account',
      'Define each metric once in a shared semantic model',
      'Refresh automatically on a schedule',
    ],
    approach: [
      { title: 'Define the metrics', text: 'Revenue, margin and pipeline measures were specified first, including how each handles returns and currency.' },
      { title: 'Build the model', text: 'A star-schema model with a proper date dimension keeps measures simple and the report responsive.' },
      { title: 'Design for scanning', text: 'One screen, a clear reading order and restrained colour: lime marks only what needs attention.' },
    ],
    features: ['KPI header with targets', 'Trend and variance analysis', 'Regional breakdown', 'Drill-through to accounts', 'Row-level security by region'],
    stack: ['Power BI', 'DAX', 'Power Query', 'SQL', 'Star-schema modelling'],
    screens: [
      { kind: 'exec', caption: 'Executive overview — KPIs, trend and regional split' },
      { kind: 'ops', caption: 'Detail view — account table with variance' },
    ],
    tone: 'ice',
    featured: true,
  },
  {
    slug: 'customer-support-ai-agent',
    kind: 'concept',
    title: 'Customer Support AI Agent',
    category: 'ai-automation',
    categoryLabel: 'AI & Automation',
    discipline: 'AI agent with retrieval',
    summary:
      'An AI support agent concept that answers from approved documentation, takes simple actions and hands over to people cleanly.',
    brief:
      'Support teams answer the same questions repeatedly while complex cases wait. This concept demonstrates an agent that resolves routine enquiries from a knowledge base and escalates everything else with full context.',
    objectives: [
      'Answer only from approved, cited sources',
      'Perform safe actions such as order look-ups through tools',
      'Escalate to a person with a summary of the conversation',
      'Log every interaction for review and evaluation',
    ],
    approach: [
      { title: 'Ground the answers', text: 'Documentation is indexed for retrieval so responses quote real content and show their sources.' },
      { title: 'Limit the tools', text: 'The agent receives a small set of read-mostly tools, each with explicit permissions.' },
      { title: 'Measure quality', text: 'A test set of realistic conversations is used to evaluate changes before they are released.' },
    ],
    features: ['Cited answers', 'Tool use for look-ups', 'Human hand-off with summary', 'Conversation logging', 'Evaluation test set'],
    stack: ['LLM API', 'Retrieval (RAG)', 'Vector search', 'Python', 'REST APIs & webhooks'],
    screens: [
      { kind: 'chat', caption: 'Assistant conversation — cited answer and tool call' },
      { kind: 'flow', caption: 'Agent workflow — retrieval, tools and escalation path' },
    ],
    tone: 'paper',
    featured: true,
  },
  {
    slug: 'supply-chain-kpi-system',
    kind: 'concept',
    title: 'Supply Chain KPI System',
    category: 'data-intelligence',
    categoryLabel: 'Data Intelligence',
    discipline: 'Data pipeline & reporting',
    summary:
      'A data engineering concept that consolidates orders, inventory and delivery data into one operational KPI system.',
    brief:
      'Operational data usually sits in separate systems for orders, stock and logistics. This concept shows the pipeline and model that bring them together, and the operational report built on top.',
    objectives: [
      'Consolidate three source systems into one model',
      'Apply data quality checks before anything is reported',
      'Track fill rate, lead time and on-time delivery',
      'Document lineage from source to dashboard',
    ],
    approach: [
      { title: 'Map the sources', text: 'Each source table was profiled, with keys and quality issues documented before modelling began.' },
      { title: 'Build the pipeline', text: 'Staged transformations standardise, validate and join data, failing loudly when checks do not pass.' },
      { title: 'Report operationally', text: 'A dense but readable operations view, designed for daily use rather than monthly review.' },
    ],
    features: ['Staged ELT pipeline', 'Automated quality checks', 'Lineage documentation', 'Operational KPI report', 'Scheduled refresh'],
    stack: ['SQL', 'Python', 'ELT pipelines', 'Data warehouse', 'Power BI'],
    screens: [
      { kind: 'pipeline', caption: 'Pipeline lineage — sources, staging, model and reports' },
      { kind: 'ops', caption: 'Operations report — orders with status and variance' },
    ],
    tone: 'ice',
    featured: true,
  },
  {
    slug: 'editorial-brand-website',
    kind: 'concept',
    title: 'Editorial Brand Website',
    category: 'digital-engineering',
    categoryLabel: 'Digital Engineering',
    discipline: 'Website design & build',
    summary:
      'A statically generated company website concept focused on typography, speed and effortless content editing.',
    brief:
      'Many company websites are slow, template-bound and difficult to update. This concept demonstrates an editorial, content-managed site that loads quickly and gives the business control of its own pages.',
    objectives: [
      'Express a distinct brand through type and layout',
      'Load quickly on mobile connections',
      'Let non-technical editors update content',
      'Meet accessibility expectations from the start',
    ],
    approach: [
      { title: 'Design with content', text: 'Layouts were designed around real copy lengths and imagery rather than placeholder text.' },
      { title: 'Generate statically', text: 'Pages are pre-built and served from the edge, shipping JavaScript only where interaction needs it.' },
      { title: 'Structure for editors', text: 'Content is modelled as reusable sections, so new pages are assembled, not coded.' },
    ],
    features: ['Editorial layout system', 'Static generation', 'Structured content model', 'SEO and Open Graph foundations', 'Accessible components'],
    stack: ['Astro', 'TypeScript', 'Tailwind CSS', 'Headless CMS', 'Cloudflare Pages'],
    screens: [
      { kind: 'site', caption: 'Homepage — editorial hero and section rhythm' },
      { kind: 'booking', caption: 'Enquiry flow — guided appointment request' },
    ],
    tone: 'paper',
  },
  {
    slug: 'invoice-workflow-automation',
    kind: 'concept',
    title: 'Invoice Workflow Automation',
    category: 'ai-automation',
    categoryLabel: 'AI & Automation',
    discipline: 'Process automation',
    summary:
      'A workflow automation concept that reads incoming invoices, validates them and routes them for approval.',
    brief:
      'Accounts teams often key invoice data manually from emailed PDFs. This concept shows an automated flow that extracts the data, checks it against purchase orders and involves a person only for exceptions.',
    objectives: [
      'Capture invoices from a shared mailbox automatically',
      'Extract and validate key fields',
      'Route exceptions to the right approver',
      'Keep a complete audit trail',
    ],
    approach: [
      { title: 'Map the process', text: 'Every step and exception in the current manual process was documented before automating anything.' },
      { title: 'Automate the routine', text: 'Rule-based steps handle matching and routing; AI is used only to read unstructured documents.' },
      { title: 'Keep people in control', text: 'Low-confidence extractions and mismatches stop for human review rather than passing through.' },
    ],
    features: ['Mailbox capture', 'AI document extraction', 'Purchase-order matching', 'Approval routing', 'Audit log'],
    stack: ['n8n', 'LLM API', 'Python', 'REST APIs & webhooks', 'PostgreSQL'],
    screens: [
      { kind: 'flow', caption: 'Automation flow — capture, extract, validate, route' },
      { kind: 'ops', caption: 'Review queue — exceptions awaiting approval' },
    ],
    tone: 'navy',
  },
];

export const featuredProjects = projects.filter((p) => p.featured);
export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
export const projectsByCategory = (category: ServiceSlug) => projects.filter((p) => p.category === category);
