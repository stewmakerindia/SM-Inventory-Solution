// =================================================================
// --- BRANDING CONFIGURATION ---
// =================================================================
const BRAND_COLOR = "#bd202f";
const LOGO_URL = "https://i.postimg.cc/Fsv6HcTP/Logo-variations-png-03.png";
// =================================================================
// --- END OF CONFIGURATION ---
// =================================================================

const OUTLETS = ["Yelahanka", "Thanisandra", "Kammanahalli", "Indiranagar"];
const appContainer = document.getElementById("app");

let ALL_ITEMS = [], ALL_DISHES = [], PRODUCTION_PLAN = [], CATEGORY_ORDER = [], DISH_CATEGORY_ORDER = [], currentOutlet = "";

// --- API HELPERS ---
async function getSheetData() {
    const response = await fetch('/api/getData');
    if (!response.ok) { appContainer.innerHTML = `<div class="text-center p-10 bg-red-100 border border-red-400 text-red-700 rounded"><p class="font-bold">Error loading data from Google Sheet.</p></div>`; throw new Error('Failed to fetch sheet data'); }
    const data = await response.json();
    ALL_ITEMS = data.items; ALL_DISHES = data.dishes; PRODUCTION_PLAN = data.productionPlan; CATEGORY_ORDER = data.categoryOrder; DISH_CATEGORY_ORDER = data.dishCategoryOrder;
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

function generateWhatsAppMessage(orderedItems) {
    let message = `*Outlet Order - ${currentOutlet}*\n----------------------\n`;
    const itemsBySuperCategory = {};
    orderedItems.forEach(item => {
        if (!itemsBySuperCategory[item.superCategory]) { itemsBySuperCategory[item.superCategory] = []; }
        itemsBySuperCategory[item.superCategory].push(`- ${item.name}: ${item.quantity} ${item.unit}`);
    });
    for (const superCat in itemsBySuperCategory) {
        message += `*${superCat}*\n`;
        message += itemsBySuperCategory[superCat].join('\n') + '\n\n';
    }
    message += `----------------------\nOrder submitted by Chef.`;
    return encodeURIComponent(message);
}

// --- HTML TEMPLATES ---
function renderOutletSelector() {
    const logoHtml = LOGO_URL ? `<div class="text-center mb-6"><img src="${LOGO_URL}" alt="Brand Logo" class="mx-auto h-16 w-auto"></div>` : '';
    return `${logoHtml}<div class="mb-4"><label for="outlet-select" class="block text-sm font-bold text-gray-700 mb-2">SELECT YOUR OUTLET</label><select id="outlet-select" class="block w-full p-3 border border-gray-300 rounded-lg bg-white text-lg"><option value="">-- Please Select --</option>${OUTLETS.map(outlet => `<option value="${outlet}">${outlet}</option>`).join('')}</select></div><div id="outlet-content" class="hidden"><div class="mb-4"><div id="chef-tabs" class="bg-gray-200 p-1 rounded-full flex w-full"><button data-tab="order" class="flex-1 text-center font-medium py-2 px-4 rounded-full transition-all duration-300">Order</button><button data-tab="inventory" class="flex-1 text-center font-medium py-2 px-4 rounded-full transition-all duration-300">Inventory</button><button data-tab="production" class="flex-1 text-center font-medium py-2 px-4 rounded-full transition-all duration-300">Production</button></div></div><div id="tab-content"></div></div>`;
}

function renderSuperCategorySelector(formType) {
    const superCategories = [...new Set(ALL_ITEMS.map(item => item.SuperCategory))].filter(Boolean);
    const title = formType === 'order' ? 'What are you ordering?' : 'Which inventory are you updating?';
    return `<div class="text-center"><h2 class="text-xl font-bold mb-6">${title}</h2><div class="space-y-4">${superCategories.map(sc => `<button data-supercategory="${sc}" data-formtype="${formType}" class="w-full text-lg text-white font-bold py-4 px-4 rounded-lg shadow-md" style="background-color: ${BRAND_COLOR};">${sc === 'Kitchen Items' ? '🍳' : sc === 'Packaging Items' ? '📦' : '🍔'} ${sc}</button>`).join('')}<button class="back-button mt-4 text-gray-500">← Back to Main Menu</button></div></div>`;
}

function renderForm(items, formType) {
    const categories = getSortedCategories(items, CATEGORY_ORDER);
    const title = formType === 'order' ? 'Place Your Order' : 'Update Closing Inventory';
    const buttonText = formType === 'order' ? 'SUBMIT ORDER & SEND WHATSAPP' : 'SAVE & SEND TO HQ';
    return `<div class="flex justify-between items-center mb-4"><h2 class="text-xl font-bold">${title}</h2><button class="back-button text-gray-500">← Back</button></div><form id="${formType}-form">${categories.map(category => `<div class="category-header">${category ? category.toUpperCase() : 'UNCATEGORIZED'}</div><div class="space-y-4 p-4 bg-white rounded-lg shadow-sm mb-4">${items.filter(i => i.Category === category).map(item => `<div class="flex justify-between items-center"><label class="text-gray-700">${item.ItemName} (${item.Unit})</label><input type="number" data-item="${item.ItemName}" data-unit="${item.Unit}" data-supercategory="${item.SuperCategory}" min="0" step="0.1" class="border rounded px-2 py-1" placeholder="0"></div>`).join('')}</div>`).join('')}<button type="submit" class="w-full text-white font-bold py-3 px-4 rounded-lg mt-6" style="background-color: ${BRAND_COLOR};">${buttonText}</button></form>`;
}

function renderProductionPlan(plan, outlet) {
    const categories = getSortedCategories(ALL_DISHES, DISH_CATEGORY_ORDER);
    return `<h2 class="text-xl font-bold mb-4">Today's Production Plan</h2>${categories.map(category => `<div class="category-header">${category ? category.toUpperCase() : 'UNCATEGORIZED'}</div><div class="space-y-3 p-4 bg-white rounded-lg shadow-sm mb-4">${ALL_DISHES.filter(d => d.Category === category).map(dish => { const planEntry = plan.find(p => p.DishName === dish.DishName); const target = planEntry ? (planEntry[outlet] || 0) : 0; return `<div class="flex justify-between items-center"><span class="text-gray-800 font-medium">${dish.DishName}</span><span class="dish-target" style="color: ${BRAND_COLOR};">${target}</span></div>`; }).join('')}</div>`).join('')}`;
}

function attachFormListeners(tabContent) {
    const form = tabContent.querySelector('form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formType = form.id.split('-')[0];
            const logSheet = formType === 'order' ? 'Order_Log' : 'Inventory_Log';
            const dataToSave = [];
            const orderedItemsForWhatsApp = [];
            const timestamp = new Date().toISOString();

            for (let input of form.querySelectorAll('input[type="number"]')) {
                if (input.value && input.value.trim() !== '' && parseFloat(input.value) > 0) {
                    const quantity = parseFloat(input.value);
                    dataToSave.push([timestamp, currentOutlet, input.dataset.item, quantity]);
                    if (formType === 'order') {
                        orderedItemsForWhatsApp.push({ name: input.dataset.item, quantity: quantity, unit: input.dataset.unit, superCategory: input.dataset.supercategory });
                    }
                }
            }

            if (dataToSave.length > 0) {
                // Save the data first. This is an async operation.
                await postSheetData(logSheet, dataToSave);
                
                // Now, open WhatsApp if it's an order form.
                if (formType === 'order') {
                    const message = generateWhatsAppMessage(orderedItemsForWhatsApp);
                    window.open(`https://wa.me/?text=${message}`, '_blank');
                } else {
                    // For inventory, we can show a confirmation alert.
                    alert('Inventory saved successfully!');
                }

                // Reset the form after all actions are done.
                form.reset();

            } else {
                alert('Please enter a value for at least one item.');
            }
        });
    }
    
    tabContent.querySelectorAll('.back-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabs = document.getElementById('chef-tabs');
            const activeTabButton = tabs.querySelector(`button[style*="${BRAND_COLOR}"]`);
            if (activeTabButton) { activeTabButton.click(); }
        });
    });
}

