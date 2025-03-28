import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
);

// Error message component
const ErrorMessage = ({ message }: { message: string }) => (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
    <p>{message}</p>
  </div>
);

// Refresh button component
const RefreshButton = ({ onClick }: { onClick: () => void }) => (
  <Button variant="outline" size="sm" onClick={onClick}>
    <RefreshCw className="h-4 w-4 mr-2" />
    Refresh
  </Button>
);

// Table component
const Table = ({ data }: { data: { headers: string[], rows: (string | number)[][] } }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200 mt-4">
      <thead className="bg-gray-50">
        <tr>
          {data.headers.map((header, index) => (
            <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {cell === null ? 'N/A' : String(cell)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Add proper TypeScript types to the PreviewSection props
interface PreviewSectionProps {
  data: {
    headers: string[],
    rows: (string | number)[][],
    totalCount: number
  } | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const PreviewSection = ({ data, isLoading, error, onRefresh }: PreviewSectionProps) => {
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  
  return (
    <div className="preview-section">
      <div className="flex justify-between items-center">
        <h3>Data Preview</h3>
        <RefreshButton onClick={onRefresh} />
      </div>
      
      {data && (
        <>
          <div className="text-sm text-gray-500">
            Showing {data.rows.length} of {data.totalCount} total records
          </div>
          <Table data={data} />
        </>
      )}
    </div>
  );
}; 