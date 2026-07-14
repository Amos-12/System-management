import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useExpenseCategories } from '@/hooks/useExpenses';

export const ExpenseCategoryManager = () => {
  const { categories, refetch } = useExpenseCategories();
  const [nom, setNom] = useState('');

  const add = async () => {
    if (!nom.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user!.id).single();
    const { error } = await (supabase as any).from('expense_categories').insert({
      nom: nom.trim(),
      company_id: (profile as any).company_id,
    });
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      setNom('');
      refetch();
    }
  };

  const toggle = async (id: string, is_active: boolean) => {
    await (supabase as any).from('expense_categories').update({ is_active: !is_active }).eq('id', id);
    refetch();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from('expense_categories').delete().eq('id', id);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else refetch();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catégories de dépenses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Nouvelle catégorie" value={nom} onChange={(e) => setNom(e.target.value)} />
          <Button onClick={add}><Plus className="w-4 h-4 mr-2" />Ajouter</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map(c => (
              <TableRow key={c.id}>
                <TableCell>{c.nom}</TableCell>
                <TableCell><Switch checked={c.is_active} onCheckedChange={() => toggle(c.id, c.is_active)} /></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Aucune catégorie</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
