import {useEffect, useState} from 'react';
import {userService} from '../services';
import type {UserData} from '../types';

/** Perfil do usuário logado, carregado uma vez por sessão autenticada. */
export const useProfile = (enabled: boolean) => {
  const [profile, setProfile] = useState<UserData | null>(null);

  useEffect(() => {
    if (!enabled) {
      setProfile(null);
      return;
    }
    let active = true;
    userService
      .getUser()
      .then(user => active && setProfile(user))
      .catch(() => active && setProfile(null));
    return () => {
      active = false;
    };
  }, [enabled]);

  return profile;
};
