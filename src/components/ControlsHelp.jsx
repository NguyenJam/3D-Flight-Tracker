import React from 'react';
import './ControlsHelp.css';

export default function ControlsHelp({ open = false, onClose = () => {}, rightSidebarOpen = false, isCompactLayout = false, rightSidebarOffset = 0 }) {
  if (!open) return null;
  const showFullControls = !isCompactLayout;
  const desktopStyle = !isCompactLayout ? { transform: `translateX(-${rightSidebarOffset}px)` } : undefined;
  return (
    <div
      className="controls-help"
      style={desktopStyle}
      role="dialog"
      aria-modal="false"
      aria-label="Controls help"
    >
      <div className="controls-help-header">
        <div className="title">Controls</div>
      </div>
      <div className="controls-help-content">
        {showFullControls && (
          <>
            <div className="section">
              <div className="section-title">Mouse</div>
              <ul>
                <li>Click and drag to orbit</li>
                <li>Scroll wheel to zoom</li>
              </ul>
            </div>
            <div className="section">
              <div className="section-title">Keyboard</div>
              <ul>
                <li>W/A/S/D — Orbit</li>
                <li>Q/E — Zoom</li>
                <li>Shift + 1/2/3/4 — Limit aircraft count to 100/200/500/All</li>
                <li>R — Reset camera</li>
                <li>Tab — Toggle visualization</li>
              </ul>
            </div>
          </>
        )}
        <div className="section">
          <div className="section-title">Globe/Visualization</div>
          <ul>
            <li>Click on a point to select; click again to deselect</li>
            <li>Left panel — Aircraft details</li>
            <li>Right panel — Search / Filters / Settings</li>
          </ul>
        </div>
      </div>
    </div>
  );
}