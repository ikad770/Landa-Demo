const HEALTH_LEVELS = [
  { label: 'Healthy', min: 0, max: 49, color: '#22c55e' },
  { label: 'Monitor', min: 50, max: 79, color: '#eab308' },
  { label: 'Warning', min: 80, max: 149, color: '#f97316' },
  { label: 'Critical', min: 150, max: Number.POSITIVE_INFINITY, color: '#ef4444' }
];

const SECTION_OPTIONS = [
  { key: 'attention', label: 'Attention now' },
  { key: 'findings', label: 'Intelligence layer' },
  { key: 'evidence', label: 'Supporting evidence' },
  { key: 'summary', label: 'Executive summary' }
];

const VIEW_PRESETS = [
  { key: 'executive', label: 'Executive', sections: ['attention', 'findings', 'summary'] },
  { key: 'operations', label: 'Operations', sections: ['attention', 'findings', 'evidence', 'summary'] },
  { key: 'investigation', label: 'Investigation', sections: ['attention', 'evidence', 'summary'] }
];

const COLUMN_ALIASES = {
  machine: ['press', 'press name', 'machine', 'machine name', 'name', 'press id'],
  model: ['model', 'press model', 'machine model'],
  title: ['alert message title', 'alert title', 'message title', 'title', 'alert', 'error name'],
  body: ['alert message body', 'alert body', 'message body', 'body', 'description'],
  solution: ['alert message solution', 'solution', 'recommended solution', 'recommendation'],
  startTime: ['start time', 'start', 'event start', 'time', 'timestamp'],
  duration: ['duration', 'downtime', 'duration min', 'duration minutes', 'elapsed'],
  recovery: ['recovery', 'recovered', 'recovery status', 'recovery action'],
  preErrorState: ['pre error state', 'pre-error state', 'pre state', 'state before'],
  subsystem: ['subsystem', 'sub system', 'system', 'module'],
  errorState: ['error state', 'severity', 'state', 'status'],
  version: ['version', 'software version', 'sw version', 'release'],
  eventId: ['event id', 'id', 'incident id']
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
  selectedPanel: null,
  columnMap: null,
  currentFileName: '',
  visibleSections: new Set(VIEW_PRESETS[1].sections),
  activePreset: 'operations'
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
    'machine-panel-content', 'machine-panel-title', 'machine-panel-subtitle', 'report-modal',
    'report-modal-content', 'report-modal-close', 'export-report', 'copy-summary', 'copy-summary-inline',
    'print-report', 'reset-analysis', 'column-map', 'alerts-strip', 'problematic-machines',
    'smart-insights', 'fleet-health-grid', 'action-summary', 'executive-summary', 'hero-narrative',
    'hero-metrics', 'fleet-score', 'fleet-posture-copy', 'severity-stack', 'focus-flow', 'upload-meta',
    'view-presets', 'section-selector', 'executive-summary-meta'
  ].forEach((id) => {
    els[toCamel(id)] = document.getElementById(id);
  });

  ['chart-error-trend', 'chart-subsystem-distribution', 'chart-top-errors'].forEach((id) => {
    els[toCamel(id)] = document.getElementById(id);
  });
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function bootstrapNavigation() {
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('landaUser') || '{}');
  } catch (error) {
    user = {};
  }

  const name = user.username || 'Expert User';
  const role = (user.role || user.type || 'expert').toUpperCase();
  const avatar = name.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'EX';

  document.getElementById('nav-user-name').textContent = name;
  document.getElementById('nav-user-role').textContent = `${role} ACCESS`;
  document.getElementById('nav-user-avatar').textContent = avatar;

  window.logout = () => {
    localStorage.removeItem('landaUser');
    window.location.href = 'index.html';
  };
}

function bindUploadEvents() {
  const { dropZone, fileInput } = els;

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
    const element = els[elementKey];
    element.addEventListener('input', (event) => {
      state.filters[filterKey] = event.target.value;
      recomputeFilteredView();
    });
    if (element.tagName === 'SELECT') {
      element.addEventListener('change', (event) => {
        state.filters[filterKey] = event.target.value;
        recomputeFilteredView();
      });
    }
  });
}

function bindActionEvents() {
  els.resetAnalysis.addEventListener('click', () => resetAnalysis(true));
  els.machinePanelClose.addEventListener('click', closeMachinePanel);
  els.reportModalClose.addEventListener('click', () => els.reportModal.classList.add('hidden'));
  els.exportReport.addEventListener('click', openReportModal);
  els.copySummary.addEventListener('click', copySummaryToClipboard);
  els.copySummaryInline.addEventListener('click', copySummaryToClipboard);
  els.printReport.addEventListener('click', () => window.print());
  els.reportModal.addEventListener('click', (event) => {
    if (event.target === els.reportModal) els.reportModal.classList.add('hidden');
  });
  els.machinePanel.addEventListener('click', (event) => {
    if (event.target === els.machinePanel) closeMachinePanel();
  });

  renderViewPresets();
  renderSectionSelector();
  window.addEventListener('resize', debounce(() => Object.values(state.charts).forEach((chart) => chart?.resize?.()), 100));
}

function renderInitialState() {
  setUploadStatus('Upload an Insight export in CSV or XLSX to unlock the fleet briefing.', 'info');
  els.analysisShell.classList.add('hidden');
  els.emptyState.classList.remove('hidden');
  els.loadingState.classList.add('hidden');
  renderHeroPlaceholder();
}

function renderHeroPlaceholder() {
  els.heroNarrative.textContent = 'Upload a CSV or XLSX export to generate a premium operational brief that prioritizes risk, recurring failures, downtime impact, and fleet-wide issue signals.';
  els.heroMetrics.innerHTML = [
    ['Machines', '—', 'No data loaded'],
    ['Errors', '—', 'Waiting for export'],
    ['Downtime', '—', 'Impact not calculated'],
    ['Lead issue', '—', 'No pattern yet']
  ].map(([label, value, note]) => renderHeroMetric(label, value, note)).join('');
  els.fleetScore.textContent = '—';
  els.fleetPostureCopy.textContent = 'No dataset loaded yet.';
  els.severityStack.innerHTML = '';
  els.focusFlow.innerHTML = '<span class="meta-pill">No focus areas yet</span>';
}

