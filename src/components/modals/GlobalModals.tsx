import { useUi } from '@/store/ui';
import { NewConversationModal } from './NewConversationModal';
import { NewIdeaModal } from './NewIdeaModal';
import { NewMeetingModal } from './NewMeetingModal';
import { NewTaskModal } from './NewTaskModal';
import { TaskDetailModal } from './TaskDetailModal';

/** Toutes les modales globales, pilotées par le store d'interface. */
export function GlobalModals() {
  const { modal, modalContext, closeModal, taskId, closeTask } = useUi();
  return (
    <>
      <NewTaskModal opened={modal === 'task'} onClose={closeModal} ctx={modalContext} />
      <NewIdeaModal opened={modal === 'idea'} onClose={closeModal} ctx={modalContext} />
      <NewMeetingModal opened={modal === 'meeting'} onClose={closeModal} ctx={modalContext} />
      <NewConversationModal opened={modal === 'conversation'} onClose={closeModal} ctx={modalContext} />
      <TaskDetailModal taskId={taskId} onClose={closeTask} />
    </>
  );
}
