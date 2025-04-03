import React from 'react';
import useResponsive from '@/hooks/useResponsive';
import TerminalComponent from '@/components/terminal/TerminalComponent';

function TerminalView() {
  const { viewHeight } = useResponsive();

  return (
    <div
      className="flex max-h-full min-h-[400px] w-full flex-col gap-2 p-4"
      style={{ height: viewHeight }}
    >
      <h1 className="view-title">Terminal</h1>
      
      <div className="flex-grow bg-dark rounded-md overflow-hidden">
        <TerminalComponent />
      </div>
    </div>
  );
}

export default TerminalView;
