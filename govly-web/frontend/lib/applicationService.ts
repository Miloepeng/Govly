import { supabase, UserApplication } from './supabase'

export interface ApplicationData {
  id: string
  formTitle: string
  dateApplied: string
  status: 'draft' | 'applied' | 'reviewed' | 'confirmed'
  formData: Record<string, any>
  schema: any
  progress: {
    applied: { date: string | null; completed: boolean }
    reviewed: { date: string | null; completed: boolean }
    confirmed: { date: string | null; completed: boolean }
  }
  completionPercentage?: number
  lastSaved?: string
}

export class ApplicationService {
  static async saveApplication(userId: string, application: ApplicationData): Promise<{ error: any }> {
    try {
      // Check if application with this ID already exists to prevent duplicates
      const { data: existingApp, error: checkError } = await supabase
        .from('user_applications')
        .select('id')
        .eq('id', application.id)
        .single()

      if (existingApp) {
        console.warn('Application with ID already exists:', application.id);
        return { error: { message: 'Application with this ID already exists' } };
      }

      // Insert new application
      const insertData: any = {
        id: application.id, // Use the provided ID
        user_id: userId,
        form_title: application.formTitle,
        form_data: application.formData,
        schema: application.schema,
        status: application.status,
        progress: application.progress,
      }

      // Add optional fields if they exist
      if (application.completionPercentage !== undefined) {
        insertData.completion_percentage = application.completionPercentage
      }
      if (application.lastSaved) {
        insertData.last_saved = application.lastSaved
      }

      const { error } = await supabase
        .from('user_applications')
        .insert(insertData)

      return { error }
    } catch (error) {
      return { error }
    }
  }

  static async savePartialForm(
    userId: string, 
    formTitle: string, 
    formData: Record<string, any>, 
    schema: any,
    completionPercentage: number
  ): Promise<{ error: any; applicationId?: string }> {
    try {
      // Check if there's already a draft application for this form
      const { data: existingApps, error: fetchError } = await supabase
        .from('user_applications')
        .select('id, form_data, completion_percentage')
        .eq('user_id', userId)
        .eq('form_title', formTitle)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(1)

      if (fetchError) {
        return { error: fetchError }
      }

      const now = new Date().toISOString()

      if (existingApps && existingApps.length > 0) {
        // Update existing draft
        const existingApp = existingApps[0]
        const { error } = await supabase
          .from('user_applications')
          .update({
            form_data: formData,
            completion_percentage: completionPercentage,
            last_saved: now,
            updated_at: now,
          })
          .eq('id', existingApp.id)

        return { error, applicationId: existingApp.id }
      } else {
        // Create new draft application
        const { data, error } = await supabase
          .from('user_applications')
          .insert({
            user_id: userId,
            form_title: formTitle,
            form_data: formData,
            schema: schema,
            status: 'draft',
            progress: {
              applied: { date: null, completed: false },
              reviewed: { date: null, completed: false },
              confirmed: { date: null, completed: false }
            },
            completion_percentage: completionPercentage,
            last_saved: now,
          })
          .select('id')
          .single()

        return { error, applicationId: data?.id }
      }
    } catch (error) {
      return { error }
    }
  }

  static async updateDraftToApplied(applicationId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('user_applications')
        .update({
          status: 'applied',
          progress: {
            applied: { date: new Date().toISOString(), completed: true },
            reviewed: { date: null, completed: false },
            confirmed: { date: null, completed: false }
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)

      return { error }
    } catch (error) {
      return { error }
    }
  }

  static async getUserApplications(userId: string): Promise<{ data: ApplicationData[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error }
      }

      const applications: ApplicationData[] = data.map(app => ({
        id: app.id,
        formTitle: app.form_title,
        dateApplied: app.created_at,
        status: app.status,
        formData: app.form_data,
        schema: app.schema,
        progress: app.progress,
      }))

      return { data: applications, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async updateApplicationStatus(
    applicationId: string, 
    status: 'applied' | 'reviewed' | 'confirmed',
    progress: any
  ): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('user_applications')
        .update({
          status,
          progress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)

      return { error }
    } catch (error) {
      return { error }
    }
  }

  static async deleteApplication(applicationId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('user_applications')
        .delete()
        .eq('id', applicationId)

      return { error }
    } catch (error) {
      return { error }
    }
  }

  // Migrate localStorage applications to Supabase
  static async migrateLocalStorageApplications(userId: string): Promise<{ error: any }> {
    try {
      const localApplications = JSON.parse(localStorage.getItem('applications') || '[]')
      
      if (localApplications.length === 0) {
        return { error: null }
      }

      // Insert all local applications with duplicate checking
      for (const app of localApplications) {
        const { error } = await this.saveApplication(userId, app);
        if (error) {
          console.warn('Failed to migrate application:', app.id, error);
        }
      }

      // Clear localStorage after migration attempt
      localStorage.removeItem('applications')

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  // Clean up duplicate applications
  static async cleanupDuplicates(userId: string): Promise<{ error: any }> {
    try {
      // Get all applications for the user
      const { data: applications, error: fetchError } = await supabase
        .from('user_applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        return { error: fetchError }
      }

      // Group by form_title and keep only the most recent one
      const groupedApps = new Map();
      applications.forEach(app => {
        const key = `${app.form_title}-${app.status}`;
        if (!groupedApps.has(key) || new Date(app.created_at) > new Date(groupedApps.get(key).created_at)) {
          groupedApps.set(key, app);
        }
      });

      // Delete duplicates (keep only the most recent ones)
      const appsToKeep = Array.from(groupedApps.values());
      const appsToDelete = applications.filter(app => 
        !appsToKeep.some(keepApp => keepApp.id === app.id)
      );

      for (const app of appsToDelete) {
        await supabase
          .from('user_applications')
          .delete()
          .eq('id', app.id)
      }

      console.log(`Cleaned up ${appsToDelete.length} duplicate applications`);
      return { error: null }
    } catch (error) {
      return { error }
    }
  }
}
