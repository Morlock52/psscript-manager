#!/bin/bash
# Test script for Voice API integration
# This script tests the Voice API endpoints by making requests to the backend API and AI service

# Set variables
API_URL="http://localhost:4000/api"
AI_SERVICE_URL="http://localhost:8000"
AUTH_TOKEN="${VOICE_API_AUTH_TOKEN:-your-auth-token}"  # Use environment variable or default
VOICE_ID="en-US-Standard-A"
TEST_TEXT="This is a test of the Voice API integration. It converts text to speech and speech to text."
TEST_LONG_TEXT="This is a longer test of the Voice API integration. It tests the ability to handle longer texts for synthesis. The Voice API should be able to handle texts of various lengths, from short phrases to longer paragraphs. This helps ensure that the service is robust and can handle real-world usage scenarios."
TEST_LANGUAGES=("en-US" "en-GB" "fr-FR" "de-DE" "es-ES")
TEST_AUDIO_FILE="test-audio.wav"  # Path to a test audio file

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Function to print section header
print_header() {
  echo -e "\n${YELLOW}==== $1 ====${NC}\n"
}

# Function to check if command succeeded
check_result() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Success${NC}"
  else
    echo -e "${RED}✗ Failed${NC}"
    if [ "$1" = "exit" ]; then
      exit 1
    fi
  fi
}

# Function to check if a service is running
check_service() {
  curl -s "$1" > /dev/null
  if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Service at $1 is not running. Please start the service before running this test.${NC}"
    exit 1
  fi
}

# Check if curl is installed
if ! command -v curl &> /dev/null; then
  echo -e "${RED}Error: curl is not installed. Please install curl to run this script.${NC}"
  exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo -e "${RED}Error: jq is not installed. Please install jq to run this script.${NC}"
  exit 1
fi

# Check if services are running
echo -e "${YELLOW}Checking if services are running...${NC}"
check_service "$API_URL/health"
check_service "$AI_SERVICE_URL/docs"
echo -e "${GREEN}✓ Services are running${NC}"

# Start tests
echo -e "${YELLOW}Starting Voice API Tests${NC}"
echo -e "${YELLOW}======================${NC}"

# Create test directory if it doesn't exist
TEST_DIR="voice-api-test-results"
mkdir -p $TEST_DIR
echo -e "${GREEN}✓ Created test directory: $TEST_DIR${NC}"
echo

# Test 1: Get available voices
print_header "Test 1: Get Available Voices"
echo "GET $API_URL/voice/voices"

VOICES_RESPONSE=$(curl -s -X GET \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/voice/voices")

echo "$VOICES_RESPONSE" | jq .
check_result
echo

# Test 2: Get voice settings
print_header "Test 2: Get Voice Settings"
echo "GET $API_URL/voice/settings"

SETTINGS_RESPONSE=$(curl -s -X GET \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/voice/settings")

echo "$SETTINGS_RESPONSE" | jq .
check_result
echo

# Test 3: Update voice settings
print_header "Test 3: Update Voice Settings"
echo "PUT $API_URL/voice/settings"

UPDATE_RESPONSE=$(curl -s -X PUT \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"voiceId\":\"$VOICE_ID\",\"autoPlay\":true,\"volume\":0.8,\"speed\":1.0}" \
  "$API_URL/voice/settings")

echo "$UPDATE_RESPONSE" | jq .
check_result
echo

# Test 4: Synthesize speech
print_header "Test 4: Synthesize Speech"
echo "POST $API_URL/voice/synthesize"
echo "Text: $TEST_TEXT"

SYNTHESIZE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$TEST_TEXT\",\"voiceId\":\"$VOICE_ID\",\"outputFormat\":\"mp3\"}" \
  "$API_URL/voice/synthesize")

# Check if the response contains audio_data
if echo "$SYNTHESIZE_RESPONSE" | jq -e '.audio_data' > /dev/null; then
  echo -e "${GREEN}✓ Received audio data${NC}"
  
  # Save audio data to file for testing
  echo "$SYNTHESIZE_RESPONSE" | jq -r '.audio_data' | base64 --decode > $TEST_DIR/test-output.mp3
  echo -e "${GREEN}✓ Saved audio to $TEST_DIR/test-output.mp3${NC}"
else
  echo -e "${RED}✗ No audio data received${NC}"
  echo "$SYNTHESIZE_RESPONSE" | jq .
  exit 1
fi

# Test 5: Recognize speech (if test audio file exists)
if [ -f "$TEST_AUDIO_FILE" ]; then
  print_header "Test 5: Recognize Speech"
  echo "POST $API_URL/voice/recognize"
  
  # Convert audio file to base64
  AUDIO_BASE64=$(base64 -i "$TEST_AUDIO_FILE")
  
  RECOGNIZE_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"audioData\":\"$AUDIO_BASE64\",\"language\":\"en-US\"}" \
    "$API_URL/voice/recognize")
  
  echo "$RECOGNIZE_RESPONSE" | jq .
  check_result
else
  echo -e "${YELLOW}Skipping Test 5: Test audio file $TEST_AUDIO_FILE not found${NC}"
  echo -e "${YELLOW}Creating a test audio file from the synthesized speech${NC}"
fi

