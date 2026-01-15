import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface HealthMetrics {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  database: {
    connected: boolean;
    connectionCount: number;
  };
  statistics: {
    totalOrganizations: number;
    totalStores: number;
    totalUsers: number;
    activeUsers24h: number;
  };
  performance: {
    avgResponseTime: number;
    maxResponseTime: number;
    totalRequests: number;
    errorRate: number;
  };
  errors: {
    lastHour: number;
    last24Hours: number;
    critical24h: number;
  };
  resources: {
    aiRequestsToday: number;
    edgeFunctionsToday: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is super admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user is super admin
    const { data: isSuperAdmin } = await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get system health stats
    const { data: healthStats, error: statsError } = await supabase
      .rpc('get_system_health_stats');

    if (statsError) {
      console.error('Error fetching health stats:', statsError);
      throw statsError;
    }

    // Get performance summary
    const { data: perfSummary, error: perfError } = await supabase
      .rpc('get_performance_summary', { hours: 24 });

    if (perfError) {
      console.error('Error fetching performance summary:', perfError);
    }

    // Check database connection
    const { error: dbError } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);

    const dbConnected = !dbError;

    // Determine overall status
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    const criticalErrors = healthStats?.critical_errors_24h || 0;
    const errorRate = perfSummary?.error_rate || 0;

    if (criticalErrors > 10 || errorRate > 10 || !dbConnected) {
      overallStatus = 'critical';
    } else if (criticalErrors > 5 || errorRate > 5) {
      overallStatus = 'warning';
    }

    // Build response
    const metrics: HealthMetrics = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      database: {
        connected: dbConnected,
        connectionCount: 0, // Supabase manages this internally
      },
      statistics: {
        totalOrganizations: healthStats?.total_organizations || 0,
        totalStores: healthStats?.total_stores || 0,
        totalUsers: healthStats?.total_users || 0,
        activeUsers24h: healthStats?.active_users_24h || 0,
      },
      performance: {
        avgResponseTime: perfSummary?.avg_response_time || 0,
        maxResponseTime: perfSummary?.max_response_time || 0,
        totalRequests: perfSummary?.total_requests || 0,
        errorRate: perfSummary?.error_rate || 0,
      },
      errors: {
        lastHour: healthStats?.errors_last_hour || 0,
        last24Hours: healthStats?.errors_last_24h || 0,
        critical24h: healthStats?.critical_errors_24h || 0,
      },
      resources: {
        aiRequestsToday: healthStats?.ai_requests_today || 0,
        edgeFunctionsToday: 0, // Can be tracked separately if needed
      },
    };

    // Store health metric snapshot
    await supabase
      .from('system_health_metrics')
      .insert({
        total_organizations: metrics.statistics.totalOrganizations,
        total_stores: metrics.statistics.totalStores,
        total_users: metrics.statistics.totalUsers,
        active_users_24h: metrics.statistics.activeUsers24h,
        avg_response_time_ms: metrics.performance.avgResponseTime,
        errors_last_hour: metrics.errors.lastHour,
        errors_last_24h: metrics.errors.last24Hours,
        critical_errors_24h: metrics.errors.critical24h,
        ai_requests_today: metrics.resources.aiRequestsToday,
        overall_status: overallStatus,
      });

    return new Response(
      JSON.stringify(metrics),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});