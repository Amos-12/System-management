## Diagnostic

Le vrai problème n'est PAS la base de données — le projet Supabase connecté (`xngppwphedaexwkgfjdv`) est multi-tenant complet : tables `expenses`, `categories`, `sales`, `products`, `profiles` existent, avec `company_id` partout et RLS qui exige `company_id = get_user_company_id(auth.uid())`. Les catégories legacy sont déjà seedées (alimentaires, boissons, blocs, céramique, fer, etc.).

Le problème réel : `src/integrations/supabase/client.ts` a été édité manuellement pour pointer vers `https://qxauhjxjqyesvqdzxbnh.supabase.co` (un projet qui n'est pas connecté à Lovable), alors que `.env` et la connexion Lovable pointent sur `xngppwphedaexwkgfjdv`. Résultat : toutes les requêtes du frontend échouent avec "Failed to fetch" → dashboard vide, ventes vides, dépenses cassées, création de catégorie qui remonte une erreur trompeuse.

Il faut donc **rester sur `xngppwphedaexwkgfjdv`** (schéma déjà correct et données existantes) et remettre le client sur ce projet. Aucune modification de schéma nécessaire — on garde `company_id` partout.

## Plan

1. **Réparer `src/integrations/supabase/client.ts`**
   - Remplacer l'URL/clé codées en dur (`qxauhjxjqyesvqdzxbnh`) par celles du projet connecté (`xngppwphedaexwkgfjdv`) issues de `.env`.
   - Cela restaure toutes les requêtes → dashboard admin (4 cartes), page ventes, page dépenses.

2. **Vérifier `CategoryManagement.tsx`**
   - Le code injecte déjà `company_id` sur l'insert (ligne 85). Une fois le client réparé, la création fonctionnera. Aucune modif attendue sauf si un souci résiduel apparaît.

3. **Catégories legacy + nouvelles catégories dans la création de produits**
   - Les catégories legacy sont déjà en base (seedées via l'ancienne migration).
   - Vérifier que `ProductManagement.tsx` / le formulaire produit consomme `useCompanyCategories` (liste dynamique depuis `categories`) plutôt que l'enum figé. Adapter si besoin pour que **toutes** les catégories actives (legacy + personnalisées) apparaissent dans le sélecteur produit et soient bien enregistrées via `categorie_id`.

4. **Page dépenses**
   - `ExpenseFormDialog.tsx` et `useExpenses.ts` sont corrects (utilisent `company_id`). Ils fonctionneront dès que le client tape le bon projet.

5. **Aucune migration SQL**
   - Le schéma cible est déjà en place. Ne pas créer de tables ni de policies.

## Notes techniques

- Les erreurs console `Failed to fetch` et `_getUser` confirment le mauvais endpoint Supabase.
- `types.ts` est déjà cohérent avec le projet connecté (contient `company_id`), donc pas à régénérer.
- On ne touche pas aux edge functions.
- On garde le modèle multi-tenant (`company_id`) — c'est celui de la base connectée et il est requis par les policies RLS.