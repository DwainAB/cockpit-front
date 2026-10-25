const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

export const apiUrl = (path: string) => `${BASE_URL}${path}`;

/** URL affichable d'un fichier servi par l'API (gère une API sur un autre domaine). */
export const assetUrl = (url: string) => (/^https?:/.test(BASE_URL) && url.startsWith('/api/') ? new URL(url, BASE_URL).href : url);

/** Client HTTP minimal : JSON (ou FormData pour les fichiers) en entrée, JSON en sortie, erreurs converties en `ApiError`. */
export async function request<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method,
      headers: body === undefined || body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Impossible de joindre l’API. Le backend est-il démarré ?', 0);
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error ?? `Erreur HTTP ${res.status}`, res.status, data?.details);
  return data as T;
}
