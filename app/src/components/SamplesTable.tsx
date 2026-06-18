interface Sample {
  id: string;
  patient_mrn: string;
  collection_date?: Date;
  sample_type?: string;
  status?: string;
}

interface SamplesTableProps {
  samples: Sample[];
}

export default function SamplesTable({ samples = [] }: SamplesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Patient MRN
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Collection Date
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sample Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {samples.map((sample) => (
            <tr key={sample.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {sample.patient_mrn}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {sample.collection_date?.toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {sample.sample_type}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {sample.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 