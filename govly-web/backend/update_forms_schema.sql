-- Update existing forms table to support AWS Textract data
-- Run this in your Supabase SQL Editor

-- Add new columns to the existing forms table
ALTER TABLE forms ADD COLUMN IF NOT EXISTS textract_json JSONB;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS form_fields JSONB;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS tables JSONB;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS confidence_scores JSONB;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE forms ADD COLUMN IF NOT EXISTS keywords TEXT[];
ALTER TABLE forms ADD COLUMN IF NOT EXISTS file_hash TEXT;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forms_category ON forms(category);
CREATE INDEX IF NOT EXISTS idx_forms_file_hash ON forms(file_hash);
CREATE INDEX IF NOT EXISTS idx_forms_processing_status ON forms(processing_status);
CREATE INDEX IF NOT EXISTS idx_forms_is_active ON forms(is_active);
CREATE INDEX IF NOT EXISTS idx_forms_tags ON forms USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_forms_keywords ON forms USING GIN(keywords);

-- Create GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_forms_textract_json ON forms USING GIN(textract_json);
CREATE INDEX IF NOT EXISTS idx_forms_form_fields ON forms USING GIN(form_fields);

-- Update existing forms to have default values
UPDATE forms SET 
    category = 'general',
    processing_status = 'completed',
    is_active = true,
    last_processed_at = NOW()
WHERE category IS NULL;

-- Create a function to search forms by category
CREATE OR REPLACE FUNCTION search_forms_by_category(
    search_category text,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id bigint,
    title text,
    url text,
    content text,
    country text,
    agency text,
    category text,
    subcategory text,
    tags text[],
    keywords text[],
    form_fields jsonb,
    confidence_scores jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        forms.id,
        forms.title,
        forms.url,
        forms.content,
        forms.country,
        forms.agency,
        forms.category,
        forms.subcategory,
        forms.tags,
        forms.keywords,
        forms.form_fields,
        forms.confidence_scores,
        1.0 AS similarity  -- For category search, we don't use vector similarity
    FROM forms
    WHERE forms.is_active = true
        AND (search_category IS NULL OR forms.category = search_category)
    ORDER BY forms.id DESC
    LIMIT match_count;
END;
$$;

-- Create a function to get form categories
CREATE OR REPLACE FUNCTION get_forms_categories()
RETURNS TABLE (
    category text,
    count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        forms.category,
        COUNT(*) as count
    FROM forms
    WHERE forms.is_active = true
    GROUP BY forms.category
    ORDER BY forms.category;
END;
$$;
