import { FilterCriteria } from '@/components/data/DataDownload';

export const debugDataDownload = (filters: FilterCriteria) => {
  console.group('DataDownload Debug Info');
  console.log('Current Filters:', filters);
  
  // Check for potential issues
  const issues = [];
  
  // Check if a template is selected
  if (!filters.templateId) {
    issues.push('No query template selected');
  }
  
  // Check if any groups have empty conditions
  if (filters.groups.some(g => g.conditions.length === 0)) {
    issues.push('Some groups have no conditions');
  }
  
  // Check if any conditions have empty fields
  if (filters.groups.some(g => g.conditions.some(c => !c.field))) {
    issues.push('Some conditions have empty fields');
  }
  
  // Check if any variables are selected
  const hasVariables = 
    filters.variables.clinical.labs.length > 0 ||
    filters.variables.clinical.medications.length > 0 ||
    filters.variables.clinical.vitals.length > 0 ||
    filters.variables.omics.advia.length > 0 ||
    filters.variables.omics.lorrca.length > 0 ||
    filters.variables.omics.viscosity.length > 0 ||
    filters.variables.omics.research_hplc.length > 0 ||
    filters.variables.demographics.length > 0;
    
  if (!hasVariables) {
    issues.push('No variables selected');
  }
  
  // Check time window
  if (filters.timeWindow.type === 'absolute') {
    if (!filters.timeWindow.start || !filters.timeWindow.end) {
      issues.push('Incomplete date range');
    } else if (new Date(filters.timeWindow.start) > new Date(filters.timeWindow.end)) {
      issues.push('Start date is after end date');
    }
  } else if (!filters.timeWindow.relativeDays) {
    issues.push('No relative days specified');
  }
  
  // Check inclusion criteria
  if (filters.inclusionCriteria && Object.keys(filters.inclusionCriteria).length > 0) {
    console.log('Inclusion criteria specified:', filters.inclusionCriteria);
    
    // Check if any inclusion criteria variables don't exist in the selected variables
    const allSelectedVars = [
      ...filters.variables.demographics,
      ...filters.variables.clinical.labs.map(lab => lab.name),
      ...filters.variables.clinical.medications.map(med => med.name),
      ...filters.variables.clinical.vitals,
      ...Object.values(filters.variables.omics).flat()
    ];
    
    for (const varName of Object.keys(filters.inclusionCriteria)) {
      if (!allSelectedVars.includes(varName)) {
        issues.push(`Inclusion criterion specified for "${varName}" but this variable is not selected`);
      }
    }
  } else {
    console.log('No inclusion criteria specified');
  }
  
  console.log('Potential Issues:', issues.length ? issues : 'None detected');
  console.groupEnd();
  
  return issues;
};

// Add a utility to monitor API calls
export const monitorApiCalls = () => {
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    console.group('API Call');
    console.log('URL:', args[0]);
    console.log('Options:', args[1]);
    console.groupEnd();
    
    try {
      const response = await originalFetch.apply(this, args);
      return response;
    } catch (error) {
      console.error('API Call Failed:', error);
      throw error;
    }
  };
  
  return () => {
    window.fetch = originalFetch;
  };
}; 