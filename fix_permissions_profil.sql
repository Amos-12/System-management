-- ============================================================
-- CORRECTIF : "Impossible de charger le profil d'utilisateur"
-- Cause : les politiques RLS appellent get_user_company_id()
-- mais le rôle "authenticated" n'a plus le droit EXECUTE
-- => erreur 42501 "permission denied for function get_user_company_id"
-- À exécuter dans Supabase -> SQL Editor
-- ============================================================

-- 1) Rendre exécutables les fonctions utilisées par les politiques RLS
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_user_company_id',
        'has_role',
        'is_super_admin',
        'is_admin',
        'get_user_role',
        'is_active_user'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
  END LOOP;
END $$;

-- 2) Vérification : la liste doit contenir "authenticated"
SELECT p.proname,
       p.oid::regprocedure AS signature,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_peut_executer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('get_user_company_id','has_role','is_super_admin','is_admin','get_user_role','is_active_user');
