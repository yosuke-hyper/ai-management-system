#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
飲食店業務報告システム - Python API Server
Google Sheets連携とLINE Bot機能を提供
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from flask import Flask, request, jsonify
from flask_cors import CORS

# Pythonの標準ライブラリのみを使用（WebContainer制限のため）
import urllib.request
import urllib.parse
import sqlite3
from pathlib import Path

app = Flask(__name__)
CORS(app)

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 設定
GOOGLE_SHEETS_API_KEY = os.environ.get('GOOGLE_SHEETS_API_KEY', '')
GOOGLE_SHEET_ID = os.environ.get('GOOGLE_SHEET_ID', '')
LINE_CHANNEL_SECRET = os.environ.get('LINE_CHANNEL_SECRET', '')
LINE_CHANNEL_ACCESS_TOKEN = os.environ.get('LINE_CHANNEL_ACCESS_TOKEN', '')

# データモデル
@dataclass
class DailyReport:
    id: str
    date: str
    store_name: str
    staff_name: str
    sales: float
    purchase: float
    labor_cost: float
    utilities: float
    promotion: float
    cleaning: float
    misc: float
    communication: float
    others: float
    report_text: str
    created_at: str
    line_user_id: Optional[str] = None

class DatabaseManager:
    """SQLite データベース管理（Google Sheets移行前の一時データ保存）"""
    
    def __init__(self, db_path: str = "/tmp/reports.db"):
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """データベース初期化"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS daily_reports (
                    id TEXT PRIMARY KEY,
                    date TEXT NOT NULL,
                    store_name TEXT NOT NULL,
                    staff_name TEXT NOT NULL,
                    sales REAL NOT NULL,
                    purchase REAL NOT NULL,
                    labor_cost REAL NOT NULL,
                    utilities REAL NOT NULL,
                    promotion REAL NOT NULL,
                    cleaning REAL NOT NULL,
                    misc REAL NOT NULL,
                    communication REAL NOT NULL,
                    others REAL NOT NULL,
                    report_text TEXT,
                    created_at TEXT NOT NULL,
                    line_user_id TEXT
                )
            """)
            conn.commit()
    
    def save_report(self, report: DailyReport) -> bool:
        """日次報告を保存"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO daily_reports VALUES 
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    report.id, report.date, report.store_name, report.staff_name,
                    report.sales, report.purchase, report.labor_cost, report.utilities,
                    report.promotion, report.cleaning, report.misc, report.communication,
                    report.others, report.report_text, report.created_at, report.line_user_id
                ))
                conn.commit()
            return True
        except Exception as e:
            logger.error(f"データベース保存エラー: {e}")
            return False
    
    def get_reports(self, start_date: str = None, end_date: str = None) -> List[DailyReport]:
        """日次報告を取得"""
        query = "SELECT * FROM daily_reports"
        params = []
        
        if start_date and end_date:
            query += " WHERE date BETWEEN ? AND ?"
            params = [start_date, end_date]
        
        query += " ORDER BY date DESC, created_at DESC"
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            
            reports = []
            for row in rows:
                report = DailyReport(
                    id=row[0], date=row[1], store_name=row[2], staff_name=row[3],
                    sales=row[4], purchase=row[5], labor_cost=row[6], utilities=row[7],
                    promotion=row[8], cleaning=row[9], misc=row[10], communication=row[11],
                    others=row[12], report_text=row[13], created_at=row[14], line_user_id=row[15]
                )
                reports.append(report)
            
            return reports

class GoogleSheetsAPI:
    """Google Sheets API クライアント"""
    
    def __init__(self, api_key: str, sheet_id: str):
        self.api_key = api_key
        self.sheet_id = sheet_id
        self.base_url = "https://sheets.googleapis.com/v4/spreadsheets"
    
    def append_row(self, sheet_name: str, values: List[str]) -> bool:
        """シートに行を追加"""
        if not self.api_key:
            logger.warning("Google Sheets API キーが設定されていません")
            return False
            
        try:
            url = f"{self.base_url}/{self.sheet_id}/values/{sheet_name}:append"
            params = {
                'key': self.api_key,
                'valueInputOption': 'USER_ENTERED'
            }
            
            data = {
                'values': [values]
            }
            
            # HTTP POST リクエスト
            req_data = json.dumps(data).encode('utf-8')
            req = urllib.request.Request(
                url + '?' + urllib.parse.urlencode(params),
                data=req_data,
                headers={'Content-Type': 'application/json'}
            )
            
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode('utf-8'))
                logger.info(f"Google Sheets更新成功: {result}")
                return True
                
        except Exception as e:
            logger.error(f"Google Sheets更新エラー: {e}")
            return False

# グローバルインスタンス
db_manager = DatabaseManager()
sheets_api = GoogleSheetsAPI(GOOGLE_SHEETS_API_KEY, GOOGLE_SHEET_ID)

@app.route('/api/health', methods=['GET'])
def health_check():
    """ヘルスチェック"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'google_sheets_configured': bool(GOOGLE_SHEETS_API_KEY and GOOGLE_SHEET_ID),
        'line_configured': bool(LINE_CHANNEL_SECRET and LINE_CHANNEL_ACCESS_TOKEN)
    })

