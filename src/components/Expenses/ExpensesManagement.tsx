import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses, Expense } from '@/hooks/useExpenses';
import { PeriodFilter, PeriodRange, defaultPeriod } from '@/components/common/PeriodFilter';
import { ExpenseFormDialog } from './ExpenseFormDialog';
import { ExpenseCategoryManager } from './ExpenseCategoryManager';
import { format } from 'date-fns';

export const ExpensesManagement = () => {
  const { role, user } = useAuth();
  const isAdmin = role === 'admin';
  const [period, setPeriod] = useState<PeriodRange>(defaultPeriod());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const startStr = format(period.start, 'yyyy-MM-dd');
  const endStr = useMemo(() => {
    const e = new Date(period.end);
    e.setDate(e.getDate() - 1);
    return format(e, 'yyyy-MM-dd');
  }, [period.end]);

  const { expenses, loading, refetch } = useExpenses(startStr, endStr);

  const totals = useMemo(() => {
    const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const mine = expenses.filter(e => e.user_id === user?.id).reduce((s, e) => s + Number(e.amount), 0);
    return { total, count: expenses.length, mine };
  }, [expenses, user?.id]);

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from('expenses').delete().eq('id', id);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
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
            <p className="text-2xl font-bold text-destructive">{totals.total.toFixed(2)} HTG</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Mes dépenses</p>
            <p className="text-2xl font-bold">{totals.mine.toFixed(2)} HTG</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" />Dépenses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Auteur</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Chargement…</TableCell></TableRow>
              ) : expenses.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune dépense sur la période</TableCell></TableRow>
              ) : expenses.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{format(new Date(e.expense_date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <div className="font-medium">{e.libelle}</div>
                    {e.description && <div className="text-xs text-muted-foreground">{e.description}</div>}
                  </TableCell>
                  <TableCell>{e.category?.nom ? <Badge variant="secondary">{e.category.nom}</Badge> : '—'}</TableCell>
                  <TableCell>{e.author?.full_name}</TableCell>
                  <TableCell className="text-right font-bold">{Number(e.amount).toFixed(2)} {e.currency}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {isAdmin && (
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

      {isAdmin && <ExpenseCategoryManager />}

      <ExpenseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={refetch}
      />
    </div>
  );
};
