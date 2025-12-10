#!/bin/bash

# Load Test Runner for The Mail Quest
#
# Usage:
#   ./run-load-tests.sh baseline     # Run single room baseline test
#   ./run-load-tests.sh scaling      # Run scaling test (1-5 rooms)
#   ./run-load-tests.sh all          # Run all tests
#
# Prerequisites:
#   - k6 installed (brew install k6)
#   - Server built (npm run build)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOAD_TESTS_DIR="$PROJECT_DIR/load-tests"
RESULTS_DIR="$LOAD_TESTS_DIR/results"

# Default configuration
PORT=${PORT:-4173}
BASE_URL="http://localhost:$PORT"
WS_URL="ws://localhost:$PORT/ws"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if k6 is installed
check_k6() {
    if ! command -v k6 &> /dev/null; then
        log_error "k6 is not installed. Install it with: brew install k6"
        exit 1
    fi
    log_info "k6 version: $(k6 version)"
}

# Check if server is running
check_server() {
    log_info "Checking if server is running at $BASE_URL..."
    if curl -s "$BASE_URL" > /dev/null; then
        log_info "Server is running"
        return 0
    else
        log_warn "Server is not running"
        return 1
    fi
}

# Start server if not running
start_server() {
    log_info "Starting server..."
    cd "$PROJECT_DIR"

    # Check if build exists
    if [ ! -d "build" ]; then
        log_info "Build not found, running npm run build..."
        npm run build
    fi

    # Start server in background
    NODE_ENV=test node server.js &
    SERVER_PID=$!
    echo $SERVER_PID > "$RESULTS_DIR/.server_pid"

    # Wait for server to be ready
    log_info "Waiting for server to start..."
    for i in {1..30}; do
        if curl -s "$BASE_URL" > /dev/null; then
            log_info "Server started (PID: $SERVER_PID)"
            return 0
        fi
        sleep 1
    done

    log_error "Server failed to start"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
}

# Stop server
stop_server() {
    if [ -f "$RESULTS_DIR/.server_pid" ]; then
        PID=$(cat "$RESULTS_DIR/.server_pid")
        if kill -0 $PID 2>/dev/null; then
            log_info "Stopping server (PID: $PID)..."
            kill $PID
            rm "$RESULTS_DIR/.server_pid"
        fi
    fi
}

# Run a specific test scenario
run_scenario() {
    local scenario=$1
    local scenario_file="$LOAD_TESTS_DIR/scenarios/${scenario}.js"

    if [ ! -f "$scenario_file" ]; then
        log_error "Scenario not found: $scenario_file"
        exit 1
    fi

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local result_file="$RESULTS_DIR/${scenario}_${timestamp}.json"

    log_info "Running scenario: $scenario"
    log_info "Results will be saved to: $result_file"

    k6 run \
        --env BASE_URL="$BASE_URL" \
        --env WS_URL="$WS_URL" \
        --out json="$result_file" \
        "$scenario_file"

    log_info "Scenario complete: $scenario"
    log_info "Results saved to: $result_file"
}

# Main function
main() {
    local test_type=${1:-all}

    # Create results directory
    mkdir -p "$RESULTS_DIR"

    # Check prerequisites
    check_k6

    # Start server if needed
    local server_started=false
    if ! check_server; then
        start_server
        server_started=true
    fi

    # Trap to ensure server is stopped on exit
    if [ "$server_started" = true ]; then
        trap stop_server EXIT
    fi

    # Run tests based on argument
    case $test_type in
        baseline)
            run_scenario "single-room-baseline"
            ;;
        scaling)
            run_scenario "scaling-to-5-rooms"
            ;;
        all)
            log_info "Running all load tests..."
            run_scenario "single-room-baseline"
            sleep 5
            run_scenario "scaling-to-5-rooms"
            ;;
        *)
            log_error "Unknown test type: $test_type"
            echo "Usage: $0 {baseline|scaling|all}"
            exit 1
            ;;
    esac

    log_info "All tests complete!"

    # Print summary of results
    echo ""
    log_info "Results saved in: $RESULTS_DIR"
    ls -la "$RESULTS_DIR"/*.json 2>/dev/null || true
}

main "$@"
