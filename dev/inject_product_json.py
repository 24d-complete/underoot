import json
import os

vscode_product_path = os.path.join('vscode', 'product.json')
root_product_path = 'product.json'

print(f"Reading {vscode_product_path}...")
with open(vscode_product_path, 'r', encoding='utf-8') as f:
    product_data = json.load(f)

# Define the extension entry
latex_ext = {
    "name": "James-Yu.latex-workshop",
    "version": "10.12.2",
    "sha256": "93b8bab2747cbd01ba4189437b0ea102f210e22c4765812b8706b2a23da9a696",
    # "repo": REMOVED to force use of extensionsGallery (fromMarketplace)
    "metadata": {
        "id": "james-yu.latex-workshop",
        "publisherId": {
            "publisherId": "James-Yu",
            "publisherName": "James-Yu",
            "displayName": "James-Yu",
            "flags": "verified"
        },
        "publisherDisplayName": "James-Yu"
    }
}

# Ensure extensions array exists
if 'builtInExtensions' not in product_data:
    product_data['builtInExtensions'] = []

# Check if already exists to avoid duplicates
exists = False
for ext in product_data['builtInExtensions']:
    if ext['name'] == latex_ext['name']:
        print("Extension already present in product.json - Updating...")
        # Explicitly remove repo if it exists to fix stale config
        if 'repo' in ext:
            del ext['repo']
        ext.update(latex_ext) 
        exists = True
        break

if not exists:
    print("Injecting LaTeX Workshop into builtInExtensions...")
    product_data['builtInExtensions'].append(latex_ext)

# Inject extensionsGallery (OpenVSX) if missing
# This is usually done by prepare_vscode.sh, but since we are skipping that...
if 'extensionsGallery' not in product_data:
    print("Injecting extensionsGallery (OpenVSX) configuration...")
    product_data['extensionsGallery'] = {
        "serviceUrl": "https://open-vsx.org/vscode/gallery",
        "itemUrl": "https://open-vsx.org/vscode/item",
        "latestUrlTemplate": "https://open-vsx.org/vscode/gallery/{publisher}/{name}/latest", 
        "controlUrl": "https://raw.githubusercontent.com/EclipseFdn/publish-extensions/refs/heads/master/extension-control/extensions.json"
    }

# Write back
print(f"Writing to {vscode_product_path}...")
with open(vscode_product_path, 'w', encoding='utf-8') as f:
    json.dump(product_data, f, indent='\t')

print("Done.")
