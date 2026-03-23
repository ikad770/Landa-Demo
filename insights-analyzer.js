const HEALTH_LEVELS = [
  { label: 'Healthy', min: 0, max: 49, color: '#22c55e' },
  { label: 'Monitor', min: 50, max: 80, color: '#eab308' },
  { label: 'Warning', min: 81, max: 150, color: '#f97316' },
  { label: 'Critical', min: 151, max: Number.POSITIVE_INFINITY, color: '#ef4444' }
];

const SECTION_OPTIONS = [
  { key: 'summary', label: 'Summary' },
  { key: 'machines', label: 'Machines' },
  { key: 'insights', label: 'Insights' },
  { key: 'trends', label: 'Trends' },
  { key: 'subsystems', label: 'Subsystems' }
];

const COLUMN_ALIASES = {
  machine: ['press', 'press name', 'machine', 'machine name', 'name', 'press id'],
  model: ['model', 'press model', 'machine model'],
  title: ['alert message title', 'alert title', 'message title', 'title', 'alert'],
  body: ['alert message body', 'alert body', 'message body', 'body', 'description'],
  solution: ['alert message solution', 'solution', 'recommended solution', 'recommendation'],
  startTime: ['start time', 'start', 'event start', 'time', 'timestamp'],
  duration: ['duration', 'downtime', 'duration min', 'duration minutes', 'elapsed'],
  recovery: ['recovery', 'recovered', 'recovery status', 'recovery action'],
  preErrorState: ['pre error state', 'pre-error state', 'pre state', 'state before'],
  subsystem: ['subsystem', 'sub system', 'system', 'module'],
  errorState: ['error state', 'severity', 'state', 'status'],
  version: ['version', 'software version', 'sw version', 'release'],
  eventId: ['event id', 'id', 'incident id'],
};

const state = {
  rawEvents: [],
  normalizedEvents: [],
  filteredEvents: [],
  filters: {
    dateFrom: '',
    dateTo: '',
    machine: 'all',
    subsystem: 'all',
    errorState: 'all',
    model: 'all',
    version: 'all',
    search: ''
  },
  summary: null,
  charts: {},
  selectedMachine: null,
  columnMap: null,
  currentFileName: '',
  visibleSections: new Set(SECTION_OPTIONS.map((section) => section.key))
};

const els = {};

document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  bootstrapNavigation();
  bindUploadEvents();
  bindFilterEvents();
  bindActionEvents();
  renderInitialState();
});

function cacheDom() {
  [
    'drop-zone', 'file-input', 'upload-status', 'analysis-shell', 'empty-state', 'loading-state',
    'filter-date-from', 'filter-date-to', 'filter-machine', 'filter-subsystem', 'filter-error-state',
    'filter-model', 'filter-version', 'filter-search', 'machine-panel', 'machine-panel-close',
    'machine-panel-content', 'report-modal', 'report-modal-content', 'report-modal-close',
    'export-report', 'copy-summary', 'print-report', 'reset-analysis', 'dataset-name',
    'column-map', 'alerts-strip', 'kpi-grid', 'problematic-machines', 'executive-summary',
    'fleet-health-grid', 'action-summary', 'upload-meta', 'smart-insights', 'section-selector'
  ].forEach((id) => {
    els[toCamel(id)] = document.getElementById(id);
  });

  [
    'chart-error-trend', 'chart-subsystem-distribution', 'chart-top-errors'
  ].forEach((id) => {
    els[toCamel(id)] = document.getElementById(id);
  });
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function bootstrapNavigation() {
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('landaUser') || '{}');
    } catch (error) {
      return {};
    }
  })();

  const name = user.username || 'Expert User';
  const role = (user.role || user.type || 'expert').toUpperCase();
  const avatar = name.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'EX';

  const nameEl = document.getElementById('nav-user-name');
  const roleEl = document.getElementById('nav-user-role');
  const avatarEl = document.getElementById('nav-user-avatar');
  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = `${role} ACCESS`;
  if (avatarEl) avatarEl.textContent = avatar;

  window.logout = () => {
    localStorage.removeItem('landaUser');
    window.location.href = 'index.html';
  };
}

function bindUploadEvents() {
  const dropZone = els.dropZone;
  const fileInput = els.fileInput;

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (eventName === 'drop') {
        const file = event.dataTransfer?.files?.[0];
        if (file) processUpload(file);
      }
      dropZone.classList.remove('drag-active');
    });
  });

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) processUpload(file);
  });
}

function bindFilterEvents() {
  const mappings = {
    filterDateFrom: 'dateFrom',
    filterDateTo: 'dateTo',
    filterMachine: 'machine',
    filterSubsystem: 'subsystem',
    filterErrorState: 'errorState',
    filterModel: 'model',
    filterVersion: 'version',
    filterSearch: 'search'
  };

  Object.entries(mappings).forEach(([elementKey, filterKey]) => {
    els[elementKey].addEventListener('input', (event) => {
      state.filters[filterKey] = event.target.value;
      recomputeFilteredView();
    });
    if (els[elementKey].tagName === 'SELECT') {
      els[elementKey].addEventListener('change', (event) => {
        state.filters[filterKey] = event.target.value;
        recomputeFilteredView();
      });
    }
  });
}

function bindActionEvents() {
  els.resetAnalysis.addEventListener('click', resetAnalysis);
  els.machinePanelClose.addEventListener('click', closeMachinePanel);
  els.reportModalClose.addEventListener('click', () => els.reportModal.classList.add('hidden'));
  els.exportReport.addEventListener('click', openReportModal);
  els.copySummary.addEventListener('click', copySummaryToClipboard);
  els.printReport.addEventListener('click', () => window.print());

  els.reportModal.addEventListener('click', (event) => {
    if (event.target === els.reportModal) els.reportModal.classList.add('hidden');
  });
  els.machinePanel.addEventListener('click', (event) => {
    if (event.target === els.machinePanel) closeMachinePanel();
  });

  renderSectionSelector();
}

function renderInitialState() {
  setUploadStatus('Upload an Insight export in CSV or XLSX to unlock the fleet analytics workspace.', 'info');
  els.analysisShell.classList.add('hidden');
  els.emptyState.classList.remove('hidden');
  els.loadingState.classList.add('hidden');
}

