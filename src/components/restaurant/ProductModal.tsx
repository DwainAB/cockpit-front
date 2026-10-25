import { Button, FileInput, Group, Image, Modal, NumberInput, Select, SimpleGrid, Stack, Switch, TagsInput, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPhoto } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { yumcoApi, type YumcoCategory, type YumcoProduct } from '@/api/yumco';
import { notifySuccess } from '@/lib/notify';
import { ALLERGENS } from './labels';

interface Values {
  name: string;
  price: number | string;
  description: string;
  categoryId: string | null;
  isAvailable: boolean;
  availableOnline: boolean;
  availableOnsite: boolean;
  allergens: string[];
  image: File | null;
}

interface Props {
  restaurantId: string;
  /** Produit à modifier ; `null` : nouveau produit. */
  product: YumcoProduct | null;
  categories: YumcoCategory[];
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/** Ajout ou modification d'un produit de la carte (enregistré dans Yumco). */
export function ProductModal({ restaurantId, product, categories, opened, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const form = useForm<Values>({
    initialValues: { name: '', price: '', description: '', categoryId: null, isAvailable: true, availableOnline: true, availableOnsite: true, allergens: [], image: null },
    validate: {
      name: (v) => (v.trim() ? null : 'Nom requis'),
      price: (v) => (typeof v === 'number' && v >= 0 ? null : 'Prix requis'),
    },
  });

  useEffect(() => {
    if (!opened) return;
    form.setValues(
      product
        ? {
            name: product.name,
            price: Number(product.price),
            description: product.description ?? '',
            categoryId: product.category ? String(product.category.id) : null,
            isAvailable: product.is_available,
            availableOnline: product.available_online,
            availableOnsite: product.available_onsite,
            allergens: product.allergens,
            image: null,
          }
        : { name: '', price: '', description: '', categoryId: null, isAvailable: true, availableOnline: true, availableOnsite: true, allergens: [], image: null },
    );
    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, product]);

  const submit = form.onSubmit(async (v) => {
    const input = {
      name: v.name.trim(),
      price: Number(v.price),
      description: v.description.trim(),
      categoryId: v.categoryId ? Number(v.categoryId) : null,
      isAvailable: v.isAvailable,
      availableOnline: v.availableOnline,
      availableOnsite: v.availableOnsite,
      allergens: v.allergens,
      image: v.image,
    };
    setSaving(true);
    try {
      if (product) await yumcoApi.updateProduct(restaurantId, product.id, input);
      else await yumcoApi.createProduct(restaurantId, input);
      notifySuccess(product ? 'Produit modifié' : 'Produit ajouté', input.name);
      onSaved();
      onClose();
    } catch {
      // Erreur déjà signalée par une notification.
    } finally {
      setSaving(false);
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title={product ? `Modifier « ${product.name} »` : 'Nouveau produit'} size="lg" centered>
      <form onSubmit={submit}>
        <Stack gap="sm">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Nom" required data-autofocus {...form.getInputProps('name')} />
            <NumberInput label="Prix (€)" required min={0} decimalScale={2} fixedDecimalScale decimalSeparator="," step={0.5} {...form.getInputProps('price')} />
          </SimpleGrid>
          <Select
            label="Catégorie"
            placeholder="Sans catégorie"
            clearable
            data={categories.map((c) => ({ value: String(c.id), label: c.name }))}
            {...form.getInputProps('categoryId')}
          />
          <Textarea label="Description" autosize minRows={2} maxRows={5} {...form.getInputProps('description')} />
          <TagsInput label="Allergènes" placeholder="Choisir ou saisir" data={ALLERGENS} clearable {...form.getInputProps('allergens')} />
          <Group align="flex-end" wrap="nowrap">
            <FileInput
              style={{ flex: 1 }}
              label={product?.image_url ? 'Remplacer la photo' : 'Photo'}
              placeholder="PNG, JPEG ou WebP"
              accept="image/png,image/jpeg,image/webp"
              leftSection={<IconPhoto size={16} />}
              clearable
              {...form.getInputProps('image')}
            />
            {product?.image_url && !form.values.image && <Image src={product.image_url} alt="" w={56} h={56} radius="sm" fit="cover" />}
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 3 }} mt={4}>
            <Switch label="Disponible" {...form.getInputProps('isAvailable', { type: 'checkbox' })} />
            <Switch label="En ligne" {...form.getInputProps('availableOnline', { type: 'checkbox' })} />
            <Switch label="Sur place" {...form.getInputProps('availableOnsite', { type: 'checkbox' })} />
          </SimpleGrid>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" loading={saving}>
              {product ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
