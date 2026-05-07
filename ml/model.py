"""
Demand Forecasting Model using Facebook Prophet.
Trains separate Prophet models for each SKU and forecasts next 7 days.
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

try:
    from dotenv import load_dotenv
    # Try to load from multiple possible locations
    load_dotenv(dotenv_path=".env")  # Try root first
    load_dotenv(dotenv_path="backend/.env")  # Then try backend/.env
    load_dotenv(dotenv_path=".env.local")  # Finally try .env.local
except ImportError:
    # dotenv not installed, use environment variables directly
    pass

import pandas as pd
import psycopg2
from prophet import Prophet

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DemandForecastingModel:
    """Demand forecasting model using Facebook Prophet."""

    def __init__(self, database_url: Optional[str] = None):
        """
        Initialize the forecasting model.
        
        Args:
            database_url: PostgreSQL connection string.
                         Defaults to DATABASE_URL environment variable.
        
        Raises:
            ValueError: If DATABASE_URL is not provided or set.
        """
        self.database_url = database_url or os.environ.get('DATABASE_URL')
        
        if not self.database_url:
            raise ValueError(
                "DATABASE_URL environment variable or database_url parameter is required"
            )
        
        self.forecasts: List[Dict[str, Any]] = []

    def fetch_sales_data(self) -> pd.DataFrame:
        """
        Fetch sales data from PostgreSQL.
        
        Returns:
            DataFrame with columns: sku, sale_date, quantity
        
        Raises:
            Exception: If database connection or query fails.
        """
        try:
            logger.info("Connecting to PostgreSQL database...")
            conn = psycopg2.connect(self.database_url)
            
            sql_query = """
        SELECT
        p.sku,
        s.sale_date,
        s.quantity
        FROM sales s
        JOIN products p ON s.product_id = p.id
        WHERE s.is_deleted = FALSE
        ORDER BY p.sku, s.sale_date 
        """
            
            logger.info("Fetching sales data from database...")
            df = pd.read_sql_query(sql_query, conn)
            conn.close()
            
            logger.info(f"Retrieved {len(df)} sales records from {df['sku'].nunique()} unique SKUs")
            
            # Ensure sale_date is datetime
            df['sale_date'] = pd.to_datetime(df['sale_date'])
            
            return df
            
        except psycopg2.DatabaseError as e:
            logger.error(f"Database connection error: {e}")
            raise Exception(f"Failed to connect to database: {str(e)}")
        except Exception as e:
            logger.error(f"Error fetching sales data: {e}")
            raise

    def train_and_forecast(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Train Prophet models for each SKU and forecast next 7 days.
        
        Args:
            df: DataFrame with columns: sku, sale_date, quantity
        
        Returns:
            List of forecasts with format:
            [
                {"sku": "FRT001", "forecast_7_days": 84},
                ...
            ]
        """
        forecasts = []
        skus = df['sku'].unique()
        
        logger.info(f"Training forecasts for {len(skus)} SKUs...")
        
        for sku in skus:
            try:
                sku_data = df[df['sku'] == sku].copy()
                
                # Skip SKUs with less than 7 rows
                if len(sku_data) < 7:
                    logger.warning(
                        f"SKU {sku}: Skipping (only {len(sku_data)} rows, need at least 7)"
                    )
                    continue
                
                logger.info(f"Processing SKU {sku} with {len(sku_data)} records...")
                
                # Prepare data for Prophet (ds, y format)
                prophet_df = pd.DataFrame({
                    'ds': sku_data['sale_date'],
                    'y': sku_data['quantity'].astype(float)
                })
                
                # Sort by date
                prophet_df = prophet_df.sort_values('ds').reset_index(drop=True)
                
                # Train Prophet model
                model = Prophet(
                    yearly_seasonality=False,
                    weekly_seasonality=True,
                    daily_seasonality=False,
                    interval_width=0.95,
                    changepoint_prior_scale=0.05
                )
                
                model.fit(prophet_df)
                
                # Create future dataframe for next 7 days
                future = model.make_future_dataframe(periods=7)
                forecast = model.predict(future)
                
                # Get forecast values for next 7 days
                future_forecast = forecast[forecast['ds'] > prophet_df['ds'].max()]
                
                # Sum forecasted quantity for 7 days
                forecast_7_days = int(future_forecast['yhat'].sum())
                
                result = {
                    'sku': sku,
                    'forecast_7_days': forecast_7_days
                }
                
                forecasts.append(result)
                logger.info(f"SKU {sku}: Forecasted {forecast_7_days} units for next 7 days")
                
            except Exception as e:
                logger.error(f"Error processing SKU {sku}: {e}")
                continue
        
        return forecasts

    def run(self) -> List[Dict[str, Any]]:
        """
        Run the complete forecasting pipeline.
        
        Returns:
            List of forecasts with sku and forecast_7_days.
        """
        try:
            # Fetch sales data
            df = self.fetch_sales_data()
            
            if df.empty:
                logger.warning("No sales data available for forecasting")
                return []
            
            # Train and forecast
            forecasts = self.train_and_forecast(df)
            
            self.forecasts = forecasts
            return forecasts
            
        except Exception as e:
            logger.error(f"Pipeline execution failed: {e}")
            raise

    def to_json(self, pretty: bool = True) -> str:
        """
        Convert forecasts to JSON string.
        
        Args:
            pretty: If True, format with indentation.
        
        Returns:
            JSON string representation of forecasts.
        """
        if pretty:
            return json.dumps(self.forecasts, indent=2)
        return json.dumps(self.forecasts)

    def print_results(self) -> None:
        """Print formatted forecast results to console."""
        if not self.forecasts:
            print("No forecasts generated")
            return
        
        print("\n" + "="*70)
        print("DEMAND FORECASTING RESULTS")
        print("="*70)
        print(json.dumps(self.forecasts, indent=2))
        print("="*70 + "\n")


def main():
    """Main entry point for the forecasting model."""
    try:
        logger.info("Starting demand forecasting model...")
        
        # Initialize model
        model = DemandForecastingModel()
        
        # Run forecasting pipeline
        forecasts = model.run()
        
        # Print formatted results
        model.print_results()
        
        # Optionally, save to file
        if forecasts:
            output_file = 'forecasts.json'
            with open(output_file, 'w') as f:
                f.write(model.to_json(pretty=True))
            logger.info(f"Forecasts saved to {output_file}")
        
        return forecasts
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        raise


if __name__ == "__main__":
    main()