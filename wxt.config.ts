import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'ChatMarks',
    description: 'AI-powered bookmark search & organization for Chrome',
    permissions: ['bookmarks', 'storage', 'offscreen', 'sidePanel'],
    optional_permissions: [],
    host_permissions: [],
    action: {
      default_title: 'ChatMarks',
      default_icon: {
        '16': '/icons/icon-16.png',
        '32': '/icons/icon-32.png',
        '48': '/icons/icon-48.png',
        '128': '/icons/icon-128.png',
      },
    },
    icons: {
      '16': '/icons/icon-16.png',
      '32': '/icons/icon-32.png',
      '48': '/icons/icon-48.png',
      '128': '/icons/icon-128.png',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
    commands: {
      'open-chatmarks': {
        suggested_key: { default: 'Ctrl+Shift+K', mac: 'Command+Shift+K' },
        description: 'Open ChatMarks search',
      },
    },
  },
  vite: () => ({
    esbuild: {
      jsxImportSource: 'preact',
    },
    build: {
      rollupOptions: {
        external: ['@xenova/transformers'],
      },
    },
  }),
  srcDir: 'src',
  entrypointsDir: 'entrypoints',
  publicDir: 'public',
  runner: {
    disabled: false,
  },
});