async function processUpload(file) {
  const name = file.name.toLowerCase();
  if (!name.endsWith('.csv') && !name.endsWith('.xlsx')) {
    setUploadStatus('Invalid file type. Please upload a .csv or .xlsx Insight export.', 'error');
    return;
  }

  try {
    setLoading(true, `Analyzing ${file.name}…`);
    state.currentFileName = file.name;

    const rows = name.endsWith('.csv') ? parseCsv(await file.text()) : parseWorkbook(await file.arrayBuffer());
    if (!rows.length) throw new Error('The uploaded file contains no rows to analyze.');

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

function setLoading(isLoading, message) {
  els.loadingState.classList.toggle('hidden', !isLoading);
  els.loadingState.querySelector('span').textContent = message;
  if (isLoading) {
    els.emptyState.classList.add('hidden');
    els.analysisShell.classList.add('hidden');
  }
}

function setUploadStatus(message, mode) {
  els.uploadStatus.textContent = message;
  els.uploadStatus.className = `status-pill ${mode}`;
}

function parseCsv(text) {
  if (typeof Papa === 'undefined') throw new Error('CSV parser is unavailable in this environment.');
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (header) => header.trim()
  });
  if (parsed.errors?.length && parsed.data.length === 0) throw new Error(`CSV parsing failed: ${parsed.errors[0].message}`);
  return parsed.data.filter((row) => Object.values(row).some((value) => String(value || '').trim()));
}

function parseWorkbook(buffer) {
  if (typeof XLSX === 'undefined') throw new Error('Excel parser is unavailable in this environment.');
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
  const startTime = parseDate(getMappedValue(row, columnMap.startTime));
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
    severityWeight: getSeverityWeight(errorState, title, body),
    text: `${machine} ${model} ${title} ${body} ${subsystem} ${errorState} ${version}`.toLowerCase(),
    dayKey: formatDateKey(startTime),
    raw: row
  };
}

function initializeFilters() {
  const dates = state.normalizedEvents.map((event) => event.startTime).sort((a, b) => a - b);
  state.filters.dateFrom = formatDateInput(dates[0]);
  state.filters.dateTo = formatDateInput(dates[dates.length - 1]);
  state.filters.machine = 'all';
  state.filters.subsystem = 'all';
  state.filters.errorState = 'all';
  state.filters.model = 'all';
  state.filters.version = 'all';
  state.filters.search = '';

  els.filterDateFrom.value = state.filters.dateFrom;
  els.filterDateTo.value = state.filters.dateTo;
  els.filterSearch.value = '';

  populateSelect(els.filterMachine, uniqueSorted(state.normalizedEvents.map((event) => event.machine)));
  populateSelect(els.filterSubsystem, uniqueSorted(state.normalizedEvents.map((event) => event.subsystem)));
  populateSelect(els.filterErrorState, uniqueSorted(state.normalizedEvents.map((event) => event.errorState)));
  populateSelect(els.filterModel, uniqueSorted(state.normalizedEvents.map((event) => event.model)));
  populateSelect(els.filterVersion, uniqueSorted(state.normalizedEvents.map((event) => event.version)));

  els.uploadMeta.innerHTML = [
    `<span class="meta-pill">${escapeHtml(state.currentFileName)}</span>`,
    `<span class="meta-pill">${state.normalizedEvents.length} events</span>`,
    `<span class="meta-pill">${uniqueSorted(state.normalizedEvents.map((event) => event.machine)).length} machines</span>`
  ].join('');

  els.columnMap.innerHTML = Object.entries(state.columnMap)
    .map(([key, value]) => `<span class="meta-pill">${labelize(key)} → ${escapeHtml(value)}</span>`)
    .join('');
}

function recomputeFilteredView(resetPanel = false) {
  if (!state.normalizedEvents.length) return;
  state.filteredEvents = applyFilters(state.normalizedEvents, state.filters);
  state.summary = buildAnalytics(state.filteredEvents, state.normalizedEvents, state.filters);

  els.analysisShell.classList.remove('hidden');
  els.emptyState.classList.add('hidden');

  renderHero();
  renderAttentionNow();
  renderSmartInsights();
  renderEvidence();
  renderSummaryComposer();
  updateVisibleSections();

  if (resetPanel) closeMachinePanel();
  if (state.selectedPanel) {
    if (state.selectedPanel.type === 'machine') renderMachineDetails(state.selectedPanel.value);
    else openCategoryPanel(state.selectedPanel.type, state.selectedPanel.value);
  }
}

