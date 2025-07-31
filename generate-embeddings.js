#\!/usr/bin/env node

const fs = require('fs');
const http = require('http');

async function generateEmbeddings() {
    try {
        // Read the scripts data
        const scriptsData = fs.readFileSync('scripts_to_embed.json', 'utf8');
        const scripts = JSON.parse(scriptsData.trim());
        
        if (\!scripts || scripts.length === 0) {
            console.log('No scripts found to process');
            return;
        }
        
        console.log(`Found ${scripts.length} scripts to process for embeddings`);
        
        // Call the AI service to generate embeddings
        const postData = JSON.stringify(scripts);
        
        const options = {
            hostname: 'localhost',
            port: 8000,
            path: '/generate-embeddings',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const result = await new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Failed to parse response: ' + data));
                    }
                });
            });
            
            req.on('error', reject);
            req.write(postData);
            req.end();
        });
        
        console.log('\nEmbedding Generation Results:');
        console.log(`Total scripts: ${result.total}`);
        console.log(`Successful: ${result.successful}`);
        console.log(`Failed: ${result.total - result.successful}`);
        
        // Show details for any failures
        const failures = result.results.filter(r => \!r.success);
        if (failures.length > 0) {
            console.log('\nFailed scripts:');
            failures.forEach(f => {
                console.log(`  Script ID ${f.script_id}: ${f.error}`);
            });
        }
        
        console.log('\nEmbedding generation complete\!');
        
    } catch (error) {
        console.error('Error generating embeddings:', error);
        process.exit(1);
    }
}

// Run the embedding generation
generateEmbeddings();
EOF < /dev/null