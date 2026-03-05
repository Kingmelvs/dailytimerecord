const video = document.getElementById('video');
const status = document.getElementById('status');

// 1. I-load ang mga AI Models (Siguraduhin na may 'models' folder ka)
// Palitan ang '/models' ng 'models/' o './models/'
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

// 3. REGISTER: Send face data to Node.js
document.getElementById('registerBtn').addEventListener('click', async () => {
    const name = document.getElementById('userName').value;
    if (!name) return alert("Please enter a name first!");

    status.innerText = "Capturing face...";
    const detections = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();

    if (detections) {
        try {
            const response = await fetch('http://localhost:3000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    descriptor: Array.from(detections.descriptor)
                })
            });
            const result = await response.json();
            alert(result.message);
            status.innerText = "Registered successfully!";
        } catch (err) {
            console.error("Backend Error:", err);
            alert("Check if your Node.js server is running!");
        }
    } else {
        alert("Face not detected. Try again.");
    }
});

// 4. SCAN (TIME IN/OUT): Verify face against Database
document.getElementById('scanBtn').addEventListener('click', async () => {
    status.innerText = "Scanning...";
    
    const detections = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();

    if (detections) {
        const currentDescriptor = Array.from(detections.descriptor);

        try {
            const response = await fetch('http://localhost:3000/verify-face', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ descriptor: currentDescriptor })
            });

            const result = await response.json();
            
            if (result.success) {
                status.innerText = `Welcome, ${result.name}! Time logged.`;
                alert(`Time In/Out successful for ${result.name}`);
            } else {
                status.innerText = "Face not recognized.";
                alert("Unknown User.");
            }
        } catch (err) {
            alert("Error connecting to server.");
        }
    } else {
        alert("No face detected during scan.");
    }
});