function buildAnalytics(filteredEvents, baselineEvents, filters) {
  const machineMap = groupBy(filteredEvents, 'machine');
  const machines = Array.from(machineMap.entries()).map(([machine, events]) => buildMachineMetrics(machine, events));
  machines.sort((a, b) => b.riskScore - a.riskScore || b.totalDowntime - a.totalDowntime);

  const totalDowntime = sum(filteredEvents, 'durationMinutes');
  const topErrors = getTopCounts(filteredEvents, (event) => event.title, 10);
  const topSubsystems = getTopCounts(filteredEvents, (event) => event.subsystem, 8);
  const dailyTrend = getDailyTrend(filteredEvents);
  const fleetHealth = buildFleetHealth(machines, filteredEvents.length);
  const highDurationThreshold = getHighDurationThreshold(filteredEvents);
  const worseningMachines = machines.filter((machine) => machine.trendDirection === 'Worsening');
  const concentratedFailures = machines.filter((machine) => machine.subsystemConcentration >= 0.55 || machine.sameErrorConcentration >= 0.6);
  const highDowntimeMachines = machines.filter((machine) => machine.totalDowntime >= highDurationThreshold);
  const recoveryLoops = machines.filter((machine) => machine.recoveryLoopCount > 0);
  const recurringFleetErrors = topErrors.filter((item) => item.value >= 10).map((item) => ({
    ...item,
    affectedMachines: uniqueSorted(filteredEvents.filter((event) => event.title === item.key).map((event) => event.machine))
  }));
  const recurringFleetSubsystems = topSubsystems.filter((item) => item.value >= 30).map((item) => ({
    ...item,
    affectedMachines: uniqueSorted(filteredEvents.filter((event) => event.subsystem === item.key).map((event) => event.machine))
  }));
  const criticalMachines = machines.filter((machine) => machine.severityLevel === 'Critical');
  const priorityMachines = machines.slice(0, 6);
  const findings = buildFindings({
    machines,
    worseningMachines,
    concentratedFailures,
    highDowntimeMachines,
    recurringFleetErrors,
    recurringFleetSubsystems,
    filteredEvents,
    topSubsystems
  });
  const focusAreas = deriveFocusAreas({
    criticalMachines,
    recurringFleetErrors,
    recurringFleetSubsystems,
    worseningMachines,
    highDowntimeMachines,
    concentratedFailures,
    topSubsystems,
    topErrors
  });

  return {
    machines,
    totalDowntime,
    filteredEvents,
    topErrors,
    topSubsystems,
    dailyTrend,
    fleetHealth,
    highDurationThreshold,
    worseningMachines,
    concentratedFailures,
    highDowntimeMachines,
    recoveryLoops,
    recurringFleetErrors,
    recurringFleetSubsystems,
    criticalMachines,
    priorityMachines,
    findings,
    focusAreas,
    emailSummary: buildEmailSummary({
      machines,
      fleetHealth,
      criticalMachines,
      recurringFleetErrors,
      recurringFleetSubsystems,
      topErrors,
      topSubsystems,
      totalDowntime,
      focusAreas,
      filteredEvents,
      baselineEvents
    }),
    narrative: buildNarrative({ machines, fleetHealth, criticalMachines, topErrors, topSubsystems, worseningMachines, highDowntimeMachines }),
    postureScore: calculateFleetScore(machines),
    baselineEventsCount: baselineEvents.length,
    dateRange: getAnalyzedDateRange(filteredEvents, filters)
  };
}

function buildMachineMetrics(machine, events) {
  const totalErrors = events.length;
  const totalDowntime = sum(events, 'durationMinutes');
  const errorCounts = countBy(events, (event) => event.title);
  const subsystemCounts = countBy(events, (event) => event.subsystem);
  const recoveryCounts = countBy(events, (event) => event.recovery);
  const errorStateCounts = countBy(events, (event) => event.errorState);
  const sortedByTime = [...events].sort((a, b) => a.startTime - b.startTime);
  const midpoint = Math.max(1, Math.floor(sortedByTime.length / 2));
  const previousWindow = sortedByTime.slice(0, midpoint);
  const recentWindow = sortedByTime.slice(midpoint);
  const trendDelta = recentWindow.length - previousWindow.length;
  const topError = getTopEntry(errorCounts);
  const topSubsystem = getTopEntry(subsystemCounts);
  const repeatedErrorCount = Array.from(errorCounts.values()).filter((count) => count > 1).reduce((acc, count) => acc + (count - 1), 0);
  const subsystemConcentration = totalErrors ? topSubsystem.value / totalErrors : 0;
  const sameErrorConcentration = totalErrors ? topError.value / totalErrors : 0;
  const recoveryLoopCount = countRecoveryLoops(sortedByTime);
  const burstCount = countBurstEvents(sortedByTime, 180);
  const highDurationFlag = totalDowntime >= getHighDurationThreshold(events);
  const criticalStateCount = Array.from(errorStateCounts.entries())
    .filter(([label]) => /critical|fatal|emergency/i.test(label))
    .reduce((acc, [, count]) => acc + count, 0);

  const riskScore = Math.round(
    totalErrors +
    Math.min(120, totalDowntime / 4) +
    repeatedErrorCount * 4 +
    Math.round(subsystemConcentration * 36) +
    Math.round(sameErrorConcentration * 22) +
    recoveryLoopCount * 10 +
    Math.max(0, trendDelta) * 8 +
    burstCount * 5 +
    criticalStateCount * 5 +
    (topSubsystem.value >= 30 ? 12 : 0) +
    (topError.value >= 10 ? 10 : 0) +
    (highDurationFlag ? 14 : 0)
  );

  const severity = HEALTH_LEVELS.find((item) => riskScore >= item.min && riskScore <= item.max) || HEALTH_LEVELS[HEALTH_LEVELS.length - 1];
  const trendDirection = trendDelta >= 2 ? 'Worsening' : trendDelta <= -2 ? 'Improving' : 'Stable';
  const reasons = [];
  if (topSubsystem.value >= 30) reasons.push(`${topSubsystem.key} exceeds the subsystem alert threshold with ${topSubsystem.value} events.`);
  if (topError.value >= 10) reasons.push(`${topError.key} crosses the recurring error threshold with ${topError.value} repeats.`);
  if (highDurationFlag) reasons.push(`${formatMinutes(totalDowntime)} of downtime creates strong availability impact.`);
  if (subsystemConcentration >= 0.55) reasons.push(`${Math.round(subsystemConcentration * 100)}% of machine failures come from ${topSubsystem.key}.`);
  if (sameErrorConcentration >= 0.6) reasons.push(`${Math.round(sameErrorConcentration * 100)}% of machine failures are driven by a single error.`);
  if (recoveryLoopCount > 0) reasons.push(`${recoveryLoopCount} recovery/failure loop${recoveryLoopCount > 1 ? 's' : ''} detected.`);
  if (trendDirection === 'Worsening') reasons.push('Recent event flow is worsening within the selected period.');
  if (!reasons.length) reasons.push('The machine remains visible due to cumulative operational risk.');

  return {
    machine,
    model: events[0]?.model || 'Unknown',
    version: events[0]?.version || 'Unknown',
    totalErrors,
    totalDowntime,
    topError: topError.key,
    topErrorCount: topError.value,
    topSubsystem: topSubsystem.key,
    topSubsystemCount: topSubsystem.value,
    riskScore,
    severityLevel: severity.label,
    severityColor: severity.color,
    trendDirection,
    recentWindowErrors: recentWindow.length,
    subsystemConcentration,
    sameErrorConcentration,
    recoveryLoopCount,
    repeatedErrorCount,
    burstCount,
    reasons,
    recommendation: deriveMachineRecommendation(events, topSubsystem.key, topError.key),
    eventTimeline: sortedByTime,
    errorCounts,
    subsystemCounts,
    recoveryCounts,
    errorStateCounts,
    problematicAreas: deriveProblematicAreas(events, topSubsystem.key, topError.key)
  };
}

