const axios = require('axios');

async function run() {
    try {
        const login = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin',
            password: 'password123'
        });
        const token = login.data.token;
        const studyUID = '1.2.392.200036.9125.2.448818514585232.65119727480.1752217';

        console.log("1. Initial GET");
        const meta1 = await axios.get(`http://localhost:5000/api/studies/${studyUID}/meta`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Initial:", meta1.data.data);

        console.log("2. POST Update");
        const update = {
            patientName: "TEST USER",
            patientID: "12345",
            modality: "CR",
            accessionNumber: "ACC123",
            studyDate: "20260117",
            patientSex: "M",
            patientAge: "30Y",
            referringPhysician: "DR REF",
            bodyPart: "CHEST"
        };
        await axios.post(`http://localhost:5000/api/studies/${studyUID}/meta`, update, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Update OK");

        console.log("3. Verify GET");
        const meta2 = await axios.get(`http://localhost:5000/api/studies/${studyUID}/meta`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Verified:", meta2.data.data);

    } catch (err) {
        console.error(err.response ? err.response.data : err.message);
    }
}

run();
