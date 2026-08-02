import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/Dashboard/StatsCard';
import { 
  TrendingUp,
  Receipt,
  Package,
  DollarSign,
  ShoppingCart,
  Calendar,
  Wallet
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { toHTG, formatHTG } from '@/lib/currency';

export const SellerDashboardStats = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { rate } = useExchangeRate();
  const [stats, setStats] = useState({
    totalSales: 0,
    todaySales: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    weekSales: 0,
    weekRevenue: 0,
    monthSales: 0,
    monthRevenue: 0,
    averageSale: 0,
    todayExpenses: 0,
    monthExpenses: 0,
    expensesCount: 0,
    topProducts: [] as { product_name: string; quantity: number; revenue: number }[]
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchRecentSales();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      const PAGE = 1000;

      // Helper: count exact without downloading rows
      const countSales = async (fromISO?: string) => {
        let q = supabase
          .from('sales')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', user.id);
        if (fromISO) q = q.gte('created_at', fromISO);
        const { count, error } = await q;
        if (error) throw error;
        return count ?? 0;
      };

      // Helper: paginated sum of total_amount
      const sumRevenue = async (fromISO?: string) => {
        let total = 0;
        let from = 0;
        while (true) {
          let q = supabase
            .from('sales')
            .select('total_amount')
            .eq('seller_id', user.id)
            .range(from, from + PAGE - 1);
          if (fromISO) q = q.gte('created_at', fromISO);
          const { data, error } = await q;
          if (error) throw error;
          const rows = data ?? [];
          total += rows.reduce((s, r: any) => s + Number(r.total_amount), 0);
          if (rows.length < PAGE) break;
          from += PAGE;
        }
        return total;
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      monthAgo.setHours(0, 0, 0, 0);

      const [
        totalSalesCount,
        todaySalesCount,
        weekSalesCount,
        monthSalesCount,
        totalRevenue,
        todayRevenue,
        weekRevenue,
        monthRevenue,
      ] = await Promise.all([
        countSales(),
        countSales(today.toISOString()),
        countSales(weekAgo.toISOString()),
        countSales(monthAgo.toISOString()),
        sumRevenue(),
        sumRevenue(today.toISOString()),
        sumRevenue(weekAgo.toISOString()),
        sumRevenue(monthAgo.toISOString()),
      ]);

      // Top products via join, paginated (avoids .in() with huge id list)
      const productStats: Record<string, { product_name: string; quantity: number; revenue: number }> = {};
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('sale_items')
          .select('product_name, quantity, subtotal, sales!inner(seller_id)')
          .eq('sales.seller_id', user.id)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const rows = (data ?? []) as any[];
        for (const item of rows) {
          const key = item.product_name;
          if (!productStats[key]) {
            productStats[key] = { product_name: key, quantity: 0, revenue: 0 };
          }
          productStats[key].quantity += Number(item.quantity);
          productStats[key].revenue += Number(item.subtotal);
        }
        if (rows.length < PAGE) break;
        from += PAGE;
      }

      const topProducts = Object.values(productStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const averageSale = totalSalesCount ? totalRevenue / totalSalesCount : 0;

      setStats({
        totalSales: totalSalesCount,
        todaySales: todaySalesCount,
        totalRevenue,
        todayRevenue,
        weekSales: weekSalesCount,
        weekRevenue,
        monthSales: monthSalesCount,
        monthRevenue,
        averageSale,
        topProducts: topProducts as any,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentSales = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentSales(data || []);
    } catch (error) {
      console.error('Error fetching recent sales:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Package className="w-8 h-8 text-primary animate-pulse" />
        <span className="ml-2 text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid - matching Admin style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Ventes Aujourd'hui"
          value={stats.todaySales.toString()}
          icon={Receipt}
          variant="success"
          change={{
            value: stats.weekSales > 0 ? Number(((stats.todaySales / stats.weekSales) * 100).toFixed(2)) : 0,
            isPositive: stats.todaySales > 0,
            label: "cette semaine"
          }}
        />
        <StatsCard
          title="Revenu Aujourd'hui"
          value={`${stats.todayRevenue.toFixed(2)} HTG`}
          icon={DollarSign}
          variant="default"
          change={{
            value: stats.weekRevenue > 0 ? Number(((stats.todayRevenue / stats.weekRevenue) * 100).toFixed(2)) : 0,
            isPositive: stats.todayRevenue > 0,
            label: "cette semaine"
          }}
        />
        <StatsCard
          title="Total Ventes"
          value={stats.totalSales.toString()}
          icon={TrendingUp}
          variant="default"
        />
        <StatsCard
          title="Revenu Total"
          value={`${stats.totalRevenue.toFixed(2)} HTG`}
          icon={DollarSign}
          variant="success"
        />
      </div>

      {/* Additional Stats - Enhanced with icons and variants */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCard
          title="Ventes cette Semaine"
          value={`${stats.weekRevenue.toFixed(2)} HTG`}
          icon={Calendar}
          variant="default"
          change={{
            value: stats.weekSales,
            isPositive: stats.weekSales > 0,
            label: `${stats.weekSales} vente${stats.weekSales > 1 ? 's' : ''}`
          }}
        />
        
        <StatsCard
          title="Ventes ce Mois"
          value={`${stats.monthRevenue.toFixed(2)} HTG`}
          icon={Calendar}
          variant="success"
          change={{
            value: stats.monthSales,
            isPositive: stats.monthSales > 0,
            label: `${stats.monthSales} vente${stats.monthSales > 1 ? 's' : ''}`
          }}
        />
        
        <StatsCard
          title="Moyenne par Vente"
          value={`${stats.averageSale.toFixed(2)} HTG`}
          icon={ShoppingCart}
          variant="default"
        />
      </div>

      {/* Top Products & Recent Sales - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        {stats.topProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Top 5 Produits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topProducts.map((product, index) => (
                  <div key={product.product_name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <div className="font-medium">{product.product_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.quantity} unités vendues
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">{product.revenue.toFixed(2)} HTG</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Ventes Récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucune vente récente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-smooth">
                    <div>
                      <div className="font-medium">
                        {sale.customer_name || 'Client non renseigné'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(sale.created_at).toLocaleString('fr-FR')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-success">{Number(sale.total_amount).toFixed(2)} HTG</div>
                      <div className="text-xs text-muted-foreground">{sale.payment_method}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Analyse des Performances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Croissance Hebdomadaire</p>
              <p className="text-2xl font-bold text-primary">
                {stats.weekSales > 0 ? '+' : ''}{stats.weekSales}
              </p>
              <p className="text-xs text-muted-foreground">ventes cette semaine</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Revenu Mensuel</p>
              <p className="text-2xl font-bold text-primary">
                {stats.monthRevenue.toFixed(2)} HTG
              </p>
              <p className="text-xs text-muted-foreground">{stats.monthSales} ventes ce mois</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Performance Journalière</p>
              <p className="text-2xl font-bold text-primary">
                {((stats.todayRevenue / (stats.averageSale || 1)) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">par rapport à la moyenne</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
