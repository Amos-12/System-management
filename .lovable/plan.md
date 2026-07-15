# Corrections ciblées

## 1. Catégories — affichage et insertion

**Constat base de données :** la table `public.categories` contient bien la colonne `company_id NOT NULL` (vérifié). Deux entreprises ont déjà des catégories (14 + 1). Les policies RLS filtrent correctement par `company_id = get_user_company_id(auth.uid())`. Donc **le schéma est correct** — le problème vient du code client et/ou du profil utilisateur.

**Actions :**
- Dans `CategoryManagement.tsx` (SELECT et INSERT), forcer explicitement `company_id` au moment de l'insert via un lookup unique du profil, et logger l'erreur brute Supabase dans le toast pour rendre visible la vraie cause (RLS, profil sans `company_id`, doublon slug, etc.).
- Dans `useCompanyCategories.ts` : ajouter un log d'erreur clair et un fallback qui remonte l'erreur au composant (au lieu de renvoyer silencieusement `[]`).
- Ajouter un garde : si le profil de l'utilisateur n'a pas de `company_id`, afficher un message explicite « Votre compte n'est rattaché à aucune entreprise » au lieu d'une table vide.
- Vérifier que l'entreprise de l'utilisateur connecté possède bien des catégories ; si vide, permettre la création (le vrai bug reporté sera résolu par la remontée d'erreur).

## 2. Dashboard Admin — un seul filtre de période

Dans `AdminDashboardCharts.tsx` il y a actuellement deux contrôles de période :
- (haut) le `Select` `period` (daily / weekly / monthly) alimentant les graphiques historiques
- (bas) le `PeriodOverview` avec `PeriodFilter` (Aujourd'hui/Hier/Semaine/Mois/Année/Personnalisée)

**Actions :**
- Supprimer le `Select` du haut et l'état `period` associé.
- Remonter le `PeriodFilter` dans `PeriodOverview` comme **source unique de vérité**, exposée via un état partagé (lift-up dans `AdminDashboardCharts`).
- Refactorer `fetchRevenueData`, `fetchProfitData`, `fetchTopProducts`, `fetchCategoryData`, `fetchTopSellers` pour accepter `{ start, end }` de la période sélectionnée au lieu de `daysBack` codé en dur ; déclencher `useEffect` sur `[period.start, period.end]`.
- Les cartes KPI « Aujourd'hui / Semaine / Mois / Année » restent des indicateurs fixes indépendants (non liés au filtre).

## 3. Module Dépenses — retirer la notion de catégorie

**Actions base de données** (migration) :
- Supprimer la colonne `category_id` de `public.expenses`.
- Supprimer la table `public.expense_categories` et ses policies.

**Actions code :**
- Retirer le composant `ExpenseCategoryManager` de l'UI (et supprimer le fichier).
- Retirer le champ « Catégorie » de `ExpenseFormDialog.tsx`.
- Retirer la colonne « Catégorie » du tableau dans `ExpensesManagement.tsx`.
- Nettoyer `useExpenses.ts` : supprimer `useExpenseCategories`, l'interface `ExpenseCategory`, le join `category:category_id(...)` et le champ `category` sur `Expense`.

## Détails techniques

- Migration SQL (ordre) : `ALTER TABLE public.expenses DROP COLUMN category_id;` puis `DROP TABLE public.expense_categories CASCADE;`.
- `PeriodOverview` sera transformé en composant contrôlé (`value` + `onChange`) et le `PeriodFilter` déplacé dans son header pour rester le seul filtre visible.
- Pour les catégories, l'INSERT reste : `{ nom, slug, is_active, ordre, company_id }` — on ajoute un `console.error(error)` et on affiche `error.message + error.details` dans le toast pour diagnostiquer si le blocage persiste.

## Fichiers touchés

- Migration SQL (nouvelle)
- `src/components/Dashboard/AdminDashboardCharts.tsx`
- `src/components/Dashboard/PeriodOverview.tsx`
- `src/components/Categories/CategoryManagement.tsx`
- `src/hooks/useCompanyCategories.ts`
- `src/components/Expenses/ExpensesManagement.tsx`
- `src/components/Expenses/ExpenseFormDialog.tsx`
- `src/hooks/useExpenses.ts`
- Suppression : `src/components/Expenses/ExpenseCategoryManager.tsx`
