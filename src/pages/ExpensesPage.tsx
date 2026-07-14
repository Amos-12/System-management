import { ResponsiveDashboardLayout } from '@/components/Layout/ResponsiveDashboardLayout';
import { ExpensesManagement } from '@/components/Expenses/ExpensesManagement';
import { useAuth } from '@/hooks/useAuth';

const ExpensesPage = () => {
  const { role } = useAuth();
  return (
    <ResponsiveDashboardLayout
      title="Dépenses"
      role={role === 'admin' ? 'admin' : 'seller'}
      currentSection="expenses"
    >
      <ExpensesManagement />
    </ResponsiveDashboardLayout>
  );
};

export default ExpensesPage;
