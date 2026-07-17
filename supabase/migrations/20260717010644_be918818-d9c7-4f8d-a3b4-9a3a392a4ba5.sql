
-- 1) has_role / is_super_admin honor is_active
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'super_admin' AND is_active = true
  )
$$;

-- 2) Prevent privilege escalation via user_roles INSERT/UPDATE
DROP POLICY IF EXISTS "Company admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can view company roles" ON public.user_roles
FOR SELECT USING (
  (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(),'admin'))
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Admins can insert company roles" ON public.user_roles
FOR INSERT WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    role::text <> 'super_admin'
    AND company_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(),'admin')
  )
);

CREATE POLICY "Admins can update company roles" ON public.user_roles
FOR UPDATE
USING (
  public.is_super_admin(auth.uid())
  OR (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(),'admin'))
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    role::text <> 'super_admin'
    AND company_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(),'admin')
  )
);

CREATE POLICY "Admins can delete company roles" ON public.user_roles
FOR DELETE USING (
  public.is_super_admin(auth.uid())
  OR (
    role::text <> 'super_admin'
    AND company_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(),'admin')
  )
);

-- 3) Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_company_id(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_seller_authorized_categories(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_seller_authorized_categorie_ids(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_database_history() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_user_to_admin(text) FROM PUBLIC, anon, authenticated;

-- 4) Restrict storage listing on public buckets (direct public URLs still work because buckets are public)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can view company assets" ON storage.objects;
