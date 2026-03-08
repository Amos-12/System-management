import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, UserCheck, UserX, Mail, Calendar, Search, UserPlus, RefreshCcw, Settings, Trash2, LayoutGrid, List, Shield, User, Crown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/ui/table-pagination';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSubscription } from '@/hooks/useSubscription';

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

// Helper to get initials from name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Helper to get avatar color based on role
const getAvatarColor = (role: string, isActive: boolean) => {
  if (role === 'admin') return 'bg-primary text-primary-foreground';
  if (isActive) return 'bg-green-500 text-white';
  return 'bg-orange-500 text-white';
};


export const UserManagementPanel = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'seller'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [emailToPromote, setEmailToPromote] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);
  const [selectedUserCategories, setSelectedUserCategories] = useState<{
    userId: string;
    userName: string;
    categories: string[];
  }>({ userId: '', userName: '', categories: [] });
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const isMobile = useIsMobile();
  const { plan, isFreePlan } = useSubscription();

  // Auto-switch to cards on mobile
  const effectiveViewMode = isMobile ? 'cards' : viewMode;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('user_id, role, is_active');

      if (error) throw error;

      const userIds = userRoles?.map((ur) => ur.user_id) || [];
      if (userIds.length === 0) {
        setUsers([]);
        return;
      }

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

      const currentUser = users.find(u => u.id === userId);
      const { data: { user } } = await supabase.auth.getUser();

      if (currentUser && user) {
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
        .from('seller_authorized_categories')
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

      await supabase
        .from('seller_authorized_categories')
        .delete()
        .eq('user_id', userId);

      if (categories.length > 0) {
        const rows = categories.map(cat => ({
          user_id: userId,
          category: cat as any,
          company_id: profile?.company_id || ''
        }));

        const { error } = await supabase
          .from('seller_authorized_categories')
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' ? user.is_active : !user.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const { 
    paginatedItems: paginatedUsers, 
    currentPage, 
    totalPages, 
    totalItems, 
    pageSize, 
    nextPage, 
    prevPage, 
    hasNextPage, 
    hasPrevPage 
  } = usePagination(filteredUsers, 20);

  const totalUsers = users.length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const sellerUsers = users.filter(u => u.role === 'seller').length;
  const activeUsers = users.filter(u => u.role === 'seller' && u.is_active).length;
  const inactiveUsers = users.filter(u => u.role === 'seller' && !u.is_active).length;

  const exportToExcel = () => {
    if (isFreePlan) { toast({ title: "Fonctionnalité Premium", description: "Les exports sont disponibles dans les plans payants.", variant: "destructive" }); return; }
    const exportData = filteredUsers.map(user => ({
      'Nom Complet': user.full_name,
      'Email': user.email || 'N/A',
      'Rôle': user.role === 'admin' ? 'Administrateur' : 'Vendeur',
      'Statut': user.is_active ? 'Actif' : 'Inactif',
      'Date de création': new Date(user.created_at).toLocaleDateString('fr-FR')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Utilisateurs');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Nom
      { wch: 30 }, // Email
      { wch: 15 }, // Rôle
      { wch: 10 }, // Statut
      { wch: 15 }, // Date
    ];

    XLSX.writeFile(wb, `utilisateurs_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Export réussi",
      description: `${exportData.length} utilisateurs exportés`
    });
  };

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

  // User Card Component for card view
  const UserCard = ({ user }: { user: User }) => (
    <Card 
      className="shadow-md hover:shadow-lg transition-all duration-200 animate-in fade-in-50"
    >
      <CardContent className="p-4">
        {/* Header with avatar and name */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${getAvatarColor(user.role, user.is_active)}`}>
              {getInitials(user.full_name)}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{user.full_name}</h3>
              <Badge 
                variant={user.role === 'admin' ? 'default' : 'secondary'}
                className={`mt-1 ${user.role === 'admin' ? 'bg-primary' : ''}`}
              >
                {user.role === 'admin' ? (
                  <><Shield className="w-3 h-3 mr-1" /> Admin</>
                ) : (
                  <><User className="w-3 h-3 mr-1" /> Vendeur</>
                )}
              </Badge>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span className="truncate">{user.email}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Créé le {new Date(user.created_at).toLocaleDateString('fr-FR')}</span>
          </div>
          {user.role === 'seller' && (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-orange-500'}`} />
              <span className={user.is_active ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}>
                {user.is_active ? 'Actif' : 'Inactif'}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t">
          {user.role === 'seller' && (
            <>
              <Switch
                checked={user.is_active}
                onCheckedChange={() => handleToggleActive(user.id, user.is_active)}
              />
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1"
                onClick={() => loadUserCategories(user.id, user.full_name)}
              >
                <Settings className="w-4 h-4 mr-1" />
                Catégories
              </Button>
            </>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                size="sm" 
                variant="destructive"
                disabled={user.role === 'seller' && user.is_active}
                title={user.role === 'seller' && user.is_active ? "Désactivez d'abord ce vendeur" : "Supprimer"}
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
                  ⚠️ Cette action est irréversible mais les données historiques seront conservées.
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
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards - 2x2 on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-md">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-xl sm:text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Total Utilisateurs</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-primary">{adminUsers}</div>
            <p className="text-xs text-muted-foreground">Administrateurs</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <User className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-blue-500">{sellerUsers}</div>
            <p className="text-xs text-muted-foreground">Vendeurs</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-lg font-bold text-green-600 dark:text-green-400">{activeUsers}</span>
              </div>
              <span className="text-muted-foreground font-light">|</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{inactiveUsers}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">Actifs | Inactifs</p>
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
            <div className="flex items-center gap-2 flex-wrap">
              {/* View Mode Toggle - hidden on mobile */}
              <div className="hidden sm:flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-7 px-2"
                >
                  <List className="w-4 h-4 mr-1" />
                  Tableau
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="h-7 px-2"
                >
                  <LayoutGrid className="w-4 h-4 mr-1" />
                  Cartes
                </Button>
              </div>
              
              <Button variant="ghost" size="sm" onClick={fetchUsers} title="Rafraîchir">
                <RefreshCcw className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel} title="Exporter Excel">
                {isFreePlan ? <Lock className="w-4 h-4 mr-1" /> : <Download className="w-4 h-4 mr-1" />}
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90">
                    <UserPlus className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Promouvoir Admin</span>
                    <span className="sm:hidden">Admin</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-primary" />
                      Promouvoir un utilisateur
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Entrez l'email d'un utilisateur existant pour lui accorder les privilèges administrateur.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email de l'utilisateur</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="user@example.com"
                          value={emailToPromote}
                          onChange={(e) => setEmailToPromote(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        L'utilisateur doit déjà avoir un compte dans le système.
                      </p>
                    </div>
                    <Button 
                      onClick={handlePromoteToAdmin}
                      disabled={isPromoting || !emailToPromote.trim()}
                      className="w-full"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      {isPromoting ? 'Promotion en cours...' : 'Promouvoir Administrateur'}
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

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-1">Rôle:</span>
              <div className="flex items-center gap-1 border rounded-lg p-0.5">
                <Button
                  variant={roleFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setRoleFilter('all')}
                  className="h-7 px-2 text-xs"
                >
                  Tous
                </Button>
                <Button
                  variant={roleFilter === 'admin' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setRoleFilter('admin')}
                  className="h-7 px-2 text-xs"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  Admin ({adminUsers})
                </Button>
                <Button
                  variant={roleFilter === 'seller' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setRoleFilter('seller')}
                  className="h-7 px-2 text-xs"
                >
                  <User className="w-3 h-3 mr-1" />
                  Vendeur ({sellerUsers})
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-1">Statut:</span>
              <div className="flex items-center gap-1 border rounded-lg p-0.5">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className="h-7 px-2 text-xs"
                >
                  Tous
                </Button>
                <Button
                  variant={statusFilter === 'active' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('active')}
                  className="h-7 px-2 text-xs"
                >
                  <UserCheck className="w-3 h-3 mr-1" />
                  Actif ({activeUsers})
                </Button>
                <Button
                  variant={statusFilter === 'inactive' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('inactive')}
                  className="h-7 px-2 text-xs"
                >
                  <UserX className="w-3 h-3 mr-1" />
                  Inactif ({inactiveUsers})
                </Button>
              </div>
            </div>
          </div>

          {/* Card View */}
          {effectiveViewMode === 'cards' && (
            <ScrollArea className="h-[calc(100vh-400px)] min-h-[400px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
                {paginatedUsers.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Table View */}
          {effectiveViewMode === 'table' && (
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
                  {paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${getAvatarColor(user.role, user.is_active)}`}>
                            {getInitials(user.full_name)}
                          </div>
                          <div>
                            <div className="font-medium">{user.full_name}</div>
                            <div className="text-sm text-muted-foreground sm:hidden">
                              {user.email}
                            </div>
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
                              <span className="hidden lg:inline">Catégories</span>
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
          )}

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPrevPage={prevPage}
            onNextPage={nextPage}
            hasPrevPage={hasPrevPage}
            hasNextPage={hasNextPage}
          />

          {paginatedUsers.length === 0 && (
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