import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Tag, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCompanyCategories, slugify, ENUM_CATEGORY_SLUGS, CompanyCategory } from '@/hooks/useCompanyCategories';

export const CategoryManagement = () => {
  const { categories, loading, refetch } = useCompanyCategories(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyCategory | null>(null);
  const [form, setForm] = useState({ nom: '', is_active: true, ordre: 0 });
  const [toDelete, setToDelete] = useState<CompanyCategory | null>(null);
  const [saving, setSaving] = useState(false);

  const isLegacy = (cat: CompanyCategory) => ENUM_CATEGORY_SLUGS.has(cat.slug);

  const openCreate = () => {
    setEditing(null);
    const maxOrdre = categories.reduce((m, c) => Math.max(m, c.ordre || 0), 0);
    setForm({ nom: '', is_active: true, ordre: maxOrdre + 1 });
    setIsOpen(true);
  };

  const openEdit = (cat: CompanyCategory) => {
    setEditing(cat);
    setForm({ nom: cat.nom, is_active: cat.is_active, ordre: cat.ordre || 0 });
    setIsOpen(true);
  };

  const save = async () => {
    if (!form.nom.trim()) {
      toast({ title: 'Erreur', description: 'Le nom est requis', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error('Non authentifié');
      const userId = userData.user.id;

      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', userId)
        .single();
      if (profErr) throw profErr;
      const company_id = (prof as any)?.company_id;
      if (!company_id) throw new Error('Aucune entreprise associée à votre compte');

      if (editing && isLegacy(editing)) {
        // Legacy: only allow ordre + is_active changes
        const { error } = await (supabase as any)
          .from('categories')
          .update({ is_active: form.is_active, ordre: form.ordre })
          .eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Catégorie mise à jour' });
      } else if (editing) {
        const { error } = await (supabase as any)
          .from('categories')
          .update({
            nom: form.nom.trim(),
            slug: slugify(form.nom),
            is_active: form.is_active,
            ordre: form.ordre,
          })
          .eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Catégorie modifiée' });
      } else {
        const { error } = await (supabase as any).from('categories').insert({
          nom: form.nom.trim(),
          slug: slugify(form.nom),
          is_active: form.is_active,
          ordre: form.ordre,
          company_id,
        });
        if (error) throw error;
        toast({ title: 'Catégorie créée' });
      }
      setIsOpen(false);
      refetch();
    } catch (e: any) {
      console.error('Category save error:', e);
      const details = [e?.message, e?.details, e?.hint].filter(Boolean).join(' — ');
      toast({ title: 'Erreur', description: details || 'Impossible de sauvegarder', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    if (isLegacy(toDelete)) {
      toast({ title: 'Impossible', description: 'Les catégories système ne peuvent pas être supprimées.', variant: 'destructive' });
      setToDelete(null);
      return;
    }
    try {
      const { count } = await (supabase as any)
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('categorie_id', toDelete.id);

      if ((count || 0) > 0) {
        const { error } = await (supabase as any).from('categories').update({ is_active: false }).eq('id', toDelete.id);
        if (error) throw error;
        toast({ title: 'Catégorie désactivée', description: `${count} produit(s) l'utilisent, elle a été désactivée.` });
      } else {
        const { error } = await (supabase as any).from('categories').delete().eq('id', toDelete.id);
        if (error) throw error;
        toast({ title: 'Catégorie supprimée' });
      }
      setToDelete(null);
      refetch();
    } catch (e: any) {
      console.error('Category delete error:', e);
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (cat: CompanyCategory) => {
    const { error } = await (supabase as any).from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else refetch();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            <CardTitle>Catégories de produits</CardTitle>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle catégorie
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map(cat => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isLegacy(cat) && <Lock className="h-3 w-3 text-muted-foreground" />}
                        {cat.nom}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{cat.slug}</TableCell>
                    <TableCell>
                      {isLegacy(cat) ? (
                        <Badge variant="secondary">Système</Badge>
                      ) : (
                        <Badge>Personnalisée</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch checked={cat.is_active} onCheckedChange={() => toggleActive(cat)} />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(cat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!isLegacy(cat) && (
                        <Button size="sm" variant="ghost" onClick={() => setToDelete(cat)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {categories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Aucune catégorie visible. Vérifiez votre compte entreprise.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                value={form.nom}
                onChange={e => setForm({ ...form, nom: e.target.value })}
                placeholder="Ex : Peinture"
                disabled={editing ? isLegacy(editing) : false}
              />
              {editing && isLegacy(editing) && (
                <p className="text-xs text-muted-foreground">Catégorie système — le nom ne peut pas être modifié.</p>
              )}
              {!editing && (
                <p className="text-xs text-muted-foreground">Slug généré : {slugify(form.nom) || '—'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Ordre d'affichage</Label>
              <Input type="number" value={form.ordre} onChange={e => setForm({ ...form, ordre: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={() => setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {toDelete?.nom} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Si des produits utilisent cette catégorie, elle sera désactivée au lieu d'être supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
