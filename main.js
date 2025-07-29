// =================================================================
// --- BRANDING CONFIGURATION ---
// =================================================================
const BRAND_COLOR = "#E65100";
const LOGO_URL = "https://i.postimg.cc/Fsv6HcTP/Logo-variations-png-03.png";
// =================================================================

// --- APP CONFIGURATION ---
const OUTLETS = ["Yelahanka", "Thanisandra", "Kammanahalli", "Indiranagar"];
const appContainer = document.getElementById("app");

// Global variables
let ALL_ITEMS = [], ALL_DISHES = [], PRODUCTION_PLAN = [], CATEGORY_ORDER = [], DISH_CATEGORY_ORDER = [], currentOutlet = "";

// --- GOOGLE SHEETS API HELPERS ---
async function getSheetData() {
    const response = await fetch('/api/getData');
    if (!response.ok) {
        appContainer.innerHTML = `<div class="text-center p-10 bg-red-100 border border-red-400 text-red-700 rounded"><p class="font-bold">Error loading data from Google Sheet.</p></div>`;
        throw new Error('Failed to fetch sheet data');
    }
    const data = await response.json();
    ALL_ITEMS = data.items; ALL_DISHES = data.dishes; PRODUCTION_PLAN = data.productionPlan; CATEGORY_ORDER = data.categoryOrder;
    DISH_CATEGORY_ORDER = data.dishCategoryOrder;
}
async function postSheetData(sheetName, data) {
    await fetch('/api/postData', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sheetName, data }) });
}

// --- HELPER FUNCTIONS ---
function getSortedCategories(items, orderList) {
    const allCategoriesInItems = [...new Set(items.map(item => item.Category))];
    if (orderList && orderList.length > 0) {
        const ordered = orderList.filter(cat => allCategoriesInItems.includes(cat));
        const unordered = allCategoriesInItems.filter(cat => !orderList.includes(cat));
        return [...ordered, ...unordered.sort()];
    }
    return allCategoriesInItems.sort();
}

// --- HTML TEMPLATES ---
function renderOutletSelector() {
    const logoHtml = LOGO_URL ? `<div class="text-center mb-6"><img src="${LOGO_URL}" alt="Brand Logo" class="mx-auto h-16 w-auto"></div>` : '';
    return `${logoHtml}<div class="mb-4"><label for="outlet-select" class="block text-sm font-bold text-gray-700 mb-2">SELECT YOUR OUTLET</label><select id="outlet-select" class="block w-full p-3 border border-gray-300 rounded-lg bg-white text-lg"><option value="">-- Please Select --</option>${OUTLETS.map(outlet => `<option value="${outlet}">${outlet}</option>`).join('')}</select></div><div id="outlet-content" class="hidden"><div class="mb-4"><div id="chef-tabs" class="bg-gray-200 p-1 rounded-full flex w-full"><button data-tab="order" class="flex-1 text-center font-medium py-2 px-4 rounded-full transition-all duration-300">Order</button><button data-tab="inventory" class="flex-1 text-center font-medium py-2 px-4 rounded-full transition-all duration-300">Inventory</button><button data-tab="production" class="flex-1 text-center font-medium py-2 px-4 rounded-full transition-all duration-300">Production</button></div></div><div id="tab-content"></div></div>`;
}

function renderOrderForm(items) {
    const categories = getSortedCategories(items, CATEGORY_ORDER);
    return `<h2 class="text-xl font-bold mb-4">Place Your Order</h2><form id="order-form">${categories.map(category => `<div class="category-header">${category ? category.toUpperCase() : 'UNCATEGORIZED'}</div><div class="space-y-4 p-4 bg-white rounded-lg shadow-sm mb-4">${items.filter(i => i.Category === category).map(item => `<div class="flex justify-between items-center"><label class="text-gray-700">${item.ItemName} (${item.Unit})</label><input type="number" data-item="${item.ItemName}" data-unit="${item.Unit}" min="0" class="border rounded px-2 py-1" placeholder="0"></div>`).join('')}</div>`).join('')}<button type="submit" class="w-full text-white font-bold py-3 px-4 rounded-lg mt-6" style="background-color: ${BRAND_COLOR};">SUBMIT ORDER</button></form>`;
}

