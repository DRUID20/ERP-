/* ============================================================
   AWDEER ENERGY ERP v3.3 — Goods Issue (GIN) Module
   GRN (in) / GIN (out) / Landed Costs / AP Invoices / Payments
   ============================================================ */

const CONFIG = {
    APP_KEY: 'awdeer_erp',
    VERSION: '3.3.1',
    CURRENCY_PRIMARY: 'UGX',
    CURRENCY_SECONDARY: 'USD',
    DEFAULT_EXCHANGE_RATE: 3750,
    LOW_STOCK_THRESHOLD: 5000,
    DEFAULT_CREDIT_LIMIT: 50000000,
    CREDENTIALS: { username: 'admin', password: 'awdeer2026' }
};

// ============================================================
// UTILITIES
// ============================================================
const Utils = {
    id: () => '_' + Math.random().toString(36).substr(2, 9),
    dateStr: () => new Date().toISOString().split('T')[0],
    dateDisplay: (d) => {
        if (!d) return '-';
        const dt = new Date(d);
        return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    },
    num: (n) => Number(n || 0).toLocaleString('en-US'),
    currency: (amount, ccy) => {
        ccy = ccy || CONFIG.CURRENCY_PRIMARY;
        const n = Number(amount || 0);
        if (ccy === 'USD') return 'USD ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return 'UGX ' + Math.round(n).toLocaleString('en-US');
    },
    volume: (qty) => Math.round(Number(qty || 0)).toLocaleString('en-US') + ' L',
    pct: (val, total) => total > 0 ? Math.round((val / total) * 100) : 0,
    escapeHtml: (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    nextNumber: (prefix) => {
        const key = CONFIG.APP_KEY + '_seq_' + prefix;
        let n = parseInt(localStorage.getItem(key) || '0') + 1;
        localStorage.setItem(key, n);
        return prefix + '-' + String(n).padStart(4, '0');
    },
    getExchangeRate: (date) => {
        const rates = DataStore.getAll('exchange_rates').sort((a, b) => b.date.localeCompare(a.date));
        if (date) {
            const exact = rates.find(r => r.date === date);
            if (exact) return exact.rate;
            const before = rates.find(r => r.date <= date);
            if (before) return before.rate;
        }
        return rates.length > 0 ? rates[0].rate : CONFIG.DEFAULT_EXCHANGE_RATE;
    }
};

// ============================================================
// STATE
// ============================================================
const State = {
    currency: CONFIG.CURRENCY_PRIMARY,
    currentModule: 'dashboard',
    isLoggedIn: false,
    dateFrom: '',
    dateTo: '',
    filterBranch: '',
    filterProduct: '',
    darkMode: localStorage.getItem('awdeer_erp_darkMode') === 'true'
};

// ============================================================
// DATA STORE (localStorage)
// ============================================================
const DataStore = {
    _key: (collection) => CONFIG.APP_KEY + '_' + collection,
    getAll: (collection) => JSON.parse(localStorage.getItem(DataStore._key(collection)) || '[]'),
    setAll: (collection, data) => localStorage.setItem(DataStore._key(collection), JSON.stringify(data)),
    getById: (collection, id) => DataStore.getAll(collection).find(item => item.id === id),
    insert: (collection, item) => {
        if (!item.id) item.id = Utils.id();
        const data = DataStore.getAll(collection);
        data.push(item);
        DataStore.setAll(collection, data);
        return item;
    },
    update: (collection, id, updates) => {
        const data = DataStore.getAll(collection);
        const idx = data.findIndex(item => item.id === id);
        if (idx === -1) return null;
        Object.assign(data[idx], updates);
        DataStore.setAll(collection, data);
        return data[idx];
    },
    remove: (collection, id) => {
        const data = DataStore.getAll(collection).filter(item => item.id !== id);
        DataStore.setAll(collection, data);
    },
    isSeeded: () => localStorage.getItem(CONFIG.APP_KEY + '_seeded') === CONFIG.VERSION,
    markSeeded: () => localStorage.setItem(CONFIG.APP_KEY + '_seeded', CONFIG.VERSION)
};

// ============================================================
// SEED DATA
// ============================================================
const SeedData = {
    load: () => {
        if (DataStore.isSeeded()) return;
        // Clear old data on version change
        const collections = ['products','branches','warehouses','inventory','suppliers','customers','accounts','purchases','sales','journals','payments','supplier_payments','stock_transfers','exchange_rates','quotations','grn','landed_costs','ap_invoices','goods_issues'];
        collections.forEach(c => localStorage.removeItem(DataStore._key(c)));

        // Products - only PMS and AGO
        DataStore.setAll('products', [
            { id: 'pms', name: 'Petrol (PMS)', code: 'PMS', description: 'Premium Motor Spirit', unitPrice: 4800 },
            { id: 'ago', name: 'Diesel (AGO)', code: 'AGO', description: 'Automotive Gas Oil', unitPrice: 4500 }
        ]);

        // Branches
        DataStore.setAll('branches', [
            { id: 'br1', name: 'Gulu Main', code: 'GULU', location: '906 Layibi, Gulu City' },
            { id: 'br2', name: 'Kampala Branch', code: 'KLA', location: 'Industrial Area, Kampala' }
        ]);

        // Warehouses - 2 per branch (PMS + AGO)
        DataStore.setAll('warehouses', [
            { id: 'wh1', name: 'Gulu PMS Tank', branchId: 'br1', productId: 'pms', capacity: 50000 },
            { id: 'wh2', name: 'Gulu AGO Tank', branchId: 'br1', productId: 'ago', capacity: 50000 },
            { id: 'wh3', name: 'Kampala PMS Tank', branchId: 'br2', productId: 'pms', capacity: 100000 },
            { id: 'wh4', name: 'Kampala AGO Tank', branchId: 'br2', productId: 'ago', capacity: 100000 }
        ]);

        // Inventory per warehouse
        DataStore.setAll('inventory', [
            { id: Utils.id(), productId: 'pms', warehouseId: 'wh1', quantity: 25000, avgCost: 4200 },
            { id: Utils.id(), productId: 'ago', warehouseId: 'wh2', quantity: 35000, avgCost: 3900 },
            { id: Utils.id(), productId: 'pms', warehouseId: 'wh3', quantity: 45000, avgCost: 4150 },
            { id: Utils.id(), productId: 'ago', warehouseId: 'wh4', quantity: 60000, avgCost: 3850 }
        ]);

        // Suppliers with currency (includes fuel suppliers + service providers)
        DataStore.setAll('suppliers', [
            { id: 'sup1', name: 'TotalEnergies Uganda', contact: '+256 414 250 100', email: 'supply@total.ug', address: 'Kampala', currency: 'UGX', tin: '' },
            { id: 'sup2', name: 'Vivo Energy (Shell)', contact: '+256 414 340 500', email: 'orders@vivoenergy.com', address: 'Jinja Road, Kampala', currency: 'UGX', tin: '' },
            { id: 'sup3', name: 'Gulf Energy International', contact: '+971 4 883 2100', email: 'supply@gulfenergy.com', address: 'Dubai, UAE', currency: 'USD', tin: '' },
            { id: 'sup4', name: 'TransAfrica Logistics', contact: '+256 414 500 100', email: 'ops@transafrica.ug', address: 'Industrial Area, Kampala', currency: 'UGX', tin: '' },
            { id: 'sup5', name: 'UAP Insurance Uganda', contact: '+256 414 231 100', email: 'claims@uap.co.ug', address: 'Kampala Road, Kampala', currency: 'UGX', tin: '' }
        ]);

        // Customers
        DataStore.setAll('customers', [
            { id: 'cust1', name: 'Gulu Municipal Council', contact: '+256 471 432 100', email: 'procurement@gulu.go.ug', address: 'Gulu City', balance: 12500000, creditLimit: 80000000 },
            { id: 'cust2', name: 'Northern Bus Company', contact: '+256 772 500 300', email: 'fleet@northernbus.ug', address: 'Gulu', balance: 8400000, creditLimit: 50000000 },
            { id: 'cust3', name: 'Acholi Construction Ltd', contact: '+256 782 100 200', email: 'info@acholiconstruction.com', address: 'Gulu', balance: 4200000, creditLimit: 30000000 },
            { id: 'cust4', name: 'St. Marys Hospital Lacor', contact: '+256 471 432 200', email: 'admin@lacorhospital.org', address: 'Lacor, Gulu', balance: 0, creditLimit: 20000000 },
            { id: 'cust5', name: 'Gulu University', contact: '+256 471 432 500', email: 'procurement@gu.ac.ug', address: 'Gulu', balance: 6300000, creditLimit: 60000000 }
        ]);

        // Chart of Accounts with isCashAccount and currency
        DataStore.setAll('accounts', [
            { id: '1000', code: '1000', name: 'Cash on Hand', type: 'asset', category: 'current_asset', balance: 45000000, isCashAccount: true, currency: 'UGX' },
            { id: '1010', code: '1010', name: 'Stanbic Bank UGX', type: 'asset', category: 'current_asset', balance: 180000000, isCashAccount: true, currency: 'UGX' },
            { id: '1020', code: '1020', name: 'DFCU Bank UGX', type: 'asset', category: 'current_asset', balance: 65000000, isCashAccount: true, currency: 'UGX' },
            { id: '1030', code: '1030', name: 'Stanbic Bank USD', type: 'asset', category: 'current_asset', balance: 25000, isCashAccount: true, currency: 'USD' },
            { id: '1100', code: '1100', name: 'Accounts Receivable', type: 'asset', category: 'current_asset', balance: 31400000, isCashAccount: false, currency: 'UGX' },
            { id: '1200', code: '1200', name: 'Inventory - PMS', type: 'asset', category: 'current_asset', balance: 294250000, isCashAccount: false, currency: 'UGX' },
            { id: '1210', code: '1210', name: 'Inventory - AGO', type: 'asset', category: 'current_asset', balance: 367250000, isCashAccount: false, currency: 'UGX' },
            { id: '1500', code: '1500', name: 'Equipment & Vehicles', type: 'asset', category: 'fixed_asset', balance: 120000000, isCashAccount: false, currency: 'UGX' },
            { id: '2000', code: '2000', name: 'Accounts Payable', type: 'liability', category: 'current_liability', balance: 52000000, isCashAccount: false, currency: 'UGX' },
            { id: '2010', code: '2010', name: 'Accounts Payable - USD', type: 'liability', category: 'current_liability', balance: 0, isCashAccount: false, currency: 'USD' },
            { id: '2100', code: '2100', name: 'VAT Payable', type: 'liability', category: 'current_liability', balance: 18500000, isCashAccount: false, currency: 'UGX' },
            { id: '2200', code: '2200', name: 'PAYE Payable', type: 'liability', category: 'current_liability', balance: 4200000, isCashAccount: false, currency: 'UGX' },
            { id: '3000', code: '3000', name: 'Owners Equity', type: 'equity', category: 'equity', balance: 800000000, isCashAccount: false, currency: 'UGX' },
            { id: '3100', code: '3100', name: 'Retained Earnings', type: 'equity', category: 'equity', balance: 95000000, isCashAccount: false, currency: 'UGX' },
            { id: '4000', code: '4000', name: 'Sales Revenue - PMS', type: 'revenue', category: 'revenue', balance: 168000000, isCashAccount: false, currency: 'UGX' },
            { id: '4010', code: '4010', name: 'Sales Revenue - AGO', type: 'revenue', category: 'revenue', balance: 202500000, isCashAccount: false, currency: 'UGX' },
            { id: '4100', code: '4100', name: 'Other Income', type: 'revenue', category: 'revenue', balance: 3500000, isCashAccount: false, currency: 'UGX' },
            { id: '5000', code: '5000', name: 'COGS - PMS', type: 'expense', category: 'cogs', balance: 147000000, isCashAccount: false, currency: 'UGX' },
            { id: '5010', code: '5010', name: 'COGS - AGO', type: 'expense', category: 'cogs', balance: 175500000, isCashAccount: false, currency: 'UGX' },
            { id: '5100', code: '5100', name: 'Freight & Transport', type: 'expense', category: 'operating', balance: 18200000, isCashAccount: false, currency: 'UGX' },
            { id: '5200', code: '5200', name: 'Insurance', type: 'expense', category: 'operating', balance: 4800000, isCashAccount: false, currency: 'UGX' },
            { id: '5300', code: '5300', name: 'Customs & Duties', type: 'expense', category: 'operating', balance: 8500000, isCashAccount: false, currency: 'UGX' },
            { id: '5400', code: '5400', name: 'Handling & Storage', type: 'expense', category: 'operating', balance: 3200000, isCashAccount: false, currency: 'UGX' },
            { id: '5500', code: '5500', name: 'Operating Expenses', type: 'expense', category: 'operating', balance: 12000000, isCashAccount: false, currency: 'UGX' },
            { id: '5600', code: '5600', name: 'Salaries & Wages', type: 'expense', category: 'operating', balance: 24000000, isCashAccount: false, currency: 'UGX' }
        ]);

        // Exchange rates - last 7 days
        const rates = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            rates.push({ id: Utils.id(), date: d.toISOString().split('T')[0], rate: 3750 + Math.round(Math.random() * 30 - 15) });
        }
        DataStore.setAll('exchange_rates', rates);

        // Seed GRNs, purchases, sales, journals, payments
        const now = Date.now();
        const day = 86400000;

        const grns = [
            { id: 'grn1', grnNo: 'GRN-0001', supplierId: 'sup1', branchId: 'br1', productId: 'pms', warehouseId: 'wh1', quantity: 20000, unitCost: 4100, totalCost: 82000000, date: new Date(now - 15*day).toISOString().split('T')[0], status: 'closed' },
            { id: 'grn2', grnNo: 'GRN-0002', supplierId: 'sup2', branchId: 'br1', productId: 'ago', warehouseId: 'wh2', quantity: 30000, unitCost: 3800, totalCost: 114000000, date: new Date(now - 12*day).toISOString().split('T')[0], status: 'costed' },
            { id: 'grn3', grnNo: 'GRN-0003', supplierId: 'sup1', branchId: 'br2', productId: 'pms', warehouseId: 'wh3', quantity: 40000, unitCost: 4150, totalCost: 166000000, date: new Date(now - 8*day).toISOString().split('T')[0], status: 'costed' },
            { id: 'grn4', grnNo: 'GRN-0004', supplierId: 'sup2', branchId: 'br2', productId: 'ago', warehouseId: 'wh4', quantity: 50000, unitCost: 3850, totalCost: 192500000, date: new Date(now - 5*day).toISOString().split('T')[0], status: 'received' }
        ];
        DataStore.setAll('grn', grns);

        // Landed costs — each with its own service provider supplier
        DataStore.setAll('landed_costs', [
            { id: 'lc1', grnId: 'grn1', costType: 'freight', description: 'Truck transport Kampala to Gulu', amount: 2400000, currency: 'UGX', exchangeRate: 1, amountUGX: 2400000, supplierId: 'sup4', date: new Date(now - 15*day).toISOString().split('T')[0], apInvoiceId: 'apv2' },
            { id: 'lc2', grnId: 'grn1', costType: 'insurance', description: 'Transit insurance cover', amount: 600000, currency: 'UGX', exchangeRate: 1, amountUGX: 600000, supplierId: 'sup5', date: new Date(now - 15*day).toISOString().split('T')[0], apInvoiceId: 'apv3' },
            { id: 'lc3', grnId: 'grn2', costType: 'freight', description: 'Freight & Transport', amount: 3000000, currency: 'UGX', exchangeRate: 1, amountUGX: 3000000, supplierId: 'sup4', date: new Date(now - 12*day).toISOString().split('T')[0], apInvoiceId: '' },
            { id: 'lc4', grnId: 'grn2', costType: 'handling', description: 'Offloading & handling fees', amount: 500000, currency: 'UGX', exchangeRate: 1, amountUGX: 500000, supplierId: 'sup2', date: new Date(now - 12*day).toISOString().split('T')[0], apInvoiceId: '' },
            { id: 'lc5', grnId: 'grn3', costType: 'freight', description: 'Freight & Transport to Kampala depot', amount: 4500000, currency: 'UGX', exchangeRate: 1, amountUGX: 4500000, supplierId: 'sup4', date: new Date(now - 8*day).toISOString().split('T')[0], apInvoiceId: '' },
            { id: 'lc6', grnId: 'grn3', costType: 'customs', description: 'Customs duties & levies', amount: 2000000, currency: 'UGX', exchangeRate: 1, amountUGX: 2000000, supplierId: '', date: new Date(now - 8*day).toISOString().split('T')[0], apInvoiceId: '' },
            { id: 'lc7', grnId: 'grn3', costType: 'insurance', description: 'Transit insurance', amount: 800000, currency: 'UGX', exchangeRate: 1, amountUGX: 800000, supplierId: 'sup5', date: new Date(now - 8*day).toISOString().split('T')[0], apInvoiceId: '' }
        ]);

        // AP invoices — separate invoice per cost line, each to its own supplier
        DataStore.setAll('ap_invoices', [
            { id: 'apv1', invoiceNo: 'APV-0001', supplierId: 'sup1', currency: 'UGX', exchangeRate: 1, amount: 82000000, amountUGX: 82000000, paid: 40000000, date: new Date(now - 15*day).toISOString().split('T')[0], grnId: 'grn1', invoiceType: 'goods', landedCostId: '', description: 'GRN-0001 \u2014 PMS base purchase cost' },
            { id: 'apv2', invoiceNo: 'APV-0002', supplierId: 'sup4', currency: 'UGX', exchangeRate: 1, amount: 2400000, amountUGX: 2400000, paid: 2400000, date: new Date(now - 14*day).toISOString().split('T')[0], grnId: 'grn1', invoiceType: 'landed_cost', landedCostId: 'lc1', description: 'GRN-0001 \u2014 Freight transport' },
            { id: 'apv3', invoiceNo: 'APV-0003', supplierId: 'sup5', currency: 'UGX', exchangeRate: 1, amount: 600000, amountUGX: 600000, paid: 0, date: new Date(now - 14*day).toISOString().split('T')[0], grnId: 'grn1', invoiceType: 'landed_cost', landedCostId: 'lc2', description: 'GRN-0001 \u2014 Transit insurance' }
        ]);

        // Set sequence counters to match seeded data
        localStorage.setItem(CONFIG.APP_KEY + '_seq_GRN', '4');
        localStorage.setItem(CONFIG.APP_KEY + '_seq_GIN', '4');
        localStorage.setItem(CONFIG.APP_KEY + '_seq_APV', '3');
        localStorage.setItem(CONFIG.APP_KEY + '_seq_INV', '6');
        localStorage.setItem(CONFIG.APP_KEY + '_seq_QTN', '0');

        // Sales (multi-line format)
        const sales = [
            { id: Utils.id(), invoiceNo: 'INV-0001', customerId: 'cust1', branchId: 'br1', lines: [{productId:'pms',warehouseId:'wh1',quantity:5000,unitPrice:4800,lineTotal:24000000}], total: 24000000, paid: 11500000, date: new Date(now - 14*day).toISOString().split('T')[0], status: 'delivered' },
            { id: Utils.id(), invoiceNo: 'INV-0002', customerId: 'cust2', branchId: 'br1', lines: [{productId:'ago',warehouseId:'wh2',quantity:8000,unitPrice:4500,lineTotal:36000000}], total: 36000000, paid: 27600000, date: new Date(now - 10*day).toISOString().split('T')[0], status: 'delivered' },
            { id: Utils.id(), invoiceNo: 'INV-0003', customerId: 'cust3', branchId: 'br2', lines: [{productId:'ago',warehouseId:'wh4',quantity:3000,unitPrice:4500,lineTotal:13500000}], total: 13500000, paid: 9300000, date: new Date(now - 7*day).toISOString().split('T')[0], status: 'delivered' },
            { id: Utils.id(), invoiceNo: 'INV-0004', customerId: 'cust5', branchId: 'br2', lines: [{productId:'pms',warehouseId:'wh3',quantity:10000,unitPrice:4800,lineTotal:48000000}], total: 48000000, paid: 41700000, date: new Date(now - 4*day).toISOString().split('T')[0], status: 'delivered' },
            { id: Utils.id(), invoiceNo: 'INV-0005', customerId: 'cust1', branchId: 'br1', lines: [{productId:'ago',warehouseId:'wh2',quantity:6000,unitPrice:4500,lineTotal:27000000}], total: 27000000, paid: 27000000, date: new Date(now - 3*day).toISOString().split('T')[0], status: 'delivered' },
            { id: Utils.id(), invoiceNo: 'INV-0006', customerId: 'cust4', branchId: 'br1', lines: [{productId:'pms',warehouseId:'wh1',quantity:2000,unitPrice:4800,lineTotal:9600000}], total: 9600000, paid: 9600000, date: new Date(now - day).toISOString().split('T')[0], status: 'delivered' }
        ];
        DataStore.setAll('sales', sales);

        DataStore.setAll('journals', [
            { id: Utils.id(), date: new Date(now - 15*day).toISOString().split('T')[0], description: 'Purchase PMS from TotalEnergies', branchId: 'br1', entries: [{accountId:'1200',debit:86600000,credit:0},{accountId:'2000',debit:0,credit:82000000},{accountId:'1010',debit:0,credit:4600000}] },
            { id: Utils.id(), date: new Date(now - 14*day).toISOString().split('T')[0], description: 'Sale PMS to Gulu Municipal Council', branchId: 'br1', entries: [{accountId:'1100',debit:24000000,credit:0,customerId:'cust1'},{accountId:'4000',debit:0,credit:24000000}] },
            { id: Utils.id(), date: new Date(now - 10*day).toISOString().split('T')[0], description: 'Sale AGO to Northern Bus Company', branchId: 'br1', entries: [{accountId:'1100',debit:36000000,credit:0,customerId:'cust2'},{accountId:'4010',debit:0,credit:36000000}] },
            { id: Utils.id(), date: new Date(now - 3*day).toISOString().split('T')[0], description: 'Payment from Gulu Municipal', branchId: 'br1', entries: [{accountId:'1010',debit:27000000,credit:0},{accountId:'1100',debit:0,credit:27000000,customerId:'cust1'}] }
        ]);

        DataStore.setAll('payments', [
            { id: Utils.id(), customerId: 'cust1', amount: 11500000, method: 'bank_transfer', accountId: '1010', reference: 'TRF-001', date: new Date(now - 13*day).toISOString().split('T')[0] },
            { id: Utils.id(), customerId: 'cust2', amount: 27600000, method: 'bank_transfer', accountId: '1010', reference: 'TRF-002', date: new Date(now - 8*day).toISOString().split('T')[0] },
            { id: Utils.id(), customerId: 'cust3', amount: 9300000, method: 'bank_transfer', accountId: '1010', reference: 'TRF-004', date: new Date(now - 5*day).toISOString().split('T')[0] },
            { id: Utils.id(), customerId: 'cust5', amount: 41700000, method: 'bank_transfer', accountId: '1010', reference: 'TRF-005', date: new Date(now - 2*day).toISOString().split('T')[0] },
            { id: Utils.id(), customerId: 'cust1', amount: 27000000, method: 'bank_transfer', accountId: '1010', reference: 'TRF-003', date: new Date(now - 3*day).toISOString().split('T')[0] },
            { id: Utils.id(), customerId: 'cust4', amount: 9600000, method: 'cash', accountId: '1000', reference: 'CSH-001', date: new Date(now - day).toISOString().split('T')[0] }
        ]);

        // Goods Issues (GIN)
        const goodsIssues = [
            { id: 'gin1', ginNo: 'GIN-0001', date: new Date(now - 13*day).toISOString().split('T')[0], branchId: 'br1', warehouseId: 'wh1', productId: 'pms', quantity: 5000, costPerL: 4200, reason: 'sale', customerId: 'cust1', supplierId: '', reference: 'INV-0001', description: 'Delivery to Gulu Municipal Council', status: 'issued' },
            { id: 'gin2', ginNo: 'GIN-0002', date: new Date(now - 9*day).toISOString().split('T')[0], branchId: 'br1', warehouseId: 'wh2', productId: 'ago', quantity: 8000, costPerL: 3900, reason: 'sale', customerId: 'cust2', supplierId: '', reference: 'INV-0002', description: 'Delivery to Northern Bus Company', status: 'issued' },
            { id: 'gin3', ginNo: 'GIN-0003', date: new Date(now - 6*day).toISOString().split('T')[0], branchId: 'br2', warehouseId: 'wh4', productId: 'ago', quantity: 3000, costPerL: 3850, reason: 'sale', customerId: 'cust3', supplierId: '', reference: 'INV-0003', description: 'Delivery to Acholi Construction', status: 'issued' },
            { id: 'gin4', ginNo: 'GIN-0004', date: new Date(now - 3*day).toISOString().split('T')[0], branchId: 'br1', warehouseId: 'wh2', productId: 'ago', quantity: 500, costPerL: 3900, reason: 'internal_use', customerId: '', supplierId: '', reference: '', description: 'Generator fuel — Gulu office', status: 'issued' }
        ];
        DataStore.setAll('goods_issues', goodsIssues);

        DataStore.setAll('supplier_payments', []);
        DataStore.setAll('stock_transfers', []);
        DataStore.setAll('quotations', []);

        DataStore.markSeeded();
        console.log('Seed data loaded (v' + CONFIG.VERSION + ')');
    }
};

