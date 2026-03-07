

# Plan : Restrictions par plan + Blocage expiration + Fix profil Super Admin

## Problemes identifies

1. **Pas de restrictions cote code** : Les limites (50 produits, 100 ventes/mois) ne sont pas enforced
2. **Statistiques avancees accessibles** a tous les plans
3. **Apres expiration** : le blocage existe (`ExpiredScreen`) mais seulement sur Admin/Seller dashboards
4. **Super Admin** : `useAuth` fetche le profil depuis `profiles` qui requiert un `company_id` via RLS -- le super_admin n'a pas de company_id, donc le fetch echoue

## Implementation

### 1. Hook `useSubscription` -- ajouter `maxSalesMontly` et compteurs

Enrichir `useSubscription.ts` pour :
- Fetcher `max_sales_monthly` depuis `subscription_plans` en plus des donnees `companies`
- Exposer `maxSalesMonthly` dans le retour
- Ajouter une fonction utilitaire `checkProductLimit` et `checkSalesLimit`

### 2. Bloquer l'ajout de produits au-dela de la limite

Dans `ProductManagement.tsx`, au debut de `handleSubmit` (avant la creation d'un nouveau produit, pas pour l'edition) :
- Compter les produits existants de la company (`products.length` deja en state)
- Si `products.length >= maxProducts` et pas d'edition → toast d'erreur + return
- Afficher un badge d'avertissement dans le header si proche de la limite

### 3. Limiter les ventes a 100/mois pour le plan gratuit

Dans `SellerWorkflow.tsx`, avant l'appel a `process-sale` :
- Compter les ventes du mois courant via une query rapide `SELECT count(*) FROM sales WHERE company_id = X AND created_at >= debut_du_mois`
- Si >= limite → toast "Limite de ventes mensuelles atteinte" + bloquer

### 4. Verrouiller les statistiques avancees

Dans `AdminDashboard.tsx`, modifier `renderContent()` :
- Pour les sections `analytics`, `seller-reports`, `reports`, `tva-report` : si `plan === 'trial'`, afficher un ecran de verrouillage avec icone cadenas et message "Disponible dans le plan Pro"
- Le dashboard basique (`dashboard`) reste accessible

Creer un petit composant `LockedFeature` reutilisable affichant un overlay avec cadenas.

### 5. Blocage complet apres expiration

Deja en place dans `AdminDashboard` et `SellerDashboard` via `ExpiredScreen`. Verifier que c'est coherent. L'ecran propose deja les plans avec boutons.

### 6. Fix profil Super Admin

Le probleme : `useAuth.fetchProfile` query `profiles` puis `user_roles`. La policy RLS sur `profiles` exige `company_id = get_user_company_id(auth.uid())` ou `auth.uid() = user_id`. Le super_admin a `user_id` dans profiles mais peut ne pas avoir de company_id.

Solution : La policy `Users can view own company profiles` inclut deja `(auth.uid() = user_id)`, donc le super_admin devrait pouvoir lire son propre profil. Le vrai probleme est que le super_admin n'a peut-etre **pas de ligne dans `profiles`** du tout (cree manuellement dans `user_roles` sans passer par le trigger `handle_new_user`).

Fix : Dans `SuperAdminDashboard.tsx`, ne pas bloquer sur le profil. Le role vient de `user_roles` et est deja fetche. Si le profil est null, l'afficher quand meme. Aussi, dans `useAuth`, s'assurer que l'absence de profil ne genere pas d'erreur bloquante (deja gere avec le fallback `setProfile({...})`).

Le fix reel : ajouter `is_super_admin(auth.uid())` a la policy SELECT de `profiles` si ce n'est pas deja le cas. En regardant les policies : `Users can view own company profiles` a `(auth.uid() = user_id) OR is_super_admin(auth.uid())` -- c'est deja bon. Donc le probleme est que le super_admin **n'a pas de ligne dans `profiles`**. On doit creer une ligne via migration INSERT, ou gerer le cas dans le code.

Solution code : Dans `useAuth`, le fallback quand `profileData` est null cree deja un profil minimal. Le toast d'erreur s'affiche quand meme. On va supprimer le toast d'erreur quand le profil n'existe pas mais que le role est `super_admin`.

## Fichiers modifies

- `src/hooks/useSubscription.ts` : Ajouter `maxSalesMonthly`
- `src/components/Products/ProductManagement.tsx` : Verification limite produits
- `src/components/Seller/SellerWorkflow.tsx` : Verification limite ventes/mois
- `src/pages/AdminDashboard.tsx` : Verrouillage sections avancees pour plan trial
- `src/components/Subscription/LockedFeature.tsx` : Nouveau composant ecran verrouille
- `src/hooks/useAuth.ts` : Supprimer le toast d'erreur pour super_admin sans profil
- `src/pages/SellerDashboard.tsx` : Verrouillage sections avancees pour seller

