import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Mail, Send, Upload, Users, Loader2, Sparkles, AlertCircle, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Contact {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
}

export default function Outreach() {
  const [file, setFile] = useState<File | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Campaign setup
  const [campaignName, setCampaignName] = useState('');
  const [channel, setChannel] = useState<'email' | 'whatsapp' | 'both'>('email');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [enableAi, setEnableAi] = useState(false);
  
  // SMTP setup
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');

  const [campaignSuccess, setCampaignSuccess] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selected = e.target.files[0];
    setFile(selected);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', selected);

    try {
      const res = await fetch('http://localhost:8000/api/outreach/upload-leads', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      
      setContacts(data.contacts || []);
      toast.success(`Successfully parsed ${data.contacts_found} contacts!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse file');
      setFile(null);
    } finally {
      setIsUploading(false);
      e.target.value = ''; // reset input
    }
  };

  const handleStartCampaign = async () => {
    if (contacts.length === 0) {
      toast.error('Please upload a file with valid contacts first');
      return;
    }
    if (!campaignName) {
      toast.error('Campaign Name is required');
      return;
    }

    setIsSending(true);
    setCampaignSuccess(false);

    try {
      const res = await fetch('http://localhost:8000/api/outreach/start-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_name: campaignName,
          channel: channel,
          subject: subject,
          message: message,
          enable_ai: enableAi,
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_user: smtpUser,
          smtp_pass: smtpPass,
          contacts: contacts
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to start campaign');

      toast.success('Campaign successfully queued to n8n!');
      setCampaignSuccess(true);
    } catch (err: any) {
      toast.error(err.message || 'Error communicating with backend');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 h-full w-full max-w-6xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center neon-glow">
            <Send className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Outreach Automation</h1>
            <p className="text-xs text-muted-foreground">Upload leads and launch multi-channel AI campaigns</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Setup */}
          <motion.div 
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} 
            className="lg:col-span-4 flex flex-col gap-4"
          >
            {/* 1. Upload Leads */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Users className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold font-display">1. Upload Leads</h2>
              </div>
              
              <label className="border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-muted/20">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
                <span className="text-xs font-medium text-foreground">
                  {file ? file.name : 'Click to Upload CSV, Excel, or PDF'}
                </span>
                <input type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={handleFileUpload} className="hidden" />
              </label>

              {contacts.length > 0 && (
                <div className="flex items-center justify-between bg-primary/10 border border-primary/20 px-3 py-2 rounded-lg">
                  <span className="text-xs font-medium text-primary">Loaded {contacts.length} Contacts</span>
                  <button onClick={() => { setFile(null); setContacts([]); }} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* 2. Campaign Setup */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Mail className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold font-display">2. Messaging Details</h2>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Campaign Name</label>
                  <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Summer Promo" className="w-full h-9 px-3 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Channel</label>
                  <select value={channel} onChange={(e: any) => setChannel(e.target.value)} className="w-full h-9 px-3 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground appearance-none">
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Subject (Emails only)</label>
                  <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Special offer inside" className="w-full h-9 px-3 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground" />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Message Prompt</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Hello {{name}}, we at {{company}} loved your work..." rows={3} className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground resize-none" />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input type="checkbox" checked={enableAi} onChange={e => setEnableAi(e.target.checked)} className="rounded border-border bg-muted/40 text-primary focus:ring-primary/50" />
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-blue-400" /> Enable Gemini AI Personalization</span>
                </label>
              </div>
            </div>

            {/* 3. SMTP Settings */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <AlertCircle className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold font-display">3. SMTP Dynamics</h2>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Host</label>
                    <input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} className="w-full h-9 px-3 rounded-lg bg-muted/40 border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Port</label>
                    <input type="number" value={smtpPort} onChange={e => setSmtpPort(Number(e.target.value))} className="w-full h-9 px-3 rounded-lg bg-muted/40 border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">SMTP User (Sender Email)</label>
                  <input type="email" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} className="w-full h-9 px-3 rounded-lg bg-muted/40 border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">App Password</label>
                  <input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} className="w-full h-9 px-3 rounded-lg bg-muted/40 border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>
            </div>

            <button
              onClick={handleStartCampaign}
              disabled={isSending || contacts.length === 0}
              className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_28px_rgba(59,130,246,0.45)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSending ? 'Orchestrating Workflow...' : 'Launch Campaign'}
            </button>
            <AnimatePresence>
              {campaignSuccess && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-emerald-400 text-xs font-medium flex items-center justify-center gap-1.5 p-2 bg-emerald-500/10 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" /> Triggered n8n Workflow successfully!
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* RIGHT: Data Preview */}
          <motion.div 
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} 
            className="lg:col-span-8 glass-card rounded-2xl flex flex-col overflow-hidden h-full max-h-[85vh]"
          >
            <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/10">
              <h2 className="text-sm font-semibold font-display text-foreground">Extract Payload Preview</h2>
              <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border">Total: {contacts.length}</span>
            </div>
            <div className="overflow-auto p-0 flex-1 bg-background/30">
              {contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <Users className="w-10 h-10 opacity-20 mb-3" />
                  <p className="text-xs font-medium">No contacts extracted yet</p>
                  <p className="text-[10px] mt-1 opacity-70">Upload a file on the left to see the structure sent to n8n.</p>
                </div>
              ) : (
                <table className="w-full text-xs text-left text-foreground">
                  <thead className="bg-muted/50 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Name</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Company</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Email</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {contacts.map((c, i) => (
                      <motion.tr 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                        key={i} className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-2.5 font-medium">{c.name || '-'}</td>
                        <td className="px-4 py-2.5">{c.company || '-'}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{c.email || '-'}</td>
                        <td className="px-4 py-2.5">{c.phone || '-'}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-4 border-t border-border/50 bg-black/20">
              <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">
                <strong className="text-primary mr-1">JSON Hook:</strong>
                {"{ campaign_name, contacts: [...], smtp_user, _channel, message }"} {"->"} n8n Trigger
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </DashboardLayout>
  );
}
