import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_USD_TO_HTG } from '@/lib/currency';

/**
 * Lit le taux USD -> HTG depuis company_settings.
 * Repli sur la valeur par défaut si la colonne ou la valeur est absente.
 */
export function useExchangeRate() {
  const [rate, setRate] = useState<number>(DEFAULT_USD_TO_HTG);
  const [configured, setConfigured] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('company_settings')
          .select('*')
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        const value = Number((data as any)?.usd_to_htg_rate);
        if (!mounted) return;
        if (value && value > 0) {
          setRate(value);
          setConfigured(true);
        } else {
          setRate(DEFAULT_USD_TO_HTG);
          setConfigured(false);
        }
      } catch (e) {
        if (!mounted) return;
        setRate(DEFAULT_USD_TO_HTG);
        setConfigured(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { rate, configured, loading };
}
