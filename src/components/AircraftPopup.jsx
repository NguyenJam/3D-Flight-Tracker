import React from 'react';
import './AircraftPopup.css';

const AircraftPopup = ({ aircraft, onClose, open = false }) => {
  const formatAltitude = (altitudeMeters) => {
    if (altitudeMeters === null || altitudeMeters === undefined) return 'N/A';
    const feet = Math.round(altitudeMeters * 3.28084);
    return `${feet.toLocaleString()} ft`;
  };

  const formatVelocity = (velocityMs) => {
    if (velocityMs === null || velocityMs === undefined) return 'N/A';
    const knots = Math.round(velocityMs * 1.94384);
    return `${knots} kts`;
  };

  const formatVerticalRate = (verticalRateMs) => {
    if (verticalRateMs === null || verticalRateMs === undefined) return 'N/A';
    const fpm = Math.round(verticalRateMs * 196.85);
    const direction = fpm > 0 ? '\u2197 Climbing' : fpm < 0 ? '\u2198 Descending' : '\u2192 Level';
    return `${Math.abs(fpm)} ft/min ${direction}`;
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'N/A';
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    if (diff < 60) return `${Math.round(diff)}s ago`;
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    return `${Math.round(diff / 3600)}h ago`;
  };

  const formatHeading = (heading) => {
    if (heading === null || heading === undefined) return 'N/A';
    const rounded = Math.round(heading);
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(rounded / 22.5) % 16;
    const compass = directions[index];
    return `${rounded}\u00b0 (${compass})`;
  };

  const cls = `aircraft-popup aircraft-sidebar ${open ? 'open' : 'closed'}`;
  const ac = aircraft || {};
  const displayCallsign = aircraft ? (ac.callsign || 'Unknown Aircraft') : 'No Flight Selected';

  return (
    <>
  {open && <div className="aircraft-sidebar-scrim" />}
      <aside className={cls} role="complementary" aria-labelledby="aircraft-title" aria-hidden={!open}>
        <div className="aircraft-popup-header">
          <h3 id="aircraft-title">{displayCallsign}</h3>
        </div>

        <div className="aircraft-popup-content">
          {!aircraft ? (
            <div className="no-selection">
              <div className="no-selection-text">No flight has been selected</div>
              <div className="no-selection-hint">Click a flight on the globe to view details, or close this panel.</div>
            </div>
          ) : (
            <>
              <div className="info-section">
                <h4>Aircraft Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Call Sign:</span>
                    <span className="value">{ac.callsign || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">ICAO24:</span>
                    <span className="value">{ac.icao24 || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Country:</span>
                    <span className="value">{ac.country || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Status:</span>
                    <span className="value">{ac.status || (ac.onGround ? 'On Ground' : 'Airborne')}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Data Source:</span>
                    <span className="value">{ac.positionSource || ac.source || 'N/A'}</span>
                  </div>
                  {ac.squawk && (
                    <div className="info-item">
                      <span className="label">Squawk:</span>
                      <span className="value">{ac.squawk}</span>
                    </div>
                  )}
                  {ac.spi && (
                    <div className="info-item">
                      <span className="label">SPI:</span>
                      <span className="value">Active</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="info-section">
                <h4>Flight Data</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Barometric Altitude:</span>
                    <span className="value">{formatAltitude(ac.baroAltitude)}</span>
                  </div>
                  {ac.geoAltitude && (
                    <div className="info-item">
                      <span className="label">Geometric Altitude:</span>
                      <span className="value">{formatAltitude(ac.geoAltitude)}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="label">Ground Speed:</span>
                    <span className="value">{formatVelocity(ac.velocity)}</span>
                  </div>
                  {ac.etaReadable && (
                    <div className="info-item">
                      <span className="label">Estimated Arrival:</span>
                      <span className="value value--wrap">
                        <span>{ac.etaReadable}</span>
                        {ac.etaDestination && (ac.etaDestination.name || ac.etaDestination.ident) && (
                          <span className="coord-line">
                            {ac.etaDestination.name || ac.etaDestination.ident}
                            {ac.etaDestination.ident && ac.etaDestination.name && (
                              <span> ({ac.etaDestination.ident})</span>
                            )}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="label">Heading:</span>
                    <span className="value">{formatHeading(ac.heading)}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Vertical Rate:</span>
                    <span className="value value--wrap">{formatVerticalRate(ac.verticalRate)}</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h4>Position & Timing</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Coordinates:</span>
                    <span className="value value--wide value--wrap">
                      <span className="coord-line">{ac.latitude === null || ac.latitude === undefined ? 'N/A' : `${ac.latitude.toFixed(4)}°`}</span>
                      <span className="coord-line">{ac.longitude === null || ac.longitude === undefined ? '' : `${ac.longitude.toFixed(4)}°`}</span>
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Last Contact:</span>
                    <span className="value">{formatTimeAgo(ac.lastContact)}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Position Time:</span>
                    <span className="value">{formatTimeAgo(ac.timePosition)}</span>
                  </div>
                  {ac.sensors && ac.sensors.length > 0 && (
                    <div className="info-item">
                      <span className="label">Sensors:</span>
                      <span className="value">{ac.sensors.length} active</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="info-section">
                <h4>Technical Details</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Data Age:</span>
                    <span className="value">{formatTimeAgo(ac.lastContact)}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">OpenSky Source:</span>
                    <span className="value">{ac.source || ac.positionSource || 'OpenSky Network'}</span>
                  </div>
                  {ac.sensors && ac.sensors.length > 0 && (
                    <div className="info-item">
                      <span className="label">Sensor Count:</span>
                      <span className="value">{ac.sensors.length}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default AircraftPopup;