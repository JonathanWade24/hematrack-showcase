'use client'

import { FormSectionProps } from './types'
import { Input } from '@/components/ui/input'

export function PlasmaSection({ formData, onInputChange }: FormSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <Input
            type="date"
            name="date_plasma"
            value={formData.date_plasma || ''}
            onChange={(e) => onInputChange('date_plasma', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Volume 1
          </label>
          <Input
            type="number"
            name="vol_plasma_1"
            value={formData.vol_plasma_1 || ''}
            onChange={(e) => onInputChange('vol_plasma_1', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Volume 2
          </label>
          <Input
            type="number"
            name="vol_plasma_2"
            value={formData.vol_plasma_2 || ''}
            onChange={(e) => onInputChange('vol_plasma_2', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Volume 3
          </label>
          <Input
            type="number"
            name="vol_plasma_3"
            value={formData.vol_plasma_3 || ''}
            onChange={(e) => onInputChange('vol_plasma_3', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            QC Notes
          </label>
          <Input
            type="text"
            name="qc_notes_plasma"
            value={formData.qc_notes_plasma || ''}
            onChange={(e) => onInputChange('qc_notes_plasma', e.target.value)}
            placeholder="Enter any QC notes"
          />
        </div>
      </div>
    </div>
  )
} 