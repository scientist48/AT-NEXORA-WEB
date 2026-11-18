export interface ProcessStep {
  index: string;
  name: string;
  summary: string;
  detail: string;
  activities: string[];
  output: string;
}

export const processSteps: ProcessStep[] = [
  {
    index: '01',
    name: 'Discovery',
    summary: 'Understand the business, the users and the real problem.',
    detail:
      'We start by listening. Through conversations and a review of your current systems and data, we map what exists, what hurts and what success should look like.',
    activities: ['Stakeholder conversations', 'Review of existing systems and data', 'Goals, constraints and risks'],
    output: 'A shared problem statement',
  },
  {
    index: '02',
    name: 'Strategy',
    summary: 'Decide what to build, in what order, and why.',
    detail:
      'Discovery becomes a plan: scope, priorities, architecture direction and a delivery roadmap. You see how the work will be phased and what each phase delivers.',
    activities: ['Scope and prioritisation', 'Solution architecture', 'Roadmap and estimates'],
    output: 'Scope, roadmap and proposal',
  },
  {
    index: '03',
    name: 'Design',
    summary: 'Shape the experience before writing production code.',
    detail:
      'User flows, interface design, data models and report layouts are designed and reviewed with you, so engineering starts from decisions that have already been tested.',
    activities: ['User flows and wireframes', 'Interface and visual design', 'Data models and report layouts'],
    output: 'Approved designs and specifications',
  },
  {
    index: '04',
    name: 'Engineering',
    summary: 'Build in short, visible iterations.',
    detail:
      'We build incrementally with version control, code review and regular demos. You can see working software, dashboards or automations as they take shape.',
    activities: ['Iterative development', 'Code review and version control', 'Regular progress demos'],
    output: 'Working increments',
  },
  {
    index: '05',
    name: 'Testing',
    summary: 'Prove it works — on real devices, with real data.',
    detail:
      'Functionality, data accuracy, performance, accessibility and security are verified before release. AI features are evaluated against realistic scenarios.',
    activities: ['Functional and regression testing', 'Data validation and reconciliation', 'Performance and accessibility checks'],
    output: 'A release candidate you can trust',
  },
  {
    index: '06',
    name: 'Deployment',
    summary: 'Release carefully, with a plan to roll back.',
    detail:
      'We prepare environments, automate the release where practical and hand over documentation so your team knows how the system runs.',
    activities: ['Environment configuration', 'Release and monitoring setup', 'Documentation and handover'],
    output: 'A live, documented system',
  },
  {
    index: '07',
    name: 'Optimization',
    summary: 'Measure, learn and improve.',
    detail:
      'After launch we look at how the system is actually used and refine it: performance tuning, new data sources, improved prompts, additional automation.',
    activities: ['Usage and performance review', 'Refinement and enhancements', 'Ongoing support options'],
    output: 'Continuous improvement',
  },
];
