

## Diagnostic

Le problème est identifié : **le webhook Stripe n'est pas configuré dans votre dashboard Stripe**. Voici le flux actuel :

```text
Utilisateur → Stripe Checkout → Paiement réussi → Redirection /payment-success
                                       ↓
                              Stripe envoie webhook → ❌ Jamais reçu
                                       ↓
                              Plan jamais mis à jour dans la DB
```

La page `PaymentSuccess` affiche "succès" après 3 secondes d'attente, mais elle ne vérifie rien réellement. Le plan reste "trial" car personne ne met à jour la base de données.

**De plus**, le secret `STRIPE_WEBHOOK_SECRET` n'est pas configuré dans les secrets Supabase.

## Solution proposée

Plutôt que de dépendre uniquement du webhook (qui nécessite une configuration manuelle dans Stripe), ajouter une **vérification active** sur la page PaymentSuccess qui appelle Stripe directement pour confirmer le paiement.

### 1. Créer une edge function `verify-checkout-session`

- Reçoit le `session_id` de Stripe (passé dans l'URL de retour)
- Vérifie auprès de Stripe que le paiement est bien complété
- Si oui, active l'abonnement dans la base (même logique que le webhook)
- Retourne le statut au frontend

### 2. Modifier `PaymentSuccess.tsx`

- Au lieu d'attendre 3 secondes, appeler `verify-checkout-session` avec le `session_id`
- Réessayer jusqu'à 3 fois si le paiement n'est pas encore confirmé
- Afficher le vrai statut (succès/échec)

### 3. Garder le webhook comme backup

- Le webhook reste en place pour les renouvellements automatiques (`invoice.paid`)
- La vérification active couvre le premier paiement

## Détails techniques

**Edge function `verify-checkout-session`** :
- Authentifie l'utilisateur via le JWT
- Récupère la session Stripe via `stripe.checkout.sessions.retrieve(session_id)`
- Vérifie `session.payment_status === 'paid'`
- Extrait `company_id` et `plan_id` des metadata
- Appelle la même logique `activateSubscription` que le webhook
- Protection contre double activation (vérifie si déjà activé)

**Frontend** :
- Appel `supabase.functions.invoke('verify-checkout-session', { body: { session_id } })`
- Polling avec retry (max 3 tentatives, 2s d'intervalle)
- Affichage du résultat réel

### Configuration webhook (recommandé en parallèle)

Pour les renouvellements futurs, configurer dans Stripe Dashboard :
- URL : `https://xngppwphedaexwkgfjdv.supabase.co/functions/v1/payment-webhook`
- Events : `checkout.session.completed`, `invoice.paid`
- Ajouter le `STRIPE_WEBHOOK_SECRET` dans les secrets Supabase

