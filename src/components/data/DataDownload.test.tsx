import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DataDownload } from './DataDownload';

// Mock the FontAwesomeIcon component
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => <span data-testid="mock-icon" />
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('DataDownload Component', () => {
  const mockOnSubmit = jest.fn().mockResolvedValue({ success: true });
  const mockOnPreview = jest.fn().mockResolvedValue({
    headers: ['ID', 'Name', 'Value'],
    rows: [
      [1, 'Test 1', 100],
      [2, 'Test 2', 200]
    ]
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });
  });

  test('renders without crashing', () => {
    render(
      <DataDownload 
        onSubmit={mockOnSubmit} 
        onPreview={mockOnPreview} 
      />
    );
    
    expect(screen.getByText('Data Preview')).toBeInTheDocument();
    expect(screen.getByText('Patient Groups')).toBeInTheDocument();
    expect(screen.getByText('Variables of Interest')).toBeInTheDocument();
    expect(screen.getByText('Time Window')).toBeInTheDocument();
  });

  test('adds a patient group when "Add Group" button is clicked', () => {
    render(
      <DataDownload 
        onSubmit={mockOnSubmit} 
        onPreview={mockOnPreview} 
      />
    );
    
    const addGroupButton = screen.getByText('Add Group');
    fireEvent.click(addGroupButton);
    
    expect(screen.getByPlaceholderText('Group Name')).toBeInTheDocument();
  });

  test('toggles OMI sample requirement checkbox', () => {
    render(
      <DataDownload 
        onSubmit={mockOnSubmit} 
        onPreview={mockOnPreview} 
      />
    );
    
    const checkbox = screen.getByLabelText('Only include patients with OMI samples');
    expect(checkbox).not.toBeChecked();
    
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  test('changes time window type', () => {
    render(
      <DataDownload 
        onSubmit={mockOnSubmit} 
        onPreview={mockOnPreview} 
      />
    );
    
    // Initially should be on relative
    const relativeRadio = screen.getByLabelText('Relative to collection date');
    const absoluteRadio = screen.getByLabelText('Absolute date range');
    
    expect(relativeRadio).toBeChecked();
    expect(absoluteRadio).not.toBeChecked();
    
    // Change to absolute
    fireEvent.click(absoluteRadio);
    expect(relativeRadio).not.toBeChecked();
    expect(absoluteRadio).toBeChecked();
    
    // Should show date inputs
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
  });

  test('submits form and shows progress', async () => {
    mockOnSubmit.mockResolvedValue({ 
      success: true, 
      progress: 50 
    });
    
    render(
      <DataDownload 
        onSubmit={mockOnSubmit} 
        onPreview={mockOnPreview} 
      />
    );
    
    const submitButton = screen.getByText('Download Data');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
      expect(screen.getByText('Downloading...')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  test('shows error message when download fails', async () => {
    mockOnSubmit.mockResolvedValue({ 
      success: false, 
      error: 'Failed to download data' 
    });
    
    render(
      <DataDownload 
        onSubmit={mockOnSubmit} 
        onPreview={mockOnPreview} 
      />
    );
    
    const submitButton = screen.getByText('Download Data');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
      expect(screen.getByText('Error downloading data')).toBeInTheDocument();
      expect(screen.getByText('Failed to download data')).toBeInTheDocument();
    });
  });
}); 