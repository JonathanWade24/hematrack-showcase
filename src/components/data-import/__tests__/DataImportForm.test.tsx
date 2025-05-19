import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DataImportForm } from '../DataImportForm';
import { importDataAction } from '@/app/data-import/actions';

// Mock the server action
jest.mock('@/app/data-import/actions', () => ({
  importDataAction: jest.fn()
}));

describe('DataImportForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all data type options', () => {
    render(<DataImportForm />);
    
    expect(screen.getByText('Demographics')).toBeInTheDocument();
    expect(screen.getByText('Bone Marrow Results')).toBeInTheDocument();
    expect(screen.getByText('Inpatient Admissions')).toBeInTheDocument();
    expect(screen.getByText('Outpatient Medications')).toBeInTheDocument();
    expect(screen.getByText('Outpatient Visits')).toBeInTheDocument();
    expect(screen.getByText('Inpatient Medications')).toBeInTheDocument();
    expect(screen.getByText('Laboratory Results')).toBeInTheDocument();
  });

  it('handles file selection', async () => {
    render(<DataImportForm />);
    
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText('Demographics');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('test.csv')).toBeInTheDocument();
    });
  });

  it('shows error for invalid file type', async () => {
    render(<DataImportForm />);
    
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText('Demographics');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('Please select a CSV file')).toBeInTheDocument();
    });
  });

  it('handles form submission successfully', async () => {
    (importDataAction as jest.Mock).mockResolvedValue({
      results: [{ type: 'demographics', recordsProcessed: 1 }]
    });

    render(<DataImportForm />);
    
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText('Demographics');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    const submitButton = screen.getByRole('button', { name: /import/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(importDataAction).toHaveBeenCalled();
      expect(screen.getByText('Successfully imported 1 records')).toBeInTheDocument();
    });
  });

  it('handles form submission error', async () => {
    (importDataAction as jest.Mock).mockResolvedValue({
      results: [{ type: 'demographics', error: 'Import failed' }]
    });

    render(<DataImportForm />);
    
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText('Demographics');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    const submitButton = screen.getByRole('button', { name: /import/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(importDataAction).toHaveBeenCalled();
      expect(screen.getByText('Import failed')).toBeInTheDocument();
    });
  });

  it('handles multiple file uploads', async () => {
    render(<DataImportForm />);
    
    const file1 = new File(['test1'], 'test1.csv', { type: 'text/csv' });
    const file2 = new File(['test2'], 'test2.csv', { type: 'text/csv' });
    
    const input1 = screen.getByLabelText('Demographics');
    const input2 = screen.getByLabelText('Bone Marrow Results');
    
    fireEvent.change(input1, { target: { files: [file1] } });
    fireEvent.change(input2, { target: { files: [file2] } });
    
    await waitFor(() => {
      expect(screen.getByText('test1.csv')).toBeInTheDocument();
      expect(screen.getByText('test2.csv')).toBeInTheDocument();
    });
  });

  it('shows progress during file upload', async () => {
    (importDataAction as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ results: [{ type: 'demographics', recordsProcessed: 1 }] }), 100))
    );

    render(<DataImportForm />);
    
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText('Demographics');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    const submitButton = screen.getByRole('button', { name: /import/i });
    fireEvent.click(submitButton);
    
    expect(screen.getByText('Importing...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Successfully imported 1 records')).toBeInTheDocument();
    });
  });
}); 