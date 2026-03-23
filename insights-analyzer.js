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
  eventId: ['event id', 'id', 'incident id']
};

const SEVERITY_META = {
  Healthy: { color: '#22c55e', text: 'Healthy' },
  Monitor: { color: '#eab308', text: 'Monitor' },
  Warning: { color: '#f97316', text: 'Warning' },
  Critical: { color: '#ef4444', text: 'Critical' }
};

const state = {
  normalizedEvents: [],
  filteredEvents: [],
  summary: null,
  currentFileName: '',
  columnMap: null,
  charts: {},
  visibleSections: new Set(['executive', 'problem', 'insights', 'trends', 'subsystems', 'errors']),
  filters: {
    dateFrom: '',
    dateTo: '',
    machine: 'all',
    subsystem: 'all',
    errorState: 'all',
    modelVersion: 'all',
    search: '',
    attentionThreshold: 'all',
    topMachineLimit: 5
  }
};

const els = {};

document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  bootstrapNavigation();
  bindUploadEvents();
  bindFilterEvents();
  bindActionEvents();
  renderEmptyState();
});

function cacheDom() {
  [
    'drop-zone', 'file-input', 'upload-status', 'dataset-name', 'upload-meta', 'column-map',
    'loading-state', 'empty-state', 'analysis-shell', 'filter-date-from', 'filter-date-to',
    'filter-machine', 'filter-subsystem', 'filter-error-state', 'filter-model-version', 'filter-search',
    'attention-threshold', 'top-machine-limit', 'active-focus', 'fleet-status-bar', 'fleet-status-legend',
    'ai-summary', 'kpi-grid', 'problem-machines', 'recommended-focus', 'smart-insights',
    'subsystem-priority-list', 'error-priority-list', 'copy-email-summary', 'open-report', 'print-report',
    'reset-analysis', 'report-modal', 'report-close', 'report-content', 'detail-modal', 'detail-close',
    'detail-content', 'detail-subtitle'
  ].forEach((id) => {
    els[toCamel(id)] = document.getElementById(id);
  });

  ['chart-errors-trend', 'chart-top-subsystems', 'chart-top-errors'].forEach((id) => {
    els[toCamel(id)] = document.getElementById(id);
  });
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function bootstrapNavigation() {
  const user = readStoredUser();
  const name = user.username || 'Expert User';
  const role = (user.role || user.type || 'expert').toUpperCase();
  const avatar = name.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'EX';

  const avatarEl = document.getElementById('nav-user-avatar');
  const nameEl = document.getElementById('nav-user-name');
  const roleEl = document.getElementById('nav-user-role');
  if (avatarEl) avatarEl.textContent = avatar;
  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = `${role} ACCESS`;

  window.logout = () => {
    localStorage.removeItem('landaUser');
    window.location.href = 'index.html';
  };
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('landaUser') || '{}');
  } catch (error) {
    return {};
  }
}

function bindUploadEvents() {
  ['dragenter', 'dragover'].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (eventName === 'drop') {
        const file = event.dataTransfer?.files?.[0];
        if (file) processUpload(file);
      }
      els.dropZone.classList.remove('drag-active');
    });
  });

  els.fileInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) processUpload(file);
  });
}

function bindFilterEvents() {
  const filterMap = {
    filterDateFrom: 'dateFrom',
    filterDateTo: 'dateTo',
    filterMachine: 'machine',
    filterSubsystem: 'subsystem',
    filterErrorState: 'errorState',
    filterModelVersion: 'modelVersion',
    filterSearch: 'search',
    attentionThreshold: 'attentionThreshold',
    topMachineLimit: 'topMachineLimit'
  };

  Object.entries(filterMap).forEach(([elKey, filterKey]) => {
    const element = els[elKey];
    const eventName = element.tagName === 'SELECT' ? 'change' : 'input';
    element.addEventListener(eventName, (event) => {
      state.filters[filterKey] = filterKey === 'topMachineLimit' ? Number(event.target.value) : event.target.value;
      recomputeView();
    });
  });

  document.querySelectorAll('[data-section-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const section = button.dataset.sectionToggle;
      if (state.visibleSections.has(section)) state.visibleSections.delete(section);
      else state.visibleSections.add(section);
      button.classList.toggle('active', state.visibleSections.has(section));
      document.getElementById(`section-${section}`).classList.toggle('hidden-section', !state.visibleSections.has(section));
    });
  });
}

function bindActionEvents() {
  els.resetAnalysis.addEventListener('click', resetAnalysis);
  els.copyEmailSummary.addEventListener('click', copySummaryForEmail);
  els.openReport.addEventListener('click', openReport);
  els.printReport.addEventListener('click', () => window.print());
  els.reportClose.addEventListener('click', () => els.reportModal.classList.add('hidden'));
  els.detailClose.addEventListener('click', () => els.detailModal.classList.add('hidden'));
  els.reportModal.addEventListener('click', (event) => {
    if (event.target === els.reportModal) els.reportModal.classList.add('hidden');
  });
  els.detailModal.addEventListener('click', (event) => {
    if (event.target === els.detailModal) els.detailModal.classList.add('hidden');
  });
}

function renderEmptyState() {
  setStatus('Upload an Insight export in CSV or XLSX to start the decision dashboard.', 'info');
  els.analysisShell.classList.add('hidden');
  els.emptyState.classList.remove('hidden');
  els.loadingState.classList.add('hidden');
}

