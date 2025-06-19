import { BasePocketBaseService } from './baseService';

export interface Company {
  id: string;
  name: string;
  website_url: string | null;
  user: string;
  created: string;
  updated: string;
}

interface ToastHandlers {
  toast: (params: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
  }) => void;
}

interface CompanyResponse {
  data: Company[] | Company | null;
  error: string | null;
  status: 'success' | 'error';
}

export class CompanyService extends BasePocketBaseService {
  private collection = 'companies';

  /**
   * Get all companies for the current user
   */
  async getCompanies(): Promise<CompanyResponse> {
    try {
      if (!this.checkAuth()) {
        return { data: null, error: 'Authentication required', status: 'error' };
      }

      const userId = this.getCurrentUserId();
      if (!userId) {
        return { data: null, error: 'User ID not found', status: 'error' };
      }

      const filter = this.buildFilter({ user: userId });
      const companies = await this.pb.collection(this.collection).getFullList({
        filter,
        sort: 'name',
      });

      const mappedCompanies: Company[] = companies.map(record => ({
        id: record.id,
        name: record.name,
        website_url: record.website_url,
        user: record.user,
        created: record.created,
        updated: record.updated,
      }));
      return { data: mappedCompanies, error: null, status: 'success' };
    } catch (error: unknown) {
      this.logger.error('Failed to fetch companies:', error);
      return { data: null, error: 'Failed to fetch companies', status: 'error' };
    }
  }

  /**
   * Create a new company
   */
  async createCompany(
    name: string,
    websiteUrl: string | null,
    { toast }: ToastHandlers
  ): Promise<CompanyResponse> {
    try {
      if (!this.checkAuth()) {
        const error = 'Authentication required';
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return { data: null, error, status: 'error' };
      }

      const userId = this.getCurrentUserId();
      if (!userId) {
        const error = 'User ID not found';
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return { data: null, error, status: 'error' };
      }

      // Check if company name already exists for this user
      const existingFilter = this.buildFilter({ user: userId, name: name.trim() });
      const existing = await this.pb
        .collection(this.collection)
        .getFirstListItem(existingFilter)
        .catch(() => null);

      if (existing) {
        const error = 'A company with this name already exists';
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return { data: null, error, status: 'error' };
      }

      const newCompany = await this.pb.collection(this.collection).create({
        name: name.trim(),
        website_url: websiteUrl?.trim() || null,
        user: userId,
      });

      toast({ title: 'Success', description: `${name} has been created` });
      const mappedCompany: Company = {
        id: newCompany.id,
        name: newCompany.name,
        website_url: newCompany.website_url,
        user: newCompany.user,
        created: newCompany.created,
        updated: newCompany.updated,
      };
      return { data: mappedCompany, error: null, status: 'success' };
    } catch (error: unknown) {
      this.logger.error('Failed to create company:', error);
      const errorMessage = 'Failed to create company';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      return { data: null, error: errorMessage, status: 'error' };
    }
  }

  /**
   * Update an existing company
   */
  async updateCompany(
    companyId: string,
    name: string,
    websiteUrl: string | null,
    { toast }: ToastHandlers
  ): Promise<CompanyResponse> {
    try {
      if (!this.checkAuth()) {
        const error = 'Authentication required';
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return { data: null, error, status: 'error' };
      }

      const userId = this.getCurrentUserId();
      if (!userId) {
        const error = 'User ID not found';
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return { data: null, error, status: 'error' };
      }

      // Get current company to check ownership and name changes
      const currentCompany = await this.pb.collection(this.collection).getOne(companyId);

      if (currentCompany.user !== userId) {
        const error = 'You can only update your own companies';
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return { data: null, error, status: 'error' };
      }

      // Check if company name already exists (if name changed)
      if (name.trim() !== currentCompany.name) {
        const existingFilter = this.buildFilter({ user: userId, name: name.trim() });
        const existing = await this.pb
          .collection(this.collection)
          .getFirstListItem(existingFilter)
          .catch(() => null);

        if (existing && existing.id !== companyId) {
          const error = 'A company with this name already exists';
          toast({ title: 'Error', description: error, variant: 'destructive' });
          return { data: null, error, status: 'error' };
        }
      }

      const updatedCompany = await this.pb.collection(this.collection).update(companyId, {
        name: name.trim(),
        website_url: websiteUrl?.trim() || null,
      });

      toast({ title: 'Success', description: `${name} has been updated` });
      const mappedCompany: Company = {
        id: updatedCompany.id,
        name: updatedCompany.name,
        website_url: updatedCompany.website_url,
        user: updatedCompany.user,
        created: updatedCompany.created,
        updated: updatedCompany.updated,
      };
      return { data: mappedCompany, error: null, status: 'success' };
    } catch (error: unknown) {
      this.logger.error('Failed to update company:', error);
      const errorMessage = 'Failed to update company';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      return { data: null, error: errorMessage, status: 'error' };
    }
  }

  /**
   * Delete a company
   */
  async deleteCompany(companyId: string, { toast }: ToastHandlers): Promise<CompanyResponse> {
    try {
      if (!this.checkAuth()) {
        const error = 'Authentication required';
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return { data: null, error, status: 'error' };
      }

      const userId = this.getCurrentUserId();
      if (!userId) {
        const error = 'User ID not found';
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return { data: null, error, status: 'error' };
      }

      // Get current company to check ownership
      const currentCompany = await this.pb.collection(this.collection).getOne(companyId);

      if (currentCompany.user !== userId) {
        const error = 'You can only delete your own companies';
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return { data: null, error, status: 'error' };
      }

      await this.pb.collection(this.collection).delete(companyId);

      toast({ title: 'Success', description: 'Company has been deleted' });
      return { data: null, error: null, status: 'success' };
    } catch (error: unknown) {
      this.logger.error('Failed to delete company:', error);
      const errorMessage = 'Failed to delete company';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      return { data: null, error: errorMessage, status: 'error' };
    }
  }
}

// Export singleton instance
export const companyService = new CompanyService();
