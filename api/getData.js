import { google } from 'googleapis';

// This is a serverless function. It runs securely on Vercel's servers.
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

        // Fetch all data in parallel for speed
        const [itemsRes, dishesRes, productionPlanRes, categoryOrderRes] = await Promise.all([
            sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Master_Items!A2:C', // Start from row 2 to skip header
            }),
            sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Master_Dishes!A2:A',
            }),
            sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Production_Plans!A:E',
            }),
            // *** NEW: Fetching the category order ***
            sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Category_Order!A2:A',
            }),
        ]);
        
        // Process Items
        const items = itemsRes.data.values ? itemsRes.data.values.map(row => ({
            ItemName: row[0],
            Category: row[1],
            Unit: row[2],
        })) : [];

        // Process Dishes
        const dishes = dishesRes.data.values ? dishesRes.data.values.map(row => ({
            DishName: row[0],
        })) : [];

        // Process Production Plan
        const planHeaders = productionPlanRes.data.values ? productionPlanRes.data.values[0] : [];
        const planRows = productionPlanRes.data.values ? productionPlanRes.data.values.slice(1) : [];
        const productionPlan = planRows.map(row => {
            let obj = {};
            planHeaders.forEach((header, index) => {
                obj[header] = row[index];
            });
            return obj;
        });

        // *** NEW: Process the category order ***
        const categoryOrder = categoryOrderRes.data.values ? categoryOrderRes.data.values.flat() : [];


        res.status(200).json({
            items,
            dishes,
            productionPlan,
            categoryOrder, // *** NEW: Sending the order to the app ***
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch data from Google Sheet.', details: error.message });
    }
}
