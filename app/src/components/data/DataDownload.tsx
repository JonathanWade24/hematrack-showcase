'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faDownload, faPlus, faTrash, 
  faSearch, faChevronDown, faChevronRight, faExclamationCircle, faSpinner
} from '@fortawesome/free-solid-svg-icons'
import { debugDataDownload } from '@/utils/debugUtils'
// Import the type directly without the module
import type { QueryTemplate } from '@/lib/queryTemplates'

// Export the type
export type { QueryTemplate }

export interface GroupCriteria {
  id: string
  name: string
  conditions: {
    field: string
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'in'
    value: string | string[] | number | number[]
  }[]
}

export interface VariableDefinition {
  name: string
  source: string
  type: 'numeric' | 'categorical' | 'date'
  description: string
  category: 'labs' | 'medications' | 'vitals' | 'advia' | 'lorrca' | 'viscosity' | 'research_hplc' | 'demographics'
  column_name?: string  // The actual column name in the database
}

export interface FilterCriteria {
  templateId: string
  groups: GroupCriteria[]
  variables: {
    clinical: {
      labs: Array<{
        name: string
        component_id: string
      }>
      medications: Array<{
        name: string
        generic_description: string[]
      }>
      vitals: string[]
    }
    omics: {
      advia: string[]
      lorrca: string[]
      viscosity: string[]
      research_hplc: string[]
    }
    demographics: string[]
  }
  timeWindow: {
    type: 'relative' | 'absolute'
    start?: Date
    end?: Date
    relativeDays?: number
  }
  requireOmiSample: boolean
  inclusionCriteria: Record<string, { excludeNA: boolean }>
}