async function processUpload(file) {
  const name = file.name.toLowerCase();
  if (!name.endsWith('.csv') && !name.endsWith('.xlsx')) {
    setStatus('Invalid file type. Please upload a .csv or .xlsx Insight export.', 'error');
    return;
  }

  try {
    setLoading(true, `Analyzing ${file.name}…`);
    const rows = name.endsWith('.csv') ? parseCsv(await file.text()) : parseWorkbook(await file.arrayBuffer());
    if (!rows.length) throw new Error('The uploaded file has no rows to analyze.');

    const { events, columnMap } = normalizeDataset(rows);
    if (!events.length) throw new Error('No usable machine events were found after normalization.');

    state.normalizedEvents = events;
    state.currentFileName = file.name;
    state.columnMap = columnMap;

    initializeFilterControls();
    recomputeView();
    setStatus(`Analysis ready. ${events.length} machine events loaded from ${file.name}.`, 'success');
  } catch (error) {
    console.error(error);
    resetAnalysis(false);
    setStatus(error.message || 'We could not analyze this file.', 'error');
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading, text = 'Analyzing Insight export…') {
  els.loadingState.classList.toggle('hidden', !isLoading);
  els.loadingState.querySelector('span').textContent = text;
  if (isLoading) {
    els.emptyState.classList.add('hidden');
    els.analysisShell.classList.add('hidden');
  }
}

function setStatus(message, type) {
  els.uploadStatus.textContent = message;
  els.uploadStatus.className = `status-pill status-${type}`;
}

function parseCsv(text) {
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
  const model = cleanText(getMappedValue(row, columnMap.model), 'Unknown');
  const version = cleanText(getMappedValue(row, columnMap.version), 'Unknown');
  const title = cleanText(getMappedValue(row, columnMap.title), 'Unspecified Alert');
  const body = cleanText(getMappedValue(row, columnMap.body), 'No alert body provided');
  const subsystem = cleanText(getMappedValue(row, columnMap.subsystem), 'Unknown Subsystem');
  const solution = cleanText(getMappedValue(row, columnMap.solution), 'No solution supplied');
  const errorState = cleanText(getMappedValue(row, columnMap.errorState), inferErrorState(title, body));
  const recovery = cleanText(getMappedValue(row, columnMap.recovery), 'Unknown');
  const preErrorState = cleanText(getMappedValue(row, columnMap.preErrorState), 'Unknown');
  const durationMinutes = parseDurationToMinutes(getMappedValue(row, columnMap.duration));

  return {
    id: cleanText(getMappedValue(row, columnMap.eventId), `event-${index + 1}`),
    machine,
    model,
    version,
    title,
    body,
    solution,
    subsystem,
    errorState,
    recovery,
    preErrorState,
    durationMinutes,
    startTime,
    dayKey: formatDayKey(startTime),
    text: `${machine} ${model} ${version} ${title} ${body} ${subsystem} ${errorState}`.toLowerCase(),
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
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S);
  }
  const text = String(value || '').trim();
  if (!text) return null;
  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) return direct;
  const match = text.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
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
  const durationMatch = text.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/);
  if (durationMatch && durationMatch[0].trim()) {
    const hours = Number(durationMatch[1] || 0);
    const minutes = Number(durationMatch[2] || 0);
    const seconds = Number(durationMatch[3] || 0);
    return hours * 60 + minutes + seconds / 60;
  }
  const hhmmss = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hhmmss) return Number(hhmmss[1]) * 60 + Number(hhmmss[2]) + Number(hhmmss[3] || 0) / 60;
  return 0;
}

function inferErrorState(title, body) {
  const signal = `${title} ${body}`.toLowerCase();
  if (/critical|fatal|emergency|shutdown|stopped/.test(signal)) return 'Critical';
  if (/warning|degraded|unstable|slow/.test(signal)) return 'Warning';
  if (/monitor|notice|check/.test(signal)) return 'Monitor';
  return 'Unknown';
}

function initializeFilterControls() {
  const sortedDates = state.normalizedEvents.map((event) => event.startTime).sort((a, b) => a - b);
  state.filters.dateFrom = toDateInput(sortedDates[0]);
  state.filters.dateTo = toDateInput(sortedDates[sortedDates.length - 1]);
  state.filters.machine = 'all';
  state.filters.subsystem = 'all';
  state.filters.errorState = 'all';
  state.filters.modelVersion = 'all';
  state.filters.search = '';
  state.filters.attentionThreshold = 'all';
  state.filters.topMachineLimit = 5;

  els.filterDateFrom.value = state.filters.dateFrom;
  els.filterDateTo.value = state.filters.dateTo;
  els.filterSearch.value = '';
  els.attentionThreshold.value = 'all';
  els.topMachineLimit.value = '5';

  populateSelect(els.filterMachine, uniqueSorted(state.normalizedEvents.map((event) => event.machine)));
  populateSelect(els.filterSubsystem, uniqueSorted(state.normalizedEvents.map((event) => event.subsystem)));
  populateSelect(els.filterErrorState, uniqueSorted(state.normalizedEvents.map((event) => event.errorState)));
  populateSelect(els.filterModelVersion, uniqueSorted(state.normalizedEvents.map((event) => `${event.model} · ${event.version}`)));

  els.datasetName.textContent = state.currentFileName;
  els.uploadMeta.textContent = `${state.normalizedEvents.length} events across ${uniqueSorted(state.normalizedEvents.map((event) => event.machine)).length} machines.`;
  els.columnMap.innerHTML = Object.entries(state.columnMap).map(([key, value]) => `<span class="chip">${labelize(key)} → ${escapeHtml(value)}</span>`).join('');
}

