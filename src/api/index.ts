/**
 * Point d'entrée unique des mutations.
 *
 * - Mode `http` (par défaut) : appel REST au backend Node.js puis rechargement de l'instantané.
 * - Mode `mock` : la même logique métier (`src/core`) est appliquée localement, après une
 *   courte latence simulée. Utile pour une démo sans backend (`npm run dev:mock`).
 *
 * Les composants n'appellent jamais `fetch` ni le store directement pour écrire.
 */
import {
  addIdea,
  addMeeting,
  addMeetingItem,
  addProjectNote,
  addRestaurantNote,
  addTask,
  addTaskComment,
  addTranscriptNote,
  contentAction,
  createAgent,
  createConversation,
  completeBuild,
  completeDesign,
  createDraft,
  deleteDraft,
  createTasksFromMeeting,
  markAllNotificationsRead,
  markNotificationRead,
  platformUrl,
  regenerateDesign,
  requestBuildChanges,
  finalizeDraft,
  retryDelivery,
  setCustomDomain,
  setRepoName,
  sendMeetingMessage,
  setBuildTesting,
  simulatedBuildChecks,
  simulateDesign,
  startBuild,
  startDesign,
  TEST_PLATFORM_RESTAURANT_ID,
  sendMessage,
  setMeetingStatus,
  setStripeStatus,
  setTaskStatus,
  toggleAutomation,
  toggleProjectSetting,
  updateAgent,
  updateDelivery,
  updateSettings,
  validateBuild,
  validateDesign,
  validateTask,
  workflowAction,
  type Agent,
  type AgentInput,
  type ChatMessage,
  type Invitation,
  type SubscriptionPlan,
  type Content,
  type Conversation,
  type ContentAction,
  type DomainContext,
  type Meeting,
  type MeetingStatus,
  type NewConversationInput,
  type NewIdeaInput,
  type NewMeetingInput,
  type QuestionnaireAnswers,
  type DesignVersion,
  type SiteBuild,
  type SiteDelivery,
  type SiteDraft,
  type UploadedFile,
  type NewTaskInput,
  type Restaurant,
  type Settings,
  type StripeStatus,
  type Task,
  type TaskStatus,
  type WorkflowAction,
  type WorkflowStepKey,
} from '@/core';
import { notifyError } from '@/lib/notify';
import { useStore } from '@/store';
import { isMock } from './connection';
import { ApiError, request } from './http';
import { refresh } from './sync';

export { ApiError } from './http';

const MOCK_LATENCY = 350;

/** Erreur déjà signalée à l'utilisateur par une notification. */
export class HandledApiError extends ApiError {}

async function call<T>(remote: () => Promise<T>, local: (ctx: DomainContext) => T): Promise<T> {
  try {
    if (isMock()) {
      await new Promise((r) => setTimeout(r, MOCK_LATENCY));
      return useStore.getState().runLocal(local);
    }
    const result = await remote();
    await refresh();
    return result;
  } catch (err) {
    const e = err instanceof ApiError ? err : new ApiError((err as Error).message, 0);
    notifyError('Action impossible', e.details?.length ? `${e.message} : ${e.details.map((d) => `${d.path} ${d.message}`).join(', ')}` : e.message);
    throw new HandledApiError(e.message, e.status, e.details);
  }
}

/** Envoi d'image : fichier sur le serveur en mode API, URL locale (data:) en mode démo. */
export async function uploadImage(path: string, file: File): Promise<UploadedFile> {
  try {
    if (isMock()) {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
        reader.readAsDataURL(file);
      });
      return { id: crypto.randomUUID(), url, name: file.name };
    }
    const form = new FormData();
    form.append('file', file);
    return await request<UploadedFile>('POST', path, form);
  } catch (err) {
    const e = err instanceof ApiError ? err : new ApiError((err as Error).message, 0);
    notifyError('Envoi de l’image impossible', e.message);
    throw new HandledApiError(e.message, e.status);
  }
}

