export const PreviewSection = ({ data, isLoading, error, onRefresh }) => {
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  
  return (
    <div className="preview-section">
      <div className="flex justify-between items-center">
        <h3>Data Preview</h3>
        <RefreshButton onClick={onRefresh} />
      </div>
      
      {data && (
        <>
          <div className="text-sm text-gray-500">
            Showing {data.rows.length} of {data.totalCount} total records
          </div>
          <Table data={data} />
        </>
      )}
    </div>
  );
}; 