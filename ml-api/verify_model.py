import joblib
import warnings
warnings.filterwarnings('ignore')

try:
    model = joblib.load("readmission_model11.pkl")
    print("SUCCESS: readmission_model.pkl loaded!")
    print(f"Model Algorithm: {type(model).__name__}")
    
    if hasattr(model, 'feature_names_in_'):
        import json
        with open('features.json', 'w') as f:
            json.dump(list(model.feature_names_in_), f, indent=2)
        print("Features dumped to features.json")
    else:
        print("Model does not strictly enforce feature names (likely relies purely on positional array).")
        
    if hasattr(model, 'classes_'):
        print(f"Prediction Classes: {model.classes_}")

except Exception as e:
    print(f"ERROR reading model: {e}")