function buildFindings({ machines, worseningMachines, concentratedFailures, highDowntimeMachines, recurringFleetErrors, recurringFleetSubsystems, filteredEvents, topSubsystems }) {
  const findings = [];

  if (recurringFleetErrors[0]) {
    findings.push({
      title: `${recurringFleetErrors[0].affectedMachines.length} machines are hit by the same recurring error`,
      copy: `${recurringFleetErrors[0].key} appears ${recurringFleetErrors[0].value} times across the selected fleet slice. This suggests a shared issue pattern rather than isolated machine noise.`,
      chips: recurringFleetErrors[0].affectedMachines.slice(0, 6),
      type: 'error',
      value: recurringFleetErrors[0].key
    });
  }

  if (highDowntimeMachines.length) {
    findings.push({
      title: `${highDowntimeMachines.length} presses show heavy downtime impact`,
      copy: `These presses cross the high-duration alert threshold even when raw event counts alone might seem moderate. Availability risk should be reviewed alongside recurrence, not separately.`,
      chips: highDowntimeMachines.slice(0, 5).map((machine) => machine.machine),
      type: 'machine-list',
      value: highDowntimeMachines.slice(0, 5).map((machine) => machine.machine)
    });
  }

  if (recurringFleetSubsystems[0]) {
    findings.push({
      title: `${recurringFleetSubsystems[0].key} is creating a cross-fleet subsystem concern`,
      copy: `${recurringFleetSubsystems[0].value} subsystem-linked events exceed the fleet notification threshold. This subsystem deserves preventive focus before issues fragment into one-off investigations.`,
      chips: recurringFleetSubsystems[0].affectedMachines.slice(0, 6),
      type: 'subsystem',
      value: recurringFleetSubsystems[0].key
    });
  }

  if (worseningMachines.length) {
    findings.push({
      title: `${worseningMachines.length} machine${worseningMachines.length > 1 ? 's are' : ' is'} trending worse`,
      copy: `Recent event volume is higher than the earlier half of the selected period. These machines should be watched for escalation before the next production window.`,
      chips: worseningMachines.slice(0, 5).map((machine) => machine.machine),
      type: 'machine-list',
      value: worseningMachines.slice(0, 5).map((machine) => machine.machine)
    });
  }

  if (concentratedFailures.length) {
    findings.push({
      title: `${concentratedFailures.length} machines are dominated by a single source`,
      copy: `Strong concentration around one subsystem or error often points to a localized root cause. These are typically the fastest wins for focused engineering intervention.`,
      chips: concentratedFailures.slice(0, 5).map((machine) => machine.machine),
      type: 'machine-list',
      value: concentratedFailures.slice(0, 5).map((machine) => machine.machine)
    });
  }

  if (!findings.length && topSubsystems[0]) {
    findings.push({
      title: `${topSubsystems[0].key} remains the dominant subsystem signal`,
      copy: `The current filter set does not reveal an outsized anomaly, but subsystem concentration still indicates where preventive inspection will be most useful.`,
      chips: uniqueSorted(filteredEvents.filter((event) => event.subsystem === topSubsystems[0].key).map((event) => event.machine)).slice(0, 6),
      type: 'subsystem',
      value: topSubsystems[0].key
    });
  }

  return findings.slice(0, 6);
}

function deriveFocusAreas({ criticalMachines, recurringFleetErrors, recurringFleetSubsystems, worseningMachines, highDowntimeMachines, concentratedFailures, topSubsystems, topErrors }) {
  const areas = [];
  if (criticalMachines.length) areas.push(`Stabilize ${criticalMachines[0].machine} and other critical presses before the next production window.`);
  if (recurringFleetSubsystems[0]) areas.push(`Inspect ${recurringFleetSubsystems[0].key} across the fleet; it exceeds the subsystem notification threshold.`);
  if (recurringFleetErrors[0]) areas.push(`Contain ${recurringFleetErrors[0].key}; it is the strongest repeating fleet-wide error pattern.`);
  if (highDowntimeMachines.length) areas.push('Prioritize machines with heavy downtime impact even when their event counts look deceptively moderate.');
  if (concentratedFailures.length) areas.push('Use concentrated same-source failures as root-cause entry points for faster resolution.');
  if (worseningMachines.length) areas.push('Monitor worsening trajectories to prevent more machines entering the warning or critical band.');
  if (!areas.length && topSubsystems[0] && topErrors[0]) areas.push(`Continue preventive review of ${topSubsystems[0].key} and ${topErrors[0].key}.`);
  return areas.slice(0, 5);
}

function buildNarrative({ machines, fleetHealth, criticalMachines, topErrors, topSubsystems, worseningMachines, highDowntimeMachines }) {
  const criticalCount = fleetHealth.counts.find((item) => item.label === 'Critical')?.count || 0;
  const warningCount = fleetHealth.counts.find((item) => item.label === 'Warning')?.count || 0;
  const leadMachine = criticalMachines[0] || machines[0];
  const leadError = topErrors[0]?.key || 'recurring machine alerts';
  const leadSubsystem = topSubsystems[0]?.key || 'key production subsystems';
  return `${criticalCount} of ${machines.length} machines are currently in Critical, with ${warningCount} more in Warning. The strongest signals are repeated ${leadError} events and persistent pressure in ${leadSubsystem}${leadMachine ? `, led by ${leadMachine.machine}` : ''}. ${highDowntimeMachines.length ? `${highDowntimeMachines.length} machines also show elevated downtime impact.` : ''} ${worseningMachines.length ? `${worseningMachines.length} machine${worseningMachines.length > 1 ? 's are' : ' is'} trending worse across the selected period.` : ''}`.trim();
}

function calculateFleetScore(machines) {
  if (!machines.length) return 0;
  const avgRisk = average(machines.map((machine) => machine.riskScore));
  return Math.max(0, Math.round(100 - Math.min(95, avgRisk * 0.48)));
}

