

## Plan: Optimiser les cartes Super Admin pour mobile (comme les autres dashboards)

### Problème
Les cartes KPI du Super Admin (`SaasKPIs.tsx`) utilisent des composants `Card` basiques avec du texte fixe (`text-2xl`, padding `p-6`), sans adaptation mobile. Les autres dashboards utilisent le composant `KPICard` avec des tailles responsives (`text-xs sm:text-base md:text-xl`, `p-2 sm:p-4`).

### Solution
Refactorer `SaasKPIs.tsx` pour utiliser le composant `KPICard` existant, comme dans `SellerDashboardStats` et `AdminDashboardCharts`.

### Changements

**1. `src/components/SuperAdmin/SaasKPIs.tsx`**
- Remplacer les `Card` manuelles par le composant `KPICard` déjà utilisé partout ailleurs
- Mapper les 4 KPIs (Entreprises, Utilisateurs, MRR, En essai) vers `KPICard` avec les props `title`, `value`, `icon`, `format`, `colorScheme`
- Utiliser `size="sm"` pour un affichage compact sur mobile
- Grille responsive : `grid-cols-2 lg:grid-cols-4` (2 colonnes sur mobile, 4 sur desktop)

**2. `src/components/SuperAdmin/CompanyList.tsx`** (et autres panels)
- Appliquer les mêmes patterns responsives que `ProductManagement` : texte compact (`text-xs sm:text-sm`), padding réduit (`p-2 sm:p-4`), colonnes masquées sur mobile (`hidden sm:table-cell`)
- Masquer les colonnes "Code invitation" et "Expiration" sur mobile

**3. `src/pages/SuperAdminDashboard.tsx`**
- Ajuster le padding du header et du contenu pour mobile (`px-3 sm:px-6`)
- Réduire la taille du texte header sur mobile

