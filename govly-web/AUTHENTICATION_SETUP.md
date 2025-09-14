# Authentication Setup Guide

This guide will help you set up Supabase authentication for the Govly application, allowing users to store their applications and personal details securely.

## 🚀 Quick Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new account
2. Create a new project
3. Note down your project URL and anon key from Settings > API

### 2. Set Up Database Schema

Run the SQL schema in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of backend/supabase_auth_schema.sql
```

This will create:
- `user_profiles` table for storing user personal information
- `user_applications` table for storing user applications
- Row Level Security (RLS) policies
- Automatic profile creation triggers

### 3. Configure Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Enable Authentication

In your Supabase dashboard:
1. Go to Authentication > Settings
2. Set Site URL to `http://localhost:3000` (for development)
3. Add redirect URLs as needed
4. Enable email authentication

## 📋 Features Implemented

### ✅ User Authentication
- **Sign Up**: Users can create accounts with email/password
- **Sign In**: Secure login with email/password
- **Sign Out**: Secure logout functionality
- **Session Management**: Automatic session handling

### ✅ User Profile Management
- **Personal Information**: Name, email, phone, address, ID number
- **Additional Details**: Date of birth, gender, nationality, occupation
- **Profile Editing**: Users can update their information
- **Data Validation**: Form validation and error handling

### ✅ Application Storage
- **Cloud Storage**: Applications stored in Supabase instead of localStorage
- **Data Migration**: Automatic migration from localStorage to Supabase
- **Application Tracking**: Status tracking (applied, reviewed, confirmed)
- **Progress Tracking**: Detailed progress with timestamps

### ✅ Form Autofill
- **Smart Matching**: Automatic field matching based on user profile
- **Fuzzy Matching**: Intelligent field name recognition
- **Autofill Suggestions**: One-click form filling
- **Profile Integration**: Seamless integration with user data

## 🔧 Technical Implementation

### Database Schema

```sql
-- User profiles table
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT,
    email TEXT UNIQUE,
    phone_number TEXT,
    address TEXT,
    id_number TEXT,
    date_of_birth DATE,
    gender TEXT,
    nationality TEXT DEFAULT 'Vietnamese',
    occupation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User applications table
CREATE TABLE user_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id),
    form_title TEXT NOT NULL,
    form_data JSONB NOT NULL,
    schema JSONB,
    status TEXT DEFAULT 'applied',
    progress JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **Authentication Required**: All application operations require authentication
- **Data Validation**: Server-side validation for all user inputs
- **Secure Storage**: Encrypted data storage in Supabase

### Components Created

1. **AuthContext**: Global authentication state management
2. **AuthModal**: Sign in/sign up modal component
3. **UserProfile**: User profile management component
4. **ApplicationService**: Service for managing applications
5. **FormAutofillService**: Service for form autofill functionality

## 🎯 Usage

### For Users

1. **Sign Up**: Click "Sign In" button on dashboard, then "Sign up"
2. **Complete Profile**: Fill in personal information for autofill
3. **Submit Applications**: Applications are automatically saved to your account
4. **Track Progress**: View application status on the Status page
5. **Update Profile**: Click profile icon to edit personal information

### For Developers

```typescript
// Using authentication context
import { useAuth } from '../contexts/AuthContext'

function MyComponent() {
  const { user, profile, signOut } = useAuth()
  
  if (!user) {
    return <div>Please sign in</div>
  }
  
  return <div>Welcome, {profile?.full_name}!</div>
}

// Using application service
import { ApplicationService } from '../lib/applicationService'

const { data, error } = await ApplicationService.getUserApplications(user.id)

// Using form autofill
import { FormAutofillService } from '../lib/formAutofillService'

const suggestions = FormAutofillService.getAutofillSuggestions(fields, profile)
```

## 🔒 Security Considerations

- **Environment Variables**: Never commit `.env.local` to version control
- **API Keys**: Use Supabase anon key (safe for client-side use)
- **Data Validation**: Always validate user inputs
- **HTTPS**: Use HTTPS in production
- **Password Policy**: Consider implementing password requirements

## 🚨 Troubleshooting

### Common Issues

1. **"Invalid API key"**: Check your environment variables
2. **"User not authenticated"**: Ensure user is signed in
3. **"RLS policy violation"**: Check database policies are set correctly
4. **"Network error"**: Verify Supabase URL is correct

### Debug Steps

1. Check browser console for errors
2. Verify environment variables are loaded
3. Check Supabase dashboard for authentication logs
4. Test database queries in Supabase SQL editor

## 📈 Future Enhancements

- **Social Login**: Google, Facebook authentication
- **Two-Factor Authentication**: Enhanced security
- **Profile Pictures**: Avatar upload functionality
- **Application Templates**: Pre-filled form templates
- **Bulk Operations**: Multiple application management
- **Export Data**: Download application data
- **Notifications**: Email/SMS notifications for status updates

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase documentation
3. Check browser console for error messages
4. Verify all environment variables are set correctly

---

**Note**: This authentication system is designed for the Govly government services application. Make sure to customize the user profile fields and application schema according to your specific requirements.