function populateSelect(select, values) {
  select.innerHTML = '<option value="all">All</option>' + values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  select.value = 'all';
}

function recomputeView() {
  if (!state.normalizedEvents.length) return;
  state.filteredEvents = applyFilters(state.normalizedEvents);
  state.summary = buildSummary(state.filteredEvents);
  renderDashboard();
}

function applyFilters(events) {
  const from = state.filters.dateFrom ? new Date(`${state.filters.dateFrom}T00:00:00`) : null;
  const to = state.filters.dateTo ? new Date(`${state.filters.dateTo}T23:59:59`) : null;
  const search = state.filters.search.trim().toLowerCase();

  return events.filter((event) => {
    if (from && event.startTime < from) return false;
    if (to && event.startTime > to) return false;
    if (state.filters.machine !== 'all' && event.machine !== state.filters.machine) return false;
    if (state.filters.subsystem !== 'all' && event.subsystem !== state.filters.subsystem) return false;
    if (state.filters.errorState !== 'all' && event.errorState !== state.filters.errorState) return false;
    if (state.filters.modelVersion !== 'all' && `${event.model} · ${event.version}` !== state.filters.modelVersion) return false;
    if (search && !event.text.includes(search)) return false;
    return true;
  });
}

function buildSummary(events) {
  const machineGroups = groupBy(events, (event) => event.machine);
  const machines = Array.from(machineGroups.entries()).map(([machine, machineEvents]) => buildMachineSummary(machine, machineEvents));

  let rankedMachines = [...machines].sort((a, b) => b.attentionScore - a.attentionScore || b.totalDowntime - a.totalDowntime || b.totalErrors - a.totalErrors);
  if (state.filters.attentionThreshold === 'warning') rankedMachines = rankedMachines.filter((machine) => ['Warning', 'Critical'].includes(machine.severity));
  if (state.filters.attentionThreshold === 'critical') rankedMachines = rankedMachines.filter((machine) => machine.severity === 'Critical');

  const statusCounts = {
    Healthy: machines.filter((machine) => machine.severity === 'Healthy').length,
    Monitor: machines.filter((machine) => machine.severity === 'Monitor').length,
    Warning: machines.filter((machine) => machine.severity === 'Warning').length,
    Critical: machines.filter((machine) => machine.severity === 'Critical').length
  };

  const topErrors = topCounts(events, (event) => event.title, 10).map((row) => ({
    ...row,
    affectedMachines: uniqueSorted(events.filter((event) => event.title === row.key).map((event) => event.machine))
  }));
  const topSubsystems = topCounts(events, (event) => event.subsystem, 5).map((row) => ({
    ...row,
    affectedMachines: uniqueSorted(events.filter((event) => event.subsystem === row.key).map((event) => event.machine))
  }));
  const trendSeries = timeSeries(events);
  const smartInsights = buildSmartInsights(events, machines, topErrors, topSubsystems);
  const recommendedFocus = buildRecommendedFocus(machines, smartInsights, topErrors, topSubsystems);

  return {
    events,
    machines,
    rankedMachines,
    statusCounts,
    totalMachines: machines.length,
    totalErrors: events.length,
    totalDowntime: sum(events, (event) => event.durationMinutes),
    topErrors,
    topSubsystems,
    trendSeries,
    smartInsights,
    recommendedFocus,
    aiSummary: buildAiSummary(machines, statusCounts, topErrors, topSubsystems),
    dateRange: formatDateRange(events)
  };
}

