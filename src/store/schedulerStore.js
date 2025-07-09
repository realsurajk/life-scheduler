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
  const dataWithTimestamp = {
    ...data,
    lastSaved: Date.now()
  };
  localStorage.setItem(LOCAL_KEY, JSON.stringify(dataWithTimestamp));
}

// Check if localStorage data is guest data (created before login)
function isGuestData(localData) {
  if (!localData || !localData.lastSaved) {
    // No timestamp means it's old data (before we added timestamps)
    return true;
  }
  if (!userLoginTime) {
    // No login time means user is not logged in, so it's guest data
    return true;
  }
  // If data was saved before login, it's guest data
  return localData.lastSaved < userLoginTime;
}

// Track when user logged in to distinguish guest vs persisted data
let userLoginTime = null;

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
      scheduleLoaded: false, // new flag

      // Actions
      setUserId: (userId) => {
        if (userId !== null && userLoginTime === null) {
          // User is logging in for the first time
          userLoginTime = Date.now();
        } else if (userId === null) {
          // User is logging out
          userLoginTime = null;
        }
        
        set({ userId });
        if (userId === null) {
          // Clear localStorage immediately
          localStorage.removeItem(LOCAL_KEY);
          // Reset to guest state on logout
          set({
            tasks: [],
            commitments: [],
            dailySettings: { wakeUpTime: '08:00', sleepTime: '22:00' },
            schedule: {},
            scheduleLoaded: false,
          });
          // Double-check localStorage is cleared after a short delay
          setTimeout(() => {
            if (localStorage.getItem(LOCAL_KEY)) {
              localStorage.removeItem(LOCAL_KEY);
            }
          }, 100);
        }
      },
      setOffline: (offline) => set({ offline }),
      setTasks: (tasks) => set({ tasks }),
      setCommitments: (commitments) => set({ commitments }),
      setDailySettings: (dailySettings) => set({ dailySettings }),

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
        if (get().userId) get().saveUserSchedule();
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates } : task
          ),
        }));
        get().generateSchedule();
        if (get().userId) get().saveUserSchedule();
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }));
        get().generateSchedule();
        if (get().userId) get().saveUserSchedule();
      },

      completeTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, completed: true } : task
          ),
        }));
        get().generateSchedule();
        if (get().userId) get().saveUserSchedule();
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
        if (get().userId) get().saveUserSchedule();
      },

      updateCommitment: (id, updates) => {
        set((state) => ({
          commitments: state.commitments.map((commitment) =>
            commitment.id === id ? { ...commitment, ...updates } : commitment
          ),
        }));
        get().generateSchedule();
        if (get().userId) get().saveUserSchedule();
      },

      deleteCommitment: (id) => {
        set((state) => ({
          commitments: state.commitments.filter((commitment) => commitment.id !== id),
        }));
        get().generateSchedule();
        if (get().userId) get().saveUserSchedule();
      },

      updateDailySettings: (settings) => {
        set((state) => ({
          dailySettings: { ...state.dailySettings, ...settings },
        }));
        get().generateSchedule();
        if (get().userId) get().saveUserSchedule();
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
        if (get().userId) get().saveUserSchedule();
      },

      // Load schedule from Firebase or localStorage
      loadUserSchedule: async (userId) => {
        console.log('[loadUserSchedule] called for userId:', userId);
        let tried = false;
        const tryLoad = async () => {
          try {
            const remote = await loadSchedule(userId);
            console.log('[loadUserSchedule] fetched from Firestore:', remote);
            set({ offline: false });
            let data = remote;
            // If Firestore doc has a 'state' key, use its contents
            if (remote && remote.state) {
              data = remote.state;
              console.log('[loadUserSchedule] using nested state from Firestore:', data);
            }
            if (data) {
              set({
                tasks: data.tasks || [],
                commitments: data.commitments || [],
                dailySettings: data.dailySettings || { wakeUpTime: '08:00', sleepTime: '22:00' },
                scheduleLoaded: true,
              });
              console.log('[loadUserSchedule] store updated with Firestore data');
            } else {
              // migrate guest data if present
              const local = getLocalData();
              console.log('[loadUserSchedule] no Firestore data, local data:', local);
              if (local) {
                const toSave = {
                  tasks: local.tasks || [],
                  commitments: local.commitments || [],
                  dailySettings: local.dailySettings || { wakeUpTime: '08:00', sleepTime: '22:00' },
                };
                await saveSchedule(userId, toSave);
                set({ ...toSave, scheduleLoaded: true });
                localStorage.removeItem(LOCAL_KEY);
                console.log('[loadUserSchedule] migrated local data to Firestore and store');
              } else {
                set({ tasks: [], commitments: [], dailySettings: { wakeUpTime: '08:00', sleepTime: '22:00' }, scheduleLoaded: true });
                console.log('[loadUserSchedule] no data found, store reset');
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
    console.log('[useSchedulerSyncWithAuth] effect run, user:', user);
    if (user) {
      setUserId(user.uid);
      loadUserSchedule(user.uid);
    } else {
      setUserId(null);
    }
    // eslint-disable-next-line
  }, [user]);
}

export { useSchedulerStore, useSchedulerSyncWithAuth, isGuestData }; 