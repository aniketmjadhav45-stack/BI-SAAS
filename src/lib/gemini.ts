import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export interface ReportComponentConfig {
  type: 'kpi' | 'line' | 'bar' | 'table';
  title: string;
  xAxisColumn?: string; // e.g. "date" or "category"
  yAxisColumn?: string; // e.g. "revenue" or "tickets"
  aggregation?: 'sum' | 'avg' | 'count' | 'none'; // how to combine the y values
  groupBy?: 'day' | 'week' | 'month' | 'none'; // how to group dates, if xAxis is a date
}

export interface ReportConfig {
  title: string;
  components: ReportComponentConfig[];
}

export interface AIResponse {
  responseType: 'clarification' | 'error' | 'report';
  message: string;
  reportConfig?: ReportConfig;
}

const SYSTEM_PROMPT = `
You are Datapulse AI, an expert business intelligence assistant.
Your job is to read a user's plain English request for a data report, look at the available columns in their dataset, and return a JSON configuration that our frontend engine will use to render the report.

CRITICAL RULES:
1. You must ONLY output valid JSON matching the exact schema provided.
2. If the user's request cannot be answered by the available columns (e.g. they ask for marketing data but only sales data exists), set "responseType" to "error" and explain what data IS available in the "message".
3. If the request is too vague to build a meaningful chart, set "responseType" to "clarification" and ask them what metric they want to see in the "message".
4. If you can build the report, set "responseType" to "report", provide a friendly "message", and fill out the "reportConfig".
5. For KPIs, you only need 'yAxisColumn' and 'aggregation'.
6. For Line/Bar charts, you need 'xAxisColumn', 'yAxisColumn', and usually an 'aggregation'. If the x-axis is a date, you can set 'groupBy' to 'day', 'week', or 'month'.

JSON SCHEMA REQUIRED:
{
  "responseType": "clarification" | "error" | "report",
  "message": "User friendly message (e.g. Here is your report... or I don't see that data)",
  "reportConfig": {
    "title": "Overall Report Title",
    "components": [
      {
        "type": "kpi" | "line" | "bar" | "table",
        "title": "Component title",
        "xAxisColumn": "exact_column_name_from_dataset",
        "yAxisColumn": "exact_column_name_from_dataset",
        "aggregation": "sum" | "avg" | "count" | "none",
        "groupBy": "day" | "week" | "month" | "none"
      }
    ]
  }
}
`;

export async function generateReportConfig(userPrompt: string, columns: string[], sampleData: any[]): Promise<AIResponse> {
  if (!ai) throw new Error("Gemini API key is not configured.");

  const prompt = `
USER REQUEST: "${userPrompt}"

AVAILABLE DATASET COLUMNS:
${columns.join(', ')}

SAMPLE DATA (first 3 rows):
${JSON.stringify(sampleData.slice(0, 3), null, 2)}

Return ONLY the JSON object. Do not include markdown formatting or backticks.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || "{}";
    
    try {
      const parsed = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim());
      return parsed as AIResponse;
    } catch (parseError) {
      console.error("Failed to parse Gemini response", responseText);
      throw new Error("AI returned an invalid response format.");
    }

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to communicate with AI.");
  }
}
