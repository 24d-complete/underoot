import argparse
import hashlib
import json
import urllib.request
import os
import sys

def get_extension_metadata(namespace, name):
    api_url = f"https://open-vsx.org/api/{namespace}/{name}/latest"
    print(f"Fetching metadata from {api_url}...", file=sys.stderr)
    
    try:
        with urllib.request.urlopen(api_url) as response:
            data = json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching metadata: {e}", file=sys.stderr)
        sys.exit(1)

    version = data['version']
    files = data.get('files', {})
    download_url = files.get('download')
    
    if not download_url:
        print("Error: No download URL found in metadata.", file=sys.stderr)
        sys.exit(1)
        
    print(f"Downloading VSIX from {download_url}...", file=sys.stderr)
    
    vsix_path = f"{namespace}.{name}-{version}.vsix"
    try:
        with urllib.request.urlopen(download_url) as response, open(vsix_path, 'wb') as out_file:
            data_bytes = response.read()
            out_file.write(data_bytes)
    except Exception as e:
        print(f"Error downloading VSIX: {e}", file=sys.stderr)
        sys.exit(1)
        
    print(f"Calculating SHA256...", file=sys.stderr)
    sha256_hash = hashlib.sha256()
    with open(vsix_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
            
    sha256 = sha256_hash.hexdigest()
    
    # Clean up
    os.remove(vsix_path)
    
    # Construct product.json entry
    # Note: 'repo' is not strictly required by product.json build logic usually, but we can add it.
    # The build/lib/builtInExtensions.js in vscode checks for name, version, sha256, metadata.
    
    entry = {
        "name": f"{namespace}.{name}",
        "version": version,
        "sha256": sha256,
        "repo": download_url, # Using download URL as repo/url source often works, or strictly github repo
        "metadata": {
            "id": f"{namespace.lower()}.{name.lower()}", # extension IDs are often lowercase in VS Code
            "publisherId": {
                "publisherId": namespace, # Placeholder, often UUID in marketplace but string here might work or need lookup
                "publisherName": namespace,
                "displayName": namespace,
                "flags": "verified"
            },
            "publisherDisplayName": namespace
        }
    }
    
    print(json.dumps(entry, indent=4))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Get extension metadata for product.json")
    parser.add_argument("extension_id", help="Extension ID in format Namespace.Name (e.g., James-Yu.latex-workshop)")
    args = parser.parse_args()
    
    if "." not in args.extension_id:
        print("Error: Invalid extension ID format. Use Namespace.Name", file=sys.stderr)
        sys.exit(1)
        
    namespace, name = args.extension_id.split(".", 1)
    get_extension_metadata(namespace, name)
