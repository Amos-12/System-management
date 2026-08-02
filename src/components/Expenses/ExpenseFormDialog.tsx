import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Expense } from '@/hooks/useExpenses';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { toHTG, formatHTG } from '@/lib/currency';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: Expense | null;
  onSaved: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export const ExpenseFormDialog = ({ open, onOpenChange, editing, onSaved }: Props) => {
  const { rate } = useExchangeRate();
  const [form, setForm] = useState({
    libelle: '',
    description: '',
    amount: '',
    currency: 'HTG',
    expense_date: today(),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        libelle: editing.libelle,
        description: editing.description || '',
        amount: String(editing.amount),
        currency: editing.currency,
        expense_date: editing.expense_date,
      });
    } else {
      setForm({ libelle: '', description: '', amount: '', currency: 'HTG', expense_date: today() });
    }
  }, [editing, open]);

  const preview = useMemo(() => {
    const value = parseFloat(form.amount);
    if (!value || form.currency !== 'USD') return null;
    return formatHTG(toHTG(value, 'USD', rate));
  }, [form.amount, form.currency, rate]);

  const save = async () => {
    const libelle = form.libelle.trim();
    const amount = parseFloat(form.amount);

    if (!libelle) {
      toast({ title: 'Erreur', description: 'Le libellé est requis', variant: 'destructive' });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: 'Erreur', description: 'Le montant doit être supérieur à 0', variant: 'destructive' });
      return;
    }
    if (!form.expense_date) {
      toast({ title: 'Erreur', description: 'La date est requise', variant: 'destructive' });
      return;
    }
    if (form.expense_date > today()) {
      toast({ title: 'Erreur', description: 'La date ne peut pas être dans le futur', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Session expirée, veuillez vous reconnecter');

      const payload: any = {
        libelle,
        description: form.description.trim() || null,
        amount,
        currency: form.currency,
        expense_date: form.expense_date,
      };

      if (editing) {
        const { error } = await (supabase as any)
          .from('expenses')
          .update(payload)
          .eq('id', editing.id)
          .select('id');
        if (error) throw error;
        toast({ title: 'Dépense modifiée' });
      } else {
        // L'auteur est toujours l'utilisateur connecté
        const { error } = await (supabase as any)
          .from('expenses')
          .insert({ ...payload, user_id: user.id })
          .select('id');
        if (error) throw error;
        toast({ title: 'Dépense créée' });
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      const msg: string = e?.message || 'Impossible de sauvegarder';
      toast({
        title: 'Erreur',
        description: /row-level security|permission/i.test(msg)
          ? "Vous n'avez pas l'autorisation d'effectuer cette action."
          : msg,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Modifier la dépense' : 'Nouvelle dépense'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Libellé *</Label>
            <Input value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Montant *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Devise</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HTG">HTG</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {preview && (
            <p className="text-xs text-muted-foreground">Équivalent : {preview} (taux {rate})</p>
          )}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Input
              type="date"
              max={today()}
              value={form.expense_date}
              onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
