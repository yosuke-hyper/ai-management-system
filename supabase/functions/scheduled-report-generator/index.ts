import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    const now = new Date();

    const { data: schedules, error: schedulesError } = await supabase
      .from('report_schedules')
      .select('*')
      .eq('is_enabled', true)
      .or(`next_run_at.is.null,next_run_at.lte.${now.toISOString()}`);

    if (schedulesError) {
      throw new Error(`Failed to fetch schedules: ${schedulesError.message}`);
    }

    if (!schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No schedules to process', processedCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const schedule of schedules) {
      try {
        let periodStart: string;
        let periodEnd: string;

        if (schedule.report_type === 'weekly') {
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - 7);
          periodStart = weekStart.toISOString().split('T')[0];
          periodEnd = now.toISOString().split('T')[0];
        } else {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          periodStart = monthStart.toISOString().split('T')[0];
          periodEnd = monthEnd.toISOString().split('T')[0];
        }

        const generateReportUrl = `${supabaseUrl}/functions/v1/generate-ai-report`;
        const generateResponse = await fetch(generateReportUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            reportType: schedule.report_type,
            storeId: schedule.store_id,
            periodStart,
            periodEnd,
          }),
        });

        if (!generateResponse.ok) {
          const errorText = await generateResponse.text();
          throw new Error(`Report generation failed: ${errorText}`);
        }

        const reportResult = await generateResponse.json();

        let nextRunAt: Date;
        if (schedule.report_type === 'weekly') {
          nextRunAt = new Date(now);
          nextRunAt.setDate(nextRunAt.getDate() + 7);
          nextRunAt.setHours(6, 0, 0, 0);
        } else {
          nextRunAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          nextRunAt.setHours(6, 0, 0, 0);
        }

        await supabase
          .from('report_schedules')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRunAt.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', schedule.id);

        results.push({
          scheduleId: schedule.id,
          reportType: schedule.report_type,
          storeId: schedule.store_id,
          success: true,
          reportId: reportResult.report?.id,
        });
      } catch (error) {
        console.error(`Failed to process schedule ${schedule.id}:`, error);
        results.push({
          scheduleId: schedule.id,
          reportType: schedule.report_type,
          storeId: schedule.store_id,
          success: false,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedCount: schedules.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scheduled report generation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
