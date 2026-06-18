'use client'

interface SampleTooltipProps {
  sample: {
    sample_id: string
    genotype: string | null
    steady_state: string | null
    transfusion_status: string | null
    lab_values: {
      hb: number | null
      hct: number | null
      wbc: number | null
      plt: number | null
      f_cells: number | null
    }
  }
  isVisible: boolean
  position: { x: number; y: number }
}

export function SampleTooltip({ sample, isVisible, position }: SampleTooltipProps) {
  if (!isVisible) return null

  return (
    <div 
      className="absolute z-50 bg-white rounded-lg shadow-lg p-4 border border-gray-200 w-80"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(20px, -50%)'
      }}
    >
      <h4 className="text-sm font-medium text-gray-900 mb-2">Sample Details</h4>
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-500">Sample ID</p>
          <p className="text-sm text-gray-900">{sample.sample_id}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Clinical Status</p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <p className="text-xs text-gray-600">Genotype:</p>
              <p className="text-sm text-gray-900">{sample.genotype || 'Not recorded'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Steady State:</p>
              <p className="text-sm text-gray-900">{sample.steady_state || 'Not recorded'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-600">Transfusion Status:</p>
              <p className="text-sm text-gray-900">{sample.transfusion_status || 'Not recorded'}</p>
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Lab Values</p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <p className="text-xs text-gray-600">Hemoglobin:</p>
              <p className="text-sm text-gray-900">{sample.lab_values.hb?.toFixed(1) || 'N/A'} g/dL</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Hematocrit:</p>
              <p className="text-sm text-gray-900">{sample.lab_values.hct?.toFixed(1) || 'N/A'}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">WBC:</p>
              <p className="text-sm text-gray-900">{sample.lab_values.wbc?.toFixed(1) || 'N/A'} K/µL</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Platelets:</p>
              <p className="text-sm text-gray-900">{sample.lab_values.plt?.toFixed(0) || 'N/A'} K/µL</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">F-Cells:</p>
              <p className="text-sm text-gray-900">{sample.lab_values.f_cells?.toFixed(1) || 'N/A'}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 