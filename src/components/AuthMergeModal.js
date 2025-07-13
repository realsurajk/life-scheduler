import React from "react";
import AnimatedModal from "./AnimatedModal";

const buttonStyle = {
  padding: '0.75rem 1.5rem',
  borderRadius: 6,
  border: 'none',
  fontWeight: 600,
  fontSize: '1rem',
  margin: '0 0.5rem',
  cursor: 'pointer',
};

export default function AuthMergeModal({ open, onMerge, onDiscard, onClose, onAnimationComplete }) {
  return (
    <AnimatedModal 
      open={open} 
      onClose={onClose} 
      onAnimationComplete={onAnimationComplete}
      zIndex={1100}
    >
      <button
        onClick={onClose}
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
    </AnimatedModal>
  );
} 