# Produits : limite de 1000, accès vendeur, messages du formulaire

## 1. Toutes les listes produits limitées à 1000 lignes

Les requêtes produits utilisent `select('*')` sans pagination, donc la base ne renvoie jamais plus de 1000 lignes (limite par défaut de l'API). Correction : ajouter un utilitaire de récupération par pages de 1000 (`.range()` en boucle jusqu'à épuisement) et l'appliquer partout où la liste complète est nécessaire :

- `src/components/Products/ProductManagement.tsx` (table admin)
- `src/components/Seller/SellerWorkflow.tsx` (liste vendeur)
- `src/components/Seller/ProformaWorkflow.tsx`
- `src/components/Inventory/InventoryManagement.tsx` et `QuickInventoryMode.tsx`
- `src/components/Notifications/StockAlerts.tsx`

Nouveau fichier `src/lib/fetchAllRows.ts` contenant le helper réutilisable.

## 2. Le vendeur ne voit pas tous les produits

Deux causes cumulées, corrigées ensemble :
- la même limite de 1000 (point 1) ;
- les produits sont ensuite filtrés côté client (stock disponible, catégories autorisées), ce qui, sur une page tronquée, cache une grande partie du catalogue.

Après la pagination complète, la liste vendeur affichera tout le catalogue actif. Le compteur de produits affiché indiquera le total réel.

## 3. Messages d'erreur du formulaire produit

Aujourd'hui toutes les erreurs de validation et d'enregistrement passent par des toasts en bas de l'écran, faciles à manquer sur mobile, et le message d'échec est générique (« Impossible de sauvegarder le produit »).

Changements :
- ajouter un bandeau d'erreur (Alert destructive) **en haut du formulaire**, dans le dialogue, listant le ou les champs manquants ; défilement automatique vers le bandeau ;
- effacer le bandeau à la correction et à la fermeture du dialogue ;
- messages d'enregistrement explicites selon la cause réelle : doublon de code-barres, valeur numérique invalide, permission refusée (RLS), session expirée, perte de connexion — avec repli sur le message brut de la base plutôt qu'un texte générique.

## Détails techniques

- Helper : `fetchAllRows(queryBuilder, pageSize = 1000)` qui reconstruit la requête avec `.range(from, to)` et concatène jusqu'à recevoir moins de `pageSize` lignes.
- Aucun changement de schéma ni de politiques RLS n'est nécessaire.
- Les règles de validation métier existantes (prix d'achat ≤ prix de vente, champs par catégorie) restent inchangées, seule leur présentation évolue.
