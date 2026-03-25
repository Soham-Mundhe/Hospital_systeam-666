import joblib
import numpy as np

# A very basic dummy model class to simulate predict_proba
class DummyModel:
    def predict_proba(self, X):
        features = X[0]
        # Basic logic to make the result seem somewhat responsive
        age = features[0]
        chronic_diseases = features[2]
        icu_required = features[12]
        complications = features[13]
        
        risk = 0.15 # base risk
        if age > 50:
            risk += 0.15
        if chronic_diseases == 1:
            risk += 0.2
        if icu_required == 1:
            risk += 0.3
        if complications == 1:
            risk += 0.15
            
        risk = min(max(risk, 0.0), 1.0) # Clamp between 0 and 1
        
        # return array matching scikit-learn's predict_proba format [prob_negative, prob_positive]
        return np.array([[1.0 - risk, risk]])

if __name__ == "__main__":
    model = DummyModel()
    joblib.dump(model, "readmission_model.pkl")
    print("Dummy readmission_model.pkl has been created successfully!")
