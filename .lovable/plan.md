
# Migration vers le projet Supabase `qxauhjxjqyesvqdzxbnh`

## Contexte
Le code actuel est branché sur le projet Supabase `xngppwphedaexwkgfjdv`, entièrement multi-tenant (colonne `company_id` sur presque toutes les tables, table `expenses` existante). Vous voulez travailler sur un autre projet Supabase (`qxauhjxjqyesvqdzxbnh`) qui, selon vous :
- n'utilise pas `company_id`
- n'a pas (encore) de table `expenses`

Je n'ai pas accès à ce second projet tant que la connexion Supabase de Lovable n'a pas été basculée dessus.

## Étape 1 — Action manuelle (vous)
1. Icône Supabase (haut-droite de Lovable) → **Disconnect Supabase**.
2. **Connect Supabase** → choisir le projet `qxauhjxjqyesvqdzxbnh`.
3. Lovable régénère automatiquement `.env` et `src/integrations/supabase/types.ts`.
4. Me répondre "c'est fait".

## Étape 2 — Audit du nouveau schéma (moi)
Une fois reconnecté, je vais :
- Lister toutes les tables de `public` et leurs colonnes réelles.
- Vérifier la présence / absence de `company_id` sur chaque table utilisée par le code (`categories`, `products`, `sales`, `sale_items`, `stock_movements`, `profiles`, `user_roles`, `expenses`, `proformas`, `payments`, `activity_logs`, `sous_categories`, `seller_authorized_categories`, `specifications_modeles`).
- Vérifier les policies RLS et les GRANTs Data API sur chaque table.
- Vérifier si `expenses` existe.

Je vous fais un rapport court avant de coder.

## Étape 3 — Migration SQL éventuelle
Selon l'audit, dans une seule migration :
- Créer la table `expenses` si absente (colonnes : `libelle`, `description`, `amount`, `currency`, `expense_date`, `user_id`, `created_at`, `updated_at`) avec GRANTs + RLS + policies scopées sur `user_id` / rôle admin, plus trigger `updated_at`.
- Créer la table `categories` (custom par entreprise) si absente, sinon la conserver telle quelle.
- N'ajouter **aucune** colonne `company_id` sur les nouvelles tables (conformément à votre demande).

## Étape 4 — Adaptation du code
Retirer toutes les références à `company_id` côté frontend/edge functions, en particulier :
- `src/components/Categories/CategoryManagement.tsx` — supprimer la lecture de `profiles.company_id` et l'insertion de `company_id`.
- `src/hooks/useCompanyCategories.ts` — plus de filtre implicite tenant (RLS ou role suffira).
- `src/components/Expenses/ExpenseFormDialog.tsx` — supprimer la lecture de `profiles.company_id` et l'insertion de `company_id`.
- `src/hooks/useExpenses.ts` — inchangé si RLS s'appuie sur `user_id`.
- Toute edge function ou hook qui lit `get_user_company_id(...)` ou filtre par `company_id` (ex : `process-sale`, `delete-sale`, hooks de ventes, hooks de produits, `useCompany`) sera adapté au nouveau modèle **si** ces tables n'ont pas non plus `company_id` dans le nouveau projet. Je vous confirmerai le périmètre exact après l'audit.

## Étape 5 — Dashboard admin (rappel)
Vérifier que le filtre de date en haut a bien été retiré et que le filtre du bas propose l'option "Personnalisé" avec plage de dates — sinon corriger.

## Étape 6 — Vérification
- Lancer un typecheck.
- Ouvrir Admin → Catégories, créer une catégorie, vérifier qu'elle apparaît.
- Ouvrir Admin → Dépenses, créer une dépense, vérifier qu'elle apparaît.
- Vérifier console + network : plus aucune erreur `column "company_id" does not exist`.

## Notes techniques
- Sans `company_id`, l'app cesse d'être multi-tenant : tout utilisateur authentifié voit potentiellement toutes les catégories/produits/ventes selon les policies RLS du nouveau projet. À confirmer si c'est le comportement voulu, ou si les policies doivent scoper par `user_id` (mode mono-entreprise).
- Les mémoires projet actuelles ("Strict multi-tenant architecture via `company_id`", "useCompany hook", etc.) devront être mises à jour après validation, car elles ne s'appliqueront plus.
