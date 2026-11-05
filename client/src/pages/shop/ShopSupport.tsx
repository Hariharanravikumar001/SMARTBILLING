import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Plus,
  Send,
  Star,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { SupportTicket } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';

export const ShopSupport: React.FC = () => {
  const { business } = useAuth();
  const { branding } = useBranding();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New Ticket Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
    category: 'Billing issue',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
    subject: '',
    description: ''
  });

  // Rating Modal
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/zoho/tickets');
      if (res.success && res.data) {
        setTickets(res.data);
        if (selectedTicket) {
          const updated = res.data.find((t: any) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch (err) {
      console.error('[Support Tickets Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/zoho/tickets', newTicketForm);
      if (res.success) {
        setShowCreateModal(false);
        setNewTicketForm({ category: 'Billing issue', priority: 'Medium', subject: '', description: '' });
        fetchTickets();
      }
    } catch (err: any) {
      alert(err.message || 'Ticket submission failed.');
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    try {
      const res: any = await api.post(`/zoho/tickets/${selectedTicket.id}/reply`, {
        message: replyMessage.trim()
      });
      if (res.success) {
        setReplyMessage('');
        fetchTickets();
      }
    } catch (err: any) {
      alert(err.message || 'Reply failed.');
    }
  };

  const handleRateTicket = async () => {
    if (!selectedTicket) return;
    try {
      const res: any = await api.post(`/zoho/tickets/${selectedTicket.id}/rate`, {
        rating: ratingVal,
        comment: ratingComment
      });
      if (res.success) {
        alert('Thank you for rating our support team!');
        fetchTickets();
      }
    } catch (err: any) {
      alert(err.message || 'Rating failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Helpdesk & Zoho Desk Support
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              Direct Support Channel
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Submit service requests directly to the SaaS technical team with automated Zoho Desk synchronization
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Support Ticket</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tickets List */}
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm space-y-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">My Support Requests</h3>

          {tickets.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No support tickets submitted yet.
            </div>
          ) : (
            tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedTicket?.id === t.id
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-mono text-slate-400">{t.ticket_number}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    t.status === 'Open'
                      ? 'bg-amber-100 text-amber-800'
                      : t.status === 'Resolved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{t.subject}</h4>
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2">
                  <span>{t.category}</span>
                  <span>{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: Ticket Conversation & Details */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between min-h-[450px]">
          {selectedTicket ? (
            <div className="flex flex-col h-full justify-between space-y-4">
              <div>
                <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-mono text-blue-600 font-bold block">{selectedTicket.ticket_number}</span>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">{selectedTicket.subject}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Category: {selectedTicket.category} • Priority: {selectedTicket.priority}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                    {selectedTicket.status}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-700 dark:text-slate-300 mt-3">
                  <p className="font-semibold text-slate-900 dark:text-white mb-1">Issue Description:</p>
                  <p className="whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                {/* Conversation Replies Thread */}
                <div className="mt-4 space-y-2.5 max-h-60 overflow-y-auto">
                  {selectedTicket.replies?.map((rep) => (
                    <div
                      key={rep.id}
                      className={`p-3 rounded-xl text-xs ${
                        rep.senderType === 'CUSTOMER'
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ml-6'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 mr-6'
                      }`}
                    >
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-bold">{rep.sender}</span>
                        <span>{new Date(rep.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p>{rep.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reply Input Bar */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                  placeholder="Type your message to support engineer..."
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                />
                <button
                  onClick={handleSendReply}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Reply</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-20">
              <LifeBuoy className="w-10 h-10 text-slate-300 mb-2" />
              <p>Select a ticket from the left panel to view conversation thread and status.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
              Submit Zoho Desk Support Ticket
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Your inquiry will be logged and routed to our central SaaS support desk.
            </p>

            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Issue Category</label>
                  <select
                    value={newTicketForm.category}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="Billing issue">Billing & POS Issue</option>
                    <option value="Printing issue">Thermal Printing Issue</option>
                    <option value="Login issue">Login / PIN Authentication</option>
                    <option value="Inventory issue">Inventory & Stock Mismatch</option>
                    <option value="Payment issue">Payment & Webhook Problem</option>
                    <option value="Subscription issue">Subscription & Plan Limits</option>
                    <option value="Technical problem">Technical Bug / Crash</option>
                    <option value="Feature request">Feature Suggestion</option>
                    <option value="Other">Other Query</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={newTicketForm.priority}
                    onChange={(e: any) => setNewTicketForm({ ...newTicketForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent (Billing Blocked)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={newTicketForm.subject}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                  placeholder="Brief summary of the issue..."
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description & Steps</label>
                <textarea
                  rows={4}
                  required
                  value={newTicketForm.description}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                  placeholder="Provide detailed description of what happened..."
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Submit to Zoho Desk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
