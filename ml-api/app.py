from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import shap

app = Flask(__name__)
# Enable CORS for frontend
CORS(app)

# =========================================
# LOAD MODEL
# =========================================
model = joblib.load("final_readmission_model13.pkl")

# Extract RF from pipeline for SHAP
rf_model = model.named_steps["rf"]
explainer = shap.TreeExplainer(rf_model)

# =========================================
# FEATURE ORDER (IMPORTANT)
# =========================================
feature_names = [
    "age",
    "previous_admissions",
    "chronic_diseases",
    "bmi",
    "number_of_diagnoses",
    "glucose_level",
    "oxygen_saturation",
    "length_of_stay",
    "heart_rate"
]

# =========================================
# HELPER: FEATURE ENGINEERING (SAME AS TRAINING)
# =========================================
def add_engineered_features(data):
    data["age_severity"] = data.get("age", 0) * data.get("number_of_diagnoses", 0)
    data["metabolic_risk"] = int(data.get("glucose_level", 0) > 180 and data.get("bmi", 0) > 30)
    data["respiratory_alert"] = int(data.get("oxygen_saturation", 0) < 90)
    data["high_heart_rate"] = int(data.get("heart_rate", 0) > 100)
    data["long_stay"] = int(data.get("length_of_stay", 0) > 7)
    return data

# =========================================
# HOME
# =========================================
@app.route("/")
def home():
    return "🚀 Readmission Prediction API Running"

# =========================================
# PREDICT
# =========================================
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Add engineered features
        data = add_engineered_features(data)

        # Convert to ordered list
        input_data = [data.get(col, 0) for col in feature_names + [
            "age_severity",
            "metabolic_risk",
            "respiratory_alert",
            "high_heart_rate",
            "long_stay"
        ]]

        input_array = np.array([input_data])

        # =========================================
        # PREDICTION
        # =========================================
        probs = model.predict_proba(input_array)[0]

        low = round(probs[0] * 100, 2)
        mid = round(probs[1] * 100, 2)
        high = round(probs[2] * 100, 2)

        # Final level
        levels = ["Low", "Moderate", "High"]
        final_level = levels[np.argmax(probs)]

        # =========================================
        # SHAP EXPLAINABILITY
        # =========================================
        sv = explainer.shap_values(input_array)
        
        if isinstance(sv, list):
            shap_values = sv[2][0]
        elif len(sv.shape) == 3:
            shap_values = sv[0, :, 2]
        else:
            shap_values = sv[0]

        abs_vals = np.abs(shap_values)
        total = np.sum(abs_vals)

        if total > 0:
            contributions = (abs_vals / total) * 100
        else:
            contributions = np.zeros_like(abs_vals)

        feature_list = feature_names + [
            "age_severity",
            "metabolic_risk",
            "respiratory_alert",
            "high_heart_rate",
            "long_stay"
        ]

        feature_contrib = list(zip(feature_list, contributions))
        feature_contrib = sorted(feature_contrib, key=lambda x: x[1], reverse=True)

        # Map to readable text
        reason_map = {
            "glucose_level": "High glucose",
            "oxygen_saturation": "Low oxygen",
            "previous_admissions": "Previous admissions",
            "length_of_stay": "Long stay",
            "heart_rate": "High heart rate",
            "age": "Older age",
            "metabolic_risk": "Metabolic risk",
            "respiratory_alert": "Respiratory issue"
        }

        top_reasons = []
        for f, p in feature_contrib[:5]:
            top_reasons.append({
                "factor": reason_map.get(f, f),
                "impact": round(p, 2)
            })

        # =========================================
        # RESPONSE
        # =========================================
        return jsonify({
            "risk_distribution": {
                "low": low,
                "moderate": mid,
                "high": high
            },
            "final_prediction": final_level,
            "top_factors": top_reasons
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# =========================================
# RUN
# =========================================
if __name__ == "__main__":
    app.run(debug=True)
