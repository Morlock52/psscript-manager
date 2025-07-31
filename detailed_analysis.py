#!/usr/bin/env python3
"""
Detailed Analysis Script
Performs deeper analysis on the accessible services
"""

import socket
import subprocess
import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning

# Suppress SSL warnings
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

TARGET_IP = "74.208.184.195"

def analyze_ssh_service():
    """Analyze SSH service on port 22"""
    print("\n=== SSH Service Analysis (Port 22) ===")
    
    try:
        # Get SSH banner
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        sock.connect((TARGET_IP, 22))
        
        # Receive banner
        banner = sock.recv(1024).decode('utf-8', errors='ignore').strip()
        print(f"SSH Banner: {banner}")
        
        # Parse SSH version info
        if "SSH" in banner:
            parts = banner.split()
            if len(parts) >= 1:
                print(f"Protocol Version: {parts[0]}")
            if len(parts) >= 2:
                print(f"Software Version: {parts[1] if len(parts) > 1 else 'Unknown'}")
        
        sock.close()
        
    except Exception as e:
        print(f"Error analyzing SSH: {str(e)}")

def analyze_http_service():
    """Analyze HTTP service on port 80"""
    print("\n=== HTTP Service Analysis (Port 80) ===")
    
    try:
        # Make HTTP request
        response = requests.get(f"http://{TARGET_IP}", timeout=5, allow_redirects=False)
        
        print(f"Status Code: {response.status_code}")
        print(f"Status Text: {response.reason}")
        print("\nResponse Headers:")
        for header, value in response.headers.items():
            print(f"  {header}: {value}")
        
        # Check content type and length
        content_type = response.headers.get('Content-Type', 'Unknown')
        content_length = response.headers.get('Content-Length', 'Unknown')
        
        print(f"\nContent Type: {content_type}")
        print(f"Content Length: {content_length}")
        
        # Check for redirects
        if 300 <= response.status_code < 400:
            location = response.headers.get('Location', 'None')
            print(f"Redirect Location: {location}")
        
        # Show first 500 chars of response if HTML
        if 'text/html' in content_type:
            content_preview = response.text[:500]
            print(f"\nContent Preview (first 500 chars):")
            print("-" * 50)
            print(content_preview)
            print("-" * 50)
            
    except requests.exceptions.Timeout:
        print("HTTP request timed out")
    except Exception as e:
        print(f"Error analyzing HTTP: {str(e)}")

def check_common_web_paths():
    """Check common web application paths"""
    print("\n=== Common Web Path Checks ===")
    
    common_paths = [
        "/",
        "/api",
        "/api/health",
        "/health",
        "/status",
        "/login",
        "/admin",
        "/.well-known/",
        "/robots.txt",
        "/favicon.ico"
    ]
    
    print("Checking common paths on port 80:")
    for path in common_paths:
        try:
            response = requests.head(f"http://{TARGET_IP}{path}", 
                                   timeout=3, 
                                   allow_redirects=False)
            print(f"  {path:<20} -> {response.status_code} {response.reason}")
        except:
            print(f"  {path:<20} -> Error/Timeout")

def analyze_network_route():
    """Analyze network route to target"""
    print("\n=== Network Route Analysis ===")
    
    try:
        # Traceroute (limited hops)
        print("Running traceroute (first 10 hops)...")
        cmd = ["traceroute", "-m", "10", "-w", "2", TARGET_IP]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.stdout:
            print(result.stdout)
        
    except subprocess.TimeoutExpired:
        print("Traceroute timed out")
    except Exception as e:
        print(f"Error running traceroute: {str(e)}")

def check_error_codes():
    """Explain the error codes encountered"""
    print("\n=== Error Code Analysis ===")
    
    error_codes = {
        61: "Connection Refused - Service not listening on this port or actively rejecting connections",
        35: "Resource temporarily unavailable - Often indicates firewall dropping packets or timeout",
    }
    
    print("Error codes encountered during port scan:")
    for code, description in error_codes.items():
        print(f"  Error {code}: {description}")
    
    print("\nPossible causes for closed/filtered ports:")
    print("  1. Service not running on the target port")
    print("  2. Firewall rules blocking incoming connections")
    print("  3. Security group/ACL rules in cloud environment")
    print("  4. Service bound to localhost only (not 0.0.0.0)")
    print("  5. Docker container port mapping issues")

def check_hosting_provider():
    """Try to identify hosting provider"""
    print("\n=== Hosting Provider Analysis ===")
    
    print(f"Reverse DNS: ip74-208-184-195.pbiaas.com")
    print("\nAnalysis:")
    print("  • Domain suffix '.pbiaas.com' suggests a Platform/Backend as a Service provider")
    print("  • This appears to be a managed hosting service")
    print("  • Port restrictions may be enforced by the hosting provider")
    print("  • Contact hosting provider to open additional ports if needed")

def main():
    print("="*60)
    print("DETAILED CONNECTIVITY ANALYSIS")
    print(f"Target: {TARGET_IP}")
    print("="*60)
    
    # Analyze accessible services
    analyze_ssh_service()
    analyze_http_service()
    check_common_web_paths()
    
    # Network and error analysis
    analyze_network_route()
    check_error_codes()
    check_hosting_provider()
    
    # Summary recommendations
    print("\n=== SUMMARY AND RECOMMENDATIONS ===")
    print("\n✓ ACCESSIBLE SERVICES:")
    print("  • SSH (Port 22) - Server administration access available")
    print("  • HTTP (Port 80) - Web server running nginx/1.24.0 on Ubuntu")
    
    print("\n✗ INACCESSIBLE SERVICES:")
    print("  • HTTPS (Port 443) - Connection refused")
    print("  • Custom Apps (Ports 3002, 4000, 8000) - Filtered/timeout")
    
    print("\nRECOMMENDED ACTIONS:")
    print("  1. For HTTPS (443):")
    print("     - Check if SSL/TLS is configured in nginx")
    print("     - Verify nginx is listening on port 443")
    print("     - Check SSL certificate installation")
    
    print("\n  2. For Custom App Ports (3002, 4000, 8000):")
    print("     - SSH into server and check if services are running:")
    print("       • sudo netstat -tlnp | grep -E '3002|4000|8000'")
    print("       • sudo ss -tlnp | grep -E '3002|4000|8000'")
    print("     - Check firewall rules:")
    print("       • sudo ufw status")
    print("       • sudo iptables -L -n")
    print("     - Check hosting provider's control panel for port restrictions")
    print("     - Verify Docker containers are properly mapped if using Docker")

if __name__ == "__main__":
    main()