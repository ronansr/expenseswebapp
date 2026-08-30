import {useEffect, useState} from 'react';
import {supabase} from '../lib/supabase';

/** Estado de sessão do Supabase. Regra inalterada: sessão persistida e ouvida. */
export const useSession = () => {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;

    /* A checagem de sessão não pode segurar a página publica: se o Supabase
       demorar, seguimos como visitante e o listener corrige depois. */
    const guard = window.setTimeout(() => {
      if (active) setReady(true);
    }, 2500);

    supabase.auth
      .getSession()
      .then(({data}) => {
        if (!active) return;
        setAuthenticated(Boolean(data.session));
        setReady(true);
      })
      .catch(() => active && setReady(true));
    const {data: listener} = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session));
    });
    return () => {
      active = false;
      window.clearTimeout(guard);
      listener.subscription.unsubscribe();
    };
  }, []);

  return {ready, authenticated, setAuthenticated};
};
