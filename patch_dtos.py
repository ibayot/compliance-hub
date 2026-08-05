import os
import re

TARGET_DIR = r"c:\Users\mjdibay\source\repos\Compliance Hub\backend\src"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if file has DTO classes
    if not re.search(r'export class \w*Dto', content) and not re.search(r'export class CsatFormData', content):
        return

    # If it already has class-validator, skip to avoid double imports, except if we want to force
    if "from 'class-validator'" in content:
        print(f"Skipping (already has class-validator): {filepath}")
        return

    print(f"Processing: {filepath}")

    lines = content.split('\n')
    new_lines = []
    
    in_dto_class = False
    
    for i, line in enumerate(lines):
        if re.search(r'export class (\w*Dto|CsatFormData)', line):
            in_dto_class = True
            
        if line.startswith('}') and in_dto_class:
            in_dto_class = False
            
        # Process properties
        if in_dto_class and ('@ApiProperty()' in line or '@ApiPropertyOptional(' in line):
            is_optional = 'Optional' in line
            
            # Find the property definition in the next few lines
            prop_type = 'string'
            prop_name = ''
            for j in range(i+1, min(i+5, len(lines))):
                prop_match = re.search(r'^\s*([a-zA-Z0-9_]+)\??\s*:\s*([^;=]+)', lines[j])
                if prop_match:
                    prop_name = prop_match.group(1)
                    prop_type = prop_match.group(2).strip()
                    break
            
            decorators = []
            if is_optional:
                decorators.append('@IsOptional()')
            else:
                decorators.append('@IsNotEmpty()')
                
            if 'string' in prop_type:
                decorators.append('@IsString()')
            elif 'number' in prop_type:
                decorators.append('@IsNumber()')
            elif 'boolean' in prop_type:
                decorators.append('@IsBoolean()')
            elif '[]' in prop_type or 'Array' in prop_type:
                decorators.append('@IsArray()')
            elif prop_type in ['TicketType', 'TicketStatus', 'TicketPriority', 'AttendanceStatus', 'EscalationStatus']:
                decorators.append(f'@IsEnum({prop_type})')
            elif prop_type.startswith('UserRole'):
                decorators.append(f'@IsEnum(UserRole)')
            
            # Add decorators with same indentation
            indent = line[:len(line) - len(line.lstrip())]
            for dec in decorators:
                new_lines.append(indent + dec)
                
        new_lines.append(line)
        
    final_content = '\n'.join(new_lines)
    
    # Add import
    import_stmt = "import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';\n"
    if import_stmt not in final_content:
        # insert after first import
        match = re.search(r'^import .*;', final_content, re.MULTILINE)
        if match:
            final_content = final_content[:match.end()] + '\n' + import_stmt + final_content[match.end():]
        else:
            final_content = import_stmt + final_content
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(final_content)
        
for root, dirs, files in os.walk(TARGET_DIR):
    for file in files:
        if file.endswith('.ts') and not file.endswith('.spec.ts'):
            process_file(os.path.join(root, file))
