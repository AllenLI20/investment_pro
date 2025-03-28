#!/bin/bash

# Function to display usage
show_usage() {
  echo "Usage: ./start.sh [options]"
  echo "Options:"
  echo "  -h, --help               Show this help message"
  echo "  -p, --port PORT          Specify the port to run the server on (default: 3000)"
  echo "  -d, --dev                Run in development mode"
  echo "  -b, --backend URL        Specify the backend API URL (default: http://127.0.0.1:5000)"
  echo "  -i, --install            Install dependencies before starting"
  echo "  -P, --production         Build and serve production version"
}

# Default values
PORT=3000
MODE="development"
BACKEND_URL="http://127.0.0.1:5000"
INSTALL_DEPS=false
PRODUCTION=false
APP_DIR="my-app"  # The subdirectory containing the React app

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_usage
      exit 0
      ;;
    -p|--port)
      if [[ -z "$2" ]]; then
        echo "Error: Port number is required after $1"
        exit 1
      fi
      PORT="$2"
      shift 2
      ;;
    -d|--dev)
      MODE="development"
      shift
      ;;
    -b|--backend)
      if [[ -z "$2" ]]; then
        echo "Error: Backend URL is required after $1"
        exit 1
      fi
      BACKEND_URL="$2"
      shift 2
      ;;
    -i|--install)
      INSTALL_DEPS=true
      shift
      ;;
    -P|--production)
      PRODUCTION=true
      MODE="production"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      show_usage
      exit 1
      ;;
  esac
done

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed. Please install Node.js first."
  exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo "Error: npm is not installed. Please install npm first."
  exit 1
fi

# Navigate to the React app directory
cd "$APP_DIR" || { echo "Error: Could not find directory $APP_DIR"; exit 1; }

# Install dependencies if requested
if [ "$INSTALL_DEPS" = true ]; then
  echo "Installing dependencies..."
  npm install
fi

# Set environment variables
export REACT_APP_BACKEND_URL="$BACKEND_URL"
export PORT="$PORT"

# Print startup message
echo "Starting InvestmentPro frontend..."
echo "Backend API URL: $BACKEND_URL"
echo "Frontend will run on port $PORT"
echo "Mode: $MODE"

# Start the application
if [ "$PRODUCTION" = true ]; then
  echo "Building production version..."
  npm run build
  
  # Check if serve is installed
  if ! command -v serve &> /dev/null; then
    echo "Installing serve package..."
    npm install -g serve
  fi
  
  echo "Serving production build..."
  serve -s build -l $PORT
else
  echo "Starting development server..."
  npm start
fi 