"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ASSAY_CONFIGS, type AssayFieldConfig } from '@/config/assayConfigs';
import type { SampleForGrid } from '@/app/data-entry/bulk-assay-entry/page'; // Adjust path if SampleForGrid moves
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button"; // For the submit button

interface BulkAssayDataGridProps {
  assayType: string;
  samples: SampleForGrid[];
  onSaveData: (updatedData: SampleForGrid[]) => void; // Callback to save data
  // onUpdateBatchSamples: (updatedSamples: SampleForGrid[]) => void; // For later when making it editable
}

// Helper to format cell data for display
const formatDisplayValue = (value: any, fieldConfig: AssayFieldConfig): string => {
  if (value === null || value === undefined) {
    return ''; // Return empty string for inputs or '-' for display-only
  }
  switch (fieldConfig.type) {
    case 'date':
      if (value instanceof Date) return value.toISOString().split('T')[0]; // Format for input type="date"
      if (typeof value === 'string') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
      }
      return typeof value === 'string' ? value : '';
    case 'boolean':
      return value ? 'Yes' : 'No'; // For display, input handled by checkbox's checked state
    case 'select':
      if (fieldConfig.options) {
        const option = fieldConfig.options.find(opt => opt.value === value);
        return option ? option.label : String(value);
      }
      return String(value);
    default:
      return String(value);
  }
};

const BulkAssayDataGrid: React.FC<BulkAssayDataGridProps> = ({ assayType, samples, onSaveData }) => {
  const assayConfig = ASSAY_CONFIGS[assayType];
  const [editableGridData, setEditableGridData] = useState<SampleForGrid[]>([]);

  useEffect(() => {
    // Deep clone samples to avoid mutating props and ensure assayData is properly copied
    const newEditableData = samples.map(sample => ({
      ...sample,
      assayData: sample.assayData ? { ...sample.assayData } : {},
    }));
    setEditableGridData(newEditableData);
  }, [samples, assayType]);


  const handleInputChange = useCallback((sampleId: string, fieldName: string, value: any, fieldType: AssayFieldConfig['type']) => {
    setEditableGridData(prevData =>
      prevData.map(sample => {
        if (sample.sample_id === sampleId) {
          let processedValue = value;
          if (fieldType === 'number') {
            processedValue = value === '' ? null : Number(value);
            if (isNaN(processedValue as number)) processedValue = null; // or keep as string if partial input like "1.2." is allowed
          } else if (fieldType === 'date') {
            // Ensure date is stored appropriately, e.g., as ISO string or Date object
            // For input type="date", value is already "YYYY-MM-DD"
            processedValue = value === '' ? null : value;
          }
          return {
            ...sample,
            assayData: {
              ...sample.assayData,
              [fieldName]: processedValue,
            },
          };
        }
        return sample;
      })
    );
  }, []);


  if (!assayConfig) {
    return <p className="text-red-500 p-4">Error: Configuration not found for assay type: {assayType}</p>;
  }

  if (!samples || samples.length === 0) {
    // This case is usually handled by the parent page, but good to have a fallback.
    return <p className="text-gray-500 mt-4 p-4">No samples provided for {assayConfig.displayName}. Please select samples first.</p>;
  }

  // Fixed columns + dynamic columns from assay config
  const fixedHeaders = ["Sample ID", "Subject ID"]; // Add more fixed identifiers if needed
  const dynamicHeaders = assayConfig.fields.map(field => field.label);
  const allHeaders = [...fixedHeaders, ...dynamicHeaders];

  return (
    <div className="mt-6 p-4 border rounded-md shadow-sm bg-white">
      <h3 className="text-xl font-semibold mb-1">{assayConfig.displayName}</h3>
      <p className="text-sm text-gray-600 mb-4">
        Enter or update data for {editableGridData.length} sample(s).
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              {allHeaders.map((header, index) => (
                <th 
                  key={index} 
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-r border-gray-300 last:border-r-0"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {editableGridData.map((sample) => (
              <tr key={sample.sample_id} className="hover:bg-gray-50">
                {/* Fixed cells */}
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800 border-r border-gray-300">{sample.sample_id}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-300">{sample.subject_id}</td>
                
                {/* Dynamic editable cells from assayData */}
                {assayConfig.fields.map((field) => {
                  const currentValue = sample.assayData?.[field.name] ?? field.defaultValue ?? '';
                  return (
                    <td 
                      key={field.name} 
                      className="px-2 py-1 whitespace-nowrap text-sm text-gray-700 border-r border-gray-300 last:border-r-0 align-top" // align-top for multiline inputs if any
                    >
                      {field.type === 'text' && (
                        <Input
                          type="text"
                          value={currentValue === null ? '' : String(currentValue)}
                          onChange={(e) => handleInputChange(sample.sample_id, field.name, e.target.value, field.type)}
                          placeholder={field.placeholder || ''}
                          className="text-sm h-10" // Adjusted height
                          disabled={field.disabled}
                        />
                      )}
                      {field.type === 'number' && (
                        <Input
                          type="number"
                          value={currentValue === null ? '' : String(currentValue)}
                          onChange={(e) => handleInputChange(sample.sample_id, field.name, e.target.value, field.type)}
                          placeholder={field.placeholder || ''}
                          className="text-sm h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          disabled={field.disabled}
                        />
                      )}
                      {field.type === 'date' && (
                        <Input
                          type="date"
                          value={currentValue instanceof Date ? currentValue.toISOString().split('T')[0] : (typeof currentValue === 'string' ? currentValue.split('T')[0] : '')}
                          onChange={(e) => handleInputChange(sample.sample_id, field.name, e.target.value, field.type)}
                          className="text-sm h-10"
                          disabled={field.disabled}
                        />
                      )}
                      {field.type === 'select' && field.options && (
                        <Select
                          value={currentValue === null ? '' : String(currentValue)}
                          onValueChange={(value) => handleInputChange(sample.sample_id, field.name, value, field.type)}
                          disabled={field.disabled}
                        >
                          <SelectTrigger className="text-sm h-10">
                            <SelectValue placeholder={field.placeholder || "Select..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map(option => (
                              <SelectItem key={String(option.value)} value={String(option.value)}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {field.type === 'boolean' && (
                        <div className="flex items-center justify-center h-full">
                           <Checkbox
                            checked={Boolean(currentValue)}
                            onCheckedChange={(checked) => handleInputChange(sample.sample_id, field.name, checked, field.type)}
                            disabled={field.disabled}
                            aria-label={field.label}
                          />
                        </div>
                      )}
                      {!['text', 'number', 'date', 'select', 'boolean'].includes(field.type) && (
                        formatDisplayValue(currentValue, field) // Fallback for unhandled types
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 flex justify-end">
        <Button 
          type="button"
          onClick={() => onSaveData(editableGridData)}
          disabled={editableGridData.length === 0}
          className="px-6 py-2"
          aria-label="Submit bulk assay data"
        >
          Save Batch Data
        </Button>
      </div>
    </div>
  );
};

export default BulkAssayDataGrid; 