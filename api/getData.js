import { google } from 'googleapis';

export default async function handler(req, res) {
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.VITE_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const SPREADSHEET_ID = process.env.VITE_GOOGLE_SHEET_ID;

        const [itemsRes, dishesRes, productionPlanRes, categoryOrderRes, dishCategoryOrderRes] = await Promise.all([
            // *** CHANGED: Reading one more column (D) for SuperCategory ***
            sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Master_Items!A2:D', 
            }),
            sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Master_Dishes!A2:B',
            }),
            sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Production_Plans!A:E',
            }),
            sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Category_Order!A2:A',
            }),
            sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Dish_Category_Order!A2:A',
            }),
        ]);
        
        // *** CHANGED: Process Items with the new SuperCategory ***
        const items = itemsRes.data.values ? itemsRes.data.values.map(row => ({
            ItemName: row[0],
            Category: row[1],
            Unit: row[2],
            SuperCategory: row[3], // The new field
        })) : [];

        const dishes = dishesRes.data.values ? dishesRes.data.values.map(row => ({
            DishName: row[0], Category: row[1],
        })) : [];

        const planHeaders = productionPlanRes.data.values ? productionPlanRes.data.values[0] : [];
        const planRows = productionPlanRes.data.values ? productionPlanRes.data.values.slice(1) : [];
        const productionPlan = planRows.map(row => {
            let obj = {};
            planHeaders.forEach((header, index) => { obj[header] = row[index]; });
            return obj;
        });

        const categoryOrder = categoryOrderRes.data.values ? categoryOrderRes.data.values.flat() : [];
        const dishCategoryOrder = dishCategoryOrderRes.data.values ? dishCategoryOrderRes.data.values.flat() : [];

        res.status(200).json({
            items, dishes, productionPlan, categoryOrder, dishCategoryOrder,
        });

    } catch (error) {
        console.error('Error in getData:', error);
        res.status(500).json({ error: 'Failed to fetch data from Google Sheet.', details: error.message });
    }
}
