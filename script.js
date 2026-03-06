const video = document.getElementById('video');
const status = document.getElementById('status');

// API URL mula sa Railway
const API_URL = 'https://dailytimerecord-production.up.railway.app';

// 1. I-load ang mga AI Models
Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri('models/'),
    faceapi.nets.faceLandmark68Net.loadFromUri('models/'),
    faceapi.nets.faceRecognitionNet.loadFromUri('models/')
]).then(startVideo)
  .catch(err => {
      console.error("Model Loading Error:", err);
      status.innerText = "Error: Model files not found!";
  });

// 2. Buksan ang Camera
async function startVideo() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user" } 
        });
        video.srcObject = stream;
        status.innerText = "System Ready";
    } catch (err) {
        console.error("Camera Error:", err);
        status.innerText = "Camera Access Denied";
    }
}

// 3. REGISTER: Send face data to Railway
document.getElementById('registerBtn').addEventListener('click', async () => {
    const name = document.getElementById('userName').value;
    if (!name) return alert("Please enter a name first!");

    status.innerText = "Capturing face...";
    const detections = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();

    if (detections) {
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    descriptor: Array.from(detections.descriptor)
                })
            });

            const result = await response.json();
            
            if (response.ok) {
                alert(result.message);
                status.innerText = "Registered successfully!";
            } else {
                // Dito lalabas kung bakit "Error saving to database"
                console.error("Server Error:", result);
                alert(`Server Error: ${result.message}\nDetail: ${result.error || 'Check Railway Logs'}`);
                status.innerText = "Registration Failed.";
            }
        } catch (err) {
            console.error("Network Error:", err);
            alert("Cannot reach Railway server. Is it Online?");
        }
    } else {
        alert("Face not detected. Try again.");
    }
});

// 4. SCAN (TIME IN/OUT): Verify face
document.getElementById('scanBtn').addEventListener('click', async () => {
    status.innerText = "Scanning...";
    const detections = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();

    if (detections) {
        const currentDescriptor = Array.from(detections.descriptor);
        try {
            const response = await fetch(`${API_URL}/verify-face`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ descriptor: currentDescriptor })
            });

            const result = await response.json();
            if (result.success) {
                status.innerText = `Welcome, ${result.name}!`;
                alert(`Time In/Out successful for ${result.name}`);
            } else {
                status.innerText = "Face not recognized.";
                alert(result.message || "Unknown User.");
            }
        } catch (err) {
            alert("Error connecting to Railway.");
        }
    } else {
        alert("No face detected.");
    }
});

// 5. VIEW RECORDS: Search by ID or Name
document.getElementById('viewLogsBtn').addEventListener('click', async () => {
    const identifier = document.getElementById('searchId').value;
    if (!identifier) return alert("Please enter User ID or Name!");

    status.innerText = "Searching...";
    try {
        const response = await fetch(`${API_URL}/logs/${identifier}`);
        const data = await response.json();

        if (response.ok) {
            const table = document.getElementById('logsTable');
            const tbody = document.getElementById('logsBody');
            tbody.innerHTML = "";
            table.style.display = "table";

            data.logs.forEach(log => {
                const dateObj = new Date(log.time);
                const row = `<tr>
                    <td>${dateObj.toLocaleDateString()}</td>
                    <td>${dateObj.toLocaleTimeString()}</td>
                    <td>${log.type}</td>
                </tr>`;
                tbody.innerHTML += row;
            });
            status.innerText = `Logs for ${data.name}`;
        } else {
            alert(data.message || "User not found.");
        }
    } catch (err) {
        alert("Search failed.");
    }
});