async function processUpload(file) {
  const fileName = file.name.toLowerCase();
  const valid = fileName.endsWith('.csv') || fileName.endsWith('.xlsx');
  if (!valid) {
    setUploadStatus('Invalid file type. Please upload a .csv or .xlsx Insight export.', 'error');
    return;
  }

  try {
    setLoading(true, `Analyzing ${file.name}…`);
    state.currentFileName = file.name;

    const rows = fileName.endsWith('.csv')
      ? parseCsv(await file.text())
      : parseWorkbook(await file.arrayBuffer());

    if (!rows.length) {
      throw new Error('The uploaded file contains no rows to analyze.');
    }

    const normalization = normalizeDataset(rows);
    state.rawEvents = rows;
    state.normalizedEvents = normalization.events;
    state.columnMap = normalization.columnMap;

    if (!state.normalizedEvents.length) {
      throw new Error('No usable machine events were found after normalization. Check the file columns and data content.');
    }

    initializeFilters();
    recomputeFilteredView(true);
    setUploadStatus(`Analysis ready. ${state.normalizedEvents.length} machine events loaded from ${file.name}.`, 'success');
  } catch (error) {
    console.error(error);
    setUploadStatus(error.message || 'We could not analyze the uploaded file.', 'error');
    resetAnalysis(false);
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading, message = 'Analyzing file…') {
  els.loadingState.classList.toggle('hidden', !isLoading);
  els.loadingState.querySelector('span').textContent = message;
  if (isLoading) {
    els.analysisShell.classList.add('hidden');
    els.emptyState.classList.add('hidden');
  }
}

function setUploadStatus(message, mode) {
  els.uploadStatus.textContent = message;
  els.uploadStatus.className = `status-pill status-${mode}`;
}

function parseCsv(text) {
  if (typeof Papa === 'undefined') {
    throw new Error('CSV parser is unavailable in this environment.');
  }
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (header) => header.trim()
  });
  if (parsed.errors?.length && parsed.data.length === 0) {
    throw new Error(`CSV parsing failed: ${parsed.errors[0].message}`);
  }
  return parsed.data.filter((row) => Object.values(row).some((value) => String(value || '').trim()));
}

function parseWorkbook(buffer) {
  if (typeof XLSX === 'undefined') {
    throw new Error('Excel parser is unavailable in this environment.');
  }
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('The workbook does not contain any worksheets.');
  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { defval: '' });
}

function normalizeDataset(rows) {
  const headers = Object.keys(rows[0] || {});
  const columnMap = {};

  Object.entries(COLUMN_ALIASES).forEach(([target, aliases]) => {
    const match = headers.find((header) => aliases.includes(normalizeHeader(header)));
    if (match) columnMap[target] = match;
  });

  if (!columnMap.machine || !columnMap.startTime) {
    throw new Error('Required columns are missing. A machine column and Start Time column are required.');
  }

  const events = rows.map((row, index) => normalizeRow(row, index, columnMap)).filter(Boolean);
  return { events, columnMap };
}

function normalizeRow(row, index, columnMap) {
  const rawStart = getMappedValue(row, columnMap.startTime);
  const startTime = parseDate(rawStart);
  if (!startTime) return null;

  const machine = cleanText(getMappedValue(row, columnMap.machine), 'Unknown Machine');
  const title = cleanText(getMappedValue(row, columnMap.title), 'Unspecified Alert');
  const body = cleanText(getMappedValue(row, columnMap.body), 'No alert body provided');
  const solution = cleanText(getMappedValue(row, columnMap.solution), 'No recommended solution provided');
  const subsystem = cleanText(getMappedValue(row, columnMap.subsystem), 'Unknown Subsystem');
  const errorState = cleanText(getMappedValue(row, columnMap.errorState), inferErrorState(title, body));
  const recovery = cleanText(getMappedValue(row, columnMap.recovery), 'Unknown');
  const preErrorState = cleanText(getMappedValue(row, columnMap.preErrorState), 'Unknown');
  const version = cleanText(getMappedValue(row, columnMap.version), 'Unknown');
  const model = cleanText(getMappedValue(row, columnMap.model), 'Unknown');
  const durationMinutes = parseDurationToMinutes(getMappedValue(row, columnMap.duration));
  const severityWeight = getSeverityWeight(errorState, title, body);

  return {
    id: cleanText(getMappedValue(row, columnMap.eventId), `event-${index + 1}`),
    machine,
    model,
    title,
    body,
    solution,
    subsystem,
    errorState,
    recovery,
    preErrorState,
    version,
    startTime,
    durationMinutes,
    severityWeight,
    text: `${machine} ${model} ${title} ${body} ${subsystem} ${errorState}`.toLowerCase(),
    dayKey: formatDateKey(startTime),
    hourBucket: `${String(startTime.getHours()).padStart(2, '0')}:00`,
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][startTime.getDay()],
    raw: row
  };
}

function getMappedValue(row, key) {
  return key ? row[key] : '';
}

function normalizeHeader(header) {
  return String(header || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function cleanText(value, fallback = 'Unknown') {
  const text = String(value == null ? '' : value).trim();
  return text || fallback;
}

function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number' && typeof XLSX !== 'undefined') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S);
  }
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) return direct;

  const match = normalized.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  const [, a, b, c, hh = '0', mm = '0', ss = '0'] = match;
  const year = c.length === 2 ? Number(`20${c}`) : Number(c);
  const first = Number(a);
  const second = Number(b);
  const month = first > 12 ? second - 1 : first - 1;
  const day = first > 12 ? first : second;
  return new Date(year, month, day, Number(hh), Number(mm), Number(ss));
}

function parseDurationToMinutes(value) {
  if (typeof value === 'number') return Math.max(0, Number(value));
  const text = String(value || '').trim().toLowerCase();
  if (!text) return 0;
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);
  const timeMatch = text.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/);
  if (timeMatch && timeMatch[0].trim()) {
    const hours = Number(timeMatch[1] || 0);
    const minutes = Number(timeMatch[2] || 0);
    const seconds = Number(timeMatch[3] || 0);
    return hours * 60 + minutes + seconds / 60;
  }
  const hhmmss = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hhmmss) {
    const hours = Number(hhmmss[1]);
    const minutes = Number(hhmmss[2]);
    const seconds = Number(hhmmss[3] || 0);
    return hours * 60 + minutes + seconds / 60;
  }
  return 0;
}

function inferErrorState(title, body) {
  const signal = `${title} ${body}`.toLowerCase();
  if (/critical|fatal|emergency|stopped|shutdown/.test(signal)) return 'Critical';
  if (/warning|degraded|unstable|slow/.test(signal)) return 'Warning';
  if (/monitor|notice|check/.test(signal)) return 'Monitor';
  return 'Unknown';
}

function getSeverityWeight(errorState, title, body) {
  const signal = `${errorState} ${title} ${body}`.toLowerCase();
  if (/critical|fatal|emergency|shutdown/.test(signal)) return 10;
  if (/error|fault|failed|failure|stop/.test(signal)) return 7;
  if (/warning|unstable|degraded/.test(signal)) return 4;
  return 2;
}

function initializeFilters() {
  const dates = state.normalizedEvents.map((event) => event.startTime).sort((a, b) => a - b);
  state.filters.dateFrom = formatDateInput(dates[0]);
  state.filters.dateTo = formatDateInput(dates[dates.length - 1]);

  els.filterDateFrom.value = state.filters.dateFrom;
  els.filterDateTo.value = state.filters.dateTo;

  populateSelect(els.filterMachine, uniqueSorted(state.normalizedEvents.map((event) => event.machine)));
  populateSelect(els.filterSubsystem, uniqueSorted(state.normalizedEvents.map((event) => event.subsystem)));
  populateSelect(els.filterErrorState, uniqueSorted(state.normalizedEvents.map((event) => event.errorState)));
  populateSelect(els.filterModel, uniqueSorted(state.normalizedEvents.map((event) => event.model)));
  populateSelect(els.filterVersion, uniqueSorted(state.normalizedEvents.map((event) => event.version)));

  els.filterSearch.value = '';
  els.datasetName.textContent = state.currentFileName;
  els.uploadMeta.textContent = `${state.normalizedEvents.length} events normalized across ${uniqueSorted(state.normalizedEvents.map((event) => event.machine)).length} machines.`;
  els.columnMap.innerHTML = Object.entries(state.columnMap)
    .map(([key, value]) => `<span class="meta-chip">${labelize(key)} → ${value}</span>`)
    .join('');
}

