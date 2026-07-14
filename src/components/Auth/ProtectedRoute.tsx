import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
  allowedRoles?: Array<'admin' | 'seller'>;
}

export const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  // Periodically re-validate the token against the auth server
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        await supabase.auth.signOut();
        window.location.href = '/auth';
      }
    };
    const id = window.setInterval(check, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const target = role === 'admin' ? '/admin' : '/seller';
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};
