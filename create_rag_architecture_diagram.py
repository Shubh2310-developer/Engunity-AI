#!/usr/bin/env python3
"""
Generate RAG Architecture Diagram
"""

import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.lines as mlines

# Set up the figure
fig, ax = plt.subplots(1, 1, figsize=(14, 18))
ax.set_xlim(0, 10)
ax.set_ylim(0, 22)
ax.axis('off')

# Colors
color_frontend = '#3B82F6'  # Blue
color_api = '#8B5CF6'       # Purple
color_backend = '#10B981'   # Green
color_rag = '#F59E0B'       # Orange
color_process = '#EC4899'   # Pink
color_output = '#06B6D4'    # Cyan

# Title
ax.text(5, 21, 'Hybrid RAG v4.0 - Document Q&A Architecture',
        ha='center', va='top', fontsize=18, fontweight='bold',
        bbox=dict(boxstyle='round,pad=0.5', facecolor='lightgray', edgecolor='black', linewidth=2))

# 1. Frontend Layer
y_pos = 19
frontend_box = FancyBboxPatch((1, y_pos), 8, 1.2,
                              boxstyle="round,pad=0.1",
                              facecolor=color_frontend,
                              edgecolor='black',
                              linewidth=2,
                              alpha=0.3)
ax.add_patch(frontend_box)
ax.text(5, y_pos + 0.6, 'Frontend Q&A Interface',
        ha='center', va='center', fontsize=12, fontweight='bold')
ax.text(5, y_pos + 0.2, 'React + Next.js | Port 3000',
        ha='center', va='center', fontsize=9, style='italic')

# Arrow down
arrow1 = FancyArrowPatch((5, y_pos), (5, y_pos - 0.8),
                         arrowstyle='->', mutation_scale=30,
                         linewidth=2, color='black')
ax.add_patch(arrow1)
ax.text(5.5, y_pos - 0.4, 'POST', ha='left', va='center', fontsize=8, style='italic')

# 2. API Endpoint
y_pos = 17.2
api_box = FancyBboxPatch((2, y_pos), 6, 0.8,
                         boxstyle="round,pad=0.05",
                         facecolor=color_api,
                         edgecolor='black',
                         linewidth=2,
                         alpha=0.3)
ax.add_patch(api_box)
ax.text(5, y_pos + 0.4, 'POST /api/documents/{id}/qa',
        ha='center', va='center', fontsize=11, fontweight='bold', family='monospace')

# Arrow down
arrow2 = FancyArrowPatch((5, y_pos), (5, y_pos - 0.8),
                         arrowstyle='->', mutation_scale=30,
                         linewidth=2, color='black')
ax.add_patch(arrow2)

# 3. Backend Main Server
y_pos = 15.4
backend_box = FancyBboxPatch((1, y_pos), 8, 1.5,
                             boxstyle="round,pad=0.1",
                             facecolor=color_backend,
                             edgecolor='black',
                             linewidth=2,
                             alpha=0.3)
ax.add_patch(backend_box)
ax.text(5, y_pos + 1.1, 'Backend Main Server (FastAPI)',
        ha='center', va='center', fontsize=12, fontweight='bold')
ax.text(5, y_pos + 0.7, 'Port 8000',
        ha='center', va='center', fontsize=10, style='italic')
ax.text(5, y_pos + 0.3, '• Fetch document from MongoDB',
        ha='center', va='center', fontsize=9)
ax.text(5, y_pos + 0.0, '• Extract text content',
        ha='center', va='center', fontsize=9)

# Arrow down
arrow3 = FancyArrowPatch((5, y_pos), (5, y_pos - 0.8),
                         arrowstyle='->', mutation_scale=30,
                         linewidth=2, color='black')
ax.add_patch(arrow3)
ax.text(5.5, y_pos - 0.4, 'Forward', ha='left', va='center', fontsize=8, style='italic')

# 4. RAG Server Header
y_pos = 13.6
rag_header = FancyBboxPatch((0.5, y_pos), 9, 0.8,
                            boxstyle="round,pad=0.05",
                            facecolor=color_rag,
                            edgecolor='black',
                            linewidth=2,
                            alpha=0.4)
ax.add_patch(rag_header)
ax.text(5, y_pos + 0.4, 'Hybrid RAG v4 Server - Port 8002',
        ha='center', va='center', fontsize=12, fontweight='bold', color='white')

# Main RAG Pipeline Box
y_start = 2.5
rag_main_box = FancyBboxPatch((0.8, y_start), 8.4, 10.5,
                              boxstyle="round,pad=0.15",
                              facecolor='#FFF7ED',
                              edgecolor='black',
                              linewidth=3,
                              alpha=0.9)
ax.add_patch(rag_main_box)

