import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DedicatedProductPage from './DedicatedProductPage';
import { supabase } from '../lib/supabase'; // To be mocked
import { Product } from '../types';

// Mock supabase client
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  },
}));

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // Preserve other exports
  useNavigate: () => mockNavigate,
  useParams: jest.fn(), // We'll mock this per test case
}));

const mockProduct: Product = {
  id: '123',
  user_id: 'test-user',
  name: 'Awesome Product',
  description: 'This is an awesome product.',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  openai_vector_store_id: null,
};

describe('DedicatedProductPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for useParams
    (jest.requireMock('react-router-dom').useParams as jest.Mock).mockReturnValue({ productId: '123' });
  });

  const renderPage = (productId: string | undefined = '123') => {
    (jest.requireMock('react-router-dom').useParams as jest.Mock).mockReturnValue({ productId });
    return render(
      <MemoryRouter initialEntries={[`/dashboard/products/${productId || 'undefined'}`]}>
        <Routes>
          <Route path="/dashboard/products/:productId" element={<DedicatedProductPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('fetches and displays product details successfully', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: mockProduct, error: null });
    renderPage();

    expect(screen.getByText('Loading product data...')).toBeInTheDocument(); // Or check for ProductDetailHeader's loading state

    await waitFor(() => {
      expect(screen.getByText('Awesome Product')).toBeInTheDocument();
    });
    expect(screen.getByText('This is an awesome product.')).toBeInTheDocument();
    expect(screen.getByText('Associated Documents')).toBeInTheDocument();
  });

  it('displays an error message if product fetching fails', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'Fetch failed', code: 'XYZ' } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Error: Fetch failed')).toBeInTheDocument();
    });
  });

  it('displays product not found if data is null and no error (e.g. PGRST116 handled)', async () => {
    // Simulate PGRST116 scenario (no rows found by Supabase, handled internally to set error state)
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'No rows found', code: 'PGRST116' } });
    renderPage();
    
    await waitFor(() => {
        expect(screen.getByText("Error: Product with ID '123' not found.")).toBeInTheDocument();
    });
  });

  it('displays an error if productId is missing', async () => {
    renderPage(undefined);
     await waitFor(() => {
      expect(screen.getByText('Error: Product ID is missing.')).toBeInTheDocument();
    });
  });

  it('navigates back when the back button is clicked', async () => {
    (supabase.single as jest.Mock).mockResolvedValueOnce({ data: mockProduct, error: null });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Awesome Product')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Back to Products'));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/products');
  });
});