function buildMachineSummary(machine, events) {
  const totalErrors = events.length;
  const totalDowntime = sum(events, (event) => event.durationMinutes);
  const avgDuration = totalErrors ? totalDowntime / totalErrors : 0;
  const errorCounts = countBy(events, (event) => event.title);
  const subsystemCounts = countBy(events, (event) => event.subsystem);
  const sorted = [...events].sort((a, b) => a.startTime - b.startTime);
  const half = Math.ceil(sorted.length / 2);
  const older = sorted.slice(0, half);
  const recent = sorted.slice(half);
  const topError = topEntry(errorCounts);
  const topSubsystem = topEntry(subsystemCounts);
  const repeatedErrorOccurrences = Array.from(errorCounts.values()).filter((count) => count > 1).reduce((acc, count) => acc + count, 0);
  const repeatedErrorFlag = Array.from(errorCounts.values()).some((count) => count > 10);
  const subsystemIssueFlag = Array.from(subsystemCounts.values()).some((count) => count > 30);
  const highDowntimeFlag = totalDowntime > 240 || (totalDowntime > 150 && totalErrors < 50);
  const concentratedFailureFlag = totalErrors > 0 && topSubsystem.value / totalErrors >= 0.7;
  const longDurationFlag = avgDuration >= 15;
  const worseningFlag = recent.length > older.length + 5;
  const repeatedRecoveryFlag = countRecoveryLoops(sorted) >= 2;
  const severity = classifySeverity(totalErrors);

  const attentionScore = Math.round(
    severityBaseScore(severity) +
    Math.min(50, totalDowntime / 8) +
    (repeatedErrorFlag ? 24 : 0) +
    (subsystemIssueFlag ? 18 : 0) +
    (highDowntimeFlag ? 18 : 0) +
    (concentratedFailureFlag ? 14 : 0) +
    (longDurationFlag ? 12 : 0) +
    (worseningFlag ? 15 : 0) +
    (repeatedRecoveryFlag ? 12 : 0)
  );

  const reasons = [];
  if (repeatedErrorFlag) reasons.push(`same alert repeated ${topError.value} times`);
  if (subsystemIssueFlag) reasons.push(`${topSubsystem.key} exceeded 30 events`);
  if (highDowntimeFlag) reasons.push(`${formatMinutes(totalDowntime)} downtime impact`);
  if (concentratedFailureFlag) reasons.push(`${Math.round((topSubsystem.value / totalErrors) * 100)}% of failures in ${topSubsystem.key}`);
  if (longDurationFlag) reasons.push(`${Math.round(avgDuration)}m average duration`);
  if (worseningFlag) reasons.push('recent event trend is worsening');
  if (repeatedRecoveryFlag) reasons.push('recovery/failure loop detected');

  const recommendedAction = deriveMachineAction(events, topSubsystem.key, topError.key);

  return {
    machine,
    model: events[0]?.model || 'Unknown',
    version: events[0]?.version || 'Unknown',
    events,
    totalErrors,
    totalDowntime,
    avgDuration,
    severity,
    severityColor: SEVERITY_META[severity].color,
    topError: topError.key,
    topErrorCount: topError.value,
    topSubsystem: topSubsystem.key,
    topSubsystemCount: topSubsystem.value,
    attentionScore,
    reasons,
    recommendedAction,
    repeatedErrorFlag,
    subsystemIssueFlag,
    highDowntimeFlag,
    concentratedFailureFlag,
    longDurationFlag,
    worseningFlag,
    repeatedRecoveryFlag,
    recentCount: recent.length,
    olderCount: older.length,
    repeatedErrorOccurrences
  };
}

function classifySeverity(totalErrors) {
  if (totalErrors < 50) return 'Healthy';
  if (totalErrors <= 80) return 'Monitor';
  if (totalErrors <= 150) return 'Warning';
  return 'Critical';
}

function severityBaseScore(severity) {
  if (severity === 'Critical') return 140;
  if (severity === 'Warning') return 90;
  if (severity === 'Monitor') return 55;
  return 25;
}

function buildSmartInsights(events, machines, topErrors, topSubsystems) {
  const insights = [];
  const multiMachineError = topErrors.find((row) => row.value > 10 && row.affectedMachines.length >= 2);
  if (multiMachineError) {
    insights.push({
      title: 'Repeated error spreading across the fleet',
      explanation: `${multiMachineError.key} repeated ${multiMachineError.value} times across ${multiMachineError.affectedMachines.length} machines. This is no longer a one-off local issue.`,
      entities: multiMachineError.affectedMachines.map((machine) => ({ type: 'machine', value: machine })),
      priority: 100
    });
  }

  const overloadedSubsystem = topSubsystems.find((row) => row.value > 30);
  if (overloadedSubsystem) {
    insights.push({
      title: 'Subsystem overload detected',
      explanation: `${overloadedSubsystem.key} accumulated ${overloadedSubsystem.value} alerts and is currently the dominant subsystem risk in the filtered fleet.`,
      entities: [{ type: 'subsystem', value: overloadedSubsystem.key }, ...overloadedSubsystem.affectedMachines.slice(0, 4).map((machine) => ({ type: 'machine', value: machine }))],
      priority: 90
    });
  }

  const highDowntimeLowErrors = machines.find((machine) => machine.highDowntimeFlag && machine.totalErrors < 50);
  if (highDowntimeLowErrors) {
    insights.push({
      title: 'High downtime with relatively low event count',
      explanation: `${highDowntimeLowErrors.machine} does not have the highest alert count, but it lost ${formatMinutes(highDowntimeLowErrors.totalDowntime)} and may be hiding a severe availability issue.`,
      entities: [{ type: 'machine', value: highDowntimeLowErrors.machine }],
      priority: 85
    });
  }

  const worseningMachines = machines.filter((machine) => machine.worseningFlag).slice(0, 4);
  if (worseningMachines.length) {
    insights.push({
      title: 'Machines with worsening recent trend',
      explanation: `${worseningMachines.map((machine) => machine.machine).join(', ')} are seeing more recent events than earlier ones in the filtered range and should be checked before the next run window.`,
      entities: worseningMachines.map((machine) => ({ type: 'machine', value: machine.machine })),
      priority: 80
    });
  }

  const concentratedMachine = machines.find((machine) => machine.concentratedFailureFlag);
  if (concentratedMachine) {
    insights.push({
      title: 'Concentrated failure source',
      explanation: `${concentratedMachine.machine} is dominated by ${concentratedMachine.topSubsystem}, suggesting a focused root-cause investigation rather than broad machine checks.`,
      entities: [{ type: 'machine', value: concentratedMachine.machine }, { type: 'subsystem', value: concentratedMachine.topSubsystem }],
      priority: 76
    });
  }

  if (!insights.length) {
    insights.push({
      title: 'No abnormal fleet-wide pattern detected',
      explanation: 'The current filtered slice does not cross the configured repeating-error, subsystem overload, downtime, or worsening-trend thresholds.',
      entities: [],
      priority: 10
    });
  }

  return insights.sort((a, b) => b.priority - a.priority).slice(0, 6);
}

