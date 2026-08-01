-- =====================================================================
-- Correctif base mono-tenant (qxauhjxjqyesvqdzxbnh)
-- A coller dans Supabase Dashboard -> SQL Editor -> Run
-- Aucun company_id n'est utilisé.
-- =====================================================================

-- 1) Lien produits -> catégories
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS categorie_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_categorie_id ON public.products(categorie_id);

-- 2) Autoriser les catégories personnalisées (enum devient facultatif)
ALTER TABLE public.products ALTER COLUMN category DROP NOT NULL;

-- 3) Lien catégories autorisées par vendeur
ALTER TABLE public.seller_authorized_categories
  ADD COLUMN IF NOT EXISTS categorie_id uuid REFERENCES public.categories(id) ON DELETE CASCADE;
ALTER TABLE public.seller_authorized_categories ALTER COLUMN category DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sac_categorie_id ON public.seller_authorized_categories(categorie_id);

-- 4) Colonnes attendues sur categories
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ordre integer DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_key ON public.categories(slug);

-- 5) Catégories legacy (slugs identiques à l'enum product_category)
INSERT INTO public.categories (nom, slug, ordre, is_active) VALUES
  ('Produits alimentaires', 'alimentaires', 1, true),
  ('Boissons',              'boissons', 2, true),
  ('Boissons gazeuses',     'gazeuses', 3, true),
  ('Blocs',                 'blocs', 4, true),
  ('Céramique',             'ceramique', 5, true),
  ('Fer',                   'fer', 6, true),
  ('Matériaux de construction', 'materiaux_de_construction', 7, true),
  ('Électroménager',        'electromenager', 8, true),
  ('Électronique',          'electronique', 9, true),
  ('Énergie',               'energie', 10, true),
  ('Vêtements',             'vetements', 11, true),
  ('Autres',                'autres', 12, true)
ON CONFLICT (slug) DO NOTHING;

-- 6) Rattacher les produits existants à leur catégorie
UPDATE public.products p
SET categorie_id = c.id
FROM public.categories c
WHERE p.categorie_id IS NULL
  AND c.slug = p.category::text;

-- 7) Accès (mono-tenant : tout utilisateur authentifié)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
GRANT SELECT ON public.categories TO anon;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_select" ON public.categories;
DROP POLICY IF EXISTS "categories_write" ON public.categories;
CREATE POLICY "categories_select" ON public.categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_write" ON public.categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8) Rafraîchir le cache de schéma PostgREST
NOTIFY pgrst, 'reload schema';
   