import { Crown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';

export const UpgradeBanner = () => {
  const { isFreePlan, daysRemaining, loading } = useSubscription();

  if (loading || !isFreePlan) return null;

  return (
    <div className="relative overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 px-3 py-2 mb-4">
      <div className="flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
            <Crown className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-xs text-foreground truncate">
              Plan d'essai gratuit
              <span className="text-muted-foreground font-normal ml-1.5">
                {daysRemaining > 0 ? `· ${daysRemaining}j restant${daysRemaining > 1 ? 's' : ''}` : '· Expiré'}
              </span>
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-1 flex-shrink-0 h-7 text-xs px-2.5"
          onClick={() => {
            const email = 'support@stockmanager.app';
            const subject = encodeURIComponent('Demande de mise à niveau');
            window.open(`mailto:${email}?subject=${subject}`, '_blank');
          }}
        >
          <Crown className="w-3 h-3" />
          Upgrade
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};
