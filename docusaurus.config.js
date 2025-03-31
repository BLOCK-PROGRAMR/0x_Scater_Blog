// @ts-check
import { themes as prismThemes } from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '0x_Scater_Blog',
  tagline: 'Smart Contract Security & Blockchain Research',
  favicon: 'img/favicon.ico',

  url: 'https://block-programr.github.io',
  baseUrl: '/0x_Scater_Blog/',

  organizationName: 'BLOCK-PROGRAMR', // GitHub org/user name
  projectName: '0x_Scater_Blog', // Repo name
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
      ({
        docs: {
          sidebarPath: './sidebars.js',
        },
        blog: {
          showReadingTime: true,
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig: {
    navbar: {
      title: '0x_Scater_Blog',
      logo: {
        alt: 'Security Logo',
        src: 'img/logo.svg',
      },
      items: [
        { type: 'docSidebar', sidebarId: 'tutorialSidebar', position: 'left', label: 'Docs' },
        { to: '/blog', label: 'Blog', position: 'left' },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} 0x_Scater_Blog.`,
    },
    prism: {
      theme: prismThemes.dracula, // Dark mode theme
    },
  },

  staticDirectories: ['static'],
  trailingSlash: false,
};

export default config;