// ============================================================
// UI HELPERS
// ============================================================
const UI = {
    $: (sel) => document.querySelector(sel),
    $$: (sel) => document.querySelectorAll(sel),
    toast: (message, type) => {
        type = type || 'success';
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => { toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 300); }, 3000);
    },
    modal: (title, bodyHtml, wide) => {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHtml;
        const box = document.getElementById('modal-box');
        if (wide) box.classList.add('modal-wide'); else box.classList.remove('modal-wide');
        document.getElementById('modal-overlay').classList.remove('hidden');
    },
    closeModal: () => { document.getElementById('modal-overlay').classList.add('hidden'); },
    setPageTitle: (title, sub) => {
        document.getElementById('breadcrumb-module').textContent = title;
        const subEl = document.getElementById('breadcrumb-sub');
        if (sub) { subEl.textContent = sub; subEl.classList.remove('hidden'); } else { subEl.classList.add('hidden'); }
    },
    render: (html) => { document.getElementById('content-area').innerHTML = html; },
    getProductName: (id) => { const p = DataStore.getById('products', id); return p ? p.name : id; },
    getProductCode: (id) => { const p = DataStore.getById('products', id); return p ? p.code : id; },
    getWarehouseName: (id) => { const w = DataStore.getById('warehouses', id); return w ? w.name : id; },
    getBranchName: (id) => { const b = DataStore.getById('branches', id); return b ? b.name : id; },
    getSupplierName: (id) => { const s = DataStore.getById('suppliers', id); return s ? s.name : id; },
    getCustomerName: (id) => { const c = DataStore.getById('customers', id); return c ? c.name : id; },
    getAccountName: (id) => { const a = DataStore.getById('accounts', id); return a ? (a.code + ' - ' + a.name) : id; },
    warehouseOptions: (branchId) => {
        let whs = DataStore.getAll('warehouses');
        if (branchId) whs = whs.filter(w => w.branchId === branchId);
        return whs.map(w => '<option value="' + w.id + '">' + Utils.escapeHtml(w.name) + '</option>').join('');
    },
    branchOptions: () => DataStore.getAll('branches').map(b => '<option value="' + b.id + '">' + Utils.escapeHtml(b.name) + '</option>').join(''),
    productOptions: () => DataStore.getAll('products').map(p => '<option value="' + p.id + '">' + Utils.escapeHtml(p.name) + '</option>').join(''),
    supplierOptions: () => DataStore.getAll('suppliers').map(s => '<option value="' + s.id + '">' + Utils.escapeHtml(s.name) + '</option>').join(''),
    customerOptions: () => DataStore.getAll('customers').map(c => '<option value="' + c.id + '">' + Utils.escapeHtml(c.name) + '</option>').join(''),
    cashAccountOptions: () => DataStore.getAll('accounts').filter(a => a.isCashAccount).map(a => '<option value="' + a.id + '">' + Utils.escapeHtml(a.code + ' - ' + a.name) + ' (' + a.currency + ')' + '</option>').join(''),
    accountOptions: () => DataStore.getAll('accounts').map(a => '<option value="' + a.id + '">' + Utils.escapeHtml(a.code + ' - ' + a.name) + '</option>').join(''),
    branchFilter: (callbackStr) => {
        const branches = DataStore.getAll('branches');
        let html = '<div class="branch-filter" style="margin-bottom:12px">';
        html += '<label style="font-size:0.85rem;color:var(--text-secondary);margin-right:8px">Branch:</label>';
        html += '<select id="branch-filter-select" onchange="State.filterBranch=this.value;' + callbackStr + '" style="padding:4px 8px;border-radius:6px;border:1px solid var(--content-border);font-size:0.85rem;background:var(--content-card);color:var(--text-primary)">';
        html += '<option value=""' + (State.filterBranch === '' ? ' selected' : '') + '>All Branches</option>';
        branches.forEach(b => {
            html += '<option value="' + b.id + '"' + (State.filterBranch === b.id ? ' selected' : '') + '>' + Utils.escapeHtml(b.name) + '</option>';
        });
        html += '</select></div>';
        return html;
    },
    productFilter: (callbackStr) => {
        const products = DataStore.getAll('products');
        let html = '<select id="product-filter-select" onchange="State.filterProduct=this.value;' + callbackStr + '" style="padding:4px 8px;border-radius:6px;border:1px solid var(--content-border);font-size:0.85rem;background:var(--content-card);color:var(--text-primary);margin-left:8px">';
        html += '<option value=""' + (State.filterProduct === '' ? ' selected' : '') + '>All Products</option>';
        products.forEach(p => {
            html += '<option value="' + p.id + '"' + (State.filterProduct === p.id ? ' selected' : '') + '>' + Utils.escapeHtml(p.name) + '</option>';
        });
        html += '</select>';
        return html;
    },
    dateFilterBar: (onChangeCallback) => {
        return '<div class="date-filter-bar">' +
            '<label>From:</label><input type="date" id="filter-date-from" value="' + (State.dateFrom || '') + '" onchange="State.dateFrom=this.value;' + onChangeCallback + '">' +
            '<label>To:</label><input type="date" id="filter-date-to" value="' + (State.dateTo || '') + '" onchange="State.dateTo=this.value;' + onChangeCallback + '">' +
            '<button class="btn btn-sm btn-ghost" onclick="State.dateFrom=\'\';State.dateTo=\'\';' + onChangeCallback + '">Clear</button></div>';
    },
    filterByDate: (items, dateField) => {
        let result = items;
        if (State.dateFrom) result = result.filter(i => i[dateField] >= State.dateFrom);
        if (State.dateTo) result = result.filter(i => i[dateField] <= State.dateTo);
        return result;
    }
};

// ============================================================
// AUTHENTICATION
// ============================================================
const Auth = {
    login: (username, password) => {
        if (username === CONFIG.CREDENTIALS.username && password === CONFIG.CREDENTIALS.password) {
            State.isLoggedIn = true;
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
            Router.navigate('dashboard');
            return true;
        }
        return false;
    },
    logout: () => {
        State.isLoggedIn = false;
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    }
};

// ============================================================
// ROUTER
// ============================================================
const Router = {
    navigate: (module) => {
        State.currentModule = module;
        // Update active nav
        document.querySelectorAll('.nav-item[data-module]').forEach(el => {
            el.classList.toggle('active', el.dataset.module === module);
        });
        // Close sidebar on mobile
        const sidebar = document.getElementById('sidebar');
        if (window.innerWidth < 768 && sidebar) sidebar.classList.remove('open');

        switch (module) {
            case 'dashboard': Dashboard.render(); break;
            case 'stock_overview': Inventory.renderOverview(); break;
            case 'stock_movements': Inventory.renderMovements(); break;
            case 'branches': Branches.render(); break;
            case 'goods_receipt': GoodsReceipt.render(); break;
            case 'goods_issue': GoodsIssue.render(); break;
            case 'landed_cost': LandedCostModule.render(); break;
            case 'ap_invoices': APInvoices.render(); break;
            case 'suppliers': Suppliers.render(); break;
            case 'quotations': Quotations.render(); break;
            case 'sales': Sales.render(); break;
            case 'customers': Customers.render(); break;
            case 'receive_payment': PaymentsReceived.render(); break;
            case 'customer_statements': CustomerStatements.render(); break;
            case 'supplier_statements': SupplierStatements.render(); break;
            case 'accounting': Accounting.render(); break;
            case 'journal_entries': Accounting.currentView = 'journals'; Accounting.render(); break;
            case 'financial_reports': FinancialReports.render(); break;
            case 'exchange_rates': ExchangeRates.render(); break;
            case 'reports': Reports.render(); break;
            default: Dashboard.render();
        }
    }
};