function populateSelect(select, values) {
  const current = select.value || 'all';
  select.innerHTML = '<option value="all">All</option>' + values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  select.value = values.includes(current) ? current : 'all';
}

function recomputeFilteredView(resetMachineSelection = false) {
  if (!state.normalizedEvents.length) return;
  const filtered = applyFilters(state.normalizedEvents, state.filters);
  state.filteredEvents = filtered;
  state.summary = buildAnalytics(filtered, state.normalizedEvents, state.filters);

  els.analysisShell.classList.toggle('hidden', false);
  els.emptyState.classList.toggle('hidden', true);

  renderKPIs();
  renderFleetHealth();
  renderActionSummary();
  renderProblematicMachines();
  renderSmartInsights();
  renderExecutiveSummary();
  renderCharts();
  updateVisibleSections();

  if (resetMachineSelection) closeMachinePanel();
  if (state.selectedMachine) renderMachineDetails(state.selectedMachine);
}

function applyFilters(events, filters) {
  const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
  const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;
  const search = filters.search.trim().toLowerCase();

  return events.filter((event) => {
    if (from && event.startTime < from) return false;
    if (to && event.startTime > to) return false;
    if (filters.machine !== 'all' && event.machine !== filters.machine) return false;
    if (filters.subsystem !== 'all' && event.subsystem !== filters.subsystem) return false;
    if (filters.errorState !== 'all' && event.errorState !== filters.errorState) return false;
    if (filters.model !== 'all' && event.model !== filters.model) return false;
    if (filters.version !== 'all' && event.version !== filters.version) return false;
    if (search && !event.text.includes(search)) return false;
    return true;
  });
}

function buildAnalytics(filteredEvents, baselineEvents, filters) {
  const machines = Array.from(groupBy(filteredEvents, 'machine').entries()).map(([machine, events]) => buildMachineMetrics(machine, events));
  machines.sort((a, b) => b.riskScore - a.riskScore || b.totalDowntime - a.totalDowntime);

  const totalDowntime = filteredEvents.reduce((sum, event) => sum + event.durationMinutes, 0);
  const topErrors = getTopCounts(filteredEvents, (event) => event.title, 5);
  const topSubsystems = getTopCounts(filteredEvents, (event) => event.subsystem, 5);
  const mostCommonAlertsBySubsystem = buildNestedCounts(filteredEvents, 'subsystem', 'title');
  const dateRange = getAnalyzedDateRange(filteredEvents, filters);
  const recoveryDistribution = getTopCounts(filteredEvents, (event) => event.recovery, 6);
  const versionAnalysis = Array.from(groupBy(filteredEvents, 'version').entries()).map(([version, events]) => ({
    version,
    events: events.length,
    downtime: sum(events, 'durationMinutes'),
    avgRisk: average(events.map((event) => event.severityWeight))
  }));
  const highDurationThreshold = getHighDurationThreshold(filteredEvents);

  const worseningMachines = machines.filter((machine) => machine.trendDirection === 'Worsening').slice(0, 5);
  const concentratedFailures = machines.filter((machine) => machine.subsystemConcentration >= 0.55).slice(0, 5);
  const recoveryLoops = machines.filter((machine) => machine.recoveryLoopCount > 0).slice(0, 5);
  const unusualPatterns = [
    ...worseningMachines.map((machine) => `${machine.machine} shows a worsening recent trend with ${machine.recentWindowErrors} recent events.`),
    ...concentratedFailures.map((machine) => `${machine.machine} has ${Math.round(machine.subsystemConcentration * 100)}% of failures concentrated in ${machine.topSubsystem}.`),
    ...recoveryLoops.map((machine) => `${machine.machine} entered ${machine.recoveryLoopCount} recovery/failure loops.`)
  ].slice(0, 6);

  const focusAreas = deriveFocusAreas(machines, topSubsystems, topErrors);
  const fleetHealth = buildFleetHealth(filteredEvents, machines);
  const smartInsights = buildSmartInsights(filteredEvents, machines, topErrors, topSubsystems, highDurationThreshold);

  return {
    machines,
    filteredEvents,
    totalDowntime,
    topErrors,
    topSubsystems,
    mostCommonAlertsBySubsystem,
    dateRange,
    recoveryDistribution,
    versionAnalysis,
    worseningMachines,
    concentratedFailures,
    recoveryLoops,
    unusualPatterns,
    focusAreas,
    fleetHealth,
    smartInsights,
    highDurationThreshold,
    baselineEventsCount: baselineEvents.length
  };
}

function buildMachineMetrics(machine, events) {
  const totalErrors = events.length;
  const totalDowntime = sum(events, 'durationMinutes');
  const avgDuration = totalErrors ? totalDowntime / totalErrors : 0;
  const errorCounts = countBy(events, (event) => event.title);
  const subsystemCounts = countBy(events, (event) => event.subsystem);
  const recoveryCounts = countBy(events, (event) => event.recovery);
  const preErrorCounts = countBy(events, (event) => event.preErrorState);
  const errorStateCounts = countBy(events, (event) => event.errorState);
  const sortedByTime = [...events].sort((a, b) => a.startTime - b.startTime);
  const midpoint = Math.floor(sortedByTime.length / 2) || 1;
  const previousWindow = sortedByTime.slice(0, midpoint);
  const recentWindow = sortedByTime.slice(midpoint);
  const recentWindowErrors = recentWindow.length;
  const priorWindowErrors = previousWindow.length;
  const trendDelta = recentWindowErrors - priorWindowErrors;
  const repeatedErrorCount = Array.from(errorCounts.values()).filter((count) => count > 1).reduce((acc, count) => acc + count - 1, 0);
  const subsystemConcentration = totalErrors ? Math.max(...subsystemCounts.values()) / totalErrors : 0;
  const recoveryLoopCount = countRecoveryLoops(sortedByTime);
  const criticalCount = Array.from(errorStateCounts.entries()).filter(([key]) => /critical|fatal|emergency/i.test(key)).reduce((acc, [, count]) => acc + count, 0);
  const problematicPreStateCount = Array.from(preErrorCounts.entries()).filter(([key]) => /idle|recover|standby|ready|print/i.test(key)).reduce((acc, [, count]) => acc + count, 0);
  const burstCount = countBurstEvents(sortedByTime, 180);

  const riskScore = Math.round(
    totalErrors +
    Math.min(120, totalDowntime / 4) +
    repeatedErrorCount * 4 +
    Math.round(subsystemConcentration * 35) +
    recoveryLoopCount * 10 +
    criticalCount * 5 +
    Math.max(0, trendDelta) * 6 +
    burstCount * 4 +
    Math.min(40, avgDuration / 5)
  );

  const health = HEALTH_LEVELS.find((level) => riskScore >= level.min && riskScore <= level.max) || HEALTH_LEVELS[HEALTH_LEVELS.length - 1];
  const topError = getTopEntry(errorCounts);
  const topSubsystem = getTopEntry(subsystemCounts);
  const trendDirection = trendDelta >= 2 ? 'Worsening' : trendDelta <= -2 ? 'Improving' : 'Stable';
  const reasons = [];
  if (criticalCount) reasons.push(`${criticalCount} critical-state events`);
  if (totalDowntime > 180) reasons.push(`${formatMinutes(totalDowntime)} downtime`);
  if (repeatedErrorCount > 2) reasons.push(`${repeatedErrorCount} repeat failures`);
  if (subsystemConcentration >= 0.55) reasons.push(`failure concentration in ${topSubsystem.key}`);
  if (recoveryLoopCount) reasons.push(`${recoveryLoopCount} recovery loop${recoveryLoopCount > 1 ? 's' : ''}`);
  if (trendDirection === 'Worsening') reasons.push('recent trend is worsening');

  const recommendation = deriveMachineRecommendation(events, topSubsystem.key, topError.key);

  return {
    machine,
    model: events[0]?.model || 'Unknown',
    version: events[0]?.version || 'Unknown',
    totalErrors,
    totalDowntime,
    avgDuration,
    topError: topError.key,
    topErrorCount: topError.value,
    topSubsystem: topSubsystem.key,
    topSubsystemCount: topSubsystem.value,
    recoveryRate: totalErrors ? ((recoveryCounts.get('Recovered') || 0) / totalErrors) * 100 : 0,
    riskScore,
    severityLevel: health.label,
    severityColor: health.color,
    trendDirection,
    trendDelta,
    subsystemConcentration,
    repeatedErrorCount,
    recoveryLoopCount,
    criticalCount,
    recentWindowErrors,
    recommendation,
    reasons,
    interpretation: buildInterpretation(health.label, trendDirection, topSubsystem.key, topError.key),
    eventTimeline: sortedByTime,
    errorCounts,
    subsystemCounts,
    recoveryCounts,
    preErrorCounts,
    errorStateCounts,
    burstCount,
    sameErrorConcentration: totalErrors ? topError.value / totalErrors : 0,
    problematicAreas: deriveProblematicAreas(events, topSubsystem.key, topError.key)
  };
}

