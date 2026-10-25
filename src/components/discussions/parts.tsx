import { ActionIcon, Badge, Box, Button, Group, Menu, Text, Textarea } from '@mantine/core';
import { IconArrowLeft, IconFile, IconLayoutSidebarRight, IconLink, IconPaperclip, IconPhoto, IconSend, IconX } from '@tabler/icons-react';
import { useState, type ReactNode } from 'react';
import type { Agent, ChatMessage } from '@/core';
import { AgentAvatar } from '@/components/ui';

export const attachmentIcon = { file: IconFile, image: IconPhoto, link: IconLink };

const fakeAttachments: NonNullable<ChatMessage['attachment']>[] = [
  { name: 'maquette-petit-zinc-v2.pdf', kind: 'file' },
  { name: 'capture-visuel.png', kind: 'image' },
  { name: 'rapport-tests.html', kind: 'link' },
];

/** En-tête commun aux conversations et aux réunions. */
export function ThreadHeader({ left, right, onBack, onOpenDetails }: { left: ReactNode; right?: ReactNode; onBack?: () => void; onOpenDetails?: () => void }) {
  return (
    <Group justify="space-between" p="md" style={{ borderBottom: '1px solid var(--app-border)' }} wrap="nowrap" gap="sm">
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        {onBack && (
          <ActionIcon variant="subtle" color="gray" onClick={onBack} aria-label="Retour à la liste">
            <IconArrowLeft size={18} />
          </ActionIcon>
        )}
        {left}
      </Group>
      <Group gap="xs" wrap="nowrap">
        {right}
        {onOpenDetails && (
          <Button size="xs" variant="light" leftSection={<IconLayoutSidebarRight size={14} />} onClick={onOpenDetails}>
            Détails
          </Button>
        )}
      </Group>
    </Group>
  );
}

/** Bulle de message : moi à droite, agents à gauche (identifiés), système au centre. */
export function Bubble({ from, agent, text, time, attachment, showAuthor }: { from: 'me' | 'agent' | 'system'; agent?: Agent; text: string; time: string; attachment?: ChatMessage['attachment']; showAuthor?: boolean }) {
  if (from === 'system')
    return (
      <Group justify="center">
        <Text size="xs" c="dimmed" px="sm" py={4} ta="center" style={{ background: 'var(--app-surface-2)', border: '1px dashed var(--app-border)', borderRadius: 20 }}>
          {text}
        </Text>
      </Group>
    );
  const mine = from === 'me';
  const Icon = attachment ? attachmentIcon[attachment.kind] : null;
  return (
    <Group justify={mine ? 'flex-end' : 'flex-start'} align="flex-end" gap="xs" wrap="nowrap">
      {!mine && showAuthor && <AgentAvatar agent={agent} size={28} />}
      <Box
        maw="78%"
        px="md"
        py={10}
        style={{
          background: mine ? 'var(--mantine-color-night-7)' : '#fff',
          color: mine ? '#fff' : undefined,
          border: mine ? undefined : '1px solid var(--app-border)',
          borderLeft: mine ? undefined : `3px solid ${agent?.color ?? 'var(--app-border)'}`,
          borderRadius: 14,
          borderBottomRightRadius: mine ? 4 : 14,
          borderBottomLeftRadius: mine ? 14 : 4,
        }}
      >
        {!mine && showAuthor && agent && (
          <Text size="xs" fw={650} mb={2} style={{ color: agent.color }}>
            {agent.name} · <Text span size="xs" c="dimmed" fw={400}>{agent.role}</Text>
          </Text>
        )}
        <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
          {text}
        </Text>
        {attachment && Icon && (
          <Group gap={6} mt={8} p={6} style={{ background: mine ? 'rgba(255,255,255,0.12)' : 'var(--app-surface-2)', borderRadius: 6 }}>
            <Icon size={14} />
            <Text size="xs">{attachment.name}</Text>
          </Group>
        )}
        <Text size="10px" mt={4} opacity={0.6} ta="right">
          {time}
        </Text>
      </Box>
    </Group>
  );
}

export function TypingIndicator({ agent }: { agent?: Agent }) {
  return (
    <Group gap="sm">
      <AgentAvatar agent={agent} size={28} />
      <Box px="md" py={10} style={{ background: '#fff', border: '1px solid var(--app-border)', borderRadius: 14 }}>
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </Box>
    </Group>
  );
}

/** Zone de saisie : Entrée pour envoyer, Maj+Entrée pour aller à la ligne. */
export function Composer({
  placeholder,
  suggestions = [],
  disabled,
  withAttachments,
  onSend,
}: {
  placeholder: string;
  suggestions?: string[];
  disabled?: boolean;
  withAttachments?: boolean;
  onSend: (text: string, attachment?: ChatMessage['attachment']) => Promise<unknown>;
}) {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<ChatMessage['attachment']>();

  const send = (value = text) => {
    if (!value.trim() && !attachment) return;
    const body = value.trim() || 'Pièce jointe';
    const sent = attachment;
    setText('');
    setAttachment(undefined);
    onSend(body, sent).catch(() => {
      // Échec déjà notifié : on restitue le brouillon.
      setText(body);
      setAttachment(sent);
    });
  };

  return (
    <Box p="md" pt="xs" style={{ borderTop: '1px solid var(--app-border)' }}>
      {suggestions.length > 0 && (
        <Group gap={6} mb="xs" wrap="wrap">
          {suggestions.map((s) => (
            <Button key={s} size="compact-xs" variant="default" radius="xl" onClick={() => send(s)} disabled={disabled}>
              {s}
            </Button>
          ))}
        </Group>
      )}
      {attachment && (
        <Badge mb="xs" variant="light" color="gray" tt="none" rightSection={<IconX size={12} className="clickable" onClick={() => setAttachment(undefined)} />}>
          {attachment.name}
        </Badge>
      )}
      <Group gap="xs" align="flex-end" wrap="nowrap">
        {withAttachments && (
          <Menu position="top-start">
            <Menu.Target>
              <ActionIcon variant="default" size={36} aria-label="Joindre un élément">
                <IconPaperclip size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Joindre un élément fictif</Menu.Label>
              {fakeAttachments.map((a) => {
                const Icon = attachmentIcon[a.kind];
                return (
                  <Menu.Item key={a.name} leftSection={<Icon size={16} />} onClick={() => setAttachment(a)}>
                    {a.name}
                  </Menu.Item>
                );
              })}
            </Menu.Dropdown>
          </Menu>
        )}
        <Textarea
          style={{ flex: 1 }}
          autosize
          minRows={1}
          maxRows={5}
          placeholder={placeholder}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <ActionIcon size={36} onClick={() => send()} disabled={disabled || (!text.trim() && !attachment)} aria-label="Envoyer">
          <IconSend size={18} />
        </ActionIcon>
      </Group>
    </Box>
  );
}