// Available variables for selection
const AVAILABLE_VARIABLES: Record<string, VariableDefinition[]> = {
  clinical: [
    // Lab Results - These map to lab_component_description in clinical.Labs
    { name: 'lab_hba1c', source: 'Labs', type: 'numeric', description: 'HbA1c', category: 'labs', column_name: 'lab_result_value' },
    { name: 'lab_hbf', source: 'Labs', type: 'numeric', description: 'HbF', category: 'labs', column_name: 'lab_result_value' },
    { name: 'lab_wbc', source: 'Labs', type: 'numeric', description: 'WBC', category: 'labs', column_name: 'lab_result_value' },
    { name: 'lab_hgb', source: 'Labs', type: 'numeric', description: 'Hemoglobin', category: 'labs', column_name: 'lab_result_value' },
    { name: 'lab_plt', source: 'Labs', type: 'numeric', description: 'Platelets', category: 'labs', column_name: 'lab_result_value' },
    { name: 'lab_mcv', source: 'Labs', type: 'numeric', description: 'MCV', category: 'labs', column_name: 'lab_result_value' },
    { name: 'lab_mch', source: 'Labs', type: 'numeric', description: 'MCH', category: 'labs', column_name: 'lab_result_value' },
    { name: 'lab_mchc', source: 'Labs', type: 'numeric', description: 'MCHC', category: 'labs', column_name: 'lab_result_value' },
    { name: 'lab_rdw', source: 'Labs', type: 'numeric', description: 'RDW', category: 'labs', column_name: 'lab_result_value' },
    { name: 'lab_creatinine', source: 'Labs', type: 'numeric', description: 'Creatinine', category: 'labs', column_name: 'lab_result_value' },
    { name: 'lab_total_bilirubin', source: 'Labs', type: 'numeric', description: 'Total Bilirubin', category: 'labs', column_name: 'lab_result_value' },
    { name: 'lab_alt', source: 'Labs', type: 'numeric', description: 'ALT', category: 'labs', column_name: 'lab_result_value' },
    { name: 'lab_ast', source: 'Labs', type: 'numeric', description: 'AST', category: 'labs', column_name: 'lab_result_value' },
    { name: 'lab_ldh', source: 'Labs', type: 'numeric', description: 'LDH', category: 'labs', column_name: 'lab_result_value' },
    
    // Medications - These map to generic_description in op_medications
    { name: 'med_hydroxyurea', source: 'op_medications', type: 'categorical', description: 'Hydroxyurea/Hydrea', category: 'medications', column_name: 'generic_description' },
    { name: 'med_voxelotor', source: 'op_medications', type: 'categorical', description: 'Voxelotor/Oxbryta', category: 'medications', column_name: 'generic_description' },
    { name: 'med_glutamine', source: 'op_medications', type: 'categorical', description: 'L-Glutamine/Endari', category: 'medications', column_name: 'generic_description' },
    { name: 'med_crizanlizumab', source: 'op_medications', type: 'categorical', description: 'Crizanlizumab/Adakveo', category: 'medications', column_name: 'generic_description' },
    
    // Vitals from unified_visits - These map directly to column names
    { name: 'bp_systolic', source: 'unified_visits', type: 'numeric', description: 'Systolic Blood Pressure', category: 'vitals', column_name: 'bp_systolic' },
    { name: 'bp_diastolic', source: 'unified_visits', type: 'numeric', description: 'Diastolic Blood Pressure', category: 'vitals', column_name: 'bp_diastolic' },
    { name: 'weight_kg', source: 'unified_visits', type: 'numeric', description: 'Weight (kg)', category: 'vitals', column_name: 'weight_kg' },
    { name: 'heart_rate', source: 'unified_visits', type: 'numeric', description: 'Heart Rate', category: 'vitals', column_name: 'heart_rate' },
    { name: 'respiratory_rate', source: 'unified_visits', type: 'numeric', description: 'Respiratory Rate', category: 'vitals', column_name: 'respiratory_rate' },
    { name: 'temperature_f', source: 'unified_visits', type: 'numeric', description: 'Temperature (°F)', category: 'vitals', column_name: 'temperature_f' },
    { name: 'spo2', source: 'unified_visits', type: 'numeric', description: 'SpO2', category: 'vitals', column_name: 'spo2' }
  ],
  omics: [
    // ADVIA Measurements - These map directly to column names
    { name: 'rbc_advia', source: 'omics_results', type: 'numeric', description: 'RBC Count', category: 'advia', column_name: 'rbc_advia' },
    { name: 'hb_advia', source: 'omics_results', type: 'numeric', description: 'Hemoglobin', category: 'advia', column_name: 'hb_advia' },
    { name: 'hct_advia', source: 'omics_results', type: 'numeric', description: 'Hematocrit', category: 'advia', column_name: 'hct_advia' },
    { name: 'mcv_advia', source: 'omics_results', type: 'numeric', description: 'Mean Corpuscular Volume', category: 'advia', column_name: 'mcv_advia' },
    { name: 'mch_advia', source: 'omics_results', type: 'numeric', description: 'Mean Corpuscular Hemoglobin', category: 'advia', column_name: 'mch_advia' },
    { name: 'mchc_advia', source: 'omics_results', type: 'numeric', description: 'Mean Corpuscular Hemoglobin Concentration', category: 'advia', column_name: 'mchc_advia' },
    { name: 'rdw_advia', source: 'omics_results', type: 'numeric', description: 'Red Cell Distribution Width', category: 'advia', column_name: 'rdw_advia' },
    { name: 'hdw_advia', source: 'omics_results', type: 'numeric', description: 'Hemoglobin Distribution Width', category: 'advia', column_name: 'hdw_advia' },
    { name: 'plt_advia', source: 'omics_results', type: 'numeric', description: 'Platelets', category: 'advia', column_name: 'plt_advia' },
    { name: 'mpv_advia', source: 'omics_results', type: 'numeric', description: 'Mean Platelet Volume', category: 'advia', column_name: 'mpv_advia' },
    { name: 'wbc_advia', source: 'omics_results', type: 'numeric', description: 'White Blood Cells', category: 'advia', column_name: 'wbc_advia' },
    { name: 'neut_advia', source: 'omics_results', type: 'numeric', description: 'Neutrophils', category: 'advia', column_name: 'neut_advia' },
    { name: 'retic_advia', source: 'omics_results', type: 'numeric', description: 'Reticulocytes', category: 'advia', column_name: 'retic_advia' },
    
    // Lorrca Measurements - These map directly to column names
    { name: 'ei_min_lorrca', source: 'omics_results', type: 'numeric', description: 'Minimum Elongation Index', category: 'lorrca', column_name: 'ei_min_lorrca' },
    { name: 'ei_max_lorrca', source: 'omics_results', type: 'numeric', description: 'Maximum Elongation Index', category: 'lorrca', column_name: 'ei_max_lorrca' },
    { name: 'ei_delta_lorrca', source: 'omics_results', type: 'numeric', description: 'Delta Elongation Index', category: 'lorrca', column_name: 'ei_delta_lorrca' },
    { name: 'pos_lorrca', source: 'omics_results', type: 'numeric', description: 'Point of Sickling', category: 'lorrca', column_name: 'pos_lorrca' },
    
    // Viscosity Measurements - These map directly to column names
    { name: 'visc_45', source: 'omics_results', type: 'numeric', description: 'Viscosity at 45s⁻¹', category: 'viscosity', column_name: 'visc_45' },
    { name: 'visc_225', source: 'omics_results', type: 'numeric', description: 'Viscosity at 225s⁻¹', category: 'viscosity', column_name: 'visc_225' },

    // Research HPLC - These map directly to column names
    { name: 'hbf_percent_grady_hplc', source: 'omics_results', type: 'numeric', description: 'HbF% (Grady HPLC)', category: 'research_hplc', column_name: 'hbf_percent_grady_hplc' },
    { name: 'hba_percent_grady_hplc', source: 'omics_results', type: 'numeric', description: 'HbA% (Grady HPLC)', category: 'research_hplc', column_name: 'hba_percent_grady_hplc' },
    { name: 'hbs_percent_grady_hplc', source: 'omics_results', type: 'numeric', description: 'HbS% (Grady HPLC)', category: 'research_hplc', column_name: 'hbs_percent_grady_hplc' },
    { name: 'hba2_percent_grady_hplc', source: 'omics_results', type: 'numeric', description: 'HbA2% (Grady HPLC)', category: 'research_hplc', column_name: 'hba2_percent_grady_hplc' },
    { name: 'hbf_percent_d10_hplc', source: 'omics_results', type: 'numeric', description: 'HbF% (D10 HPLC)', category: 'research_hplc', column_name: 'hbf_percent_d10_hplc' },
    { name: 'hba_percent_d10_hplc', source: 'omics_results', type: 'numeric', description: 'HbA% (D10 HPLC)', category: 'research_hplc', column_name: 'hba_percent_d10_hplc' },
    { name: 'hbs_percent_d10_hplc', source: 'omics_results', type: 'numeric', description: 'HbS% (D10 HPLC)', category: 'research_hplc', column_name: 'hbs_percent_d10_hplc' },
    { name: 'hba2_percent_d10_hplc', source: 'omics_results', type: 'numeric', description: 'HbA2% (D10 HPLC)', category: 'research_hplc', column_name: 'hba2_percent_d10_hplc' }
  ],
  demographics: [
    // Demographics - These map directly to column names
    { name: 'age_at_collection', source: 'omics_results', type: 'numeric', description: 'Age at collection', category: 'demographics', column_name: 'age_at_collection' },
    { name: 'genotype', source: 'omics_results', type: 'categorical', description: 'Genotype', category: 'demographics', column_name: 'genotype' },
    { name: 'sex', source: 'omics_results', type: 'categorical', description: 'Sex', category: 'demographics', column_name: 'sex' },
    { name: 'steady_state', source: 'omics_results', type: 'categorical', description: 'Steady State', category: 'demographics', column_name: 'steady_state' },
    { name: 'transfusion_status', source: 'omics_results', type: 'categorical', description: 'Transfusion Status', category: 'demographics', column_name: 'transfusion_status' }
  ]
}

