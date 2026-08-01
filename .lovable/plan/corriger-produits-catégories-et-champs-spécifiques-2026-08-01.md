# Corriger produits, catégories et champs spécifiques

## Ce que j'ai vérifié dans la base réellement connectée (`qxauhjxjqyesvqdzxbnh`)

Interrogation directe de l'API REST du projet :

- La base est **mono-tenant** : `categories.company_id` n'existe pas, `expenses.company_id` n'existe pas, et la table `products` n'a **aucune** colonne `company_id`.
- La table `categories` existe (colonnes `id, nom, slug, ordre, is_active`) mais elle est **vide** (0 ligne).
- La table `products` n'a **ni `categorie_id` ni `sous_categorie_id`** — uniquement l'ancienne colonne `category` (enum `product_category`).
- La table `sous_categories` **n'existe pas** dans cette base.
- `src/integrations/supabase/types.ts` provient de l'ancien projet (il contient `company_id` partout) : il ne correspond plus à la base actuelle, d'où les erreurs TS.

## Pourquoi rien ne marche aujourd'hui

1. **Création de catégorie impossible** : `CategoryManagement` lit `profiles.company_id` et envoie `company_id` dans l'insert → la colonne n'existe pas → erreur.
2. **Aucune catégorie affichée** : la table `categories` est vide, donc le sélecteur de catégorie du formulaire produit est vide.
3. **Création de produit impossible** : l'insert envoie `categorie_id`, colonne inexistante dans `products`.
4. **Champs spécifiques** (céramique m², fer barres, blocs, vêtements, énergie) : ils sont pilotés par le *slug* de la catégorie (`ceramique`, `fer`, ...). Ils fonctionneront dès que les catégories legacy seront présentes avec les bons slugs.

## Étape 1 — SQL à exécuter (Supabase Dashboard → SQL Editor)

Ce projet utilise un Supabase externe : je n'ai pas d'outil de migration ici, je vous fournirai un script à coller. Il fera, sans notion de company :

1. Ajouter `products.categorie_id uuid references public.categories(id)` (nullable) + index.
2. Rendre `products.category` (enum) nullable pour permettre les catégories personnalisées.
3. Insérer les 12 catégories legacy dans `categories` avec leurs slugs exacts : `alimentaires, boissons, gazeuses, blocs, ceramique, fer, materiaux_de_construction, electromenager, electronique, energie, vetements, autres`.
4. Vérifier RLS + `GRANT` sur `categories` et `products` pour `authenticated` (lecture/écriture sans filtre company).
5. `NOTIFY pgrst, 'reload schema'`.

## Étape 2 — Nettoyage du code (mono-tenant)

- `useCompanyCategories` : lecture simple de `categories` (aucun filtre company), tri `ordre` puis `nom`.
- `CategoryManagement` : supprimer toute la lecture de `profiles.company_id` et le champ `company_id` de l'insert ; garder le verrouillage des catégories système (slug legacy) et les messages d'erreur détaillés.
- `ProductManagement` : conserver `categorie_id` dans l'insert/update (créé à l'étape 1) et continuer à écrire `category` uniquement quand le slug fait partie de l'enum ; retirer tout `company_id`.
- `ExpenseFormDialog` / `useExpenses` : retirer `company_id`, utiliser `user_id` (schéma réel : `user_id, libelle, amount, currency, expense_date, categorie_id`).
- `UserManagementPanel` : retirer les références `company_id`.

## Étape 3 — Champs supplémentaires par catégorie

Vérification et correction dans `ProductManagement` :

- `ceramique` : `surface_par_boite`, `prix_m2`, `stock_boite`, quantité m² calculée et champ quantité verrouillé.
- `fer` : `diametre`, `longueur_barre`, `longueur_barre_ft`, `bars_per_ton`, `prix_par_barre`, `prix_par_metre`, `stock_barre`.
- `blocs` : `bloc_type`, `bloc_poids`, `dimension`.
- `vetements` : `vetement_taille`, `vetement_couleur`, `vetement_genre`.
- `energie` : `puissance`, `voltage`, `capacite`, `type_energie`.
- Catégorie personnalisée : uniquement les champs standards (nom, prix, quantité, unité, seuil d'alerte) + `specifications_techniques` libre.

Test réel après correction : créer une catégorie personnalisée, créer un produit dans une catégorie legacy avec champs spécifiques, puis un produit dans la catégorie personnalisée.

## Notes techniques

- `types.ts` restera désynchronisé tant que les types ne sont pas régénérés : j'utiliserai des casts ciblés (`as any`) sur les tables concernées pour garder le build vert, sans changer le comportement runtime.
- Aucune colonne `company_id` ne sera réintroduite.
- Aucun changement sur les edge functions.
