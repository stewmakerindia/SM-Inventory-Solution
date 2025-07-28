// This is the real, live code for your app.

// --- CONFIGURATION ---
const OUTLETS = ["Yelahanka", "Thanisandra", "Kammanahalli", "Indiranagar"];
const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID;

// The main container for our app
const appContainer = document.getElementById("app");

// Global variables to hold our data
let ALL_ITEMS = [];
let ALL_DISHES = [];
let PRODUCTION_PLAN = [];
let currentOutlet = "";

// --- GOOGLE SHEETS API HELPER ---
// This function fetches all the initial data from our Google Sheet.
async function getSheetData() {
    // This is a special URL that Vercel creates for our backend function.
    const response = await fetch('/api/getData');
    if (!response.ok) {
        appContainer.innerHTML = `<div class="text-center p-10 bg-red-100 border border-red-400 text-red-700 rounded">
            <p class="font-bold">Error loading data from Google Sheet.</p>
            <p>Please check Vercel environment variables and Sheet permissions.</p>
        </div>`;
        throw new Error('Failed to fetch sheet data');
    }
    const data = await response.json();
    ALL_ITEMS = data.items;
    ALL_DISHES = data.dishes;
    PRODUCTION_PLAN = data.productionPlan;
}

// This function sends data (orders or inventory) to our Google Sheet.
async function postSheetData(sheetName, data) {
    await fetch('/api/postData', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetName, data }),
    });
}


// --- HTML TEMPLATES ---

function renderOutletSelector() {
    return `
        <div class="mb-4">
            <label for="outlet-select" class="block text-sm font-bold text-gray-700 mb-2">SELECT YOUR OUTLET</label>
            <select id="outlet-select" class="block w-full p-3 border border-gray-300 rounded-lg bg-white text-lg">
                <option value="">-- Please Select --</option>
                ${OUTLETS.map(outlet => `<option value="${outlet}">${outlet}</option>`).join('')}
            </select>
        </div>
        <div id="outlet-content" class="hidden">
            <div class="border-b border-gray-200 mb-4">
                <nav class="flex -mb-px" id="chef-tabs">
                    <button data-tab="order" class="w-1/3 py-4 px-1 text-center border-b-2 font-medium text-lg border-indigo-500 text-indigo-600">Order</button>
                    <button data-tab="inventory" class="w-1/3 py-4 px-1 text-center border-b-2 font-medium text-lg border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">Inventory</button>
                    <button data-tab="production" class="w-1/3 py-4 px-1 text-center border-b-2 font-medium text-lg border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">Production</button>
                </nav>
            </div>
            <div id="tab-content"></div>
        </div>
    `;
}

function renderOrderForm(items) {
    const categories = [...new Set(items.map(item => item.Category))].sort();
    return `
        <h2 class="text-xl font-bold mb-4">Place Your Order</h2>
        <form id="order-form">
            ${categories.map(category => `
                <div class="category-header">${category ? category.toUpperCase() : 'UNCATEGORIZED'}</div>
                <div class="space-y-4 p-4 bg-white rounded-lg shadow-sm mb-4">
                    ${items.filter(i => i.Category === category).map(item => `
                        <div class="flex justify-between items-center">
                            <label class="text-gray-700">${item.ItemName} (${item.Unit})</label>
                            <input type="number" data-item="${item.ItemName}" data-unit="${item.Unit}" min="0" class="border rounded px-2 py-1" placeholder="0">
                        </div>
                    `).join('')}
                </div>
            `).join('')}
            <button type="submit" class="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg mt-6 hover:bg-blue-700">SUBMIT ORDER</button>
        </form>
    `;
}

function renderInventoryForm(items) {
    const categories = [...new Set(items.map(item => item.Category))].sort();
    return `
        <h2 class="text-xl font-bold mb-4">Update Closing Inventory</h2>
        <form id="inventory-form">
            ${categories.map(category => `
                <div class="category-header">${category ? category.toUpperCase() : 'UNCATEGORIZED'}</div>
                <div class="space-y-4 p-4 bg-white rounded-lg shadow-sm mb-4">
                    ${items.filter(i => i.Category === category).map(item => `
                        <div class="flex justify-between items-center">
                            <label class="text-gray-700">${item.ItemName} (${item.Unit})</label>
                            <input type="number" data-item="${item.ItemName}" min="0" step="0.1" class="border rounded px-2 py-1" placeholder="0.0">
                        </div>
                    `).join('')}
                </div>
            `).join('')}
            <button type="submit" class="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg mt-6 hover:bg-green-700">SAVE & SEND TO HQ</button>
        </form>
    `;
}