function countRecoveryLoops(events) {
  let loops = 0;
  for (let index = 1; index < events.length; index += 1) {
    const previous = events[index - 1];
    const current = events[index];
    const gapMinutes = (current.startTime - previous.startTime) / 60000;
    if (/recover/i.test(previous.recovery) && previous.title === current.title && gapMinutes <= 720) {
      loops += 1;
    }
  }
  return loops;
}

function countBurstEvents(events, shortWindowMinutes) {
  let bursts = 0;
  for (let index = 0; index < events.length; index += 1) {
    const start = events[index].startTime;
    let windowCount = 1;
    for (let lookahead = index + 1; lookahead < events.length; lookahead += 1) {
      if ((events[lookahead].startTime - start) / 60000 <= shortWindowMinutes) windowCount += 1;
      else break;
    }
    if (windowCount >= 3) bursts += 1;
  }
  return bursts;
}

function deriveMachineRecommendation(events, topSubsystem, topError) {
  const matching = events.find((event) => event.solution && event.solution !== 'No recommended solution provided');
  const fallback = `Inspect ${topSubsystem} first, validate conditions behind “${topError}”, and review recent recoveries for repeat escalation.`;
  return matching ? `${matching.solution}. Prioritize ${topSubsystem} checks.` : fallback;
}

function buildInterpretation(level, trend, subsystem, error) {
  if (level === 'Critical') return `Immediate service attention required. ${subsystem} is repeatedly driving ${error}.`;
  if (level === 'Warning') return `Active degradation detected. Monitor ${subsystem} and interrupt repeat ${error} sequences.`;
  if (level === 'Monitor') return `Emerging risk pattern. Keep ${subsystem} under watch and verify recurrence of ${error}.`;
  return `Machine is operating within normal tolerance. Continue routine checks around ${subsystem}.`;
}

function deriveProblematicAreas(events, topSubsystem, topError) {
  const snippets = [];
  const solutionText = events.map((event) => event.solution).find((value) => value && !/No recommended/i.test(value));
  if (topError) snippets.push(`Repeat error: ${topError}`);
  if (topSubsystem) snippets.push(`Subsystem: ${topSubsystem}`);
  if (solutionText) snippets.push(`Suggested check: ${solutionText}`);
  return snippets;
}

function deriveFocusAreas(machines, topSubsystems, topErrors) {
  const focusAreas = [];
  if (machines.some((machine) => machine.trendDirection === 'Worsening')) {
    focusAreas.push('Stabilize machines with worsening recent trends before the next production window.');
  }
  if (topSubsystems[0]) {
    focusAreas.push(`Run preventive inspection plans for ${topSubsystems[0].key}, the most failure-prone subsystem in the filtered fleet.`);
  }
  if (topErrors[0]) {
    focusAreas.push(`Create a containment action for ${topErrors[0].key}, currently the most recurring alert across the fleet.`);
  }
  if (machines.some((machine) => machine.recoveryLoopCount > 0)) {
    focusAreas.push('Escalate machines entering recovery/failure loops to avoid hidden chronic faults.');
  }
  return focusAreas.slice(0, 4);
}

function buildFleetHealth(filteredEvents, machines) {
  const counts = HEALTH_LEVELS.map((level) => ({
    label: level.label,
    count: machines.filter((machine) => machine.severityLevel === level.label).length,
    color: level.color
  }));
  const totalMachines = machines.length;
  const healthyMachines = counts.find((item) => item.label === 'Healthy')?.count || 0;
  return {
    counts,
    totalMachines,
    healthyRate: totalMachines ? (healthyMachines / totalMachines) * 100 : 0,
    totalEvents: filteredEvents.length,
    avgRisk: average(machines.map((machine) => machine.riskScore))
  };
}


function getHighDurationThreshold(events) {
  const durations = events.map((event) => Number(event.durationMinutes || 0)).filter((value) => value > 0).sort((a, b) => a - b);
  if (!durations.length) return 60;
  return Math.max(60, durations[Math.floor(durations.length * 0.8)] || 60);
}

