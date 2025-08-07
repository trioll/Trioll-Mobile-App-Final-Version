#!/usr/bin/env python3
import re
import json
from collections import defaultdict, Counter
from pathlib import Path

def parse_typescript_errors(log_file):
    """Parse TypeScript errors from the log file"""
    errors = []
    
    with open(log_file, 'r') as f:
        lines = f.readlines()
    
    # Pattern to match TypeScript errors
    error_pattern = r'^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$'
    
    for line in lines:
        match = re.match(error_pattern, line.strip())
        if match:
            file_path, line_num, col_num, error_code, message = match.groups()
            errors.append({
                'file': file_path,
                'line': int(line_num),
                'column': int(col_num),
                'code': error_code,
                'message': message,
                'category': categorize_error(error_code, message),
                'is_backend_related': is_backend_related(file_path, message)
            })
    
    return errors

def categorize_error(error_code, message):
    """Categorize errors by type"""
    categories = {
        'TS2307': 'Module not found',
        'TS2339': 'Property does not exist',
        'TS2345': 'Type mismatch',
        'TS2304': 'Cannot find name',
        'TS2322': 'Type assignment error',
        'TS2554': 'Expected arguments mismatch',
        'TS2353': 'Unknown property in object literal',
        'TS2341': 'Property is private',
        'TS2349': 'Expression not callable',
        'TS2698': 'Spread types error',
        'TS2724': 'No exported member',
        'TS2551': 'Property name typo',
        'TS2552': 'Cannot find name (suggestion provided)',
        'TS2559': 'Type has no properties in common',
        'TS1345': 'Void expression cannot be tested',
        'TS2786': 'Cannot be used as JSX component',
        'TS2607': 'JSX element class error'
    }
    
    for code, category in categories.items():
        if error_code == code:
            return category
    
    return 'Other'

def is_backend_related(file_path, message):
    """Determine if an error is backend-related"""
    backend_keywords = [
        'api', 'API', 'service', 'Service', 'auth', 'Auth', 
        'websocket', 'WebSocket', 'fetch', 'request', 'response',
        'endpoint', 'login', 'LoginResponse', 'mfaRequired',
        'token', 'credential', 'aws', 'AWS', 'cognito', 'Cognito',
        'dynamodb', 's3', 'analytics', 'Analytics'
    ]
    
    backend_paths = [
        'api/', 'services/', 'utils/api', 'utils/auth', 
        'integration/', 'websocket', 'security/'
    ]
    
    # Check file path
    for path in backend_paths:
        if path in file_path:
            return True
    
    # Check message content
    for keyword in backend_keywords:
        if keyword in message:
            return True
    
    return False

def get_screen_from_path(file_path):
    """Extract screen/component name from file path"""
    path_parts = file_path.split('/')
    
    # Map common directories to screens
    if 'screens/' in file_path:
        return path_parts[path_parts.index('screens') + 1].replace('.tsx', '').replace('.ts', '')
    elif 'components/' in file_path:
        # Get the component category or name
        comp_idx = path_parts.index('components')
        if comp_idx + 1 < len(path_parts):
            return f"Component:{path_parts[comp_idx + 1]}"
    elif '__tests__/' in file_path:
        return 'Tests'
    elif 'src/' in file_path and len(path_parts) > path_parts.index('src') + 1:
        return f"Module:{path_parts[path_parts.index('src') + 1]}"
    
    # Default to the immediate parent directory
    if len(path_parts) > 1:
        return path_parts[-2]
    
    return 'Root'

