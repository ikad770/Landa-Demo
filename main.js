// Landa Resolved Case Intelligence - Main JavaScript
(function(){
    const STORAGE_KEY = 'landaCases';
    const FILTER_KEY = 'landaCasesFilter';
    const DEFAULT_USER_KEY = 'landaUser';

    const SAMPLE_CASES = [
        {
            caseId: 'SF-2024-001',
            title: 'Ink flow interruption during high-speed production',
            pressType: 'Simplex',
            pressName: 'S1',
            region: 'EMEA',
            system: 'Printing',
            subSystem: 'Ink Delivery',
            area: 'HW',
            description: 'Intermittent ink starvation caused visible density loss during long, high-speed print runs.',
            symptoms: ['Density drops on long runs', 'Ink starvation alarm', 'Visible quality degradation'],
            resolutionSteps: [
                { text: 'Inspect and clean ink filters to remove flow restriction.', usefulness: 5 },
                { text: 'Verify viscosity and supply pressure are within specification.', usefulness: 4 },
                { text: 'Replace the damaged ink supply hose.', usefulness: 5 }
            ],
            mostHelpfulAction: 'Replace the damaged ink supply hose.',
            parts: ['Ink Supply Hose - Part #IS-001'],
            attachments: ['flow-trend.png', 'hose-inspection.jpg'],
            author: 'Yossi Cohen',
            publishedAt: '2024-12-01',
            criticality: 'Critical',
            tags: ['ink', 'density', 'high-speed'],
            usefulnessScore: 4.8,
            timeToResolution: '30 min'
        },
        {
            caseId: 'SF-2024-002',
            title: 'Paper jams in feeder section with coated stock',
            pressType: 'Duplex',
            pressName: 'D3',
            region: 'North America',
            system: 'Paper Handling',
            subSystem: 'Feeder',
            area: 'HW',
            description: 'Repeated feeder jams appeared when running coated stock at normal production speed.',
            symptoms: ['Feeder jam at start of run', 'Misfeed on coated stock', 'Vacuum instability'],
            resolutionSteps: [
                { text: 'Adjust feed roller pressure for coated stock handling.', usefulness: 4 },
                { text: 'Clean feed rollers thoroughly with approved solvent.', usefulness: 5 },
                { text: 'Replace the worn feed roller assembly and recalibrate the thickness sensor.', usefulness: 5 }
            ],
            mostHelpfulAction: 'Replace the worn feed roller assembly and recalibrate the thickness sensor.',
            parts: ['Feed Roller Assembly - Part #FR-003'],
            attachments: ['roller-wear.jpg'],
            author: 'Sarah Levy',
            publishedAt: '2024-12-02',
            criticality: 'Critical',
            tags: ['paper jam', 'feeder', 'coated stock'],
            usefulnessScore: 4.6,
            timeToResolution: '25 min'
        },
        {
            caseId: 'SF-2024-003',
            title: 'Print registration drift on long runs',
            pressType: 'Simplex',
            pressName: 'S2',
            region: 'APAC',
            system: 'Control',
            subSystem: 'Software',
            area: 'SW',
            description: 'Registration drift appeared after extended runtime and was traced to calibration and software state.',
            symptoms: ['Registration drift after 2,000 sheets', 'Alignment mismatch', 'Operator recalibration required'],
            resolutionSteps: [
                { text: 'Restart print control software and clear the active registration profile.', usefulness: 4 },
                { text: 'Recalibrate registration sensors.', usefulness: 5 },
                { text: 'Apply the current software update and verify timing belt tension.', usefulness: 4 }
            ],
            mostHelpfulAction: 'Recalibrate registration sensors.',
            parts: [],
            attachments: ['registration-test.pdf'],
            author: 'David Gold',
            publishedAt: '2024-12-03',
            criticality: 'Elevated',
            tags: ['registration', 'software', 'calibration'],
            usefulnessScore: 4.9,
            timeToResolution: '20 min'
        },
        {
            caseId: 'SF-2024-004',
            title: 'Color consistency variation between duplex sides',
            pressType: 'Duplex',
            pressName: 'D4',
            region: 'EMEA',
            system: 'Quality Control',
            subSystem: 'Color Management',
            area: 'SW',
            description: 'Blue tones varied between front and back sides due to color sensor contamination and profile drift.',
            symptoms: ['Front/back color mismatch', 'Blue tone drift', 'Repeated calibration requests'],
            resolutionSteps: [
                { text: 'Run the full color calibration routine.', usefulness: 4 },
                { text: 'Clean all color sensors using the approved kit.', usefulness: 5 },
                { text: 'Apply the updated coated-stock color profile.', usefulness: 4 }
            ],
            mostHelpfulAction: 'Clean all color sensors using the approved kit.',
            parts: ['Color Sensor Cleaning Kit'],
            attachments: ['delta-e-report.xlsx'],
            author: 'Maya Stern',
            publishedAt: '2024-12-04',
            criticality: 'Elevated',
            tags: ['color', 'duplex', 'sensor'],
            usefulnessScore: 4.3,
            timeToResolution: '45 min'
        },
        {
            caseId: 'SF-2024-005',
            title: 'UV lamp curing weakness causing smearing',
            pressType: 'Simplex',
            pressName: 'S3',
            region: 'Latin America',
            system: 'Drying',
            subSystem: 'UV Curing',
            area: 'HW',
            description: 'Low UV output caused poor adhesion and smearing on production jobs.',
            symptoms: ['Smearing after print', 'Low curing intensity', 'Adhesion failure'],
            resolutionSteps: [
                { text: 'Measure UV intensity and confirm low output.', usefulness: 4 },
                { text: 'Clean reflectors and inspect bulb condition.', usefulness: 4 },
                { text: 'Replace the UV bulb set and retune lamp power.', usefulness: 5 }
            ],
            mostHelpfulAction: 'Replace the UV bulb set and retune lamp power.',
            parts: ['UV Lamp Bulb Set - Part #UV-002'],
            attachments: ['uv-meter-reading.png', 'lamp-before-after.jpg'],
            author: 'Yossi Cohen',
            publishedAt: '2024-12-05',
            criticality: 'Critical',
            tags: ['uv', 'curing', 'adhesion'],
            usefulnessScore: 4.7,
            timeToResolution: '25 min'
        },
        {
            caseId: 'SF-2024-006',
            title: 'Ink density variation across print width',
            pressType: 'Duplex',
            pressName: 'D5',
            region: 'North America',
            system: 'Printing',
            subSystem: 'Image Formation',
            area: 'HW',
            description: 'Density variation across the sheet was linked to sensor calibration and nozzle cleanliness.',
            symptoms: ['Left/right density mismatch', 'Color uniformity loss', 'Sensor drift warning'],
            resolutionSteps: [
                { text: 'Calibrate density sensors using the standard kit.', usefulness: 4 },
                { text: 'Clean ink delivery nozzles thoroughly.', usefulness: 5 },
                { text: 'Adjust pressure regulators and verify uniformity with a test sheet.', usefulness: 4 }
            ],
            mostHelpfulAction: 'Clean ink delivery nozzles thoroughly.',
            parts: ['Nozzle Cleaning Kit'],
            attachments: ['uniformity-scan.png'],
            author: 'Alex Rodriguez',
            publishedAt: '2024-12-06',
            criticality: 'Elevated',
            tags: ['density', 'uniformity', 'nozzle'],
            usefulnessScore: 4.2,
            timeToResolution: '35 min'
        }
    ];

    function safeJsonParse(value) {
        try { return value ? JSON.parse(value) : null; } catch (error) { return null; }
    }

    function slugify(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function splitLines(value) {
        return String(value || '')
            .split(/\r?\n|;/)
            .map(item => item.trim())
            .filter(Boolean);
    }

    function arrayify(value) {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') return splitLines(value);
        if (value == null || value === '') return [];
        return [value];
    }

    function normalizeSteps(rawSteps) {
        const steps = arrayify(rawSteps)
            .map((step, index) => {
                if (typeof step === 'string') {
                    return { text: step.trim(), usefulness: Math.max(5 - index, 1), rank: index + 1 };
                }
                const text = step?.text || step?.step || step?.description || '';
                if (!text) return null;
                const usefulness = Number(step.usefulness || step.rank || (5 - index)) || Math.max(5 - index, 1);
                return { text: String(text).trim(), usefulness: Math.min(Math.max(usefulness, 1), 5), rank: index + 1 };
            })
            .filter(Boolean);

        return steps;
    }

    function normalizeAttachments(rawAttachments) {
        if (Array.isArray(rawAttachments)) {
            return rawAttachments.map(item => String(item).trim()).filter(Boolean);
        }
        if (typeof rawAttachments === 'number') {
            return Array.from({ length: rawAttachments }, (_, index) => `attachment-${index + 1}`);
        }
        if (typeof rawAttachments === 'string') {
            return splitLines(rawAttachments);
        }
        return [];
    }

    function normalizeParts(rawParts) {
        return arrayify(rawParts)
            .map(part => typeof part === 'string' ? part.trim() : String(part?.name || part?.part || part || '').trim())
            .filter(Boolean);
    }

    function deriveCriticality(raw) {
        const text = `${raw.title || raw.subject || ''} ${raw.description || ''} ${arrayify(raw.symptoms).join(' ')}`.toLowerCase();
        if (/(critical|jam|registration|curing|failure|interruption|no production|alarm|smearing|starvation)/.test(text)) return 'Critical';
        if (/(variation|drift|sensor|warning|instability|color)/.test(text)) return 'Elevated';
        return 'Stable';
    }

    function formatISODate(value) {
        if (!value) return new Date().toISOString().slice(0, 10);
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
        return date.toISOString().slice(0, 10);
    }

    function normalizeCase(raw = {}, index = 0) {
        const caseId = String(raw.caseId || raw.id || `SF-${Date.now()}-${index}`).trim();
        const title = String(raw.title || raw.subject || 'Untitled resolved case').trim();
        const description = String(raw.description || raw.issueDescription || '').trim();
        const symptoms = arrayify(raw.symptoms || raw.symptomSummary || raw.issueSymptoms);
        const resolutionSteps = normalizeSteps(raw.resolutionSteps || raw.troubleshootSteps || raw.initialSteps || raw.steps);
        const parts = normalizeParts(raw.parts || raw.partsUsed || raw.part);
        const attachments = normalizeAttachments(raw.attachments || raw.files);
        const tags = arrayify(raw.tags || raw.keywords || raw.labels)
            .map(tag => String(tag).trim())
            .filter(Boolean);
        const criticality = String(raw.criticality || raw.severity || deriveCriticality({ ...raw, title, description, symptoms })).trim();
        const usefulnessScore = Number(raw.usefulnessScore ?? raw.rating ?? 0) || 0;
        const author = String(raw.author || raw.owner || raw.caseOwner || 'Unknown author').trim();
        const publishedAt = formatISODate(raw.publishedAt || raw.publishDate || raw.date || raw.createdAt || raw.updatedAt);
        const pressType = String(raw.pressType || raw.machineType || '').trim();
        const pressName = String(raw.pressName || raw.press || raw.machine || '').trim();
        const region = String(raw.region || raw.site || raw.location || 'Unspecified').trim();
        const system = String(raw.system || raw.mainSystem || 'Unspecified').trim();
        const subSystem = String(raw.subSystem || raw.subsystem || raw.sub_system || 'Unspecified').trim();
        const area = String(raw.area || raw.hwSwEc || raw.hw_sw_ec || 'Unspecified').trim();
        const mostHelpfulAction = String(raw.mostHelpfulAction || resolutionSteps[0]?.text || '').trim();
        const timeToResolution = String(raw.timeToResolution || raw.time || raw.resolutionTime || '—').trim();

        const normalized = {
            caseId,
            id: caseId,
            title,
            subject: title,
            pressType,
            pressName,
            press: pressName,
            machine: pressName,
            machineLabel: [pressType, pressName].filter(Boolean).join(' · ') || 'Unspecified press',
            region,
            system,
            subSystem,
            area,
            description,
            symptoms,
            resolutionSteps,
            troubleshootSteps: resolutionSteps.map(step => step.text),
            mostHelpfulAction,
            parts,
            partsUsed: parts,
            attachments,
            attachmentCount: attachments.length,
            author,
            owner: author,
            publishedAt,
            date: publishedAt,
            status: String(raw.status || 'Published').trim() || 'Published',
            criticality: ['Critical', 'Elevated', 'Stable'].includes(criticality) ? criticality : deriveCriticality({ title, description, symptoms }),
            tags,
            usefulnessScore: Number(usefulnessScore.toFixed ? usefulnessScore.toFixed(1) : usefulnessScore),
            rating: Number(usefulnessScore.toFixed ? usefulnessScore.toFixed(1) : usefulnessScore),
            timeToResolution,
            searchText: [caseId, title, pressType, pressName, region, system, subSystem, area, description, ...symptoms, ...parts, ...tags, author]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
        };

        return normalized;
    }

    function getStoredCases() {
        const raw = safeJsonParse(localStorage.getItem(STORAGE_KEY));
        if (!Array.isArray(raw) || raw.length === 0) {
            return SAMPLE_CASES.map((item, index) => normalizeCase(item, index));
        }
        return raw.map((item, index) => normalizeCase(item, index));
    }

    function persistCases(cases) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cases.map((item, index) => normalizeCase(item, index))));
    }

    const LandaCaseStore = {
        schemaVersion: '2026-03-resolved-case-schema',
        storageKey: STORAGE_KEY,
        filterKey: FILTER_KEY,
        getCases() {
            return getStoredCases();
        },
        saveCases(cases) {
            persistCases(cases);
            return this.getCases();
        },
        createCase(payload) {
            const next = normalizeCase(payload, 0);
            const cases = this.getCases();
            const withoutDuplicate = cases.filter(item => item.caseId !== next.caseId);
            withoutDuplicate.unshift(next);
            this.saveCases(withoutDuplicate);
            return next;
        },
        getCaseById(caseId) {
            return this.getCases().find(item => item.caseId === caseId || item.id === caseId) || null;
        },
        filterCases(filters = {}) {
            const search = String(filters.search || '').trim().toLowerCase();
            return this.getCases().filter(item => {
                const matchesSearch = !search || item.searchText.includes(search);
                const matchesPressType = !filters.pressType || item.pressType === filters.pressType;
                const matchesPress = !filters.pressName && !filters.press ? true : item.pressName === (filters.pressName || filters.press);
                const matchesSystem = !filters.system || item.system === filters.system;
                const normalizedStatus = String(item.status || '').toLowerCase();
                const requestedStatus = String(filters.status || '').toLowerCase();
                const matchesState = !filters.status || normalizedStatus === requestedStatus;
                const matchesRegion = !filters.region || item.region === filters.region;
                const matchesPart = !filters.part || item.parts.some(part => part.toLowerCase() === String(filters.part).toLowerCase());
                const matchesCriticality = !filters.criticality || item.criticality === filters.criticality;
                return matchesSearch && matchesPressType && matchesPress && matchesSystem && matchesState && matchesRegion && matchesPart && matchesCriticality;
            });
        },
        getStats(cases = this.getCases()) {
            const total = cases.length;
            const published = cases.filter(item => String(item.status || '').toLowerCase() === 'published').length;
            const avgUsefulness = total ? (cases.reduce((sum, item) => sum + (Number(item.usefulnessScore) || 0), 0) / total) : 0;
            const critical = cases.filter(item => item.criticality === 'Critical').length;
            const elevated = cases.filter(item => item.criticality === 'Elevated').length;
            return { total, published, critical, elevated, avgUsefulness: avgUsefulness.toFixed(1) };
        },
        countBy(cases, field) {
            return cases.reduce((acc, item) => {
                const value = (item[field] || 'Unspecified').toString().trim() || 'Unspecified';
                acc[value] = (acc[value] || 0) + 1;
                return acc;
            }, {});
        },
        countByParts(cases) {
            return cases.reduce((acc, item) => {
                const list = item.parts.length ? item.parts : ['Unspecified'];
                list.forEach(part => {
                    acc[part] = (acc[part] || 0) + 1;
                });
                return acc;
            }, {});
        },
        getDashboardAggregates(cases = this.getCases()) {
            return {
                bySystem: this.countBy(cases, 'system'),
                byRegion: this.countBy(cases, 'region'),
                byPress: this.countBy(cases, 'pressName'),
                byPart: this.countByParts(cases)
            };
        },
        getSolutionRecords(cases = this.getCases()) {
            return cases
                .slice()
                .sort((a, b) => (b.usefulnessScore - a.usefulnessScore) || a.caseId.localeCompare(b.caseId))
                .map(item => ({
                    id: item.caseId,
                    title: item.title,
                    machine: item.pressName || 'Unspecified',
                    category: item.system,
                    difficulty: item.criticality === 'Critical' ? 'Hard' : item.criticality === 'Elevated' ? 'Medium' : 'Easy',
                    rating: item.usefulnessScore,
                    time: item.timeToResolution,
                    description: item.description,
                    steps: item.resolutionSteps.map(step => `${step.text} (${step.usefulness}/5)`),
                    tools: item.parts,
                    tags: item.tags,
                    symptoms: item.symptoms,
                    author: item.author,
                    mostHelpfulAction: item.mostHelpfulAction,
                    region: item.region
                }));
        },
        saveDashboardFilter(payload) {
            localStorage.setItem(FILTER_KEY, JSON.stringify(payload));
        },
        loadDashboardFilter() {
            return safeJsonParse(localStorage.getItem(FILTER_KEY));
        },
        clearDashboardFilter() {
            localStorage.removeItem(FILTER_KEY);
        },
        normalizeCase
    };

    class LandaSystem {
        constructor() {
            this.currentUser = null;
            this.cases = LandaCaseStore.getCases();
            this.machines = this.initializeMachines();
            this.systems = this.initializeSystems();
            this.init();
        }

        init() {
            this.initializeStarfield();
            this.bindEvents();
            this.checkAuthState();
        }

        initializeMachines() {
            return {
                Simplex: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S10'],
                Duplex: ['D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10']
            };
        }

        initializeSystems() {
            return {
                Printing: { 'Ink Delivery': ['HW', 'SW', 'EC'], 'Image Formation': ['HW', 'SW', 'EC'], 'Transfer System': ['HW', 'SW', 'EC'] },
                'Paper Handling': { Feeder: ['HW', 'SW', 'EC'], Transport: ['HW', 'SW', 'EC'], Delivery: ['HW', 'SW', 'EC'] },
                Drying: { 'UV Curing': ['HW', 'SW', 'EC'], 'Hot Air': ['HW', 'SW', 'EC'], Cooling: ['HW', 'SW', 'EC'] },
                'Quality Control': { 'Color Management': ['HW', 'SW', 'EC'], Registration: ['HW', 'SW', 'EC'], Inspection: ['HW', 'SW', 'EC'] },
                Control: { Software: ['HW', 'SW', 'EC'], Hardware: ['HW', 'SW', 'EC'], Network: ['HW', 'SW', 'EC'] }
            };
        }

        initializeStarfield() {
            if (typeof p5 !== 'undefined' && document.getElementById('starfield-container')) {
                new p5((sketch) => {
                    const stars = [];
                    const numStars = 200;
                    sketch.setup = () => {
                        const canvas = sketch.createCanvas(sketch.windowWidth, sketch.windowHeight);
                        canvas.parent('starfield-container');
                        canvas.style('position', 'fixed');
                        canvas.style('top', '0');
                        canvas.style('left', '0');
                        canvas.style('z-index', '-1');
                        for (let i = 0; i < numStars; i += 1) {
                            stars.push({
                                x: sketch.random(sketch.width),
                                y: sketch.random(sketch.height),
                                size: sketch.random(1, 3),
                                speed: sketch.random(0.1, 0.5),
                                opacity: sketch.random(0.3, 1)
                            });
                        }
                    };
                    sketch.draw = () => {
                        sketch.clear();
                        stars.forEach((star) => {
                            sketch.fill(255, 255, 255, star.opacity * 255);
                            sketch.noStroke();
                            sketch.ellipse(star.x, star.y, star.size);
                            star.y += star.speed;
                            star.opacity = 0.3 + 0.7 * Math.sin(sketch.millis() * 0.001 + star.x * 0.01);
                            if (star.y > sketch.height) {
                                star.y = 0;
                                star.x = sketch.random(sketch.width);
                            }
                        });
                    };
                    sketch.windowResized = () => sketch.resizeCanvas(sketch.windowWidth, sketch.windowHeight);
                });
            }
        }

        bindEvents() {
            document.addEventListener('click', (event) => {
                const target = event.target.closest('[data-page]');
                if (target) {
                    event.preventDefault();
                    this.navigateToPage(target.dataset.page);
                }
            });
            this.bindDynamicForms();
        }

        checkAuthState() {
            const savedUser = localStorage.getItem(DEFAULT_USER_KEY);
            if (savedUser) this.currentUser = safeJsonParse(savedUser);
        }

        navigateToPage(page) {
            const pages = {
                login: 'index.html',
                dashboard: 'dashboard.html',
                cases: 'cases.html',
                'create-case': 'create-case.html',
                troubleshooting: 'troubleshooting.html',
                'shift-report': 'Shift-Report-Analyzer.html'
            };
            if (pages[page]) window.location.href = pages[page];
        }

        bindDynamicForms() {
            const pressTypeSelect = document.getElementById('press-type');
            if (pressTypeSelect) {
                pressTypeSelect.addEventListener('change', (event) => this.updatePressNames(event.target.value));
            }
            const systemSelect = document.getElementById('system');
            if (systemSelect) {
                systemSelect.addEventListener('change', (event) => this.updateSubSystems(event.target.value));
            }
        }

        updatePressNames(pressType) {
            const pressNameSelect = document.getElementById('press-name');
            if (pressNameSelect && this.machines[pressType]) {
                pressNameSelect.innerHTML = '<option value="">Select Press Name</option>';
                this.machines[pressType].forEach((machine) => {
                    const option = document.createElement('option');
                    option.value = machine;
                    option.textContent = machine;
                    pressNameSelect.appendChild(option);
                });
            }
        }

        updateSubSystems(system) {
            const subSystemSelect = document.getElementById('sub-system');
            const areaSelect = document.getElementById('area');
            if (subSystemSelect && this.systems[system]) {
                subSystemSelect.innerHTML = '<option value="">Select Sub-System</option>';
                Object.keys(this.systems[system]).forEach((subSystem) => {
                    const option = document.createElement('option');
                    option.value = subSystem;
                    option.textContent = subSystem;
                    subSystemSelect.appendChild(option);
                });
            }
            if (areaSelect) areaSelect.innerHTML = '<option value="">Select Area</option>';
        }

        filterCases(filters) {
            this.cases = LandaCaseStore.getCases();
            return LandaCaseStore.filterCases(filters);
        }

        getCaseStats() {
            this.cases = LandaCaseStore.getCases();
            return LandaCaseStore.getStats(this.cases);
        }
    }

    window.LandaCaseStore = LandaCaseStore;
    window.LandaSystem = LandaSystem;

    document.addEventListener('DOMContentLoaded', () => {
        window.landaSystem = new LandaSystem();
    });

    function animateElement(element, animation) {
        if (typeof anime !== 'undefined') {
            anime({ targets: element, ...animation });
        }
    }

    window.animateElement = animateElement;

    document.addEventListener('DOMContentLoaded', () => {
        const interactiveElements = document.querySelectorAll('.interactive-card, .btn-primary, .case-card');
        interactiveElements.forEach((element) => {
            element.addEventListener('mouseenter', () => {
                animateElement(element, { scale: 1.05, duration: 200, easing: 'easeOutQuad' });
            });
            element.addEventListener('mouseleave', () => {
                animateElement(element, { scale: 1, duration: 200, easing: 'easeOutQuad' });
            });
        });
    });

    document.addEventListener('DOMContentLoaded', () => {
        if (!document.getElementById('sidebar-active-style')) {
            const style = document.createElement('style');
            style.id = 'sidebar-active-style';
            style.textContent = `
                .sidebar li.active {
                    background: linear-gradient(90deg, rgba(34,211,238,0.18), rgba(34,211,238,0.04));
                    border-left: 3px solid #22d3ee;
                }
                .sidebar li.active span,
                .sidebar li.active a {
                    color: #e5faff;
                    font-weight: 600;
                }
            `;
            document.head.appendChild(style);
        }

        const currentPage = window.location.pathname.split('/').pop();
        const pageMap = {
            dashboard: 'dashboard.html',
            cases: 'cases.html',
            'create-case': 'create-case.html',
            troubleshooting: 'troubleshooting.html',
            'shift-report': 'Shift-Report-Analyzer.html'
        };

        document.querySelectorAll('[data-page]').forEach((element) => {
            const li = element.closest('li');
            const key = element.dataset.page;
            if (li) li.classList.remove('active');
            element.classList.remove('nav-link-active');
            if (pageMap[key] === currentPage) {
                if (li) li.classList.add('active');
                element.classList.add('nav-link-active');
            }
        });
    });
})();
