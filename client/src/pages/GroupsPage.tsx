// client/src/pages/GroupsPage.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ClassGroup, GroupMember, GroupSharedSession } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Plus,
  KeyRound,
  Share2,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Slash,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  X
} from 'lucide-react';

const TIME_SLOTS = [
  '09:00 - 10:00 AM',
  '10:00 - 11:00 AM',
  '11:15 - 12:15 PM',
  '12:15 - 01:15 PM',
  '02:00 - 03:00 PM',
  '03:00 - 04:00 PM',
  '04:00 - 05:00 PM'
];

export const GroupsPage: React.FC = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeGroupData, setActiveGroupData] = useState<{
    group: ClassGroup;
    members: GroupMember[];
    sharedSessions: GroupSharedSession[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [groupLoading, setGroupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);

  // Create Form State
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');

  // Join Form State
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  // Broadcast Form State
  const [broadcastSubjectName, setBroadcastSubjectName] = useState('');
  const [broadcastSubjectCode, setBroadcastSubjectCode] = useState('');
  const [broadcastDate, setBroadcastDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [broadcastTimeSlot, setBroadcastTimeSlot] = useState(TIME_SLOTS[0]);
  const [broadcastStatus, setBroadcastStatus] = useState<'conducted' | 'cancelled'>('conducted');
  const [broadcastNotes, setBroadcastNotes] = useState('');

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getGroups();
      setGroups(res.groups);
      if (res.groups.length > 0 && !activeGroupId) {
        setActiveGroupId(res.groups[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load class groups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchActiveGroup = async (id: string) => {
    try {
      setGroupLoading(true);
      const data = await api.getGroupDetails(id);
      setActiveGroupData(data);
    } catch (err: any) {
      console.error('Failed to load group details:', err);
    } finally {
      setGroupLoading(false);
    }
  };

  useEffect(() => {
    if (activeGroupId) {
      fetchActiveGroup(activeGroupId);
    }
  }, [activeGroupId]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    try {
      const res = await api.createGroup({ name: groupName.trim(), description: groupDesc.trim() });
      setCreateModalOpen(false);
      setGroupName('');
      setGroupDesc('');
      await fetchGroups();
      setActiveGroupId(res.group.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create group.');
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    try {
      const res = await api.joinGroup({ inviteCode: inviteCodeInput.trim() });
      setJoinModalOpen(false);
      setInviteCodeInput('');
      await fetchGroups();
      setActiveGroupId(res.group.id);
    } catch (err: any) {
      alert(err.message || 'Failed to join group.');
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroupId || !broadcastSubjectName.trim() || !broadcastSubjectCode.trim()) return;
    try {
      await api.broadcastSession(activeGroupId, {
        subjectName: broadcastSubjectName.trim(),
        subjectCode: broadcastSubjectCode.trim().toUpperCase(),
        date: broadcastDate,
        timeSlot: broadcastTimeSlot,
        sessionStatus: broadcastStatus,
        notes: broadcastNotes.trim()
      });
      setBroadcastModalOpen(false);
      setBroadcastSubjectName('');
      setBroadcastSubjectCode('');
      setBroadcastNotes('');
      await fetchActiveGroup(activeGroupId);
    } catch (err: any) {
      alert(err.message || 'Failed to post shared update.');
    }
  };

  const handleSyncToMyAttendance = async (sessionId: string, status: 'attended' | 'absent' | 'cancelled') => {
    try {
      await api.syncSharedSession(sessionId, { status });
      if (activeGroupId) {
        await fetchActiveGroup(activeGroupId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to sync to your attendance.');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (window.confirm('Are you sure you want to delete this shared announcement?')) {
      try {
        await api.deleteSharedSession(sessionId);
        if (activeGroupId) {
          await fetchActiveGroup(activeGroupId);
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete update.');
      }
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            Shared Class Groups
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Collaborate with your batchmates. Share timetable events, cancelled lectures, and sync with 1-click.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setJoinModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <KeyRound className="w-4 h-4" />
            Join with Code
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            Create Group
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh] gap-3">
          <RefreshCw className="w-7 h-7 animate-spin text-purple-600" />
          <p className="text-slate-500 text-sm">Loading class groups...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-12 text-center max-w-lg mx-auto shadow-sm">
          <Users className="w-12 h-12 text-purple-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Class Groups Yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
            Create a group for your class branch or enter an invitation code from your class representative.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md"
            >
              Create Class Group
            </button>
            <button
              onClick={() => setJoinModalOpen(true)}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-sm"
            >
              Enter Invite Code
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Groups Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
              Your Class Groups ({groups.length})
            </h3>
            <div className="space-y-2">
              {groups.map(g => {
                const isActive = g.id === activeGroupId;
                return (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroupId(g.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                      isActive
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-100 shadow-sm ring-1 ring-purple-500/30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-sm truncate">{g.name}</div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>{g.member_count} members</span>
                      <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                        {g.invite_code}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group Content Feed */}
          <div className="lg:col-span-3 space-y-6">
            {groupLoading || !activeGroupData ? (
              <div className="flex items-center justify-center p-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : (
              <>
                {/* Active Group Header */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                        {activeGroupData.group.name}
                      </h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-semibold uppercase">
                        {activeGroupData.group.my_role}
                      </span>
                    </div>
                    {activeGroupData.group.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {activeGroupData.group.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Invite Code Badge with Copy */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Invite Code:</span>
                      <span className="font-mono font-bold text-sm tracking-wider text-purple-600 dark:text-purple-400">
                        {activeGroupData.group.invite_code}
                      </span>
                      <button
                        onClick={() => copyInviteCode(activeGroupData.group.invite_code)}
                        className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded"
                        title="Copy Invite Code"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      onClick={() => setBroadcastModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition"
                    >
                      + Broadcast Session
                    </button>
                  </div>
                </div>

                {/* Shared Sessions Stream */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Class Feed & Shared Sessions
                    </h3>
                    <span className="text-xs text-slate-400">
                      {activeGroupData.sharedSessions.length} session{activeGroupData.sharedSessions.length === 1 ? '' : 's'} shared
                    </span>
                  </div>

                  {activeGroupData.sharedSessions.length === 0 ? (
                    <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
                      <Share2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                        No sessions shared yet
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 mb-4">
                        Be the first to broadcast a conducted class or cancelled lecture for classmates.
                      </p>
                      <button
                        onClick={() => setBroadcastModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs"
                      >
                        Broadcast Now
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeGroupData.sharedSessions.map(session => (
                        <div
                          key={session.id}
                          className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
                        >
                          {/* Contributor and timestamp header */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                Posted by {session.creator_name}
                              </span>
                              <span className="text-slate-400">&bull; {session.created_at}</span>
                            </div>

                            {(session.creator_id === user?.id || activeGroupData.group.my_role === 'admin') && (
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                className="text-slate-400 hover:text-red-500 p-1"
                                title="Delete announcement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Session Info */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-base text-slate-900 dark:text-white">
                                  {session.subject_code}
                                </span>
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                  {session.subject_name}
                                </span>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  session.session_status === 'conducted'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                                }`}>
                                  {session.session_status}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" /> {session.date}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> {session.time_slot}
                                </span>
                              </div>

                              {session.notes && (
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl">
                                  {session.notes}
                                </p>
                              )}
                            </div>

                            {/* 1-Click Sync Controls */}
                            <div className="flex sm:flex-col items-end gap-1.5 shrink-0">
                              {session.synced_by_me ? (
                                <div className="text-right">
                                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5" /> Synced to your records ({session.my_personal_status?.toUpperCase()})
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-1 text-right">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                    1-Click Sync to My Attendance:
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleSyncToMyAttendance(session.id, 'attended')}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold transition"
                                    >
                                      ✓ Attended
                                    </button>
                                    <button
                                      onClick={() => handleSyncToMyAttendance(session.id, 'absent')}
                                      className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-100 text-xs font-semibold transition"
                                    >
                                      ✗ Absent
                                    </button>
                                    <button
                                      onClick={() => handleSyncToMyAttendance(session.id, 'cancelled')}
                                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold transition"
                                    >
                                      Cancelled
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Member Roster Card */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
                    Group Members ({activeGroupData.members.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {activeGroupData.members.map(m => (
                      <div
                        key={m.user_id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between"
                      >
                        <div className="truncate pr-2">
                          <span className="font-bold block text-slate-800 dark:text-slate-200 truncate">
                            {m.name} {m.user_id === user?.id && '(You)'}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate block">{m.email}</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white">Create Class Group</h3>
              <button onClick={() => setCreateModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Group Name *</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="e.g. CS 3rd Year - Section B"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={groupDesc}
                  onChange={e => setGroupDesc(e.target.value)}
                  placeholder="e.g. Shared daily timetable and cancellations"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-700"
                >
                  Create & Get Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Group Modal */}
      {joinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white">Join Class Group</h3>
              <button onClick={() => setJoinModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleJoinGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Enter Invitation Code *</label>
                <input
                  type="text"
                  value={inviteCodeInput}
                  onChange={e => setInviteCodeInput(e.target.value)}
                  placeholder="e.g. CS7X92"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-mono uppercase tracking-widest text-center text-lg"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setJoinModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-700"
                >
                  Join Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Session Modal */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white">Broadcast Session to Group</h3>
              <button onClick={() => setBroadcastModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBroadcast} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Subject Code *</label>
                  <input
                    type="text"
                    value={broadcastSubjectCode}
                    onChange={e => setBroadcastSubjectCode(e.target.value)}
                    placeholder="e.g. CS301"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Subject Name *</label>
                  <input
                    type="text"
                    value={broadcastSubjectName}
                    onChange={e => setBroadcastSubjectName(e.target.value)}
                    placeholder="e.g. Operating Systems"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Date *</label>
                  <input
                    type="date"
                    value={broadcastDate}
                    onChange={e => setBroadcastDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Time Slot *</label>
                  <select
                    value={broadcastTimeSlot}
                    onChange={e => setBroadcastTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                  >
                    {TIME_SLOTS.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Session Status *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastStatus('conducted')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      broadcastStatus === 'conducted'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 ring-1 ring-blue-500'
                        : 'border-slate-300 dark:border-slate-600 text-slate-600'
                    }`}
                  >
                    Conducted
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastStatus('cancelled')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      broadcastStatus === 'cancelled'
                        ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 ring-1 ring-amber-500'
                        : 'border-slate-300 dark:border-slate-600 text-slate-600'
                    }`}
                  >
                    Cancelled
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Notes / Announcement</label>
                <input
                  type="text"
                  value={broadcastNotes}
                  onChange={e => setBroadcastNotes(e.target.value)}
                  placeholder="e.g. Lab cancelled due to campus placement drive"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setBroadcastModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-700"
                >
                  Broadcast Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
