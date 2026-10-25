import { create } from 'zustand';

export type CreateModal = 'task' | 'idea' | 'meeting' | 'conversation' | null;

export interface ModalContext {
  projectId?: string | null;
  restaurantId?: string;
  agentIds?: string[];
  date?: string;
  title?: string;
}

interface UiState {
  modal: CreateModal;
  modalContext: ModalContext;
  openModal: (modal: Exclude<CreateModal, null>, ctx?: ModalContext) => void;
  closeModal: () => void;
  taskId: string | null;
  openTask: (id: string) => void;
  closeTask: () => void;
}

/** État d'interface partagé : modales de création accessibles depuis n'importe quelle page. */
export const useUi = create<UiState>((set) => ({
  modal: null,
  modalContext: {},
  openModal: (modal, ctx = {}) => set({ modal, modalContext: ctx }),
  closeModal: () => set({ modal: null, modalContext: {} }),
  taskId: null,
  openTask: (id) => set({ taskId: id }),
  closeTask: () => set({ taskId: null }),
}));
