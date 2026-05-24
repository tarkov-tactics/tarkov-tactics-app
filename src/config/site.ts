export const siteConfig = {
  name: 'Tarkov Tactics',
  description: 'Personalized raid recommendations for Escape from Tarkov',
  url: 'https://tarkov-tactics.org',
  links: {
    github: 'https://github.com/tarkov-tactics/tarkov-tactics-app',
    tarkovTracker: 'https://tarkovtracker.org',
    tarkovDev: 'https://tarkov.dev',
  },
  primaryNav: [
    { title: 'Dashboard', href: '/', icon: 'layout-dashboard' },
    { title: 'Directives', href: '/goals', icon: 'target' },
    { title: 'Team', href: '/team', icon: 'users' },
  ],
  secondaryNav: [
    { title: 'Settings', href: '/settings', icon: 'settings' },
  ],
} as const;

export type NavItem = (typeof siteConfig.primaryNav)[number];
