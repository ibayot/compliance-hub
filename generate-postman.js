const { execSync } = require('child_process');
const fs = require('fs');
const Converter = require('openapi-to-postmanv2');

console.log('Fetching Swagger from users-service...');
const usersJson = JSON.parse(execSync('curl -s -k -L https://localhost/api/docs/openapi-users.json', { encoding: 'utf8' }));

console.log('Fetching Swagger from ticketing-service...');
const ticketingJson = JSON.parse(execSync('curl -s -k -L https://localhost/api/docs/openapi-ticketing.json', { encoding: 'utf8' }));

console.log('Fetching Swagger from compliance-service...');
const complianceJson = JSON.parse(execSync('curl -s -k -L https://localhost/api/docs/openapi-compliance.json', { encoding: 'utf8' }));

console.log('Merging Swagger definitions...');
const mergedSwagger = {
  openapi: usersJson.openapi,
  info: {
    title: 'Compliance Hub API (All Services)',
    version: usersJson.info.version,
    description: 'Unified API Documentation for Users, Ticketing, and Compliance Services',
  },
  paths: {
    ...usersJson.paths,
    ...ticketingJson.paths,
    ...complianceJson.paths,
  },
  components: {
    schemas: {
      ...usersJson.components?.schemas,
      ...ticketingJson.components?.schemas,
      ...complianceJson.components?.schemas,
    },
    securitySchemes: {
      ...usersJson.components?.securitySchemes,
      ...ticketingJson.components?.securitySchemes,
      ...complianceJson.components?.securitySchemes,
    }
  },
  security: usersJson.security || ticketingJson.security || complianceJson.security,
};

console.log('Converting to Postman Collection...');
Converter.convert({ type: 'json', data: mergedSwagger },
  {
    folderStrategy: 'Tags',
    includeWebhooks: true,
    requestParametersResolution: 'Example',
    exampleParametersResolution: 'Example',
    requestBodyResolution: 'Example',
  }, (err, conversionResult) => {
    if (!conversionResult.result) {
      console.error('Could not convert', conversionResult.reason);
      return;
    }
    const postmanCollection = conversionResult.output[0].data;
    
    // Customize URL variable
    postmanCollection.variable = postmanCollection.variable || [];
    postmanCollection.variable.push({
      key: 'baseUrl',
      value: 'http://localhost/api',
      type: 'string'
    });
    
    // Replace hardcoded URLs with variable
    const str = JSON.stringify(postmanCollection, null, 2).replace(/"https?:\/\/[^/]+/g, '"{{baseUrl}}');

    fs.writeFileSync('ComplianceHub_Postman_Collection.json', str);
    console.log('Successfully created ComplianceHub_Postman_Collection.json!');
  }
);