@app.route('/api/reports', methods=['GET'])
def get_reports():
    """日次報告一覧取得"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    reports = db_manager.get_reports(start_date, end_date)
    return jsonify([asdict(report) for report in reports])

@app.route('/api/reports', methods=['POST'])
def create_report():
    """日次報告作成"""
    try:
        data = request.get_json()
        
        report = DailyReport(
            id=f"{data['date']}_{data['store_name']}_{datetime.now().strftime('%H%M%S')}",
            date=data['date'],
            store_name=data['store_name'],
            staff_name=data.get('staff_name', ''),
            sales=float(data['sales']),
            purchase=float(data['purchase']),
            labor_cost=float(data.get('labor_cost', 0)),
            utilities=float(data.get('utilities', 0)),
            promotion=float(data.get('promotion', 0)),
            cleaning=float(data.get('cleaning', 0)),
            misc=float(data.get('misc', 0)),
            communication=float(data.get('communication', 0)),
            others=float(data.get('others', 0)),
            report_text=data.get('report_text', ''),
            created_at=datetime.now().isoformat(),
            line_user_id=data.get('line_user_id')
        )
        
        # SQLiteに保存
        if db_manager.save_report(report):
            # Google Sheetsにも保存を試行
            sheets_values = [
                report.date, report.store_name, report.staff_name,
                str(report.sales), str(report.purchase), str(report.labor_cost),
                str(report.utilities), str(report.promotion), str(report.cleaning),
                str(report.misc), str(report.communication), str(report.others),
                report.report_text, report.created_at
            ]
            
            sheets_success = sheets_api.append_row('daily_reports', sheets_values)
            
            return jsonify({
                'success': True,
                'id': report.id,
                'saved_to_sheets': sheets_success
            }), 201
        else:
            return jsonify({'success': False, 'error': 'データベース保存に失敗'}), 500
            
    except Exception as e:
        logger.error(f"報告作成エラー: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/summary', methods=['GET'])
def get_summary():
    """集計データ取得"""
    period_type = request.args.get('period_type', 'daily')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    reports = db_manager.get_reports(start_date, end_date)
    
    # 期間別集計処理
    summary_data = calculate_summary(reports, period_type)
    
    return jsonify(summary_data)

def calculate_summary(reports: List[DailyReport], period_type: str) -> Dict:
    """集計計算"""
    if not reports:
        return {'periods': [], 'totals': {}}
    
    # 期間別にグループ化
    periods = {}
    
    for report in reports:
        if period_type == 'daily':
            key = report.date
        elif period_type == 'weekly':
            # 週の開始日を計算
            date_obj = datetime.strptime(report.date, '%Y-%m-%d')
            week_start = date_obj - timedelta(days=date_obj.weekday())
            key = week_start.strftime('%Y-%m-%d')
        else:  # monthly
            key = report.date[:7]  # YYYY-MM
        
        if key not in periods:
            periods[key] = {
                'period': key,
                'total_sales': 0,
                'total_expenses': 0,
                'total_purchase': 0
            }
        
        # 経費合計
        total_expenses = (report.purchase + report.labor_cost + report.utilities + 
                         report.promotion + report.cleaning + report.misc + 
                         report.communication + report.others)
        
        periods[key]['total_sales'] += report.sales
        periods[key]['total_expenses'] += total_expenses
        periods[key]['total_purchase'] += report.purchase
    
    # 利益計算
    for period_data in periods.values():
        period_data['gross_profit'] = period_data['total_sales'] - period_data['total_purchase']
        period_data['operating_profit'] = period_data['total_sales'] - period_data['total_expenses']
        period_data['profit_margin'] = (
            period_data['operating_profit'] / period_data['total_sales'] * 100
            if period_data['total_sales'] > 0 else 0
        )
    
    return {
        'periods': list(periods.values()),
        'totals': {
            'total_sales': sum(p['total_sales'] for p in periods.values()),
            'total_expenses': sum(p['total_expenses'] for p in periods.values()),
            'gross_profit': sum(p['gross_profit'] for p in periods.values()),
            'operating_profit': sum(p['operating_profit'] for p in periods.values()),
        }
    }

@app.route('/api/line/webhook', methods=['POST'])
def line_webhook():
    """LINE Webhook エンドポイント"""
    # 今後LINE Bot機能を実装
    return jsonify({'status': 'received'}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)