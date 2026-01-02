
const http = require('http');

const data = JSON.stringify({
    name: "elec",
    description: "dfdfdf",
    parentId: "",
    color: "#F97316"
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/debug-echocat',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response body:', body);
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end();
