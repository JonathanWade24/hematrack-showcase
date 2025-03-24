'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, Database, Loader2 } from 'lucide-react'

// Define schema options
const SCHEMA_OPTIONS = [
  { id: 'laboratory', name: 'Laboratory', description: 'Core laboratory data including subjects and results' },
  { id: 'clinical', name: 'Clinical', description: 'Clinical data including patient visits, medications, and demographics' },
  { id: 'public', name: 'Public', description: 'Publicly accessible data' },
]

// Define table options
const TABLE_OPTIONS = {
  laboratory: [
    { id: 'omics_subjects', name: 'Subjects', description: 'Subject information including patient MRN and project' },
    { id: 'omics_results', name: 'Results', description: 'Sample results including ADVIA, LORRCA, and other measurements' }
  ],
  clinical: [
    { id: 'demographics', name: 'Demographics', description: 'Patient demographic information' },
    { id: 'ip_admissions', name: 'Inpatient Admissions', description: 'Hospital admission records' },
    { id: 'ip_medications', name: 'Inpatient Medications', description: 'Medications administered during hospital stays' },
    { id: 'op_visits', name: 'Outpatient Visits', description: 'Clinic visit records' },
    { id: 'op_medications', name: 'Outpatient Medications', description: 'Medications prescribed during clinic visits' },
    { id: 'bone_marrow', name: 'Bone Marrow', description: 'Bone marrow transplant records' },
    { id: 'Labs', name: 'Labs', description: 'Laboratory test results from clinical systems' },
    { id: 'unified_visits', name: 'Unified Visits', description: 'Combined inpatient and outpatient visit records' }
  ],
  public: [
    { id: 'public_data', name: 'Public Data', description: 'Publicly available data' }
  ]
}

