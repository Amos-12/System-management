import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const plan = searchParams.get('plan') || 'basic';

  useEffect(() => {
    // Give webhook time to process
    const timer = setTimeout(() => setVerifying(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const planNames: Record<string, string> = {
    basic: 'Basic',
    pro: 'Pro',
    premium: 'Premium',
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          {verifying ? (
            <>
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
              <h1 className="text-xl font-bold">Vérification du paiement...</h1>
              <p className="text-muted-foreground text-sm">
                Veuillez patienter pendant que nous confirmons votre paiement.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-xl font-bold">Paiement confirmé !</h1>
              <p className="text-muted-foreground text-sm">
                Votre plan <span className="font-semibold text-foreground">{planNames[plan] || plan}</span> est maintenant actif.
                Vous pouvez accéder à toutes les fonctionnalités incluses.
              </p>
              <Button onClick={() => navigate('/')} className="gap-2 mt-4">
                Accéder à l'application
                <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