function buildFleetHealth(machines, totalEvents) {
  const counts = HEALTH_LEVELS.map((level) => ({
    label: level.label,
    count: machines.filter((machine) => machine.severityLevel === level.label).length,
    color: level.color
  }));
  return {
    counts,
    totalMachines: machines.length,
    totalEvents
  };
}

function buildEmailSummary({ machines, fleetHealth, criticalMachines, recurringFleetErrors, recurringFleetSubsystems, topErrors, topSubsystems, totalDowntime, focusAreas }) {
  const counts = Object.fromEntries(fleetHealth.counts.map((item) => [item.label, item.count]));
  return [
    'Landa Insights Analyzer — Executive Fleet Summary',
    '',
    `Machines analyzed: ${machines.length}`,
    `Severity distribution: Healthy ${counts.Healthy || 0} | Monitor ${counts.Monitor || 0} | Warning ${counts.Warning || 0} | Critical ${counts.Critical || 0}`,
    `Availability impact: ${formatMinutes(totalDowntime)} total downtime captured in the selected filter range`,
    '',
    'Critical machines and why:',
    ...(criticalMachines.length
      ? criticalMachines.slice(0, 5).map((machine) => `- ${machine.machine}: ${machine.reasons[0] || 'High fleet risk score.'}`)
      : ['- No critical machines in the current slice.']),
    '',
    'Main recurring issues:',
    ...(recurringFleetErrors.length
      ? recurringFleetErrors.slice(0, 3).map((item) => `- ${item.key}: ${item.value} events across ${item.affectedMachines.length} machines`)
      : topErrors[0] ? [`- ${topErrors[0].key}: ${topErrors[0].value} total events`] : ['- No major recurring error pattern detected.']),
    '',
    'Main subsystem concerns:',
    ...(recurringFleetSubsystems.length
      ? recurringFleetSubsystems.slice(0, 3).map((item) => `- ${item.key}: ${item.value} events across ${item.affectedMachines.length} machines`)
      : topSubsystems[0] ? [`- ${topSubsystems[0].key}: ${topSubsystems[0].value} total events`] : ['- No subsystem concern stands out in the current selection.']),
    '',
    'Recommended focus areas:',
    ...(focusAreas.length ? focusAreas.map((item) => `- ${item}`) : ['- Continue routine preventive monitoring.'])
  ].join('\n');
}

function renderHero() {
  const { summary } = state;
  const critical = summary.fleetHealth.counts.find((item) => item.label === 'Critical')?.count || 0;
  const totalMachines = Math.max(summary.machines.length, 1);
  const lead = summary.priorityMachines[0];

  els.heroNarrative.textContent = summary.narrative;
  els.heroMetrics.innerHTML = [
    ['Machines analyzed', summary.machines.length, summary.dateRange],
    ['Events captured', summary.filteredEvents.length, `${critical} critical machines`],
    ['Downtime impact', formatMinutes(summary.totalDowntime), `${summary.highDowntimeMachines.length} high-duration presses`],
    ['Lead issue', summary.topErrors[0]?.key || 'No dominant pattern', lead ? lead.topSubsystem : 'No leading machine']
  ].map(([label, value, note]) => renderHeroMetric(label, value, note)).join('');

  els.fleetScore.textContent = summary.postureScore;
  els.fleetPostureCopy.textContent = `${summary.postureScore >= 75 ? 'Fleet posture is relatively controlled.' : summary.postureScore >= 50 ? 'Fleet posture needs active supervision.' : 'Fleet posture is under significant strain.'} ${critical ? `${critical} machine${critical > 1 ? 's are' : ' is'} in the critical band.` : 'No machines are in the critical band.'}`;

  els.severityStack.innerHTML = summary.fleetHealth.counts.map((item) => `
    <div class="severity-bar">
      <div class="posture-label" style="color:${item.color}">${item.label}</div>
      <div class="severity-track"><div class="severity-fill" style="width:${Math.round((item.count / totalMachines) * 100)}%; background:${item.color};"></div></div>
      <div>${item.count}</div>
    </div>
  `).join('');

  els.focusFlow.innerHTML = summary.focusAreas.length
    ? summary.focusAreas.map((focus) => `<span class="meta-pill">${escapeHtml(focus)}</span>`).join('')
    : '<span class="meta-pill">No urgent focus area identified</span>';
}

function renderHeroMetric(label, value, note) {
  return `
    <div class="hero-metric">
      <div class="hero-metric-label">${escapeHtml(label)}</div>
      <div class="hero-metric-value">${escapeHtml(String(value))}</div>
      <div class="hero-metric-note">${escapeHtml(note)}</div>
    </div>
  `;
}

function renderAttentionNow() {
  els.alertsStrip.innerHTML = state.summary.focusAreas.map((item) => `<span class="meta-pill">${escapeHtml(item)}</span>`).join('');
  els.problematicMachines.innerHTML = state.summary.priorityMachines.map((machine) => `
    <button class="machine-row" data-machine="${escapeHtml(machine.machine)}">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="machine-name">${escapeHtml(machine.machine)}</div>
          <span class="severity-badge" style="color:${machine.severityColor}">${escapeHtml(machine.severityLevel)}</span>
        </div>
        <div class="machine-sub">${escapeHtml(machine.model)} · ${escapeHtml(machine.version)} · ${escapeHtml(machine.trendDirection)}</div>
      </div>
      <div class="machine-reason">${escapeHtml(machine.reasons[0] || machine.recommendation)}</div>
      <div class="stat-pair">
        <div class="stat-label">Errors / Downtime</div>
        <div class="stat-value">${machine.totalErrors} / ${formatMinutes(machine.totalDowntime)}</div>
        <div class="stat-label mt-2">Lead subsystem</div>
        <div class="stat-value">${escapeHtml(machine.topSubsystem)}</div>
      </div>
    </button>
  `).join('') || '<div class="summary-list-item">No machine signals available for the current filter set.</div>';

  els.problematicMachines.querySelectorAll('[data-machine]').forEach((button) => {
    button.addEventListener('click', () => renderMachineDetails(button.dataset.machine));
  });
}

