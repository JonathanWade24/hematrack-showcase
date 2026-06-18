'use client'

import { Input } from '../../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import { FormSectionProps } from './types'

export function BasicInfoSection({ formData, isEditMode, onInputChange, disabled }: FormSectionProps & { disabled?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="subject_id" className="block text-sm font-medium text-gray-700">
            Subject ID * {isEditMode && <span className="text-gray-500">(Edit with caution)</span>}
          </label>
          <Input
            id="subject_id"
            name="subject_id"
            type="text"
            value={formData.subject_id}
            onChange={(e) => onInputChange('subject_id', e.target.value)}
            placeholder="e.g., OMI-1234"
            className={isEditMode ? 'bg-gray-50' : ''}
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="sample_number" className="block text-sm font-medium text-gray-700">
            Sample Number * {isEditMode && <span className="text-gray-500">(Cannot be changed)</span>}
          </label>
          <Input
            id="sample_number"
            name="sample_number"
            type="number"
            value={formData.sample_number}
            onChange={(e) => onInputChange('sample_number', parseInt(e.target.value))}
            min={1}
            disabled={isEditMode || disabled}
            className={isEditMode ? 'bg-gray-50' : ''}
          />
        </div>
        <div>
          <label htmlFor="lab_id" className="block text-sm font-medium text-gray-700">
            Lab ID * 
          </label>
          <Input
            id="lab_id"
            name="lab_id"
            type="text"
            value={formData.lab_id || ''}
            onChange={(e) => onInputChange('lab_id', e.target.value)}
            placeholder="e.g., OMI-1234-1 or custom ID"
            disabled={isEditMode || disabled}
            className={isEditMode ? 'bg-gray-50' : ''}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="date_of_collection" className="block text-sm font-medium text-gray-700">
            Collection Date *
          </label>
          <Input
            id="date_of_collection"
            name="date_of_collection"
            type="date"
            value={formData.date_of_collection}
            onChange={(e) => onInputChange('date_of_collection', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="age_at_collection" className="block text-sm font-medium text-gray-700">
            Age at Collection
          </label>
          <Input
            id="age_at_collection"
            name="age_at_collection"
            type="number"
            value={formData.age_at_collection || ''}
            onChange={(e) => onInputChange('age_at_collection', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="sex" className="block text-sm font-medium text-gray-700">
            Sex
          </label>
          <Select name="sex" value={formData.sex || ''} onValueChange={(value) => onInputChange('sex', value)} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Select sex..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Male</SelectItem>
              <SelectItem value="F">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="genotype" className="block text-sm font-medium text-gray-700">
            Genotype
          </label>
          <Select name="genotype" value={formData.genotype || ''} onValueChange={(value) => onInputChange('genotype', value)} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Select genotype..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SS">SS</SelectItem>
              <SelectItem value="SC">SC</SelectItem>
              <SelectItem value="SB0">Sβ0</SelectItem>
              <SelectItem value="SB+">Sβ+</SelectItem>
              <SelectItem value="AS">AS</SelectItem>
              <SelectItem value="AA">AA</SelectItem>
              <SelectItem value="AC">AC</SelectItem>
              <SelectItem value="CC">CC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
} 