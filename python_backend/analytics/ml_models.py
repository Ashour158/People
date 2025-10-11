"""
Machine Learning Models for HR Analytics
Provides predictive analytics and ML capabilities
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, mean_squared_error, classification_report
from sklearn.linear_model import LogisticRegression
from sklearn.cluster import KMeans
import joblib
import logging
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime, timedelta
import warnings

warnings.filterwarnings('ignore')
logger = logging.getLogger(__name__)


class AttritionPredictionModel:
    """
    ML model for predicting employee attrition
    """
    
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_importance = None
        self.is_trained = False
        
    def prepare_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare data for training
        Args:
            df: DataFrame with employee data
        Returns: Prepared DataFrame
        """
        # Handle missing values
        df = df.fillna(df.median())
        
        # Encode categorical variables
        categorical_columns = ['department', 'position', 'education_level', 'marital_status']
        for col in categorical_columns:
            if col in df.columns:
                le = LabelEncoder()
                df[col] = le.fit_transform(df[col].astype(str))
                self.label_encoders[col] = le
        
        # Create features
        df['tenure_years'] = (datetime.now() - pd.to_datetime(df['hire_date'])).dt.days / 365
        df['age'] = (datetime.now() - pd.to_datetime(df['birth_date'])).dt.days / 365
        df['salary_ratio'] = df['salary'] / df['salary'].median()
        
        return df
    
    def train(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Train the attrition prediction model
        Args:
            df: DataFrame with employee data
        Returns: Training results
        """
        try:
            # Prepare data
            df = self.prepare_data(df)
            
            # Define features and target
            feature_columns = [
                'age', 'tenure_years', 'salary', 'salary_ratio',
                'department', 'position', 'education_level',
                'marital_status', 'performance_rating'
            ]
            
            # Filter available columns
            available_features = [col for col in feature_columns if col in df.columns]
            X = df[available_features]
            y = df['attrition'] if 'attrition' in df.columns else df['is_active']
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train model
            self.model.fit(X_train_scaled, y_train)
            
            # Make predictions
            y_pred = self.model.predict(X_test_scaled)
            
            # Calculate metrics
            accuracy = accuracy_score(y_test, y_pred)
            cv_scores = cross_val_score(self.model, X_train_scaled, y_train, cv=5)
            
            # Feature importance
            self.feature_importance = dict(zip(
                available_features,
                self.model.feature_importances_
            ))
            
            self.is_trained = True
            
            return {
                'accuracy': accuracy,
                'cv_mean': cv_scores.mean(),
                'cv_std': cv_scores.std(),
                'feature_importance': self.feature_importance,
                'classification_report': classification_report(y_test, y_pred)
            }
            
        except Exception as e:
            logger.error(f"Error training attrition model: {str(e)}")
            return {'error': str(e)}
    
    def predict(self, employee_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict attrition risk for an employee
        Args:
            employee_data: Employee information
        Returns: Prediction results
        """
        if not self.is_trained:
            return {'error': 'Model not trained'}
        
        try:
            # Prepare single employee data
            df = pd.DataFrame([employee_data])
            df = self.prepare_data(df)
            
            # Get features
            feature_columns = [
                'age', 'tenure_years', 'salary', 'salary_ratio',
                'department', 'position', 'education_level',
                'marital_status', 'performance_rating'
            ]
            
            available_features = [col for col in feature_columns if col in df.columns]
            X = df[available_features]
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Make prediction
            prediction = self.model.predict(X_scaled)[0]
            probability = self.model.predict_proba(X_scaled)[0]
            
            return {
                'prediction': int(prediction),
                'probability': float(probability[1]),  # Probability of attrition
                'risk_level': self._get_risk_level(probability[1])
            }
            
        except Exception as e:
            logger.error(f"Error predicting attrition: {str(e)}")
            return {'error': str(e)}
    
    def _get_risk_level(self, probability: float) -> str:
        """
        Get risk level based on probability
        """
        if probability < 0.3:
            return 'Low'
        elif probability < 0.6:
            return 'Medium'
        else:
            return 'High'
    
    def save_model(self, filepath: str):
        """
        Save trained model
        """
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'label_encoders': self.label_encoders,
            'feature_importance': self.feature_importance
        }, filepath)
    
    def load_model(self, filepath: str):
        """
        Load trained model
        """
        data = joblib.load(filepath)
        self.model = data['model']
        self.scaler = data['scaler']
        self.label_encoders = data['label_encoders']
        self.feature_importance = data['feature_importance']
        self.is_trained = True