function buildRecommendedFocus(machines, insights, topErrors, topSubsystems) {
  const focus = [];
  if (machines[0]) focus.push({ title: `Stabilize ${machines[0].machine}`, text: machines[0].reasons[0] || machines[0].recommendedAction, type: 'machine', value: machines[0].machine });
  if (topSubsystems[0]) focus.push({ title: `Inspect ${topSubsystems[0].key}`, text: `${topSubsystems[0].value} alerts across ${topSubsystems[0].affectedMachines.length} machines.`, type: 'subsystem', value: topSubsystems[0].key });
  if (topErrors[0]) focus.push({ title: `Contain ${topErrors[0].key}`, text: `${topErrors[0].value} recurrences detected.`, type: 'error', value: topErrors[0].key });
  if (insights[0]) focus.push({ title: 'Follow top smart insight', text: insights[0].title, type: insights[0].entities[0]?.type || 'machine', value: insights[0].entities[0]?.value || machines[0]?.machine });
  return focus.filter((item) => item.value);
}

function buildAiSummary(machines, statusCounts, topErrors, topSubsystems) {
  if (!machines.length) return 'No machines are included in the current filter slice.';
  const dominantStatus = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0];
  const mainError = topErrors[0]?.key || 'unknown recurring alerts';
  const mainSubsystem = topSubsystems[0]?.key || 'unknown subsystems';
  return `Out of ${machines.length} machines, ${dominantStatus[1]} are in ${dominantStatus[0]} state, mainly driven by ${mainSubsystem} issues and repeat ${mainError} alerts. Prioritize the top flagged machines first, then use drill-down to confirm recurrence, duration impact, and recovery behavior.`;
}

function deriveMachineAction(events, topSubsystem, topError) {
  const solution = events.find((event) => event.solution && event.solution !== 'No solution supplied')?.solution;
  if (solution) return `${solution}. Start with ${topSubsystem} and validate the conditions behind ${topError}.`;
  return `Check ${topSubsystem} first, verify why ${topError} keeps returning, and confirm the machine exits recovery cleanly.`;
}

function renderDashboard() {
  els.emptyState.classList.add('hidden');
  els.analysisShell.classList.remove('hidden');
  renderExecutiveSummary();
  renderProblemMachines();
  renderRecommendedFocus();
  renderSmartInsights();
  renderPriorityLists();
  renderCharts();
  els.activeFocus.textContent = 'Fleet view';
}

function renderExecutiveSummary() {
  const summary = state.summary;
  const total = Math.max(summary.totalMachines, 1);
  els.fleetStatusBar.innerHTML = Object.entries(summary.statusCounts).map(([status, count]) => `
    <div class="status-segment" title="${status}: ${count}" style="width:${(count / total) * 100}%; background:${SEVERITY_META[status].color}"></div>
  `).join('');

  els.fleetStatusLegend.innerHTML = Object.entries(summary.statusCounts).map(([status, count]) => `
    <div class="legend-item">
      <div class="legend-label">${status}</div>
      <div class="legend-value" style="color:${SEVERITY_META[status].color}">${count}</div>
    </div>
  `).join('');

  const criticalMachines = summary.rankedMachines.filter((machine) => machine.severity === 'Critical').length;
  const cards = [
    { label: 'Total machines', value: summary.totalMachines, detail: summary.dateRange },
    { label: 'Total errors', value: summary.totalErrors, detail: `${criticalMachines} critical machines` },
    { label: 'Total downtime', value: formatMinutes(summary.totalDowntime), detail: `${summary.smartInsights.length} smart insights generated` },
    { label: 'Machines needing attention', value: summary.rankedMachines.slice(0, state.filters.topMachineLimit).length, detail: `${state.filters.topMachineLimit} shown in focus section` }
  ];

  els.kpiGrid.innerHTML = cards.map((card) => `
    <div class="kpi-card">
      <div class="kpi-label">${card.label}</div>
      <div class="kpi-value">${card.value}</div>
      <div class="kpi-detail">${card.detail}</div>
    </div>
  `).join('');

  els.aiSummary.textContent = summary.aiSummary;
}

function renderProblemMachines() {
  const machines = state.summary.rankedMachines.slice(0, state.filters.topMachineLimit);
  els.problemMachines.innerHTML = machines.length ? machines.map((machine) => `
    <button class="machine-card" data-machine="${escapeHtml(machine.machine)}">
      <div class="machine-head">
        <div>
          <div class="machine-name">${escapeHtml(machine.machine)}</div>
          <div class="machine-meta">${escapeHtml(machine.model)} · ${escapeHtml(machine.version)}</div>
        </div>
        <span class="severity-badge" style="color:${machine.severityColor}; border-color:${machine.severityColor};">${machine.severity}</span>
      </div>
      <div class="metric-pair">
        <span><strong>${machine.totalErrors}</strong> errors</span>
        <span><strong>${formatMinutes(machine.totalDowntime)}</strong> downtime</span>
      </div>
      <div class="machine-reason mt-3">Top error: ${escapeHtml(machine.topError)} · Top subsystem: ${escapeHtml(machine.topSubsystem)}</div>
      <div class="machine-reason mt-2">Why flagged: ${escapeHtml(machine.reasons[0] || 'Needs attention due to combined severity and downtime impact.')}</div>
      <div class="machine-action mt-2">Action: ${escapeHtml(machine.recommendedAction)}</div>
    </button>
  `).join('') : '<div class="section-subtitle">No machines match the current severity and filter selection.</div>';

  els.problemMachines.querySelectorAll('[data-machine]').forEach((button) => {
    button.addEventListener('click', () => openDetail('machine', button.dataset.machine));
  });
}

