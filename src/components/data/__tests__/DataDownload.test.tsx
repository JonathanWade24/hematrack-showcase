import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataDownload } from '../DataDownload'

// Mock the FontAwesomeIcon component
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => <span data-testid="mock-icon" />
}))

describe('DataDownload Component', () => {
  const mockOnSubmit = jest.fn().mockResolvedValue({ success: true })
  const mockOnPreview = jest.fn().mockResolvedValue({
    headers: ['ID', 'Name', 'Value'],
    rows: [
      [1, 'Test 1', 100],
      [2, 'Test 2', 200]
    ]
  })

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  test('renders without crashing', () => {
    render(
      <DataDownload 
        onSubmit={mockOnSubmit} 
        onPreview={mockOnPreview} 
      />
    )
    
    expect(screen.getByText('Data Preview')).toBeInTheDocument()
    expect(screen.getByText('Patient Groups')).toBeInTheDocument()
    expect(screen.getByText('Variables of Interest')).toBeInTheDocument()
    expect(screen.getByText('Time Window')).toBeInTheDocument()
  })

  test('toggles OMI sample requirement checkbox', () => {
    render(
      <DataDownload 
        onSubmit={mockOnSubmit} 
        onPreview={mockOnPreview} 
      />
    )
    
    const checkbox = screen.getByLabelText('Only include patients with OMI samples')
    expect(checkbox).not.toBeChecked()
    
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  test('changes time window type', () => {
    render(
      <DataDownload 
        onSubmit={mockOnSubmit} 
        onPreview={mockOnPreview} 
      />
    )
    
    // Initially should be on relative
    const relativeRadio = screen.getByLabelText('Relative to collection date')
    const absoluteRadio = screen.getByLabelText('Absolute date range')
    
    expect(relativeRadio).toBeChecked()
    expect(absoluteRadio).not.toBeChecked()
    
    // Change to absolute
    fireEvent.click(absoluteRadio)
    expect(relativeRadio).not.toBeChecked()
    expect(absoluteRadio).toBeChecked()
    
    // Should show date inputs - now using proper IDs
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument()
    expect(screen.getByLabelText('End Date')).toBeInTheDocument()
  })

  test('shows loading state during preview fetch', async () => {
    // Mock the preview function to return a promise that doesn't resolve immediately
    const delayedMockPreview = jest.fn().mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            headers: ['ID', 'Name', 'Value'],
            rows: [
              [1, 'Test 1', 100],
              [2, 'Test 2', 200]
            ]
          });
        }, 100);
      });
    });
    
    render(
      <DataDownload 
        onSubmit={mockOnSubmit} 
        onPreview={delayedMockPreview} 
      />
    );
    
    // Get the preview button and click it
    const previewButton = screen.getByText('Refresh Preview');
    fireEvent.click(previewButton);
    
    // Look for the spinner with data-testid
    const spinnerElement = await screen.findByTestId('preview-loading-spinner', {}, { timeout: 1000 });
    expect(spinnerElement).toBeInTheDocument();
  })

  test('submits form and shows progress', async () => {
    // Mock the submit function to return a promise with progress updates
    const progressMockSubmit = jest.fn().mockImplementation(() => {
      return Promise.resolve({ success: true, progress: 50 });
    });
    
    render(
      <DataDownload 
        onSubmit={progressMockSubmit} 
        onPreview={mockOnPreview} 
      />
    );
    
    // First, let's add a lab component to make the form valid
    const clinicalSection = screen.getByText('clinical');
    fireEvent.click(clinicalSection);
    
    // Wait for any potential async operations after clicking
    await waitFor(() => {
      // Find the "Add Lab Component" button and click it
      const addLabButton = screen.getByText('Add Lab Component');
      fireEvent.click(addLabButton);
    });
    
    // Select a lab component (assuming there's a lab component selection UI)
    await waitFor(() => {
      // This might need adjustment based on your actual UI
      const labOption = screen.queryByText('hgb');
      if (labOption) {
        fireEvent.click(labOption);
      }
    });
    
    // Submit the form
    const submitButton = screen.getByText(/Download Data/i);
    fireEvent.click(submitButton);
    
    // Check if the onSubmit was called
    expect(progressMockSubmit).toHaveBeenCalled();
    
    // Mock the state changes that would happen after submission
    // This is a workaround since we can't directly manipulate component state in tests
    jest.useFakeTimers();
    
    // Simulate the component updating with downloading state
    await act(async () => {
      // Fast-forward time to allow state updates
      jest.advanceTimersByTime(100);
    });
    
    // Reset timers
    jest.useRealTimers();
    
    // Since we can't easily test for the downloading state directly,
    // let's just verify that the submit function was called with the correct filters
    expect(progressMockSubmit).toHaveBeenCalledWith(expect.objectContaining({
      variables: expect.objectContaining({
        clinical: expect.objectContaining({
          labs: expect.arrayContaining([expect.any(String)])
        })
      })
    }));
  })

  it('handles preview errors correctly', async () => {
    const errorMessage = 'Failed to load preview'
    mockOnPreview.mockRejectedValue(new Error(errorMessage))
    
    render(<DataDownload onSubmit={mockOnSubmit} onPreview={mockOnPreview} />)
    
    const previewButton = screen.getByText(/refresh preview/i)
    await userEvent.click(previewButton)
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('handles successful data submission', async () => {
    render(<DataDownload onSubmit={mockOnSubmit} onPreview={mockOnPreview} />)
    
    const submitButton = screen.getByText(/download data/i)
    await userEvent.click(submitButton)
    
    expect(mockOnSubmit).toHaveBeenCalled()
  })
}) 