function buildSmartInsights(events, machines, topErrors, topSubsystems, highDurationThreshold) {
  const insights = [];
  const repeatedErrors = topErrors.filter((item) => item.value > 10).slice(0, 2);
  repeatedErrors.forEach((item) => {
    const affectedMachines = uniqueSorted(events.filter((event) => event.title === item.key).map((event) => event.machine)).slice(0, 5);
    insights.push({
      title: `Repeated error pattern: ${item.key}`,
      explanation: `${item.value} occurrences were detected, indicating a recurring failure mode that should be contained before the next shift.`,
      affectedMachines
    });
  });

  const overloadedSubsystems = topSubsystems.filter((item) => item.value > 30).slice(0, 2);
  overloadedSubsystems.forEach((item) => {
    const affectedMachines = uniqueSorted(events.filter((event) => event.subsystem === item.key).map((event) => event.machine)).slice(0, 5);
    insights.push({
      title: `Subsystem overload: ${item.key}`,
      explanation: `${item.value} alerts are concentrated in this subsystem, suggesting a systemic issue rather than isolated machine noise.`,
      affectedMachines
    });
  });

  machines.filter((machine) => machine.totalDowntime >= highDurationThreshold && machine.totalErrors < 10).slice(0, 2).forEach((machine) => {
    insights.push({
      title: `High downtime with relatively few errors on ${machine.machine}`,
      explanation: `${formatMinutes(machine.totalDowntime)} of downtime came from only ${machine.totalErrors} alerts, which usually means long-duration incidents or slow recovery.`,
      affectedMachines: [machine.machine]
    });
  });

  const crossMachineErrors = topErrors.filter((item) => uniqueSorted(events.filter((event) => event.title === item.key).map((event) => event.machine)).length >= 3).slice(0, 2);
  crossMachineErrors.forEach((item) => {
    const affectedMachines = uniqueSorted(events.filter((event) => event.title === item.key).map((event) => event.machine)).slice(0, 6);
    insights.push({
      title: `Shared fleet issue: ${item.key}`,
      explanation: `The same alert is appearing across multiple machines, which points to a broader fleet issue worth checking centrally.`,
      affectedMachines
    });
  });

  machines.filter((machine) => machine.trendDirection === 'Worsening' || machine.recoveryLoopCount > 0 || machine.sameErrorConcentration >= 0.6).slice(0, 3).forEach((machine) => {
    const reason = machine.recoveryLoopCount > 0
      ? `${machine.recoveryLoopCount} repeating failure loop${machine.recoveryLoopCount > 1 ? 's' : ''} detected.`
      : machine.sameErrorConcentration >= 0.6
        ? `${Math.round(machine.sameErrorConcentration * 100)}% of alerts are the same error.`
        : `Recent error volume is rising.`;
    insights.push({
      title: `Escalation signal on ${machine.machine}`,
      explanation: reason,
      affectedMachines: [machine.machine]
    });
  });

  return insights.slice(0, 6);
}

function renderSectionSelector() {
  if (!els.sectionSelector) return;
  els.sectionSelector.innerHTML = SECTION_OPTIONS.map((section) => `
    <button type="button" class="selector-chip ${state.visibleSections.has(section.key) ? 'active' : ''}" data-section-toggle="${section.key}">${section.label}</button>
  `).join('');
  els.sectionSelector.querySelectorAll('[data-section-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.sectionToggle;
      if (state.visibleSections.has(key) && state.visibleSections.size > 1) state.visibleSections.delete(key);
      else state.visibleSections.add(key);
      renderSectionSelector();
      updateVisibleSections();
    });
  });
}

function updateVisibleSections() {
  document.querySelectorAll('.dashboard-section').forEach((section) => {
    section.classList.toggle('hidden', !state.visibleSections.has(section.dataset.section));
  });
}

function buildAISummary(summary) {
  const critical = summary.fleetHealth.counts.find((item) => item.label === 'Critical')?.count || 0;
  const leadMachine = summary.machines[0];
  const leadError = summary.topErrors[0]?.key || 'recurring alerts';
  const leadSubsystem = summary.topSubsystems[0]?.key || 'core subsystems';
  return `Out of ${summary.machines.length} machines, ${critical} are Critical, mainly driven by repeated ${leadError} events and sustained pressure in ${leadSubsystem}${leadMachine ? `, led by ${leadMachine.machine}` : ''}.`;
}

function buildEmailSummary(summary) {
  const health = Object.fromEntries(summary.fleetHealth.counts.map((item) => [item.label, item.count]));
  const criticalMachines = summary.machines.filter((machine) => machine.severityLevel === 'Critical').slice(0, 5);
  const keyIssues = summary.smartInsights.slice(0, 3).map((insight) => `- ${insight.title.replace(/^Shared fleet issue: /, '')}: ${insight.explanation}`);
  return [
    'Fleet Summary:',
    `- Total machines: ${summary.machines.length}`,
    `- Total errors: ${summary.filteredEvents.length}`,
    `- Total downtime: ${formatMinutes(summary.totalDowntime)}`,
    `- Critical: ${health.Critical || 0}`,
    `- Warning: ${health.Warning || 0}`,
    '',
    'Critical Machines:',
    ...(criticalMachines.length ? criticalMachines.map((machine) => `- ${machine.machine} → ${machine.topSubsystem} (${machine.topErrorCount} ${machine.topError === 'Unknown' ? 'alerts' : `${machine.topError} events`})`) : ['- None in the current filter range']),
    '',
    'Key Issues:',
    ...(keyIssues.length ? keyIssues : ['- No major cross-fleet patterns detected']),
    '',
    'Recommended Focus:',
    ...(summary.focusAreas.length ? summary.focusAreas.map((item) => `- ${item}`) : ['- Maintain current preventive maintenance cadence'])
  ].join('\n');
}

function renderSmartInsights() {
  els.smartInsights.innerHTML = state.summary.smartInsights.length
    ? state.summary.smartInsights.map((insight) => `
      <div class="insight-card">
        <h4>${escapeHtml(insight.title)}</h4>
        <p>${escapeHtml(insight.explanation)}</p>
        <div class="meta">Affected machines: ${escapeHtml(insight.affectedMachines.join(', ') || 'Fleet-wide')}</div>
      </div>
    `).join('')
    : '<div class="insight-card"><h4>No dominant insight detected</h4><p>The current filters do not show repeated high-risk patterns beyond routine operational variance.</p><div class="meta">Affected machines: None</div></div>';
}

