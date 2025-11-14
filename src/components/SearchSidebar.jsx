import React from 'react';
import './SearchSidebar.css';
import { SVGFlag } from './SVGFlag';
import AltitudeLegend from './AltitudeLegend';
import ScaleDistance from './ScaleDistance';

const FlightRow = React.memo(function FlightRow({ flight, flipLongitude, onSelectFlight }) {
  const altFt = React.useMemo(() => {
    const altMeters = (flight.baroAltitude ?? flight.geoAltitude) || 0;
    return Math.round(altMeters * 3.28084);
  }, [flight.baroAltitude, flight.geoAltitude]);

  const speedKt = React.useMemo(() => {
    return typeof flight.velocity === 'number' ? Math.round(flight.velocity * 1.94384) : null;
  }, [flight.velocity]);

  const verticalRateFpm = React.useMemo(() => {
    return typeof flight.verticalRate === 'number' ? Math.round(flight.verticalRate * 196.8504) : null;
  }, [flight.verticalRate]);

  const latitude = React.useMemo(() => {
    return typeof flight.latitude === 'number' ? flight.latitude : null;
  }, [flight.latitude]);

  const longitude = React.useMemo(() => {
    if (typeof flight.longitude !== 'number') return null;
    return flipLongitude ? -flight.longitude : flight.longitude;
  }, [flight.longitude, flipLongitude]);

  const displayCallsign = React.useMemo(() => {
    if (!flight.callsign || /^Flight\d+$/i.test(flight.callsign)) {
      return (flight.icao24 || '—').toUpperCase();
    }
    return flight.callsign.toUpperCase();
  }, [flight.callsign, flight.icao24]);

  return (
    <tr style={{ cursor: 'pointer' }} onClick={() => onSelectFlight(flight)}>
      <td className="callsign-cell" data-label="Callsign" style={{ padding: '6px', textTransform: 'uppercase' }}>
        <SVGFlag country={flight.country} size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
        {displayCallsign}
      </td>
      <td data-label="Alt. (ft)" style={{ padding: '6px', textAlign: 'right' }}>{altFt ? altFt.toLocaleString() : '-'}</td>
      <td data-label="Spd. (kt)" style={{ padding: '6px', textAlign: 'right' }}>{speedKt != null ? speedKt.toLocaleString() : '-'}</td>
      <td data-label="V. Rate (ft/min)" style={{ padding: '6px', textAlign: 'right' }}>{verticalRateFpm != null ? verticalRateFpm.toLocaleString() : '-'}</td>
      <td data-label="Latitude" style={{ padding: '6px', textAlign: 'right' }}>{latitude != null ? latitude.toFixed(4) : '-'}</td>
      <td data-label="Longitude" style={{ padding: '6px', textAlign: 'right' }}>{longitude != null ? longitude.toFixed(4) : '-'}</td>
    </tr>
  );
}, (prev, next) => {
  const prevFlight = prev.flight;
  const nextFlight = next.flight;
  if (prev.flipLongitude !== next.flipLongitude) return false;
  if (prev.onSelectFlight !== next.onSelectFlight) return false;
  if (prevFlight === nextFlight) return true;
  if (!prevFlight || !nextFlight) return prevFlight === nextFlight;
  return (
    prevFlight.id === nextFlight.id &&
    prevFlight.callsign === nextFlight.callsign &&
    prevFlight.icao24 === nextFlight.icao24 &&
    prevFlight.country === nextFlight.country &&
    prevFlight.baroAltitude === nextFlight.baroAltitude &&
    prevFlight.geoAltitude === nextFlight.geoAltitude &&
    prevFlight.velocity === nextFlight.velocity &&
    prevFlight.verticalRate === nextFlight.verticalRate &&
    prevFlight.latitude === nextFlight.latitude &&
    prevFlight.longitude === nextFlight.longitude &&
    prevFlight.lastContact === nextFlight.lastContact
  );
});