export function DataDownloadTool() {
  const [selectedSchema, setSelectedSchema] = useState<string>('laboratory')
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [columns, setColumns] = useState<string[]>([])
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState<number>(1000)
  const [whereClause, setWhereClause] = useState<string>('')
  const [orderByColumn, setOrderByColumn] = useState<string>('')
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc')

  // Reset table selection when schema changes
  useEffect(() => {
    setSelectedTable('')
    setColumns([])
    setSelectedColumns([])
  }, [selectedSchema])

  // Fetch columns for the selected table
  useEffect(() => {
    if (!selectedTable) return

    async function fetchTableInfo() {
      setIsLoading(true)
      setError(null)
      
      try {
        // Fetch table definition
        const response = await fetch('/api/supabase/get-table-definition', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            table_name: selectedTable,
            schema: selectedSchema 
          }),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch table definition')
        }
        
        const data = await response.json()
        
        if (data && Array.isArray(data)) {
          // Extract column names
          const columnNames = data.map(col => col.column_name)
          setColumns(columnNames)
          
          // Set default columns based on table
          if (selectedTable === 'omics_subjects') {
            setSelectedColumns(['subject_id', 'patient_mrn', 'project'])
          } else if (selectedTable === 'omics_results') {
            setSelectedColumns(['sample_id', 'subject_id', 'date_of_collection', 'genotype'])
          } else if (selectedTable === 'demographics') {
            setSelectedColumns(['patient_mrn', 'gender', 'race', 'ethnicity'])
          } else if (selectedTable === 'ip_admissions' || selectedTable === 'op_visits') {
            setSelectedColumns(['patient_mrn', 'admit_date', 'discharge_date'])
          } else {
            setSelectedColumns(columnNames.slice(0, 5))
          }
          
          // Set default order by column
          if (columnNames.includes('created_at')) {
            setOrderByColumn('created_at')
          } else if (columnNames.includes('date_of_collection')) {
            setOrderByColumn('date_of_collection')
          } else if (columnNames.includes('admit_date')) {
            setOrderByColumn('admit_date')
          } else if (columnNames.length > 0) {
            setOrderByColumn(columnNames[0])
          }
        }
      } catch (err) {
        console.error('Error fetching table info:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch table info')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchTableInfo()
  }, [selectedTable, selectedSchema])

  // Handle column selection
  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev => 
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    )
  }

  // Handle select all columns
  const handleSelectAllColumns = () => {
    setSelectedColumns(columns)
  }

  // Handle clear all columns
  const handleClearColumns = () => {
    setSelectedColumns([])
  }

  // Download data as CSV
  const handleDownload = async () => {
    if (selectedColumns.length === 0) {
      setError('Please select at least one column')
      return
    }
    
    setIsLoading(true)
    setError(null)
    setDownloadProgress(0)
    
    try {
      // Use fetch API with our existing API endpoint to download data
      const response = await fetch('/api/data/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schema: selectedSchema,
          table: selectedTable,
          columns: selectedColumns,
          whereClause: whereClause.trim(),
          orderBy: orderByColumn,
          orderDirection,
          limit
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to download data')
      }
      
      const data = await response.blob()
      
      // Create download link for the blob
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `${selectedSchema}_${selectedTable}_export_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setDownloadProgress(100)
    } catch (err) {
      console.error('Error downloading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to download data')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Download Tool
        </CardTitle>
        <CardDescription>
          Export data from the SCD Dashboard database as CSV files
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="schema" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="schema">Schema Selection</TabsTrigger>
            <TabsTrigger value="table">Table Selection</TabsTrigger>
            <TabsTrigger value="columns">Column Selection</TabsTrigger>
            <TabsTrigger value="options">Query Options</TabsTrigger>
          </TabsList>
          
          <TabsContent value="schema" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="schema-select" className="text-sm font-medium">
                  Select Schema
                </Label>
                <Select 
                  value={selectedSchema} 
                  onValueChange={setSelectedSchema}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Select a schema" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEMA_OPTIONS.map(schema => (
                      <SelectItem key={schema.id} value={schema.id}>
                        {schema.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">
                  {SCHEMA_OPTIONS.find(s => s.id === selectedSchema)?.description}
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="table" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="table-select" className="text-sm font-medium">
                  Select Table
                </Label>
                <Select 
                  value={selectedTable} 
                  onValueChange={setSelectedTable}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Select a table" />
                  </SelectTrigger>
                  <SelectContent>
                    {TABLE_OPTIONS[selectedSchema as keyof typeof TABLE_OPTIONS].map(table => (
                      <SelectItem key={table.id} value={table.id}>
                        {table.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">
                  {TABLE_OPTIONS[selectedSchema as keyof typeof TABLE_OPTIONS]
                    .find(t => t.id === selectedTable)?.description}
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="columns" className="space-y-4">
            <div className="flex justify-between mb-2">
              <h3 className="text-sm font-medium">Select Columns to Export</h3>
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectAllColumns}
                  disabled={isLoading}
                >
                  Select All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleClearColumns}
                  disabled={isLoading}
                >
                  Clear All
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-md p-4">
              {columns.map(column => (
                <div key={column} className="flex items-center space-x-2">
                  <Checkbox
                    id={column}
                    checked={selectedColumns.includes(column)}
                    onCheckedChange={() => handleColumnToggle(column)}
                  />
                  <Label htmlFor={column}>{column}</Label>
                </div>
              ))}
            </div>
            
            <div className="text-sm text-gray-500 mt-2">
              Selected {selectedColumns.length} of {columns.length} columns
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>Coming Soon:</strong> Advanced features including related table joins, complex filtering, and cross-schema queries.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="options" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="limit" className="text-sm font-medium">
                  Row Limit
                </Label>
                <Input
                  id="limit"
                  type="number"
                  min="1"
                  max="10000"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value) || 1000)}
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Maximum number of rows to export (1-10,000)
                </p>
              </div>
              
              <div>
                <Label htmlFor="where" className="text-sm font-medium">
                  Where Clause (SQL format)
                </Label>
                <Input
                  id="where"
                  value={whereClause}
                  onChange={(e) => setWhereClause(e.target.value)}
                  placeholder='column = "value" AND other_column > 100'
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  SQL format: column = "value" AND other_column &gt; 100
                </p>
              </div>
              
              <div>
                <Label htmlFor="order-by" className="text-sm font-medium">
                  Order By
                </Label>
                <div className="flex gap-2 mt-1">
                  <Select 
                    value={orderByColumn} 
                    onValueChange={setOrderByColumn}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map(column => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select 
                    value={orderDirection} 
                    onValueChange={(value: 'asc' | 'desc') => setOrderDirection(value)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-500">
          {error && <p className="text-red-500">{error}</p>}
          {downloadProgress > 0 && downloadProgress < 100 && (
            <p className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Downloading... {downloadProgress}%
            </p>
          )}
        </div>
        
        <Button 
          onClick={handleDownload}
          disabled={isLoading || selectedColumns.length === 0}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download CSV
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
} 