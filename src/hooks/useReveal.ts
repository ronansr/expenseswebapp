import {useEffect, useRef} from 'react';

/**
 * Revela os elementos marcados com .lp-reveal ao entrarem na viewport.
 * Uma vez por elemento, e desligado quando o usuário pede menos movimento.
 */
export const useReveal = <T extends HTMLElement>() => {
  const rootRef = useRef<T>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>('.lp-reveal'));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      targets.forEach(element => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      {rootMargin: '0px 0px -12% 0px', threshold: 0.12},
    );

    targets.forEach(element => observer.observe(element));

    /* Rede de segurança: se o observador não disparar (aba em segundo plano,
       navegador sem suporte pleno), o conteúdo aparece assim mesmo. */
    const fallback = window.setTimeout(() => {
      targets.forEach(element => element.classList.add('is-visible'));
    }, 1600);

    return () => {
      window.clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);

  return rootRef;
};
