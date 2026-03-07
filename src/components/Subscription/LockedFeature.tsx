import { Lock, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface LockedFeatureProps {
  title?: string;
  description?: string;
  requiredPlan?: string;
}

export const LockedFeature = ({ 
  title = "Fonctionnalité Premium",
  description = "Cette fonctionnalité est disponible dans les plans payants.",
  requiredPlan = "Pro"
}: LockedFeatureProps) => {
  return (
    <Card className="border-dashed border-2 border-muted-foreground/20">
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          {description}
        </p>
        <Button variant="outline" className="gap-2" asChild>
          <a href="mailto:support@stockmanagement.app?subject=Upgrade%20vers%20le%20plan%20Pro">
            <ArrowUpCircle className="w-4 h-4" />
            Passer au plan {requiredPlan}
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};
