import QueryBuilderWrapper from '@/components/query/QueryBuilderWrapper';

export const metadata = {
  title: 'Query Builder - SCD Dashboard',
  description: 'Build and execute custom queries against the SCD research database',
};

export default function QueryBuilderPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <QueryBuilderWrapper />
    </div>
  );
} 