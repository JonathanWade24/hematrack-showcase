'use client'

import { Input } from '../../ui/input'
import { Select } from '../../ui/select'
import { FormSectionProps } from './types'

export function DNASection({ formData, onInputChange }: FormSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <Input
            type="date"
            value={formData.date_dna || ''}
            onChange={(e) => onInputChange('date_dna', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Concentration 1
          </label>
          <Input
            type="number"
            value={formData.concentration_1_dna || ''}
            onChange={(e) => onInputChange('concentration_1_dna', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Purity 1
          </label>
          <Input
            type="number"
            value={formData.purity_1_dna || ''}
            onChange={(e) => onInputChange('purity_1_dna', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.01"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Concentration 2
          </label>
          <Input
            type="number"
            value={formData.concentration_2_dna || ''}
            onChange={(e) => onInputChange('concentration_2_dna', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Purity 2
          </label>
          <Input
            type="number"
            value={formData.purity_2_dna || ''}
            onChange={(e) => onInputChange('purity_2_dna', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.01"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">QC Pass</label>
          <Select
            value={formData.qc_pass_dna || ''}
            onChange={(e) => onInputChange('qc_pass_dna', e.target.value)}
          >
            <option value="">Select...</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="Review">Review</option>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">QC Notes</label>
          <Input
            type="text"
            value={formData.qc_notes_dna || ''}
            onChange={(e) => onInputChange('qc_notes_dna', e.target.value)}
            placeholder="Enter any QC notes"
          />
        </div>
      </div>
    </div>
  )
} 