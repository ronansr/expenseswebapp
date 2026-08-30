export const errorMessage = (error: unknown, fallback = 'Erro ao carregar dados.') => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const supabaseError = error as {message?: string; details?: string; hint?: string; code?: string};
    const parts = [supabaseError.message, supabaseError.details, supabaseError.hint, supabaseError.code].filter(Boolean);
    if (parts.length) return parts.join(' ');
  }
  return fallback;
};
