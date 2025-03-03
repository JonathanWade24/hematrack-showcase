export const ExportSection = ({ progress, onExport }) => {
  return (
    <div className="export-section">
      <Button
        onClick={onExport}
        disabled={progress > 0 && progress < 100}
      >
        {progress > 0 ? `Exporting (${progress}%)` : 'Export Data'}
      </Button>
      
      {progress > 0 && <ProgressBar progress={progress} />}
    </div>
  );
}; 