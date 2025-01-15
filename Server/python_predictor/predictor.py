import pandas as pd
import numpy as np
import os
from sklearn.multioutput import MultiOutputRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import joblib
import argparse

class PrintingPredictor:
    def __init__(self):
        self.model = None
    def load_data(self):
        # Load the CSV files
        current_dir = os.path.dirname(os.path.abspath(__file__))
        estimated_data = pd.read_csv(os.path.join(current_dir, 'estimated_data.csv'))
        actual_data = pd.read_csv(os.path.join(current_dir, 'actual_data.csv'))
        
        # Create input features (X) and target variables (y)
        X = estimated_data[['Material Weight Estimated', 'Printing Time Estimated']].values
        y = actual_data[['Material Weight Actual', 'Printing Time Actual']].values
        
        return X, y
    
    def train_model(self):
        # Load data
        X, y = self.load_data()
        
        # Split the data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Create and train the model
        base_model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.model = MultiOutputRegressor(base_model)
        self.model.fit(X_train, y_train)
        
        # Save the model in the current directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        joblib.dump(self.model, os.path.join(current_dir, 'trained_model.joblib'))
        
        # Calculate and return test score
        score = self.model.score(X_test, y_test)
        return score
    
    def predict(self, estimated_weight, estimated_time):
        if self.model is None:
            try:
                self.model = joblib.load('trained_model.joblib')
            except:
                self.train_model()
        
        # Make prediction
        input_data = np.array([[estimated_weight, estimated_time]])
        prediction = self.model.predict(input_data)
        
        return {
            'actual_weight': prediction[0][0],
            'actual_time': prediction[0][1]
        }

# Usage example
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Predict 3D printing weight and time')
    parser.add_argument('--weight', type=float, required=True, help='Estimated weight')
    parser.add_argument('--time', type=float, required=True, help='Estimated time')
    
    args = parser.parse_args()
    
    predictor = PrintingPredictor()
    prediction = predictor.predict(estimated_weight=args.weight, estimated_time=args.time)
    
    print(f"{prediction['actual_weight']:.2f}")
    print(f"{prediction['actual_time']:.2f}")