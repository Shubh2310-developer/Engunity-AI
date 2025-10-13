#!/bin/bash

# Memory Monitor for Engunity AI Services
# Automatically manages services based on available memory

echo "💾 Engunity AI Memory Monitor"
echo "=============================="

# Thresholds
CRITICAL_RAM_MB=1000  # Kill optional services if below this
WARNING_RAM_MB=2000   # Show warning if below this

check_memory() {
    AVAILABLE_RAM=$(free -m | awk 'NR==2{print $7}')
    TOTAL_RAM=$(free -m | awk 'NR==2{print $2}')
    USED_PERCENT=$(free | awk 'NR==2{printf "%.0f", ($3/$2) * 100.0}')

    echo ""
    echo "Current RAM Status:"
    echo "  Total: ${TOTAL_RAM}MB"
    echo "  Available: ${AVAILABLE_RAM}MB"
    echo "  Used: ${USED_PERCENT}%"

    if [ "$AVAILABLE_RAM" -lt "$CRITICAL_RAM_MB" ]; then
        echo ""
        echo "🚨 CRITICAL: RAM below ${CRITICAL_RAM_MB}MB!"
        echo "⚠️  Stopping optional services to prevent crash..."

        # Kill optional ML services
        pkill -f "agentic_rag_server.py" 2>/dev/null && echo "   ✅ Stopped Agentic RAG"
        pkill -f "citation_classification_server.py" 2>/dev/null && echo "   ✅ Stopped Citation Classifier"
        pkill -f "hybrid_rag_v3_server.py" 2>/dev/null && echo "   ✅ Stopped Hybrid RAG v3"

        sleep 2
        AVAILABLE_RAM=$(free -m | awk 'NR==2{print $7}')
        echo "   💾 RAM freed. Now available: ${AVAILABLE_RAM}MB"

    elif [ "$AVAILABLE_RAM" -lt "$WARNING_RAM_MB" ]; then
        echo ""
        echo "⚠️  WARNING: RAM below ${WARNING_RAM_MB}MB"
        echo "💡 Consider stopping optional services if performance degrades"
    else
        echo ""
        echo "✅ Memory status: Healthy"
    fi
}

show_service_memory() {
    echo ""
    echo "Service Memory Usage:"
    echo "====================="

    ps aux | grep -E "(python.*main.py|python.*server.py|node.*code-executor)" | grep -v grep | \
    awk '{printf "  %-40s %6s MB  (CPU: %4s%%)\n", substr($11, 1, 40), int($6/1024), $3}' | \
    sort -k2 -rn
}

# Run check
check_memory
show_service_memory

echo ""
echo "💡 Tips:"
echo "   - Run './stop-all-services.sh' to free all memory"
echo "   - Restart with automatic lightweight mode: './start-all-services.sh'"
echo "   - Monitor continuously: watch -n 5 ./monitor-memory.sh"
