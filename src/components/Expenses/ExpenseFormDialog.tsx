import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Expense } from '@/hooks/useExpenses';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: Expense | null;
  onSaved: () => void;
}

export const ExpenseFormDialog = ({ open, onOpenChange, editing, onSaved }: Props) => {
  const [form, setForm] = useState({
    libelle: '',
    description: '',
    amount: '',
    currency: 'HTG',
    expense_date: new Date().toISOString().slice(0, 10),
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
      setForm({
        libelle: '',
        description: '',
        amount: '',
        currency: 'HTG',
        expense_date: new Date().toISOString().slice(0, 10),
      });
    }
  }, [editing, open]);

  const save = async () => {
    if (!form.libelle.trim() || !form.amount) {
      toast({ title: 'Erreur', description: 'Libellé et montant sont requis', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      const company_id = (profile as any)?.company_id;
      if (!company_id) throw new Error('Aucune entreprise associée');

      const payload: any = {
        libelle: form.libelle.trim(),
        description: form.description.trim() || null,
        amount: parseFloat(form.amount),
        currency: form.currency,
        expense_date: form.expense_date,
      };

      if (editing) {
        const { error } = await (supabase as any).from('expenses').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Dépense modifiée' });
      } else {
        const { error } = await (supabase as any).from('expenses').insert({
          ...payload,
          user_id: user.id,
          company_id,
        });
        if (error) throw error;
        toast({ title: 'Dépense créée' });
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message || 'Impossible de sauvegarder', variant: 'destructive' });
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
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
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
          <div className="space-y-2">
            <Label>Date *</Label>
            <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
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
