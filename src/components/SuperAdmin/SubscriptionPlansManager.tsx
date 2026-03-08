import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CreditCard, Plus, Pencil, Save } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  max_users: number;
  max_products: number;
  max_sales_monthly: number;
  is_active: boolean;
  features: any;
}

interface PlanForm {
  id: string;
  name: string;
  price_monthly: number;
  max_users: number;
  max_products: number;
  max_sales_monthly: number;
  is_active: boolean;
}

const defaultForm: PlanForm = {
  id: '',
  name: '',
  price_monthly: 0,
  max_users: 5,
  max_products: 100,
  max_sales_monthly: 999999,
  is_active: true,
};

export const SubscriptionPlansManager = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanForm>(defaultForm);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('subscription_plans').select('*').order('price_monthly');
      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const openCreate = () => {
    setEditingPlan(defaultForm);
    setIsEditing(false);
    setDialogOpen(true);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditingPlan({
      id: plan.id,
      name: plan.name,
      price_monthly: plan.price_monthly,
      max_users: plan.max_users,
      max_products: plan.max_products,
      max_sales_monthly: plan.max_sales_monthly,
      is_active: plan.is_active ?? true,
    });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingPlan.id || !editingPlan.name) {
      toast({ title: 'Erreur', description: 'ID et nom requis', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);

      if (isEditing) {
        const { error } = await supabase.from('subscription_plans').update({
          name: editingPlan.name,
          price_monthly: editingPlan.price_monthly,
          max_users: editingPlan.max_users,
          max_products: editingPlan.max_products,
          max_sales_monthly: editingPlan.max_sales_monthly,
          is_active: editingPlan.is_active,
        }).eq('id', editingPlan.id);
        if (error) throw error;
        toast({ title: 'Plan modifié' });
      } else {
        const { error } = await supabase.from('subscription_plans').insert({
          id: editingPlan.id,
          name: editingPlan.name,
          price_monthly: editingPlan.price_monthly,
          max_users: editingPlan.max_users,
          max_products: editingPlan.max_products,
          max_sales_monthly: editingPlan.max_sales_monthly,
          is_active: editingPlan.is_active,
        });
        if (error) throw error;
        toast({ title: 'Plan créé' });
      }

      setDialogOpen(false);
      fetchPlans();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message || 'Échec de la sauvegarde', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const togglePlanActive = async (planId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase.from('subscription_plans').update({ is_active: !currentActive }).eq('id', planId);
      if (error) throw error;
      toast({ title: currentActive ? 'Plan désactivé' : 'Plan activé' });
      fetchPlans();
    } catch (err) {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Plans d'abonnement ({plans.length})
          </CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Nouveau plan
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Chargement...</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Prix/mois</TableHead>
                  <TableHead>Max utilisateurs</TableHead>
                  <TableHead>Max produits</TableHead>
                  <TableHead>Max ventes/mois</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map(plan => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">{plan.id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">${plan.price_monthly}</TableCell>
                    <TableCell>{plan.max_users >= 999999 ? '∞' : plan.max_users}</TableCell>
                    <TableCell>{plan.max_products >= 999999 ? '∞' : plan.max_products}</TableCell>
                    <TableCell>{plan.max_sales_monthly >= 999999 ? '∞' : plan.max_sales_monthly}</TableCell>
                    <TableCell>
                      <Badge variant={plan.is_active ? 'outline' : 'destructive'} className={plan.is_active ? 'border-green-500 text-green-600' : ''}>
                        {plan.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => togglePlanActive(plan.id, plan.is_active ?? true)}>
                          {plan.is_active ? 'Désactiver' : 'Activer'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Modifier le plan' : 'Nouveau plan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ID (identifiant unique)</Label>
              <Input value={editingPlan.id} onChange={e => setEditingPlan(p => ({ ...p, id: e.target.value }))} disabled={isEditing} placeholder="ex: enterprise" />
            </div>
            <div>
              <Label>Nom</Label>
              <Input value={editingPlan.name} onChange={e => setEditingPlan(p => ({ ...p, name: e.target.value }))} placeholder="ex: Enterprise" />
            </div>
            <div>
              <Label>Prix mensuel ($)</Label>
              <Input type="number" value={editingPlan.price_monthly} onChange={e => setEditingPlan(p => ({ ...p, price_monthly: Number(e.target.value) }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Max users</Label>
                <Input type="number" value={editingPlan.max_users} onChange={e => setEditingPlan(p => ({ ...p, max_users: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Max produits</Label>
                <Input type="number" value={editingPlan.max_products} onChange={e => setEditingPlan(p => ({ ...p, max_products: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Max ventes</Label>
                <Input type="number" value={editingPlan.max_sales_monthly} onChange={e => setEditingPlan(p => ({ ...p, max_sales_monthly: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editingPlan.is_active} onCheckedChange={v => setEditingPlan(p => ({ ...p, is_active: v }))} />
              <Label>Actif</Label>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
