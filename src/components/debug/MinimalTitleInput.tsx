/**
 * Minimal Title Input Test Component
 * 
 * This component strips away all complexity to test if the mobile freezing
 * issue is related to React Hook Form, complex state management, or 
 * something more fundamental.
 */

import React, { useState } from 'react';

interface MinimalTitleInputProps {
  onValueChange?: (value: string) => void;
  testMode?: 'basic' | 'controlled' | 'uncontrolled' | 'debounced';
}

export const MinimalTitleInput: React.FC<MinimalTitleInputProps> = ({ 
  onValueChange,
  testMode = 'basic' 
}) => {
  const [value, setValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');
  
  // Basic controlled input (most common pattern)
  if (testMode === 'basic' || testMode === 'controlled') {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      onValueChange?.(newValue);
      console.log('[MinimalInput] Value changed:', newValue);
    };

    return (
      <div style={{ padding: '20px' }}>
        <h3>Minimal Title Input Test - {testMode}</h3>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="Enter project title..."
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px', // Prevent iOS zoom
            border: '1px solid #ccc',
            borderRadius: '4px',
            touchAction: 'manipulation',
          }}
        />
        <p>Current value: {value}</p>
        <p>Character count: {value.length}</p>
      </div>
    );
  }

  // Uncontrolled input test
  if (testMode === 'uncontrolled') {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      console.log('[MinimalInput] Uncontrolled value:', newValue);
      onValueChange?.(newValue);
    };

    return (
      <div style={{ padding: '20px' }}>
        <h3>Minimal Title Input Test - Uncontrolled</h3>
        <input
          type="text"
          onChange={handleChange}
          placeholder="Enter project title (uncontrolled)..."
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            touchAction: 'manipulation',
          }}
        />
        <p>This input is uncontrolled - no React state updates</p>
      </div>
    );
  }

  // Debounced input test
  if (testMode === 'debounced') {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue); // Immediate UI update
      
      // Debounce other operations
      setTimeout(() => {
        setDebouncedValue(newValue);
        onValueChange?.(newValue);
        console.log('[MinimalInput] Debounced value:', newValue);
      }, 300);
    };

    return (
      <div style={{ padding: '20px' }}>
        <h3>Minimal Title Input Test - Debounced</h3>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="Enter project title (debounced)..."
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            touchAction: 'manipulation',
          }}
        />
        <p>Immediate value: {value}</p>
        <p>Debounced value: {debouncedValue}</p>
      </div>
    );
  }

  return null;
};

export default MinimalTitleInput;