#!/bin/bash

# Script to rename all files and directories to lowercase
# and update all import statements accordingly

set -e

PROJECT_ROOT="/tmp/cc-agent/57978924/project"
cd "$PROJECT_ROOT"

echo "=== Phase 1: Creating mapping file ==="

# Create a mapping file for all renames
MAPPING_FILE="/tmp/rename-mapping.txt"
> "$MAPPING_FILE"

# Find all directories with uppercase letters (depth-first, so we rename from deepest first)
find src -depth -type d -name "*[A-Z]*" | while read -r dir; do
  parent_dir=$(dirname "$dir")
  base_name=$(basename "$dir")
  lower_name=$(echo "$base_name" | tr '[:upper:]' '[:lower:]')
  if [ "$base_name" != "$lower_name" ]; then
    echo "DIR|$dir|$parent_dir/$lower_name" >> "$MAPPING_FILE"
  fi
done

# Find all files with uppercase letters
find src -type f -name "*[A-Z]*" | while read -r file; do
  parent_dir=$(dirname "$file")
  base_name=$(basename "$file")
  lower_name=$(echo "$base_name" | tr '[:upper:]' '[:lower:]')
  if [ "$base_name" != "$lower_name" ]; then
    echo "FILE|$file|$parent_dir/$lower_name" >> "$MAPPING_FILE"
  fi
done

echo "=== Phase 2: Renaming directories ==="

# Rename directories first
grep "^DIR|" "$MAPPING_FILE" | while IFS='|' read -r type old_path new_path; do
  if [ -e "$old_path" ]; then
    # Use a temp name to avoid case-insensitive filesystem issues
    temp_path="${old_path}_temp_$$"
    echo "Renaming directory: $old_path -> $new_path"
    mv "$old_path" "$temp_path"
    mv "$temp_path" "$new_path"
  fi
done

echo "=== Phase 3: Renaming files ==="

# Rename files
grep "^FILE|" "$MAPPING_FILE" | while IFS='|' read -r type old_path new_path; do
  if [ -e "$old_path" ]; then
    # Use a temp name to avoid case-insensitive filesystem issues
    temp_path="${old_path}_temp_$$"
    echo "Renaming file: $old_path -> $new_path"
    mv "$old_path" "$temp_path"
    mv "$temp_path" "$new_path"
  fi
done

echo "=== Phase 4: Updating import statements ==="

# Create a sed script for replacements
SED_SCRIPT="/tmp/import-replacements.sed"
> "$SED_SCRIPT"

# Build sed replacement commands from mapping
grep "^FILE|" "$MAPPING_FILE" | while IFS='|' read -r type old_path new_path; do
  # Extract the import path (remove src/ prefix and file extension)
  old_import=$(echo "$old_path" | sed 's|^src/||' | sed 's|\.[^.]*$||')
  new_import=$(echo "$new_path" | sed 's|^src/||' | sed 's|\.[^.]*$||')

  if [ "$old_import" != "$new_import" ]; then
    # Escape special characters for sed
    old_escaped=$(echo "$old_import" | sed 's|/|\\/|g')
    new_escaped=$(echo "$new_import" | sed 's|/|\\/|g')

    # Add sed command to replace in imports
    echo "s|from ['\"]@/$old_escaped|from '@/$new_escaped|g" >> "$SED_SCRIPT"
    echo "s|from ['\"]\.\.\\?/$old_escaped|from '../$new_escaped|g" >> "$SED_SCRIPT"
    echo "s|from ['\"]\\.\\?/$old_escaped|from './$new_escaped|g" >> "$SED_SCRIPT"
    echo "s|import(['\"]@/$old_escaped|import('@/$new_escaped|g" >> "$SED_SCRIPT"
  fi
done

# Also add directory renames to sed script
grep "^DIR|" "$MAPPING_FILE" | while IFS='|' read -r type old_path new_path; do
  old_import=$(echo "$old_path" | sed 's|^src/||')
  new_import=$(echo "$new_path" | sed 's|^src/||')

  if [ "$old_import" != "$new_import" ]; then
    old_escaped=$(echo "$old_import" | sed 's|/|\\/|g')
    new_escaped=$(echo "$new_import" | sed 's|/|\\/|g')

    echo "s|from ['\"]@/$old_escaped/|from '@/$new_escaped/|g" >> "$SED_SCRIPT"
    echo "s|from ['\"]\.\./$old_escaped/|from '../$new_escaped/|g" >> "$SED_SCRIPT"
    echo "s|from ['\"]\\./$old_escaped/|from './$new_escaped/|g" >> "$SED_SCRIPT"
    echo "s|import(['\"]@/$old_escaped/|import('@/$new_escaped/|g" >> "$SED_SCRIPT"
  fi
done

# Apply sed script to all TypeScript/JavaScript files
echo "Updating imports in source files..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i -f "$SED_SCRIPT" {} \;

echo "=== Phase 5: Updating vite config ==="
# Update vite.config.ts if it references any components
if [ -f "vite.config.ts" ]; then
  sed -i -f "$SED_SCRIPT" vite.config.ts
fi

echo "=== Cleanup ==="
rm "$MAPPING_FILE" "$SED_SCRIPT"

echo "=== Done! ==="
echo "All files and directories have been renamed to lowercase."
echo "All import statements have been updated."
echo ""
echo "Please run 'npm run build' to verify everything works correctly."
