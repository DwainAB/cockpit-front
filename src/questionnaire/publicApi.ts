import type { QuestionnaireAnswers, UploadedFile } from '@/core';

/** API Yumco (back-yumco-node, module onboarding) : routes publiques, protégées par le jeton du lien. */
const API_URL = ((import.meta.env.VITE_YUMCO_API_URL as string | undefined) ?? 'https://yumco-back-production.up.railway.app').replace(/\/$/, '');

export class PublicApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Champs de l'API → libellés lisibles pour le restaurateur. */
const describe = (status: number, body: unknown) => {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (status === 404) return 'Ce lien n’est pas valide. Vérifiez qu’il est complet, ou demandez-nous un nouveau lien.';
  if (status === 410) {
    if (detail === 'Invitation expired') return 'Ce lien a expiré. Contactez-nous pour en recevoir un nouveau.';
    if (detail === 'Invitation cancelled') return 'Ce lien a été annulé. Contactez-nous pour en recevoir un nouveau.';
    return 'Ce questionnaire a déjà été envoyé. Merci ! Nous revenons vers vous dès que votre site est prêt.';
  }
  if (status === 413) return 'Image trop lourde (8 Mo au maximum).';
  if (status === 415) return 'Format non pris en charge : envoyez une image PNG, JPEG ou WebP.';
  if (status === 429) return 'Trop d’images envoyées depuis ce lien.';
  if (status === 422 && Array.isArray(detail)) return `Certaines réponses sont à corriger : ${detail.map((d: { msg?: string }) => d.msg).join(' ; ')}`;
  return 'Le service est momentanément indisponible. Réessayez dans quelques instants.';
};

const send = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new PublicApiError('Connexion impossible. Vérifiez votre connexion internet puis réessayez.', 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new PublicApiError(describe(res.status, body), res.status);
  return body as T;
};

const form = (token: string) => `/onboarding/forms/${encodeURIComponent(token)}`;

export const publicApi = {
  open: (token: string) => send<{ status: 'open'; recipient_email: string | null; expires_at: string }>(form(token)),
  uploadImage: (token: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return send<UploadedFile>(`${form(token)}/uploads`, { method: 'POST', body });
  },
  submit: (token: string, answers: QuestionnaireAnswers) =>
    send<{ restaurant_id: number }>(`${form(token)}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(answers) }),
};