# Test 6: End-to-end test (synthesize then recognize)
print_header "Test 6: End-to-End Test (Synthesize then Recognize)"
echo "This test synthesizes speech and then recognizes it"

# First synthesize
echo "Step 1: Synthesize speech"
SYNTH_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"Testing voice recognition\",\"voiceId\":\"$VOICE_ID\",\"outputFormat\":\"wav\"}" \
  "$API_URL/voice/synthesize")

# Check if the response contains audio_data
if echo "$SYNTH_RESPONSE" | jq -e '.audio_data' > /dev/null; then
  echo -e "${GREEN}✓ Received audio data${NC}"
  
  # Extract audio data
  AUDIO_DATA=$(echo "$SYNTH_RESPONSE" | jq -r '.audio_data')
  
  # Then recognize
  echo "Step 2: Recognize speech"
  RECOG_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"audioData\":\"$AUDIO_DATA\",\"language\":\"en-US\"}" \
    "$API_URL/voice/recognize")
  
  echo "$RECOG_RESPONSE" | jq .
  
  # Check if the recognized text matches the original
  RECOGNIZED_TEXT=$(echo "$RECOG_RESPONSE" | jq -r '.text')
  echo -e "\nOriginal text: \"Testing voice recognition\""
  echo -e "Recognized text: \"$RECOGNIZED_TEXT\"\n"
  
  if [[ "$RECOGNIZED_TEXT" == *"Testing voice recognition"* ]]; then
    echo -e "${GREEN}✓ Text successfully recognized${NC}"
  else
    echo -e "${YELLOW}⚠ Text recognition not exact${NC}"
  fi
else
  echo -e "${RED}✗ No audio data received${NC}"
  echo "$SYNTH_RESPONSE" | jq .
fi

# Test 7: Performance test - multiple languages
print_header "Test 7: Performance Test - Multiple Languages"
echo "Testing synthesis in multiple languages"

for lang in "${TEST_LANGUAGES[@]}"; do
  echo -e "\nTesting language: $lang"
  
  # Get appropriate voice for the language
  LANG_VOICE="${lang}-Standard-A"
  
  # Synthesize speech
  LANG_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"$TEST_TEXT\",\"voiceId\":\"$LANG_VOICE\",\"outputFormat\":\"mp3\"}" \
    "$API_URL/voice/synthesize")
  
  if echo "$LANG_RESPONSE" | jq -e '.audio_data' > /dev/null; then
    echo -e "${GREEN}✓ Successfully synthesized speech in $lang${NC}"
    echo "$LANG_RESPONSE" | jq -r '.audio_data' | base64 --decode > "$TEST_DIR/test-$lang.mp3"
  else
    echo -e "${RED}✗ Failed to synthesize speech in $lang${NC}"
  fi
done

# Test 8: Stress test - long text
print_header "Test 8: Stress Test - Long Text"
echo "Testing synthesis with long text"

LONG_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$TEST_LONG_TEXT\",\"voiceId\":\"$VOICE_ID\",\"outputFormat\":\"mp3\"}" \
  "$API_URL/voice/synthesize")

if echo "$LONG_RESPONSE" | jq -e '.audio_data' > /dev/null; then
  echo -e "${GREEN}✓ Successfully synthesized long text${NC}"
  echo "$LONG_RESPONSE" | jq -r '.audio_data' | base64 --decode > "$TEST_DIR/test-long.mp3"
else
  echo -e "${RED}✗ Failed to synthesize long text${NC}"
  echo "$LONG_RESPONSE" | jq .
fi

# Test 9: Direct AI service test
print_header "Test 9: Direct AI Service Test"
echo "Testing direct connection to AI service"

AI_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$TEST_TEXT\",\"voice_id\":\"$VOICE_ID\",\"output_format\":\"mp3\"}" \
  "$AI_SERVICE_URL/voice/synthesize")

if echo "$AI_RESPONSE" | jq -e '.audio_data' > /dev/null; then
  echo -e "${GREEN}✓ Successfully connected to AI service${NC}"
else
  echo -e "${RED}✗ Failed to connect to AI service${NC}"
  echo "$AI_RESPONSE" | jq .
fi

# Test 10: Cache test
print_header "Test 10: Cache Test"
echo "Testing caching functionality (should be faster the second time)"

time curl -s -X POST -H "Authorization: Bearer $AUTH_TOKEN" -H "Content-Type: application/json" -d "{\"text\":\"$TEST_TEXT\",\"voiceId\":\"$VOICE_ID\",\"outputFormat\":\"mp3\"}" "$API_URL/voice/synthesize" > /dev/null
echo -e "\nSecond request (should be faster if caching works):"
time curl -s -X POST -H "Authorization: Bearer $AUTH_TOKEN" -H "Content-Type: application/json" -d "{\"text\":\"$TEST_TEXT\",\"voiceId\":\"$VOICE_ID\",\"outputFormat\":\"mp3\"}" "$API_URL/voice/synthesize" > /dev/null

# Summary
print_header "Test Summary"
echo -e "${GREEN}Voice API tests completed${NC}"
echo "Check the output above for any errors or warnings"
echo "Test results saved in the $TEST_DIR directory"
echo -e "${GREEN}If all tests passed, the Voice API integration is working correctly${NC}"
echo -e "${YELLOW}Note: Some tests may have been skipped if prerequisites were not met${NC}"