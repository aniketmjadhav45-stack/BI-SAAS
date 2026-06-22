import Papa from 'papaparse';

export interface SheetDataRow {
  date?: string;
  revenue?: number;
  leads?: number;
  tickets?: number;
  attendance?: number;
  [key: string]: any; // Allow other columns
}

export function extractSpreadsheetId(url: string): string | null {
  try {
    // Matches the ID between /d/ and the next / or end of string
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

export async function fetchSheetData(url: string): Promise<SheetDataRow[]> {
  const spreadsheetId = extractSpreadsheetId(url);
  
  if (!spreadsheetId) {
    throw new Error('Invalid Google Sheets URL. Could not extract the Spreadsheet ID.');
  }

  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;

  return new Promise((resolve, reject) => {
    Papa.parse<SheetDataRow>(csvUrl, {
      download: true,
      header: true,
      dynamicTyping: true, // Automatically converts numbers
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          // If the sheet is private, it might return an HTML page which fails parsing
          if (results.errors[0].message.includes('HTML')) {
            reject(new Error('Failed to parse data. Ensure the Google Sheet is set to "Anyone with the link can view".'));
          } else {
            reject(new Error('Error parsing the sheet data.'));
          }
        } else {
          // Normalize column names to lowercase for consistency
          const normalizedData = results.data.map((row: any) => {
            const newRow: any = {};
            for (const key in row) {
              newRow[key.toLowerCase().trim()] = row[key];
            }
            return newRow;
          });
          resolve(normalizedData);
        }
      },
      error: (error) => {
        reject(new Error(`Failed to fetch data: ${error.message}. Make sure the sheet is public.`));
      }
    });
  });
}
