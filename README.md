# Banknote-Detection Web App Prototype

A Flask + HTML/CSS/JavaScript foundation for the project **Computer Vision for Philippine Banknote Anomaly Detection**.

## Current status

This starter project runs in **demo mode**. It provides a responsive interface, camera capture, file upload, image validation, and JSON API endpoints. It does **not** classify banknotes or determine whether a banknote is genuine/counterfeit until the team's trained model is integrated.

## Folder structure

```text
Banknote-Detection/
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
├── templates/
│   └── index.html
└── static/
    ├── style.css
    └── script.js
```

If adding this to the existing team repository, keep the team's existing dataset and training files. Coordinate with the team before moving or renaming files.

## Run locally (Windows)

1. Install Python 3.10 or newer.
2. Open this folder in VS Code.
3. Open Terminal in VS Code.
4. Create and activate a virtual environment:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

   If PowerShell blocks activation, you can use Command Prompt instead:

   ```bat
   .venv\Scripts\activate.bat
   ```

5. Install dependencies:

   ```powershell
   python -m pip install -r requirements.txt
   ```

6. Start the app:

   ```powershell
   python app.py
   ```

7. Open <http://127.0.0.1:5000> in your browser.

Camera access is generally available on localhost during development. A deployed site must use HTTPS for browser camera access.

## API endpoints

### `GET /api/health`

Checks whether the backend is running.

Example response:

```json
{
  "success": true,
  "status": "ok",
  "model_mode": "demo",
  "model_ready": false,
  "message": "Backend is running."
}
```

### `GET /api/model-info`

Returns the current model status and class metadata. In demo mode, it explicitly states that the trained model is not connected.

### `POST /api/predict`

Send a `multipart/form-data` request with a file field named `image`.

Example using curl:

```bash
curl -X POST http://127.0.0.1:5000/api/predict \
  -F "image=@sample-banknote.jpg"
```

Example demo response:

```json
{
  "success": true,
  "mode": "demo",
  "prediction": null,
  "confidence": null,
  "message": "Image passed basic validation, but the trained model is not connected yet.",
  "image": {
    "width": 1200,
    "height": 600
  },
  "warning": "This is not a banknote authenticity result."
}
```

The dimensions above are illustrative. Actual values depend on the uploaded image.

Example validation error:

```json
{
  "success": false,
  "error": {
    "code": "invalid_image",
    "message": "Unsupported file type. Upload a JPG, JPEG, PNG, or WEBP image."
  }
}
```

Typical HTTP status codes:
- `200`: request processed
- `400`: missing or invalid image
- `413`: file exceeds the upload limit
- `503`: model integration not implemented
- `500`: unexpected inference error

## Image validation

The backend checks:
- file extension and actual image format
- empty files
- a maximum upload size of 8 MB
- maximum pixel dimensions
- minimum image dimensions of 100 × 100 pixels
- whether the image can be decoded

This is basic file/readability validation, not a guarantee that the photo is sharp or suitable for model inference. The browser camera requests permission and uses the rear-facing camera when available.

## Integrate the trained model

Coordinate with the teammate responsible for training. Ask for:
1. The trained artifact and framework (e.g. PyTorch, TensorFlow/Keras, ONNX).
2. Framework/library versions.
3. Expected input image size, color order, normalization, and preprocessing.
4. Exact output class order and human-readable label mapping.
5. How confidence values are calculated and interpreted.
6. A small test image and expected output for a smoke test.

Then:

1. Add model-specific dependencies to `requirements.txt`.
2. Implement `load_model()` in `app.py` or a separate module.
3. Implement `predict_with_model(image)` using the exact preprocessing used during training.
4. Return `{"prediction": "<actual label>", "confidence": 0.0_to_1.0}`.
5. Populate `/api/model-info` with the real model name and actual classes.
6. Test known examples and failure cases.
7. Only then set `BANKNOTE_MODEL_MODE=real`.

For local PowerShell, set the variable for the current terminal session:

```powershell
$env:BANKNOTE_MODEL_MODE = "real"
python app.py
```

**Important:** Merely setting the environment variable does not implement the model. The placeholder function must be replaced first. Do not invent class names or label a note as genuine/counterfeit unless those are the model's supported output classes.

## Deployment

For a simple single-service deployment, Flask serves the frontend and API together.

- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app`
- Set `BANKNOTE_MODEL_MODE=demo` initially.
- Use HTTPS to enable browser camera access.
- Add model-specific dependencies and a secure way to provide the model artifact if required.
- Check free-hosting memory, storage, sleeping, and request-time limits before choosing a host.

Do not commit private credentials, large datasets, or model files to a public repository. The existing team repository may be private; confirm its access and visibility before adding files.

## Prototype checklist

- [ ] Frontend loads on desktop and mobile
- [ ] Image upload works
- [ ] Camera opens and captures an image
- [ ] Invalid files show clear messages
- [ ] `GET /api/health` works
- [ ] `GET /api/model-info` works
- [ ] `POST /api/predict` validates images
- [ ] README includes endpoints and example payloads/responses
- [ ] Trained model integration is completed and tested
- [ ] Deployed app works over HTTPS

## Disclaimer

This is an academic research prototype, not an official banknote authentication service. Predictions should not be treated as conclusive proof of authenticity.