function renderSmartInsights() {
  els.smartInsights.innerHTML = state.summary.findings.map((finding, index) => `
    <div class="finding-card">
      <div class="finding-index">Finding ${index + 1}</div>
      <div class="finding-title">${escapeHtml(finding.title)}</div>
      <div class="finding-copy">${escapeHtml(finding.copy)}</div>
      <div class="finding-meta">
        ${finding.chips.length ? finding.chips.map((chip) => `<button class="chip-link" data-chip-machine="${escapeHtml(chip)}">${escapeHtml(chip)}</button>`).join('') : '<span class="meta-pill">Fleet-wide</span>'}
      </div>
    </div>
  `).join('');

  els.smartInsights.querySelectorAll('[data-chip-machine]').forEach((button) => {
    button.addEventListener('click', () => renderMachineDetails(button.dataset.chipMachine));
  });
}

function renderEvidence() {
  renderFleetHealth();
  renderCharts();
}

function renderFleetHealth() {
  const totalMachines = Math.max(state.summary.machines.length, 1);
  els.fleetHealthGrid.innerHTML = state.summary.fleetHealth.counts.map((item) => `
    <div class="health-row">
      <button class="health-left" data-health-filter="${escapeHtml(item.label)}">
        <span class="health-dot" style="background:${item.color}; color:${item.color}"></span>
        <span>
          <div class="posture-label">${item.label}</div>
          <div>${item.count} machine${item.count === 1 ? '' : 's'}</div>
        </span>
      </button>
      <div>${Math.round((item.count / totalMachines) * 100)}%</div>
      <div style="color:${item.color}">Open</div>
    </div>
  `).join('');

  els.fleetHealthGrid.querySelectorAll('[data-health-filter]').forEach((button) => {
    button.addEventListener('click', () => openCategoryPanel('health', button.dataset.healthFilter));
  });
}

function renderSummaryComposer() {
  els.executiveSummary.textContent = state.summary.emailSummary;
  els.executiveSummaryMeta.innerHTML = [
    `<span class="meta-pill">${state.summary.machines.length} machines</span>`,
    `<span class="meta-pill">${state.summary.filteredEvents.length} events</span>`,
    `<span class="meta-pill">${formatMinutes(state.summary.totalDowntime)} downtime</span>`
  ].join('');

  els.actionSummary.innerHTML = state.summary.focusAreas.length
    ? state.summary.focusAreas.map((item) => `<div class="summary-list-item">${escapeHtml(item)}</div>`).join('')
    : '<div class="summary-list-item">No urgent focus areas identified.</div>';
}

function renderCharts() {
  renderTrendChart();
  renderSubsystemChart();
  renderTopErrorsChart();
}

function renderTrendChart() {
  if (!els.chartErrorTrend) return;
  const chart = getOrCreateChart('errorTrend', els.chartErrorTrend);
  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 26, right: 16, top: 26, bottom: 30, containLabel: true },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: state.summary.dailyTrend.map((item) => item.day), axisLabel: { color: '#9fb2c8' }, axisLine: { lineStyle: { color: 'rgba(148,163,184,.18)' } } },
    yAxis: { type: 'value', axisLabel: { color: '#9fb2c8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,.12)' } } },
    series: [{
      type: 'line', smooth: true, symbol: 'circle', symbolSize: 8,
      data: state.summary.dailyTrend.map((item) => item.value),
      lineStyle: { color: '#58c4ff', width: 3 },
      areaStyle: { color: 'rgba(88,196,255,.12)' },
      itemStyle: { color: '#58c4ff' }
    }]
  });
}

function renderSubsystemChart() {
  const chart = getOrCreateChart('subsystemDistribution', els.chartSubsystemDistribution);
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['45%', '72%'],
      center: ['50%', '54%'],
      label: { color: '#d7e3f1', formatter: '{b}\n{d}%' },
      labelLine: { lineStyle: { color: 'rgba(215,227,241,.4)' } },
      itemStyle: { borderWidth: 4, borderColor: '#0c1524' },
      data: state.summary.topSubsystems.slice(0, 5).map((item, index) => ({
        name: item.key,
        value: item.value,
        itemStyle: { color: ['#58c4ff', '#2dd4bf', '#eab308', '#f97316', '#ef4444'][index % 5] }
      }))
    }]
  });
}

function renderTopErrorsChart() {
  const chart = getOrCreateChart('topErrors', els.chartTopErrors);
  const data = [...state.summary.topErrors.slice(0, 6)].reverse();
  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 120, right: 18, top: 16, bottom: 20 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', axisLabel: { color: '#9fb2c8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,.10)' } } },
    yAxis: { type: 'category', data: data.map((item) => truncate(item.key, 24)), axisLabel: { color: '#d7e3f1' }, axisLine: { show: false } },
    series: [{
      type: 'bar',
      data: data.map((item) => ({ value: item.value, itemStyle: { color: item.value >= 10 ? '#f97316' : '#58c4ff', borderRadius: [0, 10, 10, 0] } }))
    }]
  });
}

