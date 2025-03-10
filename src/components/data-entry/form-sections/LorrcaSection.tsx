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

export function LorrcaSection({ formData, onInputChange }: FormSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <Input
            type="date"
            value={formData.date_lorrca || ''}
            onChange={(e) => onInputChange('date_lorrca', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            EI Min
          </label>
          <Input
            type="number"
            value={formData.ei_min_lorrca || ''}
            onChange={(e) => onInputChange('ei_min_lorrca', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            EI Max
          </label>
          <Input
            type="number"
            value={formData.ei_max_lorrca || ''}
            onChange={(e) => onInputChange('ei_max_lorrca', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            EI Delta
          </label>
          <Input
            type="number"
            value={formData.ei_delta_lorrca || ''}
            onChange={(e) => onInputChange('ei_delta_lorrca', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.001"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Position
          </label>
          <Input
            type="number"
            value={formData.pos_lorrca || ''}
            onChange={(e) => onInputChange('pos_lorrca', e.target.value ? parseFloat(e.target.value) : null)}
            step="1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Instrument
          </label>
          <Input
            type="text"
            value={formData.instrument_lorrca || ''}
            onChange={(e) => onInputChange('instrument_lorrca', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">QC Pass</label>
          <Select value={formData.qc_pass_lorrca || ''} onValueChange={(value) => onInputChange('qc_pass_lorrca', value)}>
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
            value={formData.qc_notes_lorrca || ''}
            onChange={(e) => onInputChange('qc_notes_lorrca', e.target.value)}
            placeholder="Enter any QC notes"
          />
        </div>
      </div>
    </div>
  )
} 