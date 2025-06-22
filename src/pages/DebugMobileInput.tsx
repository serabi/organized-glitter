/**
 * Debug Mobile Input Page
 * 
 * This page tests different input patterns to isolate the mobile freezing issue.
 * Access via /debug-mobile-input (temporary route for testing)
 */

import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import MinimalTitleInput from '@/components/debug/MinimalTitleInput';
import ReactHookFormTest from '@/components/debug/ReactHookFormTest';
import PerformanceMonitor from '@/components/debug/PerformanceMonitor';
import { useAuth } from '@/hooks/useAuth';

const DebugMobileInput: React.FC = () => {
  const { user } = useAuth();
  const [selectedTest, setSelectedTest] = useState<string>('basic');
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [testCategory, setTestCategory] = useState<'minimal' | 'react-hook-form'>('minimal');

  const addToLog = (message: string) => {
    setEventLog(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearLog = () => {
    setEventLog([]);
  };

  const minimalTestModes = [
    { key: 'basic', label: 'Basic Controlled Input', description: 'Standard React controlled input pattern' },
    { key: 'uncontrolled', label: 'Uncontrolled Input', description: 'No React state updates' },
    { key: 'debounced', label: 'Debounced Input', description: 'Immediate UI, delayed processing' },
  ];

  const rhfTestModes = [
    { key: 'basic', label: 'Basic RHF', description: 'React Hook Form with minimal validation' },
    { key: 'with-validation', label: 'RHF with onChange validation', description: 'Validates on every change' },
    { key: 'with-watch', label: 'RHF with watch()', description: 'Uses watch() to monitor changes' },
    { key: 'with-debounce', label: 'RHF with debounced watch', description: 'Debounced watch subscription' },
  ];

  const currentTestModes = testCategory === 'minimal' ? minimalTestModes : rhfTestModes;

  return (
    <MainLayout isAuthenticated={!!user}>
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>🐛 Mobile Input Debug Panel</h1>
        <p>Test different input patterns to isolate mobile freezing issues.</p>
        
        {/* Test Category Selector */}
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #007acc', borderRadius: '8px', backgroundColor: '#f8f9ff' }}>
          <h3>Select Test Category:</h3>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="testCategory"
                value="minimal"
                checked={testCategory === 'minimal'}
                onChange={(e) => {
                  setTestCategory(e.target.value as any);
                  setSelectedTest('basic');
                }}
                style={{ marginRight: '8px' }}
              />
              <strong>Minimal React Inputs</strong>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="testCategory"
                value="react-hook-form"
                checked={testCategory === 'react-hook-form'}
                onChange={(e) => {
                  setTestCategory(e.target.value as any);
                  setSelectedTest('basic');
                }}
                style={{ marginRight: '8px' }}
              />
              <strong>React Hook Form Tests</strong>
            </label>
          </div>
        </div>

        {/* Test Mode Selector */}
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Select Test Mode:</h3>
          {currentTestModes.map(mode => (
            <div key={mode.key} style={{ marginBottom: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="testMode"
                  value={mode.key}
                  checked={selectedTest === mode.key}
                  onChange={(e) => setSelectedTest(e.target.value)}
                  style={{ marginRight: '8px' }}
                />
                <div>
                  <strong>{mode.label}</strong>
                  <br />
                  <small style={{ color: '#666' }}>{mode.description}</small>
                </div>
              </label>
            </div>
          ))}
        </div>

        {/* Performance Monitor */}
        <PerformanceMonitor 
          label={`${testCategory}-${selectedTest}`}
          trackRenders={true}
          trackMemory={true}
        />

        {/* Test Component */}
        <div style={{ marginBottom: '20px', border: '2px solid #007acc', borderRadius: '8px' }}>
          {testCategory === 'minimal' ? (
            <MinimalTitleInput
              testMode={selectedTest as any}
              onValueChange={(value) => addToLog(`Minimal input changed: "${value}"`)}
            />
          ) : (
            <ReactHookFormTest
              variant={selectedTest as any}
              onChange={(data) => addToLog(`RHF onChange: ${JSON.stringify(data)}`)}
              onSubmit={(data) => addToLog(`RHF onSubmit: ${JSON.stringify(data)}`)}
            />
          )}
        </div>

        {/* Event Log */}
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3>Event Log:</h3>
            <button 
              onClick={clearLog}
              style={{ 
                padding: '5px 10px', 
                backgroundColor: '#dc3545', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear Log
            </button>
          </div>
          <div style={{ 
            height: '200px', 
            overflowY: 'auto', 
            backgroundColor: 'white', 
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
            {eventLog.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No events yet. Start typing in the input above.</p>
            ) : (
              eventLog.map((log, index) => (
                <div key={index} style={{ marginBottom: '2px' }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Mobile Detection Info */}
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #28a745', borderRadius: '8px', backgroundColor: '#f8fff9' }}>
          <h3>Environment Info:</h3>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>User Agent: {navigator.userAgent}</li>
            <li>Screen Width: {window.screen.width}px</li>
            <li>Window Width: {window.innerWidth}px</li>
            <li>Touch Support: {navigator.maxTouchPoints > 0 ? 'Yes' : 'No'}</li>
            <li>Platform: {navigator.platform}</li>
          </ul>
        </div>

        {/* Instructions */}
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ffc107', borderRadius: '8px', backgroundColor: '#fffdf3' }}>
          <h3>🧪 Testing Instructions:</h3>
          <ol>
            <li><strong>Test each mode</strong> - Switch between different input patterns</li>
            <li><strong>Type slowly</strong> - See if the issue occurs with deliberate typing</li>
            <li><strong>Type quickly</strong> - Test rapid typing that might trigger the freeze</li>
            <li><strong>Watch the log</strong> - Monitor event frequency and timing</li>
            <li><strong>Check browser tools</strong> - Open DevTools to monitor performance</li>
          </ol>
          <p><strong>Expected outcome:</strong> If one pattern works better than others, we've identified the issue!</p>
        </div>
      </div>
    </MainLayout>
  );
};

export default DebugMobileInput;