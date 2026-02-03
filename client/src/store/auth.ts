import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role, User } from '@/types';
import { login as apiLogin, logout as apiLogout, getCurrentUser } from '@/api';
import { setAuthToken } from '@/lib/apiClient';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  theme: 'light' | 'dark';
  login: (name: string, email: string, role: Role) => void;
  loginWithCredentials: (username: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: Role) => void;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      theme: 'light',
      
      // Mock login (for demo mode)
      login: (name: string, email: string, role: Role) => {
        const user: User = {
          id: crypto.randomUUID(),
          name,
          email,
          role,
        };
        set({ user, isAuthenticated: true });
      },
      
      // Real API login
      loginWithCredentials: async (username: string, password: string) => {
        try {
          const response = await apiLogin(username, password);
          set({ user: response.user, isAuthenticated: true });
        } catch (error) {
          console.error('Login failed:', error);
          throw error;
        }
      },
      
      logout: async () => {
        try {
          await apiLogout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          setAuthToken(null);
          set({ user: null, isAuthenticated: false });
        }
      },
      
      switchRole: (role: Role) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, role } });
        }
      },
      
      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light';
        set({ theme: newTheme });
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
      },
      
      setTheme: (theme: 'light' | 'dark') => {
        set({ theme });
        document.documentElement.classList.toggle('dark', theme === 'dark');
      },
    }),
    {
      name: 'cv-matcher-auth',
    }
  )
);
