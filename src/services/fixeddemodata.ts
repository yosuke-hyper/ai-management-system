import { supabase } from '../lib/supabase';

export const fixedDemoDataService = {
  async getBrands() {
    const { data, error } = await supabase
      .from('fixed_demo_brands')
      .select('*')
      .order('name');

    if (error) {
      console.error('Failed to fetch demo brands:', error);
      return [];
    }

    return data || [];
  },

  async getStores(brandId?: string) {
    let query = supabase
      .from('fixed_demo_stores')
      .select(`
        *,
        brand:fixed_demo_brands(
          id,
          name,
          display_name,
          icon,
          color
        )
      `);

    if (brandId && brandId !== 'all') {
      query = query.eq('brand_id', brandId);
    }

    query = query.order('name');

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch demo stores:', error);
      return [];
    }

    return data || [];
  },

  async getReports(storeId?: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('fixed_demo_reports')
      .select('*');

    if (storeId && storeId !== 'all') {
      query = query.eq('store_id', storeId);
    }

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    query = query.order('date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch demo reports:', error);
      return [];
    }

    return data || [];
  },

  async getMonthlyExpenses(storeId?: string, month?: string) {
    let query = supabase
      .from('fixed_demo_monthly_expenses')
      .select('*');

    if (storeId && storeId !== 'all') {
      query = query.eq('store_id', storeId);
    }

    if (month) {
      query = query.eq('month', month);
    }

    query = query.order('month', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch demo monthly expenses:', error);
      return [];
    }

    return data || [];
  },

  async getTargets(storeId?: string, month?: string) {
    let query = supabase
      .from('fixed_demo_targets')
      .select('*');

    if (storeId && storeId !== 'all') {
      query = query.eq('store_id', storeId);
    }

    if (month) {
      query = query.eq('month', month);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch demo targets:', error);
      return [];
    }

    return data || [];
  },

  async getDashboardData(storeId: string | null, period: 'daily' | 'weekly' | 'monthly') {
    const stores = await this.getStores();

    const endDate = new Date();
    const startDate = new Date();

    if (period === 'daily') {
      startDate.setDate(startDate.getDate() - 1);
    } else if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const reports = await this.getReports(
      storeId || undefined,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    const currentMonth = new Date().toISOString().substring(0, 7);
    const expenses = await this.getMonthlyExpenses(storeId || undefined, currentMonth);
    const targets = await this.getTargets(storeId || undefined, currentMonth);

    return {
      stores,
      reports,
      expenses,
      targets
    };
  }
};
