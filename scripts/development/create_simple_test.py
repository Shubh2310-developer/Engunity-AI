#!/usr/bin/env python3
"""
Create a simple test Excel file
"""

import pandas as pd
import numpy as np

# Set random seed for reproducible data
np.random.seed(42)

# Generate 250 rows of sample data
n_rows = 250

data = {
    'Problem_ID': [f'PS{1000 + i}' for i in range(n_rows)],
    'Problem_Title': [f'Problem Statement {i+1}' for i in range(n_rows)],
    'Category': np.random.choice(['Software', 'Hardware', 'AI/ML', 'Blockchain', 'IoT'], n_rows),
    'Difficulty_Level': np.random.choice(['Easy', 'Medium', 'Hard'], n_rows),
    'Expected_Team_Size': np.random.randint(2, 7, n_rows),
    'Funding_Amount': np.random.randint(50000, 500000, n_rows),
    'Duration_Days': np.random.randint(30, 365, n_rows),
    'Priority_Score': np.random.uniform(1, 10, n_rows).round(2),
    'Status': np.random.choice(['Active', 'Under Review', 'Approved', 'Completed'], n_rows),
    'Success_Rate': np.random.uniform(0.3, 0.95, n_rows).round(3),
    'Innovation_Index': np.random.uniform(5, 10, n_rows).round(2),
    'Impact_Score': np.random.uniform(6, 10, n_rows).round(2)
}

# Create DataFrame
df = pd.DataFrame(data)

# Add calculated columns
df['Budget_Per_Day'] = (df['Funding_Amount'] / df['Duration_Days']).round(2)
df['Team_Efficiency'] = (df['Success_Rate'] * df['Expected_Team_Size']).round(2)

# Add some missing values
missing_indices = np.random.choice(df.index, size=int(len(df) * 0.05), replace=False)
df.loc[missing_indices, 'Priority_Score'] = np.nan

print("Creating test Excel file: SIH_PS_2024_test.xlsx")
print(f"Shape: {df.shape}")
print(f"Columns: {list(df.columns)}")

# Save to Excel
df.to_excel('/home/ghost/engunity-ai/SIH_PS_2024_test.xlsx', index=False)

print("✅ Test Excel file created successfully!")
print("\nSample data:")
print(df.head())