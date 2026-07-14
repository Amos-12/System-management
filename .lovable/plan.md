# Plan des mises à jour

## 1. Filtres de période sur le Dashboard Admin

**Composant** : `src/components/Dashboard/AdminDashboardCharts.tsx` (+ nouveau `src/components/Dashboard/PeriodFilter.tsx`).

- Ajouter un sélecteur de période en haut du dashboard avec les presets : Aujourd'hui, Hier, Cette semaine (lun→dim), Ce mois, Cette année, Personnalisée (2 date pickers shadcn).
- Créer un état `{ start: Date, end: Date, preset: string }` remonté au dashboard.
- Refactor : toutes les requêtes internes (KPIs, graphiques ventes/produits/vendeurs, tableaux) prennent `start`/`end` en paramètres au lieu de `daysBack` codé en dur. Un `useEffect` sur `[start, end]` déclenche le rechargement.
- Semaine = lundi→dimanche (locale FR, cohérent avec la mémoire projet).

## 2. Correction des statistiques de vente

**Composant** : `src/components/Sales/SalesManagement.tsx`.

Cause : `.from('sales').select('*')` sans pagination — Supabase renvoie max 1000 lignes, d'où `sales.length` bloqué à 1000 et un `totalRevenue` sous-évalué.

Correctifs :
- Remplacer le calcul par des agrégats serveur :
  - `count` total : `supabase.from('sales').select('id', { count: 'exact', head: true })`.
  - `totalRevenue` : requête RPC (nouvelle fonction SQL `get_sales_totals(_company_id, _start, _end)`) qui retourne `count`, `sum(total_amount)`, `sum` du jour.
- La table (historique) reste paginée (page size 50, boutons précédent/suivant via `.range()`), plus de chargement N+1 des vendeurs → remplacer par un `IN` unique sur `profiles`.
- Réutiliser le même `PeriodFilter` que le dashboard pour filtrer l'historique.

## 3. Réparation du module Catégories

**Fichiers** : `src/components/Categories/CategoryManagement.tsx`, `src/hooks/useCompanyCategories.ts`, migration SQL.

Problèmes identifiés :
- Le `useCompanyCategories` ne filtre pas par `company_id` → si RLS empêche la lecture cross-tenant, la liste apparaît vide selon le contexte.
- L'insert dans `CategoryManagement.save()` peut échouer si `company_id` du profil est `null` (aucun message clair).
- Les catégories seed (enum legacy) doivent être verrouillées : ni suppression ni renommage du slug.

Correctifs :
- Ajouter `company_id` explicite dans le SELECT et l'INSERT (via `useCompany`/profil).
- Afficher les erreurs Supabase brutes dans le toast pour diagnostic + logs console.
- Marquer les catégories dont `slug ∈ ENUM_CATEGORY_SLUGS` comme *legacy* : badge "Système", bouton Supprimer masqué, champ nom en lecture seule dans la modale d'édition (seuls `ordre`, `is_active`, description restent modifiables).
- Vérifier la policy RLS `INSERT` sur `categories` : ajouter si manquante `WITH CHECK (company_id = get_user_company_id(auth.uid()))`.

## 4. Nouveau module Dépenses

### 4.1 Base de données (migration)

Nouvelle table `public.expenses` :
- `id`, `company_id`, `user_id` (auteur), `libelle`, `description`, `amount numeric`, `currency` (HTG/USD, défaut HTG), `expense_date date`, `category_id uuid NULL` (FK vers nouvelle table `expense_categories`), `created_at`, `updated_at`.
- Table `expense_categories` : `id`, `company_id`, `nom`, `is_active`.
- GRANTs `authenticated` + `service_role`, RLS activée.
- Policies :
  - SELECT : admin voit tout (`has_role(uid,'admin')`), vendeur voit uniquement `user_id = auth.uid()`, tous filtrés par `company_id`.
  - INSERT : `user_id = auth.uid()` et `company_id = get_user_company_id(auth.uid())`.
  - UPDATE / DELETE : réservés à `has_role(uid,'admin')`.
- Trigger `update_updated_at_column`.

### 4.2 UI

- Nouvelle page `src/pages/ExpensesPage.tsx` route `/expenses`.
- Composants : `ExpensesList`, `ExpenseFormDialog`, `ExpenseCategoryManager` (admin only), `ExpensesStats`.
- Formulaire : libellé*, montant*, date*, catégorie, description.
- Table avec filtres période (réutilise `PeriodFilter`) + recherche.
- Boutons Modifier/Supprimer visibles seulement si admin.
- Entrée de menu "Dépenses" dans `ResponsiveDashboardLayout` (visible admin + vendeur).

### 4.3 Statistiques

- Dans le dashboard admin, nouvelle carte "Dépenses (période)" et "Bénéfice net = Ventes − Dépenses" utilisant le même `PeriodFilter`.
- Dans le dashboard vendeur, carte "Mes dépenses (aujourd'hui)".
- Calculs côté serveur via une seconde RPC `get_expenses_totals(_company_id, _start, _end, _user_id NULL)`.

## 5. Sécurisation sessions & routes

### 5.1 Composants de garde

Nouveaux fichiers :
- `src/components/Auth/ProtectedRoute.tsx` : redirige vers `/auth` si non connecté ; supporte `allowedRoles?: ('admin'|'seller')[]` et redirige vers `/` si le rôle ne correspond pas.
- `src/components/Auth/RoleGuard.tsx` : wrap conditionnel autour d'actions sensibles.

### 5.2 Câblage dans `App.tsx`

- Emballer `/admin`, `/inventory`, `/expenses` avec `<ProtectedRoute allowedRoles={['admin']}>`.
- Emballer `/seller` avec `<ProtectedRoute allowedRoles={['seller','admin']}>`.
- `/profile`, `/expenses` : `ProtectedRoute` sans restriction de rôle.
- Ajouter `<Route path="/reset-password">` si absent (préparation reset).

### 5.3 Auth resiliency

- Dans `useAuth`, ajouter un interval (5 min) qui appelle `supabase.auth.getUser()` ; en cas d'erreur/session expirée → `signOut()` + redirect `/auth`.
- Listener `onAuthStateChange` : sur `TOKEN_REFRESHED` conserver, sur `SIGNED_OUT` forcer redirection.
- Ajouter un wrapper `apiCall` (déjà présent via `resilientFetch`) qui, sur 401/403, déclenche `signOut()` et affiche un toast "Session expirée".

### 5.4 Contrôles serveur

- Vérifier que chaque table sensible (expenses, sales, products, categories) a des policies `WITH CHECK` sur `company_id` + rôle.
- Les edge functions (`delete-sale`, `process-sale`, futures `delete-expense`) revalident le rôle via `has_role` avant toute mutation.

## Détails techniques

```text
Ordre d'exécution recommandé :
  1. Migration SQL (expenses + expense_categories + RPCs get_sales_totals / get_expenses_totals + policy fix categories)
  2. PeriodFilter + refactor AdminDashboardCharts + SalesManagement
  3. Fix CategoryManagement (company_id + legacy lock)
  4. Module Dépenses (page + composants + intégration dashboards)
  5. ProtectedRoute + câblage App.tsx + auth resiliency
```

Points d'attention :
- `sales.total_amount` est déjà TTC (mémoire projet) → aucune reconstitution manuelle.
- Toutes nouvelles fonctions SQL : `SECURITY DEFINER` + `SET search_path = public`.
- Multi-tenant : toujours filtrer par `company_id = get_user_company_id(auth.uid())`.
- Ne pas toucher aux migrations existantes ni aux edge functions déjà déployées sauf ajout.
