#!/usr/bin/env python3
"""
Connectivity Test Script
Tests connectivity to 74.208.184.195 on various ports with detailed diagnostics
"""

import socket
import ssl
import time
import sys
import subprocess
import platform
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
from concurrent.futures import ThreadPoolExecutor, as_completed
import json

# Target configuration
TARGET_IP = "74.208.184.195"
PORTS_TO_TEST = {
    22: "SSH",
    80: "HTTP",
    443: "HTTPS", 
    3002: "Custom App (3002)",
    4000: "Custom App (4000)",
    8000: "HTTP Alt (8000)"
}

# Test timeout in seconds
TIMEOUT = 5

class Colors:
    """Terminal color codes"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text):
    """Print formatted header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text:^60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.END}\n")

def print_result(test, success, message=""):
    """Print test result with color coding"""
    if success:
        status = f"{Colors.GREEN}✓ PASS{Colors.END}"
    else:
        status = f"{Colors.RED}✗ FAIL{Colors.END}"
    
    print(f"{test:<40} {status}  {message}")

def test_basic_connectivity():
    """Test basic network connectivity to the target IP"""
    print_header("Basic Connectivity Test")
    
    # Ping test (platform-specific)
    try:
        if platform.system().lower() == "windows":
            cmd = ["ping", "-n", "4", TARGET_IP]
        else:
            cmd = ["ping", "-c", "4", TARGET_IP]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            print_result("ICMP Ping", True, "Host is reachable")
            # Extract ping statistics
            output_lines = result.stdout.split('\n')
            for line in output_lines:
                if 'packet loss' in line.lower() or 'loss' in line:
                    print(f"  └─ {line.strip()}")
                elif 'min/avg/max' in line.lower() or 'minimum/maximum/average' in line.lower():
                    print(f"  └─ {line.strip()}")
        else:
            print_result("ICMP Ping", False, "Host unreachable or ICMP blocked")
            
    except subprocess.TimeoutExpired:
        print_result("ICMP Ping", False, "Timeout - no response")
    except Exception as e:
        print_result("ICMP Ping", False, f"Error: {str(e)}")