/** Mode démo : la génération du design est simulée localement après un court délai. */
const simulateLocally = (ctx: DomainContext, draftId: string, versionId: string) => {
  ctx.schedule(1500, (db) => void startDesign(db, draftId, versionId));
  ctx.schedule(4500, (db) => {
    const draft = db.drafts.find((d) => d.id === draftId);
    const version = draft?.versions.find((v) => v.id === versionId);
    if (!draft || !version) return;
    const result = simulateDesign(draft.answers, version.number, version.feedback);
    completeDesign(db, draftId, versionId, { ...result, previewUrl: null, usage: null, simulated: true });
  });
};

/** Mode démo : développement et tests simulés, l'aperçu reprend la maquette validée. */
const simulateBuildLocally = (ctx: DomainContext, draftId: string, buildId: string) => {
  ctx.schedule(1500, (db) => void startBuild(db, draftId, buildId));
  ctx.schedule(3500, (db) => setBuildTesting(db, draftId, buildId, 1));
  ctx.schedule(6000, (db) => {
    const draft = db.drafts.find((d) => d.id === draftId);
    if (!draft) return;
    completeBuild(db, draftId, buildId, {
      checks: simulatedBuildChecks(draft.answers),
      previewUrl: null,
      usage: null,
      notes: ['Développement simulé (mode démo) : aucun code Next.js généré.'],
      simulated: true,
      attempts: 1,
    });
  });
};

/** Mode démo : mise en ligne simulée (aucun envoi sur GitHub ni Vercel). */
const simulateDeliveryLocally = (ctx: DomainContext, draftId: string) => {
  ctx.schedule(2000, (db) => updateDelivery(db, draftId, { status: 'vercel', simulated: true }));
  ctx.schedule(5000, (db) => updateDelivery(db, draftId, { status: 'live', siteUrl: 'https://exemple.vercel.app' }));
};

const post = <T>(path: string, body?: unknown) => () => request<T>('POST', path, body ?? {});
const patch = <T>(path: string, body: unknown) => () => request<T>('PATCH', path, body);

