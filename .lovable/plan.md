
## Plan de traduction complète de toute l’application

### Constat
Le projet a déjà une base i18n, mais elle ne couvre qu’une partie de l’UI. Les composants internes demandés (`ProductManagement`, `SalesManagement`, `CompanySettings`, `StockAlerts`) contiennent encore beaucoup de texte en dur, et ce problème existe aussi ailleurs dans l’application.

En plus, il y a un blocage build séparé à corriger en parallèle :
- les edge functions Supabase importent `npm:@supabase/supabase-js@2.57.2`
- le build échoue car cette dépendance n’est pas résolue côté Deno

### Ce que je vais couvrir
Traduire l’application de façon globale, pas seulement 4 composants :
- pages principales
- dashboards admin/vendeur/super admin
- modules produits, ventes, inventaire, notifications, catégories, rapports, paramètres, aide
- dialogues, labels, placeholders, badges, boutons
- messages toast restants
- textes vides/chargement/erreurs
- dates/horaires formatés selon la langue active

### Plan d’implémentation

#### 1. Stabiliser l’infrastructure i18n
- Étendre `fr.json`, `en.json`, `es.json` avec des namespaces cohérents par module :
  - `index`
  - `products`
  - `sales`
  - `inventory`
  - `settings`
  - `notifications`
  - `reports`
  - `categories`
  - `seller`
  - `superAdmin`
  - `help`
  - `toasts`
  - `validation`
- Compléter aussi les libellés transverses manquants :
  - états vides
  - chargement
  - actions table
  - filtres
  - confirmations
  - exports
  - permissions / limites d’abonnement

#### 2. Traduire d’abord les modules prioritaires demandés
- `src/components/Products/ProductManagement.tsx`
- `src/components/Sales/SalesManagement.tsx`
- `src/components/Settings/CompanySettings.tsx`
- `src/components/Notifications/StockAlerts.tsx`

Pour chacun :
- ajouter `useTranslation()`
- remplacer les chaînes UI visibles
- remplacer les toasts en dur
- traduire titres, filtres, vues table/cartes, exports, validations, états vides, dialogues, badges

#### 3. Étendre à toute l’application
Passer ensuite sur les autres zones encore en dur :
- `Index.tsx`
- `HelpPage.tsx`
- composants Seller (`SellerWorkflow`, `ProformaWorkflow`, `SavedProformasList`, `CartSection`)
- composants Reports / TVA / Inventory
- composants Categories
- composants SuperAdmin
- composants Activity / dialogs / panels secondaires
- pages et composants qui utilisent encore des labels français statiques

#### 4. Centraliser les toasts et messages métier
Aujourd’hui beaucoup de toasts sont définis dans les hooks et composants.
Je vais harmoniser cela en :
- branchant `useTranslation()` dans les composants
- pour les hooks non React comme `useAuth`, utiliser l’instance i18n importée directement
- migrer les messages fréquents vers des clés réutilisables :
  - erreur chargement
  - sauvegarde réussie
  - suppression réussie
  - validation invalide
  - action non autorisée
  - fonctionnalité premium
  - session expirée

#### 5. Localiser les formats date/heure/nombre
Le code contient encore des formats forcés en `fr-FR` et `date-fns/locale fr`.
Je vais remplacer cela par une logique basée sur la langue active :
- mapper `fr/en/es` vers locale `date-fns`
- remplacer `toLocaleString('fr-FR')`, `toLocaleDateString('fr-FR')`, `toLocaleTimeString('fr-FR')`
- garder les devises séparées, mais adapter séparateurs et dates à la langue choisie

#### 6. Corriger le blocage build des edge functions
En parallèle de la traduction, il faut corriger le build cassé :
- uniformiser les imports Supabase dans les functions
- remplacer les imports Deno problématiques `npm:@supabase/supabase-js@2.57.2` par une version compatible et cohérente avec le projet
- si nécessaire, ajouter la config Deno/Supabase adaptée pour la résolution des modules

### Priorité de livraison
Ordre recommandé :
1. corriger le build Supabase functions
2. traduire les 4 composants prioritaires
3. traduire les hooks/toasts partagés
4. traduire les modules restants
5. localiser dates/heures/nombres
6. faire une passe finale de cohérence sur les clés manquantes

### Détails techniques
- utiliser `useTranslation()` dans les composants React
- utiliser l’instance `i18n` directement dans les hooks non composants
- éviter de stocker du texte traduit dans l’état quand ce texte peut être recalculé via `t()`
- préférer des clés structurées comme :
  - `products.exportPdf`
  - `sales.filters.period`
  - `settings.logo.uploadSuccess`
  - `notifications.lowStock.title`
  - `toasts.loadError`
- conserver le français comme fallback
- vérifier aussi les placeholders, titres PDF/export, colonnes de tableaux, boutons mobiles et tooltips

### Résultat attendu
À la fin :
- toute l’application bascule correctement entre français, anglais et espagnol
- les messages toast suivent la langue active
- les formats de date/heure ne restent plus bloqués en français
- les composants internes et secondaires sont couverts, pas seulement les écrans principaux
- le build n’est plus bloqué par les edge functions Supabase
