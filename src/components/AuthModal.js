import React from "react";
import AnimatedModal from "./AnimatedModal";

export default function AuthModal({ open, onClose, onAnimationComplete, children }) {
  return (
    <AnimatedModal 
      open={open} 
      onClose={onClose} 
      onAnimationComplete={onAnimationComplete}
      zIndex={1000}
    >
      <button
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
      {children}
    </AnimatedModal>
  );
} 