"use client";

import React, { useState, useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { searchSamplesAction, type SearchState, type SampleSearchResult } from '@/app/data-entry/actions'; // Assuming SampleSearchResult is suitable

interface BulkSampleSelectorProps {
  onSamplesSelectedForBatch: (selectedSamples: SampleSearchResult[]) => void;
  currentBatchSampleIds: string[]; // To disable already added samples
}

interface ExtendedSampleResult extends SampleSearchResult {
  isSelected: boolean;
}

function SearchButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
    >
      {pending ? 'Searching...' : 'Search Samples'}
    </button>
  );
}

const BulkSampleSelector: React.FC<BulkSampleSelectorProps> = ({ onSamplesSelectedForBatch, currentBatchSampleIds }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const initialState: SearchState = { results: [], message: null, error: false };
  const [searchState, dispatchSearchForm] = useActionState(searchSamplesAction, initialState);
  
  const [displayableResults, setDisplayableResults] = useState<ExtendedSampleResult[]>([]);
  const [selectedFromSearch, setSelectedFromSearch] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    const newDisplayableResults = (searchState?.results || []).map(sample => ({
      ...sample,
      isSelected: !!selectedFromSearch[sample.sample_id],
    }));
    setDisplayableResults(newDisplayableResults);
  }, [searchState?.results, selectedFromSearch]);

  const handleSearchFormSubmit = (formData: FormData) => {
    // Potentially clear previous selections when a new search is made, or maintain them
    // setSelectedFromSearch({}); 
    dispatchSearchForm(formData);
  };

  const handleToggleSampleSelection = (sampleId: string) => {
    setSelectedFromSearch(prev => ({
      ...prev,
      [sampleId]: !prev[sampleId],
    }));
  };

  const handleAddSelectedToBatch = () => {
    const samplesToAdd = (searchState?.results || []).filter(sample => selectedFromSearch[sample.sample_id]);
    if (samplesToAdd.length > 0) {
      onSamplesSelectedForBatch(samplesToAdd);
      setSelectedFromSearch({}); // Clear selection after adding
    }
  };

  const noResults = !searchState?.results || searchState?.results.length === 0;

  return (
    <div className="p-4 border rounded-md shadow-sm bg-white">
      <h3 className="text-lg font-medium text-gray-700 mb-2">Search and Select Samples:</h3>
      <form action={handleSearchFormSubmit} className="flex gap-4 mb-4">
        <input
          type="text"
          name="searchQuery"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Sample ID or Subject ID (min 2 chars)"
          className="flex-1 rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          aria-label="Search for samples"
        />
        <SearchButton />
      </form>

      {searchState?.message && !searchState?.error && !noResults && (
         <p className={`text-sm text-gray-600 mb-2`}>{searchState.message}</p>
      )}
      {searchState?.error && (
        <p className={`text-sm text-red-600 mb-2`}>{searchState.message}</p>
      )}

      {!noResults ? (
        <div className="max-h-96 overflow-y-auto border rounded-md divide-y divide-gray-200">
          {displayableResults.map((sample) => {
            const isAlreadyInBatch = currentBatchSampleIds.includes(sample.sample_id);
            return (
              <div key={sample.sample_id} className={`p-3 flex items-center justify-between ${isAlreadyInBatch ? 'bg-gray-100 opacity-70' : 'hover:bg-gray-50'}`}>
                <div>
                  <div className="font-medium text-indigo-600">{sample.sample_id}</div>
                  <div className="text-sm text-gray-500">Subject: {sample.subject_id}</div>
                  {sample.date_of_collection && (
                     <div className="text-sm text-gray-500">Collected: {new Date(sample.date_of_collection + 'T00:00:00').toLocaleDateString()}</div>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 disabled:opacity-50"
                  checked={sample.isSelected}
                  onChange={() => handleToggleSampleSelection(sample.sample_id)}
                  disabled={isAlreadyInBatch}
                  aria-label={`Select sample ${sample.sample_id}`}
                />
              </div>
            );
          })}
        </div>
      ) : (
        searchQuery && searchState?.message && <p className="text-sm text-gray-500 py-4">{searchState.message}</p>
      )}
      
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleAddSelectedToBatch}
          disabled={Object.values(selectedFromSearch).every(val => !val)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          Add Selected to Batch ({Object.values(selectedFromSearch).filter(val => val).length})
        </button>
      </div>
    </div>
  );
};

export default BulkSampleSelector; 