function renderRecommendedFocus() {
  els.recommendedFocus.innerHTML = state.summary.recommendedFocus.map((item) => `
    <div class="mini-row">
      <div>
        <button data-entity-type="${item.type}" data-entity-value="${escapeHtml(item.value)}">${escapeHtml(item.title)}</button>
        <small>${escapeHtml(item.text)}</small>
      </div>
      <span class="mini-value">Open</span>
    </div>
  `).join('');
  bindEntityButtons(els.recommendedFocus);
}

function renderSmartInsights() {
  els.smartInsights.innerHTML = state.summary.smartInsights.map((insight) => `
    <div class="insight-card">
      <div class="insight-title">${escapeHtml(insight.title)}</div>
      <div class="insight-text">${escapeHtml(insight.explanation)}</div>
      <div class="insight-tags">${insight.entities.map((entity) => `<button class="entity-button" data-entity-type="${entity.type}" data-entity-value="${escapeHtml(entity.value)}">${escapeHtml(entity.value)}</button>`).join('')}</div>
    </div>
  `).join('');
  bindEntityButtons(els.smartInsights);
}

function renderPriorityLists() {
  els.subsystemPriorityList.innerHTML = state.summary.topSubsystems.map((row) => `
    <div class="mini-row">
      <div>
        <button data-entity-type="subsystem" data-entity-value="${escapeHtml(row.key)}">${escapeHtml(row.key)}</button>
        <small>${row.affectedMachines.length} affected machines</small>
      </div>
      <span class="mini-value">${row.value}</span>
    </div>
  `).join('');

  els.errorPriorityList.innerHTML = state.summary.topErrors.map((row) => `
    <div class="mini-row">
      <div>
        <button data-entity-type="error" data-entity-value="${escapeHtml(row.key)}">${escapeHtml(row.key)}</button>
        <small>${row.affectedMachines.length} affected machines</small>
      </div>
      <span class="mini-value">${row.value}</span>
    </div>
  `).join('');

  bindEntityButtons(els.subsystemPriorityList);
  bindEntityButtons(els.errorPriorityList);
}

function bindEntityButtons(container) {
  container.querySelectorAll('[data-entity-type]').forEach((button) => {
    button.addEventListener('click', () => openDetail(button.dataset.entityType, button.dataset.entityValue));
  });
}

function renderCharts() {
  renderTrendChart();
  renderTopSubsystemsChart();
  renderTopErrorsChart();
}

function renderTrendChart() {
  const chart = ensureChart(els.chartErrorsTrend);
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 42, right: 20, top: 24, bottom: 38 },
    xAxis: { type: 'category', data: state.summary.trendSeries.labels, axisLabel: { color: '#94a3b8' } },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,.12)' } } },
    series: [{ type: 'line', smooth: true, data: state.summary.trendSeries.values, symbolSize: 8, lineStyle: { color: '#22d3ee', width: 3 }, areaStyle: { color: 'rgba(34,211,238,.12)' } }]
  });
}

function renderTopSubsystemsChart() {
  const rows = state.summary.topSubsystems.slice(0, 5);
  const chart = ensureChart(els.chartTopSubsystems);
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 110, right: 20, top: 24, bottom: 24 },
    xAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,.12)' } } },
    yAxis: { type: 'category', data: rows.map((row) => row.key), axisLabel: { color: '#94a3b8' } },
    series: [{ type: 'bar', data: rows.map((row) => ({ value: row.value, name: row.key })), itemStyle: { color: '#3b82f6', borderRadius: [0, 10, 10, 0] } }]
  });
  chart.off('click');
  chart.on('click', (params) => openDetail('subsystem', params.name));
}

function renderTopErrorsChart() {
  const rows = state.summary.topErrors.slice(0, 10);
  const chart = ensureChart(els.chartTopErrors);
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 42, right: 20, top: 24, bottom: 90 },
    xAxis: { type: 'category', data: rows.map((row) => truncate(row.key, 20)), axisLabel: { color: '#94a3b8', interval: 0, rotate: 28 } },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,.12)' } } },
    series: [{ type: 'bar', data: rows.map((row) => row.value), itemStyle: { color: '#f97316', borderRadius: [10, 10, 0, 0] } }]
  });
  chart.off('click');
  chart.on('click', (params) => openDetail('error', rows[params.dataIndex]?.key));
}

function ensureChart(element) {
  if (!state.charts[element.id]) {
    state.charts[element.id] = echarts.init(element);
    window.addEventListener('resize', () => state.charts[element.id]?.resize());
  }
  return state.charts[element.id];
}