function initChefView() {
    appContainer.innerHTML = renderOutletSelector();
    const outletSelector = document.getElementById('outlet-select');
    const outletContent = document.getElementById('outlet-content');
    const tabContent = document.getElementById('tab-content');
    const tabs = document.getElementById('chef-tabs');

    outletSelector.addEventListener('change', (e) => {
        currentOutlet = e.target.value;
        if (currentOutlet) { outletContent.classList.remove('hidden'); tabs.querySelector('button[data-tab="order"]').click(); } 
        else { outletContent.classList.add('hidden'); }
    });

    tabs.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            tabs.querySelectorAll('button').forEach(b => { b.style.backgroundColor = 'transparent'; b.style.color = '#6B7280'; b.style.boxShadow = 'none'; });
            e.target.style.backgroundColor = BRAND_COLOR; e.target.style.color = 'white'; e.target.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
            
            const tabName = e.target.dataset.tab;
            if (tabName === 'order' || tabName === 'inventory') {
                tabContent.innerHTML = renderSuperCategorySelector(tabName);
                tabContent.querySelectorAll('button[data-supercategory]').forEach(button => {
                    button.addEventListener('click', () => {
                        const superCat = button.dataset.supercategory;
                        const formType = button.dataset.formtype;
                        const filteredItems = ALL_ITEMS.filter(item => item.SuperCategory === superCat);
                        tabContent.innerHTML = renderForm(filteredItems, formType);
                        attachFormListeners(tabContent);
                    });
                });
            } else if (tabName === 'production') {
                tabContent.innerHTML = renderProductionPlan(PRODUCTION_PLAN, currentOutlet);
            }
            attachFormListeners(tabContent);
        }
    });
}

async function main() {
    appContainer.innerHTML = `<div class="text-center p-10"><p class="text-lg font-semibold">Loading KitchenSync...</p><p class="text-gray-500">Fetching latest data from Google Sheets.</p></div>`;
    try {
        await getSheetData();
        initChefView();
    } catch (error) {
        console.error("Could not initialize the app:", error);
    }
}

main();
