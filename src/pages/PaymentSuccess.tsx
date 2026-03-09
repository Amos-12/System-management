import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const sessionId = searchParams.get('session_id');
  const plan = searchParams.get('plan') || 'basic';

  const planNames: Record<string, string> = {
    basic: 'Basic',
    pro: 'Pro',
    premium: 'Premium',
  };

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setErrorMessage('Session de paiement introuvable.');
      return;
    }

    let attempt = 0;
    const maxAttempts = 3;

    const verify = async () => {
      attempt++;
      try {
        const { data, error } = await supabase.functions.invoke('verify-checkout-session', {
          body: { session_id: sessionId },
        });

        if (error) throw new Error(error.message);

        if (data?.success) {
          setStatus('success');
          return;
        }

        // Payment not yet processed by Stripe
        if (attempt < maxAttempts) {
          setTimeout(verify, 2500);
        } else {
          setStatus('error');
          setErrorMessage('Le paiement n\'a pas pu être vérifié. Contactez le support si le montant a été débité.');
        }
      } catch (err: any) {
        if (attempt < maxAttempts) {
          setTimeout(verify, 2500);
        } else {
          setStatus('error');
          setErrorMessage(err.message || 'Erreur lors de la vérification du paiement.');
        }
      }
    };

    verify();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
              <h1 className="text-xl font-bold">Vérification du paiement...</h1>
              <p className="text-muted-foreground text-sm">
                Veuillez patienter pendant que nous confirmons votre paiement.
              </p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-xl font-bold">Paiement confirmé !</h1>
              <p className="text-muted-foreground text-sm">
                Votre plan <span className="font-semibold text-foreground">{planNames[plan] || plan}</span> est maintenant actif.
              </p>
              <Button onClick={() => navigate('/')} className="gap-2 mt-4">
                Accéder à l'application
                <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-xl font-bold">Vérification échouée</h1>
              <p className="text-muted-foreground text-sm">{errorMessage}</p>
              <Button onClick={() => navigate('/')} variant="outline" className="gap-2 mt-4">
                Retour à l'application
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