function openDetail(type, value) {
  let html = '';
  if (type === 'machine') html = buildMachineDetail(value);
  if (type === 'subsystem') html = buildSubsystemDetail(value);
  if (type === 'error') html = buildErrorDetail(value);
  if (!html) return;
  els.activeFocus.textContent = `${labelize(type)}: ${value}`;
  els.detailContent.innerHTML = html;
  els.detailSubtitle.textContent = `${labelize(type)} · ${value}`;
  els.detailModal.classList.remove('hidden');
}

function buildMachineDetail(machineName) {
  const machine = state.summary.machines.find((item) => item.machine === machineName);
  if (!machine) return '';

  const timeline = machine.events.slice().sort((a, b) => b.startTime - a.startTime).slice(0, 18).map((event) => `
    <div class="timeline-row">
      <div><strong>${formatDateTime(event.startTime)}</strong><br><span style="color:#94a3b8">${escapeHtml(event.errorState)}</span></div>
      <div>${escapeHtml(event.title)}</div>
      <div>${escapeHtml(event.subsystem)}</div>
      <div>${formatMinutes(event.durationMinutes)}</div>
    </div>
  `).join('');

  return `
    <div class="glass-card" style="padding:0; border:none; box-shadow:none; background:transparent;">
      <div class="detail-grid">
        <div class="detail-card"><span>Severity</span><strong style="color:${machine.severityColor}">${machine.severity}</strong></div>
        <div class="detail-card"><span>Total errors</span><strong>${machine.totalErrors}</strong></div>
        <div class="detail-card"><span>Total downtime</span><strong>${formatMinutes(machine.totalDowntime)}</strong></div>
        <div class="detail-card"><span>Avg duration</span><strong>${Math.round(machine.avgDuration)}m</strong></div>
      </div>
      <div class="details-shell" style="margin-top:1rem;">
        <div class="glass-card">
          <div class="section-title">Why this machine is flagged</div>
          <ul class="label-list">${machine.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('') || '<li>No high-priority rule triggered in the current filter slice.</li>'}</ul>
          <div class="section-title" style="margin-top:1rem;">Recommended proactive action</div>
          <div class="section-subtitle mt-2">${escapeHtml(machine.recommendedAction)}</div>
        </div>
        <div class="glass-card">
          <div class="section-title">Recurring patterns</div>
          <ul class="label-list">
            <li>Top error: ${escapeHtml(machine.topError)} (${machine.topErrorCount})</li>
            <li>Top subsystem: ${escapeHtml(machine.topSubsystem)} (${machine.topSubsystemCount})</li>
            <li>Recent vs earlier alerts: ${machine.recentCount} vs ${machine.olderCount}</li>
            <li>Recovery loops flagged: ${machine.repeatedRecoveryFlag ? 'Yes' : 'No'}</li>
          </ul>
        </div>
      </div>
      <div class="glass-card" style="margin-top:1rem;">
        <div class="section-title">Recent event timeline</div>
        <div class="timeline">${timeline || '<div class="section-subtitle">No recent timeline available.</div>'}</div>
      </div>
    </div>
  `;
}

function buildSubsystemDetail(subsystem) {
  const events = state.filteredEvents.filter((event) => event.subsystem === subsystem);
  const topMachines = topCounts(events, (event) => event.machine, 8);
  const topErrors = topCounts(events, (event) => event.title, 8);
  return `
    <div class="details-shell">
      <div class="glass-card">
        <div class="section-title">Subsystem overview</div>
        <ul class="label-list">
          <li>Total events: ${events.length}</li>
          <li>Total downtime: ${formatMinutes(sum(events, (event) => event.durationMinutes))}</li>
          <li>Affected machines: ${uniqueSorted(events.map((event) => event.machine)).length}</li>
          <li>Recurring alerts: ${topErrors[0] ? `${escapeHtml(topErrors[0].key)} (${topErrors[0].value})` : 'None'}</li>
        </ul>
      </div>
      <div class="glass-card">
        <div class="section-title">Machines most affected</div>
        <ul class="label-list">${topMachines.map((row) => `<li><button class="entity-button" data-entity-type="machine" data-entity-value="${escapeHtml(row.key)}">${escapeHtml(row.key)}</button> · ${row.value} alerts</li>`).join('')}</ul>
      </div>
      <div class="glass-card" style="grid-column:1 / -1;">
        <div class="section-title">Top recurring errors in subsystem</div>
        <ul class="label-list">${topErrors.map((row) => `<li><button class="entity-button" data-entity-type="error" data-entity-value="${escapeHtml(row.key)}">${escapeHtml(row.key)}</button> · ${row.value} events</li>`).join('')}</ul>
      </div>
    </div>
  `;
}

