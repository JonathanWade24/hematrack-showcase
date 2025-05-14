"use client";

import React from 'react';
import { ASSAY_CONFIGS } from '@/config/assayConfigs';

interface BulkAssaySelectorProps {
  onAssaySelect: (assayKey: string) => void;
}

const assayOptions = Object.entries(ASSAY_CONFIGS).map(([key, config]) => ({
  value: key,
  label: config.displayName,
}));

const BulkAssaySelector: React.FC<BulkAssaySelectorProps> = ({ onAssaySelect }) => {
  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onAssaySelect(event.target.value);
  };

  return (
    <div className="mb-6 p-4 border rounded-md shadow-sm bg-white">
      <label htmlFor="assay-select" className="block text-lg font-medium text-gray-700 mb-2">
        Step 1: Select Assay Type
      </label>
      <select
        id="assay-select"
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
        onChange={handleSelectChange}
        defaultValue=""
        aria-label="Select assay type for bulk data entry"
      >
        <option value="" disabled>
          -- Select an Assay --
        </option>
        {assayOptions.map((assay) => (
          <option key={assay.value} value={assay.value}>
            {assay.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default BulkAssaySelector; 