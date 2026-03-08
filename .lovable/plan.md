

# Plan : Bloquer tous les boutons de téléchargement/export pour le plan gratuit

## Etat actuel

Deja bloques :
- `ProductManagement.tsx` : exportToExcel, exportToPDF
- `SalesManagement.tsx` : exportToExcel, exportToPDF

**Non bloques** (a corriger) :
- `InventoryManagement.tsx` : exportToExcel, exportToPDF
- `UserManagementPanel.tsx` : exportToExcel
- `AdvancedReports.tsx` : exportToPDF, exportReport (CSV)
- `SellerPerformanceReport.tsx` : exportToExcel
- `TvaReport.tsx` : handleExportPDF
- `AdminDashboardCharts.tsx` : handleExportPdf
- `ProformaWorkflow.tsx` : handlePrintProforma (impression PDF proforma)

Note : `HelpPage.tsx` (guide utilisateur PDF) reste accessible -- c'est un guide d'aide, pas un export de donnees.

## Implementation

Pour chaque fichier non bloque :

1. Importer `useSubscription` (si pas deja importe)
2. Extraire `plan` du hook
3. Ajouter un guard au debut de chaque fonction export/download : si `plan === 'trial'`, afficher un toast "Fonctionnalite Premium" et return

Pattern identique a celui deja en place dans `ProductManagement.tsx` et `SalesManagement.tsx`.

## Fichiers modifies (7)

- `src/components/Inventory/InventoryManagement.tsx`
- `src/components/UserManagement/UserManagementPanel.tsx`
- `src/components/Reports/AdvancedReports.tsx`
- `src/components/Reports/SellerPerformanceReport.tsx`
- `src/components/Reports/TvaReport.tsx`
- `src/components/Dashboard/AdminDashboardCharts.tsx`
- `src/components/Seller/ProformaWorkflow.tsx`

