const fileInput = document.getElementById("fileInput");
const browseButton = document.getElementById("browseButton");
const dropZone = document.getElementById("dropZone");
const imagePreview = document.getElementById("imagePreview");
const previewEmpty = document.getElementById("previewEmpty");
const fileBadge = document.getElementById("fileBadge");
const imageMeta = document.getElementById("imageMeta");
const scanButton = document.getElementById("scanButton");
const feedback = document.getElementById("feedback");
const resultCard = document.getElementById("resultCard");
const apiStatus = document.getElementById("apiStatus");
const demoNotice = document.getElementById("demoNotice");
const openCameraButton = document.getElementById("openCameraButton");
const captureButton = document.getElementById("captureButton");
const cameraWrap = document.getElementById("cameraWrap");
const cameraVideo = document.getElementById("cameraVideo");
const cameraCanvas = document.getElementById("cameraCanvas");

let selectedFile = null;
let previewUrl = null;
let cameraStream = null;

function showFeedback(message, kind = "success") {
  feedback.textContent = message;
  feedback.className = `feedback ${kind}`;
  feedback.hidden = false;
}
function clearFeedback() {
  feedback.hidden = true;
  feedback.textContent = "";
}
function stopCamera() {
  if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
  cameraStream = null;
  cameraVideo.srcObject = null;
  cameraWrap.hidden = true;
  captureButton.disabled = true;
  openCameraButton.textContent = "Open camera";
}
function setSelectedFile(file) {
  clearFeedback();
  if (!file) return;
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    selectedFile = null;
    scanButton.disabled = true;
    showFeedback("Please choose a JPG, PNG, or WEBP image.", "error");
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    selectedFile = null;
    scanButton.disabled = true;
    showFeedback("The image is larger than 8 MB. Please choose a smaller image.", "error");
    return;
  }
  selectedFile = file;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  imagePreview.src = previewUrl;
  imagePreview.hidden = false;
  previewEmpty.hidden = true;
  fileBadge.textContent = "Image selected";
  imageMeta.textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} KB`;
  imageMeta.hidden = false;
  scanButton.disabled = false;
  resultCard.innerHTML = `<div class="result-icon">✓</div><div><h3>Ready to validate</h3><p>Click “Validate image” to check whether the backend can read this image.</p></div>`;
}

browseButton.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("click", event => {
  if (event.target.closest("button")) return;
  fileInput.click();
});
dropZone.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener("change", () => {
  if (fileInput.files && fileInput.files[0]) setSelectedFile(fileInput.files[0]);
});
["dragenter", "dragover"].forEach(type => dropZone.addEventListener(type, event => {
  event.preventDefault();
  dropZone.classList.add("dragging");
}));
["dragleave", "drop"].forEach(type => dropZone.addEventListener(type, event => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
}));
dropZone.addEventListener("drop", event => {
  const file = event.dataTransfer.files && event.dataTransfer.files[0];
  if (file) setSelectedFile(file);
});

openCameraButton.addEventListener("click", async () => {
  if (cameraStream) {
    stopCamera();
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showFeedback("Camera access is not supported here. Use image upload instead. Camera access normally requires HTTPS or localhost.", "error");
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    cameraVideo.srcObject = cameraStream;
    cameraWrap.hidden = false;
    captureButton.disabled = false;
    openCameraButton.textContent = "Close camera";
    clearFeedback();
  } catch (error) {
    showFeedback("Camera access was denied or unavailable. Check browser permissions, or upload an image instead.", "error");
  }
});

captureButton.addEventListener("click", () => {
  if (!cameraStream || !cameraVideo.videoWidth) {
    showFeedback("The camera is not ready yet. Please wait a moment and try again.", "error");
    return;
  }
  cameraCanvas.width = cameraVideo.videoWidth;
  cameraCanvas.height = cameraVideo.videoHeight;
  cameraCanvas.getContext("2d").drawImage(cameraVideo, 0, 0);
  cameraCanvas.toBlob(blob => {
    if (!blob) {
      showFeedback("Could not capture the image. Please try again.", "error");
      return;
    }
    const file = new File([blob], `banknote-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
    setSelectedFile(file);
    stopCamera();
  }, "image/jpeg", 0.92);
});

scanButton.addEventListener("click", async () => {
  if (!selectedFile) return;
  clearFeedback();
  scanButton.disabled = true;
  scanButton.textContent = "Validating…";
  resultCard.innerHTML = `<div class="result-icon">…</div><div><h3>Checking image</h3><p>Sending image to the backend.</p></div>`;
  try {
    const formData = new FormData();
    formData.append("image", selectedFile);
    const response = await fetch("/api/predict", { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok || !data.success) {
      const message = data?.error?.message || "The server could not process this image.";
      showFeedback(message, "error");
      resultCard.innerHTML = `<div class="result-icon">!</div><div><h3>Image could not be processed</h3><p>${escapeHtml(message)}</p></div>`;
      return;
    }
    if (data.mode === "demo") {
      showFeedback("Image passed basic validation. The AI model is not connected yet.", "success");
      resultCard.innerHTML = `<div class="result-icon">✓</div><div><h3>Image is readable</h3><p>${escapeHtml(data.message)} Image dimensions: ${data.image.width} × ${data.image.height}px.</p><p><strong>Prediction:</strong> Not available in demo mode.</p></div>`;
      return;
    }
    const confidence = `${(Number(data.confidence) * 100).toFixed(1)}%`;
    showFeedback("Model prediction received.", "success");
    resultCard.innerHTML = `<div class="result-icon">✓</div><div><h3>Model prediction</h3><p><strong>Class:</strong> ${escapeHtml(String(data.prediction))}</p><p><strong>Confidence:</strong> ${confidence}</p><p>${escapeHtml(data.message || "")}</p></div>`;
  } catch (error) {
    showFeedback("Could not reach the backend. Make sure Flask is running and try again.", "error");
    resultCard.innerHTML = `<div class="result-icon">!</div><div><h3>Connection problem</h3><p>Check that the Flask server is running.</p></div>`;
  } finally {
    scanButton.disabled = !selectedFile;
    scanButton.textContent = "Validate image";
  }
});

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    if (!response.ok) throw new Error("API unavailable");
    apiStatus.classList.add("online");
    apiStatus.classList.remove("offline");
    apiStatus.innerHTML = `<span class="status-dot"></span> API online · ${data.model_mode === "demo" ? "Demo mode" : "Model mode"}`;
    demoNotice.hidden = data.model_mode === "real";
  } catch {
    apiStatus.classList.add("offline");
    apiStatus.innerHTML = `<span class="status-dot"></span> API unavailable`;
  }
}
window.addEventListener("beforeunload", stopCamera);
checkHealth();
