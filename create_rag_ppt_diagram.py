#!/usr/bin/env python3
"""
Generate Concise RAG Architecture Diagram for PowerPoint
"""

import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

# Set up the figure - 16:9 aspect ratio for PPT
fig, ax = plt.subplots(1, 1, figsize=(16, 9))
ax.set_xlim(0, 16)
ax.set_ylim(0, 9)
ax.axis('off')

# Colors - High contrast for PPT
color_frontend = '#2563EB'  # Strong Blue
color_api = '#7C3AED'       # Strong Purple
color_backend = '#059669'   # Strong Green
color_rag = '#DC2626'       # Strong Red
color_output = '#0891B2'    # Strong Cyan

# Title
title_box = FancyBboxPatch((1, 8.2), 14, 0.6,
                           boxstyle="round,pad=0.05",
                           facecolor='#1F2937',
                           edgecolor='black',
                           linewidth=3)
ax.add_patch(title_box)
ax.text(8, 8.5, 'Hybrid RAG v4.0 Architecture',
        ha='center', va='center', fontsize=24, fontweight='bold', color='white')

# 1. Frontend
y = 7.3
frontend_box = FancyBboxPatch((2, y), 12, 0.8,
                              boxstyle="round,pad=0.08",
                              facecolor=color_frontend,
                              edgecolor='black',
                              linewidth=2.5,
                              alpha=0.9)
ax.add_patch(frontend_box)
ax.text(8, y + 0.4, 'Frontend Q&A Interface (Next.js)',
        ha='center', va='center', fontsize=16, fontweight='bold', color='white')

# Arrow
arrow1 = FancyArrowPatch((8, y), (8, y - 0.5),
                         arrowstyle='->', mutation_scale=40,
                         linewidth=3, color='black')
ax.add_patch(arrow1)

# 2. API
y = 6.4
api_box = FancyBboxPatch((3, y), 10, 0.6,
                         boxstyle="round,pad=0.05",
                         facecolor=color_api,
                         edgecolor='black',
                         linewidth=2.5,
                         alpha=0.9)
ax.add_patch(api_box)
ax.text(8, y + 0.3, 'POST /api/documents/{id}/qa',
        ha='center', va='center', fontsize=14, fontweight='bold',
        color='white', family='monospace')

# Arrow
arrow2 = FancyArrowPatch((8, y), (8, y - 0.5),
                         arrowstyle='->', mutation_scale=40,
                         linewidth=3, color='black')
ax.add_patch(arrow2)

# 3. Backend
y = 5.3
backend_box = FancyBboxPatch((2.5, y), 11, 0.9,
                             boxstyle="round,pad=0.08",
                             facecolor=color_backend,
                             edgecolor='black',
                             linewidth=2.5,
                             alpha=0.9)
ax.add_patch(backend_box)
ax.text(8, y + 0.6, 'Backend Server (FastAPI - Port 8000)',
        ha='center', va='center', fontsize=16, fontweight='bold', color='white')
ax.text(8, y + 0.2, 'MongoDB → Extract Text → Forward to RAG',
        ha='center', va='center', fontsize=12, color='white', style='italic')

# Arrow
arrow3 = FancyArrowPatch((8, y), (8, y - 0.5),
                         arrowstyle='->', mutation_scale=40,
                         linewidth=3, color='black')
ax.add_patch(arrow3)

# 4. RAG Pipeline - Main Box
y_start = 0.8
rag_box = FancyBboxPatch((1, y_start), 14, 3.7,
                         boxstyle="round,pad=0.15",
                         facecolor='#FEF3C7',
                         edgecolor=color_rag,
                         linewidth=4)
ax.add_patch(rag_box)

# RAG Header
ax.text(8, 4.2, 'Hybrid RAG v4 Pipeline (Port 8002)',
        ha='center', va='center', fontsize=18, fontweight='bold', color=color_rag)

# RAG Stages - Side by Side
stages = [
    {
        'num': '1',
        'title': 'Index',
        'items': ['Chunk: 512c', 'BGE Embed', 'ChromaDB'],
        'x': 2,
        'color': '#DBEAFE'
    },
    {
        'num': '2',
        'title': 'Process',
        'items': ['Cache Check', 'Rewrite Query', 'Embed Query'],
        'x': 4.8,
        'color': '#E0E7FF'
    },
    {
        'num': '3',
        'title': 'Retrieve',
        'items': ['Search Top-5', 'Re-rank', 'Select 2-5'],
        'x': 7.6,
        'color': '#D1FAE5'
    },
    {
        'num': '4',
        'title': 'Context',
        'items': ['8K chars max', 'Web fallback', 'Wikipedia'],
        'x': 10.4,
        'color': '#FED7AA'
    },
    {
        'num': '5',
        'title': 'Generate',
        'items': ['Groq LLM', 'Llama 3.3', 'Stream'],
        'x': 2,
        'color': '#FECACA'
    },
    {
        'num': '6',
        'title': 'Post-Process',
        'items': ['Score', 'Clean', 'Cache'],
        'x': 4.8,
        'color': '#E0F2FE'
    }
]

