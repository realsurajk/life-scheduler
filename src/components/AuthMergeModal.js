import React from "react";

const modalStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1100,
};

const contentStyle = {
  background: "white",
  borderRadius: 8,
  padding: "2rem 2.5rem 1.5rem 2.5rem",
  minWidth: 340,
  boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
  position: "relative",
  textAlign: "center",
};

const buttonStyle = {
  padding: '0.75rem 1.5rem',
  borderRadius: 6,
  border: 'none',
  fontWeight: 600,
  fontSize: '1rem',
  margin: '0 0.5rem',
  cursor: 'pointer',
};

export default function AuthMergeModal({ open, onMerge, onDiscard, onClose }) {
  if (!open) return null;
  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "none",
            border: "none",
            fontSize: 20,
            cursor: "pointer",
          }}
          aria-label="Close"
        >
          ×
        </button>
        <h2>Guest Data Detected</h2>
        <p style={{ marginBottom: 24 }}>
          You have unsaved tasks or commitments as a guest.<br />
          What would you like to do with them?
        </p>
        <div>
          <button style={{ ...buttonStyle, background: '#7b2ff2', color: 'white' }} onClick={onMerge}>
            Merge with my account
          </button>
          <button style={{ ...buttonStyle, background: '#eee', color: '#333' }} onClick={onDiscard}>
            Discard guest data
          </button>
        </div>
      </div>
    </div>
  );
} 