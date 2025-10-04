# Opal AI Agent Service Docker Container
# =====================================
# 
# This Docker container packages your AI agents for Opal integration
# and provides a scalable, production-ready deployment.

FROM python:3.10-slim

LABEL maintainer="Engunity AI Team"
LABEL description="AI Agents for Opal Integration"
LABEL version="1.0.0"

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash engunity
USER engunity
WORKDIR /home/engunity/app

# Copy requirements first for better caching
COPY --chown=engunity:engunity opal_requirements.txt .

# Install Python dependencies
RUN pip install --user --no-cache-dir -r opal_requirements.txt

# Copy application code
COPY --chown=engunity:engunity . .

# Set Python path
ENV PYTHONPATH=/home/engunity/app
ENV PATH=/home/engunity/.local/bin:$PATH

# Environment variables for production
ENV OPAL_MODE=production
ENV PYTHONUNBUFFERED=1
ENV WORKERS=1

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Expose port
EXPOSE 8001

# Run the application
CMD ["python", "-m", "uvicorn", "opal_agent_wrapper:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]