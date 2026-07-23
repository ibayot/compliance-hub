const ngrok = require('@expo/ngrok');
const fs = require('fs');
const path = require('path');

(async function() {
  try {
    console.log('Starting Ngrok tunnel for API Gateway on port 4000...');
    const url = await ngrok.connect(4000);
    console.log(`Tunnel successfully established at: ${url}`);
    
    // Update api.ts
    const apiPath = path.join(__dirname, 'src', 'services', 'api.ts');
    let apiContent = fs.readFileSync(apiPath, 'utf8');
    
    // Replace the API_URL with the new Ngrok URL
    apiContent = apiContent.replace(
      /export const API_URL = '.*?';/, 
      `export const API_URL = '${url}/api';`
    );
    
    fs.writeFileSync(apiPath, apiContent);
    console.log('Successfully injected Tunnel URL into src/services/api.ts');
    console.log('Leave this terminal open to keep the tunnel alive!');
    
  } catch (err) {
    console.error('Error starting tunnel:', err);
  }
})();
