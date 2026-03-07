import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ResponsiveDashboardLayout } from '@/components/Layout/ResponsiveDashboardLayout';
import { AdminDashboardCharts } from '@/components/Dashboard/AdminDashboardCharts';
import { AnalyticsDashboard } from '@/components/Dashboard/AnalyticsDashboard';
import { UserManagementPanel } from '@/components/UserManagement/UserManagementPanel';
import { AdvancedReports } from '@/components/Reports/AdvancedReports';
import { TvaReport } from '@/components/Reports/TvaReport';
import { StockAlerts } from '@/components/Notifications/StockAlerts';
import { ProductManagement } from '@/components/Products/ProductManagement';
import { SalesManagement } from '@/components/Sales/SalesManagement';
import { CompanySettings } from '@/components/Settings/CompanySettings';
import { ActivityLogPanel } from '@/components/ActivityLog/ActivityLogPanel';
import { DatabaseMonitoring } from '@/components/Settings/DatabaseMonitoring';
import { SellerPerformanceReport } from '@/components/Reports/SellerPerformanceReport';
import { CategoryManagement } from '@/components/Categories/CategoryManagement';
import { useSubscription } from '@/hooks/useSubscription';
import { ExpiredScreen } from '@/components/Subscription/ExpiredScreen';
import { LockedFeature } from '@/components/Subscription/LockedFeature';
import { useAuth } from '@/hooks/useAuth';

const AdminDashboard = () => {
  const [searchParams] = useSearchParams();
  const [currentSection, setCurrentSection] = useState(searchParams.get('section') || 'dashboard');
  const { isExpired, plan, companyName, loading: subLoading } = useSubscription();
  const { signOut } = useAuth();

  if (!subLoading && isExpired) {
    return <ExpiredScreen companyName={companyName} currentPlan={plan} onLogout={signOut} />;
  }
  
  const renderContent = () => {
    switch (currentSection) {
      case 'dashboard':
        return <AdminDashboardCharts />;
      case 'analytics':
        if (plan === 'trial') return <LockedFeature title="Analyses avancées" description="Les analyses détaillées, tendances annuelles et indicateurs de rentabilité sont disponibles dans les plans payants." requiredPlan="Pro" />;
        return <AnalyticsDashboard />;
      case 'categories':
        return <CategoryManagement />;
      case 'products':
        return <ProductManagement />;
      case 'sales':
        return <SalesManagement />;
      case 'users':
        return <UserManagementPanel />;
      case 'seller-reports':
        if (plan === 'trial') return <LockedFeature title="Rapports vendeurs" description="Les rapports de performance des vendeurs sont disponibles dans les plans payants." requiredPlan="Pro" />;
        return <SellerPerformanceReport />;
      case 'reports':
        if (plan === 'trial') return <LockedFeature title="Rapports avancés" description="Les rapports avancés et exports sont disponibles dans les plans payants." requiredPlan="Pro" />;
        return <AdvancedReports />;
      case 'tva-report':
        if (plan === 'trial') return <LockedFeature title="Rapport TVA" description="Le rapport TVA détaillé est disponible dans les plans payants." requiredPlan="Basic" />;
        return <TvaReport />;
      case 'activity':
        return <ActivityLogPanel />;
      case 'notifications':
        return <StockAlerts />;
      case 'settings':
        return <CompanySettings />;
      case 'database':
        return <DatabaseMonitoring />;
      default:
        return <AdminDashboardCharts />;
    }
  };

  return (
    <ResponsiveDashboardLayout 
      title="Tableau de Bord Admin" 
      role="admin" 
      currentSection={currentSection}
      onSectionChange={setCurrentSection}
    >
      <div className="space-y-6">
        {renderContent()}
      </div>
    </ResponsiveDashboardLayout>
  );
};

export default AdminDashboard;