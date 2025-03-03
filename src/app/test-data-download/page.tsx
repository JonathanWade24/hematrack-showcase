'use client'

import React from 'react';
import { DataDownload } from '@/components/data/DataDownload';
import { monitorApiCalls } from '@/utils/debugUtils';

export default function TestDataDownloadPage() {
  // Enable API call monitoring when the component mounts
  React.useEffect(() => {
    const cleanup = monitorApiCalls();
    return cleanup;
  }, []);

  const handleSubmit = async (filters: any) => {
    console.log('Submitted filters:', filters);
    
    // Simulate a download process
    return new Promise<any>(resolve => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        console.log(`Download progress: ${progress}%`);
        
        if (progress >= 100) {
          clearInterval(interval);
          resolve({ success: true });
        } else {
          resolve({ success: true, progress });
        }
      }, 500);
    });
  };

  const handlePreview = async (filters: any) => {
    console.log('Preview filters:', filters);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      headers: ['ID', 'Date', 'Hemoglobin', 'WBC', 'Platelets'],
      rows: [
        [1, '2023-01-01', 10.5, 8.2, 250],
        [2, '2023-01-15', 11.2, 7.8, 230],
        [3, '2023-02-01', 9.8, 8.5, 270]
      ]
    };
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Test Data Download Component</h1>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <DataDownload 
          onSubmit={handleSubmit}
          onPreview={handlePreview}
        />
      </div>
    </div>
  );
} 