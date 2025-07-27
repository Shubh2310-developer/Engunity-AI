import csv
import random
import os

# Path to the original large CSV file
input_file = "/home/ghost/engunity-ai/backend/data/training/kaggle_cs_dataset/train_original.csv"
output_file = "/home/ghost/engunity-ai/backend/data/training/kaggle_cs_dataset/train_reduced.csv"

# Define your target size reduction ratio (e.g., 50%)
reduction_ratio = 0.5  # Keep 50% of the rows

print("Processing and sampling rows...")

# Set random seed for reproducibility
random.seed(42)

# Count total lines first
total_lines = 0
with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
    total_lines = sum(1 for line in f)

print(f"Total lines: {total_lines}")
target_lines = int(total_lines * reduction_ratio)
print(f"Target lines: {target_lines}")

# Create a set of random line numbers to keep
lines_to_keep = set(random.sample(range(1, total_lines), target_lines - 1))  # -1 for header
lines_to_keep.add(0)  # Always keep header

# Write sampled data
with open(input_file, 'r', encoding='utf-8', errors='ignore') as infile:
    with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
        for line_num, line in enumerate(infile):
            if line_num in lines_to_keep:
                outfile.write(line)

print(f"Reduced file saved as: {output_file}")
print(f"Original rows kept: ~{int(reduction_ratio * 100)}%")

# Check file sizes
input_size = os.path.getsize(input_file) / (1024**3)  # GB
output_size = os.path.getsize(output_file) / (1024**3)  # GB
print(f"Original file size: {input_size:.2f} GB")
print(f"Reduced file size: {output_size:.2f} GB")
 