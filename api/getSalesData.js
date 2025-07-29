import { google } from 'googleapis';

// Helper to get the start of a date (removes time)
const getStartOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

export default async function handler(req, res) {
    try {
        const { outlet, selectedDate } = req.query;
        if (!outlet || !selectedDate) {
            return res.status(400).json({ error: 'Outlet and Selected Date are required.' });
        }

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.VITE_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        
        const salesRes = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.VITE_GOOGLE_SHEET_ID,
            range: 'Sales_Log!A2:D',
        });

        const allSales = (salesRes.data.values || [])
            .map(row => ({
                date: new Date(row[0]),
                outlet: row[1],
                // *** CHANGED: We now correctly read OrderID as a number ***
                orderId: parseInt(row[2]) || 0,
                amount: parseFloat(row[3]) || 0,
            }))
            .filter(sale => sale.outlet === outlet);

        const baseDate = getStartOfDay(selectedDate);

        // 1. Yesterday's Sales
        const yesterday = new Date(baseDate);
        yesterday.setDate(baseDate.getDate() - 1);
        const yesterdaySales = allSales.filter(sale => getStartOfDay(sale.date).getTime() === yesterday.getTime());
        // *** CHANGED: Now SUMMING OrderID instead of counting rows ***
        const yesterdayOrders = yesterdaySales.reduce((sum, sale) => sum + sale.orderId, 0);
        const yesterdayTotal = yesterdaySales.reduce((sum, sale) => sum + sale.amount, 0);

        // 2. This Week's Sales (Monday - Selected Date)
        const dayOfWeek = baseDate.getDay();
        const startOfWeek = new Date(baseDate);
        startOfWeek.setDate(baseDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

        // *** CHANGED: The filter now correctly stops at the selected date for "Week-to-Date" ***
        const thisWeekSales = allSales.filter(sale => {
            const saleDate = getStartOfDay(sale.date);
            return saleDate >= startOfWeek && saleDate <= baseDate;
        });
        // *** CHANGED: Now SUMMING OrderID instead of counting rows ***
        const thisWeekOrders = thisWeekSales.reduce((sum, sale) => sum + sale.orderId, 0);
        const thisWeekTotal = thisWeekSales.reduce((sum, sale) => sum + sale.amount, 0);

        // 3. This Month's Sales (Month-to-Date)
        const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        const thisMonthSales = allSales.filter(sale => getStartOfDay(sale.date) >= startOfMonth && getStartOfDay(sale.date) <= baseDate);
        // *** CHANGED: Now SUMMING OrderID instead of counting rows ***
        const thisMonthOrders = thisMonthSales.reduce((sum, sale) => sum + sale.orderId, 0);
        const thisMonthTotal = thisMonthSales.reduce((sum, sale) => sum + sale.amount, 0);
        
        res.status(200).json({
            yesterday: { orders: yesterdayOrders, amount: yesterdayTotal, date: yesterday.toLocaleDateString('en-GB') },
            thisWeek: { orders: thisWeekOrders, amount: thisWeekTotal, start: startOfWeek.toLocaleDateString('en-GB'), end: baseDate.toLocaleDateString('en-GB') },
            thisMonth: { orders: thisMonthOrders, amount: thisMonthTotal, month: baseDate.toLocaleString('default', { month: 'long' }) },
        });

    } catch (error) {
        console.error('Error in getSalesData:', error);
        res.status(500).json({ error: 'Failed to fetch sales data.', details: error.message });
    }
}
