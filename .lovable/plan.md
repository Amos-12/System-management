
# Phase 2 - Paiements automatises et facturation

## Statut : EN COURS

## Complété
- [x] Tables `payments` et `subscription_invoices` créées avec RLS
- [x] Colonne `last_reminder_sent` ajoutée à `companies`
- [x] Stripe activé + 3 produits/prix créés (Basic $19, Pro $39, Premium $59)
- [x] Edge function `create-checkout` (Stripe + MonCash)
- [x] Edge function `payment-webhook` (activation auto)
- [x] Edge function `subscription-reminders` (rappels J-7/J-3/J-1 + désactivation)
- [x] UI: `ExpiredScreen` avec sélection Stripe/MonCash
- [x] UI: `UpgradeBanner` avec checkout Stripe direct
- [x] Page `PaymentSuccess` avec confirmation
- [x] Route `/payment-success` ajoutée

## Stripe IDs
| Plan | Product ID | Price ID |
|------|-----------|----------|
| Basic ($19/mo) | prod_U70o75L2Udqzx3 | price_1T8mnKAOoIXoYDc8xUbIfLlU |
| Pro ($39/mo) | prod_U70pcM3cVvX4y4 | price_1T8mnuAOoIXoYDc8iRjrdyIC |
| Premium ($59/mo) | prod_U70rau26HqWTvN | price_1T8mq4AOoIXoYDc8SRmqM10l |

## Reste à faire
- [ ] Configurer secrets MonCash (`MONCASH_CLIENT_ID`, `MONCASH_CLIENT_SECRET`)
- [ ] Configurer secrets NatCash (`NATCASH_MERCHANT_ID`, `NATCASH_API_KEY`)
- [ ] Implémenter NatCash dans create-checkout
- [ ] Configurer Stripe webhook URL dans le dashboard Stripe
- [ ] Configurer `STRIPE_WEBHOOK_SECRET`
- [ ] Cron job pour `subscription-reminders` (pg_cron)
- [x] Historique paiements dans CompanySettings
- [x] Onglet Paiements dans Super Admin (PaymentsPanel avec KPIs, table paiements/factures)
- [ ] Factures PDF téléchargeables
