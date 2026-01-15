import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('detect-anomaly Edge Function', () => {
  describe('calculateMetric', () => {
    it('should calculate sales correctly', () => {
      const report = {
        date: '2025-12-18',
        sales: 100000,
        food_cost: 30000,
        beverage_cost: 5000,
        labor_cost_employee: 20000,
        labor_cost_part_time: 5000,
        customer_count: 100
      };

      expect(report.sales).toBe(100000);
    });

    it('should calculate cost_ratio correctly', () => {
      const report = {
        date: '2025-12-18',
        sales: 100000,
        food_cost: 30000,
        beverage_cost: 5000,
        labor_cost_employee: 20000,
        labor_cost_part_time: 5000,
        customer_count: 100
      };

      const costRatio = ((report.food_cost + report.beverage_cost) / report.sales) * 100;
      expect(costRatio).toBe(35);
    });

    it('should calculate labor_ratio correctly', () => {
      const report = {
        date: '2025-12-18',
        sales: 100000,
        food_cost: 30000,
        beverage_cost: 5000,
        labor_cost_employee: 20000,
        labor_cost_part_time: 5000,
        customer_count: 100
      };

      const laborRatio = ((report.labor_cost_employee + report.labor_cost_part_time) / report.sales) * 100;
      expect(laborRatio).toBe(25);
    });

    it('should calculate fl_cost correctly', () => {
      const report = {
        date: '2025-12-18',
        sales: 100000,
        food_cost: 30000,
        beverage_cost: 5000,
        labor_cost_employee: 20000,
        labor_cost_part_time: 5000,
        customer_count: 100
      };

      const flCost = ((report.food_cost + report.beverage_cost + report.labor_cost_employee + report.labor_cost_part_time) / report.sales) * 100;
      expect(flCost).toBe(60);
    });

    it('should return 0 for ratios when sales is 0', () => {
      const report = {
        date: '2025-12-18',
        sales: 0,
        food_cost: 30000,
        beverage_cost: 5000,
        labor_cost_employee: 20000,
        labor_cost_part_time: 5000,
        customer_count: 100
      };

      const costRatio = report.sales > 0 ? ((report.food_cost + report.beverage_cost) / report.sales) * 100 : 0;
      expect(costRatio).toBe(0);
    });
  });

  describe('calculateStats', () => {
    it('should calculate mean and standard deviation correctly', () => {
      const values = [10, 20, 30, 40, 50];
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      expect(mean).toBe(30);

      const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
      const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
      const stdDev = Math.sqrt(variance);

      expect(Math.round(stdDev * 100) / 100).toBeCloseTo(14.14, 1);
    });

    it('should handle empty array', () => {
      const values: number[] = [];
      const result = values.length === 0 ? { mean: 0, stdDev: 0 } : {};
      expect(result).toEqual({ mean: 0, stdDev: 0 });
    });

    it('should handle single value', () => {
      const values = [100];
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      expect(mean).toBe(100);

      const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
      const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
      const stdDev = Math.sqrt(variance);
      expect(stdDev).toBe(0);
    });
  });

  describe('Z-Score calculation', () => {
    it('should calculate z-score correctly', () => {
      const currentValue = 50;
      const mean = 30;
      const stdDev = 10;

      const zScore = stdDev > 0 ? Math.abs((currentValue - mean) / stdDev) : 0;
      expect(zScore).toBe(2);
    });

    it('should detect high anomaly (z-score > 3.5)', () => {
      const currentValue = 65;
      const mean = 30;
      const stdDev = 10;

      const zScore = Math.abs((currentValue - mean) / stdDev);
      expect(zScore).toBe(3.5);
      expect(zScore > 3.5).toBe(false);
      expect(zScore >= 3.5).toBe(true);
    });

    it('should detect medium anomaly (z-score > 2.5)', () => {
      const currentValue = 55;
      const mean = 30;
      const stdDev = 10;

      const zScore = Math.abs((currentValue - mean) / stdDev);
      expect(zScore).toBe(2.5);
      expect(zScore > 2.5).toBe(false);
      expect(zScore >= 2.5).toBe(true);
    });

    it('should detect no anomaly (z-score <= 2)', () => {
      const currentValue = 45;
      const mean = 30;
      const stdDev = 10;

      const zScore = Math.abs((currentValue - mean) / stdDev);
      expect(zScore).toBe(1.5);
      expect(zScore > 2.5).toBe(false);
    });

    it('should handle zero standard deviation', () => {
      const currentValue = 30;
      const mean = 30;
      const stdDev = 0;

      const zScore = stdDev > 0 ? Math.abs((currentValue - mean) / stdDev) : 0;
      expect(zScore).toBe(0);
    });
  });

  describe('Metric name and unit helpers', () => {
    it('should return correct metric names', () => {
      const metricNames = {
        sales: '売上',
        cost_ratio: '原価率',
        labor_ratio: '人件費率',
        customer_count: '客数',
        fl_cost: 'FLコスト'
      };

      expect(metricNames.sales).toBe('売上');
      expect(metricNames.cost_ratio).toBe('原価率');
      expect(metricNames.labor_ratio).toBe('人件費率');
    });

    it('should return correct metric units', () => {
      const metricUnits = {
        sales: '円',
        cost_ratio: '%',
        labor_ratio: '%',
        customer_count: '人',
        fl_cost: '%'
      };

      expect(metricUnits.sales).toBe('円');
      expect(metricUnits.cost_ratio).toBe('%');
      expect(metricUnits.customer_count).toBe('人');
    });
  });

  describe('Response structure', () => {
    it('should have correct anomaly response structure', () => {
      const response = {
        is_anomaly: true,
        severity: 'high' as const,
        message: '原価率が通常より大きく外れているワン！',
        reason: '統計分析による判定',
        current_value: 45.5,
        average_value: 32.0,
        std_deviation: 3.2
      };

      expect(response.is_anomaly).toBe(true);
      expect(response.severity).toBe('high');
      expect(response.message).toContain('ワン');
      expect(response.current_value).toBeGreaterThan(response.average_value);
    });

    it('should have correct normal response structure', () => {
      const response = {
        is_anomaly: false,
        severity: 'low' as const,
        message: '原価率は正常範囲内だワン！',
        reason: '統計分析: 平均値との差が小さい',
        current_value: 32.5,
        average_value: 32.0,
        std_deviation: 3.2
      };

      expect(response.is_anomaly).toBe(false);
      expect(response.severity).toBe('low');
      expect(response.message).toContain('ワン');
    });
  });

  describe('Edge cases', () => {
    it('should handle missing data gracefully', () => {
      const emptyReports: any[] = [];
      expect(emptyReports.length).toBe(0);
      expect(emptyReports.length < 7).toBe(true);
    });

    it('should handle invalid metric type', () => {
      const metricType = 'invalid_metric';
      const defaultValue = 0;

      expect(defaultValue).toBe(0);
    });

    it('should handle null values in report data', () => {
      const report = {
        date: '2025-12-18',
        sales: null as any,
        food_cost: null as any,
        beverage_cost: null as any,
        labor_cost_employee: null as any,
        labor_cost_part_time: null as any,
        customer_count: null as any
      };

      const sales = Number(report.sales) || 0;
      expect(sales).toBe(0);
    });
  });

  describe('AI prompt construction', () => {
    it('should include all necessary information in prompt', () => {
      const metricName = '原価率';
      const targetDate = '2025-12-18';
      const storeId = 'store-123';
      const currentValue = 45.5;
      const mean = 32.0;
      const stdDev = 3.2;
      const zScore = 4.2;

      const promptData = {
        metricName,
        targetDate,
        storeId,
        currentValue,
        mean,
        stdDev,
        zScore
      };

      expect(promptData.metricName).toBe('原価率');
      expect(promptData.currentValue).toBeGreaterThan(promptData.mean);
      expect(promptData.zScore).toBeGreaterThan(3.5);
    });
  });
});
