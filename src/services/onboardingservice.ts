import { supabase } from '../lib/supabase';

export interface OnboardingProgress {
  id: string;
  user_id: string;
  organization_id: string | null;
  step_store_created: boolean;
  step_first_report: boolean;
  step_csv_imported: boolean;
  step_dashboard_viewed: boolean;
  step_ai_chat_used: boolean;
  sample_data_loaded: boolean;
  onboarding_completed: boolean;
  onboarding_skipped: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  tour_dashboard_completed: boolean;
  tour_report_form_completed: boolean;
  tour_current_step: string | null;
  tour_current_tour: string | null;
  tour_dismissed_until: string | null;
}

export type TourName = 'dashboard' | 'reportForm' | 'settings' | 'firstTime' | 'aiChat';

export interface TourProgress {
  tourName: TourName | null;
  currentStepId: string | null;
  isDashboardCompleted: boolean;
  isReportFormCompleted: boolean;
  dismissedUntil: Date | null;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
  skippable?: boolean;
}

export async function getOnboardingProgress(userId: string): Promise<OnboardingProgress | null> {
  const { data, error } = await supabase
    .from('onboarding_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to get onboarding progress:', error);
    return null;
  }

  return data;
}

export async function createOnboardingProgress(
  userId: string,
  organizationId?: string
): Promise<OnboardingProgress | null> {
  const { data, error } = await supabase
    .from('onboarding_progress')
    .insert({
      user_id: userId,
      organization_id: organizationId || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return getOnboardingProgress(userId);
    }
    console.error('Failed to create onboarding progress:', error);
    return null;
  }

  return data;
}

export async function updateOnboardingStep(
  userId: string,
  step: keyof Pick<
    OnboardingProgress,
    | 'step_store_created'
    | 'step_first_report'
    | 'step_csv_imported'
    | 'step_dashboard_viewed'
    | 'step_ai_chat_used'
    | 'sample_data_loaded'
  >,
  value: boolean = true
): Promise<boolean> {
  const { error } = await supabase
    .from('onboarding_progress')
    .update({ [step]: value })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to update onboarding step:', error);
    return false;
  }

  return true;
}

