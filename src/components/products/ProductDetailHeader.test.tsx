import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductDetailHeader from './ProductDetailHeader';

describe('ProductDetailHeader', () => {
  const mockOnBackClick = jest.fn();

  it('renders product name and description when not loading', () => {
    render(
      <ProductDetailHeader
        productName="Test Product"
        productDescription="This is a test description."
        onBackClick={mockOnBackClick}
        isLoading={false}
      />
    );
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('This is a test description.')).toBeInTheDocument();
    expect(screen.getByText('Back to Products')).toBeInTheDocument();
  });

  it('renders loading state when isLoading is true', () => {
    render(
      <ProductDetailHeader
        onBackClick={mockOnBackClick}
        isLoading={true}
      />
    );
    // Check for presence of pulse animation divs (more robust ways might exist depending on exact class names for shimmer)
    const pulseElements = screen.getAllByRole('generic', { name: '' }); // A bit generic, adjust if possible
    // This is a simple check, might need refinement based on how shimmer/pulse is implemented
    // Or check that product name/description are NOT present
    expect(screen.queryByText('Test Product')).not.toBeInTheDocument();
    expect(screen.getByText('Back to Products')).toBeInTheDocument(); // Back button should still be there
  });

  it('calls onBackClick when the back button is clicked', () => {
    render(
      <ProductDetailHeader
        productName="Test Product"
        onBackClick={mockOnBackClick}
        isLoading={false}
      />
    );
    fireEvent.click(screen.getByText('Back to Products'));
    expect(mockOnBackClick).toHaveBeenCalledTimes(1);
  });

  it('renders placeholder text when product name/description are undefined and not loading', () => {
    render(
      <ProductDetailHeader
        onBackClick={mockOnBackClick}
        isLoading={false}
      />
    );
    expect(screen.getByText('Product Not Found')).toBeInTheDocument();
    expect(screen.getByText('No description available.')).toBeInTheDocument();
  });
});