function renderKPIs() {
  const { machines, filteredEvents, totalDowntime, dateRange, fleetHealth } = state.summary;
  const healthLookup = Object.fromEntries(fleetHealth.counts.map((item) => [item.label, item]));
  const cards = [
    { label: 'Total machines', value: machines.length, detail: dateRange },
    { label: 'Total errors', value: filteredEvents.length, detail: `${healthLookup.Critical?.count || 0} critical machines` },
    { label: 'Total downtime', value: formatMinutes(totalDowntime), detail: `${state.summary.worseningMachines.length} worsening trends` },
    { label: 'Recommended focus', value: state.summary.machines[0]?.machine || 'Stable fleet', detail: state.summary.machines[0]?.topSubsystem || 'No urgent escalation' }
  ];

  const totalMachines = Math.max(fleetHealth.totalMachines, 1);
  els.kpiGrid.innerHTML = `
    <div class="executive-shell">
      <div class="summary-hero">
        <div class="section-title">Executive summary</div>
        <div class="section-subtitle mt-2">Fast operational readout designed for rapid decision-making.</div>
        <div class="summary-kpi-grid">
          ${cards.map((card) => `
            <div class="summary-kpi">
              <span>${card.label}</span>
              <strong>${escapeHtml(String(card.value))}</strong>
              <small>${escapeHtml(card.detail)}</small>
            </div>
          `).join('')}
        </div>
        <div class="ai-summary">${escapeHtml(buildAISummary(state.summary))}</div>
      </div>
      <div class="summary-hero">
        <div class="section-title">Severity distribution</div>
        <div class="section-subtitle mt-2">Healthy / Monitor / Warning / Critical mix across the filtered fleet.</div>
        <div class="segmented-bar">
          ${fleetHealth.counts.map((item) => `<div class="segment" style="width:${(item.count / totalMachines) * 100}%; background:${item.color};"></div>`).join('')}
        </div>
        <div class="distribution-list">
          ${fleetHealth.counts.map((item) => `
            <div class="distribution-item">
              <div class="topline"><span>${item.label}</span><strong style="color:${item.color};">${item.count}</strong></div>
              <div class="metric-detail mt-2">${Math.round((item.count / totalMachines) * 100)}% of fleet</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderFleetHealth() {
  els.fleetHealthGrid.innerHTML = state.summary.fleetHealth.counts.map((item) => `
    <div class="health-card">
      <div class="health-dot" style="background:${item.color}"></div>
      <div>
        <div class="health-label">${item.label}</div>
        <div class="health-value">${item.count} machine${item.count === 1 ? '' : 's'}</div>
      </div>
    </div>
  `).join('');
}

function renderActionSummary() {
  const actionLines = [
    ...state.summary.worseningMachines.slice(0, 3).map((machine) => `${machine.machine}: worsening trend with ${machine.recentWindowErrors} recent alerts.`),
    ...state.summary.concentratedFailures.slice(0, 2).map((machine) => `${machine.machine}: ${machine.topSubsystem} is absorbing ${Math.round(machine.subsystemConcentration * 100)}% of failures.`),
    ...state.summary.recoveryLoops.slice(0, 2).map((machine) => `${machine.machine}: repeated recovery loop behavior detected.`)
  ].slice(0, 6);

  els.actionSummary.innerHTML = actionLines.length
    ? actionLines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')
    : '<li>No urgent fleet-wide actions in the current filtered slice.</li>';

  els.alertsStrip.innerHTML = state.summary.focusAreas.map((focus) => `<span class="meta-chip accent-chip">${escapeHtml(focus)}</span>`).join('');
}

function renderProblematicMachines() {
  const spotlight = state.summary.machines.slice(0, 8);
  els.problematicMachines.innerHTML = spotlight.map((machine) => `
    <button class="machine-list-item" data-machine="${escapeHtml(machine.machine)}">
      <div class="machine-list-top">
        <div>
          <div class="spotlight-machine">${escapeHtml(machine.machine)}</div>
          <div class="spotlight-meta">${escapeHtml(machine.model)} · ${escapeHtml(machine.version)} · ${escapeHtml(machine.trendDirection)}</div>
        </div>
        <span class="severity-badge" style="border-color:${machine.severityColor}; color:${machine.severityColor};">${machine.severityLevel}</span>
      </div>
      <div class="machine-stats">
        <div class="machine-stat"><span>Total errors</span><strong>${machine.totalErrors}</strong></div>
        <div class="machine-stat"><span>Total downtime</span><strong>${formatMinutes(machine.totalDowntime)}</strong></div>
        <div class="machine-stat"><span>Top error</span><strong>${escapeHtml(machine.topError)}</strong></div>
        <div class="machine-stat"><span>Top subsystem</span><strong>${escapeHtml(machine.topSubsystem)}</strong></div>
      </div>
      <div class="spotlight-reasons">${escapeHtml(machine.reasons[0] || 'No dominant risk factor flagged.')}</div>
      <div class="spotlight-actions"><strong>Why flagged:</strong> ${escapeHtml(machine.reasons.slice(0, 2).join(' · ') || 'No major clustering detected.')}<br><strong>Action:</strong> ${escapeHtml(machine.recommendation)}</div>
    </button>
  `).join('');

  els.problematicMachines.querySelectorAll('[data-machine]').forEach((button) => {
    button.addEventListener('click', () => renderMachineDetails(button.dataset.machine));
  });
}

function renderMachineTable() {
  els.machineTableBody.innerHTML = state.summary.machines.map((machine) => `
    <tr data-machine-row="${escapeHtml(machine.machine)}">
      <td><button class="table-link" data-machine="${escapeHtml(machine.machine)}">${escapeHtml(machine.machine)}</button></td>
      <td>${escapeHtml(machine.model)}</td>
      <td>${machine.totalErrors}</td>
      <td>${formatMinutes(machine.totalDowntime)}</td>
      <td>${escapeHtml(machine.topError)}</td>
      <td>${escapeHtml(machine.topSubsystem)}</td>
      <td><span class="severity-badge" style="border-color:${machine.severityColor}; color:${machine.severityColor};">${machine.severityLevel}</span></td>
      <td>${machine.riskScore}</td>
      <td>${machine.trendDirection}</td>
      <td>${escapeHtml(machine.interpretation)}</td>
    </tr>
  `).join('');

  els.machineTableBody.querySelectorAll('[data-machine]').forEach((button) => {
    button.addEventListener('click', () => renderMachineDetails(button.dataset.machine));
  });
}

function renderMachineDetails(machineName) {
  const machine = state.summary.machines.find((item) => item.machine === machineName);
  if (!machine) return;
  state.selectedMachine = machineName;

  const timelineRows = machine.eventTimeline.slice(-12).reverse().map((event) => `
    <tr>
      <td>${formatDateTime(event.startTime)}</td>
      <td>${escapeHtml(event.title)}</td>
      <td>${escapeHtml(event.subsystem)}</td>
      <td>${escapeHtml(event.errorState)}</td>
      <td>${formatMinutes(event.durationMinutes)}</td>
    </tr>
  `).join('');

  els.machinePanelContent.innerHTML = `
    <div class="panel-header">
      <div>
        <div class="panel-title">${escapeHtml(machine.machine)}</div>
        <div class="panel-subtitle">${escapeHtml(machine.model)} · ${escapeHtml(machine.version)} · ${machine.severityLevel}</div>
      </div>
      <span class="severity-badge" style="border-color:${machine.severityColor}; color:${machine.severityColor};">Risk ${machine.riskScore}</span>
    </div>
    <div class="panel-grid">
      <div class="panel-card"><span>Total errors</span><strong>${machine.totalErrors}</strong></div>
      <div class="panel-card"><span>Total downtime</span><strong>${formatMinutes(machine.totalDowntime)}</strong></div>
      <div class="panel-card"><span>Top error</span><strong>${escapeHtml(machine.topError)}</strong></div>
      <div class="panel-card"><span>Top subsystem</span><strong>${escapeHtml(machine.topSubsystem)}</strong></div>
      <div class="panel-card"><span>Trend</span><strong>${machine.trendDirection}</strong></div>
      <div class="panel-card"><span>Recovery loops</span><strong>${machine.recoveryLoopCount}</strong></div>
    </div>
    <div class="panel-sections">
      <div class="panel-section">
        <h4>Operational interpretation</h4>
        <p>${escapeHtml(machine.interpretation)}</p>
        <ul>${machine.problematicAreas.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
      <div class="panel-section">
        <h4>Recurring issue clusters</h4>
        <ul>
          ${Array.from(machine.errorCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key, value]) => `<li>${escapeHtml(key)} · ${value} events</li>`).join('')}
        </ul>
      </div>
      <div class="panel-section">
        <h4>Recovery and duration patterns</h4>
        <ul>
          <li>Average incident duration · ${formatMinutes(machine.avgDuration)}</li>
          <li>Recovery loops · ${machine.recoveryLoopCount}</li>
          <li>Burst sequences · ${machine.burstCount}</li>
          <li>Top recovery state · ${escapeHtml(getTopEntry(machine.recoveryCounts).key)}</li>
        </ul>
      </div>
      <div class="panel-section full-width">
        <h4>Recent event timeline</h4>
        <div class="table-scroll">
          <table class="detail-table">
            <thead><tr><th>Start Time</th><th>Alert</th><th>Subsystem</th><th>Error State</th><th>Duration</th></tr></thead>
            <tbody>${timelineRows || '<tr><td colspan="5">No event timeline available.</td></tr>'}</tbody>
          </table>
        </div>
      </div>
      <div class="panel-section full-width">
        <h4>Recommended proactive focus</h4>
        <p>${escapeHtml(machine.recommendation)}</p>
      </div>
    </div>
  `;
  els.machinePanel.classList.remove('hidden');
}

function closeMachinePanel() {
  state.selectedMachine = null;
  els.machinePanel.classList.add('hidden');
}

function renderExecutiveSummary() {
  const summary = state.summary;
  const topMachines = summary.machines.slice(0, 5);
  const unusualPatterns = summary.smartInsights.length ? summary.smartInsights.map((item) => `${item.title}: ${item.explanation}`) : ['No unusual fleet patterns were detected in the filtered range.'];
  const html = `
    <div class="summary-block">
      <p><strong>Fleet Summary:</strong><br>- Total machines: ${summary.machines.length}<br>- Total errors: ${summary.filteredEvents.length}<br>- Total downtime: ${formatMinutes(summary.totalDowntime)}<br>- Critical: ${summary.fleetHealth.counts.find((item) => item.label === 'Critical')?.count || 0}<br>- Warning: ${summary.fleetHealth.counts.find((item) => item.label === 'Warning')?.count || 0}</p>
      <p><strong>Critical Machines:</strong><br>${topMachines.length ? topMachines.map((machine) => `- ${machine.machine} → ${machine.topSubsystem} (${machine.topErrorCount} errors, ${formatMinutes(machine.totalDowntime)} downtime)`).join('<br>') : '- None'}</p>
      <p><strong>Key Issues:</strong><br>${unusualPatterns.map((item) => `- ${escapeHtml(item)}`).join('<br>')}</p>
      <p><strong>Recommended Focus:</strong><br>${(summary.focusAreas.length ? summary.focusAreas : ['Maintain current preventive maintenance cadence.']).map((item) => `- ${escapeHtml(item)}`).join('<br>')}</p>
      <p><strong>Fleet conclusion:</strong> ${escapeHtml(buildFleetConclusion(summary.fleetHealth, topMachines))}</p>
    </div>
  `;
  els.executiveSummary.innerHTML = html;
}

function buildFleetConclusion(fleetHealth, topMachines) {
  const critical = fleetHealth.counts.find((item) => item.label === 'Critical')?.count || 0;
  if (critical >= 2) {
    return `Fleet risk is elevated. Prioritize immediate intervention on ${topMachines.slice(0, 2).map((machine) => machine.machine).join(' and ')} while containing repeated downtime drivers.`;
  }
  if (fleetHealth.avgRisk >= 45) {
    return 'Fleet is stable but showing meaningful early-warning signals. Targeted preventive action is recommended this cycle.';
  }
  return 'Fleet health is broadly stable with isolated issues. Continue monitoring and preventive actions on flagged machines.';
}

function openReportModal() {
  const reportHtml = buildReportHtml();
  els.reportModalContent.innerHTML = reportHtml;
  els.reportModal.classList.remove('hidden');
}

function buildReportHtml() {
  const summary = state.summary;
  return `
    <div class="report-shell">
      <div class="report-header">
        <div>
          <h2>Landa Operational Intelligence Report</h2>
          <p>${escapeHtml(state.currentFileName)} · Generated ${formatDateTime(new Date())}</p>
        </div>
        <div class="report-filter-box">
          <div><strong>Filters</strong></div>
          <div>${escapeHtml(summary.dateRange)}</div>
          <div>Machine: ${escapeHtml(state.filters.machine)}</div>
          <div>Subsystem: ${escapeHtml(state.filters.subsystem)}</div>
          <div>Error State: ${escapeHtml(state.filters.errorState)}</div>
        </div>
      </div>
      <div class="report-section">
        <h3>Fleet summary</h3>
        ${els.executiveSummary.innerHTML}
      </div>
      <div class="report-section">
        <h3>Problematic machines</h3>
        <ul>
          ${summary.machines.slice(0, 5).map((machine) => `<li><strong>${escapeHtml(machine.machine)}</strong> — ${escapeHtml(machine.interpretation)} Recommended action: ${escapeHtml(machine.recommendation)}</li>`).join('')}
        </ul>
      </div>
      <div class="report-section">
        <h3>Recommended focus areas</h3>
        <ul>${summary.focusAreas.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
      <div class="report-section report-grid">
        <div><strong>Top errors</strong><br>${summary.topErrors.map((item) => `${escapeHtml(item.key)} (${item.value})`).join('<br>')}</div>
        <div><strong>Top subsystems</strong><br>${summary.topSubsystems.map((item) => `${escapeHtml(item.key)} (${item.value})`).join('<br>')}</div>
        <div><strong>Health mix</strong><br>${summary.fleetHealth.counts.map((item) => `${item.label}: ${item.count}`).join('<br>')}</div>
      </div>
    </div>
  `;
}

async function copySummaryToClipboard() {
  try {
    const text = buildEmailSummary(state.summary);
    await navigator.clipboard.writeText(text);
    setUploadStatus('Email summary copied to clipboard.', 'success');
  } catch (error) {
    setUploadStatus('Clipboard copy failed in this environment.', 'error');
  }
}

function renderCharts() {
  const errorTrend = timeSeries(state.filteredEvents, 'count');
  renderLineChart('chartErrorTrend', 'Errors over time', errorTrend.labels, errorTrend.values, '#22d3ee');
  renderPieChart('chartSubsystemDistribution', 'Top subsystems', getTopCounts(state.filteredEvents, (event) => event.subsystem, 5));
  renderBarChart('chartTopErrors', 'Top errors', getTopCounts(state.filteredEvents, (event) => event.title, 10).map((item) => item.key), getTopCounts(state.filteredEvents, (event) => event.title, 10).map((item) => item.value), '#f97316');
}

function renderBarChart(key, title, categories, series, color) {
  const chart = ensureChart(els[key]);
  chart.setOption({
    backgroundColor: 'transparent',
    title: { text: title, textStyle: { color: '#e2e8f0', fontSize: 14, fontWeight: 600 } },
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 20, top: 48, bottom: 42 },
    xAxis: { type: 'category', data: categories, axisLabel: { color: '#94a3b8', interval: 0, rotate: 20 } },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } } },
    series: [{ type: 'bar', data: series, itemStyle: { color, borderRadius: [8, 8, 0, 0] } }]
  });
}

