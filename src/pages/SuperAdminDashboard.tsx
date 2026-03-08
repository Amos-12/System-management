import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SaasKPIs } from '@/components/SuperAdmin/SaasKPIs';
import { CompanyList } from '@/components/SuperAdmin/CompanyList';
import { GlobalUsersPanel } from '@/components/SuperAdmin/GlobalUsersPanel';
import { GlobalActivityLogs } from '@/components/SuperAdmin/GlobalActivityLogs';
import { SuperAdminDbMonitoring } from '@/components/SuperAdmin/SuperAdminDbMonitoring';
import { SubscriptionPlansManager } from '@/components/SuperAdmin/SubscriptionPlansManager';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Shield, Building2, Users, Activity, Database, CreditCard } from 'lucide-react';
import logo from '@/assets/logo.png';

const SuperAdminDashboard = () => {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role !== null && (!user || role !== 'super_admin')) {
      navigate('/auth');
    }
  }, [user, role, loading, navigate]);

  if (loading || role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img src={logo} alt="Logo" className="w-14 h-14 object-contain mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-primary">Super Admin</h1>
                <p className="text-xs text-muted-foreground">Gestion de la plateforme SaaS</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <SaasKPIs />

        <Tabs defaultValue="companies" className="w-full">
          <TabsList className="w-full flex overflow-x-auto">
            <TabsTrigger value="companies" className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Entreprises</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Utilisateurs</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Plans</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Activité</span>
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-1.5">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Base de données</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="mt-6">
            <CompanyList />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <GlobalUsersPanel />
          </TabsContent>
          <TabsContent value="plans" className="mt-6">
            <SubscriptionPlansManager />
          </TabsContent>
          <TabsContent value="logs" className="mt-6">
            <GlobalActivityLogs />
          </TabsContent>
          <TabsContent value="database" className="mt-6">
            <SuperAdminDbMonitoring />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
