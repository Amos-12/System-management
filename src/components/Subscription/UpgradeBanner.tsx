import { Crown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';

export const UpgradeBanner = () => {
  const { isFreePlan, daysRemaining, loading } = useSubscription();

  if (loading || !isFreePlan) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-4 mb-6">
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-primary/5 blur-2xl" />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">
              Vous utilisez le plan d'essai gratuit
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {daysRemaining > 0
                ? `Il vous reste ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} — débloquez toutes les fonctionnalités premium.`
                : 'Votre essai est terminé — passez à un plan payant pour continuer.'}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-1.5 flex-shrink-0"
          onClick={() => {
            const email = 'support@stockmanager.app';
            const subject = encodeURIComponent('Demande de mise à niveau');
            window.open(`mailto:${email}?subject=${subject}`, '_blank');
          }}
        >
          <Crown className="w-3.5 h-3.5" />
          Passer au Premium
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
