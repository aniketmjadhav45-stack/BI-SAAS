const XLSX = require('xlsx');

const data = [];
const today = new Date();
const channels = ["Google Search", "Facebook Ads", "LinkedIn", "Organic", "Direct"];

for (let i = 0; i < 50; i++) {
  const d = new Date(today);
  d.setDate(today.getDate() - i);
  
  data.push({
    date: d.toISOString().split('T')[0],
    channel: channels[Math.floor(Math.random() * channels.length)],
    conversions: Math.floor(Math.random() * 50) + 5,
    spend: Math.floor(Math.random() * 500) + 50
  });
}

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Marketing");
XLSX.writeFile(wb, "test_marketing_data.xlsx");

console.log("Successfully generated test_marketing_data.xlsx");
