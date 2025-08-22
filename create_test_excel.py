#!/usr/bin/env python3
"""
Create a test Excel file to simulate the SIH_PS_2024.xlsx file
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Set random seed for reproducible data
np.random.seed(42)

# Generate sample data that might be in the SIH_PS_2024.xlsx file
data = {
    'Problem_ID': [f'PS{1000 + i}' for i in range(1, 251)],
    'Problem_Title': [
        'AI/ML Solution for Smart City Management',
        'Blockchain-based Supply Chain Optimization',
        'IoT-enabled Healthcare Monitoring System',
        'Renewable Energy Management Platform',
        'Digital Education Platform Development'
    ] * 50,
    'Category': np.random.choice(['Software', 'Hardware', 'AI/ML', 'Blockchain', 'IoT'], 250),
    'Difficulty_Level': np.random.choice(['Easy', 'Medium', 'Hard'], 250),
    'Expected_Team_Size': np.random.randint(2, 7, 250),
    'Funding_Amount': np.random.randint(50000, 500000, 250),
    'Duration_Days': np.random.randint(30, 365, 250),
    'Organization': [
        'Ministry of Electronics and IT',
        'Department of Science and Technology',
        'NITI Aayog',
        'DRDO',
        'ISRO',
        'Railways',
        'Healthcare Ministry',
        'Education Ministry'
    ][:250] * 32,
    'Priority_Score': np.random.uniform(1, 10, 250).round(2),
    'Technology_Stack': np.random.choice([
        'Python, TensorFlow, AWS',
        'React, Node.js, MongoDB',
        'Solidity, Web3, Ethereum',
        'Arduino, Raspberry Pi, IoT',
        'Java, Spring Boot, MySQL'
    ], 250),
    'Submission_Date': [
        datetime.now() - timedelta(days=np.random.randint(0, 30))
        for _ in range(250)
    ],
    'Status': np.random.choice(['Active', 'Under Review', 'Approved', 'Completed'], 250),
    'Budget_Category': np.random.choice(['Low', 'Medium', 'High'], 250),
    'Success_Rate': np.random.uniform(0.3, 0.95, 250).round(3),
    'Innovation_Index': np.random.uniform(5, 10, 250).round(2),
    'Impact_Score': np.random.uniform(6, 10, 250).round(2)
}

# Create DataFrame
df = pd.DataFrame(data)

# Add some calculated columns
df['Budget_Per_Day'] = (df['Funding_Amount'] / df['Duration_Days']).round(2)
df['Team_Efficiency'] = (df['Success_Rate'] * df['Expected_Team_Size']).round(2)
df['ROI_Estimate'] = (df['Impact_Score'] * df['Innovation_Index'] * 1000).round(0)

# Add some missing values to make it realistic
missing_indices = np.random.choice(df.index, size=int(len(df) * 0.05), replace=False)
df.loc[missing_indices, 'Priority_Score'] = np.nan

missing_indices = np.random.choice(df.index, size=int(len(df) * 0.03), replace=False)
df.loc[missing_indices, 'Success_Rate'] = np.nan

print("Creating test Excel file: SIH_PS_2024_test.xlsx")
print(f"Shape: {df.shape}")
print(f"Columns: {list(df.columns)}")

# Save to Excel
df.to_excel('/home/ghost/engunity-ai/SIH_PS_2024_test.xlsx', index=False)

print("✅ Test Excel file created successfully!")
print("\nSample data:")
print(df.head())
print(f"\nData types:")
print(df.dtypes)
print(f"\nMissing values:")
print(df.isnull().sum())