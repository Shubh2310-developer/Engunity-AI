#!/bin/bash
# Performance monitoring script for Engunity AI

echo "🔍 Engunity AI Performance Monitor"
echo "==================================="
echo ""

# Memory usage
echo "💾 Memory Usage:"
free -h
echo ""

# Swap usage warning
SWAP_USED=$(free -m | awk 'NR==3{print $3}')
if [ "$SWAP_USED" -gt 500 ]; then
    echo "⚠️  WARNING: High swap usage (${SWAP_USED}MB) - System will be SLOW!"
    echo "💡 Recommendation: Close browser tabs or restart services"
    echo ""
fi

# CPU load
echo "⚙️  CPU Load Average:"
uptime
echo ""

# Process memory usage
echo "📊 Top 10 Memory-Consuming Processes:"
ps aux --sort=-%mem | head -11 | awk '{printf "%-10s %5s %5s %8s %s\n", $1, $3, $4, $6, $11}'
echo ""

# Engunity processes
echo "🚀 Engunity Services:"
for port in 8000 8001 8002 8003 4001 3000; do
    PID=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$PID" ]; then
        MEM=$(ps -p $PID -o %mem= 2>/dev/null | xargs)
        CMD=$(ps -p $PID -o comm= 2>/dev/null)
        echo "   Port $port: $CMD (PID: $PID, MEM: ${MEM}%)"
    else
        echo "   Port $port: Not running"
    fi
done
echo ""

# MongoDB
echo "🗄️  MongoDB:"
if systemctl is-active --quiet mongod; then
    MONGO_PID=$(pgrep mongod)
    if [ -n "$MONGO_PID" ]; then
        MONGO_MEM=$(ps -p $MONGO_PID -o rss= | awk '{print $1/1024 "MB"}')
        echo "   Status: Running (PID: $MONGO_PID, MEM: $MONGO_MEM)"
    fi
else
    echo "   Status: Not running"
fi
echo ""

# Recommendations
if [ "$SWAP_USED" -gt 1000 ]; then
    echo "🔧 URGENT RECOMMENDATIONS:"
    echo "   1. Close Brave browser tabs (using ${SWAP_USED}MB swap)"
    echo "   2. Run: ./stop-all-services.sh && npm run dev"
    echo "   3. Consider: sudo sysctl -w vm.swappiness=10"
fi
