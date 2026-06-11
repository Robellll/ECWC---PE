'use client';

import { create } from 'zustand';

export const useStore = create((set) => ({
  theme: typeof window !== 'undefined' && localStorage.getItem('ecwc-theme') === 'dark' ? 'dark' : 'light',
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        localStorage.setItem('ecwc-theme', next);
        document.body.classList.toggle('dark-theme', next === 'dark');
      }
      return { theme: next };
    }),
}));
