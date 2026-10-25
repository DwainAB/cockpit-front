import { Badge, Box, Group, Image, SimpleGrid, Stack, Table, Text } from '@mantine/core';
import { IconForms } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { dayKeys, dayLabels, formatAddress, formatDayHours, serviceLines, subscriptionPlans, type QuestionnaireAnswers, type SubscriptionPlan } from '@/core';
import { assetUrl } from '@/api/http';
import { SectionCard } from '@/components/ui';

const handledByUs = (
  <Badge variant="light" color="sage" tt="none">
    Nous nous en chargeons
  </Badge>
);

/** Réponses du questionnaire, telles que l'agent design les utilisera. */
export function QuestionnaireSummary({ answers, plan }: { answers: QuestionnaireAnswers; plan?: SubscriptionPlan }) {
  return (
    <SectionCard title="Questionnaire" subtitle="Informations transmises pour la création du site" icon={<IconForms size={18} />}>
      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Row label="Type de restaurant">{answers.restaurantType}</Row>
          {plan && (
            <Row label="Offre">
              <Badge variant="light" color="blue" tt="none">
                {subscriptionPlans[plan].label}
              </Badge>
            </Row>
          )}
          <Row label="Adresse">{formatAddress(answers.address)}</Row>
          <Row label="Contact du restaurant">
            {answers.phone} · {answers.email}
          </Row>
          <Row label="Gérant">
            {[`${answers.manager.firstName} ${answers.manager.lastName}`.trim(), answers.manager.email, answers.manager.phone].filter(Boolean).join(' · ')}
          </Row>
          <Row label="Paiement en ligne">
            <Badge variant="light" color={answers.wantsOnlinePayment ? 'orange' : 'gray'} tt="none">
              {answers.wantsOnlinePayment ? 'Souhaité : compte Stripe à configurer' : 'Non souhaité'}
            </Badge>
          </Row>
        </SimpleGrid>

        <div>
          <Label>Services</Label>
          <Stack gap={2}>
            {serviceLines(answers).map((line) => (
              <Text key={line} size="sm">
                {line}
              </Text>
            ))}
            {answers.onsite.enabled && answers.onsite.tables > 0 && (
              <Text size="sm">
                {answers.onsite.tables} table(s) de {answers.onsite.seatsPerTable} places créée(s)
              </Text>
            )}
            {answers.onlineOrdering && <Text size="sm">Temps de préparation : {answers.preparationTime} min</Text>}
          </Stack>
        </div>

        <div>
          <Label>Horaires</Label>
          <Table withRowBorders={false} verticalSpacing={2} fz="sm">
            <Table.Tbody>
              {dayKeys.map((d) => (
                <Table.Tr key={d}>
                  <Table.Td w={110} c="dimmed">
                    {dayLabels[d]}
                  </Table.Td>
                  <Table.Td>{formatDayHours(answers.hours[d])}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <div>
            <Label>Logo</Label>
            {answers.logo ? <Image src={assetUrl(answers.logo.url)} alt="Logo" h={64} w="auto" fit="contain" /> : handledByUs}
          </div>
          <div>
            <Label>Charte graphique</Label>
            {answers.branding.colors.length || answers.branding.font ? (
              <Group gap="xs">
                {answers.branding.colors.map((c) => (
                  <Group key={c} gap={4}>
                    <Box w={18} h={18} style={{ borderRadius: 4, background: c, border: '1px solid var(--app-border)' }} />
                    <Text size="xs">{c}</Text>
                  </Group>
                ))}
                {answers.branding.font && (
                  <Badge variant="outline" color="gray" tt="none">
                    {answers.branding.font}
                  </Badge>
                )}
              </Group>
            ) : (
              handledByUs
            )}
          </div>
        </SimpleGrid>

        <div>
          <Label>Images</Label>
          {answers.images.length ? (
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
              {answers.images.map((img) => (
                <div key={img.file.id}>
                  <Image src={assetUrl(img.file.url)} alt={img.description} h={90} radius="sm" fit="cover" />
                  <Text size="xs" mt={4}>
                    {img.description}
                  </Text>
                </div>
              ))}
            </SimpleGrid>
          ) : (
            handledByUs
          )}
        </div>

        <div>
          <Label>Demandes particulières</Label>
          <Text size="sm" style={{ whiteSpace: 'pre-line' }} c={answers.customRequests ? undefined : 'dimmed'}>
            {answers.customRequests || 'Aucune'}
          </Text>
        </div>
      </Stack>
    </SectionCard>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={6}>
      {children}
    </Text>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <Text size="sm" component="div">
        {children}
      </Text>
    </div>
  );
}
