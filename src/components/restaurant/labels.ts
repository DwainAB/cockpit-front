import type { MetaMap } from '@/core';
import type { CategoryKind, OrderStatus, UserRole } from '@/api/yumco';

export const orderStatus: MetaMap<OrderStatus> = {
  pending: { label: 'En attente', tone: 'warning' },
  preparing: { label: 'En préparation', tone: 'info' },
  ready: { label: 'Prête', tone: 'accent' },
  completed: { label: 'Terminée', tone: 'success' },
  cancelled: { label: 'Annulée', tone: 'danger' },
};
/** Commandes « en cours » : pas encore terminées ni annulées. */
export const ONGOING: OrderStatus[] = ['pending', 'preparing', 'ready'];

export const orderType: Record<string, string> = { pickup: 'À emporter', delivery: 'Livraison', onsite: 'Sur place' };
export const paymentStatus: MetaMap<'paid' | 'unpaid'> = {
  paid: { label: 'Payée', tone: 'success' },
  unpaid: { label: 'Non payée', tone: 'muted' },
};

export const userRole: Record<UserRole, string> = { owner: 'Propriétaire', manager: 'Gérant', staff: 'Employé' };

export const categoryKind: Record<CategoryKind, string> = {
  starter: 'Entrées',
  main: 'Plats',
  side: 'Accompagnements',
  dessert: 'Desserts',
  drink: 'Boissons',
  other: 'Autre',
};

/** Suggestions d'allergènes (les 14 de l'UE), au format des produits déjà saisis dans Yumco (« lait », « oeuf »). Saisie libre possible. */
export const ALLERGENS = ['gluten', 'crustacés', 'oeuf', 'poisson', 'arachide', 'soja', 'lait', 'fruits à coque', 'céleri', 'moutarde', 'sésame', 'sulfites', 'lupin', 'mollusques'];
