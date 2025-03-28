#!/bin/bash

# Define the default API key location
API_KEY_FILE="$HOME/.deepseek_api_key"

# Function to display usage
show_usage() {
  echo "Usage: ./start.sh [options]"
  echo "Options:"
  echo "  -h, --help         Show this help message"
  echo "  -k, --key KEY      Use the specified API key directly"
  echo "  -f, --file FILE    Read API key from the specified file (default: $API_KEY_FILE)"
  echo "  -p, --port PORT    Specify the port to run the server on (default: 5000)"
  echo "  -d, --debug        Run the server in debug mode"
}

# Default values
PORT=5000
DEBUG=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_usage
      exit 0
      ;;
    -k|--key)
      if [[ -z "$2" ]]; then
        echo "Error: API key value is required after $1"
        exit 1
      fi
      API_KEY="$2"
      shift 2
      ;;
    -f|--file)
      if [[ -z "$2" ]]; then
        echo "Error: File path is required after $1"
        exit 1
      fi
      API_KEY_FILE="$2"
      shift 2
      ;;
    -p|--port)
      if [[ -z "$2" ]]; then
        echo "Error: Port number is required after $1"
        exit 1
      fi
      PORT="$2"
      shift 2
      ;;
    -d|--debug)
      DEBUG=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      show_usage
      exit 1
      ;;
  esac
done

# If API key was not provided directly, try to read it from file
if [[ -z "$API_KEY" ]]; then
  if [[ -f "$API_KEY_FILE" ]]; then
    API_KEY=$(cat "$API_KEY_FILE")
  else
    echo "Error: API key file not found at $API_KEY_FILE"
    echo "Please create this file with your API key, or use the --key option"
    exit 1
  fi
fi

# Check if API key is available
if [[ -z "$API_KEY" ]]; then
  echo "Error: DEEPSEEK_API_KEY is not set"
  echo "Create a file at $API_KEY_FILE with your API key, or use the --key option"
  exit 1
fi

# Set environment variables
export DEEPSEEK_API_KEY="$API_KEY"
export LKEAP_API_KEY="$API_KEY"  # Ensure both environment variables are set for compatibility
export FLASK_APP=app.py
export FLASK_RUN_PORT=$PORT

# Print startup message
echo "Starting InvestmentPro backend..."
echo "DEEPSEEK_API_KEY is set"
echo "Server will run on port $PORT"

# Start the Flask application
if [ "$DEBUG" = true ]; then
  echo "Running in DEBUG mode"
  python app.py
else
  echo "Running in PRODUCTION mode"
  # Use gunicorn if available, otherwise fall back to flask run
  if command -v gunicorn &> /dev/null; then
    gunicorn -b 0.0.0.0:$PORT app:app
  else
    flask run --host=0.0.0.0
  fi
fi 