// --- CONFIGURATION ---
// These are the names of your outlets.
const OUTLETS = ["Yelahanka", "Thanisandra", "Kammanahalli", "Indiranagar"];
// The main container for our app
const appContainer = document.getElementById("app");

// --- MOCK DATA (for testing before connecting to Google Sheets) ---
// This data will be replaced by live data from your Google Sheet later.
const MOCK_ITEMS = [
    { ItemName: "Onion", Category: "Vegetables", Unit: "kg" },
    { ItemName: "Tomato", Category: "Vegetables", Unit: "kg" },
    { ItemName: "Chicken, Boneless", Category: "Meat", Unit: "kg" },
    { ItemName: "500ml Container", Category: "Packaging", Unit: "pcs" },
];
const MOCK_DISHES = [
    { DishName: "Chicken Stew" },
    { DishName: "Veg Stew" },
];
const MOCK_PRODUCTION_PLAN = [
    { DishName: "Chicken Stew", Yelahanka: 50, Thanisandra: 40 },
    { DishName: "Veg Stew", Yelahanka: 75, Thanisandra: 80 },
];

// --- APP ROUTING & STATE ---
let currentOutlet = "";

// Simple router to check if we are on the HQ page or Chef page
const isHqPage = window.location.pathname.includes('/hq');

// --- HTML TEMPLATES (Functions that create the HTML for our pages) ---

// The main screen selector for chefs
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
            <!-- Tabs will go here -->
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

// Creates the order form
function renderOrderForm(items) {
    const categories = [...new Set(items.map(item => item.Category))];
    return `
        <h2 class="text-xl font-bold mb-4">Place Your Order</h2>
        <form id="order-form">
            ${categories.map(category => `
                <div class="category-header">${category.toUpperCase()}</div>
                <div class="space-y-4 p-4">
                    ${items.filter(i => i.Category === category).map(item => `
                        <div class="flex justify-between items-center">
                            <label class="text-gray-700">${item.ItemName} (${item.Unit})</label>
                            <input type="number" name="${item.ItemName}" min="0" class="border rounded px-2 py-1" placeholder="0">
                        </div>
                    `).join('')}
                </div>
            `).join('')}
            <button type="submit" class="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg mt-6 hover:bg-blue-700">SUBMIT ORDER</button>
        </form>
    `;
}

// Creates the inventory form
function renderInventoryForm(items) {
     const categories = [...new Set(items.map(item => item.Category))];
    return `
        <h2 class="text-xl font-bold mb-4">Update Closing Inventory</h2>
        <form id="inventory-form">
            ${categories.map(category => `
                <div class="category-header">${category.toUpperCase()}</div>
                <div class="space-y-4 p-4">
                    ${items.filter(i => i.Category === category).map(item => `
                        <div class="flex justify-between items-center">
                            <label class="text-gray-700">${item.ItemName} (${item.Unit})</label>
                            <input type="number" name="${item.ItemName}" min="0" step="0.1" class="border rounded px-2 py-1" placeholder="0.0">
                        </div>
                    `).join('')}
                </div>
            `).join('')}
            <button type="submit" class="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg mt-6 hover:bg-green-700">SAVE & SEND TO HQ</button>
        </form>
    `;
}

// Creates the production plan view for chefs
function renderProductionPlan(plan, outlet) {
    return `
         <h2 class="text-xl font-bold mb-4">Today's Production Plan</h2>
         <div class="space-y-3">
            ${plan.map(dish => `
                <div class="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                    <span class="text-gray-800 font-medium">${dish.DishName}</span>
                    <span class="dish-target text-blue-600">${dish[outlet] || 0}</span>
                </div>
            `).join('')}
         </div>
    `;
}

// Main function to start the chef's view
async function initChefView() {
    appContainer.innerHTML = renderOutletSelector();
    
    // In a real app, you would fetch this from your Google Sheet API
    const allItems = MOCK_ITEMS; 
    const allDishes = MOCK_DISHES;
    const productionPlan = MOCK_PRODUCTION_PLAN;

    const outletSelector = document.getElementById('outlet-select');
    const outletContent = document.getElementById('outlet-content');
    const tabContent = document.getElementById('tab-content');
    const tabs = document.getElementById('chef-tabs');

    outletSelector.addEventListener('change', (e) => {
        currentOutlet = e.target.value;
        if (currentOutlet) {
            outletContent.classList.remove('hidden');
            // Default to order tab
            tabs.querySelector('button[data-tab="order"]').click();
        } else {
            outletContent.classList.add('hidden');
        }
    });

    tabs.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            // Update tab visual state
            tabs.querySelectorAll('button').forEach(b => {
                b.classList.remove('border-indigo-500', 'text-indigo-600');
                b.classList.add('border-transparent', 'text-gray-500');
            });
            e.target.classList.add('border-indigo-500', 'text-indigo-600');
            e.target.classList.remove('border-transparent', 'text-gray-500');

            // Load tab content
            const tabName = e.target.dataset.tab;
            if (tabName === 'order') {
                tabContent.innerHTML = renderOrderForm(allItems);
                // Add form submission logic here
            } else if (tabName === 'inventory') {
                tabContent.innerHTML = renderInventoryForm(allItems);
                // Add form submission logic here
            } else if (tabName === 'production') {
                tabContent.innerHTML = renderProductionPlan(productionPlan, currentOutlet);
            }
        }
    });
}

// Main function to start the HQ view
async function initHqView() {
    appContainer.innerHTML = `<h1 class="text-2xl font-bold text-center">HQ Dashboard (Coming Soon)</h1>`;
    // We will build the HQ logic after connecting to Google Sheets
}


// --- INITIALIZE THE APP ---
if (isHqPage) {
    initHqView();
} else {
    initChefView();
}
