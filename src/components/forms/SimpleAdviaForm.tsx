import { useForm } from 'react-hook-form'
import { useState, useEffect, useRef, ChangeEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useDebounce } from '@/hooks/useDebounce'

const adviaSchema = z.object({
  sample_id: z.string().min(1, 'Sample ID is required'),
  date_advia: z.string().min(1, 'Date is required'),
  rbc_advia: z.number()
    .min(0, 'RBC count must be positive')
    .max(10, 'RBC count seems too high'),
  hb_advia: z.number()
    .min(0, 'Hemoglobin must be positive')
    .max(25, 'Hemoglobin seems too high'),
  hct_advia: z.number()
    .min(0, 'Hematocrit must be positive')
    .max(100, 'Hematocrit must be less than 100'),
  mcv_advia: z.number()
    .min(50, 'MCV seems too low')
    .max(150, 'MCV seems too high'),
  mch_advia: z.number()
    .min(15, 'MCH seems too low')
    .max(50, 'MCH seems too high'),
  mchc_advia: z.number()
    .min(20, 'MCHC seems too low')
    .max(50, 'MCHC seems too high'),
  rdw_advia: z.number()
    .min(0, 'RDW must be positive')
    .max(30, 'RDW seems too high'),
  hdw_advia: z.number()
    .min(0, 'HDW must be positive')
    .max(30, 'HDW seems too high'),
  plt_advia: z.number()
    .min(0, 'Platelet count must be positive')
    .max(1000, 'Platelet count seems too high'),
  mpv_advia: z.number()
    .min(0, 'MPV must be positive')
    .max(30, 'MPV seems too high'),
  wbc_advia: z.number()
    .min(0, 'WBC count must be positive')
    .max(100, 'WBC count seems too high'),
  neut_advia: z.number()
    .min(0, 'Neutrophil count must be positive')
    .max(100, 'Neutrophil count seems too high'),
  retic_advia: z.number()
    .min(0, 'Reticulocyte count must be positive')
    .max(30, 'Reticulocyte count seems too high'),
  chr_advia: z.number()
    .min(0, 'CHR must be positive')
    .max(100, 'CHR seems too high'),
  hc41_v120_advia: z.number()
    .min(0, 'HC41 V120 must be positive')
    .max(100, 'HC41 V120 seems too high'),
  hc41_v60_120_advia: z.number()
    .min(0, 'HC41 V60-120 must be positive')
    .max(100, 'HC41 V60-120 seems too high'),
  hc41_v60_advia: z.number()
    .min(0, 'HC41 V60 must be positive')
    .max(100, 'HC41 V60 seems too high'),
  drbc_advia: z.number()
    .min(0, 'DRBC must be positive')
    .max(100, 'DRBC seems too high'),
  hyper_advia: z.number()
    .min(0, 'Hyper must be positive')
    .max(100, 'Hyper seems too high'),
  nrbc_advia: z.number()
    .min(0, 'NRBC must be positive')
    .max(100, 'NRBC seems too high'),
  qc_pass_advia: z.enum(['Yes', 'No']).optional(),
  qc_notes_advia: z.string().optional()
})

type AdviaFormData = z.infer<typeof adviaSchema>

interface OmicsResult extends Partial<AdviaFormData> {
  sample_id: string;
  [key: string]: unknown;
}

interface SearchResult {
  sample_id: string;
  assay_type: string;
  date_advia?: string;
}