function renderInventoryForm(items) {
    const categories = getSortedCategories(items, CATEGORY_ORDER);
    return `<h2 class="text-xl font-bold mb-4">Update Closing Inventory</h2><form id="inventory-form">${categories.map(category => `<div class="category-header">${category ? category.toUpperCase() : 'UNCATEGORIZED'}</div><div class="space-y-4 p-4 bg-white rounded-lg shadow-sm mb-4">${items.filter(i => i.Category === category).map(item => `<div class="flex justify-between items-center"><label class="text-gray-700">${item.ItemName} (${item.Unit})</label><input type="number" data-item="${item.ItemName}" min="0" step="0.1" class="border rounded px-2 py-1" placeholder="0.0"></div>`).join('')}</div>`).join('')}<button type="submit" class="w-full text-white font-bold py-3 px-4 rounded-lg mt-6" style="background-color: ${BRAND_COLOR};">SAVE & SEND TO HQ</button></form>`;
}

function renderProductionPlan(plan, outlet) {
    const categories = getSortedCategories(ALL_DISHES, DISH_CATEGORY_ORDER);
    return `
        <h2 class="text-xl font-bold mb-4">Today's Production Plan</h2>
        ${categories.map(category => `
            <div class="category-header">${category ? category.toUpperCase() : 'UNCATEGORIZED'}</div>
            <div class="space-y-3 p-4 bg-white rounded-lg shadow-sm mb-4">
                ${ALL_DISHES.filter(d => d.Category === category).map(dish => {
                    const planEntry = plan.find(p => p.DishName === dish.DishName);
                    const target = planEntry ? (planEntry[outlet] || 0) : 0;
                    return `<div class="flex justify-between items-center">
                                <span class="text-gray-800 font-medium">${dish.DishName}</span>
                                <span class="dish-target" style="color: ${BRAND_COLOR};">${target}</span>
                            </div>`;
                }).join('')}
            </div>
        `).join('')}
    `;
}

function attachFormListeners(tabContent) {
    const orderForm = tabContent.querySelector('#order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault(); const orderData = []; const timestamp = new Date().toISOString();
            for (let input of orderForm.querySelectorAll('input[type="number"]')) { if (input.value && parseFloat(input.value) > 0) { orderData.push([timestamp, currentOutlet, input.dataset.item, parseFloat(input.value)])}};
            if (orderData.length > 0) { await postSheetData('Order_Log', orderData); alert('Order submitted successfully!'); orderForm.reset(); } else { alert('Please enter a quantity for at least one item.'); }
        });
    }
    const inventoryForm = tabContent.querySelector('#inventory-form');
    if (inventoryForm) {
        inventoryForm.addEventListener('submit', async (e) => {
            e.preventDefault(); const inventoryData = []; const timestamp = new Date().toISOString();
            for (let input of inventoryForm.querySelectorAll('input[type="number"]')) { if (input.value && input.value !== '') { inventoryData.push([timestamp, currentOutlet, input.dataset.item, parseFloat(input.value)])}};
            if (inventoryData.length > 0) { await postSheetData('Inventory_Log', inventoryData); alert('Inventory saved successfully!'); inventoryForm.reset(); } else { alert('Please enter the stock for at least one item.'); }
        });
    }
}

function initChefView() {
    appContainer.innerHTML = renderOutletSelector();
    const outletSelector = document.getElementById('outlet-select'); const outletContent = document.getElementById('outlet-content'); const tabContent = document.getElementById('tab-content'); const tabs = document.getElementById('chef-tabs');
    outletSelector.addEventListener('change', (e) => {
        currentOutlet = e.target.value;
        if (currentOutlet) { outletContent.classList.remove('hidden'); tabs.querySelector('button[data-tab="order"]').click(); } else { outletContent.classList.add('hidden'); }
    });
    
    tabs.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            tabs.querySelectorAll('button').forEach(b => {
                b.style.backgroundColor = 'transparent'; b.style.color = '#6B7280'; b.style.boxShadow = 'none';
            });
            e.target.style.backgroundColor = BRAND_COLOR; e.target.style.color = 'white'; e.target.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
            const tabName = e.target.dataset.tab;
            if (tabName === 'order') { tabContent.innerHTML = renderOrderForm(ALL_ITEMS); } 
            else if (tabName === 'inventory') { tabContent.innerHTML = renderInventoryForm(ALL_ITEMS); } 
            // *** THIS IS THE LINE I FIXED ***
            else if (tabName === 'production') { tabContent.innerHTML = renderProductionPlan(PRODUCTION_PLAN, currentOutlet); } 
            attachFormListeners(tabContent);
        }
    });
}

async function main() {
    appContainer.innerHTML = `<div class="text-center p-10"><p class="text-lg font-semibold">Loading KitchenSync...</p><p class="text-gray-500">Fetching latest data from Google Sheets.</p></div>`;
    try {
        await getSheetData(); initChefView();
    } catch (error) { console.error("Could not initialize the app:", error); }
}

main();
