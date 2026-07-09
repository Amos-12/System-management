## Objectif

Passer des catégories figées (enum `product_category`) à des catégories **dynamiques** gérées par l'admin, propagées aux produits, ventes et autorisations vendeur. Chaque nouvelle catégorie est visible en base mais **non autorisée par défaut** aux vendeurs — l'admin l'assigne manuellement.

## Approche

Utiliser la table `categories` déjà présente comme source de vérité. Ajouter une colonne `category_id uuid` en parallèle de l'enum `category` existant sur toutes les tables concernées, migrer les données, puis basculer le code. L'enum reste en base pour éviter une migration destructive, mais devient déprécié et non utilisé côté UI.

### Migration SQL (une seule migration)

1. `categories` : garantir colonnes `id`, `company_id`, `name`, `slug`, `is_active`, `created_by`, `created_at`. RLS multi-tenant + policies admin (insert/update/delete) + read pour utilisateurs de la même compagnie.
2. Seed : pour chaque `company_id` distinct, insérer les 12 valeurs de l'enum comme catégories initiales (slug = valeur enum).
3. Ajouter `category_id uuid REFERENCES categories(id)` sur : `products`, `sale_items`, `seller_authorized_categories`, `sous_categories`, `specifications_modeles`.
4. Backfill : `UPDATE ... SET category_id = (SELECT id FROM categories WHERE slug = <table>.category::text AND company_id = <table>.company_id)`.
5. Rendre `category_id` NOT NULL sur `products` et `seller_authorized_categories` (les deux tables où c'est structurant).
6. Ajouter contrainte unique `(company_id, user_id, category_id)` sur `seller_authorized_categories` (en plus de l'existante sur enum).
7. Adapter la fonction `get_seller_authorized_categories` pour retourner `category_id uuid` en plus (nouvelle fonction `get_seller_authorized_category_ids`).

### UI / Code

- **Nouveau composant admin** `CategoryManagement.tsx` (dans Settings ou UserManagement) : liste + création / renommage / désactivation des catégories de la compagnie. CRUD sur `categories`.
- **Hook** `useCategories()` : charge les catégories actives de la compagnie via `useCompany()`.
- **ProductManagement** : le select de catégorie lit `useCategories()` au lieu de l'enum. À la création/édition, envoie `category_id` (et conserve `category` = slug pour compat).
- **UserManagementPanel** (assignation vendeur) : liste dynamique depuis `useCategories()`, insertion dans `seller_authorized_categories` avec `category_id` + `category` (slug).
- **SellerWorkflow** : le filtre de catégories utilise `category_id` via les `seller_authorized_categories` chargées.
- **InventoryManagement, StockAlerts, AdvancedReports, RestockPage, SaleDetailsDialog** : afficher `categories.name` via jointure (`.select('..., categories(name)')`) au lieu du label enum figé.

### Comportement "assigné manuellement"

- Aucun trigger d'auto-assignation à la création d'une catégorie.
- Dans l'UI d'assignation vendeur, les nouvelles catégories apparaissent, non cochées. L'admin coche pour autoriser.
- La logique existante `get_seller_authorized_categories` (retour vide = tout autorisé) est conservée mais côté UI on considère qu'un vendeur sans lignes voit tout — l'admin doit ajouter au moins une ligne pour restreindre. **À confirmer si tu préfères l'inverse** (défaut = rien autorisé).

## Fichiers touchés

- Migration : `supabase/migrations/*_dynamic_categories.sql`
- Nouveau : `src/components/Categories/CategoryManagement.tsx`, `src/hooks/useCategories.ts`
- Modifiés : `ProductManagement.tsx`, `UserManagementPanel.tsx`, `SellerWorkflow.tsx`, `InventoryManagement.tsx`, `StockAlerts.tsx`, `AdvancedReports.tsx`, `RestockPage.tsx`, `SaleDetailsDialog.tsx`, page admin pour exposer `CategoryManagement`.

## Points d'attention

- L'enum PG `product_category` reste (impossible à drop sans casser triggers/policies existantes) mais devient inutile côté UI. Les inserts continuent à écrire `category` (slug) pour compat des colonnes NOT NULL existantes.
- Le seeding par entreprise se base sur les 12 valeurs enum actuelles — cohérent avec les données existantes.
- Toute nouvelle catégorie créée par l'admin ne pourra pas être écrite dans la colonne enum `category` : les inserts produits devront progressivement basculer sur `category_id` uniquement. **Étape 2 (hors de ce plan) : rendre `products.category` nullable** une fois l'UI stabilisée.

Confirme ce plan pour que je lance la migration + le refactor.
