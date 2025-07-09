import React, { useState } from 'react';
import './App.css';
import TaskForm from './components/TaskForm';
import CommitmentForm from './components/CommitmentForm';
import ScheduleDisplay from './components/ScheduleDisplay';
import { useSchedulerStore, useSchedulerSyncWithAuth } from './store/schedulerStore';
import { AuthProvider, useAuth } from "./store/AuthContext";
import AuthModal from "./components/AuthModal";
import Login from "./components/Login";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";

function AppContent() {
  useSchedulerSyncWithAuth();
  const { user, loading } = useAuth();
  const offline = useSchedulerStore((s) => s.offline);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'

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
                onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
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
