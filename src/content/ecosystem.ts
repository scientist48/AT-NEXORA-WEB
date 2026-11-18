export interface EcosystemLayer {
  id: 'software' | 'data' | 'ai';
  index: string;
  name: string;
  division: string;
  href: string;
  title: string;
  text: string;
  flow: string;
}

/** How the three divisions work as one system. Order = bottom to top of the stack. */
export const ecosystemLayers: EcosystemLayer[] = [
  {
    id: 'software',
    index: '01',
    name: 'Software',
    division: 'Digital Engineering',
    href: '/services/digital-engineering/',
    title: 'Systems that run the work',
    text: 'Applications capture every order, booking and interaction. Engineered well, they produce clean, structured data as a by-product of simply being used.',
    flow: 'Feeds structured records up to the data layer',
  },
  {
    id: 'data',
    index: '02',
    name: 'Data',
    division: 'Data Intelligence',
    href: '/services/data-intelligence/',
    title: 'Data that explains it',
    text: 'Pipelines and models turn those records into trusted metrics and dashboards, and into the reliable context that intelligent systems depend on.',
    flow: 'Supplies metrics to people and context to AI',
  },
  {
    id: 'ai',
    index: '03',
    name: 'AI',
    division: 'AI & Automation',
    href: '/services/ai-automation/',
    title: 'Intelligence that acts on it',
    text: 'Agents and automations use that context to answer, decide and act, then write their results back into the software where the work happens.',
    flow: 'Returns actions down to the software layer',
  },
];
