export const siteConfig = {
  name: 'Tarkov Tactics',
  description: 'Personalized raid recommendations for Escape from Tarkov',
  url: 'https://tarkov-tactics.org',
  links: {
    github: 'https://github.com/tarkov-tactics/tarkov-tactics-app',
    tarkovTracker: 'https://tarkovtracker.org',
    tarkovDev: 'https://tarkov.dev',
  },
  nav: [
    { title: 'Dashboard', href: '/', icon: 'layout-dashboard' },
    { title: 'Goals', href: '/goals', icon: 'target' },
    { title: 'Vibes', href: '/vibes', icon: 'flame' },
    { title: 'Team', href: '/team', icon: 'users' },
    { title: 'Settings', href: '/settings', icon: 'settings' },
  ],
} as const;

export type NavItem = (typeof siteConfig.nav)[number];
