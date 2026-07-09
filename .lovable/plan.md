## Problème

Dans `SellerDashboardStats.tsx`, les statistiques sont calculées en récupérant TOUTES les ventes via `.select('id, total_amount')` puis en comptant côté client avec `allSales.length`. Supabase limite les requêtes à **1000 lignes par défaut**, donc le compteur plafonne à 1000 dès qu'un vendeur dépasse ce seuil, et les revenus totaux sont sous-évalués.

De plus, la requête `sale_items` utilise `.in('sale_id', allSales.map(...))` qui échoue silencieusement (URL trop longue) au-delà de quelques centaines d'IDs — ce qui explique aussi que les stats ne s'affichent plus / restent vides pour les vendeurs actifs.

## Correctifs

1. **Remplacer les `SELECT` de comptage par `head: true, count: 'exact'`** pour obtenir le nombre réel de ventes (aujourd'hui / semaine / mois / total) sans limite de 1000.
2. **Calculer les revenus via agrégation** : soit en paginant explicitement (batches de 1000), soit en utilisant plusieurs requêtes ciblées avec `range()` jusqu'à épuisement. Approche retenue : boucle de pagination par 1000 pour cumuler `total_amount` par période, uniquement quand nécessaire.
3. **Top produits** : au lieu de `.in('sale_id', [...idsMassifs])`, requêter directement `sale_items` filtré par `seller_id` via jointure implicite — utiliser une requête sur `sale_items` avec `sales!inner(seller_id)` et filtre `.eq('sales.seller_id', user.id)`, puis paginer.
4. **Aucune modification de logique métier** : les périodes (jour / 7j glissants / 30j) et l'affichage restent identiques.

### Détails techniques

```ts
// Compteurs sans limite
const { count: totalCount } = await supabase
  .from('sales')
  .select('id', { count: 'exact', head: true })
  .eq('seller_id', user.id);

// Somme paginée
async function sumRevenue(fromISO?: string) {
  let total = 0, from = 0; const size = 1000;
  while (true) {
    let q = supabase.from('sales').select('total_amount')
      .eq('seller_id', user.id).range(from, from + size - 1);
    if (fromISO) q = q.gte('created_at', fromISO);
    const { data, error } = await q;
    if (error) throw error;
    total += (data ?? []).reduce((s, r) => s + Number(r.total_amount), 0);
    if (!data || data.length < size) break;
    from += size;
  }
  return total;
}

// Top produits via jointure
supabase.from('sale_items')
  .select('product_name, quantity, subtotal, sales!inner(seller_id)')
  .eq('sales.seller_id', user.id);
```

## Fichier modifié

- `src/components/Dashboard/SellerDashboardStats.tsx` — refonte de `fetchStats()` uniquement.
