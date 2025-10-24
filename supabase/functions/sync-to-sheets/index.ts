interface DailyReportData {
  date: string;
  store_name: string;
  staff_name: string;
  sales: number;
  purchase: number;
  labor_cost: number;
  utilities: number;
  promotion: number;
  cleaning: number;
  misc: number;
  communication: number;
  others: number;
  report_text: string;
  created_at: string;
}

// CORS設定: 本番では環境変数で許可ドメインを指定
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173';

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { reportData } = await req.json() as { reportData: DailyReportData };
    
    // Google Sheets API configuration
    const GOOGLE_SHEETS_API_KEY = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    const GOOGLE_SHEET_ID = Deno.env.get('GOOGLE_SHEET_ID');
    
    // Explicitly check for non-empty strings
    if (!GOOGLE_SHEETS_API_KEY || !GOOGLE_SHEET_ID || 
        GOOGLE_SHEETS_API_KEY.trim() === '' || GOOGLE_SHEET_ID.trim() === '') {
      console.error('Environment variables check failed:', {
        hasApiKey: !!GOOGLE_SHEETS_API_KEY,
        hasSheetId: !!GOOGLE_SHEET_ID,
        apiKeyLength: GOOGLE_SHEETS_API_KEY?.length || 0,
        sheetIdLength: GOOGLE_SHEET_ID?.length || 0
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Google Sheets API設定が不完全です。環境変数が設定されていないか空です。',
          details: {
            hasApiKey: !!GOOGLE_SHEETS_API_KEY && GOOGLE_SHEETS_API_KEY.trim() !== '',
            hasSheetId: !!GOOGLE_SHEET_ID && GOOGLE_SHEET_ID.trim() !== ''
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Prepare data for Google Sheets (in the order of columns)
    const rowData = [
      reportData.date,
      reportData.store_name,
      reportData.staff_name,
      reportData.sales.toString(),
      reportData.purchase.toString(),
      reportData.labor_cost.toString(),
      reportData.utilities.toString(),
      reportData.promotion.toString(),
      reportData.cleaning.toString(),
      reportData.misc.toString(),
      reportData.communication.toString(),
      reportData.others.toString(),
      reportData.report_text || '',
      reportData.created_at,
      // Calculate totals
      (reportData.purchase + reportData.labor_cost + reportData.utilities + 
       reportData.promotion + reportData.cleaning + reportData.misc + 
       reportData.communication + reportData.others).toString(), // 経費合計
      (reportData.sales - reportData.purchase).toString(), // 粗利益
      (reportData.sales - (reportData.purchase + reportData.labor_cost + reportData.utilities + 
       reportData.promotion + reportData.cleaning + reportData.misc + 
       reportData.communication + reportData.others)).toString() // 営業利益
    ];

    // Google Sheets API URL for appending data
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/daily_reports:append`;
    
    // Log the request details for debugging
    console.log('Google Sheets API Request:', {
      url: sheetsUrl,
      method: 'POST',
      sheetId: GOOGLE_SHEET_ID,
      hasApiKey: !!GOOGLE_SHEETS_API_KEY
    });
    
    const response = await fetch(`${sheetsUrl}?key=${GOOGLE_SHEETS_API_KEY}&valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowData]
      })
    });

    if (!response || !response.ok) {
      const errorText = await response.text();
      console.error('Google Sheets API Error:', {
        status: response?.status,
        statusText: response?.statusText,
        errorText,
        url: sheetsUrl
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Google Sheetsへの書き込みに失敗しました',
          details: {
            status: response?.status,
            statusText: response?.statusText,
            message: errorText
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const result = await response.json();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Google Sheetsに正常に保存されました',
        updatedRange: result.updates?.updatedRange 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Edge Function Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'サーバーエラーが発生しました',
        details: {
          name: error.name,
          message: error.message,
          type: typeof error
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});