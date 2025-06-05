import React, { useState } from 'react';
import { Grid3X3 } from 'lucide-react';

interface TableInsertionProps {
  onInsertTable: (rows: number, columns: number) => void;
  className?: string;
}

export const TableInsertion: React.FC<TableInsertionProps> = ({
  onInsertTable,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverCell, setHoverCell] = useState({ row: 0, col: 0 });

  const handleCellHover = (row: number, col: number) => {
    setHoverCell({ row, col });
  };

  const handleCellClick = (row: number, col: number) => {
    onInsertTable(row + 1, col + 1);
    setIsOpen(false);
    setHoverCell({ row: 0, col: 0 });
  };

  const renderGrid = () => {
    const maxRows = 8;
    const maxCols = 8;
    const cells = [];

    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col < maxCols; col++) {
        const isHighlighted = row <= hoverCell.row && col <= hoverCell.col;
        cells.push(
          <div
            key={`${row}-${col}`}
            className={`w-4 h-4 border border-gray-300 cursor-pointer transition-colors ${
              isHighlighted ? 'bg-primary-500' : 'bg-white hover:bg-gray-100'
            }`}
            onMouseEnter={() => handleCellHover(row, col)}
            onClick={() => handleCellClick(row, col)}
          />
        );
      }
    }

    return (
      <div 
        className="grid grid-cols-8 gap-1 p-3"
        style={{ gridTemplateColumns: 'repeat(8, 1rem)' }}
      >
        {cells}
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded hover:bg-gray-200 ${
          isOpen ? 'bg-primary-500/20 text-primary-600' : 'text-gray-600'
        }`}
        title="Insert Table"
      >
        <Grid3X3 size={16} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20">
            <div className="p-2">
              <div className="text-xs text-gray-600 mb-2 text-center">
                {hoverCell.row + 1} × {hoverCell.col + 1} Table
              </div>
              {renderGrid()}
              <div className="text-xs text-gray-500 text-center mt-2">
                Click to insert table
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}; 