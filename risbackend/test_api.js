const axios = require('axios');

async function run() {
    try {
        const login = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin',
            password: 'password123'
        });
        const token = login.data.token;
        console.log("Token:", token);

        // Test getStudyMeta
        const studyUID = '1.2.392.200036.9125.2.448818514585232.65119727480.1752217'; // Use one from logs
        const meta = await axios.get(`http://localhost:5000/api/studies/${studyUID}/meta`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("Meta:", meta.data);
    } catch (err) {
        console.error(err.response ? err.response.data : err.message);
    }
}

run();
