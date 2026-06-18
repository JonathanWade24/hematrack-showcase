import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ExportSectionProps {
  progress: number;
  onExport: () => void;
}

export const ExportSection = ({ progress, onExport }: ExportSectionProps) => {
  return (
    <div className="export-section space-y-4">
      <Button
        onClick={onExport}
        disabled={progress > 0 && progress < 100}
      >
        {progress > 0 ? `Exporting (${progress}%)` : 'Export Data'}
      </Button>
      
      {progress > 0 && (
        <Progress value={progress} className="w-full" />
      )}
    </div>
  );
}; 