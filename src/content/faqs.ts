export interface FaqGroup {
  id: string;
  title: string;
  items: { q: string; a: string }[];
}

export const faqGroups: FaqGroup[] = [
  {
    id: 'working-together',
    title: 'Working together',
    items: [
      {
        q: 'What does AT NEXORA Technologies do?',
        a: 'We are a technology and digital engineering company with three connected divisions: Digital Engineering (websites, web applications, SaaS and custom software), Data Intelligence (business intelligence, Power BI, dashboards and data engineering) and AI & Automation (AI agents, chatbots and workflow automation).',
      },
      {
        q: 'Do you work with clients internationally?',
        a: 'Yes. We work remotely with businesses in different countries and time zones, using scheduled calls, shared project boards and written updates to keep everything visible.',
      },
      {
        q: 'How do we start a project?',
        a: 'Send us a short description through the contact form, by email or on WhatsApp. We will arrange an introductory conversation, ask the questions we need to understand the work, and follow up with a proposed scope and approach.',
      },
      {
        q: 'Can you take on a small project, or only large ones?',
        a: 'Both. A focused dashboard, a single automation or a company website is as welcome as a multi-phase platform. What matters is that the problem is clear and worth solving.',
      },
    ],
  },
  {
    id: 'scope-and-cost',
    title: 'Scope, timelines and cost',
    items: [
      {
        q: 'How much will my project cost?',
        a: 'Cost depends on scope, complexity and integrations, so we do not publish fixed prices. After an initial conversation we provide a written proposal with a clear scope and a transparent estimate.',
      },
      {
        q: 'How long does a project take?',
        a: 'Smaller engagements are typically measured in weeks; larger products and data platforms are delivered in phases. You receive a phased timeline once we understand the requirements.',
      },
      {
        q: 'What happens if requirements change?',
        a: 'Change is expected. We work in short iterations, so new priorities can be absorbed. When a change affects scope, timeline or cost, we explain the impact and agree it with you before proceeding.',
      },
    ],
  },
  {
    id: 'delivery',
    title: 'Delivery and quality',
    items: [
      {
        q: 'How will we know how the project is progressing?',
        a: 'Through regular demos of working output, a shared backlog and written progress updates. You always know what is done, what is in progress and what is next.',
      },
      {
        q: 'How do you test your work?',
        a: 'Testing is part of every phase: functional testing across devices and browsers, data validation for reports, evaluation against realistic scenarios for AI features, and performance and accessibility checks before release.',
      },
      {
        q: 'Do you provide support after launch?',
        a: 'Yes. We agree a support and optimisation arrangement that suits the system, from a short warranty period to ongoing maintenance and enhancement.',
      },
    ],
  },
  {
    id: 'ownership-and-security',
    title: 'Ownership, data and security',
    items: [
      {
        q: 'Who owns the work you produce?',
        a: 'Ownership is set out in the project agreement. Our standard approach is that custom deliverables created for you become yours once they are paid for.',
      },
      {
        q: 'Will you sign a non-disclosure agreement?',
        a: 'Yes. We are happy to sign a mutual NDA before you share confidential information.',
      },
      {
        q: 'How do you handle our data?',
        a: 'We request the minimum access needed, work within your environments where possible and do not use your data for any purpose beyond the project. Details are covered in our Privacy Policy and in the project agreement.',
      },
    ],
  },
];