function renderProductionPlan(plan, outlet) {
    const dishesWithTargets = ALL_DISHES.map(dish => {
        const planEntry = plan.find(p => p.DishName === dish.DishName);
        return {
            DishName: dish.DishName,
            Target: planEntry ? (planEntry[outlet] || 0) : 0
        };
    });

    return `
         <h2 class="text-xl font-bold mb-4">Today's Production Plan</h2>
         <div class="space-y-3">
            ${dishesWithTargets.map(dish => `
                <div class="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                    <span class="text-gray-800 font-medium">${dish.DishName}</span>
                    <span class="dish-target text-blue-600">${dish.Target}</span>
                </div>
            `).join('')}
         </div>
    `;
}

function attachFormListeners(tabContent) {
    const orderForm = tabContent.querySelector('#order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(orderForm);
            const orderData = [];
            const timestamp = new Date().toISOString();

            for (let input of orderForm.querySelectorAll('input[type="number"]')) {
                if (input.value && parseFloat(input.value) > 0) {
                    orderData.push([
                        timestamp,
                        currentOutlet,
                        input.dataset.item,
                        parseFloat(input.value)
                    ]);
                }
            }

            if (orderData.length > 0) {
                await postSheetData('Order_Log', orderData);
                alert('Order submitted successfully!');
                orderForm.reset();
            } else {
                alert('Please enter a quantity for at least one item.');
            }
        });
    }

    const inventoryForm = tabContent.querySelector('#inventory-form');
    if (inventoryForm) {
        inventoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inventoryData = [];
            const timestamp = new Date().toISOString();

             for (let input of inventoryForm.querySelectorAll('input[type="number"]')) {
                if (input.value && input.value !== '') {
                    inventoryData.push([
                        timestamp,
                        currentOutlet,
                        input.dataset.item,
                        parseFloat(input.value)
                    ]);
                }
            }

            if (inventoryData.length > 0) {
                await postSheetData('Inventory_Log', inventoryData);
                alert('Inventory saved successfully!');
                inventoryForm.reset();
            } else {
                alert('Please enter the stock for at least one item.');
            }
        });
    }
}


async function initChefView() {
    appContainer.innerHTML = renderOutletSelector();

    const outletSelector = document.getElementById('outlet-select');
    const outletContent = document.getElementById('outlet-content');
    const tabContent = document.getElementById('tab-content');
    const tabs = document.getElementById('chef-tabs');

    outletSelector.addEventListener('change', (e) => {
        currentOutlet = e.target.value;
        if (currentOutlet) {
            outletContent.classList.remove('hidden');
            tabs.querySelector('button[data-tab="order"]').click();
        } else {
            outletContent.classList.add('hidden');
        }
    });

    tabs.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            tabs.querySelectorAll('button').forEach(b => {
                b.classList.remove('border-indigo-500', 'text-indigo-600');
                b.classList.add('border-transparent', 'text-gray-500');
            });
            e.target.classList.add('border-indigo-500', 'text-indigo-600');
            e.target.classList.remove('border-transparent', 'text-gray-500');

            const tabName = e.target.dataset.tab;
            if (tabName === 'order') {
                tabContent.innerHTML = renderOrderForm(ALL_ITEMS);
            } else if (tabName === 'inventory') {
                tabContent.innerHTML = renderInventoryForm(ALL_ITEMS);
            } else if (tabName === 'production') {
                tabContent.innerHTML = renderProductionPlan(PRODUCTION_PLAN, currentOutlet);
            }
            attachFormListeners(tabContent);
        }
    });
}

// --- MAIN APP INITIALIZATION ---
async function main() {
    try {
        await getSheetData();
        // We only support the chef view for now. HQ view is directly in Google Sheets.
        initChefView();
    } catch (error) {
        console.error("Could not initialize the app:", error);
        // Error message is already shown by getSheetData()
    }
}

main();
