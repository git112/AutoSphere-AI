import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';
import {
  Mail, Send, Upload, Users, Loader2, Sparkles, AlertCircle,
  Trash2, CheckCircle2, Paperclip, X, Key, ChevronDown, Wand2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Contact {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
}

interface AttachmentFile {
  filename: string;
  content_base64: string;
  mime_type: string;
  size_bytes: number;
}

export default function Outreach() {
  const [file, setFile] = useState<File | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Campaign
  const [campaignName, setCampaignName] = useState('');
  const [channel, setChannel] = useState<'email' | 'whatsapp' | 'both'>('email');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [enableAi, setEnableAi] = useState(false);
  const [isRephrasing, setIsRephrasing] = useState(false);
  const [variants, setVariants] = useState<string[]>([]);
  const [showVariants, setShowVariants] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [isUploadingAtt, setIsUploadingAtt] = useState(false);
  const attInputRef = useRef<HTMLInputElement>(null);

  // SMTP
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [campaignSuccess, setCampaignSuccess] = useState(false);

  /* ------------------------------------------------------------------ */
  /* Lead file upload                                                      */
  /* ------------------------------------------------------------------ */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const selected = e.target.files[0];
    setFile(selected);
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selected);
    try {
      const res = await fetch('http://localhost:8000/api/outreach/upload-leads', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      setContacts(data.contacts || []);
      toast.success(`Parsed ${data.contacts_found} contacts!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse file');
      setFile(null);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  /* ------------------------------------------------------------------ */
  /* Attachment upload                                                     */
  /* ------------------------------------------------------------------ */
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setIsUploadingAtt(true);
    const toAdd: AttachmentFile[] = [];
    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', f);
      try {
        const res = await fetch('http://localhost:8000/api/outreach/upload-attachment', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Upload failed');
        toAdd.push({
          filename: data.filename,
          content_base64: data.content_base64,
          mime_type: data.mime_type,
          size_bytes: data.size_bytes,
        });
      } catch (err: any) {
        toast.error(`"${f.name}": ${err.message}`);
      }
    }
    setAttachments(prev => [...prev, ...toAdd]);
    if (toAdd.length) toast.success(`${toAdd.length} attachment(s) added`);
    setIsUploadingAtt(false);
    e.target.value = '';
  };

  const removeAttachment = (idx: number) =>
    setAttachments(prev => prev.filter((_, i) => i !== idx));

  const formatBytes = (b: number) =>
    b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  /* ------------------------------------------------------------------ */
  /* Gemini rephrase                                                       */
  /* ------------------------------------------------------------------ */
  const handleRephrase = async () => {
    if (!message.trim()) { toast.error('Write a message first'); return; }
    setIsRephrasing(true);
    setVariants([]);
    setShowVariants(false);
    try {
      const res = await fetch('http://localhost:8000/api/outreach/rephrase-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, num_variants: 3 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Rephrase failed');
      setVariants(data.variants || []);
      setShowVariants(true);
      toast.success('Gemini generated 3 variants — pick one!');
    } catch (err: any) {
      toast.error(err.message || 'Gemini rephrasing failed');
    } finally {
      setIsRephrasing(false);
    }
  };

  const applyVariant = (v: string) => {
    setMessage(v);
    setShowVariants(false);
    setVariants([]);
    toast.success('Variant applied!');
  };

  /* ------------------------------------------------------------------ */
  /* Launch campaign                                                       */
  /* ------------------------------------------------------------------ */
  const handleStartCampaign = async () => {
    if (!contacts.length) { toast.error('Upload a leads file first'); return; }
    if (!campaignName) { toast.error('Campaign Name is required'); return; }
    setIsSending(true);
    setCampaignSuccess(false);
    try {
      const res = await fetch('http://localhost:8000/api/outreach/start-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_name: campaignName,
          channel,
          subject,
          message,
          enable_ai: enableAi,
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_user: smtpUser,
          smtp_pass: smtpPass,
          contacts,
          attachments,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to start campaign');
      toast.success('Campaign queued to n8n!');
      setCampaignSuccess(true);
    } catch (err: any) {
      toast.error(err.message || 'Error communicating with backend');
    } finally {
      setIsSending(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Render                                                                */
  /* ------------------------------------------------------------------ */
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 h-full w-full max-w-6xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center neon-glow">
            <Send className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Outreach Automation</h1>
            <p className="text-xs text-muted-foreground">Upload leads and launch multi-channel AI campaigns</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT: Setup panels */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-4 flex flex-col gap-4">

            {/* 1. Upload Leads */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Users className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold font-display">1. Upload Leads</h2>
              </div>
              <label className="border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-muted/20">
                {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
                <span className="text-xs font-medium text-foreground">{file ? file.name : 'Click to Upload CSV, Excel, or PDF'}</span>
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

            {/* 2. Messaging Details */}
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
                  <label className="text-xs font-medium text-muted-foreground">Subject (Email only)</label>
                  <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Special offer inside" className="w-full h-9 px-3 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground" />
                </div>

                {/* Message + Gemini rephrase */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Message Prompt</label>
                  <textarea
                    value={message}
                    onChange={e => { setMessage(e.target.value); setShowVariants(false); }}
                    placeholder="Hello {{name}}, we at {{company}} loved your work..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground resize-none"
                  />
                </div>

                {/* Gemini AI toggle */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <button
                      type="button"
                      onClick={() => { setEnableAi(v => !v); setShowVariants(false); setVariants([]); }}
                      className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${enableAi ? 'bg-blue-500' : 'bg-muted'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${enableAi ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                    <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Enable Gemini AI Personalization
                    </span>
                  </label>

                  <AnimatePresence>
                    {enableAi && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-2">
                        <div className="flex justify-end">
                          <button
                            onClick={handleRephrase}
                            disabled={isRephrasing}
                            className="h-9 px-4 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-500/30 transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {isRephrasing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                            {isRephrasing ? 'Rephrasing…' : 'Rephrase with Gemini'}
                          </button>
                        </div>

                        {/* Variants panel */}
                        <AnimatePresence>
                          {showVariants && variants.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="rounded-xl border border-blue-500/30 bg-blue-500/5 overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 border-b border-blue-500/20">
                                <span className="text-[11px] font-semibold text-blue-400 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Gemini Suggestions</span>
                                <button onClick={() => setShowVariants(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-3.5 h-3.5" /></button>
                              </div>
                              <div className="divide-y divide-border/30">
                                {variants.map((v, i) => (
                                  <button
                                    key={i}
                                    onClick={() => applyVariant(v)}
                                    className="w-full text-left px-3 py-2.5 text-[11px] text-foreground/80 hover:bg-blue-500/10 hover:text-foreground transition-colors group"
                                  >
                                    <span className="text-[10px] font-bold text-blue-400 mr-1 group-hover:text-blue-300">V{i + 1}</span>
                                    {v.length > 120 ? v.slice(0, 120) + '…' : v}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* 3. Attachments */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Paperclip className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold font-display">3. Email Attachments</h2>
                <span className="ml-auto text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border">max 10 MB / file</span>
              </div>

              <label className="border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors rounded-xl p-4 flex items-center justify-center gap-2 cursor-pointer bg-muted/20">
                {isUploadingAtt ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Paperclip className="w-4 h-4 text-muted-foreground" />}
                <span className="text-xs font-medium text-foreground">
                  {isUploadingAtt ? 'Uploading…' : 'Click to add attachments'}
                </span>
                <input ref={attInputRef} type="file" multiple onChange={handleAttachmentUpload} className="hidden" />
              </label>

              {attachments.length > 0 && (
                <div className="space-y-1.5">
                  {attachments.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 bg-muted/30 border border-border/50 rounded-lg px-3 py-2">
                      <Paperclip className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-xs font-medium text-foreground flex-1 truncate">{a.filename}</span>
                      <span className="text-[10px] text-muted-foreground">{formatBytes(a.size_bytes)}</span>
                      <button onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. SMTP */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <AlertCircle className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold font-display">4. SMTP Settings</h2>
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
              {isSending ? 'Orchestrating Workflow…' : 'Launch Campaign'}
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
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-8 glass-card rounded-2xl flex flex-col overflow-hidden h-full max-h-[85vh]">
            <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/10">
              <h2 className="text-sm font-semibold font-display text-foreground">Extract Payload Preview</h2>
              <div className="flex items-center gap-2">
                {attachments.length > 0 && (
                  <span className="text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />{attachments.length} attachment{attachments.length > 1 ? 's' : ''}
                  </span>
                )}
                <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border">Total: {contacts.length}</span>
              </div>
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
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }} key={i} className="hover:bg-muted/20 transition-colors">
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
                {"{ campaign_name, contacts: [...], attachments: [...], smtp_user, channel, message }"} {"→"} n8n Trigger
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </DashboardLayout>
  );
}
