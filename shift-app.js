// ============================================================
// GASCO SHIFT ANALYSIS APPLICATION — Gasco Energy Limited
// Part 1: Core Data, Utilities, Toast, Modal
// Part 2: Branch Management
// Part 3: Navigation & Routing
// Part 4: Dashboard View
// Part 5: Calendar View
// ============================================================

const SA = {
    // --- State ---
    currentBranch: null,
    currentDate: null,
    currentView: 'dashboard',
    data: {
        branches: [],
        shiftDates: {},
        pumpReadings: {},
        creditSales: {},
        expenses: {},
        payments: {},
        discounts: {},
        pumpShortages: {},
        customers: [],
        customerTransactions: [],
        momoTransactions: {},
        airtelTransactions: {},
        mpesaTransactions: {},
        dollarTransactions: {},
        flexipayTransactions: {},
        banks: [],
        bankTransactions: {},
        wetstockDaily: {},
        fuelDeliveries: [],
        employees: [],
        leaveRecords: [],
        payrollRuns: [],
        cashToBank: {},
        priceHistory: [],
        fuelStatementEntries: [],
        fuelStatementOpeningBalances: [],
        pettyCashEntries: [],
        branchTransfers: [],
        loans: [],
        pumpPrices: {},
        // Inventory Management
        inventory: {},           // branch_product keyed: { opening_stock, current_stock, last_updated }
        stockMovements: [],      // All stock in/out movements with audit trail
        // Revenue Collections
        revenueCollections: {},  // branch_date keyed: daily revenue collection records
        // Supplier (Gasco Energy Head Office)
        suppliers: [{ id: 'gasco_ho', name: 'Gasco Energy Head Office', type: 'head_office', contact: '', address: 'Head Office', is_default: true }],
        supplierStatements: {}   // branch_month keyed: supplier statement entries
    },

    // --- Constants (set dynamically by setMonth()) ---
    MONTH: null,
    MONTH_YEAR: null,
    MONTH_NUM: null,
    DAYS_IN_MONTH: null,
    PRODUCTS: ['PMS', 'AGO'],
    SHIFTS: ['DAY', 'NIGHT'],
    READING_TYPES: ['MANUAL', 'ELECTRONIC'],
    PAYMENT_METHODS: ['Cash', 'MomoPay', 'M-Pesa', 'Airtel Money', 'Dollar', 'FlexiPay', 'Bank Transfer'],

    // ============================================================
    // INIT
    // ============================================================
    init() {
        // Initialize theme
        this.initTheme();

        // Initialize month from today's date
        const now = new Date();
        this.setMonth(now.getFullYear(), now.getMonth());
        const todayDate = this.todayStr();
        if (todayDate.startsWith(this.MONTH)) {
            this.currentDate = todayDate;
        } else {
            this.currentDate = this.dateStr(1);
        }

        // Keyboard shortcuts
        this.initKeyboardShortcuts();

        this.loadData();
        // No default branches — user adds their own
        this.initUsers();
        this.initBanks();

        // Check authentication - show login screen if not logged in
        if (!this.isLoggedIn()) {
            this.showLoginScreen();
            // Still set up branch in background for after login
            const savedBranch = localStorage.getItem('sa_current_branch');
            if (savedBranch) {
                this.currentBranch = this.data.branches.find(b => String(b.id) === String(savedBranch));
            }
            if (!this.currentBranch && this.data.branches.length > 0) {
                this.currentBranch = this.data.branches[0];
            }
            return;
        }

        // User is authenticated — set up the app
        const savedBranch = localStorage.getItem('sa_current_branch');
        if (savedBranch) {
            this.currentBranch = this.data.branches.find(b => String(b.id) === String(savedBranch));
        }
        if (!this.currentBranch && this.data.branches.length > 0) {
            this.currentBranch = this.data.branches[0];
        }

        // Filter to accessible branches
        if (this.currentBranch && !this.hasAccessToBranch(this.currentBranch.id)) {
            const accessBranches = this.data.branches.filter(b => this.hasAccessToBranch(b.id));
            if (accessBranches.length > 0) {
                this.currentBranch = accessBranches[0];
                localStorage.setItem('sa_current_branch', this.currentBranch.id);
            }
        }

        this.renderBranchSelector();
        this.updateBranchDisplay();
        this.updateUserDisplay();
        this.updateAdminNav();
        // Update month selector display
        const monthDisp = document.getElementById('monthDisplay');
        if (monthDisp) monthDisp.textContent = this.monthLabel();
        this.navigate('dashboard');

        // Real-time sync — listen for localStorage changes from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'sa_data' && e.newValue) {
                try {
                    this.data = JSON.parse(e.newValue);
                    this.navigate(this.currentView);
                    this.toast('Data updated from another session', 'info');
                } catch(err) { console.error('Sync parse error:', err); }
            }
        });

        // Session timeout checker — every 60 seconds
        setInterval(() => {
            if (this.isLoggedIn()) {
                const ts = parseInt(localStorage.getItem('sa_session_ts') || '0');
                if (Date.now() - ts > this.SESSION_TIMEOUT) {
                    this.forceLogout('Session expired due to inactivity');
                }
            }
        }, 60000);
    },

    // ============================================================
    // PART 1: STORAGE & UTILITIES
    // ============================================================
    saveData() {
        localStorage.setItem('sa_data', JSON.stringify(this.data));
    },

    loadData() {
        const raw = localStorage.getItem('sa_data');
        if (raw) {
            try {
                this.data = JSON.parse(raw);
                // Ensure all keys exist
                if (!this.data.branches) this.data.branches = [];
                if (!this.data.shiftDates) this.data.shiftDates = {};
                if (!this.data.pumpReadings) this.data.pumpReadings = {};
                if (!this.data.creditSales) this.data.creditSales = {};
                if (!this.data.expenses) this.data.expenses = {};
                if (!this.data.payments) this.data.payments = {};
                if (!this.data.discounts) this.data.discounts = {};
                if (!this.data.pumpShortages) this.data.pumpShortages = {};
                if (!this.data.customers) this.data.customers = [];
                if (!this.data.customerTransactions) this.data.customerTransactions = [];
                if (!this.data.momoTransactions) this.data.momoTransactions = {};
                if (!this.data.airtelTransactions) this.data.airtelTransactions = {};
                if (!this.data.mpesaTransactions) this.data.mpesaTransactions = {};
                if (!this.data.dollarTransactions) this.data.dollarTransactions = {};
                if (!this.data.flexipayTransactions) this.data.flexipayTransactions = {};
                if (!this.data.banks) this.data.banks = [];
                if (!this.data.bankTransactions) this.data.bankTransactions = {};
                if (!this.data.wetstockDaily) this.data.wetstockDaily = {};
                if (!this.data.fuelDeliveries) this.data.fuelDeliveries = [];
                if (!this.data.users) this.data.users = [];
                if (!this.data.userBranchAccess) this.data.userBranchAccess = [];
                if (!this.data.auditLog) this.data.auditLog = [];
                if (!this.data.employees) this.data.employees = [];
                if (!this.data.leaveRecords) this.data.leaveRecords = [];
                if (!this.data.payrollRuns) this.data.payrollRuns = [];
                if (!this.data.cashToBank) this.data.cashToBank = {};
                if (!this.data.priceHistory) this.data.priceHistory = [];
                if (!this.data.fuelStatementEntries) this.data.fuelStatementEntries = [];
                if (!this.data.fuelStatementOpeningBalances) this.data.fuelStatementOpeningBalances = [];
                if (!this.data.pettyCashEntries) this.data.pettyCashEntries = [];
                if (!this.data.customExpenseAccounts) this.data.customExpenseAccounts = [];
                if (!this.data.goodsIssues) this.data.goodsIssues = {};
                if (!this.data.branchTransfers) this.data.branchTransfers = [];
                if (!this.data.loans) this.data.loans = [];
                if (!this.data.customPermissions) this.data.customPermissions = {};
                if (!this.data.pumpPrices) this.data.pumpPrices = {};
                if (!this.data.inventory) this.data.inventory = {};
                if (!this.data.stockMovements) this.data.stockMovements = [];
                if (!this.data.revenueCollections) this.data.revenueCollections = {};
                if (!this.data.suppliers) this.data.suppliers = [{ id: 'gasco_ho', name: 'Gasco Energy Head Office', type: 'head_office', contact: '', address: 'Head Office', is_default: true }];
                if (!this.data.supplierStatements) this.data.supplierStatements = {};
                // Ensure default supplier exists
                if (!this.data.suppliers.find(function(s) { return s.id === 'gasco_ho'; })) {
                    this.data.suppliers.unshift({ id: 'gasco_ho', name: 'Gasco Energy Head Office', type: 'head_office', contact: '', address: 'Head Office', is_default: true });
                }

                // ── Data migrations for database readiness ──
                // 1. Flatten pumpReadings from nested object to array format
                if (this.data.pumpReadings) {
                    var self = this;
                    Object.keys(this.data.pumpReadings).forEach(function(key) {
                        var val = self.data.pumpReadings[key];
                        if (val && !Array.isArray(val)) {
                            var arr = [];
                            Object.keys(val).forEach(function(rkey) {
                                var rec = val[rkey];
                                if (typeof rec === 'object' && rec !== null) {
                                    rec.pump_rkey = rkey;
                                    if (!rec._id) rec._id = self.uid();
                                    arr.push(rec);
                                }
                            });
                            self.data.pumpReadings[key] = arr;
                        }
                    });
                }

                // 2. Backfill branch_id on customer transactions
                if (this.data.customerTransactions && this.data.customers) {
                    var custMap = {};
                    this.data.customers.forEach(function(c) { custMap[c.id] = c.branch_id; });
                    this.data.customerTransactions.forEach(function(t) {
                        if (!t.branch_id && t.customer_id && custMap[t.customer_id]) {
                            t.branch_id = custMap[t.customer_id];
                        }
                    });
                }

                // 3. Backfill _id on records missing it
                var migrateArrays = ['creditSales', 'expenses', 'payments', 'discounts', 'pumpShortages',
                    'momoTransactions', 'airtelTransactions', 'mpesaTransactions', 'dollarTransactions', 'flexipayTransactions'];
                var self2 = this;
                migrateArrays.forEach(function(coll) {
                    if (self2.data[coll]) {
                        Object.keys(self2.data[coll]).forEach(function(key) {
                            var arr = self2.data[coll][key];
                            if (Array.isArray(arr)) {
                                arr.forEach(function(rec) {
                                    if (!rec._id) rec._id = self2.uid();
                                });
                            }
                        });
                    }
                });
                // Backfill _id on branchTransfers
                if (this.data.branchTransfers) {
                    this.data.branchTransfers.forEach(function(t) { if (!t._id) t._id = self2.uid(); });
                }

                // 4. Normalize payment method naming: 'Mpesa' → 'M-Pesa'
                if (this.data.customerTransactions) {
                    this.data.customerTransactions.forEach(function(t) {
                        if (t.payment_method === 'Mpesa') t.payment_method = 'M-Pesa';
                    });
                }
                var payMethodColls = ['creditSales', 'expenses', 'payments'];
                payMethodColls.forEach(function(coll) {
                    if (self2.data[coll]) {
                        Object.keys(self2.data[coll]).forEach(function(key) {
                            var arr = self2.data[coll][key];
                            if (Array.isArray(arr)) {
                                arr.forEach(function(rec) {
                                    if (rec.payment_method === 'Mpesa') rec.payment_method = 'M-Pesa';
                                });
                            }
                        });
                    }
                });

                // CTB sub-arrays
                if (this.data.cashToBank) {
                    Object.keys(this.data.cashToBank).forEach(function(key) {
                        var ctb = self2.data.cashToBank[key];
                        if (ctb && ctb.cashReceipts) ctb.cashReceipts.forEach(function(r) { if (!r._id) r._id = self2.uid(); });
                        if (ctb && ctb.cashExpenses) ctb.cashExpenses.forEach(function(e) { if (!e._id) e._id = self2.uid(); });
                    });
                }

                // 5. Fix broken customer transactions from addCreditSaleInline bug
                // Old addCreditSaleInline used wrong fields: 'date' instead of 'transaction_date',
                // 'amount' instead of 'debit_amount', and 'CREDIT' instead of 'DEBIT'
                if (this.data.customerTransactions) {
                    var fixSelf = this;
                    this.data.customerTransactions.forEach(function(t) {
                        if (t.reference_type === 'CREDIT_SALE' && t.amount !== undefined && t.debit_amount === undefined) {
                            // This transaction was created by the old buggy commitBatch
                            t.transaction_type = 'DEBIT';
                            t.debit_amount = t.amount;
                            t.credit_amount = 0;
                            delete t.amount;
                            // Fix date field
                            if (t.date && !t.transaction_date) {
                                t.transaction_date = t.date;
                                delete t.date;
                            }
                            // Backfill _id if missing
                            if (!t._id) t._id = t.id || fixSelf.uid();
                            // Recalculate amount using selling_price if we can find the credit sale
                            if (t.reference_id) {
                                var found = false;
                                var csColls = fixSelf.data.creditSales || {};
                                Object.keys(csColls).forEach(function(cKey) {
                                    var arr = csColls[cKey];
                                    if (Array.isArray(arr)) {
                                        arr.forEach(function(cs) {
                                            if (cs._id === t.reference_id && !found) {
                                                found = true;
                                                var litres = fixSelf.parseNum(cs.litres);
                                                var pp = fixSelf.parseNum(cs.pump_price);
                                                var sp = fixSelf.parseNum(cs.selling_price);
                                                var disc = (litres * pp) - (litres * sp);
                                                t.debit_amount = (pp * litres) - disc;
                                            }
                                        });
                                    }
                                });
                            }
                        }
                    });
                }

                // 6. Seed pumpPrices from most recent shiftDates if empty
                if (this.data.pumpPrices && Object.keys(this.data.pumpPrices).length === 0 && this.data.branches && this.data.shiftDates) {
                    var ppSelf = this;
                    this.data.branches.forEach(function(branch) {
                        var latestPms = 0, latestAgo = 0;
                        Object.keys(ppSelf.data.shiftDates).forEach(function(k) {
                            if (k.indexOf(branch.id) === 0) {
                                var sd = ppSelf.data.shiftDates[k];
                                if (sd.pms_sp && sd.pms_sp > 0) latestPms = sd.pms_sp;
                                if (sd.ago_sp && sd.ago_sp > 0) latestAgo = sd.ago_sp;
                            }
                        });
                        if (latestPms > 0 || latestAgo > 0) {
                            ppSelf.data.pumpPrices[branch.id] = {
                                pms: latestPms || 5185,
                                ago: latestAgo || 4800,
                                pms_updated_by: 'System (migrated)',
                                pms_updated_at: new Date().toISOString(),
                                ago_updated_by: 'System (migrated)',
                                ago_updated_at: new Date().toISOString()
                            };
                        }
                    });
                }

            } catch(e) {
                console.error('Failed to load SA data:', e);
            }
        }
    },

    // Key builders for branch-scoped data
    bk(branchId, date) {
        return branchId + '_' + date;
    },

    // Date utilities
    formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        const day = d.getDate();
        const suffix = day === 1 || day === 21 || day === 31 ? 'st'
            : day === 2 || day === 22 ? 'nd'
            : day === 3 || day === 23 ? 'rd' : 'th';
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return day + suffix + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    },

    dateStr(day) {
        return this.MONTH + '-' + String(day).padStart(2, '0');
    },

    prevDateStr(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        d.setDate(d.getDate() - 1);
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dy = String(d.getDate()).padStart(2, '0');
        return d.getFullYear() + '-' + m + '-' + dy;
    },

    dayOfMonth(dateStr) {
        return parseInt(dateStr.split('-')[2]);
    },

    // Month/date helpers for multi-month support
    todayStr() {
        const now = new Date();
        return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    },

    monthLabel() {
        const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        return MONTHS[this.MONTH_NUM] + ' ' + this.MONTH_YEAR;
    },

    monthShortLabel() {
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return MONTHS[this.MONTH_NUM] + this.MONTH_YEAR;
    },

    monthStart() {
        return this.MONTH + '-01';
    },

    monthEnd() {
        return this.MONTH + '-' + String(this.DAYS_IN_MONTH).padStart(2, '0');
    },

    setMonth(year, monthIdx) {
        this.MONTH_YEAR = year;
        this.MONTH_NUM = monthIdx;
        this.MONTH = year + '-' + String(monthIdx + 1).padStart(2, '0');
        this.DAYS_IN_MONTH = new Date(year, monthIdx + 1, 0).getDate();
        if (this.currentDate && !this.currentDate.startsWith(this.MONTH)) {
            this.currentDate = this.dateStr(1);
        }
        const disp = document.getElementById('monthDisplay');
        if (disp) disp.textContent = this.monthLabel();
    },

    prevMonth() {
        let y = this.MONTH_YEAR, m = this.MONTH_NUM - 1;
        if (m < 0) { m = 11; y--; }
        this.setMonth(y, m);
        this.currentDate = this.dateStr(1);
        this.navigate(this.currentView);
    },

    nextMonth() {
        let y = this.MONTH_YEAR, m = this.MONTH_NUM + 1;
        if (m > 11) { m = 0; y++; }
        this.setMonth(y, m);
        this.currentDate = this.dateStr(1);
        this.navigate(this.currentView);
    },

    // Number formatting
    fmt(n, decimals) {
        if (n === null || n === undefined || isNaN(n)) return '0';
        const d = decimals !== undefined ? decimals : 2;
        return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    },

    fmtInt(n) {
        if (n === null || n === undefined || isNaN(n)) return '0';
        return Math.round(Number(n)).toLocaleString('en-US');
    },

    parseNum(val) {
        if (!val) return 0;
        const n = parseFloat(String(val).replace(/,/g, ''));
        return isNaN(n) ? 0 : n;
    },

    // ── Validation Helpers ──
    MAX_AMOUNT: 500000000, // 500M UGX cap
    MAX_LITRES: 100000,    // 100,000 litres cap
    MAX_PRICE: 50000,      // 50,000 UGX/litre cap
    MAX_READING: 99999999, // meter reading cap

    _validatePositive(val, label) {
        const n = this.parseNum(val);
        if (n < 0) { this.toast(label + ' cannot be negative', 'error'); return false; }
        return true;
    },

    _validateAmount(val, label) {
        const n = this.parseNum(val);
        if (n < 0) { this.toast(label + ' cannot be negative', 'error'); return false; }
        if (n > this.MAX_AMOUNT) { this.toast(label + ' exceeds maximum (UGX ' + this.fmtInt(this.MAX_AMOUNT) + ')', 'error'); return false; }
        return true;
    },

    _validateLitres(val, label) {
        const n = this.parseNum(val);
        if (n < 0) { this.toast(label + ' cannot be negative', 'error'); return false; }
        if (n > this.MAX_LITRES) { this.toast(label + ' exceeds maximum (' + this.fmtInt(this.MAX_LITRES) + ' L)', 'error'); return false; }
        return true;
    },

    _validatePrice(val, label) {
        const n = this.parseNum(val);
        if (n < 0) { this.toast(label + ' cannot be negative', 'error'); return false; }
        if (n > this.MAX_PRICE) { this.toast(label + ' exceeds maximum (UGX ' + this.fmtInt(this.MAX_PRICE) + '/L)', 'error'); return false; }
        return true;
    },

    _validateReading(val, label) {
        const n = this.parseNum(val);
        if (n < 0) { this.toast(label + ' cannot be negative', 'error'); return false; }
        if (n > this.MAX_READING) { this.toast(label + ' exceeds maximum meter value', 'error'); return false; }
        return true;
    },

    _validateRequired(val, label) {
        if (val === null || val === undefined || val === '' || val === 0) {
            this.toast(label + ' is required', 'error');
            return false;
        }
        return true;
    },

    _validateSPvsPP(sp, pp) {
        const spn = this.parseNum(sp);
        const ppn = this.parseNum(pp);
        if (spn > 0 && ppn > 0 && spn > ppn) {
            this.toast('Selling Price (' + this.fmtInt(spn) + ') cannot exceed Pump Price (' + this.fmtInt(ppn) + ')', 'error');
            return false;
        }
        return true;
    },

    // Generate unique ID — UUID v4 for database-safe primary keys
    uid() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback UUID v4
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0;
            var v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // ── Database-Ready Helpers ──
    _findById(arr, id) {
        if (!arr) return null;
        return arr.find(function(e) { return e._id === id || e._id == id || e.id === id || e.id == id; }) || null;
    },

    _findIndexById(arr, id) {
        if (!arr) return -1;
        return arr.findIndex(function(e) { return e._id === id || e._id == id || e.id === id || e.id == id; });
    },

    _activeRecords(arr) {
        if (!arr) return [];
        return arr.filter(function(e) { return !e.is_deleted; });
    },

    _softDelete(record) {
        var user = this.getCurrentUser ? this.getCurrentUser() : null;
        record.is_deleted = true;
        record.deleted_at = new Date().toISOString();
        record.deleted_by = user ? (user.full_name || user.username) : 'System';
    },

    _trackChange(record, field, newValue) {
        if (!record._history) record._history = [];
        var oldValue = record[field];
        if (oldValue === newValue) return;
        var user = this.getCurrentUser ? this.getCurrentUser() : null;
        record._history.push({
            field: field,
            old_value: oldValue !== undefined ? oldValue : null,
            new_value: newValue !== undefined ? newValue : null,
            changed_at: new Date().toISOString(),
            changed_by: user ? (user.full_name || user.username) : 'System'
        });
    },

    _getReading(readings, rkey) {
        if (!readings) return null;
        if (Array.isArray(readings)) {
            return readings.find(function(r) { return r.pump_rkey === rkey; }) || null;
        }
        return readings[rkey] || null;
    },

    _ensureReading(readings, rkey) {
        if (!Array.isArray(readings)) return {};
        var r = readings.find(function(r) { return r.pump_rkey === rkey; });
        if (!r) {
            r = { _id: this.uid(), pump_rkey: rkey, opening: 0, closing: 0, rtt: 0 };
            var stamp = this._auditStamp();
            r.created_at = stamp.created_at;
            r.created_by = stamp.created_by;
            r.updated_at = stamp.updated_at;
            r.updated_by = stamp.updated_by;
            readings.push(r);
        }
        return r;
    },

    // Get fuel transfer volumes for a branch on a given date (only Received transfers count)
    // Returns { incoming: litres, outgoing: litres, net: incoming - outgoing }
    _getTransferVolume(branchId, product, dateStr) {
        var transfers = this._activeRecords(this.data.branchTransfers || []);
        var prodType = product === 'PMS' ? 'Fuel (PMS)' : 'Fuel (AGO)';
        var incoming = 0, outgoing = 0;
        transfers.forEach(function(t) {
            if (t.transfer_type !== prodType || t.transfer_date !== dateStr) return;
            if (t.status !== 'Received') return; // only received transfers affect stock
            var qty = parseFloat(t.quantity) || 0;
            if (t.to_branch_id === branchId) incoming += qty;
            if (t.from_branch_id === branchId) outgoing += qty;
        });
        return { incoming: incoming, outgoing: outgoing, net: incoming - outgoing };
    },

    // Get cash transfer totals for a branch on a given date (only Received transfers)
    _getCashTransfers(branchId, dateStr) {
        var transfers = this._activeRecords(this.data.branchTransfers || []);
        var incoming = 0, outgoing = 0;
        transfers.forEach(function(t) {
            if (t.transfer_type !== 'Cash' || t.transfer_date !== dateStr) return;
            if (t.status !== 'Received') return;
            var amt = parseFloat(t.amount) || 0;
            if (t.to_branch_id === branchId) incoming += amt;
            if (t.from_branch_id === branchId) outgoing += amt;
        });
        return { incoming: incoming, outgoing: outgoing, net: incoming - outgoing };
    },

    // ── Audit & Reference Helpers ──
    _auditStamp() {
        var user = this.getCurrentUser ? this.getCurrentUser() : null;
        return {
            created_at: new Date().toISOString(),
            created_by: user ? (user.full_name || user.username) : 'System',
            updated_at: new Date().toISOString(),
            updated_by: user ? (user.full_name || user.username) : 'System'
        };
    },

    _touchUpdated(record) {
        var user = this.getCurrentUser ? this.getCurrentUser() : null;
        record.updated_at = new Date().toISOString();
        record.updated_by = user ? (user.full_name || user.username) : 'System';
    },

    _nextRef(prefix) {
        // EXP-20260222-001, PAY-20260222-002, etc.
        if (!this._refCounters) this._refCounters = {};
        var dateKey = this.currentDate ? this.currentDate.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
        var cKey = prefix + '_' + dateKey;
        if (!this._refCounters[cKey]) this._refCounters[cKey] = 0;
        this._refCounters[cKey]++;
        return prefix + '-' + dateKey + '-' + String(this._refCounters[cKey]).padStart(3, '0');
    },

    _initRefCounters() {
        // Count existing entries for today to avoid duplicating reference numbers
        this._refCounters = {};
        if (!this.currentBranch || !this.currentDate) return;
        var dateKey = this.currentDate.replace(/-/g, '');
        var key = this.bk(this.currentBranch.id, this.currentDate);
        var exps = this.data.expenses[key] || [];
        this._refCounters['EXP_' + dateKey] = exps.filter(function(e) { return e.ref_number; }).length;
        var pays = this.data.payments[key] || [];
        this._refCounters['PAY_' + dateKey] = pays.filter(function(p) { return p.ref_number; }).length;
        var cs = this.data.creditSales[key] || [];
        this._refCounters['CS_' + dateKey] = cs.filter(function(c) { return c.ref_number; }).length;
        var shorts = this.data.pumpShortages[key] || [];
        this._refCounters['SHT_' + dateKey] = shorts.filter(function(s) { return s.ref_number; }).length;
        var discs = this.data.discounts[key] || [];
        this._refCounters['DSC_' + dateKey] = discs.filter(function(d) { return d.ref_number; }).length;
        var gis = this.data.goodsIssues[key] || [];
        this._refCounters['GI_' + dateKey] = gis.filter(function(g) { return g.ref_number; }).length;
    },

    // Toast notifications with optional undo
    toast(msg, type, undoCallback) {
        const t = type || 'success';
        const container = document.getElementById('toastContainer');
        const el = document.createElement('div');
        el.className = 'sa-toast ' + t;
        const duration = undoCallback ? 5000 : 3000;
        let undone = false;

        const textSpan = document.createElement('span');
        textSpan.textContent = msg;
        el.appendChild(textSpan);

        if (undoCallback) {
            const undoBtn = document.createElement('button');
            undoBtn.className = 'sa-toast-undo';
            undoBtn.textContent = 'Undo';
            undoBtn.onclick = (e) => {
                e.stopPropagation();
                undone = true;
                undoCallback();
                el.remove();
            };
            el.appendChild(undoBtn);
            const progress = document.createElement('div');
            progress.className = 'sa-toast-progress';
            el.appendChild(progress);
        }

        container.appendChild(el);
        setTimeout(() => { if (!undone) { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); } }, duration);
    },

    // Modal
    openModal(title, bodyHtml, wide) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = bodyHtml;
        const m = document.getElementById('modalContent');
        m.className = 'sa-modal' + (wide ? ' wide' : '');
        document.getElementById('modalOverlay').classList.add('open');
    },

    closeModal() {
        document.getElementById('modalOverlay').classList.remove('open');
    },

    // Get pumps for a branch
    getBranchPumps(branchId) {
        const branch = this.data.branches.find(b => String(b.id) === String(branchId));
        if (!branch) return [];
        const pumps = [];
        for (let i = 1; i <= (branch.pms_pumps || 6); i++) {
            pumps.push({ id: 'pms_' + i, label: 'PMS - ' + i, product: 'PMS' });
        }
        for (let i = 1; i <= (branch.ago_pumps || 6); i++) {
            pumps.push({ id: 'ago_' + i, label: 'AGO - ' + i, product: 'AGO' });
        }
        return pumps;
    },

    // ============================================================
    // PART 2: BRANCH MANAGEMENT
    // ============================================================
    seedDefaultBranches() {
        this.data.branches = [
            { id: 1, name: 'Kitgum Station', branch_code: 'KTG', location: 'Kitgum, Uganda', contact_phone: '', manager_name: '', is_active: true, pms_pumps: 6, ago_pumps: 6, created_at: new Date().toISOString() },
            { id: 2, name: 'Gulu Station', branch_code: 'GUL', location: 'Gulu, Uganda', contact_phone: '', manager_name: '', is_active: true, pms_pumps: 4, ago_pumps: 4, created_at: new Date().toISOString() },
            { id: 3, name: 'Lira Station', branch_code: 'LRA', location: 'Lira, Uganda', contact_phone: '', manager_name: '', is_active: true, pms_pumps: 3, ago_pumps: 3, created_at: new Date().toISOString() }
        ];
        this.saveData();
    },

    renderBranchSelector() {
        const dd = document.getElementById('branchDropdown');
        let html = '';
        this.data.branches.forEach(b => {
            const active = this.currentBranch && this.currentBranch.id === b.id;
            html += '<div class="sa-branch-dropdown-item' + (active ? ' active' : '') + '" onclick="SA.selectBranch(\'' + b.id + '\')">'
                + '<span class="branch-dot"></span>'
                + '<div><div class="branch-name">' + b.name + '</div>'
                + '<div class="branch-code">' + b.branch_code + ' &mdash; ' + b.location + '</div></div></div>';
        });
        html += '<div class="sa-branch-dropdown-item" onclick="SA.showAddBranch()" style="border-top:2px solid var(--sa-border);color:var(--sa-accent);">'
            + '<span style="font-size:1.1rem;">+</span><div><div class="branch-name" style="color:var(--sa-accent);">Add New Branch</div></div></div>';
        dd.innerHTML = html;
    },

    toggleBranchDropdown() {
        const dd = document.getElementById('branchDropdown');
        const btn = document.getElementById('branchBtn');
        const opening = !dd.classList.contains('open');
        dd.classList.toggle('open');
        btn.classList.toggle('open');
        // Close on click outside
        if (opening) {
            var self = this;
            setTimeout(function() {
                var handler = function(e) {
                    var sel = document.getElementById('branchSelector');
                    if (sel && !sel.contains(e.target)) {
                        dd.classList.remove('open');
                        btn.classList.remove('open');
                        document.removeEventListener('click', handler, true);
                    }
                };
                document.addEventListener('click', handler, true);
            }, 10);
        }
    },

    selectBranch(id) {
        this.currentBranch = this.data.branches.find(b => String(b.id) === String(id));
        localStorage.setItem('sa_current_branch', id);
        this.updateBranchDisplay();
        this.renderBranchSelector();
        document.getElementById('branchDropdown').classList.remove('open');
        document.getElementById('branchBtn').classList.remove('open');
        this.navigate(this.currentView);
        this.toast('Switched to ' + this.currentBranch.name);
    },

    updateBranchDisplay() {
        const el = document.getElementById('branchNameDisplay');
        el.textContent = this.currentBranch ? this.currentBranch.name : 'Select Branch';
    },

    showAddBranch() {
        document.getElementById('branchDropdown').classList.remove('open');
        const html = '<div class="sa-form-group"><label>Branch Name</label><input class="sa-input" id="nbName" placeholder="e.g. Pader Station"></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Branch Code</label><input class="sa-input" id="nbCode" placeholder="e.g. PDR" maxlength="5"></div>'
            + '<div class="sa-form-group"><label>Location</label><input class="sa-input" id="nbLoc" placeholder="e.g. Pader, Uganda"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>PMS Pumps (1-6)</label><input class="sa-input" id="nbPms" type="number" min="1" max="6" value="6"></div>'
            + '<div class="sa-form-group"><label>AGO Pumps (1-6)</label><input class="sa-input" id="nbAgo" type="number" min="1" max="6" value="6"></div></div>'
            + '<div class="sa-form-group"><label>Manager Name</label><input class="sa-input" id="nbMgr" placeholder="Optional"></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveBranch()">Create Branch</button></div>';
        this.openModal('Add New Branch', html);
    },

    saveBranch() {
        const name = document.getElementById('nbName').value.trim();
        const code = document.getElementById('nbCode').value.trim().toUpperCase();
        const loc = document.getElementById('nbLoc').value.trim();
        const pmsPumps = Math.min(6, Math.max(1, parseInt(document.getElementById('nbPms').value) || 6));
        const agoPumps = Math.min(6, Math.max(1, parseInt(document.getElementById('nbAgo').value) || 6));
        const mgr = document.getElementById('nbMgr').value.trim();
        if (!name || !code) { this.toast('Name and code required', 'error'); return; }
        if (this.data.branches.find(b => b.branch_code === code)) { this.toast('Branch code already exists', 'error'); return; }
        const branch = {
            id: this.uid(), name, branch_code: code, location: loc,
            contact_phone: '', manager_name: mgr, is_active: true,
            pms_pumps: pmsPumps, ago_pumps: agoPumps, created_at: new Date().toISOString()
        };
        this.data.branches.push(branch);
        this.saveData();
        this.renderBranchSelector();
        this.closeModal();
        this.toast('Branch "' + name + '" created');
        this.navigate(this.currentView);
    },

    // ============================================================
    // PART 3: NAVIGATION & ROUTING
    // ============================================================
    navigate(view) {
        // Require authentication for all navigation
        if (!this.requireAuth()) return false;

        // Close mobile sidebar on navigation
        this.closeSidebar();

        this.currentView = view;
        document.querySelectorAll('.sa-nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.view === view);
        });
        const content = document.getElementById('saContent');

        // Page-level permission map
        const pagePermissions = {
            branches: 'manage_branches',
            pump_prices: 'set_pump_price',
            shift_entry: 'edit_shift',
            credit_sales: 'edit_transactions',
            expenses: 'edit_transactions',
            discounts: 'edit_transactions',
            customers: 'edit_customers',
            customer_statements: 'view_statements',
            momo: 'edit_digital',
            airtel: 'edit_digital',
            mpesa: 'edit_digital',
            dollar: 'edit_digital',
            flexipay: 'edit_digital',
            bank_statements: 'edit_bank',
            cash_to_bank: 'edit_cash_to_bank',
            wetstock: 'edit_wetstock',
            deliveries: 'edit_deliveries',
            reports: 'view_reports',
            user_management: 'manage_users',
            audit_log: 'view_audit',
            employees: 'manage_hr',
            payroll: 'view_payroll',
            leave: 'manage_leave',
            loans: 'manage_loans',
            fuel_statement: 'view_fuel_statement',
            petty_cash: 'manage_petty_cash',
            branch_transfers: 'manage_transfers',
            inventory: 'view_reports',
            stock_movements: 'view_reports',
            revenue_collections: 'view_reports',
            supplier_statement: 'view_fuel_statement'
        };

        // Check page permission (dashboard & calendar open to all logged-in users)
        const requiredPerm = pagePermissions[view];
        if (requiredPerm && !this.hasPermission(requiredPerm)) {
            // Allow view-only access for some pages (viewers can see reports/statements)
            const viewOnlyPages = ['reports', 'customer_statements', 'calendar', 'credit_sales', 'expenses', 'discounts', 'bank_statements', 'pump_prices'];
            const viewPerms = { reports: 'view_reports', customer_statements: 'view_statements', bank_statements: 'view_statements',
                credit_sales: 'view_statements', expenses: 'view_statements', discounts: 'view_statements', pump_prices: 'view_reports' };
            const altPerm = viewPerms[view];
            if (!altPerm || !this.hasPermission(altPerm)) {
                const pageNames = { branches: 'Branch Management', pump_prices: 'Pump Prices', shift_entry: 'Shift Entry', credit_sales: 'Credit Sales',
                    expenses: 'Expenses & Payments', discounts: 'Discounts', customers: 'Customer Management',
                    customer_statements: 'Customer Statements', momo: 'MomoPay', airtel: 'Airtel Money', mpesa: 'M-Pesa', dollar: 'Dollar', flexipay: 'FlexiPay',
                    bank_statements: 'Bank Statements', cash_to_bank: 'Cash to Bank', wetstock: 'Wetstock Reconciliation', deliveries: 'Delivery Schedules',
                    reports: 'Reports', user_management: 'User Management', audit_log: 'Audit Log',
                    employees: 'Employee Management', payroll: 'Payroll', leave: 'Leave Management', loans: 'Staff Loans',
                    fuel_statement: 'Fuel Statement', petty_cash: 'Petty Cash', branch_transfers: 'Inter-Branch Transfers',
                    inventory: 'Inventory / Stock Levels', stock_movements: 'Stock Movements', revenue_collections: 'Revenue Collections',
                    supplier_statement: 'Supplier Statement' };
                content.innerHTML = this._accessDenied(pageNames[view] || view);
                return false;
            }
        }

        switch(view) {
            case 'dashboard': this.renderDashboard(content); break;
            case 'branches': this.renderBranches(content); break;
            case 'pump_prices': this.renderPumpPrices(content); break;
            case 'calendar': this.renderCalendar(content); break;
            case 'shift_entry': this.renderShiftEntry(content); break;
            case 'credit_sales': this.renderCreditSales(content); break;
            case 'expenses': this.renderExpenses(content); break;
            case 'discounts': this.renderDiscounts(content); break;
            case 'customers': this.renderCustomers(content); break;
            case 'customer_statements': this.renderCustomerStatements(content); break;
            case 'momo': this.renderDigitalPayments(content, 0); break;
            case 'airtel': this.renderDigitalPayments(content, 1); break;
            case 'mpesa': this.renderDigitalPayments(content, 2); break;
            case 'dollar': this.renderDigitalPayments(content, 3); break;
            case 'flexipay': this.renderDigitalPayments(content, 4); break;
            case 'bank_statements': this.renderBankStatements(content); break;
            case 'wetstock': this.renderWetstock(content); break;
            case 'deliveries': this.renderDeliveries(content); break;
            case 'reports': this.renderReports(content); break;
            case 'user_management': this.renderUserManagement(content); break;
            case 'audit_log': this.renderAuditLog(content); break;
            case 'employees': this.renderEmployees(content); break;
            case 'payroll': this.renderPayroll(content); break;
            case 'leave': this.renderLeave(content); break;
            case 'loans': this.renderLoans(content); break;
            case 'cash_to_bank': this.renderCashToBank(content); break;
            case 'fuel_statement': this.renderFuelStatement(content); break;
            case 'petty_cash': this.renderPettyCash(content); break;
            case 'branch_transfers': this.renderBranchTransfers(content); break;
            case 'goods_issues': this.renderGoodsIssues(content); break;
            case 'inventory': this.renderInventory(content); break;
            case 'stock_movements': this.renderStockMovements(content); break;
            case 'revenue_collections': this.renderRevenueCollections(content); break;
            case 'supplier_statement': this.renderSupplierStatement(content); break;
            case 'data_backup': this.renderDataBackup(content); break;
            default: this.renderDashboard(content);
        }
        return false;
    },

    // ============================================================
    // PART 4: DASHBOARD VIEW
    // ============================================================
    renderDashboard(el) {
        if (!this.currentBranch) {
            el.innerHTML = '<div class="sa-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>'
                + '<h3>No Branch Selected</h3><p>Select a branch from the top bar to get started.</p></div>';
            return;
        }
        const bid = this.currentBranch.id;
        const today = this.todayStr();
        const todayKey = this.bk(bid, today);

        // Calculate stats for the month
        let totalRevenue = 0, totalVariance = 0, daysWithData = 0;

        for (let d = 1; d <= this.DAYS_IN_MONTH; d++) {
            const ds = this.dateStr(d);
            const key = this.bk(bid, ds);
            const sd = this.data.shiftDates[key];
            if (sd) {
                daysWithData++;
                const calc = this.calculateDate(bid, ds);
                totalRevenue += calc.totalExpected;
                totalVariance += calc.variance;
            }
        }

        const todayCalc = (today.startsWith(this.MONTH) && this.data.shiftDates[todayKey]) ? this.calculateDate(bid, today) : null;
        const customerCount = this.data.customers.filter(c => c.branch_id === bid && c.is_active !== false).length;

        // Selected day for dashboard (defaults to today)
        const dashDay = this._dashSelectedDay || today;
        const dashDayKey = this.bk(bid, dashDay);
        const dashDayCalc = (dashDay.startsWith(this.MONTH) && this.data.shiftDates[dashDayKey]) ? this.calculateDate(bid, dashDay) : null;
        const isToday = dashDay === today;

        let html = '<div class="sa-page-header"><h1>Dashboard &mdash; ' + this.currentBranch.name + '</h1>'
            + '<div class="sa-page-actions"><button class="sa-btn sa-btn-primary" onclick="SA.currentDate=SA.todayStr();SA.navigate(\'shift_entry\')">+ New Entry</button></div></div>';

        // Stats
        html += '<div class="sa-stats">';
        html += '<div class="sa-stat-card gold"><div class="stat-label">Month Revenue</div><div class="stat-value">UGX ' + this.fmtInt(totalRevenue) + '</div><div class="stat-sub">' + this.monthLabel() + '</div></div>';
        html += '<div class="sa-stat-card ' + (totalVariance === 0 ? 'success' : 'danger') + '"><div class="stat-label">Cumulative Variance</div><div class="stat-value">UGX ' + this.fmt(totalVariance) + '</div><div class="stat-sub">' + (totalVariance === 0 ? 'Balanced' : 'Needs review') + '</div></div>';
        html += '<div class="sa-stat-card info"><div class="stat-label">Days Entered</div><div class="stat-value">' + daysWithData + ' / ' + this.DAYS_IN_MONTH + '</div><div class="stat-sub">' + this.monthLabel() + '</div></div>';
        html += '<div class="sa-stat-card pms"><div class="stat-label">Customers</div><div class="stat-value">' + customerCount + '</div><div class="stat-sub">Active accounts</div></div>';
        html += '</div>';

        // Day summary with date picker
        html += '<div class="sa-section"><div class="sa-section-header yellow"><div class="sa-section-title">' + (isToday ? 'Today\'s' : 'Daily') + ' Summary &mdash; ' + this.formatDate(dashDay) + '</div>'
            + '<div style="display:flex;align-items:center;gap:8px;">'
            + (isToday ? '' : '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA._dashSelectedDay=null;SA.navigate(\'dashboard\')">Back to Today</button>')
            + '<input type="date" class="sa-date-input" value="' + dashDay + '" min="' + this.monthStart() + '" max="' + this.monthEnd() + '" onchange="SA._dashSelectedDay=this.value;SA.navigate(\'dashboard\')" style="width:auto;">'
            + '</div></div><div class="sa-section-body">';
        if (dashDayCalc) {
            html += '<div class="sa-stats" style="margin-bottom:0;">';
            html += '<div class="sa-stat-card pms"><div class="stat-label">PMS Volume</div><div class="stat-value">' + this.fmt(dashDayCalc.pmsVolume, 3) + ' L</div></div>';
            html += '<div class="sa-stat-card ago"><div class="stat-label">AGO Volume</div><div class="stat-value">' + this.fmt(dashDayCalc.agoVolume, 3) + ' L</div></div>';
            html += '<div class="sa-stat-card gold"><div class="stat-label">Expected Sales</div><div class="stat-value">UGX ' + this.fmtInt(dashDayCalc.totalExpected) + '</div></div>';
            html += '<div class="sa-stat-card ' + (dashDayCalc.variance === 0 ? 'success' : 'danger') + '"><div class="stat-label">Variance</div><div class="stat-value">UGX ' + this.fmt(dashDayCalc.variance) + '</div></div>';
            html += '</div>';
            // Quick link to open that day's shift entry
            html += '<div style="margin-top:10px;text-align:right;"><button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.currentDate=\'' + dashDay + '\';SA.navigate(\'shift_entry\')">Open Shift Entry &raquo;</button></div>';
        } else {
            html += '<div class="sa-info-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
                + 'No shift data for ' + this.formatDate(dashDay) + '. <a href="#" onclick="SA.currentDate=\'' + dashDay + '\';SA.navigate(\'shift_entry\');return false;" style="color:var(--sa-primary);text-decoration:underline;">Enter data &raquo;</a></div>';
        }
        html += '</div></div>';

        // Cash to Bank Status (for selected day)
        if (dashDayCalc) {
            const tc = this.calcCashToBank(bid, dashDay);

            // Calculate running cash balance up to selected day
            let dashRunningBal = 0;
            for (let d = 1; d <= this.DAYS_IN_MONTH; d++) {
                const dds = this.dateStr(d);
                const dkey = this.bk(bid, dds);
                if (!this.data.shiftDates[dkey]) continue;
                const dc = this.calcCashToBank(bid, dds);
                dashRunningBal += dc.expectedCash;
                if (dc.actualBanked !== null) dashRunningBal -= dc.actualBanked;
                if (dds >= dashDay) break;
            }

            html += '<div class="sa-section"><div class="sa-section-header ' + (tc.isFlagged ? 'red' : (tc.actualBanked !== null ? 'green' : 'orange')) + '">'
                + '<div class="sa-section-title">Cash to Bank &mdash; ' + this.formatDate(dashDay) + '</div>'
                + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.currentDate=\'' + dashDay + '\';SA.navigate(\'cash_to_bank\')">Open &raquo;</button></div>'
                + '<div class="sa-section-body">';
            html += '<div class="sa-stats" style="margin-bottom:0;">';
            html += '<div class="sa-stat-card ' + (dashRunningBal > 100000 ? 'danger' : (dashRunningBal > 0 ? 'warning' : 'success')) + '"><div class="stat-label">Unbanked Cash</div><div class="stat-value">UGX ' + this.fmtInt(dashRunningBal) + '</div><div class="stat-sub">Running balance</div></div>';
            html += '<div class="sa-stat-card gold"><div class="stat-label">Expected to Bank</div><div class="stat-value">UGX ' + this.fmtInt(tc.expectedCash) + '</div><div class="stat-sub">Cash + Receipts - Deductions</div></div>';
            if (tc.actualBanked !== null) {
                const selBank = tc.bankId ? (this.data.banks.find(b => b.id === tc.bankId) || {}).name || '' : '';
                html += '<div class="sa-stat-card info"><div class="stat-label">Deposited</div><div class="stat-value">UGX ' + this.fmtInt(tc.actualBanked) + '</div><div class="stat-sub">' + (selBank || 'No bank selected') + '</div></div>';
                html += '<div class="sa-stat-card ' + (tc.isFlagged ? 'danger' : 'success') + '"><div class="stat-label">Variance</div><div class="stat-value">UGX ' + this.fmtInt(tc.variance) + '</div><div class="stat-sub">' + (tc.isFlagged ? 'FLAGGED' : 'OK') + '</div></div>';
            } else {
                html += '<div class="sa-stat-card danger"><div class="stat-label">Status</div><div class="stat-value">Not Reconciled</div><div class="stat-sub">Enter amount banked</div></div>';
            }
            html += '</div></div></div>';
        }

        // Stock Alerts
        const stockAlerts = this.getStockAlerts(bid);
        if (stockAlerts.length > 0) {
            html += '<div class="sa-section"><div class="sa-section-header red"><div class="sa-section-title">Stock Alerts</div></div><div class="sa-section-body">';
            stockAlerts.forEach(a => {
                const icon = a.type === 'critical'
                    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="color:var(--sa-danger);flex-shrink:0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
                    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="color:var(--sa-warning);flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
                const alertClass = a.type === 'critical' ? 'sa-stock-alert critical' : 'sa-stock-alert reorder';
                html += '<div class="' + alertClass + '">' + icon
                    + '<div style="flex:1;"><strong>' + a.message + '</strong>'
                    + '<div style="font-size:0.72rem;color:var(--sa-text-dim);margin-top:2px;">As of ' + this.formatDate(a.date) + '</div></div>'
                    + '<button class="sa-btn sa-btn-sm ' + (a.type === 'critical' ? 'sa-btn-danger' : 'sa-btn-secondary') + '" onclick="SA.navigate(\'deliveries\')">Schedule Delivery</button></div>';
            });
            html += '</div></div>';
        }

        // Pending Costing Notification — for Head Office (super_admin)
        if (this.hasPermission('edit_delivery_cost')) {
            const uncostAll = this.data.fuelDeliveries.filter(fd => !fd.is_deleted && !this._isDeliveryCosted(fd));
            if (uncostAll.length > 0) {
                // Group uncosted deliveries by branch
                const byBranch = {};
                uncostAll.forEach(fd => {
                    const branch = this.data.branches.find(b => b.id === fd.branch_id);
                    const bname = branch ? branch.name : 'Unknown';
                    if (!byBranch[bname]) byBranch[bname] = [];
                    byBranch[bname].push(fd);
                });

                html += '<div class="sa-section"><div class="sa-section-header" style="--section-bg:rgba(245,158,11,0.08);"><div class="sa-section-title" style="color:var(--sa-warning);">'
                    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="vertical-align:middle;margin-right:6px;">'
                    + '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
                    + 'Deliveries Pending Costing (' + uncostAll.length + ')</div></div>'
                    + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table" style="font-size:0.78rem;">'
                    + '<thead><tr><th>Branch</th><th>Date</th><th>Product</th><th class="text-right">Qty (L)</th><th>Truck</th><th class="text-right">Provisional Cost/L</th><th style="text-align:center;">Age</th><th></th></tr></thead><tbody>';

                uncostAll.sort((a, b) => (a.delivery_date || '').localeCompare(b.delivery_date || '')).forEach(fd => {
                    const branch = this.data.branches.find(b => b.id === fd.branch_id);
                    const bname = branch ? branch.name : '—';
                    const provCost = this.getLastKnownCost(fd.product_type, fd.branch_id);
                    // Calculate age in days
                    const delivDate = new Date(fd.delivery_date + 'T00:00:00');
                    const now = new Date();
                    const ageDays = Math.max(0, Math.floor((now - delivDate) / (1000 * 60 * 60 * 24)));
                    const ageClass = ageDays >= 3 ? 'text-danger text-bold' : (ageDays >= 1 ? 'text-warning' : '');
                    const ageLabel = ageDays === 0 ? 'Today' : ageDays + 'd ago';

                    html += '<tr>'
                        + '<td><strong>' + bname + '</strong></td>'
                        + '<td>' + this.formatDate(fd.delivery_date) + '</td>'
                        + '<td><span class="sa-badge ' + (fd.product_type === 'PMS' ? 'sa-badge-pms' : 'sa-badge-ago') + '">' + fd.product_type + '</span></td>'
                        + '<td class="text-right mono">' + this.fmt(this.parseNum(fd.loaded_qty), 3) + '</td>'
                        + '<td>' + (fd.truck_no || '—') + '</td>'
                        + '<td class="text-right mono">' + (provCost > 0 ? this.fmtInt(provCost) : '<span class="text-danger">None</span>') + '</td>'
                        + '<td style="text-align:center;" class="' + ageClass + '">' + ageLabel + '</td>'
                        + '<td><button class="sa-btn sa-btn-warning sa-btn-sm" style="font-size:0.7rem;padding:2px 10px;" '
                        + 'onclick="SA.currentBranch=SA.data.branches.find(function(b){return b.id===\'' + fd.branch_id + '\'});SA.showCostDelivery(\'' + fd.id + '\')">Cost Now</button></td>'
                        + '</tr>';
                });

                html += '</tbody></table></div></div></div>';
            }
        }

        // Quick actions
        html += '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">Quick Actions</div></div><div class="sa-section-body">';
        html += '<div class="sa-btn-group">';
        html += '<button class="sa-btn sa-btn-secondary" onclick="SA.navigate(\'calendar\')">View Calendar</button>';
        html += '<button class="sa-btn sa-btn-secondary" onclick="SA.navigate(\'credit_sales\')">Credit Sales</button>';
        html += '<button class="sa-btn sa-btn-secondary" onclick="SA.navigate(\'customers\')">Customers</button>';
        html += '<button class="sa-btn sa-btn-secondary" onclick="SA.navigate(\'expenses\')">Expenses</button>';
        html += '<button class="sa-btn sa-btn-secondary" onclick="SA.navigate(\'reports\')">Reports</button>';
        html += '</div></div></div>';

        // Recent entries
        html += '<div class="sa-section"><div class="sa-section-header green"><div class="sa-section-title">Recent Entries</div></div><div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Date</th><th class="text-right">PMS (L)</th><th class="text-right">AGO (L)</th><th class="text-right">Expected Sales</th><th class="text-right">Variance</th><th class="text-right">CUM Variance</th><th>Status</th></tr></thead><tbody>';
        let hasEntries = false;
        let runningCum = 0;
        for (let d = 1; d <= this.DAYS_IN_MONTH; d++) {
            const ds = this.dateStr(d);
            const key = this.bk(bid, ds);
            if (this.data.shiftDates[key]) {
                hasEntries = true;
                const calc = this.calculateDate(bid, ds);
                runningCum += calc.variance;
            }
        }
        // Render most recent first
        let cumFromEnd = runningCum;
        const entriesArr = [];
        for (let d = this.DAYS_IN_MONTH; d >= 1; d--) {
            const ds = this.dateStr(d);
            const key = this.bk(bid, ds);
            if (this.data.shiftDates[key]) {
                const calc = this.calculateDate(bid, ds);
                entriesArr.push({ ds, calc, cumAtDay: cumFromEnd });
                cumFromEnd -= calc.variance;
            }
        }
        entriesArr.forEach(e => {
            const vClass = e.calc.variance === 0 ? 'variance-zero' : 'variance-nonzero';
            const cvClass = e.cumAtDay === 0 ? 'text-success' : 'text-danger';
            html += '<tr style="cursor:pointer" onclick="SA.currentDate=\'' + e.ds + '\';SA.navigate(\'shift_entry\')">'
                + '<td>' + this.formatDate(e.ds) + '</td>'
                + '<td class="text-right mono">' + this.fmt(e.calc.pmsVolume, 3) + '</td>'
                + '<td class="text-right mono">' + this.fmt(e.calc.agoVolume, 3) + '</td>'
                + '<td class="text-right mono">' + this.fmtInt(e.calc.totalExpected) + '</td>'
                + '<td class="text-right mono ' + vClass + '">' + this.fmt(e.calc.variance) + '</td>'
                + '<td class="text-right mono text-bold ' + cvClass + '">' + this.fmt(e.cumAtDay) + '</td>'
                + '<td><span class="sa-badge sa-badge-success">Entered</span></td></tr>';
        });
        if (!hasEntries) {
            html += '<tr><td colspan="7" class="text-center text-muted" style="padding:30px;">No entries yet. Click Calendar or Daily Entry to start.</td></tr>';
        }
        html += '</tbody></table></div></div></div>';

        el.innerHTML = html;
    },

    // ============================================================
    // PART 4b: BRANCHES VIEW
    // ============================================================
    renderBranches(el) {
        let html = '<div class="sa-page-header"><h1>Branches</h1>'
            + '<div class="sa-page-actions"><button class="sa-btn sa-btn-primary" onclick="SA.showAddBranch()">+ Add Branch</button></div></div>';

        html += '<div class="sa-branch-cards">';
        this.data.branches.forEach(b => {
            let revenue = 0, daysEntered = 0;
            for (let d = 1; d <= this.DAYS_IN_MONTH; d++) {
                const ds = this.dateStr(d);
                if (this.data.shiftDates[this.bk(b.id, ds)]) {
                    daysEntered++;
                    revenue += this.calculateDate(b.id, ds).totalExpected;
                }
            }
            const custs = this.data.customers.filter(c => c.branch_id === b.id && c.is_active !== false).length;
            html += '<div class="sa-branch-card" onclick="SA.selectBranch(\'' + b.id + '\')">'
                + '<h3>' + b.name + '</h3>'
                + '<div class="branch-location"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' + b.location + ' &mdash; <span class="sa-badge sa-badge-neutral">' + b.branch_code + '</span></div>'
                + '<div class="branch-stats">'
                + '<div class="bstat"><div class="bstat-val">' + this.fmtInt(revenue) + '</div><div class="bstat-label">Revenue (UGX)</div></div>'
                + '<div class="bstat"><div class="bstat-val">' + daysEntered + '/' + this.DAYS_IN_MONTH + '</div><div class="bstat-label">Days Entered</div></div>'
                + '<div class="bstat"><div class="bstat-val">' + custs + '</div><div class="bstat-label">Customers</div></div>'
                + '</div>'
                + '<div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;">'
                + '<span style="font-size:0.75rem;color:var(--sa-text-dim);">Pumps: ' + (b.pms_pumps||6) + ' PMS, ' + (b.ago_pumps||6) + ' AGO</span>'
                + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="event.stopPropagation();SA.showEditBranch(\'' + b.id + '\')">Settings</button></div>'
                + '</div>';
        });
        html += '</div>';
        el.innerHTML = html;
    },

    // ============================================================
    // PART 5: CALENDAR VIEW
    // ============================================================
    renderCalendar(el) {
        if (!this.currentBranch) { el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>'; return; }
        const bid = this.currentBranch.id;

        let html = '<div class="sa-page-header"><h1>' + this.monthLabel() + ' &mdash; ' + this.currentBranch.name + '</h1></div>';

        html += '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">Monthly Calendar</div></div><div class="sa-section-body">';
        html += '<div class="sa-calendar-grid">';

        // Day headers
        const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        dayNames.forEach(dn => { html += '<div class="sa-cal-day-header">' + dn + '</div>'; });

        // Calculate first day of month
        const firstDay = new Date(this.MONTH_YEAR, this.MONTH_NUM, 1).getDay();
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="sa-cal-day empty"></div>';
        }

        for (let d = 1; d <= this.DAYS_IN_MONTH; d++) {
            const ds = this.dateStr(d);
            const key = this.bk(bid, ds);
            const hasData = !!this.data.shiftDates[key];
            const isClosed = this.isShiftClosed(bid, ds);
            const isToday = ds === this.todayStr();
            const isSelected = ds === this.currentDate;

            // Determine shift state for coloring
            let shiftState = 'empty'; // grey/neutral
            let statusLabel = 'Empty';
            if (hasData) {
                if (!isClosed) {
                    shiftState = 'open'; // gold - has data but not closed
                    statusLabel = 'Open';
                } else {
                    // Closed - check variance
                    const calc = this.calculateDate(bid, ds);
                    const variance = calc.variance;
                    if (variance === 0) {
                        shiftState = 'balanced'; // green - balanced and closed
                        statusLabel = 'Balanced';
                    } else {
                        shiftState = 'variance'; // red - has variance
                        statusLabel = 'Variance';
                    }
                }
            }

            let cls = 'sa-cal-day shift-' + shiftState;
            if (isToday) cls += ' today';
            if (isSelected) cls += ' selected';

            html += '<div class="' + cls + '" onclick="SA.currentDate=\'' + ds + '\';SA.navigate(\'shift_entry\')">'
                + '<div class="day-num">' + d + '</div>'
                + '<div class="day-status">' + statusLabel + '</div>'
                + '</div>';
        }

        html += '</div></div></div>';

        // Legend
        html += '<div style="display:flex;gap:20px;margin-top:12px;font-size:0.78rem;color:var(--sa-text-muted);flex-wrap:wrap;">';
        html += '<div style="display:flex;align-items:center;gap:6px;"><div style="width:12px;height:12px;border-radius:3px;border:1px solid var(--sa-border);background:var(--sa-bg-card);"></div> Empty</div>';
        html += '<div style="display:flex;align-items:center;gap:6px;"><div style="width:12px;height:12px;border-radius:3px;border:1px solid var(--sa-gold);background:rgba(240,165,0,0.1);"></div> Open (Not Closed)</div>';
        html += '<div style="display:flex;align-items:center;gap:6px;"><div style="width:12px;height:12px;border-radius:3px;border:1px solid var(--sa-danger);background:rgba(239,68,68,0.1);"></div> Variance</div>';
        html += '<div style="display:flex;align-items:center;gap:6px;"><div style="width:12px;height:12px;border-radius:3px;border:1px solid var(--sa-success);background:var(--sa-success-bg);"></div> Balanced &amp; Closed</div>';
        html += '<div style="display:flex;align-items:center;gap:6px;"><div style="width:12px;height:12px;border-radius:3px;border:1px solid var(--sa-gold);box-shadow:0 0 6px rgba(240,165,0,0.3);"></div> Today</div>';
        html += '</div>';

        el.innerHTML = html;
    },

    // ============================================================
    // CALCULATION ENGINE (Needed by dashboard/calendar)
    // ============================================================
    calculateDate(branchId, dateStr) {
        const key = this.bk(branchId, dateStr);
        const sd = this.data.shiftDates[key] || {};
        const readings = this.data.pumpReadings[key] || {};
        const pumps = this.getBranchPumps(branchId);
        const isFirstDay = this.dayOfMonth(dateStr) === 1;

        let pmsVolume = 0, agoVolume = 0;

        var self = this;
        pumps.forEach(pump => {
            // Only use ELECTRONIC readings for volume calculation
            // MANUAL is a safeguard only and should not be summed
            const rt = 'ELECTRONIC';

            // --- DAY SHIFT ---
            const dayRk = pump.id + '_' + rt + '_DAY';
            const dayR = self._getReading(readings, dayRk) || {};

            let dayOpening = 0;
            // Check for super admin meter override first
            if (dayR._opening_override !== undefined && dayR._opening_override !== null) {
                dayOpening = self.parseNum(dayR._opening_override);
            } else if (!isFirstDay) {
                const prevDs = self.prevDateStr(dateStr);
                const prevKey = self.bk(branchId, prevDs);
                const prevReadings = self.data.pumpReadings[prevKey] || [];
                const prevNightRk = pump.id + '_' + rt + '_NIGHT';
                const prevNight = self._getReading(prevReadings, prevNightRk) || {};
                dayOpening = self.parseNum(prevNight.closing);
            } else {
                dayOpening = self.parseNum(dayR.opening);
            }
            const dayClosing = self.parseNum(dayR.closing);
            const dayRtt = self.parseNum(dayR.rtt);
            const dayLts = dayClosing - dayOpening - dayRtt;

            // --- NIGHT SHIFT ---
            const nightRk = pump.id + '_' + rt + '_NIGHT';
            const nightR = self._getReading(readings, nightRk) || {};
            // Check for night opening override
            let nightOpening = dayClosing;
            if (nightR._opening_override !== undefined && nightR._opening_override !== null) {
                nightOpening = self.parseNum(nightR._opening_override);
            }
            const nightClosing = self.parseNum(nightR.closing);
            const nightRtt = self.parseNum(nightR.rtt);
            const nightLts = nightClosing - nightOpening - nightRtt;

            const totalLts = dayLts + nightLts;
            if (pump.product === 'PMS') pmsVolume += totalLts;
            else agoVolume += totalLts;
        });

        const pmsSP = this.parseNum(sd.pms_sp) || this.getBranchPumpPrice(branchId, 'pms');
        const agoSP = this.parseNum(sd.ago_sp) || this.getBranchPumpPrice(branchId, 'ago');
        const pmsValue = pmsVolume * pmsSP;
        const agoValue = agoVolume * agoSP;
        const totalExpected = pmsValue + agoValue;

        // Collections
        const cashInHand = this.parseNum(sd.cash_in_hand);
        // Digital payments auto-pulled from transaction breakdowns
        const momopay = this.calcDigitalTotal('momoTransactions', branchId, dateStr);
        const mpesa = this.calcDigitalTotal('mpesaTransactions', branchId, dateStr);
        const airtelMoney = this.calcDigitalTotal('airtelTransactions', branchId, dateStr);
        const dollar = this.calcDigitalTotal('dollarTransactions', branchId, dateStr);
        const flexipay = this.calcDigitalTotal('flexipayTransactions', branchId, dateStr);

        // Auto-pulled totals
        const totalExpenses = this.calcTotalExpenses(branchId, dateStr);
        const totalDiscount = this.calcTotalDiscount(branchId, dateStr);
        const totalShortages = this.calcTotalShortages(branchId, dateStr);
        const totalCreditSales = this.calcTotalCreditSales(branchId, dateStr);
        const totalGoodsIssues = this.calcTotalGoodsIssues(branchId, dateStr);

        // Total collections = all money accounted for
        const totalCollections = cashInHand + momopay + mpesa + airtelMoney + dollar + flexipay + totalExpenses + totalDiscount + totalShortages + totalCreditSales + totalGoodsIssues;
        const variance = totalExpected - totalCollections;

        // Banking summary: amount to bank = cash minus expenses
        const amountToBank = cashInHand - totalExpenses - totalShortages;

        return {
            pmsVolume, agoVolume, pmsSP, agoSP, pmsValue, agoValue, totalExpected,
            cashInHand, momopay, mpesa, airtelMoney, dollar, flexipay,
            totalExpenses, totalDiscount, totalShortages, totalCreditSales, totalGoodsIssues,
            totalCollections, variance, amountToBank,
            nightPmsLitres: this.parseNum(sd.night_pms_litres),
            nightAgoLitres: this.parseNum(sd.night_ago_litres),
            remainingPms: pmsVolume - this.parseNum(sd.night_pms_litres),
            remainingAgo: agoVolume - this.parseNum(sd.night_ago_litres)
        };
    },

    calcTotalExpenses(branchId, dateStr) {
        const key = this.bk(branchId, dateStr);
        const exps = this._activeRecords(this.data.expenses[key] || []);
        return exps.reduce((sum, e) => sum + this.parseNum(e.amount), 0);
    },

    calcTotalPayments(branchId, dateStr) {
        const key = this.bk(branchId, dateStr);
        const pays = this._activeRecords(this.data.payments[key] || []);
        return pays.reduce((sum, p) => sum + this.parseNum(p.amount), 0);
    },

    calcTotalDiscount(branchId, dateStr) {
        const key = this.bk(branchId, dateStr);
        // Credit sales discount
        const cs = this._activeRecords(this.data.creditSales[key] || []);
        let csDiscount = 0;
        cs.forEach(c => {
            if (c.is_voided) return; // Skip voided
            const litres = this.parseNum(c.litres);
            const pp = this.parseNum(c.pump_price);
            const sp = this.parseNum(c.selling_price);
            csDiscount += (litres * pp) - (litres * sp);
        });
        // Standalone discounts
        const discs = this._activeRecords(this.data.discounts[key] || []);
        let standaloneDiscount = 0;
        discs.forEach(d => {
            const litres = this.parseNum(d.litres);
            const pp = this.parseNum(d.pump_price);
            const sp = this.parseNum(d.selling_price);
            standaloneDiscount += (litres * pp) - (litres * sp);
        });
        return csDiscount + standaloneDiscount;
    },

    calcTotalShortages(branchId, dateStr) {
        const key = this.bk(branchId, dateStr);
        const shorts = this._activeRecords(this.data.pumpShortages[key] || []);
        return shorts.reduce((sum, s) => sum + this.parseNum(s.amount), 0);
    },

    calcTotalCreditSales(branchId, dateStr) {
        const key = this.bk(branchId, dateStr);
        const cs = this._activeRecords(this.data.creditSales[key] || []);
        let total = 0;
        cs.forEach(c => {
            if (c.is_voided) return; // Skip voided entries
            const litres = this.parseNum(c.litres);
            const pp = this.parseNum(c.pump_price);
            const sp = this.parseNum(c.selling_price);
            const disc = (litres * pp) - (litres * sp);
            total += (pp * litres) - disc;
        });
        return total;
    },

    calcDigitalTotal(storeKey, branchId, dateStr) {
        const key = this.bk(branchId, dateStr);
        const txs = this.data[storeKey][key] || [];
        return txs.reduce((sum, t) => sum + this.parseNum(t.amount), 0);
    },

    // ============================================================
    // DIGITAL PAYMENTS MODULE (MomoPay, Airtel Money, M-Pesa)
    // ============================================================
    DIGITAL_CHANNELS: [
        { key: 'momoTransactions', label: 'MomoPay', view: 'momo', color: '#FFCC00', icon: 'M' },
        { key: 'airtelTransactions', label: 'Airtel Money', view: 'airtel', color: '#E40000', icon: 'A' },
        { key: 'mpesaTransactions', label: 'M-Pesa', view: 'mpesa', color: '#4CAF50', icon: 'P' },
        { key: 'dollarTransactions', label: 'Dollar', view: 'dollar', color: '#2E7D32', icon: '$' },
        { key: 'flexipayTransactions', label: 'FlexiPay', view: 'flexipay', color: '#1565C0', icon: 'F' }
    ],

    _digitalTab: {},

    renderDigitalPayments(el, channelIdx) {
        const ch = this.DIGITAL_CHANNELS[channelIdx];
        if (!this.currentBranch) { el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>'; return; }
        if (!this.currentDate) this.currentDate = this.todayStr();
        const bid = this.currentBranch.id;
        const tab = this._digitalTab[ch.view] || 'daily';

        // Map payment method labels for matching
        const methodMap = { 'momoTransactions': 'MomoPay', 'airtelTransactions': 'Airtel Money', 'mpesaTransactions': 'M-Pesa', 'dollarTransactions': 'Dollar', 'flexipayTransactions': 'FlexiPay' };
        const paymentMethod = methodMap[ch.key];

        let html = '<div class="sa-page-header"><h1>' + ch.label + '</h1>'
            + '<div class="sa-page-actions">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.navigate(\'shift_entry\')">&laquo; Back to Daily Entry</button>'
            + '</div></div>';

        // Tabs
        html += '<div class="sa-tabs">'
            + '<button class="sa-tab' + (tab === 'daily' ? ' active' : '') + '" onclick="SA._digitalTab[\'' + ch.view + '\']=\'daily\';SA.navigate(\'' + ch.view + '\')">Daily Entry</button>'
            + '<button class="sa-tab' + (tab === 'statement' ? ' active' : '') + '" onclick="SA._digitalTab[\'' + ch.view + '\']=\'statement\';SA.navigate(\'' + ch.view + '\')">Monthly Statement</button>'
            + '</div>';

        if (tab === 'statement') {
            html += this._renderDigitalStatement(ch, bid, paymentMethod);
            el.innerHTML = html;
            return;
        }

        // ===== DAILY TAB =====
        // Monthly calendar grid
        html += '<div class="sa-section"><div class="sa-section-header" style="--section-bg:' + ch.color + '18;"><div class="sa-section-title">' + ch.label + ' — ' + this.monthLabel() + ' Calendar</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-digi-calendar">';

        let monthTotal = 0;
        for (let d = 1; d <= this.DAYS_IN_MONTH; d++) {
            const ds = this.dateStr(d);
            const key = this.bk(bid, ds);
            const txs = this.data[ch.key][key] || [];
            const dayTotal = txs.reduce((s, t) => s + this.parseNum(t.amount), 0);
            monthTotal += dayTotal;
            const isToday = ds === this.currentDate;
            const hasData = txs.length > 0;

            html += '<div class="sa-digi-day' + (isToday ? ' active' : '') + (hasData ? ' has-data' : '') + '" onclick="SA.currentDate=\'' + ds + '\';SA.navigate(\'' + ch.view + '\')">'
                + '<div class="digi-day-num">' + d + '</div>';
            if (hasData) {
                html += '<div class="digi-day-count">' + txs.length + ' txn' + (txs.length > 1 ? 's' : '') + '</div>'
                    + '<div class="digi-day-total">' + this.fmtInt(dayTotal) + '</div>';
            } else {
                html += '<div class="digi-day-empty">No entries</div>';
            }
            html += '</div>';
        }

        html += '</div>'
            + '<div style="display:flex;justify-content:flex-end;padding:12px 20px;border-top:1px solid var(--sa-border-light);">'
            + '<div style="font-size:0.85rem;"><span class="text-muted">Monthly Total:</span> <strong class="mono" style="font-size:1.1rem;">UGX ' + this.fmtInt(monthTotal) + '</strong></div>'
            + '</div></div></div>';

        // Daily transaction breakdown for current date
        const ds = this.currentDate;
        const key = this.bk(bid, ds);
        const allTxs = this.data[ch.key][key] || [];
        const txs = this._activeRecords(allTxs);
        const isClosed = this.isShiftClosed(bid, ds);
        const dayTotal = txs.reduce((s, t) => s + this.parseNum(t.amount), 0);

        html += '<div class="sa-section"><div class="sa-section-header" style="--section-bg:' + ch.color + '18;">'
            + '<div class="sa-section-title">' + ch.label + ' — ' + this.formatDate(ds) + '</div>'
            + '<div style="font-size:0.8rem;color:var(--sa-text-muted);">Daily total auto-feeds into Shift Entry collections</div>'
            + '</div><div class="sa-section-body">';

        if (txs.length > 0) {
            html += '<table class="sa-table"><thead><tr>'
                + '<th style="width:40px;">#</th>'
                + '<th>Transaction / Reference</th>'
                + '<th class="text-right" style="width:160px;">Amount (UGX)</th>'
                + '<th style="width:60px;"></th>'
                + '</tr></thead><tbody>';

            txs.forEach((t, i) => {
                html += '<tr>'
                    + '<td class="text-muted">' + (i + 1) + '</td>'
                    + '<td><input class="sa-input sa-input-sm" value="' + (t.description || '') + '" placeholder="e.g. TXN-0012345 / Customer name" onchange="SA._stageDigitalTxn(\'' + ch.key + '\',\'' + t._id + '\',\'description\',this.value)"' + (isClosed ? ' disabled' : '') + '></td>'
                    + '<td class="text-right"><input class="sa-input sa-input-sm mono" style="text-align:right;" value="' + (t.amount || '') + '" placeholder="0" onchange="SA._stageDigitalTxn(\'' + ch.key + '\',\'' + t._id + '\',\'amount\',this.value)"' + (isClosed ? ' disabled' : '') + '></td>'
                    + '<td>' + (isClosed ? '' : '<button class="sa-remove-btn" onclick="SA.removeDigitalTxn(\'' + ch.key + '\',\'' + t._id + '\')">&times;</button>') + '</td>'
                    + '</tr>';
            });

            html += '</tbody></table>';
        } else {
            html += '<div class="sa-empty" style="padding:30px;"><p class="text-muted">No ' + ch.label + ' transactions for this date.</p></div>';
        }

        // Total + Add button + Update button
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;flex-wrap:wrap;gap:8px;">';
        if (!isClosed) {
            html += '<div style="display:flex;gap:8px;align-items:center;">'
                + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.addDigitalTxn(\'' + ch.key + '\')">+ Add Transaction</button>'
                + (txs.length > 0 ? '<button class="sa-btn sa-btn-primary sa-btn-sm" onclick="SA._commitDigitalTxn(\'' + ch.key + '\')" style="padding:8px 20px;font-weight:700;gap:4px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Update</button>' : '')
                + '</div>';
        } else {
            html += '<span></span>';
        }
        html += '<div class="sa-shortage-total" style="margin:0;"><span class="total-label">DAY TOTAL</span><span class="total-value" style="color:' + ch.color + ';">UGX ' + this.fmtInt(dayTotal) + '</span></div>';
        html += '</div>';

        html += '<div class="sa-info-box" style="margin-top:16px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + 'This daily total (<strong>UGX ' + this.fmtInt(dayTotal) + '</strong>) is automatically pulled into the Shift Entry &rarr; Actual Collections &rarr; <strong>' + ch.label + '</strong> field.</div>';

        html += '</div></div>';

        el.innerHTML = html;
    },

    _renderDigitalStatement(ch, bid, paymentMethod) {
        // Gather ALL transactions for this channel across the month
        let allTxns = [];

        // 1. Daily shift transactions (from the digital txn store)
        for (let d = 1; d <= this.DAYS_IN_MONTH; d++) {
            const ds = this.dateStr(d);
            const key = this.bk(bid, ds);
            const txs = this.data[ch.key][key] || [];
            txs.forEach((t, i) => {
                allTxns.push({
                    date: ds, type: 'IN',
                    description: t.description || ('Transaction #' + (i + 1)),
                    amount: this.parseNum(t.amount),
                    source: 'Shift Collection'
                });
            });
        }

        // 2. Customer payments made via this payment method
        const custPayments = this.data.customerTransactions.filter(t => {
            if (t.transaction_type !== 'CREDIT') return false;
            if (!t.payment_method) return false;
            // Match payment method
            return t.payment_method === paymentMethod;
        });
        // Only include payments from customers belonging to this branch
        const branchCustIds = new Set(this.data.customers.filter(c => c.branch_id === bid).map(c => c.id));
        custPayments.forEach(t => {
            if (!branchCustIds.has(t.customer_id)) return;
            const cust = this.data.customers.find(c => c.id === t.customer_id);
            allTxns.push({
                date: t.transaction_date, type: 'IN',
                description: 'Customer Payment: ' + (cust ? cust.name : 'Unknown') + (t.receipt_number ? ' (Ref: ' + t.receipt_number + ')' : ''),
                amount: this.parseNum(t.credit_amount),
                source: 'Customer Payment'
            });
        });

        // Sort by date
        allTxns.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

        // Build statement
        let html = '<div class="sa-section"><div class="sa-section-header" style="--section-bg:' + ch.color + '18;">'
            + '<div class="sa-section-title">' + ch.label + ' — Monthly Statement (' + this.monthLabel() + ')</div>'
            + '<div style="font-size:0.8rem;color:var(--sa-text-muted);">All ' + ch.label + ' transactions including customer payments via ' + ch.label + '</div>'
            + '</div><div class="sa-section-body no-pad"><div class="sa-table-wrap">';

        html += '<table class="sa-table"><thead><tr>'
            + '<th style="width:100px;">Date</th>'
            + '<th>Description</th>'
            + '<th style="width:80px;">Source</th>'
            + '<th class="text-right" style="width:130px;">Amount In</th>'
            + '<th class="text-right" style="width:140px;">Running Balance</th>'
            + '</tr></thead><tbody>';

        let runningBal = 0;
        let totalIn = 0;
        let prevDate = '';

        if (allTxns.length === 0) {
            html += '<tr><td colspan="5" class="text-center text-muted" style="padding:40px;">No ' + ch.label + ' transactions for ' + this.monthLabel() + '.</td></tr>';
        }

        allTxns.forEach(t => {
            runningBal += t.amount;
            totalIn += t.amount;
            const showDate = t.date !== prevDate;
            prevDate = t.date;

            html += '<tr' + (showDate ? ' style="border-top:2px solid var(--sa-border-light);"' : '') + '>'
                + '<td' + (showDate ? ' style="font-weight:600;"' : ' class="text-muted"') + '>' + (showDate ? this.formatDate(t.date) : '') + '</td>'
                + '<td>' + t.description + '</td>'
                + '<td><span class="sa-badge ' + (t.source === 'Customer Payment' ? 'sa-badge-success' : 'sa-badge-info') + '" style="font-size:0.6rem;">' + t.source + '</span></td>'
                + '<td class="text-right mono" style="color:var(--sa-success);">+ ' + this.fmtInt(t.amount) + '</td>'
                + '<td class="text-right mono text-bold">' + this.fmtInt(runningBal) + '</td>'
                + '</tr>';
        });

        // Totals row
        html += '<tr class="total-row" style="background:var(--sa-bg-card-hover);border-top:2px solid var(--sa-accent);">'
            + '<td colspan="3" class="text-right text-bold" style="font-size:0.85rem;">MONTH TOTAL</td>'
            + '<td class="text-right mono text-bold" style="color:var(--sa-success);font-size:0.95rem;">UGX ' + this.fmtInt(totalIn) + '</td>'
            + '<td class="text-right mono text-bold" style="font-size:0.95rem;">UGX ' + this.fmtInt(runningBal) + '</td>'
            + '</tr>';

        html += '</tbody></table></div></div></div>';

        // Daily breakdown summary
        html += '<div class="sa-section"><div class="sa-section-header" style="--section-bg:' + ch.color + '18;">'
            + '<div class="sa-section-title">Daily Totals Summary</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap">';
        html += '<table class="sa-table"><thead><tr>'
            + '<th>Date</th><th class="text-right">Shift Txns</th><th class="text-right">Cust. Payments</th><th class="text-right">Day Total</th><th class="text-right">Cumulative</th>'
            + '</tr></thead><tbody>';

        let cumulative = 0;
        for (let d = 1; d <= this.DAYS_IN_MONTH; d++) {
            const ds = this.dateStr(d);
            const key = this.bk(bid, ds);
            const shiftTxns = this.data[ch.key][key] || [];
            const shiftTotal = shiftTxns.reduce((s, t) => s + this.parseNum(t.amount), 0);

            // Customer payments on this date via this method
            let custPayTotal = 0;
            this.data.customerTransactions.forEach(t => {
                if (t.transaction_date !== ds) return;
                if (t.transaction_type !== 'CREDIT') return;
                if (t.payment_method !== paymentMethod) return;
                if (!branchCustIds.has(t.customer_id)) return;
                custPayTotal += this.parseNum(t.credit_amount);
            });

            const dayTotal = shiftTotal + custPayTotal;
            cumulative += dayTotal;

            if (dayTotal > 0) {
                html += '<tr>'
                    + '<td style="font-weight:600;">' + this.formatDate(ds) + '</td>'
                    + '<td class="text-right mono">' + (shiftTotal > 0 ? this.fmtInt(shiftTotal) : '—') + '</td>'
                    + '<td class="text-right mono">' + (custPayTotal > 0 ? this.fmtInt(custPayTotal) : '—') + '</td>'
                    + '<td class="text-right mono text-bold">' + this.fmtInt(dayTotal) + '</td>'
                    + '<td class="text-right mono">' + this.fmtInt(cumulative) + '</td>'
                    + '</tr>';
            }
        }

        html += '<tr class="total-row" style="background:var(--sa-bg-card-hover);border-top:2px solid var(--sa-accent);">'
            + '<td class="text-bold">TOTAL</td><td></td><td></td>'
            + '<td class="text-right mono text-bold" style="font-size:0.95rem;">UGX ' + this.fmtInt(totalIn) + '</td>'
            + '<td class="text-right mono text-bold" style="font-size:0.95rem;">UGX ' + this.fmtInt(cumulative) + '</td></tr>';

        html += '</tbody></table></div></div></div>';

        return html;
    },

    addDigitalTxn(storeKey) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        if (!this.data[storeKey][key]) this.data[storeKey][key] = [];
        const existing = this.data[storeKey][key];
        if (existing.length > 0) {
            const last = existing[existing.length - 1];
            if (this.parseNum(last.amount) === 0) {
                this.toast('Please fill in the last transaction before adding a new one', 'warning');
                return;
            }
        }
        var stamp = this._auditStamp();
        this.data[storeKey][key].push({
            _id: this.uid(), description: '', amount: 0,
            created_at: stamp.created_at, created_by: stamp.created_by,
            updated_at: stamp.updated_at, updated_by: stamp.updated_by
        });
        this.saveData();
        const ch = this.DIGITAL_CHANNELS.find(c => c.key === storeKey);
        this.navigate(ch.view);
    },

    _digiPending: {},

    _stageDigitalTxn(storeKey, id, field, value) {
        var k = storeKey + '_' + id;
        if (!this._digiPending[k]) this._digiPending[k] = { storeKey: storeKey, _id: id };
        this._digiPending[k][field] = value;
    },

    _commitDigitalTxn(storeKey) {
        var pending = this._digiPending;
        var keys = Object.keys(pending).filter(function(k) { return pending[k].storeKey === storeKey; });
        if (keys.length === 0) { this.toast('No changes to update', 'warning'); return; }

        // Validate
        for (var i = 0; i < keys.length; i++) {
            var p = pending[keys[i]];
            if (p.amount !== undefined && !this._validateAmount(p.amount, 'Transaction amount')) return;
        }

        this._digiPending = {};
        var self = this;
        keys.forEach(function(k) {
            var p = pending[k];
            if (p.description !== undefined) self.updateDigitalTxn(storeKey, p._id, 'description', p.description);
            if (p.amount !== undefined) self.updateDigitalTxn(storeKey, p._id, 'amount', p.amount);
        });
        this.toast('Transactions updated', 'success');
    },

    updateDigitalTxn(storeKey, id, field, value) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        var rec = this._findById(this.data[storeKey][key], id);
        if (rec) {
            var newVal = field === 'amount' ? this.parseNum(value) : value;
            this._trackChange(rec, field, newVal);
            rec[field] = newVal;
            if (!rec._id) rec._id = this.uid();
            this._touchUpdated(rec);
            this.saveData();
            const ch = this.DIGITAL_CHANNELS.find(c => c.key === storeKey);
            this.navigate(ch.view);
        }
    },

    removeDigitalTxn(storeKey, id) {
        if (!this._guardClosedShift('delete a digital payment entry', () => this._doRemoveDigitalTxn(storeKey, id))) return;
        if (!confirm('Are you sure you want to delete this transaction?')) return;
        this._doRemoveDigitalTxn(storeKey, id);
    },
    _doRemoveDigitalTxn(storeKey, id) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        var rec = this._findById(this.data[storeKey][key], id);
        if (rec) {
            this._softDelete(rec);
            this.saveData();
            const ch = this.DIGITAL_CHANNELS.find(c => c.key === storeKey);
            this.navigate(ch.view);
        }
    },

    // ============================================================
    // SHIFT ENTRY
    // ============================================================
    renderShiftEntry(el) {
        if (!this.currentBranch) { el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>'; return; }
        if (!this.currentDate) this.currentDate = this.todayStr();
        const bid = this.currentBranch.id;
        const ds = this.currentDate;
        const key = this.bk(bid, ds);

        // Ensure shift date record exists
        if (!this.data.shiftDates[key]) {
            // Use system pump price (set by manager/admin in Pump Prices module)
            this.data.shiftDates[key] = {
                pms_sp: this.getBranchPumpPrice(bid, 'pms'),
                ago_sp: this.getBranchPumpPrice(bid, 'ago'),
                cash_in_hand: 0, momopay: 0, mpesa: 0, airtel_money: 0, dollar: 0, flexipay: 0,
                night_pms_litres: 0, night_ago_litres: 0
            };
            this.saveData();
        }
        if (!this.data.pumpReadings[key]) {
            this.data.pumpReadings[key] = [];
            this.saveData();
        }

        const sd = this.data.shiftDates[key];
        const readings = this.data.pumpReadings[key];
        const pumps = this.getBranchPumps(bid);
        const calc = this.calculateDate(bid, ds);
        const isFirstDay = this.dayOfMonth(ds) === 1;

        const isClosed = this.isShiftClosed(bid, ds);
        const ro = isClosed; // read-only flag

        // Date nav
        let html = '<div class="sa-page-header"><h1>Daily Shift Entry &mdash; <span class="sa-date-display">' + this.formatDate(ds) + '</span></h1>'
            + '<div class="sa-date-nav">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.prevDay()">&laquo; Prev</button>'
            + '<input type="date" class="sa-date-input" value="' + ds + '" min="' + this.monthStart() + '" max="' + this.monthEnd() + '" onchange="SA.goToDate(this.value,\'shift_entry\')">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.nextDay()">Next &raquo;</button>';
        if (!isClosed) {
            if (this.hasPermission('edit_shift')) {
                html += '<button class="sa-btn sa-btn-primary sa-btn-sm" onclick="SA.saveShiftEntry()">Save All</button>';
            }
            if (this.hasPermission('close_shift')) {
                html += '<button class="sa-btn sa-btn-danger sa-btn-sm" onclick="SA.closeShift()">Close Shift</button>';
            }
        } else {
            if (this.hasPermission('reopen_shift')) {
                html += '<button class="sa-btn sa-btn-warning sa-btn-sm" style="background:var(--sa-warning-bg);color:var(--sa-warning);border-color:rgba(245,158,11,0.2);" onclick="SA.reopenShift()">Reopen Shift</button>';
            }
        }
        html += '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.printShiftSummary()" title="Print Shift Summary">Print</button>';
        html += '</div></div>';

        if (isClosed) {
            html += '<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:12px 18px;margin-bottom:16px;display:flex;align-items:center;gap:10px;font-size:0.85rem;color:var(--sa-warning);">'
                + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
                + '<div><strong>Shift Closed</strong> &mdash; This shift was closed' + (sd.closed_by ? ' by ' + sd.closed_by : '') + (sd.closed_at ? ' on ' + new Date(sd.closed_at).toLocaleString() : '') + '. Data is read-only. Reopen to make edits.</div></div>';
        }

        // SECTION 1: Pump Readings
        html += '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">Pump Readings</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table sa-pump-table">';

        // Header
        html += '<thead><tr><th rowspan="2" style="min-width:100px;">Pump</th><th rowspan="2" style="min-width:80px;">Type</th>';
        html += '<th colspan="4" class="shift-header day">DAY SHIFT</th>';
        html += '<th colspan="4" class="shift-header night">NIGHT SHIFT</th></tr>';
        html += '<tr><th class="text-right">Opening</th><th class="text-right">Closing</th><th class="text-right">RTT</th><th class="text-right">LTS</th>';
        html += '<th class="text-right">Opening</th><th class="text-right">Closing</th><th class="text-right">RTT</th><th class="text-right">LTS</th></tr></thead>';
        html += '<tbody>';

        let currentProduct = '';
        pumps.forEach(pump => {
            if (pump.product !== currentProduct) {
                if (currentProduct !== '') {
                    html += '<tr class="separator-row"><td colspan="10"></td></tr>';
                }
                currentProduct = pump.product;
                const cls = pump.product === 'PMS' ? '' : ' ago';
                html += '<tr class="pump-group-header' + cls + '"><td colspan="10">' + pump.product + ' PUMPS</td></tr>';
            }

            this.READING_TYPES.forEach(rt => {
                const dayKey = pump.id + '_' + rt + '_DAY';
                const nightKey = pump.id + '_' + rt + '_NIGHT';
                const dayR = this._getReading(readings, dayKey) || {};
                const nightR = this._getReading(readings, nightKey) || {};

                // Day opening: check for override, then auto from prev night closing (except first day)
                let dayOpening = 0;
                const hasDayOverride = dayR._opening_override !== undefined && dayR._opening_override !== null;
                if (hasDayOverride) {
                    dayOpening = this.parseNum(dayR._opening_override);
                } else if (!isFirstDay) {
                    const prevDs = this.prevDateStr(ds);
                    const prevKey = this.bk(bid, prevDs);
                    const prevReadings = this.data.pumpReadings[prevKey] || [];
                    const prevNightKey = pump.id + '_' + rt + '_NIGHT';
                    const prevNight = this._getReading(prevReadings, prevNightKey) || {};
                    dayOpening = this.parseNum(prevNight.closing);
                } else {
                    dayOpening = this.parseNum(dayR.opening);
                }

                const dayClosing = this.parseNum(dayR.closing);
                const dayRtt = this.parseNum(dayR.rtt);
                const dayLts = dayClosing - dayOpening - dayRtt;

                // Night opening = Day closing (or override)
                const hasNightOverride = nightR._opening_override !== undefined && nightR._opening_override !== null;
                const nightOpening = hasNightOverride ? this.parseNum(nightR._opening_override) : dayClosing;
                const nightClosing = this.parseNum(nightR.closing);
                const nightRtt = this.parseNum(nightR.rtt);
                const nightLts = nightClosing - nightOpening - nightRtt;

                const isSuperAdmin = this.getCurrentUser() && this.getCurrentUser().role === 'super_admin';

                html += '<tr>';
                html += '<td>' + (rt === 'MANUAL' ? pump.label : '') + '</td>';
                html += '<td class="reading-type">' + rt + '</td>';

                const dis = ro ? ' disabled' : '';

                // Day Opening
                if (isFirstDay && !ro) {
                    html += '<td class="text-right"><input class="sa-input sa-input-sm mono" value="' + this.fmt(dayOpening, 2) + '" data-field="opening" data-rkey="' + dayKey + '" onchange="SA._stageReading(this)"></td>';
                } else {
                    // Auto-field with override indicator and edit button for super admin
                    const overrideTag = hasDayOverride ? ' <span style="color:var(--sa-warning);font-size:0.6rem;font-weight:700;" title="Manually overridden by Super Admin">OVR</span>' : '';
                    const editBtn = isSuperAdmin ? ' <button class="sa-override-btn" onclick="SA.showMeterOverride(\'' + dayKey + '\',\'day\',' + dayOpening + ')" title="Override meter reading (meter reset)">&crarr;</button>' : '';
                    html += '<td class="text-right auto-field" style="white-space:nowrap;">' + this.fmt(dayOpening, 2) + overrideTag + editBtn + '</td>';
                }

                // Day Closing
                html += '<td class="text-right"><input class="sa-input sa-input-sm mono" value="' + (dayClosing ? this.fmt(dayClosing, 2) : '') + '" data-field="closing" data-rkey="' + dayKey + '" onchange="SA._stageReading(this)"' + dis + '></td>';
                // Day RTT
                html += '<td class="text-right"><input class="sa-input sa-input-sm mono" value="' + (dayRtt ? this.fmt(dayRtt, 2) : '') + '" data-field="rtt" data-rkey="' + dayKey + '" onchange="SA._stageReading(this)" style="max-width:70px;"' + dis + '></td>';
                // Day LTS
                html += '<td class="text-right calc-field">' + this.fmt(dayLts, 3) + '</td>';

                // Night Opening (auto, with override support for super admin)
                const nightOverrideTag = hasNightOverride ? ' <span style="color:var(--sa-warning);font-size:0.6rem;font-weight:700;" title="Manually overridden by Super Admin">OVR</span>' : '';
                const nightEditBtn = isSuperAdmin ? ' <button class="sa-override-btn" onclick="SA.showMeterOverride(\'' + nightKey + '\',\'night\',' + nightOpening + ')" title="Override meter reading (meter reset)">&crarr;</button>' : '';
                html += '<td class="text-right auto-field" style="white-space:nowrap;">' + this.fmt(nightOpening, 2) + nightOverrideTag + nightEditBtn + '</td>';

                // Night Closing
                html += '<td class="text-right"><input class="sa-input sa-input-sm mono" value="' + (nightClosing ? this.fmt(nightClosing, 2) : '') + '" data-field="closing" data-rkey="' + nightKey + '" onchange="SA._stageReading(this)"' + dis + '></td>';
                // Night RTT
                html += '<td class="text-right"><input class="sa-input sa-input-sm mono" value="' + (nightRtt ? this.fmt(nightRtt, 2) : '') + '" data-field="rtt" data-rkey="' + nightKey + '" onchange="SA._stageReading(this)" style="max-width:70px;"' + dis + '></td>';
                // Night LTS
                html += '<td class="text-right calc-field">' + this.fmt(nightLts, 3) + '</td>';

                html += '</tr>';
            });
        });

        html += '</tbody></table></div></div></div>';

        // SECTION 2: Expected Sales
        // Pump prices are fixed from Pump Prices module — always read-only here
        const sysPmsSP = this.getBranchPumpPrice(bid, 'pms');
        const sysAgoSP = this.getBranchPumpPrice(bid, 'ago');
        // Sync shiftDates to system pump price if different
        if (sd.pms_sp !== sysPmsSP || sd.ago_sp !== sysAgoSP) {
            sd.pms_sp = sysPmsSP;
            sd.ago_sp = sysAgoSP;
            this.saveData();
        }
        html += '<div class="sa-section"><div class="sa-section-header yellow"><div class="sa-section-title">Expected Sales</div></div><div class="sa-section-body">';
        html += '<div class="sa-form-row mb-16"><div class="sa-form-group"><label>PMS Pump Price (UGX/L)</label>';
        html += '<div class="sa-input mono" style="background:var(--sa-bg);cursor:default;font-weight:700;color:var(--sa-gold);">' + this.fmtInt(sysPmsSP) + '</div>';
        html += '</div><div class="sa-form-group"><label>AGO Pump Price (UGX/L)</label>';
        html += '<div class="sa-input mono" style="background:var(--sa-bg);cursor:default;font-weight:700;color:var(--sa-accent);">' + this.fmtInt(sysAgoSP) + '</div>';
        html += '</div></div>';
        // Link to Pump Prices page
        html += '<div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;">';
        html += '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.navigate(\'pump_prices\')">'
            + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:-2px;margin-right:4px;"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
            + (this.hasPermission('set_pump_price') ? 'Manage Pump Prices' : 'View Pump Prices') + '</button>';
        const priceChanges = this.data.priceHistory.filter(p => p.branch_id === bid).length;
        if (priceChanges > 0) {
            html += '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.showPriceHistory()">'
                + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:-2px;margin-right:4px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
                + 'Price History (' + priceChanges + ' changes)</button>';
        }
        html += '</div>';
        html += '<div class="sa-expected-grid">';
        html += '<div class="sa-expected-card pms"><div class="exp-label">PMS</div><div class="exp-volume">' + this.fmt(calc.pmsVolume, 3) + ' L</div><div class="exp-calc">&times; ' + this.fmtInt(calc.pmsSP) + ' UGX</div><div class="exp-value">UGX ' + this.fmtInt(calc.pmsValue) + '</div></div>';
        html += '<div class="sa-expected-card ago"><div class="exp-label">AGO</div><div class="exp-volume">' + this.fmt(calc.agoVolume, 3) + ' L</div><div class="exp-calc">&times; ' + this.fmtInt(calc.agoSP) + ' UGX</div><div class="exp-value">UGX ' + this.fmtInt(calc.agoValue) + '</div></div>';
        html += '<div class="sa-expected-card total"><div class="exp-label">TOTAL EXPECTED</div><div class="exp-volume">&nbsp;</div><div class="exp-calc">&nbsp;</div><div class="exp-value">UGX ' + this.fmtInt(calc.totalExpected) + '</div></div>';
        html += '</div></div></div>';

        // SECTION 3: Actual Collections
        html += '<div class="sa-section"><div class="sa-section-header yellow"><div class="sa-section-title">Actual Collections</div></div><div class="sa-section-body">';
        const collItems = [
            { label: 'CASH IN HAND', field: 'cash_in_hand', auto: false },
            { label: 'MOMOPAY', value: calc.momopay, auto: true, link: 'momo' },
            { label: 'M-PESA', value: calc.mpesa, auto: true, link: 'mpesa' },
            { label: 'AIRTEL MONEY', value: calc.airtelMoney, auto: true, link: 'airtel' },
            { label: 'DOLLAR', value: calc.dollar, auto: true, link: 'dollar' },
            { label: 'FLEXIPAY', value: calc.flexipay, auto: true, link: 'flexipay' },
            { label: 'EXPENSES', value: calc.totalExpenses, auto: true },
            { label: 'DISCOUNT', value: calc.totalDiscount, auto: true },
            { label: 'SHORTAGES', value: calc.totalShortages, auto: true },
            { label: 'CREDIT SALES', value: calc.totalCreditSales, auto: true },
            { label: 'GOODS ISSUE', value: calc.totalGoodsIssues, auto: true, link: 'goods_issues' }
        ];
        collItems.forEach(item => {
            html += '<div class="sa-collection-row">';
            html += '<div class="coll-label">' + item.label + (item.auto ? ' <span class="auto-tag">Auto</span>' : '') + '</div>';
            if (item.auto) {
                html += '<div class="coll-value" style="display:flex;align-items:center;gap:8px;">'
                    + '<span style="color:var(--sa-text-muted);font-style:italic;" class="mono">' + this.fmt(item.value) + '</span>';
                if (item.link) {
                    html += '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.navigate(\'' + item.link + '\')" style="font-size:0.7rem;">View / Edit</button>';
                }
                html += '</div>';
            } else {
                html += '<div class="coll-value"><input class="sa-input sa-input-sm mono" style="text-align:right;" value="' + (sd[item.field] || '') + '" onchange="SA._stageSD(\'' + item.field + '\',this.value)"' + (ro ? ' disabled' : '') + '></div>';
            }
            html += '</div>';
        });

        // Variance
        const vClass = Math.abs(calc.variance) < 0.01 ? 'variance-zero' : 'variance-nonzero';
        html += '<div class="sa-collection-row" style="padding-top:12px;border-top:2px solid var(--sa-border-light);">';
        html += '<div class="coll-label" style="font-weight:700;font-size:1rem;">VARIANCE</div>';
        html += '<div class="coll-value ' + vClass + '" style="font-size:1.1rem;font-weight:800;">UGX ' + this.fmt(calc.variance) + '</div>';
        html += '</div>';
        html += '</div></div>';

        // SECTION 5: Banking Summary
        html += '<div class="sa-section"><div class="sa-section-header green"><div class="sa-section-title">Banking Summary</div></div><div class="sa-section-body">';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--sa-border-light);border-radius:10px;overflow:hidden;">';

        // Left: Breakdown
        const bankingRows = [
            { label: 'PMS Litres Sold', value: this.fmt(calc.pmsVolume, 3) + ' L', cls: '' },
            { label: 'AGO Litres Sold', value: this.fmt(calc.agoVolume, 3) + ' L', cls: '' },
            { label: 'Total Expected Sales', value: 'UGX ' + this.fmtInt(calc.totalExpected), cls: 'text-bold' },
            { label: '', value: '', cls: 'sep' },
            { label: 'Cash in Hand', value: 'UGX ' + this.fmtInt(calc.cashInHand), cls: '' },
            { label: 'MomoPay', value: 'UGX ' + this.fmtInt(calc.momopay), cls: '' },
            { label: 'M-Pesa', value: 'UGX ' + this.fmtInt(calc.mpesa), cls: '' },
            { label: 'Airtel Money', value: 'UGX ' + this.fmtInt(calc.airtelMoney), cls: '' },
            { label: 'Dollar', value: 'UGX ' + this.fmtInt(calc.dollar), cls: '' },
            { label: 'FlexiPay', value: 'UGX ' + this.fmtInt(calc.flexipay), cls: '' },
            { label: 'Credit Sales', value: 'UGX ' + this.fmtInt(calc.totalCreditSales), cls: '' },
            { label: 'Discounts', value: 'UGX ' + this.fmtInt(calc.totalDiscount), cls: '' },
            { label: '', value: '', cls: 'sep' },
            { label: 'Less: Expenses', value: '(UGX ' + this.fmtInt(calc.totalExpenses) + ')', cls: 'text-danger' },
            { label: 'Less: Shortages', value: '(UGX ' + this.fmtInt(calc.totalShortages) + ')', cls: 'text-danger' },
            { label: 'Less: Goods Issue', value: '(UGX ' + this.fmtInt(calc.totalGoodsIssues) + ')', cls: 'text-danger' }
        ];

        html += '<div style="padding:16px 20px;">';
        bankingRows.forEach(r => {
            if (r.cls === 'sep') {
                html += '<div style="border-top:1px dashed var(--sa-border-light);margin:8px 0;"></div>';
            } else {
                html += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:0.82rem;">'
                    + '<span style="color:var(--sa-text-muted);">' + r.label + '</span>'
                    + '<span class="mono ' + r.cls + '">' + r.value + '</span></div>';
            }
        });
        html += '</div>';

        // Right: Amount to Bank (big summary)
        const totalDigital = calc.momopay + calc.mpesa + calc.airtelMoney + calc.dollar + calc.flexipay;
        const netCashToBank = calc.cashInHand - calc.totalExpenses - calc.totalShortages - calc.totalGoodsIssues;
        const totalToBank = netCashToBank; // Cash portion only (digital already banked)

        html += '<div style="background:var(--sa-bg-card-hover);padding:20px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:12px;">';
        html += '<div style="text-align:center;">'
            + '<div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--sa-text-dim);margin-bottom:4px;">Cash to Bank</div>'
            + '<div style="font-size:1.8rem;font-weight:800;color:' + (netCashToBank >= 0 ? 'var(--sa-success)' : 'var(--sa-danger)') + ';" class="mono">UGX ' + this.fmtInt(netCashToBank) + '</div>'
            + '<div style="font-size:0.7rem;color:var(--sa-text-dim);margin-top:2px;">Cash - Expenses - Shortages - Goods Issue</div>'
            + '</div>';

        html += '<div style="border-top:1px solid var(--sa-border-light);width:100%;padding-top:12px;text-align:center;">'
            + '<div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--sa-text-dim);margin-bottom:4px;">Digital Payments (Already Banked)</div>'
            + '<div style="font-size:1.1rem;font-weight:700;color:var(--sa-primary);" class="mono">UGX ' + this.fmtInt(totalDigital) + '</div>'
            + '<div style="font-size:0.68rem;color:var(--sa-text-dim);margin-top:2px;">MomoPay + M-Pesa + Airtel</div>'
            + '</div>';

        html += '<div style="border-top:1px solid var(--sa-border-light);width:100%;padding-top:12px;text-align:center;">'
            + '<div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--sa-text-dim);margin-bottom:4px;">Grand Total Banked</div>'
            + '<div style="font-size:1.3rem;font-weight:800;" class="mono">UGX ' + this.fmtInt(netCashToBank + totalDigital) + '</div>'
            + '<div style="font-size:0.68rem;color:var(--sa-text-dim);margin-top:2px;">Cash + Digital</div>'
            + '</div>';

        html += '</div></div></div></div>';

        // SECTION 6: Pump Shortages (Attendants as Customers)
        html += '<div class="sa-section"><div class="sa-section-header red"><div class="sa-section-title">Pump Shortages / Attendant Balances</div></div><div class="sa-section-body">';
        html += '<div class="sa-info-box" style="margin-bottom:12px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + 'Shortages are linked to attendant accounts. Each shortage creates a debit on the attendant\'s customer ledger &mdash; balance is deducted from salary.</div>';
        const shortages = this._activeRecords(this.data.pumpShortages[key] || []);
        const branchCustomers = this.data.customers.filter(c => c.branch_id === bid);
        const attendants = branchCustomers.filter(c => c.customer_type === 'attendant');

        shortages.forEach((s, i) => {
            let attOpts = '<option value="">-- Select Attendant --</option>';
            attendants.forEach(a => {
                const bal = this.getCustomerBalance(a.id);
                attOpts += '<option value="' + a.id + '"' + (s.attendant_id === a.id ? ' selected' : '') + '>' + a.name + ' (Bal: ' + this.fmtInt(bal) + ')</option>';
            });
            html += '<div class="sa-shortage-row" style="grid-template-columns:1fr 160px 40px;">'
                + '<select class="sa-input sa-input-sm" onchange="SA._stageShortage(\'' + s._id + '\',\'attendant_id\',parseInt(this.value)||0)"' + (ro ? ' disabled' : '') + '>' + attOpts + '</select>'
                + '<input class="sa-input sa-input-sm mono" placeholder="Amount" value="' + (s.amount || '') + '" onchange="SA._stageShortage(\'' + s._id + '\',\'amount\',this.value)" style="text-align:right;"' + (ro ? ' disabled' : '') + '>'
                + (ro ? '' : '<button class="sa-remove-btn" onclick="SA.removeShortage(\'' + s._id + '\')">&times;</button>') + '</div>';
        });
        if (!ro) {
            html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center;">'
                + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.addShortage()">+ Add Shortage</button>'
                + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.showAddAttendant()">+ New Attendant</button>'
                + (shortages.length > 0 ? '<button class="sa-btn sa-btn-primary sa-btn-sm" onclick="SA._commitShortages()" style="padding:8px 20px;font-weight:700;gap:4px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Update</button>' : '')
                + '</div>';
        }
        html += '<div class="sa-shortage-total"><span class="total-label">TOTAL SHORTAGES</span><span class="total-value">UGX ' + this.fmt(calc.totalShortages) + '</span></div>';

        // Mini attendant balance table
        if (attendants.length > 0) {
            html += '<div style="margin-top:16px;border-top:1px solid var(--sa-border-light);padding-top:12px;">'
                + '<div style="font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--sa-text-dim);margin-bottom:8px;">Attendant Running Balances</div>';
            html += '<table class="sa-table" style="font-size:0.8rem;"><thead><tr><th>Attendant</th><th class="text-right">Balance Owed</th><th></th></tr></thead><tbody>';
            attendants.forEach(a => {
                const bal = this.getCustomerBalance(a.id);
                html += '<tr><td>' + a.name + '</td>'
                    + '<td class="text-right mono ' + (bal > 0 ? 'text-danger' : 'text-success') + '">' + this.fmtInt(Math.abs(bal)) + (bal > 0 ? ' owed' : '') + '</td>'
                    + '<td><button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.viewStatement(\'' + a.id + '\')">Statement</button></td></tr>';
            });
            html += '</tbody></table></div>';
        }
        html += '</div></div>';

        // Update button for all shift entry fields
        if (!ro) {
            html += '<div style="padding:12px 0;text-align:right;">'
                + '<button class="sa-btn sa-btn-primary" onclick="SA._commitShiftEntry()" style="padding:10px 32px;font-size:0.95rem;font-weight:700;gap:6px;">'
                + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>'
                + ' Update</button></div>';
        }

        // Quick links to sub-modules
        html += '<div class="sa-section"><div class="sa-section-header green"><div class="sa-section-title">Related Data for ' + this.formatDate(ds) + '</div></div><div class="sa-section-body">';
        html += '<div class="sa-btn-group">';
        html += '<button class="sa-btn sa-btn-secondary" onclick="SA.navigate(\'credit_sales\')">Credit Sales (' + ((this.data.creditSales[key] || []).length) + ')</button>';
        html += '<button class="sa-btn sa-btn-secondary" onclick="SA.navigate(\'expenses\')">Expenses (' + ((this.data.expenses[key] || []).length) + ')</button>';
        html += '<button class="sa-btn sa-btn-secondary" onclick="SA.navigate(\'discounts\')">Discounts (' + ((this.data.discounts[key] || []).length) + ')</button>';
        html += '<button class="sa-btn sa-btn-secondary" onclick="SA.navigate(\'goods_issues\')" style="border-color:rgba(124,58,237,0.3);">Goods Issue (' + ((this.data.goodsIssues[key] || []).length) + ')</button>';
        html += '<button class="sa-btn sa-btn-secondary" onclick="SA.navigate(\'momo\')" style="border-color:rgba(255,204,0,0.3);">MomoPay (' + ((this.data.momoTransactions[key] || []).length) + ')</button>';
        html += '<button class="sa-btn sa-btn-secondary" onclick="SA.navigate(\'airtel\')" style="border-color:rgba(228,0,0,0.3);">Airtel (' + ((this.data.airtelTransactions[key] || []).length) + ')</button>';
        html += '<button class="sa-btn sa-btn-secondary" onclick="SA.navigate(\'mpesa\')" style="border-color:rgba(76,175,80,0.3);">M-Pesa (' + ((this.data.mpesaTransactions[key] || []).length) + ')</button>';
        html += '<button class="sa-btn sa-btn-secondary" onclick="SA.navigate(\'dollar\')" style="border-color:rgba(46,125,50,0.3);">Dollar (' + ((this.data.dollarTransactions[key] || []).length) + ')</button>';
        html += '<button class="sa-btn sa-btn-secondary" onclick="SA.navigate(\'flexipay\')" style="border-color:rgba(21,101,192,0.3);">FlexiPay (' + ((this.data.flexipayTransactions[key] || []).length) + ')</button>';
        html += '</div></div></div>';

        el.innerHTML = html;
    },

    // Shift entry helpers
    _readingPending: [],
    _spPending: {},
    _sdPending: {},

    _stageReading(inputEl) {
        this._readingPending.push({ rkey: inputEl.dataset.rkey, field: inputEl.dataset.field, value: inputEl.value });
    },

    _stageSP(field, value) {
        this._spPending[field] = value;
    },

    _stageSD(field, value) {
        this._sdPending[field] = value;
    },

    _commitShiftEntry() {
        var hasChanges = false;

        // ── VALIDATE readings before applying ──
        if (this._readingPending.length > 0) {
            for (var i = 0; i < this._readingPending.length; i++) {
                var r = this._readingPending[i];
                var label = r.rkey.replace(/_/g, ' ') + ' ' + r.field;
                if (!this._validateReading(r.value, label)) return;
            }
        }

        // ── VALIDATE selling prices ──
        var spKeys = Object.keys(this._spPending);
        for (var si = 0; si < spKeys.length; si++) {
            var spField = spKeys[si];
            var spLabel = spField === 'pms_sp' ? 'PMS Selling Price' : 'AGO Selling Price';
            if (!this._validatePrice(this._spPending[spField], spLabel)) return;
        }

        // ── VALIDATE shift data (cash_in_hand, night litres, etc.) ──
        var sdKeys = Object.keys(this._sdPending);
        for (var di = 0; di < sdKeys.length; di++) {
            var sdField = sdKeys[di];
            var sdVal = this._sdPending[sdField];
            if (sdField === 'cash_in_hand') {
                if (!this._validateAmount(sdVal, 'Cash in Hand')) return;
            } else if (sdField === 'night_pms_litres' || sdField === 'night_ago_litres') {
                if (!this._validateLitres(sdVal, sdField === 'night_pms_litres' ? 'Night PMS Litres' : 'Night AGO Litres')) return;
            } else {
                if (!this._validatePositive(sdVal, sdField.replace(/_/g, ' '))) return;
            }
        }

        this._shiftCommitting = true;

        // Apply readings
        if (this._readingPending.length > 0) {
            hasChanges = true;
            var key = this.bk(this.currentBranch.id, this.currentDate);
            if (!this.data.pumpReadings[key]) this.data.pumpReadings[key] = [];
            var self = this;
            this._readingPending.forEach(function(r) {
                var rdObj = self._ensureReading(self.data.pumpReadings[key], r.rkey);
                var newVal = self.parseNum(r.value);
                self._trackChange(rdObj, r.field, newVal);
                rdObj[r.field] = newVal;
                self._touchUpdated(rdObj);
                if (!rdObj.created_at) { var s = self._auditStamp(); rdObj.created_at = s.created_at; rdObj.created_by = s.created_by; }
            });

            // 5. WARN if closing < opening (possible meter reset)
            var readings = this.data.pumpReadings[key];
            readings.forEach(function(rd) {
                var rk = rd.pump_rkey;
                var opening = self.parseNum(rd.opening || rd._opening_override);
                var closing = self.parseNum(rd.closing);
                if (closing > 0 && opening > 0 && closing < opening) {
                    self.toast('WARNING: ' + rk.replace(/_/g, ' ').toUpperCase() + ' — Closing (' + self.fmt(closing, 2) + ') is less than Opening (' + self.fmt(opening, 2) + '). Possible meter reset?', 'warning');
                }
            });

            this._readingPending = [];
        }

        // Apply SP
        if (spKeys.length > 0) {
            hasChanges = true;
            var self2 = this;
            spKeys.forEach(function(field) { self2.updateSP(field, self2._spPending[field]); });
            this._spPending = {};
        }
        // Apply SD
        if (sdKeys.length > 0) {
            hasChanges = true;
            var self3 = this;
            sdKeys.forEach(function(field) { self3.updateSD(field, self3._sdPending[field]); });
            this._sdPending = {};
        }
        this._shiftCommitting = false;
        if (!hasChanges) { this.toast('No changes to update', 'warning'); return; }
        this.saveData();
        this.navigate('shift_entry');
        this.toast('Shift entry updated', 'success');
    },

    updateReading(inputEl) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        const rkey = inputEl.dataset.rkey;
        const field = inputEl.dataset.field;
        if (!this.data.pumpReadings[key]) this.data.pumpReadings[key] = [];
        var rdObj = this._ensureReading(this.data.pumpReadings[key], rkey);
        var newVal = this.parseNum(inputEl.value);
        this._trackChange(rdObj, field, newVal);
        rdObj[field] = newVal;
        this._touchUpdated(rdObj);
        if (!rdObj.created_at) { var s = this._auditStamp(); rdObj.created_at = s.created_at; rdObj.created_by = s.created_by; }
        this.saveData();
        this.navigate('shift_entry');
    },

    // Super Admin meter reading override (for meter resets)
    showMeterOverride(rkey, shift, currentValue) {
        const user = this.getCurrentUser();
        if (!user || user.role !== 'super_admin') {
            this.toast('Only Super Admin can override meter readings', 'error');
            return;
        }
        const key = this.bk(this.currentBranch.id, this.currentDate);
        const r = this._getReading(this.data.pumpReadings[key], rkey) || {};
        const hasOverride = r._opening_override !== undefined && r._opening_override !== null;
        const html = '<div style="text-align:center;margin-bottom:16px;">'
            + '<svg viewBox="0 0 24 24" fill="none" stroke="var(--sa-warning)" stroke-width="2" width="36" height="36"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>'
            + '<h3 style="margin:8px 0 4px;">Meter Reading Override</h3>'
            + '<p style="font-size:0.82rem;color:var(--sa-text-muted);">Use this when the meter has been reset or the auto-calculated opening is incorrect.</p>'
            + '<p style="font-size:0.78rem;color:var(--sa-text-dim);">Pump: <strong>' + rkey.replace(/_/g, ' ').toUpperCase() + '</strong> — ' + shift.toUpperCase() + ' Opening</p></div>'
            + '<div class="sa-form-group"><label>Current Auto Value</label><input class="sa-input" value="' + this.fmt(currentValue, 2) + '" disabled></div>'
            + '<div class="sa-form-group"><label>New Opening Reading</label><input class="sa-input" id="meterOverrideVal" type="number" step="0.01" value="' + (hasOverride ? this.fmt(this.parseNum(r._opening_override), 2) : '') + '" placeholder="Enter corrected meter reading"></div>'
            + '<div class="sa-form-group"><label>Reason</label><input class="sa-input" id="meterOverrideReason" placeholder="e.g. Meter reset, pump serviced"></div>'
            + '<div class="sa-modal-actions" style="padding:12px 0 0;border:none;">'
            + (hasOverride ? '<button class="sa-btn sa-btn-danger" onclick="SA.clearMeterOverride(\'' + rkey + '\')" style="margin-right:auto;">Remove Override</button>' : '<span></span>')
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-warning" onclick="SA.saveMeterOverride(\'' + rkey + '\')">Save Override</button></div>';
        this.openModal('Meter Override — Super Admin', html);
    },

    saveMeterOverride(rkey) {
        const val = document.getElementById('meterOverrideVal').value;
        const reason = document.getElementById('meterOverrideReason').value.trim();
        if (!val && val !== '0') { this.toast('Enter a meter reading value', 'error'); return; }
        const key = this.bk(this.currentBranch.id, this.currentDate);
        if (!this.data.pumpReadings[key]) this.data.pumpReadings[key] = [];
        var rdObj = this._ensureReading(this.data.pumpReadings[key], rkey);
        rdObj._opening_override = this.parseNum(val);
        this.saveData();
        this.auditLog('METER_OVERRIDE', 'Overrode meter opening for ' + rkey.replace(/_/g, ' ') + ' to ' + val + (reason ? ' — Reason: ' + reason : '') + ' on ' + this.formatDate(this.currentDate));
        this.closeModal();
        this.toast('Meter reading overridden');
        this.navigate('shift_entry');
    },

    clearMeterOverride(rkey) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        var rdObj = this._getReading(this.data.pumpReadings[key], rkey);
        if (rdObj) {
            delete rdObj._opening_override;
            this.saveData();
            this.auditLog('METER_OVERRIDE_CLEARED', 'Cleared meter override for ' + rkey.replace(/_/g, ' ') + ' on ' + this.formatDate(this.currentDate));
            this.closeModal();
            this.toast('Meter override removed — reverted to auto-calculated');
            this.navigate('shift_entry');
        }
    },

    updateSD(field, value) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        if (!this.data.shiftDates[key]) this.data.shiftDates[key] = {};
        this.data.shiftDates[key][field] = this.parseNum(value);
        this._touchUpdated(this.data.shiftDates[key]);
        if (!this._shiftCommitting) { this.saveData(); this.navigate('shift_entry'); }
    },

    updateSP(field, value) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        if (!this.data.shiftDates[key]) this.data.shiftDates[key] = {};
        const oldPrice = this.parseNum(this.data.shiftDates[key][field]);
        const newPrice = this.parseNum(value);
        this.data.shiftDates[key][field] = newPrice;

        // Log price change if different
        if (oldPrice !== newPrice && newPrice > 0) {
            const product = field === 'pms_sp' ? 'PMS' : 'AGO';
            this.data.priceHistory.push({
                id: this.uid(),
                branch_id: this.currentBranch.id,
                date: this.currentDate,
                product: product,
                old_price: oldPrice,
                new_price: newPrice,
                changed_by: this.currentUser ? this.currentUser.username : 'unknown',
                changed_at: new Date().toISOString()
            });
        }

        if (!this._shiftCommitting) { this.saveData(); this.navigate('shift_entry'); }
    },

    showPriceHistory() {
        const bid = this.currentBranch.id;
        const history = this.data.priceHistory
            .filter(p => p.branch_id === bid)
            .sort((a, b) => b.changed_at > a.changed_at ? 1 : -1);
        let html = '<div class="sa-table-wrap" style="max-height:400px;overflow-y:auto;"><table class="sa-table"><thead><tr>'
            + '<th>Date</th><th>Product</th><th class="text-right">Old Price</th><th class="text-right">New Price</th><th class="text-right">Change</th><th>Changed By</th><th>Time</th></tr></thead><tbody>';
        if (history.length === 0) {
            html += '<tr><td colspan="7" class="text-center text-muted" style="padding:20px;">No price changes recorded yet.</td></tr>';
        }
        history.forEach(p => {
            const diff = p.new_price - p.old_price;
            const diffClass = diff > 0 ? 'text-danger' : (diff < 0 ? 'text-success' : 'text-muted');
            const arrow = diff > 0 ? '&#9650;' : (diff < 0 ? '&#9660;' : '&mdash;');
            html += '<tr>'
                + '<td>' + this.formatDate(p.date) + '</td>'
                + '<td><span class="sa-badge sa-badge-' + (p.product === 'PMS' ? 'warning' : 'info') + '">' + p.product + '</span></td>'
                + '<td class="text-right mono">' + this.fmtInt(p.old_price) + '</td>'
                + '<td class="text-right mono text-bold">' + this.fmtInt(p.new_price) + '</td>'
                + '<td class="text-right mono ' + diffClass + '">' + arrow + ' ' + this.fmtInt(Math.abs(diff)) + '</td>'
                + '<td class="text-muted">' + (p.changed_by || '—') + '</td>'
                + '<td class="text-muted" style="font-size:0.72rem;">' + new Date(p.changed_at).toLocaleString() + '</td></tr>';
        });
        html += '</tbody></table></div>';
        this.openModal('Price History — ' + this.currentBranch.name, html);
    },

    // ── Pump Price System ──
    getBranchPumpPrice(branchId, product) {
        // product: 'pms' or 'ago'
        var bp = (this.data.pumpPrices || {})[branchId];
        if (bp && bp[product] > 0) return bp[product];
        // Fallback defaults
        return product === 'pms' ? 5185 : 4800;
    },

    setPumpPrice(branchId, product, price, effectiveDate) {
        if (!this.data.pumpPrices) this.data.pumpPrices = {};
        if (!this.data.pumpPrices[branchId]) this.data.pumpPrices[branchId] = {};
        var old = this.data.pumpPrices[branchId][product] || 0;
        this.data.pumpPrices[branchId][product] = price;
        this.data.pumpPrices[branchId][product + '_updated_at'] = new Date().toISOString();
        this.data.pumpPrices[branchId][product + '_effective_date'] = effectiveDate || this.todayStr();
        var user = this.getCurrentUser();
        this.data.pumpPrices[branchId][product + '_updated_by'] = user ? user.full_name : 'System';
        // Log to priceHistory
        if (old !== price && price > 0) {
            var branch = this.data.branches.find(function(b) { return b.id === branchId; });
            this.data.priceHistory.push({
                id: this.uid(),
                branch_id: branchId,
                date: effectiveDate || this.todayStr(),
                product: product.toUpperCase(),
                old_price: old,
                new_price: price,
                changed_by: user ? user.username : 'unknown',
                changed_at: new Date().toISOString()
            });
            this.auditLog('PUMP_PRICE_CHANGE', (user ? user.full_name : 'System') + ' changed ' + product.toUpperCase() + ' pump price from ' + this.fmtInt(old) + ' to ' + this.fmtInt(price) + (branch ? ' at ' + branch.name : ''));
        }
        this.saveData();
    },

    renderPumpPrices(el) {
        if (!this.hasPermission('set_pump_price') && !this.hasPermission('view_reports')) {
            el.innerHTML = this._accessDenied('Pump Prices');
            return;
        }
        if (!this.currentBranch) { el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>'; return; }
        var canEdit = this.hasPermission('set_pump_price');
        var self = this;
        var branch = this.currentBranch;
        var bid = branch.id;

        var html = '<div class="sa-page-header"><h1>Pump Prices &mdash; ' + branch.name + '</h1>'
            + '<div class="sa-page-actions"><span class="text-muted" style="font-size:0.8rem;">Prices carry forward automatically until changed</span></div></div>';

        // Info banner
        html += '<div class="sa-info-box" style="margin-bottom:20px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + 'The pump price is the official retail price per litre at the pump. Once set, it automatically applies to all daily shifts, credit sales, and calculations. Only the <strong>discount/selling price</strong> for discounted sales needs to be entered manually.</div>';

        // Current branch prices
        var bp = (this.data.pumpPrices || {})[bid] || {};
        var pmsCurrent = bp.pms || 5185;
        var agoCurrent = bp.ago || 4800;
        var pmsUpdatedAt = bp.pms_updated_at ? new Date(bp.pms_updated_at).toLocaleString() : '';
        var agoUpdatedAt = bp.ago_updated_at ? new Date(bp.ago_updated_at).toLocaleString() : '';
        var pmsUpdatedBy = bp.pms_updated_by || '—';
        var agoUpdatedBy = bp.ago_updated_by || '—';
        var pmsEffDate = bp.pms_effective_date ? this.formatDate(bp.pms_effective_date) : (bp.pms_updated_at ? new Date(bp.pms_updated_at).toLocaleDateString() : '—');
        var agoEffDate = bp.ago_effective_date ? this.formatDate(bp.ago_effective_date) : (bp.ago_updated_at ? new Date(bp.ago_updated_at).toLocaleDateString() : '—');

        html += '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">' + branch.name + ' <span class="sa-badge sa-badge-neutral" style="font-size:0.65rem;vertical-align:middle;">' + branch.branch_code + '</span></div></div>';
        html += '<div class="sa-section-body">';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">';

        // PMS Card
        html += '<div style="border:2px solid rgba(245,158,11,0.3);border-radius:10px;padding:20px;text-align:center;background:rgba(245,158,11,0.03);">';
        html += '<div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--sa-text-secondary);margin-bottom:8px;font-weight:600;">PMS (Petrol)</div>';
        html += '<div style="font-size:2rem;font-weight:800;color:var(--sa-gold);font-family:var(--sa-mono);">UGX ' + this.fmtInt(pmsCurrent) + '<span style="font-size:0.8rem;font-weight:400;">/L</span></div>';
        html += '<div style="font-size:0.8rem;color:var(--sa-text-secondary);margin-top:8px;font-weight:600;">Effective: ' + pmsEffDate + '</div>';
        html += '<div style="font-size:0.7rem;color:var(--sa-text-dim);margin-top:4px;">Set by ' + pmsUpdatedBy + (pmsUpdatedAt ? ' &bull; ' + pmsUpdatedAt : '') + '</div>';
        if (canEdit) {
            html += '<div style="margin-top:14px;display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;">'
                + '<input type="number" class="sa-input mono" id="ppPms_' + bid + '" value="' + pmsCurrent + '" style="width:120px;text-align:center;font-size:1rem;font-weight:700;" min="0">'
                + '<input type="date" class="sa-input" id="ppPmsDate_' + bid + '" value="' + this.todayStr() + '" style="width:140px;">'
                + '<button class="sa-btn sa-btn-primary sa-btn-sm" onclick="SA._savePumpPrice(\'' + bid + '\',\'pms\')" style="font-weight:700;">Update</button></div>';
        }
        html += '</div>';

        // AGO Card
        html += '<div style="border:2px solid rgba(59,130,246,0.3);border-radius:10px;padding:20px;text-align:center;background:rgba(59,130,246,0.03);">';
        html += '<div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--sa-text-secondary);margin-bottom:8px;font-weight:600;">AGO (Diesel)</div>';
        html += '<div style="font-size:2rem;font-weight:800;color:var(--sa-accent);font-family:var(--sa-mono);">UGX ' + this.fmtInt(agoCurrent) + '<span style="font-size:0.8rem;font-weight:400;">/L</span></div>';
        html += '<div style="font-size:0.8rem;color:var(--sa-text-secondary);margin-top:8px;font-weight:600;">Effective: ' + agoEffDate + '</div>';
        html += '<div style="font-size:0.7rem;color:var(--sa-text-dim);margin-top:4px;">Set by ' + agoUpdatedBy + (agoUpdatedAt ? ' &bull; ' + agoUpdatedAt : '') + '</div>';
        if (canEdit) {
            html += '<div style="margin-top:14px;display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;">'
                + '<input type="number" class="sa-input mono" id="ppAgo_' + bid + '" value="' + agoCurrent + '" style="width:120px;text-align:center;font-size:1rem;font-weight:700;" min="0">'
                + '<input type="date" class="sa-input" id="ppAgoDate_' + bid + '" value="' + this.todayStr() + '" style="width:140px;">'
                + '<button class="sa-btn sa-btn-primary sa-btn-sm" onclick="SA._savePumpPrice(\'' + bid + '\',\'ago\')" style="font-weight:700;">Update</button></div>';
        }
        html += '</div>';

        html += '</div>'; // grid
        html += '</div></div>'; // section

        // Price History for this branch only
        var branchHistory = (this.data.priceHistory || []).filter(function(p) { return p.branch_id === bid; }).sort(function(a, b) { return b.changed_at > a.changed_at ? 1 : -1; });
        if (branchHistory.length > 0) {
            html += '<div class="sa-section"><div class="sa-section-header" style="--section-bg:rgba(99,102,241,0.06);"><div class="sa-section-title">Price Change History</div></div>';
            html += '<div class="sa-section-body no-pad"><div class="sa-table-wrap" style="max-height:400px;overflow-y:auto;"><table class="sa-table"><thead><tr>'
                + '<th>Date</th><th>Product</th><th class="text-right">Old Price</th><th class="text-right">New Price</th><th class="text-right">Change</th><th>Changed By</th><th>Time</th></tr></thead><tbody>';
            branchHistory.slice(0, 50).forEach(function(p) {
                var diff = p.new_price - p.old_price;
                var diffClass = diff > 0 ? 'text-danger' : (diff < 0 ? 'text-success' : 'text-muted');
                var arrow = diff > 0 ? '&#9650;' : (diff < 0 ? '&#9660;' : '&mdash;');
                html += '<tr>'
                    + '<td>' + self.formatDate(p.date) + '</td>'
                    + '<td><span class="sa-badge sa-badge-' + (p.product === 'PMS' ? 'warning' : 'info') + '">' + p.product + '</span></td>'
                    + '<td class="text-right mono">' + self.fmtInt(p.old_price) + '</td>'
                    + '<td class="text-right mono text-bold">' + self.fmtInt(p.new_price) + '</td>'
                    + '<td class="text-right mono ' + diffClass + '">' + arrow + ' ' + self.fmtInt(Math.abs(diff)) + '</td>'
                    + '<td class="text-muted">' + (p.changed_by || '—') + '</td>'
                    + '<td class="text-muted" style="font-size:0.72rem;">' + new Date(p.changed_at).toLocaleString() + '</td></tr>';
            });
            html += '</tbody></table></div></div></div>';
        }

        el.innerHTML = html;
    },

    _savePumpPrice(branchId, product) {
        if (!this.hasPermission('set_pump_price')) { this.toast('Permission denied', 'error'); return; }
        var inputId = product === 'pms' ? 'ppPms_' + branchId : 'ppAgo_' + branchId;
        var dateId = product === 'pms' ? 'ppPmsDate_' + branchId : 'ppAgoDate_' + branchId;
        var input = document.getElementById(inputId);
        var dateInput = document.getElementById(dateId);
        if (!input) return;
        var price = this.parseNum(input.value);
        var effectiveDate = dateInput ? dateInput.value : this.todayStr();
        if (!effectiveDate) effectiveDate = this.todayStr();
        if (price <= 0) { this.toast('Please enter a valid price', 'error'); return; }
        var old = this.getBranchPumpPrice(branchId, product);
        if (price === old) { this.toast('Price unchanged', 'info'); return; }
        if (!confirm('Update ' + product.toUpperCase() + ' pump price to UGX ' + this.fmtInt(price) + '/L effective ' + this.formatDate(effectiveDate) + '?')) return;
        this.setPumpPrice(branchId, product, price, effectiveDate);
        // Also update shiftDates for the effective date so it takes effect immediately
        var key = this.bk(branchId, effectiveDate);
        if (this.data.shiftDates[key]) {
            this.data.shiftDates[key][product + '_sp'] = price;
            this.saveData();
        }
        this.toast(product.toUpperCase() + ' pump price updated to UGX ' + this.fmtInt(price) + '/L effective ' + this.formatDate(effectiveDate), 'success');
        this.navigate('pump_prices');
    },

    addShortage() {
        if (!this.hasPermission('edit_shift')) { this.toast('Permission denied', 'error'); return; }
        if (!this._guardClosedShift('add a shortage', () => this.addShortage())) return;
        const key = this.bk(this.currentBranch.id, this.currentDate);
        if (!this.data.pumpShortages[key]) this.data.pumpShortages[key] = [];
        const existing = this.data.pumpShortages[key];
        if (existing.length > 0) {
            const last = existing[existing.length - 1];
            if ((!last.attendant_id || last.attendant_id === 0) && this.parseNum(last.amount) === 0) {
                this.toast('Please fill in the last shortage before adding a new one', 'warning');
                return;
            }
        }
        this._initRefCounters();
        var stamp = this._auditStamp();
        this.data.pumpShortages[key].push({
            _id: this.uid(), ref_number: this._nextRef('SHT'),
            attendant_id: 0, attendant_name: '', amount: 0, _txn_id: null,
            created_at: stamp.created_at, created_by: stamp.created_by,
            updated_at: stamp.updated_at, updated_by: stamp.updated_by
        });
        this.saveData();
        this.navigate('shift_entry');
    },

    removeShortage(id) {
        if (!this._guardClosedShift('delete a shortage entry', () => this._doRemoveShortage(id))) return;
        if (!confirm('Are you sure you want to delete this shortage?')) return;
        this._doRemoveShortage(id);
    },
    _doRemoveShortage(id) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        var s = this._findById(this.data.pumpShortages[key], id);
        if (s) {
            if (s._txn_id) {
                this.data.customerTransactions = this.data.customerTransactions.filter(t => t.id !== s._txn_id);
            }
            this._softDelete(s);
            this.saveData();
            this.navigate('shift_entry');
        }
    },

    _shortPending: {},

    _stageShortage(id, field, value) {
        if (!this._shortPending[id]) this._shortPending[id] = {};
        this._shortPending[id][field] = value;
    },

    _commitShortages() {
        var pending = this._shortPending;
        var keys = Object.keys(pending);
        if (keys.length === 0) { this.toast('No changes to update', 'warning'); return; }

        // Validate
        var bKey = this.bk(this.currentBranch.id, this.currentDate);
        var entries = this._activeRecords(this.data.pumpShortages[bKey] || []);
        for (var i = 0; i < keys.length; i++) {
            var id = keys[i];
            var fields = pending[id];
            var entry = this._findById(entries, id);
            if (!entry) continue;
            var attId = fields.attendant_id !== undefined ? fields.attendant_id : entry.attendant_id;
            if (fields.amount !== undefined && !this._validateAmount(fields.amount, 'Shortage amount')) return;
            if (!attId || attId === 0) {
                this.toast('Please select an attendant for shortage entry', 'error');
                return;
            }
        }

        this._shortPending = {};
        this._shortCommitting = true;
        var self = this;
        keys.forEach(function(id) {
            var fields = pending[id];
            Object.keys(fields).forEach(function(field) {
                self.updateShortage(id, field, fields[field]);
            });
        });
        this._shortCommitting = false;
        this.navigate('shift_entry');
        this.toast('Shortages updated', 'success');
    },

    updateShortage(id, field, value) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        const s = this._findById(this.data.pumpShortages[key], id);
        if (!s) return;

        if (field === 'amount') {
            var newAmt = this.parseNum(value);
            this._trackChange(s, 'amount', newAmt);
            s.amount = newAmt;
        } else if (field === 'attendant_id') {
            this._trackChange(s, 'attendant_id', value);
            s.attendant_id = value;
            const att = this.data.customers.find(c => c.id === value);
            s.attendant_name = att ? att.name : '';
        } else {
            this._trackChange(s, field, value);
            s[field] = value;
        }

        // Sync linked customer transaction
        if (!s._id) s._id = this.uid();
        this._touchUpdated(s);
        this._syncShortageTransaction(key, id);
        this.saveData();
        if (!this._shortCommitting) this.navigate('shift_entry');
    },

    _syncShortageTransaction(key, id) {
        const s = this._findById(this.data.pumpShortages[key], id);
        if (!s) return;
        const amt = this.parseNum(s.amount);
        const attId = s.attendant_id;
        const date = this.currentDate;

        // Remove old txn if exists
        if (s._txn_id) {
            this.data.customerTransactions = this.data.customerTransactions.filter(t => t.id !== s._txn_id);
            s._txn_id = null;
        }

        // Create new debit transaction if attendant and amount set
        if (attId && amt > 0) {
            const txnId = this.uid();
            this.data.customerTransactions.push({
                id: txnId, _id: txnId, customer_id: attId,
                branch_id: this.currentBranch ? this.currentBranch.id : null,
                transaction_date: date,
                description: 'Pump shortage — ' + this.formatDate(date),
                transaction_type: 'DEBIT', debit_amount: amt, credit_amount: 0,
                reference_type: 'SHORTAGE', reference_id: s._id,
                created_at: new Date().toISOString()
            });
            s._txn_id = txnId;
        }
    },

    showAddAttendant() {
        const html = '<div class="sa-form-group"><label>Attendant Name</label><input class="sa-input" id="naName" placeholder="e.g. John Okello"></div>'
            + '<div class="sa-form-group"><label>Phone (Optional)</label><input class="sa-input" id="naPhone" placeholder="07XXXXXXXX"></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveAttendant()">Add Attendant</button></div>';
        this.openModal('Add Pump Attendant', html);
    },

    saveAttendant() {
        const name = document.getElementById('naName').value.trim();
        if (!name) { this.toast('Name required', 'error'); return; }
        const bid = this.currentBranch.id;
        if (this.data.customers.find(c => c.branch_id === bid && c.name.toLowerCase() === name.toLowerCase())) {
            this.toast('This person already exists as a customer/attendant', 'error'); return;
        }
        this.data.customers.push({
            id: this.uid(), branch_id: bid, name: name,
            phone: document.getElementById('naPhone').value.trim(),
            address: '', opening_balance: 0, is_active: true,
            customer_type: 'attendant',
            created_at: new Date().toISOString()
        });
        this.saveData();
        this.closeModal();
        this.toast('Attendant "' + name + '" added as customer');
        this.navigate('shift_entry');
    },

    prevDay() {
        const d = this.dayOfMonth(this.currentDate);
        if (d > 1) { this.currentDate = this.dateStr(d - 1); this.navigate('shift_entry'); }
    },

    nextDay() {
        const d = this.dayOfMonth(this.currentDate);
        if (d < this.DAYS_IN_MONTH) {
            // Check if current day shift is closed before allowing navigation to next day
            if (!this._checkPrevDayClosed(this.currentDate)) return;
            this.currentDate = this.dateStr(d + 1);
            this.navigate('shift_entry');
        }
    },

    // Navigate to a specific date (from date picker) - enforces sequential closure
    goToDate(dateStr, view) {
        // If date is in a different month, switch to that month
        const monthPrefix = dateStr.substring(0, 7);
        if (monthPrefix !== this.MONTH) {
            const parts = monthPrefix.split('-');
            this.setMonth(parseInt(parts[0]), parseInt(parts[1]) - 1);
        }
        const targetDay = this.dayOfMonth(dateStr);
        const currentDay = this.currentDate ? this.dayOfMonth(this.currentDate) : 1;
        // If navigating forward, check that all previous days are closed
        if (targetDay > 1 && this.currentBranch) {
            for (let d = 1; d < targetDay; d++) {
                const ds = this.dateStr(d);
                const key = this.bk(this.currentBranch.id, ds);
                const sd = this.data.shiftDates[key];
                // Only enforce if data exists but shift is not closed
                if (sd && !sd.is_closed) {
                    this.toast('Close the shift for ' + this.formatDate(ds) + ' before moving to ' + this.formatDate(dateStr), 'error');
                    this.currentDate = ds;
                    this.navigate(view || 'shift_entry');
                    return false;
                }
            }
        }
        this.currentDate = dateStr;
        this.navigate(view || 'shift_entry');
        return true;
    },

    // Check if the given date's shift is closed (used before navigating to next day)
    _checkPrevDayClosed(dateStr) {
        if (!this.currentBranch) return true;
        const key = this.bk(this.currentBranch.id, dateStr);
        const sd = this.data.shiftDates[key];
        // If there's data for this day and it's not closed, block
        if (sd && !sd.is_closed) {
            this.toast('Close the shift for ' + this.formatDate(dateStr) + ' before moving to the next day', 'error');
            return false;
        }
        return true;
    },

    saveShiftEntry() {
        if (!this.hasPermission('edit_shift')) { this.toast('Permission denied', 'error'); return; }
        this.saveData();
        this.toast('Shift entry saved for ' + this.formatDate(this.currentDate));
    },

    // Shift Closure
    closeShift() {
        if (!this.hasPermission('close_shift')) { this.toast('Permission denied', 'error'); return; }
        const key = this.bk(this.currentBranch.id, this.currentDate);
        const sd = this.data.shiftDates[key];
        if (!sd) { this.toast('No data to close', 'error'); return; }
        const calc = this.calculateDate(this.currentBranch.id, this.currentDate);
        const html = '<p style="margin-bottom:12px;">You are about to <strong>close the shift</strong> for <strong>' + this.formatDate(this.currentDate) + '</strong> at <strong>' + this.currentBranch.name + '</strong>.</p>'
            + '<div class="sa-info-box" style="margin-bottom:12px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>Once closed, pump readings and collections cannot be edited. Credit sales, expenses, and payments will also be locked.</div>'
            + '<div style="background:var(--sa-bg-card-hover);padding:12px;border-radius:8px;margin-bottom:16px;">'
            + '<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Expected Sales:</span><strong>UGX ' + this.fmtInt(calc.totalExpected) + '</strong></div>'
            + '<div style="display:flex;justify-content:space-between;"><span>Variance:</span><strong class="' + (Math.abs(calc.variance) < 0.01 ? 'text-success' : 'text-danger') + '">UGX ' + this.fmt(calc.variance) + '</strong></div></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-danger" onclick="SA.confirmCloseShift()">Close Shift</button></div>';
        this.openModal('Close Shift — ' + this.formatDate(this.currentDate), html);
    },

    confirmCloseShift() {
        if (!this.hasPermission('close_shift')) { this.toast('Permission denied', 'error'); return; }
        const key = this.bk(this.currentBranch.id, this.currentDate);
        this.data.shiftDates[key].is_closed = true;
        this.data.shiftDates[key].closed_at = new Date().toISOString();
        this.data.shiftDates[key].closed_by = this.getCurrentUser() ? this.getCurrentUser().full_name : 'System';
        this.saveData();
        this.auditLog('SHIFT_CLOSED', 'Closed shift for ' + this.formatDate(this.currentDate) + ' at ' + this.currentBranch.name);
        this.closeModal();
        this.toast('Shift closed for ' + this.formatDate(this.currentDate));
        this.navigate('shift_entry');
    },

    reopenShift() {
        if (!this.hasPermission('reopen_shift')) { this.toast('Only Super Admin can reopen shifts', 'error'); return; }
        const key = this.bk(this.currentBranch.id, this.currentDate);
        if (this.data.shiftDates[key]) {
            this.data.shiftDates[key].is_closed = false;
            this.data.shiftDates[key].closed_at = null;
            this.data.shiftDates[key].closed_by = null;
            this.saveData();
            this.auditLog('SHIFT_REOPENED', 'Reopened shift for ' + this.formatDate(this.currentDate) + ' at ' + this.currentBranch.name);
            this.toast('Shift reopened for ' + this.formatDate(this.currentDate));
            this.navigate('shift_entry');
        }
    },

    isShiftClosed(branchId, dateStr) {
        const key = this.bk(branchId, dateStr);
        const sd = this.data.shiftDates[key];
        return sd && sd.is_closed === true;
    },

    // ============================================================
    // PART 7: CREDIT SALES MODULE
    // ============================================================
    renderCreditSales(el) {
        if (!this.currentBranch) { el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>'; return; }
        if (!this.currentDate) this.currentDate = this.todayStr();
        const bid = this.currentBranch.id;
        const ds = this.currentDate;
        const key = this.bk(bid, ds);
        if (!this.data.creditSales[key]) this.data.creditSales[key] = [];
        const entries = this._activeRecords(this.data.creditSales[key]);
        const sd = this.data.shiftDates[key] || {};
        const pmsSP = this.parseNum(sd.pms_sp) || this.getBranchPumpPrice(bid, 'pms');
        const agoSP = this.parseNum(sd.ago_sp) || this.getBranchPumpPrice(bid, 'ago');

        let html = '<div class="sa-page-header"><h1>Credit Sales &mdash; <span class="sa-date-display">' + this.formatDate(ds) + '</span></h1>'
            + '<div class="sa-date-nav">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.csPrevDay()">&laquo; Prev</button>'
            + '<input type="date" class="sa-date-input" value="' + ds + '" min="' + this.monthStart() + '" max="' + this.monthEnd() + '" onchange="SA.goToDate(this.value,\'credit_sales\')">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.csNextDay()">Next &raquo;</button>'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.printDailyCreditSales()" title="Print Daily Summary">Print</button>'
            + '</div></div>';

        // Customer dropdown helper
        const customers = this.data.customers.filter(c => c.branch_id === bid && c.is_active !== false);

        html += '<div class="sa-section"><div class="sa-section-header orange"><div class="sa-section-title">Credit Sale Entries</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table sa-credit-table">';
        html += '<thead><tr><th style="min-width:180px;">Customer Name</th><th>Product</th><th class="text-right">Litres</th><th class="text-right">Pump Price</th><th class="text-right">Selling Price</th><th class="text-right">Discount</th><th class="text-right">Credit Amt</th><th style="width:40px;"></th></tr></thead><tbody>';

        let totalDiscount = 0, totalCreditAmt = 0;
        entries.forEach((e, i) => {
            const litres = this.parseNum(e.litres);
            const pp = this.parseNum(e.pump_price);
            const sp = this.parseNum(e.selling_price);
            const discount = (litres * pp) - (litres * sp);
            const creditAmt = (pp * litres) - discount;
            totalDiscount += discount;
            totalCreditAmt += creditAmt;

            // Customer options
            let custOpts = '<option value="">-- Select --</option>';
            customers.forEach(c => {
                const bal = this.getCustomerBalance(c.id);
                const sel = (e.customer_id === c.id || e.customer_name === c.name) ? ' selected' : '';
                custOpts += '<option value="' + c.id + '"' + sel + '>' + c.name + ' (Bal: ' + this.fmtInt(bal) + ')</option>';
            });

            html += '<tr>';
            html += '<td><select class="sa-input sa-input-sm" onchange="SA._stageCS(\'' + e._id + '\',\'customer\',this.value)" style="min-width:160px;">' + custOpts + '</select></td>';
            html += '<td><select class="sa-input sa-input-sm" onchange="SA._stageCS(\'' + e._id + '\',\'product\',this.value)"><option value="PMS"' + (e.product === 'PMS' ? ' selected' : '') + '>PMS</option><option value="AGO"' + (e.product === 'AGO' ? ' selected' : '') + '>AGO</option></select></td>';
            html += '<td class="text-right"><input class="sa-input sa-input-sm mono" value="' + (e.litres || '') + '" onchange="SA._stageCS(\'' + e._id + '\',\'litres\',this.value)" style="width:90px;"></td>';
            html += '<td class="text-right"><span class="sa-input sa-input-sm mono" style="display:inline-block;width:90px;background:var(--sa-bg);cursor:default;opacity:0.85;">' + this.fmtInt(e.pump_price || (e.product === 'PMS' ? pmsSP : agoSP)) + '</span></td>';
            html += '<td class="text-right"><input class="sa-input sa-input-sm mono" value="' + (e.selling_price || '') + '" onchange="SA._stageCS(\'' + e._id + '\',\'selling_price\',this.value)" style="width:90px;"></td>';
            html += '<td class="text-right calc-field" id="cs_disc_' + e._id + '">' + this.fmt(discount) + '</td>';
            html += '<td class="text-right calc-field" id="cs_credit_' + e._id + '" style="font-weight:700;">' + this.fmt(creditAmt) + '</td>';
            html += '<td><div class="sa-btn-group" style="flex-wrap:nowrap;">'
                + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.printCreditSaleReceipt(\'' + e._id + '\')" title="Print Receipt" style="font-size:0.7rem;">&#128424;</button>'
                + (e.is_voided ? '<span class="sa-badge sa-badge-danger">Voided</span>' : '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.voidCreditSale(\'' + e._id + '\')" title="Void">Void</button>')
                + '<button class="sa-remove-btn" onclick="SA.removeCreditSale(\'' + e._id + '\')">&times;</button></div></td>';
            html += '</tr>';
        });

        if (entries.length === 0 && this._csBatch.length === 0) {
            html += '<tr><td colspan="8" class="text-center text-muted" style="padding:12px;">Fill in the row below to add credit sales one at a time.</td></tr>';
        }

        // --- Batch (staged but not yet saved) entries ---
        var newCustOpts = '<option value="">-- Select Customer --</option>';
        customers.forEach(c => {
            const bal = this.getCustomerBalance(c.id);
            newCustOpts += '<option value="' + c.id + '">' + c.name + ' (Bal: ' + this.fmtInt(bal) + ')</option>';
        });

        var batchDiscount = 0, batchCredit = 0;
        this._csBatch.forEach((b, bi) => {
            var bLitres = this.parseNum(b.litres);
            var bPP = this.parseNum(b.pump_price);
            var bSP = this.parseNum(b.selling_price);
            var bDisc = (bLitres * bPP) - (bLitres * bSP);
            var bCreditAmt = (bPP * bLitres) - bDisc;
            batchDiscount += bDisc;
            batchCredit += bCreditAmt;
            var custName = '';
            var cust = customers.find(function(c) { return c.id === b.customer_id; });
            if (cust) custName = cust.name;

            html += '<tr style="background:rgba(255,165,0,0.08);border-left:3px solid var(--sa-accent);">';
            html += '<td style="font-weight:600;">' + custName + ' <span class="sa-badge" style="font-size:0.65rem;background:var(--sa-accent);color:#fff;">Pending</span></td>';
            html += '<td>' + b.product + '</td>';
            html += '<td class="text-right mono">' + this.fmt(bLitres, 1) + '</td>';
            html += '<td class="text-right mono">' + this.fmtInt(bPP) + '</td>';
            html += '<td class="text-right mono">' + this.fmtInt(bSP) + '</td>';
            html += '<td class="text-right calc-field">' + this.fmt(bDisc) + '</td>';
            html += '<td class="text-right calc-field" style="font-weight:700;">' + this.fmt(bCreditAmt) + '</td>';
            html += '<td><button class="sa-remove-btn" onclick="SA.removeBatchEntry(' + bi + ')" title="Remove from batch">&times;</button></td>';
            html += '</tr>';
        });

        // --- Single blank input row ---
        html += '<tr class="cs-new-row" style="background:var(--sa-bg);border-top:2px solid var(--sa-accent);">';
        html += '<td><select class="sa-input sa-input-sm" id="csNew0Cust" style="min-width:160px;">' + newCustOpts + '</select></td>';
        html += '<td><select class="sa-input sa-input-sm" id="csNew0Product"><option value="PMS">PMS</option><option value="AGO">AGO</option></select></td>';
        html += '<td class="text-right"><input class="sa-input sa-input-sm mono" id="csNew0Litres" placeholder="0" style="width:90px;"></td>';
        html += '<td class="text-right"><span class="sa-input sa-input-sm mono" id="csNew0PPDisplay" style="display:inline-block;width:90px;background:var(--sa-bg);cursor:default;opacity:0.85;">' + this.fmtInt(pmsSP) + '</span><input type="hidden" id="csNew0PP" value="' + pmsSP + '"></td>';
        html += '<td class="text-right"><input class="sa-input sa-input-sm mono" id="csNew0SP" value="' + pmsSP + '" style="width:90px;"></td>';
        html += '<td class="text-right calc-field" id="csNew0Disc">0</td>';
        html += '<td class="text-right calc-field" id="csNew0Credit" style="font-weight:700;">0</td>';
        html += '<td><button class="sa-btn sa-btn-primary sa-btn-sm" onclick="SA.addToBatch()" title="Add to batch" style="font-weight:700;font-size:1rem;padding:2px 10px;">+</button></td>';
        html += '</tr>';

        // Totals row
        html += '<tr class="total-row"><td colspan="5" class="text-right text-bold">TOTALS</td>';
        html += '<td class="text-right mono text-bold">' + this.fmt(totalDiscount + batchDiscount) + '</td>';
        html += '<td class="text-right mono text-bold">' + this.fmt(totalCreditAmt + batchCredit) + '</td>';
        html += '<td></td></tr>';
        html += '</tbody></table></div></div></div>';

        // Save All button for batch entries
        if (this._csBatch.length > 0) {
            html += '<div style="padding:12px 0;text-align:right;display:flex;align-items:center;justify-content:flex-end;gap:12px;">'
                + '<span style="color:var(--sa-text-muted);font-size:0.85rem;">' + this._csBatch.length + ' pending entr' + (this._csBatch.length === 1 ? 'y' : 'ies') + '</span>'
                + '<button class="sa-btn sa-btn-danger sa-btn-sm" onclick="SA.clearBatch()" style="padding:8px 18px;">Clear All</button>'
                + '<button class="sa-btn sa-btn-primary" onclick="SA.commitBatch()" style="padding:10px 32px;font-size:0.95rem;font-weight:700;gap:6px;">'
                + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>'
                + ' Save All (' + this._csBatch.length + ')</button></div>';
        }

        // Update button for existing entry changes
        if (entries.length > 0) {
            html += '<div style="padding:' + (this._csBatch.length > 0 ? '0' : '12px') + ' 0 12px;text-align:right;">'
                + '<button class="sa-btn sa-btn-primary" onclick="SA._commitCS()" style="padding:10px 32px;font-size:0.95rem;font-weight:700;gap:6px;">'
                + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>'
                + ' Update</button></div>';
        }

        html += '<div class="sa-info-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + 'Credit Amount Total (' + this.fmt(totalCreditAmt) + ') feeds into the Shift Analysis "CREDIT SALES" line. Discount Total (' + this.fmt(totalDiscount) + ') feeds into the Discount module. '
            + 'To add a new customer, go to <a href="#" onclick="SA.navigate(\'customers\');return false;" style="color:var(--sa-primary);font-weight:600;">Customer List</a>.</div>';

        el.innerHTML = html;

        // Wire up live preview for the single new entry row
        var self = this;
        (function() {
            var nL = document.getElementById('csNew0Litres');
            var nPP = document.getElementById('csNew0PP');
            var nSP = document.getElementById('csNew0SP');
            var nProd = document.getElementById('csNew0Product');
            function preview() {
                var l = self.parseNum(nL.value);
                var pp = self.parseNum(nPP.value);
                var sp = self.parseNum(nSP.value);
                var disc = (l * pp) - (l * sp);
                var credit = (pp * l) - disc;
                var dEl = document.getElementById('csNew0Disc');
                var cEl = document.getElementById('csNew0Credit');
                if (dEl) dEl.textContent = self.fmt(disc);
                if (cEl) cEl.textContent = self.fmt(credit);
            }
            if (nL) nL.addEventListener('input', preview);
            if (nPP) nPP.addEventListener('input', preview);
            if (nSP) nSP.addEventListener('input', preview);
            if (nProd) nProd.addEventListener('change', function() {
                var isPMS = this.value === 'PMS';
                nPP.value = isPMS ? pmsSP : agoSP;
                var ppDisp = document.getElementById('csNew0PPDisplay');
                if (ppDisp) ppDisp.textContent = self.fmtInt(isPMS ? pmsSP : agoSP);
                nSP.value = isPMS ? pmsSP : agoSP;
                preview();
            });
        })();
    },

    addCreditSaleInline(rowIdx) {
        if (rowIdx === undefined) rowIdx = 0;
        if (!this.hasPermission('edit_transactions')) { this.toast('Permission denied', 'error'); return; }
        if (!this._guardClosedShift('add a credit sale', () => this.addCreditSaleInline(rowIdx))) return;
        var custSelect = document.getElementById('csNew' + rowIdx + 'Cust');
        var productSelect = document.getElementById('csNew' + rowIdx + 'Product');
        var litresInput = document.getElementById('csNew' + rowIdx + 'Litres');
        var ppInput = document.getElementById('csNew' + rowIdx + 'PP');
        var spInput = document.getElementById('csNew' + rowIdx + 'SP');

        var custId = custSelect ? custSelect.value : '';
        var product = productSelect ? productSelect.value : 'PMS';
        var litres = this.parseNum(litresInput ? litresInput.value : '0');
        var pp = this.parseNum(ppInput ? ppInput.value : '0');
        var sp = this.parseNum(spInput ? spInput.value : '0');

        // Validate
        if (!custId) { this.toast('Please select a customer. Add new customers from the Customer List page.', 'error'); return; }
        if (litres <= 0) { this.toast('Enter litres', 'error'); return; }
        if (!this._validateLitres(String(litres), 'Litres')) return;
        if (!this._validatePrice(String(pp), 'Pump Price')) return;
        if (!this._validatePrice(String(sp), 'Selling Price')) return;
        if (!this._validateSPvsPP(sp, pp)) return;

        var key = this.bk(this.currentBranch.id, this.currentDate);
        if (!this.data.creditSales[key]) this.data.creditSales[key] = [];
        var sd = this.data.shiftDates[key] || {};
        this._initRefCounters();
        var stamp = this._auditStamp();

        var resolvedCustId = custId;

        var entry = {
            _id: this.uid(), ref_number: this._nextRef('CS'),
            customer_id: resolvedCustId, customer_name: '', product: product,
            litres: litres, pump_price: pp, selling_price: sp,
            created_at: stamp.created_at, created_by: stamp.created_by,
            updated_at: stamp.updated_at, updated_by: stamp.updated_by
        };
        this.data.creditSales[key].push(entry);

        // Create customer transaction (debit — customer owes this amount)
        if (resolvedCustId) {
            var disc = (litres * pp) - (litres * sp);
            var creditAmt = (pp * litres) - disc;
            var txnId = this.uid();
            this.data.customerTransactions.push({
                id: txnId, _id: txnId, customer_id: resolvedCustId,
                branch_id: this.currentBranch.id,
                transaction_date: this.currentDate,
                transaction_type: 'DEBIT',
                debit_amount: creditAmt, credit_amount: 0,
                description: 'Credit Sale: ' + litres + 'L ' + product + ' @' + this.fmtInt(pp),
                reference_type: 'CREDIT_SALE',
                reference_id: entry._id,
                created_at: stamp.created_at, created_by: stamp.created_by
            });
        }

        this.saveData();
        this.toast('Credit sale added — ' + this.data.customers.find(function(c) { return c.id === resolvedCustId; }).name + ': ' + litres + 'L ' + product, 'success');
        this.navigate('credit_sales');
    },

    addToBatch() {
        if (!this.hasPermission('edit_transactions')) { this.toast('Permission denied', 'error'); return; }
        if (!this._guardClosedShift('add a credit sale', () => this.addToBatch())) return;

        var custSelect = document.getElementById('csNew0Cust');
        var productSelect = document.getElementById('csNew0Product');
        var litresInput = document.getElementById('csNew0Litres');
        var ppInput = document.getElementById('csNew0PP');
        var spInput = document.getElementById('csNew0SP');

        var custId = custSelect ? custSelect.value : '';
        var product = productSelect ? productSelect.value : 'PMS';
        var litres = this.parseNum(litresInput ? litresInput.value : '0');
        var pp = this.parseNum(ppInput ? ppInput.value : '0');
        var sp = this.parseNum(spInput ? spInput.value : '0');

        if (!custId) { this.toast('Please select a customer', 'error'); return; }
        if (litres <= 0) { this.toast('Enter litres', 'error'); return; }
        if (!this._validateLitres(String(litres), 'Litres')) return;
        if (!this._validatePrice(String(pp), 'Pump Price')) return;
        if (!this._validatePrice(String(sp), 'Selling Price')) return;
        if (!this._validateSPvsPP(sp, pp)) return;

        var custName = '';
        var cust = this.data.customers.find(function(c) { return c.id == custId; });
        if (cust) custName = cust.name;

        this._csBatch.push({
            customer_id: custId, customer_name: custName,
            product: product, litres: litres, pump_price: pp, selling_price: sp
        });

        this.toast('Added ' + custName + ': ' + litres + 'L ' + product + ' — ' + this._csBatch.length + ' pending', 'success');
        this.navigate('credit_sales');
    },

    removeBatchEntry(idx) {
        if (idx >= 0 && idx < this._csBatch.length) {
            var removed = this._csBatch.splice(idx, 1)[0];
            var cust = this.data.customers.find(function(c) { return c.id === removed.customer_id; });
            this.toast('Removed ' + (cust ? cust.name : '') + ' from batch');
            this.navigate('credit_sales');
        }
    },

    clearBatch() {
        if (!confirm('Clear all ' + this._csBatch.length + ' pending entries?')) return;
        this._csBatch = [];
        this.toast('Batch cleared');
        this.navigate('credit_sales');
    },

    commitBatch() {
        if (this._csBatch.length === 0) { this.toast('No pending entries to save', 'warning'); return; }
        if (!this.hasPermission('edit_transactions')) { this.toast('Permission denied', 'error'); return; }
        if (!this._guardClosedShift('save credit sales', () => this.commitBatch())) return;

        var bid = this.currentBranch.id;
        var key = this.bk(bid, this.currentDate);
        if (!this.data.creditSales[key]) this.data.creditSales[key] = [];
        this._initRefCounters();
        var count = 0;
        var self = this;

        this._csBatch.forEach(function(b) {
            var stamp = self._auditStamp();
            var entry = {
                _id: self.uid(), ref_number: self._nextRef('CS'),
                customer_id: b.customer_id, customer_name: b.customer_name,
                product: b.product, litres: b.litres,
                pump_price: b.pump_price, selling_price: b.selling_price,
                created_at: stamp.created_at, created_by: stamp.created_by,
                updated_at: stamp.updated_at, updated_by: stamp.updated_by
            };
            self.data.creditSales[key].push(entry);

            if (b.customer_id) {
                var litres = self.parseNum(b.litres);
                var pp = self.parseNum(b.pump_price);
                var sp = self.parseNum(b.selling_price);
                var disc = (litres * pp) - (litres * sp);
                var creditAmt = (pp * litres) - disc;
                var txnId = self.uid();
                self.data.customerTransactions.push({
                    id: txnId, _id: txnId, customer_id: b.customer_id,
                    branch_id: bid,
                    transaction_date: self.currentDate,
                    description: 'Credit Sale: ' + litres + 'L ' + b.product + ' @' + self.fmtInt(pp),
                    transaction_type: 'DEBIT',
                    debit_amount: creditAmt, credit_amount: 0,
                    reference_type: 'CREDIT_SALE',
                    reference_id: entry._id,
                    created_at: stamp.created_at, created_by: stamp.created_by
                });
            }
            count++;
        });

        this._csBatch = [];
        this.saveData();
        this.toast(count + ' credit sale' + (count !== 1 ? 's' : '') + ' saved successfully', 'success');
        this.navigate('credit_sales');
    },

    addCreditSale() {
        if (!this.hasPermission('edit_transactions')) { this.toast('Permission denied', 'error'); return; }
        if (!this._guardClosedShift('add a credit sale', () => this.addCreditSale())) return;
        const key = this.bk(this.currentBranch.id, this.currentDate);
        if (!this.data.creditSales[key]) this.data.creditSales[key] = [];
        // Check: don't allow adding if last entry is still empty
        const existing = this._activeRecords(this.data.creditSales[key]);
        if (existing.length > 0) {
            const last = existing[existing.length - 1];
            if (!last.customer_id && (!last.customer_name || !last.customer_name.trim()) && this.parseNum(last.litres) === 0) {
                this.toast('Fill in the empty credit sale row first (select customer & enter litres)', 'warning');
                // Scroll to and highlight the last empty row
                var lastRow = document.querySelector('.sa-table tbody tr:last-child');
                if (lastRow) {
                    lastRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    lastRow.style.outline = '2px solid var(--sa-warning)';
                    lastRow.style.outlineOffset = '-1px';
                    setTimeout(function() { lastRow.style.outline = ''; lastRow.style.outlineOffset = ''; }, 3000);
                }
                return;
            }
        }
        const sd = this.data.shiftDates[key] || {};
        this._initRefCounters();
        var stamp = this._auditStamp();
        this.data.creditSales[key].push({
            _id: this.uid(), ref_number: this._nextRef('CS'),
            customer_id: null, customer_name: '', product: 'PMS',
            litres: 0, pump_price: this.getBranchPumpPrice(bid, 'pms'), selling_price: this.getBranchPumpPrice(bid, 'pms'),
            created_at: stamp.created_at, created_by: stamp.created_by,
            updated_at: stamp.updated_at, updated_by: stamp.updated_by
        });
        this.saveData();
        this.navigate('credit_sales');
    },

    removeCreditSale(id) {
        if (!this._guardClosedShift('delete a credit sale entry', () => this._doRemoveCreditSale(id))) return;
        if (!confirm('Are you sure you want to delete this credit sale?')) return;
        this._doRemoveCreditSale(id);
    },
    _doRemoveCreditSale(id) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        const entry = this._findById(this.data.creditSales[key], id);
        if (!entry) return;
        if (entry.customer_id) {
            this.data.customerTransactions = this.data.customerTransactions.filter(t =>
                !(t.reference_type === 'CREDIT_SALE' && t.reference_id === entry._id && t.customer_id === entry.customer_id)
            );
        }
        this._softDelete(entry);
        this.saveData();
        this.navigate('credit_sales');
        this.toast('Credit sale entry removed');
    },

    _csPending: {},
    _csBatch: [],

    _stageCS(id, field, value) {
        if (!this._csPending[id]) this._csPending[id] = {};
        this._csPending[id][field] = value;
        // When product changes, auto-update pump_price from system setting
        if (field === 'product' && this.currentBranch) {
            var pp = this.getBranchPumpPrice(this.currentBranch.id, value === 'PMS' ? 'pms' : 'ago');
            this._csPending[id]['pump_price'] = pp;
        }
        // Live calculation preview
        if (['litres', 'pump_price', 'selling_price', 'product'].indexOf(field) >= 0) {
            this._previewCS(id);
        }
    },

    // Live preview of calculated fields before saving
    _previewCS(id) {
        var key = this.bk(this.currentBranch.id, this.currentDate);
        var entry = this._findById(this.data.creditSales[key], id);
        if (!entry) return;
        var staged = this._csPending[id] || {};
        var litres = staged.litres !== undefined ? this.parseNum(staged.litres) : this.parseNum(entry.litres);
        var pp = staged.pump_price !== undefined ? this.parseNum(staged.pump_price) : this.parseNum(entry.pump_price);
        var sp = staged.selling_price !== undefined ? this.parseNum(staged.selling_price) : this.parseNum(entry.selling_price);
        var discount = (litres * pp) - (litres * sp);
        var creditAmt = (pp * litres) - discount;
        var discEl = document.getElementById('cs_disc_' + id);
        var creditEl = document.getElementById('cs_credit_' + id);
        if (discEl) discEl.textContent = this.fmt(discount);
        if (creditEl) creditEl.textContent = this.fmt(creditAmt);
    },

    _commitCS() {
        const pending = this._csPending;
        const keys = Object.keys(pending);
        if (keys.length === 0) { this.toast('No changes to update', 'warning'); return; }

        // ── Validate all staged changes before saving ──
        const bid = this.currentBranch.id;
        const key = this.bk(bid, this.currentDate);
        const entries = this._activeRecords(this.data.creditSales[key] || []);
        for (var i = 0; i < keys.length; i++) {
            var id = keys[i];
            var fields = pending[id];
            var entry = this._findById(entries, id);
            if (!entry) continue;
            var litres = fields.litres !== undefined ? this.parseNum(fields.litres) : this.parseNum(entry.litres);
            var pp = fields.pump_price !== undefined ? this.parseNum(fields.pump_price) : this.parseNum(entry.pump_price);
            var sp = fields.selling_price !== undefined ? this.parseNum(fields.selling_price) : this.parseNum(entry.selling_price);
            var custId = fields.customer !== undefined ? fields.customer : entry.customer_id;
            var custName = fields.customer_name !== undefined ? fields.customer_name : entry.customer_name;

            // 1. Negative values
            if (fields.litres !== undefined && !this._validateLitres(fields.litres, 'Litres')) return;
            if (fields.pump_price !== undefined && !this._validatePrice(fields.pump_price, 'Pump Price')) return;
            if (fields.selling_price !== undefined && !this._validatePrice(fields.selling_price, 'Selling Price')) return;

            // 4. SP > PP check
            if (!this._validateSPvsPP(sp, pp)) return;

            // 2. Required customer (must have either dropdown or typed name)
            if (!custId && !(custName && custName.trim())) {
                this.toast('Please select or type a customer name', 'error');
                return;
            }

            // 6. Duplicate detection — same customer, same product, same litres on same date
            if (custId && litres > 0) {
                for (var j = 0; j < entries.length; j++) {
                    var other = entries[j];
                    if (other._id === id) continue;
                    var otherCustId = (pending[other._id] && pending[other._id].customer !== undefined) ? pending[other._id].customer : other.customer_id;
                    var otherProduct = (pending[other._id] && pending[other._id].product !== undefined) ? pending[other._id].product : other.product;
                    var otherLitres = (pending[other._id] && pending[other._id].litres !== undefined) ? this.parseNum(pending[other._id].litres) : this.parseNum(other.litres);
                    var product = fields.product !== undefined ? fields.product : entry.product;
                    if (otherCustId === custId && otherProduct === product && otherLitres === litres && litres > 0) {
                        this.toast('Duplicate — same customer, product & litres. Please verify.', 'warning');
                    }
                }
            }
        }

        this._csPending = {};
        this._csCommitting = true;
        keys.forEach(id => {
            const fields = pending[id];
            Object.keys(fields).forEach(field => {
                this.updateCS(id, field, fields[field]);
            });
        });
        this._csCommitting = false;
        this.navigate('credit_sales');
        this.toast('Credit sales updated', 'success');
    },

    updateCS(id, field, value) {
        const bid = this.currentBranch.id;
        const key = this.bk(bid, this.currentDate);
        const entry = this._findById(this.data.creditSales[key], id);
        if (!entry) return;

        // Validation on individual field update
        if (field === 'litres' && !this._validateLitres(value, 'Litres')) return;
        if (field === 'pump_price' && !this._validatePrice(value, 'Pump Price')) return;
        if (field === 'selling_price' && !this._validatePrice(value, 'Selling Price')) return;

        if (field === 'customer') {
            const custId = value;
            const cust = this.data.customers.find(c => c.id === custId);
            if (cust) {
                // Foreign key validation — ensure customer exists and belongs to branch
                if (cust.branch_id !== bid) {
                    this.toast('Customer does not belong to this branch', 'error');
                    return;
                }
                // Credit limit check
                const custLimit = this.parseNum(cust.credit_limit);
                if (custLimit > 0) {
                    const custBal = this.getCustomerBalance(cust.id);
                    if (custBal >= custLimit) {
                        this.toast('WARNING: ' + cust.name + ' has exceeded their credit limit of UGX ' + this.fmtInt(custLimit) + ' (Balance: UGX ' + this.fmtInt(custBal) + ')', 'error');
                    } else if (custBal >= custLimit * 0.8) {
                        this.toast(cust.name + ' is at ' + Math.round((custBal / custLimit) * 100) + '% of credit limit', 'warning');
                    }
                }
                this._trackChange(entry, 'customer_id', cust.id);
                this._trackChange(entry, 'customer_name', cust.name);
                entry.customer_id = cust.id;
                entry.customer_name = cust.name;
            }
        } else if (field === 'customer_name') {
            this._trackChange(entry, 'customer_name', value);
            entry.customer_name = value;
            entry.customer_id = null;
            // Auto-create customer if new name
            if (value.trim()) {
                let existing = this.data.customers.find(c => c.branch_id === bid && c.name.toLowerCase() === value.trim().toLowerCase());
                if (!existing) {
                    existing = { id: this.uid(), branch_id: bid, name: value.trim(), phone: '', address: '', opening_balance: 0, is_active: true, created_at: new Date().toISOString() };
                    this.data.customers.push(existing);
                }
                entry.customer_id = existing.id;
                entry.customer_name = existing.name;
            }
        } else if (field === 'product') {
            this._trackChange(entry, 'product', value);
            entry.product = value;
            entry.pump_price = this.getBranchPumpPrice(this.currentBranch.id, value === 'PMS' ? 'pms' : 'ago');
        } else if (field === 'litres' || field === 'pump_price' || field === 'selling_price') {
            var numVal = this.parseNum(value);
            this._trackChange(entry, field, numVal);
            entry[field] = numVal;
        }

        // Create/update customer transaction (debit) with FK validation
        if (entry.customer_id) {
            // Validate customer still exists
            const custExists = this.data.customers.find(c => c.id === entry.customer_id);
            if (!custExists) {
                this.toast('Warning: Referenced customer no longer exists', 'warning');
            }
            const litres = this.parseNum(entry.litres);
            const pp = this.parseNum(entry.pump_price);
            const sp = this.parseNum(entry.selling_price);
            const disc = (litres * pp) - (litres * sp);
            const creditAmt = (pp * litres) - disc;
            if (!entry._id) entry._id = this.uid();

            // Remove old transaction
            this.data.customerTransactions = this.data.customerTransactions.filter(t =>
                !(t.reference_type === 'CREDIT_SALE' && t.reference_id === entry._id)
            );
            // Add new one with branch_id
            if (litres > 0) {
                var txnId = this.uid();
                this.data.customerTransactions.push({
                    id: txnId, _id: txnId, customer_id: entry.customer_id,
                    branch_id: bid,
                    transaction_date: this.currentDate,
                    description: 'Credit Sale: ' + litres + 'L ' + entry.product + ' @' + this.fmtInt(pp),
                    transaction_type: 'DEBIT', debit_amount: creditAmt, credit_amount: 0,
                    reference_id: entry._id, reference_type: 'CREDIT_SALE',
                    created_at: new Date().toISOString()
                });
            }
        }

        this._touchUpdated(entry);
        this.saveData();
        // Only navigate if called directly (not from _commitCS batch)
        if (!this._csCommitting) this.navigate('credit_sales');
    },

    csPrevDay() {
        if (this._csBatch.length > 0 && !confirm('You have ' + this._csBatch.length + ' unsaved entries. Discard and change date?')) return;
        this._csBatch = [];
        const d = this.dayOfMonth(this.currentDate);
        if (d > 1) { this.currentDate = this.dateStr(d - 1); this.navigate('credit_sales'); }
    },

    csNextDay() {
        if (this._csBatch.length > 0 && !confirm('You have ' + this._csBatch.length + ' unsaved entries. Discard and change date?')) return;
        this._csBatch = [];
        const d = this.dayOfMonth(this.currentDate);
        if (d < this.DAYS_IN_MONTH) {
            if (!this._checkPrevDayClosed(this.currentDate)) return;
            this.currentDate = this.dateStr(d + 1); this.navigate('credit_sales');
        }
    },

    getCustomerBalance(customerId) {
        const cust = this.data.customers.find(c => c.id === customerId);
        const opening = cust ? this.parseNum(cust.opening_balance) : 0;
        let sum = 0;
        this.data.customerTransactions.filter(t => t.customer_id === customerId).forEach(t => {
            sum += this.parseNum(t.debit_amount) - this.parseNum(t.credit_amount);
        });
        return opening + sum;
    },

    // ============================================================
    // PART 8: EXPENSES & PAYMENTS MODULE
    // ============================================================
    renderExpenses(el) {
        if (!this.currentBranch) { el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>'; return; }
        if (!this.currentDate) this.currentDate = this.todayStr();
        const bid = this.currentBranch.id;
        const ds = this.currentDate;
        const key = this.bk(bid, ds);
        if (!this.data.expenses[key]) this.data.expenses[key] = [];
        if (!this.data.payments[key]) this.data.payments[key] = [];
        const expenses = this._activeRecords(this.data.expenses[key]);
        const payments = this._activeRecords(this.data.payments[key]);

        let html = '<div class="sa-page-header"><h1>Expenses & Payments &mdash; <span class="sa-date-display">' + this.formatDate(ds) + '</span></h1>'
            + '<div class="sa-date-nav">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.expPrevDay()">&laquo; Prev</button>'
            + '<input type="date" class="sa-date-input" value="' + ds + '" min="' + this.monthStart() + '" max="' + this.monthEnd() + '" onchange="SA.goToDate(this.value,\'expenses\')">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.expNextDay()">Next &raquo;</button>'
            + '</div></div>';

        // EXPENSES SECTION
        html += '<div class="sa-section"><div class="sa-section-header red"><div class="sa-section-title">Expenses</div></div><div class="sa-section-body">';
        expenses.forEach((e, i) => {
            let catOpts = '<option value="">-- Select Type --</option>';
            this.getExpenseAccounts().forEach(a => {
                catOpts += '<option value="' + a.code + '"' + (e.category === a.code ? ' selected' : '') + '>' + a.name + '</option>';
            });
            html += '<div class="sa-dynamic-row" style="flex-wrap:wrap;">'
                + '<select class="sa-input sa-input-sm" onchange="SA._stageExpense(\'' + e._id + '\',\'category\',this.value)" style="flex:1.2;min-width:140px;">' + catOpts + '</select>'
                + '<input class="sa-input sa-input-sm" placeholder="Description" value="' + (e.description || '') + '" onchange="SA._stageExpense(\'' + e._id + '\',\'description\',this.value)" style="flex:2;min-width:150px;">'
                + '<input class="sa-input sa-input-sm mono" placeholder="Amount" value="' + (e.amount || '') + '" onchange="SA._stageExpense(\'' + e._id + '\',\'amount\',this.value)" style="text-align:right;flex:0.8;min-width:100px;">'
                + '<button class="sa-remove-btn" onclick="SA.removeExpense(\'' + e._id + '\')">&times;</button></div>';
        });
        html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.addExpense()">+ Add Expense</button>'
            + (expenses.length > 0 ? '<button class="sa-btn sa-btn-primary sa-btn-sm" onclick="SA._commitExpenses()" style="padding:8px 20px;font-weight:700;gap:4px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Update</button>' : '')
            + '</div>';
        const totalExp = expenses.reduce((s, e) => s + this.parseNum(e.amount), 0);
        html += '<div class="sa-shortage-total"><span class="total-label">TOTAL EXPENSES</span><span class="total-value" style="color:var(--sa-danger);">UGX ' + this.fmt(totalExp) + '</span></div>';
        html += '</div></div>';

        // PAYMENTS SECTION
        html += '<div class="sa-section"><div class="sa-section-header green"><div class="sa-section-title">Payments</div></div><div class="sa-section-body">';
        const customers = this.data.customers.filter(c => c.branch_id === bid && c.is_active !== false);
        payments.forEach((p, i) => {
            let custOpts = '<option value="">-- No Customer --</option>';
            customers.forEach(c => {
                const sel = p.customer_id === c.id ? ' selected' : '';
                custOpts += '<option value="' + c.id + '"' + sel + '>' + c.name + '</option>';
            });
            html += '<div class="sa-dynamic-row" style="flex-wrap:wrap;">'
                + '<input class="sa-input sa-input-sm" placeholder="Description" value="' + (p.description || '') + '" onchange="SA._stagePayment(\'' + p._id + '\',\'description\',this.value)" style="flex:2;min-width:150px;">'
                + '<input class="sa-input sa-input-sm mono" placeholder="Amount" value="' + (p.amount || '') + '" onchange="SA._stagePayment(\'' + p._id + '\',\'amount\',this.value)" style="text-align:right;flex:1;min-width:100px;">'
                + '<select class="sa-input sa-input-sm" onchange="SA._stagePayment(\'' + p._id + '\',\'customer_id\',this.value)" style="flex:1;min-width:140px;">' + custOpts + '</select>'
                + '<select class="sa-input sa-input-sm" onchange="SA._stagePayment(\'' + p._id + '\',\'payment_method\',this.value)" style="flex:1;min-width:110px;">';
            this.PAYMENT_METHODS.forEach(m => {
                html += '<option value="' + m + '"' + (p.payment_method === m ? ' selected' : '') + '>' + m + '</option>';
            });
            html += '</select>'
                + (p.is_voided ? '<span class="sa-badge sa-badge-danger" style="flex-shrink:0;">Voided</span>' : '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.voidPayment(\'' + p._id + '\')" style="flex-shrink:0;">Void</button>')
                + '<button class="sa-remove-btn" onclick="SA.removePayment(\'' + p._id + '\')">&times;</button></div>';
        });
        html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.addPayment()">+ Add Payment</button>'
            + (payments.length > 0 ? '<button class="sa-btn sa-btn-primary sa-btn-sm" onclick="SA._commitPayments()" style="padding:8px 20px;font-weight:700;gap:4px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Update</button>' : '')
            + '</div>';
        const totalPay = payments.reduce((s, p) => s + this.parseNum(p.amount), 0);
        html += '<div class="sa-shortage-total"><span class="total-label">TOTAL PAYMENTS</span><span class="total-value" style="color:var(--sa-success);">UGX ' + this.fmt(totalPay) + '</span></div>';
        html += '</div></div>';

        html += '<div class="sa-info-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + 'Total Expenses (' + this.fmt(totalExp) + ') feeds into the Shift Analysis "EXPENSES" line. Payments linked to customers update their statements automatically.</div>';

        el.innerHTML = html;
    },

    addExpense() {
        if (!this.hasPermission('edit_transactions')) { this.toast('Permission denied', 'error'); return; }
        if (!this._guardClosedShift('add an expense', () => this.addExpense())) return;
        const key = this.bk(this.currentBranch.id, this.currentDate);
        if (!this.data.expenses[key]) this.data.expenses[key] = [];
        const existing = this.data.expenses[key];
        if (existing.length > 0) {
            const last = existing[existing.length - 1];
            if (!last.category && this.parseNum(last.amount) === 0) {
                this.toast('Please fill in the last expense before adding a new one', 'warning');
                return;
            }
        }
        this._initRefCounters();
        var stamp = this._auditStamp();
        this.data.expenses[key].push({
            _id: this.uid(), ref_number: this._nextRef('EXP'),
            category: '', description: '', amount: 0,
            created_at: stamp.created_at, created_by: stamp.created_by,
            updated_at: stamp.updated_at, updated_by: stamp.updated_by
        });
        this.saveData();
        this.navigate('expenses');
    },

    removeExpense(id) {
        if (!this._guardClosedShift('delete an expense entry', () => this._doRemoveExpense(id))) return;
        if (!confirm('Are you sure you want to delete this expense?')) return;
        this._doRemoveExpense(id);
    },
    _doRemoveExpense(id) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        var entry = this._findById(this.data.expenses[key], id);
        if (entry) {
            this._softDelete(entry);
            this.saveData();
            this.navigate('expenses');
        }
    },

    _expPending: {},

    _stageExpense(id, field, value) {
        if (!this._expPending[id]) this._expPending[id] = {};
        this._expPending[id][field] = value;
    },

    _commitExpenses() {
        const pending = this._expPending;
        const keys = Object.keys(pending);
        if (keys.length === 0) { this.toast('No changes to update', 'warning'); return; }

        // Validate
        const key = this.bk(this.currentBranch.id, this.currentDate);
        const entries = this._activeRecords(this.data.expenses[key] || []);
        for (var i = 0; i < keys.length; i++) {
            var id = keys[i];
            var fields = pending[id];
            var entry = this._findById(entries, id);
            if (!entry) continue;
            var category = fields.category !== undefined ? fields.category : entry.category;

            if (fields.amount !== undefined && !this._validateAmount(fields.amount, 'Expense amount')) return;
            if (!category || !category.trim()) {
                this.toast('Please select an expense category', 'error');
                return;
            }
        }

        this._expPending = {};
        keys.forEach(id => {
            const fields = pending[id];
            Object.keys(fields).forEach(field => {
                this.updateExpense(id, field, fields[field]);
            });
        });
        this.navigate('expenses');
        this.toast('Expenses updated', 'success');
    },

    updateExpense(id, field, value) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        var entry = this._findById(this.data.expenses[key], id);
        if (entry) {
            var newVal = field === 'amount' ? this.parseNum(value) : value;
            this._trackChange(entry, field, newVal);
            entry[field] = newVal;
            if (!entry._id) entry._id = this.uid();
            this._touchUpdated(entry);
            this.saveData();
        }
    },

    addPayment() {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        if (!this.data.payments[key]) this.data.payments[key] = [];
        const existing = this.data.payments[key];
        if (existing.length > 0) {
            const last = existing[existing.length - 1];
            if ((!last.description || !last.description.trim()) && this.parseNum(last.amount) === 0) {
                this.toast('Please fill in the last payment before adding a new one', 'warning');
                return;
            }
        }
        this._initRefCounters();
        var stamp = this._auditStamp();
        this.data.payments[key].push({
            _id: this.uid(), ref_number: this._nextRef('PAY'),
            description: '', amount: 0, customer_id: null, payment_method: 'Cash',
            created_at: stamp.created_at, created_by: stamp.created_by,
            updated_at: stamp.updated_at, updated_by: stamp.updated_by
        });
        this.saveData();
        this.navigate('expenses');
    },

    removePayment(id) {
        if (!this._guardClosedShift('delete a payment entry', () => this._doRemovePayment(id))) return;
        if (!confirm('Are you sure you want to delete this payment?')) return;
        this._doRemovePayment(id);
    },
    _doRemovePayment(id) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        var p = this._findById(this.data.payments[key], id);
        if (!p) return;
        if (p._id) {
            this.data.customerTransactions = this.data.customerTransactions.filter(t =>
                !(t.reference_type === 'PAYMENT' && t.reference_id === p._id)
            );
        }
        this._softDelete(p);
        this.saveData();
        this.navigate('expenses');
    },

    _payPending: {},

    _stagePayment(id, field, value) {
        if (!this._payPending[id]) this._payPending[id] = {};
        this._payPending[id][field] = value;
    },

    _commitPayments() {
        const pending = this._payPending;
        const keys = Object.keys(pending);
        if (keys.length === 0) { this.toast('No changes to update', 'warning'); return; }

        // Validate
        const key = this.bk(this.currentBranch.id, this.currentDate);
        const entries = this._activeRecords(this.data.payments[key] || []);
        for (var i = 0; i < keys.length; i++) {
            var id = keys[i];
            var fields = pending[id];
            var entry = this._findById(entries, id);
            if (!entry) continue;
            if (fields.amount !== undefined && !this._validateAmount(fields.amount, 'Payment amount')) return;
            var desc = fields.description !== undefined ? fields.description : entry.description;
            if (!desc || !desc.trim()) {
                this.toast('Payment description is required', 'error');
                return;
            }
        }

        this._payPending = {};
        this._payCommitting = true;
        keys.forEach(id => {
            const fields = pending[id];
            Object.keys(fields).forEach(field => {
                this.updatePayment(id, field, fields[field]);
            });
        });
        this._payCommitting = false;
        this.navigate('expenses');
        this.toast('Payments updated', 'success');
    },

    updatePayment(id, field, value) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        const p = this._findById(this.data.payments[key], id);
        if (!p) return;

        if (field === 'customer_id') {
            this._trackChange(p, 'customer_id', value ? parseInt(value) : null);
            p.customer_id = value ? parseInt(value) : null;
        } else if (field === 'amount') {
            var newAmt = this.parseNum(value);
            this._trackChange(p, 'amount', newAmt);
            p.amount = newAmt;
        } else {
            this._trackChange(p, field, value);
            p[field] = value;
        }

        // Create/update customer transaction (credit) with FK validation
        if (p.customer_id && this.parseNum(p.amount) > 0) {
            var custExists = this.data.customers.find(c => c.id === p.customer_id);
            if (!custExists) {
                this.toast('Warning: Referenced customer no longer exists', 'warning');
            }
            if (!p._id) p._id = this.uid();
            this.data.customerTransactions = this.data.customerTransactions.filter(t =>
                !(t.reference_type === 'PAYMENT' && t.reference_id === p._id)
            );
            var txnId = this.uid();
            this.data.customerTransactions.push({
                id: txnId, _id: txnId, customer_id: p.customer_id,
                branch_id: this.currentBranch ? this.currentBranch.id : null,
                transaction_date: this.currentDate,
                description: 'Payment received (' + (p.payment_method || 'Cash') + ')' + (p.description ? ' - ' + p.description : ''),
                transaction_type: 'CREDIT', debit_amount: 0, credit_amount: this.parseNum(p.amount),
                reference_id: p._id, reference_type: 'PAYMENT',
                payment_method: p.payment_method || 'Cash',
                created_at: new Date().toISOString()
            });
        }

        if (!p._id) p._id = this.uid();
        this._touchUpdated(p);
        this.saveData();
        if (!this._payCommitting) this.navigate('expenses');
    },

    expPrevDay() {
        const d = this.dayOfMonth(this.currentDate);
        if (d > 1) { this.currentDate = this.dateStr(d - 1); this.navigate('expenses'); }
    },

    expNextDay() {
        const d = this.dayOfMonth(this.currentDate);
        if (d < this.DAYS_IN_MONTH) {
            if (!this._checkPrevDayClosed(this.currentDate)) return;
            this.currentDate = this.dateStr(d + 1); this.navigate('expenses');
        }
    },

    // ============================================================
    // PART 9: DISCOUNTS MODULE
    // ============================================================
    renderDiscounts(el) {
        if (!this.currentBranch) { el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>'; return; }
        if (!this.currentDate) this.currentDate = this.todayStr();
        const bid = this.currentBranch.id;
        const ds = this.currentDate;
        const key = this.bk(bid, ds);
        if (!this.data.discounts[key]) this.data.discounts[key] = [];
        const discEntries = this._activeRecords(this.data.discounts[key]);

        // Credit sales discount (auto-pulled)
        const cs = this.data.creditSales[key] || [];
        let csDiscount = 0;
        cs.forEach(c => {
            const litres = this.parseNum(c.litres);
            const pp = this.parseNum(c.pump_price);
            const sp = this.parseNum(c.selling_price);
            csDiscount += (litres * pp) - (litres * sp);
        });

        let html = '<div class="sa-page-header"><h1>Discounts &mdash; <span class="sa-date-display">' + this.formatDate(ds) + '</span></h1>'
            + '<div class="sa-date-nav">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.discPrevDay()">&laquo; Prev</button>'
            + '<input type="date" class="sa-date-input" value="' + ds + '" min="' + this.monthStart() + '" max="' + this.monthEnd() + '" onchange="SA.goToDate(this.value,\'discounts\')">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.discNextDay()">Next &raquo;</button>'
            + '</div></div>';

        // Credit sales discount (auto)
        html += '<div class="sa-section"><div class="sa-section-header orange"><div class="sa-section-title">Credit Sales Discount <span class="auto-tag" style="margin-left:8px;">Auto from Credit Sales</span></div></div><div class="sa-section-body">';
        html += '<div class="sa-shortage-total" style="margin:0;"><span class="total-label">TOTAL CREDIT SALES DISCOUNT</span><span class="total-value" style="color:var(--sa-accent);">UGX ' + this.fmt(csDiscount) + '</span></div>';
        html += '</div></div>';

        // Standalone discounts
        html += '<div class="sa-section"><div class="sa-section-header yellow"><div class="sa-section-title">Standalone Discounts</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Product</th><th class="text-right">Litres</th><th class="text-right">Selling Price</th><th class="text-right">Pump Price</th><th class="text-right">Discount</th><th style="width:40px;"></th></tr></thead><tbody>';

        let standaloneTotal = 0;
        discEntries.forEach((d, i) => {
            const litres = this.parseNum(d.litres);
            const pp = this.parseNum(d.pump_price);
            const sp = this.parseNum(d.selling_price);
            const disc = (litres * pp) - (litres * sp);
            standaloneTotal += disc;

            html += '<tr>';
            html += '<td><select class="sa-input sa-input-sm" onchange="SA._stageDiscount(\'' + d._id + '\',\'product\',this.value)"><option value="PMS"' + (d.product === 'PMS' ? ' selected' : '') + '>PMS</option><option value="AGO"' + (d.product === 'AGO' ? ' selected' : '') + '>AGO</option></select></td>';
            html += '<td class="text-right"><input class="sa-input sa-input-sm mono" value="' + (d.litres || '') + '" onchange="SA._stageDiscount(\'' + d._id + '\',\'litres\',this.value)" style="width:90px;"></td>';
            html += '<td class="text-right"><input class="sa-input sa-input-sm mono" value="' + (d.selling_price || '') + '" onchange="SA._stageDiscount(\'' + d._id + '\',\'selling_price\',this.value)" style="width:90px;"></td>';
            html += '<td class="text-right"><span class="sa-input sa-input-sm mono" style="display:inline-block;width:90px;background:var(--sa-bg);cursor:default;opacity:0.85;">' + this.fmtInt(d.pump_price || this.getBranchPumpPrice(bid, d.product === 'PMS' ? 'pms' : 'ago')) + '</span></td>';
            html += '<td class="text-right calc-field" id="disc_val_' + d._id + '">' + this.fmt(disc) + '</td>';
            html += '<td><button class="sa-remove-btn" onclick="SA.removeDiscount(\'' + d._id + '\')">&times;</button></td>';
            html += '</tr>';
        });

        if (discEntries.length === 0) {
            html += '<tr><td colspan="6" class="text-center text-muted" style="padding:24px;">No standalone discounts. Click "+ Add" to create one.</td></tr>';
        }

        html += '<tr class="total-row"><td colspan="4" class="text-right text-bold">STANDALONE TOTAL</td>';
        html += '<td class="text-right mono text-bold">' + this.fmt(standaloneTotal) + '</td><td></td></tr>';
        html += '</tbody></table></div></div></div>';

        html += '<div style="padding:16px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.addDiscount()">+ Add Standalone Discount</button>'
            + (discEntries.length > 0 ? '<button class="sa-btn sa-btn-primary sa-btn-sm" onclick="SA._commitDiscounts()" style="padding:8px 20px;font-weight:700;gap:4px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Update</button>' : '')
            + '</div>';

        // Grand total
        const grandTotal = csDiscount + standaloneTotal;
        html += '<div class="sa-section"><div class="sa-section-header" style="--section-bg:rgba(240,165,0,0.1);"><div class="sa-section-title" style="color:var(--sa-gold);">Total Discount Sales</div></div><div class="sa-section-body">';
        html += '<div class="sa-shortage-total" style="margin:0;border-color:rgba(240,165,0,0.3);"><span class="total-label">TOTAL DISCOUNT SALES</span><span class="total-value" style="color:var(--sa-gold);font-size:1.2rem;">UGX ' + this.fmt(grandTotal) + '</span></div>';
        html += '</div></div>';

        html += '<div class="sa-info-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + 'Total Discount Sales (' + this.fmt(grandTotal) + ') = Credit Sales Discount (' + this.fmt(csDiscount) + ') + Standalone (' + this.fmt(standaloneTotal) + '). This feeds into the Shift Analysis "DISCOUNT" line.</div>';

        el.innerHTML = html;
    },

    addDiscount() {
        if (!this._guardClosedShift('add a discount', () => this.addDiscount())) return;
        const key = this.bk(this.currentBranch.id, this.currentDate);
        if (!this.data.discounts[key]) this.data.discounts[key] = [];
        const existing = this.data.discounts[key];
        if (existing.length > 0) {
            const last = existing[existing.length - 1];
            if (this.parseNum(last.litres) === 0 && this.parseNum(last.selling_price) === 0) {
                this.toast('Please fill in the last discount before adding a new one', 'warning');
                return;
            }
        }
        const sd = this.data.shiftDates[key] || {};
        this._initRefCounters();
        var stamp = this._auditStamp();
        this.data.discounts[key].push({
            _id: this.uid(), ref_number: this._nextRef('DSC'),
            product: 'PMS', litres: 0, selling_price: 0, pump_price: this.getBranchPumpPrice(this.currentBranch.id, 'pms'),
            created_at: stamp.created_at, created_by: stamp.created_by,
            updated_at: stamp.updated_at, updated_by: stamp.updated_by
        });
        this.saveData();
        this.navigate('discounts');
    },

    removeDiscount(id) {
        if (!this._guardClosedShift('delete a discount entry', () => this._doRemoveDiscount(id))) return;
        if (!confirm('Are you sure you want to delete this discount?')) return;
        this._doRemoveDiscount(id);
    },
    _doRemoveDiscount(id) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        var entry = this._findById(this.data.discounts[key], id);
        if (entry) {
            this._softDelete(entry);
            this.saveData();
            this.navigate('discounts');
        }
    },

    _discPending: {},

    _stageDiscount(id, field, value) {
        if (!this._discPending[id]) this._discPending[id] = {};
        this._discPending[id][field] = value;
        // When product changes, auto-update pump_price from system setting
        if (field === 'product' && this.currentBranch) {
            var pp = this.getBranchPumpPrice(this.currentBranch.id, value === 'PMS' ? 'pms' : 'ago');
            this._discPending[id]['pump_price'] = pp;
        }
        // Live calculation preview
        if (['litres', 'pump_price', 'selling_price', 'product'].indexOf(field) >= 0) {
            this._previewDiscount(id);
        }
    },

    // Live preview of discount calculation before saving
    _previewDiscount(id) {
        var key = this.bk(this.currentBranch.id, this.currentDate);
        var entry = this._findById(this.data.discounts[key], id);
        if (!entry) return;
        var staged = this._discPending[id] || {};
        var litres = staged.litres !== undefined ? this.parseNum(staged.litres) : this.parseNum(entry.litres);
        var pp = staged.pump_price !== undefined ? this.parseNum(staged.pump_price) : this.parseNum(entry.pump_price);
        var sp = staged.selling_price !== undefined ? this.parseNum(staged.selling_price) : this.parseNum(entry.selling_price);
        var disc = (litres * pp) - (litres * sp);
        var discEl = document.getElementById('disc_val_' + id);
        if (discEl) discEl.textContent = this.fmt(disc);
    },

    _commitDiscounts() {
        const pending = this._discPending;
        const keys = Object.keys(pending);
        if (keys.length === 0) { this.toast('No changes to update', 'warning'); return; }

        // Validate
        const key = this.bk(this.currentBranch.id, this.currentDate);
        const entries = this._activeRecords(this.data.discounts[key] || []);
        for (var i = 0; i < keys.length; i++) {
            var id = keys[i];
            var fields = pending[id];
            var entry = this._findById(entries, id);
            if (!entry) continue;
            var pp = fields.pump_price !== undefined ? this.parseNum(fields.pump_price) : this.parseNum(entry.pump_price);
            var sp = fields.selling_price !== undefined ? this.parseNum(fields.selling_price) : this.parseNum(entry.selling_price);

            if (fields.litres !== undefined && !this._validateLitres(fields.litres, 'Litres')) return;
            if (fields.pump_price !== undefined && !this._validatePrice(fields.pump_price, 'Pump Price')) return;
            if (fields.selling_price !== undefined && !this._validatePrice(fields.selling_price, 'Selling Price')) return;
            if (!this._validateSPvsPP(sp, pp)) return;
        }

        this._discPending = {};
        this._discCommitting = true;
        keys.forEach(id => {
            const fields = pending[id];
            Object.keys(fields).forEach(field => {
                this.updateDiscount(id, field, fields[field]);
            });
        });
        this._discCommitting = false;
        this.navigate('discounts');
        this.toast('Discounts updated', 'success');
    },

    updateDiscount(id, field, value) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        var entry = this._findById(this.data.discounts[key], id);
        if (entry) {
            if (field === 'litres' || field === 'selling_price' || field === 'pump_price') {
                var numVal = this.parseNum(value);
                this._trackChange(entry, field, numVal);
                entry[field] = numVal;
            } else {
                this._trackChange(entry, field, value);
                entry[field] = value;
            }
            if (!entry._id) entry._id = this.uid();
            this._touchUpdated(entry);
            this.saveData();
            if (!this._discCommitting) this.navigate('discounts');
        }
    },

    discPrevDay() {
        const d = this.dayOfMonth(this.currentDate);
        if (d > 1) { this.currentDate = this.dateStr(d - 1); this.navigate('discounts'); }
    },

    discNextDay() {
        const d = this.dayOfMonth(this.currentDate);
        if (d < this.DAYS_IN_MONTH) {
            if (!this._checkPrevDayClosed(this.currentDate)) return;
            this.currentDate = this.dateStr(d + 1); this.navigate('discounts');
        }
    },

    // ============================================================
    // PART 10: CUSTOMER LIST & MANAGEMENT
    // ============================================================
    renderCustomers(el) {
        if (!this.currentBranch) { el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>'; return; }
        const bid = this.currentBranch.id;
        const customers = this.data.customers.filter(c => c.branch_id === bid);

        let html = '<div class="sa-page-header"><h1>Customers &mdash; ' + this.currentBranch.name + '</h1>'
            + '<div class="sa-page-actions"><button class="sa-btn sa-btn-secondary" onclick="SA.showImportCustomers()">Import Customers</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.showAddCustomer()">+ Add Customer</button></div></div>';

        // Search
        html += '<div class="sa-search mb-16"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
            + '<input type="text" placeholder="Search customers..." id="custSearch" oninput="SA.filterCustomers(this.value)"></div>';

        html += '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">Customer Directory (' + customers.filter(c => c.is_active !== false).length + ' active)</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table" id="custTable">';
        html += '<thead><tr><th>Customer Name</th><th>Type</th><th>Category</th><th class="text-right">Balance / Limit</th><th>Phone</th><th>Status</th><th>Last Transaction</th><th style="width:160px;">Actions</th></tr></thead><tbody>';

        if (customers.length === 0) {
            html += '<tr><td colspan="8" class="text-center text-muted" style="padding:30px;">No customers yet. Click "+ Add Customer" to create one.</td></tr>';
        }

        customers.forEach(c => {
            const bal = this.getCustomerBalance(c.id);
            const lastTx = this.data.customerTransactions
                .filter(t => t.customer_id === c.id)
                .sort((a, b) => b.transaction_date > a.transaction_date ? 1 : -1)[0];
            const balClass = bal > 0 ? 'text-danger' : bal < 0 ? 'text-success' : 'text-muted';
            const statusBadge = c.is_active !== false ? '<span class="sa-badge sa-badge-success">Active</span>' : '<span class="sa-badge sa-badge-neutral">Inactive</span>';
            const typeBadge = c.customer_type === 'attendant'
                ? '<span class="sa-badge sa-badge-warning">Attendant</span>'
                : '<span class="sa-badge sa-badge-info">Customer</span>';

            const catLabels = { retail: 'Retail', wholesale: 'Wholesale', corporate: 'Corporate', government: 'Government' };
            const catBadge = c.category ? '<span class="sa-badge sa-badge-neutral">' + (catLabels[c.category] || c.category) + '</span>' : '<span class="text-muted">—</span>';
            const creditLimit = this.parseNum(c.credit_limit);
            const overLimit = creditLimit > 0 && bal > creditLimit;
            const limitDisplay = creditLimit > 0 ? '<div style="font-size:0.7rem;color:' + (overLimit ? 'var(--sa-danger)' : 'var(--sa-text-dim)') + ';">Limit: ' + this.fmtInt(creditLimit) + (overLimit ? ' EXCEEDED' : '') + '</div>' : '';

            html += '<tr class="cust-row" data-name="' + c.name.toLowerCase() + '"' + (overLimit ? ' style="background:rgba(239,68,68,0.05);"' : '') + '>';
            html += '<td><strong>' + c.name + '</strong>' + (c.email ? '<div style="font-size:0.7rem;color:var(--sa-text-dim);">' + c.email + '</div>' : '') + '</td>';
            html += '<td>' + typeBadge + '</td>';
            html += '<td>' + catBadge + '</td>';
            html += '<td class="text-right mono ' + balClass + '" style="font-weight:700;">UGX ' + this.fmtInt(bal) + limitDisplay + '</td>';
            html += '<td class="text-muted">' + (c.phone || '-') + '</td>';
            html += '<td>' + statusBadge + (overLimit ? ' <span class="sa-badge sa-badge-danger">Over Limit</span>' : '') + '</td>';
            html += '<td class="text-muted" style="font-size:0.78rem;">' + (lastTx ? this.formatDate(lastTx.transaction_date) : 'None') + '</td>';
            html += '<td><div class="sa-btn-group">'
                + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.viewStatement(\'' + c.id + '\')">Statement</button>'
                + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.showRecordPayment(\'' + c.id + '\')">Pay</button>'
                + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.showEditCustomer(\'' + c.id + '\')">Edit</button>'
                + '</div></td>';
            html += '</tr>';
        });

        html += '</tbody></table></div></div></div>';

        // Summary
        const activeCustomers = customers.filter(c => c.is_active !== false);
        const creditCustomers = activeCustomers.filter(c => c.customer_type !== 'attendant');
        const attCustomers = activeCustomers.filter(c => c.customer_type === 'attendant');
        const totalOwed = creditCustomers.reduce((s, c) => s + Math.max(0, this.getCustomerBalance(c.id)), 0);
        const totalAttOwed = attCustomers.reduce((s, c) => s + Math.max(0, this.getCustomerBalance(c.id)), 0);
        html += '<div class="sa-stats" style="margin-top:16px;">';
        html += '<div class="sa-stat-card danger"><div class="stat-label">Total Owed by Credit Customers</div><div class="stat-value">UGX ' + this.fmtInt(totalOwed) + '</div></div>';
        html += '<div class="sa-stat-card warning"><div class="stat-label">Attendant Shortages Owed</div><div class="stat-value">UGX ' + this.fmtInt(totalAttOwed) + '</div><div class="stat-sub">Deducted from salaries</div></div>';
        html += '<div class="sa-stat-card info"><div class="stat-label">Customers / Attendants</div><div class="stat-value">' + creditCustomers.length + ' / ' + attCustomers.length + '</div></div>';
        html += '</div>';

        // Aging Report
        const today = new Date();
        const agingData = [];
        creditCustomers.forEach(c => {
            const bal = this.getCustomerBalance(c.id);
            if (bal <= 0) return; // No outstanding balance
            // Find the oldest unpaid debit transaction
            const debits = this.data.customerTransactions
                .filter(t => t.customer_id === c.id && t.transaction_type === 'DEBIT')
                .sort((a, b) => a.transaction_date > b.transaction_date ? 1 : -1);
            const credits = this.data.customerTransactions
                .filter(t => t.customer_id === c.id && t.transaction_type === 'CREDIT')
                .sort((a, b) => a.transaction_date > b.transaction_date ? 1 : -1);

            // Simple aging: track remaining balance through debits oldest-first
            let remaining = bal;
            let buckets = { current: 0, d30: 0, d60: 0, d90: 0, d121: 0 };
            let oldestUnpaidDate = null;
            debits.forEach(d => {
                if (remaining <= 0) return;
                const debitAmt = this.parseNum(d.debit_amount);
                if (debitAmt <= 0) return;
                const allocated = Math.min(remaining, debitAmt);
                const txDate = new Date(d.transaction_date);
                const daysOld = Math.floor((today - txDate) / (1000 * 60 * 60 * 24));
                if (!oldestUnpaidDate || txDate < oldestUnpaidDate) oldestUnpaidDate = txDate;
                if (daysOld > 120) buckets.d121 += allocated;
                else if (daysOld > 90) buckets.d90 += allocated;
                else if (daysOld > 60) buckets.d60 += allocated;
                else if (daysOld > 30) buckets.d30 += allocated;
                else buckets.current += allocated;
                remaining -= allocated;
            });
            // Any remaining goes to current
            if (remaining > 0) buckets.current += remaining;

            const daysOverdue = oldestUnpaidDate ? Math.floor((today - oldestUnpaidDate) / (1000 * 60 * 60 * 24)) : 0;
            agingData.push({ customer: c, bal, buckets, daysOverdue, oldestDate: oldestUnpaidDate });
        });

        if (agingData.length > 0) {
            agingData.sort((a, b) => b.bal - a.bal);
            const totals = { current: 0, d30: 0, d60: 0, d90: 0, d121: 0, total: 0 };
            agingData.forEach(a => {
                totals.current += a.buckets.current;
                totals.d30 += a.buckets.d30;
                totals.d60 += a.buckets.d60;
                totals.d90 += a.buckets.d90;
                totals.d121 += a.buckets.d121;
                totals.total += a.bal;
            });

            html += '<div class="sa-section"><div class="sa-section-header orange"><div class="sa-section-title">Aging Report &mdash; Outstanding Balances</div></div>'
                + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
            html += '<thead><tr><th>Customer</th><th>Category</th><th class="text-right">Current</th><th class="text-right">31-60 Days</th><th class="text-right">61-90 Days</th><th class="text-right">91-120 Days</th><th class="text-right">121+ Days</th><th class="text-right">Total Owed</th><th>Status</th></tr></thead><tbody>';
            agingData.forEach(a => {
                const c = a.customer;
                const overLimit = c.credit_limit > 0 && a.bal > c.credit_limit;
                const isOverdue = a.daysOverdue > 30;
                const hasEmail = c.email && c.email.length > 0;
                const statusBadges = [];
                if (a.buckets.d121 > 0) statusBadges.push('<span class="sa-badge sa-badge-danger">121+ Days</span>');
                else if (a.buckets.d90 > 0) statusBadges.push('<span class="sa-badge sa-badge-danger">91-120 Days</span>');
                else if (a.buckets.d60 > 0) statusBadges.push('<span class="sa-badge sa-badge-warning">61-90 Days</span>');
                else if (a.buckets.d30 > 0) statusBadges.push('<span class="sa-badge sa-badge-warning">31-60 Days</span>');
                else statusBadges.push('<span class="sa-badge sa-badge-success">Current</span>');
                if (overLimit) statusBadges.push('<span class="sa-badge sa-badge-danger">Over Limit</span>');
                if (isOverdue && hasEmail) statusBadges.push('<span class="sa-badge sa-badge-info" title="Has email for notifications">&#9993;</span>');

                const catLabels = { retail: 'Retail', wholesale: 'Wholesale', corporate: 'Corporate', government: 'Government' };
                html += '<tr' + (a.buckets.d121 > 0 ? ' style="background:rgba(239,68,68,0.05);"' : '') + '>'
                    + '<td><strong>' + c.name + '</strong>' + (hasEmail ? '<div style="font-size:0.68rem;color:var(--sa-text-dim);">' + c.email + '</div>' : '') + '</td>'
                    + '<td><span class="sa-badge sa-badge-neutral">' + (catLabels[c.category] || c.category || 'Retail') + '</span></td>'
                    + '<td class="text-right mono">' + (a.buckets.current > 0 ? this.fmtInt(a.buckets.current) : '—') + '</td>'
                    + '<td class="text-right mono' + (a.buckets.d30 > 0 ? ' text-warning' : '') + '">' + (a.buckets.d30 > 0 ? this.fmtInt(a.buckets.d30) : '—') + '</td>'
                    + '<td class="text-right mono' + (a.buckets.d60 > 0 ? ' text-warning' : '') + '">' + (a.buckets.d60 > 0 ? this.fmtInt(a.buckets.d60) : '—') + '</td>'
                    + '<td class="text-right mono' + (a.buckets.d90 > 0 ? ' text-danger' : '') + '">' + (a.buckets.d90 > 0 ? this.fmtInt(a.buckets.d90) : '—') + '</td>'
                    + '<td class="text-right mono' + (a.buckets.d121 > 0 ? ' text-danger text-bold' : '') + '">' + (a.buckets.d121 > 0 ? this.fmtInt(a.buckets.d121) : '—') + '</td>'
                    + '<td class="text-right mono text-bold text-danger">' + this.fmtInt(a.bal) + '</td>'
                    + '<td>' + statusBadges.join(' ') + '</td></tr>';
            });
            html += '<tr class="total-row">'
                + '<td class="text-bold" colspan="2">TOTALS</td>'
                + '<td class="text-right mono text-bold">' + this.fmtInt(totals.current) + '</td>'
                + '<td class="text-right mono text-bold">' + this.fmtInt(totals.d30) + '</td>'
                + '<td class="text-right mono text-bold">' + this.fmtInt(totals.d60) + '</td>'
                + '<td class="text-right mono text-bold">' + this.fmtInt(totals.d90) + '</td>'
                + '<td class="text-right mono text-bold">' + this.fmtInt(totals.d121) + '</td>'
                + '<td class="text-right mono text-bold text-danger">' + this.fmtInt(totals.total) + '</td>'
                + '<td></td></tr>';
            html += '</tbody></table></div></div></div>';

            // Overdue accounts needing attention (with email flags)
            const overdueAccounts = agingData.filter(a => a.daysOverdue > 30);
            if (overdueAccounts.length > 0) {
                html += '<div class="sa-section"><div class="sa-section-header red"><div class="sa-section-title">Overdue Accounts (' + overdueAccounts.length + ')</div></div><div class="sa-section-body">';
                overdueAccounts.forEach(a => {
                    const c = a.customer;
                    const hasEmail = c.email && c.email.length > 0;
                    html += '<div class="sa-stock-alert critical" style="margin-bottom:8px;">'
                        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="color:var(--sa-danger);flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
                        + '<div style="flex:1;"><strong>' + c.name + '</strong> — UGX ' + this.fmtInt(a.bal) + ' outstanding'
                        + '<div style="font-size:0.72rem;color:var(--sa-text-dim);">' + a.daysOverdue + ' days overdue'
                        + (hasEmail ? ' &bull; <span style="color:var(--sa-primary);">&#9993; ' + c.email + '</span>' : ' &bull; <span style="color:var(--sa-warning);">No email on file</span>')
                        + '</div></div>'
                        + '<div class="sa-btn-group">'
                        + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.viewStatement(\'' + c.id + '\')">Statement</button>'
                        + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.showRecordPayment(\'' + c.id + '\')">Pay</button>'
                        + '</div></div>';
                });
                html += '</div></div>';
            }
        }

        el.innerHTML = html;
    },

    filterCustomers(query) {
        const q = query.toLowerCase();
        document.querySelectorAll('.cust-row').forEach(row => {
            row.style.display = row.dataset.name.includes(q) ? '' : 'none';
        });
    },

    showAddCustomer() {
        const html = '<div class="sa-form-group"><label>Customer Name</label><input class="sa-input" id="ncName" placeholder="e.g. ST MORRIS STATION"></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Type</label><select class="sa-input" id="ncType"><option value="customer">Customer (Credit)</option><option value="attendant">Pump Attendant</option></select></div>'
            + '<div class="sa-form-group"><label>Category</label><select class="sa-input" id="ncCategory"><option value="retail">Retail</option><option value="wholesale">Wholesale</option><option value="corporate">Corporate</option><option value="government">Government</option></select></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Phone</label><input class="sa-input" id="ncPhone" placeholder="Optional"></div>'
            + '<div class="sa-form-group"><label>Email</label><input class="sa-input" id="ncEmail" type="email" placeholder="Optional"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Opening Balance (UGX)</label><input class="sa-input mono" id="ncBalance" placeholder="0" value="0"></div>'
            + '<div class="sa-form-group"><label>Credit Limit (UGX)</label><input class="sa-input mono" id="ncCreditLimit" placeholder="0 = unlimited" value="0"></div></div>'
            + '<div class="sa-form-group"><label>Address</label><input class="sa-input" id="ncAddr" placeholder="Optional"></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveCustomer()">Add Customer</button></div>';
        this.openModal('Add New Customer / Attendant', html);
    },

    saveCustomer() {
        const name = document.getElementById('ncName').value.trim();
        if (!name) { this.toast('Customer name required', 'error'); return; }
        const bid = this.currentBranch.id;
        if (this.data.customers.find(c => c.branch_id === bid && c.name.toLowerCase() === name.toLowerCase())) {
            this.toast('Customer already exists at this branch', 'error'); return;
        }
        const ctype = document.getElementById('ncType').value;
        this.data.customers.push({
            id: this.uid(), branch_id: bid, name: name,
            phone: document.getElementById('ncPhone').value.trim(),
            email: document.getElementById('ncEmail').value.trim(),
            address: document.getElementById('ncAddr').value.trim(),
            opening_balance: this.parseNum(document.getElementById('ncBalance').value),
            credit_limit: this.parseNum(document.getElementById('ncCreditLimit').value),
            category: document.getElementById('ncCategory').value || 'retail',
            is_active: true, customer_type: ctype,
            created_at: new Date().toISOString()
        });
        this.saveData();
        this.closeModal();
        this.toast((ctype === 'attendant' ? 'Attendant' : 'Customer') + ' "' + name + '" added');
        this.navigate('customers');
    },

    showImportCustomers() {
        const html = '<div style="margin-bottom:16px;">'
            + '<p style="color:var(--sa-text-muted);margin-bottom:12px;">Paste customer data below — one customer per line. Use commas to separate the fields.</p>'
            + '<div style="background:var(--sa-bg);border:1px solid var(--sa-border);border-radius:8px;padding:12px;margin-bottom:12px;">'
            + '<div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--sa-text-dim);margin-bottom:6px;">Required Format (comma-separated)</div>'
            + '<code style="font-size:0.78rem;color:var(--sa-accent);display:block;line-height:1.6;">Name, Type, Category, Phone, Opening Balance, Credit Limit, Address</code>'
            + '<div style="font-size:0.7rem;color:var(--sa-text-dim);margin-top:8px;line-height:1.5;">'
            + '<strong>Name</strong> — required<br>'
            + '<strong>Type</strong> — <em>customer</em> or <em>attendant</em> (default: customer)<br>'
            + '<strong>Category</strong> — <em>retail</em>, <em>wholesale</em>, <em>corporate</em>, or <em>government</em> (default: retail)<br>'
            + '<strong>Phone</strong> — optional<br>'
            + '<strong>Opening Balance</strong> — number, default 0<br>'
            + '<strong>Credit Limit</strong> — number, 0 = unlimited (default: 0)<br>'
            + '<strong>Address</strong> — optional'
            + '</div></div>'
            + '<div style="background:var(--sa-bg);border:1px solid var(--sa-border);border-radius:8px;padding:12px;margin-bottom:12px;">'
            + '<div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--sa-text-dim);margin-bottom:6px;">Example</div>'
            + '<pre style="font-size:0.75rem;color:var(--sa-text);margin:0;line-height:1.7;white-space:pre-wrap;">'
            + 'John Okello, customer, corporate, 0771234567, 500000, 2000000, Gulu Town\n'
            + 'Mary Acan, customer, retail, 0782345678, 0, 500000,\n'
            + 'David Opio, attendant, retail, 0753456789, 0, 0,\n'
            + 'Grace Motors Ltd, customer, wholesale, , 1200000, 5000000, Lira Road</pre>'
            + '</div></div>'
            + '<div class="sa-form-group"><label>Paste Customer Data</label>'
            + '<textarea class="sa-input" id="importCustData" rows="10" placeholder="Paste one customer per line..." style="font-family:monospace;font-size:0.78rem;"></textarea></div>'
            + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">'
            + '<span style="color:var(--sa-text-dim);font-size:0.78rem;">or</span>'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="document.getElementById(\'importCustFile\').click()">Upload CSV File</button>'
            + '<input type="file" id="importCustFile" accept=".csv,.txt" style="display:none;" onchange="SA.loadImportCustFile(this)">'
            + '</div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.importCustomers()">Import Customers</button></div>';
        this.openModal('Import Customers — ' + this.currentBranch.name, html, true);
    },

    loadImportCustFile(input) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('importCustData').value = e.target.result;
        };
        reader.readAsText(file);
        input.value = '';
    },

    importCustomers() {
        const raw = document.getElementById('importCustData').value.trim();
        if (!raw) { this.toast('Paste or upload customer data first', 'error'); return; }
        const bid = this.currentBranch.id;
        const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Skip header row if it looks like one
        let startIdx = 0;
        if (lines.length > 0) {
            const first = lines[0].toLowerCase();
            if (first.indexOf('name') !== -1 && (first.indexOf('type') !== -1 || first.indexOf('category') !== -1 || first.indexOf('phone') !== -1)) {
                startIdx = 1;
            }
        }

        const validTypes = ['customer', 'attendant'];
        const validCategories = ['retail', 'wholesale', 'corporate', 'government'];
        let added = 0, skipped = 0, errors = [];

        for (let i = startIdx; i < lines.length; i++) {
            const parts = lines[i].split(',').map(p => p.trim());
            const name = parts[0] || '';
            if (!name) { errors.push('Line ' + (i + 1) + ': empty name — skipped'); skipped++; continue; }

            // Check duplicate
            if (this.data.customers.find(c => c.branch_id === bid && c.name.toLowerCase() === name.toLowerCase())) {
                errors.push('Line ' + (i + 1) + ': "' + name + '" already exists — skipped');
                skipped++;
                continue;
            }

            const rawType = (parts[1] || '').toLowerCase();
            const ctype = validTypes.indexOf(rawType) !== -1 ? rawType : 'customer';
            const rawCat = (parts[2] || '').toLowerCase();
            const category = validCategories.indexOf(rawCat) !== -1 ? rawCat : 'retail';
            const phone = parts[3] || '';
            const openBal = this.parseNum(parts[4] || '0');
            const creditLimit = this.parseNum(parts[5] || '0');
            const address = parts.slice(6).join(',').trim();

            this.data.customers.push({
                id: this.uid(), branch_id: bid, name: name,
                phone: phone, email: '', address: address,
                opening_balance: openBal, credit_limit: creditLimit,
                category: category, is_active: true, customer_type: ctype,
                created_at: new Date().toISOString()
            });
            added++;
        }

        if (added > 0) {
            this.saveData();
            this.auditLog('CUSTOMERS_IMPORTED', 'Imported ' + added + ' customers to ' + this.currentBranch.name);
        }

        this.closeModal();

        if (errors.length > 0 && added > 0) {
            this.toast(added + ' imported, ' + skipped + ' skipped', 'success');
            // Show details after a short delay
            setTimeout(() => {
                const errHtml = '<div style="max-height:300px;overflow-y:auto;">'
                    + '<p style="color:var(--sa-success);margin-bottom:12px;">' + added + ' customer(s) imported successfully.</p>'
                    + '<p style="color:var(--sa-warning);margin-bottom:8px;">' + skipped + ' skipped:</p>'
                    + '<ul style="color:var(--sa-text-muted);font-size:0.8rem;padding-left:20px;line-height:1.8;">'
                    + errors.map(e => '<li>' + e + '</li>').join('') + '</ul></div>'
                    + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;"><button class="sa-btn sa-btn-primary" onclick="SA.closeModal()">OK</button></div>';
                this.openModal('Import Results', errHtml);
            }, 300);
        } else if (added > 0) {
            this.toast(added + ' customer(s) imported successfully', 'success');
        } else {
            this.toast('No customers were imported. ' + (errors.length > 0 ? errors[0] : ''), 'error');
        }

        this.navigate('customers');
    },

    showEditCustomer(customerId) {
        const c = this.data.customers.find(cu => cu.id === customerId);
        if (!c) return;
        const catOptions = ['retail', 'wholesale', 'corporate', 'government'].map(cat =>
            '<option value="' + cat + '"' + (c.category === cat ? ' selected' : '') + '>' + cat.charAt(0).toUpperCase() + cat.slice(1) + '</option>'
        ).join('');
        const html = '<div class="sa-form-group"><label>Customer Name</label><input class="sa-input" id="ecName" value="' + (c.name || '') + '"></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Type</label><select class="sa-input" id="ecType"><option value="customer"' + (c.customer_type !== 'attendant' ? ' selected' : '') + '>Customer (Credit)</option><option value="attendant"' + (c.customer_type === 'attendant' ? ' selected' : '') + '>Pump Attendant</option></select></div>'
            + '<div class="sa-form-group"><label>Category</label><select class="sa-input" id="ecCategory">' + catOptions + '</select></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Phone</label><input class="sa-input" id="ecPhone" value="' + (c.phone || '') + '"></div>'
            + '<div class="sa-form-group"><label>Email</label><input class="sa-input" id="ecEmail" type="email" value="' + (c.email || '') + '"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Credit Limit (UGX)</label><input class="sa-input mono" id="ecCreditLimit" value="' + (c.credit_limit || 0) + '" placeholder="0 = unlimited"></div>'
            + '<div class="sa-form-group"><label>Status</label><select class="sa-input" id="ecActive"><option value="true"' + (c.is_active !== false ? ' selected' : '') + '>Active</option><option value="false"' + (c.is_active === false ? ' selected' : '') + '>Inactive</option></select></div></div>'
            + '<div class="sa-form-group"><label>Address</label><input class="sa-input" id="ecAddr" value="' + (c.address || '') + '"></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveEditCustomer(\'' + customerId + '\')">Save Changes</button></div>';
        this.openModal('Edit Customer — ' + c.name, html);
    },

    saveEditCustomer(customerId) {
        const c = this.data.customers.find(cu => cu.id === customerId);
        if (!c) return;
        const name = document.getElementById('ecName').value.trim();
        if (!name) { this.toast('Customer name required', 'error'); return; }
        c.name = name;
        c.customer_type = document.getElementById('ecType').value;
        c.category = document.getElementById('ecCategory').value;
        c.phone = document.getElementById('ecPhone').value.trim();
        c.email = document.getElementById('ecEmail').value.trim();
        c.credit_limit = this.parseNum(document.getElementById('ecCreditLimit').value);
        c.is_active = document.getElementById('ecActive').value === 'true';
        c.address = document.getElementById('ecAddr').value.trim();
        this.saveData();
        this.closeModal();
        this.toast('Customer updated');
        this.navigate('customers');
    },

    showRecordPayment(customerId) {
        const cust = this.data.customers.find(c => c.id === customerId);
        if (!cust) return;
        const bal = this.getCustomerBalance(customerId);
        let methodOpts = '';
        this.PAYMENT_METHODS.forEach(m => { methodOpts += '<option value="' + m + '">' + m + '</option>'; });

        // Bank options for Bank Transfer
        this.initBanks();
        let bankOpts = '';
        this.data.banks.filter(b => b.is_active).forEach(b => {
            bankOpts += '<option value="' + b.id + '">' + b.name + '</option>';
        });

        const html = '<div style="margin-bottom:16px;"><strong>' + cust.name + '</strong><br>'
            + '<span class="text-muted">Current Balance: </span><strong class="' + (bal > 0 ? 'text-danger' : 'text-success') + '">UGX ' + this.fmtInt(bal) + '</strong></div>'
            + '<div class="sa-form-group"><label>Payment Amount (UGX)</label><input class="sa-input mono" id="rpAmt" placeholder="Enter amount"></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Payment Method</label><select class="sa-input" id="rpMethod" onchange="document.getElementById(\'rpBankRow\').style.display=this.value===\'Bank Transfer\'?\'block\':\'none\';">' + methodOpts + '</select></div>'
            + '<div class="sa-form-group"><label>Date</label><input type="date" class="sa-input" id="rpDate" value="' + (this.currentDate || this.todayStr()) + '" min="' + this.monthStart() + '" max="' + this.monthEnd() + '"></div></div>'
            + '<div id="rpBankRow" style="display:none;"><div class="sa-form-group"><label>Bank Account</label><select class="sa-input" id="rpBank">' + bankOpts + '</select></div></div>'
            + '<div class="sa-form-group"><label>Receipt # (Optional)</label><input class="sa-input" id="rpReceipt" placeholder="e.g. RCP-001"></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveRecordPayment(\'' + customerId + '\')">Record Payment</button></div>';
        this.openModal('Record Payment — ' + cust.name, html);
    },

    saveRecordPayment(customerId) {
        if (!this.hasPermission('record_payments')) { this.toast('Permission denied', 'error'); return; }
        const amt = this.parseNum(document.getElementById('rpAmt').value);
        if (amt <= 0) { this.toast('Enter a valid amount', 'error'); return; }
        const method = document.getElementById('rpMethod').value;
        const date = document.getElementById('rpDate').value;
        const receipt = document.getElementById('rpReceipt').value.trim();
        const cust = this.data.customers.find(c => c.id === customerId);

        const bankEl = document.getElementById('rpBank');
        const bankId = (method === 'Bank Transfer' && bankEl) ? parseInt(bankEl.value) : null;

        var txnId = this.uid();
        var refId = this.uid();
        this.data.customerTransactions.push({
            id: txnId, _id: txnId, customer_id: customerId,
            branch_id: this.currentBranch ? this.currentBranch.id : null,
            transaction_date: date,
            description: 'Payment received (' + method + ')' + (receipt ? ' Ref: ' + receipt : ''),
            transaction_type: 'CREDIT', debit_amount: 0, credit_amount: amt,
            reference_id: refId, reference_type: 'PAYMENT',
            payment_method: method, receipt_number: receipt,
            bank_id: bankId,
            created_at: new Date().toISOString()
        });

        // Customer debt payments via digital channels are recorded in customerTransactions only.
        // They should NOT be added to momoTransactions/airtelTransactions/mpesaTransactions
        // because those stores feed into the daily shift totals. A debt repayment is not a shift sale.

        this.saveData();
        this.auditLog('PAYMENT_RECORDED', 'Recorded payment of UGX ' + this.fmtInt(amt) + ' from ' + cust.name + ' via ' + method);
        this.closeModal();
        this.toast('Payment of UGX ' + this.fmtInt(amt) + ' recorded for ' + cust.name);
        this.navigate(this.currentView);
    },

    // ============================================================
    // PART 11: CUSTOMER STATEMENTS WITH RUNNING BALANCES
    // ============================================================
    viewStatement(customerId) {
        this._statementCustomerId = customerId;
        this.navigate('customer_statements');
    },

    renderCustomerStatements(el) {
        if (!this.currentBranch) { el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>'; return; }
        const bid = this.currentBranch.id;

        // If a specific customer is selected
        if (this._statementCustomerId) {
            this.renderSingleStatement(el, this._statementCustomerId);
            return;
        }

        // Otherwise show customer list for statement selection
        const customers = this.data.customers.filter(c => c.branch_id === bid && c.is_active !== false);

        let html = '<div class="sa-page-header"><h1>Customer Statements &mdash; ' + this.currentBranch.name + '</h1></div>';

        html += '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">Select a Customer</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Customer Name</th><th class="text-right">Current Balance</th><th class="text-right">Total Debits</th><th class="text-right">Total Credits</th><th>Transactions</th><th></th></tr></thead><tbody>';

        if (customers.length === 0) {
            html += '<tr><td colspan="6" class="text-center text-muted" style="padding:30px;">No customers. Add customers from the Customer List page first.</td></tr>';
        }

        customers.forEach(c => {
            const txs = this.data.customerTransactions.filter(t => t.customer_id === c.id);
            const totalDebit = txs.reduce((s, t) => s + this.parseNum(t.debit_amount), 0);
            const totalCredit = txs.reduce((s, t) => s + this.parseNum(t.credit_amount), 0);
            const bal = this.getCustomerBalance(c.id);
            const balClass = bal > 0 ? 'text-danger' : bal < 0 ? 'text-success' : 'text-muted';

            html += '<tr style="cursor:pointer;" onclick="SA.viewStatement(\'' + c.id + '\')">';
            html += '<td><strong>' + c.name + '</strong></td>';
            html += '<td class="text-right mono ' + balClass + '" style="font-weight:700;">UGX ' + this.fmtInt(bal) + '</td>';
            html += '<td class="text-right mono text-danger">' + this.fmtInt(totalDebit) + '</td>';
            html += '<td class="text-right mono text-success">' + this.fmtInt(totalCredit) + '</td>';
            html += '<td class="text-muted">' + txs.length + ' entries</td>';
            html += '<td><button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="event.stopPropagation();SA.viewStatement(\'' + c.id + '\')">View &rarr;</button></td>';
            html += '</tr>';
        });

        html += '</tbody></table></div></div></div>';
        el.innerHTML = html;
    },

    renderSingleStatement(el, customerId) {
        const cust = this.data.customers.find(c => c.id === customerId);
        if (!cust) { el.innerHTML = '<div class="sa-empty"><h3>Customer not found</h3></div>'; return; }

        const bal = this.getCustomerBalance(customerId);
        let txs = this.data.customerTransactions
            .filter(t => t.customer_id === customerId)
            .sort((a, b) => {
                if (a.transaction_date === b.transaction_date) return a.id - b.id;
                return a.transaction_date < b.transaction_date ? -1 : 1;
            });

        // Apply filters
        let filteredTxs = txs;
        if (this._stmtFilterFrom) filteredTxs = filteredTxs.filter(t => t.transaction_date >= this._stmtFilterFrom);
        if (this._stmtFilterTo) filteredTxs = filteredTxs.filter(t => t.transaction_date <= this._stmtFilterTo);
        if (this._stmtFilterType === 'DEBIT') filteredTxs = filteredTxs.filter(t => t.transaction_type === 'DEBIT');
        else if (this._stmtFilterType === 'CREDIT') filteredTxs = filteredTxs.filter(t => t.transaction_type === 'CREDIT');
        txs = filteredTxs;

        const totalDebit = txs.reduce((s, t) => s + this.parseNum(t.debit_amount), 0);
        const totalCredit = txs.reduce((s, t) => s + this.parseNum(t.credit_amount), 0);

        let html = '<div class="sa-page-header"><h1>Statement</h1>'
            + '<div class="sa-page-actions">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA._statementCustomerId=null;SA.navigate(\'customer_statements\')">&laquo; Back to List</button>'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.printStatement(\'' + customerId + '\')">Print / Export</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.showRecordPayment(\'' + customerId + '\')">Record Payment</button>'
            + '</div></div>';

        // Quick date range presets
        html += this.renderDateRangeBar('stmtFrom', 'stmtTo', 'SA.applyStatementFilter()');

        // Filters
        html += '<div class="sa-section" style="margin-bottom:16px;"><div class="sa-section-body" style="padding:12px 20px;">'
            + '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">'
            + '<label style="font-size:0.78rem;font-weight:600;color:var(--sa-text-dim);">FILTER:</label>'
            + '<input type="date" class="sa-input sa-input-sm" id="stmtFrom" value="' + (this._stmtFilterFrom || '') + '" style="width:140px;" placeholder="From">'
            + '<span class="text-muted">to</span>'
            + '<input type="date" class="sa-input sa-input-sm" id="stmtTo" value="' + (this._stmtFilterTo || '') + '" style="width:140px;" placeholder="To">'
            + '<select class="sa-input sa-input-sm" id="stmtType" style="width:120px;"><option value="ALL"' + (this._stmtFilterType === 'ALL' ? ' selected' : '') + '>All</option><option value="DEBIT"' + (this._stmtFilterType === 'DEBIT' ? ' selected' : '') + '>Debits Only</option><option value="CREDIT"' + (this._stmtFilterType === 'CREDIT' ? ' selected' : '') + '>Credits Only</option></select>'
            + '<button class="sa-btn sa-btn-primary sa-btn-sm" onclick="SA.applyStatementFilter()">Apply</button>'
            + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.clearStatementFilter()">Clear</button>'
            + '</div></div></div>';

        // Customer header
        const balClass = bal > 0 ? 'positive' : bal < 0 ? 'negative' : 'zero';
        html += '<div class="sa-section"><div class="sa-statement-header">'
            + '<div><div class="sa-customer-name">' + cust.name + '</div>'
            + '<div class="text-muted" style="font-size:0.82rem;">' + (cust.phone || '') + (cust.address ? ' | ' + cust.address : '') + '</div></div>'
            + '<div class="sa-balance-display"><div class="sa-balance-label">Current Balance</div>'
            + '<div class="sa-balance-amount ' + balClass + '">UGX ' + this.fmtInt(Math.abs(bal)) + '</div>'
            + '<div style="font-size:0.72rem;color:var(--sa-text-dim);">' + (bal > 0 ? 'Amount Owed' : bal < 0 ? 'Credit Balance' : 'Settled') + '</div>'
            + '</div></div>';

        // Summary cards
        html += '<div class="sa-section-body"><div class="sa-stats" style="margin-bottom:16px;">';
        html += '<div class="sa-stat-card danger"><div class="stat-label">Total Debits</div><div class="stat-value">UGX ' + this.fmtInt(totalDebit) + '</div><div class="stat-sub">Credit purchases</div></div>';
        html += '<div class="sa-stat-card success"><div class="stat-label">Total Credits</div><div class="stat-value">UGX ' + this.fmtInt(totalCredit) + '</div><div class="stat-sub">Payments received</div></div>';
        html += '<div class="sa-stat-card info"><div class="stat-label">Transactions</div><div class="stat-value">' + txs.length + '</div><div class="stat-sub">All entries</div></div>';
        html += '</div>';

        // Transaction ledger
        html += '<div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Date</th><th>Description</th><th class="text-right">Debit</th><th class="text-right">Credit</th><th class="text-right">Balance</th><th style="width:40px;"></th></tr></thead><tbody>';

        // Opening balance row
        const openBal = this.parseNum(cust.opening_balance);
        let runningBal = openBal;
        html += '<tr style="background:rgba(59,130,246,0.05);"><td class="text-muted">Opening</td><td>Opening Balance</td><td></td><td></td>'
            + '<td class="text-right mono text-bold">' + this.fmtInt(runningBal) + '</td><td></td></tr>';

        txs.forEach(t => {
            const debit = this.parseNum(t.debit_amount);
            const credit = this.parseNum(t.credit_amount);
            runningBal += debit - credit;
            const isDebit = t.transaction_type === 'DEBIT';

            html += '<tr>';
            html += '<td style="white-space:nowrap;">' + this.formatDate(t.transaction_date) + '</td>';
            html += '<td>' + t.description + '</td>';
            html += '<td class="text-right mono">' + (debit > 0 ? '<span class="text-danger">' + this.fmtInt(debit) + '</span>' : '') + '</td>';
            html += '<td class="text-right mono">' + (credit > 0 ? '<span class="text-success">' + this.fmtInt(credit) + '</span>' : '') + '</td>';
            html += '<td class="text-right mono text-bold">' + this.fmtInt(runningBal) + '</td>';
            html += '<td>' + (t.transaction_type === 'CREDIT' ? '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.printPaymentReceipt(\'' + t.id + '\')" title="Print Receipt" style="font-size:0.7rem;padding:2px 6px;">&#128424;</button>' : '') + '</td>';
            html += '</tr>';
        });

        if (txs.length === 0) {
            html += '<tr><td colspan="6" class="text-center text-muted" style="padding:24px;">No transactions recorded yet.</td></tr>';
        }

        // Footer totals
        html += '<tr class="total-row"><td></td><td class="text-bold">TOTALS</td>';
        html += '<td class="text-right mono text-bold text-danger">' + this.fmtInt(totalDebit) + '</td>';
        html += '<td class="text-right mono text-bold text-success">' + this.fmtInt(totalCredit) + '</td>';
        html += '<td class="text-right mono text-bold">' + this.fmtInt(bal) + '</td><td></td></tr>';

        html += '</tbody></table></div></div></div>';

        el.innerHTML = html;
    },

    // ============================================================
    // PART 12: REPORTS
    // ============================================================
    renderReports(el) {
        let html = '<div class="sa-page-header"><h1>Reports &mdash; ' + this.monthLabel() + '</h1></div>';

        // Tabs
        html += '<div class="sa-tabs" style="flex-wrap:wrap;">'
            + '<button class="sa-tab active" onclick="SA.showReport(\'consolidated\',this)">Consolidated</button>'
            + '<button class="sa-tab" onclick="SA.showReport(\'branch\',this)">Branch Summary</button>'
            + '<button class="sa-tab" onclick="SA.showReport(\'daily_report\',this)">Daily Report</button>'
            + '<button class="sa-tab" onclick="SA.showReport(\'customers\',this)">Cross-Branch Customers</button>'
            + '<button class="sa-tab" onclick="SA.showReport(\'customer_ageing\',this)">Customer Ageing</button>'
            + '<button class="sa-tab" onclick="SA.showReport(\'wetstock\',this)">Wetstock Summary</button>'
            + '<button class="sa-tab" onclick="SA.showReport(\'expense_ledger\',this)">Expense Ledger</button>'
            + '<button class="sa-tab" onclick="SA.showReport(\'profit_loss\',this)">Profit &amp; Loss</button>'
            + '</div>';

        html += '<div id="reportContent">';
        html += this.reportConsolidated();
        html += '</div>';

        el.innerHTML = html;
    },

    showReport(type, tabEl) {
        document.querySelectorAll('.sa-tab').forEach(t => t.classList.remove('active'));
        if (tabEl) tabEl.classList.add('active');
        const container = document.getElementById('reportContent');
        if (type === 'consolidated') container.innerHTML = this.reportConsolidated();
        else if (type === 'branch') container.innerHTML = this.reportBranchSummary();
        else if (type === 'daily_report') container.innerHTML = this.reportDailyReport();
        else if (type === 'customers') container.innerHTML = this.reportCrossBranchCustomers();
        else if (type === 'customer_ageing') container.innerHTML = this.reportCustomerAgeing();
        else if (type === 'wetstock') container.innerHTML = this.reportWetstockSummary();
        else if (type === 'expense_ledger') container.innerHTML = this.reportExpenseLedger();
        else if (type === 'profit_loss') container.innerHTML = this.reportProfitLoss();
    },

    reportConsolidated() {
        let totalRevenue = 0, totalVariance = 0, totalPmsVol = 0, totalAgoVol = 0;
        let branchData = [];

        this.data.branches.forEach(b => {
            let bRev = 0, bVar = 0, bPms = 0, bAgo = 0, bDays = 0;
            for (let d = 1; d <= this.DAYS_IN_MONTH; d++) {
                const ds = this.dateStr(d);
                const key = this.bk(b.id, ds);
                if (this.data.shiftDates[key]) {
                    bDays++;
                    const calc = this.calculateDate(b.id, ds);
                    bRev += calc.totalExpected;
                    bVar += calc.variance;
                    bPms += calc.pmsVolume;
                    bAgo += calc.agoVolume;
                }
            }
            totalRevenue += bRev;
            totalVariance += bVar;
            totalPmsVol += bPms;
            totalAgoVol += bAgo;
            branchData.push({ branch: b, revenue: bRev, variance: bVar, pmsVol: bPms, agoVol: bAgo, days: bDays });
        });

        let html = '<div class="sa-stats">';
        html += '<div class="sa-stat-card gold"><div class="stat-label">Total Revenue (All Branches)</div><div class="stat-value">UGX ' + this.fmtInt(totalRevenue) + '</div></div>';
        html += '<div class="sa-stat-card ' + (Math.abs(totalVariance) < 1 ? 'success' : 'danger') + '"><div class="stat-label">Total Variance</div><div class="stat-value">UGX ' + this.fmt(totalVariance) + '</div></div>';
        html += '<div class="sa-stat-card pms"><div class="stat-label">Total PMS Volume</div><div class="stat-value">' + this.fmt(totalPmsVol, 3) + ' L</div></div>';
        html += '<div class="sa-stat-card ago"><div class="stat-label">Total AGO Volume</div><div class="stat-value">' + this.fmt(totalAgoVol, 3) + ' L</div></div>';
        html += '</div>';

        html += '<div class="sa-section"><div class="sa-section-header yellow"><div class="sa-section-title">Branch Breakdown</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Branch</th><th class="text-right">PMS (L)</th><th class="text-right">AGO (L)</th><th class="text-right">Revenue (UGX)</th><th class="text-right">Variance</th><th>Days Entered</th></tr></thead><tbody>';

        branchData.forEach(bd => {
            const vClass = Math.abs(bd.variance) < 1 ? 'variance-zero' : 'variance-nonzero';
            html += '<tr>';
            html += '<td><strong>' + bd.branch.name + '</strong> <span class="sa-badge sa-badge-neutral">' + bd.branch.branch_code + '</span></td>';
            html += '<td class="text-right mono">' + this.fmt(bd.pmsVol, 3) + '</td>';
            html += '<td class="text-right mono">' + this.fmt(bd.agoVol, 3) + '</td>';
            html += '<td class="text-right mono text-bold">' + this.fmtInt(bd.revenue) + '</td>';
            html += '<td class="text-right mono ' + vClass + '">' + this.fmt(bd.variance) + '</td>';
            html += '<td>' + bd.days + ' / ' + this.DAYS_IN_MONTH + '</td>';
            html += '</tr>';
        });

        html += '<tr class="total-row"><td class="text-bold">ALL BRANCHES</td>';
        html += '<td class="text-right mono text-bold">' + this.fmt(totalPmsVol, 3) + '</td>';
        html += '<td class="text-right mono text-bold">' + this.fmt(totalAgoVol, 3) + '</td>';
        html += '<td class="text-right mono text-bold">' + this.fmtInt(totalRevenue) + '</td>';
        html += '<td class="text-right mono text-bold ' + (Math.abs(totalVariance) < 1 ? 'variance-zero' : 'variance-nonzero') + '">' + this.fmt(totalVariance) + '</td>';
        html += '<td></td></tr>';
        html += '</tbody></table></div></div></div>';
        return html;
    },

    reportBranchSummary() {
        if (!this.currentBranch) return '<div class="sa-empty"><h3>Select a branch to view its summary</h3></div>';
        const bid = this.currentBranch.id;

        let html = '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">' + this.currentBranch.name + ' &mdash; Daily Summary</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Date</th><th class="text-right">PMS (L)</th><th class="text-right">AGO (L)</th><th class="text-right">Expected</th><th class="text-right">Collections</th><th class="text-right">Variance</th></tr></thead><tbody>';

        let mRev = 0, mVar = 0;
        for (let d = 1; d <= this.DAYS_IN_MONTH; d++) {
            const ds = this.dateStr(d);
            const key = this.bk(bid, ds);
            if (this.data.shiftDates[key]) {
                const calc = this.calculateDate(bid, ds);
                const collections = calc.cashInHand + calc.momopay + calc.mpesa + calc.airtelMoney + calc.dollar + calc.flexipay + calc.totalExpenses + calc.totalDiscount + calc.totalShortages + calc.totalCreditSales;
                mRev += calc.totalExpected;
                mVar += calc.variance;
                const vClass = Math.abs(calc.variance) < 0.01 ? 'variance-zero' : 'variance-nonzero';

                html += '<tr style="cursor:pointer;" onclick="SA.currentDate=\'' + ds + '\';SA.navigate(\'shift_entry\')">';
                html += '<td>' + this.formatDate(ds) + '</td>';
                html += '<td class="text-right mono">' + this.fmt(calc.pmsVolume, 3) + '</td>';
                html += '<td class="text-right mono">' + this.fmt(calc.agoVolume, 3) + '</td>';
                html += '<td class="text-right mono">' + this.fmtInt(calc.totalExpected) + '</td>';
                html += '<td class="text-right mono">' + this.fmtInt(collections) + '</td>';
                html += '<td class="text-right mono ' + vClass + '">' + this.fmt(calc.variance) + '</td>';
                html += '</tr>';
            }
        }

        html += '<tr class="total-row"><td class="text-bold">MONTH TOTAL</td><td></td><td></td>';
        html += '<td class="text-right mono text-bold">' + this.fmtInt(mRev) + '</td><td></td>';
        html += '<td class="text-right mono text-bold ' + (Math.abs(mVar) < 1 ? 'variance-zero' : 'variance-nonzero') + '">' + this.fmt(mVar) + '</td></tr>';
        html += '</tbody></table></div></div></div>';
        return html;
    },

    // ============================================================
    // EXPENSE LEDGER REPORT — GL-style expense accounts
    // ============================================================

    // Standard expense account chart
    EXPENSE_ACCOUNTS: [
        { code: '5010', name: 'Fuel & Transport', keywords: ['fuel', 'transport', 'petrol', 'diesel', 'boda', 'taxi', 'travel'] },
        { code: '5020', name: 'Office Supplies & Stationery', keywords: ['office', 'stationery', 'printing', 'paper', 'pen', 'ink', 'toner'] },
        { code: '5030', name: 'Meals & Refreshments', keywords: ['meal', 'food', 'lunch', 'tea', 'water', 'drink', 'soda', 'refreshment', 'breakfast', 'dinner'] },
        { code: '5040', name: 'Repairs & Maintenance', keywords: ['repair', 'maintenance', 'fix', 'plumber', 'electrician', 'service', 'pump repair'] },
        { code: '5050', name: 'Cleaning & Sanitation', keywords: ['clean', 'soap', 'detergent', 'sanitation', 'broom', 'mopping', 'garbage', 'waste'] },
        { code: '5060', name: 'Utilities & Communication', keywords: ['electricity', 'water bill', 'airtime', 'data', 'internet', 'phone', 'umeme'] },
        { code: '5070', name: 'Security', keywords: ['security', 'guard', 'watchman'] },
        { code: '5080', name: 'Medical & First Aid', keywords: ['medical', 'medicine', 'first aid', 'clinic', 'hospital', 'doctor'] },
        { code: '5090', name: 'Staff Welfare', keywords: ['salary advance', 'salary payment', 'staff', 'welfare', 'allowance', 'bonus', 'loan'] },
        { code: '5100', name: 'Rent & Premises', keywords: ['rent', 'premises', 'lease'] },
        { code: '5900', name: 'Miscellaneous Expenses', keywords: [] }
    ],

    // Map petty cash categories to GL accounts
    _pettyCashCategoryToAccount: {
        'Transport & Fuel': '5010',
        'Office Supplies': '5020',
        'Stationery & Printing': '5020',
        'Meals & Refreshments': '5030',
        'Repairs & Maintenance': '5040',
        'Cleaning & Sanitation': '5050',
        'Utilities': '5060',
        'Communication (Airtime)': '5060',
        'Medical & First Aid': '5080',
        'Miscellaneous': '5900'
    },

    // Get all expense accounts (defaults + custom), with Miscellaneous always last
    getExpenseAccounts() {
        const defaults = this.EXPENSE_ACCOUNTS.filter(a => a.code !== '5900');
        const custom = (this.data.customExpenseAccounts || []);
        const misc = this.EXPENSE_ACCOUNTS.find(a => a.code === '5900');
        return [...defaults, ...custom, misc];
    },

    // Classify an expense into a GL account — uses explicit category if set, else keyword match
    _classifyExpense(description, category) {
        const allAccounts = this.getExpenseAccounts();
        // If a category code was explicitly chosen, use it directly
        if (category && allAccounts.some(a => a.code === category)) return category;
        if (!description) return '5900';
        const lower = description.toLowerCase();
        for (const acct of allAccounts) {
            if (acct.code === '5900') continue;
            for (const kw of (acct.keywords || [])) {
                if (lower.includes(kw)) return acct.code;
            }
        }
        return '5900'; // Miscellaneous
    },

    // Build all expense entries for the selected scope (branch or all branches)
    _buildExpenseLedgerData(branchId) {
        const month = this.MONTH;
        const entries = []; // { date, description, amount, source, account_code, branch_name }

        const branches = branchId
            ? [this.data.branches.find(b => String(b.id) === String(branchId))]
            : this.data.branches;

        branches.forEach(branch => {
            if (!branch) return;
            const bid = branch.id;

            // 1. Daily shift expenses
            for (let d = 1; d <= this.DAYS_IN_MONTH; d++) {
                const ds = this.dateStr(d);
                const key = this.bk(bid, ds);
                const exps = this.data.expenses[key] || [];
                exps.forEach(e => {
                    const amt = this.parseNum(e.amount);
                    if (amt <= 0) return;
                    entries.push({
                        date: ds,
                        description: e.description || 'Expense',
                        amount: amt,
                        source: 'shift',
                        account_code: this._classifyExpense(e.description, e.category),
                        branch_id: bid,
                        branch_name: branch.name
                    });
                });
            }

            // 2. Petty cash expenses for this branch in this month
            this.data.pettyCashEntries
                .filter(e => e.branch_id === bid && e.entry_type === 'expense' && e.date && e.date.startsWith(month))
                .forEach(e => {
                    const amt = this.parseNum(e.amount);
                    if (amt <= 0) return;
                    const acctCode = this._pettyCashCategoryToAccount[e.category] || this._classifyExpense(e.description);
                    entries.push({
                        date: e.date,
                        description: e.description || e.category,
                        amount: amt,
                        source: 'petty_cash',
                        category: e.category,
                        account_code: acctCode,
                        branch_id: bid,
                        branch_name: branch.name
                    });
                });
        });

        return entries;
    },

    reportExpenseLedger() {
        const bid = this.currentBranch ? this.currentBranch.id : null;
        const entries = this._buildExpenseLedgerData(bid);

        // Group by account code
        const accountTotals = {};
        const accountEntries = {};
        entries.forEach(e => {
            const code = e.account_code;
            accountTotals[code] = (accountTotals[code] || 0) + e.amount;
            if (!accountEntries[code]) accountEntries[code] = [];
            accountEntries[code].push(e);
        });

        const grandTotal = entries.reduce((s, e) => s + e.amount, 0);
        const scopeLabel = bid ? this.currentBranch.name : 'All Branches';

        let html = '';

        // Drill-down view
        if (this._expLedgerDrillAccount) {
            const acct = this.getExpenseAccounts().find(a => a.code === this._expLedgerDrillAccount);
            const acctName = acct ? acct.name : 'Unknown';
            const acctCode = this._expLedgerDrillAccount;
            const drillEntries = (accountEntries[acctCode] || []).sort((a, b) => {
                if (a.date === b.date) return a.description < b.description ? -1 : 1;
                return a.date < b.date ? -1 : 1;
            });
            const drillTotal = drillEntries.reduce((s, e) => s + e.amount, 0);

            html += '<div style="margin-bottom:16px;">'
                + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA._expLedgerDrillAccount=null;SA.showReport(\'expense_ledger\')">&laquo; Back to Account List</button>'
                + '</div>';

            html += '<div class="sa-section"><div class="sa-section-header red">'
                + '<div class="sa-section-title"><span class="sa-badge sa-badge-neutral" style="font-family:var(--sa-font-mono);margin-right:8px;">' + acctCode + '</span>' + acctName + '</div>'
                + '</div>';

            // Summary
            html += '<div class="sa-section-body">';
            html += '<div class="sa-stats" style="margin-bottom:16px;">';
            html += '<div class="sa-stat-card danger"><div class="stat-label">Total for ' + this.monthLabel() + '</div><div class="stat-value">UGX ' + this.fmtInt(drillTotal) + '</div><div class="stat-sub">' + drillEntries.length + ' transaction(s)</div></div>';

            // Daily average
            const uniqueDays = [...new Set(drillEntries.map(e => e.date))];
            const dailyAvg = uniqueDays.length > 0 ? drillTotal / uniqueDays.length : 0;
            html += '<div class="sa-stat-card info"><div class="stat-label">Daily Average</div><div class="stat-value">UGX ' + this.fmtInt(dailyAvg) + '</div><div class="stat-sub">' + uniqueDays.length + ' active day(s)</div></div>';

            // As % of total expenses
            const pctOfTotal = grandTotal > 0 ? (drillTotal / grandTotal * 100) : 0;
            html += '<div class="sa-stat-card gold"><div class="stat-label">Share of Total Expenses</div><div class="stat-value">' + this.fmt(pctOfTotal, 1) + '%</div><div class="stat-sub">of UGX ' + this.fmtInt(grandTotal) + '</div></div>';
            html += '</div>';

            // Daily breakdown table
            html += '<div class="sa-table-wrap"><table class="sa-table">';
            html += '<thead><tr><th>Date</th><th>Description</th>' + (!bid ? '<th>Branch</th>' : '') + '<th>Source</th><th class="text-right">Amount (UGX)</th></tr></thead><tbody>';

            let currentDate = null;
            let dayTotal = 0;
            drillEntries.forEach((e, idx) => {
                // Day separator with subtotal
                if (currentDate && currentDate !== e.date) {
                    html += '<tr style="background:rgba(59,130,246,0.04);"><td colspan="' + (bid ? 3 : 4) + '" class="text-right" style="font-size:0.78rem;font-weight:600;color:var(--sa-text-dim);">Day Total</td>'
                        + '<td class="text-right mono text-bold" style="font-size:0.78rem;">' + this.fmtInt(dayTotal) + '</td></tr>';
                    dayTotal = 0;
                }
                currentDate = e.date;
                dayTotal += e.amount;

                const sourceLabel = e.source === 'petty_cash'
                    ? '<span class="sa-badge sa-badge-warning" style="font-size:0.65rem;">Petty Cash</span>'
                    : '<span class="sa-badge sa-badge-info" style="font-size:0.65rem;">Shift Expense</span>';

                html += '<tr>';
                html += '<td style="white-space:nowrap;">' + this.formatDate(e.date) + '</td>';
                html += '<td>' + e.description + '</td>';
                if (!bid) html += '<td><span class="sa-badge sa-badge-neutral">' + e.branch_name + '</span></td>';
                html += '<td>' + sourceLabel + '</td>';
                html += '<td class="text-right mono text-danger">' + this.fmtInt(e.amount) + '</td>';
                html += '</tr>';
            });

            // Last day subtotal
            if (currentDate && dayTotal > 0) {
                html += '<tr style="background:rgba(59,130,246,0.04);"><td colspan="' + (bid ? 3 : 4) + '" class="text-right" style="font-size:0.78rem;font-weight:600;color:var(--sa-text-dim);">Day Total</td>'
                    + '<td class="text-right mono text-bold" style="font-size:0.78rem;">' + this.fmtInt(dayTotal) + '</td></tr>';
            }

            if (drillEntries.length === 0) {
                html += '<tr><td colspan="' + (bid ? 4 : 5) + '" class="text-center text-muted" style="padding:30px;">No expenses in this account for ' + this.monthLabel() + '.</td></tr>';
            }

            // Grand total
            html += '<tr class="total-row"><td colspan="' + (bid ? 3 : 4) + '" class="text-bold">ACCOUNT TOTAL</td>';
            html += '<td class="text-right mono text-bold text-danger">' + this.fmtInt(drillTotal) + '</td></tr>';

            html += '</tbody></table></div></div></div>';
            return html;
        }

        // === ACCOUNT LIST VIEW (Chart of Expense Accounts) ===

        // Scope selector
        html += '<div class="sa-section" style="margin-bottom:16px;"><div class="sa-section-body" style="padding:12px 20px;">'
            + '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">'
            + '<span style="font-size:0.78rem;font-weight:600;color:var(--sa-text-dim);">SCOPE:</span>'
            + '<span style="font-size:0.85rem;font-weight:600;">' + scopeLabel + ' &mdash; ' + this.monthLabel() + '</span>'
            + '<span class="text-muted" style="font-size:0.78rem;">(Select a branch from the top bar to filter, or deselect for all branches)</span>'
            + '</div></div></div>';

        // Summary cards
        html += '<div class="sa-stats">';
        html += '<div class="sa-stat-card danger"><div class="stat-label">Total Expenses</div><div class="stat-value">UGX ' + this.fmtInt(grandTotal) + '</div><div class="stat-sub">' + entries.length + ' transaction(s)</div></div>';
        const activeAccounts = Object.keys(accountTotals).length;
        const allAccounts = this.getExpenseAccounts();
        html += '<div class="sa-stat-card info"><div class="stat-label">Active Accounts</div><div class="stat-value">' + activeAccounts + '</div><div class="stat-sub">of ' + allAccounts.length + ' accounts</div></div>';

        // Top expense category
        if (activeAccounts > 0) {
            const topCode = Object.entries(accountTotals).sort((a, b) => b[1] - a[1])[0];
            const topAcct = allAccounts.find(a => a.code === topCode[0]);
            html += '<div class="sa-stat-card warning"><div class="stat-label">Highest Category</div><div class="stat-value">' + (topAcct ? topAcct.name : topCode[0]) + '</div><div class="stat-sub">UGX ' + this.fmtInt(topCode[1]) + '</div></div>';
        }
        html += '</div>';

        // Account list table (clickable rows)
        const customCodes = (this.data.customExpenseAccounts || []).map(a => a.code);
        html += '<div class="sa-section"><div class="sa-section-header red"><div class="sa-section-title">Expense Accounts (Chart of Accounts)</div></div>';
        html += '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Code</th><th>Account Name</th><th>Keywords</th><th class="text-right">Txns</th><th class="text-right">Amount (UGX)</th><th class="text-right">%</th><th>Distribution</th><th></th></tr></thead><tbody>';

        // Sort accounts by total descending, but show all accounts
        const sortedAccounts = allAccounts.map(acct => ({
            ...acct,
            total: accountTotals[acct.code] || 0,
            count: (accountEntries[acct.code] || []).length
        })).sort((a, b) => b.total - a.total);

        sortedAccounts.forEach(acct => {
            const pct = grandTotal > 0 ? (acct.total / grandTotal * 100) : 0;
            const hasData = acct.total > 0;
            const isCustom = customCodes.includes(acct.code);
            const rowStyle = hasData ? 'cursor:pointer;' : (isCustom ? '' : 'opacity:0.5;');
            const onclick = hasData ? 'onclick="SA._expLedgerDrillAccount=\'' + acct.code + '\';SA.showReport(\'expense_ledger\')"' : '';

            html += '<tr style="' + rowStyle + '" ' + onclick + '>';
            html += '<td><span style="font-family:var(--sa-font-mono);font-weight:600;color:var(--sa-text-dim);">' + acct.code + '</span>'
                + (isCustom ? ' <span class="sa-badge sa-badge-info" style="font-size:0.6rem;">Custom</span>' : '') + '</td>';
            html += '<td><strong>' + acct.name + '</strong></td>';
            html += '<td style="font-size:0.72rem;color:var(--sa-text-dim);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'
                + ((acct.keywords || []).length > 0 ? acct.keywords.join(', ') : '<span class="text-muted">&mdash;</span>') + '</td>';
            html += '<td class="text-right mono">' + (acct.count > 0 ? acct.count : '<span class="text-muted">&mdash;</span>') + '</td>';
            html += '<td class="text-right mono ' + (hasData ? 'text-danger' : 'text-muted') + '" style="font-weight:' + (hasData ? '700' : '400') + ';">' + (hasData ? this.fmtInt(acct.total) : '&mdash;') + '</td>';
            html += '<td class="text-right mono">' + (hasData ? this.fmt(pct, 1) + '%' : '&mdash;') + '</td>';
            html += '<td style="min-width:100px;">';
            if (hasData) {
                html += '<div style="background:rgba(239,68,68,0.1);border-radius:4px;height:18px;width:100%;position:relative;">'
                    + '<div style="background:var(--sa-danger);height:100%;border-radius:4px;width:' + Math.max(pct, 1) + '%;"></div></div>';
            }
            html += '</td>';
            html += '<td style="white-space:nowrap;">';
            if (hasData) html += '<span style="font-size:0.75rem;color:var(--sa-primary);margin-right:6px;">View &rarr;</span>';
            if (isCustom) {
                html += '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="event.stopPropagation();SA.editExpenseAccount(\'' + acct.code + '\')" style="padding:2px 6px;font-size:0.7rem;">Edit</button>'
                    + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="event.stopPropagation();SA.deleteExpenseAccount(\'' + acct.code + '\')" style="padding:2px 6px;font-size:0.7rem;color:var(--sa-danger);">Del</button>';
            }
            html += '</td>';
            html += '</tr>';
        });

        // Grand total row
        html += '<tr class="total-row"><td></td><td class="text-bold">TOTAL EXPENSES</td><td></td>';
        html += '<td class="text-right mono text-bold">' + entries.length + '</td>';
        html += '<td class="text-right mono text-bold text-danger">' + this.fmtInt(grandTotal) + '</td>';
        html += '<td class="text-right mono text-bold">100%</td><td></td><td></td></tr>';

        html += '</tbody></table></div>';

        // Add Expense Group button
        html += '<div style="padding:16px 20px;">'
            + '<button class="sa-btn sa-btn-primary sa-btn-sm" onclick="SA.showAddExpenseAccount()">+ Add Expense Group</button>'
            + '</div>';

        html += '</div></div>';

        return html;
    },

    // Navigate from Expenses page to Expense Ledger drill-down for a specific account
    viewExpenseAccount(code) {
        this._expLedgerDrillAccount = code;
        this.navigate('reports');
        // After navigating to reports, switch to expense ledger tab
        setTimeout(() => {
            this.showReport('expense_ledger');
            // Highlight the Expense Ledger tab
            document.querySelectorAll('.sa-tab').forEach(t => {
                t.classList.toggle('active', t.textContent.trim() === 'Expense Ledger');
            });
        }, 50);
    },

    // --- Expense Account Management ---
    showAddExpenseAccount() {
        const existing = this.getExpenseAccounts();
        // Auto-generate next code
        const codes = existing.map(a => parseInt(a.code)).filter(n => !isNaN(n) && n < 5900);
        const nextCode = codes.length > 0 ? Math.max(...codes) + 10 : 5110;
        const suggestedCode = nextCode < 5900 ? String(nextCode) : String(5000 + existing.length * 10);

        const html = '<div class="sa-form-group"><label>Account Code</label>'
            + '<input class="sa-input mono" id="eaCode" value="' + suggestedCode + '" placeholder="e.g. 5110" maxlength="6"></div>'
            + '<div class="sa-form-group"><label>Account Name</label>'
            + '<input class="sa-input" id="eaName" placeholder="e.g. Loading & Offloading"></div>'
            + '<div class="sa-form-group"><label>Keywords <span class="text-muted" style="font-size:0.72rem;">(comma-separated, for auto-classification)</span></label>'
            + '<input class="sa-input" id="eaKeywords" placeholder="e.g. loading, offloading, labour"></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveNewExpenseAccount()">Save Account</button></div>';
        this.openModal('Add Expense Group', html);
    },

    saveNewExpenseAccount() {
        const code = (document.getElementById('eaCode').value || '').trim();
        const name = (document.getElementById('eaName').value || '').trim();
        const keywordsRaw = (document.getElementById('eaKeywords').value || '').trim();

        if (!code || !name) { this.toast('Code and Name are required', 'error'); return; }
        // Check for duplicates
        if (this.getExpenseAccounts().some(a => a.code === code)) {
            this.toast('Account code ' + code + ' already exists', 'error'); return;
        }

        const keywords = keywordsRaw ? keywordsRaw.split(',').map(k => k.trim().toLowerCase()).filter(k => k) : [];
        if (!this.data.customExpenseAccounts) this.data.customExpenseAccounts = [];
        this.data.customExpenseAccounts.push({ code: code, name: name, keywords: keywords });
        this.saveData();
        this.closeModal();
        this.toast('Expense group "' + name + '" added', 'success');
        this.showReport('expense_ledger');
    },

    editExpenseAccount(code) {
        const acct = (this.data.customExpenseAccounts || []).find(a => a.code === code);
        if (!acct) return;

        const html = '<div class="sa-form-group"><label>Account Code</label>'
            + '<input class="sa-input mono" id="eaCode" value="' + acct.code + '" disabled style="opacity:0.6;"></div>'
            + '<div class="sa-form-group"><label>Account Name</label>'
            + '<input class="sa-input" id="eaName" value="' + acct.name + '"></div>'
            + '<div class="sa-form-group"><label>Keywords <span class="text-muted" style="font-size:0.72rem;">(comma-separated)</span></label>'
            + '<input class="sa-input" id="eaKeywords" value="' + (acct.keywords || []).join(', ') + '"></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveEditExpenseAccount(\'' + code + '\')">Update Account</button></div>';
        this.openModal('Edit Expense Group', html);
    },

    saveEditExpenseAccount(code) {
        const acct = (this.data.customExpenseAccounts || []).find(a => a.code === code);
        if (!acct) return;

        const name = (document.getElementById('eaName').value || '').trim();
        const keywordsRaw = (document.getElementById('eaKeywords').value || '').trim();
        if (!name) { this.toast('Name is required', 'error'); return; }

        acct.name = name;
        acct.keywords = keywordsRaw ? keywordsRaw.split(',').map(k => k.trim().toLowerCase()).filter(k => k) : [];
        this.saveData();
        this.closeModal();
        this.toast('Expense group "' + name + '" updated', 'success');
        this.showReport('expense_ledger');
    },

    deleteExpenseAccount(code) {
        const acct = (this.data.customExpenseAccounts || []).find(a => a.code === code);
        if (!acct) return;
        if (!confirm('Delete expense group "' + acct.name + '" (' + code + ')?\n\nExisting expenses tagged with this code will be reclassified as Miscellaneous.')) return;

        this.data.customExpenseAccounts = this.data.customExpenseAccounts.filter(a => a.code !== code);
        this.saveData();
        this.toast('Expense group deleted', 'success');
        this.showReport('expense_ledger');
    },

    // ============================================================
    // PROFIT & LOSS REPORT
    // Sources: calculateDate (revenue), fuelDeliveries (COGS),
    //   expense ledger (operating), payroll (staff), goods issues
    // ============================================================
    reportProfitLoss() {
        const month = this.MONTH;
        const self = this;
        const branches = this.currentBranch ? [this.currentBranch] : this.data.branches;
        const scopeLabel = this.currentBranch ? this.currentBranch.name : 'All Branches';

        // ===== 1. REVENUE — from pump readings (calculateDate) =====
        let totalPmsVolume = 0, totalAgoVolume = 0;
        let totalPmsRevenue = 0, totalAgoRevenue = 0;
        let totalDiscounts = 0;
        let daysEntered = 0;

        branches.forEach(function(b) {
            for (var d = 1; d <= self.DAYS_IN_MONTH; d++) {
                var ds = self.dateStr(d);
                var key = self.bk(b.id, ds);
                if (self.data.shiftDates[key]) {
                    daysEntered++;
                    var calc = self.calculateDate(b.id, ds);
                    totalPmsVolume += calc.pmsVolume;
                    totalAgoVolume += calc.agoVolume;
                    totalPmsRevenue += calc.pmsValue;
                    totalAgoRevenue += calc.agoValue;
                    totalDiscounts += calc.totalDiscount;
                }
            }
        });

        var grossRevenue = totalPmsRevenue + totalAgoRevenue;
        var netRevenue = grossRevenue - totalDiscounts;

        // ===== 2. COST OF GOODS SOLD — from fuel deliveries =====
        // Compute average cost per litre from deliveries this month
        // Uses Option A fallback: uncosted deliveries use last known cost as provisional estimate
        var pmsCostQty = 0, pmsCostTotal = 0;
        var agoCostQty = 0, agoCostTotal = 0;
        var hasUncostDeliveries = false;

        branches.forEach(function(b) {
            self.data.fuelDeliveries.filter(function(fd) {
                return fd.branch_id === b.id && fd.delivery_date && fd.delivery_date.startsWith(month) && !fd.is_deleted;
            }).forEach(function(fd) {
                var qty = self.parseNum(fd.loaded_qty);
                var rate = self._getDeliveryCost(fd);
                if (!self._isDeliveryCosted(fd)) hasUncostDeliveries = true;
                if (fd.product_type === 'PMS') {
                    pmsCostQty += qty;
                    pmsCostTotal += qty * rate;
                } else if (fd.product_type === 'AGO') {
                    agoCostQty += qty;
                    agoCostTotal += qty * rate;
                }
            });
        });

        var avgPmsCost = pmsCostQty > 0 ? pmsCostTotal / pmsCostQty : 0;
        var avgAgoCost = agoCostQty > 0 ? agoCostTotal / agoCostQty : 0;
        var pmsCOGS = totalPmsVolume * avgPmsCost;
        var agoCOGS = totalAgoVolume * avgAgoCost;
        var totalCOGS = pmsCOGS + agoCOGS;
        var hasCostData = (pmsCostQty > 0 || agoCostQty > 0);
        var grossProfit = netRevenue - totalCOGS;
        var grossMargin = netRevenue > 0 ? ((grossProfit / netRevenue) * 100).toFixed(1) : '0.0';

        // ===== 3. OPERATING EXPENSES — from expense ledger =====
        var expenseEntries = this._buildExpenseLedgerData(this.currentBranch ? this.currentBranch.id : null);
        var expenseByAccount = {};
        var totalOperatingExpenses = 0;
        expenseEntries.forEach(function(e) {
            var code = e.account_code;
            if (!expenseByAccount[code]) expenseByAccount[code] = { amount: 0, count: 0 };
            expenseByAccount[code].amount += e.amount;
            expenseByAccount[code].count++;
            totalOperatingExpenses += e.amount;
        });

        // ===== 4. PUMP SHORTAGES — losses =====
        var totalShortages = 0;
        branches.forEach(function(b) {
            for (var d = 1; d <= self.DAYS_IN_MONTH; d++) {
                var ds = self.dateStr(d);
                var key = self.bk(b.id, ds);
                if (self.data.shiftDates[key]) {
                    totalShortages += self.calcTotalShortages(b.id, ds);
                }
            }
        });

        // ===== 5. GOODS ISSUE COSTS — internal use =====
        var totalGoodsIssueCost = 0;
        var goodsIssueCount = 0;
        branches.forEach(function(b) {
            for (var d = 1; d <= self.DAYS_IN_MONTH; d++) {
                var ds = self.dateStr(d);
                var key = self.bk(b.id, ds);
                var gis = self._activeRecords(self.data.goodsIssues[key] || []);
                gis.forEach(function(g) {
                    totalGoodsIssueCost += self.parseNum(g.volume) * self.parseNum(g.rate);
                    goodsIssueCount++;
                });
            }
        });

        // ===== 6. STAFF COSTS — from payroll =====
        var totalGrossSalaries = 0;
        var totalNSSFEmployer = 0;
        var activeEmployees = (this.data.employees || []).filter(function(e) { return e.status !== 'terminated'; });
        activeEmployees.forEach(function(e) {
            var gross = self.parseNum(e.gross_salary);
            totalGrossSalaries += gross;
            totalNSSFEmployer += self.calcNSSF(gross).employer;
        });
        var totalStaffCosts = totalGrossSalaries + totalNSSFEmployer;

        // ===== TOTALS =====
        var totalExpenses = totalCOGS + totalOperatingExpenses + totalShortages + totalGoodsIssueCost + totalStaffCosts;
        var netIncome = netRevenue - totalCOGS - totalOperatingExpenses - totalShortages - totalGoodsIssueCost - totalStaffCosts;
        var netMargin = netRevenue > 0 ? ((netIncome / netRevenue) * 100).toFixed(1) : '0.0';

        // ===== BUILD HTML =====
        var html = '';

        // --- Summary Cards ---
        html += '<div class="sa-stats">';
        html += '<div class="sa-stat-card gold"><div class="stat-label">Net Revenue</div><div class="stat-value">UGX ' + this.fmtInt(netRevenue) + '</div><div class="stat-sub">' + daysEntered + ' days &bull; ' + this.fmt(totalPmsVolume + totalAgoVolume, 0) + ' L sold</div></div>';
        html += '<div class="sa-stat-card ' + (grossProfit >= 0 ? 'success' : 'danger') + '"><div class="stat-label">Gross Profit</div><div class="stat-value">UGX ' + this.fmtInt(grossProfit) + '</div><div class="stat-sub">' + grossMargin + '% margin' + (!hasCostData ? ' (no cost data)' : '') + '</div></div>';
        html += '<div class="sa-stat-card danger"><div class="stat-label">Total Expenses</div><div class="stat-value">UGX ' + this.fmtInt(totalExpenses) + '</div><div class="stat-sub">COGS + Opex + Staff</div></div>';
        html += '<div class="sa-stat-card ' + (netIncome >= 0 ? 'success' : 'danger') + '"><div class="stat-label">Net Income</div><div class="stat-value">UGX ' + this.fmtInt(netIncome) + '</div><div class="stat-sub">' + netMargin + '% net margin</div></div>';
        html += '</div>';

        // --- P&L Statement ---
        html += '<div class="sa-section"><div class="sa-section-header"><div class="sa-section-title">Profit & Loss Statement &mdash; ' + this.monthLabel() + '</div><div class="sa-section-subtitle">' + scopeLabel + '</div></div>';
        html += '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table sa-pl-table">';
        html += '<thead><tr><th>Description</th><th class="text-right">Details</th><th class="text-right">Amount (UGX)</th></tr></thead><tbody>';

        // --- REVENUE SECTION ---
        html += '<tr class="sa-pl-section"><td colspan="3">REVENUE</td></tr>';
        if (totalPmsRevenue > 0) {
            html += '<tr class="sa-pl-item"><td style="padding-left:24px;">PMS Sales Revenue</td><td class="text-right mono">' + this.fmt(totalPmsVolume, 0) + ' L &times; ' + this.fmtInt(totalPmsVolume > 0 ? totalPmsRevenue / totalPmsVolume : 0) + '/L</td><td class="text-right mono">' + this.fmtInt(totalPmsRevenue) + '</td></tr>';
        }
        if (totalAgoRevenue > 0) {
            html += '<tr class="sa-pl-item"><td style="padding-left:24px;">AGO Sales Revenue</td><td class="text-right mono">' + this.fmt(totalAgoVolume, 0) + ' L &times; ' + this.fmtInt(totalAgoVolume > 0 ? totalAgoRevenue / totalAgoVolume : 0) + '/L</td><td class="text-right mono">' + this.fmtInt(totalAgoRevenue) + '</td></tr>';
        }
        html += '<tr class="sa-pl-subtotal"><td>Gross Revenue</td><td></td><td class="text-right mono">' + this.fmtInt(grossRevenue) + '</td></tr>';

        if (totalDiscounts > 0) {
            html += '<tr class="sa-pl-item"><td style="padding-left:24px;">Less: Discounts Given</td><td class="text-right mono">' + '</td><td class="text-right mono text-danger">(' + this.fmtInt(totalDiscounts) + ')</td></tr>';
        }
        html += '<tr class="sa-pl-subtotal"><td>Net Revenue</td><td></td><td class="text-right mono text-bold">' + this.fmtInt(netRevenue) + '</td></tr>';

        // --- COGS SECTION ---
        html += '<tr class="sa-pl-section"><td colspan="3">COST OF GOODS SOLD' + (hasUncostDeliveries ? ' <span style="font-size:0.7rem;color:var(--sa-warning);font-weight:normal;">&#9888; Provisional — some deliveries pending costing</span>' : '') + '</td></tr>';
        if (!hasCostData) {
            html += '<tr class="sa-pl-item"><td style="padding-left:24px;" colspan="2"><em style="color:var(--sa-text-dim);">No fuel deliveries recorded this month &mdash; record deliveries to see COGS</em></td><td class="text-right mono">&mdash;</td></tr>';
        } else {
            if (avgPmsCost > 0 && totalPmsVolume > 0) {
                html += '<tr class="sa-pl-item"><td style="padding-left:24px;">PMS Cost of Sales</td><td class="text-right mono">' + this.fmt(totalPmsVolume, 0) + ' L &times; ' + this.fmtInt(avgPmsCost) + '/L</td><td class="text-right mono">(' + this.fmtInt(pmsCOGS) + ')</td></tr>';
            }
            if (avgAgoCost > 0 && totalAgoVolume > 0) {
                html += '<tr class="sa-pl-item"><td style="padding-left:24px;">AGO Cost of Sales</td><td class="text-right mono">' + this.fmt(totalAgoVolume, 0) + ' L &times; ' + this.fmtInt(avgAgoCost) + '/L</td><td class="text-right mono">(' + this.fmtInt(agoCOGS) + ')</td></tr>';
            }
        }
        html += '<tr class="sa-pl-subtotal"><td>Total COGS</td><td></td><td class="text-right mono">(' + this.fmtInt(totalCOGS) + ')</td></tr>';

        // --- GROSS PROFIT ---
        var gpClass = grossProfit >= 0 ? 'sa-pl-positive' : 'sa-pl-negative';
        html += '<tr class="sa-pl-gross ' + gpClass + '"><td>GROSS PROFIT</td><td class="text-right mono">' + grossMargin + '%</td><td class="text-right mono">' + this.fmtInt(grossProfit) + '</td></tr>';

        // --- OPERATING EXPENSES ---
        html += '<tr class="sa-pl-section"><td colspan="3">OPERATING EXPENSES</td></tr>';
        var allAccounts = this.getExpenseAccounts();
        var opexDisplayed = false;
        allAccounts.forEach(function(acct) {
            var data = expenseByAccount[acct.code];
            if (data && data.amount > 0) {
                opexDisplayed = true;
                html += '<tr class="sa-pl-item"><td style="padding-left:24px;">' + acct.code + ' &mdash; ' + acct.name + '</td><td class="text-right mono">' + data.count + ' entries</td><td class="text-right mono">(' + self.fmtInt(data.amount) + ')</td></tr>';
            }
        });
        if (!opexDisplayed) {
            html += '<tr class="sa-pl-item"><td style="padding-left:24px;" colspan="2"><em style="color:var(--sa-text-dim);">No operating expenses recorded</em></td><td class="text-right mono">&mdash;</td></tr>';
        }
        html += '<tr class="sa-pl-subtotal"><td>Total Operating Expenses</td><td></td><td class="text-right mono">(' + this.fmtInt(totalOperatingExpenses) + ')</td></tr>';

        // --- PUMP SHORTAGES ---
        if (totalShortages > 0) {
            html += '<tr class="sa-pl-section"><td colspan="3">LOSSES</td></tr>';
            html += '<tr class="sa-pl-item"><td style="padding-left:24px;">Pump Shortages / Cash Differences</td><td></td><td class="text-right mono">(' + this.fmtInt(totalShortages) + ')</td></tr>';
        }

        // --- GOODS ISSUE (INTERNAL USE) ---
        if (totalGoodsIssueCost > 0) {
            if (totalShortages <= 0) html += '<tr class="sa-pl-section"><td colspan="3">OTHER COSTS</td></tr>';
            html += '<tr class="sa-pl-item"><td style="padding-left:24px;">Goods Issue / Internal Use (' + goodsIssueCount + ' issues)</td><td></td><td class="text-right mono">(' + this.fmtInt(totalGoodsIssueCost) + ')</td></tr>';
        }

        // --- STAFF COSTS ---
        html += '<tr class="sa-pl-section"><td colspan="3">STAFF COSTS (Monthly)</td></tr>';
        if (activeEmployees.length > 0) {
            html += '<tr class="sa-pl-item"><td style="padding-left:24px;">Gross Salaries (' + activeEmployees.length + ' employees)</td><td></td><td class="text-right mono">(' + this.fmtInt(totalGrossSalaries) + ')</td></tr>';
            html += '<tr class="sa-pl-item"><td style="padding-left:24px;">NSSF Employer Contribution (10%)</td><td></td><td class="text-right mono">(' + this.fmtInt(totalNSSFEmployer) + ')</td></tr>';
        } else {
            html += '<tr class="sa-pl-item"><td style="padding-left:24px;" colspan="2"><em style="color:var(--sa-text-dim);">No employees registered</em></td><td class="text-right mono">&mdash;</td></tr>';
        }
        html += '<tr class="sa-pl-subtotal"><td>Total Staff Costs</td><td></td><td class="text-right mono">(' + this.fmtInt(totalStaffCosts) + ')</td></tr>';

        // --- NET INCOME ---
        var niClass = netIncome >= 0 ? 'sa-pl-positive' : 'sa-pl-negative';
        html += '<tr class="sa-pl-net ' + niClass + '"><td>NET INCOME</td><td class="text-right mono">' + netMargin + '%</td><td class="text-right mono">' + this.fmtInt(netIncome) + '</td></tr>';

        html += '</tbody></table></div></div></div>';

        // --- Data Sources ---
        html += '<div class="sa-pl-sources">';
        html += '<strong>Data Sources:</strong> ';
        html += 'Revenue from <em>pump readings (' + daysEntered + ' shift days)</em> &bull; ';
        html += 'COGS from <em>fuel deliveries (' + (pmsCostQty + agoCostQty > 0 ? this.fmt(pmsCostQty + agoCostQty, 0) + ' L delivered' : 'none recorded') + ')</em> &bull; ';
        html += 'Expenses from <em>shift expenses + petty cash (' + expenseEntries.length + ' entries)</em> &bull; ';
        html += 'Staff from <em>payroll (' + activeEmployees.length + ' active employees)</em>';
        if (totalShortages > 0) html += ' &bull; Shortages from <em>pump shortage records</em>';
        if (totalGoodsIssueCost > 0) html += ' &bull; Goods issues from <em>' + goodsIssueCount + ' issue records</em>';
        html += '</div>';

        return html;
    },

    // ============================================================
    // BRANCH EDIT / DELETE / SETTINGS
    // ============================================================
    showEditBranch(branchId) {
        const b = this.data.branches.find(br => String(br.id) === String(branchId));
        if (!b) return;
        const html = '<div class="sa-form-group"><label>Branch Name</label><input class="sa-input" id="ebName" value="' + b.name + '"></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Branch Code</label><input class="sa-input" id="ebCode" value="' + b.branch_code + '" maxlength="5"></div>'
            + '<div class="sa-form-group"><label>Location</label><input class="sa-input" id="ebLoc" value="' + (b.location || '') + '"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>PMS Pumps (1-6)</label><input class="sa-input" id="ebPms" type="number" min="1" max="6" value="' + (b.pms_pumps || 6) + '"></div>'
            + '<div class="sa-form-group"><label>AGO Pumps (1-6)</label><input class="sa-input" id="ebAgo" type="number" min="1" max="6" value="' + (b.ago_pumps || 6) + '"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Manager Name</label><input class="sa-input" id="ebMgr" value="' + (b.manager_name || '') + '"></div>'
            + '<div class="sa-form-group"><label>Contact Phone</label><input class="sa-input" id="ebPhone" value="' + (b.contact_phone || '') + '"></div></div>'
            + '<div class="sa-form-group"><label>Active</label><select class="sa-input" id="ebActive"><option value="true"' + (b.is_active !== false ? ' selected' : '') + '>Active</option><option value="false"' + (b.is_active === false ? ' selected' : '') + '>Inactive</option></select></div>'
            + '<div style="border-top:1px dashed var(--sa-border-light);margin:12px 0;padding-top:12px;"><div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--sa-text-dim);margin-bottom:8px;">Stock Alert Thresholds</div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>PMS Low Stock Alert (Litres)</label><input class="sa-input mono" id="ebPmsLow" type="number" min="0" value="' + (b.pms_low_stock || 2000) + '" placeholder="2000"></div>'
            + '<div class="sa-form-group"><label>AGO Low Stock Alert (Litres)</label><input class="sa-input mono" id="ebAgoLow" type="number" min="0" value="' + (b.ago_low_stock || 2000) + '" placeholder="2000"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>PMS Reorder Point (Litres)</label><input class="sa-input mono" id="ebPmsReorder" type="number" min="0" value="' + (b.pms_reorder_point || 5000) + '" placeholder="5000"></div>'
            + '<div class="sa-form-group"><label>AGO Reorder Point (Litres)</label><input class="sa-input mono" id="ebAgoReorder" type="number" min="0" value="' + (b.ago_reorder_point || 5000) + '" placeholder="5000"></div></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-danger" onclick="SA.deleteBranch(\'' + branchId + '\')" style="margin-right:auto;">Delete Branch</button>'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveEditBranch(\'' + branchId + '\')">Save Changes</button></div>';
        this.openModal('Edit Branch — ' + b.name, html);
    },

    saveEditBranch(branchId) {
        const b = this.data.branches.find(br => String(br.id) === String(branchId));
        if (!b) return;
        const name = document.getElementById('ebName').value.trim();
        const code = document.getElementById('ebCode').value.trim().toUpperCase();
        if (!name || !code) { this.toast('Name and code required', 'error'); return; }
        if (this.data.branches.find(br => br.branch_code === code && String(br.id) !== String(branchId))) { this.toast('Branch code already exists', 'error'); return; }
        b.name = name;
        b.branch_code = code;
        b.location = document.getElementById('ebLoc').value.trim();
        b.pms_pumps = Math.min(6, Math.max(1, parseInt(document.getElementById('ebPms').value) || 6));
        b.ago_pumps = Math.min(6, Math.max(1, parseInt(document.getElementById('ebAgo').value) || 6));
        b.manager_name = document.getElementById('ebMgr').value.trim();
        b.contact_phone = document.getElementById('ebPhone').value.trim();
        b.is_active = document.getElementById('ebActive').value === 'true';
        b.pms_low_stock = this.parseNum(document.getElementById('ebPmsLow').value) || 2000;
        b.ago_low_stock = this.parseNum(document.getElementById('ebAgoLow').value) || 2000;
        b.pms_reorder_point = this.parseNum(document.getElementById('ebPmsReorder').value) || 5000;
        b.ago_reorder_point = this.parseNum(document.getElementById('ebAgoReorder').value) || 5000;
        this.saveData();
        if (this.currentBranch && String(this.currentBranch.id) === String(branchId)) {
            this.currentBranch = b;
            this.updateBranchDisplay();
        }
        this.renderBranchSelector();
        this.closeModal();
        this.toast('Branch "' + name + '" updated');
        this.navigate('branches');
    },

    deleteBranch(branchId) {
        if (!this.hasPermission('manage_branches')) { this.toast('Permission denied', 'error'); return; }
        const b = this.data.branches.find(br => String(br.id) === String(branchId));
        if (!b) return;
        if (!confirm('Are you sure you want to delete "' + b.name + '"? This cannot be undone and all branch data will be lost.')) return;
        this.auditLog('BRANCH_DELETED', 'Deleted branch: ' + b.name + ' (' + b.branch_code + ')');
        this.data.branches = this.data.branches.filter(br => String(br.id) !== String(branchId));
        // Clean up branch-scoped data
        Object.keys(this.data.shiftDates).forEach(k => { if (k.startsWith(branchId + '_')) delete this.data.shiftDates[k]; });
        Object.keys(this.data.pumpReadings).forEach(k => { if (k.startsWith(branchId + '_')) delete this.data.pumpReadings[k]; });
        Object.keys(this.data.creditSales).forEach(k => { if (k.startsWith(branchId + '_')) delete this.data.creditSales[k]; });
        Object.keys(this.data.expenses).forEach(k => { if (k.startsWith(branchId + '_')) delete this.data.expenses[k]; });
        Object.keys(this.data.payments).forEach(k => { if (k.startsWith(branchId + '_')) delete this.data.payments[k]; });
        Object.keys(this.data.discounts).forEach(k => { if (k.startsWith(branchId + '_')) delete this.data.discounts[k]; });
        Object.keys(this.data.pumpShortages).forEach(k => { if (k.startsWith(branchId + '_')) delete this.data.pumpShortages[k]; });
        Object.keys(this.data.goodsIssues).forEach(k => { if (k.startsWith(branchId + '_')) delete this.data.goodsIssues[k]; });
        this.data.customers = this.data.customers.filter(c => c.branch_id !== branchId);
        this.data.customerTransactions = this.data.customerTransactions.filter(t => {
            const cust = this.data.customers.find(c => c.id === t.customer_id);
            return cust; // only keep transactions with existing customers
        });
        if (this.currentBranch && String(this.currentBranch.id) === String(branchId)) {
            this.currentBranch = this.data.branches[0] || null;
            if (this.currentBranch) localStorage.setItem('sa_current_branch', this.currentBranch.id);
            this.updateBranchDisplay();
        }
        this.saveData();
        this.renderBranchSelector();
        this.closeModal();
        this.toast('Branch deleted');
        this.navigate('branches');
    },

    // ============================================================
    // STATEMENT PERIOD FILTERS & PRINT
    // ============================================================
    _stmtFilterFrom: null,
    _stmtFilterTo: null,
    _stmtFilterType: 'ALL',

    renderSingleStatementFiltered(el, customerId) {
        // Called from renderSingleStatement with filters applied
        this.renderSingleStatement(el, customerId);
    },

    applyStatementFilter() {
        const from = document.getElementById('stmtFrom') ? document.getElementById('stmtFrom').value : null;
        const to = document.getElementById('stmtTo') ? document.getElementById('stmtTo').value : null;
        const type = document.getElementById('stmtType') ? document.getElementById('stmtType').value : 'ALL';
        this._stmtFilterFrom = from || null;
        this._stmtFilterTo = to || null;
        this._stmtFilterType = type || 'ALL';
        this.navigate('customer_statements');
    },

    clearStatementFilter() {
        this._stmtFilterFrom = null;
        this._stmtFilterTo = null;
        this._stmtFilterType = 'ALL';
        this.navigate('customer_statements');
    },

    printStatement(customerId) {
        const cust = this.data.customers.find(c => c.id === customerId);
        if (!cust) return;
        const bal = this.getCustomerBalance(customerId);
        const txs = this.data.customerTransactions
            .filter(t => t.customer_id === customerId)
            .sort((a, b) => a.transaction_date < b.transaction_date ? -1 : 1);

        let rows = '';
        let runBal = this.parseNum(cust.opening_balance);
        rows += '<tr><td>Opening</td><td>Opening Balance</td><td></td><td></td><td style="text-align:right;font-weight:bold;">' + this.fmtInt(runBal) + '</td></tr>';
        txs.forEach(t => {
            const d = this.parseNum(t.debit_amount);
            const c = this.parseNum(t.credit_amount);
            runBal += d - c;
            rows += '<tr><td>' + this.formatDate(t.transaction_date) + '</td><td>' + t.description + '</td>'
                + '<td style="text-align:right;color:#c00;">' + (d > 0 ? this.fmtInt(d) : '') + '</td>'
                + '<td style="text-align:right;color:#090;">' + (c > 0 ? this.fmtInt(c) : '') + '</td>'
                + '<td style="text-align:right;font-weight:bold;">' + this.fmtInt(runBal) + '</td></tr>';
        });

        const w = window.open('', '_blank', 'width=800,height=600');
        w.document.write(this._receiptHTML('CUSTOMER STATEMENT',
            '<p><strong>Customer:</strong> ' + cust.name + (cust.phone ? ' | ' + cust.phone : '') + '</p>'
            + '<p><strong>Branch:</strong> ' + (this.currentBranch ? this.currentBranch.name : '') + '</p>'
            + '<p><strong>Period:</strong> ' + this.monthLabel() + '</p>',
            '<div style="text-align:right;margin-bottom:16px;"><div style="font-size:11px;color:#666;">CURRENT BALANCE</div>'
            + '<div style="font-size:24px;font-weight:bold;color:' + (bal > 0 ? '#c00' : '#090') + ';">UGX ' + this.fmtInt(Math.abs(bal)) + '</div>'
            + '<div style="font-size:11px;color:#666;">' + (bal > 0 ? 'Amount Owed' : bal < 0 ? 'Credit Balance' : 'Settled') + '</div></div>'
            + '<table><thead><tr><th>Date</th><th>Description</th><th style="text-align:right;">Debit</th><th style="text-align:right;">Credit</th><th style="text-align:right;">Balance</th></tr></thead><tbody>'
            + rows + '</tbody></table>'));
        w.document.close();
        setTimeout(() => w.print(), 300);
    },

    // ============================================================
    // RECEIPT / INVOICE GENERATION
    // ============================================================
    _receiptHTML(title, details, body) {
        // Build details HTML from string or array of [label, value] pairs
        let detailsHtml = '';
        if (typeof details === 'string') {
            detailsHtml = details;
        } else if (Array.isArray(details)) {
            details.forEach(function(d) { detailsHtml += '<p><strong>' + d[0] + ':</strong> ' + d[1] + '</p>'; });
        }

        // Auto-inject branch and period if not already present in details
        const branchName = this.currentBranch ? this.currentBranch.name : '';
        const period = this.monthLabel ? this.monthLabel() : '';
        if (branchName && detailsHtml.indexOf('Branch') === -1) {
            detailsHtml = '<p><strong>Branch:</strong> ' + branchName + '</p>' + detailsHtml;
        }
        if (period && detailsHtml.indexOf('Period') === -1 && detailsHtml.indexOf('Date') === -1) {
            detailsHtml += '<p><strong>Period:</strong> ' + period + '</p>';
        }

        const logoSvg = '<svg viewBox="0 0 60 60" width="60" height="60" xmlns="http://www.w3.org/2000/svg">'
            + '<circle cx="30" cy="30" r="28" fill="#C8102E" stroke="#8B0000" stroke-width="2"/>'
            + '<path d="M18 31 C18 24.4 23.4 19 30 19 C34.2 19 37.8 21.3 39.8 24.8" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>'
            + '<path d="M39.8 24.8 L42 21 M39.8 24.8 L36 23.8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'
            + '<text x="30" y="44" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="800" fill="#fff" letter-spacing="1">GASCO</text>'
            + '</svg>';

        return '<!DOCTYPE html><html><head><title>' + title + ' — Gasco Shift Analysis</title>'
            + '<style>'
            + 'body{font-family:Arial,Helvetica,sans-serif;padding:30px;color:#222;max-width:800px;margin:0 auto;font-size:13px;}'
            + '.company-header{text-align:center;border-bottom:3px double #333;padding-bottom:16px;margin-bottom:16px;}'
            + '.company-header h1{font-size:22px;margin:6px 0 0;letter-spacing:1.5px;color:#C8102E;}'
            + '.company-header .sub{font-size:12px;color:#666;margin:3px 0;}'
            + '.company-header .tagline{font-size:11px;color:#999;font-style:italic;margin-top:2px;}'
            + '.doc-title{font-size:16px;font-weight:bold;text-align:center;margin:16px 0;padding:8px;background:#f5f5f5;border:1px solid #ddd;text-transform:uppercase;letter-spacing:0.5px;}'
            + '.details{margin-bottom:16px;line-height:1.8;}'
            + '.details p{margin:0;}'
            + 'table{width:100%;border-collapse:collapse;margin:12px 0;}'
            + 'th,td{border:1px solid #ccc;padding:8px 12px;font-size:12px;}'
            + 'th{background:#f5f5f5;text-align:left;font-weight:bold;}'
            + '.right{text-align:right;}'
            + '.bold{font-weight:bold;}'
            + '.total-row{background:#f0f0f0;font-weight:bold;}'
            + '.footer{margin-top:30px;font-size:11px;color:#999;text-align:center;border-top:1px solid #ddd;padding-top:12px;}'
            + '.sig-line{display:flex;justify-content:space-between;margin-top:40px;}'
            + '.sig-box{width:200px;text-align:center;}'
            + '.sig-box .line{border-top:1px solid #333;margin-top:40px;padding-top:4px;font-size:11px;}'
            + '@media print{body{padding:10px;max-width:100%;}}'
            + '</style></head><body>'
            + '<div class="company-header">'
            + logoSvg
            + '<h1>GASCO ENERGY LIMITED</h1>'
            + '<div class="sub">Oil Marketing Company</div>'
            + '<div class="sub">P.O. BOX 906, Layibi, Gulu, Uganda</div>'
            + '<div class="sub">Tel: +256 700 000 000 | Email: info@gascoenergy.com</div>'
            + '<div class="tagline">Gasco Shift Analysis</div>'
            + '</div>'
            + '<div class="doc-title">' + title + '</div>'
            + '<div class="details">' + detailsHtml + '</div>'
            + body
            + '<div class="sig-line"><div class="sig-box"><div class="line">Authorized Signature</div></div>'
            + '<div class="sig-box"><div class="line">Customer Signature</div></div></div>'
            + '<div class="footer">Printed on ' + new Date().toLocaleString() + ' | Gasco Energy Limited &mdash; P.O. BOX 906, Layibi, Gulu, Uganda</div>'
            + '</body></html>';
    },

    // Print a credit sale receipt for a specific entry
    printCreditSaleReceipt(id) {
        const ds = this.currentDate;
        const key = this.bk(this.currentBranch.id, ds);
        const allEntries = this.data.creditSales[key] || [];
        const e = this._findById(allEntries, id);
        if (!e) return;
        const idx = allEntries.indexOf(e);

        const cust = e.customer_id ? this.data.customers.find(c => c.id === e.customer_id) : null;
        const custName = cust ? cust.name : (e.customer_name || 'Walk-in Customer');
        const litres = this.parseNum(e.litres);
        const pp = this.parseNum(e.pump_price);
        const sp = this.parseNum(e.selling_price);
        const discount = (litres * pp) - (litres * sp);
        const creditAmt = litres * sp;
        const bal = cust ? this.getCustomerBalance(cust.id) : 0;

        const details = '<p><strong>Customer:</strong> ' + custName + '</p>'
            + '<p><strong>Date:</strong> ' + this.formatDate(ds) + '</p>'
            + '<p><strong>Branch:</strong> ' + this.currentBranch.name + '</p>'
            + '<p><strong>Receipt No.:</strong> CS-' + this.currentBranch.branch_code + '-' + ds.replace(/-/g, '') + '-' + (idx + 1) + '</p>';

        const body = '<table>'
            + '<thead><tr><th>Product</th><th class="right">Litres</th><th class="right">Price/L</th><th class="right">Amount</th></tr></thead>'
            + '<tbody>'
            + '<tr><td>' + (e.product || 'PMS') + '</td><td class="right">' + this.fmt(litres, 3) + '</td><td class="right">' + this.fmtInt(sp) + '</td><td class="right">' + this.fmtInt(creditAmt) + '</td></tr>'
            + (discount > 0 ? '<tr><td colspan="3" class="right">Discount</td><td class="right">(' + this.fmtInt(discount) + ')</td></tr>' : '')
            + '<tr class="total-row"><td colspan="3" class="right">TOTAL AMOUNT</td><td class="right">UGX ' + this.fmtInt(creditAmt) + '</td></tr>'
            + '</tbody></table>'
            + (cust ? '<p style="margin-top:12px;"><strong>Outstanding Balance: UGX ' + this.fmtInt(bal) + '</strong></p>' : '');

        const w = window.open('', '_blank', 'width=700,height=600');
        w.document.write(this._receiptHTML('CREDIT SALE INVOICE', details, body));
        w.document.close();
        setTimeout(() => w.print(), 300);
    },

    // Print a daily credit sales summary
    printDailyCreditSales() {
        const ds = this.currentDate;
        const key = this.bk(this.currentBranch.id, ds);
        const entries = this.data.creditSales[key] || [];

        const details = '<p><strong>Date:</strong> ' + this.formatDate(ds) + '</p>'
            + '<p><strong>Branch:</strong> ' + this.currentBranch.name + '</p>';

        let rows = '';
        let totalAmt = 0, totalDisc = 0;
        entries.forEach((e, i) => {
            const cust = e.customer_id ? this.data.customers.find(c => c.id === e.customer_id) : null;
            const litres = this.parseNum(e.litres);
            const pp = this.parseNum(e.pump_price);
            const sp = this.parseNum(e.selling_price);
            const discount = (litres * pp) - (litres * sp);
            const amt = litres * sp;
            totalAmt += amt; totalDisc += discount;
            rows += '<tr><td>' + (i + 1) + '</td><td>' + (cust ? cust.name : (e.customer_name || 'N/A')) + '</td>'
                + '<td>' + (e.product || 'PMS') + '</td><td class="right">' + this.fmt(litres, 3) + '</td>'
                + '<td class="right">' + this.fmtInt(sp) + '</td><td class="right">' + this.fmtInt(amt) + '</td></tr>';
        });
        rows += '<tr class="total-row"><td colspan="5" class="right">TOTAL</td><td class="right">UGX ' + this.fmtInt(totalAmt) + '</td></tr>';
        if (totalDisc > 0) rows += '<tr class="total-row"><td colspan="5" class="right">Total Discounts</td><td class="right">UGX ' + this.fmtInt(totalDisc) + '</td></tr>';

        const body = '<table><thead><tr><th>#</th><th>Customer</th><th>Product</th><th class="right">Litres</th><th class="right">Price/L</th><th class="right">Amount</th></tr></thead><tbody>' + rows + '</tbody></table>';

        const w = window.open('', '_blank', 'width=800,height=600');
        w.document.write(this._receiptHTML('DAILY CREDIT SALES SUMMARY', details, body));
        w.document.close();
        setTimeout(() => w.print(), 300);
    },

    // Print a payment receipt
    printPaymentReceipt(txnId) {
        const txn = this.data.customerTransactions.find(t => t.id === txnId);
        if (!txn || txn.transaction_type !== 'CREDIT') return;
        const cust = this.data.customers.find(c => c.id === txn.customer_id);
        if (!cust) return;
        const bal = this.getCustomerBalance(cust.id);
        const branch = this.currentBranch || this.data.branches.find(b => b.id === cust.branch_id);

        const details = '<p><strong>Customer:</strong> ' + cust.name + '</p>'
            + '<p><strong>Date:</strong> ' + this.formatDate(txn.transaction_date) + '</p>'
            + '<p><strong>Branch:</strong> ' + (branch ? branch.name : '') + '</p>'
            + '<p><strong>Receipt No.:</strong> ' + (txn.receipt_number || ('RCP-' + txn.id)) + '</p>'
            + '<p><strong>Payment Method:</strong> ' + (txn.payment_method || 'Cash') + '</p>';

        const body = '<table>'
            + '<tbody>'
            + '<tr><td>Amount Received</td><td class="right bold">UGX ' + this.fmtInt(this.parseNum(txn.credit_amount)) + '</td></tr>'
            + '<tr><td>Payment Method</td><td class="right">' + (txn.payment_method || 'Cash') + '</td></tr>'
            + (txn.receipt_number ? '<tr><td>Reference</td><td class="right">' + txn.receipt_number + '</td></tr>' : '')
            + '<tr class="total-row"><td>Outstanding Balance After Payment</td><td class="right">UGX ' + this.fmtInt(bal) + '</td></tr>'
            + '</tbody></table>'
            + '<p style="margin-top:16px;font-style:italic;font-size:11px;">Thank you for your payment.</p>';

        const w = window.open('', '_blank', 'width=700,height=550');
        w.document.write(this._receiptHTML('PAYMENT RECEIPT', details, body));
        w.document.close();
        setTimeout(() => w.print(), 300);
    },

    // Print a shift summary receipt / delivery note
    printShiftSummary() {
        if (!this.currentBranch || !this.currentDate) return;
        const ds = this.currentDate;
        const bid = this.currentBranch.id;
        const calc = this.calculateDate(bid, ds);
        const sd = this.data.shiftDates[this.bk(bid, ds)] || {};

        const details = '<p><strong>Branch:</strong> ' + this.currentBranch.name + '</p>'
            + '<p><strong>Date:</strong> ' + this.formatDate(ds) + '</p>'
            + '<p><strong>Status:</strong> ' + (sd.is_closed ? 'CLOSED' : 'OPEN') + '</p>';

        const body = '<table>'
            + '<thead><tr><th>Description</th><th class="right">Amount (UGX)</th></tr></thead>'
            + '<tbody>'
            + '<tr><td>PMS Volume Sold</td><td class="right">' + this.fmt(calc.pmsVolume, 3) + ' L</td></tr>'
            + '<tr><td>AGO Volume Sold</td><td class="right">' + this.fmt(calc.agoVolume, 3) + ' L</td></tr>'
            + '<tr class="total-row"><td>Expected Sales</td><td class="right">' + this.fmtInt(calc.totalExpected) + '</td></tr>'
            + '<tr><td>Cash in Hand</td><td class="right">' + this.fmtInt(calc.cashInHand) + '</td></tr>'
            + '<tr><td>MomoPay</td><td class="right">' + this.fmtInt(calc.momopay) + '</td></tr>'
            + '<tr><td>Airtel Money</td><td class="right">' + this.fmtInt(calc.airtelMoney) + '</td></tr>'
            + '<tr><td>M-Pesa</td><td class="right">' + this.fmtInt(calc.mpesa) + '</td></tr>'
            + '<tr><td>Dollar</td><td class="right">' + this.fmtInt(calc.dollar) + '</td></tr>'
            + '<tr><td>FlexiPay</td><td class="right">' + this.fmtInt(calc.flexipay) + '</td></tr>'
            + '<tr><td>Credit Sales</td><td class="right">' + this.fmtInt(calc.totalCreditSales) + '</td></tr>'
            + '<tr><td>Expenses</td><td class="right">' + this.fmtInt(calc.totalExpenses) + '</td></tr>'
            + '<tr><td>Discounts</td><td class="right">' + this.fmtInt(calc.totalDiscount) + '</td></tr>'
            + '<tr><td>Shortages</td><td class="right">' + this.fmtInt(calc.totalShortages) + '</td></tr>'
            + '<tr class="total-row"><td>VARIANCE</td><td class="right">' + this.fmt(calc.variance) + '</td></tr>'
            + '</tbody></table>';

        const w = window.open('', '_blank', 'width=700,height=700');
        w.document.write(this._receiptHTML('DAILY SHIFT SUMMARY', details, body));
        w.document.close();
        setTimeout(() => w.print(), 300);
    },

    // ============================================================
    // MULTI-USER AUTHORIZATION SYSTEM
    // ============================================================

    // --- Role definitions & Permission Matrix ---
    ROLES: {
        super_admin:     { label: 'Super Admin',     level: 100, color: 'sa-badge-danger' },
        branch_manager:  { label: 'Branch Manager',  level: 80,  color: 'sa-badge-warning' },
        accountant:      { label: 'Accountant',      level: 60,  color: 'sa-badge-info' },
        shift_attendant: { label: 'Shift Attendant', level: 40,  color: 'sa-badge-success' },
        viewer:          { label: 'Viewer',           level: 10,  color: 'sa-badge-neutral' }
    },

    // Default permission matrix: action → roles allowed
    PERMISSIONS: {
        // Shift entry
        edit_shift:         ['super_admin', 'branch_manager', 'shift_attendant'],
        close_shift:        ['super_admin', 'branch_manager'],
        reopen_shift:       ['super_admin'],
        // Branches
        manage_branches:    ['super_admin'],
        // Credit sales / expenses / discounts
        edit_transactions:  ['super_admin', 'branch_manager', 'shift_attendant'],
        void_transactions:  ['super_admin', 'branch_manager'],
        // Customers
        edit_customers:     ['super_admin', 'branch_manager', 'accountant'],
        record_payments:    ['super_admin', 'branch_manager', 'accountant'],
        // Digital payments
        edit_digital:       ['super_admin', 'branch_manager', 'shift_attendant'],
        // Banking
        edit_bank:          ['super_admin', 'accountant'],
        manage_banks:       ['super_admin'],
        edit_cash_to_bank:  ['super_admin', 'branch_manager', 'accountant'],
        // Wetstock & Deliveries
        edit_wetstock:      ['super_admin', 'branch_manager'],
        edit_deliveries:    ['super_admin', 'branch_manager'],
        edit_delivery_cost: ['super_admin'],
        // Pump Prices
        set_pump_price:     ['super_admin', 'branch_manager'],
        // Users & Admin
        manage_users:       ['super_admin'],
        view_audit:         ['super_admin', 'accountant'],
        // Reports
        view_reports:       ['super_admin', 'branch_manager', 'accountant', 'viewer'],
        // Statements
        view_statements:    ['super_admin', 'branch_manager', 'accountant', 'viewer'],
        // HR & Payroll
        manage_hr:          ['super_admin', 'branch_manager'],
        view_payroll:       ['super_admin', 'branch_manager', 'accountant'],
        run_payroll:        ['super_admin', 'accountant'],
        manage_leave:       ['super_admin', 'branch_manager'],
        manage_loans:       ['super_admin', 'branch_manager'],
        // Fuel Statement (contains cost prices)
        view_fuel_statement: ['super_admin'],
        // Petty Cash
        manage_petty_cash:  ['super_admin', 'branch_manager', 'accountant'],
        // Inter-branch transfers
        manage_transfers:   ['super_admin', 'branch_manager', 'accountant']
    },

    // Human-readable labels for each permission (grouped)
    PERMISSION_GROUPS: [
        { label: 'Shift Operations', perms: [
            { key: 'edit_shift', label: 'Edit Shift Entries' },
            { key: 'close_shift', label: 'Close Shifts' },
            { key: 'reopen_shift', label: 'Reopen Closed Shifts' }
        ]},
        { label: 'Branch Management', perms: [
            { key: 'manage_branches', label: 'Add / Edit Branches' },
            { key: 'set_pump_price', label: 'Set Pump Prices' }
        ]},
        { label: 'Transactions', perms: [
            { key: 'edit_transactions', label: 'Edit Credit Sales / Expenses / Discounts' },
            { key: 'void_transactions', label: 'Void Transactions' }
        ]},
        { label: 'Customers', perms: [
            { key: 'edit_customers', label: 'Add / Edit Customers' },
            { key: 'record_payments', label: 'Record Customer Payments' }
        ]},
        { label: 'Digital Payments', perms: [
            { key: 'edit_digital', label: 'Edit MomoPay / Airtel / M-Pesa / Dollar / FlexiPay' }
        ]},
        { label: 'Banking', perms: [
            { key: 'edit_bank', label: 'Edit Bank Transactions' },
            { key: 'manage_banks', label: 'Add / Remove Bank Accounts' },
            { key: 'edit_cash_to_bank', label: 'Cash to Bank Entries' }
        ]},
        { label: 'Stock & Deliveries', perms: [
            { key: 'edit_wetstock', label: 'Edit Wetstock Reconciliation' },
            { key: 'edit_deliveries', label: 'Edit Delivery Schedules' },
            { key: 'edit_delivery_cost', label: 'Edit Delivery Cost / Pricing (Head Office)' }
        ]},
        { label: 'Reports & Statements', perms: [
            { key: 'view_reports', label: 'View Reports (Daily, Consolidated, Ageing, etc.)' },
            { key: 'view_statements', label: 'View Customer Statements' }
        ]},
        { label: 'HR & Payroll', perms: [
            { key: 'manage_hr', label: 'Manage Employees' },
            { key: 'view_payroll', label: 'View Payroll' },
            { key: 'run_payroll', label: 'Run Payroll' },
            { key: 'manage_leave', label: 'Manage Leave Records' },
            { key: 'manage_loans', label: 'Manage Staff Loans' }
        ]},
        { label: 'Finance', perms: [
            { key: 'view_fuel_statement', label: 'View Fuel Statement (Cost Prices)' },
            { key: 'manage_petty_cash', label: 'Manage Petty Cash' },
            { key: 'manage_transfers', label: 'Inter-Branch Transfers' }
        ]},
        { label: 'Administration', perms: [
            { key: 'manage_users', label: 'Manage Users & Permissions' },
            { key: 'view_audit', label: 'View Audit Log' }
        ]}
    ],

    // Session timeout (30 min)
    SESSION_TIMEOUT: 30 * 60 * 1000,
    _lastActivity: Date.now(),

    // --- Simple password hashing (for localStorage; replace with bcrypt on backend) ---
    hashPassword(pwd) {
        let hash = 0;
        for (let i = 0; i < pwd.length; i++) {
            const ch = pwd.charCodeAt(i);
            hash = ((hash << 5) - hash) + ch;
            hash = hash & hash;
        }
        return 'h_' + Math.abs(hash).toString(36) + '_' + pwd.length;
    },

    verifyPassword(pwd, hash) {
        // Support both legacy plain-text and new hashed passwords
        if (!hash || !hash.startsWith('h_')) return pwd === hash;
        return this.hashPassword(pwd) === hash;
    },

    // --- Core Auth Methods ---
    getCurrentUser() {
        if (!this.data.users || this.data.users.length === 0) return null;
        const uid = localStorage.getItem('sa_current_user');
        const sessionTs = parseInt(localStorage.getItem('sa_session_ts') || '0');
        // Check session timeout
        if (uid && (Date.now() - sessionTs > this.SESSION_TIMEOUT)) {
            this.forceLogout('Session expired');
            return null;
        }
        return uid ? this.data.users.find(u => u.id === parseInt(uid)) : null;
    },

    isLoggedIn() { return !!this.getCurrentUser(); },

    hasPermission(action) {
        const user = this.getCurrentUser();
        if (!user) return false;
        // Custom overrides take priority, fall back to defaults
        const custom = (this.data.customPermissions || {})[action];
        const allowed = custom || this.PERMISSIONS[action];
        if (!allowed) return false;
        return allowed.includes(user.role);
    },

    getEffectivePermissions() {
        const result = {};
        Object.keys(this.PERMISSIONS).forEach(p => {
            const custom = (this.data.customPermissions || {})[p];
            result[p] = custom ? custom.slice() : this.PERMISSIONS[p].slice();
        });
        return result;
    },

    togglePermission(perm, role) {
        // Prevent locking super_admin out of manage_users
        if (perm === 'manage_users' && role === 'super_admin') {
            this.toast('Cannot revoke User Management from Super Admin', 'error');
            return;
        }
        if (!this.data.customPermissions) this.data.customPermissions = {};
        // Initialize from defaults if not yet customized
        if (!this.data.customPermissions[perm]) {
            this.data.customPermissions[perm] = this.PERMISSIONS[perm] ? this.PERMISSIONS[perm].slice() : [];
        }
        const arr = this.data.customPermissions[perm];
        const idx = arr.indexOf(role);
        if (idx >= 0) arr.splice(idx, 1);
        else arr.push(role);
        this.saveData();
        const user = this.getCurrentUser();
        this.auditLog('PERMISSION_CHANGE', (user ? user.full_name : 'System') + ' ' + (idx >= 0 ? 'revoked' : 'granted') + ' "' + perm + '" for role "' + role + '"');
        this.navigate('user_management');
    },

    resetPermissionsToDefault() {
        if (!confirm('Reset all permissions back to system defaults?\n\nAny custom changes you made will be lost.')) return;
        this.data.customPermissions = {};
        this.saveData();
        this.auditLog('PERMISSION_RESET', 'All permissions reset to system defaults');
        this.toast('Permissions reset to defaults', 'success');
        this.navigate('user_management');
    },

    hasAccessToBranch(branchId) {
        const user = this.getCurrentUser();
        if (!user) return false;
        if (user.role === 'super_admin' || user.role === 'accountant') return true;
        return this.data.userBranchAccess.some(a => a.user_id === user.id && a.branch_id === branchId);
    },

    // Backwards compat helpers
    canEdit() { return this.hasPermission('edit_shift'); },
    canCloseSift() { return this.hasPermission('close_shift'); },
    canManageBranches() { return this.hasPermission('manage_branches'); },

    requireAuth() {
        if (!this.isLoggedIn()) {
            this.showLoginScreen();
            return false;
        }
        this.trackActivity();
        return true;
    },

    trackActivity() {
        this._lastActivity = Date.now();
        localStorage.setItem('sa_session_ts', Date.now().toString());
    },

    // --- Init Users ---
    initUsers() {
        if (!this.data.users) this.data.users = [];
        if (!this.data.userBranchAccess) this.data.userBranchAccess = [];
        if (!this.data.auditLog) this.data.auditLog = [];
        if (this.data.users.length === 0) {
            this.data.users = [
                { id: 1, username: 'admin', full_name: 'Super Admin', role: 'super_admin', is_active: true, password: this.hashPassword('admin123'), email: 'admin@gasco.ug', created_at: new Date().toISOString() },
                { id: 2, username: 'manager_ktg', full_name: 'Kitgum Manager', role: 'branch_manager', is_active: true, password: this.hashPassword('manager123'), email: '', created_at: new Date().toISOString() },
                { id: 3, username: 'attendant1', full_name: 'Shift Attendant', role: 'shift_attendant', is_active: true, password: this.hashPassword('shift123'), email: '', created_at: new Date().toISOString() },
                { id: 4, username: 'accountant', full_name: 'Accountant', role: 'accountant', is_active: true, password: this.hashPassword('acct123'), email: '', created_at: new Date().toISOString() },
                { id: 5, username: 'viewer', full_name: 'Report Viewer', role: 'viewer', is_active: true, password: this.hashPassword('viewer123'), email: '', created_at: new Date().toISOString() }
            ];
            this.data.userBranchAccess = [
                { user_id: 2, branch_id: 1 },
                { user_id: 3, branch_id: 1 }
            ];
            this.saveData();
        }
    },

    // --- Login Screen ---
    showLoginScreen() {
        const ls = document.getElementById('loginScreen');
        if (ls) {
            ls.style.display = 'flex';
            const usernameInput = document.getElementById('loginUsername');
            if (usernameInput) setTimeout(() => usernameInput.focus(), 100);
        }
    },

    hideLoginScreen() {
        const ls = document.getElementById('loginScreen');
        if (ls) ls.style.display = 'none';
    },

    doLogin() {
        const usernameEl = document.getElementById('loginUsername');
        const passwordEl = document.getElementById('loginPassword');
        const errorEl = document.getElementById('loginError');
        if (!usernameEl || !passwordEl) return;

        const username = usernameEl.value.trim();
        const password = passwordEl.value;

        if (!username || !password) {
            if (errorEl) { errorEl.textContent = 'Please enter username and password'; errorEl.style.display = 'block'; }
            return;
        }

        const user = this.data.users.find(u => u.username === username && u.is_active);
        if (!user || !this.verifyPassword(password, user.password)) {
            if (errorEl) { errorEl.textContent = 'Invalid username or password'; errorEl.style.display = 'block'; }
            this.auditLog('LOGIN_FAILED', 'Failed login attempt for: ' + username);
            // Lock after 5 failed attempts
            if (!this._loginAttempts) this._loginAttempts = 0;
            this._loginAttempts++;
            if (this._loginAttempts >= 5) {
                if (errorEl) { errorEl.textContent = 'Too many attempts. Wait 30 seconds.'; errorEl.style.display = 'block'; }
                usernameEl.disabled = true;
                passwordEl.disabled = true;
                setTimeout(() => { usernameEl.disabled = false; passwordEl.disabled = false; this._loginAttempts = 0; }, 30000);
            }
            return;
        }

        this._loginAttempts = 0;
        localStorage.setItem('sa_current_user', user.id);
        localStorage.setItem('sa_session_ts', Date.now().toString());
        user.last_login = new Date().toISOString();
        this.saveData();

        this.hideLoginScreen();
        this.auditLog('LOGIN', user.full_name + ' logged in (' + user.role + ')');
        this.toast('Welcome, ' + user.full_name);
        this.updateUserDisplay();
        this.updateAdminNav();

        // Filter branches to user access
        if (!this.hasAccessToBranch(this.currentBranch ? this.currentBranch.id : 0)) {
            const accessBranches = this.data.branches.filter(b => this.hasAccessToBranch(b.id));
            if (accessBranches.length > 0) {
                this.currentBranch = accessBranches[0];
                localStorage.setItem('sa_current_branch', this.currentBranch.id);
                this.updateBranchDisplay();
            }
        }
        this.renderBranchSelector();
        this.navigate('dashboard');
    },

    logout() {
        const user = this.getCurrentUser();
        if (user) this.auditLog('LOGOUT', user.full_name + ' logged out');
        localStorage.removeItem('sa_current_user');
        localStorage.removeItem('sa_session_ts');
        this.showLoginScreen();
        this.updateUserDisplay();
    },

    forceLogout(reason) {
        localStorage.removeItem('sa_current_user');
        localStorage.removeItem('sa_session_ts');
        this.showLoginScreen();
        this.updateUserDisplay();
        if (reason) setTimeout(() => this.toast(reason, 'warning'), 300);
    },

    updateUserDisplay() {
        const user = this.getCurrentUser();
        const el = document.getElementById('userDisplay');
        if (!el) return;
        if (user) {
            const roleDef = this.ROLES[user.role] || { label: user.role, color: 'sa-badge-neutral' };
            el.innerHTML = '<span style="font-size:0.78rem;color:var(--sa-text-muted);">' + user.full_name + '</span>'
                + ' <span class="sa-badge ' + roleDef.color + '">' + roleDef.label + '</span>'
                + ' <button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.showChangePassword()">Password</button>'
                + ' <button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.logout()">Logout</button>';
        } else {
            el.innerHTML = '';
        }
    },

    updateAdminNav() {
        const nav = document.getElementById('navAdmin');
        if (nav) {
            nav.style.display = (this.hasPermission('manage_users') || this.hasPermission('view_audit')) ? 'block' : 'none';
        }
        const fsNav = document.getElementById('navFuelStatement');
        if (fsNav) {
            fsNav.style.display = this.hasPermission('view_fuel_statement') ? 'block' : 'none';
        }
    },

    // Restrict branch selector to only accessible branches
    renderBranchSelector() {
        const dd = document.getElementById('branchDropdown');
        if (!dd) return;
        const user = this.getCurrentUser();
        const branches = user ? this.data.branches.filter(b => this.hasAccessToBranch(b.id)) : this.data.branches;
        let html = '';
        branches.forEach(b => {
            html += '<div class="sa-branch-option' + (this.currentBranch && this.currentBranch.id === b.id ? ' active' : '') + '" '
                + 'onclick="SA.selectBranch(\'' + b.id + '\')">'
                + '<strong>' + b.name + '</strong><span class="sa-badge sa-badge-neutral">' + b.branch_code + '</span></div>';
        });
        if (this.hasPermission('manage_branches')) {
            html += '<div class="sa-branch-option add-new" onclick="SA.showAddBranch()">+ Add Branch</div>';
        }
        dd.innerHTML = html;
    },

    // --- Change Password ---
    showChangePassword() {
        const html = '<div class="sa-form-group"><label>Current Password</label><input class="sa-input" id="cpOld" type="password" placeholder="Current password"></div>'
            + '<div class="sa-form-group"><label>New Password</label><input class="sa-input" id="cpNew" type="password" placeholder="Minimum 6 characters"></div>'
            + '<div class="sa-form-group"><label>Confirm Password</label><input class="sa-input" id="cpConfirm" type="password" placeholder="Re-enter new password"></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveChangePassword()">Change Password</button></div>';
        this.openModal('Change Password', html);
    },

    saveChangePassword() {
        const user = this.getCurrentUser();
        if (!user) return;
        const oldPwd = document.getElementById('cpOld').value;
        const newPwd = document.getElementById('cpNew').value;
        const confirm = document.getElementById('cpConfirm').value;
        if (!this.verifyPassword(oldPwd, user.password)) { this.toast('Current password is incorrect', 'error'); return; }
        if (newPwd.length < 6) { this.toast('New password must be at least 6 characters', 'error'); return; }
        if (newPwd !== confirm) { this.toast('Passwords do not match', 'error'); return; }
        user.password = this.hashPassword(newPwd);
        user.password_changed_at = new Date().toISOString();
        this.saveData();
        this.auditLog('PASSWORD_CHANGE', user.full_name + ' changed their password');
        this.closeModal();
        this.toast('Password changed successfully');
    },

    // --- User Management (Super Admin) ---
    renderUserManagement(el) {
        if (!this.hasPermission('manage_users')) {
            el.innerHTML = this._accessDenied('User Management');
            return;
        }

        let html = '<div class="sa-page-header"><h1>User Management</h1>'
            + '<div class="sa-page-actions"><button class="sa-btn sa-btn-primary" onclick="SA.showAddUser()">+ Add User</button></div></div>';

        // Role legend
        html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">';
        Object.keys(this.ROLES).forEach(r => {
            const rd = this.ROLES[r];
            const count = this.data.users.filter(u => u.role === r).length;
            html += '<span class="sa-badge ' + rd.color + '">' + rd.label + ' (' + count + ')</span>';
        });
        html += '</div>';

        // Users table
        html += '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">All Users (' + this.data.users.length + ')</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Username</th><th>Full Name</th><th>Role</th><th>Branches</th><th>Status</th><th>Last Login</th><th style="width:140px;">Actions</th></tr></thead><tbody>';

        this.data.users.forEach(u => {
            const roleDef = this.ROLES[u.role] || { label: u.role, color: 'sa-badge-neutral' };
            const branches = this.data.userBranchAccess.filter(a => a.user_id === u.id).map(a => {
                const b = this.data.branches.find(br => br.id === a.branch_id);
                return b ? b.branch_code : '?';
            });
            const branchStr = u.role === 'super_admin' ? '<em class="text-muted">All</em>' : (branches.length > 0 ? branches.join(', ') : '<span class="text-danger">None</span>');
            const statusBadge = u.is_active ? '<span class="sa-badge sa-badge-success">Active</span>' : '<span class="sa-badge sa-badge-danger">Disabled</span>';

            html += '<tr>'
                + '<td><strong>' + u.username + '</strong></td>'
                + '<td>' + u.full_name + (u.email ? '<br><span class="text-muted" style="font-size:0.72rem;">' + u.email + '</span>' : '') + '</td>'
                + '<td><span class="sa-badge ' + roleDef.color + '">' + roleDef.label + '</span></td>'
                + '<td>' + branchStr + '</td>'
                + '<td>' + statusBadge + '</td>'
                + '<td class="text-muted" style="font-size:0.75rem;">' + (u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never') + '</td>'
                + '<td><div class="sa-btn-group">'
                + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.showEditUser(\'' + u.id + '\')">Edit</button>'
                + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.resetUserPassword(\'' + u.id + '\')">Reset PW</button>'
                + '</div></td></tr>';
        });

        html += '</tbody></table></div></div></div>';

        // Permission Matrix (Interactive)
        const currentUser = this.getCurrentUser ? this.getCurrentUser() : null;
        const isSuperAdmin = currentUser && currentUser.role === 'super_admin';
        const hasCustom = this.data.customPermissions && Object.keys(this.data.customPermissions).length > 0;
        const effectivePerms = this.getEffectivePermissions();
        const roles = Object.keys(this.ROLES);

        html += '<div class="sa-section"><div class="sa-section-header yellow"><div class="sa-section-title">Permission Matrix' + (hasCustom ? ' <span class="sa-badge sa-badge-warning" style="font-size:0.65rem;vertical-align:middle;">Customized</span>' : '') + '</div>'
            + (isSuperAdmin ? '<div style="display:flex;gap:8px;">' + (hasCustom ? '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.resetPermissionsToDefault()" style="color:#fff;border-color:rgba(255,255,255,0.3);">Reset to Defaults</button>' : '') + '</div>' : '')
            + '</div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table" style="font-size:0.75rem;">';

        html += '<thead><tr><th style="min-width:220px;">Permission</th>';
        roles.forEach(r => { html += '<th class="text-center" style="min-width:80px;">' + this.ROLES[r].label + '</th>'; });
        html += '</tr></thead><tbody>';

        this.PERMISSION_GROUPS.forEach(group => {
            // Group header row
            html += '<tr style="background:rgba(0,0,0,0.04);"><td colspan="' + (roles.length + 1) + '" style="font-weight:700;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--sa-text-secondary);padding:8px 12px;">' + group.label + '</td></tr>';

            group.perms.forEach(p => {
                const allowed = effectivePerms[p.key] || [];
                const isCustomized = this.data.customPermissions && this.data.customPermissions[p.key];
                html += '<tr' + (isCustomized ? ' style="background:rgba(245,158,11,0.04);"' : '') + '>';
                html += '<td style="padding-left:20px;">' + p.label + (isCustomized ? ' <span style="color:var(--sa-warning);font-size:0.65rem;" title="Custom override">*</span>' : '') + '</td>';
                roles.forEach(r => {
                    const has = allowed.includes(r);
                    if (isSuperAdmin) {
                        // Clickable toggle cell
                        html += '<td class="text-center" style="cursor:pointer;user-select:none;" onclick="SA.togglePermission(\'' + p.key + '\',\'' + r + '\')" title="Click to ' + (has ? 'revoke' : 'grant') + '">';
                        html += has
                            ? '<span style="color:var(--sa-success);font-weight:700;font-size:1.1rem;">&#10003;</span>'
                            : '<span style="color:var(--sa-text-dim);font-size:1rem;">&#10005;</span>';
                        html += '</td>';
                    } else {
                        html += '<td class="text-center">' + (has ? '<span style="color:var(--sa-success);font-weight:700;font-size:1rem;">&#10003;</span>' : '<span style="color:var(--sa-text-dim);">—</span>') + '</td>';
                    }
                });
                html += '</tr>';
            });
        });

        html += '</tbody></table></div>';
        if (isSuperAdmin) {
            html += '<div style="padding:10px 16px;font-size:0.75rem;color:var(--sa-text-secondary);border-top:1px solid var(--sa-border);display:flex;align-items:center;gap:8px;">'
                + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
                + 'Click any <span style="color:var(--sa-success);font-weight:700;">&#10003;</span> or <span style="color:var(--sa-text-dim);">&#10005;</span> to toggle permissions. Changes are saved immediately.'
                + (hasCustom ? ' <span style="color:var(--sa-warning);">*</span> = customized from defaults.' : '')
                + '</div>';
        }
        html += '</div></div>';

        // Super Admin: Reset all data
        if (isSuperAdmin) {
            html += '<div class="sa-section" style="margin-top:32px;"><div class="sa-section-header red"><div class="sa-section-title">Danger Zone</div></div>'
                + '<div class="sa-section-body" style="text-align:center;">'
                + '<p style="color:var(--sa-text-dim);margin-bottom:12px;">This will permanently delete ALL data (branches, shifts, customers, transactions, etc.) and reset the system to a fresh state. User accounts will be preserved.</p>'
                + '<button class="sa-btn" style="background:var(--sa-danger);color:#fff;padding:12px 32px;font-weight:700;font-size:1rem;" onclick="SA.resetAllData()">Reset All Data</button>'
                + '</div></div>';
        }

        el.innerHTML = html;
    },

    resetAllData() {
        if (!confirm('WARNING: This will delete ALL data except user accounts.\n\nAre you sure?')) return;
        if (!confirm('FINAL CONFIRMATION: This cannot be undone. All branches, shifts, customers, transactions, stock data, and reports will be permanently deleted.\n\nType OK to proceed — click OK to confirm.')) return;

        // Preserve users and user-branch access
        var users = this.data.users || [];
        var userBranchAccess = this.data.userBranchAccess || [];
        var auditLog = this.data.auditLog || [];

        // Log the reset
        var user = this.getCurrentUser ? this.getCurrentUser() : null;
        auditLog.push({
            action: 'SYSTEM_RESET',
            description: 'All data reset by super admin',
            performed_by: user ? (user.full_name || user.username) : 'System',
            performed_at: new Date().toISOString()
        });

        // Reset to defaults
        this.data = {
            branches: [],
            shiftDates: {},
            pumpReadings: {},
            creditSales: {},
            expenses: {},
            payments: {},
            discounts: {},
            pumpShortages: {},
            customers: [],
            customerTransactions: [],
            momoTransactions: {},
            airtelTransactions: {},
            mpesaTransactions: {},
            dollarTransactions: {},
            flexipayTransactions: {},
            banks: [],
            bankTransactions: {},
            wetstockDaily: {},
            fuelDeliveries: [],
            employees: [],
            leaveRecords: [],
            payrollRuns: [],
            cashToBank: {},
            priceHistory: [],
            fuelStatementEntries: [],
            fuelStatementOpeningBalances: [],
            pettyCashEntries: [],
            branchTransfers: [],
            loans: [],
            customExpenseAccounts: [],
            goodsIssues: {},
            users: users,
            userBranchAccess: userBranchAccess,
            auditLog: auditLog
        };

        this.saveData();
        this.toast('All data has been reset', 'info');
        this.navigate('dashboard');
    },

    showAddUser() {
        let roleOpts = '';
        Object.keys(this.ROLES).forEach(r => {
            roleOpts += '<option value="' + r + '">' + this.ROLES[r].label + '</option>';
        });
        let branchChecks = '';
        this.data.branches.forEach(b => {
            branchChecks += '<label style="display:flex;align-items:center;gap:6px;font-size:0.82rem;margin-bottom:4px;">'
                + '<input type="checkbox" class="nuBranchCb" value="' + b.id + '"> ' + b.name + ' (' + b.branch_code + ')</label>';
        });
        const html = '<div class="sa-form-row"><div class="sa-form-group"><label>Username</label><input class="sa-input" id="nuUser" placeholder="e.g. john_ok"></div>'
            + '<div class="sa-form-group"><label>Full Name</label><input class="sa-input" id="nuName" placeholder="e.g. John Okello"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Email</label><input class="sa-input" id="nuEmail" placeholder="Optional"></div>'
            + '<div class="sa-form-group"><label>Role</label><select class="sa-input" id="nuRole">' + roleOpts + '</select></div></div>'
            + '<div class="sa-form-group"><label>Password</label><input class="sa-input" id="nuPwd" type="password" value="" placeholder="Min 6 characters"></div>'
            + '<div class="sa-form-group"><label>Branch Access</label><div style="max-height:120px;overflow-y:auto;padding:8px;border:1px solid var(--sa-border);border-radius:6px;">' + branchChecks + '</div>'
            + '<span style="font-size:0.7rem;color:var(--sa-text-dim);">Super Admin and Accountant have access to all branches automatically.</span></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveNewUser()">Create User</button></div>';
        this.openModal('Add New User', html);
    },

    saveNewUser() {
        const username = document.getElementById('nuUser').value.trim().toLowerCase();
        const fullName = document.getElementById('nuName').value.trim();
        const email = document.getElementById('nuEmail').value.trim();
        const role = document.getElementById('nuRole').value;
        const pwd = document.getElementById('nuPwd').value;
        if (!username || !fullName) { this.toast('Username and name required', 'error'); return; }
        if (username.length < 3) { this.toast('Username min 3 characters', 'error'); return; }
        if (pwd.length < 6) { this.toast('Password min 6 characters', 'error'); return; }
        if (this.data.users.find(u => u.username === username)) { this.toast('Username already exists', 'error'); return; }

        const newUser = {
            id: this.uid(), username: username, full_name: fullName, email: email,
            role: role, is_active: true, password: this.hashPassword(pwd),
            created_at: new Date().toISOString(), last_login: null
        };
        this.data.users.push(newUser);

        // Branch access
        document.querySelectorAll('.nuBranchCb:checked').forEach(cb => {
            this.data.userBranchAccess.push({ user_id: newUser.id, branch_id: parseInt(cb.value) });
        });

        this.saveData();
        this.auditLog('USER_CREATED', 'Created user: ' + username + ' (' + role + ')');
        this.closeModal();
        this.toast('User "' + username + '" created');
        this.navigate('user_management');
    },

    showEditUser(userId) {
        const u = this.data.users.find(usr => usr.id === userId);
        if (!u) return;
        let roleOpts = '';
        Object.keys(this.ROLES).forEach(r => {
            roleOpts += '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + this.ROLES[r].label + '</option>';
        });
        const userBranches = this.data.userBranchAccess.filter(a => a.user_id === userId).map(a => a.branch_id);
        let branchChecks = '';
        this.data.branches.forEach(b => {
            const checked = userBranches.includes(b.id) ? ' checked' : '';
            branchChecks += '<label style="display:flex;align-items:center;gap:6px;font-size:0.82rem;margin-bottom:4px;">'
                + '<input type="checkbox" class="euBranchCb" value="' + b.id + '"' + checked + '> ' + b.name + ' (' + b.branch_code + ')</label>';
        });
        const html = '<div class="sa-form-row"><div class="sa-form-group"><label>Username</label><input class="sa-input" id="euUser" value="' + u.username + '" disabled></div>'
            + '<div class="sa-form-group"><label>Full Name</label><input class="sa-input" id="euName" value="' + u.full_name + '"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Email</label><input class="sa-input" id="euEmail" value="' + (u.email || '') + '"></div>'
            + '<div class="sa-form-group"><label>Role</label><select class="sa-input" id="euRole">' + roleOpts + '</select></div></div>'
            + '<div class="sa-form-group"><label>Status</label><select class="sa-input" id="euActive"><option value="true"' + (u.is_active ? ' selected' : '') + '>Active</option><option value="false"' + (!u.is_active ? ' selected' : '') + '>Disabled</option></select></div>'
            + '<div class="sa-form-group"><label>Branch Access</label><div style="max-height:120px;overflow-y:auto;padding:8px;border:1px solid var(--sa-border);border-radius:6px;">' + branchChecks + '</div></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + (u.id !== 1 ? '<button class="sa-btn sa-btn-danger" onclick="SA.deleteUser(\'' + userId + '\')" style="margin-right:auto;">Delete User</button>' : '<span></span>')
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveEditUser(\'' + userId + '\')">Save</button></div>';
        this.openModal('Edit User — ' + u.username, html);
    },

    saveEditUser(userId) {
        const u = this.data.users.find(usr => usr.id === userId);
        if (!u) return;
        u.full_name = document.getElementById('euName').value.trim();
        u.email = document.getElementById('euEmail').value.trim();
        u.role = document.getElementById('euRole').value;
        u.is_active = document.getElementById('euActive').value === 'true';
        // Update branch access
        this.data.userBranchAccess = this.data.userBranchAccess.filter(a => a.user_id !== userId);
        document.querySelectorAll('.euBranchCb:checked').forEach(cb => {
            this.data.userBranchAccess.push({ user_id: userId, branch_id: parseInt(cb.value) });
        });
        this.saveData();
        this.auditLog('USER_UPDATED', 'Updated user: ' + u.username + ' (' + u.role + ', ' + (u.is_active ? 'active' : 'disabled') + ')');
        this.closeModal();
        this.toast('User updated');
        this.navigate('user_management');
    },

    deleteUser(userId) {
        const u = this.data.users.find(usr => usr.id === userId);
        if (!u || u.id === 1) return;
        if (!confirm('Delete user "' + u.username + '"? This cannot be undone.')) return;
        this.data.users = this.data.users.filter(usr => usr.id !== userId);
        this.data.userBranchAccess = this.data.userBranchAccess.filter(a => a.user_id !== userId);
        this.saveData();
        this.auditLog('USER_DELETED', 'Deleted user: ' + u.username);
        this.closeModal();
        this.toast('User deleted');
        this.navigate('user_management');
    },

    resetUserPassword(userId) {
        const u = this.data.users.find(usr => usr.id === userId);
        if (!u) return;
        const newPwd = 'reset' + Math.random().toString(36).substring(2, 8);
        u.password = this.hashPassword(newPwd);
        u.password_changed_at = null;
        this.saveData();
        this.auditLog('PASSWORD_RESET', 'Reset password for: ' + u.username);
        alert('Password for "' + u.username + '" has been reset to:\n\n' + newPwd + '\n\nThe user should change this on first login.');
    },

    // --- Audit Log ---
    auditLog(action, details) {
        if (!this.data.auditLog) this.data.auditLog = [];
        const user = this.getCurrentUser();
        this.data.auditLog.push({
            id: this.uid(),
            timestamp: new Date().toISOString(),
            user_id: user ? user.id : null,
            username: user ? user.username : 'system',
            action: action,
            details: details,
            branch_id: this.currentBranch ? this.currentBranch.id : null
        });
        // Keep last 500 entries
        if (this.data.auditLog.length > 500) this.data.auditLog = this.data.auditLog.slice(-500);
        this.saveData();
    },

    renderAuditLog(el) {
        if (!this.hasPermission('view_audit')) {
            el.innerHTML = this._accessDenied('Audit Log');
            return;
        }

        const logs = (this.data.auditLog || []).slice().reverse();

        let html = '<div class="sa-page-header"><h1>Audit Log</h1>'
            + '<div class="sa-page-actions"><span class="text-muted" style="font-size:0.78rem;">' + logs.length + ' entries (last 500 kept)</span></div></div>';

        html += '<div class="sa-section"><div class="sa-section-header red"><div class="sa-section-title">Activity Log</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table" style="font-size:0.78rem;">';
        html += '<thead><tr><th style="width:140px;">Timestamp</th><th style="width:100px;">User</th><th style="width:120px;">Action</th><th>Details</th></tr></thead><tbody>';

        const actionColors = {
            LOGIN: 'sa-badge-success', LOGOUT: 'sa-badge-neutral', LOGIN_FAILED: 'sa-badge-danger',
            USER_CREATED: 'sa-badge-info', USER_UPDATED: 'sa-badge-warning', USER_DELETED: 'sa-badge-danger',
            PASSWORD_CHANGE: 'sa-badge-warning', PASSWORD_RESET: 'sa-badge-warning',
            SHIFT_CLOSED: 'sa-badge-pms', SHIFT_REOPENED: 'sa-badge-warning',
            VOID: 'sa-badge-danger', BRANCH_DELETED: 'sa-badge-danger'
        };

        if (logs.length === 0) {
            html += '<tr><td colspan="4" class="text-center text-muted" style="padding:30px;">No audit entries yet.</td></tr>';
        }

        logs.slice(0, 100).forEach(log => {
            const actionBadge = actionColors[log.action] || 'sa-badge-neutral';
            html += '<tr>'
                + '<td class="text-muted">' + new Date(log.timestamp).toLocaleString() + '</td>'
                + '<td><strong>' + log.username + '</strong></td>'
                + '<td><span class="sa-badge ' + actionBadge + '" style="font-size:0.6rem;">' + log.action + '</span></td>'
                + '<td>' + log.details + '</td></tr>';
        });

        html += '</tbody></table></div></div></div>';
        el.innerHTML = html;
    },

    // --- Access Denied Helper ---
    _accessDenied(pageName) {
        const user = this.getCurrentUser();
        const roleDef = user ? this.ROLES[user.role] : null;
        return '<div class="sa-access-denied">'
            + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
            + '<h3>Access Denied</h3>'
            + '<p>You do not have permission to access <strong>' + pageName + '</strong>.</p>'
            + (roleDef ? '<p>Your role: <span class="sa-badge ' + roleDef.color + '">' + roleDef.label + '</span></p>' : '')
            + '<p style="margin-top:12px;">Contact a Super Admin to request access.</p></div>';
    },

    // --- Super Admin Password Override for Closed Shifts ---
    // Shows a modal requesting super admin password; calls callback on success
    showSuperAdminOverride(actionDesc, callback) {
        const html = '<div style="text-align:center;margin-bottom:16px;">'
            + '<svg viewBox="0 0 24 24" fill="none" stroke="var(--sa-danger)" stroke-width="2" width="40" height="40"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
            + '<h3 style="margin:8px 0 4px;color:var(--sa-danger);">Shift Closed — Override Required</h3>'
            + '<p style="font-size:0.82rem;color:var(--sa-text-muted);">This shift is closed. To <strong>' + actionDesc + '</strong>, a Super Admin password is required.</p></div>'
            + '<div class="sa-form-group"><label>Super Admin Password</label><input class="sa-input" id="saOverridePwd" type="password" placeholder="Enter super admin password" onkeydown="if(event.key===\'Enter\')SA._doSuperAdminOverride()"></div>'
            + '<div id="saOverrideError" style="color:var(--sa-danger);font-size:0.78rem;text-align:center;display:none;margin-bottom:8px;"></div>'
            + '<div class="sa-modal-actions" style="padding:12px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-danger" onclick="SA._doSuperAdminOverride()">Override & Proceed</button></div>';
        this._superAdminOverrideCallback = callback;
        this.openModal('Super Admin Override', html);
        setTimeout(() => { const inp = document.getElementById('saOverridePwd'); if (inp) inp.focus(); }, 150);
    },

    _doSuperAdminOverride() {
        const pwd = document.getElementById('saOverridePwd').value;
        const errEl = document.getElementById('saOverrideError');
        // Find any active super_admin user and verify password
        const admins = this.data.users.filter(u => u.role === 'super_admin' && u.is_active);
        const validAdmin = admins.find(a => this.verifyPassword(pwd, a.password));
        if (!validAdmin) {
            if (errEl) { errEl.textContent = 'Invalid super admin password'; errEl.style.display = 'block'; }
            return;
        }
        this.auditLog('ADMIN_OVERRIDE', 'Super admin override by ' + validAdmin.full_name + ' on closed shift');
        this.closeModal();
        if (this._superAdminOverrideCallback) {
            this._closedShiftBypass = true;
            this._superAdminOverrideCallback();
            this._closedShiftBypass = false;
            this._superAdminOverrideCallback = null;
        }
    },

    // Check if current date shift is closed; if so, require super admin override
    // Returns true if NOT closed (proceed normally), false if closed (override shown)
    _closedShiftBypass: false,

    _guardClosedShift(actionDesc, callback) {
        if (this._closedShiftBypass) return true; // bypass after override
        if (!this.currentBranch || !this.currentDate) return true;
        const isClosed = this.isShiftClosed(this.currentBranch.id, this.currentDate);
        if (!isClosed) return true; // not closed, proceed
        this.showSuperAdminOverride(actionDesc, callback);
        return false; // closed, override required
    },

    // ============================================================
    // VOID VS DELETE (Reversing Entries)
    // ============================================================
    voidCreditSale(id) {
        if (!this.hasPermission('void_transactions')) { this.toast('Permission denied — only managers can void', 'error'); return; }
        const key = this.bk(this.currentBranch.id, this.currentDate);
        const entry = this._findById(this.data.creditSales[key], id);
        if (!entry) return;

        if (entry.is_voided) {
            this.toast('Already voided', 'warning');
            return;
        }

        if (!confirm('Void this credit sale? A reversing entry will be created.')) return;

        const litres = this.parseNum(entry.litres);
        const pp = this.parseNum(entry.pump_price);
        const sp = this.parseNum(entry.selling_price);
        const disc = (litres * pp) - (litres * sp);
        const creditAmt = (pp * litres) - disc;

        // Mark as voided
        entry.is_voided = true;
        entry.voided_at = new Date().toISOString();
        entry.voided_by = this.getCurrentUser() ? this.getCurrentUser().full_name : 'System';

        // Create reversing transaction with FK validation and branch_id
        if (entry.customer_id) {
            const custExists = this.data.customers.find(c => c.id === entry.customer_id);
            if (!custExists) {
                this.toast('Warning: Customer no longer exists — reversal transaction skipped', 'warning');
            }
            const cust = custExists;
            var txnId = this.uid();
            this.data.customerTransactions.push({
                id: txnId, _id: txnId, customer_id: entry.customer_id,
                branch_id: this.currentBranch ? this.currentBranch.id : null,
                transaction_date: this.currentDate,
                description: 'VOID: Credit Sale reversed — ' + litres + 'L ' + entry.product,
                transaction_type: 'CREDIT', debit_amount: 0, credit_amount: creditAmt,
                reference_id: entry._id, reference_type: 'VOID_CREDIT_SALE',
                created_at: new Date().toISOString()
            });
            this.auditLog('VOID', 'Voided credit sale: ' + litres + 'L ' + entry.product + ' to ' + (cust ? cust.name : 'Unknown') + ' (UGX ' + this.fmtInt(creditAmt) + ')');
        } else {
            this.auditLog('VOID', 'Voided credit sale: ' + litres + 'L ' + entry.product + ' (UGX ' + this.fmtInt(creditAmt) + ')');
        }

        this.saveData();
        this.toast('Credit sale voided (reversing entry created)');
        this.navigate('credit_sales');
    },

    voidPayment(id) {
        if (!this.hasPermission('void_transactions')) { this.toast('Permission denied — only managers can void', 'error'); return; }
        const key = this.bk(this.currentBranch.id, this.currentDate);
        const p = this._findById(this.data.payments[key], id);
        if (!p) return;

        if (p.is_voided) {
            this.toast('Already voided', 'warning');
            return;
        }

        if (!confirm('Void this payment? A reversing entry will be created.')) return;

        p.is_voided = true;
        p.voided_at = new Date().toISOString();
        p.voided_by = this.getCurrentUser() ? this.getCurrentUser().full_name : 'System';

        // Create reversing transaction with branch_id
        if (p.customer_id) {
            var txnId = this.uid();
            this.data.customerTransactions.push({
                id: txnId, _id: txnId, customer_id: p.customer_id,
                branch_id: this.currentBranch ? this.currentBranch.id : null,
                transaction_date: this.currentDate,
                description: 'VOID: Payment reversed — ' + (p.description || 'Payment'),
                transaction_type: 'DEBIT', debit_amount: this.parseNum(p.amount), credit_amount: 0,
                reference_id: p._id, reference_type: 'VOID_PAYMENT',
                created_at: new Date().toISOString()
            });
        }

        this.auditLog('VOID', 'Voided payment: ' + (p.description || 'Payment') + ' (UGX ' + this.fmtInt(this.parseNum(p.amount)) + ')');
        this.saveData();
        this.toast('Payment voided (reversing entry created)');
        this.navigate('expenses');
    },

    // ============================================================
    // BANK STATEMENTS (shared across branches)
    // ============================================================
    _currentBankId: null,

    initBanks() {
        if (!this.data.banks) this.data.banks = [];
        if (this.data.banks.length === 0) {
            this.data.banks = [
                { id: this.uid(), name: 'Stanbic Bank Gulu', code: 'STB-GULU', is_active: true },
                { id: this.uid(), name: 'Stanbic Bank Lira', code: 'STB-LIRA', is_active: true }
            ];
            this.saveData();
        }
    },

    renderBankStatements(el) {
        this.initBanks();
        const banks = this.data.banks.filter(b => b.is_active);
        const selectedBank = this._currentBankId ? this.data.banks.find(b => b.id === this._currentBankId) : banks[0];
        if (selectedBank && !this._currentBankId) this._currentBankId = selectedBank.id;

        let html = '<div class="sa-page-header"><h1>Bank Statements</h1>'
            + '<div class="sa-page-actions">'
            + '<button class="sa-btn sa-btn-primary sa-btn-sm" onclick="SA.showAddBank()">+ Add Bank</button>'
            + '</div></div>';

        // Bank selector tabs
        html += '<div class="sa-tabs" style="flex-wrap:wrap;">';
        banks.forEach(b => {
            html += '<button class="sa-tab' + (b.id === this._currentBankId ? ' active' : '') + '" onclick="SA._currentBankId=' + b.id + ';SA.navigate(\'bank_statements\')">' + b.name + '</button>';
        });
        html += '</div>';

        if (!selectedBank) {
            html += '<div class="sa-empty"><h3>No banks configured</h3><p>Add a bank to get started.</p></div>';
            el.innerHTML = html;
            return;
        }

        // Bank info bar
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:var(--sa-bg-card);border:1px solid var(--sa-border);border-radius:8px;margin-bottom:16px;">'
            + '<div><strong>' + selectedBank.name + '</strong> <span class="sa-badge sa-badge-neutral">' + selectedBank.code + '</span></div>'
            + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.showEditBank(\'' + selectedBank.id + '\')">Edit / Delete</button></div>';

        // Build monthly statement: all transactions across all branches for this bank
        let allTxns = [];

        // 1. Manual bank transactions
        for (let d = 1; d <= this.DAYS_IN_MONTH; d++) {
            const ds = this.dateStr(d);
            const bKey = 'bank_' + selectedBank.id + '_' + ds;
            const txs = this.data.bankTransactions[bKey] || [];
            txs.forEach(t => {
                allTxns.push({
                    date: ds, description: t.description,
                    deposit: this.parseNum(t.deposit), withdrawal: this.parseNum(t.withdrawal),
                    source: 'Manual', _idx: allTxns.length
                });
            });
        }

        // 2. Customer payments via "Bank Transfer" — across ALL branches
        this.data.customerTransactions.forEach(t => {
            if (t.transaction_type !== 'CREDIT' || t.payment_method !== 'Bank Transfer') return;
            const cust = this.data.customers.find(c => c.id === t.customer_id);
            // Check if this payment specifies this bank, or default to first bank
            const bankId = t.bank_id || (banks.length > 0 ? banks[0].id : 0);
            if (bankId !== selectedBank.id) return;
            allTxns.push({
                date: t.transaction_date,
                description: 'Customer Payment: ' + (cust ? cust.name : 'Unknown') + (t.receipt_number ? ' (Ref: ' + t.receipt_number + ')' : ''),
                deposit: this.parseNum(t.credit_amount), withdrawal: 0,
                source: 'Customer', _idx: allTxns.length
            });
        });

        allTxns.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

        // Statement table
        html += '<div class="sa-section"><div class="sa-section-header" style="--section-bg:rgba(16,185,129,0.06);"><div class="sa-section-title">' + selectedBank.name + ' — ' + this.monthLabel() + ' Statement</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th style="width:95px;">Date</th><th>Description</th><th>Source</th>'
            + '<th class="text-right" style="width:130px;">Deposit</th>'
            + '<th class="text-right" style="width:130px;">Withdrawal</th>'
            + '<th class="text-right" style="width:140px;">Balance</th></tr></thead><tbody>';

        let runBal = 0, totalDep = 0, totalWith = 0, prevDate = '';
        allTxns.forEach(t => {
            runBal += t.deposit - t.withdrawal;
            totalDep += t.deposit;
            totalWith += t.withdrawal;
            const showDate = t.date !== prevDate;
            prevDate = t.date;
            html += '<tr' + (showDate ? ' style="border-top:2px solid var(--sa-border-light);"' : '') + '>'
                + '<td' + (showDate ? ' style="font-weight:600;"' : '') + '>' + (showDate ? this.formatDate(t.date) : '') + '</td>'
                + '<td>' + t.description + '</td>'
                + '<td><span class="sa-badge ' + (t.source === 'Customer' ? 'sa-badge-success' : 'sa-badge-neutral') + '" style="font-size:0.6rem;">' + t.source + '</span></td>'
                + '<td class="text-right mono" style="color:var(--sa-success);">' + (t.deposit > 0 ? '+ ' + this.fmtInt(t.deposit) : '') + '</td>'
                + '<td class="text-right mono" style="color:var(--sa-danger);">' + (t.withdrawal > 0 ? '- ' + this.fmtInt(t.withdrawal) : '') + '</td>'
                + '<td class="text-right mono text-bold">' + this.fmtInt(runBal) + '</td></tr>';
        });

        if (allTxns.length === 0) {
            html += '<tr><td colspan="6" class="text-center text-muted" style="padding:40px;">No transactions. Add manual entries or record customer payments via Bank Transfer.</td></tr>';
        }

        html += '<tr class="total-row" style="background:var(--sa-bg-card-hover);"><td colspan="3" class="text-bold">TOTALS</td>'
            + '<td class="text-right mono text-bold text-success">' + this.fmtInt(totalDep) + '</td>'
            + '<td class="text-right mono text-bold text-danger">' + this.fmtInt(totalWith) + '</td>'
            + '<td class="text-right mono text-bold">' + this.fmtInt(runBal) + '</td></tr>';
        html += '</tbody></table></div></div></div>';

        // Add manual transaction
        html += '<div class="sa-section"><div class="sa-section-header" style="--section-bg:rgba(16,185,129,0.06);"><div class="sa-section-title">Add Transaction</div></div><div class="sa-section-body">';
        html += '<div class="sa-form-row">'
            + '<div class="sa-form-group"><label>Date</label><input type="date" class="sa-input" id="btDate" value="' + (this.currentDate || this.todayStr()) + '" min="' + this.monthStart() + '" max="' + this.monthEnd() + '"></div>'
            + '<div class="sa-form-group" style="flex:2;"><label>Description</label><input class="sa-input" id="btDesc" placeholder="e.g. Cash deposit, Transfer from branch"></div>'
            + '<div class="sa-form-group"><label>Deposit</label><input class="sa-input mono" id="btDep" placeholder="0"></div>'
            + '<div class="sa-form-group"><label>Withdrawal</label><input class="sa-input mono" id="btWith" placeholder="0"></div>'
            + '</div>'
            + '<button class="sa-btn sa-btn-primary sa-btn-sm" onclick="SA.addBankTxn()">Add Entry</button>';
        html += '</div></div>';

        el.innerHTML = html;
    },

    addBankTxn() {
        const date = document.getElementById('btDate').value;
        const desc = document.getElementById('btDesc').value.trim();
        const dep = this.parseNum(document.getElementById('btDep').value);
        const wth = this.parseNum(document.getElementById('btWith').value);
        if (!desc || (dep <= 0 && wth <= 0)) { this.toast('Enter description and amount', 'error'); return; }
        const bKey = 'bank_' + this._currentBankId + '_' + date;
        if (!this.data.bankTransactions[bKey]) this.data.bankTransactions[bKey] = [];
        this.data.bankTransactions[bKey].push({ description: desc, deposit: dep, withdrawal: wth, created_at: new Date().toISOString() });
        this.saveData();
        this.toast('Bank transaction added');
        this.navigate('bank_statements');
    },

    showAddBank() {
        const html = '<div class="sa-form-group"><label>Bank Name</label><input class="sa-input" id="nbName" placeholder="e.g. Stanbic Bank Kitgum"></div>'
            + '<div class="sa-form-group"><label>Code</label><input class="sa-input" id="nbCode" placeholder="e.g. STB-KTG"></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveNewBank()">Add Bank</button></div>';
        this.openModal('Add New Bank', html);
    },

    saveNewBank() {
        const name = document.getElementById('nbName').value.trim();
        const code = document.getElementById('nbCode').value.trim().toUpperCase();
        if (!name) { this.toast('Bank name required', 'error'); return; }
        this.data.banks.push({ id: this.uid(), name: name, code: code || name.substring(0, 8).toUpperCase(), is_active: true });
        this.saveData();
        this.closeModal();
        this.toast('Bank "' + name + '" added');
        this.navigate('bank_statements');
    },

    showEditBank(bankId) {
        const b = this.data.banks.find(bk => bk.id === bankId);
        if (!b) return;
        const html = '<div class="sa-form-group"><label>Bank Name</label><input class="sa-input" id="ebkName" value="' + b.name + '"></div>'
            + '<div class="sa-form-group"><label>Code</label><input class="sa-input" id="ebkCode" value="' + b.code + '"></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-danger" onclick="SA.deleteBank(\'' + bankId + '\')" style="margin-right:auto;">Delete</button>'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveEditBank2(\'' + bankId + '\')">Save</button></div>';
        this.openModal('Edit Bank — ' + b.name, html);
    },

    saveEditBank2(bankId) {
        const b = this.data.banks.find(bk => bk.id === bankId);
        if (!b) return;
        b.name = document.getElementById('ebkName').value.trim();
        b.code = document.getElementById('ebkCode').value.trim().toUpperCase();
        this.saveData(); this.closeModal(); this.toast('Bank updated');
        this.navigate('bank_statements');
    },

    deleteBank(bankId) {
        if (!confirm('Delete this bank and all its transactions?')) return;
        this.data.banks = this.data.banks.filter(b => b.id !== bankId);
        Object.keys(this.data.bankTransactions).forEach(k => {
            if (k.startsWith('bank_' + bankId + '_')) delete this.data.bankTransactions[k];
        });
        this._currentBankId = null;
        this.saveData(); this.closeModal(); this.toast('Bank deleted');
        this.navigate('bank_statements');
    },

    // ============================================================
    // Stock Level Helper — gets latest dipped stock for a branch/product
    getLatestStock(branchId, product) {
        for (let d = this.DAYS_IN_MONTH; d >= 1; d--) {
            const ds = this.dateStr(d);
            const wsKey = branchId + '_' + product + '_' + ds;
            const ws = this.data.wetstockDaily[wsKey];
            if (ws && this.parseNum(ws.closing_dipped_stock) > 0) {
                return { date: ds, stock: this.parseNum(ws.closing_dipped_stock) };
            }
        }
        return null;
    },

    // Get stock alerts for a branch
    getStockAlerts(branchId) {
        const b = this.data.branches.find(br => String(br.id) === String(branchId));
        if (!b) return [];
        const alerts = [];
        ['PMS', 'AGO'].forEach(prod => {
            const latest = this.getLatestStock(branchId, prod);
            if (!latest) return;
            const lowThreshold = prod === 'PMS' ? (b.pms_low_stock || 2000) : (b.ago_low_stock || 2000);
            const reorderPoint = prod === 'PMS' ? (b.pms_reorder_point || 5000) : (b.ago_reorder_point || 5000);
            if (latest.stock <= lowThreshold) {
                alerts.push({ type: 'critical', product: prod, stock: latest.stock, threshold: lowThreshold, date: latest.date,
                    message: prod + ' CRITICALLY LOW: ' + this.fmt(latest.stock, 1) + 'L (threshold: ' + this.fmtInt(lowThreshold) + 'L)' });
            } else if (latest.stock <= reorderPoint) {
                alerts.push({ type: 'reorder', product: prod, stock: latest.stock, threshold: reorderPoint, date: latest.date,
                    message: prod + ' below reorder point: ' + this.fmt(latest.stock, 1) + 'L (reorder at: ' + this.fmtInt(reorderPoint) + 'L) — Schedule delivery' });
            }
        });
        return alerts;
    },

    // WETSTOCK RECONCILIATION
    // ============================================================
    _wsProduct: 'PMS',

    renderWetstock(el) {
        if (!this.currentBranch) { el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>'; return; }
        const bid = this.currentBranch.id;
        const prod = this._wsProduct;
        const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

        let html = '<div class="sa-page-header"><h1>' + this.currentBranch.name + ' — Wetstock Reconciliation</h1></div>';

        // Product tabs
        html += '<div class="sa-tabs">'
            + '<button class="sa-tab' + (prod === 'PMS' ? ' active' : '') + '" onclick="SA._wsProduct=\'PMS\';SA.navigate(\'wetstock\')">PMS (Petrol)</button>'
            + '<button class="sa-tab' + (prod === 'AGO' ? ' active' : '') + '" onclick="SA._wsProduct=\'AGO\';SA.navigate(\'wetstock\')">AGO (Diesel)</button>'
            + '</div>';

        // Table
        html += '<div class="sa-section"><div class="sa-section-header" style="--section-bg:' + (prod === 'PMS' ? 'rgba(232,69,14,0.06)' : 'rgba(59,130,246,0.06)') + ';">'
            + '<div class="sa-section-title">' + prod + ' — ' + this.monthLabel() + '</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap" style="overflow-x:auto;">'
            + '<table class="sa-table" style="min-width:1300px;font-size:0.78rem;">';

        html += '<thead><tr style="background:var(--sa-bg-card-hover);">'
            + '<th style="min-width:85px;">Date</th>'
            + '<th style="min-width:75px;font-style:italic;">Day</th>'
            + '<th class="text-right" style="min-width:75px;background:#FABF8F22;">Price/L</th>'
            + '<th class="text-right" style="min-width:95px;"><span style="color:#c00;font-weight:800;">A</span> Opening</th>'
            + '<th class="text-right" style="min-width:95px;background:#FABF8F22;"><span style="color:#c00;font-weight:800;">B</span> Deliveries</th>'
            + '<th class="text-right" style="min-width:80px;background:#e8f5e922;"><span style="color:#2e7d32;font-weight:800;">B2</span> Transfers</th>'
            + '<th class="text-right" style="min-width:95px;background:#FABF8F22;"><span style="color:#c00;font-weight:800;">C</span> Sales</th>'
            + '<th class="text-right" style="min-width:95px;background:#FABF8F22;"><span style="color:#c00;font-weight:800;">D</span> Book Stock</th>'
            + '<th class="text-right" style="min-width:110px;"><span style="color:#c00;font-weight:800;">E</span> Dipped Stock</th>'
            + '<th class="text-right" style="min-width:95px;background:#FABF8F22;"><span style="color:#c00;font-weight:800;">F</span> Variance</th>'
            + '<th class="text-right" style="min-width:95px;background:#FABF8F22;"><span style="color:#c00;font-weight:800;">G</span> CUM Var</th>'
            + '<th class="text-right" style="min-width:95px;background:#FABF8F22;"><span style="color:#c00;font-weight:800;">H</span> CUM Sales</th>'
            + '</tr></thead><tbody>';

        let cumVar = 0, cumSales = 0, totalDeliveries = 0, totalSales = 0, totalVar = 0;

        for (let d = 1; d <= this.DAYS_IN_MONTH; d++) {
            const ds = this.dateStr(d);
            const wsKey = bid + '_' + prod + '_' + ds;
            const ws = this.data.wetstockDaily[wsKey] || {};
            const dateObj = new Date(ds);
            const dayName = DAYS[dateObj.getDay()];

            // Price from shift data
            const sdKey = this.bk(bid, ds);
            const sd = this.data.shiftDates[sdKey] || {};
            const price = prod === 'PMS' ? this.parseNum(sd.pms_sp) : this.parseNum(sd.ago_sp);

            // Opening: Day 1 = manual, Day 2+ = prev dipped
            let opening = 0;
            if (d === 1) {
                opening = this.parseNum(ws.opening_stock);
            } else {
                const prevDs = this.dateStr(d - 1);
                const prevWsKey = bid + '_' + prod + '_' + prevDs;
                const prevWs = this.data.wetstockDaily[prevWsKey] || {};
                opening = this.parseNum(prevWs.closing_dipped_stock);
            }

            // Deliveries from fuel_deliveries
            const deliveries = this.data.fuelDeliveries
                .filter(fd => fd.branch_id === bid && fd.product_type === prod && fd.delivery_date === ds)
                .reduce((s, fd) => s + this.parseNum(fd.loaded_qty), 0);

            // Inter-branch fuel transfers (only Received transfers affect stock)
            const tfVol = this._getTransferVolume(bid, prod, ds);

            // Sales from shift analysis
            const calc = this.data.shiftDates[sdKey] ? this.calculateDate(bid, ds) : null;
            const sales = calc ? (prod === 'PMS' ? calc.pmsVolume : calc.agoVolume) : 0;

            // Calculated: Opening + Deliveries + TransferIn - TransferOut - Sales
            const bookStock = opening + deliveries + tfVol.net - sales;
            const dipped = this.parseNum(ws.closing_dipped_stock);
            const variance = dipped > 0 ? dipped - bookStock : 0;

            cumVar += variance;
            cumSales += sales;
            totalDeliveries += deliveries;
            totalSales += sales;
            totalVar += variance;

            const varColor = variance > 0 ? 'color:var(--sa-success);' : variance < 0 ? 'color:var(--sa-danger);' : '';
            const cumVarColor = cumVar > 0 ? 'color:var(--sa-success);' : cumVar < 0 ? 'color:var(--sa-danger);' : '';
            const autoBg = 'background:#FABF8F22;';

            html += '<tr>'
                + '<td style="font-family:\'Book Antiqua\',serif;">' + this.formatDate(ds) + '</td>'
                + '<td style="font-style:italic;color:var(--sa-text-muted);">' + dayName.substring(0, 3) + '</td>'
                + '<td class="text-right mono" style="' + autoBg + '">' + (price > 0 ? this.fmtInt(price) : '') + '</td>';

            // Opening
            if (d === 1) {
                html += '<td class="text-right"><input class="sa-input sa-input-sm mono" style="text-align:right;width:90px;" value="' + (ws.opening_stock || '') + '" onchange="SA._stageWS(\'' + wsKey + '\',\'opening_stock\',this.value)"></td>';
            } else {
                html += '<td class="text-right mono" style="' + autoBg + '">' + (opening > 0 ? this.fmt(opening, 3) : '') + '</td>';
            }

            var tfBg = 'background:#e8f5e922;';
            var tfText = '';
            if (tfVol.incoming > 0 && tfVol.outgoing > 0) { tfText = '+' + this.fmt(tfVol.incoming, 1) + '/-' + this.fmt(tfVol.outgoing, 1); }
            else if (tfVol.incoming > 0) { tfText = '<span style="color:var(--sa-success);">+' + this.fmt(tfVol.incoming, 1) + '</span>'; }
            else if (tfVol.outgoing > 0) { tfText = '<span style="color:var(--sa-danger);">-' + this.fmt(tfVol.outgoing, 1) + '</span>'; }

            html += '<td class="text-right mono" style="' + autoBg + '">' + (deliveries > 0 ? this.fmt(deliveries, 3) : '') + '</td>'
                + '<td class="text-right mono" style="' + tfBg + 'font-size:0.72rem;">' + tfText + '</td>'
                + '<td class="text-right mono" style="' + autoBg + '">' + (sales > 0 ? this.fmt(sales, 3) : '') + '</td>'
                + '<td class="text-right mono" style="' + autoBg + 'font-weight:600;">' + (opening > 0 || deliveries > 0 || sales > 0 || tfVol.net !== 0 ? this.fmt(bookStock, 3) : '') + '</td>';

            // Dipped — manual
            html += '<td class="text-right"><input class="sa-input sa-input-sm mono" style="text-align:right;width:100px;" value="' + (ws.closing_dipped_stock || '') + '" onchange="SA._stageWS(\'' + wsKey + '\',\'closing_dipped_stock\',this.value)"></td>';

            html += '<td class="text-right mono" style="' + autoBg + varColor + 'font-weight:600;">' + (dipped > 0 ? this.fmt(variance, 3) : '') + '</td>'
                + '<td class="text-right mono" style="' + autoBg + cumVarColor + '">' + (dipped > 0 || cumVar !== 0 ? this.fmt(cumVar, 3) : '') + '</td>'
                + '<td class="text-right mono" style="' + autoBg + '">' + (cumSales > 0 ? this.fmt(cumSales, 3) : '') + '</td>';

            html += '</tr>';
        }

        // Totals
        html += '<tr class="total-row" style="background:var(--sa-bg-card-hover);font-weight:700;">'
            + '<td colspan="4" class="text-bold">TOTALS</td>'
            + '<td class="text-right mono">' + this.fmt(totalDeliveries, 3) + '</td>'
            + '<td></td>'
            + '<td class="text-right mono">' + this.fmt(totalSales, 3) + '</td>'
            + '<td></td><td></td>'
            + '<td class="text-right mono" style="' + (totalVar > 0 ? 'color:var(--sa-success);' : totalVar < 0 ? 'color:var(--sa-danger);' : '') + '">' + this.fmt(totalVar, 3) + '</td>'
            + '<td></td><td></td></tr>';

        html += '</tbody></table></div></div></div>';

        // Summary cards
        html += '<div class="sa-stats">';
        html += '<div class="sa-stat-card ' + (prod === 'PMS' ? 'pms' : 'ago') + '"><div class="stat-label">Total ' + prod + ' Sales</div><div class="stat-value">' + this.fmt(totalSales, 3) + ' L</div></div>';
        html += '<div class="sa-stat-card info"><div class="stat-label">Total Deliveries</div><div class="stat-value">' + this.fmt(totalDeliveries, 3) + ' L</div></div>';
        html += '<div class="sa-stat-card ' + (totalVar >= 0 ? 'success' : 'danger') + '"><div class="stat-label">Cumulative Variance</div><div class="stat-value">' + this.fmt(cumVar, 3) + ' L</div><div class="stat-sub">' + (totalVar >= 0 ? 'Gain' : 'Loss') + '</div></div>';
        html += '</div>';

        // Stock alert for current product
        const wsLatest = this.getLatestStock(bid, prod);
        if (wsLatest) {
            const branch = this.data.branches.find(br => br.id === bid);
            const lowThreshold = prod === 'PMS' ? (branch.pms_low_stock || 2000) : (branch.ago_low_stock || 2000);
            const reorderPoint = prod === 'PMS' ? (branch.pms_reorder_point || 5000) : (branch.ago_reorder_point || 5000);
            if (wsLatest.stock <= lowThreshold) {
                html += '<div class="sa-stock-alert critical">'
                    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" style="color:var(--sa-danger);flex-shrink:0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
                    + '<div style="flex:1;"><strong>' + prod + ' CRITICALLY LOW: ' + this.fmt(wsLatest.stock, 1) + ' Litres</strong>'
                    + '<div style="font-size:0.72rem;color:var(--sa-text-dim);">Threshold: ' + this.fmtInt(lowThreshold) + 'L &mdash; As of ' + this.formatDate(wsLatest.date) + '</div></div>'
                    + '<button class="sa-btn sa-btn-danger sa-btn-sm" onclick="SA.navigate(\'deliveries\')">Schedule Delivery</button></div>';
            } else if (wsLatest.stock <= reorderPoint) {
                html += '<div class="sa-stock-alert reorder">'
                    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" style="color:var(--sa-warning);flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
                    + '<div style="flex:1;"><strong>' + prod + ' below reorder point: ' + this.fmt(wsLatest.stock, 1) + ' Litres</strong>'
                    + '<div style="font-size:0.72rem;color:var(--sa-text-dim);">Reorder at: ' + this.fmtInt(reorderPoint) + 'L &mdash; As of ' + this.formatDate(wsLatest.date) + '</div></div>'
                    + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.navigate(\'deliveries\')">Schedule Delivery</button></div>';
            }
        }

        html += '<div style="padding:12px 0;text-align:right;">'
            + '<button class="sa-btn sa-btn-primary" onclick="SA._commitWS()" style="padding:10px 32px;font-size:0.95rem;font-weight:700;gap:6px;">'
            + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>'
            + ' Update</button></div>';

        html += '<div class="sa-info-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + 'Only <strong>Opening Stock</strong> (Day 1) and <strong>Closing Dipped Stock</strong> (daily) are entered manually. '
            + 'Price, Deliveries, and Sales are auto-pulled from Shift Analysis and Delivery Schedules.</div>';

        el.innerHTML = html;
    },

    _wsPending: {},

    _stageWS(wsKey, field, value) {
        if (!this._wsPending[wsKey]) this._wsPending[wsKey] = {};
        this._wsPending[wsKey][field] = value;
    },

    _commitWS() {
        var pending = this._wsPending;
        var keys = Object.keys(pending);
        if (keys.length === 0) { this.toast('No changes to update', 'warning'); return; }

        // Validate
        for (var i = 0; i < keys.length; i++) {
            var wsKey = keys[i];
            var fields = pending[wsKey];
            var fieldNames = Object.keys(fields);
            for (var j = 0; j < fieldNames.length; j++) {
                var label = fieldNames[j] === 'opening_stock' ? 'Opening Stock' : 'Closing Dipped Stock';
                if (!this._validateLitres(fields[fieldNames[j]], label)) return;
            }
        }

        this._wsPending = {};
        var self = this;
        keys.forEach(function(wsKey) {
            var fields = pending[wsKey];
            Object.keys(fields).forEach(function(field) {
                self.updateWS(wsKey, field, fields[field]);
            });
        });
        this.toast('Wet stock updated', 'success');
    },

    updateWS(wsKey, field, value) {
        if (!this.data.wetstockDaily[wsKey]) this.data.wetstockDaily[wsKey] = {};
        var ws = this.data.wetstockDaily[wsKey];
        ws[field] = this.parseNum(value);
        if (!ws._id) ws._id = this.uid();
        this._touchUpdated(ws);
        if (!ws.created_at) { var s = this._auditStamp(); ws.created_at = s.created_at; ws.created_by = s.created_by; }
        this.saveData();
        this.navigate('wetstock');
    },

    // ============================================================
    // FUEL DELIVERY SCHEDULES
    // ============================================================
    renderDeliveries(el) {
        if (!this.currentBranch) { el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>'; return; }
        const bid = this.currentBranch.id;
        const canCost = this.hasPermission('edit_delivery_cost');
        const deliveries = this.data.fuelDeliveries.filter(fd => fd.branch_id === bid).sort((a, b) => a.delivery_date < b.delivery_date ? -1 : 1);

        // Count uncosted deliveries for notification
        const uncostCount = deliveries.filter(fd => !this._isDeliveryCosted(fd)).length;

        let html = '<div class="sa-page-header"><h1>Delivery Schedules &mdash; ' + this.currentBranch.name + '</h1>'
            + '<div class="sa-page-actions"><button class="sa-btn sa-btn-primary" onclick="SA.showAddDelivery()">+ New Delivery</button></div></div>';

        // Pending costing notification banner (visible to super_admin)
        if (canCost && uncostCount > 0) {
            html += '<div class="sa-info-box" style="background:rgba(245,158,11,0.08);border-left:4px solid var(--sa-warning);margin-bottom:16px;">'
                + '<svg viewBox="0 0 24 24" fill="none" stroke="var(--sa-warning)" stroke-width="2" width="20" height="20" style="flex-shrink:0;">'
                + '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
                + '<div><strong>' + uncostCount + ' delivery' + (uncostCount > 1 ? 'ies' : '') + ' pending costing</strong>'
                + '<div style="font-size:0.75rem;color:var(--sa-text-dim);margin-top:2px;">Click the "Cost" button on each row to enter the price per litre. Until costed, the last known cost is used as a provisional estimate for P&L calculations.</div></div></div>';
        }

        html += '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">' + this.monthLabel() + ' Deliveries</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap" style="overflow-x:auto;"><table class="sa-table" style="min-width:' + (canCost ? '1200' : '900') + 'px;font-size:0.78rem;">';
        html += '<thead><tr><th>Date</th><th>Truck No</th><th>Transporter</th><th>Product</th>'
            + '<th class="text-right">Loaded Qty @20</th><th class="text-right">Shorts</th>'
            + '<th class="text-right">Dip After</th>'
            + '<th style="text-align:center;">Status</th>'
            + (canCost ? '<th class="text-right">Price/L</th><th class="text-right">Amount</th><th class="text-right">Avg Cost</th>' : '')
            + '<th></th></tr></thead><tbody>';

        let totalPmsQty = 0, totalAgoQty = 0, totalAmt = 0;
        deliveries.forEach((fd, i) => {
            const qty = this.parseNum(fd.loaded_qty);
            const price = this.parseNum(fd.price_per_litre);
            const amt = qty * price;
            if (fd.product_type === 'PMS') totalPmsQty += qty; else totalAgoQty += qty;
            totalAmt += amt;

            const isCosted = this._isDeliveryCosted(fd);
            const statusBadge = isCosted
                ? '<span class="sa-badge sa-badge-success" style="font-size:0.68rem;">Costed</span>'
                : '<span class="sa-badge sa-badge-warning" style="font-size:0.68rem;">Pending</span>';

            html += '<tr>'
                + '<td>' + this.formatDate(fd.delivery_date) + '</td>'
                + '<td><strong>' + (fd.truck_no || '') + '</strong></td>'
                + '<td>' + (fd.transporter || '') + '</td>'
                + '<td><span class="sa-badge ' + (fd.product_type === 'PMS' ? 'sa-badge-pms' : 'sa-badge-ago') + '">' + fd.product_type + '</span></td>'
                + '<td class="text-right mono">' + this.fmt(qty, 3) + '</td>'
                + '<td class="text-right mono">' + (fd.shorts ? this.fmt(this.parseNum(fd.shorts), 3) : '—') + '</td>'
                + '<td class="text-right mono">' + (fd.dipping_after_offload ? this.fmt(this.parseNum(fd.dipping_after_offload), 3) : '—') + '</td>'
                + '<td style="text-align:center;">' + statusBadge + '</td>'
                + (canCost ? '<td class="text-right mono">' + (price > 0 ? this.fmtInt(price) : '—') + '</td>' : '')
                + (canCost ? '<td class="text-right mono text-bold">' + (amt > 0 ? this.fmtInt(amt) : '—') + '</td>' : '')
                + (canCost ? '<td class="text-right mono">' + (fd.avg_costing ? this.fmtInt(this.parseNum(fd.avg_costing)) : '—') + '</td>' : '')
                + '<td>'
                + (canCost && !isCosted ? '<button class="sa-btn sa-btn-warning sa-btn-sm" style="font-size:0.68rem;padding:2px 8px;margin-right:4px;" onclick="SA.showCostDelivery(\'' + fd.id + '\')">Cost</button>' : '')
                + (canCost && isCosted ? '<button class="sa-btn sa-btn-ghost sa-btn-sm" style="font-size:0.68rem;padding:2px 8px;margin-right:4px;" onclick="SA.showCostDelivery(\'' + fd.id + '\')">Edit Cost</button>' : '')
                + '<button class="sa-remove-btn" onclick="SA.removeDelivery(\'' + fd.id + '\')">&times;</button></td>'
                + '</tr>';
        });

        if (deliveries.length === 0) {
            const colSpan = canCost ? 12 : 9;
            html += '<tr><td colspan="' + colSpan + '" class="text-center text-muted" style="padding:30px;">No deliveries recorded. Click "+ New Delivery" to add one.</td></tr>';
        }

        const colSpan = canCost ? 12 : 9;
        html += '<tr class="total-row"><td colspan="4" class="text-bold">TOTALS</td>'
            + '<td class="text-right mono text-bold">' + this.fmt(totalPmsQty + totalAgoQty, 3) + '</td><td></td><td></td><td></td>'
            + (canCost ? '<td></td><td class="text-right mono text-bold">' + this.fmtInt(totalAmt) + '</td><td></td>' : '')
            + '<td></td></tr>';
        html += '</tbody></table></div></div></div>';

        // Summary
        html += '<div class="sa-stats">';
        html += '<div class="sa-stat-card pms"><div class="stat-label">PMS Delivered</div><div class="stat-value">' + this.fmt(totalPmsQty, 3) + ' L</div></div>';
        html += '<div class="sa-stat-card ago"><div class="stat-label">AGO Delivered</div><div class="stat-value">' + this.fmt(totalAgoQty, 3) + ' L</div></div>';
        if (canCost) {
            html += '<div class="sa-stat-card gold"><div class="stat-label">Total Amount</div><div class="stat-value">UGX ' + this.fmtInt(totalAmt) + '</div></div>';
        }
        if (uncostCount > 0) {
            html += '<div class="sa-stat-card ' + (canCost ? 'warning' : 'info') + '"><div class="stat-label">Pending Costing</div><div class="stat-value">' + uncostCount + '</div><div class="stat-sub">deliveries awaiting HO pricing</div></div>';
        }
        html += '</div>';

        el.innerHTML = html;
    },

    showAddDelivery() {
        const canCost = this.hasPermission('edit_delivery_cost');
        const html = '<div class="sa-form-row">'
            + '<div class="sa-form-group"><label>Date</label><input type="date" class="sa-input" id="fdDate" value="' + (this.currentDate || this.todayStr()) + '" min="' + this.monthStart() + '" max="' + this.monthEnd() + '"></div>'
            + '<div class="sa-form-group"><label>Product</label><select class="sa-input" id="fdProd"><option value="PMS">PMS</option><option value="AGO">AGO</option></select></div>'
            + '</div>'
            + '<div class="sa-form-row">'
            + '<div class="sa-form-group"><label>Truck No</label><input class="sa-input" id="fdTruck" placeholder="e.g. KDB 157R"></div>'
            + '<div class="sa-form-group"><label>Transporter</label><input class="sa-input" id="fdTrans" placeholder="e.g. GASCO ENERGY LTD"></div>'
            + '</div>'
            + '<div class="sa-form-row">'
            + '<div class="sa-form-group"><label>Loaded Qty @20 (L)</label><input class="sa-input mono" id="fdQty" placeholder="e.g. 18791"></div>'
            + '<div class="sa-form-group"><label>Shorts (L)</label><input class="sa-input mono" id="fdShorts" placeholder="0"></div>'
            + '</div>'
            + '<div class="sa-form-row">'
            + '<div class="sa-form-group"><label>Dipping After Offload (L)</label><input class="sa-input mono" id="fdDip" placeholder="Optional"></div>'
            + (canCost ? '<div class="sa-form-group"><label>Price/Litre (UGX)</label><input class="sa-input mono" id="fdPrice" placeholder="e.g. 4800"></div>' : '')
            + '</div>'
            + (canCost ? '<div class="sa-form-group"><label>Avg Costing (UGX)</label><input class="sa-input mono" id="fdAvg" placeholder="Optional"></div>' : '')
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveDelivery()">Save Delivery</button></div>';
        this.openModal('Record Fuel Delivery — ' + this.currentBranch.name, html);
    },

    saveDelivery() {
        const qty = this.parseNum(document.getElementById('fdQty').value);
        if (qty <= 0) { this.toast('Loaded Qty required', 'error'); return; }
        const priceEl = document.getElementById('fdPrice');
        const avgEl = document.getElementById('fdAvg');
        this.data.fuelDeliveries.push({
            id: this.uid(), branch_id: this.currentBranch.id,
            delivery_date: document.getElementById('fdDate').value,
            product_type: document.getElementById('fdProd').value,
            truck_no: document.getElementById('fdTruck').value.trim(),
            transporter: document.getElementById('fdTrans').value.trim(),
            loaded_qty: qty,
            shorts: this.parseNum(document.getElementById('fdShorts').value),
            price_per_litre: priceEl ? this.parseNum(priceEl.value) : 0,
            dipping_after_offload: this.parseNum(document.getElementById('fdDip').value) || null,
            avg_costing: avgEl ? (this.parseNum(avgEl.value) || null) : null,
            costed: priceEl ? (this.parseNum(priceEl.value) > 0) : false,
            created_at: new Date().toISOString()
        });
        this.saveData();
        this.closeModal();
        this.toast('Delivery recorded');
        this.navigate('deliveries');
    },

    removeDelivery(deliveryId) {
        if (!confirm('Remove this delivery record?')) return;
        this.data.fuelDeliveries = this.data.fuelDeliveries.filter(fd => fd.id !== deliveryId);
        this.saveData();
        this.navigate('deliveries');
    },

    // Check if a delivery has been costed by head office
    _isDeliveryCosted(fd) {
        return fd.costed === true || this.parseNum(fd.price_per_litre) > 0;
    },

    // Get last known cost for a product (across all branches or specific branch)
    // Used as provisional fallback for uncosted deliveries
    getLastKnownCost(productType, branchId) {
        const deliveries = this.data.fuelDeliveries
            .filter(fd => fd.product_type === productType && this._isDeliveryCosted(fd) && !fd.is_deleted)
            .sort((a, b) => (b.delivery_date || '').localeCompare(a.delivery_date || ''));
        // Prefer same branch first
        if (branchId) {
            const branchDel = deliveries.find(fd => fd.branch_id === branchId);
            if (branchDel) return this.parseNum(branchDel.price_per_litre);
        }
        // Fall back to any branch
        return deliveries.length > 0 ? this.parseNum(deliveries[0].price_per_litre) : 0;
    },

    // Get effective cost for a delivery (actual or provisional fallback)
    _getDeliveryCost(fd) {
        if (this._isDeliveryCosted(fd)) return this.parseNum(fd.price_per_litre);
        // Option A: Use last known cost as provisional estimate
        return this.getLastKnownCost(fd.product_type, fd.branch_id);
    },

    // Show modal for head office to enter/edit cost for a delivery
    showCostDelivery(deliveryId) {
        if (!this.hasPermission('edit_delivery_cost')) { this.toast('Only Head Office can set delivery costs', 'error'); return; }
        const fd = this.data.fuelDeliveries.find(d => d.id === deliveryId);
        if (!fd) { this.toast('Delivery not found', 'error'); return; }

        const qty = this.parseNum(fd.loaded_qty);
        const currentPrice = this.parseNum(fd.price_per_litre);
        const lastKnown = this.getLastKnownCost(fd.product_type, fd.branch_id);

        const html = '<div class="sa-info-box" style="margin-bottom:12px;">'
            + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + '<div><strong>' + fd.product_type + '</strong> &bull; ' + this.formatDate(fd.delivery_date) + ' &bull; ' + this.fmt(qty, 3) + ' L'
            + '<br><span style="font-size:0.75rem;color:var(--sa-text-dim);">Truck: ' + (fd.truck_no || '—') + ' &bull; Transporter: ' + (fd.transporter || '—') + '</span></div></div>'
            + '<div class="sa-form-row">'
            + '<div class="sa-form-group"><label>Price/Litre (UGX)</label><input class="sa-input mono" id="cdPrice" value="' + (currentPrice || '') + '" placeholder="e.g. 4800"'
            + ' oninput="var p=SA.parseNum(this.value);document.getElementById(\'cdAmt\').textContent=p>0?\'UGX \'+SA.fmtInt(p*' + qty + '):\'—\'"></div>'
            + '<div class="sa-form-group"><label>Total Amount</label><div id="cdAmt" class="mono" style="padding:10px 0;font-weight:600;font-size:1.1rem;">' + (currentPrice > 0 ? 'UGX ' + this.fmtInt(currentPrice * qty) : '—') + '</div></div>'
            + '</div>'
            + '<div class="sa-form-group"><label>Avg Costing Override (UGX)</label><input class="sa-input mono" id="cdAvg" value="' + (fd.avg_costing || '') + '" placeholder="Optional — leave blank to use weighted average"></div>'
            + (lastKnown > 0 ? '<div style="font-size:0.73rem;color:var(--sa-text-dim);margin-top:8px;">Last known ' + fd.product_type + ' cost: <strong>UGX ' + this.fmtInt(lastKnown) + '/L</strong></div>' : '')
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveCostDelivery(\'' + deliveryId + '\')">Save Cost</button></div>';
        this.openModal('Cost Delivery — ' + fd.product_type + ' ' + this.formatDate(fd.delivery_date), html);
    },

    // Save cost entered by head office
    saveCostDelivery(deliveryId) {
        if (!this.hasPermission('edit_delivery_cost')) { this.toast('Permission denied', 'error'); return; }
        const price = this.parseNum(document.getElementById('cdPrice').value);
        if (price <= 0) { this.toast('Please enter a valid price per litre', 'error'); return; }
        const fd = this.data.fuelDeliveries.find(d => d.id === deliveryId);
        if (!fd) { this.toast('Delivery not found', 'error'); return; }
        fd.price_per_litre = price;
        fd.avg_costing = this.parseNum(document.getElementById('cdAvg').value) || null;
        fd.costed = true;
        fd.costed_at = new Date().toISOString();
        fd.costed_by = (this.getCurrentUser() || {}).id || null;
        this.saveData();
        this.closeModal();
        this.toast('Delivery costed: UGX ' + this.fmtInt(price) + '/L', 'success');
        this.navigate('deliveries');
    },

    reportWetstockSummary() {
        let html = '<div class="sa-section"><div class="sa-section-header" style="--section-bg:rgba(59,130,246,0.06);"><div class="sa-section-title">Wetstock Summary — All Branches — ' + this.monthLabel() + '</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Branch</th><th>Product</th><th class="text-right">Total Sales (L)</th><th class="text-right">Total Deliveries (L)</th><th class="text-right">CUM Variance (L)</th><th class="text-right">Variance %</th></tr></thead><tbody>';

        this.data.branches.forEach(b => {
            ['PMS', 'AGO'].forEach(prod => {
                let totalSales = 0, totalDeliveries = 0, cumVar = 0;
                for (let d = 1; d <= this.DAYS_IN_MONTH; d++) {
                    const ds = this.dateStr(d);
                    const wsKey = b.id + '_' + prod + '_' + ds;
                    const ws = this.data.wetstockDaily[wsKey] || {};

                    // Opening
                    let opening = 0;
                    if (d === 1) { opening = this.parseNum(ws.opening_stock); }
                    else { const prevWs = this.data.wetstockDaily[b.id + '_' + prod + '_' + this.dateStr(d - 1)] || {}; opening = this.parseNum(prevWs.closing_dipped_stock); }

                    const deliveries = this.data.fuelDeliveries.filter(fd => fd.branch_id === b.id && fd.product_type === prod && fd.delivery_date === ds).reduce((s, fd) => s + this.parseNum(fd.loaded_qty), 0);
                    const tfVol = this._getTransferVolume(b.id, prod, ds);
                    const sdKey = this.bk(b.id, ds);
                    const calc = this.data.shiftDates[sdKey] ? this.calculateDate(b.id, ds) : null;
                    const sales = calc ? (prod === 'PMS' ? calc.pmsVolume : calc.agoVolume) : 0;
                    const bookStock = opening + deliveries + tfVol.net - sales;
                    const dipped = this.parseNum(ws.closing_dipped_stock);
                    const variance = dipped > 0 ? dipped - bookStock : 0;

                    totalSales += sales;
                    totalDeliveries += deliveries;
                    cumVar += variance;
                }
                const varPct = totalSales > 0 ? ((cumVar / totalSales) * 100) : 0;
                const varColor = cumVar >= 0 ? 'text-success' : 'text-danger';
                html += '<tr><td><strong>' + b.name + '</strong></td>'
                    + '<td><span class="sa-badge ' + (prod === 'PMS' ? 'sa-badge-pms' : 'sa-badge-ago') + '">' + prod + '</span></td>'
                    + '<td class="text-right mono">' + this.fmt(totalSales, 3) + '</td>'
                    + '<td class="text-right mono">' + this.fmt(totalDeliveries, 3) + '</td>'
                    + '<td class="text-right mono ' + varColor + ' text-bold">' + this.fmt(cumVar, 3) + '</td>'
                    + '<td class="text-right mono ' + varColor + '">' + this.fmt(varPct, 2) + '%</td></tr>';
            });
        });

        html += '</tbody></table></div></div></div>';
        html += '<div class="sa-info-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + 'Variance % = Cumulative Variance / Total Sales. Positive = gain, Negative = loss. Industry standard is &lt; 0.5% loss.</div>';
        return html;
    },

    reportCrossBranchCustomers() {
        // Find customers that exist at multiple branches or show all with balances
        const custMap = {};
        this.data.customers.forEach(c => {
            const key = c.name.toUpperCase().trim();
            if (!custMap[key]) custMap[key] = [];
            custMap[key].push({ customer: c, balance: this.getCustomerBalance(c.id), branch: this.data.branches.find(b => b.id === c.branch_id) });
        });

        let html = '<div class="sa-section"><div class="sa-section-header green"><div class="sa-section-title">Cross-Branch Customer Balances</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Customer Name</th><th>Branch</th><th class="text-right">Balance</th></tr></thead><tbody>';

        let grandTotal = 0;
        Object.keys(custMap).sort().forEach(name => {
            const entries = custMap[name];
            let custTotal = 0;
            entries.forEach((e, i) => {
                custTotal += e.balance;
                grandTotal += e.balance;
                html += '<tr>';
                html += '<td>' + (i === 0 ? '<strong>' + e.customer.name + '</strong>' : '') + '</td>';
                html += '<td>' + (e.branch ? e.branch.name : 'Unknown') + ' <span class="sa-badge sa-badge-neutral">' + (e.branch ? e.branch.branch_code : '') + '</span></td>';
                const bClass = e.balance > 0 ? 'text-danger' : e.balance < 0 ? 'text-success' : 'text-muted';
                html += '<td class="text-right mono ' + bClass + '">' + this.fmtInt(e.balance) + '</td>';
                html += '</tr>';
            });
            if (entries.length > 1) {
                html += '<tr style="background:rgba(240,165,0,0.05);"><td></td><td class="text-right text-bold" style="font-size:0.78rem;">COMBINED</td>';
                html += '<td class="text-right mono text-bold">' + this.fmtInt(custTotal) + '</td></tr>';
            }
        });

        if (Object.keys(custMap).length === 0) {
            html += '<tr><td colspan="3" class="text-center text-muted" style="padding:30px;">No customers across any branch.</td></tr>';
        }

        html += '<tr class="total-row"><td colspan="2" class="text-right text-bold">GRAND TOTAL</td>';
        html += '<td class="text-right mono text-bold">' + this.fmtInt(grandTotal) + '</td></tr>';
        html += '</tbody></table></div></div></div>';
        return html;
    },

    // ============================================================
    // CUSTOMER AGEING REPORT
    // ============================================================

    _ageingSortField: 'total',
    _ageingSortDir: 'desc',
    _ageingBranchFilter: 'all',

    reportCustomerAgeing() {
        const today = new Date();
        const allCustomers = this.data.customers.filter(c => c.is_active !== false && c.customer_type !== 'attendant');
        const branchFilter = this._ageingBranchFilter || 'all';

        // Build ageing data across all branches
        const agingRows = [];
        allCustomers.forEach(c => {
            if (branchFilter !== 'all' && String(c.branch_id) !== String(branchFilter)) return;
            const bal = this.getCustomerBalance(c.id);
            if (bal <= 0) return;

            const debits = this.data.customerTransactions
                .filter(t => t.customer_id === c.id && t.transaction_type === 'DEBIT')
                .sort((a, b) => a.transaction_date > b.transaction_date ? 1 : -1);

            let remaining = bal;
            let buckets = { d7: 0, d30: 0, d60: 0, d90: 0, d120: 0, d121: 0 };
            let oldestUnpaidDate = null;
            let lastTxDate = null;
            debits.forEach(d => {
                if (remaining <= 0) return;
                const debitAmt = this.parseNum(d.debit_amount);
                if (debitAmt <= 0) return;
                const allocated = Math.min(remaining, debitAmt);
                const txDate = new Date(d.transaction_date);
                const daysOld = Math.floor((today - txDate) / (1000 * 60 * 60 * 24));
                if (!oldestUnpaidDate || txDate < oldestUnpaidDate) oldestUnpaidDate = txDate;
                if (!lastTxDate || txDate > lastTxDate) lastTxDate = txDate;
                if (daysOld > 120) buckets.d121 += allocated;
                else if (daysOld > 90) buckets.d120 += allocated;
                else if (daysOld > 60) buckets.d90 += allocated;
                else if (daysOld > 30) buckets.d60 += allocated;
                else if (daysOld > 7) buckets.d30 += allocated;
                else buckets.d7 += allocated;
                remaining -= allocated;
            });
            if (remaining > 0) buckets.d7 += remaining;

            const daysOverdue = oldestUnpaidDate ? Math.floor((today - oldestUnpaidDate) / (1000 * 60 * 60 * 24)) : 0;
            const branch = this.data.branches.find(b => b.id === c.branch_id);
            agingRows.push({ customer: c, branch, bal, buckets, daysOverdue, oldestDate: oldestUnpaidDate, lastTxDate });
        });

        // Sort
        const sf = this._ageingSortField || 'total';
        const sd = this._ageingSortDir === 'asc' ? 1 : -1;
        agingRows.sort((a, b) => {
            let va, vb;
            if (sf === 'name') { va = a.customer.name.toLowerCase(); vb = b.customer.name.toLowerCase(); return va < vb ? -sd : va > vb ? sd : 0; }
            else if (sf === 'branch') { va = (a.branch || {}).name || ''; vb = (b.branch || {}).name || ''; return va < vb ? -sd : va > vb ? sd : 0; }
            else if (sf === 'd7') { return (a.buckets.d7 - b.buckets.d7) * sd; }
            else if (sf === 'd30') { return (a.buckets.d30 - b.buckets.d30) * sd; }
            else if (sf === 'd60') { return (a.buckets.d60 - b.buckets.d60) * sd; }
            else if (sf === 'd90') { return (a.buckets.d90 - b.buckets.d90) * sd; }
            else if (sf === 'd120') { return (a.buckets.d120 - b.buckets.d120) * sd; }
            else if (sf === 'd121') { return (a.buckets.d121 - b.buckets.d121) * sd; }
            else if (sf === 'days') { return (a.daysOverdue - b.daysOverdue) * sd; }
            else { return (a.bal - b.bal) * sd; }
        });

        // Totals
        const totals = { d7: 0, d30: 0, d60: 0, d90: 0, d120: 0, d121: 0, total: 0 };
        agingRows.forEach(a => {
            totals.d7 += a.buckets.d7;
            totals.d30 += a.buckets.d30;
            totals.d60 += a.buckets.d60;
            totals.d90 += a.buckets.d90;
            totals.d120 += a.buckets.d120;
            totals.d121 += a.buckets.d121;
            totals.total += a.bal;
        });

        let html = '';

        // Branch filter + sort controls
        html += '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin:16px 0 20px;">';
        html += '<div style="display:flex;align-items:center;gap:8px;">';
        html += '<label style="font-size:0.82rem;font-weight:600;color:var(--sa-text-secondary);">Branch:</label>';
        html += '<select class="sa-input" onchange="SA._ageingBranchFilter=this.value;document.getElementById(\'reportContent\').innerHTML=SA.reportCustomerAgeing();" style="width:200px;">';
        html += '<option value="all"' + (branchFilter === 'all' ? ' selected' : '') + '>All Branches</option>';
        this.data.branches.forEach(b => {
            html += '<option value="' + b.id + '"' + (String(branchFilter) === String(b.id) ? ' selected' : '') + '>' + b.name + '</option>';
        });
        html += '</select></div>';
        html += '<div style="display:flex;gap:8px;">'
            + '<button class="sa-btn sa-btn-primary sa-btn-sm" onclick="SA.exportCustomerAgeingPDF()" style="gap:6px;">'
            + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
            + ' Export PDF</button></div>';
        html += '</div>';

        // Summary stat cards
        html += '<div class="sa-stats" style="margin-bottom:20px;">';
        html += '<div class="sa-stat-card success"><div class="stat-label">0 \u2013 7 Days</div><div class="stat-value">UGX ' + this.fmtInt(totals.d7) + '</div><div class="stat-sub">Current</div></div>';
        html += '<div class="sa-stat-card info"><div class="stat-label">8 \u2013 30 Days</div><div class="stat-value">UGX ' + this.fmtInt(totals.d30) + '</div></div>';
        html += '<div class="sa-stat-card warning"><div class="stat-label">31 \u2013 60 Days</div><div class="stat-value">UGX ' + this.fmtInt(totals.d60) + '</div></div>';
        html += '<div class="sa-stat-card warning"><div class="stat-label">61 \u2013 90 Days</div><div class="stat-value">UGX ' + this.fmtInt(totals.d90) + '</div><div class="stat-sub">Overdue</div></div>';
        html += '<div class="sa-stat-card danger"><div class="stat-label">91 \u2013 120 Days</div><div class="stat-value">UGX ' + this.fmtInt(totals.d120) + '</div><div class="stat-sub">Critical</div></div>';
        html += '<div class="sa-stat-card danger"><div class="stat-label">121+ Days</div><div class="stat-value">UGX ' + this.fmtInt(totals.d121) + '</div><div class="stat-sub">Severely Overdue</div></div>';
        html += '</div>';

        // Grand total banner
        html += '<div style="background:linear-gradient(135deg,#7C3AED 0%,#A78BFA 100%);color:#fff;border-radius:8px;padding:14px 20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">';
        html += '<div><span style="font-size:0.82rem;opacity:0.85;">Total Outstanding from ' + agingRows.length + ' Customer' + (agingRows.length !== 1 ? 's' : '') + '</span><br><strong style="font-size:1.4rem;">UGX ' + this.fmtInt(totals.total) + '</strong></div>';
        const overdue60 = agingRows.filter(a => a.daysOverdue > 60).length;
        if (overdue60 > 0) {
            html += '<div style="text-align:right;"><span style="font-size:0.82rem;opacity:0.85;">Over 60 Days</span><br><strong style="font-size:1.2rem;">' + overdue60 + ' account' + (overdue60 !== 1 ? 's' : '') + '</strong></div>';
        }
        html += '</div>';

        // Sort helper
        const sortIcon = function(field) {
            if (sf === field) return sd > 0 ? ' \u25B2' : ' \u25BC';
            return '';
        };
        const sortClick = function(field) {
            return 'onclick="SA._ageingSortField=\'' + field + '\';SA._ageingSortDir=(SA._ageingSortField===\'' + field + '\'&&SA._ageingSortDir===\'desc\')?\'asc\':\'desc\';SA._ageingSortField=\'' + field + '\';document.getElementById(\'reportContent\').innerHTML=SA.reportCustomerAgeing();"';
        };

        // Main ageing table
        html += '<div class="sa-section"><div class="sa-section-header" style="background:linear-gradient(135deg,#D97706 0%,#F59E0B 100%);">'
            + '<div class="sa-section-title" style="color:#fff;">Customer Ageing Report</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr>'
            + '<th style="cursor:pointer;" ' + sortClick('name') + '>Customer' + sortIcon('name') + '</th>'
            + '<th style="cursor:pointer;" ' + sortClick('branch') + '>Branch' + sortIcon('branch') + '</th>'
            + '<th class="text-right" style="cursor:pointer;background:rgba(16,185,129,0.08);" ' + sortClick('d7') + '>0\u20137 Days' + sortIcon('d7') + '</th>'
            + '<th class="text-right" style="cursor:pointer;background:rgba(59,130,246,0.08);" ' + sortClick('d30') + '>8\u201330 Days' + sortIcon('d30') + '</th>'
            + '<th class="text-right" style="cursor:pointer;background:rgba(245,158,11,0.08);" ' + sortClick('d60') + '>31\u201360 Days' + sortIcon('d60') + '</th>'
            + '<th class="text-right" style="cursor:pointer;background:rgba(245,158,11,0.12);" ' + sortClick('d90') + '>61\u201390 Days' + sortIcon('d90') + '</th>'
            + '<th class="text-right" style="cursor:pointer;background:rgba(239,68,68,0.08);" ' + sortClick('d120') + '>91\u2013120 Days' + sortIcon('d120') + '</th>'
            + '<th class="text-right" style="cursor:pointer;background:rgba(239,68,68,0.12);" ' + sortClick('d121') + '>121+ Days' + sortIcon('d121') + '</th>'
            + '<th class="text-right" style="cursor:pointer;" ' + sortClick('total') + '>Total Owed' + sortIcon('total') + '</th>'
            + '<th style="cursor:pointer;" ' + sortClick('days') + '>Age' + sortIcon('days') + '</th>'
            + '<th>Actions</th>'
            + '</tr></thead><tbody>';

        if (agingRows.length === 0) {
            html += '<tr><td colspan="11" class="text-center text-muted" style="padding:40px;">No customers with outstanding balances.</td></tr>';
        } else {
            agingRows.forEach(a => {
                const c = a.customer;
                const overLimit = c.credit_limit > 0 && a.bal > c.credit_limit;
                const brName = a.branch ? a.branch.name : 'Unknown';
                const brCode = a.branch ? a.branch.branch_code || '' : '';

                // Row background for severity
                let rowStyle = '';
                if (a.buckets.d121 > 0) rowStyle = 'background:rgba(239,68,68,0.04);';
                else if (a.buckets.d120 > 0) rowStyle = 'background:rgba(239,68,68,0.02);';
                else if (a.buckets.d90 > 0) rowStyle = 'background:rgba(245,158,11,0.03);';

                // Age badge
                let ageBadge = '';
                if (a.daysOverdue > 120) ageBadge = '<span class="sa-badge sa-badge-danger">' + a.daysOverdue + 'd</span>';
                else if (a.daysOverdue > 90) ageBadge = '<span class="sa-badge sa-badge-danger">' + a.daysOverdue + 'd</span>';
                else if (a.daysOverdue > 60) ageBadge = '<span class="sa-badge sa-badge-warning">' + a.daysOverdue + 'd</span>';
                else if (a.daysOverdue > 30) ageBadge = '<span class="sa-badge sa-badge-warning">' + a.daysOverdue + 'd</span>';
                else if (a.daysOverdue > 7) ageBadge = '<span class="sa-badge sa-badge-info">' + a.daysOverdue + 'd</span>';
                else ageBadge = '<span class="sa-badge sa-badge-success">' + a.daysOverdue + 'd</span>';

                html += '<tr style="' + rowStyle + '">';
                html += '<td><strong>' + c.name + '</strong>';
                if (overLimit) html += ' <span class="sa-badge sa-badge-danger" style="font-size:0.6rem;">OVER LIMIT</span>';
                if (c.phone) html += '<div style="font-size:0.68rem;color:var(--sa-text-dim);">' + c.phone + '</div>';
                html += '</td>';
                html += '<td>' + brName + (brCode ? ' <span class="sa-badge sa-badge-neutral">' + brCode + '</span>' : '') + '</td>';
                html += '<td class="text-right mono">' + (a.buckets.d7 > 0 ? this.fmtInt(a.buckets.d7) : '\u2014') + '</td>';
                html += '<td class="text-right mono' + (a.buckets.d30 > 0 ? ' text-info' : '') + '">' + (a.buckets.d30 > 0 ? this.fmtInt(a.buckets.d30) : '\u2014') + '</td>';
                html += '<td class="text-right mono' + (a.buckets.d60 > 0 ? ' text-warning' : '') + '">' + (a.buckets.d60 > 0 ? this.fmtInt(a.buckets.d60) : '\u2014') + '</td>';
                html += '<td class="text-right mono' + (a.buckets.d90 > 0 ? ' text-warning' : '') + '">' + (a.buckets.d90 > 0 ? this.fmtInt(a.buckets.d90) : '\u2014') + '</td>';
                html += '<td class="text-right mono' + (a.buckets.d120 > 0 ? ' text-danger' : '') + '">' + (a.buckets.d120 > 0 ? this.fmtInt(a.buckets.d120) : '\u2014') + '</td>';
                html += '<td class="text-right mono' + (a.buckets.d121 > 0 ? ' text-danger text-bold' : '') + '">' + (a.buckets.d121 > 0 ? this.fmtInt(a.buckets.d121) : '\u2014') + '</td>';
                html += '<td class="text-right mono text-bold text-danger">' + this.fmtInt(a.bal) + '</td>';
                html += '<td>' + ageBadge + '</td>';
                html += '<td><div class="sa-btn-group">'
                    + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.viewStatement(\'' + c.id + '\')" title="View Statement">Statement</button>'
                    + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.showRecordPayment(\'' + c.id + '\')" title="Record Payment">Pay</button>'
                    + '</div></td>';
                html += '</tr>';
            });

            // Totals row
            html += '<tr class="total-row">'
                + '<td class="text-bold" colspan="2">TOTALS (' + agingRows.length + ' customer' + (agingRows.length !== 1 ? 's' : '') + ')</td>'
                + '<td class="text-right mono text-bold">' + this.fmtInt(totals.d7) + '</td>'
                + '<td class="text-right mono text-bold">' + this.fmtInt(totals.d30) + '</td>'
                + '<td class="text-right mono text-bold">' + this.fmtInt(totals.d60) + '</td>'
                + '<td class="text-right mono text-bold">' + this.fmtInt(totals.d90) + '</td>'
                + '<td class="text-right mono text-bold">' + this.fmtInt(totals.d120) + '</td>'
                + '<td class="text-right mono text-bold">' + this.fmtInt(totals.d121) + '</td>'
                + '<td class="text-right mono text-bold text-danger">' + this.fmtInt(totals.total) + '</td>'
                + '<td colspan="2"></td></tr>';

            // Percentage row
            const pct = function(v) { return totals.total > 0 ? (v / totals.total * 100).toFixed(1) + '%' : '0%'; };
            html += '<tr style="font-size:0.78rem;color:var(--sa-text-secondary);background:rgba(0,0,0,0.02);">'
                + '<td colspan="2" class="text-bold">% of Total</td>'
                + '<td class="text-right mono">' + pct(totals.d7) + '</td>'
                + '<td class="text-right mono">' + pct(totals.d30) + '</td>'
                + '<td class="text-right mono">' + pct(totals.d60) + '</td>'
                + '<td class="text-right mono">' + pct(totals.d90) + '</td>'
                + '<td class="text-right mono">' + pct(totals.d120) + '</td>'
                + '<td class="text-right mono">' + pct(totals.d121) + '</td>'
                + '<td class="text-right mono">100%</td>'
                + '<td colspan="2"></td></tr>';
        }

        html += '</tbody></table></div></div></div>';

        // Info box
        html += '<div class="sa-info-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + 'Ageing is calculated based on the oldest unpaid debit transactions per customer. Balances are allocated to age buckets starting from the oldest outstanding invoice. '
            + 'Age column shows the number of days since the oldest unpaid transaction.</div>';

        return html;
    },

    exportCustomerAgeingPDF() {
        const today = new Date();
        const branchFilter = this._ageingBranchFilter || 'all';
        const allCustomers = this.data.customers.filter(c => c.is_active !== false && c.customer_type !== 'attendant');

        const agingRows = [];
        allCustomers.forEach(c => {
            if (branchFilter !== 'all' && String(c.branch_id) !== String(branchFilter)) return;
            const bal = this.getCustomerBalance(c.id);
            if (bal <= 0) return;
            const debits = this.data.customerTransactions
                .filter(t => t.customer_id === c.id && t.transaction_type === 'DEBIT')
                .sort((a, b) => a.transaction_date > b.transaction_date ? 1 : -1);
            let remaining = bal;
            let buckets = { d7: 0, d30: 0, d60: 0, d90: 0, d120: 0, d121: 0 };
            let oldestUnpaidDate = null;
            debits.forEach(d => {
                if (remaining <= 0) return;
                const debitAmt = this.parseNum(d.debit_amount);
                if (debitAmt <= 0) return;
                const allocated = Math.min(remaining, debitAmt);
                const txDate = new Date(d.transaction_date);
                const daysOld = Math.floor((today - txDate) / (1000 * 60 * 60 * 24));
                if (!oldestUnpaidDate || txDate < oldestUnpaidDate) oldestUnpaidDate = txDate;
                if (daysOld > 120) buckets.d121 += allocated;
                else if (daysOld > 90) buckets.d120 += allocated;
                else if (daysOld > 60) buckets.d90 += allocated;
                else if (daysOld > 30) buckets.d60 += allocated;
                else if (daysOld > 7) buckets.d30 += allocated;
                else buckets.d7 += allocated;
                remaining -= allocated;
            });
            if (remaining > 0) buckets.d7 += remaining;
            const daysOverdue = oldestUnpaidDate ? Math.floor((today - oldestUnpaidDate) / (1000 * 60 * 60 * 24)) : 0;
            const branch = this.data.branches.find(b => b.id === c.branch_id);
            agingRows.push({ customer: c, branch, bal, buckets, daysOverdue });
        });

        agingRows.sort((a, b) => b.bal - a.bal);
        const totals = { d7: 0, d30: 0, d60: 0, d90: 0, d120: 0, d121: 0, total: 0 };
        agingRows.forEach(a => {
            totals.d7 += a.buckets.d7; totals.d30 += a.buckets.d30; totals.d60 += a.buckets.d60;
            totals.d90 += a.buckets.d90; totals.d120 += a.buckets.d120; totals.d121 += a.buckets.d121; totals.total += a.bal;
        });

        const branchLabel = branchFilter === 'all' ? 'All Branches' : ((this.data.branches.find(b => String(b.id) === String(branchFilter)) || {}).name || 'Unknown');

        let body = '<!DOCTYPE html><html><head><title>Customer Ageing Report</title><style>'
            + '*{margin:0;padding:0;box-sizing:border-box;}'
            + 'body{font-family:"Segoe UI",Arial,sans-serif;padding:20px 24px;color:#1a1a1a;font-size:10px;line-height:1.3;}'
            + '.header{text-align:center;border-bottom:3px solid #C8102E;padding-bottom:12px;margin-bottom:12px;}'
            + '.header h1{font-size:16px;color:#C8102E;font-weight:800;letter-spacing:2px;}'
            + '.header .sub{font-size:9px;color:#666;margin:2px 0;}'
            + '.doc-title{text-align:center;margin:8px 0 12px;padding:7px 14px;background:linear-gradient(135deg,#D97706,#F59E0B);color:#fff;font-size:12px;font-weight:800;letter-spacing:1px;border-radius:5px;text-transform:uppercase;}'
            + '.meta{display:flex;justify-content:space-between;margin-bottom:12px;font-size:9.5px;color:#444;}'
            + '.summary{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:14px;}'
            + '.s-card{border:1.5px solid #e0e0e0;border-radius:5px;padding:6px 8px;text-align:center;}'
            + '.s-card .lbl{font-size:7.5px;text-transform:uppercase;color:#888;letter-spacing:0.3px;font-weight:600;}'
            + '.s-card .val{font-size:11px;font-weight:800;margin:1px 0;}'
            + '.s-card.green{border-color:#059669;background:#F0FDF4;} .s-card.green .val{color:#059669;}'
            + '.s-card.blue{border-color:#2563EB;background:#F0F4FF;} .s-card.blue .val{color:#2563EB;}'
            + '.s-card.yellow{border-color:#D97706;background:#FFFBF0;} .s-card.yellow .val{color:#B45309;}'
            + '.s-card.orange{border-color:#EA580C;background:#FFF7ED;} .s-card.orange .val{color:#EA580C;}'
            + '.s-card.red{border-color:#DC2626;background:#FEF2F2;} .s-card.red .val{color:#DC2626;}'
            + '.s-card.darkred{border-color:#991B1B;background:#FEE2E2;} .s-card.darkred .val{color:#991B1B;}'
            + 'table{width:100%;border-collapse:collapse;margin-bottom:10px;}'
            + 'th{background:#f5f5f5;font-weight:700;font-size:8px;text-transform:uppercase;letter-spacing:0.3px;color:#555;}'
            + 'th,td{border:1px solid #ddd;padding:4px 6px;font-size:9.5px;}'
            + '.r{text-align:right;} .b{font-weight:700;}'
            + '.total{background:#f0f0f0;font-weight:700;}'
            + '.red{color:#DC2626;} .orange{color:#EA580C;} .yellow{color:#B45309;}'
            + '.footer{margin-top:16px;font-size:8px;color:#999;text-align:center;border-top:1px solid #ddd;padding-top:6px;}'
            + '@media print{body{padding:10px;} @page{size:A4 landscape;margin:10mm 8mm;}}'
            + '</style></head><body>';

        body += '<div class="header"><h1>GASCO ENERGY LIMITED</h1><div class="sub">Oil Marketing Company</div></div>';
        body += '<div class="doc-title">Customer Ageing Report</div>';
        body += '<div class="meta"><div><strong>Branch:</strong> ' + branchLabel + '</div><div><strong>As at:</strong> ' + today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + '</div><div><strong>Customers:</strong> ' + agingRows.length + '</div></div>';

        body += '<div class="summary">'
            + '<div class="s-card green"><div class="lbl">0\u20137 Days</div><div class="val">UGX ' + this.fmtInt(totals.d7) + '</div></div>'
            + '<div class="s-card blue"><div class="lbl">8\u201330 Days</div><div class="val">UGX ' + this.fmtInt(totals.d30) + '</div></div>'
            + '<div class="s-card yellow"><div class="lbl">31\u201360 Days</div><div class="val">UGX ' + this.fmtInt(totals.d60) + '</div></div>'
            + '<div class="s-card orange"><div class="lbl">61\u201390 Days</div><div class="val">UGX ' + this.fmtInt(totals.d90) + '</div></div>'
            + '<div class="s-card red"><div class="lbl">91\u2013120 Days</div><div class="val">UGX ' + this.fmtInt(totals.d120) + '</div></div>'
            + '<div class="s-card darkred"><div class="lbl">121+ Days</div><div class="val">UGX ' + this.fmtInt(totals.d121) + '</div></div>'
            + '</div>';

        body += '<table><thead><tr><th>#</th><th>Customer</th><th>Branch</th><th class="r">0\u20137 Days</th><th class="r">8\u201330 Days</th><th class="r">31\u201360 Days</th><th class="r">61\u201390 Days</th><th class="r">91\u2013120 Days</th><th class="r">121+ Days</th><th class="r">Total Owed</th><th>Age</th></tr></thead><tbody>';

        agingRows.forEach((a, i) => {
            const c = a.customer;
            const brName = a.branch ? a.branch.name : 'Unknown';
            body += '<tr' + (a.buckets.d121 > 0 ? ' style="background:#FEF2F2;"' : '') + '>';
            body += '<td>' + (i + 1) + '</td>';
            body += '<td><b>' + c.name + '</b>' + (c.phone ? '<br><span style="font-size:8px;color:#888;">' + c.phone + '</span>' : '') + '</td>';
            body += '<td>' + brName + '</td>';
            body += '<td class="r">' + (a.buckets.d7 > 0 ? this.fmtInt(a.buckets.d7) : '\u2014') + '</td>';
            body += '<td class="r">' + (a.buckets.d30 > 0 ? this.fmtInt(a.buckets.d30) : '\u2014') + '</td>';
            body += '<td class="r' + (a.buckets.d60 > 0 ? ' yellow' : '') + '">' + (a.buckets.d60 > 0 ? this.fmtInt(a.buckets.d60) : '\u2014') + '</td>';
            body += '<td class="r' + (a.buckets.d90 > 0 ? ' orange' : '') + '">' + (a.buckets.d90 > 0 ? this.fmtInt(a.buckets.d90) : '\u2014') + '</td>';
            body += '<td class="r' + (a.buckets.d120 > 0 ? ' red' : '') + '">' + (a.buckets.d120 > 0 ? this.fmtInt(a.buckets.d120) : '\u2014') + '</td>';
            body += '<td class="r' + (a.buckets.d121 > 0 ? ' red b' : '') + '">' + (a.buckets.d121 > 0 ? this.fmtInt(a.buckets.d121) : '\u2014') + '</td>';
            body += '<td class="r b red">' + this.fmtInt(a.bal) + '</td>';
            body += '<td>' + a.daysOverdue + ' days</td></tr>';
        });

        body += '<tr class="total"><td colspan="3" class="b">TOTALS</td>'
            + '<td class="r b">' + this.fmtInt(totals.d7) + '</td>'
            + '<td class="r b">' + this.fmtInt(totals.d30) + '</td>'
            + '<td class="r b">' + this.fmtInt(totals.d60) + '</td>'
            + '<td class="r b">' + this.fmtInt(totals.d90) + '</td>'
            + '<td class="r b">' + this.fmtInt(totals.d120) + '</td>'
            + '<td class="r b">' + this.fmtInt(totals.d121) + '</td>'
            + '<td class="r b red">' + this.fmtInt(totals.total) + '</td>'
            + '<td></td></tr>';
        body += '</tbody></table>';

        body += '<div class="footer">Generated on ' + new Date().toLocaleString() + ' | Gasco Energy Limited \u2014 Customer Ageing Report</div>';
        body += '</body></html>';

        const w = window.open('', '_blank', 'width=1100,height=800');
        w.document.write(body);
        w.document.close();
        setTimeout(() => w.print(), 400);
    },

    // ============================================================
    // STAFF & HR MODULE
    // ============================================================

    // --- Uganda Tax Constants ---
    NSSF_EMPLOYEE_RATE: 0.05,   // 5% employee contribution
    NSSF_EMPLOYER_RATE: 0.10,   // 10% employer contribution
    // Uganda PAYE brackets (monthly, FY 2025/2026)
    PAYE_BRACKETS: [
        { min: 0,       max: 235000,    rate: 0,    label: '0 – 235,000' },
        { min: 235001,  max: 335000,    rate: 0.10, label: '235,001 – 335,000' },
        { min: 335001,  max: 410000,    rate: 0.20, label: '335,001 – 410,000' },
        { min: 410001,  max: 10000000,  rate: 0.30, label: '410,001 – 10,000,000' },
        { min: 10000001, max: Infinity, rate: 0.40, label: 'Above 10,000,000' }
    ],

    LEAVE_TYPES: [
        { id: 'annual', label: 'Annual Leave', default_days: 21, color: 'sa-badge-info' },
        { id: 'sick', label: 'Sick Leave', default_days: 14, color: 'sa-badge-danger' },
        { id: 'maternity', label: 'Maternity Leave', default_days: 60, color: 'sa-badge-warning' },
        { id: 'paternity', label: 'Paternity Leave', default_days: 4, color: 'sa-badge-success' },
        { id: 'compassionate', label: 'Compassionate', default_days: 3, color: 'sa-badge-neutral' },
        { id: 'unpaid', label: 'Unpaid Leave', default_days: 0, color: 'sa-badge-danger' }
    ],

    // --- PAYE Calculator (Uganda brackets) ---
    calcPAYE(taxableIncome) {
        let tax = 0;
        let remaining = taxableIncome;
        for (let i = 0; i < this.PAYE_BRACKETS.length; i++) {
            const b = this.PAYE_BRACKETS[i];
            if (remaining <= 0) break;
            const prevMax = i > 0 ? this.PAYE_BRACKETS[i - 1].max : 0;
            const bandWidth = b.max === Infinity ? remaining : (b.max - prevMax);
            const taxable = Math.min(remaining, bandWidth);
            tax += taxable * b.rate;
            remaining -= taxable;
        }
        return Math.round(tax);
    },

    // --- NSSF Calculator ---
    calcNSSF(grossSalary) {
        const employee = Math.round(grossSalary * this.NSSF_EMPLOYEE_RATE);
        const employer = Math.round(grossSalary * this.NSSF_EMPLOYER_RATE);
        return { employee, employer, total: employee + employer };
    },

    // --- Full Payslip Calculator ---
    calcPayslip(emp) {
        const gross = this.parseNum(emp.gross_salary);
        const nssf = this.calcNSSF(gross);
        const taxableIncome = gross - nssf.employee;
        const paye = this.calcPAYE(taxableIncome);
        const shortageDeductions = this._getEmployeeShortages(emp.id);
        const salaryAdvances = this._getEmployeeSalaryAdvances(emp.id);
        const loanDeductions = this._getEmployeeLoanDeduction(emp.id);
        const otherDeductions = this.parseNum(emp.other_deductions);
        const totalDeductions = nssf.employee + paye + shortageDeductions + salaryAdvances + loanDeductions + otherDeductions;
        const netPay = gross - totalDeductions;
        return {
            gross, nssf_employee: nssf.employee, nssf_employer: nssf.employer,
            taxable_income: taxableIncome, paye,
            shortage_deductions: shortageDeductions, salary_advances: salaryAdvances,
            loan_deductions: loanDeductions, other_deductions: otherDeductions,
            total_deductions: totalDeductions, net_pay: netPay
        };
    },

    // Get salary advances for an employee this month (from CTB cash deductions)
    _getEmployeeSalaryAdvances(empId) {
        let total = 0;
        const month = this.MONTH;
        Object.keys(this.data.cashToBank).forEach(key => {
            const ctb = this.data.cashToBank[key];
            if (!key.includes('_' + month)) return;
            const expenses = this._activeRecords(ctb.cashExpenses || []);
            expenses.forEach(e => {
                if (e.employee_id == empId && (e.category === 'Salary Advance' || e.category === 'Salary Payment')) {
                    total += this.parseNum(e.amount);
                }
            });
        });
        return total;
    },

    // Get total shortage deductions for an employee this month
    _getEmployeeShortages(empId) {
        const emp = this.data.employees.find(e => e.id === empId);
        if (!emp || !emp.customer_id) return 0;
        let total = 0;
        this.data.customerTransactions.forEach(t => {
            if (t.customer_id === emp.customer_id && t.reference_type === 'SHORTAGE'
                && t.transaction_date && t.transaction_date.startsWith(this.MONTH)) {
                total += this.parseNum(t.debit_amount);
            }
        });
        return total;
    },

    // ============================================================
    // EMPLOYEE MANAGEMENT
    // ============================================================
    renderEmployees(el) {
        if (!this.hasPermission('manage_hr')) { el.innerHTML = this._accessDenied('Employee Management'); return; }
        const bid = this.currentBranch ? this.currentBranch.id : null;
        const emps = bid ? this.data.employees.filter(e => e.branch_id === bid) : this.data.employees;

        let html = '<div class="sa-page-header"><h1>Employees' + (this.currentBranch ? ' &mdash; ' + this.currentBranch.name : '') + '</h1>'
            + '<div class="sa-page-actions"><button class="sa-btn sa-btn-primary" onclick="SA.showAddEmployee()">+ Add Employee</button></div></div>';

        // Summary cards
        const active = emps.filter(e => e.is_active !== false);
        const totalPayroll = active.reduce((s, e) => s + this.parseNum(e.gross_salary), 0);
        html += '<div class="sa-stats">';
        html += '<div class="sa-stat-card info"><div class="stat-label">Total Employees</div><div class="stat-value">' + active.length + '</div><div class="stat-sub">' + emps.filter(e => e.is_active === false).length + ' inactive</div></div>';
        html += '<div class="sa-stat-card gold"><div class="stat-label">Monthly Payroll</div><div class="stat-value">UGX ' + this.fmtInt(totalPayroll) + '</div><div class="stat-sub">Gross salaries</div></div>';
        const totalNSSF = active.reduce((s, e) => s + this.calcNSSF(this.parseNum(e.gross_salary)).total, 0);
        html += '<div class="sa-stat-card pms"><div class="stat-label">NSSF (Total)</div><div class="stat-value">UGX ' + this.fmtInt(totalNSSF) + '</div><div class="stat-sub">Employee + Employer</div></div>';
        const totalPAYE = active.reduce((s, e) => { const n = this.calcNSSF(this.parseNum(e.gross_salary)); return s + this.calcPAYE(this.parseNum(e.gross_salary) - n.employee); }, 0);
        html += '<div class="sa-stat-card danger"><div class="stat-label">PAYE (Total)</div><div class="stat-value">UGX ' + this.fmtInt(totalPAYE) + '</div><div class="stat-sub">Income tax</div></div>';
        html += '</div>';

        // Employee table
        html += '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">Employee Register (' + emps.length + ')</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Name</th><th>Position</th><th class="text-right">Gross Salary</th><th>NSSF No.</th><th>TIN</th><th>Phone</th><th>Status</th><th style="width:120px;">Actions</th></tr></thead><tbody>';
        if (emps.length === 0) {
            html += '<tr><td colspan="8" class="text-center text-muted" style="padding:30px;">No employees yet. Click "+ Add Employee" to get started.</td></tr>';
        }
        emps.forEach(e => {
            const statusBadge = e.is_active !== false ? '<span class="sa-badge sa-badge-success">Active</span>' : '<span class="sa-badge sa-badge-danger">Inactive</span>';
            html += '<tr>'
                + '<td><strong>' + e.name + '</strong><br><span class="text-muted" style="font-size:0.72rem;">' + (e.employee_id || '') + '</span></td>'
                + '<td>' + (e.position || '') + '</td>'
                + '<td class="text-right mono">' + this.fmtInt(this.parseNum(e.gross_salary)) + '</td>'
                + '<td class="text-muted" style="font-size:0.78rem;">' + (e.nssf_number || '—') + '</td>'
                + '<td class="text-muted" style="font-size:0.78rem;">' + (e.tin || '—') + '</td>'
                + '<td class="text-muted" style="font-size:0.78rem;">' + (e.phone || '—') + '</td>'
                + '<td>' + statusBadge + '</td>'
                + '<td><div class="sa-btn-group"><button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.showEditEmployee(\'' + e.id + '\')">Edit</button>'
                + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.showEmployeePayslip(\'' + e.id + '\')">Payslip</button></div></td></tr>';
        });
        html += '</tbody></table></div></div></div>';
        el.innerHTML = html;
    },

    showAddEmployee() {
        const bid = this.currentBranch ? this.currentBranch.id : null;
        if (!bid) { this.toast('Select a branch first', 'error'); return; }
        const html = '<div class="sa-form-row"><div class="sa-form-group"><label>Full Name *</label><input class="sa-input" id="empName" placeholder="e.g. John Okello"></div>'
            + '<div class="sa-form-group"><label>Employee ID</label><input class="sa-input" id="empEmpId" placeholder="e.g. EMP-001"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Position / Title *</label><input class="sa-input" id="empPosition" placeholder="e.g. Pump Attendant"></div>'
            + '<div class="sa-form-group"><label>Gross Monthly Salary (UGX) *</label><input class="sa-input" id="empSalary" type="number" placeholder="e.g. 500000"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Phone</label><input class="sa-input" id="empPhone" placeholder="e.g. 0771234567"></div>'
            + '<div class="sa-form-group"><label>Email</label><input class="sa-input" id="empEmail" placeholder="Optional"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>NSSF Number</label><input class="sa-input" id="empNSSF" placeholder="e.g. NS12345678"></div>'
            + '<div class="sa-form-group"><label>TIN (Tax ID)</label><input class="sa-input" id="empTIN" placeholder="e.g. 1001234567"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Bank Name</label><input class="sa-input" id="empBank" placeholder="e.g. Stanbic Bank"></div>'
            + '<div class="sa-form-group"><label>Bank Account No.</label><input class="sa-input" id="empAcct" placeholder="Account number"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>National ID</label><input class="sa-input" id="empNID" placeholder="NIN or ID number"></div>'
            + '<div class="sa-form-group"><label>Date of Joining</label><input class="sa-input" id="empJoin" type="date" value="' + this.todayStr() + '"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Emergency Contact Name</label><input class="sa-input" id="empECName" placeholder=""></div>'
            + '<div class="sa-form-group"><label>Emergency Contact Phone</label><input class="sa-input" id="empECPhone" placeholder=""></div></div>'
            + '<div class="sa-form-group"><label>Other Monthly Deductions (UGX)</label><input class="sa-input" id="empOther" type="number" value="0" placeholder="Loans, advances, etc."></div>'
            + '<div class="sa-form-group"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="empIsAttendant"> Link as Pump Attendant (creates customer account for shortage deductions)</label></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveNewEmployee()">Add Employee</button></div>';
        this.openModal('Add Employee — ' + this.currentBranch.name, html, true);
    },

    saveNewEmployee() {
        const name = document.getElementById('empName').value.trim();
        const position = document.getElementById('empPosition').value.trim();
        const salary = this.parseNum(document.getElementById('empSalary').value);
        if (!name || !position) { this.toast('Name and position required', 'error'); return; }
        if (salary <= 0) { this.toast('Enter a valid salary', 'error'); return; }
        const bid = this.currentBranch.id;
        const isAttendant = document.getElementById('empIsAttendant').checked;

        let customerId = null;
        if (isAttendant) {
            const existing = this.data.customers.find(c => c.branch_id === bid && c.name === name && c.customer_type === 'attendant');
            if (existing) {
                customerId = existing.id;
            } else {
                customerId = this.uid();
                this.data.customers.push({
                    id: customerId, branch_id: bid, name: name,
                    phone: document.getElementById('empPhone').value.trim(),
                    address: '', opening_balance: 0, is_active: true,
                    customer_type: 'attendant', created_at: new Date().toISOString()
                });
            }
        }
        const emp = {
            id: this.uid(), branch_id: bid,
            employee_id: document.getElementById('empEmpId').value.trim(),
            name: name, position: position, gross_salary: salary,
            phone: document.getElementById('empPhone').value.trim(),
            email: document.getElementById('empEmail').value.trim(),
            nssf_number: document.getElementById('empNSSF').value.trim(),
            tin: document.getElementById('empTIN').value.trim(),
            bank_name: document.getElementById('empBank').value.trim(),
            bank_account: document.getElementById('empAcct').value.trim(),
            national_id: document.getElementById('empNID').value.trim(),
            date_joined: document.getElementById('empJoin').value,
            emergency_contact_name: document.getElementById('empECName').value.trim(),
            emergency_contact_phone: document.getElementById('empECPhone').value.trim(),
            other_deductions: this.parseNum(document.getElementById('empOther').value),
            is_attendant: isAttendant, customer_id: customerId,
            is_active: true, created_at: new Date().toISOString()
        };
        this.data.employees.push(emp);
        this.saveData();
        this.auditLog('EMPLOYEE_CREATED', 'Added employee: ' + name + ' (' + position + ') at ' + this.currentBranch.name);
        this.closeModal();
        this.toast('Employee "' + name + '" added');
        this.navigate('employees');
    },

    showEditEmployee(empId) {
        const e = this.data.employees.find(emp => emp.id === empId);
        if (!e) return;
        const html = '<div class="sa-form-row"><div class="sa-form-group"><label>Full Name</label><input class="sa-input" id="eeNm" value="' + e.name + '"></div>'
            + '<div class="sa-form-group"><label>Employee ID</label><input class="sa-input" id="eeEmpId" value="' + (e.employee_id || '') + '"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Position</label><input class="sa-input" id="eePos" value="' + (e.position || '') + '"></div>'
            + '<div class="sa-form-group"><label>Gross Monthly Salary</label><input class="sa-input" id="eeSal" type="number" value="' + (e.gross_salary || 0) + '"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Phone</label><input class="sa-input" id="eePh" value="' + (e.phone || '') + '"></div>'
            + '<div class="sa-form-group"><label>Email</label><input class="sa-input" id="eeEm" value="' + (e.email || '') + '"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>NSSF Number</label><input class="sa-input" id="eeNSSF" value="' + (e.nssf_number || '') + '"></div>'
            + '<div class="sa-form-group"><label>TIN</label><input class="sa-input" id="eeTIN" value="' + (e.tin || '') + '"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Bank Name</label><input class="sa-input" id="eeBk" value="' + (e.bank_name || '') + '"></div>'
            + '<div class="sa-form-group"><label>Account No.</label><input class="sa-input" id="eeAcc" value="' + (e.bank_account || '') + '"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>National ID</label><input class="sa-input" id="eeNID" value="' + (e.national_id || '') + '"></div>'
            + '<div class="sa-form-group"><label>Date Joined</label><input class="sa-input" id="eeJn" type="date" value="' + (e.date_joined || '') + '"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Emergency Contact</label><input class="sa-input" id="eeEC" value="' + (e.emergency_contact_name || '') + '"></div>'
            + '<div class="sa-form-group"><label>Emergency Phone</label><input class="sa-input" id="eeEP" value="' + (e.emergency_contact_phone || '') + '"></div></div>'
            + '<div class="sa-form-group"><label>Other Monthly Deductions</label><input class="sa-input" id="eeOther" type="number" value="' + (e.other_deductions || 0) + '"></div>'
            + '<div class="sa-form-group"><label>Status</label><select class="sa-input" id="eeActive"><option value="true"' + (e.is_active !== false ? ' selected' : '') + '>Active</option><option value="false"' + (e.is_active === false ? ' selected' : '') + '>Inactive / Terminated</option></select></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-danger" onclick="SA.deleteEmployee(\'' + empId + '\')" style="margin-right:auto;">Delete</button>'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveEditEmployee(\'' + empId + '\')">Save</button></div>';
        this.openModal('Edit Employee — ' + e.name, html, true);
    },

    saveEditEmployee(empId) {
        const e = this.data.employees.find(emp => emp.id === empId);
        if (!e) return;
        e.name = document.getElementById('eeNm').value.trim();
        e.employee_id = document.getElementById('eeEmpId').value.trim();
        e.position = document.getElementById('eePos').value.trim();
        e.gross_salary = this.parseNum(document.getElementById('eeSal').value);
        e.phone = document.getElementById('eePh').value.trim();
        e.email = document.getElementById('eeEm').value.trim();
        e.nssf_number = document.getElementById('eeNSSF').value.trim();
        e.tin = document.getElementById('eeTIN').value.trim();
        e.bank_name = document.getElementById('eeBk').value.trim();
        e.bank_account = document.getElementById('eeAcc').value.trim();
        e.national_id = document.getElementById('eeNID').value.trim();
        e.date_joined = document.getElementById('eeJn').value;
        e.emergency_contact_name = document.getElementById('eeEC').value.trim();
        e.emergency_contact_phone = document.getElementById('eeEP').value.trim();
        e.other_deductions = this.parseNum(document.getElementById('eeOther').value);
        e.is_active = document.getElementById('eeActive').value === 'true';
        this.saveData();
        this.auditLog('EMPLOYEE_UPDATED', 'Updated employee: ' + e.name);
        this.closeModal();
        this.toast('Employee updated');
        this.navigate('employees');
    },

    deleteEmployee(empId) {
        const e = this.data.employees.find(emp => emp.id === empId);
        if (!e) return;
        if (!confirm('Delete employee "' + e.name + '"? This cannot be undone.')) return;
        this.data.employees = this.data.employees.filter(emp => emp.id !== empId);
        this.saveData();
        this.auditLog('EMPLOYEE_DELETED', 'Deleted employee: ' + e.name);
        this.closeModal();
        this.toast('Employee deleted');
        this.navigate('employees');
    },

    // --- Payslip Modal ---
    showEmployeePayslip(empId) {
        const e = this.data.employees.find(emp => emp.id === empId);
        if (!e) return;
        const p = this.calcPayslip(e);
        const branch = this.data.branches.find(b => b.id === e.branch_id);
        const loansDetail = this._getEmployeeLoansDetail(e.id);
        const advancesDetail = this._getEmployeeAdvancesDetail(e.id);
        let html = '<div style="font-size:0.82rem;">';
        html += '<div style="text-align:center;border-bottom:1px solid var(--sa-border);padding-bottom:12px;margin-bottom:12px;">'
            + '<strong style="font-size:1rem;">GASCO ENERGY LIMITED</strong><br>'
            + '<span class="text-muted">' + (branch ? branch.name : '') + '</span><br>'
            + '<span class="text-muted">Payslip for ' + this.monthLabel() + '</span></div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">'
            + '<div><span class="text-muted">Employee:</span> <strong>' + e.name + '</strong></div>'
            + '<div><span class="text-muted">ID:</span> ' + (e.employee_id || '—') + '</div>'
            + '<div><span class="text-muted">Position:</span> ' + (e.position || '—') + '</div>'
            + '<div><span class="text-muted">NSSF No.:</span> ' + (e.nssf_number || '—') + '</div>'
            + '<div><span class="text-muted">TIN:</span> ' + (e.tin || '—') + '</div>'
            + '<div><span class="text-muted">Bank:</span> ' + (e.bank_name || '—') + ' ' + (e.bank_account || '') + '</div></div>';
        html += '<table class="sa-table" style="font-size:0.8rem;"><tbody>';
        html += '<tr style="background:rgba(59,130,246,0.08);"><td colspan="2" class="text-bold" style="color:var(--sa-info);">EARNINGS</td></tr>';
        html += '<tr><td>Basic / Gross Salary</td><td class="text-right mono">' + this.fmtInt(p.gross) + '</td></tr>';
        html += '<tr style="background:rgba(239,68,68,0.08);"><td colspan="2" class="text-bold" style="color:var(--sa-danger);">DEDUCTIONS</td></tr>';
        html += '<tr><td>NSSF (Employee 5%)</td><td class="text-right mono">' + this.fmtInt(p.nssf_employee) + '</td></tr>';
        html += '<tr><td>PAYE (Income Tax)</td><td class="text-right mono">' + this.fmtInt(p.paye) + '</td></tr>';
        html += '<tr><td>Pump Shortage Deductions</td><td class="text-right mono' + (p.shortage_deductions > 0 ? ' text-danger' : '') + '">' + this.fmtInt(p.shortage_deductions) + '</td></tr>';
        // Individual salary advances
        if (advancesDetail.length > 0) {
            advancesDetail.forEach(adv => {
                html += '<tr><td style="padding-left:12px;">' + adv.category + ' <span class="text-muted" style="font-size:0.7rem;">(' + adv.date + ')</span></td><td class="text-right mono text-danger">' + this.fmtInt(adv.amount) + '</td></tr>';
            });
        }
        if (advancesDetail.length > 1) {
            html += '<tr><td class="text-bold" style="padding-left:12px;">Subtotal — Salary Advances</td><td class="text-right mono text-bold text-danger">' + this.fmtInt(p.salary_advances) + '</td></tr>';
        } else if (advancesDetail.length === 0) {
            html += '<tr><td>Salary Advances</td><td class="text-right mono">0</td></tr>';
        }
        // Individual loan deductions
        if (loansDetail.length > 0) {
            loansDetail.forEach(loan => {
                html += '<tr><td style="padding-left:12px;">' + loan.loan_type + ' <span class="text-muted" style="font-size:0.7rem;">(Bal: UGX ' + this.fmtInt(loan.balance) + ')</span></td><td class="text-right mono text-danger">' + this.fmtInt(loan.monthly_deduction) + '</td></tr>';
            });
            if (loansDetail.length > 1) {
                html += '<tr><td class="text-bold" style="padding-left:12px;">Subtotal — Loan Repayments</td><td class="text-right mono text-bold text-danger">' + this.fmtInt(p.loan_deductions) + '</td></tr>';
            }
        } else {
            html += '<tr><td>Loan Repayments</td><td class="text-right mono">0</td></tr>';
        }
        html += '<tr><td>Other Deductions</td><td class="text-right mono' + (p.other_deductions > 0 ? ' text-danger' : '') + '">' + this.fmtInt(p.other_deductions) + '</td></tr>';
        html += '<tr class="total-row"><td class="text-bold">Total Deductions</td><td class="text-right mono text-bold text-danger">' + this.fmtInt(p.total_deductions) + '</td></tr>';
        html += '<tr style="background:rgba(16,185,129,0.1);"><td class="text-bold" style="color:var(--sa-success);font-size:0.95rem;">NET PAY</td>'
            + '<td class="text-right mono text-bold" style="color:var(--sa-success);font-size:1.1rem;">UGX ' + this.fmtInt(p.net_pay) + '</td></tr>';
        html += '<tr style="background:rgba(240,165,0,0.06);"><td colspan="2" class="text-bold" style="color:var(--sa-gold);">EMPLOYER CONTRIBUTIONS</td></tr>';
        html += '<tr><td>NSSF (Employer 10%)</td><td class="text-right mono">' + this.fmtInt(p.nssf_employer) + '</td></tr>';
        html += '</tbody></table>';
        html += '<div style="margin-top:12px;font-size:0.72rem;color:var(--sa-text-dim);">Taxable Income: UGX ' + this.fmtInt(p.taxable_income) + ' (Gross - NSSF Employee)</div></div>';
        html += '<div class="sa-modal-actions" style="padding:12px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Close</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.printPayslip(\'' + empId + '\')">Print Payslip</button></div>';
        this.openModal('Payslip — ' + e.name, html);
    },

    printPayslip(empId) {
        const e = this.data.employees.find(emp => emp.id === empId);
        if (!e) return;
        const p = this.calcPayslip(e);
        const branch = this.data.branches.find(b => b.id === e.branch_id);
        const loansDetail = this._getEmployeeLoansDetail(e.id);
        const advancesDetail = this._getEmployeeAdvancesDetail(e.id);

        const details = '<p><strong>Employee:</strong> ' + e.name + ' &nbsp; <strong>ID:</strong> ' + (e.employee_id || '—') + '</p>'
            + '<p><strong>Position:</strong> ' + (e.position || '—') + ' &nbsp; <strong>NSSF:</strong> ' + (e.nssf_number || '—') + '</p>'
            + '<p><strong>TIN:</strong> ' + (e.tin || '—') + ' &nbsp; <strong>Bank:</strong> ' + (e.bank_name || '—') + ' ' + (e.bank_account || '') + '</p>'
            + '<p><strong>Branch:</strong> ' + (branch ? branch.name : '') + ' &nbsp; <strong>Period:</strong> ' + this.monthLabel() + '</p>';

        // Build deductions rows with individual breakdowns
        let deductionRows = '<tr><td>NSSF (Employee 5%)</td><td class="right">' + this.fmtInt(p.nssf_employee) + '</td></tr>'
            + '<tr><td>PAYE (Income Tax)</td><td class="right">' + this.fmtInt(p.paye) + '</td></tr>'
            + '<tr><td>Pump Shortage Deductions</td><td class="right"' + (p.shortage_deductions > 0 ? ' style="color:#c00;"' : '') + '>' + this.fmtInt(p.shortage_deductions) + '</td></tr>';

        // Individual salary advances
        if (advancesDetail.length > 0) {
            advancesDetail.forEach(adv => {
                deductionRows += '<tr><td style="padding-left:16px;">' + adv.category + ' <span style="font-size:10px;color:#999;">(' + adv.date + ')</span></td><td class="right" style="color:#c00;">' + this.fmtInt(adv.amount) + '</td></tr>';
            });
            if (advancesDetail.length > 1) {
                deductionRows += '<tr style="background:#fafafa;"><td style="padding-left:16px;"><b>Subtotal — Salary Advances</b></td><td class="right bold" style="color:#c00;">' + this.fmtInt(p.salary_advances) + '</td></tr>';
            }
        } else {
            deductionRows += '<tr><td>Salary Advances</td><td class="right">0</td></tr>';
        }

        // Individual loan deductions
        if (loansDetail.length > 0) {
            loansDetail.forEach(loan => {
                deductionRows += '<tr><td style="padding-left:16px;">' + loan.loan_type + ' <span style="font-size:10px;color:#999;">(Loan: UGX ' + this.fmtInt(loan.amount) + ' | Bal: UGX ' + this.fmtInt(loan.balance) + ')</span></td><td class="right" style="color:#c00;">' + this.fmtInt(loan.monthly_deduction) + '</td></tr>';
            });
            if (loansDetail.length > 1) {
                deductionRows += '<tr style="background:#fafafa;"><td style="padding-left:16px;"><b>Subtotal — Loan Repayments</b></td><td class="right bold" style="color:#c00;">' + this.fmtInt(p.loan_deductions) + '</td></tr>';
            }
        } else {
            deductionRows += '<tr><td>Loan Repayments</td><td class="right">0</td></tr>';
        }

        deductionRows += '<tr><td>Other Deductions</td><td class="right"' + (p.other_deductions > 0 ? ' style="color:#c00;"' : '') + '>' + this.fmtInt(p.other_deductions) + '</td></tr>';

        const body = '<table>'
            + '<tr class="total-row"><td colspan="2"><b>EARNINGS</b></td></tr>'
            + '<tr><td>Gross Salary</td><td class="right bold">' + this.fmtInt(p.gross) + '</td></tr>'
            + '<tr class="total-row"><td colspan="2"><b>DEDUCTIONS</b></td></tr>'
            + deductionRows
            + '<tr class="total-row"><td><b>Total Deductions</b></td><td class="right bold" style="color:#c00;">' + this.fmtInt(p.total_deductions) + '</td></tr>'
            + '<tr style="background:#e8f5e9;"><td><b style="font-size:15px;">NET PAY</b></td><td class="right bold" style="font-size:15px;">UGX ' + this.fmtInt(p.net_pay) + '</td></tr>'
            + '<tr class="total-row"><td colspan="2"><b>EMPLOYER CONTRIBUTIONS</b></td></tr>'
            + '<tr><td>NSSF (Employer 10%)</td><td class="right">' + this.fmtInt(p.nssf_employer) + '</td></tr>'
            + '</table>'
            + '<p style="margin-top:12px;font-size:11px;color:#999;">Taxable Income: UGX ' + this.fmtInt(p.taxable_income) + ' (Gross - NSSF Employee)</p>';

        const w = window.open('', '_blank', 'width=700,height=700');
        w.document.write(this._receiptHTML('PAYSLIP — ' + this.monthLabel(), details, body));
        w.document.close();
        setTimeout(() => w.print(), 300);
    },

    // ============================================================
    // PAYROLL MODULE (Salary Deduction Ledger)
    // ============================================================
    renderPayroll(el) {
        if (!this.hasPermission('view_payroll')) { el.innerHTML = this._accessDenied('Payroll'); return; }
        const bid = this.currentBranch ? this.currentBranch.id : null;
        const emps = bid ? this.data.employees.filter(e => e.branch_id === bid && e.is_active !== false) : this.data.employees.filter(e => e.is_active !== false);

        let html = '<div class="sa-page-header"><h1>Payroll &mdash; ' + this.monthLabel() + '' + (this.currentBranch ? ' &mdash; ' + this.currentBranch.name : '') + '</h1>'
            + '<div class="sa-page-actions">';
        if (this.hasPermission('run_payroll')) {
            html += '<button class="sa-btn sa-btn-secondary" onclick="SA.downloadNSSFExcel()">Download NSSF</button>'
                + '<button class="sa-btn sa-btn-secondary" onclick="SA.downloadPAYEExcel()">Download PAYE</button>';
        }
        html += '</div></div>';

        // Salary Deduction Ledger
        let grandGross = 0, grandNSSFEmp = 0, grandNSSFEmpr = 0, grandPAYE = 0, grandShortage = 0, grandAdvances = 0, grandLoans = 0, grandOther = 0, grandNet = 0;
        html += '<div class="sa-section"><div class="sa-section-header green"><div class="sa-section-title">Salary Deduction Ledger — ' + this.monthLabel() + '</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table" style="font-size:0.78rem;">';
        html += '<thead><tr><th>Employee</th><th>Position</th><th class="text-right">Gross</th><th class="text-right">NSSF (5%)</th>'
            + '<th class="text-right">Taxable</th><th class="text-right">PAYE</th><th class="text-right">Shortages</th>'
            + '<th class="text-right">Advances</th><th class="text-right">Loans</th>'
            + '<th class="text-right">Other Ded.</th><th class="text-right">Total Ded.</th><th class="text-right" style="color:var(--sa-success);">Net Pay</th>'
            + '<th class="text-right" style="color:var(--sa-gold);">NSSF Emplr</th></tr></thead><tbody>';
        if (emps.length === 0) {
            html += '<tr><td colspan="13" class="text-center text-muted" style="padding:30px;">No active employees.</td></tr>';
        }
        emps.forEach(e => {
            const p = this.calcPayslip(e);
            grandGross += p.gross; grandNSSFEmp += p.nssf_employee; grandNSSFEmpr += p.nssf_employer;
            grandPAYE += p.paye; grandShortage += p.shortage_deductions; grandAdvances += p.salary_advances;
            grandLoans += p.loan_deductions; grandOther += p.other_deductions; grandNet += p.net_pay;
            html += '<tr><td><strong>' + e.name + '</strong><br><span class="text-muted" style="font-size:0.68rem;">' + (e.nssf_number || '') + '</span></td>'
                + '<td>' + (e.position || '') + '</td>'
                + '<td class="text-right mono">' + this.fmtInt(p.gross) + '</td>'
                + '<td class="text-right mono">' + this.fmtInt(p.nssf_employee) + '</td>'
                + '<td class="text-right mono text-muted">' + this.fmtInt(p.taxable_income) + '</td>'
                + '<td class="text-right mono">' + this.fmtInt(p.paye) + '</td>'
                + '<td class="text-right mono ' + (p.shortage_deductions > 0 ? 'text-danger' : '') + '">' + this.fmtInt(p.shortage_deductions) + '</td>'
                + '<td class="text-right mono ' + (p.salary_advances > 0 ? 'text-danger' : '') + '">' + this.fmtInt(p.salary_advances) + '</td>'
                + '<td class="text-right mono ' + (p.loan_deductions > 0 ? 'text-danger' : '') + '">' + this.fmtInt(p.loan_deductions) + '</td>'
                + '<td class="text-right mono">' + this.fmtInt(p.other_deductions) + '</td>'
                + '<td class="text-right mono text-bold text-danger">' + this.fmtInt(p.total_deductions) + '</td>'
                + '<td class="text-right mono text-bold" style="color:var(--sa-success);">' + this.fmtInt(p.net_pay) + '</td>'
                + '<td class="text-right mono" style="color:var(--sa-gold);">' + this.fmtInt(p.nssf_employer) + '</td></tr>';
        });
        const grandTotalDed = grandNSSFEmp + grandPAYE + grandShortage + grandAdvances + grandLoans + grandOther;
        html += '<tr class="total-row"><td colspan="2" class="text-bold">TOTALS</td>'
            + '<td class="text-right mono text-bold">' + this.fmtInt(grandGross) + '</td>'
            + '<td class="text-right mono text-bold">' + this.fmtInt(grandNSSFEmp) + '</td><td></td>'
            + '<td class="text-right mono text-bold">' + this.fmtInt(grandPAYE) + '</td>'
            + '<td class="text-right mono text-bold text-danger">' + this.fmtInt(grandShortage) + '</td>'
            + '<td class="text-right mono text-bold text-danger">' + this.fmtInt(grandAdvances) + '</td>'
            + '<td class="text-right mono text-bold text-danger">' + this.fmtInt(grandLoans) + '</td>'
            + '<td class="text-right mono text-bold">' + this.fmtInt(grandOther) + '</td>'
            + '<td class="text-right mono text-bold text-danger">' + this.fmtInt(grandTotalDed) + '</td>'
            + '<td class="text-right mono text-bold" style="color:var(--sa-success);">' + this.fmtInt(grandNet) + '</td>'
            + '<td class="text-right mono text-bold" style="color:var(--sa-gold);">' + this.fmtInt(grandNSSFEmpr) + '</td></tr>';
        html += '</tbody></table></div></div></div>';

        // Summary cards
        html += '<div class="sa-stats">';
        html += '<div class="sa-stat-card gold"><div class="stat-label">Total Gross</div><div class="stat-value">UGX ' + this.fmtInt(grandGross) + '</div></div>';
        html += '<div class="sa-stat-card danger"><div class="stat-label">Total PAYE</div><div class="stat-value">UGX ' + this.fmtInt(grandPAYE) + '</div></div>';
        html += '<div class="sa-stat-card pms"><div class="stat-label">Total NSSF</div><div class="stat-value">UGX ' + this.fmtInt(grandNSSFEmp + grandNSSFEmpr) + '</div><div class="stat-sub">Emp ' + this.fmtInt(grandNSSFEmp) + ' + Emplr ' + this.fmtInt(grandNSSFEmpr) + '</div></div>';
        html += '<div class="sa-stat-card success"><div class="stat-label">Total Net Pay</div><div class="stat-value">UGX ' + this.fmtInt(grandNet) + '</div></div>';
        html += '</div>';

        // PAYE Bracket reference
        html += '<div class="sa-section"><div class="sa-section-header yellow"><div class="sa-section-title">Uganda PAYE Tax Brackets (Monthly)</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table" style="font-size:0.78rem;">';
        html += '<thead><tr><th>Income Range (UGX)</th><th class="text-right">Rate</th></tr></thead><tbody>';
        this.PAYE_BRACKETS.forEach(b => {
            html += '<tr><td>' + b.label + '</td><td class="text-right mono">' + (b.rate * 100) + '%</td></tr>';
        });
        html += '</tbody></table></div></div></div>';
        el.innerHTML = html;
    },

    // --- NSSF CSV Download ---
    downloadNSSFExcel() {
        const bid = this.currentBranch ? this.currentBranch.id : null;
        const emps = bid ? this.data.employees.filter(e => e.branch_id === bid && e.is_active !== false) : this.data.employees.filter(e => e.is_active !== false);
        const branch = this.currentBranch ? this.currentBranch.name : 'All Branches';
        let csv = 'NSSF CONTRIBUTION SCHEDULE - GASCO ENERGY LIMITED\n';
        csv += 'Branch:,' + branch + '\nPeriod:,' + this.monthLabel() + '\n\n';
        csv += 'No.,Employee Name,NSSF Number,Gross Salary,Employee 5%,Employer 10%,Total Contribution\n';
        let tG = 0, tE = 0, tR = 0;
        emps.forEach((e, i) => {
            const g = this.parseNum(e.gross_salary);
            const n = this.calcNSSF(g);
            tG += g; tE += n.employee; tR += n.employer;
            csv += (i + 1) + ',"' + e.name + '",' + (e.nssf_number || '') + ',' + g + ',' + n.employee + ',' + n.employer + ',' + n.total + '\n';
        });
        csv += '\n,TOTALS,,' + tG + ',' + tE + ',' + tR + ',' + (tE + tR) + '\n';
        this._downloadCSV(csv, 'NSSF_Schedule_' + this.monthShortLabel() + '_' + branch.replace(/\s+/g, '_') + '.csv');
        this.toast('NSSF schedule downloaded');
    },

    // --- PAYE CSV Download ---
    downloadPAYEExcel() {
        const bid = this.currentBranch ? this.currentBranch.id : null;
        const emps = bid ? this.data.employees.filter(e => e.branch_id === bid && e.is_active !== false) : this.data.employees.filter(e => e.is_active !== false);
        const branch = this.currentBranch ? this.currentBranch.name : 'All Branches';
        let csv = 'PAYE RETURN - GASCO ENERGY LIMITED\n';
        csv += 'Branch:,' + branch + '\nPeriod:,' + this.monthLabel() + '\n\n';
        csv += 'No.,Employee Name,TIN,Gross Salary,NSSF Employee 5%,Taxable Income,PAYE,Shortage Deductions,Salary Advances,Loan Deductions,Other Deductions,Net Pay\n';
        let t = { g: 0, n: 0, tx: 0, p: 0, s: 0, adv: 0, ln: 0, o: 0, net: 0 };
        emps.forEach((e, i) => {
            const p = this.calcPayslip(e);
            t.g += p.gross; t.n += p.nssf_employee; t.tx += p.taxable_income; t.p += p.paye;
            t.s += p.shortage_deductions; t.adv += p.salary_advances; t.ln += p.loan_deductions; t.o += p.other_deductions; t.net += p.net_pay;
            csv += (i + 1) + ',"' + e.name + '",' + (e.tin || '') + ',' + p.gross + ',' + p.nssf_employee + ',' + p.taxable_income + ',' + p.paye + ',' + p.shortage_deductions + ',' + p.salary_advances + ',' + p.loan_deductions + ',' + p.other_deductions + ',' + p.net_pay + '\n';
        });
        csv += '\n,TOTALS,,' + t.g + ',' + t.n + ',' + t.tx + ',' + t.p + ',' + t.s + ',' + t.adv + ',' + t.ln + ',' + t.o + ',' + t.net + '\n';
        this._downloadCSV(csv, 'PAYE_Return_' + this.monthShortLabel() + '_' + branch.replace(/\s+/g, '_') + '.csv');
        this.toast('PAYE return downloaded');
    },

    _downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.style.display = 'none';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // ============================================================
    // LEAVE MANAGEMENT
    // ============================================================
    renderLeave(el) {
        if (!this.hasPermission('manage_hr')) { el.innerHTML = this._accessDenied('Leave Management'); return; }
        const bid = this.currentBranch ? this.currentBranch.id : null;
        const emps = bid ? this.data.employees.filter(e => e.branch_id === bid && e.is_active !== false) : this.data.employees.filter(e => e.is_active !== false);
        const leaves = this.data.leaveRecords.filter(l => {
            const emp = this.data.employees.find(e => e.id === l.employee_id);
            return emp && (!bid || emp.branch_id === bid);
        });

        let html = '<div class="sa-page-header"><h1>Leave Management' + (this.currentBranch ? ' &mdash; ' + this.currentBranch.name : '') + '</h1>'
            + '<div class="sa-page-actions"><button class="sa-btn sa-btn-primary" onclick="SA.showAddLeave()">+ Record Leave</button></div></div>';

        // Leave type legend
        html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">';
        this.LEAVE_TYPES.forEach(lt => {
            html += '<span class="sa-badge ' + lt.color + '">' + lt.label + ' (' + lt.default_days + ' days/yr)</span>';
        });
        html += '</div>';

        // Leave balance table
        html += '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">Leave Balances — ' + emps.length + ' Employees</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table" style="font-size:0.78rem;">';
        html += '<thead><tr><th>Employee</th>';
        this.LEAVE_TYPES.forEach(lt => { html += '<th class="text-center" style="font-size:0.7rem;">' + lt.label.split(' ')[0] + '</th>'; });
        html += '<th class="text-right">Total Taken</th></tr></thead><tbody>';
        if (emps.length === 0) {
            html += '<tr><td colspan="' + (this.LEAVE_TYPES.length + 2) + '" class="text-center text-muted" style="padding:30px;">No employees.</td></tr>';
        }
        emps.forEach(e => {
            const empLeaves = leaves.filter(l => l.employee_id === e.id);
            let totalTaken = 0;
            html += '<tr><td><strong>' + e.name + '</strong><br><span class="text-muted" style="font-size:0.68rem;">' + (e.position || '') + '</span></td>';
            this.LEAVE_TYPES.forEach(lt => {
                const taken = empLeaves.filter(l => l.leave_type === lt.id && l.status !== 'cancelled').reduce((s, l) => s + this.parseNum(l.days), 0);
                totalTaken += taken;
                const remaining = lt.default_days - taken;
                const cls = remaining <= 0 ? 'text-danger text-bold' : (remaining <= 3 ? 'text-warning' : 'text-muted');
                html += '<td class="text-center ' + cls + '">' + taken + '/' + lt.default_days + '</td>';
            });
            html += '<td class="text-right mono text-bold">' + totalTaken + '</td></tr>';
        });
        html += '</tbody></table></div></div></div>';

        // Leave records
        const sorted = leaves.slice().sort((a, b) => b.start_date < a.start_date ? -1 : 1);
        html += '<div class="sa-section"><div class="sa-section-header green"><div class="sa-section-title">Leave Records (' + sorted.length + ')</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table" style="font-size:0.78rem;">';
        html += '<thead><tr><th>Employee</th><th>Leave Type</th><th>From</th><th>To</th><th class="text-right">Days</th><th>Reason</th><th>Status</th><th style="width:80px;"></th></tr></thead><tbody>';
        if (sorted.length === 0) {
            html += '<tr><td colspan="8" class="text-center text-muted" style="padding:30px;">No leave records yet.</td></tr>';
        }
        sorted.forEach(l => {
            const emp = this.data.employees.find(e => e.id === l.employee_id);
            const lt = this.LEAVE_TYPES.find(t => t.id === l.leave_type) || { label: l.leave_type, color: 'sa-badge-neutral' };
            const statusBadge = l.status === 'approved' ? '<span class="sa-badge sa-badge-success">Approved</span>'
                : l.status === 'cancelled' ? '<span class="sa-badge sa-badge-danger">Cancelled</span>'
                : '<span class="sa-badge sa-badge-warning">Pending</span>';
            html += '<tr><td><strong>' + (emp ? emp.name : '?') + '</strong></td>'
                + '<td><span class="sa-badge ' + lt.color + '">' + lt.label + '</span></td>'
                + '<td>' + (l.start_date || '') + '</td><td>' + (l.end_date || '') + '</td>'
                + '<td class="text-right mono">' + (l.days || '') + '</td>'
                + '<td class="text-muted">' + (l.reason || '') + '</td>'
                + '<td>' + statusBadge + '</td>'
                + '<td>' + (l.status !== 'cancelled' ? '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.cancelLeave(\'' + l.id + '\')">Cancel</button>' : '') + '</td></tr>';
        });
        html += '</tbody></table></div></div></div>';
        el.innerHTML = html;
    },

    showAddLeave() {
        const bid = this.currentBranch ? this.currentBranch.id : null;
        const emps = bid ? this.data.employees.filter(e => e.branch_id === bid && e.is_active !== false) : this.data.employees.filter(e => e.is_active !== false);
        if (emps.length === 0) { this.toast('Add employees first', 'error'); return; }
        let empOpts = '';
        emps.forEach(e => { empOpts += '<option value="' + e.id + '">' + e.name + ' — ' + (e.position || '') + '</option>'; });
        let leaveOpts = '';
        this.LEAVE_TYPES.forEach(lt => { leaveOpts += '<option value="' + lt.id + '">' + lt.label + ' (' + lt.default_days + ' days/yr)</option>'; });
        const html = '<div class="sa-form-group"><label>Employee *</label><select class="sa-input" id="lvEmp">' + empOpts + '</select></div>'
            + '<div class="sa-form-group"><label>Leave Type *</label><select class="sa-input" id="lvType">' + leaveOpts + '</select></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Start Date *</label><input class="sa-input" id="lvFrom" type="date" value="' + this.todayStr() + '"></div>'
            + '<div class="sa-form-group"><label>End Date *</label><input class="sa-input" id="lvTo" type="date" value="' + this.todayStr() + '"></div></div>'
            + '<div class="sa-form-group"><label>Number of Days *</label><input class="sa-input" id="lvDays" type="number" value="1" min="0.5" step="0.5"></div>'
            + '<div class="sa-form-group"><label>Reason / Notes</label><input class="sa-input" id="lvReason" placeholder="Optional"></div>'
            + '<div class="sa-form-group"><label>Status</label><select class="sa-input" id="lvStatus"><option value="approved">Approved</option><option value="pending">Pending</option></select></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveLeave()">Record Leave</button></div>';
        this.openModal('Record Leave', html);
    },

    saveLeave() {
        const empId = parseInt(document.getElementById('lvEmp').value);
        const leaveType = document.getElementById('lvType').value;
        const startDate = document.getElementById('lvFrom').value;
        const endDate = document.getElementById('lvTo').value;
        const days = this.parseNum(document.getElementById('lvDays').value);
        const reason = document.getElementById('lvReason').value.trim();
        const status = document.getElementById('lvStatus').value;
        if (!startDate || !endDate || days <= 0) { this.toast('Fill in all required fields', 'error'); return; }
        const emp = this.data.employees.find(e => e.id === empId);
        this.data.leaveRecords.push({
            id: this.uid(), employee_id: empId,
            leave_type: leaveType, start_date: startDate, end_date: endDate,
            days: days, reason: reason, status: status,
            created_at: new Date().toISOString()
        });
        this.saveData();
        this.auditLog('LEAVE_RECORDED', (emp ? emp.name : 'Employee') + ': ' + leaveType + ' leave, ' + days + ' days (' + startDate + ' to ' + endDate + ')');
        this.closeModal();
        this.toast('Leave recorded');
        this.navigate('leave');
    },

    cancelLeave(leaveId) {
        const l = this.data.leaveRecords.find(lr => lr.id === leaveId);
        if (!l) return;
        if (!confirm('Cancel this leave record?')) return;
        l.status = 'cancelled';
        this.saveData();
        const emp = this.data.employees.find(e => e.id === l.employee_id);
        this.auditLog('LEAVE_CANCELLED', (emp ? emp.name : 'Employee') + ': cancelled ' + l.leave_type + ' leave');
        this.toast('Leave cancelled');
        this.navigate('leave');
    },

    // ============================================================
    // STAFF LOANS MODULE
    // ============================================================

    // Get monthly loan deduction for an employee (sum of active loan installments)
    _getEmployeeLoanDeduction(empId) {
        if (!this.data.loans) return 0;
        let total = 0;
        this.data.loans.forEach(loan => {
            if (loan.employee_id == empId && loan.status === 'active') {
                total += this.parseNum(loan.monthly_deduction);
            }
        });
        return total;
    },

    // Get individual active loan details for an employee (for payslip breakdown)
    _getEmployeeLoansDetail(empId) {
        if (!this.data.loans) return [];
        return this.data.loans.filter(loan => loan.employee_id == empId && loan.status === 'active').map(loan => ({
            loan_type: loan.loan_type || 'Staff Loan',
            amount: this.parseNum(loan.amount),
            monthly_deduction: this.parseNum(loan.monthly_deduction),
            balance: this._getLoanBalance(loan)
        }));
    },

    // Get individual salary advance details for an employee this month
    _getEmployeeAdvancesDetail(empId) {
        const advances = [];
        const month = this.MONTH;
        Object.keys(this.data.cashToBank).forEach(key => {
            const ctb = this.data.cashToBank[key];
            if (!key.includes('_' + month)) return;
            const expenses = this._activeRecords(ctb.cashExpenses || []);
            expenses.forEach(e => {
                if (e.employee_id == empId && (e.category === 'Salary Advance' || e.category === 'Salary Payment')) {
                    advances.push({ date: e.date || key.split('_').pop() || '', amount: this.parseNum(e.amount), category: e.category });
                }
            });
        });
        return advances;
    },

    // Get remaining balance on a loan
    _getLoanBalance(loan) {
        const principal = this.parseNum(loan.amount);
        const totalRepaid = (loan.repayments || []).reduce((s, r) => s + this.parseNum(r.amount), 0);
        return principal - totalRepaid;
    },

    renderLoans(el) {
        if (!this.hasPermission('manage_hr')) { el.innerHTML = this._accessDenied('Staff Loans'); return; }
        const bid = this.currentBranch ? this.currentBranch.id : null;
        const allLoans = this.data.loans || [];

        // Filter loans by branch if selected
        const loans = bid ? allLoans.filter(l => {
            const emp = this.data.employees.find(e => e.id === l.employee_id);
            return emp && emp.branch_id === bid;
        }) : allLoans;

        const activeLoans = loans.filter(l => l.status === 'active');
        const paidLoans = loans.filter(l => l.status === 'paid');

        let html = '<div class="sa-page-header"><h1>Staff Loans' + (this.currentBranch ? ' &mdash; ' + this.currentBranch.name : '') + '</h1>'
            + '<div class="sa-page-actions"><button class="sa-btn sa-btn-primary" onclick="SA.showAddLoan()">+ New Loan</button></div></div>';

        // Summary stats
        const totalDisbursed = activeLoans.reduce((s, l) => s + this.parseNum(l.amount), 0);
        const totalOutstanding = activeLoans.reduce((s, l) => s + this._getLoanBalance(l), 0);
        const totalMonthlyDed = activeLoans.reduce((s, l) => s + this.parseNum(l.monthly_deduction), 0);
        html += '<div class="sa-stats">';
        html += '<div class="sa-stat-card info"><div class="stat-label">Active Loans</div><div class="stat-value">' + activeLoans.length + '</div><div class="stat-sub">' + paidLoans.length + ' paid off</div></div>';
        html += '<div class="sa-stat-card gold"><div class="stat-label">Total Disbursed</div><div class="stat-value">UGX ' + this.fmtInt(totalDisbursed) + '</div><div class="stat-sub">Active loans</div></div>';
        html += '<div class="sa-stat-card danger"><div class="stat-label">Outstanding Balance</div><div class="stat-value">UGX ' + this.fmtInt(totalOutstanding) + '</div><div class="stat-sub">Remaining to collect</div></div>';
        html += '<div class="sa-stat-card pms"><div class="stat-label">Monthly Deductions</div><div class="stat-value">UGX ' + this.fmtInt(totalMonthlyDed) + '</div><div class="stat-sub">From payroll</div></div>';
        html += '</div>';

        // Active loans table
        html += '<div class="sa-section"><div class="sa-section-header red"><div class="sa-section-title">Active Loans (' + activeLoans.length + ')</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table" style="font-size:0.78rem;">';
        html += '<thead><tr><th>Employee</th><th>Loan Type</th><th class="text-right">Amount</th><th class="text-right">Monthly Ded.</th>'
            + '<th class="text-right">Total Repaid</th><th class="text-right">Balance</th><th>Start Date</th><th>Status</th><th style="width:120px;">Actions</th></tr></thead><tbody>';
        if (activeLoans.length === 0) {
            html += '<tr><td colspan="9" class="text-center text-muted" style="padding:30px;">No active loans.</td></tr>';
        }
        activeLoans.forEach(l => {
            const emp = this.data.employees.find(e => e.id === l.employee_id);
            const balance = this._getLoanBalance(l);
            const totalRepaid = this.parseNum(l.amount) - balance;
            const pct = this.parseNum(l.amount) > 0 ? Math.round((totalRepaid / this.parseNum(l.amount)) * 100) : 0;
            html += '<tr><td><strong>' + (emp ? emp.name : 'Unknown') + '</strong><br><span class="text-muted" style="font-size:0.68rem;">' + (emp ? (emp.position || '') : '') + '</span></td>'
                + '<td><span class="sa-badge sa-badge-warning">' + (l.loan_type || 'General') + '</span></td>'
                + '<td class="text-right mono">' + this.fmtInt(this.parseNum(l.amount)) + '</td>'
                + '<td class="text-right mono">' + this.fmtInt(this.parseNum(l.monthly_deduction)) + '</td>'
                + '<td class="text-right mono" style="color:var(--sa-success);">' + this.fmtInt(totalRepaid) + ' (' + pct + '%)</td>'
                + '<td class="text-right mono text-bold text-danger">' + this.fmtInt(balance) + '</td>'
                + '<td class="text-muted">' + (l.start_date || '—') + '</td>'
                + '<td><span class="sa-badge sa-badge-danger">Active</span></td>'
                + '<td><div class="sa-btn-group"><button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.viewLoan(\'' + l.id + '\')">View</button>'
                + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.showAddRepayment(\'' + l.id + '\')">Pay</button></div></td></tr>';
        });
        html += '</tbody></table></div></div></div>';

        // Paid off loans
        if (paidLoans.length > 0) {
            html += '<div class="sa-section"><div class="sa-section-header green"><div class="sa-section-title">Paid Off Loans (' + paidLoans.length + ')</div></div>'
                + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table" style="font-size:0.78rem;">';
            html += '<thead><tr><th>Employee</th><th>Loan Type</th><th class="text-right">Amount</th><th>Start</th><th>Paid Off</th><th style="width:80px;"></th></tr></thead><tbody>';
            paidLoans.forEach(l => {
                const emp = this.data.employees.find(e => e.id === l.employee_id);
                html += '<tr><td><strong>' + (emp ? emp.name : 'Unknown') + '</strong></td>'
                    + '<td><span class="sa-badge sa-badge-success">' + (l.loan_type || 'General') + '</span></td>'
                    + '<td class="text-right mono">' + this.fmtInt(this.parseNum(l.amount)) + '</td>'
                    + '<td class="text-muted">' + (l.start_date || '—') + '</td>'
                    + '<td class="text-muted">' + (l.paid_off_date || '—') + '</td>'
                    + '<td><button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.viewLoan(\'' + l.id + '\')">View</button></td></tr>';
            });
            html += '</tbody></table></div></div></div>';
        }

        el.innerHTML = html;
    },

    showAddLoan() {
        const bid = this.currentBranch ? this.currentBranch.id : null;
        const emps = bid ? this.data.employees.filter(e => e.branch_id === bid && e.is_active !== false) : this.data.employees.filter(e => e.is_active !== false);
        if (emps.length === 0) { this.toast('Add employees first', 'error'); return; }
        let empOpts = '';
        emps.forEach(e => { empOpts += '<option value="' + e.id + '">' + e.name + ' — ' + (e.position || '') + ' (UGX ' + this.fmtInt(this.parseNum(e.gross_salary)) + '/mo)</option>'; });
        const html = '<div class="sa-form-group"><label>Employee *</label><select class="sa-input" id="lnEmp">' + empOpts + '</select></div>'
            + '<div class="sa-form-group"><label>Loan Type *</label><select class="sa-input" id="lnType">'
            + '<option value="Salary Advance">Salary Advance</option>'
            + '<option value="Staff Loan">Staff Loan</option>'
            + '<option value="Emergency Loan">Emergency Loan</option>'
            + '<option value="Equipment Loan">Equipment Loan</option>'
            + '</select></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Loan Amount (UGX) *</label><input class="sa-input" id="lnAmount" type="number" placeholder="e.g. 500000"></div>'
            + '<div class="sa-form-group"><label>Monthly Deduction (UGX) *</label><input class="sa-input" id="lnDeduction" type="number" placeholder="e.g. 100000"></div></div>'
            + '<div class="sa-form-row"><div class="sa-form-group"><label>Start Date</label><input class="sa-input" id="lnStart" type="date" value="' + this.todayStr() + '"></div>'
            + '<div class="sa-form-group"><label>Interest Rate (% p.a.)</label><input class="sa-input" id="lnRate" type="number" value="0" step="0.5" placeholder="0 for interest-free"></div></div>'
            + '<div class="sa-form-group"><label>Notes / Reason</label><input class="sa-input" id="lnNotes" placeholder="Optional"></div>'
            + '<div class="sa-info-box" style="margin-top:8px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + 'The monthly deduction will be automatically applied to the employee\'s payslip each month until the loan is fully repaid.</div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveLoan()">Disburse Loan</button></div>';
        this.openModal('New Staff Loan', html, true);
    },

    saveLoan() {
        const empId = document.getElementById('lnEmp').value;
        const loanType = document.getElementById('lnType').value;
        const amount = this.parseNum(document.getElementById('lnAmount').value);
        const monthlyDed = this.parseNum(document.getElementById('lnDeduction').value);
        const startDate = document.getElementById('lnStart').value;
        const rate = this.parseNum(document.getElementById('lnRate').value);
        const notes = document.getElementById('lnNotes').value.trim();

        if (amount <= 0) { this.toast('Enter a valid loan amount', 'error'); return; }
        if (monthlyDed <= 0) { this.toast('Enter a valid monthly deduction', 'error'); return; }
        if (monthlyDed > amount) { this.toast('Monthly deduction cannot exceed loan amount', 'error'); return; }

        const emp = this.data.employees.find(e => e.id === empId);
        const loan = {
            id: this.uid(), employee_id: empId,
            loan_type: loanType, amount: amount,
            monthly_deduction: monthlyDed, interest_rate: rate,
            start_date: startDate, notes: notes,
            status: 'active', repayments: [],
            created_at: new Date().toISOString()
        };
        if (!this.data.loans) this.data.loans = [];
        this.data.loans.push(loan);
        this.saveData();
        this.auditLog('LOAN_DISBURSED', 'Loan disbursed to ' + (emp ? emp.name : 'Employee') + ': UGX ' + this.fmtInt(amount) + ' (' + loanType + ')');
        this.closeModal();
        this.toast('Loan of UGX ' + this.fmtInt(amount) + ' disbursed to ' + (emp ? emp.name : 'Employee'));
        this.navigate('loans');
    },

    viewLoan(loanId) {
        const loan = (this.data.loans || []).find(l => l.id === loanId);
        if (!loan) return;
        const emp = this.data.employees.find(e => e.id === loan.employee_id);
        const balance = this._getLoanBalance(loan);
        const totalRepaid = this.parseNum(loan.amount) - balance;
        const pct = this.parseNum(loan.amount) > 0 ? Math.round((totalRepaid / this.parseNum(loan.amount)) * 100) : 0;
        const repayments = loan.repayments || [];

        let html = '<div style="font-size:0.82rem;">';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">'
            + '<div><span class="text-muted">Employee:</span> <strong>' + (emp ? emp.name : 'Unknown') + '</strong></div>'
            + '<div><span class="text-muted">Type:</span> <span class="sa-badge sa-badge-warning">' + (loan.loan_type || 'General') + '</span></div>'
            + '<div><span class="text-muted">Amount:</span> <strong class="mono">UGX ' + this.fmtInt(this.parseNum(loan.amount)) + '</strong></div>'
            + '<div><span class="text-muted">Monthly Deduction:</span> <strong class="mono">UGX ' + this.fmtInt(this.parseNum(loan.monthly_deduction)) + '</strong></div>'
            + '<div><span class="text-muted">Start Date:</span> ' + (loan.start_date || '—') + '</div>'
            + '<div><span class="text-muted">Interest:</span> ' + (this.parseNum(loan.interest_rate) > 0 ? loan.interest_rate + '% p.a.' : 'Interest-free') + '</div>'
            + '<div><span class="text-muted">Status:</span> ' + (loan.status === 'active' ? '<span class="sa-badge sa-badge-danger">Active</span>' : '<span class="sa-badge sa-badge-success">Paid Off</span>') + '</div>'
            + (loan.notes ? '<div><span class="text-muted">Notes:</span> ' + loan.notes + '</div>' : '')
            + '</div>';

        // Progress bar
        html += '<div style="margin-bottom:16px;">'
            + '<div style="display:flex;justify-content:space-between;font-size:0.72rem;margin-bottom:4px;"><span>Repaid: UGX ' + this.fmtInt(totalRepaid) + '</span><span>Balance: UGX ' + this.fmtInt(balance) + '</span></div>'
            + '<div style="background:var(--sa-border-light);border-radius:8px;height:12px;overflow:hidden;">'
            + '<div style="width:' + pct + '%;height:100%;background:var(--sa-success);border-radius:8px;transition:width 0.3s;"></div></div>'
            + '<div style="text-align:center;font-size:0.72rem;color:var(--sa-text-dim);margin-top:4px;">' + pct + '% repaid</div></div>';

        // Repayment history
        html += '<div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--sa-text-dim);margin-bottom:8px;">Repayment History (' + repayments.length + ')</div>';
        if (repayments.length > 0) {
            html += '<table class="sa-table" style="font-size:0.8rem;"><thead><tr><th>Date</th><th>Method</th><th class="text-right">Amount</th><th>Notes</th></tr></thead><tbody>';
            let cumRepaid = 0;
            repayments.forEach(r => {
                cumRepaid += this.parseNum(r.amount);
                html += '<tr><td>' + (r.date || '—') + '</td>'
                    + '<td class="text-muted">' + (r.method || 'Payroll') + '</td>'
                    + '<td class="text-right mono" style="color:var(--sa-success);">' + this.fmtInt(this.parseNum(r.amount)) + '</td>'
                    + '<td class="text-muted">' + (r.notes || '') + '</td></tr>';
            });
            html += '</tbody></table>';
        } else {
            html += '<div class="text-muted text-center" style="padding:16px;">No repayments recorded yet.</div>';
        }
        html += '</div>';

        html += '<div class="sa-modal-actions" style="padding:12px 0 0;border:none;">';
        if (loan.status === 'active') {
            html += '<button class="sa-btn sa-btn-danger" onclick="SA.deleteLoan(\'' + loanId + '\')" style="margin-right:auto;">Delete</button>';
            html += '<button class="sa-btn sa-btn-secondary" onclick="SA.showAddRepayment(\'' + loanId + '\')">Record Payment</button>';
        }
        html += '<button class="sa-btn sa-btn-primary" onclick="SA.closeModal()">Close</button></div>';
        this.openModal('Loan Details — ' + (emp ? emp.name : 'Unknown'), html, true);
    },

    showAddRepayment(loanId) {
        const loan = (this.data.loans || []).find(l => l.id === loanId);
        if (!loan) return;
        const emp = this.data.employees.find(e => e.id === loan.employee_id);
        const balance = this._getLoanBalance(loan);

        const html = '<div style="margin-bottom:12px;font-size:0.82rem;">'
            + '<div><span class="text-muted">Employee:</span> <strong>' + (emp ? emp.name : 'Unknown') + '</strong></div>'
            + '<div><span class="text-muted">Loan Balance:</span> <strong class="mono text-danger">UGX ' + this.fmtInt(balance) + '</strong></div></div>'
            + '<div class="sa-form-group"><label>Repayment Amount (UGX) *</label><input class="sa-input" id="rpyAmount" type="number" value="' + Math.min(this.parseNum(loan.monthly_deduction), balance) + '"></div>'
            + '<div class="sa-form-group"><label>Date</label><input class="sa-input" id="rpyDate" type="date" value="' + this.todayStr() + '"></div>'
            + '<div class="sa-form-group"><label>Payment Method</label><select class="sa-input" id="rpyMethod">'
            + '<option value="Payroll Deduction">Payroll Deduction</option>'
            + '<option value="Cash">Cash</option>'
            + '<option value="Bank Transfer">Bank Transfer</option>'
            + '<option value="MomoPay">MomoPay</option>'
            + '</select></div>'
            + '<div class="sa-form-group"><label>Notes</label><input class="sa-input" id="rpyNotes" placeholder="Optional"></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveRepayment(\'' + loanId + '\')">Record Payment</button></div>';
        this.openModal('Record Loan Repayment', html);
    },

    saveRepayment(loanId) {
        const loan = (this.data.loans || []).find(l => l.id === loanId);
        if (!loan) return;
        const amount = this.parseNum(document.getElementById('rpyAmount').value);
        const date = document.getElementById('rpyDate').value;
        const method = document.getElementById('rpyMethod').value;
        const notes = document.getElementById('rpyNotes').value.trim();
        const balance = this._getLoanBalance(loan);

        if (amount <= 0) { this.toast('Enter a valid amount', 'error'); return; }
        if (amount > balance) { this.toast('Amount exceeds outstanding balance of UGX ' + this.fmtInt(balance), 'error'); return; }

        if (!loan.repayments) loan.repayments = [];
        loan.repayments.push({
            id: this.uid(), amount: amount, date: date,
            method: method, notes: notes,
            created_at: new Date().toISOString()
        });

        // Check if loan is fully repaid
        const newBalance = this._getLoanBalance(loan);
        if (newBalance <= 0) {
            loan.status = 'paid';
            loan.paid_off_date = date;
        }

        this.saveData();
        const emp = this.data.employees.find(e => e.id === loan.employee_id);
        this.auditLog('LOAN_REPAYMENT', (emp ? emp.name : 'Employee') + ': UGX ' + this.fmtInt(amount) + ' repayment (' + method + ')' + (newBalance <= 0 ? ' — LOAN FULLY PAID' : ''));
        this.closeModal();
        this.toast('Repayment of UGX ' + this.fmtInt(amount) + ' recorded' + (newBalance <= 0 ? ' — Loan fully paid!' : ''));
        this.navigate('loans');
    },

    deleteLoan(loanId) {
        const loan = (this.data.loans || []).find(l => l.id === loanId);
        if (!loan) return;
        if (!confirm('Delete this loan? This cannot be undone.')) return;
        this.data.loans = this.data.loans.filter(l => l.id !== loanId);
        this.saveData();
        const emp = this.data.employees.find(e => e.id === loan.employee_id);
        this.auditLog('LOAN_DELETED', 'Deleted loan for ' + (emp ? emp.name : 'Employee') + ': UGX ' + this.fmtInt(this.parseNum(loan.amount)));
        this.closeModal();
        this.toast('Loan deleted');
        this.navigate('loans');
    },

    // ============================================================
    // CASH TO BANK RECONCILIATION
    // ============================================================
    // Centralized Cash to Bank calculation for a given branch+date
    calcCashToBank(branchId, dateStr) {
        const key = this.bk(branchId, dateStr);
        const sd = this.data.shiftDates[key];
        const calc = sd ? this.calculateDate(branchId, dateStr) : null;
        const ctb = this.data.cashToBank[key] || { cashReceipts: [], cashExpenses: [], actualBanked: null };

        // Cash in Hand is already net of shift expenses & shortages
        const cashInHand = calc ? calc.cashInHand : 0;

        // Auto-detect cash payments from customer transactions
        const autoCashReceipts = this.data.customerTransactions.filter(t => {
            if (t.transaction_date !== dateStr) return false;
            if (t.transaction_type !== 'CREDIT' || t.payment_method !== 'Cash') return false;
            const cust = this.data.customers.find(c => c.id === t.customer_id);
            return cust && cust.branch_id === branchId;
        });
        const autoCashReceiptsTotal = autoCashReceipts.reduce((s, t) => s + this.parseNum(t.credit_amount), 0);

        // Manual cash receipts (filter out soft-deleted)
        const manualReceipts = this._activeRecords(ctb.cashReceipts || []);
        const manualReceiptsTotal = manualReceipts.reduce((s, r) => s + this.parseNum(r.amount), 0);
        const totalCashReceipts = autoCashReceiptsTotal + manualReceiptsTotal;

        // Cash expenses from CTB page (filter out soft-deleted)
        const cashExpenses = this._activeRecords(ctb.cashExpenses || []);
        const totalCTBExpenses = cashExpenses.reduce((s, e) => s + this.parseNum(e.amount), 0);

        // Cash payments from Expenses & Payments page (lending cash to customers etc.)
        const totalCashPayments = this.calcTotalPayments(branchId, dateStr);

        // Petty cash expenses for this date (auto-pulled)
        const pettyCashExpenses = this.data.pettyCashEntries.filter(
            e => e.branch_id === branchId && e.date === dateStr && e.entry_type === 'expense'
        );
        const totalPettyCash = pettyCashExpenses.reduce((s, e) => s + this.parseNum(e.amount), 0);

        // Total deductions = CTB expenses + cash payments from E&P page + petty cash
        const totalDeductions = totalCTBExpenses + totalCashPayments + totalPettyCash;

        // Expected cash to bank
        const expectedCash = cashInHand + totalCashReceipts - totalDeductions;
        const actualBanked = ctb.actualBanked !== null ? this.parseNum(ctb.actualBanked) : null;
        const bankId = ctb.bank_id || null;
        const variance = actualBanked !== null ? (expectedCash - actualBanked) : null;
        const isFlagged = variance !== null && (variance > 15000 || variance < -15000);

        // Daily cash surplus = expected cash minus what was banked
        const dailyCashSurplus = expectedCash - (actualBanked || 0);

        return {
            cashInHand, autoCashReceipts, autoCashReceiptsTotal,
            manualReceipts, manualReceiptsTotal, totalCashReceipts,
            cashExpenses, totalCTBExpenses, totalCashPayments, totalDeductions,
            pettyCashExpenses, totalPettyCash,
            expectedCash, actualBanked, bankId, variance, isFlagged,
            dailyCashSurplus, ctb
        };
    },

    renderCashToBank(el) {
        if (!this.currentBranch) { el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>'; return; }
        if (!this.currentDate) this.currentDate = this.todayStr();
        const bid = this.currentBranch.id;
        const ds = this.currentDate;
        const key = this.bk(bid, ds);

        // Initialize cashToBank record for this date if needed
        if (!this.data.cashToBank[key]) {
            this.data.cashToBank[key] = { cashReceipts: [], cashExpenses: [], actualBanked: null };
        }

        // Use centralized calculation
        const r = this.calcCashToBank(bid, ds);
        const sd = this.data.shiftDates[key];

        // Payments from Expenses & Payments page
        const payments = this.data.payments[key] || [];

        // Page header with date nav
        let html = '<div class="sa-page-header"><h1>Cash to Bank &mdash; <span class="sa-date-display">' + this.formatDate(ds) + '</span></h1>'
            + '<div class="sa-date-nav">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.ctbPrevDay()">&laquo; Prev</button>'
            + '<input type="date" class="sa-date-input" value="' + ds + '" min="' + this.monthStart() + '" max="' + this.monthEnd() + '" onchange="SA.goToDate(this.value,\'cash_to_bank\')">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.ctbNextDay()">Next &raquo;</button>'
            + '</div></div>';

        // Running cash balance: sum of all expected cash minus all banked up to this date
        let runningBalance = 0;
        for (let d = 1; d <= this.DAYS_IN_MONTH; d++) {
            const dds = this.dateStr(d);
            const dkey = this.bk(bid, dds);
            if (!this.data.shiftDates[dkey]) continue;
            const dc = this.calcCashToBank(bid, dds);
            runningBalance += dc.expectedCash;
            if (dc.actualBanked !== null) runningBalance -= dc.actualBanked;
            if (dds === ds) break; // Stop at current date
        }

        html += '<div class="sa-stats">';
        html += '<div class="sa-stat-card ' + (runningBalance > 100000 ? 'danger' : (runningBalance > 0 ? 'warning' : 'success')) + '"><div class="stat-label">Running Cash Balance</div><div class="stat-value">UGX ' + this.fmtInt(runningBalance) + '</div><div class="stat-sub">Unbanked cash as of ' + this.formatDate(ds) + '</div></div>';
        html += '<div class="sa-stat-card gold"><div class="stat-label">Today\'s Expected</div><div class="stat-value">UGX ' + this.fmtInt(r.expectedCash) + '</div><div class="stat-sub">Cash to bank today</div></div>';
        if (r.actualBanked !== null) {
            const selBank = r.bankId ? this.data.banks.find(b => b.id === r.bankId) : null;
            const depConfirmed = r.ctb.deposit_confirmed === true;
            html += '<div class="sa-stat-card ' + (depConfirmed ? 'success' : 'info') + '"><div class="stat-label">Deposited' + (depConfirmed ? ' &#10003;' : '') + '</div><div class="stat-value">UGX ' + this.fmtInt(r.actualBanked) + '</div><div class="stat-sub">' + (selBank ? selBank.name : 'No bank selected') + (depConfirmed ? ' — Confirmed' : ' — Pending confirmation') + '</div></div>';
        }
        html += '</div>';

        // ── SECTION 1: Cash in Hand ──
        html += '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">Cash in Hand</div></div><div class="sa-section-body">';
        if (sd) {
            html += '<div class="sa-info-box" style="margin-bottom:12px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
                + 'Cash in Hand is the physical cash counted after shift. Shift expenses and pump shortages are already deducted from this amount.</div>';
            html += '<div class="sa-stats" style="margin-bottom:0;"><div class="sa-stat-card gold"><div class="stat-label">Cash in Hand</div><div class="stat-value">UGX ' + this.fmtInt(r.cashInHand) + '</div><div class="stat-sub">From daily shift entry</div></div></div>';
        } else {
            html += '<div class="sa-info-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
                + 'No shift data entered for this date. Cash in Hand = UGX 0</div>';
        }
        html += '</div></div>';

        // ── SECTION 2: Cash Receipts ──
        html += '<div class="sa-section"><div class="sa-section-header green"><div class="sa-section-title">(+) Cash Receipts from Customers</div></div><div class="sa-section-body">';

        // Auto-detected cash payments from credit customers
        if (r.autoCashReceipts.length > 0) {
            html += '<div style="margin-bottom:12px;"><div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--sa-text-dim);margin-bottom:8px;">Auto-detected from Credit Payments (Cash)</div>';
            html += '<div class="sa-table-wrap"><table class="sa-table"><thead><tr><th>Customer</th><th>Description</th><th class="text-right">Amount (UGX)</th></tr></thead><tbody>';
            r.autoCashReceipts.forEach(t => {
                const cust = this.data.customers.find(c => c.id === t.customer_id);
                html += '<tr><td>' + (cust ? cust.name : 'Unknown') + '</td><td>' + (t.description || '') + '</td>'
                    + '<td class="text-right mono" style="color:var(--sa-success);">' + this.fmtInt(this.parseNum(t.credit_amount)) + '</td></tr>';
            });
            html += '<tr class="total-row"><td colspan="2" class="text-bold">Auto-detected Total</td>'
                + '<td class="text-right mono text-bold" style="color:var(--sa-success);">' + this.fmtInt(r.autoCashReceiptsTotal) + '</td></tr>';
            html += '</tbody></table></div></div>';
        }

        // Manual cash receipts with customer selector
        const branchCustomers = this.data.customers.filter(c => c.branch_id === bid && c.is_active !== false);
        html += '<div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--sa-text-dim);margin-bottom:8px;">Other Cash Receipts (Manual)</div>';
        r.manualReceipts.forEach((mr, i) => {
            let custOpts = '<option value="">-- Select Customer --</option>';
            branchCustomers.forEach(c => {
                custOpts += '<option value="' + c.id + '"' + (mr.customer_id === c.id ? ' selected' : '') + '>' + c.name + '</option>';
            });
            html += '<div class="sa-dynamic-row">'
                + '<select class="sa-input sa-input-sm" onchange="SA._stageCTBReceipt(\'' + mr._id + '\',\'customer_id\',this.value)" style="flex:1.5;">' + custOpts + '</select>'
                + '<input class="sa-input sa-input-sm" placeholder="Description" value="' + (mr.description || '') + '" onchange="SA._stageCTBReceipt(\'' + mr._id + '\',\'description\',this.value)" style="flex:2;">'
                + '<input class="sa-input sa-input-sm mono" placeholder="Amount" value="' + (mr.amount || '') + '" onchange="SA._stageCTBReceipt(\'' + mr._id + '\',\'amount\',this.value)" style="text-align:right;flex:1;">'
                + '<button class="sa-remove-btn" onclick="SA.removeCTBReceipt(\'' + mr._id + '\')">&times;</button></div>';
        });
        html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.addCTBReceipt()">+ Add Cash Receipt</button>'
            + (r.manualReceipts.length > 0 ? '<button class="sa-btn sa-btn-primary sa-btn-sm" onclick="SA._commitCTBReceipts()" style="padding:8px 20px;font-weight:700;gap:4px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Update</button>' : '')
            + '</div>';
        html += '<div class="sa-shortage-total"><span class="total-label">TOTAL CASH RECEIPTS</span><span class="total-value" style="color:var(--sa-success);">UGX ' + this.fmtInt(r.totalCashReceipts) + '</span></div>';
        html += '</div></div>';

        // ── SECTION 3: Cash Expenses ──
        html += '<div class="sa-section"><div class="sa-section-header red"><div class="sa-section-title">(-) Cash Deductions</div></div><div class="sa-section-body">';

        // Show payments from Expenses & Payments page (auto-pulled)
        if (payments.length > 0) {
            html += '<div style="margin-bottom:12px;"><div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--sa-text-dim);margin-bottom:8px;">Auto-pulled from Expenses &amp; Payments</div>';
            html += '<div class="sa-table-wrap"><table class="sa-table"><thead><tr><th>Description</th><th>Customer</th><th>Method</th><th class="text-right">Amount (UGX)</th></tr></thead><tbody>';
            payments.forEach(p => {
                const cust = p.customer_id ? this.data.customers.find(c => c.id === p.customer_id) : null;
                html += '<tr><td>' + (p.description || '—') + '</td>'
                    + '<td>' + (cust ? cust.name : '—') + '</td>'
                    + '<td class="text-muted">' + (p.payment_method || 'Cash') + '</td>'
                    + '<td class="text-right mono" style="color:var(--sa-danger);">' + this.fmtInt(this.parseNum(p.amount)) + '</td></tr>';
            });
            html += '<tr class="total-row"><td colspan="3" class="text-bold">Payments Total</td>'
                + '<td class="text-right mono text-bold" style="color:var(--sa-danger);">' + this.fmtInt(r.totalCashPayments) + '</td></tr>';
            html += '</tbody></table></div></div>';
        }

        // Petty cash expenses (auto-pulled)
        if (r.pettyCashExpenses.length > 0) {
            html += '<div style="margin-bottom:12px;"><div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--sa-text-dim);margin-bottom:8px;">Auto-pulled from Petty Cash</div>';
            html += '<div class="sa-table-wrap"><table class="sa-table"><thead><tr><th>Description</th><th>Category</th><th class="text-right">Amount (UGX)</th></tr></thead><tbody>';
            r.pettyCashExpenses.forEach(e => {
                html += '<tr><td>' + (e.description || e.category || '—') + '</td>'
                    + '<td><span class="sa-badge sa-badge-warning">' + (e.category || '—') + '</span></td>'
                    + '<td class="text-right mono" style="color:var(--sa-danger);">' + this.fmtInt(this.parseNum(e.amount)) + '</td></tr>';
            });
            html += '<tr class="total-row"><td colspan="2" class="text-bold">Petty Cash Total</td>'
                + '<td class="text-right mono text-bold" style="color:var(--sa-danger);">' + this.fmtInt(r.totalPettyCash) + '</td></tr>';
            html += '</tbody></table></div></div>';
        }

        // Manual cash expenses
        html += '<div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--sa-text-dim);margin-bottom:8px;">Other Cash Expenses</div>';
        const ctbEmps = bid ? this.data.employees.filter(emp => emp.branch_id === bid && emp.is_active !== false) : this.data.employees.filter(emp => emp.is_active !== false);
        r.cashExpenses.forEach((e, i) => {
            const isSalaryType = (e.category === 'Salary Advance' || e.category === 'Salary Payment');
            let empOpts = '<option value="">-- Employee --</option>';
            ctbEmps.forEach(emp => { empOpts += '<option value="' + emp.id + '"' + (e.employee_id == emp.id ? ' selected' : '') + '>' + emp.name + '</option>'; });
            html += '<div class="sa-dynamic-row" style="flex-wrap:wrap;">'
                + '<select class="sa-input sa-input-sm" onchange="SA._stageCTBExpense(\'' + e._id + '\',\'category\',this.value);SA._ctbRefreshExpenseRow(\'' + e._id + '\',this.value)" style="flex:1;">'
                + '<option value="Petty Cash"' + (e.category === 'Petty Cash' ? ' selected' : '') + '>Petty Cash</option>'
                + '<option value="Salary Advance"' + (e.category === 'Salary Advance' ? ' selected' : '') + '>Salary Advance</option>'
                + '<option value="Salary Payment"' + (e.category === 'Salary Payment' ? ' selected' : '') + '>Salary Payment</option>'
                + '<option value="Cash to Bank"' + (e.category === 'Cash to Bank' ? ' selected' : '') + '>Cash to Bank</option>'
                + '<option value="Other"' + (e.category === 'Other' ? ' selected' : '') + '>Other</option>'
                + '</select>'
                + '<input class="sa-input sa-input-sm" placeholder="Description (e.g. Transport)" value="' + (e.description || '') + '" onchange="SA._stageCTBExpense(\'' + e._id + '\',\'description\',this.value)" style="flex:2;">'
                + '<input class="sa-input sa-input-sm mono" placeholder="Amount" value="' + (e.amount || '') + '" onchange="SA._stageCTBExpense(\'' + e._id + '\',\'amount\',this.value)" style="text-align:right;flex:1;">'
                + '<button class="sa-remove-btn" onclick="SA.removeCTBExpense(\'' + e._id + '\')">&times;</button>'
                + '</div>';
            if (isSalaryType) {
                html += '<div class="sa-dynamic-row" style="margin-top:-4px;padding-left:4px;">'
                    + '<select class="sa-input sa-input-sm" onchange="SA._stageCTBExpense(\'' + e._id + '\',\'employee_id\',this.value)" style="flex:1;">' + empOpts + '</select>'
                    + '<span style="flex:2;font-size:0.72rem;color:var(--sa-text-dim);padding-left:8px;">Link to employee for payroll deduction</span>'
                    + '</div>';
            }
        });
        html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.addCTBExpense()">+ Add Cash Expense</button>'
            + (r.cashExpenses.length > 0 ? '<button class="sa-btn sa-btn-primary sa-btn-sm" onclick="SA._commitCTBExpenses()" style="padding:8px 20px;font-weight:700;gap:4px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Update</button>' : '')
            + '</div>';
        html += '<div class="sa-shortage-total"><span class="total-label">TOTAL DEDUCTIONS</span><span class="total-value" style="color:var(--sa-danger);">UGX ' + this.fmtInt(r.totalDeductions) + '</span></div>';
        const dedParts = [];
        if (r.totalCashPayments > 0) dedParts.push('Payments: ' + this.fmtInt(r.totalCashPayments));
        if (r.totalPettyCash > 0) dedParts.push('Petty Cash: ' + this.fmtInt(r.totalPettyCash));
        if (r.totalCTBExpenses > 0) dedParts.push('Other: ' + this.fmtInt(r.totalCTBExpenses));
        if (dedParts.length > 1) {
            html += '<div style="font-size:0.72rem;color:var(--sa-text-dim);margin-top:4px;">' + dedParts.join(' + ') + '</div>';
        }
        html += '</div></div>';

        // ── SECTION 4: Summary & Banking ──
        html += '<div class="sa-section"><div class="sa-section-header ' + (r.isFlagged ? 'red' : 'gold') + '"><div class="sa-section-title">Cash to Bank Summary</div></div><div class="sa-section-body">';
        html += '<div class="sa-ctb-summary">';

        // Breakdown
        html += '<div class="sa-ctb-breakdown">';
        html += '<div class="sa-ctb-line"><span>Cash in Hand</span><span class="mono">' + this.fmtInt(r.cashInHand) + '</span></div>';
        html += '<div class="sa-ctb-line add"><span>(+) Cash Receipts</span><span class="mono">' + this.fmtInt(r.totalCashReceipts) + '</span></div>';
        html += '<div class="sa-ctb-line sub"><span>(-) Payments (E&amp;P)</span><span class="mono">(' + this.fmtInt(r.totalCashPayments) + ')</span></div>';
        html += '<div class="sa-ctb-line sub"><span>(-) Petty Cash</span><span class="mono">(' + this.fmtInt(r.totalPettyCash) + ')</span></div>';
        html += '<div class="sa-ctb-line sub"><span>(-) Cash Expenses</span><span class="mono">(' + this.fmtInt(r.totalCTBExpenses) + ')</span></div>';
        html += '<div class="sa-ctb-divider"></div>';
        html += '<div class="sa-ctb-line expected"><span>EXPECTED CASH TO BANK</span><span class="mono">' + this.fmtInt(r.expectedCash) + '</span></div>';
        html += '</div>';

        // Actual amount + bank selector (staged — not saved until user clicks Save)
        this.initBanks();
        const activeBanks = this.data.banks.filter(b => b.is_active);
        const isSaved = r.actualBanked !== null && r.bankId;
        const isConfirmed = r.ctb.deposit_confirmed === true;
        html += '<div class="sa-ctb-actual">';
        html += '<label style="font-size:0.78rem;font-weight:600;color:var(--sa-text-secondary);margin-bottom:6px;display:block;">Deposit to Bank</label>';
        let bankOpts = '<option value="">-- Select Bank --</option>';
        activeBanks.forEach(b => {
            bankOpts += '<option value="' + b.id + '"' + (r.bankId === b.id ? ' selected' : '') + '>' + b.name + '</option>';
        });
        html += '<select class="sa-input" id="ctbBankSelect" style="margin-bottom:10px;text-align:center;" onchange="SA._ctbStagedBank=this.value">' + bankOpts + '</select>';
        html += '<label style="font-size:0.78rem;font-weight:600;color:var(--sa-text-secondary);margin-bottom:6px;display:block;">Amount Deposited</label>';
        html += '<input class="sa-input mono sa-ctb-actual-input" id="ctbAmountInput" type="text" placeholder="Enter amount..." value="' + (r.ctb.actualBanked !== null ? r.ctb.actualBanked : '') + '" '
            + 'style="font-size:1.3rem;text-align:center;font-weight:700;">';
        html += '<label style="font-size:0.78rem;font-weight:600;color:var(--sa-text-secondary);margin-bottom:6px;margin-top:10px;display:block;">Bank Slip / Reference No.</label>';
        html += '<input class="sa-input" id="ctbSlipNo" type="text" placeholder="e.g. DEP-20250222-001" value="' + (r.ctb.bank_slip_no || '') + '" '
            + 'style="text-align:center;">';
        // Save button
        html += '<button class="sa-btn sa-btn-primary" style="width:100%;margin-top:12px;padding:12px;font-size:1rem;font-weight:700;" onclick="SA.saveCTBDeposit()">'
            + (isSaved ? '&#10003; Update Deposit' : '&#128176; Save &amp; Record Deposit') + '</button>';
        if (isSaved) {
            const selBank = this.data.banks.find(b => b.id === r.bankId);
            html += '<div style="font-size:0.72rem;color:var(--sa-success);margin-top:6px;text-align:center;">&#10003; Saved &mdash; Deposited to: <strong>' + (selBank ? selBank.name : '—') + '</strong>'
                + (r.ctb.bank_slip_no ? ' &mdash; Slip: ' + r.ctb.bank_slip_no : '') + '</div>';

            // Confirmation section
            if (isConfirmed) {
                html += '<div style="margin-top:10px;padding:10px;background:rgba(76,175,80,0.1);border:1px solid rgba(76,175,80,0.3);border-radius:8px;text-align:center;">'
                    + '<div style="color:var(--sa-success);font-weight:700;font-size:0.85rem;">&#10003; DEPOSIT CONFIRMED</div>'
                    + '<div style="font-size:0.72rem;color:var(--sa-text-dim);margin-top:4px;">Confirmed by: <strong>' + (r.ctb.confirmed_by || '—') + '</strong> on ' + (r.ctb.confirmed_at ? this.formatDate(r.ctb.confirmed_at.substring(0,10)) : '—') + '</div>'
                    + '<div style="font-size:0.72rem;color:var(--sa-text-dim);">Confirmed amount: <strong class="mono">UGX ' + this.fmtInt(this.parseNum(r.ctb.confirmed_amount)) + '</strong></div>'
                    + (r.ctb.confirmation_notes ? '<div style="font-size:0.72rem;color:var(--sa-text-dim);margin-top:2px;">Notes: ' + r.ctb.confirmation_notes + '</div>' : '')
                    + '<button class="sa-btn sa-btn-secondary sa-btn-sm" style="margin-top:8px;" onclick="SA.undoDepositConfirmation()">Undo Confirmation</button>'
                    + '</div>';
            } else {
                html += '<div style="margin-top:10px;padding:10px;background:rgba(255,193,7,0.1);border:1px solid rgba(255,193,7,0.3);border-radius:8px;">'
                    + '<div style="font-size:0.78rem;font-weight:600;color:var(--sa-warning);margin-bottom:8px;text-align:center;">Awaiting Bank Confirmation</div>'
                    + '<label style="font-size:0.72rem;color:var(--sa-text-dim);display:block;margin-bottom:4px;">Confirmed Amount from Bank Slip</label>'
                    + '<input class="sa-input mono" id="ctbConfirmAmount" type="text" placeholder="Amount on bank slip" value="' + (r.ctb.actualBanked || '') + '" style="text-align:center;margin-bottom:8px;">'
                    + '<label style="font-size:0.72rem;color:var(--sa-text-dim);display:block;margin-bottom:4px;">Notes (optional)</label>'
                    + '<input class="sa-input" id="ctbConfirmNotes" type="text" placeholder="e.g. Bank receipt verified" style="text-align:center;margin-bottom:8px;">'
                    + '<button class="sa-btn sa-btn-primary sa-btn-sm" style="width:100%;font-weight:700;" onclick="SA.confirmDeposit()">&#10003; Confirm Bank Deposit</button>'
                    + '</div>';
            }
        } else {
            html += '<div style="font-size:0.72rem;color:var(--sa-text-dim);margin-top:6px;text-align:center;">Select a bank and enter amount, then click Save to record the deposit.</div>';
        }
        html += '</div>';

        // Variance
        if (r.actualBanked !== null) {
            const vColor = r.isFlagged ? 'var(--sa-danger)' : 'var(--sa-success)';
            const vLabel = r.variance > 0 ? 'Shortage (Less banked than expected)' : (r.variance < 0 ? 'Excess (More banked than expected)' : 'Balanced');
            html += '<div class="sa-ctb-variance' + (r.isFlagged ? ' flagged' : '') + '">';
            html += '<div class="sa-ctb-variance-label">VARIANCE</div>';
            html += '<div class="sa-ctb-variance-amount mono" style="color:' + vColor + ';">UGX ' + this.fmtInt(r.variance) + '</div>';
            html += '<div class="sa-ctb-variance-status">' + vLabel + '</div>';
            if (r.isFlagged) {
                html += '<div class="sa-ctb-flag">&#9888; FLAGGED &mdash; Variance exceeds UGX 15,000 threshold</div>';
            }
            html += '</div>';
        }

        html += '</div></div></div>';

        // ── SECTION 5: Monthly Banking History ──
        html += '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">Monthly Banking History &mdash; ' + this.monthLabel() + '</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Date</th><th class="text-right">Cash In</th><th class="text-right">Banked</th><th>Bank</th><th>Slip No.</th><th class="text-right">Running Balance</th><th class="text-right">Variance</th><th>Status</th></tr></thead><tbody>';
        let monthExpectedTotal = 0, monthActualTotal = 0, monthVarianceTotal = 0, reconciledDays = 0;
        let runningCashBalance = 0;
        for (let d = 1; d <= this.DAYS_IN_MONTH; d++) {
            const dds = this.dateStr(d);
            const dkey = this.bk(bid, dds);
            if (!this.data.shiftDates[dkey]) continue;
            const dc = this.calcCashToBank(bid, dds);

            // Running balance: accumulates expected cash, reduces by actual banked
            runningCashBalance += dc.expectedCash;
            if (dc.actualBanked !== null) runningCashBalance -= dc.actualBanked;

            monthExpectedTotal += dc.expectedCash;
            if (dc.actualBanked !== null) { monthActualTotal += dc.actualBanked; monthVarianceTotal += dc.variance; reconciledDays++; }

            // Bank name
            const bankName = dc.bankId ? (this.data.banks.find(b => b.id === dc.bankId) || {}).name || '—' : '';

            const rowCls = dds === ds ? ' style="background:var(--sa-bg-card-hover);"' : '';
            const balColor = runningCashBalance > 0 ? (runningCashBalance > 100000 ? 'text-warning text-bold' : '') : 'text-success';
            const dcSlip = dc.ctb.bank_slip_no || '';
            const dcConfirmed = dc.ctb.deposit_confirmed === true;
            html += '<tr' + rowCls + ' class="clickable" onclick="SA.currentDate=\'' + dds + '\';SA.navigate(\'cash_to_bank\')">'
                + '<td>' + this.formatDate(dds) + '</td>'
                + '<td class="text-right mono">' + this.fmtInt(dc.expectedCash) + '</td>'
                + '<td class="text-right mono">' + (dc.actualBanked !== null ? this.fmtInt(dc.actualBanked) : '<span class="text-muted">—</span>') + '</td>'
                + '<td class="text-muted" style="font-size:0.75rem;">' + bankName + '</td>'
                + '<td class="text-muted" style="font-size:0.72rem;">' + dcSlip + '</td>'
                + '<td class="text-right mono ' + balColor + '">' + this.fmtInt(runningCashBalance) + '</td>'
                + '<td class="text-right mono ' + (dc.isFlagged ? 'text-danger text-bold' : (dc.variance !== null ? (dc.variance === 0 ? 'text-success' : 'text-warning') : '')) + '">'
                + (dc.variance !== null ? this.fmtInt(dc.variance) : '—') + '</td>'
                + '<td>';
            if (dc.actualBanked === null) {
                html += '<span class="sa-badge sa-badge-warning">Pending</span>';
            } else if (dc.isFlagged) {
                html += '<span class="sa-badge sa-badge-danger">Flagged</span>';
            } else if (dcConfirmed) {
                html += '<span class="sa-badge sa-badge-success">Confirmed</span>';
            } else {
                html += '<span class="sa-badge sa-badge-info">Unconfirmed</span>';
            }
            html += '</td></tr>';
        }
        html += '<tr class="total-row">'
            + '<td class="text-bold">TOTAL (' + reconciledDays + ' days)</td>'
            + '<td class="text-right mono text-bold">' + this.fmtInt(monthExpectedTotal) + '</td>'
            + '<td class="text-right mono text-bold">' + this.fmtInt(monthActualTotal) + '</td>'
            + '<td></td><td></td>'
            + '<td class="text-right mono text-bold ' + (runningCashBalance > 0 ? 'text-warning' : 'text-success') + '">' + this.fmtInt(runningCashBalance) + '</td>'
            + '<td class="text-right mono text-bold ' + (Math.abs(monthVarianceTotal) > 15000 ? 'text-danger' : 'text-success') + '">' + this.fmtInt(monthVarianceTotal) + '</td>'
            + '<td></td></tr>';
        html += '</tbody></table></div></div></div>';

        // Print button
        html += '<div style="text-align:right;margin-top:12px;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.printCashToBank()">&#128424; Print Cash to Bank</button></div>';

        el.innerHTML = html;
    },

    // Cash to Bank: CRUD helpers
    addCTBReceipt() {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        if (!this.data.cashToBank[key]) this.data.cashToBank[key] = { cashReceipts: [], cashExpenses: [], actualBanked: null };
        const existing = this.data.cashToBank[key].cashReceipts;
        if (existing.length > 0) {
            const last = existing[existing.length - 1];
            if (this.parseNum(last.amount) === 0) {
                this.toast('Please fill in the last receipt before adding a new one', 'warning');
                return;
            }
        }
        var stamp = this._auditStamp();
        this.data.cashToBank[key].cashReceipts.push({
            _id: this.uid(), customer_id: null, description: '', amount: 0,
            created_at: stamp.created_at, created_by: stamp.created_by,
            updated_at: stamp.updated_at, updated_by: stamp.updated_by
        });
        this.saveData();
        this.navigate('cash_to_bank');
    },
    _ctbRecPending: {},

    _stageCTBReceipt(id, field, value) {
        if (!this._ctbRecPending[id]) this._ctbRecPending[id] = {};
        this._ctbRecPending[id][field] = value;
    },

    _commitCTBReceipts() {
        var pending = this._ctbRecPending;
        var keys = Object.keys(pending);
        if (keys.length === 0) { this.toast('No changes to update', 'warning'); return; }

        // Validate
        for (var i = 0; i < keys.length; i++) {
            var fields = pending[keys[i]];
            if (fields.amount !== undefined && !this._validateAmount(fields.amount, 'Receipt amount')) return;
        }

        this._ctbRecPending = {};
        this._ctbRecCommitting = true;
        var self = this;
        keys.forEach(function(id) {
            var fields = pending[id];
            Object.keys(fields).forEach(function(field) {
                self.updateCTBReceipt(id, field, fields[field]);
            });
        });
        this._ctbRecCommitting = false;
        this.navigate('cash_to_bank');
        this.toast('Cash receipts updated', 'success');
    },

    updateCTBReceipt(id, field, value) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        const r = this._findById(this.data.cashToBank[key].cashReceipts, id);
        if (!r) return;
        if (field === 'customer_id') {
            this._trackChange(r, 'customer_id', value ? parseInt(value) : null);
            r.customer_id = value ? parseInt(value) : null;
            if (r.customer_id) {
                const cust = this.data.customers.find(c => c.id === r.customer_id);
                if (cust && !r.description) r.description = 'Cash payment from ' + cust.name;
            }
        } else if (field === 'amount') {
            var newAmt = this.parseNum(value);
            this._trackChange(r, field, newAmt);
            r[field] = newAmt;
        } else {
            this._trackChange(r, field, value);
            r[field] = value;
        }
        if (!r._id) r._id = this.uid();
        this._touchUpdated(r);
        this.saveData();
        if (!this._ctbRecCommitting) this.navigate('cash_to_bank');
    },
    removeCTBReceipt(id) {
        if (!confirm('Are you sure you want to delete this receipt?')) return;
        const key = this.bk(this.currentBranch.id, this.currentDate);
        var entry = this._findById(this.data.cashToBank[key].cashReceipts, id);
        if (entry) {
            this._softDelete(entry);
            this.saveData();
            this.navigate('cash_to_bank');
        }
    },
    addCTBExpense() {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        if (!this.data.cashToBank[key]) this.data.cashToBank[key] = { cashReceipts: [], cashExpenses: [], actualBanked: null };
        const existing = this.data.cashToBank[key].cashExpenses;
        if (existing.length > 0) {
            const last = existing[existing.length - 1];
            if (this.parseNum(last.amount) === 0) {
                this.toast('Please fill in the last expense before adding a new one', 'warning');
                return;
            }
        }
        var stamp = this._auditStamp();
        this.data.cashToBank[key].cashExpenses.push({
            _id: this.uid(), category: 'Petty Cash', description: '', amount: 0,
            created_at: stamp.created_at, created_by: stamp.created_by,
            updated_at: stamp.updated_at, updated_by: stamp.updated_by
        });
        this.saveData();
        this.navigate('cash_to_bank');
    },
    _ctbExpPending: {},

    _stageCTBExpense(id, field, value) {
        if (!this._ctbExpPending[id]) this._ctbExpPending[id] = {};
        this._ctbExpPending[id][field] = value;
    },

    // When category changes to/from Salary types, commit and re-render to show/hide employee selector
    _ctbRefreshExpenseRow(id, category) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        const e = this._findById(this.data.cashToBank[key].cashExpenses, id);
        if (e) {
            e.category = category;
            if (category !== 'Salary Advance' && category !== 'Salary Payment') {
                delete e.employee_id;
            }
            this.saveData();
        }
        this.navigate('cash_to_bank');
    },

    _commitCTBExpenses() {
        var pending = this._ctbExpPending;
        var keys = Object.keys(pending);
        if (keys.length === 0) { this.toast('No changes to update', 'warning'); return; }

        // Validate
        for (var i = 0; i < keys.length; i++) {
            var fields = pending[keys[i]];
            if (fields.amount !== undefined && !this._validateAmount(fields.amount, 'Cash expense amount')) return;
        }

        this._ctbExpPending = {};
        this._ctbExpCommitting = true;
        var self = this;
        keys.forEach(function(id) {
            var fields = pending[id];
            Object.keys(fields).forEach(function(field) {
                self.updateCTBExpense(id, field, fields[field]);
            });
        });
        this._ctbExpCommitting = false;
        this.navigate('cash_to_bank');
        this.toast('Cash expenses updated', 'success');
    },

    updateCTBExpense(id, field, value) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        const e = this._findById(this.data.cashToBank[key].cashExpenses, id);
        if (!e) return;
        var newVal = field === 'amount' ? this.parseNum(value) : value;
        this._trackChange(e, field, newVal);
        e[field] = newVal;
        if (!e._id) e._id = this.uid();
        this._touchUpdated(e);
        this.saveData();
        if (!this._ctbExpCommitting) this.navigate('cash_to_bank');
    },
    removeCTBExpense(id) {
        if (!confirm('Are you sure you want to delete this expense?')) return;
        const key = this.bk(this.currentBranch.id, this.currentDate);
        var entry = this._findById(this.data.cashToBank[key].cashExpenses, id);
        if (entry) {
            this._softDelete(entry);
            this.saveData();
            this.navigate('cash_to_bank');
        }
    },
    // Staged values for Cash to Bank (not yet saved)
    _ctbStagedBank: null,

    saveCTBDeposit() {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        if (!this.data.cashToBank[key]) this.data.cashToBank[key] = { cashReceipts: [], cashExpenses: [], actualBanked: null };

        // Read values from the form inputs
        const bankSelect = document.getElementById('ctbBankSelect');
        const amountInput = document.getElementById('ctbAmountInput');
        const bankId = bankSelect ? bankSelect.value : (this._ctbStagedBank || null);
        const amountVal = amountInput ? amountInput.value : '';

        // Validate
        if (!bankId) {
            this.toast('Please select a bank first', 'error');
            return;
        }
        if (amountVal === '' || isNaN(this.parseNum(amountVal)) || this.parseNum(amountVal) <= 0) {
            this.toast('Please enter a valid deposit amount', 'error');
            return;
        }

        // Read bank slip number
        const slipInput = document.getElementById('ctbSlipNo');
        const slipNo = slipInput ? slipInput.value.trim() : '';

        // Save to data
        this.data.cashToBank[key].bank_id = parseInt(bankId);
        this.data.cashToBank[key].actualBanked = this.parseNum(amountVal);
        this.data.cashToBank[key].bank_slip_no = slipNo;
        this.data.cashToBank[key].deposited_at = new Date().toISOString();
        var user = this.getCurrentUser ? this.getCurrentUser() : null;
        this.data.cashToBank[key].deposited_by = user ? (user.full_name || user.username) : 'System';
        this.saveData();

        // Now sync to bank account
        this._syncBankDeposit(key);

        this.toast('Deposit saved & recorded to bank account', 'success');
        this.navigate('cash_to_bank');
    },

    confirmDeposit() {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        const ctb = this.data.cashToBank[key];
        if (!ctb || ctb.actualBanked === null) {
            this.toast('No deposit to confirm — save a deposit first', 'error');
            return;
        }
        const amountInput = document.getElementById('ctbConfirmAmount');
        const notesInput = document.getElementById('ctbConfirmNotes');
        const confirmedAmount = amountInput ? this.parseNum(amountInput.value) : 0;
        const notes = notesInput ? notesInput.value.trim() : '';

        if (confirmedAmount <= 0) {
            this.toast('Please enter the confirmed amount from the bank slip', 'error');
            return;
        }

        var user = this.getCurrentUser ? this.getCurrentUser() : null;
        ctb.deposit_confirmed = true;
        ctb.confirmed_amount = confirmedAmount;
        ctb.confirmed_at = new Date().toISOString();
        ctb.confirmed_by = user ? (user.full_name || user.username) : 'System';
        ctb.confirmation_notes = notes;

        // Flag if confirmed amount differs from deposited amount
        if (Math.abs(confirmedAmount - this.parseNum(ctb.actualBanked)) > 0) {
            ctb.confirmation_variance = confirmedAmount - this.parseNum(ctb.actualBanked);
        } else {
            ctb.confirmation_variance = 0;
        }

        this.saveData();
        this.toast('Bank deposit confirmed', 'success');
        this.navigate('cash_to_bank');
    },

    undoDepositConfirmation() {
        if (!confirm('Are you sure you want to undo the bank deposit confirmation?')) return;
        const key = this.bk(this.currentBranch.id, this.currentDate);
        const ctb = this.data.cashToBank[key];
        if (!ctb) return;
        ctb.deposit_confirmed = false;
        ctb.confirmed_amount = null;
        ctb.confirmed_at = null;
        ctb.confirmed_by = null;
        ctb.confirmation_notes = null;
        ctb.confirmation_variance = null;
        this.saveData();
        this.toast('Deposit confirmation undone', 'info');
        this.navigate('cash_to_bank');
    },

    // Sync the bank deposit transaction when amount or bank changes
    _syncBankDeposit(key) {
        const ctb = this.data.cashToBank[key];
        if (!ctb) return;
        const refId = 'ctb_' + key;

        // Remove old auto-deposit from all banks for this date
        Object.keys(this.data.bankTransactions).forEach(bKey => {
            if (this.data.bankTransactions[bKey]) {
                this.data.bankTransactions[bKey] = this.data.bankTransactions[bKey].filter(t => t._ctb_ref !== refId);
            }
        });

        // Create new deposit if bank and amount are set
        if (ctb.bank_id && ctb.actualBanked !== null && ctb.actualBanked > 0) {
            const ds = key.split('_').slice(1).join('-'); // extract date from key "{bid}_{date}"
            const parts = key.split('_');
            const dateStr = parts.slice(1).join('_');
            const bKey = 'bank_' + ctb.bank_id + '_' + dateStr;
            if (!this.data.bankTransactions[bKey]) this.data.bankTransactions[bKey] = [];
            const branchName = this.currentBranch ? this.currentBranch.name : 'Branch';
            this.data.bankTransactions[bKey].push({
                description: 'Cash deposit from ' + branchName + ' — ' + this.formatDate(dateStr),
                deposit: this.parseNum(ctb.actualBanked),
                withdrawal: 0,
                _ctb_ref: refId,
                created_at: new Date().toISOString()
            });
        }
        this.saveData();
    },

    // Date navigation for Cash to Bank
    ctbPrevDay() {
        const d = this.dayOfMonth(this.currentDate);
        if (d > 1) { this.currentDate = this.dateStr(d - 1); this.navigate('cash_to_bank'); }
    },
    ctbNextDay() {
        const d = this.dayOfMonth(this.currentDate);
        if (d < this.DAYS_IN_MONTH) { this.currentDate = this.dateStr(d + 1); this.navigate('cash_to_bank'); }
    },

    // Print Cash to Bank
    printCashToBank() {
        const bid = this.currentBranch.id;
        const ds = this.currentDate;
        const r = this.calcCashToBank(bid, ds);

        let body = '<table style="width:100%;border-collapse:collapse;">';
        body += '<tr style="border-bottom:2px solid #333;"><th style="text-align:left;padding:6px;">Item</th><th style="text-align:right;padding:6px;">Amount (UGX)</th></tr>';
        body += '<tr style="font-weight:700;"><td style="padding:6px;">Cash in Hand</td><td style="text-align:right;padding:6px;">' + this.fmtInt(r.cashInHand) + '</td></tr>';
        body += '<tr><td style="padding:4px 6px;color:green;">(+) Cash Receipts</td><td style="text-align:right;padding:4px 6px;color:green;">' + this.fmtInt(r.totalCashReceipts) + '</td></tr>';
        body += '<tr><td style="padding:4px 6px;color:red;">(-) Payments (E&amp;P)</td><td style="text-align:right;padding:4px 6px;color:red;">(' + this.fmtInt(r.totalCashPayments) + ')</td></tr>';
        body += '<tr><td style="padding:4px 6px;color:red;">(-) Petty Cash</td><td style="text-align:right;padding:4px 6px;color:red;">(' + this.fmtInt(r.totalPettyCash) + ')</td></tr>';
        body += '<tr><td style="padding:4px 6px;color:red;">(-) Cash Expenses</td><td style="text-align:right;padding:4px 6px;color:red;">(' + this.fmtInt(r.totalCTBExpenses) + ')</td></tr>';
        body += '<tr style="border-top:2px solid #333;font-weight:800;font-size:1.1em;"><td style="padding:8px 6px;">EXPECTED CASH TO BANK</td><td style="text-align:right;padding:8px 6px;">UGX ' + this.fmtInt(r.expectedCash) + '</td></tr>';
        if (r.actualBanked !== null) {
            const bankName = r.bankId ? (this.data.banks.find(b => b.id === r.bankId) || {}).name || '—' : '—';
            body += '<tr style="font-weight:700;"><td style="padding:6px;">Deposited to: ' + bankName + '</td><td style="text-align:right;padding:6px;">UGX ' + this.fmtInt(r.actualBanked) + '</td></tr>';
            if (r.ctb.bank_slip_no) {
                body += '<tr><td style="padding:4px 6px;color:#666;">Bank Slip No: ' + r.ctb.bank_slip_no + '</td><td></td></tr>';
            }
            body += '<tr style="border-top:1px solid #999;font-weight:800;"><td style="padding:6px;">VARIANCE</td>'
                + '<td style="text-align:right;padding:6px;color:' + (Math.abs(r.variance) > 15000 ? 'red' : 'green') + ';">UGX ' + this.fmtInt(r.variance) + '</td></tr>';
            if (r.ctb.deposit_confirmed) {
                body += '<tr style="background:#e8f5e9;"><td style="padding:6px;font-weight:700;color:green;">CONFIRMED</td>'
                    + '<td style="text-align:right;padding:6px;">UGX ' + this.fmtInt(this.parseNum(r.ctb.confirmed_amount)) + '</td></tr>';
                body += '<tr><td style="padding:4px 6px;font-size:0.85em;color:#666;">Confirmed by: ' + (r.ctb.confirmed_by || '—') + '</td>'
                    + '<td style="text-align:right;padding:4px 6px;font-size:0.85em;color:#666;">' + (r.ctb.confirmed_at ? this.formatDate(r.ctb.confirmed_at.substring(0,10)) : '') + '</td></tr>';
            }
        }
        body += '</table>';

        const details = [
            ['Branch', this.currentBranch.name],
            ['Date', this.formatDate(ds)],
            ['Prepared by', this.currentUser ? this.currentUser.fullName : '—']
        ];
        const printHtml = this._receiptHTML('Cash to Bank Reconciliation', details, body);
        const w = window.open('', '_blank');
        w.document.write(printHtml);
        w.document.close();
        w.print();
    },

    // ============================================================
    // INTER-BRANCH TRANSFERS
    // ============================================================
    renderBranchTransfers(el) {
        const branches = this.data.branches || [];
        if (branches.length < 2) {
            el.innerHTML = '<div class="sa-empty"><h3>Inter-Branch Transfers</h3><p>You need at least 2 branches to use transfers. Add more branches first.</p></div>';
            return;
        }

        const transfers = this._activeRecords(this.data.branchTransfers || []);
        const TRANSFER_TYPES = ['Cash', 'Fuel (PMS)', 'Fuel (AGO)', 'Stock/Equipment', 'Other'];
        const STATUSES = ['Pending', 'In Transit', 'Received', 'Cancelled'];

        // Filter by current month
        const monthTransfers = transfers.filter(t => {
            if (!t.transfer_date) return false;
            var td = t.transfer_date;
            return td >= this.monthStart() && td <= this.monthEnd();
        });

        let html = '<div class="sa-page-header"><h1>Inter-Branch Transfers &mdash; ' + this.monthLabel() + '</h1>'
            + '<div class="sa-page-actions"><button class="sa-btn sa-btn-primary" onclick="SA.showAddTransferModal()">+ New Transfer</button></div></div>';

        // Summary stats
        const totalCash = monthTransfers.filter(t => t.transfer_type === 'Cash' && t.status !== 'Cancelled').reduce((s, t) => s + this.parseNum(t.amount), 0);
        const pendingCount = monthTransfers.filter(t => t.status === 'Pending' || t.status === 'In Transit').length;
        const completedCount = monthTransfers.filter(t => t.status === 'Received').length;
        html += '<div class="sa-stats">';
        html += '<div class="sa-stat-card gold"><div class="stat-label">Cash Transferred</div><div class="stat-value">UGX ' + this.fmtInt(totalCash) + '</div><div class="stat-sub">This month</div></div>';
        html += '<div class="sa-stat-card warning"><div class="stat-label">Pending / In Transit</div><div class="stat-value">' + pendingCount + '</div><div class="stat-sub">Awaiting receipt</div></div>';
        html += '<div class="sa-stat-card success"><div class="stat-label">Completed</div><div class="stat-value">' + completedCount + '</div><div class="stat-sub">Received this month</div></div>';
        html += '</div>';

        // Transfers table
        html += '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">Transfer Records</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Date</th><th>From</th><th>To</th><th>Type</th><th>Description</th><th class="text-right">Amount/Qty</th><th>Status</th><th>Actions</th></tr></thead><tbody>';

        if (monthTransfers.length === 0) {
            html += '<tr><td colspan="8" class="text-center text-muted" style="padding:24px;">No transfers recorded this month</td></tr>';
        } else {
            var self = this;
            monthTransfers.sort(function(a, b) { return (b.transfer_date || '').localeCompare(a.transfer_date || ''); });
            monthTransfers.forEach(function(t) {
                var fromBranch = branches.find(function(b) { return b.id === t.from_branch_id; });
                var toBranch = branches.find(function(b) { return b.id === t.to_branch_id; });
                var statusCls = t.status === 'Received' ? 'sa-badge-success' : (t.status === 'Cancelled' ? 'sa-badge-danger' : (t.status === 'In Transit' ? 'sa-badge-info' : 'sa-badge-warning'));
                html += '<tr>'
                    + '<td>' + self.formatDate(t.transfer_date) + '</td>'
                    + '<td>' + (fromBranch ? fromBranch.name : '—') + '</td>'
                    + '<td>' + (toBranch ? toBranch.name : '—') + '</td>'
                    + '<td><span class="sa-badge">' + (t.transfer_type || '—') + '</span></td>'
                    + '<td>' + (t.description || '—') + '</td>'
                    + '<td class="text-right mono">' + (t.transfer_type === 'Cash' ? 'UGX ' + self.fmtInt(self.parseNum(t.amount)) : (t.quantity ? t.quantity + ' L' : self.fmtInt(self.parseNum(t.amount)))) + '</td>'
                    + '<td><span class="sa-badge ' + statusCls + '">' + t.status + '</span></td>'
                    + '<td style="white-space:nowrap;">';
                if (t.status === 'Pending' || t.status === 'In Transit') {
                    html += '<button class="sa-btn sa-btn-primary sa-btn-sm" onclick="SA.receiveTransfer(\'' + t._id + '\')">Receive</button> ';
                    html += '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.cancelTransfer(\'' + t._id + '\')">Cancel</button>';
                } else if (t.status === 'Received') {
                    html += '<span style="font-size:0.72rem;color:var(--sa-text-dim);">Received by ' + (t.received_by || '—') + '</span>';
                }
                html += '</td></tr>';
            });
        }
        html += '</tbody></table></div></div></div>';

        // Modal for adding new transfer (hidden by default)
        html += '<div id="transferModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;display:none;align-items:center;justify-content:center;">'
            + '<div style="background:var(--sa-bg-card);border-radius:12px;padding:24px;max-width:500px;width:90%;max-height:90vh;overflow-y:auto;">'
            + '<h3 style="margin:0 0 16px 0;">New Inter-Branch Transfer</h3>';

        // From branch
        html += '<label style="font-size:0.78rem;font-weight:600;color:var(--sa-text-secondary);display:block;margin-bottom:4px;">From Branch</label>';
        html += '<select class="sa-input" id="tfFromBranch" style="margin-bottom:12px;">';
        html += '<option value="">-- Select Source --</option>';
        branches.forEach(function(b) { html += '<option value="' + b.id + '">' + b.name + '</option>'; });
        html += '</select>';

        // To branch
        html += '<label style="font-size:0.78rem;font-weight:600;color:var(--sa-text-secondary);display:block;margin-bottom:4px;">To Branch</label>';
        html += '<select class="sa-input" id="tfToBranch" style="margin-bottom:12px;">';
        html += '<option value="">-- Select Destination --</option>';
        branches.forEach(function(b) { html += '<option value="' + b.id + '">' + b.name + '</option>'; });
        html += '</select>';

        // Transfer type
        html += '<label style="font-size:0.78rem;font-weight:600;color:var(--sa-text-secondary);display:block;margin-bottom:4px;">Transfer Type</label>';
        html += '<select class="sa-input" id="tfType" style="margin-bottom:12px;" onchange="SA._toggleTransferFields()">';
        TRANSFER_TYPES.forEach(function(type) { html += '<option value="' + type + '">' + type + '</option>'; });
        html += '</select>';

        // Date
        html += '<label style="font-size:0.78rem;font-weight:600;color:var(--sa-text-secondary);display:block;margin-bottom:4px;">Transfer Date</label>';
        html += '<input class="sa-input" id="tfDate" type="date" value="' + this.todayStr() + '" style="margin-bottom:12px;">';

        // Amount (for cash)
        html += '<div id="tfAmountWrap"><label style="font-size:0.78rem;font-weight:600;color:var(--sa-text-secondary);display:block;margin-bottom:4px;">Amount (UGX)</label>';
        html += '<input class="sa-input mono" id="tfAmount" type="text" placeholder="Enter cash amount" style="margin-bottom:12px;"></div>';

        // Quantity (for fuel)
        html += '<div id="tfQtyWrap" style="display:none;"><label style="font-size:0.78rem;font-weight:600;color:var(--sa-text-secondary);display:block;margin-bottom:4px;">Quantity (Litres)</label>';
        html += '<input class="sa-input mono" id="tfQty" type="text" placeholder="Enter litres" style="margin-bottom:12px;"></div>';

        // Description
        html += '<label style="font-size:0.78rem;font-weight:600;color:var(--sa-text-secondary);display:block;margin-bottom:4px;">Description / Notes</label>';
        html += '<input class="sa-input" id="tfDesc" type="text" placeholder="e.g. Cash for daily operations" style="margin-bottom:16px;">';

        // Buttons
        html += '<div style="display:flex;gap:8px;">'
            + '<button class="sa-btn sa-btn-primary" style="flex:1;padding:12px;font-weight:700;" onclick="SA.saveTransfer()">Save Transfer</button>'
            + '<button class="sa-btn sa-btn-secondary" style="flex:1;padding:12px;" onclick="SA.closeTransferModal()">Cancel</button>'
            + '</div>';

        html += '</div></div>';

        el.innerHTML = html;
    },

    _toggleTransferFields() {
        var type = document.getElementById('tfType').value;
        var amountWrap = document.getElementById('tfAmountWrap');
        var qtyWrap = document.getElementById('tfQtyWrap');
        if (type === 'Fuel (PMS)' || type === 'Fuel (AGO)') {
            if (amountWrap) amountWrap.style.display = 'none';
            if (qtyWrap) qtyWrap.style.display = 'block';
        } else {
            if (amountWrap) amountWrap.style.display = 'block';
            if (qtyWrap) qtyWrap.style.display = 'none';
        }
    },

    showAddTransferModal() {
        var modal = document.getElementById('transferModal');
        if (modal) modal.style.display = 'flex';
    },

    closeTransferModal() {
        var modal = document.getElementById('transferModal');
        if (modal) modal.style.display = 'none';
    },

    saveTransfer() {
        var fromId = document.getElementById('tfFromBranch').value;
        var toId = document.getElementById('tfToBranch').value;
        var type = document.getElementById('tfType').value;
        var date = document.getElementById('tfDate').value;
        var amount = document.getElementById('tfAmount').value;
        var qty = document.getElementById('tfQty').value;
        var desc = document.getElementById('tfDesc').value;

        if (!fromId) { this.toast('Please select the source branch', 'error'); return; }
        if (!toId) { this.toast('Please select the destination branch', 'error'); return; }
        if (fromId === toId) { this.toast('Source and destination branches must be different', 'error'); return; }
        if (!date) { this.toast('Please select a transfer date', 'error'); return; }

        var isFuel = type === 'Fuel (PMS)' || type === 'Fuel (AGO)';
        if (isFuel) {
            if (!qty || this.parseNum(qty) <= 0) { this.toast('Please enter a valid quantity', 'error'); return; }
        } else {
            if (!amount || this.parseNum(amount) <= 0) { this.toast('Please enter a valid amount', 'error'); return; }
        }

        var stamp = this._auditStamp();
        var transfer = {
            _id: this.uid(),
            from_branch_id: parseInt(fromId),
            to_branch_id: parseInt(toId),
            transfer_type: type,
            transfer_date: date,
            amount: isFuel ? 0 : this.parseNum(amount),
            quantity: isFuel ? this.parseNum(qty) : null,
            description: desc.trim(),
            status: 'Pending',
            created_at: stamp.created_at,
            created_by: stamp.created_by,
            updated_at: stamp.updated_at,
            updated_by: stamp.updated_by
        };

        this.data.branchTransfers.push(transfer);
        this.saveData();
        this.closeTransferModal();
        this.toast('Transfer recorded', 'success');
        this.navigate('branch_transfers');
    },

    receiveTransfer(id) {
        var transfer = this._findById(this.data.branchTransfers, id);
        if (!transfer) { this.toast('Transfer not found', 'error'); return; }
        if (transfer.status !== 'Pending' && transfer.status !== 'In Transit') {
            this.toast('This transfer cannot be received in its current state', 'warning');
            return;
        }
        if (!confirm('Confirm receipt of this transfer?')) return;

        var user = this.getCurrentUser ? this.getCurrentUser() : null;
        this._trackChange(transfer, 'status', 'Received');
        transfer.status = 'Received';
        transfer.received_at = new Date().toISOString();
        transfer.received_by = user ? (user.full_name || user.username) : 'System';
        this._touchUpdated(transfer);
        this.saveData();
        this.toast('Transfer marked as received', 'success');
        this.navigate('branch_transfers');
    },

    cancelTransfer(id) {
        var transfer = this._findById(this.data.branchTransfers, id);
        if (!transfer) { this.toast('Transfer not found', 'error'); return; }
        if (!confirm('Are you sure you want to cancel this transfer?')) return;

        var user = this.getCurrentUser ? this.getCurrentUser() : null;
        this._trackChange(transfer, 'status', 'Cancelled');
        transfer.status = 'Cancelled';
        transfer.cancelled_at = new Date().toISOString();
        transfer.cancelled_by = user ? (user.full_name || user.username) : 'System';
        this._touchUpdated(transfer);
        this.saveData();
        this.toast('Transfer cancelled', 'info');
        this.navigate('branch_transfers');
    },

    // ============================================================
    // THEME TOGGLE (Dark / Light)
    // ============================================================
    toggleTheme() {
        const html = document.documentElement;
        const current = html.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', next);
        localStorage.setItem('sa_theme', next);
        const btn = document.getElementById('themeToggle');
        if (btn) btn.innerHTML = next === 'light' ? '&#9728;' : '&#9790;';
    },

    initTheme() {
        const saved = localStorage.getItem('sa_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
        const btn = document.getElementById('themeToggle');
        if (btn) btn.innerHTML = saved === 'light' ? '&#9728;' : '&#9790;';
    },

    // ============================================================
    // MOBILE SIDEBAR TOGGLE
    // ============================================================
    toggleSidebar() {
        const sb = document.getElementById('sidebar');
        const ov = document.getElementById('sidebarOverlay');
        sb.classList.toggle('open');
        ov.classList.toggle('open');
    },

    closeSidebar() {
        const sb = document.getElementById('sidebar');
        const ov = document.getElementById('sidebarOverlay');
        sb.classList.remove('open');
        ov.classList.remove('open');
    },

    // ============================================================
    // GLOBAL SEARCH
    // ============================================================
    onSearch(query) {
        const results = document.getElementById('searchResults');
        if (!query || query.length < 2) { results.classList.remove('open'); results.innerHTML = ''; return; }
        const q = query.toLowerCase();
        let items = [];

        // Search customers
        this.data.customers.forEach(c => {
            if (c.name && c.name.toLowerCase().includes(q)) {
                const bal = this.getCustomerBalance(c.id);
                items.push({ type: 'Customer', title: c.name, sub: 'Balance: UGX ' + this.fmtInt(bal), action: 'SA.viewStatement(\'' + c.id + '\')' });
            }
        });

        // Search employees
        this.data.employees.forEach(e => {
            if (e.name && e.name.toLowerCase().includes(q)) {
                items.push({ type: 'Employee', title: e.name, sub: (e.position || '') + ' | ' + (e.phone || ''), action: 'SA.navigate(\'employees\')' });
            }
        });

        // Search branches
        this.data.branches.forEach(b => {
            if (b.name.toLowerCase().includes(q) || (b.branch_code && b.branch_code.toLowerCase().includes(q))) {
                items.push({ type: 'Branch', title: b.name, sub: b.branch_code + ' — ' + (b.location || ''), action: 'SA.selectBranch(\'' + b.id + '\')' });
            }
        });

        // Search dates (e.g. "feb 15" or "2026-02-15")
        if (/\d/.test(q)) {
            for (let d = 1; d <= this.DAYS_IN_MONTH; d++) {
                const ds = this.dateStr(d);
                const formatted = this.formatDate(ds).toLowerCase();
                if (ds.includes(q) || formatted.includes(q)) {
                    const bid = this.currentBranch ? this.currentBranch.id : null;
                    const hasData = bid ? !!this.data.shiftDates[this.bk(bid, ds)] : false;
                    items.push({ type: 'Date', title: this.formatDate(ds), sub: hasData ? 'Has shift data' : 'No data', action: 'SA.goToDate(\'' + ds + '\',\'shift_entry\')' });
                    if (items.length > 12) break;
                }
            }
        }

        // Search banks
        if (this.data.banks) {
            this.data.banks.forEach(b => {
                if (b.name && b.name.toLowerCase().includes(q)) {
                    items.push({ type: 'Bank', title: b.name, sub: b.code || '', action: 'SA.navigate(\'bank_statements\')' });
                }
            });
        }

        // Search navigation pages
        const navPages = [
            { name: 'Cash to Bank', keywords: ['cash', 'bank', 'banking', 'reconcil'], view: 'cash_to_bank', sub: 'Daily cash reconciliation' },
            { name: 'Dashboard', keywords: ['dashboard', 'home', 'overview'], view: 'dashboard', sub: 'Branch overview' },
            { name: 'Payroll', keywords: ['payroll', 'salary', 'wages'], view: 'payroll', sub: 'Staff payroll management' },
            { name: 'Leave Management', keywords: ['leave', 'holiday', 'absence'], view: 'leave', sub: 'Staff leave tracking' },
            { name: 'Branch Transfers', keywords: ['transfer', 'inter-branch', 'move', 'cash transfer', 'stock transfer'], view: 'branch_transfers', sub: 'Inter-branch cash & stock transfers' },
            { name: 'Goods Issue', keywords: ['goods', 'issue', 'truck', 'motorbike', 'vehicle', 'number plate', 'fuel issue'], view: 'goods_issues', sub: 'Fuel issued to station vehicles' },
        ];
        navPages.forEach(p => {
            if (p.name.toLowerCase().includes(q) || p.keywords.some(k => k.includes(q))) {
                items.push({ type: 'Page', title: p.name, sub: p.sub, action: 'SA.navigate(\'' + p.view + '\')' });
            }
        });

        // Limit results
        items = items.slice(0, 10);

        if (items.length === 0) {
            results.innerHTML = '<div class="sa-search-empty">No results for "' + query + '"</div>';
        } else {
            results.innerHTML = items.map(it =>
                '<div class="sa-search-result-item" onclick="' + it.action + ';SA.closeSearch()">'
                + '<div class="sr-type">' + it.type + '</div>'
                + '<div class="sr-title">' + it.title + '</div>'
                + '<div class="sr-sub">' + it.sub + '</div></div>'
            ).join('');
        }
        results.classList.add('open');
    },

    onSearchFocus() {
        const input = document.getElementById('globalSearch');
        if (input && input.value.length >= 2) this.onSearch(input.value);
    },

    closeSearch() {
        const results = document.getElementById('searchResults');
        if (results) results.classList.remove('open');
    },

    // ============================================================
    // KEYBOARD SHORTCUTS
    // ============================================================
    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            const tag = e.target.tagName;
            const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

            // Escape: close modal or search
            if (e.key === 'Escape') {
                this.closeSearch();
                this.closeModal();
                this.closeSidebar();
                return;
            }

            // Ctrl+K or / : Focus search (when not in input)
            if ((e.ctrlKey && e.key === 'k') || (!isInput && e.key === '/')) {
                e.preventDefault();
                const search = document.getElementById('globalSearch');
                if (search) { search.focus(); search.select(); }
                return;
            }

            // Skip remaining shortcuts when in input fields
            if (isInput) return;

            // Ctrl+N: New entry
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.currentDate = this.todayStr();
                this.navigate('shift_entry');
                return;
            }

            // Ctrl+S: Save shift entry
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (this.currentView === 'shift_entry') this.saveShiftEntry();
                return;
            }

            // D: Dashboard
            if (e.key === 'd') { this.navigate('dashboard'); return; }
            // C: Calendar
            if (e.key === 'c') { this.navigate('calendar'); return; }
            // R: Reports
            if (e.key === 'r') { this.navigate('reports'); return; }

            // Arrow Left/Right: prev/next day (on shift-type pages)
            const shiftPages = ['shift_entry', 'credit_sales', 'expenses', 'discounts'];
            if (shiftPages.includes(this.currentView)) {
                if (e.key === 'ArrowLeft') { this.prevDay(); this.navigate(this.currentView); return; }
                if (e.key === 'ArrowRight') { this.nextDay(); this.navigate(this.currentView); return; }
            }

            // ?: Show keyboard shortcuts help
            if (e.key === '?') { this.showKeyboardHelp(); return; }
        });
    },

    showKeyboardHelp() {
        const shortcuts = [
            ['Ctrl + K  or  /', 'Focus search bar'],
            ['Ctrl + N', 'New shift entry (today)'],
            ['Ctrl + S', 'Save current shift entry'],
            ['D', 'Go to Dashboard'],
            ['C', 'Go to Calendar'],
            ['R', 'Go to Reports'],
            ['\u2190 / \u2192', 'Previous / Next day'],
            ['Esc', 'Close modal / search / sidebar'],
            ['?', 'Show this help']
        ];
        let html = '<div style="font-size:0.85rem;">';
        html += '<table class="sa-table" style="font-size:0.82rem;"><tbody>';
        shortcuts.forEach(s => {
            html += '<tr><td style="white-space:nowrap;"><span class="sa-kbd">' + s[0] + '</span></td><td>' + s[1] + '</td></tr>';
        });
        html += '</tbody></table>';
        html += '<div style="margin-top:12px;font-size:0.75rem;color:var(--sa-text-muted);">Single-key shortcuts only work when not typing in an input field.</div>';
        html += '</div>';
        this.openModal('Keyboard Shortcuts', html);
    },

    // ============================================================
    // PETTY CASH STATEMENT
    // ============================================================

    PETTY_CASH_CATEGORIES: [
        'Office Supplies',
        'Transport & Fuel',
        'Cleaning & Sanitation',
        'Meals & Refreshments',
        'Repairs & Maintenance',
        'Utilities',
        'Communication (Airtime)',
        'Stationery & Printing',
        'Medical & First Aid',
        'Miscellaneous'
    ],

    PETTY_CASH_WARNING_THRESHOLD: 500000,

    // Get petty cash balance for a branch (all-time running balance)
    getPettyCashBalance(branchId) {
        return this.data.pettyCashEntries
            .filter(e => e.branch_id === branchId)
            .reduce((bal, e) => {
                if (e.entry_type === 'top_up') return bal + this.parseNum(e.amount);
                return bal - this.parseNum(e.amount);
            }, 0);
    },

    // Get petty cash balance up to a specific month (for monthly opening)
    _getPettyCashBalanceBefore(branchId, month) {
        const monthStart = month + '-01';
        return this.data.pettyCashEntries
            .filter(e => e.branch_id === branchId && e.date < monthStart)
            .reduce((bal, e) => {
                if (e.entry_type === 'top_up') return bal + this.parseNum(e.amount);
                return bal - this.parseNum(e.amount);
            }, 0);
    },

    renderPettyCash(el) {
        if (!this.hasPermission('manage_petty_cash')) {
            el.innerHTML = this._accessDenied('Petty Cash');
            return;
        }
        if (!this.currentBranch) {
            el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>';
            return;
        }

        const bid = this.currentBranch.id;
        const month = this.MONTH;
        const openingBalance = this._getPettyCashBalanceBefore(bid, month);
        const currentBalance = this.getPettyCashBalance(bid);

        // Get entries for current month
        const monthEntries = this.data.pettyCashEntries
            .filter(e => e.branch_id === bid && e.date && e.date.startsWith(month))
            .sort((a, b) => {
                if (a.date === b.date) return a.id - b.id;
                return a.date < b.date ? -1 : 1;
            });

        const monthTopUps = monthEntries.filter(e => e.entry_type === 'top_up');
        const monthExpenses = monthEntries.filter(e => e.entry_type === 'expense');
        const totalTopUps = monthTopUps.reduce((s, e) => s + this.parseNum(e.amount), 0);
        const totalExpenses = monthExpenses.reduce((s, e) => s + this.parseNum(e.amount), 0);
        const closingBalance = openingBalance + totalTopUps - totalExpenses;

        // Expense breakdown by category
        const categoryTotals = {};
        monthExpenses.forEach(e => {
            const cat = e.category || 'Miscellaneous';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + this.parseNum(e.amount);
        });

        // Header
        let html = '<div class="sa-page-header"><h1>Petty Cash &mdash; ' + this.currentBranch.name + '</h1>'
            + '<div class="sa-page-actions">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.printPettyCash()">Print / Export</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.showPettyCashTopUp()">+ Top Up</button>'
            + '<button class="sa-btn sa-btn-danger" onclick="SA.showPettyCashExpense()">+ Record Expense</button>'
            + '</div></div>';

        // Low balance warning
        if (currentBalance <= this.PETTY_CASH_WARNING_THRESHOLD && currentBalance >= 0) {
            html += '<div class="sa-petty-cash-warning">'
                + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
                + '<div><strong>Low Petty Cash Balance!</strong> Current balance is <strong>UGX ' + this.fmtInt(currentBalance)
                + '</strong>, which is at or below the UGX ' + this.fmtInt(this.PETTY_CASH_WARNING_THRESHOLD) + ' threshold. Please top up the petty cash fund.</div>'
                + '</div>';
        }
        if (currentBalance < 0) {
            html += '<div class="sa-petty-cash-warning" style="background:rgba(239,68,68,0.12);border-color:var(--sa-danger);">'
                + '<svg viewBox="0 0 24 24" fill="none" stroke="var(--sa-danger)" stroke-width="2" width="22" height="22"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
                + '<div style="color:var(--sa-danger);"><strong>Petty Cash Overdrawn!</strong> Balance is <strong>UGX ' + this.fmtInt(currentBalance) + '</strong>. More has been spent than topped up. Immediate top-up required.</div>'
                + '</div>';
        }

        // Summary cards
        html += '<div class="sa-stats">';
        html += '<div class="sa-stat-card ' + (currentBalance <= this.PETTY_CASH_WARNING_THRESHOLD ? 'danger' : 'success') + '"><div class="stat-label">Current Balance</div><div class="stat-value">UGX ' + this.fmtInt(currentBalance) + '</div><div class="stat-sub">All-time running balance</div></div>';
        html += '<div class="sa-stat-card info"><div class="stat-label">Opening (' + this.monthLabel() + ')</div><div class="stat-value">UGX ' + this.fmtInt(openingBalance) + '</div><div class="stat-sub">Carried forward</div></div>';
        html += '<div class="sa-stat-card success"><div class="stat-label">Top-Ups This Month</div><div class="stat-value">UGX ' + this.fmtInt(totalTopUps) + '</div><div class="stat-sub">' + monthTopUps.length + ' top-up(s)</div></div>';
        html += '<div class="sa-stat-card danger"><div class="stat-label">Expenses This Month</div><div class="stat-value">UGX ' + this.fmtInt(totalExpenses) + '</div><div class="stat-sub">' + monthExpenses.length + ' expense(s)</div></div>';
        html += '</div>';

        // Statement table
        html += '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">Petty Cash Statement — ' + this.monthLabel() + '</div></div>';
        html += '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="text-right">In (UGX)</th><th class="text-right">Out (UGX)</th><th class="text-right">Balance (UGX)</th><th style="width:40px;"></th></tr></thead><tbody>';

        // Opening balance row
        let runBal = openingBalance;
        html += '<tr style="background:rgba(59,130,246,0.06);font-weight:600;">'
            + '<td>—</td><td>Opening Balance</td><td></td><td></td><td></td>'
            + '<td class="text-right mono text-bold">' + this.fmtInt(runBal) + '</td><td></td></tr>';

        // Transaction rows
        monthEntries.forEach(e => {
            const isTopUp = e.entry_type === 'top_up';
            const amt = this.parseNum(e.amount);
            runBal = isTopUp ? runBal + amt : runBal - amt;
            const balClass = runBal <= this.PETTY_CASH_WARNING_THRESHOLD ? 'text-danger' : '';

            html += '<tr>';
            html += '<td style="white-space:nowrap;">' + this.formatDate(e.date) + '</td>';
            html += '<td>' + (e.description || (isTopUp ? 'Petty cash top-up' : e.category)) + '</td>';
            html += '<td>' + (isTopUp ? '<span class="sa-badge sa-badge-success">Top-Up</span>' : '<span class="sa-badge sa-badge-neutral">' + (e.category || '') + '</span>') + '</td>';
            html += '<td class="text-right mono">' + (isTopUp ? '<span class="text-success">' + this.fmtInt(amt) + '</span>' : '') + '</td>';
            html += '<td class="text-right mono">' + (!isTopUp ? '<span class="text-danger">' + this.fmtInt(amt) + '</span>' : '') + '</td>';
            html += '<td class="text-right mono text-bold ' + balClass + '">' + this.fmtInt(runBal) + '</td>';
            html += '<td><button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.removePettyCashEntry(\'' + e.id + '\')" title="Remove" style="color:var(--sa-danger);font-size:0.7rem;padding:2px 6px;">&times;</button></td>';
            html += '</tr>';
        });

        if (monthEntries.length === 0) {
            html += '<tr><td colspan="7" class="text-center text-muted" style="padding:30px;">No petty cash entries for this month. Use the buttons above to top up or record expenses.</td></tr>';
        }

        // Totals row
        html += '<tr class="total-row"><td></td><td class="text-bold">TOTALS</td><td></td>';
        html += '<td class="text-right mono text-bold text-success">' + this.fmtInt(totalTopUps) + '</td>';
        html += '<td class="text-right mono text-bold text-danger">' + this.fmtInt(totalExpenses) + '</td>';
        html += '<td class="text-right mono text-bold">' + this.fmtInt(closingBalance) + '</td><td></td></tr>';

        html += '</tbody></table></div></div></div>';

        // Expense breakdown by category
        if (Object.keys(categoryTotals).length > 0) {
            html += '<div class="sa-section"><div class="sa-section-header yellow"><div class="sa-section-title">Expense Breakdown by Category</div></div>';
            html += '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
            html += '<thead><tr><th>Category</th><th class="text-right">Amount (UGX)</th><th class="text-right">% of Total</th><th>Bar</th></tr></thead><tbody>';

            const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
            sortedCats.forEach(([cat, total]) => {
                const pct = totalExpenses > 0 ? (total / totalExpenses * 100) : 0;
                html += '<tr><td><span class="sa-badge sa-badge-neutral">' + cat + '</span></td>';
                html += '<td class="text-right mono text-danger">' + this.fmtInt(total) + '</td>';
                html += '<td class="text-right mono">' + this.fmt(pct, 1) + '%</td>';
                html += '<td><div style="background:rgba(239,68,68,0.1);border-radius:4px;height:18px;width:100%;position:relative;">'
                    + '<div style="background:var(--sa-danger);height:100%;border-radius:4px;width:' + pct + '%;min-width:2px;"></div></div></td>';
                html += '</tr>';
            });

            html += '</tbody></table></div></div></div>';
        }

        el.innerHTML = html;
    },

    // Show top-up modal
    showPettyCashTopUp() {
        const html = '<div class="sa-form-group"><label>Date</label>'
            + '<input class="sa-input" id="pcDate" type="date" value="' + (this.currentDate || this.todayStr()) + '"></div>'
            + '<div class="sa-form-group"><label>Amount (UGX)</label>'
            + '<input class="sa-input" id="pcAmount" type="number" step="1" placeholder="e.g. 2000000"></div>'
            + '<div class="sa-form-group"><label>Description (optional)</label>'
            + '<input class="sa-input" id="pcDesc" type="text" placeholder="e.g. Monthly petty cash replenishment"></div>'
            + '<div style="margin-top:16px;"><button class="sa-btn sa-btn-primary" style="width:100%;padding:12px;font-size:1rem;font-weight:700;" onclick="SA.savePettyCashTopUp()">Save Top-Up</button></div>';
        this.openModal('Top Up Petty Cash', html);
    },

    savePettyCashTopUp() {
        const date = document.getElementById('pcDate')?.value;
        const amount = this.parseNum(document.getElementById('pcAmount')?.value);
        const desc = document.getElementById('pcDesc')?.value || 'Petty cash top-up';

        if (!date) { this.toast('Please enter a date', 'error'); return; }
        if (amount <= 0) { this.toast('Please enter an amount', 'error'); return; }

        this.data.pettyCashEntries.push({
            id: this.uid(),
            branch_id: this.currentBranch.id,
            entry_type: 'top_up',
            date: date,
            amount: amount,
            category: null,
            description: desc,
            created_at: new Date().toISOString()
        });
        this.saveData();
        this.closeModal();
        this.toast('Petty cash topped up with UGX ' + this.fmtInt(amount), 'success');
        this.navigate('petty_cash');
    },

    // Show expense modal
    showPettyCashExpense() {
        let catOpts = this.PETTY_CASH_CATEGORIES.map(c => '<option value="' + c + '">' + c + '</option>').join('');

        const currentBal = this.getPettyCashBalance(this.currentBranch.id);
        const balWarning = currentBal <= 0
            ? '<div style="background:rgba(239,68,68,0.1);border:1px solid var(--sa-danger);border-radius:8px;padding:10px;margin-bottom:12px;font-size:0.82rem;color:var(--sa-danger);">Petty cash is overdrawn (UGX ' + this.fmtInt(currentBal) + '). Consider topping up before recording more expenses.</div>'
            : '<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:8px;padding:10px;margin-bottom:12px;font-size:0.82rem;">Available balance: <strong>UGX ' + this.fmtInt(currentBal) + '</strong></div>';

        const html = balWarning
            + '<div class="sa-form-group"><label>Date</label>'
            + '<input class="sa-input" id="pcExpDate" type="date" value="' + (this.currentDate || this.todayStr()) + '"></div>'
            + '<div class="sa-form-group"><label>Expense Category</label>'
            + '<select class="sa-input" id="pcExpCategory">' + catOpts + '</select></div>'
            + '<div class="sa-form-group"><label>Description</label>'
            + '<input class="sa-input" id="pcExpDesc" type="text" placeholder="e.g. Bought soap and detergent"></div>'
            + '<div class="sa-form-group"><label>Amount (UGX)</label>'
            + '<input class="sa-input" id="pcExpAmount" type="number" step="1" placeholder="e.g. 50000"></div>'
            + '<div style="margin-top:16px;"><button class="sa-btn sa-btn-primary" style="width:100%;padding:12px;font-size:1rem;font-weight:700;" onclick="SA.savePettyCashExpense()">Save Expense</button></div>';
        this.openModal('Record Petty Cash Expense', html);
    },

    savePettyCashExpense() {
        const date = document.getElementById('pcExpDate')?.value;
        const category = document.getElementById('pcExpCategory')?.value;
        const desc = document.getElementById('pcExpDesc')?.value || category;
        const amount = this.parseNum(document.getElementById('pcExpAmount')?.value);

        if (!date) { this.toast('Please enter a date', 'error'); return; }
        if (!category) { this.toast('Please select a category', 'error'); return; }
        if (amount <= 0) { this.toast('Please enter an amount', 'error'); return; }

        this.data.pettyCashEntries.push({
            id: this.uid(),
            branch_id: this.currentBranch.id,
            entry_type: 'expense',
            date: date,
            amount: amount,
            category: category,
            description: desc,
            created_at: new Date().toISOString()
        });
        this.saveData();
        this.closeModal();

        // Check new balance and warn
        const newBal = this.getPettyCashBalance(this.currentBranch.id);
        if (newBal <= this.PETTY_CASH_WARNING_THRESHOLD && newBal >= 0) {
            this.toast('Expense saved. Warning: Petty cash balance is low (UGX ' + this.fmtInt(newBal) + ')', 'warning');
        } else if (newBal < 0) {
            this.toast('Expense saved. ALERT: Petty cash is overdrawn!', 'error');
        } else {
            this.toast('Expense recorded', 'success');
        }
        this.navigate('petty_cash');
    },

    // Remove petty cash entry
    removePettyCashEntry(id) {
        if (!confirm('Remove this petty cash entry?')) return;
        this.data.pettyCashEntries = this.data.pettyCashEntries.filter(e => e.id !== id);
        this.saveData();
        this.toast('Entry removed', 'success');
        this.navigate('petty_cash');
    },

    // Print petty cash statement
    printPettyCash() {
        if (!this.currentBranch) return;
        const bid = this.currentBranch.id;
        const month = this.MONTH;
        const branchName = this.currentBranch.name;
        const openingBalance = this._getPettyCashBalanceBefore(bid, month);

        const monthEntries = this.data.pettyCashEntries
            .filter(e => e.branch_id === bid && e.date && e.date.startsWith(month))
            .sort((a, b) => {
                if (a.date === b.date) return a.id - b.id;
                return a.date < b.date ? -1 : 1;
            });

        const totalTopUps = monthEntries.filter(e => e.entry_type === 'top_up').reduce((s, e) => s + this.parseNum(e.amount), 0);
        const totalExpenses = monthEntries.filter(e => e.entry_type === 'expense').reduce((s, e) => s + this.parseNum(e.amount), 0);
        const closingBalance = openingBalance + totalTopUps - totalExpenses;

        // Category breakdown
        const categoryTotals = {};
        monthEntries.filter(e => e.entry_type === 'expense').forEach(e => {
            const cat = e.category || 'Miscellaneous';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + this.parseNum(e.amount);
        });

        let printHtml = '<!DOCTYPE html><html><head><title>Petty Cash — ' + branchName + '</title>'
            + '<style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#333;}'
            + 'h1{font-size:18px;margin-bottom:4px;}h2{font-size:14px;color:#666;margin-bottom:20px;}'
            + 'table{width:100%;border-collapse:collapse;margin-bottom:20px;}'
            + 'th,td{border:1px solid #ddd;padding:6px 10px;text-align:left;font-size:11px;}'
            + 'th{background:#f5f5f5;font-weight:bold;}'
            + '.right{text-align:right;}'
            + '.bold{font-weight:bold;}'
            + '.in{color:#16a34a;}'
            + '.out{color:#dc2626;}'
            + '.total-row{background:#f0f0f0;font-weight:bold;}'
            + '.summary{display:flex;gap:20px;margin-bottom:20px;}'
            + '.summary-box{border:1px solid #ddd;padding:12px;flex:1;text-align:center;}'
            + '.summary-box .label{font-size:10px;text-transform:uppercase;color:#888;}'
            + '.summary-box .value{font-size:16px;font-weight:bold;margin-top:4px;}'
            + '.cat-table{width:50%;margin-top:10px;}'
            + '@media print{body{margin:10px;}}</style></head><body>';

        printHtml += '<h1>PETTY CASH STATEMENT — ' + branchName.toUpperCase() + '</h1>';
        printHtml += '<h2>Gasco Energy Limited | ' + this.monthLabel() + '</h2>';

        printHtml += '<div class="summary">'
            + '<div class="summary-box"><div class="label">Opening Balance</div><div class="value">UGX ' + this.fmtInt(openingBalance) + '</div></div>'
            + '<div class="summary-box"><div class="label">Top-Ups</div><div class="value in">UGX ' + this.fmtInt(totalTopUps) + '</div></div>'
            + '<div class="summary-box"><div class="label">Expenses</div><div class="value out">UGX ' + this.fmtInt(totalExpenses) + '</div></div>'
            + '<div class="summary-box"><div class="label">Closing Balance</div><div class="value">UGX ' + this.fmtInt(closingBalance) + '</div></div>'
            + '</div>';

        printHtml += '<table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="right">In (UGX)</th><th class="right">Out (UGX)</th><th class="right">Balance (UGX)</th></tr></thead><tbody>';

        let runBal = openingBalance;
        printHtml += '<tr style="background:#e8f0fe;"><td>—</td><td class="bold">Opening Balance</td><td></td><td></td><td></td><td class="right bold">' + this.fmtInt(runBal) + '</td></tr>';

        monthEntries.forEach(e => {
            const isTopUp = e.entry_type === 'top_up';
            const amt = this.parseNum(e.amount);
            runBal = isTopUp ? runBal + amt : runBal - amt;
            printHtml += '<tr>';
            printHtml += '<td>' + this.formatDate(e.date) + '</td>';
            printHtml += '<td>' + (e.description || '') + '</td>';
            printHtml += '<td>' + (isTopUp ? 'Top-Up' : (e.category || '')) + '</td>';
            printHtml += '<td class="right in">' + (isTopUp ? this.fmtInt(amt) : '') + '</td>';
            printHtml += '<td class="right out">' + (!isTopUp ? this.fmtInt(amt) : '') + '</td>';
            printHtml += '<td class="right bold">' + this.fmtInt(runBal) + '</td>';
            printHtml += '</tr>';
        });

        printHtml += '<tr class="total-row"><td></td><td>TOTALS</td><td></td>';
        printHtml += '<td class="right in">' + this.fmtInt(totalTopUps) + '</td>';
        printHtml += '<td class="right out">' + this.fmtInt(totalExpenses) + '</td>';
        printHtml += '<td class="right">' + this.fmtInt(closingBalance) + '</td></tr>';
        printHtml += '</tbody></table>';

        // Category breakdown
        if (Object.keys(categoryTotals).length > 0) {
            printHtml += '<h3 style="font-size:13px;margin-bottom:8px;">Expense Breakdown by Category</h3>';
            printHtml += '<table class="cat-table"><thead><tr><th>Category</th><th class="right">Amount (UGX)</th><th class="right">%</th></tr></thead><tbody>';
            Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).forEach(([cat, total]) => {
                const pct = totalExpenses > 0 ? (total / totalExpenses * 100).toFixed(1) : '0.0';
                printHtml += '<tr><td>' + cat + '</td><td class="right">' + this.fmtInt(total) + '</td><td class="right">' + pct + '%</td></tr>';
            });
            printHtml += '</tbody></table>';
        }

        printHtml += '<div style="margin-top:30px;font-size:10px;color:#999;">Generated on ' + new Date().toLocaleString() + ' | Gasco Energy Limited — Confidential</div>';
        printHtml += '</body></html>';

        const w = window.open('', '_blank', 'width=900,height=700');
        w.document.write(printHtml);
        w.document.close();
        w.focus();
        w.print();
    },

    // ============================================================
    // GOODS ISSUE — Fuel issued to station trucks & motorbikes
    // ============================================================

    renderGoodsIssues(el) {
        if (!this.currentBranch) { el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>'; return; }
        if (!this.currentDate) this.currentDate = this.todayStr();
        const bid = this.currentBranch.id;
        const ds = this.currentDate;
        const key = this.bk(bid, ds);
        if (!this.data.goodsIssues[key]) this.data.goodsIssues[key] = [];
        const entries = this._activeRecords(this.data.goodsIssues[key]);

        let html = '<div class="sa-page-header"><h1>Goods Issue &mdash; <span class="sa-date-display">' + this.formatDate(ds) + '</span></h1>'
            + '<div class="sa-date-nav">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.giPrevDay()">&laquo; Prev</button>'
            + '<input type="date" class="sa-date-input" value="' + ds + '" min="' + this.monthStart() + '" max="' + this.monthEnd() + '" onchange="SA.goToDate(this.value,\'goods_issues\')">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.giNextDay()">Next &raquo;</button>'
            + '</div></div>';

        html += '<div class="sa-info-box" style="margin-bottom:16px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + 'Record fuel issued to station trucks and motorbikes. Track the vehicle number plate, product type (PMS/AGO), volume in litres, and the value at pump price.</div>';

        html += '<div class="sa-section"><div class="sa-section-header" style="background:linear-gradient(135deg,#7C3AED 0%,#A78BFA 100%);">'
            + '<div class="sa-section-title" style="color:#fff;">Goods Issued</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Product</th><th>Number Plate</th><th class="text-right">Volume (L)</th><th class="text-right">Rate/L (UGX)</th><th class="text-right">Amount (UGX)</th><th style="width:40px;"></th></tr></thead><tbody>';

        let totalVolume = 0, totalAmount = 0;
        entries.forEach((g) => {
            const vol = this.parseNum(g.volume);
            const rate = this.parseNum(g.rate);
            const amt = vol * rate;
            totalVolume += vol;
            totalAmount += amt;

            html += '<tr>';
            html += '<td><select class="sa-input sa-input-sm" onchange="SA._stageGoodsIssue(\'' + g._id + '\',\'product\',this.value)">'
                + '<option value="PMS"' + (g.product === 'PMS' ? ' selected' : '') + '>PMS</option>'
                + '<option value="AGO"' + (g.product === 'AGO' ? ' selected' : '') + '>AGO</option></select></td>';
            html += '<td><input class="sa-input sa-input-sm" placeholder="e.g. UAB 123A" value="' + (g.number_plate || '') + '" onchange="SA._stageGoodsIssue(\'' + g._id + '\',\'number_plate\',this.value)" style="min-width:120px;text-transform:uppercase;"></td>';
            html += '<td class="text-right"><input class="sa-input sa-input-sm mono" placeholder="Litres" value="' + (g.volume || '') + '" onchange="SA._stageGoodsIssue(\'' + g._id + '\',\'volume\',this.value)" style="width:100px;text-align:right;"></td>';
            html += '<td class="text-right"><span class="sa-input sa-input-sm mono" style="display:inline-block;width:90px;background:var(--sa-bg);cursor:default;opacity:0.85;">' + this.fmtInt(g.rate || 0) + '</span></td>';
            html += '<td class="text-right mono">' + this.fmtInt(amt) + '</td>';
            html += '<td><button class="sa-remove-btn" onclick="SA.removeGoodsIssue(\'' + g._id + '\')">&times;</button></td>';
            html += '</tr>';
        });

        if (entries.length === 0) {
            html += '<tr><td colspan="6" class="text-center text-muted" style="padding:24px;">No goods issued. Click "+ Add Goods Issue" to record fuel issued to a vehicle.</td></tr>';
        }

        html += '<tr class="total-row"><td colspan="2" class="text-right text-bold">TOTALS</td>';
        html += '<td class="text-right mono text-bold">' + this.fmt(totalVolume, 3) + '</td><td></td>';
        html += '<td class="text-right mono text-bold">' + this.fmtInt(totalAmount) + '</td><td></td></tr>';
        html += '</tbody></table></div></div></div>';

        html += '<div style="padding:16px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">'
            + '<button class="sa-btn sa-btn-secondary sa-btn-sm" onclick="SA.addGoodsIssue()">+ Add Goods Issue</button>'
            + (entries.length > 0 ? '<button class="sa-btn sa-btn-primary sa-btn-sm" onclick="SA._commitGoodsIssues()" style="padding:8px 20px;font-weight:700;gap:4px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Update</button>' : '')
            + '</div>';

        // Summary by product
        let pmsVol = 0, pmsAmt = 0, agoVol = 0, agoAmt = 0;
        entries.forEach(g => {
            const vol = this.parseNum(g.volume), rate = this.parseNum(g.rate);
            if (g.product === 'AGO') { agoVol += vol; agoAmt += vol * rate; }
            else { pmsVol += vol; pmsAmt += vol * rate; }
        });
        if (entries.length > 0) {
            html += '<div class="sa-section"><div class="sa-section-header green"><div class="sa-section-title">Summary by Product</div></div><div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
            html += '<thead><tr><th>Product</th><th class="text-right">Volume (L)</th><th class="text-right">Value (UGX)</th></tr></thead><tbody>';
            html += '<tr><td><span class="sa-badge sa-badge-warning">PMS</span></td><td class="text-right mono">' + this.fmt(pmsVol, 3) + '</td><td class="text-right mono">' + this.fmtInt(pmsAmt) + '</td></tr>';
            html += '<tr><td><span class="sa-badge sa-badge-info">AGO</span></td><td class="text-right mono">' + this.fmt(agoVol, 3) + '</td><td class="text-right mono">' + this.fmtInt(agoAmt) + '</td></tr>';
            html += '<tr class="total-row"><td class="text-bold">TOTAL</td><td class="text-right mono text-bold">' + this.fmt(totalVolume, 3) + '</td><td class="text-right mono text-bold">' + this.fmtInt(totalAmount) + '</td></tr>';
            html += '</tbody></table></div></div></div>';
        }

        html += '<div class="sa-info-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + 'Total Goods Issued (' + this.fmtInt(totalAmount) + ') is reflected in the Daily Report Summary. These are internal fuel issues to station vehicles and do not count as sales.</div>';

        el.innerHTML = html;
    },

    addGoodsIssue() {
        if (!this.hasPermission('edit_transactions')) { this.toast('Permission denied', 'error'); return; }
        if (!this._guardClosedShift('add a goods issue', () => this.addGoodsIssue())) return;
        const key = this.bk(this.currentBranch.id, this.currentDate);
        if (!this.data.goodsIssues[key]) this.data.goodsIssues[key] = [];
        const existing = this.data.goodsIssues[key];
        if (existing.length > 0) {
            const last = existing[existing.length - 1];
            if (!last.number_plate && this.parseNum(last.volume) === 0) {
                this.toast('Please fill in the last goods issue before adding a new one', 'warning');
                return;
            }
        }
        this._initRefCounters();
        var stamp = this._auditStamp();
        var pp = this.getBranchPumpPrice(this.currentBranch.id, 'pms');
        this.data.goodsIssues[key].push({
            _id: this.uid(), ref_number: this._nextRef('GI'),
            product: 'PMS', number_plate: '', volume: 0, rate: pp,
            created_at: stamp.created_at, created_by: stamp.created_by,
            updated_at: stamp.updated_at, updated_by: stamp.updated_by
        });
        this.saveData();
        this.navigate('goods_issues');
    },

    removeGoodsIssue(id) {
        if (!this._guardClosedShift('delete a goods issue', () => this._doRemoveGoodsIssue(id))) return;
        if (!confirm('Are you sure you want to delete this goods issue?')) return;
        this._doRemoveGoodsIssue(id);
    },
    _doRemoveGoodsIssue(id) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        var entry = this._findById(this.data.goodsIssues[key], id);
        if (entry) {
            this._softDelete(entry);
            this.saveData();
            this.navigate('goods_issues');
        }
    },

    _giPending: {},

    _stageGoodsIssue(id, field, value) {
        if (!this._giPending[id]) this._giPending[id] = {};
        this._giPending[id][field] = value;
        // When product changes, auto-update rate from pump price
        if (field === 'product' && this.currentBranch) {
            var pp = this.getBranchPumpPrice(this.currentBranch.id, value === 'PMS' ? 'pms' : 'ago');
            this._giPending[id]['rate'] = pp;
        }
    },

    _commitGoodsIssues() {
        const pending = this._giPending;
        const keys = Object.keys(pending);
        if (keys.length === 0) { this.toast('No changes to update', 'warning'); return; }

        const key = this.bk(this.currentBranch.id, this.currentDate);
        const entries = this._activeRecords(this.data.goodsIssues[key] || []);
        for (var i = 0; i < keys.length; i++) {
            var id = keys[i];
            var fields = pending[id];
            var entry = this._findById(entries, id);
            if (!entry) continue;
            if (fields.volume !== undefined && !this._validateAmount(fields.volume, 'Volume')) return;
            var np = fields.number_plate !== undefined ? fields.number_plate : entry.number_plate;
            if (!np || !np.trim()) {
                this.toast('Please enter a vehicle number plate', 'error');
                return;
            }
        }

        this._giPending = {};
        keys.forEach(id => {
            const fields = pending[id];
            Object.keys(fields).forEach(field => {
                this._updateGoodsIssue(id, field, fields[field]);
            });
        });
        this.navigate('goods_issues');
        this.toast('Goods issues updated', 'success');
    },

    _updateGoodsIssue(id, field, value) {
        const key = this.bk(this.currentBranch.id, this.currentDate);
        var entry = this._findById(this.data.goodsIssues[key], id);
        if (entry) {
            var newVal = (field === 'volume' || field === 'rate') ? this.parseNum(value) : value;
            if (field === 'number_plate') newVal = String(value).toUpperCase().trim();
            this._trackChange(entry, field, newVal);
            entry[field] = newVal;
            if (!entry._id) entry._id = this.uid();
            this._touchUpdated(entry);
            this.saveData();
        }
    },

    giPrevDay() {
        const d = new Date(this.currentDate + 'T00:00:00');
        d.setDate(d.getDate() - 1);
        const nd = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        if (nd >= this.monthStart()) { this.currentDate = nd; this.navigate('goods_issues'); }
    },
    giNextDay() {
        const d = new Date(this.currentDate + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        const nd = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        if (nd <= this.monthEnd()) { this.currentDate = nd; this.navigate('goods_issues'); }
    },

    calcTotalGoodsIssues(branchId, dateStr) {
        const key = this.bk(branchId, dateStr);
        const entries = this._activeRecords(this.data.goodsIssues[key] || []);
        return entries.reduce((sum, g) => sum + (this.parseNum(g.volume) * this.parseNum(g.rate)), 0);
    },

    // ============================================================
    // INVENTORY — Stock Levels per Branch
    // ============================================================

    renderInventory(el) {
        if (!this.currentBranch) { el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>'; return; }
        const bid = this.currentBranch.id;
        const month = this.MONTH;
        const daysInMonth = this.DAYS_IN_MONTH;

        let html = '<div class="sa-page-header"><h1>Stock Levels &mdash; ' + this.currentBranch.name + '</h1>'
            + '<div class="sa-page-actions"><span class="sa-badge sa-badge-info">' + month + '</span></div></div>';

        html += '<div class="sa-info-box" style="margin-bottom:16px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + 'Monthly stock reconciliation showing opening stock, deliveries received, sales dispensed, goods issued, and closing stock for each product.</div>';

        var products = ['PMS', 'AGO'];
        var self = this;

        // Calculate monthly totals per product
        var stockData = {};
        products.forEach(function(prod) {
            var totalDeliveries = 0, totalSales = 0, totalGoodsIssues = 0;

            for (var d = 1; d <= daysInMonth; d++) {
                var ds = month + '-' + String(d).padStart(2, '0');
                var key = self.bk(bid, ds);

                // Deliveries in
                var dayDeliveries = self.data.fuelDeliveries.filter(function(fd) {
                    return fd.branch_id === bid && fd.product_type === prod && fd.delivery_date === ds && !fd.is_deleted;
                });
                dayDeliveries.forEach(function(fd) { totalDeliveries += self.parseNum(fd.loaded_qty); });

                // Sales out (from pump readings)
                var calc = self.calculateDate(bid, ds);
                if (prod === 'PMS') totalSales += calc.pmsVolume;
                else totalSales += calc.agoVolume;

                // Goods issues out
                var gi = self._activeRecords(self.data.goodsIssues[key] || []);
                gi.forEach(function(g) {
                    if (g.product === prod) totalGoodsIssues += self.parseNum(g.volume);
                });
            }

            // Opening stock from inventory data or zero
            var invKey = bid + '_' + prod;
            var inv = self.data.inventory[invKey] || {};
            var opening = self.parseNum(inv.opening_stock);
            var closing = opening + totalDeliveries - totalSales - totalGoodsIssues;

            stockData[prod] = {
                opening: opening,
                deliveries: totalDeliveries,
                sales: totalSales,
                goodsIssues: totalGoodsIssues,
                closing: closing
            };
        });

        // Stats cards
        html += '<div class="sa-stats">';
        products.forEach(function(prod) {
            var sd = stockData[prod];
            var badgeClass = prod === 'PMS' ? 'sa-badge-warning' : 'sa-badge-info';
            html += '<div class="sa-stat-card"><div class="stat-label"><span class="sa-badge ' + badgeClass + '">' + prod + '</span> Closing Stock</div>'
                + '<div class="stat-value">' + self.fmt(sd.closing, 1) + ' L</div></div>';
        });
        html += '</div>';

        // Stock reconciliation table
        html += '<div class="sa-section"><div class="sa-section-header" style="background:linear-gradient(135deg,#059669 0%,#34D399 100%);">'
            + '<div class="sa-section-title" style="color:#fff;">Stock Reconciliation &mdash; ' + month + '</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Product</th><th class="text-right">Opening (L)</th><th class="text-right">Deliveries In (L)</th>'
            + '<th class="text-right">Sales Out (L)</th><th class="text-right">Goods Issued (L)</th><th class="text-right">Closing (L)</th></tr></thead><tbody>';

        var grandOpening = 0, grandDel = 0, grandSales = 0, grandGI = 0, grandClosing = 0;
        products.forEach(function(prod) {
            var sd = stockData[prod];
            grandOpening += sd.opening; grandDel += sd.deliveries; grandSales += sd.sales; grandGI += sd.goodsIssues; grandClosing += sd.closing;
            var badgeClass = prod === 'PMS' ? 'sa-badge-warning' : 'sa-badge-info';
            html += '<tr><td><span class="sa-badge ' + badgeClass + '">' + prod + '</span></td>'
                + '<td class="text-right mono">' + self.fmt(sd.opening, 1) + '</td>'
                + '<td class="text-right mono" style="color:#059669;">' + self.fmt(sd.deliveries, 1) + '</td>'
                + '<td class="text-right mono" style="color:#DC2626;">' + self.fmt(sd.sales, 1) + '</td>'
                + '<td class="text-right mono" style="color:#D97706;">' + self.fmt(sd.goodsIssues, 1) + '</td>'
                + '<td class="text-right mono text-bold">' + self.fmt(sd.closing, 1) + '</td></tr>';
        });

        html += '<tr class="total-row"><td class="text-bold">TOTAL</td>'
            + '<td class="text-right mono text-bold">' + self.fmt(grandOpening, 1) + '</td>'
            + '<td class="text-right mono text-bold">' + self.fmt(grandDel, 1) + '</td>'
            + '<td class="text-right mono text-bold">' + self.fmt(grandSales, 1) + '</td>'
            + '<td class="text-right mono text-bold">' + self.fmt(grandGI, 1) + '</td>'
            + '<td class="text-right mono text-bold">' + self.fmt(grandClosing, 1) + '</td></tr>';

        html += '</tbody></table></div></div></div>';

        // Opening stock editor
        html += '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">Set Opening Stock</div></div>'
            + '<div class="sa-section-body"><div class="sa-info-box" style="margin-bottom:12px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + 'Set the opening stock for this month. This is the physical stock count at the beginning of the month.</div>';

        html += '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;">';
        products.forEach(function(prod) {
            var invKey = bid + '_' + prod;
            var inv = self.data.inventory[invKey] || {};
            html += '<div class="sa-form-group" style="min-width:180px;">'
                + '<label>' + prod + ' Opening Stock (Litres)</label>'
                + '<input type="text" class="sa-input mono" id="invOpening_' + prod + '" value="' + (inv.opening_stock || '') + '" placeholder="0">'
                + '</div>';
        });
        html += '<button class="sa-btn sa-btn-primary" onclick="SA.saveInventoryOpening()">Save Opening Stock</button>';
        html += '</div></div></div>';

        // Daily stock movement breakdown
        html += '<div class="sa-section"><div class="sa-section-header" style="background:linear-gradient(135deg,#6366F1 0%,#818CF8 100%);">'
            + '<div class="sa-section-title" style="color:#fff;">Daily Breakdown</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Date</th>';
        products.forEach(function(prod) {
            html += '<th class="text-right">' + prod + ' Del. In</th><th class="text-right">' + prod + ' Sales Out</th><th class="text-right">' + prod + ' GI Out</th>';
        });
        html += '</tr></thead><tbody>';

        for (var d = 1; d <= daysInMonth; d++) {
            var ds = month + '-' + String(d).padStart(2, '0');
            var key = self.bk(bid, ds);
            var hasData = false;
            var rowData = {};

            products.forEach(function(prod) {
                var del = 0, sales = 0, gi = 0;
                self.data.fuelDeliveries.filter(function(fd) {
                    return fd.branch_id === bid && fd.product_type === prod && fd.delivery_date === ds && !fd.is_deleted;
                }).forEach(function(fd) { del += self.parseNum(fd.loaded_qty); });

                var calc = self.calculateDate(bid, ds);
                sales = prod === 'PMS' ? calc.pmsVolume : calc.agoVolume;

                var giEntries = self._activeRecords(self.data.goodsIssues[key] || []);
                giEntries.forEach(function(g) { if (g.product === prod) gi += self.parseNum(g.volume); });

                if (del > 0 || sales > 0 || gi > 0) hasData = true;
                rowData[prod] = { del: del, sales: sales, gi: gi };
            });

            if (!hasData) continue;

            html += '<tr><td>' + self.formatDate(ds) + '</td>';
            products.forEach(function(prod) {
                var rd = rowData[prod];
                html += '<td class="text-right mono" style="color:#059669;">' + (rd.del > 0 ? self.fmt(rd.del, 1) : '-') + '</td>';
                html += '<td class="text-right mono" style="color:#DC2626;">' + (rd.sales > 0 ? self.fmt(rd.sales, 1) : '-') + '</td>';
                html += '<td class="text-right mono" style="color:#D97706;">' + (rd.gi > 0 ? self.fmt(rd.gi, 1) : '-') + '</td>';
            });
            html += '</tr>';
        }

        html += '</tbody></table></div></div></div>';

        el.innerHTML = html;
    },

    saveInventoryOpening() {
        if (!this.hasPermission('edit_transactions')) { this.toast('Permission denied', 'error'); return; }
        var bid = this.currentBranch.id;
        var products = ['PMS', 'AGO'];
        var self = this;

        products.forEach(function(prod) {
            var input = document.getElementById('invOpening_' + prod);
            if (input) {
                var val = self.parseNum(input.value);
                var invKey = bid + '_' + prod;
                if (!self.data.inventory[invKey]) {
                    self.data.inventory[invKey] = { opening_stock: 0, current_stock: 0, last_updated: null };
                }
                self.data.inventory[invKey].opening_stock = val;
                self.data.inventory[invKey].last_updated = new Date().toISOString();
            }
        });

        this.saveData();
        this.toast('Opening stock saved', 'success');
        this.navigate('inventory');
    },

    // ============================================================
    // STOCK MOVEMENTS — Chronological Movement Log
    // ============================================================

    renderStockMovements(el) {
        if (!this.currentBranch) { el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>'; return; }
        const bid = this.currentBranch.id;
        const month = this.MONTH;
        const daysInMonth = this.DAYS_IN_MONTH;
        var self = this;

        let html = '<div class="sa-page-header"><h1>Stock Movements &mdash; ' + this.currentBranch.name + '</h1>'
            + '<div class="sa-page-actions"><span class="sa-badge sa-badge-info">' + month + '</span></div></div>';

        html += '<div class="sa-info-box" style="margin-bottom:16px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + 'Chronological record of all stock movements for the month: deliveries in, sales out, goods issues, and inter-branch transfers.</div>';

        // Build movements array
        var movements = [];

        for (var d = 1; d <= daysInMonth; d++) {
            var ds = month + '-' + String(d).padStart(2, '0');
            var key = self.bk(bid, ds);

            // Deliveries IN
            self.data.fuelDeliveries.filter(function(fd) {
                return fd.branch_id === bid && fd.delivery_date === ds && !fd.is_deleted;
            }).forEach(function(fd) {
                movements.push({
                    date: ds,
                    type: 'Delivery',
                    direction: 'IN',
                    product: fd.product_type,
                    quantity: self.parseNum(fd.loaded_qty),
                    reference: fd.delivery_note || 'DN',
                    details: 'Delivery from supplier'
                });
            });

            // Sales OUT (from pump readings)
            var calc = self.calculateDate(bid, ds);
            if (calc.pmsVolume > 0) {
                movements.push({
                    date: ds,
                    type: 'Sales',
                    direction: 'OUT',
                    product: 'PMS',
                    quantity: calc.pmsVolume,
                    reference: '',
                    details: 'Pump sales'
                });
            }
            if (calc.agoVolume > 0) {
                movements.push({
                    date: ds,
                    type: 'Sales',
                    direction: 'OUT',
                    product: 'AGO',
                    quantity: calc.agoVolume,
                    reference: '',
                    details: 'Pump sales'
                });
            }

            // Goods Issues OUT
            var giEntries = self._activeRecords(self.data.goodsIssues[key] || []);
            giEntries.forEach(function(g) {
                movements.push({
                    date: ds,
                    type: 'Goods Issue',
                    direction: 'OUT',
                    product: g.product,
                    quantity: self.parseNum(g.volume),
                    reference: g.ref_number || '',
                    details: g.number_plate || 'Vehicle'
                });
            });

            // Branch Transfers
            if (self.data.branchTransfers) {
                self._activeRecords(self.data.branchTransfers).filter(function(t) {
                    return t.transfer_date === ds && (t.from_branch_id === bid || t.to_branch_id === bid);
                }).forEach(function(t) {
                    var isIncoming = t.to_branch_id === bid;
                    var fromBranch = self._findById(self.data.branches, t.from_branch_id);
                    var toBranch = self._findById(self.data.branches, t.to_branch_id);
                    movements.push({
                        date: ds,
                        type: 'Transfer',
                        direction: isIncoming ? 'IN' : 'OUT',
                        product: t.product || 'PMS',
                        quantity: self.parseNum(t.quantity || t.amount),
                        reference: t.ref_number || '',
                        details: isIncoming ? 'From ' + (fromBranch ? fromBranch.name : 'Unknown') : 'To ' + (toBranch ? toBranch.name : 'Unknown')
                    });
                });
            }
        }

        // Summary cards
        var totalIn = 0, totalOut = 0;
        movements.forEach(function(m) {
            if (m.direction === 'IN') totalIn += m.quantity;
            else totalOut += m.quantity;
        });

        html += '<div class="sa-stats">';
        html += '<div class="sa-stat-card"><div class="stat-label">Total Stock In</div><div class="stat-value" style="color:#059669;">+' + self.fmt(totalIn, 1) + ' L</div></div>';
        html += '<div class="sa-stat-card"><div class="stat-label">Total Stock Out</div><div class="stat-value" style="color:#DC2626;">-' + self.fmt(totalOut, 1) + ' L</div></div>';
        html += '<div class="sa-stat-card"><div class="stat-label">Net Movement</div><div class="stat-value">' + self.fmt(totalIn - totalOut, 1) + ' L</div></div>';
        html += '<div class="sa-stat-card"><div class="stat-label">Total Transactions</div><div class="stat-value">' + movements.length + '</div></div>';
        html += '</div>';

        // Movements table
        html += '<div class="sa-section"><div class="sa-section-header" style="background:linear-gradient(135deg,#7C3AED 0%,#A78BFA 100%);">'
            + '<div class="sa-section-title" style="color:#fff;">All Movements &mdash; ' + month + '</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Date</th><th>Type</th><th>Direction</th><th>Product</th><th class="text-right">Quantity (L)</th><th>Reference</th><th>Details</th></tr></thead><tbody>';

        if (movements.length === 0) {
            html += '<tr><td colspan="7" class="text-center text-muted" style="padding:24px;">No stock movements recorded this month.</td></tr>';
        } else {
            movements.forEach(function(m) {
                var dirBadge = m.direction === 'IN'
                    ? '<span class="sa-badge sa-badge-success">IN</span>'
                    : '<span class="sa-badge sa-badge-danger">OUT</span>';
                var prodBadge = m.product === 'PMS'
                    ? '<span class="sa-badge sa-badge-warning">PMS</span>'
                    : '<span class="sa-badge sa-badge-info">AGO</span>';
                var qtyColor = m.direction === 'IN' ? '#059669' : '#DC2626';
                var qtyPrefix = m.direction === 'IN' ? '+' : '-';

                html += '<tr>';
                html += '<td>' + self.formatDate(m.date) + '</td>';
                html += '<td>' + m.type + '</td>';
                html += '<td>' + dirBadge + '</td>';
                html += '<td>' + prodBadge + '</td>';
                html += '<td class="text-right mono" style="color:' + qtyColor + ';">' + qtyPrefix + self.fmt(m.quantity, 1) + '</td>';
                html += '<td class="text-muted">' + (m.reference || '-') + '</td>';
                html += '<td class="text-muted">' + (m.details || '-') + '</td>';
                html += '</tr>';
            });
        }

        html += '</tbody></table></div></div></div>';

        el.innerHTML = html;
    },

    // ============================================================
    // REVENUE COLLECTIONS — Daily Revenue Summary
    // ============================================================

    renderRevenueCollections(el) {
        if (!this.currentBranch) { el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>'; return; }
        const bid = this.currentBranch.id;
        const month = this.MONTH;
        const daysInMonth = this.DAYS_IN_MONTH;
        var self = this;

        let html = '<div class="sa-page-header"><h1>Revenue Collections &mdash; ' + this.currentBranch.name + '</h1>'
            + '<div class="sa-page-actions"><span class="sa-badge sa-badge-info">' + month + '</span></div></div>';

        html += '<div class="sa-info-box" style="margin-bottom:16px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + 'Daily summary of all revenue streams: cash, digital payments, credit sales, and banking records for the month.</div>';

        // Build daily revenue data
        var dailyData = [];
        var totals = { expected: 0, cash: 0, digital: 0, credit: 0, expenses: 0, collections: 0, banked: 0, variance: 0 };

        for (var d = 1; d <= daysInMonth; d++) {
            var ds = month + '-' + String(d).padStart(2, '0');
            var key = self.bk(bid, ds);
            var sd = self.data.shiftDates[key];
            if (!sd) continue;

            var calc = self.calculateDate(bid, ds);

            var cashInHand = self.parseNum(sd.cash_in_hand);
            var momopay = self.calcDigitalTotal('momoTransactions', bid, ds);
            var mpesa = self.calcDigitalTotal('mpesaTransactions', bid, ds);
            var airtelMoney = self.calcDigitalTotal('airtelTransactions', bid, ds);
            var dollar = self.calcDigitalTotal('dollarTransactions', bid, ds);
            var flexipay = self.calcDigitalTotal('flexipayTransactions', bid, ds);
            var digitalTotal = momopay + mpesa + airtelMoney + dollar + flexipay;

            var totalExpenses = self.calcTotalExpenses(bid, ds);
            var totalCredit = self.calcTotalCreditSales(bid, ds);
            var totalGI = self.calcTotalGoodsIssues(bid, ds);
            var totalDiscount = self.calcTotalDiscount(bid, ds);
            var totalShortages = self.calcTotalShortages(bid, ds);
            var totalCollections = cashInHand + digitalTotal + totalExpenses + totalDiscount + totalShortages + totalCredit + totalGI;
            var expected = calc.totalExpected;
            var variance = expected - totalCollections;

            // Banking
            var ctb = self.data.cashToBank[key] || {};
            var banked = self.parseNum(ctb.actualBanked);

            dailyData.push({
                date: ds,
                expected: expected,
                cash: cashInHand,
                digital: digitalTotal,
                credit: totalCredit,
                expenses: totalExpenses + totalDiscount + totalShortages + totalGI,
                collections: totalCollections,
                banked: banked,
                variance: variance
            });

            totals.expected += expected;
            totals.cash += cashInHand;
            totals.digital += digitalTotal;
            totals.credit += totalCredit;
            totals.expenses += totalExpenses + totalDiscount + totalShortages + totalGI;
            totals.collections += totalCollections;
            totals.banked += banked;
            totals.variance += variance;
        }

        // Summary cards
        html += '<div class="sa-stats">';
        html += '<div class="sa-stat-card"><div class="stat-label">Expected Revenue</div><div class="stat-value">' + self.fmtInt(totals.expected) + '</div></div>';
        html += '<div class="sa-stat-card"><div class="stat-label">Total Collections</div><div class="stat-value">' + self.fmtInt(totals.collections) + '</div></div>';
        html += '<div class="sa-stat-card"><div class="stat-label">Total Banked</div><div class="stat-value" style="color:#059669;">' + self.fmtInt(totals.banked) + '</div></div>';
        var varColor = totals.variance > 0 ? '#DC2626' : totals.variance < 0 ? '#D97706' : '#059669';
        html += '<div class="sa-stat-card"><div class="stat-label">Net Variance</div><div class="stat-value" style="color:' + varColor + ';">' + self.fmtInt(totals.variance) + '</div></div>';
        html += '</div>';

        // Revenue table
        html += '<div class="sa-section"><div class="sa-section-header" style="background:linear-gradient(135deg,#0891B2 0%,#22D3EE 100%);">'
            + '<div class="sa-section-title" style="color:#fff;">Daily Revenue &mdash; ' + month + '</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Date</th><th class="text-right">Expected</th><th class="text-right">Cash</th>'
            + '<th class="text-right">Digital</th><th class="text-right">Credit</th><th class="text-right">Other</th>'
            + '<th class="text-right">Collections</th><th class="text-right">Banked</th><th class="text-right">Variance</th></tr></thead><tbody>';

        if (dailyData.length === 0) {
            html += '<tr><td colspan="9" class="text-center text-muted" style="padding:24px;">No revenue data for this month.</td></tr>';
        } else {
            dailyData.forEach(function(row) {
                var varClass = row.variance > 0 ? 'color:#DC2626;' : row.variance < 0 ? 'color:#D97706;' : 'color:#059669;';
                html += '<tr>';
                html += '<td>' + self.formatDate(row.date) + '</td>';
                html += '<td class="text-right mono">' + self.fmtInt(row.expected) + '</td>';
                html += '<td class="text-right mono">' + self.fmtInt(row.cash) + '</td>';
                html += '<td class="text-right mono">' + self.fmtInt(row.digital) + '</td>';
                html += '<td class="text-right mono">' + self.fmtInt(row.credit) + '</td>';
                html += '<td class="text-right mono">' + self.fmtInt(row.expenses) + '</td>';
                html += '<td class="text-right mono text-bold">' + self.fmtInt(row.collections) + '</td>';
                html += '<td class="text-right mono" style="color:#059669;">' + self.fmtInt(row.banked) + '</td>';
                html += '<td class="text-right mono" style="' + varClass + '">' + self.fmtInt(row.variance) + '</td>';
                html += '</tr>';
            });

            // Totals row
            html += '<tr class="total-row">';
            html += '<td class="text-bold">TOTALS</td>';
            html += '<td class="text-right mono text-bold">' + self.fmtInt(totals.expected) + '</td>';
            html += '<td class="text-right mono text-bold">' + self.fmtInt(totals.cash) + '</td>';
            html += '<td class="text-right mono text-bold">' + self.fmtInt(totals.digital) + '</td>';
            html += '<td class="text-right mono text-bold">' + self.fmtInt(totals.credit) + '</td>';
            html += '<td class="text-right mono text-bold">' + self.fmtInt(totals.expenses) + '</td>';
            html += '<td class="text-right mono text-bold">' + self.fmtInt(totals.collections) + '</td>';
            html += '<td class="text-right mono text-bold">' + self.fmtInt(totals.banked) + '</td>';
            var totVarColor = totals.variance > 0 ? 'color:#DC2626;' : totals.variance < 0 ? 'color:#D97706;' : 'color:#059669;';
            html += '<td class="text-right mono text-bold" style="' + totVarColor + '">' + self.fmtInt(totals.variance) + '</td>';
            html += '</tr>';
        }

        html += '</tbody></table></div></div></div>';

        // Collection breakdown pie
        if (totals.collections > 0) {
            html += '<div class="sa-section"><div class="sa-section-header green"><div class="sa-section-title">Collection Breakdown</div></div>'
                + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
            html += '<thead><tr><th>Category</th><th class="text-right">Amount (UGX)</th><th class="text-right">% of Total</th></tr></thead><tbody>';

            var breakdown = [
                { label: 'Cash in Hand', amount: totals.cash, color: '#059669' },
                { label: 'Digital Payments', amount: totals.digital, color: '#2563EB' },
                { label: 'Credit Sales', amount: totals.credit, color: '#D97706' },
                { label: 'Expenses & Others', amount: totals.expenses, color: '#DC2626' }
            ];

            breakdown.forEach(function(item) {
                var pct = totals.collections > 0 ? (item.amount / totals.collections * 100) : 0;
                html += '<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + item.color + ';margin-right:8px;"></span>' + item.label + '</td>';
                html += '<td class="text-right mono">' + self.fmtInt(item.amount) + '</td>';
                html += '<td class="text-right mono">' + self.fmt(pct, 1) + '%</td></tr>';
            });

            html += '</tbody></table></div></div></div>';
        }

        el.innerHTML = html;
    },

    // ============================================================
    // SUPPLIER STATEMENT — Gasco Energy Head Office Account
    // ============================================================

    renderSupplierStatement(el) {
        if (!this.currentBranch) { el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>'; return; }
        const bid = this.currentBranch.id;
        const month = this.MONTH;
        const daysInMonth = this.DAYS_IN_MONTH;
        var self = this;

        var supplier = this.data.suppliers[0] || { name: 'Gasco Energy Head Office' };

        let html = '<div class="sa-page-header"><h1>Supplier Statement &mdash; ' + this.currentBranch.name + '</h1>'
            + '<div class="sa-page-actions"><button class="sa-btn sa-btn-primary" onclick="SA.showAddSupplierPayment()">+ Record Payment</button></div></div>';

        html += '<div class="sa-info-box" style="margin-bottom:16px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + 'Statement of account with <strong>' + supplier.name + '</strong>. Deliveries received are debits (you owe), payments made are credits (you paid). Balance shows the outstanding amount.</div>';

        // Get or init supplier statement data
        var stKey = bid + '_' + month;
        if (!this.data.supplierStatements[stKey]) this.data.supplierStatements[stKey] = { opening_balance: 0, payments: [] };
        var stmt = this.data.supplierStatements[stKey];

        // Build statement entries
        var entries = [];

        // Opening balance
        var runningBalance = self.parseNum(stmt.opening_balance);

        // Add deliveries as debits
        for (var d = 1; d <= daysInMonth; d++) {
            var ds = month + '-' + String(d).padStart(2, '0');

            var dayDeliveries = self.data.fuelDeliveries.filter(function(fd) {
                return fd.branch_id === bid && fd.delivery_date === ds && !fd.is_deleted;
            });

            dayDeliveries.forEach(function(fd) {
                var qty = self.parseNum(fd.loaded_qty);
                var rate = self.parseNum(fd.unit_price || fd.cost_price || 0);
                var amount = qty * rate;
                if (amount <= 0) amount = qty * self.parseNum(fd.total_cost) / (qty || 1);
                if (amount <= 0) amount = self.parseNum(fd.total_cost);

                entries.push({
                    date: ds,
                    type: 'Delivery',
                    description: fd.product_type + ' - ' + self.fmt(qty, 0) + 'L @ ' + self.fmtInt(rate) + '/L',
                    debit: amount,
                    credit: 0,
                    reference: fd.delivery_note || ''
                });
            });
        }

        // Add payments as credits
        var payments = self._activeRecords(stmt.payments || []);
        payments.forEach(function(p) {
            entries.push({
                date: p.date,
                type: 'Payment',
                description: p.description || 'Payment to supplier',
                debit: 0,
                credit: self.parseNum(p.amount),
                reference: p.reference || '',
                _paymentId: p._id
            });
        });

        // Sort by date
        entries.sort(function(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });

        // Calculate running balances
        var totalDebits = 0, totalCredits = 0;
        entries.forEach(function(e) {
            totalDebits += e.debit;
            totalCredits += e.credit;
            runningBalance += e.debit - e.credit;
            e.balance = runningBalance;
        });

        var closingBalance = self.parseNum(stmt.opening_balance) + totalDebits - totalCredits;

        // Summary cards
        html += '<div class="sa-stats">';
        html += '<div class="sa-stat-card"><div class="stat-label">Opening Balance</div><div class="stat-value">' + self.fmtInt(stmt.opening_balance) + '</div></div>';
        html += '<div class="sa-stat-card"><div class="stat-label">Deliveries (Debit)</div><div class="stat-value" style="color:#DC2626;">' + self.fmtInt(totalDebits) + '</div></div>';
        html += '<div class="sa-stat-card"><div class="stat-label">Payments (Credit)</div><div class="stat-value" style="color:#059669;">' + self.fmtInt(totalCredits) + '</div></div>';
        var balColor = closingBalance > 0 ? '#DC2626' : '#059669';
        html += '<div class="sa-stat-card"><div class="stat-label">Closing Balance</div><div class="stat-value" style="color:' + balColor + ';">' + self.fmtInt(closingBalance) + '</div></div>';
        html += '</div>';

        // Opening balance editor
        html += '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">Opening Balance</div></div>'
            + '<div class="sa-section-body"><div style="display:flex;gap:16px;align-items:flex-end;">'
            + '<div class="sa-form-group" style="min-width:250px;">'
            + '<label>Opening Balance for ' + month + ' (UGX)</label>'
            + '<input type="text" class="sa-input mono" id="supplierOpeningBal" value="' + (stmt.opening_balance || '') + '" placeholder="0">'
            + '</div>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveSupplierOpeningBalance()">Save</button>'
            + '</div></div></div>';

        // Statement table
        html += '<div class="sa-section"><div class="sa-section-header" style="background:linear-gradient(135deg,#B45309 0%,#F59E0B 100%);">'
            + '<div class="sa-section-title" style="color:#fff;">Account Statement &mdash; ' + month + '</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Reference</th>'
            + '<th class="text-right">Debit (UGX)</th><th class="text-right">Credit (UGX)</th><th class="text-right">Balance (UGX)</th><th style="width:40px;"></th></tr></thead><tbody>';

        // Opening balance row
        html += '<tr style="background:var(--sa-bg);"><td colspan="4" class="text-bold">Opening Balance</td>'
            + '<td></td><td></td><td class="text-right mono text-bold">' + self.fmtInt(stmt.opening_balance) + '</td><td></td></tr>';

        if (entries.length === 0) {
            html += '<tr><td colspan="8" class="text-center text-muted" style="padding:24px;">No transactions this month. Deliveries and payments will appear here.</td></tr>';
        } else {
            entries.forEach(function(e) {
                var isPayment = e.type === 'Payment';
                html += '<tr>';
                html += '<td>' + self.formatDate(e.date) + '</td>';
                html += '<td>' + (isPayment ? '<span class="sa-badge sa-badge-success">Payment</span>' : '<span class="sa-badge sa-badge-danger">Delivery</span>') + '</td>';
                html += '<td>' + e.description + '</td>';
                html += '<td class="text-muted">' + (e.reference || '-') + '</td>';
                html += '<td class="text-right mono" style="color:#DC2626;">' + (e.debit > 0 ? self.fmtInt(e.debit) : '-') + '</td>';
                html += '<td class="text-right mono" style="color:#059669;">' + (e.credit > 0 ? self.fmtInt(e.credit) : '-') + '</td>';
                html += '<td class="text-right mono text-bold">' + self.fmtInt(e.balance) + '</td>';
                html += '<td>' + (isPayment ? '<button class="sa-remove-btn" onclick="SA.removeSupplierPayment(\'' + (e._paymentId || '') + '\')">&times;</button>' : '') + '</td>';
                html += '</tr>';
            });
        }

        // Closing balance row
        html += '<tr class="total-row"><td colspan="4" class="text-bold">Closing Balance</td>';
        html += '<td class="text-right mono text-bold" style="color:#DC2626;">' + self.fmtInt(totalDebits) + '</td>';
        html += '<td class="text-right mono text-bold" style="color:#059669;">' + self.fmtInt(totalCredits) + '</td>';
        html += '<td class="text-right mono text-bold" style="color:' + balColor + ';">' + self.fmtInt(closingBalance) + '</td><td></td></tr>';

        html += '</tbody></table></div></div></div>';

        el.innerHTML = html;
    },

    saveSupplierOpeningBalance() {
        if (!this.hasPermission('edit_transactions')) { this.toast('Permission denied', 'error'); return; }
        var bid = this.currentBranch.id;
        var stKey = bid + '_' + this.MONTH;
        if (!this.data.supplierStatements[stKey]) this.data.supplierStatements[stKey] = { opening_balance: 0, payments: [] };
        var input = document.getElementById('supplierOpeningBal');
        if (input) {
            this.data.supplierStatements[stKey].opening_balance = this.parseNum(input.value);
        }
        this.saveData();
        this.toast('Opening balance saved', 'success');
        this.navigate('supplier_statement');
    },

    showAddSupplierPayment() {
        if (!this.currentBranch) { this.toast('Select a branch first', 'error'); return; }
        if (!this.hasPermission('edit_transactions')) { this.toast('Permission denied', 'error'); return; }

        var html = '<div class="sa-form-row">'
            + '<div class="sa-form-group"><label>Payment Date</label><input type="date" class="sa-input" id="spDate" value="' + this.todayStr() + '" min="' + this.monthStart() + '" max="' + this.monthEnd() + '"></div>'
            + '<div class="sa-form-group"><label>Amount (UGX)</label><input type="text" class="sa-input mono" id="spAmount" placeholder="0"></div>'
            + '</div>'
            + '<div class="sa-form-row">'
            + '<div class="sa-form-group"><label>Reference / Receipt No.</label><input type="text" class="sa-input" id="spRef" placeholder="e.g. REC-001"></div>'
            + '<div class="sa-form-group"><label>Description</label><input type="text" class="sa-input" id="spDesc" placeholder="Payment to supplier"></div>'
            + '</div>'
            + '<div class="sa-modal-actions">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.saveSupplierPayment()">Save Payment</button>'
            + '</div>';
        this.openModal('Record Payment — ' + this.currentBranch.name, html);
    },

    saveSupplierPayment() {
        var date = document.getElementById('spDate').value;
        var amount = this.parseNum(document.getElementById('spAmount').value);
        var ref = document.getElementById('spRef').value.trim();
        var desc = document.getElementById('spDesc').value.trim();

        if (!date) { this.toast('Please select a date', 'error'); return; }
        if (amount <= 0) { this.toast('Please enter a valid amount', 'error'); return; }

        var bid = this.currentBranch.id;
        var stKey = bid + '_' + this.MONTH;
        if (!this.data.supplierStatements[stKey]) this.data.supplierStatements[stKey] = { opening_balance: 0, payments: [] };

        var stamp = this._auditStamp();
        this.data.supplierStatements[stKey].payments.push({
            _id: this.uid(),
            date: date,
            amount: amount,
            reference: ref,
            description: desc || 'Payment to supplier',
            created_at: stamp.created_at,
            created_by: stamp.created_by,
            updated_at: stamp.updated_at,
            updated_by: stamp.updated_by
        });

        this.saveData();
        this.closeModal();
        this.toast('Payment recorded', 'success');
        this.navigate('supplier_statement');
    },

    removeSupplierPayment(id) {
        if (!id) return;
        if (!confirm('Are you sure you want to delete this payment?')) return;
        var bid = this.currentBranch.id;
        var stKey = bid + '_' + this.MONTH;
        var stmt = this.data.supplierStatements[stKey];
        if (!stmt || !stmt.payments) return;
        var entry = this._findById(stmt.payments, id);
        if (entry) {
            this._softDelete(entry);
            this.saveData();
            this.navigate('supplier_statement');
            this.toast('Payment deleted', 'success');
        }
    },

    // ============================================================
    // FUEL STATEMENT — Branch-wise (Head Office as Supplier)
    // ============================================================

    // Get opening balance for a branch in a given month
    getFuelStatementOpeningBalance(branchId, month) {
        // Check if there's a manual opening balance for this month
        const manual = this.data.fuelStatementOpeningBalances.find(
            ob => ob.branch_id === branchId && ob.month === month
        );
        if (manual) return this.parseNum(manual.amount);

        // Auto carry-forward: get previous month's closing balance
        const parts = month.split('-');
        let y = parseInt(parts[0]), m = parseInt(parts[1]) - 1;
        m--;
        if (m < 0) { m = 11; y--; }
        const prevMonth = y + '-' + String(m + 1).padStart(2, '0');

        // Check if we have any data for the previous month
        const prevEntries = this.data.fuelStatementEntries.filter(
            e => e.branch_id === branchId && e.date && e.date.startsWith(prevMonth)
        );
        const prevManual = this.data.fuelStatementOpeningBalances.find(
            ob => ob.branch_id === branchId && ob.month === prevMonth
        );

        if (!prevManual && prevEntries.length === 0) {
            // No previous data exists — check further back recursively but limit depth
            return 0;
        }

        // Calculate previous month's closing balance
        const prevOpening = this.getFuelStatementOpeningBalance(branchId, prevMonth);
        const prevDebits = this._getFuelStatementDebits(branchId, prevMonth);
        const prevCredits = this._getFuelStatementCredits(branchId, prevMonth);
        const totalDebits = prevDebits.reduce((s, e) => s + this.parseNum(e.amount), 0);
        const totalCredits = prevCredits.reduce((s, e) => s + this.parseNum(e.amount), 0);
        return prevOpening + totalDebits - totalCredits;
    },

    // Get all debit entries for a branch in a month (fuel deliveries + HO expenses)
    _getFuelStatementDebits(branchId, month) {
        const entries = this.data.fuelStatementEntries.filter(
            e => e.branch_id === branchId && e.date && e.date.startsWith(month) && e.entry_type !== 'credit'
        );
        var debits = entries.map(e => ({
            date: e.date,
            description: e.entry_type === 'fuel_delivery'
                ? e.product + ' — ' + this.fmtInt(e.volume) + ' L @ ' + this.fmtInt(e.cost_per_litre) + '/L'
                : e.description,
            type: e.entry_type,
            product: e.product || null,
            volume: e.volume || null,
            cost_per_litre: e.cost_per_litre || null,
            amount: e.entry_type === 'fuel_delivery'
                ? this.parseNum(e.volume) * this.parseNum(e.cost_per_litre)
                : this.parseNum(e.amount),
            category: e.expense_category || null,
            id: e.id
        }));

        // Add inter-branch transfers received (fuel and cash incoming = debits/stock in)
        var self = this;
        var transfers = this._activeRecords(this.data.branchTransfers || []);
        transfers.forEach(function(t) {
            if (t.to_branch_id !== branchId || t.status !== 'Received') return;
            if (!t.transfer_date || !t.transfer_date.startsWith(month)) return;
            var fromBranch = (self.data.branches || []).find(function(b) { return b.id === t.from_branch_id; });
            var fromName = fromBranch ? fromBranch.name : 'Branch';
            if (t.transfer_type === 'Fuel (PMS)' || t.transfer_type === 'Fuel (AGO)') {
                var prod = t.transfer_type === 'Fuel (PMS)' ? 'PMS' : 'AGO';
                // Use cost price from the latest costed delivery or fallback
                var costPerL = self.getLastKnownCost(prod, branchId);
                var qty = self.parseNum(t.quantity);
                debits.push({
                    date: t.transfer_date,
                    description: prod + ' transfer in from ' + fromName + ' — ' + self.fmt(qty, 1) + ' L',
                    type: 'branch_transfer_in',
                    product: prod,
                    volume: qty,
                    cost_per_litre: costPerL,
                    amount: qty * costPerL
                });
            } else if (t.transfer_type === 'Cash') {
                debits.push({
                    date: t.transfer_date,
                    description: 'Cash received from ' + fromName,
                    type: 'branch_transfer_in',
                    amount: self.parseNum(t.amount)
                });
            }
        });

        return debits;
    },

    // Get all credit entries for a branch in a month (bankings + customer bank payments)
    _getFuelStatementCredits(branchId, month) {
        const credits = [];

        // 1. Cash to bank deposits for this branch in this month
        for (let d = 1; d <= 31; d++) {
            const ds = month + '-' + String(d).padStart(2, '0');
            const key = branchId + '_' + ds;
            const ctb = this.data.cashToBank[key];
            if (ctb && ctb.actualBanked !== null && this.parseNum(ctb.actualBanked) > 0) {
                const bank = ctb.bank_id ? this.data.banks.find(b => b.id === ctb.bank_id) : null;
                credits.push({
                    date: ds,
                    description: 'Cash banked' + (bank ? ' — ' + bank.name : ''),
                    type: 'banking',
                    amount: this.parseNum(ctb.actualBanked)
                });
            }
        }

        // 2. Customer payments via Bank Transfer for this branch in this month
        const branchCustomers = this.data.customers.filter(c => c.branch_id === branchId);
        const custIds = branchCustomers.map(c => c.id);
        this.data.customerTransactions.forEach(t => {
            if (t.transaction_type !== 'CREDIT' || t.payment_method !== 'Bank Transfer') return;
            if (!custIds.includes(t.customer_id)) return;
            if (!t.transaction_date || !t.transaction_date.startsWith(month)) return;
            const cust = branchCustomers.find(c => c.id === t.customer_id);
            credits.push({
                date: t.transaction_date,
                description: 'Customer bank payment — ' + (cust ? cust.name : 'Unknown'),
                type: 'customer_bank_payment',
                amount: this.parseNum(t.credit_amount)
            });
        });

        // 3. Inter-branch transfers sent out (fuel and cash outgoing = credits/cash out)
        var self = this;
        var transfers = this._activeRecords(this.data.branchTransfers || []);
        transfers.forEach(function(t) {
            if (t.from_branch_id !== branchId || t.status !== 'Received') return;
            if (!t.transfer_date || !t.transfer_date.startsWith(month)) return;
            var toBranch = (self.data.branches || []).find(function(b) { return b.id === t.to_branch_id; });
            var toName = toBranch ? toBranch.name : 'Branch';
            if (t.transfer_type === 'Fuel (PMS)' || t.transfer_type === 'Fuel (AGO)') {
                var prod = t.transfer_type === 'Fuel (PMS)' ? 'PMS' : 'AGO';
                var recentDel = self.data.fuelDeliveries.filter(function(fd) { return fd.branch_id === branchId && fd.product_type === prod; }).sort(function(a, b) { return (b.delivery_date || '').localeCompare(a.delivery_date || ''); })[0];
                var costPerL = recentDel ? self.parseNum(recentDel.price_per_litre) : 0;
                var qty = self.parseNum(t.quantity);
                credits.push({
                    date: t.transfer_date,
                    description: prod + ' transfer out to ' + toName + ' — ' + self.fmt(qty, 1) + ' L',
                    type: 'branch_transfer_out',
                    amount: qty * costPerL
                });
            } else if (t.transfer_type === 'Cash') {
                credits.push({
                    date: t.transfer_date,
                    description: 'Cash sent to ' + toName,
                    type: 'branch_transfer_out',
                    amount: self.parseNum(t.amount)
                });
            }
        });

        // Sort by date
        credits.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
        return credits;
    },

    // Main render function
    renderFuelStatement(el) {
        if (!this.hasPermission('view_fuel_statement')) {
            el.innerHTML = this._accessDenied('Fuel Statement');
            return;
        }
        if (!this.currentBranch) {
            el.innerHTML = '<div class="sa-empty"><h3>Select a branch first</h3></div>';
            return;
        }

        const bid = this.currentBranch.id;
        const month = this.MONTH;
        const openingBalance = this.getFuelStatementOpeningBalance(bid, month);
        const debits = this._getFuelStatementDebits(bid, month);
        const credits = this._getFuelStatementCredits(bid, month);

        // Combine all entries and sort by date
        const allEntries = [];
        debits.forEach(d => allEntries.push({ ...d, side: 'debit' }));
        credits.forEach(c => allEntries.push({ ...c, side: 'credit' }));
        allEntries.sort((a, b) => {
            if (a.date === b.date) return a.side === 'debit' ? -1 : 1;
            return a.date < b.date ? -1 : 1;
        });

        const totalDebits = debits.reduce((s, e) => s + this.parseNum(e.amount), 0);
        const totalCredits = credits.reduce((s, e) => s + this.parseNum(e.amount), 0);
        const closingBalance = openingBalance + totalDebits - totalCredits;

        // Header
        let html = '<div class="sa-page-header"><h1>Fuel Statement &mdash; ' + this.currentBranch.name + '</h1>'
            + '<div class="sa-page-actions">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.printFuelStatement()">Print / Export</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.showAddFuelEntry()">+ Fuel Delivery</button>'
            + '<button class="sa-btn sa-btn-warning" onclick="SA.showAddHOExpense()">+ HO Expense</button>'
            + '</div></div>';

        // Month display
        html += '<div class="sa-section" style="margin-bottom:16px;"><div class="sa-section-body" style="padding:12px 20px;">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">'
            + '<div style="font-size:0.85rem;color:var(--sa-text-dim);">Statement Period: <strong>' + this.monthLabel() + '</strong></div>'
            + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.showSetFuelOpeningBalance()">Set Opening Balance</button>'
            + '</div></div></div>';

        // Summary cards
        html += '<div class="sa-stats">';
        html += '<div class="sa-stat-card ' + (openingBalance > 0 ? 'warning' : 'success') + '"><div class="stat-label">Opening Balance</div><div class="stat-value">UGX ' + this.fmtInt(openingBalance) + '</div><div class="stat-sub">Brought forward</div></div>';
        html += '<div class="sa-stat-card danger"><div class="stat-label">Total Debits</div><div class="stat-value">UGX ' + this.fmtInt(totalDebits) + '</div><div class="stat-sub">Fuel + HO expenses</div></div>';
        html += '<div class="sa-stat-card success"><div class="stat-label">Total Credits</div><div class="stat-value">UGX ' + this.fmtInt(totalCredits) + '</div><div class="stat-sub">Bankings + customer payments</div></div>';
        html += '<div class="sa-stat-card ' + (closingBalance > 0 ? 'danger' : closingBalance < 0 ? 'success' : 'info') + '"><div class="stat-label">Closing Balance</div><div class="stat-value">UGX ' + this.fmtInt(closingBalance) + '</div><div class="stat-sub">' + (closingBalance > 0 ? 'Branch owes HO' : closingBalance < 0 ? 'HO owes branch' : 'Settled') + '</div></div>';
        html += '</div>';

        // Statement table
        html += '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">Monthly Statement — ' + this.monthLabel() + '</div></div>';
        html += '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Date</th><th>Description</th><th>Product</th><th class="text-right">Volume (L)</th><th class="text-right">Cost/L</th><th class="text-right">Debit (UGX)</th><th class="text-right">Credit (UGX)</th><th class="text-right">Balance (UGX)</th><th style="width:40px;"></th></tr></thead><tbody>';

        // Opening balance row
        let runningBal = openingBalance;
        html += '<tr style="background:rgba(59,130,246,0.06);font-weight:600;">'
            + '<td>—</td><td>Opening Balance</td><td></td><td></td><td></td><td></td><td></td>'
            + '<td class="text-right mono text-bold">' + this.fmtInt(runningBal) + '</td><td></td></tr>';

        // Transaction rows
        allEntries.forEach(e => {
            const debitAmt = e.side === 'debit' ? this.parseNum(e.amount) : 0;
            const creditAmt = e.side === 'credit' ? this.parseNum(e.amount) : 0;
            runningBal += debitAmt - creditAmt;

            html += '<tr>';
            html += '<td style="white-space:nowrap;">' + this.formatDate(e.date) + '</td>';
            html += '<td>' + e.description + '</td>';
            html += '<td>' + (e.product || '') + '</td>';
            html += '<td class="text-right mono">' + (e.volume ? this.fmtInt(e.volume) : '') + '</td>';
            html += '<td class="text-right mono">' + (e.cost_per_litre ? this.fmtInt(e.cost_per_litre) : '') + '</td>';
            html += '<td class="text-right mono">' + (debitAmt > 0 ? '<span class="text-danger">' + this.fmtInt(debitAmt) + '</span>' : '') + '</td>';
            html += '<td class="text-right mono">' + (creditAmt > 0 ? '<span class="text-success">' + this.fmtInt(creditAmt) + '</span>' : '') + '</td>';
            html += '<td class="text-right mono text-bold">' + this.fmtInt(runningBal) + '</td>';
            html += '<td>' + (e.side === 'debit' && e.id ? '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA.removeFuelEntry(\'' + e.id + '\')" title="Remove" style="color:var(--sa-danger);font-size:0.7rem;padding:2px 6px;">&times;</button>' : '') + '</td>';
            html += '</tr>';
        });

        if (allEntries.length === 0) {
            html += '<tr><td colspan="9" class="text-center text-muted" style="padding:30px;">No entries for this month. Add fuel deliveries or HO expenses above.</td></tr>';
        }

        // Totals row
        html += '<tr class="total-row"><td></td><td class="text-bold">TOTALS</td><td></td><td></td><td></td>';
        html += '<td class="text-right mono text-bold text-danger">' + this.fmtInt(totalDebits) + '</td>';
        html += '<td class="text-right mono text-bold text-success">' + this.fmtInt(totalCredits) + '</td>';
        html += '<td class="text-right mono text-bold">' + this.fmtInt(closingBalance) + '</td><td></td></tr>';

        html += '</tbody></table></div></div></div>';

        // Debit breakdown section
        const fuelEntries = debits.filter(d => d.type === 'fuel_delivery');
        const hoExpenses = debits.filter(d => d.type === 'ho_expense');

        if (fuelEntries.length > 0 || hoExpenses.length > 0) {
            html += '<div class="sa-section"><div class="sa-section-header yellow"><div class="sa-section-title">Debit Breakdown</div></div><div class="sa-section-body">';
            html += '<div class="sa-stats">';
            const fuelTotal = fuelEntries.reduce((s, e) => s + this.parseNum(e.amount), 0);
            const hoTotal = hoExpenses.reduce((s, e) => s + this.parseNum(e.amount), 0);
            html += '<div class="sa-stat-card pms"><div class="stat-label">Fuel Deliveries</div><div class="stat-value">UGX ' + this.fmtInt(fuelTotal) + '</div><div class="stat-sub">' + fuelEntries.length + ' deliveries</div></div>';
            html += '<div class="sa-stat-card ago"><div class="stat-label">HO Expenses</div><div class="stat-value">UGX ' + this.fmtInt(hoTotal) + '</div><div class="stat-sub">' + hoExpenses.length + ' entries</div></div>';
            html += '</div>';

            if (hoExpenses.length > 0) {
                html += '<h4 style="margin:16px 0 8px;font-size:0.82rem;color:var(--sa-text-dim);text-transform:uppercase;letter-spacing:1px;">Head Office Expenses</h4>';
                html += '<div class="sa-table-wrap"><table class="sa-table"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="text-right">Amount (UGX)</th></tr></thead><tbody>';
                hoExpenses.forEach(e => {
                    html += '<tr><td>' + this.formatDate(e.date) + '</td><td><span class="sa-badge sa-badge-neutral">' + (e.category || '') + '</span></td><td>' + e.description + '</td>';
                    html += '<td class="text-right mono text-danger">' + this.fmtInt(e.amount) + '</td></tr>';
                });
                html += '</tbody></table></div>';
            }
            html += '</div></div>';
        }

        el.innerHTML = html;
    },

    // Show modal to add a fuel delivery (debit)
    showAddFuelEntry() {
        const html = '<div class="sa-form-group"><label>Delivery Date</label>'
            + '<input class="sa-input" id="fsDate" type="date" value="' + (this.currentDate || this.todayStr()) + '"></div>'
            + '<div class="sa-form-row">'
            + '<div class="sa-form-group"><label>Product</label>'
            + '<select class="sa-input" id="fsProduct"><option value="PMS">PMS (Petrol)</option><option value="AGO">AGO (Diesel)</option></select></div>'
            + '<div class="sa-form-group"><label>Volume (Litres)</label>'
            + '<input class="sa-input" id="fsVolume" type="number" step="1" placeholder="e.g. 10000" oninput="SA._calcFuelTotal()"></div>'
            + '</div>'
            + '<div class="sa-form-row">'
            + '<div class="sa-form-group"><label>Cost per Litre (UGX)</label>'
            + '<input class="sa-input" id="fsCostPerLitre" type="number" step="1" placeholder="e.g. 4200" oninput="SA._calcFuelTotal()"></div>'
            + '<div class="sa-form-group"><label>Total Cost (UGX)</label>'
            + '<input class="sa-input" id="fsTotalCost" type="text" readonly style="background:var(--sa-bg-tertiary);font-weight:700;"></div>'
            + '</div>'
            + '<div style="margin-top:16px;"><button class="sa-btn sa-btn-primary" style="width:100%;padding:12px;font-size:1rem;font-weight:700;" onclick="SA.saveFuelEntry()">Save Fuel Delivery</button></div>';
        this.openModal('Add Fuel Delivery (Debit)', html);
        // Calculate total after modal opens
        setTimeout(() => this._calcFuelTotal(), 100);
    },

    _calcFuelTotal() {
        const vol = this.parseNum(document.getElementById('fsVolume')?.value);
        const cost = this.parseNum(document.getElementById('fsCostPerLitre')?.value);
        const totalEl = document.getElementById('fsTotalCost');
        if (totalEl) totalEl.value = 'UGX ' + this.fmtInt(vol * cost);
    },

    saveFuelEntry() {
        const date = document.getElementById('fsDate')?.value;
        const product = document.getElementById('fsProduct')?.value;
        const volume = this.parseNum(document.getElementById('fsVolume')?.value);
        const costPerLitre = this.parseNum(document.getElementById('fsCostPerLitre')?.value);

        if (!date) { this.toast('Please enter a date', 'error'); return; }
        if (volume <= 0) { this.toast('Please enter volume', 'error'); return; }
        if (costPerLitre <= 0) { this.toast('Please enter cost per litre', 'error'); return; }

        this.data.fuelStatementEntries.push({
            id: this.uid(),
            branch_id: this.currentBranch.id,
            entry_type: 'fuel_delivery',
            date: date,
            product: product,
            volume: volume,
            cost_per_litre: costPerLitre,
            amount: volume * costPerLitre,
            description: product + ' delivery — ' + this.fmtInt(volume) + ' L',
            expense_category: null,
            created_at: new Date().toISOString()
        });
        this.saveData();
        this.closeModal();
        this.toast('Fuel delivery added', 'success');
        this.navigate('fuel_statement');
    },

    // Show modal to add HO expense (debit)
    showAddHOExpense() {
        const categories = ['Rent', 'Equipment & Repairs', 'Security Expenses', 'NSSF', 'PAYE', 'Shareholder Withdrawals'];
        let catOpts = categories.map(c => '<option value="' + c + '">' + c + '</option>').join('');

        const html = '<div class="sa-form-group"><label>Date</label>'
            + '<input class="sa-input" id="hoDate" type="date" value="' + (this.currentDate || this.todayStr()) + '"></div>'
            + '<div class="sa-form-group"><label>Expense Category</label>'
            + '<select class="sa-input" id="hoCategory">' + catOpts + '</select></div>'
            + '<div class="sa-form-group"><label>Description</label>'
            + '<input class="sa-input" id="hoDesc" type="text" placeholder="e.g. January rent payment"></div>'
            + '<div class="sa-form-group"><label>Amount (UGX)</label>'
            + '<input class="sa-input" id="hoAmount" type="number" step="1" placeholder="e.g. 500000"></div>'
            + '<div style="margin-top:16px;"><button class="sa-btn sa-btn-primary" style="width:100%;padding:12px;font-size:1rem;font-weight:700;" onclick="SA.saveHOExpense()">Save HO Expense</button></div>';
        this.openModal('Add Head Office Expense (Debit)', html);
    },

    saveHOExpense() {
        const date = document.getElementById('hoDate')?.value;
        const category = document.getElementById('hoCategory')?.value;
        const desc = document.getElementById('hoDesc')?.value || category;
        const amount = this.parseNum(document.getElementById('hoAmount')?.value);

        if (!date) { this.toast('Please enter a date', 'error'); return; }
        if (amount <= 0) { this.toast('Please enter an amount', 'error'); return; }

        this.data.fuelStatementEntries.push({
            id: this.uid(),
            branch_id: this.currentBranch.id,
            entry_type: 'ho_expense',
            date: date,
            product: null,
            volume: null,
            cost_per_litre: null,
            amount: amount,
            description: desc,
            expense_category: category,
            created_at: new Date().toISOString()
        });
        this.saveData();
        this.closeModal();
        this.toast('HO expense added', 'success');
        this.navigate('fuel_statement');
    },

    // Remove fuel statement entry
    removeFuelEntry(id) {
        if (!confirm('Remove this entry from the fuel statement?')) return;
        this.data.fuelStatementEntries = this.data.fuelStatementEntries.filter(e => e.id !== id);
        this.saveData();
        this.toast('Entry removed', 'success');
        this.navigate('fuel_statement');
    },

    // Set/edit opening balance
    showSetFuelOpeningBalance() {
        const bid = this.currentBranch.id;
        const month = this.MONTH;
        const existing = this.data.fuelStatementOpeningBalances.find(
            ob => ob.branch_id === bid && ob.month === month
        );
        const currentVal = existing ? this.parseNum(existing.amount) : '';

        const html = '<div class="sa-info-box" style="margin-bottom:16px;">'
            + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            + 'Set the opening balance for <strong>' + this.currentBranch.name + '</strong> for <strong>' + this.monthLabel() + '</strong>. '
            + 'This is typically only needed for the first month. After that, it carries forward automatically.</div>'
            + '<div class="sa-form-group"><label>Opening Balance (UGX)</label>'
            + '<input class="sa-input" id="fsOpenBal" type="number" step="1" value="' + currentVal + '" placeholder="e.g. 5000000">'
            + '<div style="font-size:0.75rem;color:var(--sa-text-dim);margin-top:4px;">Positive = branch owes head office. Negative = HO owes branch.</div></div>'
            + '<div style="margin-top:16px;display:flex;gap:8px;">'
            + '<button class="sa-btn sa-btn-primary" style="flex:1;padding:12px;font-weight:700;" onclick="SA.saveFuelOpeningBalance()">Save Opening Balance</button>'
            + (existing ? '<button class="sa-btn sa-btn-danger" style="padding:12px;" onclick="SA.removeFuelOpeningBalance()">Remove Manual Override</button>' : '')
            + '</div>';
        this.openModal('Set Opening Balance — ' + this.monthLabel(), html);
    },

    saveFuelOpeningBalance() {
        const bid = this.currentBranch.id;
        const month = this.MONTH;
        const amount = this.parseNum(document.getElementById('fsOpenBal')?.value);

        // Remove existing for this branch/month
        this.data.fuelStatementOpeningBalances = this.data.fuelStatementOpeningBalances.filter(
            ob => !(ob.branch_id === bid && ob.month === month)
        );

        this.data.fuelStatementOpeningBalances.push({
            branch_id: bid,
            month: month,
            amount: amount,
            is_manual: true,
            created_at: new Date().toISOString()
        });
        this.saveData();
        this.closeModal();
        this.toast('Opening balance set', 'success');
        this.navigate('fuel_statement');
    },

    removeFuelOpeningBalance() {
        const bid = this.currentBranch.id;
        const month = this.MONTH;
        this.data.fuelStatementOpeningBalances = this.data.fuelStatementOpeningBalances.filter(
            ob => !(ob.branch_id === bid && ob.month === month)
        );
        this.saveData();
        this.closeModal();
        this.toast('Manual opening balance removed — will auto carry-forward', 'success');
        this.navigate('fuel_statement');
    },

    // Print fuel statement
    printFuelStatement() {
        if (!this.currentBranch) return;
        const bid = this.currentBranch.id;
        const month = this.MONTH;
        const branchName = this.currentBranch.name;
        const openingBalance = this.getFuelStatementOpeningBalance(bid, month);
        const debits = this._getFuelStatementDebits(bid, month);
        const credits = this._getFuelStatementCredits(bid, month);

        const allEntries = [];
        debits.forEach(d => allEntries.push({ ...d, side: 'debit' }));
        credits.forEach(c => allEntries.push({ ...c, side: 'credit' }));
        allEntries.sort((a, b) => {
            if (a.date === b.date) return a.side === 'debit' ? -1 : 1;
            return a.date < b.date ? -1 : 1;
        });

        const totalDebits = debits.reduce((s, e) => s + this.parseNum(e.amount), 0);
        const totalCredits = credits.reduce((s, e) => s + this.parseNum(e.amount), 0);
        const closingBalance = openingBalance + totalDebits - totalCredits;

        let printHtml = '<!DOCTYPE html><html><head><title>Fuel Statement — ' + branchName + '</title>'
            + '<style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#333;}'
            + 'h1{font-size:18px;margin-bottom:4px;}h2{font-size:14px;color:#666;margin-bottom:20px;}'
            + 'table{width:100%;border-collapse:collapse;margin-bottom:20px;}'
            + 'th,td{border:1px solid #ddd;padding:6px 10px;text-align:left;font-size:11px;}'
            + 'th{background:#f5f5f5;font-weight:bold;}'
            + '.right{text-align:right;}'
            + '.bold{font-weight:bold;}'
            + '.debit{color:#dc2626;}'
            + '.credit{color:#16a34a;}'
            + '.total-row{background:#f0f0f0;font-weight:bold;}'
            + '.summary{display:flex;gap:20px;margin-bottom:20px;}'
            + '.summary-box{border:1px solid #ddd;padding:12px;flex:1;text-align:center;}'
            + '.summary-box .label{font-size:10px;text-transform:uppercase;color:#888;}'
            + '.summary-box .value{font-size:16px;font-weight:bold;margin-top:4px;}'
            + '@media print{body{margin:10px;}}</style></head><body>';

        printHtml += '<h1>FUEL STATEMENT — ' + branchName.toUpperCase() + '</h1>';
        printHtml += '<h2>Gasco Energy Limited | ' + this.monthLabel() + '</h2>';

        printHtml += '<div class="summary">'
            + '<div class="summary-box"><div class="label">Opening Balance</div><div class="value">UGX ' + this.fmtInt(openingBalance) + '</div></div>'
            + '<div class="summary-box"><div class="label">Total Debits</div><div class="value debit">UGX ' + this.fmtInt(totalDebits) + '</div></div>'
            + '<div class="summary-box"><div class="label">Total Credits</div><div class="value credit">UGX ' + this.fmtInt(totalCredits) + '</div></div>'
            + '<div class="summary-box"><div class="label">Closing Balance</div><div class="value">UGX ' + this.fmtInt(closingBalance) + '</div></div>'
            + '</div>';

        printHtml += '<table><thead><tr><th>Date</th><th>Description</th><th>Product</th><th class="right">Volume (L)</th><th class="right">Cost/L</th><th class="right">Debit</th><th class="right">Credit</th><th class="right">Balance</th></tr></thead><tbody>';

        let runBal = openingBalance;
        printHtml += '<tr style="background:#e8f0fe;"><td>—</td><td class="bold">Opening Balance</td><td></td><td></td><td></td><td></td><td></td><td class="right bold">' + this.fmtInt(runBal) + '</td></tr>';

        allEntries.forEach(e => {
            const debitAmt = e.side === 'debit' ? this.parseNum(e.amount) : 0;
            const creditAmt = e.side === 'credit' ? this.parseNum(e.amount) : 0;
            runBal += debitAmt - creditAmt;
            printHtml += '<tr>';
            printHtml += '<td>' + this.formatDate(e.date) + '</td>';
            printHtml += '<td>' + e.description + '</td>';
            printHtml += '<td>' + (e.product || '') + '</td>';
            printHtml += '<td class="right">' + (e.volume ? this.fmtInt(e.volume) : '') + '</td>';
            printHtml += '<td class="right">' + (e.cost_per_litre ? this.fmtInt(e.cost_per_litre) : '') + '</td>';
            printHtml += '<td class="right debit">' + (debitAmt > 0 ? this.fmtInt(debitAmt) : '') + '</td>';
            printHtml += '<td class="right credit">' + (creditAmt > 0 ? this.fmtInt(creditAmt) : '') + '</td>';
            printHtml += '<td class="right bold">' + this.fmtInt(runBal) + '</td>';
            printHtml += '</tr>';
        });

        printHtml += '<tr class="total-row"><td></td><td>TOTALS</td><td></td><td></td><td></td>';
        printHtml += '<td class="right debit">' + this.fmtInt(totalDebits) + '</td>';
        printHtml += '<td class="right credit">' + this.fmtInt(totalCredits) + '</td>';
        printHtml += '<td class="right">' + this.fmtInt(closingBalance) + '</td></tr>';
        printHtml += '</tbody></table>';

        printHtml += '<div style="margin-top:30px;font-size:10px;color:#999;">Generated on ' + new Date().toLocaleString() + ' | Gasco Energy Limited — Confidential</div>';
        printHtml += '</body></html>';

        const w = window.open('', '_blank', 'width=900,height=700');
        w.document.write(printHtml);
        w.document.close();
        w.focus();
        w.print();
    },

    // ============================================================
    // QUICK DATE RANGE SELECTOR
    // ============================================================
    getDateRangePresets() {
        const today = new Date();
        const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
        const fmt = (dt) => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');

        // This week (Mon-Sun)
        const dayOfWeek = today.getDay() || 7;
        const weekStart = new Date(y, m, d - dayOfWeek + 1);
        const weekEnd = new Date(y, m, d - dayOfWeek + 7);

        // Last 7 days
        const last7Start = new Date(y, m, d - 6);

        // This month
        const monthStart = new Date(y, m, 1);
        const monthEnd = new Date(y, m + 1, 0);

        // Last month
        const lastMonthStart = new Date(y, m - 1, 1);
        const lastMonthEnd = new Date(y, m, 0);

        return [
            { label: 'This Week', from: fmt(weekStart), to: fmt(weekEnd) },
            { label: 'Last 7 Days', from: fmt(last7Start), to: fmt(today) },
            { label: 'This Month', from: fmt(monthStart), to: fmt(monthEnd) },
            { label: 'Last Month', from: fmt(lastMonthStart), to: fmt(lastMonthEnd) }
        ];
    },

    renderDateRangeBar(fromId, toId, applyFn) {
        const presets = this.getDateRangePresets();
        let html = '<div class="sa-date-range-bar">';
        presets.forEach(p => {
            html += '<button class="sa-date-range-btn" onclick="'
                + 'document.getElementById(\'' + fromId + '\').value=\'' + p.from + '\';'
                + 'document.getElementById(\'' + toId + '\').value=\'' + p.to + '\';'
                + applyFn + '">' + p.label + '</button>';
        });
        html += '</div>';
        return html;
    },

    // ============================================================
    // DAILY REPORT — Full Day Operational Summary
    // ============================================================

    _dailyReportDate: null,

    reportDailyReport() {
        if (!this.currentBranch) {
            return '<div class="sa-empty"><h3>Select a branch first</h3></div>';
        }
        const ds = this._dailyReportDate || this.currentDate || this.todayStr();
        this._dailyReportDate = ds;
        const bid = this.currentBranch.id;
        const key = this.bk(bid, ds);
        const sd = this.data.shiftDates[key];

        // Date navigation bar
        let html = '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin:16px 0 20px;">'
            + '<div style="display:flex;align-items:center;gap:8px;">'
            + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA._drPrevDate()">&laquo; Prev</button>'
            + '<input type="date" class="sa-input" id="drDatePicker" value="' + ds + '" onchange="SA._drGoDate(this.value)" style="width:170px;text-align:center;font-weight:600;">'
            + '<button class="sa-btn sa-btn-ghost sa-btn-sm" onclick="SA._drNextDate()">Next &raquo;</button>'
            + '</div>'
            + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.exportDailyReportPDF()" style="gap:6px;">'
            + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
            + ' Export PDF</button>'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.exportDailyReportExcel()" style="gap:6px;">'
            + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>'
            + ' Export Excel</button>'
            + '</div></div>';

        if (!sd) {
            html += '<div class="sa-empty" style="padding:60px 20px;"><h3>No shift data for ' + this.formatDate(ds) + '</h3><p class="text-muted">No data has been entered for this date. Please select a date with recorded shift data.</p></div>';
            return html;
        }

        // Gather all data
        const calc = this.calculateDate(bid, ds);
        const ctb = this.calcCashToBank(bid, ds);
        const creditEntries = (this.data.creditSales[key] || []).filter(c => !c.is_voided);
        const expEntries = this.data.expenses[key] || [];
        const discEntries = this.data.discounts[key] || [];
        const pettyCashEntries = this.data.pettyCashEntries.filter(e => e.branch_id === bid && e.date === ds);
        const giEntries = this._activeRecords(this.data.goodsIssues[key] || []);

        // ── HEADER STAT CARDS ──
        const varClass = Math.abs(calc.variance) < 1 ? 'success' : 'danger';
        html += '<div class="sa-stats">';
        html += '<div class="sa-stat-card gold"><div class="stat-label">Expected Revenue</div><div class="stat-value">UGX ' + this.fmtInt(calc.totalExpected) + '</div><div class="stat-sub">' + this.fmt(calc.pmsVolume, 1) + 'L PMS + ' + this.fmt(calc.agoVolume, 1) + 'L AGO</div></div>';
        html += '<div class="sa-stat-card ' + varClass + '"><div class="stat-label">Total Collections</div><div class="stat-value">UGX ' + this.fmtInt(calc.totalCollections) + '</div><div class="stat-sub">Variance: ' + this.fmtInt(calc.variance) + '</div></div>';
        html += '<div class="sa-stat-card pms"><div class="stat-label">PMS Sales</div><div class="stat-value">UGX ' + this.fmtInt(calc.pmsValue) + '</div><div class="stat-sub">' + this.fmt(calc.pmsVolume, 3) + ' L @ ' + this.fmtInt(calc.pmsSP) + '/L</div></div>';
        html += '<div class="sa-stat-card ago"><div class="stat-label">AGO Sales</div><div class="stat-value">UGX ' + this.fmtInt(calc.agoValue) + '</div><div class="stat-sub">' + this.fmt(calc.agoVolume, 3) + ' L @ ' + this.fmtInt(calc.agoSP) + '/L</div></div>';
        html += '</div>';

        // ── SECTION 1: PMS SALES SUMMARY ──
        html += '<div class="sa-section"><div class="sa-section-header" style="background:linear-gradient(135deg,#E8450E 0%,#FF6B35 100%);">'
            + '<div class="sa-section-title" style="color:#fff;">PMS Sales Summary</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Description</th><th class="text-right">Volume (L)</th><th class="text-right">Rate/L (UGX)</th><th class="text-right">Amount (UGX)</th></tr></thead><tbody>';

        const pmsCreditEntries = creditEntries.filter(c => (c.product || 'PMS') === 'PMS');
        let pmsCreditLitres = 0, pmsCreditValue = 0, pmsCreditDiscount = 0;
        pmsCreditEntries.forEach(c => {
            const l = this.parseNum(c.litres), pp = this.parseNum(c.pump_price), sp = this.parseNum(c.selling_price);
            pmsCreditLitres += l; pmsCreditValue += l * sp; pmsCreditDiscount += (l * pp) - (l * sp);
        });
        const pmsDiscEntries = discEntries.filter(d => (d.product || 'PMS') === 'PMS');
        let pmsStandaloneDiscLitres = 0, pmsStandaloneDiscAmt = 0;
        pmsDiscEntries.forEach(d => {
            const l = this.parseNum(d.litres), pp = this.parseNum(d.pump_price), sp = this.parseNum(d.selling_price);
            pmsStandaloneDiscLitres += l; pmsStandaloneDiscAmt += (l * pp) - (l * sp);
        });
        const pmsTotalDiscount = pmsCreditDiscount + pmsStandaloneDiscAmt;
        const pmsGiEntries = giEntries.filter(g => (g.product || 'PMS') === 'PMS');
        let pmsGiLitres = 0, pmsGiValue = 0;
        pmsGiEntries.forEach(g => { const v = this.parseNum(g.volume), r = this.parseNum(g.rate); pmsGiLitres += v; pmsGiValue += v * r; });
        const pmsCashLitres = calc.pmsVolume - pmsCreditLitres - pmsStandaloneDiscLitres - pmsGiLitres;
        const pmsCashValue = pmsCashLitres * calc.pmsSP;

        // Cash Sales — liters at pump price
        html += '<tr><td><strong>Cash Sales</strong> (at pump price)</td>'
            + '<td class="text-right mono">' + this.fmt(pmsCashLitres, 3) + '</td>'
            + '<td class="text-right mono">' + this.fmtInt(calc.pmsSP) + '</td>'
            + '<td class="text-right mono">' + this.fmtInt(pmsCashValue) + '</td></tr>';

        // Credit Sales — summary total only (detail in Credit Sales section below)
        html += '<tr><td><strong>Credit Sales</strong> (' + pmsCreditEntries.length + ' customer' + (pmsCreditEntries.length !== 1 ? 's' : '') + ')</td>'
            + '<td class="text-right mono">' + this.fmt(pmsCreditLitres, 3) + '</td>'
            + '<td class="text-right mono">\u2014</td>'
            + '<td class="text-right mono">' + this.fmtInt(pmsCreditValue) + '</td></tr>';

        // Goods Issue — fuel issued to station vehicles
        pmsGiEntries.forEach(g => {
            const v = this.parseNum(g.volume), r = this.parseNum(g.rate), amt = v * r;
            html += '<tr style="color:#7C3AED;"><td style="padding-left:12px;">Goods Issue: <strong>' + this.fmt(v, 1) + 'L @ ' + this.fmtInt(r) + '/L</strong>' + (g.number_plate ? ' \u2014 ' + g.number_plate : '') + '</td>'
                + '<td class="text-right mono">' + this.fmt(v, 3) + '</td>'
                + '<td class="text-right mono">' + this.fmtInt(r) + '</td>'
                + '<td class="text-right mono">' + this.fmtInt(amt) + '</td></tr>';
        });

        // Discount Sales — each entry individually showing volume @ rate
        pmsDiscEntries.forEach(d => {
            const l = this.parseNum(d.litres), sp = this.parseNum(d.selling_price);
            const net = l * sp;
            html += '<tr style="color:var(--sa-danger);"><td style="padding-left:12px;">Discount: <strong>' + this.fmt(l, 1) + 'L @ ' + this.fmtInt(sp) + '/L</strong>' + (d.customer_name ? ' \u2014 ' + d.customer_name : '') + '</td>'
                + '<td class="text-right mono">' + this.fmt(l, 3) + '</td>'
                + '<td class="text-right mono">' + this.fmtInt(sp) + '</td>'
                + '<td class="text-right mono">' + this.fmtInt(net) + '</td></tr>';
        });

        // Less: Total Discounts
        if (pmsTotalDiscount > 0) {
            html += '<tr style="color:var(--sa-danger);background:rgba(239,68,68,0.04);"><td><strong>Less: Total Discounts</strong></td>'
                + '<td class="text-right mono"></td><td class="text-right mono"></td>'
                + '<td class="text-right mono text-bold">(' + this.fmtInt(pmsTotalDiscount) + ')</td></tr>';
        }

        // Total PMS
        html += '<tr class="total-row"><td class="text-bold">TOTAL PMS REVENUE</td>'
            + '<td class="text-right mono text-bold">' + this.fmt(calc.pmsVolume, 3) + '</td>'
            + '<td class="text-right mono"></td>'
            + '<td class="text-right mono text-bold">' + this.fmtInt(calc.pmsValue) + '</td></tr>';
        html += '</tbody></table></div></div></div>';

        // ── SECTION 2: AGO SALES SUMMARY ──
        html += '<div class="sa-section"><div class="sa-section-header" style="background:linear-gradient(135deg,#2563EB 0%,#3B82F6 100%);">'
            + '<div class="sa-section-title" style="color:#fff;">AGO Sales Summary</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Description</th><th class="text-right">Volume (L)</th><th class="text-right">Rate/L (UGX)</th><th class="text-right">Amount (UGX)</th></tr></thead><tbody>';

        const agoCreditEntries = creditEntries.filter(c => c.product === 'AGO');
        let agoCreditLitres = 0, agoCreditValue = 0, agoCreditDiscount = 0;
        agoCreditEntries.forEach(c => {
            const l = this.parseNum(c.litres), pp = this.parseNum(c.pump_price), sp = this.parseNum(c.selling_price);
            agoCreditLitres += l; agoCreditValue += l * sp; agoCreditDiscount += (l * pp) - (l * sp);
        });
        const agoDiscEntries = discEntries.filter(d => d.product === 'AGO');
        let agoStandaloneDiscLitres = 0, agoStandaloneDiscAmt = 0;
        agoDiscEntries.forEach(d => {
            const l = this.parseNum(d.litres), pp = this.parseNum(d.pump_price), sp = this.parseNum(d.selling_price);
            agoStandaloneDiscLitres += l; agoStandaloneDiscAmt += (l * pp) - (l * sp);
        });
        const agoTotalDiscount = agoCreditDiscount + agoStandaloneDiscAmt;
        const agoGiEntries = giEntries.filter(g => g.product === 'AGO');
        let agoGiLitres = 0, agoGiValue = 0;
        agoGiEntries.forEach(g => { const v = this.parseNum(g.volume), r = this.parseNum(g.rate); agoGiLitres += v; agoGiValue += v * r; });
        const agoCashLitres = calc.agoVolume - agoCreditLitres - agoStandaloneDiscLitres - agoGiLitres;
        const agoCashValue = agoCashLitres * calc.agoSP;

        // Cash Sales — liters at pump price
        html += '<tr><td><strong>Cash Sales</strong> (at pump price)</td>'
            + '<td class="text-right mono">' + this.fmt(agoCashLitres, 3) + '</td>'
            + '<td class="text-right mono">' + this.fmtInt(calc.agoSP) + '</td>'
            + '<td class="text-right mono">' + this.fmtInt(agoCashValue) + '</td></tr>';

        // Credit Sales — summary total only
        html += '<tr><td><strong>Credit Sales</strong> (' + agoCreditEntries.length + ' customer' + (agoCreditEntries.length !== 1 ? 's' : '') + ')</td>'
            + '<td class="text-right mono">' + this.fmt(agoCreditLitres, 3) + '</td>'
            + '<td class="text-right mono">\u2014</td>'
            + '<td class="text-right mono">' + this.fmtInt(agoCreditValue) + '</td></tr>';

        // Goods Issue — fuel issued to station vehicles
        agoGiEntries.forEach(g => {
            const v = this.parseNum(g.volume), r = this.parseNum(g.rate), amt = v * r;
            html += '<tr style="color:#7C3AED;"><td style="padding-left:12px;">Goods Issue: <strong>' + this.fmt(v, 1) + 'L @ ' + this.fmtInt(r) + '/L</strong>' + (g.number_plate ? ' \u2014 ' + g.number_plate : '') + '</td>'
                + '<td class="text-right mono">' + this.fmt(v, 3) + '</td>'
                + '<td class="text-right mono">' + this.fmtInt(r) + '</td>'
                + '<td class="text-right mono">' + this.fmtInt(amt) + '</td></tr>';
        });

        // Discount Sales — each entry individually showing volume @ rate
        agoDiscEntries.forEach(d => {
            const l = this.parseNum(d.litres), sp = this.parseNum(d.selling_price);
            const net = l * sp;
            html += '<tr style="color:var(--sa-danger);"><td style="padding-left:12px;">Discount: <strong>' + this.fmt(l, 1) + 'L @ ' + this.fmtInt(sp) + '/L</strong>' + (d.customer_name ? ' \u2014 ' + d.customer_name : '') + '</td>'
                + '<td class="text-right mono">' + this.fmt(l, 3) + '</td>'
                + '<td class="text-right mono">' + this.fmtInt(sp) + '</td>'
                + '<td class="text-right mono">' + this.fmtInt(net) + '</td></tr>';
        });

        // Less: Total Discounts
        if (agoTotalDiscount > 0) {
            html += '<tr style="color:var(--sa-danger);background:rgba(239,68,68,0.04);"><td><strong>Less: Total Discounts</strong></td>'
                + '<td class="text-right mono"></td><td class="text-right mono"></td>'
                + '<td class="text-right mono text-bold">(' + this.fmtInt(agoTotalDiscount) + ')</td></tr>';
        }

        // Total AGO
        html += '<tr class="total-row"><td class="text-bold">TOTAL AGO REVENUE</td>'
            + '<td class="text-right mono text-bold">' + this.fmt(calc.agoVolume, 3) + '</td>'
            + '<td class="text-right mono"></td>'
            + '<td class="text-right mono text-bold">' + this.fmtInt(calc.agoValue) + '</td></tr>';
        html += '</tbody></table></div></div></div>';

        // ── SECTION 3: BANKING SUMMARY ──
        html += '<div class="sa-section"><div class="sa-section-header" style="background:linear-gradient(135deg,#059669 0%,#10B981 100%);">'
            + '<div class="sa-section-title" style="color:#fff;">Banking Summary</div></div>'
            + '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
        html += '<thead><tr><th>Item</th><th class="text-right">Amount (UGX)</th></tr></thead><tbody>';
        html += '<tr><td>Cash in Hand</td><td class="text-right mono">' + this.fmtInt(calc.cashInHand) + '</td></tr>';
        html += '<tr><td>MomoPay Collections</td><td class="text-right mono">' + this.fmtInt(calc.momopay) + '</td></tr>';
        html += '<tr><td>Airtel Money Collections</td><td class="text-right mono">' + this.fmtInt(calc.airtelMoney) + '</td></tr>';
        html += '<tr><td>M-Pesa Collections</td><td class="text-right mono">' + this.fmtInt(calc.mpesa) + '</td></tr>';
        html += '<tr><td>Dollar Collections</td><td class="text-right mono">' + this.fmtInt(calc.dollar) + '</td></tr>';
        html += '<tr><td>FlexiPay Collections</td><td class="text-right mono">' + this.fmtInt(calc.flexipay) + '</td></tr>';
        const digitalTotal = calc.momopay + calc.airtelMoney + calc.mpesa + calc.dollar + calc.flexipay;
        html += '<tr style="background:rgba(59,130,246,0.06);font-weight:600;"><td>Subtotal: Digital Payments</td><td class="text-right mono">' + this.fmtInt(digitalTotal) + '</td></tr>';
        html += '<tr><td>Credit Sales</td><td class="text-right mono">' + this.fmtInt(calc.totalCreditSales) + '</td></tr>';
        html += '<tr><td>Discounts Given</td><td class="text-right mono">' + this.fmtInt(calc.totalDiscount) + '</td></tr>';
        html += '<tr><td>Expenses Deducted</td><td class="text-right mono">' + this.fmtInt(calc.totalExpenses) + '</td></tr>';
        html += '<tr><td>Shortages</td><td class="text-right mono">' + this.fmtInt(calc.totalShortages) + '</td></tr>';
        const giTotal = this.calcTotalGoodsIssues(bid, ds);
        if (giTotal > 0) { html += '<tr style="background:rgba(124,58,237,0.06);"><td>Goods Issue (Station Vehicles)</td><td class="text-right mono" style="color:#7C3AED;">' + this.fmtInt(giTotal) + '</td></tr>'; }
        html += '<tr class="total-row"><td class="text-bold">TOTAL ACCOUNTED FOR</td><td class="text-right mono text-bold">' + this.fmtInt(calc.totalCollections) + '</td></tr>';
        html += '<tr class="total-row" style="background:' + (Math.abs(calc.variance) < 1 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)') + ';"><td class="text-bold">VARIANCE (Expected - Collections)</td><td class="text-right mono text-bold ' + varClass + '">' + this.fmtInt(calc.variance) + '</td></tr>';
        html += '<tr style="background:rgba(240,165,0,0.08);"><td class="text-bold">Amount to Bank (Cash - Expenses - Shortages)</td><td class="text-right mono text-bold" style="color:var(--sa-gold);">' + this.fmtInt(calc.amountToBank) + '</td></tr>';
        if (ctb.actualBanked !== null) {
            const bankName = ctb.bankId ? ((this.data.banks || []).find(b => b.id === ctb.bankId) || {}).name || '' : '';
            html += '<tr style="background:rgba(16,185,129,0.06);"><td class="text-bold">Actual Deposited' + (bankName ? ' (' + bankName + ')' : '') + '</td><td class="text-right mono text-bold text-success">' + this.fmtInt(ctb.actualBanked) + '</td></tr>';
            html += '<tr style="background:' + (ctb.isFlagged ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.06)') + ';"><td class="text-bold">Banking Variance</td><td class="text-right mono text-bold ' + (ctb.isFlagged ? 'text-danger' : 'text-success') + '">' + this.fmtInt(ctb.variance) + '</td></tr>';
        }
        html += '</tbody></table></div></div></div>';

        // ── SECTION 4: CREDIT SALES BREAKDOWN ──
        html += '<div class="sa-section"><div class="sa-section-header" style="background:linear-gradient(135deg,#7C3AED 0%,#A78BFA 100%);">'
            + '<div class="sa-section-title" style="color:#fff;">Credit Sales Breakdown (' + creditEntries.length + ' entries)</div></div>';
        if (creditEntries.length > 0) {
            html += '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
            html += '<thead><tr><th>#</th><th>Customer</th><th>Product</th><th class="text-right">Litres</th><th class="text-right">Price/L</th><th class="text-right">Discount</th><th class="text-right">Net Amount</th></tr></thead><tbody>';
            let csTotal = 0, csDiscTotal = 0;
            creditEntries.forEach((c, i) => {
                const cust = c.customer_id ? this.data.customers.find(cu => cu.id === c.customer_id) : null;
                const l = this.parseNum(c.litres), pp = this.parseNum(c.pump_price), sp = this.parseNum(c.selling_price);
                const disc = (l * pp) - (l * sp), net = l * sp;
                csTotal += net; csDiscTotal += disc;
                html += '<tr><td>' + (i + 1) + '</td><td>' + (cust ? cust.name : (c.customer_name || 'Walk-in')) + '</td><td><span class="sa-badge sa-badge-' + ((c.product || 'PMS') === 'PMS' ? 'warning' : 'info') + '">' + (c.product || 'PMS') + '</span></td>';
                html += '<td class="text-right mono">' + this.fmt(l, 3) + '</td><td class="text-right mono">' + this.fmtInt(sp) + '</td>';
                html += '<td class="text-right mono">' + (disc > 0 ? this.fmtInt(disc) : '—') + '</td>';
                html += '<td class="text-right mono">' + this.fmtInt(net) + '</td></tr>';
            });
            html += '<tr class="total-row"><td colspan="5" class="text-bold text-right">TOTALS</td><td class="text-right mono text-bold">' + this.fmtInt(csDiscTotal) + '</td><td class="text-right mono text-bold">' + this.fmtInt(csTotal) + '</td></tr>';
            html += '</tbody></table></div></div>';
        } else {
            html += '<div class="sa-section-body"><p class="text-muted text-center" style="padding:20px;">No credit sales recorded for this day.</p></div>';
        }
        html += '</div>';

        // ── SECTION 5: EXPENSES BREAKDOWN ──
        html += '<div class="sa-section"><div class="sa-section-header" style="background:linear-gradient(135deg,#DC2626 0%,#EF4444 100%);">'
            + '<div class="sa-section-title" style="color:#fff;">Expenses Breakdown (' + expEntries.length + ' entries)</div></div>';
        if (expEntries.length > 0) {
            html += '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
            html += '<thead><tr><th>#</th><th>GL Code</th><th>Category</th><th>Description</th><th class="text-right">Amount (UGX)</th></tr></thead><tbody>';
            let expTotal = 0;
            expEntries.forEach((e, i) => {
                const acct = this.EXPENSE_ACCOUNTS.find(a => a.code === e.category) || { name: e.category || 'Other' };
                const amt = this.parseNum(e.amount); expTotal += amt;
                html += '<tr><td>' + (i + 1) + '</td><td><span class="sa-badge sa-badge-neutral">' + (e.category || '—') + '</span></td><td>' + (acct.name || e.category || '') + '</td><td>' + (e.description || '—') + '</td><td class="text-right mono">' + this.fmtInt(amt) + '</td></tr>';
            });
            html += '<tr class="total-row"><td colspan="4" class="text-bold text-right">TOTAL EXPENSES</td><td class="text-right mono text-bold text-danger">' + this.fmtInt(expTotal) + '</td></tr>';
            html += '</tbody></table></div></div>';
        } else {
            html += '<div class="sa-section-body"><p class="text-muted text-center" style="padding:20px;">No expenses recorded for this day.</p></div>';
        }
        html += '</div>';

        // ── SECTION 6: PETTY CASH BREAKDOWN ──
        html += '<div class="sa-section"><div class="sa-section-header" style="background:linear-gradient(135deg,#D97706 0%,#F59E0B 100%);">'
            + '<div class="sa-section-title" style="color:#fff;">Petty Cash Activity (' + pettyCashEntries.length + ' entries)</div></div>';
        if (pettyCashEntries.length > 0) {
            html += '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
            html += '<thead><tr><th>#</th><th>Type</th><th>Category</th><th>Description</th><th class="text-right">Amount (UGX)</th></tr></thead><tbody>';
            let pcTopUps = 0, pcExpenses = 0;
            pettyCashEntries.forEach((e, i) => {
                const isTopUp = e.entry_type === 'top_up';
                const amt = this.parseNum(e.amount);
                if (isTopUp) pcTopUps += amt; else pcExpenses += amt;
                html += '<tr><td>' + (i + 1) + '</td><td><span class="sa-badge ' + (isTopUp ? 'sa-badge-success' : 'sa-badge-danger') + '">' + (isTopUp ? 'Top-Up' : 'Expense') + '</span></td>';
                html += '<td>' + (e.category || '—') + '</td><td>' + (e.description || '—') + '</td>';
                html += '<td class="text-right mono ' + (isTopUp ? 'text-success' : 'text-danger') + '">' + (isTopUp ? '+' : '-') + this.fmtInt(amt) + '</td></tr>';
            });
            html += '<tr class="total-row"><td colspan="4" class="text-bold text-right">Top-Ups / Expenses</td><td class="text-right mono text-bold"><span class="text-success">+' + this.fmtInt(pcTopUps) + '</span> / <span class="text-danger">-' + this.fmtInt(pcExpenses) + '</span></td></tr>';
            html += '</tbody></table></div></div>';
        } else {
            html += '<div class="sa-section-body"><p class="text-muted text-center" style="padding:20px;">No petty cash activity for this day.</p></div>';
        }
        const pcBal = this.getPettyCashBalance(bid);
        html += '<div style="text-align:right;padding:8px 16px;font-size:0.82rem;color:var(--sa-text-secondary);">Running Petty Cash Balance: <strong style="color:' + (pcBal < 0 ? 'var(--sa-danger)' : 'var(--sa-success)') + ';">UGX ' + this.fmtInt(pcBal) + '</strong></div>';
        html += '</div>';

        // ── SECTION 7: GOODS ISSUE BREAKDOWN ──
        html += '<div class="sa-section"><div class="sa-section-header" style="background:linear-gradient(135deg,#7C3AED 0%,#A78BFA 100%);">'
            + '<div class="sa-section-title" style="color:#fff;">Goods Issue (' + giEntries.length + ' entries)</div></div>';
        if (giEntries.length > 0) {
            html += '<div class="sa-section-body no-pad"><div class="sa-table-wrap"><table class="sa-table">';
            html += '<thead><tr><th>#</th><th>Product</th><th>Number Plate</th><th class="text-right">Volume (L)</th><th class="text-right">Rate/L (UGX)</th><th class="text-right">Amount (UGX)</th></tr></thead><tbody>';
            let giTotal = 0;
            giEntries.forEach((g, i) => {
                const vol = this.parseNum(g.volume), rate = this.parseNum(g.rate), amt = vol * rate;
                giTotal += amt;
                html += '<tr><td>' + (i + 1) + '</td><td><span class="sa-badge sa-badge-' + (g.product === 'PMS' ? 'warning' : 'info') + '">' + (g.product || 'PMS') + '</span></td>';
                html += '<td>' + (g.number_plate || '—') + '</td>';
                html += '<td class="text-right mono">' + this.fmt(vol, 3) + '</td>';
                html += '<td class="text-right mono">' + this.fmtInt(rate) + '</td>';
                html += '<td class="text-right mono">' + this.fmtInt(amt) + '</td></tr>';
            });
            html += '<tr class="total-row"><td colspan="5" class="text-bold text-right">TOTAL GOODS ISSUED</td><td class="text-right mono text-bold" style="color:var(--sa-primary);">' + this.fmtInt(giTotal) + '</td></tr>';
            html += '</tbody></table></div></div>';
        } else {
            html += '<div class="sa-section-body"><p class="text-muted text-center" style="padding:20px;">No goods issued for this day.</p></div>';
        }
        html += '</div>';

        return html;
    },

    _drPrevDate() {
        const d = new Date(this._dailyReportDate + 'T00:00:00');
        d.setDate(d.getDate() - 1);
        this._dailyReportDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        document.getElementById('reportContent').innerHTML = this.reportDailyReport();
    },

    _drNextDate() {
        const d = new Date(this._dailyReportDate + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        this._dailyReportDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        document.getElementById('reportContent').innerHTML = this.reportDailyReport();
    },

    _drGoDate(val) {
        if (val) { this._dailyReportDate = val; document.getElementById('reportContent').innerHTML = this.reportDailyReport(); }
    },

    // ── Daily Report: Gather all data into structured object ──
    _getDailyReportData(ds) {
        const bid = this.currentBranch.id;
        const key = this.bk(bid, ds);
        const calc = this.calculateDate(bid, ds);
        const ctb = this.calcCashToBank(bid, ds);
        const creditEntries = (this.data.creditSales[key] || []).filter(c => !c.is_voided);
        const expEntries = this.data.expenses[key] || [];
        const discEntries = this.data.discounts[key] || [];
        const pettyCashEntries = this.data.pettyCashEntries.filter(e => e.branch_id === bid && e.date === ds);

        // PMS breakdown
        const pmsCreditEntries = creditEntries.filter(c => (c.product || 'PMS') === 'PMS');
        let pmsCreditLitres = 0, pmsCreditValue = 0, pmsCreditDiscount = 0, pmsCreditValueAtPump = 0;
        pmsCreditEntries.forEach(c => {
            const l = this.parseNum(c.litres), pp = this.parseNum(c.pump_price), sp = this.parseNum(c.selling_price);
            pmsCreditLitres += l; pmsCreditValue += l * sp; pmsCreditValueAtPump += l * pp; pmsCreditDiscount += (l * pp) - (l * sp);
        });
        const pmsDiscEntries = discEntries.filter(d => (d.product || 'PMS') === 'PMS');
        let pmsStandaloneDiscLitres = 0, pmsStandaloneDiscAmt = 0, pmsStandaloneDiscValue = 0, pmsStandaloneDiscValueAtPump = 0;
        pmsDiscEntries.forEach(d => {
            const l = this.parseNum(d.litres), pp = this.parseNum(d.pump_price), sp = this.parseNum(d.selling_price);
            pmsStandaloneDiscLitres += l; pmsStandaloneDiscAmt += (l * pp) - (l * sp); pmsStandaloneDiscValue += l * sp; pmsStandaloneDiscValueAtPump += l * pp;
        });
        const pmsTotalDiscount = pmsCreditDiscount + pmsStandaloneDiscAmt;
        const goodsIssueEntries = this._activeRecords(this.data.goodsIssues[key] || []);
        const pmsGiEntries = goodsIssueEntries.filter(g => (g.product || 'PMS') === 'PMS');
        let pmsGiLitres = 0, pmsGiValue = 0;
        pmsGiEntries.forEach(g => { const v = this.parseNum(g.volume), r = this.parseNum(g.rate); pmsGiLitres += v; pmsGiValue += v * r; });
        const pmsCashLitres = calc.pmsVolume - pmsCreditLitres - pmsStandaloneDiscLitres - pmsGiLitres;
        const pmsCashValue = pmsCashLitres * calc.pmsSP;

        // AGO breakdown
        const agoCreditEntries = creditEntries.filter(c => c.product === 'AGO');
        let agoCreditLitres = 0, agoCreditValue = 0, agoCreditDiscount = 0, agoCreditValueAtPump = 0;
        agoCreditEntries.forEach(c => {
            const l = this.parseNum(c.litres), pp = this.parseNum(c.pump_price), sp = this.parseNum(c.selling_price);
            agoCreditLitres += l; agoCreditValue += l * sp; agoCreditValueAtPump += l * pp; agoCreditDiscount += (l * pp) - (l * sp);
        });
        const agoDiscEntries = discEntries.filter(d => d.product === 'AGO');
        let agoStandaloneDiscLitres = 0, agoStandaloneDiscAmt = 0, agoStandaloneDiscValue = 0, agoStandaloneDiscValueAtPump = 0;
        agoDiscEntries.forEach(d => {
            const l = this.parseNum(d.litres), pp = this.parseNum(d.pump_price), sp = this.parseNum(d.selling_price);
            agoStandaloneDiscLitres += l; agoStandaloneDiscAmt += (l * pp) - (l * sp); agoStandaloneDiscValue += l * sp; agoStandaloneDiscValueAtPump += l * pp;
        });
        const agoTotalDiscount = agoCreditDiscount + agoStandaloneDiscAmt;
        const agoGiEntries = goodsIssueEntries.filter(g => g.product === 'AGO');
        let agoGiLitres = 0, agoGiValue = 0;
        agoGiEntries.forEach(g => { const v = this.parseNum(g.volume), r = this.parseNum(g.rate); agoGiLitres += v; agoGiValue += v * r; });
        const agoCashLitres = calc.agoVolume - agoCreditLitres - agoStandaloneDiscLitres - agoGiLitres;
        const agoCashValue = agoCashLitres * calc.agoSP;

        return {
            calc, ctb, creditEntries, expEntries, pettyCashEntries, goodsIssueEntries,
            pms: { cashLitres: pmsCashLitres, cashValue: pmsCashValue, creditEntries: pmsCreditEntries, creditLitres: pmsCreditLitres, creditValue: pmsCreditValue, creditValueAtPump: pmsCreditValueAtPump, creditDiscount: pmsCreditDiscount, discEntries: pmsDiscEntries, discLitres: pmsStandaloneDiscLitres, discValue: pmsStandaloneDiscValue, discValueAtPump: pmsStandaloneDiscValueAtPump, discAmt: pmsStandaloneDiscAmt, totalDiscount: pmsTotalDiscount, giEntries: pmsGiEntries, giLitres: pmsGiLitres, giValue: pmsGiValue },
            ago: { cashLitres: agoCashLitres, cashValue: agoCashValue, creditEntries: agoCreditEntries, creditLitres: agoCreditLitres, creditValue: agoCreditValue, creditValueAtPump: agoCreditValueAtPump, creditDiscount: agoCreditDiscount, discEntries: agoDiscEntries, discLitres: agoStandaloneDiscLitres, discValue: agoStandaloneDiscValue, discValueAtPump: agoStandaloneDiscValueAtPump, discAmt: agoStandaloneDiscAmt, totalDiscount: agoTotalDiscount, giEntries: agoGiEntries, giLitres: agoGiLitres, giValue: agoGiValue }
        };
    },

    // ============================================================
    // DAILY REPORT — PDF EXPORT (Professional HTML Print)
    // ============================================================
    exportDailyReportPDF() {
        if (!this.currentBranch) { this.toast('Select a branch first', 'error'); return; }
        const ds = this._dailyReportDate || this.currentDate || this.todayStr();
        const bid = this.currentBranch.id;
        const key = this.bk(bid, ds);
        if (!this.data.shiftDates[key]) { this.toast('No shift data for this date', 'error'); return; }

        const d = this._getDailyReportData(ds);
        const branchName = this.currentBranch.name;
        const branchCode = this.currentBranch.branch_code || '';

        const logoSvg = '<svg viewBox="0 0 60 60" width="54" height="54" xmlns="http://www.w3.org/2000/svg">'
            + '<circle cx="30" cy="30" r="28" fill="#C8102E" stroke="#8B0000" stroke-width="2"/>'
            + '<path d="M18 31 C18 24.4 23.4 19 30 19 C34.2 19 37.8 21.3 39.8 24.8" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>'
            + '<path d="M39.8 24.8 L42 21 M39.8 24.8 L36 23.8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'
            + '<text x="30" y="44" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="800" fill="#fff" letter-spacing="1">GASCO</text>'
            + '</svg>';

        let body = '<!DOCTYPE html><html><head><title>Daily Report — ' + this.formatDate(ds) + '</title><style>'
            + '*{margin:0;padding:0;box-sizing:border-box;}'
            + 'body{font-family:"Segoe UI",Arial,Helvetica,sans-serif;padding:24px 30px;color:#1a1a1a;font-size:11px;line-height:1.4;}'
            + '.header{text-align:center;border-bottom:3px solid #C8102E;padding-bottom:14px;margin-bottom:14px;}'
            + '.header h1{font-size:18px;margin:4px 0 0;letter-spacing:2px;color:#C8102E;font-weight:800;}'
            + '.header .sub{font-size:10px;color:#666;margin:2px 0;}'
            + '.doc-title{text-align:center;margin:10px 0 14px;padding:8px 16px;background:linear-gradient(135deg,#C8102E,#E8450E);color:#fff;font-size:14px;font-weight:800;letter-spacing:1px;border-radius:6px;text-transform:uppercase;}'
            + '.meta{display:flex;justify-content:space-between;margin-bottom:14px;font-size:10.5px;color:#444;}'
            + '.meta strong{color:#1a1a1a;}'
            + '.summary-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;}'
            + '.s-card{border:1.5px solid #e0e0e0;border-radius:6px;padding:8px 10px;text-align:center;}'
            + '.s-card .lbl{font-size:8.5px;text-transform:uppercase;color:#888;letter-spacing:0.5px;font-weight:600;}'
            + '.s-card .val{font-size:14px;font-weight:800;margin:2px 0;}'
            + '.s-card .sub{font-size:8px;color:#999;}'
            + '.s-card.pms{border-color:#E8450E;background:#FFF7F3;} .s-card.pms .val{color:#E8450E;}'
            + '.s-card.ago{border-color:#2563EB;background:#F0F4FF;} .s-card.ago .val{color:#2563EB;}'
            + '.s-card.gold{border-color:#D97706;background:#FFFBF0;} .s-card.gold .val{color:#B45309;}'
            + '.s-card.green{border-color:#059669;background:#F0FDF4;} .s-card.green .val{color:#059669;}'
            + '.s-card.red{border-color:#DC2626;background:#FEF2F2;} .s-card.red .val{color:#DC2626;}'
            + 'h2{font-size:11.5px;font-weight:700;padding:6px 10px;margin:12px 0 0;border-radius:4px 4px 0 0;color:#fff;letter-spacing:0.5px;}'
            + 'h2.pms{background:linear-gradient(135deg,#E8450E,#FF6B35);}'
            + 'h2.ago{background:linear-gradient(135deg,#2563EB,#3B82F6);}'
            + 'h2.bank{background:linear-gradient(135deg,#059669,#10B981);}'
            + 'h2.credit{background:linear-gradient(135deg,#7C3AED,#A78BFA);}'
            + 'h2.expense{background:linear-gradient(135deg,#DC2626,#EF4444);}'
            + 'h2.petty{background:linear-gradient(135deg,#D97706,#F59E0B);}'
            + 'h2.goods{background:linear-gradient(135deg,#7C3AED,#A78BFA);}'
            + 'table{width:100%;border-collapse:collapse;margin-bottom:12px;}'
            + 'th{background:#f5f5f5;font-weight:700;font-size:9.5px;text-transform:uppercase;letter-spacing:0.3px;color:#555;}'
            + 'th,td{border:1px solid #ddd;padding:5px 8px;font-size:10.5px;}'
            + '.r{text-align:right;} .b{font-weight:700;}'
            + '.total{background:#f0f0f0;font-weight:700;}'
            + '.pms-accent{color:#E8450E;} .ago-accent{color:#2563EB;} .green-accent{color:#059669;} .red-accent{color:#DC2626;}'
            + '.highlight-row{background:rgba(240,165,0,0.08);}'
            + '.success-row{background:rgba(16,185,129,0.06);}'
            + '.danger-row{background:rgba(239,68,68,0.06);}'
            + '.sig-line{display:flex;justify-content:space-between;margin-top:30px;}'
            + '.sig-box{width:180px;text-align:center;} .sig-box .line{border-top:1px solid #333;margin-top:35px;padding-top:3px;font-size:9px;color:#666;}'
            + '.footer{margin-top:20px;font-size:9px;color:#999;text-align:center;border-top:1px solid #ddd;padding-top:8px;}'
            + '@media print{body{padding:12px;} @page{size:A4;margin:12mm 10mm;}}'
            + '</style></head><body>';

        // Header
        body += '<div class="header">' + logoSvg
            + '<h1>GASCO ENERGY LIMITED</h1>'
            + '<div class="sub">Oil Marketing Company</div>'
            + '<div class="sub">P.O. BOX 906, Layibi, Gulu, Uganda | Tel: +256 700 000 000</div>'
            + '</div>';

        body += '<div class="doc-title">Daily Operations Report</div>';

        body += '<div class="meta"><div><strong>Branch:</strong> ' + branchName + (branchCode ? ' (' + branchCode + ')' : '') + '</div>'
            + '<div><strong>Date:</strong> ' + this.formatDate(ds) + '</div>'
            + '<div><strong>Status:</strong> ' + ((this.data.shiftDates[key] || {}).is_closed ? 'CLOSED' : 'OPEN') + '</div></div>';

        // Summary cards
        const varClass2 = Math.abs(d.calc.variance) < 1 ? 'green' : 'red';
        body += '<div class="summary-cards">'
            + '<div class="s-card gold"><div class="lbl">Expected Revenue</div><div class="val">UGX ' + this.fmtInt(d.calc.totalExpected) + '</div><div class="sub">' + this.fmt(d.calc.pmsVolume + d.calc.agoVolume, 1) + ' Total Litres</div></div>'
            + '<div class="s-card ' + varClass2 + '"><div class="lbl">Total Collections</div><div class="val">UGX ' + this.fmtInt(d.calc.totalCollections) + '</div><div class="sub">Variance: ' + this.fmtInt(d.calc.variance) + '</div></div>'
            + '<div class="s-card pms"><div class="lbl">PMS Sales</div><div class="val">UGX ' + this.fmtInt(d.calc.pmsValue) + '</div><div class="sub">' + this.fmt(d.calc.pmsVolume, 1) + ' L @ ' + this.fmtInt(d.calc.pmsSP) + '/L</div></div>'
            + '<div class="s-card ago"><div class="lbl">AGO Sales</div><div class="val">UGX ' + this.fmtInt(d.calc.agoValue) + '</div><div class="sub">' + this.fmt(d.calc.agoVolume, 1) + ' L @ ' + this.fmtInt(d.calc.agoSP) + '/L</div></div>'
            + '</div>';

        // PMS SALES SUMMARY
        body += '<h2 class="pms">1. PMS Sales Summary</h2>';
        body += '<table><thead><tr><th>Description</th><th class="r">Volume (L)</th><th class="r">Rate/L</th><th class="r">Amount (UGX)</th></tr></thead><tbody>';
        body += '<tr><td><b>Cash Sales</b> (at pump price)</td><td class="r">' + this.fmt(d.pms.cashLitres, 3) + '</td><td class="r">' + this.fmtInt(d.calc.pmsSP) + '</td><td class="r">' + this.fmtInt(d.pms.cashValue) + '</td></tr>';
        body += '<tr><td><b>Credit Sales</b> (' + d.pms.creditEntries.length + ' customer' + (d.pms.creditEntries.length !== 1 ? 's' : '') + ')</td><td class="r">' + this.fmt(d.pms.creditLitres, 3) + '</td><td class="r">\u2014</td><td class="r">' + this.fmtInt(d.pms.creditValue) + '</td></tr>';
        d.pms.giEntries.forEach(g => {
            const v = this.parseNum(g.volume), r = this.parseNum(g.rate), amt = v * r;
            body += '<tr style="color:#7C3AED;"><td style="padding-left:12px;">Goods Issue: <b>' + this.fmt(v, 1) + 'L @ ' + this.fmtInt(r) + '/L</b>' + (g.number_plate ? ' \u2014 ' + g.number_plate : '') + '</td><td class="r">' + this.fmt(v, 3) + '</td><td class="r">' + this.fmtInt(r) + '</td><td class="r">' + this.fmtInt(amt) + '</td></tr>';
        });
        d.pms.discEntries.forEach(de => {
            const l = this.parseNum(de.litres), sp = this.parseNum(de.selling_price), net = l * sp;
            body += '<tr style="color:#DC2626;"><td style="padding-left:12px;">Discount: <b>' + this.fmt(l, 1) + 'L @ ' + this.fmtInt(sp) + '/L</b>' + (de.customer_name ? ' \u2014 ' + de.customer_name : '') + '</td><td class="r">' + this.fmt(l, 3) + '</td><td class="r">' + this.fmtInt(sp) + '</td><td class="r">' + this.fmtInt(net) + '</td></tr>';
        });
        if (d.pms.totalDiscount > 0) body += '<tr style="color:#DC2626;background:#FEF2F2;"><td><b>Less: Total Discounts</b></td><td></td><td></td><td class="r b">(' + this.fmtInt(d.pms.totalDiscount) + ')</td></tr>';
        body += '<tr class="total"><td class="b">TOTAL PMS REVENUE</td><td class="r b">' + this.fmt(d.calc.pmsVolume, 3) + '</td><td></td><td class="r b">' + this.fmtInt(d.calc.pmsValue) + '</td></tr>';
        body += '</tbody></table>';

        // AGO SALES SUMMARY
        body += '<h2 class="ago">2. AGO Sales Summary</h2>';
        body += '<table><thead><tr><th>Description</th><th class="r">Volume (L)</th><th class="r">Rate/L</th><th class="r">Amount (UGX)</th></tr></thead><tbody>';
        body += '<tr><td><b>Cash Sales</b> (at pump price)</td><td class="r">' + this.fmt(d.ago.cashLitres, 3) + '</td><td class="r">' + this.fmtInt(d.calc.agoSP) + '</td><td class="r">' + this.fmtInt(d.ago.cashValue) + '</td></tr>';
        body += '<tr><td><b>Credit Sales</b> (' + d.ago.creditEntries.length + ' customer' + (d.ago.creditEntries.length !== 1 ? 's' : '') + ')</td><td class="r">' + this.fmt(d.ago.creditLitres, 3) + '</td><td class="r">\u2014</td><td class="r">' + this.fmtInt(d.ago.creditValue) + '</td></tr>';
        d.ago.giEntries.forEach(g => {
            const v = this.parseNum(g.volume), r = this.parseNum(g.rate), amt = v * r;
            body += '<tr style="color:#7C3AED;"><td style="padding-left:12px;">Goods Issue: <b>' + this.fmt(v, 1) + 'L @ ' + this.fmtInt(r) + '/L</b>' + (g.number_plate ? ' \u2014 ' + g.number_plate : '') + '</td><td class="r">' + this.fmt(v, 3) + '</td><td class="r">' + this.fmtInt(r) + '</td><td class="r">' + this.fmtInt(amt) + '</td></tr>';
        });
        d.ago.discEntries.forEach(de => {
            const l = this.parseNum(de.litres), sp = this.parseNum(de.selling_price), net = l * sp;
            body += '<tr style="color:#DC2626;"><td style="padding-left:12px;">Discount: <b>' + this.fmt(l, 1) + 'L @ ' + this.fmtInt(sp) + '/L</b>' + (de.customer_name ? ' \u2014 ' + de.customer_name : '') + '</td><td class="r">' + this.fmt(l, 3) + '</td><td class="r">' + this.fmtInt(sp) + '</td><td class="r">' + this.fmtInt(net) + '</td></tr>';
        });
        if (d.ago.totalDiscount > 0) body += '<tr style="color:#DC2626;background:#FEF2F2;"><td><b>Less: Total Discounts</b></td><td></td><td></td><td class="r b">(' + this.fmtInt(d.ago.totalDiscount) + ')</td></tr>';
        body += '<tr class="total"><td class="b">TOTAL AGO REVENUE</td><td class="r b">' + this.fmt(d.calc.agoVolume, 3) + '</td><td></td><td class="r b">' + this.fmtInt(d.calc.agoValue) + '</td></tr>';
        body += '</tbody></table>';

        // BANKING SUMMARY
        body += '<h2 class="bank">3. Banking Summary</h2>';
        body += '<table><thead><tr><th>Item</th><th class="r">Amount (UGX)</th></tr></thead><tbody>';
        body += '<tr><td>Cash in Hand</td><td class="r">' + this.fmtInt(d.calc.cashInHand) + '</td></tr>';
        body += '<tr><td>MomoPay</td><td class="r">' + this.fmtInt(d.calc.momopay) + '</td></tr>';
        body += '<tr><td>Airtel Money</td><td class="r">' + this.fmtInt(d.calc.airtelMoney) + '</td></tr>';
        body += '<tr><td>M-Pesa</td><td class="r">' + this.fmtInt(d.calc.mpesa) + '</td></tr>';
        body += '<tr><td>Dollar</td><td class="r">' + this.fmtInt(d.calc.dollar) + '</td></tr>';
        body += '<tr><td>FlexiPay</td><td class="r">' + this.fmtInt(d.calc.flexipay) + '</td></tr>';
        const digiTotal = d.calc.momopay + d.calc.airtelMoney + d.calc.mpesa + d.calc.dollar + d.calc.flexipay;
        body += '<tr style="background:#F0F4FF;font-weight:600;"><td>Subtotal: Digital Payments</td><td class="r">' + this.fmtInt(digiTotal) + '</td></tr>';
        body += '<tr><td>Credit Sales</td><td class="r">' + this.fmtInt(d.calc.totalCreditSales) + '</td></tr>';
        body += '<tr><td>Discounts</td><td class="r">' + this.fmtInt(d.calc.totalDiscount) + '</td></tr>';
        body += '<tr><td>Expenses</td><td class="r">' + this.fmtInt(d.calc.totalExpenses) + '</td></tr>';
        body += '<tr><td>Shortages</td><td class="r">' + this.fmtInt(d.calc.totalShortages) + '</td></tr>';
        var pdfGiTotal = d.goodsIssueEntries.reduce((s, g) => s + (this.parseNum(g.volume) * this.parseNum(g.rate)), 0);
        if (pdfGiTotal > 0) body += '<tr style="background:rgba(124,58,237,0.06);"><td>Goods Issue (Station Vehicles)</td><td class="r" style="color:#7C3AED;">' + this.fmtInt(pdfGiTotal) + '</td></tr>';
        body += '<tr class="total"><td class="b">TOTAL ACCOUNTED FOR</td><td class="r b">' + this.fmtInt(d.calc.totalCollections) + '</td></tr>';
        body += '<tr class="' + (Math.abs(d.calc.variance) < 1 ? 'success-row' : 'danger-row') + '"><td class="b">VARIANCE</td><td class="r b ' + (Math.abs(d.calc.variance) < 1 ? 'green-accent' : 'red-accent') + '">' + this.fmtInt(d.calc.variance) + '</td></tr>';
        body += '<tr class="highlight-row"><td class="b">Amount to Bank</td><td class="r b" style="color:#B45309;">' + this.fmtInt(d.calc.amountToBank) + '</td></tr>';
        if (d.ctb.actualBanked !== null) {
            const bankName = d.ctb.bankId ? ((this.data.banks || []).find(b => b.id === d.ctb.bankId) || {}).name || '' : '';
            body += '<tr class="success-row"><td class="b">Actual Deposited' + (bankName ? ' (' + bankName + ')' : '') + '</td><td class="r b green-accent">' + this.fmtInt(d.ctb.actualBanked) + '</td></tr>';
        }
        body += '</tbody></table>';

        // CREDIT SALES
        body += '<h2 class="credit">4. Credit Sales Breakdown (' + d.creditEntries.length + ')</h2>';
        if (d.creditEntries.length > 0) {
            body += '<table><thead><tr><th>#</th><th>Customer</th><th>Product</th><th class="r">Litres</th><th class="r">Price/L</th><th class="r">Discount</th><th class="r">Net Amount</th></tr></thead><tbody>';
            let csT = 0, csDT = 0;
            d.creditEntries.forEach((c, i) => {
                const cust = c.customer_id ? this.data.customers.find(cu => cu.id === c.customer_id) : null;
                const l = this.parseNum(c.litres), pp = this.parseNum(c.pump_price), sp = this.parseNum(c.selling_price);
                const disc = (l * pp) - (l * sp), net = l * sp;
                csT += net; csDT += disc;
                body += '<tr><td>' + (i + 1) + '</td><td>' + (cust ? cust.name : (c.customer_name || 'Walk-in')) + '</td><td>' + (c.product || 'PMS') + '</td>';
                body += '<td class="r">' + this.fmt(l, 3) + '</td><td class="r">' + this.fmtInt(sp) + '</td><td class="r">' + (disc > 0 ? this.fmtInt(disc) : '—') + '</td><td class="r">' + this.fmtInt(net) + '</td></tr>';
            });
            body += '<tr class="total"><td colspan="5" class="r b">TOTALS</td><td class="r b">' + this.fmtInt(csDT) + '</td><td class="r b">' + this.fmtInt(csT) + '</td></tr>';
            body += '</tbody></table>';
        } else {
            body += '<p style="padding:8px;color:#999;font-style:italic;">No credit sales recorded.</p>';
        }

        // EXPENSES
        body += '<h2 class="expense">5. Expenses Breakdown (' + d.expEntries.length + ')</h2>';
        if (d.expEntries.length > 0) {
            body += '<table><thead><tr><th>#</th><th>GL Code</th><th>Category</th><th>Description</th><th class="r">Amount (UGX)</th></tr></thead><tbody>';
            let eT = 0;
            d.expEntries.forEach((e, i) => {
                const acct = this.EXPENSE_ACCOUNTS.find(a => a.code === e.category) || { name: e.category || 'Other' };
                const amt = this.parseNum(e.amount); eT += amt;
                body += '<tr><td>' + (i + 1) + '</td><td>' + (e.category || '—') + '</td><td>' + (acct.name || '') + '</td><td>' + (e.description || '—') + '</td><td class="r">' + this.fmtInt(amt) + '</td></tr>';
            });
            body += '<tr class="total"><td colspan="4" class="r b">TOTAL EXPENSES</td><td class="r b red-accent">' + this.fmtInt(eT) + '</td></tr>';
            body += '</tbody></table>';
        } else {
            body += '<p style="padding:8px;color:#999;font-style:italic;">No expenses recorded.</p>';
        }

        // PETTY CASH
        body += '<h2 class="petty">6. Petty Cash Activity (' + d.pettyCashEntries.length + ')</h2>';
        if (d.pettyCashEntries.length > 0) {
            body += '<table><thead><tr><th>#</th><th>Type</th><th>Category</th><th>Description</th><th class="r">Amount (UGX)</th></tr></thead><tbody>';
            let pTU = 0, pEX = 0;
            d.pettyCashEntries.forEach((e, i) => {
                const isTopUp = e.entry_type === 'top_up';
                const amt = this.parseNum(e.amount);
                if (isTopUp) pTU += amt; else pEX += amt;
                body += '<tr><td>' + (i + 1) + '</td><td>' + (isTopUp ? 'Top-Up' : 'Expense') + '</td><td>' + (e.category || '—') + '</td><td>' + (e.description || '—') + '</td><td class="r ' + (isTopUp ? 'green-accent' : 'red-accent') + '">' + (isTopUp ? '+' : '-') + this.fmtInt(amt) + '</td></tr>';
            });
            body += '<tr class="total"><td colspan="4" class="r b">Net</td><td class="r b">' + (pTU >= pEX ? '+' : '-') + this.fmtInt(Math.abs(pTU - pEX)) + '</td></tr>';
            body += '</tbody></table>';
        } else {
            body += '<p style="padding:8px;color:#999;font-style:italic;">No petty cash activity.</p>';
        }
        body += '<p style="font-size:9.5px;color:#666;text-align:right;margin-top:4px;">Running Petty Cash Balance: <strong>UGX ' + this.fmtInt(this.getPettyCashBalance(bid)) + '</strong></p>';

        // GOODS ISSUE
        body += '<h2 class="goods">7. Goods Issue (' + d.goodsIssueEntries.length + ')</h2>';
        if (d.goodsIssueEntries.length > 0) {
            body += '<table><thead><tr><th>#</th><th>Product</th><th>Number Plate</th><th class="r">Volume (L)</th><th class="r">Rate/L</th><th class="r">Amount (UGX)</th></tr></thead><tbody>';
            let giT = 0;
            d.goodsIssueEntries.forEach((g, i) => {
                const vol = this.parseNum(g.volume), rate = this.parseNum(g.rate), amt = vol * rate;
                giT += amt;
                body += '<tr><td>' + (i + 1) + '</td><td>' + (g.product || 'PMS') + '</td><td>' + (g.number_plate || '—') + '</td><td class="r">' + this.fmt(vol, 3) + '</td><td class="r">' + this.fmtInt(rate) + '</td><td class="r">' + this.fmtInt(amt) + '</td></tr>';
            });
            body += '<tr class="total"><td colspan="5" class="r b">TOTAL GOODS ISSUED</td><td class="r b" style="color:#7C3AED;">' + this.fmtInt(giT) + '</td></tr>';
            body += '</tbody></table>';
        } else {
            body += '<p style="padding:8px;color:#999;font-style:italic;">No goods issued.</p>';
        }

        // Signatures
        body += '<div class="sig-line">'
            + '<div class="sig-box"><div class="line">Prepared By</div></div>'
            + '<div class="sig-box"><div class="line">Checked By</div></div>'
            + '<div class="sig-box"><div class="line">Approved By</div></div>'
            + '</div>';

        body += '<div class="footer">Generated on ' + new Date().toLocaleString() + ' | Gasco Energy Limited — P.O. BOX 906, Layibi, Gulu, Uganda | Gasco Shift Analysis</div>';
        body += '</body></html>';

        const w = window.open('', '_blank', 'width=900,height=800');
        w.document.write(body);
        w.document.close();
        setTimeout(() => w.print(), 400);
    },

    // ============================================================
    // DAILY REPORT — EXCEL EXPORT
    // ============================================================
    exportDailyReportExcel() {
        if (!this.currentBranch) { this.toast('Select a branch first', 'error'); return; }
        const ds = this._dailyReportDate || this.currentDate || this.todayStr();
        const bid = this.currentBranch.id;
        const key = this.bk(bid, ds);
        if (!this.data.shiftDates[key]) { this.toast('No shift data for this date', 'error'); return; }

        const d = this._getDailyReportData(ds);
        const branchName = this.currentBranch.name;

        // Build TSV content that opens nicely in Excel
        var rows = [];
        var self = this;
        var addRow = function() { rows.push(Array.prototype.slice.call(arguments).join('\t')); };
        var addBlank = function() { rows.push(''); };

        addRow('GASCO ENERGY LIMITED — DAILY OPERATIONS REPORT');
        addRow('Branch:', branchName);
        addRow('Date:', self.formatDate(ds));
        addRow('Generated:', new Date().toLocaleString());
        addBlank();

        // Summary
        addRow('=== SUMMARY ===');
        addRow('Expected Revenue', self._excelNum(d.calc.totalExpected));
        addRow('Total Collections', self._excelNum(d.calc.totalCollections));
        addRow('Variance', self._excelNum(d.calc.variance));
        addRow('PMS Volume (L)', self._excelNum(d.calc.pmsVolume));
        addRow('AGO Volume (L)', self._excelNum(d.calc.agoVolume));
        addRow('PMS Price/L', self._excelNum(d.calc.pmsSP));
        addRow('AGO Price/L', self._excelNum(d.calc.agoSP));
        addBlank();

        // PMS Sales Summary
        addRow('=== 1. PMS SALES SUMMARY ===');
        addRow('Description', 'Volume (L)', 'Rate/L (UGX)', 'Amount (UGX)');
        addRow('Cash Sales (at pump price)', self._excelNum(d.pms.cashLitres), self._excelNum(d.calc.pmsSP), self._excelNum(d.pms.cashValue));
        addRow('Credit Sales (' + d.pms.creditEntries.length + ' customers)', self._excelNum(d.pms.creditLitres), '', self._excelNum(d.pms.creditValue));
        d.pms.giEntries.forEach(function(g) {
            var v = self.parseNum(g.volume), r = self.parseNum(g.rate), amt = v * r;
            addRow('Goods Issue: ' + self.fmt(v, 1) + 'L @ ' + self.fmtInt(r) + '/L' + (g.number_plate ? ' - ' + g.number_plate : ''), self._excelNum(v), self._excelNum(r), self._excelNum(amt));
        });
        d.pms.discEntries.forEach(function(de) {
            var l = self.parseNum(de.litres), sp = self.parseNum(de.selling_price), net = l * sp;
            addRow('Discount: ' + self.fmt(l, 1) + 'L @ ' + self.fmtInt(sp) + '/L' + (de.customer_name ? ' - ' + de.customer_name : ''), self._excelNum(l), self._excelNum(sp), self._excelNum(net));
        });
        if (d.pms.totalDiscount > 0) addRow('Less: Total Discounts', '', '', self._excelNum(-d.pms.totalDiscount));
        addRow('TOTAL PMS', self._excelNum(d.calc.pmsVolume), '', self._excelNum(d.calc.pmsValue));
        addBlank();

        // AGO Sales Summary
        addRow('=== 2. AGO SALES SUMMARY ===');
        addRow('Description', 'Volume (L)', 'Rate/L (UGX)', 'Amount (UGX)');
        addRow('Cash Sales (at pump price)', self._excelNum(d.ago.cashLitres), self._excelNum(d.calc.agoSP), self._excelNum(d.ago.cashValue));
        addRow('Credit Sales (' + d.ago.creditEntries.length + ' customers)', self._excelNum(d.ago.creditLitres), '', self._excelNum(d.ago.creditValue));
        d.ago.giEntries.forEach(function(g) {
            var v = self.parseNum(g.volume), r = self.parseNum(g.rate), amt = v * r;
            addRow('Goods Issue: ' + self.fmt(v, 1) + 'L @ ' + self.fmtInt(r) + '/L' + (g.number_plate ? ' - ' + g.number_plate : ''), self._excelNum(v), self._excelNum(r), self._excelNum(amt));
        });
        d.ago.discEntries.forEach(function(de) {
            var l = self.parseNum(de.litres), sp = self.parseNum(de.selling_price), net = l * sp;
            addRow('Discount: ' + self.fmt(l, 1) + 'L @ ' + self.fmtInt(sp) + '/L' + (de.customer_name ? ' - ' + de.customer_name : ''), self._excelNum(l), self._excelNum(sp), self._excelNum(net));
        });
        if (d.ago.totalDiscount > 0) addRow('Less: Total Discounts', '', '', self._excelNum(-d.ago.totalDiscount));
        addRow('TOTAL AGO', self._excelNum(d.calc.agoVolume), '', self._excelNum(d.calc.agoValue));
        addBlank();

        // Banking Summary
        addRow('=== 3. BANKING SUMMARY ===');
        addRow('Item', 'Amount (UGX)');
        addRow('Cash in Hand', self._excelNum(d.calc.cashInHand));
        addRow('MomoPay', self._excelNum(d.calc.momopay));
        addRow('Airtel Money', self._excelNum(d.calc.airtelMoney));
        addRow('M-Pesa', self._excelNum(d.calc.mpesa));
        addRow('Dollar', self._excelNum(d.calc.dollar));
        addRow('FlexiPay', self._excelNum(d.calc.flexipay));
        addRow('Credit Sales', self._excelNum(d.calc.totalCreditSales));
        addRow('Discounts', self._excelNum(d.calc.totalDiscount));
        addRow('Expenses', self._excelNum(d.calc.totalExpenses));
        addRow('Shortages', self._excelNum(d.calc.totalShortages));
        var xlGiTotal = d.goodsIssueEntries.reduce(function(s, g) { return s + (self.parseNum(g.volume) * self.parseNum(g.rate)); }, 0);
        if (xlGiTotal > 0) addRow('Goods Issue (Station Vehicles)', self._excelNum(xlGiTotal));
        addRow('TOTAL ACCOUNTED', self._excelNum(d.calc.totalCollections));
        addRow('VARIANCE', self._excelNum(d.calc.variance));
        addRow('Amount to Bank', self._excelNum(d.calc.amountToBank));
        if (d.ctb.actualBanked !== null) addRow('Actual Deposited', self._excelNum(d.ctb.actualBanked));
        addBlank();

        // Credit Sales Detail
        addRow('=== 4. CREDIT SALES DETAIL ===');
        addRow('#', 'Customer', 'Product', 'Litres', 'Price/L', 'Discount', 'Net Amount');
        var csT2 = 0, csD2 = 0;
        d.creditEntries.forEach(function(c, i) {
            var cust = c.customer_id ? self.data.customers.find(function(cu) { return cu.id === c.customer_id; }) : null;
            var l = self.parseNum(c.litres), pp = self.parseNum(c.pump_price), sp = self.parseNum(c.selling_price);
            var disc = (l * pp) - (l * sp), net = l * sp;
            csT2 += net; csD2 += disc;
            addRow(i + 1, (cust ? cust.name : (c.customer_name || 'Walk-in')), c.product || 'PMS', self._excelNum(l), self._excelNum(sp), self._excelNum(disc), self._excelNum(net));
        });
        if (d.creditEntries.length > 0) addRow('', '', '', '', 'TOTALS', self._excelNum(csD2), self._excelNum(csT2));
        if (d.creditEntries.length === 0) addRow('No credit sales recorded');
        addBlank();

        // Expenses Detail
        addRow('=== 5. EXPENSES DETAIL ===');
        addRow('#', 'GL Code', 'Category', 'Description', 'Amount (UGX)');
        var eT2 = 0;
        d.expEntries.forEach(function(e, i) {
            var acct = self.EXPENSE_ACCOUNTS.find(function(a) { return a.code === e.category; }) || { name: e.category || 'Other' };
            var amt = self.parseNum(e.amount); eT2 += amt;
            addRow(i + 1, e.category || '—', acct.name || '', e.description || '—', self._excelNum(amt));
        });
        if (d.expEntries.length > 0) addRow('', '', '', 'TOTAL', self._excelNum(eT2));
        if (d.expEntries.length === 0) addRow('No expenses recorded');
        addBlank();

        // Petty Cash Detail
        addRow('=== 6. PETTY CASH ACTIVITY ===');
        addRow('#', 'Type', 'Category', 'Description', 'Amount (UGX)');
        var pTU2 = 0, pEX2 = 0;
        d.pettyCashEntries.forEach(function(e, i) {
            var isTopUp = e.entry_type === 'top_up';
            var amt = self.parseNum(e.amount);
            if (isTopUp) pTU2 += amt; else pEX2 += amt;
            addRow(i + 1, isTopUp ? 'Top-Up' : 'Expense', e.category || '—', e.description || '—', self._excelNum(isTopUp ? amt : -amt));
        });
        if (d.pettyCashEntries.length > 0) {
            addRow('', '', '', 'Top-Ups Total', self._excelNum(pTU2));
            addRow('', '', '', 'Expenses Total', self._excelNum(-pEX2));
            addRow('', '', '', 'Net', self._excelNum(pTU2 - pEX2));
        }
        if (d.pettyCashEntries.length === 0) addRow('No petty cash activity');
        addRow('', '', '', 'Running Balance', self._excelNum(self.getPettyCashBalance(bid)));
        addBlank();

        // Goods Issue Detail
        addRow('=== 7. GOODS ISSUE ===');
        addRow('#', 'Product', 'Number Plate', 'Volume (L)', 'Rate/L (UGX)', 'Amount (UGX)');
        var giT2 = 0;
        d.goodsIssueEntries.forEach(function(g, i) {
            var vol = self.parseNum(g.volume), rate = self.parseNum(g.rate), amt = vol * rate;
            giT2 += amt;
            addRow(i + 1, g.product || 'PMS', g.number_plate || '—', self._excelNum(vol), self._excelNum(rate), self._excelNum(amt));
        });
        if (d.goodsIssueEntries.length > 0) addRow('', '', '', '', 'TOTAL', self._excelNum(giT2));
        if (d.goodsIssueEntries.length === 0) addRow('No goods issued');

        // Create and download
        var tsvContent = rows.join('\n');
        var blob = new Blob(['\ufeff' + tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'DailyReport_' + branchName.replace(/[^a-zA-Z0-9]/g, '_') + '_' + ds + '.xls';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.toast('Excel report downloaded', 'success');
    },

    _excelNum(n) {
        if (n === null || n === undefined || isNaN(n)) return '0';
        return Number(n).toFixed(2);
    },

    // ============================================================
    // DATA BACKUP & SHARING
    // ============================================================
    renderDataBackup(el) {
        let html = '<div class="sa-page-header"><h1>Data & Backup</h1></div>';

        // Export section
        html += '<div class="sa-section"><div class="sa-section-header blue"><div class="sa-section-title">Export / Share Data</div></div><div class="sa-section-body">';
        html += '<p style="color:var(--sa-text-muted);margin-bottom:16px;">Download all your data as a file. You can share this file with another device or browser to transfer your data.</p>';
        html += '<div style="display:flex;gap:12px;flex-wrap:wrap;">';
        html += '<button class="sa-btn sa-btn-primary" onclick="SA.exportData()">Download Backup File</button>';
        html += '<button class="sa-btn sa-btn-secondary" onclick="SA.copyDataToClipboard()">Copy Data to Clipboard</button>';
        html += '</div></div></div>';

        // Import section
        html += '<div class="sa-section"><div class="sa-section-header green"><div class="sa-section-title">Import / Restore Data</div></div><div class="sa-section-body">';
        html += '<p style="color:var(--sa-text-muted);margin-bottom:16px;">Load a previously exported backup file to restore your data. <strong style="color:var(--sa-danger);">Warning:</strong> This will replace all current data.</p>';
        html += '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">';
        html += '<button class="sa-btn sa-btn-primary" onclick="document.getElementById(\'importFileInput\').click()">Choose Backup File</button>';
        html += '<button class="sa-btn sa-btn-secondary" onclick="SA.showPasteImport()">Paste from Clipboard</button>';
        html += '<input type="file" id="importFileInput" accept=".json" style="display:none;" onchange="SA.importDataFromFile(this)">';
        html += '</div></div></div>';

        // Info section
        html += '<div class="sa-section"><div class="sa-section-header neutral"><div class="sa-section-title">Data Info</div></div><div class="sa-section-body">';
        const raw = localStorage.getItem('sa_data') || '{}';
        const sizeKB = (new Blob([raw]).size / 1024).toFixed(1);
        const branchCount = this.data.branches ? this.data.branches.length : 0;
        const custCount = this.data.customers ? this.data.customers.length : 0;
        const userCount = this.data.users ? this.data.users.length : 0;
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">';
        html += '<div class="bstat"><div class="bstat-val">' + sizeKB + ' KB</div><div class="bstat-label">Data Size</div></div>';
        html += '<div class="bstat"><div class="bstat-val">' + branchCount + '</div><div class="bstat-label">Branches</div></div>';
        html += '<div class="bstat"><div class="bstat-val">' + custCount + '</div><div class="bstat-label">Customers</div></div>';
        html += '<div class="bstat"><div class="bstat-val">' + userCount + '</div><div class="bstat-label">Users</div></div>';
        html += '</div></div></div>';

        el.innerHTML = html;
    },

    exportData() {
        const raw = localStorage.getItem('sa_data');
        if (!raw) { this.toast('No data to export', 'error'); return; }
        const blob = new Blob([raw], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = 'gasco_backup_' + date + '.json';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.auditLog('DATA_EXPORTED', 'Data backup exported');
        this.toast('Backup file downloaded');
    },

    copyDataToClipboard() {
        const raw = localStorage.getItem('sa_data');
        if (!raw) { this.toast('No data to copy', 'error'); return; }
        navigator.clipboard.writeText(raw).then(() => {
            this.toast('Data copied to clipboard — paste it on the other device');
        }).catch(() => {
            // Fallback for older browsers
            const ta = document.createElement('textarea');
            ta.value = raw;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            this.toast('Data copied to clipboard');
        });
    },

    importDataFromFile(input) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            this._importDataString(e.target.result, file.name);
            input.value = '';
        };
        reader.readAsText(file);
    },

    showPasteImport() {
        const html = '<div class="sa-form-group"><label>Paste the backup data below</label>'
            + '<textarea class="sa-input" id="pasteImportData" rows="8" placeholder="Paste the copied data here..." style="font-family:monospace;font-size:0.75rem;"></textarea></div>'
            + '<div class="sa-modal-actions" style="padding:16px 0 0;border:none;">'
            + '<button class="sa-btn sa-btn-secondary" onclick="SA.closeModal()">Cancel</button>'
            + '<button class="sa-btn sa-btn-primary" onclick="SA.importFromPaste()">Import Data</button></div>';
        this.openModal('Import from Clipboard', html);
    },

    importFromPaste() {
        const raw = document.getElementById('pasteImportData').value.trim();
        if (!raw) { this.toast('Please paste the data first', 'error'); return; }
        this._importDataString(raw, 'clipboard');
    },

    _importDataString(raw, source) {
        try {
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') throw new Error('Invalid format');
            // Basic sanity check — must have branches array
            if (!Array.isArray(parsed.branches)) throw new Error('Missing branches — this does not look like a valid backup');
            if (!confirm('This will REPLACE all current data with the imported backup. Are you sure?')) return;
            localStorage.setItem('sa_data', JSON.stringify(parsed));
            this.data = parsed;
            this.auditLog('DATA_IMPORTED', 'Data restored from: ' + source);
            this.saveData();
            if (this.data.branches.length > 0) {
                this.currentBranch = this.data.branches[0];
                localStorage.setItem('sa_current_branch', this.currentBranch.id);
            }
            this.renderBranchSelector();
            this.closeModal();
            this.toast('Data imported successfully! Reloading...', 'success');
            setTimeout(() => location.reload(), 1000);
        } catch (e) {
            this.toast('Invalid backup file: ' + e.message, 'error');
        }
    }
};

// Boot
document.addEventListener('DOMContentLoaded', () => SA.init());
