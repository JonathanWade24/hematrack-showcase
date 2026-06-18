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
            name="date_dna"
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
            name="concentration_1_dna"
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
            name="purity_1_dna"
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
            name="concentration_2_dna"
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
            name="purity_2_dna"
            value={formData.purity_2_dna || ''}
            onChange={(e) => onInputChange('purity_2_dna', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.01"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">QC Pass</label>
          <Select name="qc_pass_dna" value={formData.qc_pass_dna || ''} onValueChange={(value) => onInputChange('qc_pass_dna', value)}>
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
            name="qc_notes_dna"
            value={formData.qc_notes_dna || ''}
            onChange={(e) => onInputChange('qc_notes_dna', e.target.value)}
            placeholder="Enter any QC notes"
          />
        </div>
      </div>
    </div>
  )
} 