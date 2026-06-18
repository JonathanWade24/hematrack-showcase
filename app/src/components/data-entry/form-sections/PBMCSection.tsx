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
            name="date_pmbc"
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
            name="cell_number_1_pbmc"
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
            name="cell_number_2_pbmc"
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
          <Select name="sent_to_gt_pbmc" value={formData.sent_to_gt_pbmc || ''} onValueChange={(value) => onInputChange('sent_to_gt_pbmc', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            QC Notes
          </label>
          <Input
            type="text"
            name="qc_notes_pbmc"
            value={formData.qc_notes_pbmc || ''}
            onChange={(e) => onInputChange('qc_notes_pbmc', e.target.value)}
            placeholder="Enter any QC notes"
          />
        </div>
      </div>
    </div>
  )
} 