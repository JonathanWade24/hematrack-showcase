'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DataPreviewProps {
  data: {
    primary_data: Record<string, any>[];
    context_data?: Record<string, any>[];
  };
}

export function DataPreview({ data }: DataPreviewProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('primary');

  // Handle pagination
  const totalPrimaryRecords = data.primary_data?.length || 0;
  const totalContextRecords = data.context_data?.length || 0;
  const totalPages = Math.ceil(
    (activeTab === 'primary' ? totalPrimaryRecords : totalContextRecords) / pageSize
  );
  
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  // Get paginated data based on active tab
  const paginatedData = activeTab === 'primary'
    ? data.primary_data?.slice(startIndex, endIndex) || []
    : data.context_data?.slice(startIndex, endIndex) || [];
  
  // Get column headers from first record
  const columns = paginatedData.length > 0
    ? Object.keys(paginatedData[0])
    : [];
  
  // Check if we have context data
  const hasContextData = data.context_data && data.context_data.length > 0;
  
  // Helper to format cell value for display
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Query Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2 items-center">
                <span className="text-sm font-medium">
                  {activeTab === 'primary' ? 'Primary Data Records:' : 'Context Data Records:'}
                </span>
                <span className="text-sm">
                  {activeTab === 'primary' ? totalPrimaryRecords : totalContextRecords}
                </span>
              </div>
              
              <Button variant="outline" size="sm" disabled={!data.primary_data?.length}>
                <FileDown className="h-4 w-4 mr-2" />
                Export to CSV
              </Button>
            </div>
            
            {/* Data Tabs */}
            {hasContextData && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="primary">Primary Data</TabsTrigger>
                  <TabsTrigger value="context">Context Data</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            
            {/* Data Table */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead key={column}>{column}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((row, index) => (
                      <TableRow key={index}>
                        {columns.map((column) => (
                          <TableCell key={`${index}-${column}`}>
                            {formatCellValue(row[column])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length || 1} className="h-24 text-center">
                        No results available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination Controls */}
            {(activeTab === 'primary' ? totalPrimaryRecords : totalContextRecords) > 0 && (
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="page-size">Rows per page:</Label>
                  <select
                    id="page-size"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1); // Reset to first page when changing page size
                    }}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm">
                    Page {page} of {totalPages || 1}
                  </span>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={page === totalPages || totalPages === 0}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages || totalPages === 0}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 