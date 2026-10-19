import { useEffect, useState } from 'react';
import { fetchOAuthProviders } from '../lib/oauth';

/**
 * Tells Login/Signup which social buttons are actually usable.
 *
 * null  → still loading (or the API could not be reached) — leave clickable,
 * the server answers with a clear message if the provider really is missing.
 * { google: true, github: false, ... } → a `false` means "not configured";
 * the button renders disabled with a short hint instead of failing mid-redirect.
 */
export default function useOAuthProviders() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchOAuthProviders().then((data) => {
      if (alive) setInfo(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  return info;
}