function renderLineChart(key, title, labels, values, color) {
  const chart = ensureChart(els[key]);
  chart.setOption({
    backgroundColor: 'transparent',
    title: { text: title, textStyle: { color: '#e2e8f0', fontSize: 14, fontWeight: 600 } },
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 20, top: 48, bottom: 42 },
    xAxis: { type: 'category', data: labels, axisLabel: { color: '#94a3b8' } },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } } },
    series: [{ type: 'line', smooth: true, data: values, lineStyle: { color, width: 3 }, areaStyle: { color: `${color}22` }, symbolSize: 8 }]
  });
}

function renderPieChart(key, title, rows) {
  const chart = ensureChart(els[key]);
  chart.setOption({
    backgroundColor: 'transparent',
    title: { text: title, textStyle: { color: '#e2e8f0', fontSize: 14, fontWeight: 600 } },
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: '#94a3b8' } },
    series: [{
      type: 'pie',
      radius: ['42%', '68%'],
      top: 40,
      label: { color: '#e2e8f0' },
      data: rows.map((row) => ({ name: row.key, value: row.value }))
    }]
  });
}

function renderRecoveryChart() {
  const chart = ensureChart(els.chartRecoveryAnalysis);
  chart.setOption({
    backgroundColor: 'transparent',
    title: { text: 'Recovery analysis per machine', textStyle: { color: '#e2e8f0', fontSize: 14, fontWeight: 600 } },
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: '#94a3b8' } },
    grid: { left: 48, right: 20, top: 48, bottom: 42 },
    xAxis: { type: 'category', data: state.summary.machines.slice(0, 10).map((machine) => machine.machine), axisLabel: { color: '#94a3b8' } },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } } },
    series: [
      { name: 'Recovery loops', type: 'bar', data: state.summary.machines.slice(0, 10).map((machine) => machine.recoveryLoopCount), itemStyle: { color: '#fb7185', borderRadius: [8, 8, 0, 0] } },
      { name: 'Repeat failures', type: 'bar', data: state.summary.machines.slice(0, 10).map((machine) => machine.repeatedErrorCount), itemStyle: { color: '#38bdf8', borderRadius: [8, 8, 0, 0] } }
    ]
  });
}

