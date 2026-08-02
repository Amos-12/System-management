import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Wallet, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses, Expense } from '@/hooks/useExpenses';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { toHTG, formatHTG } from '@/lib/currency';
import { PeriodFilter, PeriodRange, defaultPeriod } from '@/components/common/PeriodFilter';
import { ExpenseFormDialog } from './ExpenseFormDialog';

import { format } from 'date-fns';

export const ExpensesManagement = () => {
  const { role, user } = useAuth();
  const isAdmin = role === 'admin';
  const { rate, configured } = useExchangeRate();
  const [period, setPeriod] = useState<PeriodRange>(defaultPeriod());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const startStr = format(period.start, 'yyyy-MM-dd');
  const endStr = useMemo(() => {
    const e = new Date(period.end);
    e.setDate(e.getDate() - 1);
    return format(e, 'yyyy-MM-dd');
  }, [period.end]);

  const { expenses, loading, error, refetch } = useExpenses(
    startStr,
    endStr,
    isAdmin ? 'all' : 'mine',
    user?.id ?? null
  );

  const totals = useMemo(() => {
    const total = expenses.reduce((s, e) => s + toHTG(e.amount, e.currency, rate), 0);
    const mine = expenses
      .filter(e => e.user_id === user?.id)
      .reduce((s, e) => s + toHTG(e.amount, e.currency, rate), 0);
    return { total, count: expenses.length, mine };
  }, [expenses, user?.id, rate]);

  const canEdit = (e: Expense) => isAdmin || e.user_id === user?.id;

  const remove = async (id: string) => {
    const { error: err } = await (supabase as any).from('expenses').delete().eq('id', id);
    if (err) toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    else { toast({ title: 'Dépense supprimée' }); refetch(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodFilter value={period} onChange={setPeriod} />
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Nouvelle dépense
        </Button>
      </div>

      {!configured && (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 text-warning" />
          <span>
            Aucun taux USD → HTG configuré. Le taux par défaut ({rate}) est utilisé pour les conversions.
            {isAdmin && ' Définissez-le dans Paramètres.'}
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Impossible de charger les dépenses : {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Nombre de dépenses</p>
            <p className="text-2xl font-bold">{totals.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total (période)</p>
            <p className="text-2xl font-bold text-destructive">{formatHTG(totals.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Mes dépenses</p>
            <p className="text-2xl font-bold">{formatHTG(totals.mine)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            {isAdmin ? 'Dépenses' : 'Mes dépenses'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Auteur</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Chargement…</TableCell></TableRow>
              ) : expenses.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune dépense sur la période</TableCell></TableRow>
              ) : expenses.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{format(new Date(e.expense_date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <div className="font-medium">{e.libelle}</div>
                    {e.description && <div className="text-xs text-muted-foreground">{e.description}</div>}
                  </TableCell>
                  <TableCell>{e.author?.full_name}</TableCell>
                  <TableCell className="text-right font-bold">
                    {Number(e.amount).toFixed(2)} {e.currency}
                    {e.currency === 'USD' && (
                      <div className="text-xs font-normal text-muted-foreground">
                        ≈ {formatHTG(toHTG(e.amount, e.currency, rate))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {canEdit(e) && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(e); setDialogOpen(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cette dépense ?</AlertDialogTitle>
                              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(e.id)}>Supprimer</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ExpenseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={refetch}
      />
    </div>
  );
};
