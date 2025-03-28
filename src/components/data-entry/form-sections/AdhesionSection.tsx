'use client'

import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormSectionProps } from './types'

export function AdhesionSection({ formData, onInputChange }: FormSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Adhesion Data</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <Input
            type="date"
            value={formData.date_adhesion || ''}
            onChange={(e) => onInputChange('date_adhesion', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Total Cells Adhered</label>
          <Input
            type="number"
            value={formData.cells_adhered_adhesion || ''}
            onChange={(e) => onInputChange('cells_adhered_adhesion', e.target.value ? parseFloat(e.target.value) : null)}
            step="1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">QC Pass</label>
          <Select
            value={formData.qc_pass_adhesion || ''}
            onValueChange={(value) => onInputChange('qc_pass_adhesion', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Select...</SelectItem>
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
            value={formData.qc_notes_adhesion || ''}
            onChange={(e) => onInputChange('qc_notes_adhesion', e.target.value)}
            placeholder="Enter any QC notes"
          />
        </div>
      </div>
    </div>
  )
} 