function renderMachineDetails(machineName) {
  const machine = state.summary.machines.find((item) => item.machine === machineName);
  if (!machine) return;
  state.selectedPanel = { type: 'machine', value: machineName };
  els.machinePanel.classList.remove('hidden');
  els.machinePanelTitle.textContent = machine.machine;
  els.machinePanelSubtitle.textContent = `${machine.model} · ${machine.version} · ${machine.severityLevel} · ${machine.trendDirection}`;

  const timeline = machine.eventTimeline.slice(-8).reverse().map((event) => `
    <div class="timeline-item">
      <div class="flex flex-wrap justify-between gap-2">
        <strong>${escapeHtml(event.title)}</strong>
        <span>${escapeHtml(formatDateTime(event.startTime))}</span>
      </div>
      <div class="text-slate-300 text-sm mt-2">${escapeHtml(event.subsystem)} · ${escapeHtml(event.errorState)} · ${formatMinutes(event.durationMinutes)}</div>
      <div class="text-slate-400 text-sm mt-2">Recovery: ${escapeHtml(event.recovery)}${event.solution ? ` · Suggested action: ${escapeHtml(event.solution)}` : ''}</div>
    </div>
  `).join('');

  els.machinePanelContent.innerHTML = `
    <div class="detail-grid">
      <div class="detail-block"><div class="detail-k">Total errors</div><div class="detail-v">${machine.totalErrors}</div></div>
      <div class="detail-block"><div class="detail-k">Top error</div><div class="detail-v">${escapeHtml(machine.topError)}</div></div>
      <div class="detail-block"><div class="detail-k">Top subsystem</div><div class="detail-v">${escapeHtml(machine.topSubsystem)}</div></div>
      <div class="detail-block"><div class="detail-k">Downtime</div><div class="detail-v">${formatMinutes(machine.totalDowntime)}</div></div>
    </div>
    <div class="drawer-sections">
      <div class="detail-block">
        <div class="detail-k">Why it needs attention</div>
        <ul class="bullet-list mt-3">${machine.reasons.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
      <div class="detail-block">
        <div class="detail-k">Suggested focus areas</div>
        <ul class="bullet-list mt-3">${machine.problematicAreas.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}<li>${escapeHtml(machine.recommendation)}</li></ul>
      </div>
      <div class="detail-block">
        <div class="detail-k">Recurrence + behavior</div>
        <ul class="bullet-list mt-3">
          <li>${machine.topErrorCount} instances of the leading error.</li>
          <li>${machine.topSubsystemCount} instances in the leading subsystem.</li>
          <li>${machine.recoveryLoopCount} recovery loop${machine.recoveryLoopCount === 1 ? '' : 's'} detected.</li>
          <li>${machine.burstCount} concentrated burst window${machine.burstCount === 1 ? '' : 's'} detected.</li>
        </ul>
      </div>
      <div class="detail-block">
        <div class="detail-k">Linked related issues</div>
        <ul class="bullet-list mt-3">
          <li>Error concentration: ${Math.round(machine.sameErrorConcentration * 100)}%</li>
          <li>Subsystem concentration: ${Math.round(machine.subsystemConcentration * 100)}%</li>
          <li>Recent events in latest window: ${machine.recentWindowErrors}</li>
          <li>Risk score: ${machine.riskScore}</li>
        </ul>
      </div>
      <div class="detail-block full">
        <div class="detail-k">Timeline</div>
        <div class="timeline-list">${timeline || '<div class="timeline-item">No recent timeline available.</div>'}</div>
      </div>
    </div>
  `;
}

function openCategoryPanel(type, value) {
  let title = value;
  let subtitle = '';
  let items = [];

  if (type === 'health') {
    const matches = state.summary.machines.filter((machine) => machine.severityLevel === value);
    title = `${value} machines`;
    subtitle = `Machines classified using the mandated severity thresholds.`;
    items = matches.map((machine) => `<div class="summary-list-item"><strong>${escapeHtml(machine.machine)}</strong><div class="text-slate-400 text-sm mt-2">${escapeHtml(machine.topSubsystem)} · ${machine.totalErrors} errors · ${formatMinutes(machine.totalDowntime)} downtime</div></div>`);
  } else if (type === 'subsystem') {
    const matches = state.filteredEvents.filter((event) => event.subsystem === value);
    subtitle = `Events associated with subsystem ${value}.`;
    items = uniqueSorted(matches.map((event) => event.machine)).map((machine) => `<button class="summary-list-item" data-machine-link="${escapeHtml(machine)}"><strong>${escapeHtml(machine)}</strong><div class="text-slate-400 text-sm mt-2">Open machine investigation</div></button>`);
  } else if (type === 'error') {
    const matches = state.filteredEvents.filter((event) => event.title === value);
    subtitle = `Events associated with error ${value}.`;
    items = uniqueSorted(matches.map((event) => event.machine)).map((machine) => `<button class="summary-list-item" data-machine-link="${escapeHtml(machine)}"><strong>${escapeHtml(machine)}</strong><div class="text-slate-400 text-sm mt-2">Open machine investigation</div></button>`);
  }

  state.selectedPanel = { type, value };
  els.machinePanel.classList.remove('hidden');
  els.machinePanelTitle.textContent = title;
  els.machinePanelSubtitle.textContent = subtitle;
  els.machinePanelContent.innerHTML = `<div class="summary-list mt-5">${items.join('') || '<div class="summary-list-item">No matching records found.</div>'}</div>`;
  els.machinePanelContent.querySelectorAll('[data-machine-link]').forEach((button) => {
    button.addEventListener('click', () => renderMachineDetails(button.dataset.machineLink));
  });
}

function openReportModal() {
  if (!state.summary) return;
  els.reportModal.classList.remove('hidden');
  els.reportModalContent.innerHTML = `
    <div class="report-grid">
      <div class="detail-block">
        <div class="detail-k">Executive brief</div>
        <div class="summary-body">${escapeHtml(state.summary.emailSummary)}</div>
      </div>
      <div class="detail-block">
        <div class="detail-k">What needs attention now</div>
        <div class="summary-list mt-4">${state.summary.priorityMachines.map((machine) => `<div class="summary-list-item"><strong>${escapeHtml(machine.machine)}</strong><div class="text-slate-400 text-sm mt-2">${escapeHtml(machine.reasons[0])}</div></div>`).join('')}</div>
      </div>
    </div>
  `;
}

function copySummaryToClipboard() {
  if (!state.summary?.emailSummary) return;
  navigator.clipboard.writeText(state.summary.emailSummary)
    .then(() => setUploadStatus('Executive summary copied to clipboard.', 'success'))
    .catch(() => setUploadStatus('Unable to copy summary in this browser.', 'error'));
}

function closeMachinePanel() {
  state.selectedPanel = null;
  els.machinePanel.classList.add('hidden');
}

function resetAnalysis(showMessage = true) {
  state.rawEvents = [];
  state.normalizedEvents = [];
  state.filteredEvents = [];
  state.summary = null;
  state.selectedPanel = null;
  state.columnMap = null;
  state.currentFileName = '';
  els.fileInput.value = '';
  els.analysisShell.classList.add('hidden');
  els.emptyState.classList.remove('hidden');
  els.machinePanel.classList.add('hidden');
  els.reportModal.classList.add('hidden');
  els.uploadMeta.innerHTML = '';
  els.columnMap.innerHTML = '';
  renderHeroPlaceholder();
  if (showMessage) setUploadStatus('Analysis reset. Upload another file to begin again.', 'info');
}

