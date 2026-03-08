

# Phase 2 - Paiements automatises et facturation

## Vue d'ensemble

Ajouter le paiement en ligne (MonCash, NatCash, Stripe) avec activation automatique des abonnements, generation de factures, et rappels d'expiration par email.

---

## Architecture

```text
Client (ExpiredScreen / UpgradeBanner)
  |
  v
Edge Function: create-checkout
  |-- Stripe -> Stripe Checkout Session -> redirect
  |-- MonCash -> MonCash Payment API -> redirect
  |-- NatCash -> NatCash Payment API -> redirect
  
Webhook/Callback
  |
  v
Edge Function: payment-webhook
  |-- Verifie le paiement
  |-- Met a jour companies (plan, dates)
  |-- Insere dans payments table
  |-- Log activite

Cron (quotidien)
  |
  v
Edge Function: subscription-reminders
  |-- Envoie rappels J-7, J-3, J-1
  |-- Desactive les abonnements expires
```

---

## Etape 1 : Schema de base de donnees

### Table `payments`

```sql
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  payment_method text NOT NULL, -- 'stripe', 'moncash', 'natcash'
  payment_reference text,       -- ID transaction externe
  status text NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  plan_id text REFERENCES subscription_plans(id),
  billing_period text,          -- 'monthly', 'annual'
  invoice_number text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
```

### Table `subscription_invoices`

```sql
CREATE TABLE public.subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  payment_id uuid REFERENCES payments(id),
  invoice_number text NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'USD',
  plan_name text,
  period_start date,
  period_end date,
  status text DEFAULT 'paid',
  pdf_url text,
  created_at timestamptz DEFAULT now()
);
```

RLS : isolation par `company_id`, super_admin voit tout.

---

## Etape 2 : Integration Stripe

Utiliser l'integration Stripe native de Lovable :
- Activer Stripe via l'outil `stripe--enable_stripe`
- Creer les produits/prix Stripe correspondant aux plans (basic, pro, premium) en monthly et annual
- Edge function `create-checkout` : cree une Stripe Checkout Session avec `success_url` et `cancel_url`
- Edge function `payment-webhook` : ecoute `checkout.session.completed` et `invoice.paid`
- A la reception du webhook : met a jour `companies.subscription_plan`, `subscription_end`, insere dans `payments`

---

## Etape 3 : Integration MonCash

MonCash (Digicel Haiti) utilise une REST API :
- Edge function `create-checkout` : appelle `POST /Api/v1/CreatePayment` avec montant en HTG
- Redirige l'utilisateur vers la page de paiement MonCash
- Edge function `payment-webhook` ou polling : verifie le statut via `POST /Api/v1/RetrieveTransactionPayment`
- Secrets necessaires : `MONCASH_CLIENT_ID`, `MONCASH_CLIENT_SECRET`

---

## Etape 4 : Integration NatCash

NatCash (Natcom Haiti) - integration similaire :
- API REST ou USSD callback selon la documentation disponible
- Secrets necessaires : `NATCASH_MERCHANT_ID`, `NATCASH_API_KEY`
- Meme pattern : creation de paiement -> redirect -> verification -> activation

---

## Etape 5 : Activation automatique

Edge function `payment-webhook` (commune aux 3 methodes) :
1. Verifie la signature/authentification du callback
2. Recupere le `payment` en base par reference
3. Met a jour `payments.status = 'completed'`
4. Met a jour `companies` : `subscription_plan`, `subscription_start`, `subscription_end` (+30j ou +365j)
5. Insere une facture dans `subscription_invoices`
6. Log dans `activity_logs`

---

## Etape 6 : Rappels et desactivation automatique

Edge function `subscription-reminders` (cron quotidien via pg_cron) :
- **J-7** : Log/notification "Votre abonnement expire dans 7 jours"
- **J-3** : Rappel urgent
- **J-1** : Dernier rappel
- **J+0** : Desactive l'entreprise si pas de renouvellement (optionnel : grace period de 3 jours)

Ajouter colonne `last_reminder_sent` sur `companies` pour eviter les doublons.

---

## Etape 7 : UI Frontend

### Modification de `ExpiredScreen.tsx`
- Boutons actifs avec choix du moyen de paiement (Stripe / MonCash / NatCash)
- Toggle mensuel/annuel (deja present dans CompanySettings)
- Redirection vers le checkout

### Modification de `UpgradeBanner.tsx`
- Lien direct vers la page de changement de plan

### Nouvelle page/dialog `PaymentSuccess.tsx`
- Confirmation apres paiement reussi
- Affiche le recap du plan active

### Section "Historique des paiements" dans `CompanySettings.tsx`
- Liste des paiements passes
- Telechargement des factures PDF

### Super Admin : onglet "Paiements"
- Vue globale de tous les paiements
- Filtres par methode, statut, entreprise
- KPI : revenus du mois, repartition par methode

---

## Ordre d'implementation

1. **Migration SQL** : tables `payments`, `subscription_invoices`, colonne `last_reminder_sent`
2. **Activer Stripe** via l'outil Lovable + configurer les secrets
3. **Edge function `create-checkout`** : support Stripe d'abord
4. **Edge function `payment-webhook`** : activation auto Stripe
5. **UI** : ExpiredScreen et UpgradeBanner avec boutons de paiement
6. **MonCash** : ajouter secrets + logique dans create-checkout et webhook
7. **NatCash** : idem
8. **Cron `subscription-reminders`** : rappels et desactivation
9. **Historique paiements** dans CompanySettings + factures
10. **Super Admin** : onglet Paiements

---

## Secrets requis

| Secret | Service |
|--------|---------|
| `STRIPE_SECRET_KEY` | Stripe (via outil Lovable) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks |
| `MONCASH_CLIENT_ID` | MonCash API |
| `MONCASH_CLIENT_SECRET` | MonCash API |
| `NATCASH_MERCHANT_ID` | NatCash API |
| `NATCASH_API_KEY` | NatCash API |

---

## Limites Phase 2

- Pas de renouvellement automatique recurrent (le client re-paie manuellement chaque mois/an)
- Pas de prorating (changement de plan = nouveau paiement complet)
- Les factures PDF sont basiques (generation via jspdf deja present)