interface FieldDefinition {
  name: string
  label: string
  type: 'numeric' | 'categorical' | 'boolean'
  options?: string[]
}

interface CategoryDefinition {
  label: string
  fields: FieldDefinition[]
}

// Field definitions for condition building
const FIELD_DEFINITIONS: Record<string, CategoryDefinition> = {
  demographics: {
    label: 'Demographics',
    fields: [
      { name: 'patients.age', label: 'Age', type: 'numeric' },
      { name: 'omics_results.genotype', label: 'Genotype', type: 'categorical', options: ['SS', 'SC', 'SB+', 'SB0'] },
      { name: 'patients.sex', label: 'Sex', type: 'categorical', options: ['M', 'F'] },
      { name: 'patients.race', label: 'Race', type: 'categorical' },
      { name: 'patients.ethnicity', label: 'Ethnicity', type: 'categorical' }
    ]
  },
  labs: {
    label: 'Laboratory Results',
    fields: [
      { name: 'labs.hb', label: 'Hemoglobin', type: 'numeric' },
      { name: 'labs.wbc', label: 'White Blood Cells', type: 'numeric' },
      { name: 'labs.plt', label: 'Platelets', type: 'numeric' },
      { name: 'labs.hbf', label: 'HbF %', type: 'numeric' }
    ]
  },
  medications: {
    label: 'Medications',
    fields: [
      { name: 'medications.hydroxyurea', label: 'Hydroxyurea', type: 'boolean' },
      { name: 'medications.voxelotor', label: 'Voxelotor', type: 'boolean' },
      { name: 'medications.glutamine', label: 'Glutamine', type: 'boolean' }
    ]
  }
} as const

interface ConditionEditorProps {
  condition: GroupCriteria['conditions'][0]
  onChange: (updated: GroupCriteria['conditions'][0]) => void
  onRemove: () => void
}