function buildErrorDetail(errorTitle) {
  const events = state.filteredEvents.filter((event) => event.title === errorTitle);
  const topMachines = topCounts(events, (event) => event.machine, 10);
  const topSubsystems = topCounts(events, (event) => event.subsystem, 6);
  const bodySample = events.find((event) => event.body)?.body || 'No alert body available.';
  const solutionSample = events.find((event) => event.solution)?.solution || 'No solution available.';
  return `
    <div class="details-shell">
      <div class="glass-card">
        <div class="section-title">Error overview</div>
        <ul class="label-list">
          <li>Total recurrences: ${events.length}</li>
          <li>Affected machines: ${uniqueSorted(events.map((event) => event.machine)).length}</li>
          <li>Total downtime: ${formatMinutes(sum(events, (event) => event.durationMinutes))}</li>
          <li>Primary subsystem: ${topSubsystems[0] ? escapeHtml(topSubsystems[0].key) : 'Unknown'}</li>
        </ul>
      </div>
      <div class="glass-card">
        <div class="section-title">Affected machines</div>
        <ul class="label-list">${topMachines.map((row) => `<li><button class="entity-button" data-entity-type="machine" data-entity-value="${escapeHtml(row.key)}">${escapeHtml(row.key)}</button> · ${row.value} events</li>`).join('')}</ul>
      </div>
      <div class="glass-card" style="grid-column:1 / -1;">
        <div class="section-title">Alert explanation</div>
        <div class="section-subtitle mt-2">${escapeHtml(bodySample)}</div>
        <div class="section-title" style="margin-top:1rem;">Suggested action</div>
        <div class="section-subtitle mt-2">${escapeHtml(solutionSample)}</div>
      </div>
    </div>
  `;
}

function openReport() {
  els.reportContent.innerHTML = `<pre style="white-space:pre-wrap; font-family:Inter, sans-serif; color:#e2e8f0; line-height:1.8; margin:0;">${escapeHtml(buildEmailSummaryText())}</pre>`;
  els.reportModal.classList.remove('hidden');
}

async function copySummaryForEmail() {
  try {
    await navigator.clipboard.writeText(buildEmailSummaryText());
    setStatus('Summary copied for email.', 'success');
  } catch (error) {
    setStatus('Clipboard copy failed in this environment.', 'error');
  }
}

function buildEmailSummaryText() {
  const summary = state.summary;
  const focusMachines = summary.rankedMachines.slice(0, 5);
  return [
    'Fleet Summary:',
    `- Total machines: ${summary.totalMachines}`,
    `- Total errors: ${summary.totalErrors}`,
    `- Total downtime: ${formatMinutes(summary.totalDowntime)}`,
    `- Healthy: ${summary.statusCounts.Healthy}`,
    `- Monitor: ${summary.statusCounts.Monitor}`,
    `- Warning: ${summary.statusCounts.Warning}`,
    `- Critical: ${summary.statusCounts.Critical}`,
    '',
    'Critical Machines:',
    ...(focusMachines.length ? focusMachines.map((machine) => `- ${machine.machine} → ${machine.topSubsystem} (${machine.totalErrors} errors, ${formatMinutes(machine.totalDowntime)} downtime)`) : ['- None in the current filter slice']),
    '',
    'Key Issues:',
    ...(summary.smartInsights.length ? summary.smartInsights.slice(0, 4).map((insight) => `- ${insight.title}: ${insight.explanation}`) : ['- No smart insights detected']),
    '',
    'Recommended Focus:',
    ...(summary.recommendedFocus.length ? summary.recommendedFocus.map((item) => `- ${item.title}: ${item.text}`) : ['- Maintain current preventive maintenance cadence'])
  ].join('\n');
}

function resetAnalysis(showInfo = true) {
  state.normalizedEvents = [];
  state.filteredEvents = [];
  state.summary = null;
  state.currentFileName = '';
  state.columnMap = null;
  els.fileInput.value = '';
  els.datasetName.textContent = 'No file loaded';
  els.uploadMeta.textContent = 'Upload a file to start.';
  els.columnMap.innerHTML = '';
  els.analysisShell.classList.add('hidden');
  els.emptyState.classList.remove('hidden');
  els.detailModal.classList.add('hidden');
  els.reportModal.classList.add('hidden');
  els.activeFocus.textContent = 'Fleet view';
  if (showInfo) setStatus('Analysis reset. Upload another dataset to continue.', 'info');
}

function groupBy(items, getter) {
  const map = new Map();
  items.forEach((item) => {
    const key = getter(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
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

function topCounts(items, getter, limit) {
  return Array.from(countBy(items, getter).entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, value]) => ({ key, value }));
}

function topEntry(map) {
  const entry = Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0];
  return entry ? { key: entry[0], value: entry[1] } : { key: 'Unknown', value: 0 };
}

function timeSeries(events) {
  const grouped = groupBy([...events].sort((a, b) => a.startTime - b.startTime), (event) => event.dayKey);
  const labels = Array.from(grouped.keys());
  const values = labels.map((label) => grouped.get(label).length);
  return { labels, values };
}

function countRecoveryLoops(events) {
  let loops = 0;
  for (let index = 1; index < events.length; index += 1) {
    const previous = events[index - 1];
    const current = events[index];
    if (/recover/i.test(previous.recovery) && previous.title === current.title && ((current.startTime - previous.startTime) / 60000) <= 720) {
      loops += 1;
    }
  }
  return loops;
}

function sum(items, getter) {
  return items.reduce((total, item) => total + Number(getter(item) || 0), 0);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)));
}

function toDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function formatDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(value);
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(value);
}

function formatDateRange(events) {
  if (!events.length) return 'No events in active range';
  const sorted = [...events].sort((a, b) => a.startTime - b.startTime);
  return `${formatDate(sorted[0].startTime)} → ${formatDate(sorted[sorted.length - 1].startTime)}`;
}

function formatMinutes(value) {
  const minutes = Math.round(Number(value || 0));
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

function truncate(value, max) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function labelize(value) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-entity-type]');
  if (!button) return;
  openDetail(button.dataset.entityType, button.dataset.entityValue);
});
