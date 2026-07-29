import os
import re

tags_map = {
    'auth.controller.ts': 'auth',
    'users.controller.ts': 'users',
    'units.controller.ts': 'units',
    'security-config.controller.ts': 'users',
    'feedback.controller.ts': 'users',
    'internal.controller.ts': '_internal',
    'audit.controller.ts': 'audit-logs',
    'ticket.controller.ts': 'tickets',
    'attendance.controller.ts': 'attendance',
    'ticket-settings.controller.ts': 'ticket-settings',
    'knowledge-base.controller.ts': 'knowledge-base',
    'document.controller.ts': 'documents',
    'reportorial-doc-type.controller.ts': 'document-types',
    'issuance.controller.ts': 'issuances',
    'kpi.controller.ts': 'kpi',
    'mov.controller.ts': 'mov',
    'metrics.controller.ts': 'metrics',
    'incidents.controller.ts': 'incidents',
    'cybersecurity.controller.ts': 'cybersecurity',
    'review.controller.ts': 'reviews',
    'comparison.controller.ts': 'reviews'
}

def process_file(filepath):
    filename = os.path.basename(filepath)
    if filename not in tags_map:
        return
    
    tag = tags_map[filename]
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if '@ApiTags' in content:
        # Already processed or has ApiTags
        # Just check for the specific test-only endpoints
        if filename == 'ticket-settings.controller.ts':
            content = re.sub(r'(@Post\(\'email-test\'\))', r'@ApiTags(\'_test-only\')\n  \1', content)
        elif filename == 'attendance.controller.ts':
            content = re.sub(r'(@Delete\(\'all\'\))', r'@ApiTags(\'_test-only\')\n  \1', content)
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return

    # Add import
    content = re.sub(r'from \'@nestjs/common\';', r'from \'@nestjs/common\';\nimport { ApiTags } from \'@nestjs/swagger\';', content, count=1)
    
    # Add ApiTags above Controller
    content = re.sub(r'(@Controller\([^\)]*\))', f'@ApiTags(\'{tag}\')\\n\\1', content, count=1)
    
    # Check for test-only
    if filename == 'ticket-settings.controller.ts':
        content = re.sub(r'(@Post\(\'email-test\'\))', r'@ApiTags(\'_test-only\')\n  \1', content)
    elif filename == 'attendance.controller.ts':
        content = re.sub(r'(@Delete\(\'all\'\))', r'@ApiTags(\'_test-only\')\n  \1', content)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, dirs, files in os.walk('backend/src/modules'):
    for file in files:
        if file.endswith('.controller.ts'):
            process_file(os.path.join(root, file))

print('Done applying ApiTags.')
