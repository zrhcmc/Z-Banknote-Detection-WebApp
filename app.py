import os
import io
from pathlib import Path

from flask import Flask, jsonify, render_template, request
from PIL import Image, ImageFilter, UnidentifiedImageError

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024  # 8 MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_PIXELS = 20_000_000

# This prototype starts in DEMO mode until your teammate provides the trained model.
# Set BANKNOTE_MODEL_MODE=real only after implementing load_model() and predict_with_model().
MODEL_MODE = os.getenv("BANKNOTE_MODEL_MODE", "demo").strip().lower()


def json_error(message, status=400, code="invalid_request"):
    return jsonify({"success": False, "error": {"code": code, "message": message}}), status


def validate_and_open_image(file_storage):
    """Validate uploaded image content rather than trusting its filename or browser MIME type."""
    if not file_storage or not file_storage.filename:
        raise ValueError("Choose an image file first.")

    suffix = Path(file_storage.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported file type. Upload a JPG, JPEG, PNG, or WEBP image.")

    raw = file_storage.read()
    if not raw:
        raise ValueError("The uploaded file is empty.")
    if len(raw) > app.config["MAX_CONTENT_LENGTH"]:
        raise ValueError("Image is too large. Maximum size is 8 MB.")

    try:
        with Image.open(io.BytesIO(raw)) as probe:
            if probe.format not in {"JPEG", "PNG", "WEBP"}:
                raise ValueError("The file contents are not a supported image.")
            if probe.width * probe.height > MAX_IMAGE_PIXELS:
                raise ValueError("Image dimensions are too large. Please use a smaller image.")
            probe.verify()
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise ValueError("The image cannot be read. Try another clear JPG or PNG photo.")

    width, height = image.size
    if width < 100 or height < 100:
        raise ValueError("Image is too small. Use an image at least 100 × 100 pixels.")

    # Lightweight blur warning heuristic; this is not a definitive quality test.
    edges = image.convert("L").filter(ImageFilter.FIND_EDGES)
    edge_stats = edges.getextrema()
    if edge_stats[0] == edge_stats[1]:
        raise ValueError("The image appears blank or unreadable. Take another photo.")

    return image, width, height


def load_model():
    """
    TODO: Load your teammate's trained model here.
    Examples depend on the actual model framework and artifact format.
    Do not guess the framework, input size, preprocessing, or class mapping.
    """
    return None


def predict_with_model(image):
    """
    TODO: Replace this function with real inference after receiving:
      - trained model file and framework/version
      - expected input image size and preprocessing
      - output class order / label mapping
      - confidence-score interpretation
    Return a dict with prediction and confidence.
    """
    raise NotImplementedError("The trained banknote model has not been integrated yet.")


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/health")
def health():
    return jsonify({
        "success": True,
        "status": "ok",
        "model_mode": MODEL_MODE,
        "model_ready": MODEL_MODE == "real",
        "message": "Backend is running."
    })


@app.get("/api/model-info")
def model_info():
    if MODEL_MODE == "real":
        # Replace these placeholders with the exact classes supplied by the model owner.
        return jsonify({
            "success": True,
            "model_name": os.getenv("BANKNOTE_MODEL_NAME", "Banknote model"),
            "mode": "real",
            "classes": [],
            "note": "Populate classes with the trained model's actual output labels."
        })
    return jsonify({
        "success": True,
        "model_name": "Demo placeholder (not trained)",
        "mode": "demo",
        "classes": [],
        "note": "Demo mode validates images only. It does not detect genuine or counterfeit banknotes."
    })


@app.post("/api/predict")
def predict():
    if "image" not in request.files:
        return json_error("Missing file field named 'image'.", 400, "missing_image")

    try:
        image, width, height = validate_and_open_image(request.files["image"])
    except ValueError as exc:
        return json_error(str(exc), 400, "invalid_image")

    if MODEL_MODE != "real":
        return jsonify({
            "success": True,
            "mode": "demo",
            "prediction": None,
            "confidence": None,
            "message": "Image passed basic validation, but the trained model is not connected yet.",
            "image": {"width": width, "height": height},
            "warning": "This is not a banknote authenticity result."
        })

    try:
        result = predict_with_model(image)
    except NotImplementedError:
        return json_error(
            "The model mode is set to real, but model integration is not implemented yet.",
            503,
            "model_not_integrated"
        )
    except Exception:
        app.logger.exception("Model inference failed")
        return json_error("The model could not process this image. Please try another image.", 500, "inference_failed")

    return jsonify({
        "success": True,
        "mode": "real",
        "prediction": result["prediction"],
        "confidence": float(result["confidence"]),
        "message": "Model prediction completed. This result is not a guarantee of authenticity.",
        "image": {"width": width, "height": height}
    })


@app.errorhandler(413)
def too_large(_error):
    return json_error("Image is too large. Maximum upload size is 8 MB.", 413, "file_too_large")


if __name__ == "__main__":
    # For local development only. Use a production WSGI server for deployment.
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=True)
