

# Audit Phase 1 SaaS - Etat de finalisation

## Etapes completees

| Etape | Statut | Details |
|-------|--------|---------|
| 1.1 Role `super_admin` dans enum | FAIT | Ajoute a `app_role` |
| 1.2 Table `companies` | FAIT | Avec tous les champs requis + `invitation_code` |
| 1.3 Table `subscription_plans` | FAIT | 4 plans inseres (trial/basic/pro/premium) |
| 1.4 `company_id` sur toutes les tables | FAIT | profiles, products, sales, sale_items, stock_movements, etc. |
| 1.5 Migration donnees existantes | FAIT | Entreprise par defaut creee, donnees associees |
| 1.6 Politiques RLS multi-tenant | FAIT | `get_user_company_id()` + `is_super_admin()` |
| 2.1 Auth - Inscription entreprise | FAIT | Flux "Creer" / "Rejoindre" dans Auth.tsx |
| 2.2 Trigger `handle_new_user` | FAIT | Cree company ou rejoint via code d'invitation |
| 2.3 Edge Function `validate-invitation` | FAIT | Valide le code d'invitation |
| 3.1 Hook `useSubscription` | FAIT | Verifie plan, expiration, limites |
| 3.2 `ExpiredScreen` | FAIT | Composant cree, affiche les plans |
| 4.1 `useCompanySettings` bascule vers `companies` | FAIT | Lit depuis `companies` |
| 4.3 `useAuth` avec `company_id` | FAIT | company_id charge depuis profile |
| 5. Dashboard Super Admin | FAIT | Route `/super-admin`, SaasKPIs, CompanyList |
| 6.1 `process-sale` avec `company_id` | FAIT | company_id dans ventes et mouvements |
| 6.2 `delete-sale` avec `company_id` | FAIT | company_id dans mouvements de restauration |
| Route `/super-admin` dans App.tsx | FAIT | Ajoutee |
| Redirection super_admin dans Index.tsx | FAIT | Redirige vers `/super-admin` |

---

## Problemes non resolus (7 elements)

### Probleme 1 : `CompanySettings.tsx` lit encore `company_settings` (CRITIQUE)
Le composant de parametres d'entreprise utilise encore `company_settings` pour fetch, update et logo upload (lignes 110, 177, 207). Il devrait utiliser la table `companies` a la place.

### Probleme 2 : `ProductManagement.tsx` n'inclut pas `company_id` dans les insertions
Le productData (ligne 661-696) ne contient pas `company_id`. Les `.insert()` de produits (ligne 757), et les `activity_logs.insert()` (lignes 741, 769, 849, 872) n'ont pas de `company_id`.

### Probleme 3 : Plusieurs composants lisent encore `company_settings`
- `AdminDashboardCharts.tsx` (ligne 603)
- `SalesManagement.tsx` (lignes 163, 235)
- `SellerPerformanceReport.tsx` (ligne 54)
- `QuickInventoryMode.tsx` (ligne 135)
- `AnalyticsDashboard.tsx` (ligne 155)
- `SellerWorkflow.tsx` (ligne 322)
- `InventoryManagement.tsx` (ligne 419)
- `InventoryHistory.tsx` (ligne 306)

Ces fichiers doivent basculer de `company_settings` vers `companies`.

### Probleme 4 : `ExpiredScreen` n'est integre nulle part
Le composant existe mais n'est utilise dans aucune page. Il devrait etre affiche dans `AdminDashboard` et `SellerDashboard` quand l'abonnement est expire.

### Probleme 5 : `useSubscription` n'est utilise nulle part
Le hook existe mais n'est importe dans aucun composant. Il devrait etre utilise dans les dashboards pour verifier l'etat de l'abonnement et bloquer l'acces.

### Probleme 6 : `activity_logs` inserts sans `company_id` dans plusieurs fichiers
Les insertions `activity_logs` dans `ProductManagement.tsx`, `useAuth.ts` (signIn, signUp, signOut) n'incluent pas `company_id`.

### Probleme 7 : `delete-sale` ne verifie pas que la vente appartient a l'entreprise
Le delete-sale recupere `companyId` mais ne filtre pas `.eq('company_id', companyId)` lors de la recuperation de la vente (ligne 82). Un admin pourrait potentiellement supprimer une vente d'une autre entreprise.

---

## Plan de correction

### Iteration 1 : Basculer `CompanySettings.tsx` vers `companies`
Remplacer toutes les references a `company_settings` par `companies` dans le fetch, save et logo upload. Utiliser `get_user_company_id` via le profil de l'utilisateur pour identifier l'entreprise.

### Iteration 2 : Ajouter `company_id` aux insertions manquantes
- `ProductManagement.tsx` : ajouter `company_id` au `productData` et aux `activity_logs`
- `useAuth.ts` : ajouter `company_id` aux logs d'activite (signIn, signUp, signOut)

### Iteration 3 : Migrer 8 fichiers de `company_settings` vers `companies`
Changer la table source de `company_settings` a `companies` dans :
- AdminDashboardCharts, SalesManagement, SellerPerformanceReport
- QuickInventoryMode, AnalyticsDashboard, SellerWorkflow
- InventoryManagement, InventoryHistory

Les noms de colonnes sont legerement differents (`company_name` → `name`, etc.) donc il faudra adapter le mapping.

### Iteration 4 : Integrer `useSubscription` + `ExpiredScreen`
- Dans `AdminDashboard.tsx` et `SellerDashboard.tsx` : importer `useSubscription`, verifier `isExpired`, afficher `ExpiredScreen` si expire.

### Iteration 5 : Securiser `delete-sale`
Ajouter `.eq('company_id', companyId)` lors du fetch de la vente et des sale_items pour garantir l'isolation.

---

## Conclusion
La Phase 1 est avancee a environ **75%**. Les fondations (schema, RLS, auth, edge functions) sont solides. Il reste principalement :
1. La migration des 9 fichiers qui lisent encore `company_settings`
2. L'ajout de `company_id` dans les insertions de produits et logs
3. L'integration du blocage d'abonnement expire dans les dashboards
4. Une verification de securite sur delete-sale

Une fois ces corrections faites, la Phase 1 sera complete et on pourra passer a la Phase 2 (paiements et facturation).