function renderViewPresets() {
  els.viewPresets.innerHTML = VIEW_PRESETS.map((preset) => `
    <button class="preset-pill ${state.activePreset === preset.key ? 'active' : ''}" data-preset="${preset.key}">${preset.label}</button>
  `).join('');
  els.viewPresets.querySelectorAll('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      const preset = VIEW_PRESETS.find((item) => item.key === button.dataset.preset);
      state.activePreset = preset.key;
      state.visibleSections = new Set(preset.sections);
      renderViewPresets();
      renderSectionSelector();
      updateVisibleSections();
    });
  });
}

function renderSectionSelector() {
  els.sectionSelector.innerHTML = SECTION_OPTIONS.map((section) => `
    <button class="section-pill ${state.visibleSections.has(section.key) ? 'active' : ''}" data-section-toggle="${section.key}">${section.label}</button>
  `).join('');
  els.sectionSelector.querySelectorAll('[data-section-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.sectionToggle;
      if (state.visibleSections.has(key) && state.visibleSections.size > 1) state.visibleSections.delete(key);
      else state.visibleSections.add(key);
      state.activePreset = '';
      renderViewPresets();
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

function getMappedValue(row, key) { return key ? row[key] : ''; }
function normalizeHeader(header) { return String(header || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' '); }
function cleanText(value, fallback = 'Unknown') { const text = String(value == null ? '' : value).trim(); return text || fallback; }

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
  if (timeMatch && timeMatch[0].trim()) return Number(timeMatch[1] || 0) * 60 + Number(timeMatch[2] || 0) + Number(timeMatch[3] || 0) / 60;
  const hhmmss = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hhmmss) return Number(hhmmss[1]) * 60 + Number(hhmmss[2]) + Number(hhmmss[3] || 0) / 60;
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

function deriveMachineRecommendation(events, topSubsystem, topError) {
  const explicit = events.find((event) => event.solution && !/No recommended/i.test(event.solution));
  return explicit ? `${explicit.solution}. Prioritize ${topSubsystem} validation.` : `Inspect ${topSubsystem} first, validate ${topError}, and review recent recovery behavior for repeat escalation.`;
}

function deriveProblematicAreas(events, topSubsystem, topError) {
  const notes = [`Subsystem: ${topSubsystem}`, `Repeat error: ${topError}`];
  const solutionText = events.map((event) => event.solution).find((value) => value && !/No recommended/i.test(value));
  if (solutionText) notes.push(`Suggested check: ${solutionText}`);
  return notes;
}

function countRecoveryLoops(events) {
  let loops = 0;
  for (let index = 1; index < events.length; index += 1) {
    const previous = events[index - 1];
    const current = events[index];
    const gapMinutes = (current.startTime - previous.startTime) / 60000;
    if (/recover/i.test(previous.recovery) && previous.title === current.title && gapMinutes <= 720) loops += 1;
  }
  return loops;
}

function countBurstEvents(events, shortWindowMinutes) {
  let bursts = 0;
  for (let index = 0; index < events.length; index += 1) {
    const start = events[index].startTime;
    let count = 1;
    for (let lookahead = index + 1; lookahead < events.length; lookahead += 1) {
      if ((events[lookahead].startTime - start) / 60000 <= shortWindowMinutes) count += 1;
      else break;
    }
    if (count >= 3) bursts += 1;
  }
  return bursts;
}

function getHighDurationThreshold(events) {
  const durations = events.map((event) => Number(event.durationMinutes || 0)).filter((value) => value > 0).sort((a, b) => a - b);
  if (!durations.length) return 60;
  return Math.max(60, durations[Math.floor(durations.length * 0.8)] || 60);
}

function getDailyTrend(events) {
  const dayMap = new Map();
  events.forEach((event) => dayMap.set(event.dayKey, (dayMap.get(event.dayKey) || 0) + 1));
  return Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([day, value]) => ({ day, value }));
}

function getAnalyzedDateRange(events, filters) {
  if (!events.length) return 'No data in selected range';
  return `${filters.dateFrom || formatDateInput(events[0].startTime)} → ${filters.dateTo || formatDateInput(events[events.length - 1].startTime)}`;
}

function getTopCounts(events, selector, limit) {
  return Array.from(countBy(events, selector).entries()).map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value).slice(0, limit);
}

function countBy(items, selector) {
  return items.reduce((map, item) => {
    const key = selector(item);
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map());
}

function groupBy(items, key) {
  return items.reduce((map, item) => {
    const value = item[key];
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(item);
    return map;
  }, new Map());
}

function getTopEntry(map) {
  let best = ['None', 0];
  map.forEach((value, key) => { if (value > best[1]) best = [key, value]; });
  return { key: best[0], value: best[1] };
}

function sum(items, key) { return items.reduce((acc, item) => acc + Number(item[key] || 0), 0); }
function average(values) { return values.length ? values.reduce((acc, value) => acc + value, 0) / values.length : 0; }
function uniqueSorted(values) { return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))); }
function populateSelect(select, values) { select.innerHTML = '<option value="all">All</option>' + values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join(''); select.value = 'all'; }
function formatDateInput(date) { return date instanceof Date ? date.toISOString().slice(0, 10) : ''; }
function formatDateKey(date) { return date.toISOString().slice(0, 10); }
function formatDateTime(date) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date); }
function formatMinutes(minutes) { if (!minutes) return '0 min'; const hrs = Math.floor(minutes / 60); const mins = Math.round(minutes % 60); if (!hrs) return `${mins} min`; return `${hrs}h ${mins}m`; }
function labelize(value) { return value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()); }
function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function truncate(value, length) { return value.length > length ? `${value.slice(0, length - 1)}…` : value; }
function debounce(fn, wait) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); }; }

function getOrCreateChart(key, element) {
  if (!state.charts[key]) state.charts[key] = echarts.init(element);
  return state.charts[key];
}
