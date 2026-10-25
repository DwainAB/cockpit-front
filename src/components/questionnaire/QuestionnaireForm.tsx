import { Alert, Autocomplete, Badge, Button, Card, Checkbox, Collapse, Group, NumberInput, SegmentedControl, SimpleGrid, Stack, Switch, Text, TextInput, Textarea, ThemeIcon } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconSparkles } from '@tabler/icons-react';
import { useState, type ReactNode } from 'react';
import { dayKeys, dayLabels, emptyHours, restaurantTypes, type QuestionnaireAnswers, type UploadedFile } from '@/core';
import { BrandingField } from './BrandingField';
import { DeliveryZonesField } from './DeliveryZonesField';
import { FormulasField } from './FormulasField';
import { HoursField } from './HoursField';
import { ImagesField, LogoField } from './ImagesField';

/** Questions oui / non : `null` tant qu'elles n'ont pas de réponse. */
type Values = Omit<QuestionnaireAnswers, 'takesReservations' | 'onlineOrdering' | 'wantsOnlinePayment' | 'onsite'> & {
  takesReservations: boolean | null;
  onlineOrdering: boolean | null;
  wantsOnlinePayment: boolean | null;
  onsite: { enabled: boolean | null; tables: number; seatsPerTable: number };
};
type YesNoField = 'takesReservations' | 'onlineOrdering' | 'wantsOnlinePayment' | 'onsite.enabled';

interface Props {
  onSubmit: (answers: QuestionnaireAnswers) => Promise<void>;
  uploadImage: (file: File) => Promise<UploadedFile>;
  submitLabel: string;
  initialName?: string;
  initialManagerEmail?: string;
  /** Au-dessus du formulaire (choix de l'offre dans le cockpit). */
  header?: ReactNode;
}

const emailRe = /^\S+@\S+\.\S+$/;
const hexRe = /^#[0-9a-fA-F]{6}$/;
const phoneError = (v: string) => (v.replace(/\D/g, '').length < 9 ? 'Numéro de téléphone invalide' : null);
const required = (label: string) => (v: string) => (!v.trim() ? label : null);
const yesNoError = (v: boolean | null) => (v === null ? 'Choisissez une réponse' : null);

/**
 * Questionnaire de création de site, rempli par le restaurateur (lien reçu par e-mail) ou depuis le cockpit.
 * Toutes les informations nécessaires au restaurant y sont : à l'envoi, le restaurant est créé et configuré dans Yumco.
 */
