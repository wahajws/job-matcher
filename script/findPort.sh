#!/bin/bash
# Script to find and kill processes using a specific port
# Usage: ./script/findPort.sh [port] [kill]

PORT=${1:-5000}
KILL=${2:-false}

echo "Checking for processes using port $PORT..."

# Try lsof first (Linux/Mac)
if command -v lsof &> /dev/null; then
    PIDS=$(lsof -ti :$PORT)
    if [ -z "$PIDS" ]; then
        echo "✓ No processes found using port $PORT"
        exit 0
    fi
    
    echo "Found processes using port $PORT:"
    lsof -i :$PORT
    
    if [ "$KILL" = "true" ] || [ "$KILL" = "kill" ]; then
        echo ""
        echo "Killing processes..."
        echo "$PIDS" | xargs kill -9
        echo "✓ Processes killed"
    else
        echo ""
        echo "To kill these processes, run:"
        echo "  ./script/findPort.sh $PORT kill"
        echo "Or manually:"
        echo "  kill -9 $PIDS"
    fi
# Fallback to netstat (Linux)
elif command -v netstat &> /dev/null; then
    PIDS=$(netstat -tulpn 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d'/' -f1 | sort -u)
    if [ -z "$PIDS" ]; then
        echo "✓ No processes found using port $PORT"
        exit 0
    fi
    
    echo "Found processes using port $PORT:"
    netstat -tulpn 2>/dev/null | grep ":$PORT "
    
    if [ "$KILL" = "true" ] || [ "$KILL" = "kill" ]; then
        echo ""
        echo "Killing processes..."
        echo "$PIDS" | xargs kill -9
        echo "✓ Processes killed"
    else
        echo ""
        echo "To kill these processes, run:"
        echo "  ./script/findPort.sh $PORT kill"
        echo "Or manually:"
        echo "  kill -9 $PIDS"
    fi
else
    echo "❌ Neither 'lsof' nor 'netstat' found. Please install one of them."
    echo "Or manually check with:"
    echo "  sudo lsof -i :$PORT"
    echo "  sudo netstat -tulpn | grep $PORT"
    exit 1
fi