def analyze_errors(errors):
    """Analyze errors and generate statistics"""
    analysis = {
        'total_errors': len(errors),
        'by_category': Counter(e['category'] for e in errors),
        'by_screen': Counter(get_screen_from_path(e['file']) for e in errors),
        'by_file': Counter(e['file'] for e in errors),
        'backend_vs_frontend': {
            'backend': sum(1 for e in errors if e['is_backend_related']),
            'frontend': sum(1 for e in errors if not e['is_backend_related'])
        },
        'error_codes': Counter(e['code'] for e in errors),
        'common_missing_properties': [],
        'api_related_errors': []
    }
    
    # Extract common missing properties
    missing_props = defaultdict(list)
    for e in errors:
        if "Property" in e['message'] and "does not exist" in e['message']:
            match = re.search(r"Property '(.+?)' does not exist", e['message'])
            if match:
                prop = match.group(1)
                missing_props[prop].append(e['file'])
    
    analysis['common_missing_properties'] = [
        {'property': prop, 'count': len(files), 'files': list(set(files))[:3]}
        for prop, files in sorted(missing_props.items(), key=lambda x: len(x[1]), reverse=True)[:10]
    ]
    
    # Extract API-related errors
    for e in errors:
        if e['is_backend_related']:
            analysis['api_related_errors'].append({
                'file': e['file'],
                'message': e['message'],
                'category': e['category']
            })
    
    # Get top 5 screens with most errors
    screen_errors = analysis['by_screen'].most_common(5)
    analysis['top_5_screens'] = [
        {'screen': screen, 'count': count} for screen, count in screen_errors
    ]
    
    # Get most common error patterns
    analysis['most_common_patterns'] = analysis['by_category'].most_common(5)
    
    return analysis

def generate_report(analysis):
    """Generate a formatted report"""
    report = []
    
    report.append("# TypeScript Error Analysis Report")
    report.append(f"\nTotal Errors: {analysis['total_errors']}")
    
    report.append("\n## Backend vs Frontend Distribution")
    report.append(f"- Backend-related: {analysis['backend_vs_frontend']['backend']} ({analysis['backend_vs_frontend']['backend']/analysis['total_errors']*100:.1f}%)")
    report.append(f"- Frontend-only: {analysis['backend_vs_frontend']['frontend']} ({analysis['backend_vs_frontend']['frontend']/analysis['total_errors']*100:.1f}%)")
    
    report.append("\n## Top 5 Screens/Components with Most Errors")
    for item in analysis['top_5_screens']:
        report.append(f"- {item['screen']}: {item['count']} errors")
    
    report.append("\n## Most Common Error Patterns")
    for category, count in analysis['most_common_patterns']:
        report.append(f"- {category}: {count} occurrences")
    
    report.append("\n## Common Missing Properties (Backend Integration Issues)")
    for prop in analysis['common_missing_properties'][:5]:
        report.append(f"- '{prop['property']}': {prop['count']} occurrences")
        report.append(f"  Files: {', '.join(prop['files'])}")
    
    report.append("\n## Error Code Distribution")
    for code, count in analysis['error_codes'].most_common(10):
        report.append(f"- {code}: {count} errors")
    
    return '\n'.join(report)

def save_json_data(analysis):
    """Save analysis data as JSON for visualization"""
    visualization_data = {
        'summary': {
            'total_errors': analysis['total_errors'],
            'backend_errors': analysis['backend_vs_frontend']['backend'],
            'frontend_errors': analysis['backend_vs_frontend']['frontend']
        },
        'by_category': dict(analysis['by_category']),
        'by_screen': dict(analysis['by_screen']),
        'top_5_screens': analysis['top_5_screens'],
        'error_distribution': [
            {'type': 'Backend', 'count': analysis['backend_vs_frontend']['backend']},
            {'type': 'Frontend', 'count': analysis['backend_vs_frontend']['frontend']}
        ],
        'common_patterns': [
            {'pattern': pattern, 'count': count} 
            for pattern, count in analysis['most_common_patterns']
        ],
        'missing_properties': analysis['common_missing_properties'][:10]
    }
    
    with open('typescript_errors_analysis.json', 'w') as f:
        json.dump(visualization_data, f, indent=2)
    
    return visualization_data

if __name__ == '__main__':
    # Parse errors
    errors = parse_typescript_errors('typescript-errors.log')
    
    # Analyze
    analysis = analyze_errors(errors)
    
    # Generate report
    report = generate_report(analysis)
    print(report)
    
    # Save JSON data for visualization
    viz_data = save_json_data(analysis)
    
    print("\n\nJSON data saved to typescript_errors_analysis.json")
    print("\nQuick Stats for Visualization:")
    print(f"- Total Errors: {viz_data['summary']['total_errors']}")
    print(f"- Backend Errors: {viz_data['summary']['backend_errors']} ({viz_data['summary']['backend_errors']/viz_data['summary']['total_errors']*100:.1f}%)")
    print(f"- Frontend Errors: {viz_data['summary']['frontend_errors']} ({viz_data['summary']['frontend_errors']/viz_data['summary']['total_errors']*100:.1f}%)")