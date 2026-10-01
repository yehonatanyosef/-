import { useEffect, useState } from 'react';
import { BigButton, Modal } from './common';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** "Install the game" – the browser's install prompt, or Add-to-Home-Screen steps on iPhone/iPad. */
export function InstallButton() {
  const [, force] = useState(0);
  const [iosHelp, setIosHelp] = useState(false);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);

  if (isStandalone()) return null;
  if (!deferred && !isIos()) return null;

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      force((n) => n + 1);
    } else setIosHelp(true);
  };

  return (
    <>
      <BigButton color="purple" onClick={() => void install()}>
        📲 התקנת המשחק במכשיר
      </BigButton>
      {iosHelp && (
        <Modal onClose={() => setIosHelp(false)}>
          <h2>📲 התקנה באייפון / אייפד</h2>
          <ol className="ios-steps">
            <li>
              לוחצים על כפתור השיתוף <b>⬆️</b> בתחתית Safari
            </li>
            <li>
              בוחרים <b>"הוספה למסך הבית"</b>
            </li>
            <li>
              לוחצים <b>"הוסף"</b> – והאי מופיע במסך הבית! 🏝️
            </li>
          </ol>
          <BigButton onClick={() => setIosHelp(false)}>הבנתי</BigButton>
        </Modal>
      )}
    </>
  );
}
