/**
 * Gestion d'un restaurant dans Yumco (carte, utilisateurs, commandes), via le backend du cockpit
 * qui appelle l'API Yumco avec son compte admin. Données lues à la demande : elles ne sont pas dans le store.
 */
import { notifyError } from '@/lib/notify';
import { ApiError, request } from './http';
import { HandledApiError } from './index';

export type CategoryKind = 'main' | 'starter' | 'drink' | 'side' | 'dessert' | 'other';
export type UserRole = 'owner' | 'manager' | 'staff';

export interface YumcoCategory {
  id: number;
  name: string;
  kind: CategoryKind;
}

export interface YumcoProduct {
  id: number;
  name: string;
  description: string | null;
  /** Décimal en texte (« 12.50 »). */
  price: string;
  image_url: string | null;
  category: { id: number; name: string } | null;
  is_available: boolean;
  available_online: boolean;
  available_onsite: boolean;
  allergens: string[];
}

export interface YumcoMenu {
  id: number;
  name: string;
  price: string;
  is_available: boolean;
  categories: { id: number; name: string; options: { id: number; name: string; additional_price: string }[] }[];
}

export interface YumcoCatalog {
  categories: YumcoCategory[];
  products: YumcoProduct[];
  menus: YumcoMenu[];
}

export interface YumcoUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  created_at: string;
  is_admin: boolean;
  roles: { restaurant_id: number; type: string }[];
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface YumcoOrder {
  id: number;
  order_number: string;
  type: string;
  status: OrderStatus | null;
  payment_status: string | null;
  amount_total: number;
  delivery_fee: number;
  discount_amount: number;
  promo_code: string | null;
  comment: string | null;
  requested_time: string | null;
  completed_at: string | null;
  created_at: string;
  customer: { first_name: string; last_name: string; email: string | null; phone: string | null } | null;
  address: { street: string; city: string; postal_code: string } | null;
  items: { id: number; name: string; quantity: number; unit_price: number; subtotal: number; comment: string | null; parent_order_item_id: number | null }[];
}

export interface ProductInput {
  name: string;
  price: number;
  description: string;
  categoryId: number | null;
  isAvailable: boolean;
  availableOnline: boolean;
  availableOnsite: boolean;
  allergens: string[];
  image: File | null;
}

export interface UserInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
}

/** Erreur signalée par une notification, comme les autres actions du cockpit. */
async function run<T>(title: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const e = err instanceof ApiError ? err : new ApiError((err as Error).message, 0);
    notifyError(title, e.message);
    throw new HandledApiError(e.message, e.status, e.details);
  }
}

const productForm = (p: ProductInput) => {
  const form = new FormData();
  form.append('name', p.name);
  form.append('price', String(p.price));
  form.append('description', p.description);
  if (p.categoryId !== null) form.append('category_id', String(p.categoryId));
  form.append('is_available', String(p.isAvailable));
  form.append('available_online', String(p.availableOnline));
  form.append('available_onsite', String(p.availableOnsite));
  p.allergens.forEach((a) => form.append('allergens', a));
  if (p.image) form.append('image', p.image);
  return form;
};

const base = (restaurantId: string) => `/restaurants/${restaurantId}`;

export const yumcoApi = {
  catalog: (id: string) => request<YumcoCatalog>('GET', `${base(id)}/catalog`),
  createCategory: (id: string, name: string, kind: CategoryKind) =>
    run('Création de la catégorie impossible', () => request<YumcoCategory>('POST', `${base(id)}/categories`, { name, kind })),
  updateCategory: (id: string, categoryId: number, name: string, kind: CategoryKind) =>
    run('Modification de la catégorie impossible', () => request<YumcoCategory>('PUT', `${base(id)}/categories/${categoryId}`, { name, kind })),
  deleteCategory: (id: string, categoryId: number) =>
    run('Suppression de la catégorie impossible', () => request<null>('DELETE', `${base(id)}/categories/${categoryId}`)),
  createProduct: (id: string, p: ProductInput) => run('Ajout du produit impossible', () => request<YumcoProduct>('POST', `${base(id)}/products`, productForm(p))),
  updateProduct: (id: string, productId: number, p: ProductInput) =>
    run('Modification du produit impossible', () => request<YumcoProduct>('PUT', `${base(id)}/products/${productId}`, productForm(p))),
  deleteProduct: (id: string, productId: number) => run('Suppression du produit impossible', () => request<null>('DELETE', `${base(id)}/products/${productId}`)),

  users: (id: string) => request<YumcoUser[]>('GET', `${base(id)}/users`),
  createUser: (id: string, u: UserInput) => run('Ajout de l’utilisateur impossible', () => request<YumcoUser>('POST', `${base(id)}/users`, u)),
  updateUser: (id: string, userId: number, u: UserInput) => run('Modification de l’utilisateur impossible', () => request<YumcoUser>('PUT', `${base(id)}/users/${userId}`, u)),
  deleteUser: (id: string, userId: number) => run('Suppression de l’utilisateur impossible', () => request<null>('DELETE', `${base(id)}/users/${userId}`)),
  resetPassword: (id: string, userId: number) =>
    run('Envoi du nouveau mot de passe impossible', () => request<null>('POST', `${base(id)}/users/${userId}/reset-password`)),

  orders: (id: string, filters: { status?: OrderStatus; date_from?: string; date_to?: string }) => {
    const params = new URLSearchParams(Object.entries(filters).filter((e): e is [string, string] => Boolean(e[1])));
    return request<YumcoOrder[]>('GET', `${base(id)}/orders${params.size ? `?${params}` : ''}`);
  },
};
