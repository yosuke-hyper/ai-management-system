import { supabase } from '../lib/supabase';

export interface DemoSession {
  id: string;
  email: string;
  session_token: string;
  share_token: string;
  demo_org_id: string;
  expires_at: string;
  created_at: string;
  last_accessed_at: string;
  is_shareable: boolean;
  access_count: number;
  ip_address?: string;
  browser_fingerprint?: string;
}

export interface CreateDemoSessionResult {
  session: DemoSession;
  shareUrl: string;
  expiresAt: Date;
  daysValid: number;
  isExisting?: boolean;
}

export interface ExistingSessionResult {
  hasExistingSession: boolean;
  session?: DemoSession;
  shareUrl?: string;
  daysRemaining?: number;
}

export const demoSessionService = {
  async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch (error) {
      console.error('Failed to get IP address:', error);
      return 'unknown';
    }
  },

  generateBrowserFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Browser fingerprint', 2, 2);
    }
    const canvasData = canvas.toDataURL();

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvasData.substring(0, 100),
    ].join('|');

    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  },

  async checkExistingSession(email: string, ipAddress?: string): Promise<ExistingSessionResult> {
    const now = new Date().toISOString();

    const { data: existingByEmail, error: emailError } = await supabase
      .from('demo_sessions')
      .select('*')
      .eq('email', email)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!emailError && existingByEmail) {
      const expiresAt = new Date(existingByEmail.expires_at);
      const daysRemaining = Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

      return {
        hasExistingSession: true,
        session: existingByEmail,
        shareUrl: `${window.location.origin}/demo/${existingByEmail.share_token}`,
        daysRemaining,
      };
    }

    if (ipAddress && ipAddress !== 'unknown') {
      const { data: existingByIP, error: ipError } = await supabase
        .from('demo_sessions')
        .select('*')
        .eq('ip_address', ipAddress)
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!ipError && existingByIP) {
        const expiresAt = new Date(existingByIP.expires_at);
        const daysRemaining = Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

        return {
          hasExistingSession: true,
          session: existingByIP,
          shareUrl: `${window.location.origin}/demo/${existingByIP.share_token}`,
          daysRemaining,
        };
      }
    }

    return { hasExistingSession: false };
  },

  async createDemoSession(email: string, ipAddress?: string, browserFingerprint?: string): Promise<CreateDemoSessionResult> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const demoOrgName = `Demo Organization - ${new Date().getTime()}`;

    const { data: demoOrg, error: orgError } = await supabase
      .from('demo_organizations')
      .insert({ name: demoOrgName })
      .select()
      .single();

    if (orgError || !demoOrg) {
      throw new Error('Failed to create demo organization');
    }

    const { data: session, error: sessionError } = await supabase
      .from('demo_sessions')
      .insert({
        email,
        demo_org_id: demoOrg.id,
        expires_at: expiresAt.toISOString(),
        is_shareable: true,
        access_count: 0,
        ip_address: ipAddress,
        browser_fingerprint: browserFingerprint,
      })
      .select()
      .single();

    if (sessionError || !session) {
      throw new Error('Failed to create demo session');
    }

    const storeIds = await this.createDemoStores(demoOrg.id);
    await this.createDemoMonthlyExpenses(demoOrg.id, storeIds);

    const shareUrl = `${window.location.origin}/demo/${session.share_token}`;

    return {
      session,
      shareUrl,
      expiresAt,
      daysValid: 7,
    };
  },

  async getDemoSessionByShareToken(shareToken: string): Promise<DemoSession | null> {
    const { data, error } = await supabase
      .from('demo_sessions')
      .select('*')
      .eq('share_token', shareToken)
      .eq('is_shareable', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    await supabase
      .from('demo_sessions')
      .update({
        last_accessed_at: new Date().toISOString(),
        access_count: data.access_count + 1,
      })
      .eq('id', data.id);

    return data;
  },

  async createDemoStores(demoOrgId: string): Promise<string[]> {
    // 居酒屋ブランドのID（fixed_demo_brandsテーブル）
    const IZAKAYA_BRAND_ID = '10000000-0000-0000-0000-000000000001';

    const stores = [
      { name: '新宿店', demo_org_id: demoOrgId, brand_id: IZAKAYA_BRAND_ID },
      { name: '渋谷店', demo_org_id: demoOrgId, brand_id: IZAKAYA_BRAND_ID },
    ];

    const { data, error } = await supabase
      .from('demo_stores')
      .insert(stores)
      .select('id');

    if (error) {
      console.error('Failed to create demo stores:', error);
      return [];
    }

    return data?.map(s => s.id) || [];
  },

  async createDemoMonthlyExpenses(demoOrgId: string, storeIds: string[]): Promise<void> {
    if (storeIds.length === 0) return;

    const now = new Date();
    const months = [];

    for (let i = 0; i < 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }

    const expenses = [];

    for (const storeId of storeIds) {
      for (const month of months) {
        expenses.push({
          demo_org_id: demoOrgId,
          demo_store_id: storeId,
          month,
          labor_cost_employee: Math.floor(Math.random() * 500000) + 1000000,
          labor_cost_part_time: Math.floor(Math.random() * 300000) + 500000,
          utilities: Math.floor(Math.random() * 50000) + 80000,
          rent: Math.floor(Math.random() * 100000) + 300000,
          consumables: Math.floor(Math.random() * 30000) + 50000,
          promotion: Math.floor(Math.random() * 50000) + 30000,
          cleaning: Math.floor(Math.random() * 20000) + 20000,
          misc: Math.floor(Math.random() * 15000) + 10000,
          communication: Math.floor(Math.random() * 10000) + 15000,
          others: Math.floor(Math.random() * 20000) + 10000,
          memo: 'デモ用サンプルデータ',
        });
      }
    }

    const { error } = await supabase
      .from('demo_monthly_expenses')
      .insert(expenses);

    if (error) {
      console.error('Failed to create demo monthly expenses:', error);
    }
  },

  async getDemoStores(demoOrgId: string) {
    const { data, error } = await supabase
      .from('demo_stores')
      .select('*')
      .eq('demo_org_id', demoOrgId)
      .order('name');

    if (error) {
      console.error('Failed to fetch demo stores:', error);
      return [];
    }

    return data || [];
  },

  async checkSessionExpiry(shareToken: string): Promise<{
    isValid: boolean;
    isExpired: boolean;
    daysRemaining: number;
    expiresAt?: Date;
  }> {
    const { data, error } = await supabase
      .from('demo_sessions')
      .select('expires_at, is_shareable')
      .eq('share_token', shareToken)
      .maybeSingle();

    if (error || !data) {
      return { isValid: false, isExpired: true, daysRemaining: 0 };
    }

    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isExpired = expiresAt < now;
    const isValid = !isExpired && data.is_shareable;

    return {
      isValid,
      isExpired,
      daysRemaining: Math.max(0, daysRemaining),
      expiresAt,
    };
  },

  getShareUrl(shareToken: string): string {
    return `${window.location.origin}/demo/${shareToken}`;
  },
};
