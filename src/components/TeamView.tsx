'use client';

import { useState, useEffect } from 'react';
import { Search, UserPlus, Mail, Phone, Clock, MoreVertical, User } from 'lucide-react';
import React from 'react';
import { supabase } from '../supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
// Use project UI components (relative imports)
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu';

// Using shared UI components from the project's design system

// Removed local Select mock components; using native <select> instead where needed

// Role badge handled inline with <Badge /> where needed

// Render team member avatar
interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  lastActive?: string;
  avatarUrl?: string;
}

// Role pill classes to match project UI colors
const roleClasses: Record<TeamMemberRole, string> = {
  admin: 'bg-purple-100 text-purple-800',
  doctor: 'bg-blue-100 text-blue-800',
  staff: 'bg-green-100 text-green-800',
  receptionist: 'bg-yellow-100 text-yellow-800',
  viewer: 'bg-gray-100 text-gray-800',
};

const renderAvatar = (member: TeamMember) => {
  if (member.avatarUrl) {
    return (
      <Avatar>
        <AvatarImage src={member.avatarUrl} alt={member.name} />
        <AvatarFallback>
          {getInitials(member.name, member.email)}
        </AvatarFallback>
      </Avatar>
    );
  }
  return (
    <Avatar>
      <AvatarFallback>
        {getInitials(member.name, member.email)}
      </AvatarFallback>
    </Avatar>
  );
};

// Types
type TeamMemberRole = 'admin' | 'doctor' | 'staff' | 'receptionist' | 'viewer';
type TeamMemberStatus = 'active' | 'inactive' | 'pending';

interface TeamViewProps {
  user: SupabaseUser | null;
}

// Helper function to get user initials
function getInitials(name?: string, email?: string): string {
  if (name) {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return '??';
}

// Format date to relative time
function formatDate(dateString?: string): string {
  if (!dateString) return 'never';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

export default function TeamView({ user }: TeamViewProps) {
  // Using Supabase directly (RLS + Edge Functions). No local API base needed.
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<TeamMemberRole | 'all'>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const isAdmin = ((user as any)?.user_metadata?.role ?? 'viewer') === 'admin';

  // Handle search input
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Load members from Supabase (RLS-protected)
  const loadMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const mapped: TeamMember[] = (data || []).map((m: any) => ({
        id: m.id,
        name: m.name || m.email?.split('@')[0] || 'Member',
        email: m.email,
        role: (m.role || 'viewer') as TeamMemberRole,
        status: 'active',
        lastActive: m.created_at,
      }));
      setTeamMembers(mapped);
      setFilteredMembers(mapped);
    } catch (err) {
      console.error('Error loading members:', err);
      setTeamMembers([]);
      setFilteredMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle invite submission -> calls Supabase Edge Function and refreshes list
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const payload = {
      email: String(formData.get('email') || ''),
      name: String(formData.get('name') || ''),
      role: String(formData.get('role') || 'viewer'),
    };
    try {
      const { error } = await supabase.functions.invoke('team-invite', {
        body: payload,
      });
      if (error) throw error;
      // Close and refresh
      setShowInviteModal(false);
      form.reset();
      // Member will appear after accepting invite; still refresh list for safety
      await loadMembers();
    } catch (error) {
      console.error('Invite failed:', error);
      // Optionally show a toast here
    }
  };

  // Filter team members based on search and role
  useEffect(() => {
    const filtered = teamMembers.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || member.role === roleFilter;
      return matchesSearch && matchesRole;
    });
    setFilteredMembers(filtered);
  }, [searchQuery, roleFilter, teamMembers]);

  // Initial load
  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-gray-500">Manage your team members and their permissions</p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              className="pl-10 w-full"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as TeamMemberRole | 'all')}
              className="border rounded-md p-2 text-sm bg-background"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="doctor">Doctor</option>
              <option value="staff">Staff</option>
              <option value="viewer">Viewer</option>
            </select>
            
            <Button onClick={() => setShowInviteModal(true)} className="whitespace-nowrap">
              <UserPlus className="mr-2 h-4 w-4" /> Invite Member
            </Button>
          </div>
        </div>

        {/* Team members list */}
        <Card>
          <div className="divide-y">
            {filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No team members found matching your criteria
              </div>
            ) : (
              filteredMembers.map((member) => (
                <Card key={member.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4">
                      <div className="flex items-center space-x-4">
                        {renderAvatar(member)}
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{member.name}</p>
                            <Badge variant="outline" className={`border-transparent ${roleClasses[member.role]}`}>
                              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                            </Badge>
                            {member.status === 'active' && (
                              <Badge variant="secondary" className="text-xs flex items-center">
                                <span className="h-2 w-2 rounded-full bg-green-500 mr-1.5"></span>
                                Active
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 mr-1.5" />
                            <span>{member.email}</span>
                            {member.phone && (
                              <>
                                <span className="mx-2">•</span>
                                <Phone className="h-3.5 w-3.5 mr-1.5" />
                                <span>{member.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center mt-4 sm:mt-0 sm:ml-4 space-x-2">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 mr-1.5" />
                          <span>Last active {formatDate(member.lastActive)}</span>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <User className="mr-2 h-4 w-4" />
                              <span>View Profile</span>
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuItem>
                                  <Mail className="mr-2 h-4 w-4" />
                                  <span>Send Message</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  <span className="mr-2">×</span>
                                  <span>Remove Member</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </Card>

        {/* Invite Member Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Invite Team Member</h2>
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    aria-label="Close"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>
                
                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Name (optional)
                    </label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Member name"
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="member@example.com"
                      required
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select 
                    name="role"
                    defaultValue="staff"
                    className="w-full border rounded-md p-2 text-sm bg-background"
                  >
                    <option value="admin">Admin</option>
                    <option value="doctor">Doctor</option>
                    <option value="staff">Staff</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                
                <div className="flex justify-end space-x-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowInviteModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Send Invite
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
};
