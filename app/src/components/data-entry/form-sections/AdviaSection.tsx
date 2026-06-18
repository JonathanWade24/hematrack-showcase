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
import { FormSectionWrapper } from './FormSectionWrapper'

export function AdviaSection({ formData, onInputChange, disabled }: FormSectionProps) {
  return (
    <FormSectionWrapper>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="date_advia" className="block text-sm font-medium text-gray-700 mb-2">
            Date
          </label>
          <Input
            id="date_advia"
            name="date_advia"
            type="date"
            value={formData.date_advia || ''}
            onChange={(e) => onInputChange('date_advia', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="rbc_advia" className="block text-sm font-medium text-gray-700 mb-2">RBC</label>
          <Input
            id="rbc_advia"
            name="rbc_advia"
            type="number"
            value={formData.rbc_advia || ''}
            onChange={(e) => onInputChange('rbc_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.01"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="hb_advia" className="block text-sm font-medium text-gray-700 mb-2">Hb</label>
          <Input
            id="hb_advia"
            name="hb_advia"
            type="number"
            value={formData.hb_advia || ''}
            onChange={(e) => onInputChange('hb_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="hct_advia" className="block text-sm font-medium text-gray-700 mb-2">Hct</label>
          <Input
            id="hct_advia"
            name="hct_advia"
            type="number"
            value={formData.hct_advia || ''}
            onChange={(e) => onInputChange('hct_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="mcv_advia" className="block text-sm font-medium text-gray-700 mb-2">MCV</label>
          <Input
            id="mcv_advia"
            name="mcv_advia"
            type="number"
            value={formData.mcv_advia || ''}
            onChange={(e) => onInputChange('mcv_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="mch_advia" className="block text-sm font-medium text-gray-700 mb-2">MCH</label>
          <Input
            id="mch_advia"
            name="mch_advia"
            type="number"
            value={formData.mch_advia || ''}
            onChange={(e) => onInputChange('mch_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="mchc_advia" className="block text-sm font-medium text-gray-700 mb-2">MCHC</label>
          <Input
            id="mchc_advia"
            name="mchc_advia"
            type="number"
            value={formData.mchc_advia || ''}
            onChange={(e) => onInputChange('mchc_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="rdw_advia" className="block text-sm font-medium text-gray-700 mb-2">RDW</label>
          <Input
            id="rdw_advia"
            name="rdw_advia"
            type="number"
            value={formData.rdw_advia || ''}
            onChange={(e) => onInputChange('rdw_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="hdw_advia" className="block text-sm font-medium text-gray-700 mb-2">HDW</label>
          <Input
            id="hdw_advia"
            name="hdw_advia"
            type="number"
            value={formData.hdw_advia || ''}
            onChange={(e) => onInputChange('hdw_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="plt_advia" className="block text-sm font-medium text-gray-700 mb-2">PLT</label>
          <Input
            id="plt_advia"
            name="plt_advia"
            type="number"
            value={formData.plt_advia || ''}
            onChange={(e) => onInputChange('plt_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="1"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="mpv_advia" className="block text-sm font-medium text-gray-700 mb-2">MPV</label>
          <Input
            id="mpv_advia"
            name="mpv_advia"
            type="number"
            value={formData.mpv_advia || ''}
            onChange={(e) => onInputChange('mpv_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="wbc_advia" className="block text-sm font-medium text-gray-700 mb-2">WBC</label>
          <Input
            id="wbc_advia"
            name="wbc_advia"
            type="number"
            value={formData.wbc_advia || ''}
            onChange={(e) => onInputChange('wbc_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="neut_advia" className="block text-sm font-medium text-gray-700 mb-2">NEUT</label>
          <Input
            id="neut_advia"
            name="neut_advia"
            type="number"
            value={formData.neut_advia || ''}
            onChange={(e) => onInputChange('neut_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="retic_advia" className="block text-sm font-medium text-gray-700 mb-2">RETIC</label>
          <Input
            id="retic_advia"
            name="retic_advia"
            type="number"
            value={formData.retic_advia || ''}
            onChange={(e) => onInputChange('retic_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="chr_advia" className="block text-sm font-medium text-gray-700 mb-2">CHr</label>
          <Input
            id="chr_advia"
            name="chr_advia"
            type="number"
            value={formData.chr_advia || ''}
            onChange={(e) => onInputChange('chr_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="hc41_v120_advia" className="block text-sm font-medium text-gray-700 mb-2">%H</label>
          <Input
            id="hc41_v120_advia"
            name="hc41_v120_advia"
            type="number"
            value={formData.hc41_v120_advia || ''}
            onChange={(e) => onInputChange('hc41_v120_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="hc41_v60_120_advia" className="block text-sm font-medium text-gray-700 mb-2">%M</label>
          <Input
            id="hc41_v60_120_advia"
            name="hc41_v60_120_advia"
            type="number"
            value={formData.hc41_v60_120_advia || ''}
            onChange={(e) => onInputChange('hc41_v60_120_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="hc41_v60_advia" className="block text-sm font-medium text-gray-700 mb-2">%L</label>
          <Input
            id="hc41_v60_advia"
            name="hc41_v60_advia"
            type="number"
            value={formData.hc41_v60_advia || ''}
            onChange={(e) => onInputChange('hc41_v60_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="drbc_advia" className="block text-sm font-medium text-gray-700 mb-2">DRBC</label>
          <Input
            id="drbc_advia"
            name="drbc_advia"
            type="number"
            value={formData.drbc_advia || ''}
            onChange={(e) => onInputChange('drbc_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="hyper_advia" className="block text-sm font-medium text-gray-700 mb-2">HYPER</label>
          <Input
            id="hyper_advia"
            name="hyper_advia"
            type="number"
            value={formData.hyper_advia || ''}
            onChange={(e) => onInputChange('hyper_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="nrbc_advia" className="block text-sm font-medium text-gray-700 mb-2">NRBC</label>
          <Input
            id="nrbc_advia"
            name="nrbc_advia"
            type="number"
            value={formData.nrbc_advia || ''}
            onChange={(e) => onInputChange('nrbc_advia', e.target.value ? parseFloat(e.target.value) : null)}
            step="0.1"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="qc_pass_advia_select" className="block text-sm font-medium text-gray-700 mb-2">QC Pass</label>
          <Select
            value={formData.qc_pass_advia || ''}
            onValueChange={(value) => onInputChange('qc_pass_advia', value)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select QC status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
              <SelectItem value="Review">Review</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="hidden"
            name="qc_pass_advia"
            value={formData.qc_pass_advia || ''}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="qc_notes_advia" className="block text-sm font-medium text-gray-700 mb-2">QC Notes</label>
          <Input
            id="qc_notes_advia"
            name="qc_notes_advia"
            type="text"
            value={formData.qc_notes_advia || ''}
            onChange={(e) => onInputChange('qc_notes_advia', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    </FormSectionWrapper>
  )
} 