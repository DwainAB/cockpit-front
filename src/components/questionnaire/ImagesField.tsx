import { ActionIcon, Box, Group, Image, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { Dropzone, type FileWithPath } from '@mantine/dropzone';
import { IconPhoto, IconTrash, IconUpload } from '@tabler/icons-react';
import { useState } from 'react';
import type { QuestionnaireImage, UploadedFile } from '@/core';
import { assetUrl } from '@/api/http';

export const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 8 * 1024 * 1024;

type Upload = (file: File) => Promise<UploadedFile>;

/** Zone de dépôt commune au logo et aux images. */
function DropArea({ onFiles, multiple, loading, label }: { onFiles: (files: FileWithPath[]) => void; multiple: boolean; loading: boolean; label: string }) {
  return (
    <Dropzone onDrop={onFiles} accept={ACCEPTED} maxSize={MAX_SIZE} multiple={multiple} loading={loading} radius="md" p="md">
      <Group justify="center" gap="sm" mih={64} style={{ pointerEvents: 'none' }}>
        <Dropzone.Accept>
          <IconUpload size={26} />
        </Dropzone.Accept>
        <Dropzone.Idle>
          <IconPhoto size={26} color="#8a8999" />
        </Dropzone.Idle>
        <div>
          <Text size="sm">{label}</Text>
          <Text size="xs" c="dimmed">
            PNG, JPEG ou WebP — 8 Mo maximum par fichier
          </Text>
        </div>
      </Group>
    </Dropzone>
  );
}

export function LogoField({ value, onChange, upload }: { value: UploadedFile | null; onChange: (v: UploadedFile | null) => void; upload: Upload }) {
  const [loading, setLoading] = useState(false);
  if (value)
    return (
      <Group gap="md">
        <Box p="xs" style={{ border: '1px solid var(--app-border)', borderRadius: 10, background: '#fff' }}>
          <Image src={assetUrl(value.url)} alt="Logo" h={72} w="auto" fit="contain" />
        </Box>
        <Stack gap={2}>
          <Text size="sm">{value.name}</Text>
          <Text size="xs" c="red" className="clickable" onClick={() => onChange(null)}>
            Retirer le logo
          </Text>
        </Stack>
      </Group>
    );
  return (
    <DropArea
      multiple={false}
      loading={loading}
      label="Déposez votre logo ici, ou cliquez pour le choisir"
      onFiles={async ([file]) => {
        if (!file) return;
        setLoading(true);
        try {
          onChange(await upload(file));
        } catch {
          // Erreur déjà affichée.
        } finally {
          setLoading(false);
        }
      }}
    />
  );
}

export function ImagesField({ value, onChange, upload, error }: { value: QuestionnaireImage[]; onChange: (v: QuestionnaireImage[]) => void; upload: Upload; error?: string }) {
  const [loading, setLoading] = useState(false);

  const add = async (files: FileWithPath[]) => {
    setLoading(true);
    const added: QuestionnaireImage[] = [];
    for (const f of files) {
      try {
        added.push({ file: await upload(f), description: '' });
      } catch {
        // Erreur déjà affichée ; on continue avec les autres fichiers.
      }
    }
    onChange([...value, ...added]);
    setLoading(false);
  };

  return (
    <Stack gap="sm">
      {value.length > 0 && (
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="sm">
          {value.map((img, i) => (
            <Box key={img.file.id} p="xs" style={{ border: '1px solid var(--app-border)', borderRadius: 10, background: '#fff' }}>
              <Box pos="relative">
                <Image src={assetUrl(img.file.url)} alt={img.description || img.file.name} h={120} radius="sm" fit="cover" />
                <ActionIcon pos="absolute" top={6} right={6} size="sm" color="red" variant="white" aria-label="Retirer l’image" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Box>
              <TextInput
                mt="xs"
                size="xs"
                placeholder="Que représente cette image ? (ex. : la terrasse)"
                value={img.description}
                error={!img.description.trim() && error ? 'Décrivez cette image' : undefined}
                onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, description: e.currentTarget.value } : x)))}
              />
            </Box>
          ))}
        </SimpleGrid>
      )}
      <DropArea multiple loading={loading} label="Déposez vos images ici, ou cliquez pour les choisir" onFiles={add} />
    </Stack>
  );
}
