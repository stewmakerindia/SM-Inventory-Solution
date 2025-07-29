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
                orderId: row[2],
                amount: parseFloat(row[3]) || 0,
            }))
            .filter(sale => sale.outlet === outlet); // Filter for the requested outlet immediately

        const baseDate = getStartOfDay(selectedDate);

        // 1. Yesterday's Sales
        const yesterday = new Date(baseDate);
        yesterday.setDate(baseDate.getDate() - 1);
        const yesterdaySales = allSales.filter(sale => getStartOfDay(sale.date).getTime() === yesterday.getTime());
        const yesterdayTotal = yesterdaySales.reduce((sum, sale) => sum + sale.amount, 0);

        // 2. This Week's Sales (Monday - Sunday)
        const dayOfWeek = baseDate.getDay(); // Sunday is 0, Monday is 1...
        const startOfWeek = new Date(baseDate);
        // If Sunday (0), go back 6 days. Otherwise go back (day-1) days.
        startOfWeek.setDate(baseDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const thisWeekSales = allSales.filter(sale => {
            const saleDate = getStartOfDay(sale.date);
            return saleDate >= startOfWeek && saleDate <= endOfWeek;
        });
        const thisWeekTotal = thisWeekSales.reduce((sum, sale) => sum + sale.amount, 0);

        // 3. This Month's Sales
        const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        const thisMonthSales = allSales.filter(sale => getStartOfDay(sale.date) >= startOfMonth && getStartOfDay(sale.date) <= baseDate);
        const thisMonthTotal = thisMonthSales.reduce((sum, sale) => sum + sale.amount, 0);
        
        res.status(200).json({
            yesterday: { orders: yesterdaySales.length, amount: yesterdayTotal, date: yesterday.toLocaleDateString('en-GB') },
            thisWeek: { orders: thisWeekSales.length, amount: thisWeekTotal, start: startOfWeek.toLocaleDateString('en-GB'), end: endOfWeek.toLocaleDateString('en-GB') },
            thisMonth: { orders: thisMonthSales.length, amount: thisMonthTotal, month: baseDate.toLocaleString('default', { month: 'long' }) },
        });

    } catch (error) {
        console.error('Error in getSalesData:', error);
        res.status(500).json({ error: 'Failed to fetch sales data.', details: error.message });
    }
}
