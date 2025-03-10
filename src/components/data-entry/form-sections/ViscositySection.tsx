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

export function ViscositySection({ formData, onInputChange }: FormSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <Input
            type="date"
            value={formData.date_visc || ''}
            onChange={(e) => onInputChange('date_visc', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Viscosity at 45
          </label>
          <Input
            type="number"
            value={formData.visc_45 || ''}
            onChange={(e) => onInputChange('visc_45', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Viscosity at 225
          </label>
          <Input
            type="number"
            value={formData.visc_225 || ''}
            onChange={(e) => onInputChange('visc_225', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.001"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">QC Pass</label>
          <Select value={formData.qc_pass_viscosity || ''} onValueChange={(value) => onInputChange('qc_pass_viscosity', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select QC status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
              <SelectItem value="Review">Review</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">QC Notes</label>
          <Input
            type="text"
            value={formData.qc_notes_viscosity || ''}
            onChange={(e) => onInputChange('qc_notes_viscosity', e.target.value)}
            placeholder="Enter any QC notes"
          />
        </div>
      </div>
    </div>
  )
} 