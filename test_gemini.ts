import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

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
  "message": "User friendly message",
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

const columns = ["Date", "Revenue", "Tickets", "Attendance", "Product Category"];
const sampleData = [
  { "Date": "2024-01-01", "Revenue": "500", "Tickets": "2", "Attendance": "45", "Product Category": "Software" },
  { "Date": "2024-01-02", "Revenue": "600", "Tickets": "1", "Attendance": "48", "Product Category": "Hardware" },
];

async function testPrompt(userPrompt: string) {
  console.log(`\n\n--- TESTING: "${userPrompt}" ---`);
  const prompt = `USER REQUEST: "${userPrompt}"\nAVAILABLE DATASET COLUMNS:\n${columns.join(', ')}\nSAMPLE DATA:\n${JSON.stringify(sampleData, null, 2)}\nReturn ONLY the JSON object.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { 
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.1, 
      responseMimeType: "application/json" 
    }
  });

  const parsed = JSON.parse(response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || "{}");
  console.log(JSON.stringify(parsed, null, 2));
}

async function runAll() {
  await testPrompt("Show me a sales report for the last 3 months");
  await testPrompt("I want to see revenue broken down by product");
  await testPrompt("How many support tickets did we get?");
  await testPrompt("Show me attendance trends");
  await testPrompt("Show me a chart");
  await testPrompt("Show me marketing campaign performance");
}

runAll();
