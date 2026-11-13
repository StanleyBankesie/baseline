import fs from 'fs';
import path from 'path';

export function readSourceFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Source file does not exist: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

export function checkFileContains(filePath, pattern) {
  const content = readSourceFile(filePath);
  if (pattern instanceof RegExp) {
    return pattern.test(content);
  }
  return content.includes(pattern);
}

export function checkFileExcludes(filePath, pattern) {
  return !checkFileContains(filePath, pattern);
}

export function countPatternInFile(filePath, pattern) {
  const content = readSourceFile(filePath);
  if (pattern instanceof RegExp) {
    const matches = content.match(pattern);
    return matches ? matches.length : 0;
  }
  return content.split(pattern).length - 1;
}

export function extractTableHeaders(filePath) {
  const content = readSourceFile(filePath);
  const headers = [];
  // Match <th...>text</th> or SortableHeader label="..."
  const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
  let match;
  while ((match = thRegex.exec(content)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text) headers.push(text);
  }
  const sortableRegex = /<SortableHeader[^>]*label=["']([^"']+)["']/gi;
  while ((match = sortableRegex.exec(content)) !== null) {
    headers.push(match[1].trim());
  }
  return headers;
}