function ConditionEditor({ condition, onChange, onRemove }: ConditionEditorProps) {
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof FIELD_DEFINITIONS | ''>('')
  
  // Find the field definition
  const field = selectedCategory 
    ? FIELD_DEFINITIONS[selectedCategory].fields.find(f => f.name === condition.field)
    : Object.values(FIELD_DEFINITIONS)
        .flatMap(category => category.fields)
        .find(f => f.name === condition.field)

  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
      <select
        value={selectedCategory}
        onChange={e => setSelectedCategory(e.target.value as keyof typeof FIELD_DEFINITIONS)}
        className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
      >
        <option value="">Select Category</option>
        {Object.entries(FIELD_DEFINITIONS).map(([key, { label }]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      {selectedCategory && (
        <select
          value={condition.field}
          onChange={e => onChange({ ...condition, field: e.target.value })}
          className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="">Select Field</option>
          {FIELD_DEFINITIONS[selectedCategory].fields.map(field => (
            <option key={field.name} value={field.name}>{field.label}</option>
          ))}
        </select>
      )}

      {field && (
        <>
          <select
            value={condition.operator}
            onChange={e => onChange({ 
              ...condition, 
              operator: e.target.value as GroupCriteria['conditions'][0]['operator']
            })}
            className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {field.type === 'numeric' ? (
              <>
                <option value="equals">=</option>
                <option value="not_equals">≠</option>
                <option value="greater_than">&gt;</option>
                <option value="less_than">&lt;</option>
                <option value="between">Between</option>
              </>
            ) : field.type === 'categorical' ? (
              <>
                <option value="equals">Is</option>
                <option value="not_equals">Is not</option>
                <option value="in">In list</option>
              </>
            ) : (
              <>
                <option value="equals">Is</option>
                <option value="not_equals">Is not</option>
              </>
            )}
          </select>

          {field.type === 'numeric' ? (
            condition.operator === 'between' ? (
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={(condition.value as number[])[0] || ''}
                  onChange={e => onChange({
                    ...condition,
                    value: [parseFloat(e.target.value), (condition.value as number[])[1]]
                  })}
                  className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span>and</span>
                <input
                  type="number"
                  value={(condition.value as number[])[1] || ''}
                  onChange={e => onChange({
                    ...condition,
                    value: [(condition.value as number[])[0], parseFloat(e.target.value)]
                  })}
                  className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            ) : (
              <input
                type="number"
                value={condition.value as number || ''}
                onChange={e => onChange({ ...condition, value: parseFloat(e.target.value) })}
                className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            )
          ) : field.type === 'categorical' && field.options ? (
            condition.operator === 'in' ? (
              <select
                multiple
                value={condition.value as string[]}
                onChange={e => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  onChange({ ...condition, value: selected })
                }}
                className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {field.options.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : (
              <select
                value={condition.value as string}
                onChange={e => onChange({ ...condition, value: e.target.value })}
                className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Select Value</option>
                {field.options.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            )
          ) : (
            <input
              type="text"
              value={condition.value as string}
              onChange={e => onChange({ ...condition, value: e.target.value })}
              className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          )}
        </>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="text-red-600 hover:text-red-800"
      >
        <FontAwesomeIcon icon={faTrash} />
      </button>
    </div>
  )
}

// Add these at the top level of the file, outside any component
const LAB_COMPONENTS_CACHE_KEY = 'labComponentsCache'
const MEDICATIONS_CACHE_KEY = 'medicationsCache'
const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

interface CacheData<T> {
  data: T
  timestamp: number
}

function getCachedData<T>(key: string): T | null {
  const cached = localStorage.getItem(key)
  if (!cached) return null

  const { data, timestamp }: CacheData<T> = JSON.parse(cached)
  if (Date.now() - timestamp > CACHE_EXPIRY) {
    localStorage.removeItem(key)
    return null
  }

  return data
}

function setCachedData<T>(key: string, data: T) {
  const cacheData: CacheData<T> = {
    data,
    timestamp: Date.now()
  }
  localStorage.setItem(key, JSON.stringify(cacheData))
}

interface LabComponentSelectorProps {
  onSelect: (descriptions: string[]) => void
  selectedItems?: string[]
}

function LabComponentSelector({ onSelect, selectedItems = [] }: LabComponentSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [descriptions, setDescriptions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string[]>(Array.from(new Set(selectedItems)))

  // Fetch lab component descriptions when the component mounts
  useEffect(() => {
    const fetchDescriptions = async () => {
      // Try to get cached data first
      const cachedDescriptions = getCachedData<string[]>(LAB_COMPONENTS_CACHE_KEY)
      if (cachedDescriptions) {
        setDescriptions(Array.from(new Set(cachedDescriptions)))
        return
      }

      setLoading(true)
      try {
        const response = await fetch('/api/lab-components')
        const data = await response.json()
        setDescriptions(Array.from(new Set(data)))
        // Cache the data
        setCachedData(LAB_COMPONENTS_CACHE_KEY, Array.from(new Set(data)))
      } catch (error) {
        console.error('Error fetching lab components:', error)
      }
      setLoading(false)
    }
    fetchDescriptions()
  }, [])

  const filteredDescriptions = useMemo(() => 
    Array.from(new Set(descriptions.filter(desc => 
      desc.toLowerCase().includes(searchTerm.toLowerCase())
    ))), [descriptions, searchTerm])

  const handleSelect = (description: string) => {
    const newSelected = selected.includes(description)
      ? selected.filter(d => d !== description)
      : Array.from(new Set([...selected, description]))
    setSelected(newSelected)
  }

  const handleDone = (e: React.MouseEvent) => {
    e.preventDefault() // Prevent form submission
    onSelect(Array.from(new Set(selected)))
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="text"
          placeholder="Search lab components..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        <FontAwesomeIcon 
          icon={faSearch} 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
      </div>

      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {filteredDescriptions.map(desc => (
              <button
                key={desc}
                onClick={() => handleSelect(desc)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  selected.includes(desc) 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selected.includes(desc)}
                    onChange={() => handleSelect(desc)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
                  />
                  {desc}
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleDone}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Add Selected ({selected.length})
            </button>
          </div>
        </>
      )}
    </div>
  )
}

interface MedicationSelectorProps {
  onSelect: (descriptions: string[]) => void
  selectedItems?: string[]
}

function MedicationSelector({ onSelect, selectedItems = [] }: MedicationSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [descriptions, setDescriptions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string[]>(selectedItems)

  useEffect(() => {
    const fetchDescriptions = async () => {
      // Try to get cached data first
      const cachedDescriptions = getCachedData<string[]>(MEDICATIONS_CACHE_KEY)
      if (cachedDescriptions) {
        setDescriptions(cachedDescriptions)
        return
      }

      setLoading(true)
      try {
        const response = await fetch('/api/medications')
        const data = await response.json()
        setDescriptions(data)
        // Cache the data
        setCachedData(MEDICATIONS_CACHE_KEY, data)
      } catch (error) {
        console.error('Error fetching medications:', error)
      }
      setLoading(false)
    }
    fetchDescriptions()
  }, [])

  const filteredDescriptions = descriptions.filter(desc => 
    desc.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (description: string) => {
    const newSelected = selected.includes(description)
      ? selected.filter(d => d !== description)
      : [...selected, description]
    setSelected(newSelected)
  }

  const handleDone = (e: React.MouseEvent) => {
    e.preventDefault() // Prevent form submission
    onSelect(selected)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="text"
          placeholder="Search medications..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        <FontAwesomeIcon 
          icon={faSearch} 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
      </div>

      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {filteredDescriptions.map(desc => (
              <button
                key={desc}
                onClick={() => handleSelect(desc)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  selected.includes(desc) 
                    ? 'bg-green-100 text-green-700' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selected.includes(desc)}
                    onChange={() => handleSelect(desc)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mr-2"
                  />
                  {desc}
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleDone}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-white bg-green-600 hover:bg-green-700"
            >
              Add Selected ({selected.length})
            </button>
          </div>
        </>
      )}
    </div>
  )
}

interface VariableSelectorProps {
  category: string
  variables: VariableDefinition[]
  selected: string[]
  onChange: (selected: string[], customData?: { component_id?: string, generic_description?: string[] }) => void
}

function VariableSelector({ category, variables, selected = [], onChange }: VariableSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showLabSelector, setShowLabSelector] = useState(false)
  const [showMedSelector, setShowMedSelector] = useState(false)

  const filteredVariables = variables.filter(v => 
    v.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get selected labs and medications from the parent component's state
  const selectedLabs = selected.filter(v => v.startsWith('lab_'))
  const selectedMeds = selected.filter(v => v.startsWith('med_'))

  return (
    <div className="border rounded-md p-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h4 className="font-medium text-gray-700">{category}</h4>
        <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} />
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search variables..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <FontAwesomeIcon 
              icon={faSearch} 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
          </div>

          {category === 'clinical' && (
            <div className="space-y-4">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowLabSelector(!showLabSelector)}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add Lab Component
                </button>

                <button
                  type="button"
                  onClick={() => setShowMedSelector(!showMedSelector)}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add Medication
                </button>
              </div>

              {/* Display selected lab components */}
              {selectedLabs.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-700">Selected Lab Components</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedLabs.map((lab, index) => (
                      <div
                        key={`${lab}-${index}`}
                        className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-indigo-100 text-indigo-700"
                      >
                        <span>{lab.replace('lab_', '').replace(/_/g, ' ')}</span>
                        <button
                          type="button"
                          onClick={() => onChange(selected.filter(v => v !== lab))}
                          className="ml-2 text-indigo-600 hover:text-indigo-800"
                        >
                          <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Display selected medications */}
              {selectedMeds.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-700">Selected Medications</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedMeds.map(med => (
                      <div
                        key={med}
                        className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-green-100 text-green-700"
                      >
                        <span>{med.replace('med_', '').replace(/_/g, ' ')}</span>
                        <button
                          type="button"
                          onClick={() => onChange(selected.filter(v => v !== med))}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showLabSelector && (
                <div className="mt-2 p-4 border rounded-md bg-gray-50">
                  <h5 className="font-medium text-gray-700 mb-2">Select Lab Components</h5>
                  <LabComponentSelector
                    selectedItems={selectedLabs.map(lab => lab.replace('lab_', '').replace(/_/g, ' '))}
                    onSelect={descriptions => {
                      const newVars = descriptions.map(description => ({
                        name: `lab_${description.toLowerCase().replace(/\W+/g, '_')}`,
                        component_id: description
                      }))
                      onChange([
                        ...selected.filter(v => !v.startsWith('lab_')),
                        ...newVars.map(v => v.name)
                      ], { component_id: descriptions[0] })
                      setShowLabSelector(false)
                    }}
                  />
                </div>
              )}

              {showMedSelector && (
                <div className="mt-2 p-4 border rounded-md bg-gray-50">
                  <h5 className="font-medium text-gray-700 mb-2">Select Medications</h5>
                  <MedicationSelector
                    selectedItems={selectedMeds.map(med => med.replace('med_', '').replace(/_/g, ' '))}
                    onSelect={descriptions => {
                      const newVars = descriptions.map(description => ({
                        name: `med_${description.toLowerCase().replace(/\W+/g, '_')}`,
                        generic_description: [description]
                      }))
                      onChange([
                        ...selected.filter(v => !v.startsWith('med_')),
                        ...newVars.map(v => v.name)
                      ], { generic_description: descriptions })
                      setShowMedSelector(false)
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Display other variables (vitals, etc.) */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredVariables.map(variable => (
              <label key={variable.name} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selected.includes(variable.name)}
                  onChange={e => {
                    const newSelected = e.target.checked
                      ? [...selected, variable.name]
                      : selected.filter(v => v !== variable.name)
                    onChange(newSelected)
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {variable.description}
                  <span className="text-xs text-gray-500 ml-1">({variable.source})</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Add new interface for preview data at the top of the file, after the existing interfaces
interface PreviewData {
  headers: string[]
  rows: (string | number)[][]
}

export interface DataDownloadProps {
  onSubmit: (filters: FilterCriteria) => Promise<{ success: boolean, error?: string, progress?: number }>
  onPreview: (filters: FilterCriteria) => Promise<PreviewData>
}

export function DataDownload({ onSubmit, onPreview }: DataDownloadProps) {
  const [filters, setFilters] = useState<FilterCriteria>({
    templateId: '',
    groups: [],
    variables: {
      clinical: {
        labs: [],
        medications: [],
        vitals: []
      },
      omics: {
        advia: [],
        lorrca: [],
        viscosity: [],
        research_hplc: []
      },
      demographics: []
    },
    timeWindow: {
      type: 'relative',
      relativeDays: 30
    },
    requireOmiSample: false,
    inclusionCriteria: {}
  })

  // Add new state for preview data
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  // Helper function to get current date in YYYY-MM-DD format
  function getCurrentDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  // Helper function to handle time window changes - moved inside component scope
  function handleTimeWindowChange(field: 'start' | 'end', value: string) {
    // Convert the date string to ISO string for consistent storage
    setFilters(prev => ({
      ...prev,
      timeWindow: {
        ...prev.timeWindow,
        [field]: value // Store as string instead of Date object
      }
    }));
  }
  
  // Add function to fetch preview data with useCallback
  const fetchPreview = useCallback(async () => {
    setIsLoadingPreview(true)
    setPreviewError(null)
    try {
      const data = await onPreview(filters)
      setPreviewData(data)
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to load preview')
    } finally {
      setIsLoadingPreview(false)
    }
  }, [filters, onPreview])

  // Add useEffect to update preview when filters change
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (
        filters.groups.length > 0 || 
        filters.variables.clinical.labs.length > 0 ||
        filters.variables.clinical.medications.length > 0 ||
        filters.variables.clinical.vitals.length > 0 ||
        filters.variables.omics.advia.length > 0 ||
        filters.variables.omics.lorrca.length > 0 ||
        filters.variables.omics.viscosity.length > 0 ||
        filters.variables.omics.research_hplc.length > 0 ||
        filters.variables.demographics.length > 0
      ) {
        fetchPreview()
      } else {
        setPreviewData(null)
      }
    }, 500)

    return () => clearTimeout(debounceTimeout)
  }, [filters, fetchPreview])

  const addGroup = () => {
    const newGroup: GroupCriteria = {
      id: `group-${Date.now()}`,
      name: `Group ${filters.groups.length + 1}`,
      conditions: []
    }
    setFilters(prev => ({
      ...prev,
      groups: [...prev.groups, newGroup]
    }))
  }

  const removeGroup = (groupId: string) => {
    setFilters(prev => ({
      ...prev,
      groups: prev.groups.filter(g => g.id !== groupId)
    }))
  }

  const updateGroup = (groupId: string, updates: Partial<GroupCriteria>) => {
    setFilters(prev => ({
      ...prev,
      groups: prev.groups.map(g => 
        g.id === groupId ? { ...g, ...updates } : g
      )
    }))
  }

  const addCondition = (groupId: string) => {
    const newCondition = {
      field: '',
      operator: 'equals' as const,
      value: ''
    }
    updateGroup(groupId, {
      conditions: [...filters.groups.find(g => g.id === groupId)!.conditions, newCondition]
    })
  }

  const updateCondition = (groupId: string, index: number, updated: GroupCriteria['conditions'][0]) => {
    const group = filters.groups.find(g => g.id === groupId)!
    const newConditions = [...group.conditions]
    newConditions[index] = updated
    updateGroup(groupId, { conditions: newConditions })
  }

  const removeCondition = (groupId: string, index: number) => {
    const group = filters.groups.find(g => g.id === groupId)!
    const newConditions = group.conditions.filter((_, i) => i !== index)
    updateGroup(groupId, { conditions: newConditions })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Debug the current filters
    debugDataDownload(filters);
    
    if (isDownloading) return;
    
    // Validate filters
    if (!filters.templateId) {
      setDownloadError('Please select a query template');
      return;
    }
    
    if (filters.variables.clinical.labs.length === 0 && 
        filters.variables.clinical.medications.length === 0 && 
        filters.variables.omics.advia.length === 0 && 
        filters.variables.omics.lorrca.length === 0 && 
        filters.variables.omics.viscosity.length === 0 && 
        filters.variables.omics.research_hplc.length === 0 && 
        filters.variables.demographics.length === 0) {
      setDownloadError('Please select at least one variable to include');
      return;
    }
    
    setIsDownloading(true);
    setDownloadError('');
    setDownloadProgress(0);
    
    try {
      // Use the new query API endpoint
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: filters.templateId,
          filters: filters
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute query');
      }
      
      const data = await response.json();
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          const newProgress = prev + 10;
          if (newProgress >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return newProgress;
        });
      }, 200);
      
      // Generate CSV
      if (data.headers && data.rows) {
        const csvContent = generateCsv(data);
        
        // Create a download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `query-results-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Call onSubmit callback if provided
        if (onSubmit) {
          await onSubmit(filters);
        }
      } else {
        throw new Error('Invalid response format');
      }
      
      setIsDownloading(false);
      setDownloadProgress(100);
      
      // Reset progress after a delay
      setTimeout(() => {
        setDownloadProgress(0);
      }, 2000);
      
    } catch (error) {
      setIsDownloading(false);
      setDownloadProgress(0);
      setDownloadError(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error submitting query:', error);
    }
  };

  // Fix the CSV generation function
  const generateCsv = (data: { headers: string[], rows: (string | number)[][] }) => {
    const csvContent = [
      data.headers.join(','),
      ...data.rows.map((row: (string | number)[]) => row.map(cell => 
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(','))
    ].join('\n');
    
    return csvContent;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Groups Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Patient Groups</h3>
            <button
              type="button"
              onClick={addGroup}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Add Group
            </button>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="requireOmiSample"
              checked={filters.requireOmiSample}
              onChange={e => setFilters(prev => ({
                ...prev,
                requireOmiSample: e.target.checked
              }))}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="requireOmiSample" className="ml-2 text-sm text-gray-700">
              Only include patients with OMI samples
            </label>
          </div>
        </div>
        
        <div className="space-y-4 mt-4">
          {filters.groups.map(group => (
            <div key={group.id} className="border rounded-md p-4">
              <div className="flex justify-between items-center mb-4">
                <input
                  type="text"
                  value={group.name}
                  onChange={e => updateGroup(group.id, { name: e.target.value })}
                  className="text-lg font-medium border-none focus:ring-0"
                  placeholder="Group Name"
                />
                <button
                  type="button"
                  onClick={() => removeGroup(group.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
              
              <div className="space-y-2">
                {group.conditions.map((condition, index) => (
                  <ConditionEditor
                    key={index}
                    condition={condition}
                    onChange={updated => updateCondition(group.id, index, updated)}
                    onRemove={() => removeCondition(group.id, index)}
                  />
                ))}
                
                <button
                  type="button"
                  onClick={() => addCondition(group.id)}
                  className="mt-2 inline-flex items-center px-2 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add Condition
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Variables Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Variables of Interest</h3>
        <div className="space-y-4">
          {Object.entries(AVAILABLE_VARIABLES).map(([category, variables]) => (
            <VariableSelector
              key={category}
              category={category}
              variables={variables}
              selected={
                category === 'demographics' 
                  ? filters.variables.demographics
                  : category === 'clinical'
                    ? [
                        ...filters.variables.clinical.labs.map(l => l.name),
                        ...filters.variables.clinical.medications.map(m => m.name),
                        ...filters.variables.clinical.vitals
                      ]
                    : filters.variables.omics[category as keyof typeof filters.variables.omics]
              }
              onChange={(selected, customData) => {
                if (category === 'demographics') {
                  setFilters(prev => ({
                    ...prev,
                    variables: {
                      ...prev.variables,
                      demographics: selected
                    }
                  }))
                } else if (category === 'clinical') {
                  // Handle labs, medications, and vitals
                  const labs = selected
                    .filter(v => v.startsWith('lab_'))
                    .map(v => {
                      if (v === 'lab_custom' && customData?.component_id) {
                        return {
                          name: v,
                          component_id: customData.component_id
                        }
                      }
                      return { name: v, component_id: v.replace('lab_', '') }
                    })
                  
                  const medications = selected
                    .filter(v => v.startsWith('med_'))
                    .map(v => {
                      if (v === 'med_custom' && customData?.generic_description) {
                        return {
                          name: v,
                          generic_description: customData.generic_description
                        }
                      }
                      return { 
                        name: v, 
                        generic_description: [v.replace('med_', '')]
                      }
                    })
                  
                  const vitals = selected.filter(v => !v.startsWith('lab_') && !v.startsWith('med_'))
                  
                  setFilters(prev => ({
                    ...prev,
                    variables: {
                      ...prev.variables,
                      clinical: {
                        labs,
                        medications,
                        vitals
                      }
                    }
                  }))
                } else {
                  setFilters(prev => ({
                    ...prev,
                    variables: {
                      ...prev.variables,
                      omics: {
                        ...prev.variables.omics,
                        [category]: selected
                      }
                    }
                  }))
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* Time Window Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Time Window</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                checked={filters.timeWindow.type === 'relative'}
                onChange={() => setFilters(prev => ({
                  ...prev,
                  timeWindow: { type: 'relative', relativeDays: 30 }
                }))}
                className="form-radio"
              />
              <span className="ml-2">Relative to collection date</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                checked={filters.timeWindow.type === 'absolute'}
                onChange={() => setFilters(prev => ({
                  ...prev,
                  timeWindow: { type: 'absolute', start: new Date(), end: new Date() }
                }))}
                className="form-radio"
              />
              <span className="ml-2">Absolute date range</span>
            </label>
          </div>

          {filters.timeWindow.type === 'relative' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700">Days window</label>
              <input
                type="number"
                value={filters.timeWindow.relativeDays}
                onChange={e => setFilters(prev => ({
                  ...prev,
                  timeWindow: {
                    ...prev.timeWindow,
                    relativeDays: parseInt(e.target.value)
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label 
                  htmlFor="startDate" 
                  className="block text-sm font-medium text-gray-700"
                >
                    Start Date
                  </label>
                <input
                  id="startDate"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  type="date"
                  value={typeof filters.timeWindow.start === 'string' 
                    ? filters.timeWindow.start 
                    : filters.timeWindow.start instanceof Date 
                      ? filters.timeWindow.start.toISOString().split('T')[0] 
                      : getCurrentDate()}
                  onChange={(e) => handleTimeWindowChange('start', e.target.value)}
                />
              </div>
              <div>
                <label 
                  htmlFor="endDate" 
                  className="block text-sm font-medium text-gray-700"
                >
                    End Date
                  </label>
                <input
                  id="endDate"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  type="date"
                  value={typeof filters.timeWindow.end === 'string' 
                    ? filters.timeWindow.end 
                    : filters.timeWindow.end instanceof Date 
                      ? filters.timeWindow.end.toISOString().split('T')[0] 
                      : getCurrentDate()}
                  onChange={(e) => handleTimeWindowChange('end', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress and Error Display */}
      {(isDownloading || downloadError) && (
        <div className="bg-white shadow rounded-lg p-6">
          {isDownloading && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Downloading data...</span>
                <span className="text-sm text-gray-500">{Math.round(downloadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {downloadError && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FontAwesomeIcon icon={faExclamationCircle} className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error downloading data</h3>
                  <div className="mt-2 text-sm text-red-700">
                    {downloadError}
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadError(null)
                        setIsDownloading(false)
                      }}
                      className="text-sm font-medium text-red-800 hover:text-red-700"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Data Preview</h3>
          <button
            type="button"
            onClick={fetchPreview}
            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
          >
            Refresh Preview
          </button>
        </div>

        {isLoadingPreview ? (
          <div className="flex justify-center items-center h-32">
            <div 
              data-testid="preview-loading-spinner"
              className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" 
            />
          </div>
        ) : previewError ? (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FontAwesomeIcon icon={faExclamationCircle} className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{previewError}</p>
              </div>
            </div>
          </div>
        ) : previewData ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {previewData.headers.map((header, index) => (
                    <th
                      key={index}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {cell?.toString() ?? 'N/A'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            Select filters and variables to see a preview of the data
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div>
        <button
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
            ${isDownloading ? 'bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          type="submit"
          disabled={isDownloading}
        >
          {isDownloading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
              <span data-testid="downloading-text">Downloading...</span>
              {downloadProgress > 0 && <span data-testid="download-progress">{downloadProgress}%</span>}
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faDownload} className="mr-2" />
              Download Data
            </>
          )}
        </button>
      </div>
    </form>
  )
} 