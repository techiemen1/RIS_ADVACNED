#!/bin/bash

# Define the output files
KEY_FILE="key.pem"
CERT_FILE="cert.pem"
CONFIG_FILE="openssl.cnf"

# Create a temporary OpenSSL configuration file
cat > $CONFIG_FILE <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = req_ext
x509_extensions = v3_req

[dn]
C = US
ST = State
L = City
O = Organization
OU = Department
CN = 192.168.1.34

[req_ext]
subjectAltName = @alt_names

[v3_req]
subjectAltName = @alt_names
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth

[alt_names]
IP.1 = 192.168.1.34
IP.2 = 127.0.0.1
DNS.1 = localhost
EOF

# Generate the private key and certificate
openssl req -new -x509 -nodes -days 365 \
  -keyout $KEY_FILE \
  -out $CERT_FILE \
  -config $CONFIG_FILE

# Remove the temporary configuration file
rm $CONFIG_FILE

echo "Certificate generation complete."
ls -l $KEY_FILE $CERT_FILE
