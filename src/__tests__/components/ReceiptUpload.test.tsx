import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ReceiptUpload from '@/components/wins/expenses/ReceiptUpload';

describe('ReceiptUpload', () => {
  const mockOnReceiptChange = vi.fn();

  beforeEach(() => {
    mockOnReceiptChange.mockClear();
    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload buttons when no receipt is selected', () => {
    render(<ReceiptUpload onReceiptChange={mockOnReceiptChange} />);
    
    expect(screen.getByText('Receipt Photo (Optional)')).toBeInTheDocument();
    expect(screen.getByText('Upload Receipt')).toBeInTheDocument();
    // Camera button only shows on mobile
    expect(screen.queryByText('Take Photo')).not.toBeInTheDocument();
  });

  it('handles file upload correctly', async () => {
    const user = userEvent.setup();
    render(<ReceiptUpload onReceiptChange={mockOnReceiptChange} />);
    
    const file = new File(['test image'], 'receipt.jpg', { type: 'image/jpeg' });
    const uploadButton = screen.getByText('Upload Receipt');
    
    // Find the hidden file input
    const fileInput = uploadButton.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    
    // Upload file
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      expect(mockOnReceiptChange).toHaveBeenCalledWith(file);
    });
  });

  it('validates file size', async () => {
    const user = userEvent.setup();
    window.alert = vi.fn();
    
    render(<ReceiptUpload onReceiptChange={mockOnReceiptChange} />);
    
    // Create a file larger than 5MB
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    const uploadButton = screen.getByText('Upload Receipt');
    const fileInput = uploadButton.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    
    await user.upload(fileInput, largeFile);
    
    expect(window.alert).toHaveBeenCalledWith('File size must be less than 5MB');
    expect(mockOnReceiptChange).not.toHaveBeenCalled();
  });

  it('shows preview when receipt is uploaded', async () => {
    const user = userEvent.setup();
    render(<ReceiptUpload onReceiptChange={mockOnReceiptChange} />);
    
    const file = new File(['test image'], 'receipt.jpg', { type: 'image/jpeg' });
    const uploadButton = screen.getByText('Upload Receipt');
    const fileInput = uploadButton.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      expect(screen.getByText('receipt.jpg')).toBeInTheDocument();
      expect(screen.getByText('Click to preview')).toBeInTheDocument();
      expect(screen.getByAltText('Receipt preview')).toBeInTheDocument();
    });
  });

  it('allows removing uploaded receipt', async () => {
    const user = userEvent.setup();
    render(<ReceiptUpload onReceiptChange={mockOnReceiptChange} />);
    
    const file = new File(['test image'], 'receipt.jpg', { type: 'image/jpeg' });
    const uploadButton = screen.getByText('Upload Receipt');
    const fileInput = uploadButton.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    
    await user.upload(fileInput, file);
    
    // Wait for preview to appear
    await waitFor(() => {
      expect(screen.getByText('receipt.jpg')).toBeInTheDocument();
    });
    
    // Click remove button
    const removeButton = screen.getByRole('button', { name: /remove/i });
    await user.click(removeButton);
    
    expect(mockOnReceiptChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByText('receipt.jpg')).not.toBeInTheDocument();
  });

  it('opens preview in new window when clicked', async () => {
    const user = userEvent.setup();
    const mockOpen = vi.fn();
    window.open = mockOpen;
    
    render(<ReceiptUpload onReceiptChange={mockOnReceiptChange} />);
    
    const file = new File(['test image'], 'receipt.jpg', { type: 'image/jpeg' });
    const uploadButton = screen.getByText('Upload Receipt');
    const fileInput = uploadButton.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      expect(screen.getByAltText('Receipt preview')).toBeInTheDocument();
    });
    
    const previewImage = screen.getByAltText('Receipt preview');
    await user.click(previewImage.parentElement!);
    
    expect(mockOpen).toHaveBeenCalledWith(expect.stringContaining('blob:'), '_blank');
  });

  it('handles existing receipt URL', () => {
    const existingUrl = 'https://example.com/receipt.jpg';
    render(
      <ReceiptUpload 
        onReceiptChange={mockOnReceiptChange} 
        existingReceiptUrl={existingUrl}
      />
    );
    
    expect(screen.getByText('Receipt attached')).toBeInTheDocument();
    expect(screen.getByAltText('Receipt preview')).toHaveAttribute('src', existingUrl);
  });
});