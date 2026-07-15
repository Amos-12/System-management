import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CompanyCategory {
  id: string;
  nom: string;
  slug: string;
  is_active: boolean;
  ordre: number | null;
}

// Slugs qui correspondent à l'enum product_category (historique)
export const ENUM_CATEGORY_SLUGS = new Set([
  'alimentaires', 'autres', 'blocs', 'boissons', 'ceramique',
  'electromenager', 'electronique', 'energie', 'fer', 'gazeuses',
  'materiaux_de_construction', 'vetements',
]);

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

export function useCompanyCategories(activeOnly = true) {
  const [categories, setCategories] = useState<CompanyCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = (supabase as any)
      .from('categories')
      .select('id, nom, slug, is_active, ordre')
      .order('ordre', { ascending: true })
      .order('nom', { ascending: true });
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) {
      console.error('[useCompanyCategories] fetch error:', error);
      setCategories([]);
    } else {
      setCategories((data as CompanyCategory[]) || []);
    }
    setLoading(false);
  }, [activeOnly]);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel('categories-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetch())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetch]);

  return { categories, loading, refetch: fetch };
}
