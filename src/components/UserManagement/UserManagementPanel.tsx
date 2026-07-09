import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Users, UserCheck, Mail, Calendar, Search, UserPlus, RefreshCcw, Settings, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  full_name: string;
  email?: string;
  role: 'admin' | 'seller';
  is_active: boolean;
  created_at: string;
}

const ALL_CATEGORIES = [
  { value: 'alimentaires', label: 'Alimentaires' },
  { value: 'boissons', label: 'Boissons' },
  { value: 'gazeuses', label: 'Gazeuses' },
  { value: 'electronique', label: 'Électronique' },
  { value: 'ceramique', label: 'Céramique' },
  { value: 'fer', label: 'Fer / Acier' },
  { value: 'materiaux_de_construction', label: 'Matériaux de construction' },
  { value: 'energie', label: 'Énergie' },
  { value: 'blocs', label: 'Blocs' },
  { value: 'vetements', label: 'Vêtements' },
  { value: 'autres', label: 'Autres' }
];

export const UserManagementPanel = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [emailToPromote, setEmailToPromote] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);
  const [selectedUserCategories, setSelectedUserCategories] = useState<{
    userId: string;
    userName: string;
    categories: string[];
  }>({ userId: '', userName: '', categories: [] });
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch user roles and statuses
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('user_id, role, is_active');

      if (error) throw error;

      const userIds = userRoles?.map((ur) => ur.user_id) || [];
      if (userIds.length === 0) {
        setUsers([]);
        return;
      }

      // Fetch profiles with emails in a single query
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, created_at')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(
        (profilesData || []).map((p: any) => [p.user_id, p])
      );

      const usersData = (userRoles || []).map((userRole: any) => {
        const profile = profileMap.get(userRole.user_id);
        return {
          id: userRole.user_id,
          full_name: profile?.full_name || 'Nom non défini',
          email: profile?.email || 'Email non défini',
          role: userRole.role,
          is_active: userRole.is_active,
          created_at: profile?.created_at || new Date().toISOString(),
        };
      });

      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: !currentStatus })
        .eq('user_id', userId);

      if (error) throw error;

      // Get user info for logging
      const currentUser = users.find(u => u.id === userId);
      
      // Get current user ID from auth
      const { data: { user } } = await supabase.auth.getUser();

      if (currentUser && user) {
        // Log user activation/deactivation
        const actionType = !currentStatus ? 'user_approved' : 'user_deactivated';
        const description = !currentStatus
          ? `Utilisateur "${currentUser.full_name}" approuvé et activé`
          : `Utilisateur "${currentUser.full_name}" désactivé`;

        await (supabase as any).from('activity_logs').insert({
          user_id: user.id,
          action_type: actionType,
          entity_type: 'user',
          entity_id: userId,
          description: description,
          metadata: {
            target_user_name: currentUser.full_name,
            target_user_email: currentUser.email,
            new_status: !currentStatus
          }
        });
      }

      toast({
        title: "Succès",
        description: !currentStatus ? "Vendeur activé avec succès" : "Vendeur désactivé"
      });

      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        variant: "destructive"
      });
    }
  };

  const handlePromoteToAdmin = async () => {
    if (!emailToPromote.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir une adresse email",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsPromoting(true);
      
      const { data, error } = await supabase.rpc('promote_user_to_admin', {
        user_email: emailToPromote.trim()
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Utilisateur promu administrateur avec succès"
      });

      setEmailToPromote('');
      fetchUsers();
    } catch (error) {
      console.error('Error promoting user:', error);
      toast({
        title: "Erreur",
        description: "Impossible de promouvoir l'utilisateur",
        variant: "destructive"
      });
    } finally {
      setIsPromoting(false);
    }
  };

  const loadUserCategories = async (userId: string, userName: string) => {
    try {
      const { data, error } = await supabase
        .from('seller_authorized_categories' as any)
        .select('category')
        .eq('user_id', userId);

      if (error) throw error;

      setSelectedUserCategories({
        userId,
        userName,
        categories: data?.map(d => d.category) || []
      });
      setIsCategoryDialogOpen(true);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les catégories",
        variant: "destructive"
      });
    }
  };

  const toggleCategory = (category: string, checked: boolean | string) => {
    const isChecked = checked === true;
    setSelectedUserCategories(prev => ({
      ...prev,
      categories: isChecked
        ? [...prev.categories, category]
        : prev.categories.filter(c => c !== category)
    }));
  };

  const saveUserCategories = async () => {
    try {
      const { userId, categories } = selectedUserCategories;

      // Delete all existing categories for this user
      await supabase
        .from('seller_authorized_categories' as any)
        .delete()
        .eq('user_id', userId);

      // Insert new categories if any selected
      if (categories.length > 0) {
        const rows = categories.map(cat => ({
          user_id: userId,
          category: cat as any
        }));

        const { error } = await supabase
          .from('seller_authorized_categories' as any)
          .insert(rows);

        if (error) throw error;
      }

      toast({
        title: "Succès",
        description: categories.length > 0 
          ? "Catégories autorisées mises à jour" 
          : "Toutes les catégories sont maintenant accessibles"
      });

      setIsCategoryDialogOpen(false);
      setSelectedUserCategories({ userId: '', userName: '', categories: [] });
    } catch (error) {
      console.error('Error saving categories:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les catégories",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string, userRole: string, isActive: boolean) => {
    try {
      console.log('🗑️ Tentative de suppression:', { userId, userName, userRole, isActive });
      
      // Double vérification côté client
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser?.id === userId) {
        console.error('❌ Tentative de suppression de son propre compte');
        toast({
          title: "Erreur",
          description: "Vous ne pouvez pas supprimer votre propre compte",
          variant: "destructive"
        });
        return;
      }
      
      if (userRole === 'seller' && isActive) {
        console.error('❌ Tentative de suppression d\'un vendeur actif');
        toast({
          title: "Erreur",
          description: "Veuillez d'abord désactiver ce vendeur avant de le supprimer",
          variant: "destructive"
        });
        return;
      }
      
      console.log('📞 Appel de la fonction delete_user_account...');
      const { data, error } = await supabase.rpc('delete_user_account', {
        target_user_id: userId
      });
      
      if (error) {
        console.error('❌ Erreur RPC delete_user_account:', error);
        throw error;
      }
      
      console.log('✅ Réponse de delete_user_account:', data);
      
      toast({
        title: "Succès",
        description: `Compte de ${userName} supprimé avec succès. Les données historiques ont été conservées.`
      });
      
      fetchUsers();
    } catch (error: any) {
      console.error('❌ Erreur lors de la suppression:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      });
      
      // Messages d'erreur plus descriptifs
      let errorMessage = "Impossible de supprimer le compte";
      
      if (error.message?.includes('Seuls les administrateurs')) {
        errorMessage = "Vous n'avez pas les permissions nécessaires";
      } else if (error.message?.includes('propre compte')) {
        errorMessage = "Vous ne pouvez pas supprimer votre propre compte";
      } else if (error.message?.includes('vendeur actif')) {
        errorMessage = "Désactivez d'abord ce vendeur avant de le supprimer";
      } else if (error.message?.includes('non trouvé')) {
        errorMessage = "Utilisateur introuvable";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erreur de suppression",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUsers = users.length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const sellerUsers = users.filter(u => u.role === 'seller').length;

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Users className="w-8 h-8 text-primary animate-pulse mr-2" />
            <span className="text-muted-foreground">Chargement des utilisateurs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrateurs</CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{adminUsers}</div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendeurs</CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{sellerUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Gestion des Utilisateurs
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={fetchUsers} title="Rafraîchir">
                <RefreshCcw className="w-4 h-4" />
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="default" className="bg-primary hover:bg-primary-hover">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Promouvoir Admin
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Promouvoir un utilisateur</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium">
                        Email de l'utilisateur
                      </label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        value={emailToPromote}
                        onChange={(e) => setEmailToPromote(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={handlePromoteToAdmin}
                      disabled={isPromoting}
                      className="w-full"
                    >
                      {isPromoting ? 'Promotion...' : 'Promouvoir Admin'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Users Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead className="hidden md:table-cell">Créé le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-muted-foreground sm:hidden">
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className={user.role === 'admin' ? 'bg-primary' : ''}
                      >
                        {user.role === 'admin' ? 'Admin' : 'Vendeur'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === 'seller' ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.is_active}
                            onCheckedChange={() => handleToggleActive(user.id, user.is_active)}
                          />
                          <span className="text-sm text-muted-foreground">
                            {user.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="outline">Admin</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.role === 'seller' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => loadUserCategories(user.id, user.full_name)}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Catégories
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              disabled={user.role === 'seller' && user.is_active}
                              title={user.role === 'seller' && user.is_active ? "Désactivez d'abord ce vendeur" : "Supprimer le compte"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                              <AlertDialogDescription>
                                Voulez-vous vraiment supprimer le compte de <strong>{user.full_name}</strong> ?
                                <br /><br />
                                ⚠️ Cette action est irréversible mais les données historiques (ventes, transactions) seront conservées.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteUser(user.id, user.full_name, user.role, user.is_active)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun utilisateur trouvé</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Management Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gérer les catégories autorisées</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedUserCategories.userName}
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                {selectedUserCategories.categories.length === 0 
                  ? "✅ Ce vendeur a accès à toutes les catégories"
                  : `🔒 Ce vendeur n'a accès qu'aux ${selectedUserCategories.categories.length} catégorie(s) sélectionnée(s)`
                }
              </p>
            </div>
            <div className="space-y-3">
              {ALL_CATEGORIES.map(cat => (
                <div key={cat.value} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md">
                  <Checkbox
                    id={`cat-${cat.value}`}
                    checked={selectedUserCategories.categories.includes(cat.value)}
                    onCheckedChange={(checked) => toggleCategory(cat.value, checked)}
                  />
                  <Label 
                    htmlFor={`cat-${cat.value}`} 
                    className="flex-1 cursor-pointer text-sm"
                  >
                    {cat.label}
                  </Label>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsCategoryDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button onClick={saveUserCategories}>
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};