import { supabase } from '../supabase.js';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      db?: any; // You might want to replace 'any' with a more specific type
    }
  }
}

export class TenantDB {
  private tenantId: string;
  private userId?: string;

  constructor(tenantId: string, userId?: string) {
    this.tenantId = tenantId;
    this.userId = userId;
  }

  // Set the tenant context for RLS
  private async setTenantContext() {
    await supabase.rpc('set_tenant_context', { tenant_id: this.tenantId });
  }

  // Example method for querying appointments
  async getAppointments(filters = {}) {
    await this.setTenantContext();
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('tenant_id', this.tenantId);

    // Apply additional filters if provided
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    return query;
  }

  // Get user by ID within the tenant
  async getUser(userId: string) {
    await this.setTenantContext();
    return supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('tenant_id', this.tenantId)
      .single();
  }

  // Create a new record in any table with tenant_id
  async createRecord(table: string, data: any) {
    await this.setTenantContext();
    return supabase
      .from(table)
      .insert([{ ...data, tenant_id: this.tenantId }])
      .select()
      .single();
  }

  // Update a record within the tenant
  async updateRecord(table: string, id: string, updates: any) {
    await this.setTenantContext();
    return supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', this.tenantId);
  }

  // Delete a record within the tenant
  async deleteRecord(table: string, id: string) {
    await this.setTenantContext();
    return supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId);
  }
}

// Middleware to attach tenant-scoped DB to request
export const tenantDB = (req: Request, res: Response, next: NextFunction) => {
  if (!req.tenantId) {
    return res.status(400).json({ error: 'Tenant context not found' });
  }
  req.db = new TenantDB(req.tenantId, req.userId);
  next();
};
