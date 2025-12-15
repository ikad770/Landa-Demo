// Landa Case Management System - Main JavaScript
class LandaSystem {
    constructor() {
        this.currentUser = null;
        this.cases = this.initializeCases();
        this.machines = this.initializeMachines();
        this.systems = this.initializeSystems();
        this.init();
    }

    init() {
        this.initializeStarfield();
        this.bindEvents();
        this.checkAuthState();
    }

    // Initialize sample cases data
    initializeCases() {
        return [
            {
                id: 'SF-2024-001',
                pressType: 'Simplex',
                pressName: 'S1',
                system: 'Printing',
                subSystem: 'Ink Delivery',
                area: 'HW',
                subject: 'Ink Flow Interruption',
                description: 'Intermittent ink flow causing print quality issues on S1 press. Occurs during high-speed operations.',
                troubleshootSteps: [
                    'Checked ink pump pressure - Normal',
                    'Cleaned ink filters - Minor debris found',
                    'Verified ink viscosity - Within spec',
                    'Replaced ink supply hose - Issue resolved'
                ],
                solutionStep: 3,
                parts: ['Ink Supply Hose - Part #IS-001'],
                date: '2024-12-01',
                owner: 'Yossi Cohen',
                status: 'Resolved',
                rating: 4.8,
                attachments: 2
            },
            {
                id: 'SF-2024-002',
                pressType: 'Duplex',
                pressName: 'D3',
                system: 'Paper Handling',
                subSystem: 'Feeder',
                area: 'HW',
                subject: 'Paper Jams in Feeder Section',
                description: 'Frequent paper jams occurring in the feeder section of D3 press, particularly with coated stock.',
                troubleshootSteps: [
                    'Adjusted feed roller pressure',
                    'Cleaned feed rollers with alcohol',
                    'Replaced worn feed roller - Part #FR-003',
                    'Calibrated paper thickness sensor'
                ],
                solutionStep: 2,
                parts: ['Feed Roller Assembly - Part #FR-003'],
                date: '2024-12-02',
                owner: 'Sarah Levy',
                status: 'Resolved',
                rating: 4.6,
                attachments: 3
            },
            {
                id: 'SF-2024-003',
                pressType: 'Simplex',
                pressName: 'S2',
                system: 'Control',
                subSystem: 'Software',
                area: 'SW',
                subject: 'Print Registration Error',
                description: 'Software issue causing print registration to drift during long print runs on S2 press.',
                troubleshootSteps: [
                    'Restarted print control software',
                    'Updated software to version 3.2.1',
                    'Recalibrated registration sensors',
                    'Adjusted timing belt tension'
                ],
                solutionStep: 1,
                parts: [],
                date: '2024-12-03',
                owner: 'David Gold',
                status: 'Resolved',
                rating: 4.9,
                attachments: 1
            },
            {
                id: 'SF-2024-004',
                pressType: 'Duplex',
                pressName: 'D4',
                system: 'Quality Control',
                subSystem: 'Color Management',
                area: 'SW',
                subject: 'Color Consistency Issues',
                description: 'Color variation between front and back sides on D4 duplex press, particularly noticeable in blue tones.',
                troubleshootSteps: [
                    'Ran color calibration routine',
                    'Cleaned color sensors thoroughly',
                    'Updated color profile for coated stock',
                    'Adjusted ink key settings digitally'
                ],
                solutionStep: 2,
                parts: [],
                date: '2024-12-04',
                owner: 'Maya Stern',
                status: 'In Progress',
                rating: 4.3,
                attachments: 4
            },
            {
                id: 'SF-2024-005',
                pressType: 'Simplex',
                pressName: 'S3',
                system: 'Drying',
                subSystem: 'UV Curing',
                area: 'HW',
                subject: 'UV Lamp Not Curing Properly',
                description: 'UV lamps on S3 not providing sufficient curing power, causing smearing and poor adhesion.',
                troubleshootSteps: [
                    'Checked UV lamp intensity - Low',
                    'Cleaned UV lamp reflectors',
                    'Replaced UV lamp bulbs - Both units',
                    'Adjusted lamp power settings'
                ],
                solutionStep: 2,
                parts: ['UV Lamp Bulb Set - Part #UV-002'],
                date: '2024-12-05',
                owner: 'Yossi Cohen',
                status: 'Resolved',
                rating: 4.7,
                attachments: 2
            }
        ];
    }

    // Initialize machine data
    initializeMachines() {
        return {
            'Simplex': ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S10'],
            'Duplex': ['D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10']
        };
    }

    // Initialize system hierarchy
    initializeSystems() {
        return {
            'Printing': {
                'Ink Delivery': ['HW', 'SW', 'EC'],
                'Image Formation': ['HW', 'SW', 'EC'],
                'Transfer System': ['HW', 'SW', 'EC']
            },
            'Paper Handling': {
                'Feeder': ['HW', 'SW', 'EC'],
                'Transport': ['HW', 'SW', 'EC'],
                'Delivery': ['HW', 'SW', 'EC']
            },
            'Drying': {
                'UV Curing': ['HW', 'SW', 'EC'],
                'Hot Air': ['HW', 'SW', 'EC'],
                'Cooling': ['HW', 'SW', 'EC']
            },
            'Quality Control': {
                'Color Management': ['HW', 'SW', 'EC'],
                'Registration': ['HW', 'SW', 'EC'],
                'Inspection': ['HW', 'SW', 'EC']
            },
            'Control': {
                'Software': ['HW', 'SW', 'EC'],
                'Hardware': ['HW', 'SW', 'EC'],
                'Network': ['HW', 'SW', 'EC']
            }
        };
    }

