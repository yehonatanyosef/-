import { useEffect, useState } from 'react';
import { applyUpdate, onUpdateWaiting, updateWaiting } from '../engine/updates';

/** Offers a waiting new version of the game (never shown during a lesson). */
export function UpdateBanner() {
  const [waiting, setWaiting] = useState(updateWaiting);
  useEffect(() => onUpdateWaiting(() => setWaiting(true)), []);
  if (!waiting) return null;
  return (
    <button type="button" className="update-banner pop-in" onClick={applyUpdate}>
      ✨ יש גרסה חדשה של המשחק – לחצו לעדכון
    </button>
  );
}
