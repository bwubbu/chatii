/**
 * Utilities for parsing and validating training data JSONL files
 */

export interface ParsedTrainingEntry {
  type: 'positive_example' | 'negative_example';
  content: string;
  metadata: Record<string, any>;
  format: 'embedding' | 'finetuning';
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Parse JSONL file content into array of objects
 */
export function parseJSONLFile(content: string): { entries: any[]; errors: string[] } {
  const entries: any[] = [];
  const errors: string[] = [];
  const lines = content.split('\n').filter(line => line.trim().length > 0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const parsed = JSON.parse(line);
      entries.push(parsed);
    } catch (error) {
      errors.push(`Line ${i + 1}: Invalid JSON - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { entries, errors };
}

/**
 * Detect the format of a training data entry (embedding vs finetuning)
 */
export function detectFormat(entry: any): 'embedding' | 'finetuning' {
  // Embedding format has 'type' and 'content' fields
  if (entry.type && entry.content) {
    return 'embedding';
  }
  // Finetuning format has 'text' field
  if (entry.text) {
    return 'finetuning';
  }
  // Default to embedding if unclear
  return 'embedding';
}

/**
 * Detect the example type (positive vs negative)
 */
export function detectExampleType(entry: any, format: 'embedding' | 'finetuning'): 'positive_example' | 'negative_example' {
  if (format === 'embedding') {
    if (entry.type === 'positive_example' || entry.type === 'negative_example') {
      return entry.type;
    }
  } else {
    // Finetuning format - check metadata
    if (entry.metadata?.type === 'negative_example') {
      return 'negative_example';
    }
    // Check if text contains flagged indicators
    if (entry.text && typeof entry.text === 'string') {
      if (entry.text.includes('[FLAGGED:') || entry.text.includes('negative')) {
        return 'negative_example';
      }
    }
  }
  
  // Default to positive
  return 'positive_example';
}

/**
 * Extract content text from an entry
 */
export function extractContent(entry: any, format: 'embedding' | 'finetuning'): string {
  if (format === 'embedding') {
    return entry.content || '';
  } else {
    return entry.text || '';
  }
}

/**
 * Extract metadata from an entry
 */
export function extractMetadata(entry: any, format: 'embedding' | 'finetuning'): Record<string, any> {
  const metadata: Record<string, any> = {};

  if (format === 'embedding') {
    // Copy metadata object if it exists
    if (entry.metadata && typeof entry.metadata === 'object') {
      Object.assign(metadata, entry.metadata);
    }
    // Also include type at top level
    if (entry.type) {
      metadata.type = entry.type;
    }
  } else {
    // Finetuning format - metadata is in entry.metadata
    if (entry.metadata && typeof entry.metadata === 'object') {
      Object.assign(metadata, entry.metadata);
    }
  }

  return metadata;
}

/**
 * Validate a training data entry
 */
export function validateTrainingDataEntry(entry: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!entry || typeof entry !== 'object') {
    return {
      valid: false,
      errors: ['Entry must be a valid JSON object'],
      warnings: [],
    };
  }

  const format = detectFormat(entry);

  // Check required fields based on format
  if (format === 'embedding') {
    if (!entry.type) {
      errors.push('Missing required field: type');
    } else if (entry.type !== 'positive_example' && entry.type !== 'negative_example') {
      errors.push(`Invalid type: ${entry.type}. Must be 'positive_example' or 'negative_example'`);
    }
    if (!entry.content || typeof entry.content !== 'string') {
      errors.push('Missing or invalid required field: content (must be a string)');
    }
    if (entry.content && entry.content.trim().length === 0) {
      warnings.push('Content is empty');
    }
  } else {
    // Finetuning format
    if (!entry.text || typeof entry.text !== 'string') {
      errors.push('Missing or invalid required field: text (must be a string)');
    }
    if (entry.text && entry.text.trim().length === 0) {
      warnings.push('Text is empty');
    }
  }

  // Validate metadata if present
  if (entry.metadata && typeof entry.metadata !== 'object') {
    errors.push('Metadata must be an object');
  }

  // For negative examples, check for required metadata fields
  const exampleType = detectExampleType(entry, format);
  if (exampleType === 'negative_example') {
    const metadata = extractMetadata(entry, format);
    if (!metadata.reason) {
      warnings.push('Negative example missing reason in metadata');
    }
    if (!metadata.severity) {
      warnings.push('Negative example missing severity in metadata');
    } else if (!['low', 'medium', 'high', 'critical'].includes(metadata.severity)) {
      warnings.push(`Invalid severity: ${metadata.severity}. Should be one of: low, medium, high, critical`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Parse and normalize a training data entry into a standard format
 */
export function parseTrainingEntry(entry: any): ParsedTrainingEntry | null {
  const format = detectFormat(entry);
  const type = detectExampleType(entry, format);
  const content = extractContent(entry, format);
  const metadata = extractMetadata(entry, format);

  if (!content || content.trim().length === 0) {
    return null;
  }

  return {
    type,
    content: content.trim(),
    metadata,
    format,
  };
}

/**
 * Parse and validate an entire JSONL file
 */
export function parseAndValidateJSONL(
  content: string
): {
  entries: ParsedTrainingEntry[];
  errors: string[];
  warnings: string[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    positive: number;
    negative: number;
  };
} {
  const { entries: rawEntries, errors: parseErrors } = parseJSONLFile(content);
  const parsedEntries: ParsedTrainingEntry[] = [];
  const errors: string[] = [...parseErrors];
  const warnings: string[] = [];
  const stats = {
    total: rawEntries.length,
    valid: 0,
    invalid: 0,
    positive: 0,
    negative: 0,
  };

  for (let i = 0; i < rawEntries.length; i++) {
    const entry = rawEntries[i];
    const validation = validateTrainingDataEntry(entry);

    if (!validation.valid) {
      stats.invalid++;
      errors.push(`Entry ${i + 1}: ${validation.errors.join(', ')}`);
      continue;
    }

    if (validation.warnings.length > 0) {
      warnings.push(`Entry ${i + 1}: ${validation.warnings.join(', ')}`);
    }

    const parsed = parseTrainingEntry(entry);
    if (!parsed) {
      stats.invalid++;
      errors.push(`Entry ${i + 1}: Could not extract content`);
      continue;
    }

    parsedEntries.push(parsed);
    stats.valid++;
    if (parsed.type === 'positive_example') {
      stats.positive++;
    } else {
      stats.negative++;
    }
  }

  return {
    entries: parsedEntries,
    errors,
    warnings,
    stats,
  };
}
