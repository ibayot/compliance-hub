import os
import re

for file in os.listdir('backend/src/apps'):
    if not file.endswith('.main.ts'): continue
    filepath = os.path.join('backend/src/apps', file)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove the middleware block
    pattern = r'\s*// Attach X-Service-Version.*?app\.use\(\(_req:\s*any,\s*res:\s*any,\s*next:\s*any\)\s*=>\s*\{\s*res\.setHeader\(\'X-Service-Version\', serviceVersion\);\s*res\.setHeader\(\'X-Service-Name\', \'.*?\'\);\s*next\(\);\s*\}\);\n'
    content = re.sub(pattern, '', content, flags=re.DOTALL)
    
    # Remove gateway propagation block
    gateway_pattern = r'\s*if \(!strictMode\) \{\s*res\.on\(\'proxyRes\', \(proxyRes: any\) => \{\s*// Propagate X-Service-Version.*?const version = proxyRes\.headers\[\'x-service-version\'\];.*?res\.setHeader\(\'X-Service-Version\', version\);\s*\}\s*\}\);\s*\}'
    content = re.sub(gateway_pattern, '', content, flags=re.DOTALL)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
