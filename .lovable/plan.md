

## Plan : Support Multilingue (Français, Anglais, Espagnol)

### Approche

Utiliser **react-i18next** (standard de l'industrie React) avec des fichiers JSON de traduction. La langue sera persistée dans `localStorage` et accessible via un sélecteur dans le header + la page profil.

### Architecture

```text
src/
├── i18n/
│   ├── index.ts              ← Configuration i18next
│   ├── locales/
│   │   ├── fr.json            ← Français (langue par défaut)
│   │   ├── en.json            ← Anglais
│   │   └── es.json            ← Espagnol
```

### Étapes d'implémentation

**1. Installer et configurer i18next**
- Ajouter `react-i18next` et `i18next` comme dépendances
- Créer `src/i18n/index.ts` avec détection de langue via `localStorage`, fallback `fr`
- Initialiser dans `src/main.tsx`

**2. Créer les fichiers de traduction**
- Organiser par sections : `common`, `auth`, `dashboard`, `products`, `sales`, `settings`, `navigation`, `subscription`, `inventory`, `reports`
- `fr.json` : toutes les chaînes actuelles du code
- `en.json` et `es.json` : traductions correspondantes

**3. Ajouter un sélecteur de langue dans le header**
- Créer `src/components/ui/language-selector.tsx` avec un dropdown (drapeaux + nom de langue)
- L'intégrer dans `ResponsiveDashboardLayout.tsx` (header desktop + menu mobile)
- Également dans la page `Auth.tsx` (en haut à droite)

**4. Ajouter le choix de langue dans la page Profil**
- Ajouter une section "Langue / Language" dans `src/pages/Profile.tsx`

**5. Migrer les pages principales** (remplacement progressif)
- Commencer par : `Auth.tsx`, `ResponsiveDashboardLayout.tsx` (navigation), messages toast courants, `AdminDashboard.tsx`, `SellerDashboard.tsx`
- Les composants restants seront migrés dans les itérations suivantes

### Scope de cette première implémentation

On couvre :
- Infrastructure complète (i18n config, 3 fichiers de traduction)
- Sélecteur de langue (header + profil)
- Traduction de : navigation, auth, messages communs, titres de sections
- ~80% des chaînes visibles dans les pages principales

Les composants internes détaillés (formulaires produits, rapports avancés, etc.) pourront être migrés progressivement ensuite.

### Détails techniques

- **Bibliothèque** : `i18next` + `react-i18next` (hook `useTranslation()`)
- **Persistance** : `localStorage('i18nextLng')`
- **Fallback** : Français si traduction manquante
- **Pattern** : `const { t } = useTranslation()` puis `t('nav.dashboard')` au lieu de `"Tableau de bord"`
- **Sélecteur** : Composant `LanguageSelector` utilisant `i18n.changeLanguage()`