export default function SearchSidebar({
  open = false,
  onClose = () => {},
  maxAircraft = 500,
  currentFlightCount = 0,
  stylized = false,
  onToggleStylized = () => {},
  onSetMaxAircraft = () => {},
  onSearch = () => {},
  filterAirborne = true,
  filterOnGround = true,
  onSetFilterAirborne = () => {},
  onSetFilterOnGround = () => {},
  enableDeclutter = true,
  onToggleDeclutter = () => {},
  onRefresh = () => {},
  flipLongitude = false,
  onToggleFlipLongitude = () => {},
  // Advanced filters
  altMinFt = null,
  altMaxFt = null,
  callsignFilter = '',
  onSetCallsignFilter = () => {},
  icaoFilter = '',
  onSetIcaoFilter = () => {},
  countryFilter = '',
  onSetCountryFilter = () => {},
  onSetAltMinFt = () => {},
  onSetAltMaxFt = () => {},
  sourceFilters = { ADSB: true, ASTERIX: true, MLAT: true, OTHER: true },
  onToggleSource = () => {},
  flights = [],
  onSelectFlight = () => {},
  totalAvailableCount = 0,
  clockMode = 'UTC',
  onSetClockMode = () => {},
  isCompactLayout = false,
  selectedFlight = null,
  onClearSelected = () => {},
  cameraNm = null,
  controlsHelpOpen = false,
  onToggleControlsHelp = () => {},
}) {
  const [searchInput, setSearchInput] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('search');
  const submit = (e) => {
    e && e.preventDefault && e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    lastSearchRef.current = trimmed;
    onSearchRef.current(trimmed);
  };

  const onSearchRef = React.useRef(onSearch);
  React.useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  const debounceTimerRef = React.useRef(null);
  const lastSearchRef = React.useRef('');

  React.useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed === lastSearchRef.current) return;
      if (!trimmed) {
        lastSearchRef.current = '';
        onSearchRef.current('');
        return;
      }
      if (trimmed.length < 3) return;
      lastSearchRef.current = trimmed;
      onSearchRef.current(trimmed);
    }, 350);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchInput]);

  React.useEffect(() => {
    if (!isCompactLayout) return;
    if (selectedFlight) {
      setActiveTab(prev => (prev === 'flight' ? prev : 'flight'));
    } else {
      setActiveTab(prev => (prev === 'flight' ? 'search' : prev));
    }
  }, [isCompactLayout, selectedFlight]);

  React.useEffect(() => {
    if (!isCompactLayout && activeTab === 'flight') {
      setActiveTab('search');
    }
  }, [isCompactLayout, activeTab]);

  const formatAltitude = React.useCallback((altitudeMeters) => {
    if (altitudeMeters === null || altitudeMeters === undefined) return 'N/A';
    const feet = Math.round(altitudeMeters * 3.28084);
    return `${feet.toLocaleString()} ft`;
  }, []);

  const formatVelocity = React.useCallback((velocityMs) => {
    if (velocityMs === null || velocityMs === undefined) return 'N/A';
    const knots = Math.round(velocityMs * 1.94384);
    return `${knots.toLocaleString()} kts`;
  }, []);

  const formatVerticalRate = React.useCallback((verticalRateMs) => {
    if (verticalRateMs === null || verticalRateMs === undefined) return 'N/A';
    const fpm = Math.round(verticalRateMs * 196.85);
    const direction = fpm > 0 ? 'Climbing' : fpm < 0 ? 'Descending' : 'Level';
    const arrow = fpm > 0 ? '\u2197' : fpm < 0 ? '\u2198' : '\u2192';
    return `${Math.abs(fpm).toLocaleString()} ft/min ${arrow} ${direction}`;
  }, []);

  const formatTimeAgo = React.useCallback((timestamp) => {
    if (!timestamp) return 'N/A';
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    if (diff < 60) return `${Math.round(diff)}s ago`;
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    const hours = Math.round(diff / 3600);
    return `${hours}h ago`;
  }, []);

  const formatHeading = React.useCallback((heading) => {
    if (heading === null || heading === undefined) return 'N/A';
    const rounded = Math.round(heading);
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(rounded / 22.5) % 16;
    const compass = directions[index];
    return `${rounded}° (${compass})`;
  }, []);

  const displayFlightTitle = React.useMemo(() => {
    if (!selectedFlight) return 'No Flight Selected';
    const raw = selectedFlight.callsign;
    if (!raw || /^Flight\d+$/i.test(raw)) {
      return (selectedFlight.icao24 || 'Unknown Aircraft').toUpperCase();
    }
    return raw.toUpperCase();
  }, [selectedFlight]);

  const totalFlightsDisplay = stylized
    ? ((maxAircraft == null)
        ? 'All'
        : Number.isFinite(maxAircraft) ? maxAircraft.toLocaleString() : '0')
    : '0';
  const onScreenCount = (stylized && Number.isFinite(currentFlightCount)) ? currentFlightCount : 0;
  const totalFlightsTitle = (stylized && maxAircraft == null && Number.isFinite(totalAvailableCount))
    ? `${totalAvailableCount.toLocaleString()} available`
    : undefined;



  return (
    <aside className={`search-sidebar ${open ? 'open' : ''}`} role="complementary" aria-hidden={!open}>
      <div className="search-sidebar-header">
        <h3>Search Flights</h3>
        {isCompactLayout && (
          <div className="search-sidebar-actions">
            <button
              type="button"
              className="search-sidebar-close"
              onClick={onClose}
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <svg className="chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M6 6 L14 12 L6 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <div className="search-sidebar-content">
        <div className="tab-nav">
          <button className={activeTab==='search' ? 'active' : ''} onClick={() => setActiveTab('search')}>Search</button>
          <button className={activeTab==='filters' ? 'active' : ''} onClick={() => setActiveTab('filters')}>Filters</button>
          <button className={activeTab==='settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>Settings</button>
          {isCompactLayout && (
            <button className={activeTab==='flight' ? 'active' : ''} onClick={() => setActiveTab('flight')}>Flight Info</button>
          )}
        </div>

        {/* Search Tab */}
        <div className={`tab-panel ${activeTab==='search' ? 'active' : ''}`}>
          <form onSubmit={submit} className="search-group">
            <label htmlFor="flight-search" style={{display:'none'}}>Search</label>
            <input
              id="flight-search"
              className="search-input"
              type="search"
              placeholder="Callsign or ICAO24"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            <div style={{height:8}} />
            <div className="button-row">
              <button type="submit" className="filter-btn primary">Search</button>
              <button
                type="button"
                className="filter-btn"
                onClick={() => {
                  setSearchInput('');
                  lastSearchRef.current = '';
                  onSearchRef.current('');
                }}
              >
                Clear
              </button>
            </div>
            
          </form>

          {/* Flights table */}
          <div style={{marginTop:12}}>
            <div style={{fontSize:'0.9rem', color:'rgba(255,255,255,0.8)', marginBottom:6}}>Results</div>
            <div className="results-scroll">
              <table className="search-results-table" style={{width:'100%', borderCollapse:'collapse', fontSize:'0.88rem'}}>
                <thead>
                  <tr className="sticky-header">
                    <th style={{textAlign:'left', padding:'6px'}}>Callsign</th>
                    <th style={{textAlign:'right', padding:'6px'}}>Alt. (ft)</th>
                    <th style={{textAlign:'right', padding:'6px'}}>Spd. (kt)</th>
                    <th style={{textAlign:'right', padding:'6px'}}>V. Rate (ft/min)</th>
                    <th style={{textAlign:'right', padding:'6px'}}>Latitude</th>
                    <th style={{textAlign:'right', padding:'6px'}}>Longitude</th>
                  </tr>
                </thead>
                <tbody>
                  {flights.length === 0 ? (
                    <tr><td colSpan={6} style={{padding:'8px', color:'rgba(255,255,255,0.7)'}}>No flights</td></tr>
                  ) : flights.map(f => (
                    <FlightRow
                      key={f.id}
                      flight={f}
                      flipLongitude={flipLongitude}
                      onSelectFlight={onSelectFlight}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Filters Tab */}
        <div className={`tab-panel ${activeTab==='filters' ? 'active' : ''}`}>
          <div className="filters-panel">
            <div className="filter-block">
              <div className="filter-label">Filter by altitude</div>
              <div className="filter-row">
                <div className="filter-field narrow">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="min"
                    value={altMinFt ?? ''}
                    onChange={e => {
                      const v = e.target.value;
                      onSetAltMinFt(v === '' ? null : Number(v));
                    }}
                  />
                  <span className="filter-suffix">ft</span>
                </div>
                <span className="filter-separator">to</span>
                <div className="filter-field narrow">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="max"
                    value={altMaxFt ?? ''}
                    onChange={e => {
                      const v = e.target.value;
                      onSetAltMaxFt(v === '' ? null : Number(v));
                    }}
                  />
                  <span className="filter-suffix">ft</span>
                </div>
                <div className="filter-actions">
                  <button
                    type="button"
                    className="filter-btn primary"
                    onClick={() => {
                      onSetAltMinFt(altMinFt ?? null);
                      onSetAltMaxFt(altMaxFt ?? null);
                    }}
                  >Filter</button>
                  <button type="button" className="filter-btn" onClick={() => { onSetAltMinFt(null); onSetAltMaxFt(null); }}>Reset</button>
                </div>
              </div>
            </div>

            <div className="filter-block">
              <div className="filter-label">Filter by callsign</div>
              <div className="filter-row">
                <div className="filter-field stretch">
                  <input
                    type="text"
                    inputMode="text"
                    placeholder="e.g. UAL123"
                    value={callsignFilter}
                    onChange={e => onSetCallsignFilter(e.target.value.toUpperCase())}
                    spellCheck={false}
                  />
                </div>
                <div className="filter-actions">
                  <button type="button" className="filter-btn" onClick={() => onSetCallsignFilter('')}>Reset</button>
                </div>
              </div>
            </div>

            <div className="filter-block">
              <div className="filter-label">Filter by ICAO hex ID</div>
              <div className="filter-row">
                <div className="filter-field stretch">
                  <input
                    type="text"
                    inputMode="text"
                    placeholder="e.g. A1B2C3"
                    value={icaoFilter}
                    onChange={e => {
                      const raw = e.target.value;
                      const sanitized = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).toUpperCase();
                      onSetIcaoFilter(sanitized);
                    }}
                    onKeyDown={e => {
                      const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End'];
                      if (allowed.includes(e.key)) return;
                      if (!/^[0-9a-fA-F]$/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    spellCheck={false}
                  />
                </div>
                <div className="filter-actions">
                  <button type="button" className="filter-btn" onClick={() => onSetIcaoFilter('')}>Reset</button>
                </div>
              </div>
            </div>

            <div className="filter-block">
              <div className="filter-label">Filter by country</div>
              <div className="filter-row">
                <div className="filter-field stretch">
                  <input
                    type="text"
                    inputMode="text"
                    placeholder="e.g. United States"
                    value={countryFilter}
                    onChange={e => onSetCountryFilter(e.target.value)}
                  />
                </div>
                <div className="filter-actions">
                  <button type="button" className="filter-btn" onClick={() => onSetCountryFilter('')}>Reset</button>
                </div>
              </div>
            </div>

            <div className="filter-block">
              <div className="filter-label">Filter by status</div>
              <div className="filter-row wrap">
                <button
                  type="button"
                  className={`filter-pill ${filterAirborne ? 'active' : ''}`}
                  onClick={() => onSetFilterAirborne(!filterAirborne)}
                >Airborne</button>
                <button
                  type="button"
                  className={`filter-pill ${filterOnGround ? 'active' : ''}`}
                  onClick={() => onSetFilterOnGround(!filterOnGround)}
                >On Ground</button>
                <div className="filter-actions">
                  <button type="button" className="filter-btn" onClick={() => { onSetFilterAirborne(true); onSetFilterOnGround(true); }}>Reset</button>
                </div>
              </div>
            </div>

            <div className="filter-block">
              <div className="filter-label">Filter by source</div>
              <div className="filter-row wrap">
                {[
                  ['ADS-B','ADSB'],
                  ['ASTERIX','ASTERIX'],
                  ['MLAT','MLAT'],
                  ['Unknown','OTHER']
                ].map(([label,key]) => (
                  <button
                    key={key}
                    type="button"
                    className={`filter-source-btn ${key.toLowerCase()} ${sourceFilters?.[key] ? 'active' : ''}`}
                    onClick={() => onToggleSource(key)}
                  >{label}</button>
                ))}
                <div className="filter-actions">
                  <button
                    type="button"
                    className="filter-btn"
                    onClick={() => {
                      ['ADSB', 'ASTERIX', 'MLAT', 'OTHER'].forEach(key => {
                        if (!sourceFilters?.[key]) onToggleSource(key);
                      });
                    }}
                  >Reset</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Tab */}
        <div className={`tab-panel ${activeTab==='settings' ? 'active' : ''}`}>
          <div className="filters-panel settings-panel">
            <div className="settings-row">
              <div className="settings-list">
                <label className="settings-toggle">
                  <input type="checkbox" checked={enableDeclutter} onChange={onToggleDeclutter} />
                  <span className="settings-toggle-title">Declutter</span>
                </label>
              </div>
            </div>

            <div className="filter-block">
              <div className="filter-label">Max aircraft</div>
              <div className="filter-row wrap">
                {[100, 200, 500, null].map(option => (
                  <button
                    key={option ?? 'all'}
                    type="button"
                    className={`filter-pill ${maxAircraft === option ? 'active' : ''}`}
                    onClick={() => onSetMaxAircraft(option)}
                  >{option ?? 'All'}</button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-list">
                <label className="settings-toggle">
                  <input type="checkbox" checked={stylized} onChange={onToggleStylized} />
                  <span className="settings-toggle-title">Flight Visualisation</span>
                </label>
              </div>
            </div>

            <div className="filter-block">
              <div className="filter-label">Clock display</div>
              <div className="filter-row wrap">
                {[['UTC','UTC'], ['Local','LOCAL']].map(([label,value]) => (
                  <button
                    key={value}
                    type="button"
                    className={`filter-pill ${clockMode === value ? 'active' : ''}`}
                    onClick={() => onSetClockMode(value)}
                  >{label}</button>
                ))}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginTop: 6 }}></div>
            </div>

            <div className="settings-row">
              <div className="settings-stat-pair">
                <div className="settings-stat">
                  <span className="settings-stat-label">Total Aircrafts</span>
                  <span className="settings-stat-value" title={totalFlightsTitle}>{totalFlightsDisplay}</span>
                </div>
                <div className="settings-stat">
                  <span className="settings-stat-label">On Screen</span>
                  <span className="settings-stat-value">{onScreenCount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {isCompactLayout && (
              <div className="filter-block settings-controls-box">
                <div className="filter-label">Controls</div>
                <ul className="settings-controls-list">
                  <li>Tap a point to select; tap again to deselect</li>
                  <li>Right panel — Search / Filters / Settings / Details</li>
                </ul>
              </div>
            )}

            {isCompactLayout && (
              <div className="settings-legend-footer">
                <AltitudeLegend layout="sidebar" />
                <div className="settings-distance">
                  <div className="settings-distance-caption">Camera distance</div>
                  {cameraNm != null ? (
                    <ScaleDistance nm={cameraNm} thresholdNM={0} inline />
                  ) : (
                    <div className="scale-distance-placeholder">Camera range appears once the globe initializes.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {isCompactLayout && (
          <div className={`tab-panel ${activeTab==='flight' ? 'active' : ''}`}>
            <div className="flight-info-panel">
              {selectedFlight ? (
                <>
                  <div className="flight-info-header">
                    <div className="flight-info-title">
                      {selectedFlight.country && (
                        <SVGFlag country={selectedFlight.country} size={20} style={{ marginRight: 8 }} />
                      )}
                      {displayFlightTitle}
                    </div>
                    <button
                      type="button"
                      className="filter-btn"
                      onClick={() => onClearSelected()}
                    >
                      Clear
                    </button>
                  </div>

                  <div className="flight-info-section">
                    <div className="flight-info-section-title">Aircraft Information</div>
                    <div className="flight-info-grid">
                      <div className="flight-info-item"><span>Callsign</span><span>{selectedFlight.callsign || 'N/A'}</span></div>
                      <div className="flight-info-item"><span>ICAO24</span><span>{selectedFlight.icao24 || 'N/A'}</span></div>
                      <div className="flight-info-item"><span>Country</span><span>{selectedFlight.country || 'N/A'}</span></div>
                      <div className="flight-info-item"><span>Status</span><span>{selectedFlight.status || (selectedFlight.onGround ? 'On Ground' : 'Airborne')}</span></div>
                      <div className="flight-info-item"><span>Source</span><span>{selectedFlight.source || selectedFlight.positionSource || 'N/A'}</span></div>
                      {selectedFlight.squawk && (
                        <div className="flight-info-item"><span>Squawk</span><span>{selectedFlight.squawk}</span></div>
                      )}
                    </div>
                  </div>

                  <div className="flight-info-section">
                    <div className="flight-info-section-title">Flight Data</div>
                    <div className="flight-info-grid">
                      <div className="flight-info-item"><span>Barometric Altitude</span><span>{formatAltitude(selectedFlight.baroAltitude)}</span></div>
                      {selectedFlight.geoAltitude != null && (
                        <div className="flight-info-item"><span>Geometric Altitude</span><span>{formatAltitude(selectedFlight.geoAltitude)}</span></div>
                      )}
                      <div className="flight-info-item"><span>Ground Speed</span><span>{formatVelocity(selectedFlight.velocity)}</span></div>
                      <div className="flight-info-item"><span>Heading</span><span>{formatHeading(selectedFlight.heading)}</span></div>
                      <div className="flight-info-item"><span>Vertical Rate</span><span>{formatVerticalRate(selectedFlight.verticalRate)}</span></div>
                    </div>
                  </div>

                  <div className="flight-info-section">
                    <div className="flight-info-section-title">Position & Timing</div>
                    <div className="flight-info-grid">
                      <div className="flight-info-item">
                        <span>Coordinates</span>
                        <span className="flight-info-multiline">
                          <span>{selectedFlight.latitude == null ? 'N/A' : `${selectedFlight.latitude.toFixed(4)}°`}</span>
                          {selectedFlight.longitude != null && (
                            <span>{selectedFlight.longitude.toFixed(4)}°</span>
                          )}
                        </span>
                      </div>
                      <div className="flight-info-item"><span>Last Contact</span><span>{formatTimeAgo(selectedFlight.lastContact)}</span></div>
                      <div className="flight-info-item"><span>Position Time</span><span>{formatTimeAgo(selectedFlight.timePosition)}</span></div>
                      {Array.isArray(selectedFlight.sensors) && selectedFlight.sensors.length > 0 && (
                        <div className="flight-info-item"><span>Sensors</span><span>{selectedFlight.sensors.length} active</span></div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flight-info-empty">
                  <div className="flight-info-empty-title">No flight selected</div>
                  <div className="flight-info-empty-body">Pick a flight from the globe or search results to view its details here.</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}