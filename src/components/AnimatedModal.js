import React, { useState, useEffect } from "react";
import "./AnimatedModal.css";

export default function AnimatedModal({ open, onClose, onAnimationComplete, children, zIndex = 1000 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsAnimating(true);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      // Re-enable body scroll when modal closes
      document.body.style.overflow = 'unset';
      
      // If modal is closed programmatically (not through animation), 
      // immediately hide it and call onAnimationComplete
      if (isVisible) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        }, 50); // Small delay to ensure state updates properly
        
        return () => clearTimeout(timer);
      }
    }
  }, [open, isVisible, onAnimationComplete]);

  const handleAnimationEnd = () => {
    if (!open) {
      setIsVisible(false);
      // Call onAnimationComplete after exit animation finishes
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Only return null if we're not visible AND not open
  // This ensures the modal can become visible again after being closed
  if (!isVisible && !open) return null;

  return (
    <div 
      className={`animated-modal-backdrop ${isAnimating ? 'visible' : ''}`}
      style={{ zIndex }}
      onClick={handleBackdropClick}
    >
      <div 
        className={`animated-modal-content ${isAnimating ? 'visible' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={handleAnimationEnd}
      >
        {children}
      </div>
    </div>
  );
} 