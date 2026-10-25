import { Box, Button, Card, Drawer, Group, ScrollArea, Text } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconMessages, IconMessagePlus, IconUsersGroup } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { paths } from '@/core';
import { ConversationContext, ConversationThread } from '@/components/discussions/ConversationThread';
import { MeetingPanel, MeetingThread } from '@/components/discussions/MeetingThread';
import { ThreadList } from '@/components/discussions/ThreadList';
import { EmptyState } from '@/components/ui';
import { useStore } from '@/store';
import { useUi } from '@/store/ui';

/**
 * Discussions et réunions sur une seule page :
 * liste à gauche, fil au centre, contexte (agent) ou compte rendu (réunion) à droite.
 */
export default function DiscussionsPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const conversation = useStore((s) => s.conversations.find((c) => c.id === threadId));
  const meeting = useStore((s) => s.meetings.find((m) => m.id === threadId));
  const openModal = useUi((s) => s.openModal);
  const showList = useMediaQuery('(min-width: 62em)');
  const showPanel = useMediaQuery('(min-width: 82em)');
  const [detailsOpened, { open: openDetails, close: closeDetails }] = useDisclosure(false);

  const hasThread = !!(conversation || meeting);
  const onBack = showList ? undefined : () => navigate(paths.discussions());
  const panelTitle = meeting ? 'Compte rendu' : 'Contexte et mémoire';
  const panel = meeting ? <MeetingPanel meeting={meeting} /> : conversation ? <ConversationContext conv={conversation} /> : null;

  return (
    <Card padding={0} style={{ height: 'calc(100dvh - 60px - 56px)', minHeight: 520, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
      {(showList || !threadId) && (
        <Box w={showList ? 300 : '100%'} style={{ borderRight: showList ? '1px solid var(--app-border)' : undefined, flexShrink: 0 }}>
          <ThreadList activeId={threadId} />
        </Box>
      )}

      {(showList || threadId) && (
        <Box style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {conversation && <ConversationThread conv={conversation} onBack={onBack} onOpenDetails={showPanel ? undefined : openDetails} />}
          {meeting && <MeetingThread meeting={meeting} onBack={onBack} onOpenDetails={showPanel ? undefined : openDetails} />}
          {!hasThread && (
            <Box m="auto" p="md">
              <EmptyState
                icon={<IconMessages size={24} />}
                title={threadId ? 'Discussion introuvable' : 'Choisissez une discussion'}
                description="Écrivez à un agent en tête-à-tête, ou réunissez plusieurs agents sur un projet ou sur tous les projets."
                action={
                  <Group gap="sm" justify="center">
                    <Button variant="default" leftSection={<IconMessagePlus size={16} />} onClick={() => openModal('conversation')}>
                      Nouvelle discussion
                    </Button>
                    <Button leftSection={<IconUsersGroup size={16} />} onClick={() => openModal('meeting')}>
                      Nouvelle réunion
                    </Button>
                  </Group>
                }
              />
            </Box>
          )}
        </Box>
      )}

      {hasThread && showPanel && (
        <Box w={320} style={{ borderLeft: '1px solid var(--app-border)', flexShrink: 0, background: 'var(--app-surface-2)' }}>
          <ScrollArea h="100%">
            <Box p="md">
              <Text fw={650} mb="md">
                {panelTitle}
              </Text>
              {panel}
            </Box>
          </ScrollArea>
        </Box>
      )}
      {hasThread && !showPanel && (
        <Drawer opened={detailsOpened} onClose={closeDetails} position="right" title={panelTitle} size={360}>
          {panel}
        </Drawer>
      )}
    </Card>
  );
}
