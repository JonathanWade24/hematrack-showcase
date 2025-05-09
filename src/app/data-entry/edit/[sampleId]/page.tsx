import { SampleEntryForm } from '@/components/data-entry/SampleEntryForm';
import { getSampleForEditing } from '@/lib/db/queries';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { SampleData } from '@/components/data-entry/form-sections/types';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface EditSamplePageProps {
  params: {
    sampleId: string;
  };
}

export async function generateMetadata({ params }: EditSamplePageProps): Promise<Metadata> {
  return {
    title: `Edit Sample: ${params.sampleId}`,
  };
}

export default async function EditSamplePage({ params }: EditSamplePageProps) {
  const { sampleId } = params;

  if (!sampleId) {
    notFound(); 
  }

  const initialDataFromDb = await getSampleForEditing(sampleId);

  if (!initialDataFromDb) {
    notFound();
  }
  
  // Assert that the partial data we received actually fulfills the more complete type required by the form.
  // This relies on getSampleForEditing correctly populating critical fields like subject_id and lab_id.
  const formInitialData = initialDataFromDb as (Omit<SampleData, 'sample_id'> & { lab_id?: string | null });

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Edit Sample Data: {sampleId}</h1>
        <SampleEntryForm initialData={formInitialData} isEditing={true} />
        {/* Using 'as any' for initialData temporarily to avoid blocking on potential complex type mismatches
            between Partial<SampleData> and the specific Omit/& structure.
            We can refine this once the page is rendering.
            The important part is that `getSampleForEditing` is returning an object with `lab_id`
            and other fields from `SampleData`.
        */}
      </div>
    </DashboardLayout>
  );
}

// Optional: If you want to allow any sample ID to be tried at request time (server-rendered)
// export const dynamic = 'force-dynamic';

// Optional: If you have a known, small, finite set of samples you want to pre-render at build time:
// export async function generateStaticParams() {
//   // Example: Fetch a list of sample IDs you want to pre-render
//   // const samples = await db.select({ sample_id: samplesTable.sample_id }).from(samplesTable).limit(10);
//   // return samples.map((sample) => ({
//   //   sampleId: sample.sample_id,
//   // }));
//   return []; // Return empty if not pre-rendering specific paths
// } 