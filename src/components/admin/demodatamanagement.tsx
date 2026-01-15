import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { RefreshCw, Calendar, CheckCircle, AlertCircle, Database, Trash2, Plus } from 'lucide-react'

interface DemoDataStatus {
  month: string
  days_with_data: number
  total_records: number
  stores_count: number
  first_date: string
  last_date: string
  is_current_month: boolean
  is_complete: boolean
}

interface RefreshAction {
  action: 'DELETED' | 'GENERATED' | 'EXISTS' | 'COMPLETED'
  month_affected: string
  details: string
}

export const DemoDataManagement: React.FC = () => {
  const [status, setStatus] = useState<DemoDataStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<RefreshAction[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const loadDemoDataStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_demo_data_status')

      if (error) throw error

      setStatus(data || [])
    } catch (error) {
      console.error('Error loading demo data status:', error)
      setMessage({
        type: 'error',
        text: 'Failed to load demo data status'
      })
    } finally {
      setLoading(false)
    }
  }

  const triggerRefresh = async () => {
    setRefreshing(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.rpc('trigger_demo_data_refresh')

      if (error) throw error

      setLastRefresh(data || [])
      setMessage({
        type: 'success',
        text: 'Demo data refresh completed successfully'
      })

      // Reload status after refresh
      await loadDemoDataStatus()
    } catch (error) {
      console.error('Error refreshing demo data:', error)
      setMessage({
        type: 'error',
        text: 'Failed to refresh demo data. Please try again.'
      })
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDemoDataStatus()
  }, [])

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'DELETED':
        return <Trash2 className="h-4 w-4" />
      case 'GENERATED':
        return <Plus className="h-4 w-4" />
      case 'EXISTS':
        return <CheckCircle className="h-4 w-4" />
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'DELETED':
        return 'text-red-600'
      case 'GENERATED':
        return 'text-green-600'
      case 'EXISTS':
        return 'text-blue-600'
      case 'COMPLETED':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Demo Data Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Demo Data Management
          </CardTitle>
          <CardDescription>
            Manage the automatic rolling 3-month demo data window. The system maintains
            October, November, and December 2025 data automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : message.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {message.type === 'error' ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                <p className="font-medium">{message.text}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Current Data Status</h3>
              <p className="text-sm text-muted-foreground">
                System maintains recent 3 months of demo data
              </p>
            </div>
            <Button
              onClick={triggerRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Now'}
            </Button>
          </div>

          <div className="space-y-3">
            {status.map((monthData) => (
              <div
                key={monthData.month}
                className={`p-4 rounded-lg border ${
                  monthData.is_complete
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{monthData.month}</span>
                        {monthData.is_current_month && (
                          <Badge variant="default">Current Month</Badge>
                        )}
                        {monthData.is_complete ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-600 text-white">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Incomplete
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {monthData.days_with_data} days | {monthData.total_records} records |{' '}
                        {monthData.stores_count} stores
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {monthData.first_date} to {monthData.last_date}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {lastRefresh.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-3">Last Refresh Actions</h4>
              <div className="space-y-2">
                {lastRefresh.map((action, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                  >
                    <span className={getActionColor(action.action)}>
                      {getActionIcon(action.action)}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{action.action}</span>
                        <span className="text-sm text-muted-foreground">
                          {action.month_affected}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {action.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">Automatic Maintenance</h4>
                <p className="text-sm text-blue-800 mt-1">
                  The system automatically runs on the 1st of every month at 3:00 AM UTC.
                  It removes data older than 3 months and generates any missing months to
                  maintain a rolling 3-month window.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
