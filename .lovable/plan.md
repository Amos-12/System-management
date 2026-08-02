# Page Dépenses : insertion, calculs et carte statistique

## Objectif
Rendre le module Dépenses pleinement fonctionnel : création/édition fiable, totaux corrects (USD converti en HTG), et une carte statistique « Dépenses » visible pour l'administrateur et pour le vendeur.

## Règles retenues
- Les dépenses saisies en USD sont converties en HTG via un taux configurable, pour un total unique en HTG.
- Le vendeur ne voit et ne crée que ses propres dépenses ; l'administrateur voit tout et peut modifier/supprimer.

## Ce qui sera fait

### 1. Taux de change USD → HTG
- Ajout d'un champ « Taux USD → HTG » dans les Paramètres de l'entreprise (admin seulement).
- Une valeur par défaut est utilisée tant que le taux n'est pas configuré, avec un avertissement discret dans la page Dépenses si aucun taux n'est défini.

### 2. Insertion / édition des dépenses
- Validation renforcée : libellé requis, montant strictement positif, date valide (pas de date future).
- L'auteur est toujours l'utilisateur connecté ; un vendeur ne peut pas créer une dépense au nom d'un autre.
- Édition/suppression : autorisées à l'admin ; le vendeur peut modifier/supprimer uniquement ses propres dépenses.
- Messages d'erreur explicites en cas de refus par la base (au lieu d'un échec silencieux).

### 3. Calculs de la page Dépenses
- Total période = somme des montants convertis en HTG (HTG tels quels, USD × taux).
- Cartes de synthèse : nombre de dépenses, total période (HTG), total « Mes dépenses ».
- Ajout de la conversion affichée sur chaque ligne USD (montant original + équivalent HTG).
- Chargement paginé pour ne pas être bloqué par la limite de 1000 lignes.

### 4. Carte statistique Dépenses
- Admin (Vue d'ensemble du tableau de bord) : total dépenses de la période, toutes dépenses confondues, converties en HTG, plus le bénéfice net (ventes − dépenses).
- Vendeur (tableau de bord vendeur) : nouvelle carte « Mes dépenses » sur la période sélectionnée, limitée à ses propres dépenses, cliquable vers la page Dépenses.
- Les deux cartes utilisent la même logique de conversion, donc les mêmes valeurs pour une même période.

## Détails techniques
- `src/hooks/useExpenses.ts` : ajout d'un paramètre de portée (`mine` / `all`) selon le rôle, pagination par lots de 1000, et retour des totaux convertis.
- Nouveau helper `src/lib/currency.ts` : `toHTG(amount, currency, rate)` utilisé partout (page, cartes admin et vendeur).
- Nouveau hook `src/hooks/useExchangeRate.ts` : lit le taux depuis `company_settings`, avec repli sur une valeur par défaut si la colonne/valeur est absente.
- `ExpenseFormDialog.tsx` : validations, gestion d'erreur, `user_id` forcé côté client à l'utilisateur courant.
- `ExpensesManagement.tsx` : totaux en HTG, filtrage par rôle, actions conditionnées au rôle et à la propriété de la ligne.
- `PeriodOverview.tsx` : totaux dépenses recalculés avec conversion (au lieu de la somme brute du RPC toutes devises confondues).
- `SellerDashboardStats.tsx` : ajout de la carte « Mes dépenses ».

## Étape base de données (script SQL à exécuter par vos soins)
Comme précédemment, je fournirai un script à lancer dans l'éditeur SQL Supabase :
- `ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS usd_to_htg_rate numeric NOT NULL DEFAULT 132;`
- Vérification/ajout des politiques RLS sur `expenses` : lecture de ses propres lignes pour un vendeur, lecture totale pour un admin, écriture réservée à l'auteur, modification/suppression pour l'auteur ou un admin.
- Rechargement du cache PostgREST.

Le code fonctionnera avec un repli sur le taux par défaut même avant l'exécution du script, mais les règles de visibilité par rôle ne seront pleinement garanties qu'après.
