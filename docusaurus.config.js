
// @ts-check
import { themes as prismThemes } from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '0x_Scater_Blog',
  tagline: 'Smart Contract Security & Blockchain Research',
  favicon: 'img/favicon.ico',

  url: 'https://block-programr.github.io',
  // baseUrl: '/0x_Scater_Blog/' || '/',
  baseUrl: process.env.BASE_URL || '/',

  organizationName: 'BLOCK-PROGRAMR',
  projectName: '0x_Scater_Blog',
  deploymentBranch: 'gh-pages',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          id: 'default', // ✅ Set a default ID to fix plugin issue
          path: 'docs',
          routeBasePath: 'docs',
          sidebarPath: require.resolve('./sidebars.js'),
        },
        blog: {
          showReadingTime: true,
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'projects',
        path: 'projects',
        routeBasePath: 'projects',
        sidebarPath: require.resolve('./sidebars.js'),
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'contacts',
        path: 'contacts',
        routeBasePath: 'contacts',
        sidebarPath: require.resolve('./sidebars.js'),
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'SCATER LABs',
      logo: {
        alt: 'Security Logo',
        src: 'img/logo.png',
      },
      items: [
        { type: 'docSidebar', sidebarId: 'tutorialSidebar', position: 'right', label: 'Writeups' },
        { to: '/blog', label: 'Blog', position: 'right' },
        // { type: 'docSidebar', sidebarId: 'projectsSidebar', position: 'right', label: 'Projects' },
        // { type: 'docSidebar', sidebarId: 'contactsSidebar', position: 'right', label: 'Contact' },
        { to: '/projects', label: 'Projects', position: 'right' },   // ✅ Link directly instead of sidebar
        { to: '/contacts', label: 'MyInfo', position: 'right' },
      ],
    },

    // footer: {
    //   style: 'dark',
    //   copyright: `Copyright © ${new Date().getFullYear()} SCATER LABs
    //   <br />
    //     “The only way to do great work is to love what you do.” - I love security
    //   `,

    // },
    prism: {
      theme: prismThemes.dracula,
    },
  },

  staticDirectories: ['static'],
  trailingSlash: false,
};

export default config;
