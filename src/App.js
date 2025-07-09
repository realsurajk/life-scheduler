import React, { useState, useRef } from 'react';
import './App.css';
import TaskForm from './components/TaskForm';
import CommitmentForm from './components/CommitmentForm';
import ScheduleDisplay from './components/ScheduleDisplay';
import { useSchedulerStore, useSchedulerSyncWithAuth, isGuestData } from './store/schedulerStore';
import { AuthProvider, useAuth } from "./store/AuthContext";
import AuthModal from "./components/AuthModal";
import AuthMergeModal from "./components/AuthMergeModal";
import Login from "./components/Login";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { loadSchedule, saveSchedule } from './store/ScheduleService';

const LOCAL_KEY = 'smart-scheduler-storage';
function getLocalData() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function clearLocalData() {
  localStorage.removeItem(LOCAL_KEY);
}

function AppContent() {
  useSchedulerSyncWithAuth();
  const { user, loading } = useAuth();
  console.log('[AppContent] Component rendering, user:', !!user);
  const offline = useSchedulerStore((s) => s.offline);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [mergeChoice, setMergeChoice] = useState(null); // 'merge', 'overwrite', 'discard', or null
  const [pendingGuestData, setPendingGuestData] = useState(null);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [pendingRemote, setPendingRemote] = useState(null);
  const [pendingLocal, setPendingLocal] = useState(null);
  const userId = useSchedulerStore((s) => s.userId);
  const tasks = useSchedulerStore((s) => s.tasks);
  const commitments = useSchedulerStore((s) => s.commitments);
  const dailySettings = useSchedulerStore((s) => s.dailySettings);
  const saveUserSchedule = useSchedulerStore((s) => s.saveUserSchedule);
  const scheduleLoaded = useSchedulerStore((s) => s.scheduleLoaded);
  const setTasks = useSchedulerStore((s) => s.setTasks);
  const setCommitments = useSchedulerStore((s) => s.setCommitments);
  const setDailySettings = useSchedulerStore((s) => s.setDailySettings);
  const generateSchedule = useSchedulerStore((s) => s.generateSchedule);

  // Capture guest data before login
  const guestDataRef = useRef(null);
  
  // Capture guest data on component mount and when in guest mode
  React.useEffect(() => {
    console.log('[GuestCapture] Component mounted, checking for guest data');
    const local = getLocalData();
    console.log('[GuestCapture] Checking for guest data:', local);
    if (local && local.state && (local.state.tasks?.length || local.state.commitments?.length)) {
      guestDataRef.current = local.state;
      console.log('[GuestCapture] Captured guest data:', guestDataRef.current);
    } else {
      guestDataRef.current = null;
      console.log('[GuestCapture] No guest data to capture');
    }
  }, []); // Run only on mount

  // Also capture guest data when user logs out (returns to guest mode)
  React.useEffect(() => {
    if (!user) {
      const local = getLocalData();
      console.log('[GuestCapture] User logged out, checking for guest data:', local);
      if (local && local.state && (local.state.tasks?.length || local.state.commitments?.length)) {
        guestDataRef.current = local.state;
        console.log('[GuestCapture] Captured guest data after logout:', guestDataRef.current);
      } else {
        guestDataRef.current = null;
        console.log('[GuestCapture] No guest data to capture after logout');
      }
    }
  }, [user]);

  // Check for guest data before login
  const checkGuestDataBeforeLogin = () => {
    const local = getLocalData();
    console.log('[PreLoginCheck] Checking for guest data before login:', local);
    if (local && local.state && (local.state.tasks?.length || local.state.commitments?.length)) {
      console.log('[PreLoginCheck] Found guest data, storing for later use');
      setPendingGuestData(local.state);
      return true;
    }
    return false;
  };

  // Handle login button click
  const handleLoginClick = () => {
    if (checkGuestDataBeforeLogin()) {
      // Show merge modal before login
      setMergeModalOpen(true);
    } else {
      // No guest data, proceed with normal login
      setAuthModalOpen(true);
    }
  };

  // Handle merge choice before login
  const handlePreLoginMerge = () => {
    console.log('[PreLoginMerge] User chose: Merge');
    setMergeChoice('merge');
    setMergeModalOpen(false);
    setAuthModalOpen(true);
  };

  const handlePreLoginDiscard = () => {
    console.log('[PreLoginDiscard] User chose: Discard');
    setMergeChoice('discard');
    setMergeModalOpen(false);
    setAuthModalOpen(true);
  };

  // Detect guest data and user data on login
  React.useEffect(() => {
    console.log('[MergePrompt] Effect triggered - user:', user, 'userId:', userId, 'scheduleLoaded:', scheduleLoaded, 'mergeChoice:', mergeChoice, 'pendingGuestData:', pendingGuestData);
    
    if (user && userId && scheduleLoaded && mergeChoice && pendingGuestData) {
      console.log('[MergePrompt] Executing pre-login merge choice:', mergeChoice);
      
      loadSchedule(userId).then(remote => {
        let remoteData = remote;
        if (remote && remote.state) remoteData = remote.state;
        console.log('[MergePrompt] Remote data:', remoteData);
        
        if (mergeChoice === 'merge' && remoteData && (remoteData.tasks?.length || remoteData.commitments?.length)) {
          // Merge guest data with existing user data
          console.log('[MergePrompt] Merging guest data with user data');
          const mergedTasks = [...remoteData.tasks, ...pendingGuestData.tasks.filter(t => !remoteData.tasks.some(rt => rt.id === t.id))];
          const mergedCommitments = [...remoteData.commitments, ...pendingGuestData.commitments.filter(c => !remoteData.commitments.some(rc => rc.id === c.id))];
          const merged = {
            tasks: mergedTasks,
            commitments: mergedCommitments,
            dailySettings: remoteData.dailySettings || pendingGuestData.dailySettings || { wakeUpTime: '08:00', sleepTime: '22:00' },
          };
          saveSchedule(userId, merged).then(() => {
            setTasks(merged.tasks);
            setCommitments(merged.commitments);
            setDailySettings(merged.dailySettings);
            generateSchedule(); // Regenerate schedule with new data
            clearLocalData();
            setMergeChoice(null);
            setPendingGuestData(null);
          });
        } else if (mergeChoice === 'merge' && (!remoteData || (!remoteData.tasks?.length && !remoteData.commitments?.length))) {
          // Merge choice but no existing user data, so just save guest data
          console.log('[MergePrompt] Merge choice but no existing user data, saving guest data');
          const toSave = {
            tasks: pendingGuestData.tasks || [],
            commitments: pendingGuestData.commitments || [],
            dailySettings: pendingGuestData.dailySettings || { wakeUpTime: '08:00', sleepTime: '22:00' },
          };
          saveSchedule(userId, toSave).then(() => {
            setTasks(toSave.tasks);
            setCommitments(toSave.commitments);
            setDailySettings(toSave.dailySettings);
            generateSchedule(); // Regenerate schedule with new data
            clearLocalData();
            setMergeChoice(null);
            setPendingGuestData(null);
          });
        } else if (mergeChoice === 'discard') {
          // Keep user data, discard guest data
          console.log('[MergePrompt] Discarding guest data, keeping user data');
          if (remoteData) {
            setTasks(remoteData.tasks || []);
            setCommitments(remoteData.commitments || []);
            setDailySettings(remoteData.dailySettings || { wakeUpTime: '08:00', sleepTime: '22:00' });
            generateSchedule(); // Regenerate schedule with new data
          }
          clearLocalData();
          setMergeChoice(null);
          setPendingGuestData(null);
        }
      });
    } else if (user && userId && scheduleLoaded && !mergeChoice) {
      // Normal login without guest data conflict
      console.log('[MergePrompt] Normal login, no guest data conflict');
    }
    // eslint-disable-next-line
  }, [user, userId, scheduleLoaded, mergeChoice, pendingGuestData]);

  // Merge logic
  const handleMerge = async () => {
    console.log('[MergePrompt] User chose: Merge');
    if (!pendingUserId || !pendingRemote || !pendingLocal) return;
    // Merge tasks and commitments (deduplicate by id)
    const mergedTasks = [...pendingRemote.tasks, ...pendingLocal.tasks.filter(t => !pendingRemote.tasks.some(rt => rt.id === t.id))];
    const mergedCommitments = [...pendingRemote.commitments, ...pendingLocal.commitments.filter(c => !pendingRemote.commitments.some(rc => rc.id === c.id))];
    const merged = {
      tasks: mergedTasks,
      commitments: mergedCommitments,
      dailySettings: pendingRemote.dailySettings || pendingLocal.dailySettings || { wakeUpTime: '08:00', sleepTime: '22:00' },
    };
    await saveSchedule(pendingUserId, merged);
    // Reload the schedule from Firestore to ensure UI updates
    const reloaded = await loadSchedule(pendingUserId);
    let reloadedData = reloaded;
    if (reloaded && reloaded.state) reloadedData = reloaded.state;
    if (reloadedData) {
      setTasks(reloadedData.tasks || []);
      setCommitments(reloadedData.commitments || []);
      setDailySettings(reloadedData.dailySettings || { wakeUpTime: '08:00', sleepTime: '22:00' });
      generateSchedule(); // Regenerate schedule with new data
    }
    clearLocalData();
    guestDataRef.current = null;
    setMergeModalOpen(false);
  };
  const handleDiscard = async () => {
    console.log('[MergePrompt] User chose: Discard');
    if (!pendingUserId || !pendingRemote) return;
    const toSave = {
      tasks: pendingRemote.tasks || [],
      commitments: pendingRemote.commitments || [],
      dailySettings: pendingRemote.dailySettings || { wakeUpTime: '08:00', sleepTime: '22:00' },
    };
    await saveSchedule(pendingUserId, toSave);
    // Reload the schedule from Firestore to ensure UI updates
    const reloaded = await loadSchedule(pendingUserId);
    let reloadedData = reloaded;
    if (reloaded && reloaded.state) reloadedData = reloaded.state;
    if (reloadedData) {
      setTasks(reloadedData.tasks || []);
      setCommitments(reloadedData.commitments || []);
      setDailySettings(reloadedData.dailySettings || { wakeUpTime: '08:00', sleepTime: '22:00' });
      generateSchedule(); // Regenerate schedule with new data
    }
    clearLocalData();
    guestDataRef.current = null;
    setMergeModalOpen(false);
  };

  React.useEffect(() => {
    // Only sync to Firestore if user is logged in, userId is set, and schedule is loaded
    if (user && userId && scheduleLoaded && !offline) {
      saveUserSchedule();
    }
    // eslint-disable-next-line
  }, [user, userId, tasks, commitments, dailySettings, offline, scheduleLoaded]);

  if (loading) return <div>Loading...</div>;
  return (
    <div className="App">
      {offline && (
        <div style={{
          background: '#f953c6',
          color: 'white',
          textAlign: 'center',
          padding: '0.5rem',
          fontWeight: 600,
          letterSpacing: 1,
        }}>
          You are offline. Changes will not sync until you are back online.
        </div>
      )}
      <header
        className="App-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          padding: '1rem 2rem',
        }}
      >
        <div style={{ flex: 1 }} />
        <div style={{ flex: 2, textAlign: 'center' }}>
          <h1 style={{ margin: 0 }}>SmartScheduler</h1>
          <p style={{ margin: 0 }}>Intelligent task scheduling with priority and deadline management</p>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
          {user ? (
            <>
              <span>Signed in as <b>{user.email}</b></span>
              <button
                onClick={() => signOut(auth)}
                style={{ padding: '0.5rem 1rem', borderRadius: 4, border: 'none', background: '#7b2ff2', color: 'white', cursor: 'pointer' }}
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleLoginClick}
                style={{ padding: '0.5rem 1rem', borderRadius: 4, border: 'none', background: '#7b2ff2', color: 'white', cursor: 'pointer' }}
              >
                Log In
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setAuthModalOpen(true); }}
                style={{ padding: '0.5rem 1rem', borderRadius: 4, border: 'none', background: '#f953c6', color: 'white', cursor: 'pointer' }}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </header>
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)}>
        <Login mode={authMode} onSuccess={() => setAuthModalOpen(false)} />
      </AuthModal>
      <AuthMergeModal
        open={mergeModalOpen}
        onMerge={handlePreLoginMerge}
        onDiscard={handlePreLoginDiscard}
        onClose={() => setMergeModalOpen(false)}
      />
      <main className="App-main">
        <div className="schedule-container">
          <ScheduleDisplay />
        </div>
        <div className="forms-container">
          <div className="form-section">
            <h2>Add Tasks</h2>
            <TaskForm />
          </div>
          <div className="form-section">
            <h2>Daily Settings & Commitments</h2>
            <CommitmentForm />
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