// ============================================================
// DASHBOARD
// ============================================================
const Dashboard = {
    render: () => {
        UI.setPageTitle('Dashboard');
        const sales = DataStore.getAll('sales');
        const inventory = DataStore.getAll('inventory');
        const products = DataStore.getAll('products');
        const customers = DataStore.getAll('customers');
        const grns = DataStore.getAll('grn');

        let totalRevenue = 0, totalPaid = 0, totalStock = 0, totalStockValue = 0;
        sales.forEach(s => { totalRevenue += s.total; totalPaid += s.paid; });
        inventory.forEach(i => { totalStock += i.quantity; totalStockValue += i.quantity * i.avgCost; });
        let totalOutstanding = 0;
        customers.forEach(c => { totalOutstanding += (c.balance || 0); });

        let html = '<div class="stat-cards">';
        html += Dashboard._statCard('Total Revenue', Utils.currency(totalRevenue), sales.length + ' invoices', 'green', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>');
        html += Dashboard._statCard('Collected', Utils.currency(totalPaid), Utils.pct(totalPaid, totalRevenue) + '% collected', 'blue', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>');
        html += Dashboard._statCard('Outstanding', Utils.currency(totalOutstanding), customers.length + ' customers', 'yellow', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>');
        html += Dashboard._statCard('Stock Value', Utils.currency(totalStockValue), Utils.volume(totalStock) + ' total', 'red', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>');
        html += '</div>';

        // Quick actions
        html += '<div class="quick-actions" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-bottom:20px">';
        html += '<button class="btn btn-primary" onclick="Router.navigate(\'goods_receipt\')">New Goods Receipt</button>';
        html += '<button class="btn btn-primary" onclick="GoodsIssue.showCreate()">New Goods Issue</button>';
        html += '<button class="btn btn-primary" onclick="Sales.showCreateSale()">New Sale</button>';
        html += '<button class="btn btn-secondary" onclick="Quotations.showCreate()">New Quotation</button>';
        html += '<button class="btn btn-secondary" onclick="PaymentsReceived.showRecordPayment()">Receive Payment</button>';
        html += '<button class="btn btn-secondary" onclick="Inventory.showTransferStock()">Transfer Stock</button>';
        html += '</div>';

        // Dashboard grid
        html += '<div class="dashboard-grid">';

        // Revenue chart
        html += '<div class="section-card"><div class="section-card-header"><span class="section-card-title">Sales - Last 7 Days</span></div><div class="section-card-body" style="text-align:center">';
        html += Charts.revenueBarChart(sales, 320, 180);
        html += '</div></div>';

        // Stock by warehouse
        html += '<div class="section-card"><div class="section-card-header"><span class="section-card-title">Stock Levels</span></div><div class="section-card-body">';
        const warehouses = DataStore.getAll('warehouses');
        warehouses.forEach(wh => {
            const inv = inventory.find(i => i.warehouseId === wh.id);
            const qty = inv ? inv.quantity : 0;
            const pct = Utils.pct(qty, wh.capacity);
            const color = pct > 60 ? 'green' : pct > 25 ? 'yellow' : 'red';
            html += '<div class="stock-bar-wrapper"><div class="stock-bar-label"><span>' + Utils.escapeHtml(wh.name) + '</span><span>' + Utils.volume(qty) + '</span></div>';
            html += '<div class="stock-bar"><div class="stock-bar-fill ' + color + '" style="width:' + Math.min(pct, 100) + '%"></div></div></div>';
        });
        html += '</div></div>';

        // Recent sales
        html += '<div class="section-card"><div class="section-card-header"><span class="section-card-title">Recent Sales</span></div>';
        html += '<div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th class="text-right">Amount</th><th>Status</th></tr></thead><tbody>';
        sales.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).forEach(s => {
            const badge = s.paid >= s.total ? '<span class="badge badge-success">Paid</span>' : '<span class="badge badge-warning">Partial</span>';
            html += '<tr><td class="text-mono text-bold">' + s.invoiceNo + '</td><td><a href="#" onclick="event.preventDefault();Customers.viewStatement(\'' + s.customerId + '\')" class="text-link">' + Utils.escapeHtml(UI.getCustomerName(s.customerId)) + '</a></td><td>' + Utils.dateDisplay(s.date) + '</td><td class="text-right text-mono">' + Utils.currency(s.total) + '</td><td>' + badge + '</td></tr>';
        });
        html += '</tbody></table></div></div>';

        // Recent GRNs
        html += '<div class="section-card"><div class="section-card-header"><span class="section-card-title">Recent Goods Receipts</span></div>';
        html += '<div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>GRN</th><th>Supplier</th><th>Product</th><th class="text-right">Qty</th><th>Date</th></tr></thead><tbody>';
        grns.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).forEach(g => {
            html += '<tr><td class="text-mono text-bold">' + g.grnNo + '</td><td>' + Utils.escapeHtml(UI.getSupplierName(g.supplierId)) + '</td><td>' + Utils.escapeHtml(UI.getProductCode(g.productId)) + '</td><td class="text-right text-mono">' + Utils.volume(g.quantity) + '</td><td>' + Utils.dateDisplay(g.date) + '</td></tr>';
        });
        html += '</tbody></table></div></div>';

        html += '</div>'; // end dashboard-grid
        UI.render(html);
    },

    _statCard: (title, value, subtitle, color, icon) => {
        return '<div class="stat-card stat-card-' + color + '"><div class="stat-icon">' + icon + '</div><div class="stat-content"><div class="stat-value">' + value + '</div><div class="stat-label">' + title + '</div><div class="stat-sub">' + (subtitle || '') + '</div></div></div>';
    }
};

// ============================================================
// BRANCHES & WAREHOUSES MODULE
// ============================================================
const Branches = {
    render: () => {
        UI.setPageTitle('Branches & Warehouses');
        const branches = DataStore.getAll('branches');
        const warehouses = DataStore.getAll('warehouses');
        const inventory = DataStore.getAll('inventory');
        let html = '<div class="flex-between mb-16"><span></span><button class="btn btn-primary" onclick="Branches.showAddBranch()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Branch</button></div>';

        branches.forEach(br => {
            const brWarehouses = warehouses.filter(w => w.branchId === br.id);
            html += '<div class="section-card" style="margin-bottom:16px">';
            html += '<div class="section-card-header"><span class="section-card-title">' + Utils.escapeHtml(br.name) + ' <span class="badge badge-neutral">' + br.code + '</span></span><span class="text-muted">' + Utils.escapeHtml(br.location || '') + '</span></div>';
            html += '<div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>Warehouse</th><th>Product</th><th class="text-right">Capacity (L)</th><th class="text-right">Current Stock</th><th class="text-right">Utilization</th><th class="text-right">Stock Value</th></tr></thead><tbody>';
            brWarehouses.forEach(wh => {
                const inv = inventory.find(i => i.warehouseId === wh.id);
                const qty = inv ? inv.quantity : 0;
                const avgCost = inv ? inv.avgCost : 0;
                const val = qty * avgCost;
                const util = wh.capacity > 0 ? Utils.pct(qty, wh.capacity) : 0;
                const utilBadge = util > 80 ? '<span class="badge badge-danger">' + util + '%</span>' : util > 50 ? '<span class="badge badge-warning">' + util + '%</span>' : '<span class="badge badge-success">' + util + '%</span>';
                html += '<tr><td class="text-bold">' + Utils.escapeHtml(wh.name) + '</td><td>' + Utils.escapeHtml(UI.getProductCode(wh.productId)) + '</td><td class="text-right text-mono">' + Utils.num(wh.capacity) + '</td><td class="text-right text-mono">' + Utils.volume(qty) + '</td><td class="text-right">' + utilBadge + '</td><td class="text-right text-mono">' + Utils.currency(val) + '</td></tr>';
            });
            html += '</tbody></table></div></div>';
        });
        UI.render(html);
    },
    showAddBranch: () => {
        const html = '<form class="modal-form" id="add-branch-form"><div class="form-group"><label>Branch Name</label><input type="text" name="name" required placeholder="e.g. Lira Branch"></div><div class="form-row"><div class="form-group"><label>Code</label><input type="text" name="code" required placeholder="e.g. LIRA" maxlength="5"></div><div class="form-group"><label>Location</label><input type="text" name="location" placeholder="Address"></div></div><div class="form-row"><div class="form-group"><label>PMS Tank Capacity (L)</label><input type="number" name="pmsCap" min="1000" value="50000" required></div><div class="form-group"><label>AGO Tank Capacity (L)</label><input type="number" name="agoCap" min="1000" value="50000" required></div></div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create Branch</button></div></form>';
        UI.modal('Add New Branch', html);
        document.getElementById('add-branch-form').onsubmit = (e) => {
            e.preventDefault();
            const f = e.target;
            const brId = Utils.id();
            DataStore.insert('branches', { id: brId, name: f.name.value, code: f.code.value.toUpperCase(), location: f.location.value });
            DataStore.insert('warehouses', { name: f.name.value + ' PMS Tank', branchId: brId, productId: 'pms', capacity: parseFloat(f.pmsCap.value) });
            DataStore.insert('warehouses', { name: f.name.value + ' AGO Tank', branchId: brId, productId: 'ago', capacity: parseFloat(f.agoCap.value) });
            UI.closeModal();
            UI.toast('Branch created with PMS + AGO warehouses');
            Branches.render();
        };
    }
};

// ============================================================
// INVENTORY MODULE
// ============================================================
const Inventory = {
    renderOverview: () => {
        UI.setPageTitle('Stock Overview');
        const products = DataStore.getAll('products');
        const warehouses = DataStore.getAll('warehouses');
        const branches = DataStore.getAll('branches');
        const inventory = DataStore.getAll('inventory');
        let html = '';

        // Filters
        html += '<div class="flex-between mb-16" style="flex-wrap:wrap;gap:8px">';
        html += '<div style="display:flex;align-items:center;gap:8px">';
        html += UI.branchFilter('Inventory.renderOverview()');
        html += UI.productFilter('Inventory.renderOverview()');
        html += '</div>';
        html += '<div class="btn-group">';
        html += '<button class="btn btn-secondary btn-sm" onclick="CSVExport.exportInventory()">CSV</button>';
        html += '<button class="btn btn-primary" onclick="Inventory.showAddStock()">Add Stock</button>';
        html += '<button class="btn btn-secondary" onclick="Inventory.showTransferStock()">Transfer</button>';
        html += '</div></div>';

        // Summary cards
        let totalQty = 0, totalValue = 0;
        inventory.forEach(i => { totalQty += i.quantity; totalValue += i.quantity * i.avgCost; });
        html += '<div class="stat-cards">';
        html += Dashboard._statCard('Total Stock', Utils.volume(totalQty), 'across all warehouses', 'blue', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>');
        html += Dashboard._statCard('Total Value', Utils.currency(totalValue), products.length + ' products', 'green', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>');
        html += '</div>';

        // Stock table with proper alignment
        html += '<div class="section-card"><div class="section-card-header"><span class="section-card-title">Stock by Warehouse</span></div>';
        html += '<div class="section-card-body no-padding"><table class="data-table" style="table-layout:fixed;width:100%"><thead><tr>';
        html += '<th style="width:15%">Branch</th><th style="width:20%">Warehouse</th><th style="width:10%">Product</th><th style="width:15%" class="text-right">Quantity (L)</th><th style="width:15%" class="text-right">Avg Cost/L</th><th style="width:15%" class="text-right">Total Value</th><th style="width:10%">Status</th></tr></thead><tbody>';

        let filteredWarehouses = warehouses;
        if (State.filterBranch) filteredWarehouses = filteredWarehouses.filter(w => w.branchId === State.filterBranch);
        if (State.filterProduct) filteredWarehouses = filteredWarehouses.filter(w => w.productId === State.filterProduct);

        let grandTotal = 0;
        filteredWarehouses.forEach(wh => {
            const br = DataStore.getById('branches', wh.branchId);
            const inv = inventory.find(i => i.warehouseId === wh.id);
            const qty = inv ? inv.quantity : 0;
            const avgCost = inv ? inv.avgCost : 0;
            const value = qty * avgCost;
            grandTotal += value;
            const status = qty < CONFIG.LOW_STOCK_THRESHOLD ? '<span class="badge badge-danger">Low</span>' : qty < CONFIG.LOW_STOCK_THRESHOLD * 3 ? '<span class="badge badge-warning">Medium</span>' : '<span class="badge badge-success">Good</span>';
            html += '<tr><td>' + Utils.escapeHtml(br ? br.name : '-') + '</td><td class="text-bold">' + Utils.escapeHtml(wh.name) + '</td><td>' + Utils.escapeHtml(UI.getProductCode(wh.productId)) + '</td>';
            html += '<td class="text-right text-mono">' + Utils.volume(qty) + '</td><td class="text-right text-mono">' + Utils.currency(avgCost) + '</td><td class="text-right text-mono">' + Utils.currency(value) + '</td><td>' + status + '</td></tr>';
        });
        html += '</tbody><tfoot><tr><td colspan="5" class="text-bold">Grand Total</td><td class="text-right text-mono text-bold">' + Utils.currency(grandTotal) + '</td><td></td></tr></tfoot></table></div></div>';

        UI.render(html);
    },

    renderMovements: () => {
        UI.setPageTitle('Stock Movements');
        const grns = DataStore.getAll('grn');
        const sales = DataStore.getAll('sales');
        const transfers = DataStore.getAll('stock_transfers');
        const goodsIssues = DataStore.getAll('goods_issues');
        const warehouses = DataStore.getAll('warehouses');
        let html = '';

        // Filters
        html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">';
        html += UI.branchFilter('Inventory.renderMovements()');
        html += UI.productFilter('Inventory.renderMovements()');
        html += '</div>';
        html += UI.dateFilterBar('Inventory.renderMovements()');

        // Build movements list
        let movements = [];
        grns.forEach(g => {
            const wh = DataStore.getById('warehouses', g.warehouseId);
            movements.push({ date: g.date, type: 'IN', productId: g.productId, warehouseId: g.warehouseId, branchId: g.branchId, qtyIn: g.quantity, qtyOut: 0, costAmount: g.totalCost, salesAmount: 0, reference: 'GRN: ' + g.grnNo + ' from ' + UI.getSupplierName(g.supplierId) });
        });
        sales.forEach(s => {
            (s.lines || []).forEach(line => {
                const wh = DataStore.getById('warehouses', line.warehouseId);
                movements.push({ date: s.date, type: 'OUT', productId: line.productId, warehouseId: line.warehouseId, branchId: s.branchId, qtyIn: 0, qtyOut: line.quantity, costAmount: 0, salesAmount: line.lineTotal, reference: 'Sale: ' + s.invoiceNo + ' to ' + UI.getCustomerName(s.customerId) });
            });
        });
        goodsIssues.forEach(g => {
            if (g.status === 'reversed') return;
            const reason = GoodsIssue._reasonLabel(g.reason);
            let ref = 'GIN: ' + g.ginNo + ' \u2014 ' + reason;
            if (g.reason === 'sale' && g.customerId) ref += ' to ' + UI.getCustomerName(g.customerId);
            else if (g.reason === 'return_supplier' && g.supplierId) ref += ' to ' + UI.getSupplierName(g.supplierId);
            movements.push({ date: g.date, type: 'OUT', productId: g.productId, warehouseId: g.warehouseId, branchId: g.branchId, qtyIn: 0, qtyOut: g.quantity, costAmount: g.quantity * (g.costPerL || 0), salesAmount: 0, reference: ref });
        });
        transfers.forEach(t => {
            movements.push({ date: t.date, type: 'TRANSFER', productId: t.productId, warehouseId: t.fromWarehouseId || '', branchId: '', qtyIn: 0, qtyOut: t.quantity, costAmount: 0, salesAmount: 0, reference: 'Transfer: ' + UI.getWarehouseName(t.fromWarehouseId) + ' \u2192 ' + UI.getWarehouseName(t.toWarehouseId) });
        });

        // Apply filters
        if (State.filterBranch) movements = movements.filter(m => m.branchId === State.filterBranch);
        if (State.filterProduct) movements = movements.filter(m => m.productId === State.filterProduct);
        movements = UI.filterByDate(movements, 'date');
        movements.sort((a, b) => a.date.localeCompare(b.date));

        // Calculate running balance
        let runningQty = 0;
        movements.forEach(m => { runningQty += m.qtyIn - m.qtyOut; m.runningBalance = runningQty; });

        // Reverse for display (newest first) but keep running balance
        movements.reverse();

        html += '<div class="section-card"><div class="section-card-header"><span class="section-card-title">Stock Movements</span><span class="text-muted">' + movements.length + ' entries</span></div>';
        html += '<div class="section-card-body no-padding" style="overflow-x:auto"><table class="data-table" style="table-layout:fixed;width:100%;min-width:900px"><thead><tr>';
        html += '<th style="width:10%">Date</th><th style="width:7%">Type</th><th style="width:7%">Product</th><th style="width:13%">Warehouse</th>';
        html += '<th style="width:10%" class="text-right">Qty In</th><th style="width:10%" class="text-right">Qty Out</th>';
        html += '<th style="width:12%" class="text-right">Cost Amount</th><th style="width:12%" class="text-right">Sales Amount</th>';
        html += '<th style="width:10%" class="text-right">Balance</th><th style="width:auto">Reference</th></tr></thead><tbody>';

        if (movements.length === 0) {
            html += '<tr><td colspan="10" class="text-center text-muted" style="padding:32px">No stock movements found.</td></tr>';
        } else {
            movements.forEach(m => {
                const badge = m.type === 'IN' ? '<span class="badge badge-success">IN</span>' : m.type === 'OUT' ? '<span class="badge badge-danger">OUT</span>' : '<span class="badge badge-info">TRF</span>';
                html += '<tr><td>' + Utils.dateDisplay(m.date) + '</td><td>' + badge + '</td><td>' + Utils.escapeHtml(UI.getProductCode(m.productId)) + '</td>';
                html += '<td>' + Utils.escapeHtml(UI.getWarehouseName(m.warehouseId)) + '</td>';
                html += '<td class="text-right text-mono text-success">' + (m.qtyIn > 0 ? Utils.volume(m.qtyIn) : '-') + '</td>';
                html += '<td class="text-right text-mono text-danger">' + (m.qtyOut > 0 ? Utils.volume(m.qtyOut) : '-') + '</td>';
                html += '<td class="text-right text-mono">' + (m.costAmount > 0 ? Utils.currency(m.costAmount) : '-') + '</td>';
                html += '<td class="text-right text-mono">' + (m.salesAmount > 0 ? Utils.currency(m.salesAmount) : '-') + '</td>';
                html += '<td class="text-right text-mono text-bold">' + Utils.volume(m.runningBalance) + '</td>';
                html += '<td style="font-size:0.8rem">' + Utils.escapeHtml(m.reference) + '</td></tr>';
            });
        }
        html += '</tbody></table></div></div>';
        UI.render(html);
    },

    showAddStock: () => {
        const html = '<form class="modal-form" id="add-stock-form"><div class="form-row"><div class="form-group"><label>Branch</label><select name="branchId" required onchange="Inventory._updateWarehouseDropdown(this.value,document.querySelector(\'[name=warehouseId]\'))">' + UI.branchOptions() + '</select></div><div class="form-group"><label>Product</label><select name="productId" required>' + UI.productOptions() + '</select></div></div><div class="form-row"><div class="form-group"><label>Warehouse</label><select name="warehouseId" required>' + UI.warehouseOptions() + '</select></div><div class="form-group"><label>Quantity (L)</label><input type="number" name="quantity" min="1" required></div></div><div class="form-group"><label>Cost per Litre</label><input type="number" name="costPerL" min="1" required></div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Add Stock</button></div></form>';
        UI.modal('Add Stock', html);
        document.getElementById('add-stock-form').onsubmit = (e) => {
            e.preventDefault();
            const f = e.target;
            const whId = f.warehouseId.value;
            const qty = parseFloat(f.quantity.value);
            const cost = parseFloat(f.costPerL.value);
            const inv = DataStore.getAll('inventory').find(i => i.warehouseId === whId);
            if (inv) {
                const totalVal = (inv.quantity * inv.avgCost) + (qty * cost);
                const newQty = inv.quantity + qty;
                DataStore.update('inventory', inv.id, { quantity: newQty, avgCost: Math.round(totalVal / newQty) });
            } else {
                const wh = DataStore.getById('warehouses', whId);
                DataStore.insert('inventory', { productId: wh ? wh.productId : f.productId.value, warehouseId: whId, quantity: qty, avgCost: cost });
            }
            UI.closeModal();
            UI.toast('Stock added: ' + Utils.volume(qty));
            if (State.currentModule === 'stock_overview') Inventory.renderOverview();
        };
    },

    _updateWarehouseDropdown: (branchId, selectEl) => {
        if (!selectEl) return;
        selectEl.innerHTML = UI.warehouseOptions(branchId);
    },

    showTransferStock: () => {
        const html = '<form class="modal-form" id="transfer-form"><div class="form-group"><label>Product</label><select name="productId" required>' + UI.productOptions() + '</select></div><div class="form-row"><div class="form-group"><label>From Warehouse</label><select name="fromWh" required>' + UI.warehouseOptions() + '</select></div><div class="form-group"><label>To Warehouse</label><select name="toWh" required>' + UI.warehouseOptions() + '</select></div></div><div class="form-row"><div class="form-group"><label>Quantity (L)</label><input type="number" name="quantity" min="1" required></div><div class="form-group"><label>Date</label><input type="date" name="date" value="' + Utils.dateStr() + '" required></div></div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Transfer</button></div></form>';
        UI.modal('Transfer Stock', html, true);
        document.getElementById('transfer-form').onsubmit = (e) => {
            e.preventDefault();
            const f = e.target;
            const fromId = f.fromWh.value, toId = f.toWh.value, qty = parseFloat(f.quantity.value);
            if (fromId === toId) { UI.toast('Same warehouse!', 'error'); return; }
            const inv = DataStore.getAll('inventory');
            const fromInv = inv.find(i => i.warehouseId === fromId);
            if (!fromInv || fromInv.quantity < qty) { UI.toast('Insufficient stock!', 'error'); return; }
            DataStore.update('inventory', fromInv.id, { quantity: fromInv.quantity - qty });
            const toInv = inv.find(i => i.warehouseId === toId);
            if (toInv) {
                const tv = (toInv.quantity * toInv.avgCost) + (qty * fromInv.avgCost);
                const nq = toInv.quantity + qty;
                DataStore.update('inventory', toInv.id, { quantity: nq, avgCost: Math.round(tv / nq) });
            } else {
                const wh = DataStore.getById('warehouses', toId);
                DataStore.insert('inventory', { productId: wh.productId, warehouseId: toId, quantity: qty, avgCost: fromInv.avgCost });
            }
            DataStore.insert('stock_transfers', { productId: f.productId.value, fromWarehouseId: fromId, toWarehouseId: toId, quantity: qty, date: f.date.value });
            UI.closeModal();
            UI.toast('Transferred ' + Utils.volume(qty));
            if (State.currentModule === 'stock_overview') Inventory.renderOverview();
            if (State.currentModule === 'stock_movements') Inventory.renderMovements();
        };
    }
};

// ============================================================
// GOODS RECEIPT NOTE (GRN) MODULE — Multi-AP Invoice Purchase Flow
// ============================================================
const GoodsReceipt = {
    render: () => {
        UI.setPageTitle('Goods Receipt Notes');
        const grns = DataStore.getAll('grn');
        const allCosts = DataStore.getAll('landed_costs');
        const apInvoices = DataStore.getAll('ap_invoices');

        let html = '<div class="flex-between mb-16"><span></span><button class="btn btn-primary" onclick="GoodsReceipt.showCreate()">New GRN</button></div>';
        html += UI.dateFilterBar('GoodsReceipt.render()');
        let filtered = UI.filterByDate(grns, 'date').sort((a, b) => b.date.localeCompare(a.date));

        // Summary cards
        let totalBase = 0, totalLanded = 0, totalQty = 0;
        filtered.forEach(g => {
            totalBase += g.totalCost; totalQty += g.quantity;
            totalLanded += allCosts.filter(c => c.grnId === g.id).reduce((s, c) => s + (c.amountUGX || c.amount || 0), 0);
        });
        html += '<div class="stat-cards">';
        html += Dashboard._statCard('GRNs', filtered.length + '', Utils.volume(totalQty) + ' received', 'blue', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>');
        html += Dashboard._statCard('Base Cost', Utils.currency(totalBase), '', 'green', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>');
        html += Dashboard._statCard('Landed Costs', Utils.currency(totalLanded), '', 'yellow', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>');
        html += Dashboard._statCard('True Cost', Utils.currency(totalBase + totalLanded), totalQty > 0 ? Utils.currency(Math.round((totalBase + totalLanded) / totalQty)) + '/L avg' : '', 'red', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>');
        html += '</div>';

        // Purchase flow guide
        html += '<div style="background:var(--content-bg);border:1px solid var(--content-border);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:0.85rem;color:var(--text-secondary)">';
        html += '<strong>Purchase Flow:</strong> Create GRN (goods received) → Add Landed Costs (freight, insurance, customs, etc.) → Finalize Costing (updates inventory) → Create AP Invoice (supplier bill) → Record Payment';
        html += '</div>';

        html += '<div class="section-card"><div class="section-card-header"><span class="section-card-title">Goods Receipts</span><span class="text-muted">' + filtered.length + ' records</span></div>';
        html += '<div class="section-card-body no-padding" style="overflow-x:auto"><table class="data-table" style="min-width:1100px"><thead><tr><th>GRN No</th><th>Date</th><th>Supplier</th><th>Product</th><th>Branch</th><th class="text-right">Qty (L)</th><th class="text-right">Base Cost</th><th class="text-right">Landed</th><th class="text-right">Total Cost</th><th class="text-right">Cost/L</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
        if (filtered.length === 0) {
            html += '<tr><td colspan="12" class="text-center text-muted" style="padding:32px">No GRNs found.</td></tr>';
        } else {
            filtered.forEach(g => {
                const gCosts = allCosts.filter(c => c.grnId === g.id);
                const landedTotal = gCosts.reduce((s, c) => s + (c.amountUGX || c.amount || 0), 0);
                const totalCost = g.totalCost + landedTotal;
                const costPerL = g.quantity > 0 ? Math.round(totalCost / g.quantity) : 0;
                const statusBadge = GoodsReceipt._statusBadge(g, gCosts);

                html += '<tr>';
                html += '<td class="text-mono text-bold">' + g.grnNo + '</td>';
                html += '<td>' + Utils.dateDisplay(g.date) + '</td>';
                html += '<td>' + Utils.escapeHtml(UI.getSupplierName(g.supplierId)) + '</td>';
                html += '<td>' + Utils.escapeHtml(UI.getProductCode(g.productId)) + '</td>';
                html += '<td>' + Utils.escapeHtml(UI.getBranchName(g.branchId)) + '</td>';
                html += '<td class="text-right text-mono">' + Utils.volume(g.quantity) + '</td>';
                html += '<td class="text-right text-mono">' + Utils.currency(g.totalCost) + '</td>';
                html += '<td class="text-right text-mono">' + (landedTotal > 0 ? Utils.currency(landedTotal) : '<span class="text-muted">\u2014</span>') + '</td>';
                html += '<td class="text-right text-mono text-bold">' + Utils.currency(totalCost) + '</td>';
                html += '<td class="text-right text-mono">' + Utils.currency(costPerL) + '</td>';
                html += '<td>' + statusBadge + '</td>';
                html += '<td><button class="btn btn-sm btn-ghost" onclick="GoodsReceipt.viewDetail(\'' + g.id + '\')">View</button></td>';
                html += '</tr>';
            });
        }
        html += '</tbody></table></div></div>';
        UI.render(html);
    },

    _statusBadge: (g, gCosts) => {
        if (g.status === 'closed') return '<span class="badge badge-success">Closed</span>';
        if (g.status === 'costed') {
            // Check if partially invoiced
            const apInvs = DataStore.getAll('ap_invoices').filter(i => i.grnId === g.id);
            if (apInvs.length > 0) return '<span class="badge badge-info">Invoicing</span>';
            return '<span class="badge badge-info">Costed</span>';
        }
        if ((gCosts || []).length > 0) return '<span class="badge badge-warning">Costing</span>';
        return '<span class="badge badge-neutral">Received</span>';
    },

    _costTypeLabel: (type) => {
        const labels = { freight: 'Freight', insurance: 'Insurance', customs: 'Customs', handling: 'Handling', inspection: 'Inspection', clearing: 'Clearing', demurrage: 'Demurrage', other: 'Other' };
        return labels[type] || type || 'Other';
    },

    viewDetail: (id) => {
        const g = DataStore.getById('grn', id);
        if (!g) return;
        UI.setPageTitle('GRN Detail', g.grnNo);
        const landedCosts = DataStore.getAll('landed_costs').filter(c => c.grnId === id);
        const apInvoices = DataStore.getAll('ap_invoices').filter(i => i.grnId === id);
        const landedTotal = landedCosts.reduce((s, c) => s + (c.amountUGX || c.amount || 0), 0);
        const totalCost = g.totalCost + landedTotal;
        const costPerL = g.quantity > 0 ? Math.round(totalCost / g.quantity) : 0;
        const baseCostPerL = g.quantity > 0 ? Math.round(g.totalCost / g.quantity) : 0;
        const landedPerL = g.quantity > 0 ? Math.round(landedTotal / g.quantity) : 0;
        const statusBadge = GoodsReceipt._statusBadge(g, landedCosts);

        // Check invoicing status for each line
        const baseInvoice = apInvoices.find(i => i.invoiceType === 'goods');
        const uninvoicedCosts = landedCosts.filter(c => !c.apInvoiceId);
        const totalLines = 1 + landedCosts.length; // base + landed
        const invoicedLines = (baseInvoice ? 1 : 0) + landedCosts.filter(c => c.apInvoiceId).length;
        const allInvoiced = invoicedLines === totalLines && totalLines > 0;
        const isClosed = g.status === 'closed';

        let html = '<div class="flex-between mb-16"><button class="btn btn-secondary" onclick="GoodsReceipt.render()">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;vertical-align:middle"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back to GRNs</button>';
        html += '<div class="btn-group">';
        if (!isClosed) {
            html += '<button class="btn btn-primary" onclick="LandedCostModule.showAdd(\'' + id + '\')">Add Landed Cost</button>';
            if (g.status === 'received' && landedCosts.length > 0) {
                html += '<button class="btn btn-success" onclick="GoodsReceipt.finalizeCosting(\'' + id + '\')">Finalize Costing</button>';
            }
            if (allInvoiced && g.status === 'costed') {
                html += '<button class="btn btn-success" onclick="GoodsReceipt.closeGRN(\'' + id + '\')">Close GRN</button>';
            }
        }
        html += '</div></div>';

        // GRN Header
        html += '<div class="section-card" style="margin-bottom:16px"><div class="section-card-header"><span class="section-card-title">' + g.grnNo + '</span>' + statusBadge + '</div>';
        html += '<div class="section-card-body"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">';
        html += '<div><span class="text-muted" style="font-size:0.8rem;display:block">Supplier</span><span class="text-bold">' + Utils.escapeHtml(UI.getSupplierName(g.supplierId)) + '</span></div>';
        html += '<div><span class="text-muted" style="font-size:0.8rem;display:block">Product</span><span class="text-bold">' + Utils.escapeHtml(UI.getProductName(g.productId)) + '</span></div>';
        html += '<div><span class="text-muted" style="font-size:0.8rem;display:block">Branch</span><span class="text-bold">' + Utils.escapeHtml(UI.getBranchName(g.branchId)) + '</span></div>';
        html += '<div><span class="text-muted" style="font-size:0.8rem;display:block">Warehouse</span><span class="text-bold">' + Utils.escapeHtml(UI.getWarehouseName(g.warehouseId)) + '</span></div>';
        html += '<div><span class="text-muted" style="font-size:0.8rem;display:block">Date</span><span class="text-bold">' + Utils.dateDisplay(g.date) + '</span></div>';
        html += '<div><span class="text-muted" style="font-size:0.8rem;display:block">Quantity</span><span class="text-bold">' + Utils.volume(g.quantity) + '</span></div>';
        html += '</div></div></div>';

        // Cost Breakdown + Invoice Status (per-line)
        html += '<div class="section-card" style="margin-bottom:16px"><div class="section-card-header"><span class="section-card-title">Cost Breakdown & Invoicing</span>';
        html += '<span class="text-muted" style="font-size:0.85rem">' + invoicedLines + ' of ' + totalLines + ' invoiced</span></div>';
        html += '<div class="section-card-body no-padding" style="overflow-x:auto"><table class="data-table" style="min-width:900px"><thead><tr><th>Description</th><th>Type</th><th>Supplier / Payee</th><th class="text-right">Amount</th><th class="text-right">Per Litre</th><th>AP Invoice</th></tr></thead><tbody>';

        // Base cost row
        html += '<tr><td class="text-bold">Base Purchase Cost (' + Utils.currency(g.unitCost) + '/L \u00d7 ' + Utils.num(g.quantity) + ' L)</td>';
        html += '<td><span class="badge badge-neutral">Goods</span></td>';
        html += '<td>' + Utils.escapeHtml(UI.getSupplierName(g.supplierId)) + '</td>';
        html += '<td class="text-right text-mono">' + Utils.currency(g.totalCost) + '</td>';
        html += '<td class="text-right text-mono">' + Utils.currency(baseCostPerL) + '</td>';
        if (baseInvoice) {
            const bal = baseInvoice.amountUGX - baseInvoice.paid;
            html += '<td><span class="text-mono text-bold" style="font-size:0.85rem">' + baseInvoice.invoiceNo + '</span> ' + (bal <= 0 ? '<span class="badge badge-success">Paid</span>' : '<span class="badge badge-warning">Bal: ' + Utils.currency(bal) + '</span>') + '</td>';
        } else if (g.status === 'costed' && !isClosed) {
            html += '<td><button class="btn btn-sm btn-primary" onclick="APInvoices.showCreateForBaseCost(\'' + id + '\')">Create Invoice</button></td>';
        } else {
            html += '<td><span class="text-muted">\u2014</span></td>';
        }
        html += '</tr>';

        // Landed cost rows
        if (landedCosts.length > 0) {
            landedCosts.forEach(c => {
                const perL = g.quantity > 0 ? Math.round((c.amountUGX || c.amount) / g.quantity) : 0;
                const typeLabel = GoodsReceipt._costTypeLabel(c.costType);
                const costSupplier = c.supplierId ? UI.getSupplierName(c.supplierId) : '\u2014';
                const linkedInv = c.apInvoiceId ? DataStore.getById('ap_invoices', c.apInvoiceId) : null;

                html += '<tr><td style="padding-left:24px">' + Utils.escapeHtml(c.description) + '</td>';
                html += '<td><span class="badge badge-warning">' + typeLabel + '</span></td>';
                html += '<td>' + Utils.escapeHtml(costSupplier) + '</td>';
                html += '<td class="text-right text-mono">' + Utils.currency(c.amountUGX || c.amount) + '</td>';
                html += '<td class="text-right text-mono">' + Utils.currency(perL) + '</td>';

                if (linkedInv) {
                    const bal = linkedInv.amountUGX - linkedInv.paid;
                    html += '<td><span class="text-mono text-bold" style="font-size:0.85rem">' + linkedInv.invoiceNo + '</span> ' + (bal <= 0 ? '<span class="badge badge-success">Paid</span>' : '<span class="badge badge-warning">Bal: ' + Utils.currency(bal) + '</span>') + '</td>';
                } else if (g.status === 'costed' && !isClosed) {
                    html += '<td><button class="btn btn-sm btn-primary" onclick="APInvoices.showCreateForLandedCost(\'' + c.id + '\',\'' + id + '\')">Create Invoice</button></td>';
                } else {
                    html += '<td><span class="text-muted">\u2014</span></td>';
                }
                html += '</tr>';
            });
        } else {
            html += '<tr><td colspan="6" class="text-center text-muted" style="padding:16px">No landed costs added yet. Click "Add Landed Cost" to add freight, insurance, customs, etc.</td></tr>';
        }
        html += '</tbody><tfoot>';
        if (landedCosts.length > 0) {
            html += '<tr style="background:var(--content-bg)"><td class="text-bold" style="padding-left:24px">Total Landed Costs (' + landedCosts.length + ' items)</td><td></td><td></td><td class="text-right text-mono text-bold">' + Utils.currency(landedTotal) + '</td><td class="text-right text-mono">' + Utils.currency(landedPerL) + '</td><td></td></tr>';
        }
        html += '<tr><td class="text-bold" style="font-size:1.05em">TRUE LANDED COST</td><td></td><td></td><td class="text-right text-mono text-bold" style="font-size:1.05em;border-top:2px solid var(--content-border)">' + Utils.currency(totalCost) + '</td><td class="text-right text-mono text-bold" style="font-size:1.05em;border-top:2px solid var(--content-border)">' + Utils.currency(costPerL) + '</td><td></td></tr>';
        html += '</tfoot></table></div></div>';

        // Invoicing progress
        if (g.status === 'costed' && !isClosed) {
            html += '<div style="background:' + (allInvoiced ? 'var(--success-bg)' : 'var(--content-bg)') + ';border:1px solid var(--content-border);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:0.9rem">';
            if (allInvoiced) {
                html += '<strong>All costs invoiced!</strong> You can now close this GRN.';
            } else {
                html += '<strong>Invoicing Progress:</strong> ' + invoicedLines + ' of ' + totalLines + ' cost lines have AP invoices. Create invoices for each cost line to close this GRN.';
            }
            html += '</div>';
        }

        UI.render(html);
    },

    finalizeCosting: (id) => {
        const g = DataStore.getById('grn', id);
        if (!g) return;
        const costs = DataStore.getAll('landed_costs').filter(c => c.grnId === id);
        const landedTotal = costs.reduce((s, c) => s + (c.amountUGX || c.amount || 0), 0);
        if (landedTotal <= 0) { UI.toast('No landed costs to finalize', 'error'); return; }

        // Update inventory: add the landed cost value to existing stock value
        const inv = DataStore.getAll('inventory').find(i => i.warehouseId === g.warehouseId);
        if (inv && inv.quantity > 0) {
            const newTotalValue = (inv.quantity * inv.avgCost) + landedTotal;
            const newAvg = Math.round(newTotalValue / inv.quantity);
            DataStore.update('inventory', inv.id, { avgCost: newAvg });
        }
        DataStore.update('grn', id, { status: 'costed' });
        UI.toast('Costing finalized \u2014 inventory cost updated to reflect true landed cost');
        GoodsReceipt.viewDetail(id);
    },

    closeGRN: (id) => {
        const g = DataStore.getById('grn', id);
        if (!g) return;
        const costs = DataStore.getAll('landed_costs').filter(c => c.grnId === id);
        const apInvs = DataStore.getAll('ap_invoices').filter(i => i.grnId === id);
        const baseInv = apInvs.find(i => i.invoiceType === 'goods');
        const uninvoiced = costs.filter(c => !c.apInvoiceId);
        if (!baseInv || uninvoiced.length > 0) {
            UI.toast('Cannot close \u2014 not all cost lines have AP invoices', 'error');
            return;
        }
        DataStore.update('grn', id, { status: 'closed' });
        UI.toast(g.grnNo + ' closed \u2014 all costs fully invoiced');
        GoodsReceipt.viewDetail(id);
    },

    _removeLandedCost: (costId, grnId) => {
        const cost = DataStore.getById('landed_costs', costId);
        if (cost && cost.apInvoiceId) {
            UI.toast('Cannot remove \u2014 this cost has a linked AP invoice', 'error');
            return;
        }
        if (!confirm('Remove this landed cost?')) return;
        DataStore.remove('landed_costs', costId);
        UI.toast('Landed cost removed');
        GoodsReceipt.viewDetail(grnId);
    },

    showCreate: () => {
        const html = '<form class="modal-form" id="grn-form"><div class="form-row"><div class="form-group"><label>Supplier</label><select name="supplierId" required>' + UI.supplierOptions() + '</select></div><div class="form-group"><label>Date</label><input type="date" name="date" value="' + Utils.dateStr() + '" required></div></div><div class="form-row"><div class="form-group"><label>Branch</label><select name="branchId" required onchange="Inventory._updateWarehouseDropdown(this.value,document.querySelector(\'#grn-form [name=warehouseId]\'))">' + UI.branchOptions() + '</select></div><div class="form-group"><label>Warehouse</label><select name="warehouseId" required>' + UI.warehouseOptions() + '</select></div></div><div class="form-row"><div class="form-group"><label>Product</label><select name="productId" required>' + UI.productOptions() + '</select></div><div class="form-group"><label>Quantity (L)</label><input type="number" name="quantity" min="1" required></div></div><div class="form-group"><label>Unit Cost (per L)</label><input type="number" name="unitCost" min="1" required></div><p style="font-size:0.85rem;color:var(--text-secondary);margin-top:8px">After creating the GRN, you can add landed costs (freight, insurance, customs, etc.) to calculate the true cost per litre.</p><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create GRN</button></div></form>';
        UI.modal('New Goods Receipt', html, true);
        document.getElementById('grn-form').onsubmit = (e) => {
            e.preventDefault();
            const f = e.target;
            const qty = parseFloat(f.quantity.value);
            const unitCost = parseFloat(f.unitCost.value);
            const grn = {
                grnNo: Utils.nextNumber('GRN'),
                supplierId: f.supplierId.value,
                branchId: f.branchId.value,
                productId: f.productId.value,
                warehouseId: f.warehouseId.value,
                quantity: qty,
                unitCost: unitCost,
                totalCost: qty * unitCost,
                date: f.date.value,
                status: 'received'
            };
            const inserted = DataStore.insert('grn', grn);
            // Update inventory with base cost
            const inv = DataStore.getAll('inventory').find(i => i.warehouseId === f.warehouseId.value);
            if (inv) {
                const totalVal = (inv.quantity * inv.avgCost) + (qty * unitCost);
                const newQty = inv.quantity + qty;
                DataStore.update('inventory', inv.id, { quantity: newQty, avgCost: Math.round(totalVal / newQty) });
            } else {
                DataStore.insert('inventory', { productId: f.productId.value, warehouseId: f.warehouseId.value, quantity: qty, avgCost: unitCost });
            }
            UI.closeModal();
            UI.toast('GRN ' + grn.grnNo + ' created \u2014 now add landed costs');
            GoodsReceipt.viewDetail(inserted.id);
        };
    }
};

// ============================================================
// GOODS ISSUE NOTE (GIN) MODULE — Track goods dispatched from inventory
// ============================================================
const GoodsIssue = {
    _reasons: [
        { value: 'sale', label: 'Sale / Delivery' },
        { value: 'internal_use', label: 'Internal Use' },
        { value: 'sample', label: 'Sample / Promotional' },
        { value: 'damage', label: 'Damaged / Expired' },
        { value: 'return_supplier', label: 'Return to Supplier' },
        { value: 'other', label: 'Other' }
    ],

    _reasonLabel: (val) => {
        const r = GoodsIssue._reasons.find(r => r.value === val);
        return r ? r.label : (val || 'Other');
    },

    _reasonBadge: (val) => {
        const colors = { sale: 'success', internal_use: 'info', sample: 'warning', damage: 'danger', return_supplier: 'neutral', other: 'neutral' };
        return '<span class="badge badge-' + (colors[val] || 'neutral') + '">' + GoodsIssue._reasonLabel(val) + '</span>';
    },

    _statusBadge: (status) => {
        if (status === 'reversed') return '<span class="badge badge-danger">Reversed</span>';
        return '<span class="badge badge-success">Issued</span>';
    },

    render: () => {
        UI.setPageTitle('Goods Issue Notes');
        const issues = DataStore.getAll('goods_issues');

        let html = '<div class="flex-between mb-16"><span></span><button class="btn btn-primary" onclick="GoodsIssue.showCreate()">New Goods Issue</button></div>';
        html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">';
        html += UI.branchFilter('GoodsIssue.render()');
        html += UI.productFilter('GoodsIssue.render()');
        html += '</div>';
        html += UI.dateFilterBar('GoodsIssue.render()');

        let filtered = issues;
        if (State.filterBranch) filtered = filtered.filter(i => i.branchId === State.filterBranch);
        if (State.filterProduct) filtered = filtered.filter(i => i.productId === State.filterProduct);
        filtered = UI.filterByDate(filtered, 'date').sort((a, b) => b.date.localeCompare(a.date));

        // Summary cards
        let totalQty = 0, totalValue = 0, activeCount = 0;
        filtered.forEach(g => {
            if (g.status !== 'reversed') {
                totalQty += g.quantity;
                totalValue += g.quantity * (g.costPerL || 0);
                activeCount++;
            }
        });
        html += '<div class="stat-cards">';
        html += Dashboard._statCard('Issues', activeCount + '', Utils.volume(totalQty) + ' dispatched', 'red', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>');
        html += Dashboard._statCard('Total Value', Utils.currency(totalValue), 'at avg cost', 'yellow', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>');
        html += Dashboard._statCard('Reversed', filtered.filter(g => g.status === 'reversed').length + '', '', 'blue', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.5 2v6h6M21.5 22v-6h-6"/><path d="M22 11.5A10 10 0 0 0 3.2 7.2M2 12.5a10 10 0 0 0 18.8 4.2"/></svg>');
        html += '</div>';

        // Info bar
        html += '<div style="background:var(--content-bg);border:1px solid var(--content-border);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:0.85rem;color:var(--text-secondary)">';
        html += '<strong>Goods Issue:</strong> Record stock dispatched from warehouses — deliveries to customers, internal consumption, samples, damages, or returns to suppliers.';
        html += '</div>';

        // Table
        html += '<div class="section-card"><div class="section-card-header"><span class="section-card-title">Goods Issues</span><span class="text-muted">' + filtered.length + ' records</span></div>';
        html += '<div class="section-card-body no-padding" style="overflow-x:auto"><table class="data-table" style="min-width:1000px"><thead><tr>';
        html += '<th>GIN No</th><th>Date</th><th>Product</th><th>Branch</th><th>Warehouse</th><th class="text-right">Qty (L)</th><th class="text-right">Cost Value</th><th>Reason</th><th>Recipient</th><th>Status</th><th>Actions</th>';
        html += '</tr></thead><tbody>';

        if (filtered.length === 0) {
            html += '<tr><td colspan="11" class="text-center text-muted" style="padding:32px">No goods issues found.</td></tr>';
        } else {
            filtered.forEach(g => {
                const costValue = g.quantity * (g.costPerL || 0);
                let recipient = '\u2014';
                if (g.reason === 'sale' && g.customerId) recipient = Utils.escapeHtml(UI.getCustomerName(g.customerId));
                else if (g.reason === 'return_supplier' && g.supplierId) recipient = Utils.escapeHtml(UI.getSupplierName(g.supplierId));
                else if (g.description) recipient = Utils.escapeHtml(g.description.substring(0, 30));

                html += '<tr' + (g.status === 'reversed' ? ' style="opacity:0.5"' : '') + '>';
                html += '<td class="text-mono text-bold">' + g.ginNo + '</td>';
                html += '<td>' + Utils.dateDisplay(g.date) + '</td>';
                html += '<td>' + Utils.escapeHtml(UI.getProductCode(g.productId)) + '</td>';
                html += '<td>' + Utils.escapeHtml(UI.getBranchName(g.branchId)) + '</td>';
                html += '<td>' + Utils.escapeHtml(UI.getWarehouseName(g.warehouseId)) + '</td>';
                html += '<td class="text-right text-mono">' + Utils.volume(g.quantity) + '</td>';
                html += '<td class="text-right text-mono">' + Utils.currency(costValue) + '</td>';
                html += '<td>' + GoodsIssue._reasonBadge(g.reason) + '</td>';
                html += '<td style="font-size:0.85rem">' + recipient + '</td>';
                html += '<td>' + GoodsIssue._statusBadge(g.status) + '</td>';
                html += '<td><button class="btn btn-sm btn-ghost" onclick="GoodsIssue.viewDetail(\'' + g.id + '\')">View</button></td>';
                html += '</tr>';
            });
        }
        html += '</tbody></table></div></div>';
        UI.render(html);
    },

    viewDetail: (id) => {
        const g = DataStore.getById('goods_issues', id);
        if (!g) return;
        UI.setPageTitle('Goods Issue Detail', g.ginNo);
        const costValue = g.quantity * (g.costPerL || 0);
        const isReversed = g.status === 'reversed';

        let html = '<div class="flex-between mb-16"><button class="btn btn-secondary" onclick="GoodsIssue.render()">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;vertical-align:middle"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back to Goods Issues</button>';
        if (!isReversed) {
            html += '<button class="btn btn-danger" onclick="GoodsIssue.reverseIssue(\'' + id + '\')">Reverse Issue</button>';
        }
        html += '</div>';

        // Header card
        html += '<div class="section-card" style="margin-bottom:16px"><div class="section-card-header"><span class="section-card-title">' + g.ginNo + '</span>' + GoodsIssue._statusBadge(g.status) + '</div>';
        html += '<div class="section-card-body"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">';
        html += '<div><span class="text-muted" style="font-size:0.8rem;display:block">Date</span><span class="text-bold">' + Utils.dateDisplay(g.date) + '</span></div>';
        html += '<div><span class="text-muted" style="font-size:0.8rem;display:block">Product</span><span class="text-bold">' + Utils.escapeHtml(UI.getProductName(g.productId)) + '</span></div>';
        html += '<div><span class="text-muted" style="font-size:0.8rem;display:block">Branch</span><span class="text-bold">' + Utils.escapeHtml(UI.getBranchName(g.branchId)) + '</span></div>';
        html += '<div><span class="text-muted" style="font-size:0.8rem;display:block">Warehouse</span><span class="text-bold">' + Utils.escapeHtml(UI.getWarehouseName(g.warehouseId)) + '</span></div>';
        html += '<div><span class="text-muted" style="font-size:0.8rem;display:block">Quantity</span><span class="text-bold">' + Utils.volume(g.quantity) + '</span></div>';
        html += '<div><span class="text-muted" style="font-size:0.8rem;display:block">Reason</span>' + GoodsIssue._reasonBadge(g.reason) + '</div>';
        html += '</div></div></div>';

        // Cost & Recipient details
        html += '<div class="section-card" style="margin-bottom:16px"><div class="section-card-header"><span class="section-card-title">Issue Details</span></div>';
        html += '<div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>Description</th><th class="text-right">Qty (L)</th><th class="text-right">Cost/L</th><th class="text-right">Total Cost Value</th></tr></thead><tbody>';
        html += '<tr><td class="text-bold">' + Utils.escapeHtml(UI.getProductName(g.productId)) + ' — ' + GoodsIssue._reasonLabel(g.reason) + '</td>';
        html += '<td class="text-right text-mono">' + Utils.volume(g.quantity) + '</td>';
        html += '<td class="text-right text-mono">' + Utils.currency(g.costPerL || 0) + '</td>';
        html += '<td class="text-right text-mono text-bold">' + Utils.currency(costValue) + '</td></tr>';
        html += '</tbody></table></div></div>';

        // Recipient / notes
        html += '<div class="section-card" style="margin-bottom:16px"><div class="section-card-header"><span class="section-card-title">Recipient & Notes</span></div>';
        html += '<div class="section-card-body"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">';
        if (g.reason === 'sale' && g.customerId) {
            html += '<div><span class="text-muted" style="font-size:0.8rem;display:block">Customer</span><span class="text-bold">' + Utils.escapeHtml(UI.getCustomerName(g.customerId)) + '</span></div>';
        }
        if (g.reason === 'return_supplier' && g.supplierId) {
            html += '<div><span class="text-muted" style="font-size:0.8rem;display:block">Supplier</span><span class="text-bold">' + Utils.escapeHtml(UI.getSupplierName(g.supplierId)) + '</span></div>';
        }
        if (g.reference) {
            html += '<div><span class="text-muted" style="font-size:0.8rem;display:block">Reference</span><span class="text-bold">' + Utils.escapeHtml(g.reference) + '</span></div>';
        }
        html += '<div><span class="text-muted" style="font-size:0.8rem;display:block">Description</span><span>' + Utils.escapeHtml(g.description || '\u2014') + '</span></div>';
        html += '</div></div></div>';

        if (isReversed) {
            html += '<div style="background:var(--danger-bg,#fef2f2);border:1px solid var(--content-border);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:0.9rem;color:var(--danger-text,#dc2626)">';
            html += '<strong>Reversed:</strong> This goods issue has been reversed. Stock was returned to inventory on ' + Utils.dateDisplay(g.reversedDate) + '.';
            html += '</div>';
        }

        UI.render(html);
    },

    reverseIssue: (id) => {
        const g = DataStore.getById('goods_issues', id);
        if (!g || g.status === 'reversed') return;
        if (!confirm('Reverse this goods issue? ' + Utils.volume(g.quantity) + ' will be returned to inventory.')) return;

        // Return stock to warehouse
        const inv = DataStore.getAll('inventory').find(i => i.warehouseId === g.warehouseId);
        if (inv) {
            const totalVal = (inv.quantity * inv.avgCost) + (g.quantity * (g.costPerL || inv.avgCost));
            const newQty = inv.quantity + g.quantity;
            DataStore.update('inventory', inv.id, { quantity: newQty, avgCost: Math.round(totalVal / newQty) });
        } else {
            DataStore.insert('inventory', { productId: g.productId, warehouseId: g.warehouseId, quantity: g.quantity, avgCost: g.costPerL || 0 });
        }

        DataStore.update('goods_issues', id, { status: 'reversed', reversedDate: Utils.dateStr() });
        UI.toast(g.ginNo + ' reversed \u2014 stock returned to inventory');
        GoodsIssue.viewDetail(id);
    },

    showCreate: () => {
        const reasonOpts = GoodsIssue._reasons.map(r => '<option value="' + r.value + '">' + Utils.escapeHtml(r.label) + '</option>').join('');

        const html = '<form class="modal-form" id="gin-form">' +
            '<div class="form-row"><div class="form-group"><label>Reason</label><select name="reason" required onchange="GoodsIssue._onReasonChange(this.value)">' + reasonOpts + '</select></div>' +
            '<div class="form-group"><label>Date</label><input type="date" name="date" value="' + Utils.dateStr() + '" required></div></div>' +
            '<div class="form-row"><div class="form-group"><label>Branch</label><select name="branchId" required onchange="Inventory._updateWarehouseDropdown(this.value,document.querySelector(\'#gin-form [name=warehouseId]\'))">' + UI.branchOptions() + '</select></div>' +
            '<div class="form-group"><label>Warehouse</label><select name="warehouseId" required>' + UI.warehouseOptions() + '</select></div></div>' +
            '<div class="form-row"><div class="form-group"><label>Product</label><select name="productId" required>' + UI.productOptions() + '</select></div>' +
            '<div class="form-group"><label>Quantity (L)</label><input type="number" name="quantity" min="1" required></div></div>' +
            '<div id="gin-customer-field" class="form-group"><label>Customer</label><select name="customerId">' + '<option value="">— Select Customer —</option>' + UI.customerOptions() + '</select></div>' +
            '<div id="gin-supplier-field" class="form-group hidden"><label>Supplier (Return To)</label><select name="supplierId">' + '<option value="">— Select Supplier —</option>' + UI.supplierOptions() + '</select></div>' +
            '<div class="form-group"><label>Reference</label><input type="text" name="reference" placeholder="e.g. Delivery Note #, PO #"></div>' +
            '<div class="form-group"><label>Description / Notes</label><input type="text" name="description" placeholder="Brief description"></div>' +
            '<div class="form-actions"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Issue Goods</button></div></form>';

        UI.modal('New Goods Issue', html, true);

        document.getElementById('gin-form').onsubmit = (e) => {
            e.preventDefault();
            const f = e.target;
            const qty = parseFloat(f.quantity.value);
            const whId = f.warehouseId.value;

            // Check stock
            const inv = DataStore.getAll('inventory').find(i => i.warehouseId === whId);
            if (!inv || inv.quantity < qty) {
                UI.toast('Insufficient stock! Available: ' + Utils.volume(inv ? inv.quantity : 0), 'error');
                return;
            }

            const gin = {
                ginNo: Utils.nextNumber('GIN'),
                date: f.date.value,
                branchId: f.branchId.value,
                warehouseId: whId,
                productId: f.productId.value,
                quantity: qty,
                costPerL: inv.avgCost,
                reason: f.reason.value,
                customerId: f.reason.value === 'sale' ? f.customerId.value : '',
                supplierId: f.reason.value === 'return_supplier' ? f.supplierId.value : '',
                reference: f.reference.value,
                description: f.description.value,
                status: 'issued'
            };

            // Deduct from inventory
            DataStore.update('inventory', inv.id, { quantity: inv.quantity - qty });

            const inserted = DataStore.insert('goods_issues', gin);
            UI.closeModal();
            UI.toast('Goods Issue ' + gin.ginNo + ' created \u2014 ' + Utils.volume(qty) + ' dispatched');
            GoodsIssue.viewDetail(inserted.id);
        };
    },

    _onReasonChange: (reason) => {
        const custField = document.getElementById('gin-customer-field');
        const supField = document.getElementById('gin-supplier-field');
        if (custField) custField.className = reason === 'sale' ? 'form-group' : 'form-group hidden';
        if (supField) supField.className = reason === 'return_supplier' ? 'form-group' : 'form-group hidden';
    }
};

// ============================================================
// LANDED COST MODULE — Multiple costs per GRN, accurate allocation
// ============================================================
const LandedCostModule = {
    _costTypes: [
        { value: 'freight', label: 'Freight & Transport' },
        { value: 'insurance', label: 'Insurance' },
        { value: 'customs', label: 'Customs & Duties' },
        { value: 'handling', label: 'Handling & Storage' },
        { value: 'inspection', label: 'Inspection & Testing' },
        { value: 'clearing', label: 'Clearing Agent' },
        { value: 'demurrage', label: 'Demurrage' },
        { value: 'other', label: 'Other' }
    ],

    _costTypeOptions: () => LandedCostModule._costTypes.map(t => '<option value="' + t.value + '">' + Utils.escapeHtml(t.label) + '</option>').join(''),
    _costTypeLabel: (type) => { const f = LandedCostModule._costTypes.find(t => t.value === type); return f ? f.label : (type || 'Other'); },

    render: () => {
        UI.setPageTitle('Landed Costs');
        const grns = DataStore.getAll('grn').sort((a, b) => b.date.localeCompare(a.date));
        const allCosts = DataStore.getAll('landed_costs');

        // Summary
        let totalBase = grns.reduce((s, g) => s + g.totalCost, 0);
        let totalLanded = allCosts.reduce((s, c) => s + (c.amountUGX || c.amount || 0), 0);
        let totalQty = grns.reduce((s, g) => s + g.quantity, 0);

        let html = '<div class="stat-cards">';
        html += Dashboard._statCard('Base Cost', Utils.currency(totalBase), grns.length + ' GRNs', 'blue', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>');
        html += Dashboard._statCard('Landed Costs', Utils.currency(totalLanded), allCosts.length + ' cost entries', 'yellow', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>');
        html += Dashboard._statCard('True Total', Utils.currency(totalBase + totalLanded), totalQty > 0 ? Utils.currency(Math.round((totalBase + totalLanded) / totalQty)) + '/L avg' : '', 'green', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>');
        html += '</div>';

        // Cost breakdown by type
        const byType = {};
        allCosts.forEach(c => {
            const t = c.costType || 'other';
            if (!byType[t]) byType[t] = { count: 0, total: 0 };
            byType[t].count++;
            byType[t].total += (c.amountUGX || c.amount || 0);
        });
        if (Object.keys(byType).length > 0) {
            html += '<div class="section-card" style="margin-bottom:16px"><div class="section-card-header"><span class="section-card-title">Cost Breakdown by Type</span></div>';
            html += '<div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>Cost Type</th><th class="text-right">Entries</th><th class="text-right">Total Amount</th><th class="text-right">% of Landed</th></tr></thead><tbody>';
            Object.keys(byType).sort().forEach(t => {
                const d = byType[t];
                const pct = totalLanded > 0 ? Math.round(d.total / totalLanded * 100) : 0;
                html += '<tr><td class="text-bold">' + LandedCostModule._costTypeLabel(t) + '</td><td class="text-right text-mono">' + d.count + '</td><td class="text-right text-mono">' + Utils.currency(d.total) + '</td><td class="text-right text-mono">' + pct + '%</td></tr>';
            });
            html += '</tbody></table></div></div>';
        }

        // GRN cost summary table
        html += '<div class="section-card"><div class="section-card-header"><span class="section-card-title">Landed Cost by GRN</span></div>';
        html += '<div class="section-card-body no-padding" style="overflow-x:auto"><table class="data-table" style="min-width:1000px"><thead><tr><th>GRN</th><th>Date</th><th>Supplier</th><th>Product</th><th class="text-right">Qty (L)</th><th class="text-right">Base Cost</th><th class="text-right">Landed</th><th class="text-right">Total Cost</th><th class="text-right">Cost/L</th><th>Status</th><th>Actions</th></tr></thead><tbody>';

        grns.forEach(g => {
            const grnCosts = allCosts.filter(c => c.grnId === g.id);
            const landedTotal = grnCosts.reduce((s, c) => s + (c.amountUGX || c.amount || 0), 0);
            const totalCost = g.totalCost + landedTotal;
            const costPerL = g.quantity > 0 ? Math.round(totalCost / g.quantity) : 0;
            const statusBadge = GoodsReceipt._statusBadge(g, grnCosts);

            html += '<tr>';
            html += '<td class="text-mono text-bold"><a href="#" onclick="event.preventDefault();GoodsReceipt.viewDetail(\'' + g.id + '\')" class="text-link">' + g.grnNo + '</a></td>';
            html += '<td>' + Utils.dateDisplay(g.date) + '</td>';
            html += '<td>' + Utils.escapeHtml(UI.getSupplierName(g.supplierId)) + '</td>';
            html += '<td>' + Utils.escapeHtml(UI.getProductCode(g.productId)) + '</td>';
            html += '<td class="text-right text-mono">' + Utils.volume(g.quantity) + '</td>';
            html += '<td class="text-right text-mono">' + Utils.currency(g.totalCost) + '</td>';
            html += '<td class="text-right text-mono">' + (landedTotal > 0 ? Utils.currency(landedTotal) : '<span class="text-muted">\u2014</span>') + '</td>';
            html += '<td class="text-right text-mono text-bold">' + Utils.currency(totalCost) + '</td>';
            html += '<td class="text-right text-mono">' + Utils.currency(costPerL) + '</td>';
            html += '<td>' + statusBadge + '</td>';
            html += '<td><button class="btn btn-sm btn-primary" onclick="LandedCostModule.showAdd(\'' + g.id + '\')">Add Cost</button></td>';
            html += '</tr>';

            // Sub-rows for individual landed costs
            grnCosts.forEach(c => {
                const perL = g.quantity > 0 ? Math.round((c.amountUGX || c.amount) / g.quantity) : 0;
                const costSupplier = c.supplierId ? UI.getSupplierName(c.supplierId) : '<span class="text-muted">No supplier</span>';
                const invoiceStatus = c.apInvoiceId ? '<span class="badge badge-success" style="font-size:0.65rem">Invoiced</span>' : '<span class="badge badge-neutral" style="font-size:0.65rem">Pending</span>';
                html += '<tr style="background:var(--content-bg)">';
                html += '<td></td><td colspan="2" style="padding-left:32px;font-size:0.85rem"><span class="badge badge-warning" style="font-size:0.7rem;margin-right:6px">' + LandedCostModule._costTypeLabel(c.costType) + '</span>' + Utils.escapeHtml(c.description) + '</td>';
                html += '<td style="font-size:0.85rem">' + costSupplier + '</td>';
                html += '<td></td>';
                html += '<td class="text-right text-mono" style="font-size:0.85rem">' + Utils.currency(c.amountUGX || c.amount) + '</td>';
                html += '<td></td>';
                html += '<td class="text-right text-mono" style="font-size:0.85rem">' + Utils.currency(perL) + '/L</td>';
                html += '<td>' + invoiceStatus + '</td>';
                html += '<td><button class="btn btn-sm btn-ghost" style="font-size:0.75rem;color:var(--text-danger)" onclick="LandedCostModule.removeCost(\'' + c.id + '\')">Remove</button></td>';
                html += '</tr>';
            });
        });

        html += '</tbody></table></div></div>';
        UI.render(html);
    },

    _lineCount: 1,

    showAdd: (grnId) => {
        const grns = DataStore.getAll('grn');
        let grnOpts = grns.map(g => '<option value="' + g.id + '"' + (g.id === grnId ? ' selected' : '') + '>' + g.grnNo + ' \u2014 ' + UI.getSupplierName(g.supplierId) + ' (' + UI.getProductCode(g.productId) + ', ' + Utils.volume(g.quantity) + ')</option>').join('');

        let html = '<form class="modal-form" id="landed-cost-form">';
        html += '<div class="form-group"><label>GRN</label><select name="grnId" required onchange="LandedCostModule._updateGRNInfo(this.value)">' + grnOpts + '</select></div>';
        html += '<div id="grn-info-box" style="background:var(--content-bg);border-radius:8px;padding:12px;margin-bottom:16px"></div>';

        // Dynamic cost lines header
        html += '<div style="margin-bottom:8px"><label class="text-bold" style="font-size:0.9rem">Additional Costs</label></div>';
        html += '<div id="cost-lines-container">';
        html += LandedCostModule._costLineHtml(0);
        html += '</div>';
        html += '<button type="button" class="btn btn-sm btn-secondary" style="margin-bottom:16px" onclick="LandedCostModule._addCostLine()">+ Add Another Cost</button>';
        html += '<div id="cost-total-display" style="background:var(--success-bg);border-radius:8px;padding:12px;margin-bottom:16px;text-align:right"></div>';
        html += '<div class="form-actions"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Save All Costs</button></div>';
        html += '</form>';

        UI.modal('Add Landed Costs', html, true);
        LandedCostModule._lineCount = 1;
        LandedCostModule._updateGRNInfo(grnId || (grns[0] ? grns[0].id : ''));
        LandedCostModule._updateCostTotal();

        document.getElementById('landed-cost-form').onsubmit = (e) => {
            e.preventDefault();
            const f = e.target;
            const selectedGrnId = f.grnId.value;
            let savedCount = 0;

            for (let i = 0; i < 20; i++) {
                const type = f['costType_' + i];
                const desc = f['desc_' + i];
                const amount = f['amount_' + i];
                const currency = f['currency_' + i];
                if (!type || !amount) continue;
                const amt = parseFloat(amount.value);
                if (!amt || amt <= 0) continue;

                const ccy = currency ? currency.value : 'UGX';
                const rate = ccy === 'USD' ? Utils.getExchangeRate() : 1;
                const amountUGX = ccy === 'USD' ? Math.round(amt * rate) : amt;

                const supplierField = f['supplier_' + i];
                const supplierId = supplierField ? supplierField.value : '';

                DataStore.insert('landed_costs', {
                    grnId: selectedGrnId,
                    costType: type.value,
                    description: desc && desc.value ? desc.value : LandedCostModule._costTypeLabel(type.value),
                    amount: amt,
                    currency: ccy,
                    exchangeRate: rate,
                    amountUGX: amountUGX,
                    supplierId: supplierId,
                    apInvoiceId: '',
                    date: Utils.dateStr()
                });
                savedCount++;
            }

            if (savedCount === 0) { UI.toast('Add at least one cost', 'error'); return; }
            UI.closeModal();
            UI.toast(savedCount + ' landed cost(s) added to GRN');

            // Navigate to GRN detail if we came from there, otherwise refresh
            if (grnId) {
                GoodsReceipt.viewDetail(grnId);
            } else {
                LandedCostModule.render();
            }
        };
    },

    _costLineHtml: (index) => {
        const showLabel = index === 0;
        return '<div class="cost-line" id="cost-line-' + index + '" style="display:grid;grid-template-columns:0.8fr 1fr 1fr 0.7fr 0.4fr 30px;gap:6px;margin-bottom:8px;align-items:end">' +
            '<div class="form-group" style="margin:0">' + (showLabel ? '<label style="font-size:0.78rem">Cost Type</label>' : '') + '<select name="costType_' + index + '" required style="font-size:0.83rem">' + LandedCostModule._costTypeOptions() + '</select></div>' +
            '<div class="form-group" style="margin:0">' + (showLabel ? '<label style="font-size:0.78rem">Supplier / Payee</label>' : '') + '<select name="supplier_' + index + '" style="font-size:0.83rem"><option value="">-- Select --</option>' + UI.supplierOptions() + '</select></div>' +
            '<div class="form-group" style="margin:0">' + (showLabel ? '<label style="font-size:0.78rem">Description</label>' : '') + '<input type="text" name="desc_' + index + '" placeholder="Details" style="font-size:0.83rem"></div>' +
            '<div class="form-group" style="margin:0">' + (showLabel ? '<label style="font-size:0.78rem">Amount</label>' : '') + '<input type="number" name="amount_' + index + '" min="1" required oninput="LandedCostModule._updateCostTotal()" style="font-size:0.83rem"></div>' +
            '<div class="form-group" style="margin:0">' + (showLabel ? '<label style="font-size:0.78rem">Ccy</label>' : '') + '<select name="currency_' + index + '" style="font-size:0.83rem"><option value="UGX">UGX</option><option value="USD">USD</option></select></div>' +
            (index > 0 ? '<button type="button" class="btn btn-sm btn-ghost" style="color:var(--text-danger);height:36px;padding:0 4px" onclick="LandedCostModule._removeCostLine(' + index + ')">\u00d7</button>' : '<div style="height:36px"></div>') +
            '</div>';
    },

    _addCostLine: () => {
        const container = document.getElementById('cost-lines-container');
        if (!container) return;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = LandedCostModule._costLineHtml(LandedCostModule._lineCount);
        container.appendChild(wrapper.firstChild);
        LandedCostModule._lineCount++;
    },

    _removeCostLine: (index) => {
        const line = document.getElementById('cost-line-' + index);
        if (line) line.remove();
        LandedCostModule._updateCostTotal();
    },

    _updateGRNInfo: (grnId) => {
        const box = document.getElementById('grn-info-box');
        if (!box) return;
        const g = DataStore.getById('grn', grnId);
        if (!g) { box.innerHTML = '<span class="text-muted">Select a GRN</span>'; return; }
        const existingCosts = DataStore.getAll('landed_costs').filter(c => c.grnId === grnId);
        const existingTotal = existingCosts.reduce((s, c) => s + (c.amountUGX || c.amount || 0), 0);
        box.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;font-size:0.85rem">' +
            '<div><span class="text-muted">Supplier:</span> <strong>' + Utils.escapeHtml(UI.getSupplierName(g.supplierId)) + '</strong></div>' +
            '<div><span class="text-muted">Product:</span> <strong>' + UI.getProductCode(g.productId) + '</strong></div>' +
            '<div><span class="text-muted">Quantity:</span> <strong>' + Utils.volume(g.quantity) + '</strong></div>' +
            '<div><span class="text-muted">Base Cost:</span> <strong>' + Utils.currency(g.totalCost) + '</strong></div>' +
            '<div><span class="text-muted">Base/L:</span> <strong>' + Utils.currency(g.unitCost) + '</strong></div>' +
            (existingTotal > 0 ? '<div><span class="text-muted">Existing Landed:</span> <strong>' + Utils.currency(existingTotal) + '</strong> (' + existingCosts.length + ' items)</div>' : '<div><span class="text-muted">Landed:</span> <em>None yet</em></div>') +
            '</div>';
    },

    _updateCostTotal: () => {
        const display = document.getElementById('cost-total-display');
        if (!display) return;
        let total = 0;
        for (let i = 0; i < 20; i++) {
            const amtField = document.querySelector('[name="amount_' + i + '"]');
            const ccyField = document.querySelector('[name="currency_' + i + '"]');
            if (!amtField) continue;
            const amt = parseFloat(amtField.value) || 0;
            const ccy = ccyField ? ccyField.value : 'UGX';
            total += ccy === 'USD' ? Math.round(amt * Utils.getExchangeRate()) : amt;
        }
        display.innerHTML = '<span class="text-muted">New costs total: </span><strong style="font-size:1.1em">' + Utils.currency(total) + '</strong>';
    },

    removeCost: (costId) => {
        if (!confirm('Remove this landed cost?')) return;
        DataStore.remove('landed_costs', costId);
        UI.toast('Landed cost removed');
        LandedCostModule.render();
    }
};

// ============================================================
// AP INVOICES MODULE — Linked to GRN, auto-populate from purchase flow
// ============================================================
const APInvoices = {
    render: () => {
        UI.setPageTitle('AP Invoices');
        const invoices = DataStore.getAll('ap_invoices').sort((a, b) => b.date.localeCompare(a.date));

        // Summary
        let totalInvoiced = 0, totalPaid = 0;
        invoices.forEach(i => { totalInvoiced += i.amountUGX; totalPaid += i.paid; });

        let html = '<div class="flex-between mb-16"><span></span><div class="btn-group"><button class="btn btn-primary" onclick="APInvoices.showCreate()">New AP Invoice</button><button class="btn btn-secondary" onclick="APInvoices.showPayment()">Record Payment</button></div></div>';
        html += '<div class="stat-cards">';
        html += Dashboard._statCard('Total Invoiced', Utils.currency(totalInvoiced), invoices.length + ' invoices', 'blue', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>');
        html += Dashboard._statCard('Total Paid', Utils.currency(totalPaid), Utils.pct(totalPaid, totalInvoiced) + '% paid', 'green', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>');
        html += Dashboard._statCard('Outstanding', Utils.currency(totalInvoiced - totalPaid), '', 'yellow', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>');
        html += '</div>';

        html += '<div class="section-card"><div class="section-card-header"><span class="section-card-title">Supplier Invoices</span></div>';
        html += '<div class="section-card-body no-padding" style="overflow-x:auto"><table class="data-table" style="min-width:1100px"><thead><tr><th>Invoice No</th><th>Supplier</th><th>Date</th><th>Linked GRN</th><th>Type</th><th>Currency</th><th class="text-right">Amount</th><th class="text-right">Amount (UGX)</th><th class="text-right">Paid</th><th class="text-right">Balance</th><th>Status</th></tr></thead><tbody>';
        if (invoices.length === 0) {
            html += '<tr><td colspan="11" class="text-center text-muted" style="padding:32px">No AP invoices.</td></tr>';
        } else {
            invoices.forEach(inv => {
                const bal = inv.amountUGX - inv.paid;
                const badge = bal <= 0 ? '<span class="badge badge-success">Paid</span>' : '<span class="badge badge-warning">Open</span>';
                const grn = inv.grnId ? DataStore.getById('grn', inv.grnId) : null;
                const grnLink = grn ? '<a href="#" onclick="event.preventDefault();GoodsReceipt.viewDetail(\'' + grn.id + '\')" class="text-link text-mono">' + grn.grnNo + '</a>' : '<span class="text-muted">\u2014</span>';
                const typeBadge = inv.invoiceType === 'goods' ? '<span class="badge badge-info">Goods</span>' : inv.invoiceType === 'landed_cost' ? '<span class="badge badge-warning">Landed</span>' : '<span class="badge badge-neutral">Manual</span>';

                html += '<tr>';
                html += '<td class="text-mono text-bold">' + inv.invoiceNo + '</td>';
                html += '<td>' + Utils.escapeHtml(UI.getSupplierName(inv.supplierId)) + '</td>';
                html += '<td>' + Utils.dateDisplay(inv.date) + '</td>';
                html += '<td>' + grnLink + '</td>';
                html += '<td>' + typeBadge + '</td>';
                html += '<td>' + inv.currency + '</td>';
                html += '<td class="text-right text-mono">' + Utils.currency(inv.amount, inv.currency) + '</td>';
                html += '<td class="text-right text-mono">' + Utils.currency(inv.amountUGX) + '</td>';
                html += '<td class="text-right text-mono">' + Utils.currency(inv.paid) + '</td>';
                html += '<td class="text-right text-mono text-bold">' + Utils.currency(bal) + '</td>';
                html += '<td>' + badge + '</td>';
                html += '</tr>';
            });
        }
        html += '</tbody></table></div></div>';
        UI.render(html);
    },

    showCreate: () => {
        const grns = DataStore.getAll('grn');
        let grnOpts = '<option value="">\u2014 No GRN (Manual Invoice) \u2014</option>';
        grnOpts += grns.map(g => '<option value="' + g.id + '">' + g.grnNo + ' \u2014 ' + UI.getSupplierName(g.supplierId) + ' (' + UI.getProductCode(g.productId) + ')</option>').join('');

        const html = '<form class="modal-form" id="ap-form">' +
            '<div class="form-group"><label>Link to GRN (optional)</label><select name="grnId" onchange="APInvoices._onGRNSelect(this)">' + grnOpts + '</select></div>' +
            '<div class="form-row"><div class="form-group"><label>Supplier</label><select name="supplierId" required id="ap-supplier-select">' + UI.supplierOptions() + '</select></div><div class="form-group"><label>Date</label><input type="date" name="date" value="' + Utils.dateStr() + '" required></div></div>' +
            '<div class="form-row"><div class="form-group"><label>Currency</label><select name="currency"><option value="UGX">UGX</option><option value="USD">USD</option></select></div><div class="form-group"><label>Exchange Rate</label><input type="number" name="exchangeRate" value="' + Utils.getExchangeRate() + '" step="0.01"></div></div>' +
            '<div class="form-row"><div class="form-group"><label>Amount</label><input type="number" name="amount" min="1" required id="ap-amount"></div><div class="form-group"><label>Type</label><select name="invoiceType"><option value="goods">Goods Purchase</option><option value="landed_cost">Landed Cost Service</option><option value="manual">Manual / Other</option></select></div></div>' +
            '<div class="form-group"><label>Description</label><input type="text" name="description" placeholder="Invoice description" id="ap-description"></div>' +
            '<div class="form-actions"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create Invoice</button></div></form>';
        UI.modal('New AP Invoice', html, true);
        document.getElementById('ap-form').onsubmit = (e) => {
            e.preventDefault();
            const f = e.target;
            const amount = parseFloat(f.amount.value);
            const ccy = f.currency.value;
            const rate = parseFloat(f.exchangeRate.value) || 1;
            const amountUGX = ccy === 'USD' ? Math.round(amount * rate) : amount;
            const grnId = f.grnId.value || '';

            const inv = DataStore.insert('ap_invoices', {
                invoiceNo: Utils.nextNumber('APV'),
                supplierId: f.supplierId.value,
                currency: ccy,
                exchangeRate: rate,
                amount: amount,
                amountUGX: amountUGX,
                paid: 0,
                date: f.date.value,
                grnId: grnId,
                invoiceType: f.invoiceType.value,
                description: f.description.value
            });

            if (grnId) DataStore.update('grn', grnId, { status: 'invoiced' });
            UI.closeModal();
            UI.toast('AP Invoice ' + inv.invoiceNo + ' created');
            APInvoices.render();
        };
    },

    showCreateForBaseCost: (grnId) => {
        const g = DataStore.getById('grn', grnId);
        if (!g) return;
        const sup = DataStore.getById('suppliers', g.supplierId);
        const supCurrency = sup ? (sup.currency || 'UGX') : 'UGX';

        const html = '<form class="modal-form" id="ap-base-form">' +
            '<div style="background:var(--content-bg);border-radius:8px;padding:16px;margin-bottom:16px">' +
            '<div style="font-weight:600;margin-bottom:8px">' + g.grnNo + ' \u2014 Base Goods Cost</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;font-size:0.85rem">' +
            '<div><span class="text-muted">Supplier:</span> <strong>' + Utils.escapeHtml(UI.getSupplierName(g.supplierId)) + '</strong></div>' +
            '<div><span class="text-muted">Product:</span> <strong>' + UI.getProductCode(g.productId) + '</strong></div>' +
            '<div><span class="text-muted">Quantity:</span> <strong>' + Utils.volume(g.quantity) + '</strong></div>' +
            '<div><span class="text-muted">Base Cost:</span> <strong style="color:var(--text-success)">' + Utils.currency(g.totalCost) + '</strong></div>' +
            '</div></div>' +
            '<div class="form-row"><div class="form-group"><label>Currency</label><select name="currency"><option value="UGX"' + (supCurrency === 'UGX' ? ' selected' : '') + '>UGX</option><option value="USD"' + (supCurrency === 'USD' ? ' selected' : '') + '>USD</option></select></div><div class="form-group"><label>Exchange Rate</label><input type="number" name="exchangeRate" value="' + Utils.getExchangeRate() + '" step="0.01"></div></div>' +
            '<div class="form-row"><div class="form-group"><label>Amount</label><input type="number" name="amount" value="' + g.totalCost + '" min="1" required></div><div class="form-group"><label>Date</label><input type="date" name="date" value="' + Utils.dateStr() + '" required></div></div>' +
            '<div class="form-group"><label>Description</label><input type="text" name="description" value="' + Utils.escapeHtml(g.grnNo + ' \u2014 ' + UI.getProductName(g.productId) + ' supply') + '" required></div>' +
            '<div class="form-actions"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create AP Invoice</button></div></form>';

        UI.modal('AP Invoice \u2014 Base Cost (' + g.grnNo + ')', html, true);
        document.getElementById('ap-base-form').onsubmit = (e) => {
            e.preventDefault();
            const f = e.target;
            const amount = parseFloat(f.amount.value);
            const ccy = f.currency.value;
            const rate = parseFloat(f.exchangeRate.value) || 1;
            const amountUGX = ccy === 'USD' ? Math.round(amount * rate) : amount;

            const inv = DataStore.insert('ap_invoices', {
                invoiceNo: Utils.nextNumber('APV'),
                supplierId: g.supplierId,
                currency: ccy,
                exchangeRate: rate,
                amount: amount,
                amountUGX: amountUGX,
                paid: 0,
                date: f.date.value,
                grnId: grnId,
                invoiceType: 'goods',
                landedCostId: '',
                description: f.description.value
            });

            UI.closeModal();
            UI.toast('AP Invoice ' + inv.invoiceNo + ' created for base cost');
            GoodsReceipt.viewDetail(grnId);
        };
    },

    showCreateForLandedCost: (costId, grnId) => {
        const cost = DataStore.getById('landed_costs', costId);
        if (!cost) { UI.toast('Landed cost not found', 'error'); return; }
        if (cost.apInvoiceId) { UI.toast('This cost already has an AP invoice', 'info'); return; }
        const g = DataStore.getById('grn', grnId);
        if (!g) return;

        const costSupplier = cost.supplierId ? DataStore.getById('suppliers', cost.supplierId) : null;
        const supCurrency = costSupplier ? (costSupplier.currency || 'UGX') : (cost.currency || 'UGX');
        const costAmount = cost.amountUGX || cost.amount || 0;
        const supplierName = costSupplier ? costSupplier.name : 'No supplier assigned';

        const html = '<form class="modal-form" id="ap-landed-form">' +
            '<div style="background:var(--content-bg);border-radius:8px;padding:16px;margin-bottom:16px">' +
            '<div style="font-weight:600;margin-bottom:8px">' + g.grnNo + ' \u2014 ' + LandedCostModule._costTypeLabel(cost.costType) + '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;font-size:0.85rem">' +
            '<div><span class="text-muted">Supplier / Payee:</span> <strong>' + Utils.escapeHtml(supplierName) + '</strong></div>' +
            '<div><span class="text-muted">Cost Type:</span> <strong>' + LandedCostModule._costTypeLabel(cost.costType) + '</strong></div>' +
            '<div><span class="text-muted">Description:</span> <strong>' + Utils.escapeHtml(cost.description) + '</strong></div>' +
            '<div><span class="text-muted">Amount (UGX):</span> <strong style="color:var(--text-success)">' + Utils.currency(costAmount) + '</strong></div>' +
            '</div></div>' +
            (!cost.supplierId ? '<div style="background:var(--bg-warning);border:1px solid var(--border-warning);border-radius:8px;padding:12px;margin-bottom:16px;font-size:0.85rem"><strong>No supplier assigned.</strong> Select who to invoice below.</div><div class="form-group"><label>Supplier / Payee</label><select name="supplierId" required>' + UI.supplierOptions() + '</select></div>' : '') +
            '<div class="form-row"><div class="form-group"><label>Currency</label><select name="currency"><option value="UGX"' + (supCurrency === 'UGX' ? ' selected' : '') + '>UGX</option><option value="USD"' + (supCurrency === 'USD' ? ' selected' : '') + '>USD</option></select></div><div class="form-group"><label>Exchange Rate</label><input type="number" name="exchangeRate" value="' + Utils.getExchangeRate() + '" step="0.01"></div></div>' +
            '<div class="form-row"><div class="form-group"><label>Amount</label><input type="number" name="amount" value="' + costAmount + '" min="1" required></div><div class="form-group"><label>Date</label><input type="date" name="date" value="' + Utils.dateStr() + '" required></div></div>' +
            '<div class="form-group"><label>Description</label><input type="text" name="description" value="' + Utils.escapeHtml(g.grnNo + ' \u2014 ' + LandedCostModule._costTypeLabel(cost.costType) + ': ' + cost.description) + '" required></div>' +
            '<div class="form-actions"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create AP Invoice</button></div></form>';

        UI.modal('AP Invoice \u2014 ' + LandedCostModule._costTypeLabel(cost.costType) + ' (' + g.grnNo + ')', html, true);
        document.getElementById('ap-landed-form').onsubmit = (e) => {
            e.preventDefault();
            const f = e.target;
            const amount = parseFloat(f.amount.value);
            const ccy = f.currency.value;
            const rate = parseFloat(f.exchangeRate.value) || 1;
            const amountUGX = ccy === 'USD' ? Math.round(amount * rate) : amount;
            const invoiceSupplierId = cost.supplierId || (f.supplierId ? f.supplierId.value : '');

            const inv = DataStore.insert('ap_invoices', {
                invoiceNo: Utils.nextNumber('APV'),
                supplierId: invoiceSupplierId,
                currency: ccy,
                exchangeRate: rate,
                amount: amount,
                amountUGX: amountUGX,
                paid: 0,
                date: f.date.value,
                grnId: grnId,
                invoiceType: 'landed_cost',
                landedCostId: costId,
                description: f.description.value
            });

            // Link the AP invoice back to the landed cost
            DataStore.update('landed_costs', costId, { apInvoiceId: inv.id, supplierId: invoiceSupplierId });

            UI.closeModal();
            UI.toast('AP Invoice ' + inv.invoiceNo + ' created for ' + LandedCostModule._costTypeLabel(cost.costType));
            GoodsReceipt.viewDetail(grnId);
        };
    },

    _onGRNSelect: (select) => {
        const grnId = select.value;
        if (!grnId) return;
        const g = DataStore.getById('grn', grnId);
        if (!g) return;
        const supSelect = document.getElementById('ap-supplier-select');
        if (supSelect) supSelect.value = g.supplierId;
        const landedCosts = DataStore.getAll('landed_costs').filter(c => c.grnId === grnId);
        const landedTotal = landedCosts.reduce((s, c) => s + (c.amountUGX || c.amount || 0), 0);
        const amountField = document.getElementById('ap-amount');
        if (amountField) amountField.value = g.totalCost + landedTotal;
        const descField = document.getElementById('ap-description');
        if (descField) descField.value = g.grnNo + ' \u2014 ' + UI.getProductName(g.productId) + ' supply';
    },

    showPayment: () => {
        const invoices = DataStore.getAll('ap_invoices').filter(i => i.amountUGX - i.paid > 0);
        if (invoices.length === 0) { UI.toast('No open invoices to pay', 'info'); return; }
        let invOpts = invoices.map(i => {
            const grn = i.grnId ? DataStore.getById('grn', i.grnId) : null;
            const grnRef = grn ? ' (' + grn.grnNo + ')' : '';
            return '<option value="' + i.id + '">' + i.invoiceNo + ' \u2014 ' + UI.getSupplierName(i.supplierId) + grnRef + ' (Bal: ' + Utils.currency(i.amountUGX - i.paid) + ')</option>';
        }).join('');

        const html = '<form class="modal-form" id="ap-pay-form"><div class="form-group"><label>Invoice</label><select name="invoiceId" required>' + invOpts + '</select></div><div class="form-row"><div class="form-group"><label>Amount (UGX)</label><input type="number" name="amount" min="1" required></div><div class="form-group"><label>Pay From Account</label><select name="accountId" required>' + UI.cashAccountOptions() + '</select></div></div><div class="form-row"><div class="form-group"><label>Reference</label><input type="text" name="reference" placeholder="Ref #"></div><div class="form-group"><label>Date</label><input type="date" name="date" value="' + Utils.dateStr() + '" required></div></div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Pay</button></div></form>';
        UI.modal('Pay Supplier Invoice', html, true);
        document.getElementById('ap-pay-form').onsubmit = (e) => {
            e.preventDefault();
            const f = e.target;
            const inv = DataStore.getById('ap_invoices', f.invoiceId.value);
            if (!inv) return;
            const amt = parseFloat(f.amount.value);
            DataStore.update('ap_invoices', inv.id, { paid: inv.paid + amt });
            DataStore.insert('supplier_payments', { supplierId: inv.supplierId, invoiceId: inv.id, amount: amt, accountId: f.accountId.value, reference: f.reference.value, date: f.date.value });
            UI.closeModal();
            UI.toast('Payment of ' + Utils.currency(amt) + ' recorded');
            APInvoices.render();
        };
    }
};

// ============================================================
// SUPPLIERS MODULE
// ============================================================
const Suppliers = {
    render: () => {
        UI.setPageTitle('Suppliers');
        const suppliers = DataStore.getAll('suppliers');
        const apInvoices = DataStore.getAll('ap_invoices');
        let html = '<div class="flex-between mb-16"><span></span><button class="btn btn-primary" onclick="Suppliers.showAdd()">Add Supplier</button></div>';
        html += '<div class="section-card"><div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>Name</th><th>Contact</th><th>Email</th><th>Currency</th><th class="text-right">Total Invoiced</th><th class="text-right">Total Paid</th><th class="text-right">Balance</th><th>Actions</th></tr></thead><tbody>';
        suppliers.forEach(s => {
            const sInv = apInvoices.filter(i => i.supplierId === s.id);
            const totalInv = sInv.reduce((sum, i) => sum + i.amountUGX, 0);
            const totalPaid = sInv.reduce((sum, i) => sum + i.paid, 0);
            html += '<tr><td class="text-bold">' + Utils.escapeHtml(s.name) + '</td><td>' + Utils.escapeHtml(s.contact || '') + '</td><td>' + Utils.escapeHtml(s.email || '') + '</td><td>' + (s.currency || 'UGX') + '</td>';
            html += '<td class="text-right text-mono">' + Utils.currency(totalInv) + '</td><td class="text-right text-mono">' + Utils.currency(totalPaid) + '</td><td class="text-right text-mono text-bold">' + Utils.currency(totalInv - totalPaid) + '</td>';
            html += '<td><button class="btn btn-sm btn-ghost" onclick="Suppliers.viewStatement(\'' + s.id + '\')">Statement</button></td></tr>';
        });
        html += '</tbody></table></div></div>';
        UI.render(html);
    },
    showAdd: () => {
        const html = '<form class="modal-form" id="sup-form"><div class="form-group"><label>Name</label><input type="text" name="name" required></div><div class="form-row"><div class="form-group"><label>Contact</label><input type="tel" name="contact"></div><div class="form-group"><label>Email</label><input type="email" name="email"></div></div><div class="form-row"><div class="form-group"><label>Address</label><input type="text" name="address"></div><div class="form-group"><label>Currency</label><select name="currency"><option value="UGX">UGX</option><option value="USD">USD</option></select></div></div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div></form>';
        UI.modal('Add Supplier', html);
        document.getElementById('sup-form').onsubmit = (e) => {
            e.preventDefault();
            const f = e.target;
            DataStore.insert('suppliers', { name: f.name.value, contact: f.contact.value, email: f.email.value, address: f.address.value, currency: f.currency.value, tin: '' });
            UI.closeModal();
            UI.toast('Supplier added');
            Suppliers.render();
        };
    },
    viewStatement: (id) => {
        const sup = DataStore.getById('suppliers', id);
        if (!sup) return;
        const invoices = DataStore.getAll('ap_invoices').filter(i => i.supplierId === id).sort((a, b) => a.date.localeCompare(b.date));
        const payments = DataStore.getAll('supplier_payments').filter(p => p.supplierId === id).sort((a, b) => a.date.localeCompare(b.date));
        let lines = [];
        invoices.forEach(i => lines.push({ date: i.date, desc: 'Invoice ' + i.invoiceNo + (i.description ? ' - ' + i.description : ''), debit: i.amountUGX, credit: 0 }));
        payments.forEach(p => lines.push({ date: p.date, desc: 'Payment ' + (p.reference || ''), debit: 0, credit: p.amount }));
        lines.sort((a, b) => a.date.localeCompare(b.date));
        let bal = 0;
        let html = '<div class="report-header"><h2>' + Utils.escapeHtml(sup.name) + '</h2><p>Supplier Statement</p></div>';
        html += '<table class="data-table"><thead><tr><th>Date</th><th>Description</th><th class="text-right">Debit</th><th class="text-right">Credit</th><th class="text-right">Balance</th></tr></thead><tbody>';
        lines.forEach(l => {
            bal += l.debit - l.credit;
            html += '<tr><td>' + Utils.dateDisplay(l.date) + '</td><td>' + Utils.escapeHtml(l.desc) + '</td><td class="text-right text-mono">' + (l.debit > 0 ? Utils.currency(l.debit) : '-') + '</td><td class="text-right text-mono">' + (l.credit > 0 ? Utils.currency(l.credit) : '-') + '</td><td class="text-right text-mono text-bold">' + Utils.currency(bal) + '</td></tr>';
        });
        html += '</tbody></table>';
        UI.modal(sup.name + ' — Statement', html, true);
    }
};

// ============================================================
// SUPPLIER STATEMENTS MODULE (Full Page)
// ============================================================
const SupplierStatements = {
    render: () => {
        UI.setPageTitle('Supplier Statements');
        const suppliers = DataStore.getAll('suppliers');
        const apInvoices = DataStore.getAll('ap_invoices');

        let html = '<div class="form-group" style="max-width:450px;margin-bottom:16px"><label>Select Supplier</label><select id="sup-stmt-select" onchange="SupplierStatements.showStatement(this.value)"><option value="">\u2014 Choose Supplier \u2014</option>';
        suppliers.forEach(s => {
            const sInv = apInvoices.filter(i => i.supplierId === s.id);
            const balance = sInv.reduce((sum, i) => sum + i.amountUGX - i.paid, 0);
            html += '<option value="' + s.id + '">' + Utils.escapeHtml(s.name) + ' (Balance: ' + Utils.currency(balance) + ')</option>';
        });
        html += '</select></div>';
        html += '<div id="sup-stmt-content"></div>';
        UI.render(html);
    },

    showStatement: (supplierId) => {
        const container = document.getElementById('sup-stmt-content');
        if (!container || !supplierId) { if (container) container.innerHTML = ''; return; }

        const sup = DataStore.getById('suppliers', supplierId);
        if (!sup) return;

        const invoices = DataStore.getAll('ap_invoices').filter(i => i.supplierId === supplierId);
        const payments = DataStore.getAll('supplier_payments').filter(p => p.supplierId === supplierId);
        const grns = DataStore.getAll('grn').filter(g => g.supplierId === supplierId);

        let lines = [];
        invoices.forEach(i => {
            const grn = i.grnId ? DataStore.getById('grn', i.grnId) : null;
            let desc = 'Invoice ' + i.invoiceNo;
            if (grn) desc += ' (GRN: ' + grn.grnNo + ' \u2014 ' + UI.getProductCode(grn.productId) + ')';
            if (i.description) desc += ' \u2014 ' + i.description;
            lines.push({ date: i.date, desc: desc, debit: i.amountUGX, credit: 0 });
        });
        payments.forEach(p => {
            const inv = p.invoiceId ? DataStore.getById('ap_invoices', p.invoiceId) : null;
            let desc = 'Payment';
            if (inv) desc += ' for ' + inv.invoiceNo;
            if (p.reference) desc += ' #' + p.reference;
            const acct = DataStore.getById('accounts', p.accountId);
            if (acct) desc += ' via ' + acct.name;
            lines.push({ date: p.date, desc: desc, debit: 0, credit: p.amount });
        });
        lines.sort((a, b) => a.date.localeCompare(b.date));

        let bal = 0, totalDebit = 0, totalCredit = 0;

        let html = '<div class="section-card"><div class="report-header"><h2>' + Utils.escapeHtml(sup.name) + '</h2><p>Supplier Statement</p><p class="report-date">Currency: ' + (sup.currency || 'UGX') + ' | As at ' + Utils.dateDisplay(Utils.dateStr()) + '</p></div>';

        // GRN summary
        if (grns.length > 0) {
            const totalGRN = grns.reduce((s, g) => s + g.totalCost, 0);
            const totalQty = grns.reduce((s, g) => s + g.quantity, 0);
            html += '<div style="padding:12px 16px;border-bottom:1px solid var(--content-border);font-size:0.85rem;display:flex;gap:24px;flex-wrap:wrap">';
            html += '<div><span class="text-muted">GRNs:</span> <strong>' + grns.length + '</strong></div>';
            html += '<div><span class="text-muted">Total Received:</span> <strong>' + Utils.volume(totalQty) + '</strong></div>';
            html += '<div><span class="text-muted">Total Base Value:</span> <strong>' + Utils.currency(totalGRN) + '</strong></div>';
            html += '</div>';
        }

        html += '<div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>Date</th><th>Description</th><th class="text-right">Debit (Invoices)</th><th class="text-right">Credit (Payments)</th><th class="text-right">Running Balance</th></tr></thead><tbody>';
        if (lines.length === 0) {
            html += '<tr><td colspan="5" class="text-center text-muted" style="padding:32px">No transactions found for this supplier.</td></tr>';
        } else {
            lines.forEach(l => {
                bal += l.debit - l.credit;
                totalDebit += l.debit;
                totalCredit += l.credit;
                html += '<tr><td>' + Utils.dateDisplay(l.date) + '</td><td>' + Utils.escapeHtml(l.desc) + '</td>';
                html += '<td class="text-right text-mono">' + (l.debit > 0 ? Utils.currency(l.debit) : '-') + '</td>';
                html += '<td class="text-right text-mono">' + (l.credit > 0 ? Utils.currency(l.credit) : '-') + '</td>';
                html += '<td class="text-right text-mono text-bold">' + Utils.currency(bal) + '</td></tr>';
            });
        }
        html += '</tbody><tfoot>';
        html += '<tr><td colspan="2" class="text-bold">Totals</td><td class="text-right text-mono text-bold">' + Utils.currency(totalDebit) + '</td><td class="text-right text-mono text-bold">' + Utils.currency(totalCredit) + '</td><td class="text-right text-mono text-bold" style="border-top:2px solid var(--content-border)">' + Utils.currency(bal) + '</td></tr>';
        html += '</tfoot></table></div></div>';
        container.innerHTML = html;
    }
};

// ============================================================
// QUOTATIONS MODULE
// ============================================================
const Quotations = {
    render: () => {
        UI.setPageTitle('Quotations');
        const quotes = DataStore.getAll('quotations');
        let html = '<div class="flex-between mb-16"><span></span><button class="btn btn-primary" onclick="Quotations.showCreate()">New Quotation</button></div>';
        html += '<div class="section-card"><div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>Quote No</th><th>Customer</th><th>Date</th><th>Valid Until</th><th class="text-right">Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
        if (quotes.length === 0) {
            html += '<tr><td colspan="7" class="text-center text-muted" style="padding:32px">No quotations yet.</td></tr>';
        } else {
            quotes.sort((a, b) => b.date.localeCompare(a.date)).forEach(q => {
                const badge = q.status === 'accepted' ? '<span class="badge badge-success">Accepted</span>' : q.status === 'rejected' ? '<span class="badge badge-danger">Rejected</span>' : '<span class="badge badge-warning">Draft</span>';
                html += '<tr><td class="text-mono text-bold">' + q.quoteNo + '</td><td>' + Utils.escapeHtml(UI.getCustomerName(q.customerId)) + '</td><td>' + Utils.dateDisplay(q.date) + '</td><td>' + Utils.dateDisplay(q.validUntil) + '</td>';
                html += '<td class="text-right text-mono">' + Utils.currency(q.total) + '</td><td>' + badge + '</td>';
                html += '<td><div class="btn-group">';
                if (q.status === 'draft') html += '<button class="btn btn-sm btn-success" onclick="Quotations.convertToSale(\'' + q.id + '\')">Convert</button>';
                html += '<button class="btn btn-sm btn-ghost" onclick="Quotations.view(\'' + q.id + '\')">View</button></div></td></tr>';
            });
        }
        html += '</tbody></table></div></div>';
        UI.render(html);
    },
    showCreate: () => {
        const html = '<form class="modal-form" id="quote-form"><div class="form-row"><div class="form-group"><label>Customer</label><select name="customerId" required>' + UI.customerOptions() + '</select></div><div class="form-group"><label>Date</label><input type="date" name="date" value="' + Utils.dateStr() + '" required></div></div><div class="form-row"><div class="form-group"><label>Valid Until</label><input type="date" name="validUntil" required></div><div class="form-group"><label>Branch</label><select name="branchId" required>' + UI.branchOptions() + '</select></div></div><div class="form-row"><div class="form-group"><label>Product</label><select name="productId" required>' + UI.productOptions() + '</select></div><div class="form-group"><label>Quantity (L)</label><input type="number" name="quantity" min="1" required></div></div><div class="form-row"><div class="form-group"><label>Unit Price</label><input type="number" name="unitPrice" min="1" required></div><div class="form-group"><label>Notes</label><input type="text" name="notes" placeholder="Optional notes"></div></div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create Quotation</button></div></form>';
        UI.modal('New Quotation', html, true);
        document.getElementById('quote-form').onsubmit = (e) => {
            e.preventDefault();
            const f = e.target;
            const qty = parseFloat(f.quantity.value);
            const price = parseFloat(f.unitPrice.value);
            DataStore.insert('quotations', {
                quoteNo: Utils.nextNumber('QTN'),
                customerId: f.customerId.value,
                branchId: f.branchId.value,
                date: f.date.value,
                validUntil: f.validUntil.value,
                lines: [{ productId: f.productId.value, quantity: qty, unitPrice: price, lineTotal: qty * price }],
                total: qty * price,
                notes: f.notes.value,
                status: 'draft'
            });
            UI.closeModal();
            UI.toast('Quotation created');
            Quotations.render();
        };
    },
    view: (id) => {
        const q = DataStore.getById('quotations', id);
        if (!q) return;
        let html = '<div class="report-header"><h2>QUOTATION</h2><p>' + q.quoteNo + '</p></div>';
        html += '<div style="padding:16px"><p><strong>Customer:</strong> ' + Utils.escapeHtml(UI.getCustomerName(q.customerId)) + '</p>';
        html += '<p><strong>Date:</strong> ' + Utils.dateDisplay(q.date) + ' | <strong>Valid Until:</strong> ' + Utils.dateDisplay(q.validUntil) + '</p></div>';
        html += '<table class="data-table"><thead><tr><th>Product</th><th class="text-right">Qty</th><th class="text-right">Price</th><th class="text-right">Total</th></tr></thead><tbody>';
        (q.lines || []).forEach(l => {
            html += '<tr><td>' + Utils.escapeHtml(UI.getProductName(l.productId)) + '</td><td class="text-right text-mono">' + Utils.volume(l.quantity) + '</td><td class="text-right text-mono">' + Utils.currency(l.unitPrice) + '</td><td class="text-right text-mono text-bold">' + Utils.currency(l.lineTotal) + '</td></tr>';
        });
        html += '</tbody><tfoot><tr><td colspan="3" class="text-bold">Total</td><td class="text-right text-mono text-bold">' + Utils.currency(q.total) + '</td></tr></tfoot></table>';
        if (q.notes) html += '<div style="padding:16px;color:var(--text-secondary);font-size:0.9rem"><strong>Notes:</strong> ' + Utils.escapeHtml(q.notes) + '</div>';
        UI.modal('Quotation ' + q.quoteNo, html, true);
    },
    convertToSale: (id) => {
        const q = DataStore.getById('quotations', id);
        if (!q) return;
        const warehouses = DataStore.getAll('warehouses').filter(w => w.branchId === q.branchId);
        const line = q.lines[0];
        const wh = warehouses.find(w => w.productId === line.productId);
        if (!wh) { UI.toast('No matching warehouse found', 'error'); return; }
        const sale = {
            invoiceNo: Utils.nextNumber('INV'),
            customerId: q.customerId,
            branchId: q.branchId,
            lines: [{ productId: line.productId, warehouseId: wh.id, quantity: line.quantity, unitPrice: line.unitPrice, lineTotal: line.lineTotal }],
            total: q.total,
            paid: 0,
            date: Utils.dateStr(),
            status: 'delivered'
        };
        DataStore.insert('sales', sale);
        DataStore.update('quotations', id, { status: 'accepted' });
        // Update customer balance
        const cust = DataStore.getById('customers', q.customerId);
        if (cust) DataStore.update('customers', cust.id, { balance: (cust.balance || 0) + q.total });
        // Deduct inventory
        const inv = DataStore.getAll('inventory').find(i => i.warehouseId === wh.id);
        if (inv) DataStore.update('inventory', inv.id, { quantity: Math.max(0, inv.quantity - line.quantity) });
        UI.toast('Converted to Sale ' + sale.invoiceNo);
        Quotations.render();
    }
};

// ============================================================
// SALES MODULE
// ============================================================
const Sales = {
    render: () => {
        UI.setPageTitle('Sales');
        const sales = DataStore.getAll('sales');
        let html = '<div class="flex-between mb-16"><span></span><button class="btn btn-primary" onclick="Sales.showCreateSale()">New Sale</button></div>';
        html += UI.dateFilterBar('Sales.render()');
        let filtered = UI.filterByDate(sales, 'date').sort((a, b) => b.date.localeCompare(a.date));
        let totalSales = 0, totalPaid = 0;
        filtered.forEach(s => { totalSales += s.total; totalPaid += s.paid; });
        html += '<div class="stat-cards">';
        html += Dashboard._statCard('Total Sales', Utils.currency(totalSales), filtered.length + ' invoices', 'green', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>');
        html += Dashboard._statCard('Collected', Utils.currency(totalPaid), Utils.pct(totalPaid, totalSales) + '% collected', 'blue', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>');
        html += Dashboard._statCard('Outstanding', Utils.currency(totalSales - totalPaid), '', 'yellow', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>');
        html += '</div>';
        html += '<div class="section-card"><div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>Invoice</th><th>Customer</th><th>Branch</th><th>Date</th><th class="text-right">Amount</th><th class="text-right">Paid</th><th class="text-right">Balance</th><th>Status</th></tr></thead><tbody>';
        filtered.forEach(s => {
            const bal = s.total - s.paid;
            const badge = bal <= 0 ? '<span class="badge badge-success">Paid</span>' : bal < s.total ? '<span class="badge badge-warning">Partial</span>' : '<span class="badge badge-danger">Unpaid</span>';
            html += '<tr><td class="text-mono text-bold">' + s.invoiceNo + '</td><td><a href="#" onclick="event.preventDefault();Customers.viewStatement(\'' + s.customerId + '\')" class="text-link">' + Utils.escapeHtml(UI.getCustomerName(s.customerId)) + '</a></td><td>' + Utils.escapeHtml(UI.getBranchName(s.branchId)) + '</td><td>' + Utils.dateDisplay(s.date) + '</td>';
            html += '<td class="text-right text-mono">' + Utils.currency(s.total) + '</td><td class="text-right text-mono">' + Utils.currency(s.paid) + '</td><td class="text-right text-mono text-bold">' + Utils.currency(bal) + '</td><td>' + badge + '</td></tr>';
        });
        html += '</tbody></table></div></div>';
        UI.render(html);
    },
    showCreateSale: () => {
        const html = '<form class="modal-form" id="sale-form"><div class="form-row"><div class="form-group"><label>Customer</label><select name="customerId" required>' + UI.customerOptions() + '</select></div><div class="form-group"><label>Branch</label><select name="branchId" required onchange="Inventory._updateWarehouseDropdown(this.value,document.querySelector(\'#sale-form [name=warehouseId]\'))">' + UI.branchOptions() + '</select></div></div><div class="form-row"><div class="form-group"><label>Product</label><select name="productId" required>' + UI.productOptions() + '</select></div><div class="form-group"><label>Warehouse</label><select name="warehouseId" required>' + UI.warehouseOptions() + '</select></div></div><div class="form-row"><div class="form-group"><label>Quantity (L)</label><input type="number" name="quantity" min="1" required></div><div class="form-group"><label>Unit Price</label><input type="number" name="unitPrice" min="1" required value="4800"></div></div><div class="form-row"><div class="form-group"><label>Date</label><input type="date" name="date" value="' + Utils.dateStr() + '" required></div><div class="form-group"><label>Payment Amount</label><input type="number" name="paidAmount" min="0" value="0" placeholder="0 for credit sale"></div></div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create Sale</button></div></form>';
        UI.modal('New Sale', html, true);
        document.getElementById('sale-form').onsubmit = (e) => {
            e.preventDefault();
            const f = e.target;
            const qty = parseFloat(f.quantity.value);
            const price = parseFloat(f.unitPrice.value);
            const total = qty * price;
            const paid = parseFloat(f.paidAmount.value) || 0;
            const sale = {
                invoiceNo: Utils.nextNumber('INV'),
                customerId: f.customerId.value,
                branchId: f.branchId.value,
                lines: [{ productId: f.productId.value, warehouseId: f.warehouseId.value, quantity: qty, unitPrice: price, lineTotal: total }],
                total: total,
                paid: paid,
                date: f.date.value,
                status: 'delivered'
            };
            DataStore.insert('sales', sale);
            // Deduct inventory
            const inv = DataStore.getAll('inventory').find(i => i.warehouseId === f.warehouseId.value);
            if (inv) DataStore.update('inventory', inv.id, { quantity: Math.max(0, inv.quantity - qty) });
            // Update customer balance
            const cust = DataStore.getById('customers', f.customerId.value);
            if (cust) DataStore.update('customers', cust.id, { balance: (cust.balance || 0) + total - paid });
            // Post journal entry: DR Accounts Receivable, CR Sales Revenue
            const revenueAcct = f.productId.value === 'pms' ? '4000' : '4010';
            const saleEntries = [
                { accountId: '1100', debit: total, credit: 0, customerId: f.customerId.value },
                { accountId: revenueAcct, debit: 0, credit: total }
            ];
            DataStore.insert('journals', { date: f.date.value, description: 'Sale ' + sale.invoiceNo + ' — ' + UI.getCustomerName(f.customerId.value), branchId: f.branchId.value, entries: saleEntries });
            // Record payment if any
            if (paid > 0) {
                DataStore.insert('payments', { customerId: f.customerId.value, amount: paid, method: 'cash', accountId: '1000', reference: sale.invoiceNo, date: f.date.value });
                // Post payment journal: DR Cash, CR Accounts Receivable
                DataStore.insert('journals', { date: f.date.value, description: 'Payment on ' + sale.invoiceNo, branchId: f.branchId.value, entries: [
                    { accountId: '1000', debit: paid, credit: 0 },
                    { accountId: '1100', debit: 0, credit: paid, customerId: f.customerId.value }
                ]});
            }
            UI.closeModal();
            UI.toast('Sale ' + sale.invoiceNo + ' created — ' + Utils.currency(total));
            Sales.render();
        };
    }
};

// ============================================================
// CUSTOMERS MODULE
// ============================================================
const Customers = {
    render: () => {
        UI.setPageTitle('Customers');
        const customers = DataStore.getAll('customers');
        let html = '<div class="flex-between mb-16"><span></span><button class="btn btn-primary" onclick="Customers.showAdd()">Add Customer</button></div>';
        html += '<div class="section-card"><div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>Name</th><th>Contact</th><th>Email</th><th class="text-right">Credit Limit</th><th class="text-right">Balance</th><th class="text-right">Utilization</th><th>Actions</th></tr></thead><tbody>';
        customers.forEach(c => {
            const util = c.creditLimit > 0 ? Utils.pct(c.balance || 0, c.creditLimit) : 0;
            const utilBadge = util > 80 ? '<span class="badge badge-danger">' + util + '%</span>' : util > 50 ? '<span class="badge badge-warning">' + util + '%</span>' : '<span class="badge badge-success">' + util + '%</span>';
            html += '<tr><td class="text-bold">' + Utils.escapeHtml(c.name) + '</td><td>' + Utils.escapeHtml(c.contact || '') + '</td><td>' + Utils.escapeHtml(c.email || '') + '</td>';
            html += '<td class="text-right text-mono">' + Utils.currency(c.creditLimit) + '</td><td class="text-right text-mono text-bold">' + Utils.currency(c.balance || 0) + '</td><td class="text-right">' + utilBadge + '</td>';
            html += '<td><button class="btn btn-sm btn-ghost" onclick="Customers.viewStatement(\'' + c.id + '\')">Statement</button></td></tr>';
        });
        html += '</tbody></table></div></div>';
        UI.render(html);
    },
    showAdd: () => {
        const html = '<form class="modal-form" id="cust-form"><div class="form-group"><label>Name</label><input type="text" name="name" required></div><div class="form-row"><div class="form-group"><label>Contact</label><input type="tel" name="contact"></div><div class="form-group"><label>Email</label><input type="email" name="email"></div></div><div class="form-row"><div class="form-group"><label>Address</label><input type="text" name="address"></div><div class="form-group"><label>Credit Limit (UGX)</label><input type="number" name="creditLimit" value="' + CONFIG.DEFAULT_CREDIT_LIMIT + '"></div></div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div></form>';
        UI.modal('Add Customer', html);
        document.getElementById('cust-form').onsubmit = (e) => {
            e.preventDefault();
            const f = e.target;
            DataStore.insert('customers', { name: f.name.value, contact: f.contact.value, email: f.email.value, address: f.address.value, balance: 0, creditLimit: parseFloat(f.creditLimit.value) || CONFIG.DEFAULT_CREDIT_LIMIT });
            UI.closeModal();
            UI.toast('Customer added');
            Customers.render();
        };
    },
    viewStatement: (id) => {
        const cust = DataStore.getById('customers', id);
        if (!cust) return;
        const sales = DataStore.getAll('sales').filter(s => s.customerId === id);
        const payments = DataStore.getAll('payments').filter(p => p.customerId === id);
        let lines = [];
        sales.forEach(s => lines.push({ date: s.date, desc: 'Invoice ' + s.invoiceNo, debit: s.total, credit: 0 }));
        payments.forEach(p => lines.push({ date: p.date, desc: 'Payment ' + (p.reference || p.method), debit: 0, credit: p.amount }));
        lines.sort((a, b) => a.date.localeCompare(b.date));
        let bal = 0;
        let html = '<div class="report-header"><h2>' + Utils.escapeHtml(cust.name) + '</h2><p>Customer Statement</p><p class="report-date">Credit Limit: ' + Utils.currency(cust.creditLimit) + '</p></div>';
        html += '<table class="data-table"><thead><tr><th>Date</th><th>Description</th><th class="text-right">Debit</th><th class="text-right">Credit</th><th class="text-right">Balance</th></tr></thead><tbody>';
        lines.forEach(l => {
            bal += l.debit - l.credit;
            html += '<tr><td>' + Utils.dateDisplay(l.date) + '</td><td>' + Utils.escapeHtml(l.desc) + '</td><td class="text-right text-mono">' + (l.debit > 0 ? Utils.currency(l.debit) : '-') + '</td><td class="text-right text-mono">' + (l.credit > 0 ? Utils.currency(l.credit) : '-') + '</td><td class="text-right text-mono text-bold">' + Utils.currency(bal) + '</td></tr>';
        });
        html += '</tbody><tfoot><tr><td colspan="4" class="text-bold">Current Balance</td><td class="text-right text-mono text-bold">' + Utils.currency(bal) + '</td></tr></tfoot></table>';
        UI.modal(cust.name + ' — Statement', html, true);
    }
};

// ============================================================
// PAYMENTS RECEIVED MODULE
// ============================================================
const PaymentsReceived = {
    render: () => {
        UI.setPageTitle('Payments Received');
        const payments = DataStore.getAll('payments');
        let html = '<div class="flex-between mb-16"><span></span><button class="btn btn-primary" onclick="PaymentsReceived.showRecordPayment()">Record Payment</button></div>';
        html += UI.dateFilterBar('PaymentsReceived.render()');
        let filtered = UI.filterByDate(payments, 'date').sort((a, b) => b.date.localeCompare(a.date));
        html += '<div class="section-card"><div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>Date</th><th>Customer</th><th class="text-right">Amount</th><th>Method</th><th>Account</th><th>Reference</th></tr></thead><tbody>';
        if (filtered.length === 0) {
            html += '<tr><td colspan="6" class="text-center text-muted" style="padding:32px">No payments recorded.</td></tr>';
        } else {
            filtered.forEach(p => {
                html += '<tr><td>' + Utils.dateDisplay(p.date) + '</td><td>' + Utils.escapeHtml(UI.getCustomerName(p.customerId)) + '</td><td class="text-right text-mono text-bold">' + Utils.currency(p.amount) + '</td><td>' + (p.method || '').replace('_', ' ') + '</td><td>' + Utils.escapeHtml(UI.getAccountName(p.accountId)) + '</td><td class="text-mono">' + Utils.escapeHtml(p.reference || '') + '</td></tr>';
            });
        }
        html += '</tbody></table></div></div>';
        UI.render(html);
    },
    showRecordPayment: () => {
        const html = '<form class="modal-form" id="payment-form"><div class="form-row"><div class="form-group"><label>Customer</label><select name="customerId" required>' + UI.customerOptions() + '</select></div><div class="form-group"><label>Amount (UGX)</label><input type="number" name="amount" min="1" required></div></div><div class="form-row"><div class="form-group"><label>Method</label><select name="method"><option value="bank_transfer">Bank Transfer</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="mobile_money">Mobile Money</option></select></div><div class="form-group"><label>Into Account</label><select name="accountId" required>' + UI.cashAccountOptions() + '</select></div></div><div class="form-row"><div class="form-group"><label>Reference</label><input type="text" name="reference" placeholder="TRF-XXX / Cheque #"></div><div class="form-group"><label>Date</label><input type="date" name="date" value="' + Utils.dateStr() + '" required></div></div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Record Payment</button></div></form>';
        UI.modal('Record Payment', html, true);
        document.getElementById('payment-form').onsubmit = (e) => {
            e.preventDefault();
            const f = e.target;
            const amt = parseFloat(f.amount.value);
            DataStore.insert('payments', { customerId: f.customerId.value, amount: amt, method: f.method.value, accountId: f.accountId.value, reference: f.reference.value, date: f.date.value });
            // Update customer balance
            const cust = DataStore.getById('customers', f.customerId.value);
            if (cust) DataStore.update('customers', cust.id, { balance: Math.max(0, (cust.balance || 0) - amt) });
            // Apply to oldest unpaid invoices
            let remaining = amt;
            const sales = DataStore.getAll('sales').filter(s => s.customerId === f.customerId.value && s.paid < s.total).sort((a, b) => a.date.localeCompare(b.date));
            sales.forEach(s => {
                if (remaining <= 0) return;
                const owed = s.total - s.paid;
                const apply = Math.min(remaining, owed);
                DataStore.update('sales', s.id, { paid: s.paid + apply });
                remaining -= apply;
            });
            // Post journal entry: DR Cash/Bank, CR Accounts Receivable
            DataStore.insert('journals', { date: f.date.value, description: 'Payment from ' + UI.getCustomerName(f.customerId.value) + (f.reference.value ? ' #' + f.reference.value : ''), branchId: '', entries: [
                { accountId: f.accountId.value, debit: amt, credit: 0 },
                { accountId: '1100', debit: 0, credit: amt, customerId: f.customerId.value }
            ]});
            UI.closeModal();
            UI.toast('Payment of ' + Utils.currency(amt) + ' recorded');
            PaymentsReceived.render();
        };
    }
};

// ============================================================
// CUSTOMER STATEMENTS MODULE (Full Page)
// ============================================================
const CustomerStatements = {
    render: () => {
        UI.setPageTitle('Customer Statements');
        const customers = DataStore.getAll('customers');

        let html = '<div class="form-group" style="max-width:450px;margin-bottom:16px"><label>Select Customer</label><select id="cust-stmt-select" onchange="CustomerStatements.showStatement(this.value)"><option value="">\u2014 Choose Customer \u2014</option>';
        customers.forEach(c => {
            html += '<option value="' + c.id + '">' + Utils.escapeHtml(c.name) + ' (Balance: ' + Utils.currency(c.balance || 0) + ')</option>';
        });
        html += '</select></div>';
        html += '<div id="cust-stmt-content"></div>';
        UI.render(html);
    },

    showStatement: (customerId) => {
        const container = document.getElementById('cust-stmt-content');
        if (!container || !customerId) { if (container) container.innerHTML = ''; return; }

        const cust = DataStore.getById('customers', customerId);
        if (!cust) return;

        const sales = DataStore.getAll('sales').filter(s => s.customerId === customerId);
        const payments = DataStore.getAll('payments').filter(p => p.customerId === customerId);

        let lines = [];
        sales.forEach(s => {
            let desc = 'Invoice ' + s.invoiceNo;
            const lineDetails = (s.lines || []).map(l => UI.getProductCode(l.productId) + ' x ' + Utils.volume(l.quantity)).join(', ');
            if (lineDetails) desc += ' (' + lineDetails + ')';
            lines.push({ date: s.date, desc: desc, debit: s.total, credit: 0 });
        });
        payments.forEach(p => {
            let desc = 'Payment \u2014 ' + (p.method || '').replace('_', ' ');
            if (p.reference) desc += ' #' + p.reference;
            const acct = DataStore.getById('accounts', p.accountId);
            if (acct) desc += ' into ' + acct.name;
            lines.push({ date: p.date, desc: desc, debit: 0, credit: p.amount });
        });
        lines.sort((a, b) => a.date.localeCompare(b.date));

        let bal = 0, totalDebit = 0, totalCredit = 0;
        const utilPct = cust.creditLimit > 0 ? Utils.pct(cust.balance || 0, cust.creditLimit) : 0;
        const utilColor = utilPct > 80 ? 'text-danger' : utilPct > 50 ? 'text-warning' : 'text-success';

        let html = '<div class="section-card"><div class="report-header"><h2>' + Utils.escapeHtml(cust.name) + '</h2><p>Customer Statement</p>';
        html += '<p class="report-date">Credit Limit: ' + Utils.currency(cust.creditLimit) + ' | Utilization: <span class="' + utilColor + '">' + utilPct + '%</span> | As at ' + Utils.dateDisplay(Utils.dateStr()) + '</p></div>';

        // Customer summary
        html += '<div style="padding:12px 16px;border-bottom:1px solid var(--content-border);font-size:0.85rem;display:flex;gap:24px;flex-wrap:wrap">';
        html += '<div><span class="text-muted">Contact:</span> <strong>' + Utils.escapeHtml(cust.contact || '-') + '</strong></div>';
        html += '<div><span class="text-muted">Email:</span> <strong>' + Utils.escapeHtml(cust.email || '-') + '</strong></div>';
        html += '<div><span class="text-muted">Address:</span> <strong>' + Utils.escapeHtml(cust.address || '-') + '</strong></div>';
        html += '<div><span class="text-muted">Invoices:</span> <strong>' + sales.length + '</strong></div>';
        html += '</div>';

        html += '<div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>Date</th><th>Description</th><th class="text-right">Debit (Charges)</th><th class="text-right">Credit (Payments)</th><th class="text-right">Running Balance</th></tr></thead><tbody>';
        if (lines.length === 0) {
            html += '<tr><td colspan="5" class="text-center text-muted" style="padding:32px">No transactions found for this customer.</td></tr>';
        } else {
            lines.forEach(l => {
                bal += l.debit - l.credit;
                totalDebit += l.debit;
                totalCredit += l.credit;
                html += '<tr><td>' + Utils.dateDisplay(l.date) + '</td><td>' + Utils.escapeHtml(l.desc) + '</td>';
                html += '<td class="text-right text-mono">' + (l.debit > 0 ? Utils.currency(l.debit) : '-') + '</td>';
                html += '<td class="text-right text-mono">' + (l.credit > 0 ? Utils.currency(l.credit) : '-') + '</td>';
                html += '<td class="text-right text-mono text-bold">' + Utils.currency(bal) + '</td></tr>';
            });
        }
        html += '</tbody><tfoot>';
        html += '<tr><td colspan="2" class="text-bold">Totals</td><td class="text-right text-mono text-bold">' + Utils.currency(totalDebit) + '</td><td class="text-right text-mono text-bold">' + Utils.currency(totalCredit) + '</td><td class="text-right text-mono text-bold" style="border-top:2px solid var(--content-border)">' + Utils.currency(bal) + '</td></tr>';
        html += '</tfoot></table></div></div>';
        container.innerHTML = html;
    }
};

// ============================================================
// ACCOUNTING MODULE (Chart of Accounts + Journals)
// ============================================================
const Accounting = {
    currentView: 'accounts',
    render: () => {
        UI.setPageTitle('Accounting');
        let html = '<div class="filter-tabs mb-16">';
        html += '<button class="filter-tab' + (Accounting.currentView === 'accounts' ? ' active' : '') + '" onclick="Accounting.currentView=\'accounts\';Accounting.render()">Chart of Accounts</button>';
        html += '<button class="filter-tab' + (Accounting.currentView === 'journals' ? ' active' : '') + '" onclick="Accounting.currentView=\'journals\';Accounting.render()">Journal Entries</button>';
        html += '</div>';
        if (Accounting.currentView === 'journals') {
            html += Accounting._renderJournals();
        } else {
            html += Accounting._renderAccounts();
        }
        UI.render(html);
    },
    _renderAccounts: () => {
        const accounts = DataStore.getAll('accounts');
        const types = ['asset', 'liability', 'equity', 'revenue', 'expense'];
        const typeLabels = { asset: 'Assets', liability: 'Liabilities', equity: 'Equity', revenue: 'Revenue', expense: 'Expenses' };
        let html = '<div class="flex-between mb-16"><span></span><button class="btn btn-primary" onclick="Accounting.showAddAccount()">Add Account</button></div>';
        types.forEach(type => {
            const accts = accounts.filter(a => a.type === type);
            if (accts.length === 0) return;
            let typeTotal = 0;
            html += '<div class="section-card" style="margin-bottom:16px"><div class="section-card-header"><span class="section-card-title">' + typeLabels[type] + '</span></div>';
            html += '<div class="section-card-body no-padding"><table class="data-table"><thead><tr><th style="width:10%">Code</th><th>Account Name</th><th style="width:15%">Category</th><th style="width:10%">Currency</th><th style="width:15%" class="text-right">Balance</th></tr></thead><tbody>';
            accts.forEach(a => {
                typeTotal += a.balance || 0;
                html += '<tr class="clickable-row" onclick="Accounting.viewLedger(\'' + a.id + '\')"><td class="text-mono text-bold">' + a.code + '</td><td>' + Utils.escapeHtml(a.name) + (a.isCashAccount ? ' <span class="badge badge-info">Cash</span>' : '') + '</td><td>' + (a.category || '').replace('_', ' ') + '</td><td>' + (a.currency || 'UGX') + '</td><td class="text-right text-mono text-bold">' + Utils.currency(a.balance || 0, a.currency) + '</td></tr>';
            });
            html += '</tbody><tfoot><tr><td colspan="4" class="text-bold">Total ' + typeLabels[type] + '</td><td class="text-right text-mono text-bold">' + Utils.currency(typeTotal) + '</td></tr></tfoot></table></div></div>';
        });
        return html;
    },
    _renderJournals: () => {
        const journals = DataStore.getAll('journals');
        let html = '<div class="flex-between mb-16"><span></span><button class="btn btn-primary" onclick="Accounting.showAddJournal()">New Journal Entry</button></div>';
        html += UI.dateFilterBar('Accounting.render()');
        let filtered = UI.filterByDate(journals, 'date').sort((a, b) => b.date.localeCompare(a.date));
        html += '<div class="section-card"><div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>Date</th><th>Description</th><th>Branch</th><th class="text-right">Total Debit</th><th class="text-right">Total Credit</th><th>Status</th></tr></thead><tbody>';
        if (filtered.length === 0) {
            html += '<tr><td colspan="6" class="text-center text-muted" style="padding:32px">No journal entries.</td></tr>';
        } else {
            filtered.forEach(j => {
                const totalDr = (j.entries || []).reduce((s, e) => s + (e.debit || 0), 0);
                const totalCr = (j.entries || []).reduce((s, e) => s + (e.credit || 0), 0);
                const balanced = Math.abs(totalDr - totalCr) < 1;
                html += '<tr class="clickable-row" onclick="Accounting.viewJournal(\'' + j.id + '\')"><td>' + Utils.dateDisplay(j.date) + '</td><td>' + Utils.escapeHtml(j.description || '') + '</td><td>' + Utils.escapeHtml(UI.getBranchName(j.branchId)) + '</td><td class="text-right text-mono">' + Utils.currency(totalDr) + '</td><td class="text-right text-mono">' + Utils.currency(totalCr) + '</td><td>' + (balanced ? '<span class="badge badge-success">Balanced</span>' : '<span class="badge badge-danger">Unbalanced</span>') + '</td></tr>';
            });
        }
        html += '</tbody></table></div></div>';
        return html;
    },
    showAddAccount: () => {
        const html = '<form class="modal-form" id="acct-form"><div class="form-row"><div class="form-group"><label>Code</label><input type="text" name="code" required placeholder="e.g. 1300"></div><div class="form-group"><label>Name</label><input type="text" name="name" required></div></div><div class="form-row"><div class="form-group"><label>Type</label><select name="type" required><option value="asset">Asset</option><option value="liability">Liability</option><option value="equity">Equity</option><option value="revenue">Revenue</option><option value="expense">Expense</option></select></div><div class="form-group"><label>Category</label><input type="text" name="category" placeholder="e.g. current_asset"></div></div><div class="form-row"><div class="form-group"><label>Currency</label><select name="currency"><option value="UGX">UGX</option><option value="USD">USD</option></select></div><div class="form-group"><label>Opening Balance</label><input type="number" name="balance" value="0"></div></div><div class="form-group"><label><input type="checkbox" name="isCashAccount" style="width:auto;margin-right:6px">Cash/Bank Account</label></div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create Account</button></div></form>';
        UI.modal('Add GL Account', html);
        document.getElementById('acct-form').onsubmit = (e) => {
            e.preventDefault();
            const f = e.target;
            DataStore.insert('accounts', { code: f.code.value, name: f.name.value, type: f.type.value, category: f.category.value, balance: parseFloat(f.balance.value) || 0, isCashAccount: f.isCashAccount.checked, currency: f.currency.value });
            UI.closeModal();
            UI.toast('Account created');
            Accounting.render();
        };
    },
    showAddJournal: () => {
        const html = '<form class="modal-form" id="journal-form"><div class="form-row"><div class="form-group"><label>Date</label><input type="date" name="date" value="' + Utils.dateStr() + '" required></div><div class="form-group"><label>Branch</label><select name="branchId">' + UI.branchOptions() + '</select></div></div><div class="form-group"><label>Description</label><input type="text" name="description" required placeholder="Transaction description"></div><div id="journal-lines"><table class="journal-lines-table"><thead><tr><th>Account</th><th style="width:120px">Debit</th><th style="width:120px">Credit</th><th style="width:40px"></th></tr></thead><tbody><tr><td><select name="acct_0">' + UI.accountOptions() + '</select></td><td><input type="number" name="dr_0" value="0" min="0"></td><td><input type="number" name="cr_0" value="0" min="0"></td><td></td></tr><tr><td><select name="acct_1">' + UI.accountOptions() + '</select></td><td><input type="number" name="dr_1" value="0" min="0"></td><td><input type="number" name="cr_1" value="0" min="0"></td><td></td></tr></tbody></table></div><div id="journal-balance" class="balance-indicator balanced" style="margin-top:12px">Balanced</div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Post Journal</button></div></form>';
        UI.modal('New Journal Entry', html, true);
        document.getElementById('journal-form').onsubmit = (e) => {
            e.preventDefault();
            const f = e.target;
            const entries = [];
            for (let i = 0; i < 10; i++) {
                const acct = f['acct_' + i];
                const dr = f['dr_' + i];
                const cr = f['cr_' + i];
                if (!acct) break;
                const drVal = parseFloat(dr.value) || 0;
                const crVal = parseFloat(cr.value) || 0;
                if (drVal > 0 || crVal > 0) entries.push({ accountId: acct.value, debit: drVal, credit: crVal });
            }
            if (entries.length < 2) { UI.toast('Need at least 2 lines', 'error'); return; }
            const totalDr = entries.reduce((s, e) => s + e.debit, 0);
            const totalCr = entries.reduce((s, e) => s + e.credit, 0);
            if (Math.abs(totalDr - totalCr) > 1) { UI.toast('Journal is not balanced!', 'error'); return; }
            DataStore.insert('journals', { date: f.date.value, description: f.description.value, branchId: f.branchId.value, entries: entries });
            UI.closeModal();
            UI.toast('Journal entry posted');
            Accounting.render();
        };
    },
    viewJournal: (id) => {
        const j = DataStore.getById('journals', id);
        if (!j) return;
        let html = '<div style="margin-bottom:12px"><strong>Date:</strong> ' + Utils.dateDisplay(j.date) + ' | <strong>Branch:</strong> ' + Utils.escapeHtml(UI.getBranchName(j.branchId)) + '</div>';
        html += '<p style="margin-bottom:12px;color:var(--text-secondary)">' + Utils.escapeHtml(j.description || '') + '</p>';
        html += '<table class="data-table"><thead><tr><th>Account</th><th class="text-right">Debit</th><th class="text-right">Credit</th></tr></thead><tbody>';
        let totalDr = 0, totalCr = 0;
        (j.entries || []).forEach(e => {
            totalDr += e.debit || 0;
            totalCr += e.credit || 0;
            html += '<tr><td>' + Utils.escapeHtml(UI.getAccountName(e.accountId)) + '</td><td class="text-right text-mono">' + (e.debit > 0 ? Utils.currency(e.debit) : '-') + '</td><td class="text-right text-mono">' + (e.credit > 0 ? Utils.currency(e.credit) : '-') + '</td></tr>';
        });
        html += '</tbody><tfoot><tr><td class="text-bold">Total</td><td class="text-right text-mono text-bold">' + Utils.currency(totalDr) + '</td><td class="text-right text-mono text-bold">' + Utils.currency(totalCr) + '</td></tr></tfoot></table>';
        UI.modal('Journal Entry', html, true);
    },
    viewLedger: (accountId) => {
        const acct = DataStore.getById('accounts', accountId);
        if (!acct) return;
        const journals = DataStore.getAll('journals');
        let lines = [];
        journals.forEach(j => {
            (j.entries || []).forEach(e => {
                if (e.accountId === accountId) {
                    lines.push({ date: j.date, description: j.description, debit: e.debit || 0, credit: e.credit || 0 });
                }
            });
        });
        lines.sort((a, b) => a.date.localeCompare(b.date));
        let bal = 0;
        let html = '<div class="report-header"><h2>' + acct.code + ' — ' + Utils.escapeHtml(acct.name) + '</h2><p>Account Ledger</p></div>';
        html += '<table class="data-table"><thead><tr><th>Date</th><th>Description</th><th class="text-right">Debit</th><th class="text-right">Credit</th><th class="text-right">Balance</th></tr></thead><tbody>';
        lines.forEach(l => {
            bal += l.debit - l.credit;
            html += '<tr><td>' + Utils.dateDisplay(l.date) + '</td><td>' + Utils.escapeHtml(l.description || '') + '</td><td class="text-right text-mono">' + (l.debit > 0 ? Utils.currency(l.debit) : '-') + '</td><td class="text-right text-mono">' + (l.credit > 0 ? Utils.currency(l.credit) : '-') + '</td><td class="text-right text-mono text-bold">' + Utils.currency(bal) + '</td></tr>';
        });
        html += '</tbody></table>';
        UI.modal(acct.name + ' Ledger', html, true);
    }
};

// ============================================================
// FINANCIAL REPORTS MODULE
// ============================================================
const FinancialReports = {
    render: () => {
        UI.setPageTitle('Financial Reports');
        let html = '<div class="filter-tabs mb-16">';
        html += '<button class="filter-tab" onclick="Reports.showProfitLoss()">Profit & Loss</button>';
        html += '<button class="filter-tab active" onclick="FinancialReports.showBS()">Balance Sheet</button>';
        html += '<button class="filter-tab" onclick="FinancialReports.showTB()">Trial Balance</button>';
        html += '</div>';
        html += '<div id="financial-report-content"></div>';
        UI.render(html);
        FinancialReports.showBS();
    },
    showPL: () => {
        const accounts = DataStore.getAll('accounts');
        const revenue = accounts.filter(a => a.type === 'revenue');
        const expenses = accounts.filter(a => a.type === 'expense');
        const cogs = expenses.filter(a => a.category === 'cogs');
        const opex = expenses.filter(a => a.category !== 'cogs');
        let totalRevenue = 0, totalCOGS = 0, totalOpex = 0;
        revenue.forEach(a => totalRevenue += a.balance || 0);
        cogs.forEach(a => totalCOGS += a.balance || 0);
        opex.forEach(a => totalOpex += a.balance || 0);
        const grossProfit = totalRevenue - totalCOGS;
        const netIncome = grossProfit - totalOpex;

        let html = '<div class="section-card"><div class="report-header"><h2>AWDEER ENERGY LIMITED</h2><p>Profit & Loss Statement</p><p class="report-date">As at ' + Utils.dateDisplay(Utils.dateStr()) + '</p></div>';
        html += '<div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>Account</th><th class="text-right">Amount (UGX)</th></tr></thead><tbody>';
        html += '<tr class="report-section-title"><td colspan="2" class="text-bold" style="background:var(--content-bg);padding:12px 16px">REVENUE</td></tr>';
        revenue.forEach(a => { html += '<tr><td style="padding-left:32px">' + a.code + ' — ' + Utils.escapeHtml(a.name) + '</td><td class="text-right text-mono">' + Utils.currency(a.balance || 0) + '</td></tr>'; });
        html += '<tr class="report-subtotal-row"><td class="text-bold" style="padding-left:16px">Total Revenue</td><td class="text-right text-mono text-bold" style="border-top:1px solid var(--content-border)">' + Utils.currency(totalRevenue) + '</td></tr>';
        html += '<tr class="report-section-title"><td colspan="2" class="text-bold" style="background:var(--content-bg);padding:12px 16px">COST OF GOODS SOLD</td></tr>';
        cogs.forEach(a => { html += '<tr><td style="padding-left:32px">' + a.code + ' — ' + Utils.escapeHtml(a.name) + '</td><td class="text-right text-mono">' + Utils.currency(a.balance || 0) + '</td></tr>'; });
        html += '<tr class="report-subtotal-row"><td class="text-bold" style="padding-left:16px">Total COGS</td><td class="text-right text-mono text-bold" style="border-top:1px solid var(--content-border)">' + Utils.currency(totalCOGS) + '</td></tr>';
        html += '<tr class="report-total-row"><td class="text-bold" style="padding-left:16px;background:var(--success-bg)">GROSS PROFIT</td><td class="text-right text-mono text-bold" style="background:var(--success-bg);border-top:2px solid var(--content-border)">' + Utils.currency(grossProfit) + '</td></tr>';
        html += '<tr class="report-section-title"><td colspan="2" class="text-bold" style="background:var(--content-bg);padding:12px 16px">OPERATING EXPENSES</td></tr>';
        opex.forEach(a => { html += '<tr><td style="padding-left:32px">' + a.code + ' — ' + Utils.escapeHtml(a.name) + '</td><td class="text-right text-mono">' + Utils.currency(a.balance || 0) + '</td></tr>'; });
        html += '<tr class="report-subtotal-row"><td class="text-bold" style="padding-left:16px">Total Operating Expenses</td><td class="text-right text-mono text-bold" style="border-top:1px solid var(--content-border)">' + Utils.currency(totalOpex) + '</td></tr>';
        const netClass = netIncome >= 0 ? 'text-success' : 'text-danger';
        html += '<tr class="report-total-row"><td class="text-bold" style="padding:14px 16px;font-size:1.05em">NET INCOME</td><td class="text-right text-mono text-bold ' + netClass + '" style="padding:14px 16px;font-size:1.05em;border-top:3px double var(--text-primary)">' + Utils.currency(netIncome) + '</td></tr>';
        html += '</tbody></table></div></div>';
        const el = document.getElementById('financial-report-content');
        if (el) el.innerHTML = html;
    },
    showBS: () => {
        const accounts = DataStore.getAll('accounts');
        const assets = accounts.filter(a => a.type === 'asset');
        const liabilities = accounts.filter(a => a.type === 'liability');
        const equity = accounts.filter(a => a.type === 'equity');
        let totalAssets = 0, totalLiab = 0, totalEquity = 0;
        assets.forEach(a => totalAssets += a.balance || 0);
        liabilities.forEach(a => totalLiab += a.balance || 0);
        equity.forEach(a => totalEquity += a.balance || 0);

        let html = '<div class="section-card"><div class="report-header"><h2>AWDEER ENERGY LIMITED</h2><p>Balance Sheet</p><p class="report-date">As at ' + Utils.dateDisplay(Utils.dateStr()) + '</p></div>';
        html += '<div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>Account</th><th class="text-right">Amount (UGX)</th></tr></thead><tbody>';
        html += '<tr class="report-section-title"><td colspan="2" class="text-bold" style="background:var(--content-bg);padding:12px 16px">ASSETS</td></tr>';
        assets.forEach(a => { html += '<tr><td style="padding-left:32px">' + a.code + ' — ' + Utils.escapeHtml(a.name) + '</td><td class="text-right text-mono">' + Utils.currency(a.balance || 0) + '</td></tr>'; });
        html += '<tr class="report-subtotal-row"><td class="text-bold">Total Assets</td><td class="text-right text-mono text-bold" style="border-top:2px solid var(--content-border)">' + Utils.currency(totalAssets) + '</td></tr>';
        html += '<tr class="report-section-title"><td colspan="2" class="text-bold" style="background:var(--content-bg);padding:12px 16px">LIABILITIES</td></tr>';
        liabilities.forEach(a => { html += '<tr><td style="padding-left:32px">' + a.code + ' — ' + Utils.escapeHtml(a.name) + '</td><td class="text-right text-mono">' + Utils.currency(a.balance || 0) + '</td></tr>'; });
        html += '<tr class="report-subtotal-row"><td class="text-bold">Total Liabilities</td><td class="text-right text-mono text-bold" style="border-top:1px solid var(--content-border)">' + Utils.currency(totalLiab) + '</td></tr>';
        html += '<tr class="report-section-title"><td colspan="2" class="text-bold" style="background:var(--content-bg);padding:12px 16px">EQUITY</td></tr>';
        equity.forEach(a => { html += '<tr><td style="padding-left:32px">' + a.code + ' — ' + Utils.escapeHtml(a.name) + '</td><td class="text-right text-mono">' + Utils.currency(a.balance || 0) + '</td></tr>'; });
        html += '<tr class="report-subtotal-row"><td class="text-bold">Total Equity</td><td class="text-right text-mono text-bold" style="border-top:1px solid var(--content-border)">' + Utils.currency(totalEquity) + '</td></tr>';
        html += '<tr class="report-total-row"><td class="text-bold" style="padding:14px 16px;font-size:1.05em">TOTAL LIABILITIES + EQUITY</td><td class="text-right text-mono text-bold" style="padding:14px 16px;font-size:1.05em;border-top:3px double var(--text-primary)">' + Utils.currency(totalLiab + totalEquity) + '</td></tr>';
        html += '</tbody></table></div></div>';
        const el = document.getElementById('financial-report-content');
        if (el) el.innerHTML = html;
    },
    showTB: () => {
        const accounts = DataStore.getAll('accounts');
        let totalDr = 0, totalCr = 0;
        let html = '<div class="section-card"><div class="report-header"><h2>AWDEER ENERGY LIMITED</h2><p>Trial Balance</p><p class="report-date">As at ' + Utils.dateDisplay(Utils.dateStr()) + '</p></div>';
        html += '<div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>Code</th><th>Account</th><th class="text-right">Debit</th><th class="text-right">Credit</th></tr></thead><tbody>';
        accounts.forEach(a => {
            const bal = a.balance || 0;
            const isDebit = (a.type === 'asset' || a.type === 'expense');
            const dr = isDebit ? bal : 0;
            const cr = isDebit ? 0 : bal;
            totalDr += dr;
            totalCr += cr;
            html += '<tr><td class="text-mono">' + a.code + '</td><td>' + Utils.escapeHtml(a.name) + '</td><td class="text-right text-mono">' + (dr > 0 ? Utils.currency(dr) : '-') + '</td><td class="text-right text-mono">' + (cr > 0 ? Utils.currency(cr) : '-') + '</td></tr>';
        });
        html += '</tbody><tfoot><tr><td colspan="2" class="text-bold">Totals</td><td class="text-right text-mono text-bold">' + Utils.currency(totalDr) + '</td><td class="text-right text-mono text-bold">' + Utils.currency(totalCr) + '</td></tr></tfoot></table></div></div>';
        const el = document.getElementById('financial-report-content');
        if (el) el.innerHTML = html;
    }
};

// ============================================================
// EXCHANGE RATES MODULE
// ============================================================
const ExchangeRates = {
    render: () => {
        UI.setPageTitle('Exchange Rates');
        const rates = DataStore.getAll('exchange_rates').sort((a, b) => b.date.localeCompare(a.date));
        let html = '<div class="flex-between mb-16"><span class="text-muted">USD/UGX exchange rates</span><button class="btn btn-primary" onclick="ExchangeRates.showAdd()">Add Rate</button></div>';
        html += '<div class="section-card"><div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>Date</th><th class="text-right">Rate (UGX per 1 USD)</th><th>Change</th></tr></thead><tbody>';
        rates.forEach((r, i) => {
            const prev = rates[i + 1];
            const change = prev ? r.rate - prev.rate : 0;
            const changeBadge = change > 0 ? '<span class="text-danger">+' + change + '</span>' : change < 0 ? '<span class="text-success">' + change + '</span>' : '<span class="text-muted">—</span>';
            html += '<tr><td>' + Utils.dateDisplay(r.date) + '</td><td class="text-right text-mono text-bold">' + Utils.num(r.rate) + '</td><td>' + changeBadge + '</td></tr>';
        });
        html += '</tbody></table></div></div>';
        UI.render(html);
    },
    showAdd: () => {
        const html = '<form class="modal-form" id="rate-form"><div class="form-row"><div class="form-group"><label>Date</label><input type="date" name="date" value="' + Utils.dateStr() + '" required></div><div class="form-group"><label>Rate (UGX per 1 USD)</label><input type="number" name="rate" min="1" step="1" value="' + Utils.getExchangeRate() + '" required></div></div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Save Rate</button></div></form>';
        UI.modal('Add Exchange Rate', html);
        document.getElementById('rate-form').onsubmit = (e) => {
            e.preventDefault();
            const f = e.target;
            DataStore.insert('exchange_rates', { date: f.date.value, rate: parseFloat(f.rate.value) });
            UI.closeModal();
            UI.toast('Exchange rate saved');
            ExchangeRates.render();
        };
    }
};

// ============================================================
// REPORTS HUB MODULE
// ============================================================
const Reports = {
    render: () => {
        UI.setPageTitle('Reports');
        let html = '<div class="reports-grid">';
        const reports = [
            { title: 'Profit & Loss', desc: 'Detailed P&L from actual transactions', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>', action: 'Reports.showProfitLoss()' },
            { title: 'Balance Sheet', desc: 'Assets, liabilities, and equity', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>', action: 'FinancialReports.render()' },
            { title: 'Customer Aging', desc: 'Outstanding balances by age', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', action: 'Reports.showAgingReport()' },
            { title: 'Daily Sales', desc: 'Sales by day summary', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', action: 'Reports.showDailySales()' },
            { title: 'Supplier Balances', desc: 'AP outstanding per supplier', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>', action: 'Suppliers.render()' },
            { title: 'Stock Valuation', desc: 'Inventory value by warehouse', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>', action: 'Router.navigate("stock_overview")' }
        ];
        reports.forEach(r => {
            html += '<div class="report-link" onclick="' + r.action + '">' + r.icon + '<div class="report-link-text"><span class="report-link-title">' + r.title + '</span><span class="report-link-desc">' + r.desc + '</span></div></div>';
        });
        html += '</div>';
        UI.render(html);
    },
    // ============================================================
    // COMPREHENSIVE PROFIT & LOSS REPORT
    // Sources data from: sales, goods_issues, landed_costs, accounts, journals
    // ============================================================
    showProfitLoss: () => {
        UI.setPageTitle('Reports', 'Profit & Loss');
        const products = DataStore.getAll('products');
        const branches = DataStore.getAll('branches');

        // ---- Gather all transaction data ----
        let sales = DataStore.getAll('sales');
        let goodsIssues = DataStore.getAll('goods_issues');
        let landedCosts = DataStore.getAll('landed_costs');
        const grns = DataStore.getAll('grn');
        const accounts = DataStore.getAll('accounts');
        const apInvoices = DataStore.getAll('ap_invoices');
        const journals = DataStore.getAll('journals');

        // ---- Apply date filters ----
        sales = UI.filterByDate(sales, 'date');
        goodsIssues = UI.filterByDate(goodsIssues, 'date');
        landedCosts = UI.filterByDate(landedCosts, 'date');

        // ---- Apply branch filter ----
        if (State.filterBranch) {
            sales = sales.filter(s => s.branchId === State.filterBranch);
            goodsIssues = goodsIssues.filter(g => g.branchId === State.filterBranch);
            const branchGrnIds = grns.filter(g => g.branchId === State.filterBranch).map(g => g.id);
            landedCosts = landedCosts.filter(lc => branchGrnIds.includes(lc.grnId));
        }

        // ===============================
        // 1. REVENUE — from actual Sales Invoices
        // ===============================
        const revenueByProduct = {};
        let totalSalesQty = 0;
        products.forEach(p => { revenueByProduct[p.id] = { name: p.name, code: p.code, amount: 0, qty: 0, invoices: 0 }; });
        sales.forEach(s => {
            (s.lines || []).forEach(line => {
                if (revenueByProduct[line.productId]) {
                    revenueByProduct[line.productId].amount += line.lineTotal || 0;
                    revenueByProduct[line.productId].qty += line.quantity || 0;
                    totalSalesQty += line.quantity || 0;
                }
            });
            // count invoices per product (use first line's product)
            if (s.lines && s.lines.length > 0 && revenueByProduct[s.lines[0].productId]) {
                revenueByProduct[s.lines[0].productId].invoices++;
            }
        });

        // Other Income — from GL account 4100
        const otherIncomeAcct = accounts.find(a => a.id === '4100');
        const otherIncome = otherIncomeAcct ? (otherIncomeAcct.balance || 0) : 0;
        let totalRevenue = otherIncome;
        Object.values(revenueByProduct).forEach(r => totalRevenue += r.amount);

        // ===============================
        // 2. COST OF GOODS SOLD — from actual Goods Issues (reason=sale)
        // ===============================
        const cogsByProduct = {};
        products.forEach(p => { cogsByProduct[p.id] = { name: p.name, code: p.code, amount: 0, qty: 0 }; });
        goodsIssues.filter(g => g.reason === 'sale' && g.status !== 'reversed').forEach(g => {
            const cost = (g.quantity || 0) * (g.costPerL || 0);
            if (cogsByProduct[g.productId]) {
                cogsByProduct[g.productId].amount += cost;
                cogsByProduct[g.productId].qty += g.quantity || 0;
            }
        });
        let totalCOGS = 0;
        Object.values(cogsByProduct).forEach(c => totalCOGS += c.amount);

        const grossProfit = totalRevenue - totalCOGS;
        const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0';

        // ===============================
        // 3. DIRECT COSTS — from Landed Costs (freight, insurance, customs, handling)
        // ===============================
        const directCostTypes = {
            freight: { label: 'Freight & Transport', amount: 0, count: 0 },
            insurance: { label: 'Insurance', amount: 0, count: 0 },
            customs: { label: 'Customs & Duties', amount: 0, count: 0 },
            handling: { label: 'Handling & Storage', amount: 0, count: 0 }
        };
        landedCosts.forEach(lc => {
            const amt = lc.amountUGX || lc.amount || 0;
            const key = lc.costType || 'freight';
            if (directCostTypes[key]) {
                directCostTypes[key].amount += amt;
                directCostTypes[key].count++;
            } else {
                // Unknown cost type goes to freight bucket
                directCostTypes.freight.amount += amt;
                directCostTypes.freight.count++;
            }
        });
        let totalDirectCosts = 0;
        Object.values(directCostTypes).forEach(d => totalDirectCosts += d.amount);

        const grossProfitAfterDirect = grossProfit - totalDirectCosts;

        // ===============================
        // 4. OPERATING EXPENSES — from GL accounts + internal-use goods issues
        // ===============================
        // Get operating expense accounts (exclude COGS since we already computed that from transactions)
        // Also exclude accounts that overlap with landed costs (5100-5400)
        const landedCostAccountIds = ['5100', '5200', '5300', '5400'];
        const cogsAccountIds = ['5000', '5010'];
        const opexAccounts = accounts.filter(a =>
            a.type === 'expense' &&
            !cogsAccountIds.includes(a.id) &&
            !landedCostAccountIds.includes(a.id)
        );
        let totalOpex = 0;
        opexAccounts.forEach(a => totalOpex += a.balance || 0);

        // Internal use / wastage from goods issues (non-sale reasons)
        let internalUseCost = 0;
        const internalIssues = goodsIssues.filter(g => g.reason !== 'sale' && g.status !== 'reversed');
        internalIssues.forEach(g => {
            internalUseCost += (g.quantity || 0) * (g.costPerL || 0);
        });

        const totalOperatingExpenses = totalOpex + internalUseCost;

        // ===============================
        // 5. NET INCOME
        // ===============================
        const totalExpenses = totalCOGS + totalDirectCosts + totalOperatingExpenses;
        const netIncome = totalRevenue - totalExpenses;
        const netMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : '0.0';

        // ===============================
        // BUILD THE REPORT HTML
        // ===============================
        let html = '';

        // --- Filters ---
        html += '<div class="flex-between mb-16" style="flex-wrap:wrap;gap:8px">';
        html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
        html += UI.branchFilter('Reports.showProfitLoss()');
        html += '</div>';
        html += '<div style="display:flex;gap:8px">';
        html += '<button class="btn btn-sm btn-secondary" onclick="Reports._exportPLCsv()">Export CSV</button>';
        html += '<button class="btn btn-sm btn-secondary" onclick="GlobalActions.printReport()">Print</button>';
        html += '<button class="btn btn-sm btn-ghost" onclick="Reports.render()">Back to Reports</button>';
        html += '</div></div>';
        html += UI.dateFilterBar('Reports.showProfitLoss()');

        // --- Summary Cards ---
        html += '<div class="pl-summary-cards">';
        html += '<div class="pl-summary-card pl-card-revenue"><div class="pl-card-label">Total Revenue</div><div class="pl-card-value">' + Utils.currency(totalRevenue) + '</div><div class="pl-card-sub">' + sales.length + ' invoices &bull; ' + Utils.num(totalSalesQty) + ' L sold</div></div>';
        html += '<div class="pl-summary-card pl-card-gross"><div class="pl-card-label">Gross Profit</div><div class="pl-card-value">' + Utils.currency(grossProfit) + '</div><div class="pl-card-sub">' + grossMargin + '% margin</div></div>';
        html += '<div class="pl-summary-card pl-card-expense"><div class="pl-card-label">Total Expenses</div><div class="pl-card-value">' + Utils.currency(totalExpenses) + '</div><div class="pl-card-sub">COGS + Direct + Operating</div></div>';
        const netClass = netIncome >= 0 ? 'pl-card-profit' : 'pl-card-loss';
        html += '<div class="pl-summary-card ' + netClass + '"><div class="pl-card-label">Net Income</div><div class="pl-card-value">' + Utils.currency(netIncome) + '</div><div class="pl-card-sub">' + netMargin + '% net margin</div></div>';
        html += '</div>';

        // --- P&L Statement Table ---
        html += '<div class="section-card">';
        html += '<div class="report-header"><h2>AWDEER ENERGY LIMITED</h2><p>Profit & Loss Statement</p>';
        // Show date range if filtered
        if (State.dateFrom || State.dateTo) {
            const fromStr = State.dateFrom ? Utils.dateDisplay(State.dateFrom) : 'Start';
            const toStr = State.dateTo ? Utils.dateDisplay(State.dateTo) : 'Present';
            html += '<p class="report-date">Period: ' + fromStr + ' to ' + toStr + '</p>';
        } else {
            html += '<p class="report-date">As at ' + Utils.dateDisplay(Utils.dateStr()) + '</p>';
        }
        if (State.filterBranch) {
            const branchName = branches.find(b => b.id === State.filterBranch);
            html += '<p class="report-date">Branch: ' + (branchName ? Utils.escapeHtml(branchName.name) : 'All') + '</p>';
        }
        html += '</div>';
        html += '<div class="section-card-body no-padding"><table class="data-table pl-table"><thead><tr><th>Description</th><th class="text-right">Quantity (L)</th><th class="text-right">Amount (UGX)</th></tr></thead><tbody>';

        // --- REVENUE SECTION ---
        html += '<tr class="pl-section-header"><td colspan="3">REVENUE</td></tr>';
        products.forEach(p => {
            const rev = revenueByProduct[p.id];
            if (rev && rev.amount > 0) {
                html += '<tr class="pl-line-item"><td style="padding-left:32px">Sales Revenue — ' + Utils.escapeHtml(rev.code) + ' (' + rev.invoices + ' invoices)</td><td class="text-right text-mono">' + Utils.num(rev.qty) + '</td><td class="text-right text-mono">' + Utils.currency(rev.amount) + '</td></tr>';
            }
        });
        if (otherIncome > 0) {
            html += '<tr class="pl-line-item"><td style="padding-left:32px">Other Income</td><td class="text-right text-mono">—</td><td class="text-right text-mono">' + Utils.currency(otherIncome) + '</td></tr>';
        }
        html += '<tr class="pl-subtotal"><td>Total Revenue</td><td></td><td class="text-right text-mono">' + Utils.currency(totalRevenue) + '</td></tr>';

        // --- COGS SECTION ---
        html += '<tr class="pl-section-header"><td colspan="3">COST OF GOODS SOLD</td></tr>';
        products.forEach(p => {
            const cog = cogsByProduct[p.id];
            if (cog && cog.amount > 0) {
                const avgCost = cog.qty > 0 ? Math.round(cog.amount / cog.qty) : 0;
                html += '<tr class="pl-line-item"><td style="padding-left:32px">COGS — ' + Utils.escapeHtml(cog.code) + ' (avg ' + Utils.currency(avgCost) + '/L)</td><td class="text-right text-mono">' + Utils.num(cog.qty) + '</td><td class="text-right text-mono">(' + Utils.currency(cog.amount) + ')</td></tr>';
            }
        });
        html += '<tr class="pl-subtotal"><td>Total COGS</td><td></td><td class="text-right text-mono">(' + Utils.currency(totalCOGS) + ')</td></tr>';

        // --- GROSS PROFIT ---
        const gpClass = grossProfit >= 0 ? 'pl-total-positive' : 'pl-total-negative';
        html += '<tr class="pl-gross-profit ' + gpClass + '"><td>GROSS PROFIT</td><td class="text-right text-mono">' + grossMargin + '%</td><td class="text-right text-mono">' + Utils.currency(grossProfit) + '</td></tr>';

        // --- DIRECT COSTS SECTION ---
        html += '<tr class="pl-section-header"><td colspan="3">DIRECT COSTS (LANDED / PROCUREMENT)</td></tr>';
        Object.keys(directCostTypes).forEach(key => {
            const dc = directCostTypes[key];
            if (dc.amount > 0) {
                html += '<tr class="pl-line-item"><td style="padding-left:32px">' + Utils.escapeHtml(dc.label) + ' (' + dc.count + ' entries)</td><td class="text-right text-mono">—</td><td class="text-right text-mono">(' + Utils.currency(dc.amount) + ')</td></tr>';
            }
        });
        if (totalDirectCosts === 0) {
            html += '<tr class="pl-line-item"><td style="padding-left:32px;color:var(--text-muted)">No direct costs recorded</td><td></td><td class="text-right text-mono">—</td></tr>';
        }
        html += '<tr class="pl-subtotal"><td>Total Direct Costs</td><td></td><td class="text-right text-mono">(' + Utils.currency(totalDirectCosts) + ')</td></tr>';

        // --- GROSS PROFIT AFTER DIRECT COSTS ---
        const gpadcClass = grossProfitAfterDirect >= 0 ? 'pl-total-positive' : 'pl-total-negative';
        html += '<tr class="pl-gross-profit ' + gpadcClass + '"><td>GROSS PROFIT AFTER DIRECT COSTS</td><td></td><td class="text-right text-mono">' + Utils.currency(grossProfitAfterDirect) + '</td></tr>';

        // --- OPERATING EXPENSES SECTION ---
        html += '<tr class="pl-section-header"><td colspan="3">OPERATING EXPENSES</td></tr>';
        opexAccounts.forEach(a => {
            if ((a.balance || 0) > 0) {
                html += '<tr class="pl-line-item"><td style="padding-left:32px">' + Utils.escapeHtml(a.code + ' — ' + a.name) + '</td><td class="text-right text-mono">—</td><td class="text-right text-mono">(' + Utils.currency(a.balance) + ')</td></tr>';
            }
        });
        if (internalUseCost > 0) {
            const internalQty = internalIssues.reduce((s, g) => s + (g.quantity || 0), 0);
            html += '<tr class="pl-line-item"><td style="padding-left:32px">Internal Use / Fuel Consumption (' + internalIssues.length + ' issues)</td><td class="text-right text-mono">' + Utils.num(internalQty) + '</td><td class="text-right text-mono">(' + Utils.currency(internalUseCost) + ')</td></tr>';
        }
        html += '<tr class="pl-subtotal"><td>Total Operating Expenses</td><td></td><td class="text-right text-mono">(' + Utils.currency(totalOperatingExpenses) + ')</td></tr>';

        // --- NET INCOME ---
        const niClass = netIncome >= 0 ? 'pl-net-positive' : 'pl-net-negative';
        html += '<tr class="pl-net-income ' + niClass + '"><td>NET INCOME</td><td class="text-right text-mono">' + netMargin + '%</td><td class="text-right text-mono">' + Utils.currency(netIncome) + '</td></tr>';

        html += '</tbody></table></div></div>';

        // --- Data Sources Note ---
        html += '<div class="pl-data-sources">';
        html += '<strong>Data Sources:</strong> ';
        html += 'Revenue from <em>' + sales.length + ' sales invoices</em> &bull; ';
        html += 'COGS from <em>' + goodsIssues.filter(g => g.reason === 'sale' && g.status !== 'reversed').length + ' goods issues</em> &bull; ';
        html += 'Direct costs from <em>' + landedCosts.length + ' landed cost entries</em> &bull; ';
        html += 'Operating expenses from <em>GL accounts + ' + internalIssues.length + ' internal-use issues</em>';
        html += '</div>';

        UI.render(html);
    },
    _exportPLCsv: () => {
        // Re-compute P&L data for CSV export
        let sales = DataStore.getAll('sales');
        let goodsIssues = DataStore.getAll('goods_issues');
        let landedCosts = DataStore.getAll('landed_costs');
        const grns = DataStore.getAll('grn');
        const accounts = DataStore.getAll('accounts');
        const products = DataStore.getAll('products');

        sales = UI.filterByDate(sales, 'date');
        goodsIssues = UI.filterByDate(goodsIssues, 'date');
        landedCosts = UI.filterByDate(landedCosts, 'date');

        if (State.filterBranch) {
            sales = sales.filter(s => s.branchId === State.filterBranch);
            goodsIssues = goodsIssues.filter(g => g.branchId === State.filterBranch);
            const branchGrnIds = grns.filter(g => g.branchId === State.filterBranch).map(g => g.id);
            landedCosts = landedCosts.filter(lc => branchGrnIds.includes(lc.grnId));
        }

        let csv = 'Awdeer Energy Limited - Profit & Loss Statement\n';
        csv += 'Generated,' + Utils.dateDisplay(Utils.dateStr()) + '\n\n';
        csv += 'Category,Description,Quantity (L),Amount (UGX)\n';

        // Revenue
        let totalRevenue = 0;
        products.forEach(p => {
            let amt = 0, qty = 0;
            sales.forEach(s => (s.lines || []).forEach(l => { if (l.productId === p.id) { amt += l.lineTotal || 0; qty += l.quantity || 0; } }));
            if (amt > 0) { csv += 'Revenue,"Sales Revenue - ' + p.code + '",' + qty + ',' + amt + '\n'; totalRevenue += amt; }
        });
        const otherIncomeAcct = accounts.find(a => a.id === '4100');
        const otherIncome = otherIncomeAcct ? (otherIncomeAcct.balance || 0) : 0;
        if (otherIncome > 0) { csv += 'Revenue,Other Income,,' + otherIncome + '\n'; totalRevenue += otherIncome; }
        csv += ',Total Revenue,,' + totalRevenue + '\n\n';

        // COGS
        let totalCOGS = 0;
        products.forEach(p => {
            let amt = 0, qty = 0;
            goodsIssues.filter(g => g.reason === 'sale' && g.status !== 'reversed' && g.productId === p.id).forEach(g => { amt += (g.quantity||0) * (g.costPerL||0); qty += g.quantity||0; });
            if (amt > 0) { csv += 'COGS,"COGS - ' + p.code + '",' + qty + ',' + amt + '\n'; totalCOGS += amt; }
        });
        csv += ',Total COGS,,' + totalCOGS + '\n';
        csv += ',GROSS PROFIT,,' + (totalRevenue - totalCOGS) + '\n\n';

        // Direct Costs
        let totalDirect = 0;
        const dcTypes = { freight: 0, insurance: 0, customs: 0, handling: 0 };
        landedCosts.forEach(lc => { dcTypes[lc.costType || 'freight'] = (dcTypes[lc.costType || 'freight'] || 0) + (lc.amountUGX || lc.amount || 0); });
        Object.keys(dcTypes).forEach(k => { if (dcTypes[k] > 0) { csv += 'Direct Cost,"' + k.charAt(0).toUpperCase() + k.slice(1) + '",,' + dcTypes[k] + '\n'; totalDirect += dcTypes[k]; } });
        csv += ',Total Direct Costs,,' + totalDirect + '\n\n';

        // Opex
        let totalOpex = 0;
        const landedCostAccountIds = ['5100', '5200', '5300', '5400'];
        const cogsAccountIds = ['5000', '5010'];
        accounts.filter(a => a.type === 'expense' && !cogsAccountIds.includes(a.id) && !landedCostAccountIds.includes(a.id)).forEach(a => {
            if ((a.balance||0) > 0) { csv += 'Operating Expense,"' + a.code + ' - ' + a.name + '",,' + a.balance + '\n'; totalOpex += a.balance; }
        });
        let internalUseCost = 0;
        goodsIssues.filter(g => g.reason !== 'sale' && g.status !== 'reversed').forEach(g => { internalUseCost += (g.quantity||0)*(g.costPerL||0); });
        if (internalUseCost > 0) { csv += 'Operating Expense,Internal Use / Fuel Consumption,,' + internalUseCost + '\n'; totalOpex += internalUseCost; }
        csv += ',Total Operating Expenses,,' + totalOpex + '\n\n';

        const netIncome = totalRevenue - totalCOGS - totalDirect - totalOpex;
        csv += ',NET INCOME,,' + netIncome + '\n';

        CSVExport._download('profit_loss_' + Utils.dateStr() + '.csv', csv);
    },
    showAgingReport: () => {
        const customers = DataStore.getAll('customers');
        const sales = DataStore.getAll('sales');
        const now = Date.now();
        const day = 86400000;
        let html = '<div class="section-card"><div class="report-header"><h2>AWDEER ENERGY LIMITED</h2><p>Customer Aging Report</p><p class="report-date">As at ' + Utils.dateDisplay(Utils.dateStr()) + '</p></div>';
        html += '<div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>Customer</th><th class="text-right">Current</th><th class="text-right">1-30 Days</th><th class="text-right">31-60 Days</th><th class="text-right">60+ Days</th><th class="text-right">Total</th></tr></thead><tbody>';
        let totals = { current: 0, d30: 0, d60: 0, d60plus: 0, total: 0 };
        customers.forEach(c => {
            const custSales = sales.filter(s => s.customerId === c.id && s.paid < s.total);
            let current = 0, d30 = 0, d60 = 0, d60plus = 0;
            custSales.forEach(s => {
                const bal = s.total - s.paid;
                const age = Math.floor((now - new Date(s.date).getTime()) / day);
                if (age <= 0) current += bal;
                else if (age <= 30) d30 += bal;
                else if (age <= 60) d60 += bal;
                else d60plus += bal;
            });
            const total = current + d30 + d60 + d60plus;
            if (total <= 0) return;
            totals.current += current; totals.d30 += d30; totals.d60 += d60; totals.d60plus += d60plus; totals.total += total;
            html += '<tr><td class="text-bold">' + Utils.escapeHtml(c.name) + '</td><td class="text-right text-mono">' + Utils.currency(current) + '</td><td class="text-right text-mono">' + Utils.currency(d30) + '</td><td class="text-right text-mono">' + Utils.currency(d60) + '</td><td class="text-right text-mono">' + Utils.currency(d60plus) + '</td><td class="text-right text-mono text-bold">' + Utils.currency(total) + '</td></tr>';
        });
        html += '</tbody><tfoot><tr><td class="text-bold">Totals</td><td class="text-right text-mono text-bold">' + Utils.currency(totals.current) + '</td><td class="text-right text-mono text-bold">' + Utils.currency(totals.d30) + '</td><td class="text-right text-mono text-bold">' + Utils.currency(totals.d60) + '</td><td class="text-right text-mono text-bold">' + Utils.currency(totals.d60plus) + '</td><td class="text-right text-mono text-bold">' + Utils.currency(totals.total) + '</td></tr></tfoot></table></div></div>';
        UI.render(html);
    },
    showDailySales: () => {
        const sales = DataStore.getAll('sales');
        const byDate = {};
        sales.forEach(s => {
            if (!byDate[s.date]) byDate[s.date] = { count: 0, total: 0, paid: 0 };
            byDate[s.date].count++;
            byDate[s.date].total += s.total;
            byDate[s.date].paid += s.paid;
        });
        const dates = Object.keys(byDate).sort().reverse();
        let html = '<div class="section-card"><div class="report-header"><h2>AWDEER ENERGY LIMITED</h2><p>Daily Sales Summary</p></div>';
        html += '<div class="section-card-body no-padding"><table class="data-table"><thead><tr><th>Date</th><th class="text-right">Invoices</th><th class="text-right">Sales</th><th class="text-right">Collected</th><th class="text-right">Outstanding</th></tr></thead><tbody>';
        let grandTotal = 0, grandPaid = 0;
        dates.forEach(d => {
            const day = byDate[d];
            grandTotal += day.total; grandPaid += day.paid;
            html += '<tr><td>' + Utils.dateDisplay(d) + '</td><td class="text-right text-mono">' + day.count + '</td><td class="text-right text-mono">' + Utils.currency(day.total) + '</td><td class="text-right text-mono">' + Utils.currency(day.paid) + '</td><td class="text-right text-mono">' + Utils.currency(day.total - day.paid) + '</td></tr>';
        });
        html += '</tbody><tfoot><tr><td class="text-bold">Grand Total</td><td></td><td class="text-right text-mono text-bold">' + Utils.currency(grandTotal) + '</td><td class="text-right text-mono text-bold">' + Utils.currency(grandPaid) + '</td><td class="text-right text-mono text-bold">' + Utils.currency(grandTotal - grandPaid) + '</td></tr></tfoot></table></div></div>';
        UI.render(html);
    }
};

// ============================================================
// CHARTS (SVG)
// ============================================================
const Charts = {
    revenueBarChart: (sales, width, height) => {
        width = width || 320;
        height = height || 180;
        const padding = 30;
        const barW = 28;
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        const dayTotals = days.map(d => {
            return sales.filter(s => s.date === d).reduce((sum, s) => sum + s.total, 0);
        });
        const maxVal = Math.max(...dayTotals, 1);
        const chartH = height - padding * 2;
        const chartW = width - padding * 2;
        const gap = (chartW - barW * 7) / 6;

        let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" style="width:100%;max-width:' + width + 'px">';
        // Y axis
        svg += '<line x1="' + padding + '" y1="' + padding + '" x2="' + padding + '" y2="' + (height - padding) + '" stroke="var(--content-border)" stroke-width="1"/>';
        // X axis
        svg += '<line x1="' + padding + '" y1="' + (height - padding) + '" x2="' + (width - 10) + '" y2="' + (height - padding) + '" stroke="var(--content-border)" stroke-width="1"/>';
        days.forEach((d, i) => {
            const x = padding + i * (barW + gap);
            const val = dayTotals[i];
            const barH = maxVal > 0 ? (val / maxVal) * chartH : 0;
            const y = height - padding - barH;
            svg += '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + barH + '" rx="3" fill="var(--brand-primary)" opacity="0.8"><title>' + Utils.dateDisplay(d) + ': ' + Utils.currency(val) + '</title></rect>';
            // Day label
            const dayLabel = new Date(d).toLocaleDateString('en-US', { weekday: 'short' });
            svg += '<text x="' + (x + barW / 2) + '" y="' + (height - 8) + '" text-anchor="middle" font-size="9" fill="var(--text-muted)">' + dayLabel + '</text>';
        });
        svg += '</svg>';
        return svg;
    }
};

// ============================================================
// CSV EXPORT
// ============================================================
const CSVExport = {
    _download: (filename, csvContent) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
        UI.toast('Downloaded ' + filename);
    },
    exportInventory: () => {
        const warehouses = DataStore.getAll('warehouses');
        const inventory = DataStore.getAll('inventory');
        let csv = 'Warehouse,Product,Quantity (L),Avg Cost,Total Value\n';
        warehouses.forEach(wh => {
            const inv = inventory.find(i => i.warehouseId === wh.id);
            const qty = inv ? inv.quantity : 0;
            const cost = inv ? inv.avgCost : 0;
            csv += '"' + wh.name + '",' + UI.getProductCode(wh.productId) + ',' + qty + ',' + cost + ',' + (qty * cost) + '\n';
        });
        CSVExport._download('inventory_' + Utils.dateStr() + '.csv', csv);
    },
    exportSales: () => {
        const sales = DataStore.getAll('sales');
        let csv = 'Invoice,Customer,Date,Total,Paid,Balance\n';
        sales.forEach(s => {
            csv += s.invoiceNo + ',"' + UI.getCustomerName(s.customerId) + '",' + s.date + ',' + s.total + ',' + s.paid + ',' + (s.total - s.paid) + '\n';
        });
        CSVExport._download('sales_' + Utils.dateStr() + '.csv', csv);
    }
};

// ============================================================
// BACKUP & RESTORE
// ============================================================
const BackupRestore = {
    backup: () => {
        const data = {};
        const collections = ['products', 'branches', 'warehouses', 'inventory', 'suppliers', 'customers', 'accounts', 'purchases', 'sales', 'journals', 'payments', 'supplier_payments', 'stock_transfers', 'exchange_rates', 'quotations', 'grn', 'landed_costs', 'ap_invoices', 'goods_issues'];
        collections.forEach(c => { data[c] = DataStore.getAll(c); });
        data._version = CONFIG.VERSION;
        data._date = new Date().toISOString();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'awdeer_erp_backup_' + Utils.dateStr() + '.json';
        link.click();
        URL.revokeObjectURL(link.href);
        UI.toast('Backup downloaded');
    },
    showRestore: () => {
        const html = '<div style="text-align:center;padding:20px"><p style="margin-bottom:16px;color:var(--text-secondary)">Select a backup JSON file to restore all data.</p><input type="file" id="restore-file" accept=".json" style="margin-bottom:16px"><div class="form-actions" style="justify-content:center"><button class="btn btn-primary" onclick="BackupRestore.doRestore()">Restore</button></div></div>';
        UI.modal('Restore Data', html);
    },
    doRestore: () => {
        const fileInput = document.getElementById('restore-file');
        if (!fileInput || !fileInput.files[0]) { UI.toast('Select a file first', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const collections = ['products', 'branches', 'warehouses', 'inventory', 'suppliers', 'customers', 'accounts', 'purchases', 'sales', 'journals', 'payments', 'supplier_payments', 'stock_transfers', 'exchange_rates', 'quotations', 'grn', 'landed_costs', 'ap_invoices', 'goods_issues'];
                collections.forEach(c => { if (data[c]) DataStore.setAll(c, data[c]); });
                UI.closeModal();
                UI.toast('Data restored successfully');
                Router.navigate('dashboard');
            } catch (err) {
                UI.toast('Invalid backup file', 'error');
            }
        };
        reader.readAsText(fileInput.files[0]);
    }
};

// ============================================================
// GLOBAL ACTIONS
// ============================================================
const GlobalActions = {
    printReport: () => { window.print(); },
    resetData: () => {
        if (!confirm('Reset ALL data? This cannot be undone.')) return;
        const collections = ['products', 'branches', 'warehouses', 'inventory', 'suppliers', 'customers', 'accounts', 'purchases', 'sales', 'journals', 'payments', 'supplier_payments', 'stock_transfers', 'exchange_rates', 'quotations', 'grn', 'landed_costs', 'ap_invoices', 'goods_issues'];
        collections.forEach(c => localStorage.removeItem(DataStore._key(c)));
        localStorage.removeItem(CONFIG.APP_KEY + '_seeded');
        // Clear sequence counters
        ['GRN', 'GIN', 'INV', 'APV', 'QTN', 'JRN'].forEach(p => localStorage.removeItem(CONFIG.APP_KEY + '_seq_' + p));
        SeedData.load();
        UI.toast('Data reset to defaults');
        Router.navigate('dashboard');
    },
    showSearch: () => {
        const overlay = document.createElement('div');
        overlay.className = 'search-overlay';
        overlay.id = 'search-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        const box = document.createElement('div');
        box.className = 'search-box';
        box.innerHTML = '<input type="text" placeholder="Search customers, suppliers, invoices..." id="search-input" autofocus><div class="search-results" id="search-results"></div>';
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        setTimeout(() => {
            const input = document.getElementById('search-input');
            if (input) input.focus();
            input.oninput = () => GlobalActions._doSearch(input.value);
        }, 50);
    },
    _doSearch: (query) => {
        const results = document.getElementById('search-results');
        if (!results) return;
        if (!query || query.length < 2) { results.innerHTML = ''; return; }
        const q = query.toLowerCase();
        let items = [];
        DataStore.getAll('customers').forEach(c => { if (c.name.toLowerCase().includes(q)) items.push({ type: 'Customer', name: c.name, action: 'Customers.viewStatement(\'' + c.id + '\')' }); });
        DataStore.getAll('suppliers').forEach(s => { if (s.name.toLowerCase().includes(q)) items.push({ type: 'Supplier', name: s.name, action: 'Suppliers.viewStatement(\'' + s.id + '\')' }); });
        DataStore.getAll('sales').forEach(s => { if (s.invoiceNo.toLowerCase().includes(q)) items.push({ type: 'Invoice', name: s.invoiceNo + ' — ' + UI.getCustomerName(s.customerId), action: 'Router.navigate("sales")' }); });
        DataStore.getAll('grn').forEach(g => { if (g.grnNo.toLowerCase().includes(q)) items.push({ type: 'GRN', name: g.grnNo + ' — ' + UI.getSupplierName(g.supplierId), action: 'Router.navigate("goods_receipt")' }); });
        DataStore.getAll('goods_issues').forEach(g => { if (g.ginNo.toLowerCase().includes(q)) items.push({ type: 'GIN', name: g.ginNo + ' — ' + GoodsIssue._reasonLabel(g.reason), action: 'GoodsIssue.viewDetail(\'' + g.id + '\')' }); });
        let html = '';
        items.slice(0, 8).forEach(item => {
            html += '<div class="search-result" onclick="document.getElementById(\'search-overlay\').remove();' + item.action + '"><span class="search-type">' + item.type + '</span><span>' + Utils.escapeHtml(item.name) + '</span></div>';
        });
        if (items.length === 0) html = '<div class="search-result" style="color:var(--text-muted)">No results found</div>';
        results.innerHTML = html;
    }
};

// ============================================================
// DARK MODE
// ============================================================
const DarkMode = {
    toggle: () => {
        State.darkMode = !State.darkMode;
        DarkMode.apply();
        localStorage.setItem('awdeer_erp_darkMode', State.darkMode);
    },
    apply: () => {
        document.documentElement.setAttribute('data-theme', State.darkMode ? 'dark' : 'light');
    }
};

// ============================================================
// APP INITIALIZATION
// ============================================================
const App = {
    init: () => {
        SeedData.load();
        DarkMode.apply();

        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.onsubmit = (e) => {
                e.preventDefault();
                const username = document.getElementById('login-username').value;
                const password = document.getElementById('login-password').value;
                if (!Auth.login(username, password)) {
                    document.getElementById('login-error').classList.remove('hidden');
                }
            };
        }

        // Password toggle
        const pwdToggle = document.getElementById('password-toggle');
        if (pwdToggle) {
            pwdToggle.onclick = () => {
                const pwdInput = document.getElementById('login-password');
                pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
            };
        }

        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.onclick = () => {
                const sidebar = document.getElementById('sidebar');
                if (window.innerWidth < 768) {
                    sidebar.classList.toggle('open');
                } else {
                    sidebar.classList.toggle('collapsed');
                }
            };
        }

        // Nav items
        document.querySelectorAll('.nav-item[data-module]').forEach(el => {
            el.onclick = (e) => {
                e.preventDefault();
                Router.navigate(el.dataset.module);
            };
        });

        // Modal close
        const modalClose = document.getElementById('modal-close');
        if (modalClose) modalClose.onclick = UI.closeModal;
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            modalOverlay.onclick = (e) => { if (e.target === modalOverlay) UI.closeModal(); };
        }

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.onclick = Auth.logout;

        // Currency toggle
        const currencyToggle = document.getElementById('currency-toggle');
        if (currencyToggle) {
            currencyToggle.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.onclick = () => {
                    currencyToggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    State.currency = btn.dataset.value;
                    Router.navigate(State.currentModule);
                };
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') { e.preventDefault(); GlobalActions.showSearch(); }
            if (e.key === 'Escape') {
                UI.closeModal();
                const searchOverlay = document.getElementById('search-overlay');
                if (searchOverlay) searchOverlay.remove();
            }
        });

        console.log('Awdeer ERP v' + CONFIG.VERSION + ' initialized');
    }
};

// Start the app
document.addEventListener('DOMContentLoaded', App.init);