# Draw stages
for idx, stage in enumerate(stages):
    y_pos = 3.3 if idx < 4 else 1.5
    x = stage['x']

    # Box
    box = FancyBboxPatch((x, y_pos), 2.3, 1.2,
                         boxstyle="round,pad=0.08",
                         facecolor=stage['color'],
                         edgecolor='#374151',
                         linewidth=2)
    ax.add_patch(box)

    # Number circle
    circle = plt.Circle((x + 0.3, y_pos + 0.95), 0.18,
                        facecolor='#374151', edgecolor='white', linewidth=2)
    ax.add_patch(circle)
    ax.text(x + 0.3, y_pos + 0.95, stage['num'],
            ha='center', va='center', fontsize=14, fontweight='bold', color='white')

    # Title
    ax.text(x + 1.3, y_pos + 0.95, stage['title'],
            ha='center', va='center', fontsize=13, fontweight='bold')

    # Items
    for i, item in enumerate(stage['items']):
        ax.text(x + 0.15, y_pos + 0.55 - i*0.25, f'• {item}',
                ha='left', va='center', fontsize=10)

# Arrows between stages (horizontal for top row)
for i in range(3):
    x_start = stages[i]['x'] + 2.3
    x_end = stages[i+1]['x']
    arrow = FancyArrowPatch((x_start, 3.9), (x_end, 3.9),
                           arrowstyle='->', mutation_scale=25,
                           linewidth=2.5, color='#374151')
    ax.add_patch(arrow)

# Arrow from stage 4 to 5 (down and left)
arrow_down = FancyArrowPatch((11.65, 3.3), (11.65, 2.5),
                            arrowstyle='->', mutation_scale=25,
                            linewidth=2.5, color='#374151')
ax.add_patch(arrow_down)
arrow_left = FancyArrowPatch((11.65, 2.5), (4.3, 2.5),
                            arrowstyle='->', mutation_scale=25,
                            linewidth=2.5, color='#374151')
ax.add_patch(arrow_left)
arrow_down2 = FancyArrowPatch((4.3, 2.5), (3.15, 2.7),
                             arrowstyle='->', mutation_scale=25,
                             linewidth=2.5, color='#374151')
ax.add_patch(arrow_down2)

# Arrow from stage 5 to 6
arrow56 = FancyArrowPatch((4.3, 2.1), (4.8, 2.1),
                         arrowstyle='->', mutation_scale=25,
                         linewidth=2.5, color='#374151')
ax.add_patch(arrow56)

# Tech labels at bottom of RAG box
ax.text(8, 1.0, 'BGE Embeddings (768d) • ChromaDB • Groq Llama-3.3-70B • Cross-Encoder Re-ranking',
        ha='center', va='center', fontsize=11, style='italic', color='#374151')

# 5. Output
y = 0.2
output_box = FancyBboxPatch((3, y), 10, 0.5,
                            boxstyle="round,pad=0.05",
                            facecolor=color_output,
                            edgecolor='black',
                            linewidth=2.5,
                            alpha=0.9)
ax.add_patch(output_box)
ax.text(8, y + 0.25, '← Stream Answer with Confidence Score',
        ha='center', va='center', fontsize=15, fontweight='bold', color='white')

# Arrow to output
arrow_out = FancyArrowPatch((8, 0.8), (8, 0.75),
                           arrowstyle='->', mutation_scale=40,
                           linewidth=3, color='black')
ax.add_patch(arrow_out)

plt.tight_layout(pad=0.5)
plt.savefig('/home/ghost/engunity-ai/RAG_Architecture_PPT.png',
            dpi=300,
            bbox_inches='tight',
            facecolor='white',
            edgecolor='none')
print("✅ PPT-ready diagram saved to: /home/ghost/engunity-ai/RAG_Architecture_PPT.png")
print("📊 Optimized for PowerPoint presentations (16:9 aspect ratio)")
