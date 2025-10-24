import { supabase } from '../lib/supabase';

interface GoogleSheetsResponse {
  success: boolean;
  message?: string;
  error?: string;
  updatedRange?: string;
}

export const createGoogleSheetsTemplate = async (): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    // ヘッダー行を作成するための関数
    const headerRow = [
      '日付', '店舗名', 'スタッフ名', '売上', '仕入', '人件費', 
      '光熱費', '販促費', '清掃費', '雑費', '通信費', 'その他', 
      '報告内容', '作成日時', '経費合計', '粗利益', '営業利益'
    ];

    const { data, error } = await supabase.functions.invoke('sync-to-sheets', {
      body: { 
        reportData: {
          date: headerRow[0],
          store_name: headerRow[1],
          staff_name: headerRow[2],
          sales: headerRow[3],
          purchase: headerRow[4],
          labor_cost: headerRow[5],
          utilities: headerRow[6],
          promotion: headerRow[7],
          cleaning: headerRow[8],
          misc: headerRow[9],
          communication: headerRow[10],
          others: headerRow[11],
          report_text: headerRow[12],
          created_at: headerRow[13]
        },
        isTemplate: true 
      }
    });

    if (error) {
      return {
        success: false,
        error: 'テンプレート作成でエラーが発生しました'
      };
    }

    return {
      success: true,
      message: 'Google Sheetsテンプレートを作成しました'
    };
  } catch (error) {
    return {
      success: false,
      error: 'テンプレート作成サービスでエラーが発生しました'
    };
  }
};

export const getGoogleSheetsUrl = (sheetId: string): string => {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
};

export const readFromSheets = async (): Promise<{ success: boolean; data?: any[]; error?: string }> => {
  try {
    const SHEET_ID = '1GWp6bW4WnSc9EFobaYNqhUz6wtMuL6gG74Tg2Osvtco';
    const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
    
    if (!API_KEY) {
      return { success: false, error: 'APIキーが設定されていません' };
    }

    // API key format validation
    if (!API_KEY.startsWith('AIza') || API_KEY.length < 35) {
      return { 
        success: false, 
        error: 'APIキーの形式が正しくありません。Google Cloud ConsoleでAPIキーを確認してください。' 
      };
    }

    const range = 'daily_reports!A:O'; // A列からO列まで
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.error) {
          switch (response.status) {
            case 400:
              if (errorData.error.message.includes('API key')) {
                errorMessage = 'APIキーが無効です。Google Cloud ConsoleでAPIキーを確認し、Google Sheets APIが有効になっていることを確認してください。';
              } else if (errorData.error.message.includes('Unable to parse range')) {
                errorMessage = 'シートの範囲指定が無効です。シート名「daily_reports」が存在することを確認してください。';
              } else {
                errorMessage = `API設定エラー: ${errorData.error.message}`;
              }
              break;
            case 403:
              errorMessage = 'APIキーにGoogle Sheets APIへのアクセス権限がありません。Google Cloud ConsoleでAPIキーの制限設定を確認してください。';
              break;
            case 404:
              errorMessage = '指定されたGoogle Sheetsが見つかりません。シートIDが正しいか、シートが削除されていないか確認してください。';
              break;
            default:
              errorMessage = errorData.error.message || errorMessage;
          }
        }
      } catch (parseError) {
        console.error('Error parsing API response:', parseError);
      }
      
      return { success: false, error: errorMessage };
    }
    
    const result = await response.json();
    const rows = result.values || [];
    
    if (rows.length <= 1) {
      return { success: true, data: [] };
    }
    
    // Skip header row and convert to objects
    const data = rows.slice(1).map((row: string[]) => ({
      date: row[0],
      storeName: row[1],
      staffName: row[2],
      sales: parseFloat(row[3]) || 0,
      purchase: parseFloat(row[4]) || 0,
      laborCost: parseFloat(row[5]) || 0,
      utilities: parseFloat(row[6]) || 0,
      promotion: parseFloat(row[7]) || 0,
      cleaning: parseFloat(row[8]) || 0,
      misc: parseFloat(row[9]) || 0,
      communication: parseFloat(row[10]) || 0,
      others: parseFloat(row[11]) || 0,
      reportText: row[12] || '',
      createdAt: row[13] || ''
    }));
    
    return { success: true, data };
  } catch (error) {
    console.error('Read from sheets error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'データ読み込みエラー'
    };
  }
};