function renderPreErrorChart() {
  renderBarChart('chartPreErrorState', 'Pre-error state analysis', getTopCounts(state.filteredEvents, (event) => event.preErrorState, 8).map((item) => item.key), getTopCounts(state.filteredEvents, (event) => event.preErrorState, 8).map((item) => item.value), '#a855f7');
}

function renderVersionChart() {
  const chart = ensureChart(els.chartVersionAnalysis);
  const versionRows = [...state.summary.versionAnalysis].sort((a, b) => b.events - a.events).slice(0, 8);
  chart.setOption({
    backgroundColor: 'transparent',
    title: { text: 'Analysis by software version', textStyle: { color: '#e2e8f0', fontSize: 14, fontWeight: 600 } },
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: '#94a3b8' } },
    grid: { left: 48, right: 20, top: 48, bottom: 42 },
    xAxis: { type: 'category', data: versionRows.map((row) => row.version), axisLabel: { color: '#94a3b8' } },
    yAxis: [{ type: 'value', axisLabel: { color: '#94a3b8' } }, { type: 'value', axisLabel: { color: '#94a3b8' } }],
    series: [
      { name: 'Events', type: 'bar', data: versionRows.map((row) => row.events), itemStyle: { color: '#14b8a6', borderRadius: [8, 8, 0, 0] } },
      { name: 'Downtime (min)', type: 'line', yAxisIndex: 1, data: versionRows.map((row) => round(row.downtime)), lineStyle: { color: '#f97316', width: 3 } }
    ]
  });
}

function renderHeatmap() {
  const chart = ensureChart(els.chartHeatmap);
  const machines = state.summary.machines.slice(0, 12).map((machine) => machine.machine);
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data = [];
  machines.forEach((machine, machineIndex) => {
    weekdays.forEach((day, dayIndex) => {
      const count = state.filteredEvents.filter((event) => event.machine === machine && event.weekday === day).length;
      data.push([dayIndex, machineIndex, count]);
    });
  });
  chart.setOption({
    backgroundColor: 'transparent',
    title: { text: 'Alerts heatmap by machine and weekday', textStyle: { color: '#e2e8f0', fontSize: 14, fontWeight: 600 } },
    tooltip: { position: 'top' },
    grid: { left: 88, right: 16, top: 54, bottom: 36 },
    xAxis: { type: 'category', data: weekdays, axisLabel: { color: '#94a3b8' } },
    yAxis: { type: 'category', data: machines, axisLabel: { color: '#94a3b8' } },
    visualMap: { min: 0, max: Math.max(...data.map((item) => item[2]), 1), calculable: true, orient: 'horizontal', left: 'center', bottom: 0, textStyle: { color: '#94a3b8' } },
    series: [{ type: 'heatmap', data, label: { show: true, color: '#e2e8f0' }, itemStyle: { borderRadius: 8 } }]
  });
}

function ensureChart(element) {
  if (!element) return null;
  if (!state.charts[element.id]) {
    state.charts[element.id] = echarts.init(element);
    window.addEventListener('resize', () => state.charts[element.id]?.resize());
  }
  return state.charts[element.id];
}

function resetAnalysis(showMessage = true) {
  state.rawEvents = [];
  state.normalizedEvents = [];
  state.filteredEvents = [];
  state.summary = null;
  state.selectedMachine = null;
  state.columnMap = null;
  state.currentFileName = '';
  els.fileInput.value = '';
  els.analysisShell.classList.add('hidden');
  els.emptyState.classList.remove('hidden');
  closeMachinePanel();
  if (showMessage) setUploadStatus('Analysis reset. Upload another dataset to continue.', 'info');
}

function groupBy(items, key) {
  const map = new Map();
  items.forEach((item) => {
    const value = typeof key === 'function' ? key(item) : item[key];
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(item);
  });
  return map;
}

function countBy(items, getter) {
  const map = new Map();
  items.forEach((item) => {
    const key = getter(item);
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

function getTopCounts(items, getter, limit) {
  return Array.from(countBy(items, getter).entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, value]) => ({ key, value }));
}

function buildNestedCounts(items, outerKey, innerKey) {
  const nested = new Map();
  items.forEach((item) => {
    const outer = item[outerKey];
    const inner = item[innerKey];
    if (!nested.has(outer)) nested.set(outer, new Map());
    const innerMap = nested.get(outer);
    innerMap.set(inner, (innerMap.get(inner) || 0) + 1);
  });
  return nested;
}

function getTopEntry(map) {
  const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0];
  return sorted ? { key: sorted[0], value: sorted[1] } : { key: 'Unknown', value: 0 };
}

function getAnalyzedDateRange(events) {
  if (!events.length) return 'No events in active filter range';
  const sorted = [...events].sort((a, b) => a.startTime - b.startTime);
  return `${formatDate(sorted[0].startTime)} → ${formatDate(sorted[sorted.length - 1].startTime)}`;
}

function timeSeries(events, mode) {
  const grouped = groupBy([...events].sort((a, b) => a.startTime - b.startTime), (event) => event.dayKey);
  const labels = Array.from(grouped.keys());
  const values = labels.map((label) => {
    const rows = grouped.get(label);
    return mode === 'downtime' ? round(sum(rows, 'durationMinutes')) : rows.length;
  });
  return { labels, values };
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function average(values) {
  return values.length ? values.reduce((acc, value) => acc + value, 0) / values.length : 0;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)));
}

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatMinutes(value) {
  const minutes = Number(value || 0);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = Math.round(minutes % 60);
    return `${hours}h ${remainder}m`;
  }
  return `${Math.round(minutes)}m`;
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function labelize(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
