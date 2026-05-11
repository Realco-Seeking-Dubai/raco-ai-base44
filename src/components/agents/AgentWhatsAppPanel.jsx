import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CheckCircle2, Loader2, Copy, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AgentWhatsAppPanel({ agentId, agentName }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connection, setConnection] = useState(null);
  const [formData, setFormData] = useState({
    whatsapp_number: '',
    phone_number_id: '',
    business_account_id: '',
    webhook_url: '',
    daily_send_limit: 250,
  });
  const [showSecrets, setShowSecrets] = useState(false);
  const [testStatus, setTestStatus] = useState(null);

  useEffect(() => {
    if (!agentId) {
      setLoading(false);
      return;
    }

    loadConnection();
  }, [agentId]);

  async function loadConnection() {
    try {
      setLoading(true);
      const conns = await base44.entities.AgentWhatsAppConnection.list();
      const existing = conns.find(c => c.agent_id === agentId);
      if (existing) {
        setConnection(existing);
        setFormData({
          whatsapp_number: existing.whatsapp_number || '',
          phone_number_id: existing.phone_number_id || '',
          business_account_id: existing.business_account_id || '',
          webhook_url: existing.webhook_url || '',
          daily_send_limit: existing.daily_send_limit || 250,
        });
      }
    } catch (error) {
      console.error('Error loading connection:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!agentId) {
      alert('Save the agent first before configuring WhatsApp');
      return;
    }

    if (!formData.whatsapp_number || !formData.phone_number_id || !formData.business_account_id) {
      alert('WhatsApp number, phone ID, and business account ID are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        agent_id: agentId,
        agent_name: agentName,
        ...formData,
      };

      if (connection?.id) {
        await base44.entities.AgentWhatsAppConnection.update(connection.id, payload);
      } else {
        await base44.entities.AgentWhatsAppConnection.create(payload);
      }

      setTestStatus({ type: 'success', message: 'WhatsApp configuration saved' });
      setTimeout(() => setTestStatus(null), 3000);
      await loadConnection();
    } catch (error) {
      console.error('Error saving WhatsApp config:', error);
      setTestStatus({ type: 'error', message: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    if (!connection?.id) {
      alert('Save the configuration first');
      return;
    }

    setTestStatus({ type: 'testing', message: 'Testing connection…' });
    try {
      // Simulate a test call to WhatsApp API
      const response = await fetch('https://graph.instagram.com/v18.0/me', {
        headers: { Authorization: `Bearer ${formData.phone_number_id}` },
      });

      if (response.ok) {
        setTestStatus({ type: 'success', message: 'WhatsApp connection verified ✓' });
      } else {
        setTestStatus({ type: 'error', message: 'Connection test failed. Check credentials.' });
      }
    } catch {
      setTestStatus({ type: 'error', message: 'Unable to verify connection' });
    }
    setTimeout(() => setTestStatus(null), 4000);
  }

  const connectionStatus = connection?.connection_status || 'disconnected';
  const statusColors = {
    connected: 'bg-evergreen-tint text-evergreen',
    disconnected: 'bg-surface-2 text-muted-foreground',
    auth_failed: 'bg-terracotta-tint text-terracotta',
    rate_limited: 'bg-brass-tint text-brass',
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading WhatsApp settings…</div>;
  }

  return (
    <div className="space-y-4">
      {!agentId && (
        <div className="p-3 rounded-lg bg-brass-tint border border-brass/30 text-brass text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Save the agent first to configure WhatsApp integration</span>
        </div>
      )}

      {/* Connection Status */}
      {connection && (
        <div className="p-3 rounded-lg bg-surface border border-hairline">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Connection Status</span>
            <span className={cn('text-xs px-2 py-1 rounded-full font-medium capitalize', statusColors[connectionStatus])}>
              {connectionStatus}
            </span>
          </div>
          {connection.last_heartbeat_at && (
            <div className="text-xs text-muted-foreground">
              Last heartbeat: {new Date(connection.last_heartbeat_at).toLocaleString('en-GB')}
            </div>
          )}
        </div>
      )}

      {/* WhatsApp Credentials */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">WhatsApp Number (E.164 format) *</label>
          <input
            type="text"
            value={formData.whatsapp_number}
            onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_number: e.target.value }))}
            placeholder="+971501234567"
            className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen"
          />
          <p className="text-xs text-muted-foreground mt-1">Format: +[country code][number]</p>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Phone Number ID *</label>
          <div className="relative">
            <input
              type={showSecrets ? 'text' : 'password'}
              value={formData.phone_number_id}
              onChange={(e) => setFormData(prev => ({ ...prev, phone_number_id: e.target.value }))}
              placeholder="From WhatsApp Cloud API"
              className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen pr-10"
            />
            <button
              onClick={() => setShowSecrets(!showSecrets)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Business Account ID *</label>
          <div className="relative">
            <input
              type={showSecrets ? 'text' : 'password'}
              value={formData.business_account_id}
              onChange={(e) => setFormData(prev => ({ ...prev, business_account_id: e.target.value }))}
              placeholder="Meta Business Account ID"
              className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen pr-10"
            />
            <button
              onClick={() => setShowSecrets(!showSecrets)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Webhook URL</label>
          <input
            type="text"
            value={formData.webhook_url}
            onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
            placeholder="https://your-domain.com/webhooks/whatsapp"
            className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen"
          />
          <p className="text-xs text-muted-foreground mt-1">For receiving inbound messages from WhatsApp</p>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Daily Send Limit</label>
          <input
            type="number"
            value={formData.daily_send_limit}
            onChange={(e) => setFormData(prev => ({ ...prev, daily_send_limit: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen"
          />
          <p className="text-xs text-muted-foreground mt-1">Messages per day (default: 250)</p>
        </div>
      </div>

      {/* Test Status */}
      {testStatus && (
        <div className={cn('p-3 rounded-lg flex items-center gap-2 text-sm',
          testStatus.type === 'success' ? 'bg-evergreen-tint text-evergreen border border-evergreen/30'
            : testStatus.type === 'error' ? 'bg-terracotta-tint text-terracotta border border-terracotta/30'
            : 'bg-brass-tint text-brass border border-brass/30'
        )}>
          {testStatus.type === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
          {testStatus.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
          {testStatus.type === 'error' && <AlertCircle className="w-4 h-4" />}
          <span>{testStatus.message}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-evergreen text-white hover:bg-evergreen-mid disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
        {connection && (
          <button
            onClick={testConnection}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-hairline hover:bg-surface transition-colors"
          >
            Test Connection
          </button>
        )}
      </div>

      <div className="text-xs text-muted-foreground bg-surface p-3 rounded-lg space-y-1">
        <div className="font-medium text-foreground">Get WhatsApp Credentials:</div>
        <ol className="list-decimal list-inside space-y-1">
          <li>Create a Meta Business Account</li>
          <li>Register a WhatsApp Business Account</li>
          <li>Create a WhatsApp app and get your credentials from Meta App Dashboard</li>
          <li>Paste Phone Number ID and Business Account ID here</li>
        </ol>
      </div>
    </div>
  );
}