export function QuestionnaireForm({ onSubmit, uploadImage, submitLabel, initialName = '', initialManagerEmail = '', header }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<Values>({
    initialValues: {
      name: initialName,
      restaurantType: '',
      address: { street: '', postalCode: '', city: '', country: 'France' },
      phone: '',
      email: '',
      googleReviewUrl: '',
      manager: { firstName: '', lastName: '', email: initialManagerEmail, phone: '' },
      hours: emptyHours(),
      onsite: { enabled: null, tables: 0, seatsPerTable: 4 },
      takesReservations: null,
      onlineOrdering: null,
      pickup: true,
      preparationTime: 20,
      delivery: { enabled: false, lunch: true, dinner: true, maxKm: 5, zones: [{ fromKm: 0, toKm: 3, fee: 2, freeFrom: null }] },
      menu: { aLaCarte: true, allYouCanEat: false, formulas: [] },
      wantsOnlinePayment: null,
      customRequests: '',
      logo: null,
      images: [],
      branding: { colors: [], font: null },
    },
    validate: {
      name: (v) => (v.trim().length < 2 ? 'Indiquez le nom du restaurant' : null),
      restaurantType: required('Indiquez le type de restaurant'),
      phone: phoneError,
      email: (v) => (!emailRe.test(v.trim()) ? 'Adresse e-mail invalide' : null),
      googleReviewUrl: (v) => (v.trim() && !/^https:\/\/\S+$/.test(v.trim()) ? 'Lien invalide (il doit commencer par https://)' : null),
      address: {
        street: required('Indiquez le numéro et la rue'),
        postalCode: (v) => (v.trim().length < 4 ? 'Code postal invalide' : null),
        city: required('Indiquez la ville'),
        country: required('Indiquez le pays'),
      },
      manager: {
        firstName: required('Indiquez le prénom'),
        lastName: required('Indiquez le nom'),
        email: (v) => (!emailRe.test(v.trim()) ? 'Adresse e-mail invalide' : null),
        phone: phoneError,
      },
      takesReservations: yesNoError,
      onlineOrdering: yesNoError,
      wantsOnlinePayment: yesNoError,
      onsite: { enabled: yesNoError },
      hours: (h) => {
        for (const d of dayKeys) {
          const day = h[d];
          if (day.closed) continue;
          if (!day.lunch && !day.dinner) return `${dayLabels[d]} : cochez le midi, le soir, ou indiquez « Fermé ».`;
          if ([day.lunch, day.dinner].some((s) => s && (!s.open || !s.close || s.open === s.close))) return `${dayLabels[d]} : vérifiez les heures d’ouverture et de fermeture.`;
        }
        return dayKeys.every((d) => h[d].closed) ? 'Le restaurant doit être ouvert au moins un jour.' : null;
      },
      pickup: (v, values) => (values.onlineOrdering && !v && !values.delivery.enabled ? 'Choisissez la vente à emporter, la livraison, ou les deux' : null),
      delivery: {
        lunch: (v, values) => (values.onlineOrdering && values.delivery.enabled && !v && !values.delivery.dinner ? 'Choisissez le midi, le soir, ou les deux' : null),
        zones: (zones, values) => {
          if (!values.onlineOrdering || !values.delivery.enabled) return null;
          if (!zones.length) return 'Ajoutez au moins une zone de livraison';
          if (zones.some((z) => z.toKm <= z.fromKm)) return 'Chaque zone doit finir plus loin qu’elle ne commence';
          if (zones.some((z) => z.toKm > values.delivery.maxKm)) return `Une zone dépasse la distance maximale (${values.delivery.maxKm} km)`;
          if (zones.some((z) => z.freeFrom !== null && z.fee === 0)) return 'Une zone déjà gratuite n’a pas besoin de seuil de gratuité';
          const sorted = [...zones].sort((a, b) => a.fromKm - b.fromKm);
          return sorted.some((z, i) => i > 0 && z.fromKm <= sorted[i - 1].toKm) ? 'Deux zones ne peuvent pas se chevaucher ni se toucher (ex. 0–3 km puis 4–6 km)' : null;
        },
      },
      menu: {
        aLaCarte: (v, values) => (!v && !values.menu.allYouCanEat ? 'Choisissez « à la carte », « à volonté », ou les deux' : null),
        formulas: (formulas, values) => {
          if (!values.menu.allYouCanEat) return null;
          if (!formulas.length) return 'Ajoutez au moins une formule';
          return formulas.some((f) => !f.name.trim() || !(f.price > 0)) ? 'Indiquez le nom et le prix de chaque formule' : null;
        },
      },
      images: (imgs) => (imgs.some((i) => !i.description.trim()) ? 'Décrivez chaque image' : null),
      branding: { colors: (cs) => (cs.some((c) => c && !hexRe.test(c)) ? 'Couleur invalide (format #RRGGBB)' : null) },
    },
  });

  const v = form.values;
  const delivers = v.onlineOrdering === true && v.delivery.enabled;

  const submit = form.onSubmit(
    async (values) => {
      setSubmitting(true);
      const trim = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).map(([k, s]) => [k, String(s).trim()])) as T;
      const ordering = values.onlineOrdering!;
      await onSubmit({
        ...values,
        name: values.name.trim(),
        restaurantType: values.restaurantType.trim(),
        address: trim(values.address),
        phone: values.phone.trim(),
        email: values.email.trim(),
        googleReviewUrl: values.googleReviewUrl.trim(),
        manager: trim(values.manager),
        onsite: { enabled: values.onsite.enabled!, tables: values.onsite.enabled ? Number(values.onsite.tables) || 0 : 0, seatsPerTable: Number(values.onsite.seatsPerTable) || 4 },
        takesReservations: values.takesReservations!,
        onlineOrdering: ordering,
        pickup: ordering && values.pickup,
        preparationTime: Number(values.preparationTime) || 20,
        delivery: ordering && values.delivery.enabled ? { ...values.delivery, maxKm: Number(values.delivery.maxKm) } : { ...values.delivery, enabled: false, zones: [] },
        menu: values.menu.allYouCanEat ? { ...values.menu, formulas: values.menu.formulas.map((f) => ({ name: f.name.trim(), price: f.price })) } : { ...values.menu, formulas: [] },
        wantsOnlinePayment: values.wantsOnlinePayment!,
        customRequests: values.customRequests.trim(),
        images: values.images.map((i) => ({ ...i, description: i.description.trim() })),
        branding: { colors: values.branding.colors.filter((c) => hexRe.test(c)), font: values.branding.font },
      })
        .catch(() => undefined)
        .finally(() => setSubmitting(false));
    },
    () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  );

  const yesNo = (field: YesNoField, label: string, hint: string) => {
    const value = field === 'onsite.enabled' ? v.onsite.enabled : v[field];
    return (
      <div>
        <Text size="sm" fw={500}>
          {label} <Text span c="red">*</Text>
        </Text>
        <Text size="xs" c="dimmed" mb={6}>
          {hint}
        </Text>
        <SegmentedControl
          data={[
            { value: 'yes', label: 'Oui' },
            { value: 'no', label: 'Non' },
          ]}
          value={value === null ? '' : value ? 'yes' : 'no'}
          onChange={(answer) => form.setFieldValue(field, answer === 'yes')}
        />
        <FieldError error={form.errors[field]} />
      </div>
    );
  };

  const hasErrors = Object.keys(form.errors).length > 0;
  let n = 0;
  const next = () => ++n;

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="lg">
        {header}
        {hasErrors && (
          <Alert color="red" variant="light">
            Certains champs sont à compléter ou à corriger.
          </Alert>
        )}

        <Section number={next()} title="Le restaurant">
          <Stack>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label="Nom du restaurant" withAsterisk {...form.getInputProps('name')} />
              <Autocomplete label="Type de restaurant" placeholder="Italien, asiatique, bistrot…" withAsterisk data={restaurantTypes} limit={8} {...form.getInputProps('restaurantType')} />
              <TextInput label="Téléphone du restaurant" description="Affiché sur le site" type="tel" withAsterisk {...form.getInputProps('phone')} />
              <TextInput label="E-mail du restaurant" description="Affiché sur le site, reçoit les messages des clients" type="email" withAsterisk {...form.getInputProps('email')} />
            </SimpleGrid>
            <TextInput
              label="Lien vers votre fiche Google (avis)"
              description="Facultatif. Après chaque commande, nous invitons vos clients à laisser un avis à cette adresse."
              placeholder="https://g.page/r/…/review"
              {...form.getInputProps('googleReviewUrl')}
            />
          </Stack>
        </Section>

        <Section number={next()} title="Adresse">
          <Stack>
            <TextInput label="Numéro et rue" placeholder="12 rue de la Paix" withAsterisk {...form.getInputProps('address.street')} />
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <TextInput label="Code postal" withAsterisk {...form.getInputProps('address.postalCode')} />
              <TextInput label="Ville" withAsterisk {...form.getInputProps('address.city')} />
              <TextInput label="Pays" withAsterisk {...form.getInputProps('address.country')} />
            </SimpleGrid>
          </Stack>
        </Section>

        <Section number={next()} title="Le gérant" note="Le gérant reçoit ses accès à l’application Yumco à cette adresse dès que le site est en ligne.">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Prénom" withAsterisk {...form.getInputProps('manager.firstName')} />
            <TextInput label="Nom" withAsterisk {...form.getInputProps('manager.lastName')} />
            <TextInput label="E-mail" description="Servira d’identifiant de connexion" type="email" withAsterisk {...form.getInputProps('manager.email')} />
            <TextInput label="Téléphone" type="tel" withAsterisk {...form.getInputProps('manager.phone')} />
          </SimpleGrid>
        </Section>

        <Section number={next()} title="Horaires d’ouverture">
          <HoursField value={v.hours} onChange={(h) => form.setFieldValue('hours', h)} error={form.errors.hours as string | undefined} />
        </Section>

        <Section number={next()} title="Services">
          <Stack gap="lg">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              {yesNo('onsite.enabled', 'Servez-vous sur place ?', 'Vos clients peuvent manger au restaurant.')}
              {yesNo('takesReservations', 'Prenez-vous des réservations ?', 'Un bouton « Réserver » sera ajouté au site.')}
            </SimpleGrid>
            <Collapse in={v.onsite.enabled === true}>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <NumberInput
                  label="Nombre de tables"
                  description="Nous créons les tables et leurs QR codes. 0 : vous les ajouterez dans l’application."
                  min={0}
                  max={200}
                  allowDecimal={false}
                  {...form.getInputProps('onsite.tables')}
                />
                <NumberInput label="Places par table" description="Valeur par défaut, modifiable table par table" min={1} max={30} allowDecimal={false} {...form.getInputProps('onsite.seatsPerTable')} />
              </SimpleGrid>
            </Collapse>
            {yesNo('onlineOrdering', 'Proposez-vous la commande en ligne ?', 'Un bouton « Commander » sera ajouté au site : à emporter et/ou en livraison.')}
          </Stack>
        </Section>

        {v.onlineOrdering === true && (
          <Section number={next()} title="Commande en ligne">
            <Stack gap="lg">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                <NumberInput
                  label="Temps de préparation moyen (minutes)"
                  description="Délai annoncé au client pour une commande"
                  min={5}
                  max={180}
                  allowDecimal={false}
                  withAsterisk
                  {...form.getInputProps('preparationTime')}
                />
                <div>
                  <Switch label="Vente à emporter" description="Le client vient chercher sa commande" {...form.getInputProps('pickup', { type: 'checkbox' })} />
                  <Switch mt="md" label="Livraison" description="Vous livrez vos clients" {...form.getInputProps('delivery.enabled', { type: 'checkbox' })} />
                  <FieldError error={form.errors.pickup} />
                </div>
              </SimpleGrid>

              <Collapse in={delivers}>
                <Stack gap="md" p="md" style={{ background: 'var(--app-subtle, rgba(0,0,0,0.02))', borderRadius: 8 }}>
                  <Group gap="xl" align="flex-start" wrap="wrap">
                    <div>
                      <Text size="sm" fw={500} mb={6}>
                        Quand livrez-vous ?
                      </Text>
                      <Group gap="md">
                        <Checkbox label="Le midi" {...form.getInputProps('delivery.lunch', { type: 'checkbox' })} />
                        <Checkbox label="Le soir" {...form.getInputProps('delivery.dinner', { type: 'checkbox' })} />
                      </Group>
                      <FieldError error={form.errors['delivery.lunch']} />
                    </div>
                    <NumberInput w={220} label="Distance maximale (km)" description="Au-delà, pas de livraison" min={1} max={100} allowDecimal={false} {...form.getInputProps('delivery.maxKm')} />
                  </Group>
                  <div>
                    <Text size="sm" fw={500} mb={6}>
                      Frais de livraison par zone
                    </Text>
                    <DeliveryZonesField
                      value={v.delivery.zones}
                      onChange={(zones) => form.setFieldValue('delivery.zones', zones)}
                      maxKm={Number(v.delivery.maxKm) || 1}
                      error={form.errors['delivery.zones'] as string | undefined}
                    />
                  </div>
                </Stack>
              </Collapse>
            </Stack>
          </Section>
        )}

        <Section number={next()} title="La carte">
          <Stack gap="sm">
            <Group gap="xl">
              <Checkbox label="À la carte" {...form.getInputProps('menu.aLaCarte', { type: 'checkbox' })} />
              <Checkbox label="À volonté" {...form.getInputProps('menu.allYouCanEat', { type: 'checkbox' })} />
            </Group>
            <FieldError error={form.errors['menu.aLaCarte']} />
            <Collapse in={v.menu.allYouCanEat}>
              <FormulasField value={v.menu.formulas} onChange={(f) => form.setFieldValue('menu.formulas', f)} error={form.errors['menu.formulas'] as string | undefined} />
            </Collapse>
            <Text size="xs" c="dimmed">
              Vos plats s’ajoutent ensuite dans l’application Yumco.
            </Text>
          </Stack>
        </Section>

        <Section number={next()} title="Paiement">
          {yesNo(
            'wantsOnlinePayment',
            'Souhaitez-vous le paiement par carte en ligne ?',
            'Au lancement, vos clients paient sur place ou à la réception de leur commande. Nous vous contacterons pour activer le paiement en ligne.',
          )}
        </Section>

        <Section number={next()} title="Logo" optional>
          <LogoField value={v.logo} onChange={(logo) => form.setFieldValue('logo', logo)} upload={uploadImage} />
        </Section>

        <Section number={next()} title="Images pour le site" optional note="Vous n’avez pas d’images ? Aucun problème, nous nous en chargeons.">
          <Text size="sm" c="dimmed" mb="sm">
            Ajoutez les photos que vous souhaitez voir sur le site (plats, salle, terrasse, équipe…) et indiquez ce que chacune représente.
          </Text>
          <ImagesField value={v.images} onChange={(imgs) => form.setFieldValue('images', imgs)} upload={uploadImage} error={form.errors.images as string | undefined} />
        </Section>

        <Section number={next()} title="Charte graphique" optional note="Rien à indiquer ? Pas de souci, nous nous occupons des couleurs et de la typographie.">
          <BrandingField value={v.branding} onChange={(b) => form.setFieldValue('branding', b)} name={v.name} />
          <FieldError error={form.errors['branding.colors']} />
        </Section>

        <Section number={next()} title="Demandes particulières" optional>
          <Textarea
            placeholder="Une ambiance, une section à mettre en avant, un site qui vous plaît… Dites-nous tout."
            autosize
            minRows={4}
            maxLength={4000}
            {...form.getInputProps('customRequests')}
          />
        </Section>

        <Group justify="flex-end">
          <Button type="submit" size="md" loading={submitting}>
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function FieldError({ error }: { error: ReactNode }) {
  if (!error) return null;
  return (
    <Text size="xs" c="red" mt={4}>
      {error}
    </Text>
  );
}

function Section({ number, title, optional, note, children }: { number: number; title: string; optional?: boolean; note?: string; children: ReactNode }) {
  return (
    <Card>
      <Group gap="sm" mb="md" wrap="nowrap">
        <ThemeIcon radius="xl" size={28} variant="light" color="night">
          <Text size="sm" fw={700}>
            {number}
          </Text>
        </ThemeIcon>
        <Text fw={650} size="lg">
          {title}
        </Text>
        {optional && (
          <Badge variant="light" color="gray" tt="none">
            Facultatif
          </Badge>
        )}
      </Group>
      {note && (
        <Group gap={8} mb="md" p="sm" wrap="nowrap" style={{ background: 'var(--mantine-color-sage-0)', borderRadius: 8 }}>
          <IconSparkles size={16} color="var(--mantine-color-sage-7)" style={{ flexShrink: 0 }} />
          <Text size="sm" c="sage.9">
            {note}
          </Text>
        </Group>
      )}
      {children}
    </Card>
  );
}