export default function SimpleAdviaForm({ 
  onSuccess 
}: { 
  onSuccess?: () => void 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<AdviaFormData>({
    resolver: zodResolver(adviaSchema)
  })

  const debouncedSearchInput = useDebounce(searchInput, 500)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search for existing sample data when search input changes
  useEffect(() => {
    async function searchSample() {
      if (!debouncedSearchInput) {
        setSearchResults([])
        setIsDropdownOpen(false)
        return
      }

      setIsSearching(true)
      try {
        const response = await fetch(`/api/omics?sample_id=${debouncedSearchInput}`)
        if (response.ok) {
          const data = await response.json()
          if (data.results) {
            setSearchResults(data.results)
            setIsDropdownOpen(true)
          }
        }
      } catch (err) {
        console.error('Error searching for sample:', err)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    searchSample()
  }, [debouncedSearchInput])

  const loadSampleData = async (sampleId: string) => {
    setIsSearching(true)
    try {
      const response = await fetch(`/api/omics?sample_id=${sampleId}&assay_type=ADVIA`)
      if (response.ok) {
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          const result = data.results[0] as OmicsResult
          Object.entries(result).forEach(([key, value]) => {
            if (key in adviaSchema.shape && value !== null) {
              setValue(key as keyof AdviaFormData, value as AdviaFormData[keyof AdviaFormData])
            }
          })
        }
      }
    } catch (err) {
      console.error('Error loading sample data:', err)
    } finally {
      setIsSearching(false)
      setIsDropdownOpen(false)
      setSearchInput('')
    }
  }

  const verifySubmission = async (sampleId: string) => {
    try {
      const response = await fetch(`/api/omics?sample_id=${sampleId}&assay_type=ADVIA`)
      if (response.ok) {
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          return true
        }
      }
      return false
    } catch (err) {
      console.error('Error verifying submission:', err)
      return false
    }
  }

  const onSubmit = async (data: AdviaFormData) => {
    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/omics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          assay_type: 'ADVIA'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit data')
      }

      // Verify the submission
      setIsVerifying(true)
      const isVerified = await verifySubmission(data.sample_id)
      
      if (isVerified) {
        setSuccessMessage('ADVIA data submitted and verified successfully')
        reset()
        onSuccess?.()
      } else {
        setError('Data was submitted but could not be verified. Please check if the data was saved correctly.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
      setIsVerifying(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h2 className="text-lg font-medium mb-2">Search Existing Data</h2>
        <div className="relative" ref={searchRef}>
          <div className="relative">
            <Input
              placeholder="Search for existing samples..."
              value={searchInput}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
              className={isSearching ? 'pr-24' : ''}
            />
            {isSearching && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <div className="animate-spin h-5 w-5 text-gray-400">⌛</div>
              </div>
            )}
          </div>
          
          {isDropdownOpen && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.sample_id}-${index}`}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                  onClick={() => loadSampleData(result.sample_id)}
                >
                  <div className="font-medium">{result.sample_id}</div>
                  {result.date_advia && (
                    <div className="text-sm text-gray-600">
                      Date: {new Date(result.date_advia).toLocaleDateString()}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
          
          {isDropdownOpen && searchResults.length === 0 && debouncedSearchInput && !isSearching && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 p-4 text-gray-500">
              No matching samples found
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-md">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-green-50 text-green-600 rounded-md">
            {successMessage}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="sample_id" className="block text-sm font-medium">
              Sample ID
            </label>
            <Input
              id="sample_id"
              placeholder="Enter sample ID"
              {...register('sample_id')}
            />
            {errors.sample_id && (
              <p className="mt-1 text-sm text-red-600">{errors.sample_id.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="date_advia" className="block text-sm font-medium">
              Date
            </label>
            <Input
              id="date_advia"
              type="date"
              {...register('date_advia')}
            />
            {errors.date_advia && (
              <p className="mt-1 text-sm text-red-600">{errors.date_advia.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="rbc_advia" className="block text-sm font-medium">
                RBC Count (×10¹²/L)
              </label>
              <Input
                id="rbc_advia"
                type="number"
                step="0.01"
                placeholder="Enter RBC count"
                {...register('rbc_advia', { valueAsNumber: true })}
              />
              {errors.rbc_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.rbc_advia.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="hb_advia" className="block text-sm font-medium">
                Hemoglobin (g/dL)
              </label>
              <Input
                id="hb_advia"
                type="number"
                step="0.1"
                placeholder="Enter hemoglobin"
                {...register('hb_advia', { valueAsNumber: true })}
              />
              {errors.hb_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.hb_advia.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="hct_advia" className="block text-sm font-medium">
                Hematocrit (%)
              </label>
              <Input
                id="hct_advia"
                type="number"
                step="0.1"
                placeholder="Enter hematocrit"
                {...register('hct_advia', { valueAsNumber: true })}
              />
              {errors.hct_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.hct_advia.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="mcv_advia" className="block text-sm font-medium">
                MCV (fL)
              </label>
              <Input
                id="mcv_advia"
                type="number"
                step="0.1"
                placeholder="Enter MCV"
                {...register('mcv_advia', { valueAsNumber: true })}
              />
              {errors.mcv_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.mcv_advia.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="mch_advia" className="block text-sm font-medium">
                MCH (pg)
              </label>
              <Input
                id="mch_advia"
                type="number"
                step="0.1"
                placeholder="Enter MCH"
                {...register('mch_advia', { valueAsNumber: true })}
              />
              {errors.mch_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.mch_advia.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="mchc_advia" className="block text-sm font-medium">
                MCHC (g/dL)
              </label>
              <Input
                id="mchc_advia"
                type="number"
                step="0.1"
                placeholder="Enter MCHC"
                {...register('mchc_advia', { valueAsNumber: true })}
              />
              {errors.mchc_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.mchc_advia.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="rdw_advia" className="block text-sm font-medium">
                RDW (%)
              </label>
              <Input
                id="rdw_advia"
                type="number"
                step="0.1"
                placeholder="Enter RDW"
                {...register('rdw_advia', { valueAsNumber: true })}
              />
              {errors.rdw_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.rdw_advia.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="hdw_advia" className="block text-sm font-medium">
                HDW (g/dL)
              </label>
              <Input
                id="hdw_advia"
                type="number"
                step="0.1"
                placeholder="Enter HDW"
                {...register('hdw_advia', { valueAsNumber: true })}
              />
              {errors.hdw_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.hdw_advia.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="plt_advia" className="block text-sm font-medium">
                Platelets (×10⁹/L)
              </label>
              <Input
                id="plt_advia"
                type="number"
                step="1"
                placeholder="Enter platelet count"
                {...register('plt_advia', { valueAsNumber: true })}
              />
              {errors.plt_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.plt_advia.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="mpv_advia" className="block text-sm font-medium">
                MPV (fL)
              </label>
              <Input
                id="mpv_advia"
                type="number"
                step="0.1"
                placeholder="Enter MPV"
                {...register('mpv_advia', { valueAsNumber: true })}
              />
              {errors.mpv_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.mpv_advia.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="wbc_advia" className="block text-sm font-medium">
                WBC (×10⁹/L)
              </label>
              <Input
                id="wbc_advia"
                type="number"
                step="0.1"
                placeholder="Enter WBC count"
                {...register('wbc_advia', { valueAsNumber: true })}
              />
              {errors.wbc_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.wbc_advia.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="neut_advia" className="block text-sm font-medium">
                Neutrophils (×10⁹/L)
              </label>
              <Input
                id="neut_advia"
                type="number"
                step="0.1"
                placeholder="Enter neutrophil count"
                {...register('neut_advia', { valueAsNumber: true })}
              />
              {errors.neut_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.neut_advia.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="retic_advia" className="block text-sm font-medium">
                Reticulocytes (%)
              </label>
              <Input
                id="retic_advia"
                type="number"
                step="0.1"
                placeholder="Enter reticulocyte count"
                {...register('retic_advia', { valueAsNumber: true })}
              />
              {errors.retic_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.retic_advia.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="chr_advia" className="block text-sm font-medium">
                CHr (pg)
              </label>
              <Input
                id="chr_advia"
                type="number"
                step="0.1"
                placeholder="Enter CHr"
                {...register('chr_advia', { valueAsNumber: true })}
              />
              {errors.chr_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.chr_advia.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="nrbc_advia" className="block text-sm font-medium">
                NRBC (%)
              </label>
              <Input
                id="nrbc_advia"
                type="number"
                step="0.1"
                placeholder="Enter NRBC"
                {...register('nrbc_advia', { valueAsNumber: true })}
              />
              {errors.nrbc_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.nrbc_advia.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="hc41_v120_advia" className="block text-sm font-medium">
                HC41 V120
              </label>
              <Input
                id="hc41_v120_advia"
                type="number"
                step="0.1"
                placeholder="Enter HC41 V120"
                {...register('hc41_v120_advia', { valueAsNumber: true })}
              />
              {errors.hc41_v120_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.hc41_v120_advia.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="hc41_v60_120_advia" className="block text-sm font-medium">
                HC41 V60-120
              </label>
              <Input
                id="hc41_v60_120_advia"
                type="number"
                step="0.1"
                placeholder="Enter HC41 V60-120"
                {...register('hc41_v60_120_advia', { valueAsNumber: true })}
              />
              {errors.hc41_v60_120_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.hc41_v60_120_advia.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="hc41_v60_advia" className="block text-sm font-medium">
                HC41 V60
              </label>
              <Input
                id="hc41_v60_advia"
                type="number"
                step="0.1"
                placeholder="Enter HC41 V60"
                {...register('hc41_v60_advia', { valueAsNumber: true })}
              />
              {errors.hc41_v60_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.hc41_v60_advia.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="drbc_advia" className="block text-sm font-medium">
                DRBC (%)
              </label>
              <Input
                id="drbc_advia"
                type="number"
                step="0.1"
                placeholder="Enter DRBC"
                {...register('drbc_advia', { valueAsNumber: true })}
              />
              {errors.drbc_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.drbc_advia.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="hyper_advia" className="block text-sm font-medium">
                Hyper (%)
              </label>
              <Input
                id="hyper_advia"
                type="number"
                step="0.1"
                placeholder="Enter Hyper"
                {...register('hyper_advia', { valueAsNumber: true })}
              />
              {errors.hyper_advia && (
                <p className="mt-1 text-sm text-red-600">{errors.hyper_advia.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="qc_pass_advia" className="block text-sm font-medium">
              QC Pass
            </label>
            <select
              id="qc_pass_advia"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register('qc_pass_advia')}
            >
              <option value="">Select...</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
            {errors.qc_pass_advia && (
              <p className="mt-1 text-sm text-red-600">{errors.qc_pass_advia.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="qc_notes_advia" className="block text-sm font-medium">
              QC Notes
            </label>
            <Textarea
              id="qc_notes_advia"
              placeholder="Enter any QC notes or comments"
              {...register('qc_notes_advia')}
            />
            {errors.qc_notes_advia && (
              <p className="mt-1 text-sm text-red-600">{errors.qc_notes_advia.message}</p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || isVerifying}
          className="w-full"
        >
          {isSubmitting ? 'Submitting...' : isVerifying ? 'Verifying...' : 'Submit ADVIA Data'}
        </Button>
      </form>
    </div>
  )
} 