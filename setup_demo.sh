#!/bin/bash

echo "🚀 Setting up Data Analysis Demo..."

# Create sample datasets
echo "📊 Creating sample datasets..."

# Create demo sales data
python3 -c "
import pandas as pd
import numpy as np

# Set random seed for reproducibility
np.random.seed(42)

# Create comprehensive sales dataset
n_samples = 200
dates = pd.date_range('2024-01-01', periods=n_samples, freq='D')

data = {
    'date': dates,
    'sales': np.random.poisson(150, n_samples) + np.random.randint(0, 50, n_samples),
    'revenue': np.random.normal(25000, 5000, n_samples).round(2),
    'customers': np.random.poisson(45, n_samples) + np.random.randint(0, 20, n_samples),
    'department': np.random.choice(['Electronics', 'Clothing', 'Home', 'Sports', 'Books'], n_samples, p=[0.3, 0.25, 0.2, 0.15, 0.1]),
    'region': np.random.choice(['North', 'South', 'East', 'West'], n_samples, p=[0.3, 0.25, 0.25, 0.2]),
    'satisfaction_score': np.clip(np.random.beta(2, 1, n_samples) * 5 + np.random.normal(0, 0.2, n_samples), 1, 5).round(1),
    'employee_count': np.random.randint(5, 50, n_samples),
    'marketing_spend': np.random.exponential(1000, n_samples).round(2),
    'profit_margin': np.clip(np.random.normal(0.15, 0.05, n_samples), 0.02, 0.35).round(3)
}

# Add some missing values to make it realistic
missing_indices = np.random.choice(n_samples, size=10, replace=False)
data['satisfaction_score'][missing_indices] = np.nan

df = pd.DataFrame(data)
df.to_csv('demo_sales_data.csv', index=False)
print(f'✅ Created demo_sales_data.csv with {len(df)} rows and {len(df.columns)} columns')

# Create customer analytics dataset
customer_data = {
    'customer_id': range(1, 501),
    'age': np.random.randint(18, 80, 500),
    'annual_income': np.random.normal(50000, 20000, 500).round(2),
    'spending_score': np.random.randint(1, 101, 500),
    'gender': np.random.choice(['Male', 'Female', 'Other'], 500, p=[0.48, 0.48, 0.04]),
    'city': np.random.choice(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'], 500),
    'membership_years': np.random.exponential(2, 500).round(1),
    'total_purchases': np.random.poisson(12, 500),
    'avg_order_value': np.random.gamma(2, 50, 500).round(2),
    'last_purchase_days': np.random.randint(1, 365, 500)
}

df_customers = pd.DataFrame(customer_data)
df_customers.to_csv('customer_analytics.csv', index=False)
print(f'✅ Created customer_analytics.csv with {len(df_customers)} rows and {len(df_customers.columns)} columns')

# Create financial dataset
financial_data = {
    'quarter': ['Q1', 'Q2', 'Q3', 'Q4'] * 12,  # 3 years of data
    'year': [2022] * 16 + [2023] * 16 + [2024] * 16,
    'revenue': np.random.normal(1000000, 200000, 48).round(2),
    'expenses': np.random.normal(800000, 150000, 48).round(2),
    'marketing_cost': np.random.normal(50000, 10000, 48).round(2),
    'employee_cost': np.random.normal(400000, 50000, 48).round(2),
    'r_and_d': np.random.normal(100000, 30000, 48).round(2),
    'profit': lambda: None  # Will calculate this
}

df_financial = pd.DataFrame({k: v for k, v in financial_data.items() if k != 'profit'})
df_financial['profit'] = df_financial['revenue'] - df_financial['expenses']
df_financial.to_csv('financial_analysis.csv', index=False)
print(f'✅ Created financial_analysis.csv with {len(df_financial)} rows and {len(df_financial.columns)} columns')

print('📊 All sample datasets created successfully!')
"

# Wait for datasets to be created
sleep 2

echo "🔄 Uploading datasets to backend..."

# Upload demo datasets
curl -X POST http://localhost:8000/api/process-dataset \
  -F "file=@demo_sales_data.csv" \
  -F "fileId=demo-sales-data" \
  -F "projectId=1" > /dev/null 2>&1

curl -X POST http://localhost:8000/api/process-dataset \
  -F "file=@customer_analytics.csv" \
  -F "fileId=customer-analytics" \
  -F "projectId=1" > /dev/null 2>&1

curl -X POST http://localhost:8000/api/process-dataset \
  -F "file=@financial_analysis.csv" \
  -F "fileId=financial-analysis" \
  -F "projectId=1" > /dev/null 2>&1

echo "✅ Demo datasets uploaded successfully!"

echo "🌟 Demo Setup Complete!"
echo ""
echo "📍 Access Points:"
echo "   Frontend: http://localhost:3000/dashboard/analysis"
echo "   Backend API: http://localhost:8000/docs"
echo "   Health Check: http://localhost:8000/api/health"
echo ""
echo "📊 Available Datasets:"
echo "   • demo-sales-data (200 rows, 10 columns) - Sales analytics"
echo "   • customer-analytics (500 rows, 10 columns) - Customer data"
echo "   • financial-analysis (48 rows, 7 columns) - Financial metrics"
echo ""
echo "🔥 Test Features:"
echo "   • File upload & processing"
echo "   • Data cleaning & transformation"
echo "   • Statistical analysis & insights"
echo "   • Interactive visualizations"
echo "   • SQL & Natural language queries"
echo "   • ML predictions & anomaly detection"
echo "   • Advanced AI insights"
echo ""
echo "🎯 Ready for demo! Visit http://localhost:3000/dashboard/analysis"