class SalaryPredictionModel:
    """
    ML model for predicting salary ranges
    """
    
    def __init__(self):
        self.model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.is_trained = False
        
    def prepare_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare data for training
        """
        # Handle missing values
        df = df.fillna(df.median())
        
        # Encode categorical variables
        categorical_columns = ['department', 'position', 'education_level', 'location']
        for col in categorical_columns:
            if col in df.columns:
                le = LabelEncoder()
                df[col] = le.fit_transform(df[col].astype(str))
                self.label_encoders[col] = le
        
        # Create features
        df['tenure_years'] = (datetime.now() - pd.to_datetime(df['hire_date'])).dt.days / 365
        df['age'] = (datetime.now() - pd.to_datetime(df['birth_date'])).dt.days / 365
        
        return df
    
    def train(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Train the salary prediction model
        """
        try:
            # Prepare data
            df = self.prepare_data(df)
            
            # Define features and target
            feature_columns = [
                'age', 'tenure_years', 'department', 'position',
                'education_level', 'location', 'performance_rating'
            ]
            
            available_features = [col for col in feature_columns if col in df.columns]
            X = df[available_features]
            y = df['salary']
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train model
            self.model.fit(X_train_scaled, y_train)
            
            # Make predictions
            y_pred = self.model.predict(X_test_scaled)
            
            # Calculate metrics
            mse = mean_squared_error(y_test, y_pred)
            rmse = np.sqrt(mse)
            r2 = self.model.score(X_test_scaled, y_test)
            
            self.is_trained = True
            
            return {
                'mse': mse,
                'rmse': rmse,
                'r2': r2
            }
            
        except Exception as e:
            logger.error(f"Error training salary model: {str(e)}")
            return {'error': str(e)}
    
    def predict(self, employee_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict salary for an employee
        """
        if not self.is_trained:
            return {'error': 'Model not trained'}
        
        try:
            # Prepare single employee data
            df = pd.DataFrame([employee_data])
            df = self.prepare_data(df)
            
            # Get features
            feature_columns = [
                'age', 'tenure_years', 'department', 'position',
                'education_level', 'location', 'performance_rating'
            ]
            
            available_features = [col for col in feature_columns if col in df.columns]
            X = df[available_features]
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Make prediction
            prediction = self.model.predict(X_scaled)[0]
            
            return {
                'predicted_salary': float(prediction),
                'confidence': 0.85  # Placeholder confidence score
            }
            
        except Exception as e:
            logger.error(f"Error predicting salary: {str(e)}")
            return {'error': str(e)}


class PerformanceClusteringModel:
    """
    ML model for clustering employees by performance
    """
    
    def __init__(self):
        self.model = KMeans(n_clusters=3, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        self.cluster_labels = ['Low Performer', 'Average Performer', 'High Performer']
        
    def prepare_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare data for clustering
        """
        # Handle missing values
        df = df.fillna(df.median())
        
        # Create performance features
        df['attendance_rate'] = df['days_present'] / df['total_days']
        df['productivity_score'] = df['tasks_completed'] / df['tasks_assigned']
        df['collaboration_score'] = df['team_projects'] / df['total_projects']
        
        return df
    
    def train(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Train the performance clustering model
        """
        try:
            # Prepare data
            df = self.prepare_data(df)
            
            # Define features
            feature_columns = [
                'performance_rating', 'attendance_rate', 'productivity_score',
                'collaboration_score', 'years_experience', 'education_level'
            ]
            
            available_features = [col for col in feature_columns if col in df.columns]
            X = df[available_features]
            
            # Scale features
            X_scaled = self.scaler.fit_transform(X)
            
            # Train model
            self.model.fit(X_scaled)
            
            # Get cluster assignments
            clusters = self.model.predict(X_scaled)
            
            self.is_trained = True
            
            return {
                'n_clusters': self.model.n_clusters,
                'inertia': self.model.inertia_,
                'cluster_centers': self.model.cluster_centers_.tolist()
            }
            
        except Exception as e:
            logger.error(f"Error training clustering model: {str(e)}")
            return {'error': str(e)}
    
    def predict(self, employee_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict performance cluster for an employee
        """
        if not self.is_trained:
            return {'error': 'Model not trained'}
        
        try:
            # Prepare single employee data
            df = pd.DataFrame([employee_data])
            df = self.prepare_data(df)
            
            # Get features
            feature_columns = [
                'performance_rating', 'attendance_rate', 'productivity_score',
                'collaboration_score', 'years_experience', 'education_level'
            ]
            
            available_features = [col for col in feature_columns if col in df.columns]
            X = df[available_features]
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Make prediction
            cluster = self.model.predict(X_scaled)[0]
            
            return {
                'cluster': int(cluster),
                'cluster_label': self.cluster_labels[cluster],
                'distance_to_centers': self.model.transform(X_scaled)[0].tolist()
            }
            
        except Exception as e:
            logger.error(f"Error predicting performance cluster: {str(e)}")
            return {'error': str(e)}


class MLModelManager:
    """
    Manager for all ML models
    """
    
    def __init__(self):
        self.attrition_model = AttritionPredictionModel()
        self.salary_model = SalaryPredictionModel()
        self.performance_model = PerformanceClusteringModel()
        
    def train_all_models(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Train all ML models
        """
        results = {}
        
        # Train attrition model
        attrition_result = self.attrition_model.train(df)
        results['attrition'] = attrition_result
        
        # Train salary model
        salary_result = self.salary_model.train(df)
        results['salary'] = salary_result
        
        # Train performance model
        performance_result = self.performance_model.train(df)
        results['performance'] = performance_result
        
        return results
    
    def get_predictions(self, employee_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get predictions from all models
        """
        predictions = {}
        
        # Get attrition prediction
        attrition_pred = self.attrition_model.predict(employee_data)
        predictions['attrition'] = attrition_pred
        
        # Get salary prediction
        salary_pred = self.salary_model.predict(employee_data)
        predictions['salary'] = salary_pred
        
        # Get performance prediction
        performance_pred = self.performance_model.predict(employee_data)
        predictions['performance'] = performance_pred
        
        return predictions
    
    def save_models(self, base_path: str):
        """
        Save all models
        """
        self.attrition_model.save_model(f"{base_path}/attrition_model.pkl")
        self.salary_model.save_model(f"{base_path}/salary_model.pkl")
        self.performance_model.save_model(f"{base_path}/performance_model.pkl")
    
    def load_models(self, base_path: str):
        """
        Load all models
        """
        self.attrition_model.load_model(f"{base_path}/attrition_model.pkl")
        self.salary_model.load_model(f"{base_path}/salary_model.pkl")
        self.performance_model.load_model(f"{base_path}/performance_model.pkl")
