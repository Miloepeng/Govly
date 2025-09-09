-- Enhanced Forms Table with Categories and AWS Textract Integration
-- This replaces the existing simple forms table

-- Drop existing forms table if it exists (be careful in production!)
-- DROP TABLE IF EXISTS forms CASCADE;

-- Create the new enhanced forms table
CREATE TABLE IF NOT EXISTS forms_v2 (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Basic form metadata
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- e.g., 'housing', 'business', 'immigration', 'education'
    subcategory TEXT, -- e.g., 'property_verification', 'business_registration'
    
    -- File information
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Path to the PDF file
    file_size_bytes INTEGER,
    file_hash TEXT, -- For deduplication
    
    -- AWS Textract data
    textract_json JSONB, -- Raw AWS Textract response
    extracted_text TEXT, -- Cleaned text from Textract
    form_fields JSONB, -- Extracted form fields as structured JSON
    confidence_scores JSONB, -- Confidence scores for each field
    
    -- Location and agency info
    country TEXT NOT NULL DEFAULT 'VN',
    agency TEXT,
    department TEXT,
    
    -- Search and discovery
    tags TEXT[], -- Array of tags for better search
    keywords TEXT[], -- Extracted keywords
    language TEXT DEFAULT 'vi', -- Form language
    
    -- Vector embedding for semantic search
    embedding vector(1024),
    
    -- Status and processing info
    processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    processing_error TEXT,
    last_processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Version control
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forms_v2_category ON forms_v2(category);
CREATE INDEX IF NOT EXISTS idx_forms_v2_country ON forms_v2(country);
CREATE INDEX IF NOT EXISTS idx_forms_v2_agency ON forms_v2(agency);
CREATE INDEX IF NOT EXISTS idx_forms_v2_status ON forms_v2(processing_status);
CREATE INDEX IF NOT EXISTS idx_forms_v2_active ON forms_v2(is_active);
CREATE INDEX IF NOT EXISTS idx_forms_v2_tags ON forms_v2 USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_forms_v2_keywords ON forms_v2 USING GIN(keywords);

-- Create GIN index for JSONB columns for efficient querying
CREATE INDEX IF NOT EXISTS idx_forms_v2_textract_json ON forms_v2 USING GIN(textract_json);
CREATE INDEX IF NOT EXISTS idx_forms_v2_form_fields ON forms_v2 USING GIN(form_fields);

-- Create vector similarity search function for the new table
CREATE OR REPLACE FUNCTION match_forms_v2(
    query_embedding vector(1024),
    match_count int DEFAULT 5,
    filter_country text DEFAULT NULL,
    filter_agency text DEFAULT NULL,
    filter_category text DEFAULT NULL,
    filter_subcategory text DEFAULT NULL
)
RETURNS TABLE (
    id bigint,
    title text,
    description text,
    category text,
    subcategory text,
    original_filename text,
    file_path text,
    country text,
    agency text,
    department text,
    tags text[],
    keywords text[],
    language text,
    form_fields jsonb,
    confidence_scores jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        forms_v2.id,
        forms_v2.title,
        forms_v2.description,
        forms_v2.category,
        forms_v2.subcategory,
        forms_v2.original_filename,
        forms_v2.file_path,
        forms_v2.country,
        forms_v2.agency,
        forms_v2.department,
        forms_v2.tags,
        forms_v2.keywords,
        forms_v2.language,
        forms_v2.form_fields,
        forms_v2.confidence_scores,
        1 - (forms_v2.embedding <=> query_embedding) AS similarity
    FROM forms_v2
    WHERE forms_v2.is_active = true
        AND (filter_country IS NULL OR forms_v2.country = filter_country)
        AND (filter_agency IS NULL OR forms_v2.agency = filter_agency)
        AND (filter_category IS NULL OR forms_v2.category = filter_category)
        AND (filter_subcategory IS NULL OR forms_v2.subcategory = filter_subcategory)
    ORDER BY forms_v2.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Create function to search forms by text content (for non-vector searches)
CREATE OR REPLACE FUNCTION search_forms_by_text(
    search_query text,
    match_count int DEFAULT 5,
    filter_country text DEFAULT NULL,
    filter_agency text DEFAULT NULL,
    filter_category text DEFAULT NULL
)
RETURNS TABLE (
    id bigint,
    title text,
    description text,
    category text,
    subcategory text,
    original_filename text,
    file_path text,
    country text,
    agency text,
    department text,
    tags text[],
    keywords text[],
    language text,
    form_fields jsonb,
    rank float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        forms_v2.id,
        forms_v2.title,
        forms_v2.description,
        forms_v2.category,
        forms_v2.subcategory,
        forms_v2.original_filename,
        forms_v2.file_path,
        forms_v2.country,
        forms_v2.agency,
        forms_v2.department,
        forms_v2.tags,
        forms_v2.keywords,
        forms_v2.language,
        forms_v2.form_fields,
        ts_rank(
            to_tsvector('simple', COALESCE(forms_v2.title, '') || ' ' || 
                              COALESCE(forms_v2.description, '') || ' ' || 
                              COALESCE(forms_v2.extracted_text, '') || ' ' ||
                              COALESCE(array_to_string(forms_v2.tags, ' '), '') || ' ' ||
                              COALESCE(array_to_string(forms_v2.keywords, ' '), '')),
            plainto_tsquery('simple', search_query)
        ) AS rank
    FROM forms_v2
    WHERE forms_v2.is_active = true
        AND (filter_country IS NULL OR forms_v2.country = filter_country)
        AND (filter_agency IS NULL OR forms_v2.agency = filter_agency)
        AND (filter_category IS NULL OR forms_v2.category = filter_category)
        AND (
            to_tsvector('simple', COALESCE(forms_v2.title, '') || ' ' || 
                                  COALESCE(forms_v2.description, '') || ' ' || 
                                  COALESCE(forms_v2.extracted_text, '') || ' ' ||
                                  COALESCE(array_to_string(forms_v2.tags, ' '), '') || ' ' ||
                                  COALESCE(array_to_string(forms_v2.keywords, ' '), ''))
            @@ plainto_tsquery('simple', search_query)
        )
    ORDER BY rank DESC
    LIMIT match_count;
END;
$$;

-- Create function to get form categories and subcategories
CREATE OR REPLACE FUNCTION get_form_categories()
RETURNS TABLE (
    category text,
    subcategory text,
    count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        forms_v2.category,
        forms_v2.subcategory,
        COUNT(*) as count
    FROM forms_v2
    WHERE forms_v2.is_active = true
    GROUP BY forms_v2.category, forms_v2.subcategory
    ORDER BY forms_v2.category, forms_v2.subcategory;
END;
$$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_forms_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_forms_v2_updated_at
    BEFORE UPDATE ON forms_v2
    FOR EACH ROW
    EXECUTE FUNCTION update_forms_v2_updated_at();

-- Insert some sample categories for reference
INSERT INTO forms_v2 (title, description, category, subcategory, country, agency, original_filename, file_path, processing_status, is_active)
VALUES 
    ('Sample Housing Form', 'Sample form for housing category', 'housing', 'property_verification', 'VN', 'UBND xã/phường', 'sample.pdf', '/forms/sample.pdf', 'completed', true),
    ('Sample Business Form', 'Sample form for business category', 'business', 'registration', 'VN', 'Sở Kế hoạch và Đầu tư', 'sample.pdf', '/forms/sample.pdf', 'completed', true)
ON CONFLICT DO NOTHING;
