const XLSX = require('xlsx');
const fs = require('fs');

// Generate Sales Data
const salesData = [];
const today = new Date();
for (let i = 0; i < 30; i++) {
  const d = new Date(today);
  d.setDate(today.getDate() - i);
  salesData.push({
    date: d.toISOString().split('T')[0],
    revenue: Math.floor(Math.random() * 1000) + 500,
    ad_spend: Math.floor(Math.random() * 300) + 100
  });
}
const salesWs = XLSX.utils.json_to_sheet(salesData);
const salesWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(salesWb, salesWs, "Sales");
XLSX.writeFile(salesWb, "test_sales_data.xlsx");

// Generate HR Data
const hrData = [];
for (let i = 0; i < 30; i++) {
  const d = new Date(today);
  d.setDate(today.getDate() - i);
  hrData.push({
    date: d.toISOString().split('T')[0],
    employee_count: 50 + Math.floor(Math.random() * 5),
    absences: Math.floor(Math.random() * 5)
  });
}
const hrWs = XLSX.utils.json_to_sheet(hrData);
const hrWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(hrWb, hrWs, "HR");
XLSX.writeFile(hrWb, "test_hr_data.xlsx");

console.log("Successfully generated test_sales_data.xlsx and test_hr_data.xlsx");
