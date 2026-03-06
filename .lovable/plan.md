

# Plan : Regeneration du code d'invitation + Section Abonnement dans les parametres

## 1. Regenerer le code d'invitation

Dans la section "Code d'invitation" de `CompanySettings.tsx`, ajouter un bouton "Regenerer" a cote du bouton "Copier". Au clic, il execute un `UPDATE` sur `companies` avec un nouveau code genere (`substr(md5(random()::text), 1, 8)`) via une simple update Supabase cote client. On regenere en mettant a jour `invitation_code` avec une valeur generee en JS (`Math.random().toString(36).substring(2, 10)`), puis on refresh l'etat local.

## 2. Section Abonnement dans les parametres

Ajouter une nouvelle carte collapsible "Abonnement" dans `CompanySettings.tsx` qui affiche :

- **Plan actuel** avec badge colore (trial/basic/pro/premium)
- **Statut** : Actif / Expire avec indicateur visuel
- **Date d'expiration** et **jours restants** avec barre de progression
- **Limites** : utilisateurs max et produits max du plan
- **Tableau comparatif des plans** disponibles (depuis `subscription_plans`)
- **Bouton "Contacter pour upgrader"** (mailto ou message, les paiements ne sont pas encore integres)

On reutilisera le hook `useSubscription` existant pour les donnees d'abonnement, et on fera un fetch supplementaire sur `subscription_plans` pour afficher la grille des plans.

## Fichiers modifies

- `src/components/Settings/CompanySettings.tsx` : Ajout bouton regenerer + nouvelle section Abonnement

## Details techniques

- **Regeneration** : `invitation_code` update via Supabase client avec `crypto.randomUUID().substring(0, 8)` ou equivalent simple, puis mise a jour de l'etat `invitationCode`
- **Abonnement** : Import de `useSubscription`, ajout d'un state `subscriptionPlans` fetche depuis la table `subscription_plans`, nouvelle section collapsible avec `openSections.subscription`
- **UI** : Progress bar pour jours restants, badges colores par plan, grille responsive des plans