# Pipeline stages
stages = [
    {
        'title': '1. Document Indexing',
        'items': [
            'Chunk: 512 chars, 100 overlap',
            'Embed: BGE-base-en-v1.5',
            'Store: ChromaDB (768-dim)'
        ],
        'y': 11.8
    },
    {
        'title': '2. Query Processing',
        'items': [
            'Cache check (1000 queries)',
            'Query rewrite if vague',
            'Generate query embedding'
        ],
        'y': 10.0
    },
    {
        'title': '3. Retrieval',
        'items': [
            'Search ChromaDB (top 5)',
            'Re-rank with cross-encoder',
            'Dynamic: 2-5 chunks selected',
            'Similarity threshold: 0.75'
        ],
        'y': 7.8
    },
    {
        'title': '4. Context Building',
        'items': [
            'Max context: 8000 chars',
            'Web fallback if score < 0.70',
            'Wikipedia integration'
        ],
        'y': 5.9
    },
    {
        'title': '5. Answer Generation',
        'items': [
            'LLM: Groq Llama-3.3-70B',
            'Temperature: 0.5',
            'Max tokens: 1024',
            'Streaming support enabled'
        ],
        'y': 4.0
    },
    {
        'title': '6. Post-Processing',
        'items': [
            'Answer relevance scoring',
            'Confidence calculation',
            'Response cleaning',
            'Cache result'
        ],
        'y': 2.1
    }
]

# Draw each stage
colors_stages = ['#DBEAFE', '#E0E7FF', '#D1FAE5', '#FEF3C7', '#FECACA', '#E0F2FE']
for idx, stage in enumerate(stages):
    y = stage['y']

    # Stage box
    stage_box = FancyBboxPatch((1.2, y - 0.2), 7.6, len(stage['items']) * 0.3 + 0.7,
                               boxstyle="round,pad=0.08",
                               facecolor=colors_stages[idx],
                               edgecolor='#374151',
                               linewidth=1.5)
    ax.add_patch(stage_box)

    # Title
    ax.text(1.5, y + len(stage['items']) * 0.3 + 0.3, stage['title'],
            ha='left', va='center', fontsize=10, fontweight='bold')

    # Items
    for i, item in enumerate(stage['items']):
        ax.text(1.8, y + (len(stage['items']) - i - 1) * 0.3, f'• {item}',
                ha='left', va='center', fontsize=8)

    # Arrow between stages (except last one)
    if idx < len(stages) - 1:
        arrow_y_start = y - 0.2
        arrow_y_end = stages[idx + 1]['y'] + stages[idx + 1]['items'].__len__() * 0.3 + 0.5
        arrow = FancyArrowPatch((5, arrow_y_start), (5, arrow_y_end),
                               arrowstyle='->', mutation_scale=20,
                               linewidth=2, color='#374151')
        ax.add_patch(arrow)

# 5. Output Arrow
output_arrow = FancyArrowPatch((5, 1.5), (5, 0.3),
                              arrowstyle='->', mutation_scale=30,
                              linewidth=3, color='black')
ax.add_patch(output_arrow)

# 6. Output Box
output_box = FancyBboxPatch((1.5, -0.8), 7, 1.0,
                            boxstyle="round,pad=0.1",
                            facecolor=color_output,
                            edgecolor='black',
                            linewidth=2,
                            alpha=0.3)
ax.add_patch(output_box)
ax.text(5, 0.2, 'Stream Answer Back to Frontend',
        ha='center', va='center', fontsize=12, fontweight='bold')
ax.text(5, -0.2, 'Real-time streaming response with confidence scores',
        ha='center', va='center', fontsize=9, style='italic')

# Legend
legend_y = -1.5
ax.text(1, legend_y, '🔧 Key Technologies:', fontsize=10, fontweight='bold')
ax.text(1, legend_y - 0.3, '• Embeddings: BAAI/bge-base-en-v1.5 (768-dim)', fontsize=8)
ax.text(1, legend_y - 0.5, '• Vector DB: ChromaDB', fontsize=8)
ax.text(1, legend_y - 0.7, '• LLM: Groq Llama-3.3-70B', fontsize=8)
ax.text(5.5, legend_y - 0.3, '• Re-ranking: Cross-encoder', fontsize=8)
ax.text(5.5, legend_y - 0.5, '• Fallback: Wikipedia API', fontsize=8)
ax.text(5.5, legend_y - 0.7, '• Storage: MongoDB + ChromaDB', fontsize=8)

# Footer
ax.text(5, -2.3, 'Engunity AI - Hybrid RAG v4.0 Architecture',
        ha='center', va='center', fontsize=9, style='italic', color='gray')

plt.tight_layout()
plt.savefig('/home/ghost/engunity-ai/RAG_Architecture_Diagram.png',
            dpi=300,
            bbox_inches='tight',
            facecolor='white',
            edgecolor='none')
print("✅ Architecture diagram saved to: /home/ghost/engunity-ai/RAG_Architecture_Diagram.png")
