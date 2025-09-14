-- Supabase Authentication Schema for Govly
-- This schema creates user profiles and applications tables with proper RLS policies

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    address TEXT,
    email TEXT UNIQUE,
    phone_number TEXT,
    id_number TEXT,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    nationality TEXT DEFAULT 'Vietnamese',
    occupation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user applications table
CREATE TABLE IF NOT EXISTS user_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    form_title TEXT NOT NULL,
    form_data JSONB NOT NULL,
    schema JSONB,
    status TEXT DEFAULT 'applied' CHECK (status IN ('applied', 'reviewed', 'confirmed')),
    progress JSONB DEFAULT '{
        "applied": {"date": null, "completed": false},
        "reviewed": {"date": null, "completed": false},
        "confirmed": {"date": null, "completed": false}
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_applications_user_id ON user_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_applications_status ON user_applications(status);
CREATE INDEX IF NOT EXISTS idx_user_applications_created_at ON user_applications(created_at);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_applications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = id);

-- Create RLS policies for user_applications
CREATE POLICY "Users can view own applications" ON user_applications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications" ON user_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications" ON user_applications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own applications" ON user_applications
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_applications_updated_at
    BEFORE UPDATE ON user_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to get user profile with applications
CREATE OR REPLACE FUNCTION get_user_data(user_uuid UUID)
RETURNS TABLE (
    profile user_profiles,
    applications user_applications[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.*,
        ARRAY(
            SELECT ua.* 
            FROM user_applications ua 
            WHERE ua.user_id = user_uuid 
            ORDER BY ua.created_at DESC
        )
    FROM user_profiles up
    WHERE up.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON user_profiles TO anon, authenticated;
GRANT ALL ON user_applications TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_data(UUID) TO anon, authenticated;
