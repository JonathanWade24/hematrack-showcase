"use client";

import React, { useState, useEffect, useCallback } from "react";
import BulkAssaySelector from "@/components/data-entry/BulkAssaySelector";
import BulkSampleSelector from "@/components/data-entry/BulkSampleSelector";
import BulkAssayDataGrid from "@/components/data-entry/BulkAssayDataGrid";
import { type SampleSearchResult } from "@/app/data-entry/actions"; // For typing selected samples
import { getExistingAssayDataAction, saveBulkAssayDataAction } from "@/app/data-entry/actions";
import { ASSAY_CONFIGS } from "@/config/assayConfigs"; // To access sampleIdForeignKey for mapping
import { Button } from "@/components/ui/button"; // For a potential clear batch button or other actions
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For displaying messages
import { Terminal } from "lucide-react"; // Icon for Alert
import { DashboardLayout } from "@/components/layout/DashboardLayout"; // Import DashboardLayout

// Define a more specific type for sample data that will be passed to the grid
// It will include basic sample info and a placeholder for assay-specific data
export interface SampleForGrid extends SampleSearchResult {
  assayData?: { [key: string]: any }; // To store fetched or entered assay data
  // Add other relevant fields from SampleSearchResult if needed explicitly
}

const BulkAssayEntryPage = () => {
  const [selectedAssayKey, setSelectedAssayKey] = useState<string | null>(null);
  const [batchSamples, setBatchSamples] = useState<SampleForGrid[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<{ message: string; type: 'success' | 'error'; errors?: Array<{sample_id: string, error: string}> } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  const handleAssaySelect = (assayKey: string) => {
    setSelectedAssayKey(assayKey);
    setBatchSamples([]); // Clear batch if assay changes
    setSaveStatus(null); // Clear previous save messages
    console.log("Selected Assay Key:", assayKey);
  };

  const handleSamplesSelectedForBatch = useCallback((newlySelectedSamples: SampleSearchResult[]) => {
    console.log("[PAGE] Samples selected from BulkSampleSelector:", newlySelectedSamples);
    setSaveStatus(null); // Clear save status when new samples are added
    setBatchSamples(prevBatch => {
      const existingIds = new Set(prevBatch.map(s => s.sample_id));
      const samplesToAdd = newlySelectedSamples
        .filter(newSample => !existingIds.has(newSample.sample_id))
        .map(newSample => ({ ...newSample, assayData: {} })); 
      
      const updatedBatch = [...prevBatch, ...samplesToAdd];
      console.log("[PAGE] Updated batchSamples state after adding:", updatedBatch);
      return updatedBatch;
    });
  }, []);

  // Function to fetch existing assay data for batchSamples
  const fetchAssayDataForBatch = useCallback(async (assayKey: string, currentBatch: SampleForGrid[]) => {
    if (!assayKey || currentBatch.length === 0) {
      return currentBatch; // Return current batch if no key or empty batch
    }
    const currentAssayConfig = ASSAY_CONFIGS[assayKey];
    if (!currentAssayConfig) {
      console.error(`No assay config found for key: ${assayKey}`);
      setSaveStatus({ message: `Configuration error for ${assayKey}.`, type: 'error' });
      return currentBatch.map(sample => ({ ...sample, assayData: {} }));
    }

    const sampleIdsToFetch = currentBatch.map(s => s.sample_id);
    console.log(`Fetching existing ${assayKey} data for sample IDs:`, sampleIdsToFetch);
    setIsLoadingData(true);
    try {
      const result = await getExistingAssayDataAction(sampleIdsToFetch, assayKey);
      setIsLoadingData(false);

      if (result.success && result.data) {
        console.log(`Fetched ${result.data.length} existing ${assayKey} records.`, result.data);
        const assayDataMap = new Map<string, any>();
        const sampleIdKey = currentAssayConfig.sampleIdForeignKey;
        result.data.forEach(record => {
          if (record && typeof record === 'object' && sampleIdKey in record) {
            const recordSampleId = (record as any)[sampleIdKey];
            assayDataMap.set(recordSampleId, record);
          }
        });

        const newBatchWithAssayData = currentBatch.map(sample => ({
          ...sample,
          assayData: assayDataMap.get(sample.sample_id) || sample.assayData || {},
        }));
        console.log("[PAGE] Batch samples after setting assay data:", newBatchWithAssayData);
        return newBatchWithAssayData;
      } else {
        console.error(`Failed to fetch existing ${assayKey} data:`, result.message);
        setSaveStatus({ message: result.message || `Failed to fetch data for ${assayKey}.`, type: 'error' });
        return currentBatch.map(sample => ({ ...sample, assayData: {} }));
      }
    } catch (error: any) {
      setIsLoadingData(false);
      console.error(`Error in fetchAssayDataForBatch for ${assayKey}:`, error);
      setSaveStatus({ message: error.message || `Error fetching data.`, type: 'error' });
      return currentBatch.map(sample => ({ ...sample, assayData: {} }));
    }
  }, []);

  // useEffect to fetch data when assay or sample list changes
  useEffect(() => {
    const batchKey = batchSamples.map(s => s.sample_id).join(',');
    const assayKeyForFetch = selectedAssayKey; // Capture the assay key at the time of effect execution

    if (assayKeyForFetch && batchKey) {
      fetchAssayDataForBatch(assayKeyForFetch, batchSamples).then(updatedBatch => {
        // Ensure that the update only happens if the key elements (assay, sample IDs) haven't changed
        // This is to prevent race conditions if user changes selection rapidly
        if (selectedAssayKey === assayKeyForFetch && batchSamples.map(s => s.sample_id).join(',') === batchKey) {
            setBatchSamples(updatedBatch);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssayKey, batchSamples.map(s => s.sample_id).join(','), fetchAssayDataForBatch]);

  const handleSaveData = async (dataFromGrid: SampleForGrid[]) => {
    if (!selectedAssayKey) {
      setSaveStatus({ message: "No assay selected.", type: 'error' });
      return;
    }
    setIsSaving(true);
    setSaveStatus(null);

    const recordsToSave = dataFromGrid.map(sample => ({
      sample_id: sample.sample_id,
      assayData: sample.assayData || {},
    }));

    console.log("[PAGE] Attempting to save data:", { assayKey: selectedAssayKey, records: recordsToSave });

    const result = await saveBulkAssayDataAction(selectedAssayKey, recordsToSave);
    setIsSaving(false);

    if (result.success) {
      setSaveStatus({ message: result.message, type: 'success' });
      // Re-fetch data to reflect saved changes
      const updatedBatch = await fetchAssayDataForBatch(selectedAssayKey, batchSamples);
      setBatchSamples(updatedBatch);
    } else {
      setSaveStatus({ message: result.message, type: 'error', errors: result.errors });
      console.error("[PAGE] Save failed:", result);
    }
  };

  const currentBatchSampleIds = batchSamples.map(s => s.sample_id);

  // Log right before rendering BulkAssayDataGrid
  if (selectedAssayKey && batchSamples.length > 0) {
    console.log("[PAGE] Rendering BulkAssayDataGrid with assay:", selectedAssayKey, "and samples:", batchSamples);
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-4">Bulk Assay Data Entry</h1>
          {saveStatus && (
            <Alert variant={saveStatus.type === 'error' ? "destructive" : "default"} className="mb-4">
              <Terminal className="h-4 w-4" />
              <AlertTitle>{saveStatus.type === 'success' ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>
                {saveStatus.message}
                {saveStatus.errors && saveStatus.errors.length > 0 && (
                  <ul className="list-disc list-inside mt-2">
                    {saveStatus.errors.map((err, idx) => (
                      <li key={idx}>Sample {err.sample_id}: {err.error}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}
          <BulkAssaySelector onAssaySelect={handleAssaySelect} />
        </div>

        {selectedAssayKey && (
          <div>
            <h2 className="text-xl font-semibold mb-3">
              Step 2: Build Sample Batch for <span className="font-bold">{selectedAssayKey.toUpperCase()}</span>
            </h2>
            <BulkSampleSelector 
              onSamplesSelectedForBatch={handleSamplesSelectedForBatch} 
              currentBatchSampleIds={currentBatchSampleIds} 
            />
          </div>
        )}

        {selectedAssayKey && batchSamples.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-3">Step 3: Enter/Review Data</h2>
            {/* 
              The BulkAssayDataGrid will need to accept `batchSamples` (which are SampleForGrid[])
              and allow editing of the `assayData` property for each sample.
              It will also need the `selectedAssayKey` to know which fields to render from ASSAY_CONFIGS.
            */}
            <BulkAssayDataGrid 
              assayType={selectedAssayKey} 
              samples={batchSamples} 
              onSaveData={handleSaveData}
            />
          </div>
        )}

        {(isLoadingData || isSaving) && (
           <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity flex items-center justify-center z-50">
            <div className="bg-white p-5 rounded-lg shadow-xl flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              <p className="text-lg font-medium text-gray-700">
                {isSaving ? "Saving data..." : "Loading data..."}
              </p>
            </div>
          </div>
        )}

        {!selectedAssayKey && !isLoadingData && !isSaving && (
          <p className="text-gray-500 mt-6">Please select an assay type to begin.</p>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BulkAssayEntryPage; 