def test_port_connectivity(port, service_name):
    """Test TCP connectivity to a specific port"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(TIMEOUT)
    
    try:
        start_time = time.time()
        result = sock.connect_ex((TARGET_IP, port))
        end_time = time.time()
        response_time = (end_time - start_time) * 1000  # Convert to ms
        
        if result == 0:
            return (port, service_name, True, f"Open (Response: {response_time:.1f}ms)")
        else:
            return (port, service_name, False, f"Closed/Filtered (Error code: {result})")
    except socket.timeout:
        return (port, service_name, False, "Timeout - no response")
    except socket.gaierror:
        return (port, service_name, False, "DNS resolution failed")
    except Exception as e:
        return (port, service_name, False, f"Error: {str(e)}")
    finally:
        sock.close()

def test_http_services():
    """Test HTTP/HTTPS services on applicable ports"""
    print_header("HTTP/HTTPS Service Tests")
    
    http_ports = [(80, "http"), (443, "https"), (8000, "http"), (3002, "http"), (4000, "http")]
    
    for port, protocol in http_ports:
        url = f"{protocol}://{TARGET_IP}:{port}/"
        
        try:
            # Create request with custom headers
            req = Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Connectivity Test)',
                'Accept': '*/*',
                'Connection': 'close'
            })
            
            # For HTTPS, create an SSL context that doesn't verify certificates
            if protocol == "https":
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
                
                response = urlopen(req, timeout=TIMEOUT, context=ssl_context)
            else:
                response = urlopen(req, timeout=TIMEOUT)
            
            status_code = response.getcode()
            headers = dict(response.headers)
            server_header = headers.get('Server', 'Unknown')
            
            print_result(f"HTTP{'S' if protocol == 'https' else ''} on port {port}", 
                        True, 
                        f"Status: {status_code}, Server: {server_header}")
            
        except HTTPError as e:
            # HTTP error (4xx, 5xx) still means the service is running
            print_result(f"HTTP{'S' if protocol == 'https' else ''} on port {port}", 
                        True, 
                        f"Status: {e.code} - Service responding")
        except URLError as e:
            if "timed out" in str(e):
                print_result(f"HTTP{'S' if protocol == 'https' else ''} on port {port}", 
                            False, 
                            "Timeout - service not responding")
            else:
                print_result(f"HTTP{'S' if protocol == 'https' else ''} on port {port}", 
                            False, 
                            f"Connection failed: {str(e.reason)}")
        except Exception as e:
            print_result(f"HTTP{'S' if protocol == 'https' else ''} on port {port}", 
                        False, 
                        f"Error: {str(e)}")

def test_ssl_certificate(port=443):
    """Test SSL certificate details"""
    print_header("SSL Certificate Analysis")
    
    try:
        # Create SSL context
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        
        # Connect and get certificate
        with socket.create_connection((TARGET_IP, port), timeout=TIMEOUT) as sock:
            with context.wrap_socket(sock) as ssock:
                cert = ssock.getpeercert()
                
                if cert:
                    print_result("SSL Certificate", True, "Certificate retrieved")
                    print(f"  └─ Subject: {dict(x[0] for x in cert['subject'])}")
                    print(f"  └─ Issuer: {dict(x[0] for x in cert['issuer'])}")
                    print(f"  └─ Version: {cert['version']}")
                    print(f"  └─ Serial Number: {cert['serialNumber']}")
                else:
                    # Get the DER-encoded certificate
                    der_cert = ssock.getpeercert_chain()
                    print_result("SSL Certificate", True, f"Certificate present (DER encoded, {len(der_cert)} certificates in chain)")
                    
    except socket.timeout:
        print_result("SSL Certificate", False, "Timeout connecting to port 443")
    except Exception as e:
        print_result("SSL Certificate", False, f"Error: {str(e)}")

def check_cloud_provider_hints():
    """Check for common cloud provider security group issues"""
    print_header("Cloud Provider Security Analysis")
    
    # Check if this might be an AWS EC2 instance
    try:
        # Try to resolve reverse DNS
        try:
            hostname = socket.gethostbyaddr(TARGET_IP)[0]
            print(f"Reverse DNS: {hostname}")
            
            if "amazonaws.com" in hostname:
                print(f"{Colors.YELLOW}⚠ AWS EC2 Instance Detected{Colors.END}")
                print("  └─ Check Security Group rules in AWS Console")
                print("  └─ Ensure inbound rules allow traffic on required ports")
                print("  └─ Check Network ACLs if using custom VPC")
            elif "azure" in hostname:
                print(f"{Colors.YELLOW}⚠ Azure Instance Detected{Colors.END}")
                print("  └─ Check Network Security Group (NSG) rules")
                print("  └─ Verify Azure Firewall rules if applicable")
            elif "googleusercontent.com" in hostname:
                print(f"{Colors.YELLOW}⚠ Google Cloud Instance Detected{Colors.END}")
                print("  └─ Check VPC firewall rules")
                print("  └─ Ensure proper tags are applied to instance")
        except:
            print("Reverse DNS: Not available")
            
    except Exception as e:
        print(f"Cloud provider detection error: {str(e)}")
    
    # General cloud security recommendations
    print("\n{Colors.BOLD}Common Cloud Security Group Issues:{Colors.END}")
    print("1. Inbound rules not configured for specific ports")
    print("2. Source IP restrictions (0.0.0.0/0 vs specific IPs)")
    print("3. Protocol mismatch (TCP vs UDP)")
    print("4. Network ACLs blocking traffic at subnet level")
    print("5. Instance-level firewall (iptables/ufw) blocking traffic")

def generate_diagnostics_summary(port_results):
    """Generate a summary of diagnostics"""
    print_header("Diagnostics Summary")
    
    open_ports = [r for r in port_results if r[2]]
    closed_ports = [r for r in port_results if not r[2]]
    
    print(f"Target IP: {TARGET_IP}")
    print(f"Total ports tested: {len(port_results)}")
    print(f"Open ports: {len(open_ports)}")
    print(f"Closed/Filtered ports: {len(closed_ports)}")
    
    if open_ports:
        print(f"\n{Colors.GREEN}Open Ports:{Colors.END}")
        for port, service, _, message in open_ports:
            print(f"  • Port {port} ({service}): {message}")
    
    if closed_ports:
        print(f"\n{Colors.RED}Closed/Filtered Ports:{Colors.END}")
        for port, service, _, message in closed_ports:
            print(f"  • Port {port} ({service}): {message}")
    
    # Recommendations
    print(f"\n{Colors.BOLD}Recommendations:{Colors.END}")
    
    if len(closed_ports) == len(port_results):
        print(f"{Colors.RED}⚠ All ports appear closed/filtered{Colors.END}")
        print("  1. Check if the server is running and listening on these ports")
        print("  2. Verify firewall rules on the server (iptables/ufw)")
        print("  3. Check cloud provider security groups/firewall rules")
        print("  4. Ensure no intermediate firewall is blocking traffic")
    elif open_ports:
        print(f"{Colors.GREEN}✓ Some services are accessible{Colors.END}")
        for port, service, _, _ in closed_ports:
            print(f"  • Consider checking why port {port} ({service}) is not accessible")

def main():
    """Main function to run all connectivity tests"""
    print(f"{Colors.BOLD}Connectivity Test for {TARGET_IP}{Colors.END}")
    print(f"Testing ports: {', '.join(str(p) for p in PORTS_TO_TEST.keys())}")
    print(f"Timeout: {TIMEOUT} seconds")
    
    # Basic connectivity test
    test_basic_connectivity()
    
    # Port connectivity tests
    print_header("Port Connectivity Tests")
    
    # Use ThreadPoolExecutor for concurrent port testing
    port_results = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(test_port_connectivity, port, service): (port, service) 
                  for port, service in PORTS_TO_TEST.items()}
        
        for future in as_completed(futures):
            result = future.result()
            port_results.append(result)
            print_result(f"Port {result[0]} ({result[1]})", result[2], result[3])
    
    # Sort results by port number
    port_results.sort(key=lambda x: x[0])
    
    # HTTP service tests
    test_http_services()
    
    # SSL certificate test if port 443 is in the list
    if 443 in PORTS_TO_TEST:
        test_ssl_certificate()
    
    # Cloud provider analysis
    check_cloud_provider_hints()
    
    # Summary
    generate_diagnostics_summary(port_results)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Test interrupted by user{Colors.END}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}Unexpected error: {str(e)}{Colors.END}")
        sys.exit(1)