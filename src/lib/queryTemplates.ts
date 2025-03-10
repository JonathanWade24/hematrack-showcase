// Query templates for data download functionality

export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  defaultGroups?: {
    id: string;
    name: string;
    conditions: {
      field: string;
      operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'in';
      value: string | string[] | number | number[];
    }[];
  }[];
}

// Predefined query templates that users can select from
export const queryTemplates: QueryTemplate[] = [
  {
    id: 'all_patients',
    name: 'All Patients',
    description: 'Retrieve data for all patients without any filtering',
  },
  {
    id: 'ss_patients',
    name: 'SS Patients Only',
    description: 'Retrieve data for patients with SS genotype',
    defaultGroups: [
      {
        id: 'genotype_group',
        name: 'Genotype Filter',
        conditions: [
          {
            field: 'omics_results.genotype',
            operator: 'equals',
            value: 'SS'
          }
        ]
      }
    ]
  },
  {
    id: 'hydroxyurea',
    name: 'Patients on Hydroxyurea',
    description: 'Retrieve data for patients currently on Hydroxyurea',
    defaultGroups: [
      {
        id: 'medication_group',
        name: 'Medication Filter',
        conditions: [
          {
            field: 'medications.hydroxyurea',
            operator: 'equals',
            value: 'true'
          }
        ]
      }
    ]
  },
  {
    id: 'recent_labs',
    name: 'Recent Lab Results',
    description: 'Retrieve data for patients with lab results in the last 90 days',
    defaultGroups: [
      {
        id: 'time_group',
        name: 'Time Filter',
        conditions: [
          {
            field: 'labs.collection_date',
            operator: 'greater_than',
            value: 'DYNAMIC_DATE_90_DAYS'
          }
        ]
      }
    ]
  }
];

// Helper function to get a template by ID
export function getTemplateById(id: string): QueryTemplate | undefined {
  return queryTemplates.find(template => template.id === id);
} 