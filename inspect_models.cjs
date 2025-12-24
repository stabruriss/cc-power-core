
const https = require('https');
const fs = require('fs');

const apiKey = fs.readFileSync('testkey.md', 'utf8').trim().replace(/\.$/, '');

const options = {
    hostname: 'openrouter.ai',
    path: '/api/v1/models',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${apiKey}`
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (!json.data) {
                console.log('No data found');
                return;
            }

            console.log(`Total models: ${json.data.length}`);

            // Check for reasoning related keywords in parameters or architecture
            const reasoningModels = json.data.filter(m => {
                const params = m.supported_parameters || [];
                const arch = m.architecture || {};
                const desc = m.description || '';

                return params.includes('reasoning') ||
                    params.includes('internal_reasoning') ||
                    desc.toLowerCase().includes('reasoning') ||
                    m.id.includes('reasoner');
            });

            console.log('--- POTENTIAL REASONING MODELS ---');
            reasoningModels.slice(0, 10).forEach(m => {
                console.log(`ID: ${m.id}`);
                console.log(`Params: ${m.supported_parameters}`);
                console.log(`Desc: ${m.description}\n`);
            });

            // Check specifically for "tool use" and "vision"
            const toolModels = json.data.filter(m => (m.supported_parameters || []).includes('tools'));
            const visionModels = json.data.filter(m => (m.architecture?.input_modalities || []).includes('image'));

            console.log(`Models with Tools: ${toolModels.length}`);
            console.log(`Models with Vision: ${visionModels.length}`);

        } catch (e) {
            console.error(e);
        }
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.end();