export const api = {
  restaurants: {
    addNote: (id: string, text: string) => call(post<Restaurant>(`/restaurants/${id}/notes`, { text }), (ctx) => addRestaurantNote(ctx, id, text)),
    setStripeStatus: (id: string, status: StripeStatus) => call(patch<Restaurant>(`/restaurants/${id}/stripe`, { status }), (ctx) => setStripeStatus(ctx, id, status)),
  },
  drafts: {
    /** Questionnaire rempli : crée le restaurant (offre `plan`) et la maquette, puis lance la génération du design. */
    create: (plan: SubscriptionPlan, answers: QuestionnaireAnswers) =>
      call(post<SiteDraft>('/drafts', { plan, answers }), (ctx) => {
        const { draft, version } = createDraft(ctx, answers, { platformUrl: platformUrl(TEST_PLATFORM_RESTAURANT_ID), plan, source: 'cockpit', yumcoRestaurantId: null });
        simulateLocally(ctx, draft.id, version.id);
        return draft;
      }),
    regenerate: (id: string, request: { feedback?: string; fresh?: boolean }) =>
      call(post<DesignVersion>(`/drafts/${id}/regenerate`, request), (ctx) => {
        const { version } = regenerateDesign(ctx, id, request);
        simulateLocally(ctx, id, version.id);
        return version;
      }),
    /** Valide la maquette : le développement du site démarre automatiquement. */
    validate: (id: string, versionId: string) =>
      call(post<DesignVersion>(`/drafts/${id}/versions/${versionId}/validate`), (ctx) => {
        const { version, build } = validateDesign(ctx, id, versionId);
        simulateBuildLocally(ctx, id, build.id);
        return version;
      }),
    /** Site refusé avec une remarque, ou développement en échec à relancer. */
    requestBuildChanges: (id: string, feedback?: string) =>
      call(post<SiteBuild>(`/drafts/${id}/builds/changes`, { feedback }), (ctx) => {
        const { build } = requestBuildChanges(ctx, id, feedback);
        simulateBuildLocally(ctx, id, build.id);
        return build;
      }),
    /** Valide le site : il part directement sur GitHub puis Vercel. */
    validateBuild: (id: string, buildId: string) =>
      call(post<SiteBuild>(`/drafts/${id}/builds/${buildId}/validate`), (ctx) => {
        const build = validateBuild(ctx, id, buildId);
        simulateDeliveryLocally(ctx, id);
        return build;
      }),
    setRepoName: (id: string, name: string) => call(patch<SiteDraft>(`/drafts/${id}/repo-name`, { name }), (ctx) => setRepoName(ctx, id, name)),
    setDomain: (id: string, domain: string) => call(patch<SiteDelivery>(`/drafts/${id}/domain`, { domain }), (ctx) => setCustomDomain(ctx, id, domain)),
    /** Récupère le domaine officiel ajouté sur le projet Vercel (indisponible en mode démo). */
    detectDomain: (id: string) =>
      call(post<SiteDelivery>(`/drafts/${id}/domain/detect`), () => {
        throw new ApiError('Détection impossible en mode démo : saisissez le domaine à la main.', 400);
      }),
    /** Termine le processus : le dossier quitte la production et devient un restaurant. */
    finalize: (id: string) => call(post<Restaurant>(`/drafts/${id}/finalize`), (ctx) => finalizeDraft(ctx, id)),
    retryDelivery: (id: string) =>
      call(post<SiteDelivery>(`/drafts/${id}/delivery/retry`), (ctx) => {
        const delivery = retryDelivery(ctx, id);
        simulateDeliveryLocally(ctx, id);
        return delivery;
      }),
    remove: (id: string) => call(() => request<null>('DELETE', `/drafts/${id}`), (ctx) => deleteDraft(ctx, id)),
  },
  uploads: {
    image: (file: File) => uploadImage('/uploads', file),
  },
  /** Liens de questionnaire (API Yumco, via le backend) : pas de mode démo, aucune donnée locale. */
  invitations: {
    list: () => request<Invitation[]>('GET', '/invitations'),
    create: (plan: SubscriptionPlan, email: string | null) =>
      call(
        () => request<Invitation & { url: string; email_sent: boolean; email_error: string | null }>('POST', '/invitations', { plan, email }),
        () => {
          throw new Error('Liens de questionnaire indisponibles en mode démo.');
        },
      ),
    cancel: (id: number) =>
      call(
        () => request<null>('POST', `/invitations/${id}/cancel`, {}),
        () => {
          throw new Error('Liens de questionnaire indisponibles en mode démo.');
        },
      ),
  },
  workflow: {
    act: (restaurantId: string, step: WorkflowStepKey, action: WorkflowAction, comment?: string) =>
      call(post<Restaurant>(`/restaurants/${restaurantId}/workflow/${step}/actions`, { action, comment }), (ctx) => workflowAction(ctx, restaurantId, step, action, comment)),
  },
  tasks: {
    create: (input: NewTaskInput) => call(post<Task>('/tasks', input), (ctx) => addTask(ctx, input)),
    validate: (id: string) => call(post<Task>(`/tasks/${id}/validate`), (ctx) => validateTask(ctx, id)),
    setStatus: (id: string, status: TaskStatus) => call(patch<Task>(`/tasks/${id}`, { status }), (ctx) => setTaskStatus(ctx, id, status)),
    comment: (id: string, text: string) => call(post<Task>(`/tasks/${id}/comments`, { text }), (ctx) => addTaskComment(ctx, id, text)),
  },
  contents: {
    createIdea: (input: NewIdeaInput) => call(post<Content>('/contents', input), (ctx) => addIdea(ctx, input)),
    act: (id: string, action: ContentAction, comment?: string) => call(post<Content>(`/contents/${id}/actions`, { action, comment }), (ctx) => contentAction(ctx, id, action, comment)),
  },
  meetings: {
    create: (input: NewMeetingInput) => call(post<Meeting>('/meetings', input), (ctx) => addMeeting(ctx, input)),
    setStatus: (id: string, status: MeetingStatus) => call(patch<Meeting>(`/meetings/${id}`, { status }), (ctx) => setMeetingStatus(ctx, id, status)),
    addItem: (id: string, kind: 'decisions' | 'ideas' | 'followUps', text: string) =>
      call(post<Meeting>(`/meetings/${id}/items`, { kind, text }), (ctx) => addMeetingItem(ctx, id, kind, text)),
    addNote: (id: string, text: string) => call(post<Meeting>(`/meetings/${id}/notes`, { text }), (ctx) => addTranscriptNote(ctx, id, text)),
    /** Les agents participants répondent à tour de rôle (simulation). */
    sendMessage: (id: string, text: string) => call(post<Meeting>(`/meetings/${id}/messages`, { text }), (ctx) => sendMeetingMessage(ctx, id, text)),
    createTasks: (id: string) =>
      call(
        () => request<{ created: number }>('POST', `/meetings/${id}/create-tasks`, {}).then((r) => r.created),
        (ctx) => createTasksFromMeeting(ctx, id),
      ),
  },
  projects: {
    addNote: (id: string, text: string) => call(post(`/projects/${id}/notes`, { text }), (ctx) => addProjectNote(ctx, id, text)),
    toggleSetting: (id: string, key: 'weeklyMeeting' | 'requireValidation') => call(post(`/projects/${id}/settings/toggle`, { key }), (ctx) => toggleProjectSetting(ctx, id, key)),
  },
  conversations: {
    /** Renvoie la discussion existante avec cet agent sur ce projet, ou en crée une. */
    create: (input: NewConversationInput) => call(post<Conversation>('/conversations', input), (ctx) => createConversation(ctx, input)),
    /** Réponse de l'agent simulée côté serveur (ou localement), aucune IA n'est appelée. */
    send: (id: string, text: string, attachment?: ChatMessage['attachment']) =>
      call(post<ChatMessage>(`/conversations/${id}/messages`, { text, attachment }), (ctx) => sendMessage(ctx, id, text, attachment)),
  },
  agents: {
    create: (input: AgentInput) => call(post<Agent>('/agents', input), (ctx) => createAgent(ctx, input)),
    update: (id: string, patchBody: Partial<AgentInput>) => call(patch<Agent>(`/agents/${id}`, patchBody), (ctx) => updateAgent(ctx, id, patchBody)),
  },
  notifications: {
    markRead: (id: string) => call(post(`/notifications/${id}/read`), (ctx) => markNotificationRead(ctx, id)),
    markAllRead: () => call(post('/notifications/read-all'), (ctx) => markAllNotificationsRead(ctx)),
  },
  settings: {
    update: (patchBody: Partial<Settings>) => call(patch<Settings>('/settings', patchBody), (ctx) => updateSettings(ctx, patchBody)),
    toggleAutomation: (id: string) => call(post(`/settings/automations/${id}/toggle`), (ctx) => toggleAutomation(ctx, id)),
  },
  integrations: {
    /** Aucune intégration n'est connectée : l'API répond 503, le mode démo simule la même erreur. */
    sync: (provider: 'stripe') =>
      call(post(`/integrations/${provider}/sync`), () => {
        throw new ApiError(`Intégration « ${provider} » non connectée dans cette version (simulation).`, 503);
      }),
  },
  demo: {
    reset: async () => {
      if (!isMock()) return call(post('/demo/reset'), () => null);
      useStore.getState().resetLocal();
      return null;
    },
  },
};
