import { google } from 'googleapis';

// This function handles writing data TO the Google Sheet.
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { sheetName, data } = req.body;

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.VITE_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const SPREADSHEET_ID = process.env.VITE_GOOGLE_SHEET_ID;

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A:D`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: data,
            },
        });
        
        res.status(200).json({ success: true, message: 'Data added successfully.' });

    } catch (error) {
        console.error('Error in postData:', error);
        res.status(500).json({ error: 'Failed to post data to Google Sheet.', details: error.message });
    }
}
