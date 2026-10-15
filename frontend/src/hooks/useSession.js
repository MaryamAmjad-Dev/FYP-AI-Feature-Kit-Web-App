import { useEffect, useState } from 'react';
import { isLoggedIn } from '../lib/auth';

/**
 * Reactive read of the UI session flag (the httpOnly cookie itself is
 * unreadable by design — see lib/auth.js).
 *
 * Jo kaam pehle har page khud karta tha — `isLoggedIn()` ek useState +
 * useEffect mein mirror karna — ab yahan ek jagah hai. Bonus: window pe
 * `auth:changed` event par bhi sync ho jata hai (main.jsx login/logout
 * par ye event bhejta hai), isliye same-tab ke multiple components
 * consistent rehte hain.
 *
 * Ye sirf READ karta hai — redirect/protect karne ke liye App.jsx ka
 * ProtectedRoute use hota hai, taake gate ek jagah ho.
 */
export default function useSession() {
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn());

  useEffect(() => {
    const sync = () => setLoggedIn(isLoggedIn());
    sync();
    window.addEventListener('auth:changed', sync);
    return () => window.removeEventListener('auth:changed', sync);
  }, []);

  return loggedIn;
}
