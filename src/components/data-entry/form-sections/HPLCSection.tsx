'use client'

import { Input } from '../../ui/input'
import { Select } from '../../ui/select'
import { FormSectionProps } from './types'

export function HPLCSection({ formData, onInputChange }: FormSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <Input
            type="date"
            value={formData.date_hplc || ''}
            onChange={(e) => onInputChange('date_hplc', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-900">Grady HPLC</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              HbF %
            </label>
            <Input
              type="number"
              value={formData.hbf_percent_grady_hplc || ''}
              onChange={(e) => onInputChange('hbf_percent_grady_hplc', e.target.value ? parseFloat(e.target.value) : null)}
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              HbA %
            </label>
            <Input
              type="number"
              value={formData.hba_percent_grady_hplc || ''}
              onChange={(e) => onInputChange('hba_percent_grady_hplc', e.target.value ? parseFloat(e.target.value) : null)}
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              HbC %
            </label>
            <Input
              type="number"
              value={formData.hbc_percent_grady_hplc || ''}
              onChange={(e) => onInputChange('hbc_percent_grady_hplc', e.target.value ? parseFloat(e.target.value) : null)}
              step="0.1"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              HbA2 %
            </label>
            <Input
              type="number"
              value={formData.hba2_percent_grady_hplc || ''}
              onChange={(e) => onInputChange('hba2_percent_grady_hplc', e.target.value ? parseFloat(e.target.value) : null)}
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              HbS %
            </label>
            <Input
              type="number"
              value={formData.hbs_percent_grady_hplc || ''}
              onChange={(e) => onInputChange('hbs_percent_grady_hplc', e.target.value ? parseFloat(e.target.value) : null)}
              step="0.1"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-900">D10 HPLC</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              HbF %
            </label>
            <Input
              type="number"
              value={formData.hbf_percent_d10_hplc || ''}
              onChange={(e) => onInputChange('hbf_percent_d10_hplc', e.target.value ? parseFloat(e.target.value) : null)}
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              HbA %
            </label>
            <Input
              type="number"
              value={formData.hba_percent_d10_hplc || ''}
              onChange={(e) => onInputChange('hba_percent_d10_hplc', e.target.value ? parseFloat(e.target.value) : null)}
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              HbC %
            </label>
            <Input
              type="number"
              value={formData.hbc_percent_d10_hplc || ''}
              onChange={(e) => onInputChange('hbc_percent_d10_hplc', e.target.value ? parseFloat(e.target.value) : null)}
              step="0.1"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              HbA2 %
            </label>
            <Input
              type="number"
              value={formData.hba2_percent_d10_hplc || ''}
              onChange={(e) => onInputChange('hba2_percent_d10_hplc', e.target.value ? parseFloat(e.target.value) : null)}
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              HbS %
            </label>
            <Input
              type="number"
              value={formData.hbs_percent_d10_hplc || ''}
              onChange={(e) => onInputChange('hbs_percent_d10_hplc', e.target.value ? parseFloat(e.target.value) : null)}
              step="0.1"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-900">F-Cell Ratios</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              D10 HbF % / F-Cell %
            </label>
            <Input
              type="number"
              value={formData.hbf_percent_d10_fcell_ratio || ''}
              onChange={(e) => onInputChange('hbf_percent_d10_fcell_ratio', e.target.value ? parseFloat(e.target.value) : null)}
              step="0.001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Grady HbF % / F-Cell %
            </label>
            <Input
              type="number"
              value={formData.hbf_percent_grady_fcell_ratio || ''}
              onChange={(e) => onInputChange('hbf_percent_grady_fcell_ratio', e.target.value ? parseFloat(e.target.value) : null)}
              step="0.001"
            />
          </div>
        </div>
      </div>
    </div>
  )
} 