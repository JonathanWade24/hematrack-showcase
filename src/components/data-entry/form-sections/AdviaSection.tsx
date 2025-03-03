'use client'

import { Input } from '../../ui/Input'
import { Select } from '../../ui/Select'
import { FormSectionProps } from './types'

export function AdviaSection({ formData, onInputChange }: FormSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <Input
            type="date"
            value={formData.date_advia || ''}
            onChange={(e) => onInputChange('date_advia', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">RBC</label>
          <Input
            type="number"
            value={formData.rbc_advia || ''}
            onChange={(e) => onInputChange('rbc_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Hb</label>
          <Input
            type="number"
            value={formData.hb_advia || ''}
            onChange={(e) => onInputChange('hb_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Hct</label>
          <Input
            type="number"
            value={formData.hct_advia || ''}
            onChange={(e) => onInputChange('hct_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">MCV</label>
          <Input
            type="number"
            value={formData.mcv_advia || ''}
            onChange={(e) => onInputChange('mcv_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">MCH</label>
          <Input
            type="number"
            value={formData.mch_advia || ''}
            onChange={(e) => onInputChange('mch_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">MCHC</label>
          <Input
            type="number"
            value={formData.mchc_advia || ''}
            onChange={(e) => onInputChange('mchc_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">RDW</label>
          <Input
            type="number"
            value={formData.rdw_advia || ''}
            onChange={(e) => onInputChange('rdw_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">HDW</label>
          <Input
            type="number"
            value={formData.hdw_advia || ''}
            onChange={(e) => onInputChange('hdw_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">PLT</label>
          <Input
            type="number"
            value={formData.plt_advia || ''}
            onChange={(e) => onInputChange('plt_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">MPV</label>
          <Input
            type="number"
            value={formData.mpv_advia || ''}
            onChange={(e) => onInputChange('mpv_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">WBC</label>
          <Input
            type="number"
            value={formData.wbc_advia || ''}
            onChange={(e) => onInputChange('wbc_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">NEUT</label>
          <Input
            type="number"
            value={formData.neut_advia || ''}
            onChange={(e) => onInputChange('neut_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">RETIC</label>
          <Input
            type="number"
            value={formData.retic_advia || ''}
            onChange={(e) => onInputChange('retic_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">CHr</label>
          <Input
            type="number"
            value={formData.chr_advia || ''}
            onChange={(e) => onInputChange('chr_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">%H</label>
          <Input
            type="number"
            value={formData.hc41_v120_advia || ''}
            onChange={(e) => onInputChange('hc41_v120_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">%M</label>
          <Input
            type="number"
            value={formData.hc41_v60_120_advia || ''}
            onChange={(e) => onInputChange('hc41_v60_120_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">%L</label>
          <Input
            type="number"
            value={formData.hc41_v60_advia || ''}
            onChange={(e) => onInputChange('hc41_v60_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">DRBC</label>
          <Input
            type="number"
            value={formData.drbc_advia || ''}
            onChange={(e) => onInputChange('drbc_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">HYPER</label>
          <Input
            type="number"
            value={formData.hyper_advia || ''}
            onChange={(e) => onInputChange('hyper_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">NRBC</label>
          <Input
            type="number"
            value={formData.nrbc_advia || ''}
            onChange={(e) => onInputChange('nrbc_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">QC Pass</label>
          <Select
            value={formData.qc_pass_advia || ''}
            onChange={(e) => onInputChange('qc_pass_advia', e.target.value)}
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
            value={formData.qc_notes_advia || ''}
            onChange={(e) => onInputChange('qc_notes_advia', e.target.value)}
            placeholder="Enter any QC notes"
          />
        </div>
      </div>
    </div>
  )
} 