export async function completeOnboarding(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('onboarding_progress')
    .update({
      onboarding_completed: true,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to complete onboarding:', error);
    return false;
  }

  return true;
}

export async function skipOnboarding(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('onboarding_progress')
    .update({
      onboarding_skipped: true,
      onboarding_completed: true,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to skip onboarding:', error);
    return false;
  }

  return true;
}

export function calculateOnboardingCompletion(progress: OnboardingProgress | null): number {
  if (!progress) return 0;

  const steps = [
    progress.step_store_created,
    progress.step_first_report || progress.sample_data_loaded,
    progress.step_dashboard_viewed,
  ];

  const completedSteps = steps.filter(Boolean).length;
  return Math.round((completedSteps / steps.length) * 100);
}

export function getNextOnboardingStep(progress: OnboardingProgress | null): string | null {
  if (!progress) return 'store';

  if (!progress.step_store_created) return 'store';
  if (!progress.step_first_report && !progress.sample_data_loaded) return 'data';
  if (!progress.step_dashboard_viewed) return 'dashboard';

  return null;
}

export async function checkExistingSampleData(
  organizationId: string,
  storeId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('daily_reports')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('store_id', storeId)
    .eq('is_sample', true);

  if (error) {
    console.error('Failed to check sample data:', error);
    return 0;
  }

  return count || 0;
}

export async function loadSampleDataForUser(
  userId: string,
  organizationId: string,
  storeId: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('📊 loadSampleDataForUser called with:', {
      userId,
      organizationId,
      storeId
    });

    const existingCount = await checkExistingSampleData(organizationId, storeId);
    console.log('📊 Existing sample data count:', existingCount);

    if (existingCount > 0) {
      return {
        success: false,
        message: `既にサンプルデータが${existingCount}件存在します。先に削除してください。`
      };
    }

    const today = new Date();
    const sampleReports = [];

    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const baseSales = isWeekend ? 180000 : 120000;
      const variance = Math.random() * 0.3 - 0.15;
      const sales = Math.round(baseSales * (1 + variance));

      const baseCustomers = isWeekend ? 85 : 55;
      const customers = Math.round(baseCustomers * (1 + variance));

      const foodCostRate = 0.28 + Math.random() * 0.06;
      const foodCost = Math.round(sales * foodCostRate);

      const laborCostRate = 0.25 + Math.random() * 0.05;
      const laborCost = Math.round(sales * laborCostRate);

      const cashRatio = 0.4 + Math.random() * 0.2;
      const tax10Ratio = 0.6;

      const salesCash = Math.round(sales * cashRatio);
      const salesCredit = sales - salesCash;
      const salesCash10 = Math.round(salesCash * tax10Ratio);
      const salesCash8 = salesCash - salesCash10;
      const salesCredit10 = Math.round(salesCredit * tax10Ratio);
      const salesCredit8 = salesCredit - salesCredit10;

      sampleReports.push({
        organization_id: organizationId,
        store_id: storeId,
        user_id: userId,
        date: dateStr,
        operation_type: 'full_day',
        sales,
        customers,
        purchase: foodCost,
        labor_cost: laborCost,
        others: Math.round(sales * 0.05),
        sales_cash_10: salesCash10,
        sales_cash_8: salesCash8,
        sales_credit_10: salesCredit10,
        sales_credit_8: salesCredit8,
        is_sample: true,
      });
    }

    console.log('📊 Inserting sample reports:', sampleReports.length, 'reports');
    console.log('📊 First sample report:', sampleReports[0]);

    const { error } = await supabase
      .from('daily_reports')
      .insert(sampleReports);

    if (error) {
      console.error('❌ Failed to insert sample data:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });

      if (error.code === '23505') {
        return {
          success: false,
          message: '同じ日付のデータが既に存在します。サンプルデータを削除してから再度お試しください。'
        };
      }

      return {
        success: false,
        message: `サンプルデータの読み込みに失敗しました: ${error.message}`
      };
    }

    console.log('✅ Sample data inserted successfully');

    await updateOnboardingStep(userId, 'sample_data_loaded', true);
    console.log('✅ Onboarding step updated');

    return { success: true, message: '14日分のサンプルデータを読み込みました' };
  } catch (err) {
    console.error('❌ Error loading sample data:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { success: false, message: `エラーが発生しました: ${errorMessage}` };
  }
}

export async function clearSampleData(
  organizationId: string,
  storeId: string
): Promise<{ success: boolean; message: string; deletedCount: number }> {
  try {
    const { data, error } = await supabase
      .from('daily_reports')
      .delete()
      .eq('organization_id', organizationId)
      .eq('store_id', storeId)
      .eq('is_sample', true)
      .select('id');

    if (error) {
      return { success: false, message: 'サンプルデータの削除に失敗しました', deletedCount: 0 };
    }

    const deletedCount = data?.length || 0;
    return {
      success: true,
      message: deletedCount > 0
        ? `${deletedCount}件のサンプルデータを削除しました`
        : 'サンプルデータは見つかりませんでした',
      deletedCount
    };
  } catch (err) {
    console.error('Error clearing sample data:', err);
    return { success: false, message: 'エラーが発生しました', deletedCount: 0 };
  }
}

export async function getTourProgress(userId: string): Promise<TourProgress | null> {
  const progress = await getOnboardingProgress(userId);
  if (!progress) return null;

  return {
    tourName: progress.tour_current_tour as TourName | null,
    currentStepId: progress.tour_current_step,
    isDashboardCompleted: progress.tour_dashboard_completed || false,
    isReportFormCompleted: progress.tour_report_form_completed || false,
    dismissedUntil: progress.tour_dismissed_until
      ? new Date(progress.tour_dismissed_until)
      : null,
  };
}

export async function updateTourCurrentStep(
  userId: string,
  tourName: TourName,
  stepId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('onboarding_progress')
    .update({
      tour_current_tour: tourName,
      tour_current_step: stepId,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to update tour step:', error);
    return false;
  }

  return true;
}

export async function completeTour(
  userId: string,
  tourName: TourName
): Promise<boolean> {
  const updates: Record<string, unknown> = {
    tour_current_tour: null,
    tour_current_step: null,
  };

  if (tourName === 'dashboard' || tourName === 'firstTime') {
    updates.tour_dashboard_completed = true;
    updates.step_dashboard_viewed = true;
  } else if (tourName === 'reportForm') {
    updates.tour_report_form_completed = true;
  }

  const { error } = await supabase
    .from('onboarding_progress')
    .update(updates)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to complete tour:', error);
    return false;
  }

  return true;
}

export async function dismissTourUntil(
  userId: string,
  untilDate: Date
): Promise<boolean> {
  const { error } = await supabase
    .from('onboarding_progress')
    .update({
      tour_dismissed_until: untilDate.toISOString(),
      tour_current_tour: null,
      tour_current_step: null,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to dismiss tour:', error);
    return false;
  }

  return true;
}

export async function skipTour(
  userId: string,
  tourName: TourName
): Promise<boolean> {
  const updates: Record<string, unknown> = {
    tour_current_tour: null,
    tour_current_step: null,
  };

  if (tourName === 'dashboard' || tourName === 'firstTime') {
    updates.tour_dashboard_completed = true;
  } else if (tourName === 'reportForm') {
    updates.tour_report_form_completed = true;
  }

  const { error } = await supabase
    .from('onboarding_progress')
    .update(updates)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to skip tour:', error);
    return false;
  }

  return true;
}

export function shouldShowTour(
  progress: TourProgress | null,
  tourName: TourName
): boolean {
  if (!progress) return true;

  if (progress.dismissedUntil && progress.dismissedUntil > new Date()) {
    return false;
  }

  if (tourName === 'dashboard' || tourName === 'firstTime') {
    return !progress.isDashboardCompleted;
  }

  if (tourName === 'reportForm') {
    return !progress.isReportFormCompleted;
  }

  return true;
}
