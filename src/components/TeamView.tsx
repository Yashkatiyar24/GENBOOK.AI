import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Shield, MoreVertical, Trash2, Edit, Crown } from 'lucide-react';
import { supabase } from '../supabase';

interface TeamViewProps {
  user: any;
}

interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  joined_at: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  invited_by: string;
  invited_by_name: string;
  created_at: string;
}

const TeamView: React.FC<TeamViewProps> = ({ user }) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [userRole, setUserRole] = useState('member');

  useEffect(() => {
    if (user) {
      fetchTeamData();
    }
  }, [user]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);

      // Get user's organization and role
      const { data: userOrgData, error: userOrgError } = await supabase.rpc('get_user_organization');
      if (userOrgError) throw userOrgError;
      
      if (userOrgData && userOrgData.length > 0) {
        setUserRole(userOrgData[0].role);
        const orgId = userOrgData[0].organization_id;

        // Get team members
        const { data: membersData, error: membersError } = await supabase
          .from('organization_members')
          .select(`
            id,
            user_id,
            role,
            status,
            joined_at,
            user_profiles!inner(email, full_name)
          `)
          .eq('organization_id', orgId);

        if (membersError) throw membersError;

        const formattedMembers = membersData?.map(member => ({
          id: member.id,
          user_id: member.user_id,
          email: member.user_profiles.email,
          full_name: member.user_profiles.full_name,
          role: member.role,
          status: member.status,
          joined_at: member.joined_at,
        })) || [];

        setTeamMembers(formattedMembers);

        // Get pending invitations
        const { data: invitationsData, error: invitationsError } = await supabase
          .from('invitations')
          .select(`
            id,
            email,
            role,
            invited_by,
            created_at,
            user_profiles!invitations_invited_by_fkey(full_name)
          `)
          .eq('organization_id', orgId)
          .eq('status', 'pending');

        if (invitationsError) throw invitationsError;

        const formattedInvitations = invitationsData?.map(invitation => ({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          invited_by: invitation.invited_by,
          invited_by_name: invitation.user_profiles?.full_name || 'Unknown',
          created_at: invitation.created_at,
        })) || [];

        setPendingInvitations(formattedInvitations);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;

    try {
      const { data: userOrgData } = await supabase.rpc('get_user_organization');
      if (!userOrgData || userOrgData.length === 0) return;

      const orgId = userOrgData[0].organization_id;

      const { error } = await supabase
        .from('invitations')
        .insert({
          organization_id: orgId,
          email: inviteEmail.toLowerCase().trim(),
          role: inviteRole,
          invited_by: user.id,
        });

      if (error) throw error;

      // TODO: Send invitation email
      alert('Invitation sent successfully!');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      await fetchTeamData();
    } catch (error) {
      console.error('Error inviting member:', error);
      alert('Error sending invitation. Please try again.');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      await fetchTeamData();
      alert('Team member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Error removing team member. Please try again.');
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      await fetchTeamData();
      alert('Role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Error updating role. Please try again.');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;

    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      await fetchTeamData();
      alert('Invitation cancelled successfully');
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      alert('Error cancelling invitation. Please try again.');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-red-400" />;
      default:
        return <Users className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'text-yellow-400';
      case 'admin':
        return 'text-red-400';
      default:
        return 'text-cyan-400';
    }
  };

  const canManageTeam = userRole === 'owner' || userRole === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Team Management</h1>
          <p className="text-gray-400">Manage your team members and permissions</p>
        </div>
        {canManageTeam && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Team Members */}
      <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/10">
        <h2 className="text-xl font-semibold text-white mb-6">Team Members ({teamMembers.length})</h2>
        
        {teamMembers.length > 0 ? (
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-gray-600/20"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-black font-semibold text-sm">
                      {member.full_name?.charAt(0)?.toUpperCase() || member.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{member.full_name || member.email}</p>
                    <p className="text-sm text-gray-400">{member.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getRoleIcon(member.role)}
                    <span className={`text-sm font-medium capitalize ${getRoleColor(member.role)}`}>
                      {member.role}
                    </span>
                  </div>
                  
                  {canManageTeam && member.user_id !== user.id && (
                    <div className="relative group">
                      <button className="p-2 hover:bg-gray-600/20 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                      <div className="absolute right-0 top-full mt-2 w-48 bg-black/90 backdrop-blur-xl border border-gray-600/20 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                        <div className="p-2">
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                            className="w-full p-2 bg-black/50 border border-gray-600/20 rounded text-white text-sm mb-2"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                            {userRole === 'owner' && <option value="owner">Owner</option>}
                          </select>
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="w-full flex items-center space-x-2 p-2 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm">Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No team members yet</p>
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/10">
          <h2 className="text-xl font-semibold text-white mb-6">Pending Invitations ({pendingInvitations.length})</h2>
          
          <div className="space-y-4">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{invitation.email}</p>
                    <p className="text-sm text-gray-400">
                      Invited by {invitation.invited_by_name} • {new Date(invitation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getRoleIcon(invitation.role)}
                    <span className={`text-sm font-medium capitalize ${getRoleColor(invitation.role)}`}>
                      {invitation.role}
                    </span>
                  </div>
                  
                  {canManageTeam && (
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D1117] border border-cyan-500/30 rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Invite Team Member</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-red-500/20 flex items-center justify-center transition-colors"
              >
                <span className="text-gray-400 hover:text-red-400">✕</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full p-3 bg-black/30 border border-gray-600/30 rounded-lg text-white focus:border-cyan-400/50 focus:outline-none"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  {userRole === 'owner' && <option value="owner">Owner</option>}
                </select>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2 px-4 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-600/20 hover:border-gray-500/40 text-gray-300 font-medium rounded-lg transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteMember}
                  disabled={!inviteEmail.trim()}
                  className="flex-1 py-2 px-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamView;
