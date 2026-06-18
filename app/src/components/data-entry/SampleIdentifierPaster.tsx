"use client";

import React, { useState } from 'react';

interface SampleIdentifierPasterProps {
  onIdentifiersPasted: (identifiers: string[]) => void;
}

const SampleIdentifierPaster: React.FC<SampleIdentifierPasterProps> = ({ onIdentifiersPasted }) => {
  const [pastedText, setPastedText] = useState<string>("");

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPastedText(event.target.value);
  };

  const handleSubmitPastedIdentifiers = () => {
    const identifiers = pastedText
      .split(/[\s,;\n]+/)
      .map(id => id.trim())
      .filter(id => id.length > 0);
    
    if (identifiers.length > 0) {
      onIdentifiersPasted(identifiers);
    } else {
      // Optionally, provide feedback if no valid identifiers are found
      console.warn("No valid identifiers found in pasted text.");
    }
    // Clear the textarea after submission if desired
    // setPastedText(""); 
  };

  return (
    <div className="mb-6 p-4 border rounded-md shadow-sm bg-white">
      <label htmlFor="identifier-paste-area" className="block text-lg font-medium text-gray-700 mb-2">
        Paste Sample Identifiers:
      </label>
      <p className="text-sm text-gray-500 mb-2">
        Enter one identifier per line, or separate by space, comma, or semicolon.
      </p>
      <textarea
        id="identifier-paste-area"
        rows={6}
        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
        placeholder="SAMPLEID001\nSUBJECTID001-1\nSAMPLEID002, SAMPLEID003..."
        value={pastedText}
        onChange={handleTextChange}
        aria-label="Paste sample identifiers"
      />
      <div className="mt-3 text-right">
        <button
          type="button"
          onClick={handleSubmitPastedIdentifiers}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Load Samples from Identifiers
        </button>
      </div>
    </div>
  );
};

export default SampleIdentifierPaster; 