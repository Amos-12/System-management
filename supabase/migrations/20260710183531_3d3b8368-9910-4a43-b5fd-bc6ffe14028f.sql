
INSERT INTO public.categories (company_id, nom, slug, is_active, ordre)
SELECT c.id, v.nom, v.slug, true, v.ordre
FROM public.companies c
CROSS JOIN (VALUES
  ('Alimentaires','alimentaires',1),('Boissons','boissons',2),('Gazeuses','gazeuses',3),
  ('Blocs','blocs',4),('Céramique','ceramique',5),('Fer','fer',6),
  ('Matériaux de construction','materiaux_de_construction',7),('Électroménager','electromenager',8),
  ('Électronique','electronique',9),('Énergie','energie',10),('Vêtements','vetements',11),('Autres','autres',12)
) AS v(nom, slug, ordre)
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS categories_company_slug_uniq ON public.categories(company_id, slug);

UPDATE public.products p
SET categorie_id = c.id
FROM public.categories c
WHERE p.categorie_id IS NULL AND c.company_id = p.company_id AND c.slug = p.category::text;

ALTER TABLE public.seller_authorized_categories
  ADD COLUMN IF NOT EXISTS categorie_id uuid REFERENCES public.categories(id) ON DELETE CASCADE;

UPDATE public.seller_authorized_categories s
SET categorie_id = c.id
FROM public.categories c
WHERE s.categorie_id IS NULL AND c.company_id = s.company_id AND c.slug = s.category::text;

CREATE UNIQUE INDEX IF NOT EXISTS sac_user_categorie_uniq
  ON public.seller_authorized_categories(user_id, categorie_id) WHERE categorie_id IS NOT NULL;

ALTER TABLE public.products ALTER COLUMN category DROP NOT NULL;
ALTER TABLE public.seller_authorized_categories ALTER COLUMN category DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.get_seller_authorized_categorie_ids(_user_id uuid)
RETURNS TABLE(categorie_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sac.categorie_id FROM public.seller_authorized_categories sac
  WHERE sac.user_id = _user_id AND sac.categorie_id IS NOT NULL
  UNION ALL
  SELECT NULL::uuid WHERE NOT EXISTS (
    SELECT 1 FROM public.seller_authorized_categories
    WHERE user_id = _user_id AND categorie_id IS NOT NULL
  );
$$;
