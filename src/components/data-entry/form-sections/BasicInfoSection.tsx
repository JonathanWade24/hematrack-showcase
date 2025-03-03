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

export function BasicInfoSection({ formData, isEditMode, onInputChange }: FormSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Subject ID * {isEditMode && <span className="text-gray-500">(Edit with caution)</span>}
          </label>
          <Input
            type="text"
            value={formData.subject_id}
            onChange={(e) => onInputChange('subject_id', e.target.value)}
            placeholder="e.g., OMI-1234"
            className={isEditMode ? 'bg-gray-50' : ''}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Sample Number * {isEditMode && <span className="text-gray-500">(Cannot be changed)</span>}
          </label>
          <Input
            type="number"
            value={formData.sample_number}
            onChange={(e) => onInputChange('sample_number', parseInt(e.target.value))}
            min={1}
            disabled={isEditMode}
            className={isEditMode ? 'bg-gray-50' : ''}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Collection Date *
          </label>
          <Input
            type="date"
            value={formData.date_of_collection}
            onChange={(e) => onInputChange('date_of_collection', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Age at Collection
          </label>
          <Input
            type="number"
            value={formData.age_at_collection || ''}
            onChange={(e) => onInputChange('age_at_collection', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Sex
          </label>
          <Select value={formData.sex || ''} onValueChange={(value) => onInputChange('sex', value)}>
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
          <label className="block text-sm font-medium text-gray-700">
            Genotype
          </label>
          <Select value={formData.genotype || ''} onValueChange={(value) => onInputChange('genotype', value)}>
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