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

export function FCellsSection({ formData, onInputChange }: FormSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <Input
            type="date"
            name="date_f_cells"
            value={formData.date_f_cells || ''}
            onChange={(e) => onInputChange('date_f_cells', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Percent F-Cells
          </label>
          <Input
            type="number"
            name="percent_f_cells"
            value={formData.percent_f_cells || ''}
            onChange={(e) => onInputChange('percent_f_cells', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Stain
          </label>
          <Input
            type="text"
            name="stain_f_cells"
            value={formData.stain_f_cells || ''}
            onChange={(e) => onInputChange('stain_f_cells', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Cytometer
          </label>
          <Input
            type="text"
            name="cytometer_f_cells"
            value={formData.cytometer_f_cells || ''}
            onChange={(e) => onInputChange('cytometer_f_cells', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">QC Pass</label>
          <Select name="qc_pass_f_cells" value={formData.qc_pass_f_cells || ''} onValueChange={(value) => onInputChange('qc_pass_f_cells', value)}>
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
            name="qc_notes_f_cells"
            value={formData.qc_notes_f_cells || ''}
            onChange={(e) => onInputChange('qc_notes_f_cells', e.target.value)}
            placeholder="Enter any QC notes"
          />
        </div>
      </div>
    </div>
  )
} 