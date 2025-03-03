'use client'

import { Input } from '../../ui/Input'
import { Select } from '../../ui/Select'
import { FormSectionProps } from './types'

export function PBMCSection({ formData, onInputChange }: FormSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <Input
            type="date"
            value={formData.date_pmbc || ''}
            onChange={(e) => onInputChange('date_pmbc', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Cell Number 1
          </label>
          <Input
            type="number"
            value={formData.cell_number_1_pbmc || ''}
            onChange={(e) => onInputChange('cell_number_1_pbmc', e.target.value ? parseFloat(e.target.value) : null)}
            step="1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Cell Number 2
          </label>
          <Input
            type="number"
            value={formData.cell_number_2_pbmc || ''}
            onChange={(e) => onInputChange('cell_number_2_pbmc', e.target.value ? parseFloat(e.target.value) : null)}
            step="1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Sent to GT
          </label>
          <Select
            value={formData.sent_to_gt_pbmc || ''}
            onChange={(e) => onInputChange('sent_to_gt_pbmc', e.target.value)}
          >
            <option value="">Select...</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            QC Notes
          </label>
          <Input
            type="text"
            value={formData.qc_notes_pbmc || ''}
            onChange={(e) => onInputChange('qc_notes_pbmc', e.target.value)}
            placeholder="Enter any QC notes"
          />
        </div>
      </div>
    </div>
  )
} 