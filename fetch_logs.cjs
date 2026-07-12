const fs = require('fs');

async function fetchLogs() {
  const runsRes = await fetch('https://api.github.com/repos/SaamVR/EcomCMS/actions/runs?per_page=1');
  const runsData = await runsRes.json();
  console.log(runsData);
}

fetchLogs().catch(console.error);
