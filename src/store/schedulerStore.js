import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { generateSchedule } from '../utils/scheduler';
import { loadSchedule, saveSchedule } from './ScheduleService';
import { useAuth } from './AuthContext';
import React from 'react';

const LOCAL_KEY = 'smart-scheduler-storage';

function getLocalData() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalData(data) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}

const useSchedulerStore = create(
  persist(
    (set, get) => ({
      // State
      tasks: [],
      commitments: [],
      dailySettings: {
        wakeUpTime: '08:00',
        sleepTime: '22:00',
      },
      schedule: {},
      userId: null, // track current user
      offline: false, // new state

      // Actions
      setUserId: (userId) => set({ userId }),
      setOffline: (offline) => set({ offline }),

      addTask: (task) => {
        const newTask = {
          id: uuidv4(),
          ...task,
          completed: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          tasks: [...state.tasks, newTask],
        }));
        get().generateSchedule();
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates } : task
          ),
        }));
        get().generateSchedule();
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }));
        get().generateSchedule();
      },

      completeTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, completed: true } : task
          ),
        }));
        get().generateSchedule();
      },

      addCommitment: (commitment) => {
        const newCommitment = {
          id: uuidv4(),
          ...commitment,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          commitments: [...state.commitments, newCommitment],
        }));
        get().generateSchedule();
      },

      updateCommitment: (id, updates) => {
        set((state) => ({
          commitments: state.commitments.map((commitment) =>
            commitment.id === id ? { ...commitment, ...updates } : commitment
          ),
        }));
        get().generateSchedule();
      },

      deleteCommitment: (id) => {
        set((state) => ({
          commitments: state.commitments.filter((commitment) => commitment.id !== id),
        }));
        get().generateSchedule();
      },

      updateDailySettings: (settings) => {
        set((state) => ({
          dailySettings: { ...state.dailySettings, ...settings },
        }));
        get().generateSchedule();
      },

      generateSchedule: () => {
        const { tasks, commitments, dailySettings } = get();
        const schedule = generateSchedule(tasks, commitments, dailySettings);
        set({ schedule });
      },

      updateSchedule: (newSchedule) => {
        set({ schedule: newSchedule });
      },

      // Call this after .ics import to force schedule regeneration
      regenerateSchedule: () => {
        get().generateSchedule();
      },

      // Clear all commitments
      clearAllCommitments: () => {
        set({ commitments: [] });
        get().generateSchedule();
      },

      // Load schedule from Firebase or localStorage
      loadUserSchedule: async (userId) => {
        let tried = false;
        const tryLoad = async () => {
          try {
            const remote = await loadSchedule(userId);
            set({ offline: false });
            if (remote) {
              set({
                tasks: remote.tasks || [],
                commitments: remote.commitments || [],
                dailySettings: remote.dailySettings || { wakeUpTime: '08:00', sleepTime: '22:00' },
              });
            } else {
              // migrate guest data if present
              const local = getLocalData();
              if (local) {
                await saveSchedule(userId, local);
                set(local);
                localStorage.removeItem(LOCAL_KEY);
              } else {
                set({ tasks: [], commitments: [], dailySettings: { wakeUpTime: '08:00', sleepTime: '22:00' } });
              }
            }
            get().generateSchedule();
          } catch (err) {
            if (err && err.message && err.message.includes('client is offline')) {
              set({ offline: true });
              if (!tried) {
                tried = true;
                setTimeout(tryLoad, 5000); // retry after 5s
              }
            } else {
              throw err;
            }
          }
        };
        tryLoad();
      },

      // Save schedule to Firebase if logged in
      saveUserSchedule: async () => {
        const { userId, tasks, commitments, dailySettings } = get();
        if (userId) {
          await saveSchedule(userId, { tasks, commitments, dailySettings });
        }
      },
    }),
    {
      name: LOCAL_KEY,
      partialize: (state) => ({
        tasks: state.tasks,
        commitments: state.commitments,
        dailySettings: state.dailySettings,
      }),
      onRehydrateStorage: () => (state) => {
        setTimeout(() => {
          state.generateSchedule();
        }, 0);
      },
    }
  )
);

// Sync store with auth state
function useSchedulerSyncWithAuth() {
  const { user } = useAuth();
  const setUserId = useSchedulerStore((s) => s.setUserId);
  const loadUserSchedule = useSchedulerStore((s) => s.loadUserSchedule);

  React.useEffect(() => {
    if (user) {
      setUserId(user.uid);
      loadUserSchedule(user.uid);
    } else {
      setUserId(null);
    }
    // eslint-disable-next-line
  }, [user]);
}

export { useSchedulerStore, useSchedulerSyncWithAuth }; 