    // Initialize animated starfield background
    initializeStarfield() {
        if (typeof p5 !== 'undefined') {
            new p5((sketch) => {
                let stars = [];
                const numStars = 200;

                sketch.setup = () => {
                    const canvas = sketch.createCanvas(sketch.windowWidth, sketch.windowHeight);
                    canvas.parent('starfield-container');
                    canvas.style('position', 'fixed');
                    canvas.style('top', '0');
                    canvas.style('left', '0');
                    canvas.style('z-index', '-1');

                    // Create stars
                    for (let i = 0; i < numStars; i++) {
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
                    
                    // Draw and animate stars
                    for (let star of stars) {
                        sketch.fill(255, 255, 255, star.opacity * 255);
                        sketch.noStroke();
                        sketch.ellipse(star.x, star.y, star.size);
                        
                        // Move stars
                        star.y += star.speed;
                        star.opacity = 0.3 + 0.7 * Math.sin(sketch.millis() * 0.001 + star.x * 0.01);
                        
                        // Reset stars that go off screen
                        if (star.y > sketch.height) {
                            star.y = 0;
                            star.x = sketch.random(sketch.width);
                        }
                    }
                };

                sketch.windowResized = () => {
                    sketch.resizeCanvas(sketch.windowWidth, sketch.windowHeight);
                };
            });
        }
    }

    // Bind event listeners
    bindEvents() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-page]')) {
                e.preventDefault();
                this.navigateToPage(e.target.dataset.page);
            }
        });

        // Dynamic form elements
        this.bindDynamicForms();
    }

    // Handle login authentication
    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const userType = document.querySelector('input[name="userType"]:checked')?.value;

        if (username && password) {
            this.currentUser = { username, type: userType || 'expert' };
            localStorage.setItem('landaUser', JSON.stringify(this.currentUser));
            this.navigateToPage('dashboard');
        } else {
            this.showNotification('Invalid credentials. Use: Expert / Landa123456', 'error');
        }
    }

    // Check authentication state
    checkAuthState() {
        const savedUser = localStorage.getItem('landaUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }
    }

    // Navigate between pages
    navigateToPage(page) {
        const pages = {
            'login': 'index.html',
            'dashboard': 'dashboard.html',
            'cases': 'cases.html',
            'create-case': 'create-case.html',
            'troubleshooting': 'troubleshooting.html'
        };

        if (pages[page]) {
            window.location.href = pages[page];
        }
    }

    // Bind dynamic form interactions
    bindDynamicForms() {
        // Press type selection
        const pressTypeSelect = document.getElementById('press-type');
        if (pressTypeSelect) {
            pressTypeSelect.addEventListener('change', (e) => {
                this.updatePressNames(e.target.value);
            });
        }

        // System selection
        const systemSelect = document.getElementById('system');
        if (systemSelect) {
            systemSelect.addEventListener('change', (e) => {
                this.updateSubSystems(e.target.value);
            });
        }
    }

    // Update press names based on type
    updatePressNames(pressType) {
        const pressNameSelect = document.getElementById('press-name');
        if (pressNameSelect && this.machines[pressType]) {
            pressNameSelect.innerHTML = '<option value="">Select Press Name</option>';
            this.machines[pressType].forEach(machine => {
                const option = document.createElement('option');
                option.value = machine;
                option.textContent = machine;
                pressNameSelect.appendChild(option);
            });
        }
    }

    // Update subsystems based on system
    updateSubSystems(system) {
        const subSystemSelect = document.getElementById('sub-system');
        const areaSelect = document.getElementById('area');
        
        if (subSystemSelect && this.systems[system]) {
            subSystemSelect.innerHTML = '<option value="">Select Sub-System</option>';
            Object.keys(this.systems[system]).forEach(subSystem => {
                const option = document.createElement('option');
                option.value = subSystem;
                option.textContent = subSystem;
                subSystemSelect.appendChild(option);
            });
        }

        if (areaSelect) {
            areaSelect.innerHTML = '<option value="">Select Area</option>';
        }
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Filter cases
    filterCases(filters) {
        return this.cases.filter(case_ => {
            return (!filters.pressType || case_.pressType === filters.pressType) &&
                   (!filters.pressName || case_.pressName === filters.pressName) &&
                   (!filters.system || case_.system === filters.system) &&
                   (!filters.status || case_.status === filters.status) &&
                   (!filters.search || case_.subject.toLowerCase().includes(filters.search.toLowerCase()) ||
                                     case_.description.toLowerCase().includes(filters.search.toLowerCase()));
        });
    }

    // Get case statistics
    getCaseStats() {
        const total = this.cases.length;
        const resolved = this.cases.filter(c => c.status === 'Resolved').length;
        const inProgress = this.cases.filter(c => c.status === 'In Progress').length;
        const avgRating = this.cases.reduce((sum, c) => sum + c.rating, 0) / total;

        return { total, resolved, inProgress, avgRating: avgRating.toFixed(1) };
    }
}

// Initialize the system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.landaSystem = new LandaSystem();
});

// Utility functions for animations
function animateElement(element, animation) {
    if (typeof anime !== 'undefined') {
        anime({
            targets: element,
            ...animation
        });
    }
}

// Add hover effects
document.addEventListener('DOMContentLoaded', () => {
    const interactiveElements = document.querySelectorAll('.interactive-card, .btn-primary, .case-card');
    
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            animateElement(element, {
                scale: 1.05,
                duration: 200,
                easing: 'easeOutQuad'
            });
        });

        element.addEventListener('mouseleave', () => {
            animateElement(element, {
                scale: 1,
                duration: 200,
                easing: 'easeOutQuad'
            });
        });
    });
});