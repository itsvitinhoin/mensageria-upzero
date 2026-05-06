'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  Clock,
  FileText,
  Inbox,
  ListChecks,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import { AdminHero, AdminPage, AdminPanel, AdminStatCard, AdminStatGrid, AdminToolbar } from '@/components/admin/admin-mobile-ui'
import { FacebookOAuthButton, type WaOAuthCredentials } from '@/components/admin/mensageria/facebook-oauth'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { renderTemplate } from '@/lib/whatsapp/engine'
import { META_PERMISSIONS_NOT_REQUESTED_NOW, META_REQUIRED_PERMISSIONS } from '@/lib/whatsapp/types'
import type {
  Campaign,
  Contact,
  ContactList,
  InboxConversation,
  MessageCategory,
  PricingEstimate,
  ReviewChecklistItem,
  TemplateCategory,
  WhatsAppLog,
  WhatsAppState,
  WhatsAppTemplate,
} from '@/lib/whatsapp/types'

type UiState = WhatsAppState & { reviewChecklist: ReviewChecklistItem[] }
type TabKey = 'connection' | 'templates' | 'test' | 'inbox' | 'campaigns' | 'contacts' | 'pricing' | 'logs' | 'review'

const TABS: Array<{ value: TabKey; label: string; icon: typeof MessageSquare }> = [
  { value: 'connection', label: 'Conexao Meta', icon: ShieldCheck },
  { value: 'templates', label: 'Templates', icon: FileText },
  { value: 'test', label: 'Envio de Teste', icon: Send },
  { value: 'inbox', label: 'Inbox', icon: Inbox },
  { value: 'campaigns', label: 'Campanhas', icon: MessageSquare },
  { value: 'contacts', label: 'Listas de Contatos', icon: Users },
  { value: 'pricing', label: 'Calculadora de Preco', icon: Calculator },
  { value: 'logs', label: 'Logs', icon: ListChecks },
  { value: 'review', label: 'Meta Review Screencast', icon: ShieldCheck },
]

const statusClass: Record<string, string> = {
  ready: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  connected: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  failed: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-300',
  needs_attention: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300',
  started: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-300',
  info: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-300',
  not_started: 'border-border bg-muted text-muted-foreground',
  Missing: 'border-border bg-muted text-muted-foreground',
  Done: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  Failed: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-300',
  'Needs attention': 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300',
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : data?.error?.message ?? response.statusText)
  }
  return data as T
}

function mask(value?: string | null) {
  const raw = String(value ?? '').trim()
  if (!raw) return 'not selected'
  if (raw.length <= 6) return `${raw.slice(0, 2)}***`
  return `${raw.slice(0, 4)}...${raw.slice(-4)}`
}

function maskPhone(value?: string | null) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return 'not selected'
  if (digits.length < 6) return '****'
  return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} *****-${digits.slice(-4)}`
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold', statusClass[status] ?? statusClass.info)}>
      {status}
    </span>
  )
}

function ContextLogs({ logs, types }: { logs: WhatsAppLog[]; types: string[] }) {
  const filtered = logs.filter((log) => types.includes(log.type)).slice(0, 4)
  if (filtered.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Logs contextuais</p>
      {filtered.map((log) => (
        <div key={log.id} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <StatusPill status={log.status} />
            <span className="font-medium">{log.description}</span>
          </div>
          {log.recommendedAction ? <p className="mt-1 text-muted-foreground">{log.recommendedAction}</p> : null}
        </div>
      ))}
    </div>
  )
}

function EmptyNotice({ title, description }: { title: string; description: string }) {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  )
}

function selectedTemplate(state: UiState | null) {
  return state?.templates.find((template) => template.id === state.integration.selectedTemplateId)
}

export default function MensageriaPage() {
  const [state, setState] = useState<UiState | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('connection')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setState(await api<UiState>('/api/mensageria/state'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab') as TabKey | null
    if (tab && TABS.some((item) => item.value === tab)) setActiveTab(tab)
    void load()
  }, [load])

  async function refreshMeta() {
    setRefreshing(true)
    try {
      await api('/api/mensageria/connections', { method: 'PUT' })
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  if (loading || !state) {
    return (
      <AdminPage>
        <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando mensageria...
        </div>
      </AdminPage>
    )
  }

  const business = state.businesses.find((item) => item.id === state.integration.businessId)
  const waba = state.wabas.find((item) => item.id === state.integration.wabaId)
  const phone = state.phoneNumbers.find((item) => item.id === state.integration.phoneNumberId)
  const template = selectedTemplate(state)
  const failureLogs = state.logs.filter((log) => log.status === 'failed')

  return (
    <AdminPage>
      <AdminHero
        icon={MessageSquare}
        eyebrow="WhatsApp Business Cloud API"
        title="Mensageria"
        description="Conexao Meta, templates aprovados, envios reais, inbox, campanhas, listas, precificacao e checklist de App Review."
        actions={
          <>
            <Link href="/privacy">
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                Privacy
              </Button>
            </Link>
            <Button size="sm" className="gap-2" onClick={refreshMeta} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar Meta
            </Button>
          </>
        }
      />

      <AdminStatGrid>
        <AdminStatCard icon={ShieldCheck} label="Status geral" value={<StatusPill status={state.integration.status} />} hint={state.integration.alert ?? 'Ready exige Business, WABA, numero e template aprovado.'} tone={state.integration.status === 'ready' ? 'success' : state.integration.status === 'failed' ? 'danger' : 'warning'} />
        <AdminStatCard icon={Users} label="Business" value={business?.name ?? mask(state.integration.businessId)} hint={`ID ${mask(state.integration.businessId)}`} tone={business ? 'success' : 'warning'} />
        <AdminStatCard icon={MessageSquare} label="WABA / Numero" value={waba?.name ?? mask(state.integration.wabaId)} hint={phone ? `${phone.verifiedName ?? 'Numero'} ${phone.displayPhoneNumber}` : `Phone ${mask(state.integration.phoneNumberId)}`} tone={phone ? 'success' : 'warning'} />
        <AdminStatCard icon={Clock} label="Ultimo sync" value={state.integration.lastSyncAt ? new Date(state.integration.lastSyncAt).toLocaleString('pt-BR') : 'Nunca'} hint={failureLogs[0]?.description ?? 'Sem falhas recentes'} tone={failureLogs.length > 0 ? 'danger' : 'info'} />
      </AdminStatGrid>

      {state.integration.lastError ? (
        <Alert className="border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-300">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Falha de integracao</AlertTitle>
          <AlertDescription>{state.integration.lastError.message}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)} className="space-y-4">
        <AdminToolbar>
          <div className="overflow-x-auto">
            <TabsList className="h-auto min-w-max flex-wrap justify-start gap-1 bg-muted/50 p-1">
              {TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-2 rounded-md px-3 py-2 text-xs">
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </AdminToolbar>

        <TabsContent value="connection"><ConnectionTab state={state} reload={load} /></TabsContent>
        <TabsContent value="templates"><TemplatesTab state={state} reload={load} /></TabsContent>
        <TabsContent value="test"><TestSendTab state={state} reload={load} /></TabsContent>
        <TabsContent value="inbox"><InboxTab state={state} reload={load} /></TabsContent>
        <TabsContent value="campaigns"><CampaignsTab state={state} reload={load} /></TabsContent>
        <TabsContent value="contacts"><ContactsTab state={state} reload={load} /></TabsContent>
        <TabsContent value="pricing"><PricingTab state={state} reload={load} /></TabsContent>
        <TabsContent value="logs"><LogsTab state={state} reload={load} /></TabsContent>
        <TabsContent value="review"><ReviewTab state={state} /></TabsContent>
      </Tabs>
    </AdminPage>
  )
}

function ConnectionTab({ state, reload }: { state: UiState; reload: () => Promise<void> }) {
  const [businessId, setBusinessId] = useState(state.integration.businessId ?? '')
  const [wabaId, setWabaId] = useState(state.integration.wabaId ?? '')
  const [phoneNumberId, setPhoneNumberId] = useState(state.integration.phoneNumberId ?? '')
  const [saving, setSaving] = useState(false)

  async function saveSelection() {
    setSaving(true)
    try {
      await api('/api/mensageria/connections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, wabaId, phoneNumberId }),
      })
      await reload()
    } finally {
      setSaving(false)
    }
  }

  async function handleOAuthSuccess(creds: WaOAuthCredentials) {
    await api('/api/mensageria/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: creds.businessId,
        wabaId: creds.businessAccountId,
        phoneNumberId: creds.phoneNumberId,
        phoneNumber: creds.phoneNumber,
        grantedPermissions: creds.grantedPermissions ?? [],
      }),
    })
    await reload()
  }

  const missing = state.integration.metaUser?.missingPermissions ?? META_REQUIRED_PERMISSIONS

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <AdminPanel title="Conexao Meta" description="Fluxo real de OAuth e selecao de ativos WhatsApp. IDs aparecem mascarados na UI.">
        <div className="space-y-4">
          <FacebookOAuthButton onSuccess={(creds) => void handleOAuthSuccess(creds)} />

          <div className="grid gap-3 sm:grid-cols-2">
            <StatusLine label="OAuth" status={state.integration.oauthStatus} success="Connected: Meta OAuth completed and required permissions were granted." failure="Failed: complete Meta OAuth and grant permissions." />
            <StatusLine label="Permissoes ausentes" status={missing.length === 0 ? 'success' : 'needs_attention'} success="Ready: all required permissions are present." failure={missing.length > 0 ? `Failed: ${missing.join(', ')} permission was not granted.` : 'No permission data returned yet.'} />
            <StatusLine label="Business" status={state.integration.businessId ? 'success' : 'needs_attention'} success="Business Manager selected." failure="Needs attention: No Business Manager selected." />
            <StatusLine label="WABA" status={state.integration.wabaId ? 'success' : 'needs_attention'} success="WhatsApp Business Account selected." failure="Needs attention: No WhatsApp Business Account selected." />
            <StatusLine label="Numero" status={state.integration.phoneNumberId ? 'success' : 'needs_attention'} success="WhatsApp phone number selected." failure="Needs attention: No WhatsApp phone number selected." />
            <StatusLine label="Ready" status={state.integration.status === 'ready' ? 'success' : 'needs_attention'} success="Ready: Business, WABA, phone number and approved template are configured." failure="Configure Business, WABA, phone number and an approved template." />
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/25 p-3 text-xs">
            <p className="font-semibold">Usuario Meta conectado</p>
            <div className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-2">
              <span>Nome: <strong className="text-foreground">{state.integration.metaUser?.name ?? 'not available'}</strong></span>
              <span>Email: <strong className="text-foreground">{state.integration.metaUser?.email ?? 'not available'}</strong></span>
              <span>Granted: <strong className="text-foreground">{state.integration.metaUser?.grantedPermissions?.join(', ') || 'not returned yet'}</strong></span>
              <span>Missing: <strong className="text-foreground">{missing.join(', ') || 'none'}</strong></span>
            </div>
          </div>

          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Permissoes solicitadas agora</AlertTitle>
            <AlertDescription>
              {META_REQUIRED_PERMISSIONS.join(', ')}. Nao solicitamos nesta etapa: {META_PERMISSIONS_NOT_REQUESTED_NOW.join(', ')}.
            </AlertDescription>
          </Alert>
        </div>
      </AdminPanel>

      <AdminPanel title="Selecionar ativos" description="Liste, selecione e salve Business, WABA e numero WhatsApp usados pelo produto.">
        <div className="space-y-4">
          <SelectBlock label="Business Managers" value={businessId} onChange={setBusinessId} placeholder="Selecionar Business" items={state.businesses.map((item) => ({ value: item.id, label: item.name, hint: mask(item.id) }))} />
          <SelectBlock label="WhatsApp Business Accounts" value={wabaId} onChange={setWabaId} placeholder="Selecionar WABA" items={state.wabas.map((item) => ({ value: item.id, label: item.name, hint: mask(item.id) }))} />
          <SelectBlock label="Numeros WhatsApp" value={phoneNumberId} onChange={setPhoneNumberId} placeholder="Selecionar numero" items={state.phoneNumbers.map((item) => ({ value: item.id, label: item.displayPhoneNumber, hint: `${item.verifiedName ?? 'Sem nome'} | ${mask(item.id)}` }))} />
          <Button onClick={saveSelection} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Salvar conexao
          </Button>
          <ContextLogs logs={state.logs} types={['oauth_started', 'oauth_completed', 'permission_missing', 'business_loaded', 'waba_loaded', 'phone_selected', 'connection_saved']} />
        </div>
      </AdminPanel>
    </div>
  )
}

function StatusLine({ label, status, success, failure }: { label: string; status: string; success: string; failure: string }) {
  const ok = status === 'success' || status === 'ready' || status === 'completed' || status === 'connected'
  return (
    <div className="rounded-lg border border-border/60 bg-card/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">{label}</p>
        <StatusPill status={status} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{ok ? success : failure}</p>
    </div>
  )
}

function SelectBlock({ label, value, onChange, placeholder, items }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; items: Array<{ value: string; label: string; hint?: string }> }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}{item.hint ? ` - ${item.hint}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {items.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum item real carregado ainda. Clique em Atualizar Meta depois de conectar.</p> : null}
    </div>
  )
}

function TemplatesTab({ state, reload }: { state: UiState; reload: () => Promise<void> }) {
  const [form, setForm] = useState({ name: '', category: 'MARKETING' as TemplateCategory, language: 'pt_BR', body: '', footer: '', examples: '' })
  const [submitting, setSubmitting] = useState(false)

  async function sync() {
    await api('/api/mensageria/templates?sync=1')
    await reload()
  }

  async function createTemplate(submitToMeta: boolean) {
    setSubmitting(true)
    try {
      const exampleValues = Object.fromEntries(
        form.examples.split('\n').map((line) => line.split('=').map((part) => part.trim())).filter(([key, value]) => key && value),
      )
      await api('/api/mensageria/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, exampleValues, submitToMeta }),
      })
      setForm({ name: '', category: 'MARKETING', language: 'pt_BR', body: '', footer: '', examples: '' })
      await reload()
    } finally {
      setSubmitting(false)
    }
  }

  async function selectTemplate(templateId: string) {
    await api('/api/mensageria/templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: templateId, select: true }),
    })
    await reload()
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <AdminPanel title="Templates existentes" description="Somente templates APPROVED podem ser usados em envio de teste e campanhas." action={<Button variant="outline" size="sm" onClick={sync} className="gap-2"><RefreshCw className="h-4 w-4" />Atualizar templates da Meta</Button>}>
        <div className="space-y-3">
          {state.templates.length === 0 ? <EmptyNotice title="Nenhum template carregado" description="Conecte a WABA e sincronize templates reais da Meta. Drafts locais ficam marcados como local_draft." /> : null}
          {state.templates.map((template) => (
            <div key={template.id} className="rounded-lg border border-border/60 bg-card/80 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{template.name}</p>
                    <StatusPill status={template.status} />
                    <Badge variant="outline">{template.category}</Badge>
                    <Badge variant="secondary">{template.language}</Badge>
                    <Badge variant="outline">{template.source}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{template.body || 'Sem body retornado pela API.'}</p>
                </div>
                <Button size="sm" disabled={template.status !== 'APPROVED'} onClick={() => selectTemplate(template.id)}>Selecionar aprovado</Button>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                <span>Componentes: {template.components.map((component) => component.type).join(', ') || 'none'}</span>
                <span>Variaveis: {template.variables.join(', ') || 'none'}</span>
                <span>ID: {mask(template.metaTemplateId ?? template.id)}</span>
              </div>
              {template.status === 'REJECTED' ? <p className="mt-2 text-xs text-rose-600">Motivo: {template.rejectionReason ?? 'Meta did not return a rejection reason.'}</p> : null}
              {template.status === 'PENDING' ? <p className="mt-2 text-xs text-amber-700">Template pendente ainda nao pode ser usado para envio.</p> : null}
            </div>
          ))}
          <ContextLogs logs={state.logs} types={['templates_synced', 'template_created', 'template_approved', 'template_rejected']} />
        </div>
      </AdminPanel>

      <AdminPanel title="Criar template ou draft" description="Submeta para Meta apenas quando WABA e token de servidor estiverem configurados. Caso contrario, salva draft local seguro.">
        <div className="space-y-3">
          <Field label="Nome do template"><Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="ex: pedido_confirmado" /></Field>
          <Field label="Categoria">
            <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value as TemplateCategory }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MARKETING">MARKETING</SelectItem>
                <SelectItem value="UTILITY">UTILITY</SelectItem>
                <SelectItem value="AUTHENTICATION">AUTHENTICATION</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Idioma"><Input value={form.language} onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value }))} /></Field>
          <Field label="Body"><Textarea rows={6} value={form.body} onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))} placeholder="Ola {{nome}}, seu pedido {{pedido}} foi confirmado." /></Field>
          <Field label="Footer"><Input value={form.footer} onChange={(e) => setForm((prev) => ({ ...prev, footer: e.target.value }))} /></Field>
          <Field label="Exemplos de valores (um por linha: nome=Maria)"><Textarea rows={3} value={form.examples} onChange={(e) => setForm((prev) => ({ ...prev, examples: e.target.value }))} /></Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={submitting} onClick={() => createTemplate(false)}>Salvar draft</Button>
            <Button disabled={submitting} onClick={() => createTemplate(true)}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Submit for approval</Button>
          </div>
        </div>
      </AdminPanel>
    </div>
  )
}

function TestSendTab({ state, reload }: { state: UiState; reload: () => Promise<void> }) {
  const approvedTemplates = state.templates.filter((template) => template.status === 'APPROVED')
  const defaultTemplateId = state.integration.selectedTemplateId && approvedTemplates.some((template) => template.id === state.integration.selectedTemplateId)
    ? state.integration.selectedTemplateId
    : approvedTemplates[0]?.id ?? ''
  const [templateId, setTemplateId] = useState(defaultTemplateId)
  const [recipientPhone, setRecipientPhone] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [optInConfirmed, setOptInConfirmed] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; messageId?: string; error?: { message?: string } | string; preview?: string } | null>(null)
  const [sending, setSending] = useState(false)
  const template = state.templates.find((item) => item.id === templateId)
  const preview = template ? renderTemplate(template.body, values) : ''

  async function send() {
    setSending(true)
    setResult(null)
    try {
      const response = await api<typeof result>('/api/mensageria/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientPhone, templateId, values, optInConfirmed }),
      })
      setResult(response)
      await reload()
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : String(error) })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <AdminPanel title="Envio de teste" description="Usa template APPROVED para iniciar conversa. Tokens nunca sao exibidos.">
        <div className="space-y-4">
          {!state.integration.phoneNumberId ? <EmptyNotice title="Numero nao conectado" description="Nao e permitido enviar sem numero WhatsApp conectado." /> : null}
          {approvedTemplates.length === 0 ? <EmptyNotice title="Template aprovado ausente" description="Nao e permitido enviar sem template APPROVED." /> : null}
          <Field label="Numero WhatsApp do destinatario"><Input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="+55 11 99999-0000" /></Field>
          <Field label="Template aprovado">
            <Select value={templateId} onValueChange={(value) => { setTemplateId(value); setValues({}) }}>
              <SelectTrigger><SelectValue placeholder="Selecione um template aprovado" /></SelectTrigger>
              <SelectContent>{approvedTemplates.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {template?.variables.map((variable) => (
            <Field key={variable} label={`Variavel {{${variable}}}`}>
              <Input value={values[variable] ?? ''} onChange={(e) => setValues((prev) => ({ ...prev, [variable]: e.target.value }))} />
            </Field>
          ))}
          <label className="flex items-start gap-2 rounded-lg border border-border/60 p-3 text-sm">
            <Checkbox checked={optInConfirmed} onCheckedChange={(checked) => setOptInConfirmed(Boolean(checked))} />
            <span>Confirmo que o destinatario deu opt-in para receber mensagens WhatsApp desta empresa.</span>
          </label>
          <Button onClick={send} disabled={sending || !state.integration.phoneNumberId || !templateId || !recipientPhone || !optInConfirmed} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send WhatsApp Message
          </Button>
        </div>
      </AdminPanel>

      <AdminPanel title="Preview, status e evento" description="Erros sao sanitizados e message ID aparece mascarado no log global.">
        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Preview</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{preview || 'Selecione um template aprovado para visualizar a mensagem final.'}</p>
          </div>
          {result ? (
            <Alert className={result.ok ? statusClass.success : statusClass.failed}>
              {result.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              <AlertTitle>{result.ok ? 'Mensagem enviada' : 'Envio falhou'}</AlertTitle>
              <AlertDescription>
                {result.ok ? `Message ID: ${mask(result.messageId)}` : typeof result.error === 'string' ? result.error : result.error?.message}
              </AlertDescription>
            </Alert>
          ) : null}
          <ContextLogs logs={state.logs} types={['message_sent']} />
        </div>
      </AdminPanel>
    </div>
  )
}

function InboxTab({ state, reload }: { state: UiState; reload: () => Promise<void> }) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(state.conversations[0]?.id ?? '')
  const [reply, setReply] = useState('')
  const conversations = state.conversations.filter((conversation) => conversation.maskedPhone.includes(query) || conversation.messages.some((message) => message.text.toLowerCase().includes(query.toLowerCase())))
  const selected = state.conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0]

  async function queueReply() {
    if (!selected || !reply.trim()) return
    await api('/api/mensageria/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: selected.id, text: reply }),
    })
    setReply('')
    await reload()
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[330px_1fr]">
      <AdminPanel title="Conversas" description="Mensagens recebidas via webhook e mensagens enviadas pelo app.">
        <div className="space-y-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar conversa" />
          <Button variant="outline" size="sm" onClick={reload} className="gap-2"><RefreshCw className="h-4 w-4" />Refresh manual</Button>
          {conversations.length === 0 ? <EmptyNotice title="Inbox vazio" description="Quando o webhook receber mensagens WhatsApp reais, elas aparecem aqui." /> : null}
          {conversations.map((conversation) => (
            <button key={conversation.id} type="button" onClick={() => setSelectedId(conversation.id)} className={cn('w-full rounded-lg border p-3 text-left transition-colors', selected?.id === conversation.id ? 'border-primary bg-primary/5' : 'border-border/60 hover:bg-muted/50')}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{conversation.contactName ?? conversation.maskedPhone}</span>
                <span className="text-[10px] text-muted-foreground">{conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
              </div>
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{conversation.messages.at(-1)?.text}</p>
            </button>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel title="Conversa selecionada" description="Respostas livres dependem da janela de atendimento de 24h. Fora dela, use templates aprovados.">
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={selected.windowExpiresAt && new Date(selected.windowExpiresAt) > new Date() ? 'success' : 'needs_attention'} />
              <span className="text-sm font-medium">{selected.maskedPhone}</span>
              <span className="text-xs text-muted-foreground">Janela 24h: {selected.windowExpiresAt ? new Date(selected.windowExpiresAt).toLocaleString('pt-BR') : 'nao detectada'}</span>
            </div>
            <div className="min-h-[360px] space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
              {selected.messages.map((message) => (
                <div key={message.id} className={cn('flex', message.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[78%] rounded-lg px-3 py-2 text-sm shadow-sm', message.direction === 'outbound' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border/60')}>
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    <p className={cn('mt-1 text-[10px]', message.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{new Date(message.timestamp).toLocaleString('pt-BR')} | {message.status}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Responder quando permitido pela janela de 24h" />
              <Button onClick={queueReply}>Responder</Button>
            </div>
            <ContextLogs logs={state.logs} types={['webhook_received', 'inbox_updated']} />
          </div>
        ) : (
          <EmptyNotice title="Nenhuma conversa selecionada" description="Receba um webhook real ou envie uma mensagem de teste para iniciar uma conversa." />
        )}
      </AdminPanel>
    </div>
  )
}

function CampaignsTab({ state, reload }: { state: UiState; reload: () => Promise<void> }) {
  const approvedTemplates = state.templates.filter((template) => template.status === 'APPROVED')
  const [form, setForm] = useState({ name: '', listId: '', templateId: '', scheduledAt: '', estimatedCost: '0', tags: '', minOrderValue: '', countryCode: '55' })

  async function createCampaign() {
    await api('/api/mensageria/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        listId: form.listId || undefined,
        templateId: form.templateId || undefined,
        scheduledAt: form.scheduledAt || undefined,
        estimatedCost: Number(form.estimatedCost),
        variableMapping: {},
      }),
    })
    setForm((prev) => ({ ...prev, name: '' }))
    await reload()
  }

  async function campaignAction(path: string, campaignId: string) {
    await api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId }) })
    await reload()
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <AdminPanel title="Criar campanha" description="Campanhas dependem de lista com opt-in e template APPROVED. Disparo em massa fica bloqueado sem essas condicoes.">
        <div className="space-y-3">
          <Field label="Nome da campanha"><Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></Field>
          <SelectBlock label="Lista personalizada" value={form.listId} onChange={(value) => setForm((prev) => ({ ...prev, listId: value }))} placeholder="Selecionar lista" items={state.contactLists.map((list) => ({ value: list.id, label: list.name, hint: `${list.contactIds.length} contatos` }))} />
          <SelectBlock label="Template" value={form.templateId} onChange={(value) => setForm((prev) => ({ ...prev, templateId: value }))} placeholder="Selecionar template" items={approvedTemplates.map((template) => ({ value: template.id, label: template.name, hint: template.category }))} />
          <Field label="Agendamento"><Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))} /></Field>
          <Field label="Custo estimado"><Input type="number" min="0" step="0.0001" value={form.estimatedCost} onChange={(e) => setForm((prev) => ({ ...prev, estimatedCost: e.target.value }))} /></Field>
          <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/25 p-3 text-xs sm:grid-cols-2">
            <span>Filtros disponiveis: primeira compra, nunca compraram, mais de uma compra, pedidos acima de valor.</span>
            <span>Tambem: ultima compra, periodo, tags, status, opt-in, pais/DDI e origem.</span>
          </div>
          <Button onClick={createCampaign} disabled={!form.name}>Criar campanha</Button>
        </div>
      </AdminPanel>

      <AdminPanel title="Campanhas e metricas" description="Cada acao gera logs com timestamp, campanha, template, destinatarios, status e recomendacao.">
        <div className="space-y-3">
          {state.campaigns.length === 0 ? <EmptyNotice title="Nenhuma campanha" description="Crie uma campanha para associar lista, template, variaveis e custo estimado." /> : null}
          {state.campaigns.map((campaign) => (
            <CampaignRow key={campaign.id} campaign={campaign} list={state.contactLists.find((list) => list.id === campaign.listId)} template={state.templates.find((template) => template.id === campaign.templateId)} onSend={() => campaignAction('/api/mensageria/campaigns/send', campaign.id)} onPause={() => campaignAction('/api/mensageria/campaigns/pause', campaign.id)} />
          ))}
          <ContextLogs logs={state.logs} types={['campaign_created', 'campaign_sent', 'campaign_paused', 'campaign_error']} />
        </div>
      </AdminPanel>
    </div>
  )
}

function CampaignRow({ campaign, list, template, onSend, onPause }: { campaign: Campaign; list?: ContactList; template?: WhatsAppTemplate; onSend: () => void; onPause: () => void }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/80 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{campaign.name}</p>
            <StatusPill status={campaign.status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Lista: {list?.name ?? 'not selected'} | Template: {template?.name ?? 'not selected'}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onPause}>Pausar</Button>
          <Button size="sm" onClick={onSend}>Disparar</Button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <span>Total: {campaign.metrics.totalContacts}</span>
        <span>Enviadas: {campaign.metrics.sent}</span>
        <span>Entregues: {campaign.metrics.delivered}</span>
        <span>Falhas: {campaign.metrics.failed}</span>
        <span>Respostas: {campaign.metrics.replies}</span>
        <span>Custo estimado: {campaign.metrics.estimatedCost.toFixed(4)}</span>
        <span>Custo/msg: {campaign.metrics.costPerMessage.toFixed(4)}</span>
        <span>Taxa resposta: {(campaign.metrics.responseRate * 100).toFixed(1)}%</span>
      </div>
    </div>
  )
}

function ContactsTab({ state, reload }: { state: UiState; reload: () => Promise<void> }) {
  const [contact, setContact] = useState({ name: '', phone: '', countryCode: '55', tags: '', source: '', optInWhatsapp: false })
  const [list, setList] = useState({ name: '', description: '', contactIds: [] as string[], optInOnly: true, tags: '', source: '', countryCode: '55' })

  async function addContact() {
    await api('/api/mensageria/contact-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'contact', ...contact, tags: contact.tags.split(',').map((tag) => tag.trim()).filter(Boolean) }),
    })
    setContact({ name: '', phone: '', countryCode: '55', tags: '', source: '', optInWhatsapp: false })
    await reload()
  }

  async function addList() {
    await api('/api/mensageria/contact-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'list',
        name: list.name,
        description: list.description,
        contactIds: list.contactIds,
        filters: { optInWhatsapp: list.optInOnly, tags: list.tags.split(',').map((tag) => tag.trim()).filter(Boolean), source: list.source, countryCode: list.countryCode },
      }),
    })
    setList({ name: '', description: '', contactIds: [], optInOnly: true, tags: '', source: '', countryCode: '55' })
    await reload()
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <AdminPanel title="Adicionar contato manual" description="Telefone e opt-in ficam explicitos; contatos sem opt-in nao podem receber campanhas.">
        <div className="space-y-3">
          <Field label="Nome"><Input value={contact.name} onChange={(e) => setContact((prev) => ({ ...prev, name: e.target.value }))} /></Field>
          <Field label="Telefone"><Input value={contact.phone} onChange={(e) => setContact((prev) => ({ ...prev, phone: e.target.value }))} /></Field>
          <Field label="Pais/DDI"><Input value={contact.countryCode} onChange={(e) => setContact((prev) => ({ ...prev, countryCode: e.target.value }))} /></Field>
          <Field label="Tags"><Input value={contact.tags} onChange={(e) => setContact((prev) => ({ ...prev, tags: e.target.value }))} placeholder="vip, primeira-compra" /></Field>
          <Field label="Origem"><Input value={contact.source} onChange={(e) => setContact((prev) => ({ ...prev, source: e.target.value }))} /></Field>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={contact.optInWhatsapp} onCheckedChange={(checked) => setContact((prev) => ({ ...prev, optInWhatsapp: Boolean(checked) }))} />Opt-in WhatsApp confirmado</label>
          <Button onClick={addContact} disabled={!contact.name || !contact.phone}>Adicionar contato</Button>
        </div>
      </AdminPanel>

      <AdminPanel title="Listas e segmentacoes" description="Crie segmentacoes salvas e associe listas a campanhas. Filtros de compras ficam preparados para uma fonte real de clientes.">
        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome da lista"><Input value={list.name} onChange={(e) => setList((prev) => ({ ...prev, name: e.target.value }))} /></Field>
              <Field label="Descricao"><Input value={list.description} onChange={(e) => setList((prev) => ({ ...prev, description: e.target.value }))} /></Field>
              <Field label="Tags filtro"><Input value={list.tags} onChange={(e) => setList((prev) => ({ ...prev, tags: e.target.value }))} /></Field>
              <Field label="Origem filtro"><Input value={list.source} onChange={(e) => setList((prev) => ({ ...prev, source: e.target.value }))} /></Field>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm"><Checkbox checked={list.optInOnly} onCheckedChange={(checked) => setList((prev) => ({ ...prev, optInOnly: Boolean(checked) }))} />Somente contatos com opt-in</label>
            <div className="mt-3 flex flex-wrap gap-2">
              {state.contacts.map((item) => (
                <button key={item.id} type="button" onClick={() => setList((prev) => ({ ...prev, contactIds: prev.contactIds.includes(item.id) ? prev.contactIds.filter((id) => id !== item.id) : [...prev.contactIds, item.id] }))} className={cn('rounded-full border px-2.5 py-1 text-xs', list.contactIds.includes(item.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>
                  {item.name} {item.optInWhatsapp ? '' : '(sem opt-in)'}
                </button>
              ))}
            </div>
            <Button className="mt-3" onClick={addList} disabled={!list.name}>Criar lista</Button>
          </div>

          <div className="space-y-3">
            {state.contactLists.map((item) => (
              <div key={item.id} className="rounded-lg border border-border/60 bg-card/80 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{item.name}</p>
                  <Badge variant="outline">{item.contactIds.length} contatos</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Filtros: {JSON.stringify(item.filters)}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            {state.contacts.map((item) => <ContactCard key={item.id} contact={item} />)}
          </div>
          <ContextLogs logs={state.logs} types={['contact_created', 'contact_list_created']} />
        </div>
      </AdminPanel>
    </div>
  )
}

function ContactCard({ contact }: { contact: Contact }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">{contact.name}</p>
          <StatusPill status={contact.optInWhatsapp ? 'success' : 'needs_attention'} />
        </div>
        <p className="mt-1 text-muted-foreground">{maskPhone(contact.phone)}</p>
        <p className="mt-1 text-muted-foreground">Tags: {contact.tags.join(', ') || 'none'}</p>
      </CardContent>
    </Card>
  )
}

function PricingTab({ state, reload }: { state: UiState; reload: () => Promise<void> }) {
  const [input, setInput] = useState({ category: 'Marketing' as MessageCategory, country: 'BR', quantity: '100', currency: 'USD', unitCost: '0', campaignId: '', listId: '' })
  const [estimate, setEstimate] = useState<PricingEstimate | null>(null)

  async function calculate() {
    const data = await api<PricingEstimate>('/api/mensageria/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, quantity: Number(input.quantity), unitCost: Number(input.unitCost), campaignId: input.campaignId || undefined, listId: input.listId || undefined }),
    })
    setEstimate(data)
    await reload()
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <AdminPanel title="Calculadora de preco" description="Custo unitario e rate card sao configuraveis. Nao ha valor hardcoded como verdade absoluta.">
        <div className="space-y-3">
          <Field label="Categoria">
            <Select value={input.category} onValueChange={(value) => setInput((prev) => ({ ...prev, category: value as MessageCategory }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['Marketing', 'Utility', 'Authentication', 'Service'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Pais dos destinatarios"><Input value={input.country} onChange={(e) => setInput((prev) => ({ ...prev, country: e.target.value }))} /></Field>
          <Field label="Quantidade"><Input type="number" value={input.quantity} onChange={(e) => setInput((prev) => ({ ...prev, quantity: e.target.value }))} /></Field>
          <Field label="Moeda"><Input value={input.currency} onChange={(e) => setInput((prev) => ({ ...prev, currency: e.target.value }))} /></Field>
          <Field label="Custo unitario configuravel"><Input type="number" step="0.000001" value={input.unitCost} onChange={(e) => setInput((prev) => ({ ...prev, unitCost: e.target.value }))} /></Field>
          <SelectBlock label="Simular por campanha" value={input.campaignId} onChange={(value) => setInput((prev) => ({ ...prev, campaignId: value }))} placeholder="Opcional" items={state.campaigns.map((campaign) => ({ value: campaign.id, label: campaign.name, hint: campaign.status }))} />
          <SelectBlock label="Simular por lista" value={input.listId} onChange={(value) => setInput((prev) => ({ ...prev, listId: value }))} placeholder="Opcional" items={state.contactLists.map((list) => ({ value: list.id, label: list.name, hint: `${list.contactIds.length} contatos` }))} />
          <Button onClick={calculate} className="gap-2"><Calculator className="h-4 w-4" />Calcular</Button>
        </div>
      </AdminPanel>
      <AdminPanel title="Estimativa" description="Final charges are determined by Meta. This is an estimate based on the configured rate card.">
        <div className="space-y-4">
          {estimate ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <AdminStatCard icon={Wallet} label="Custo total" value={`${estimate.currency} ${estimate.total.toFixed(4)}`} hint={`${estimate.quantity} mensagens`} tone="info" />
                <AdminStatCard label="Custo unitario" value={estimate.unitCost.toFixed(6)} hint={estimate.source} />
                <AdminStatCard label="Categoria" value={estimate.category} hint={estimate.country} />
              </div>
              <Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Aviso</AlertTitle><AlertDescription>{estimate.disclaimer}</AlertDescription></Alert>
            </>
          ) : <EmptyNotice title="Nenhuma estimativa calculada" description="Informe categoria, pais, quantidade, moeda e custo unitario para simular." />}
          <div className="grid gap-2 text-xs sm:grid-cols-4">
            {['Marketing', 'Utility', 'Authentication', 'Service'].map((category) => <div key={category} className="rounded-lg border border-border/60 p-3">{category}</div>)}
          </div>
          <ContextLogs logs={state.logs} types={['price_estimated']} />
        </div>
      </AdminPanel>
    </div>
  )
}

function LogsTab({ state, reload }: { state: UiState; reload: () => Promise<void> }) {
  async function clear() {
    await api('/api/mensageria/logs', { method: 'DELETE' })
    await reload()
  }

  return (
    <AdminPanel title="Logs globais" description="Eventos criticos com payload seguro, erro sanitizado e acao recomendada." action={<Button variant="outline" size="sm" onClick={clear}>Limpar logs</Button>}>
      <div className="space-y-2">
        {state.logs.length === 0 ? <EmptyNotice title="Nenhum log" description="Os eventos aparecem aqui conforme a integracao e os fluxos sao usados." /> : null}
        {state.logs.map((log) => (
          <div key={log.id} className="rounded-lg border border-border/60 bg-card/80 p-3 text-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={log.status} />
                  <span className="font-semibold">{log.type}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{log.description}</p>
                {log.error ? <p className="mt-1 text-xs text-rose-600">{log.error.message}</p> : null}
                {log.recommendedAction ? <p className="mt-1 text-xs text-muted-foreground">Acao recomendada: {log.recommendedAction}</p> : null}
              </div>
              <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
            </div>
            {log.safePayload ? <pre className="mt-2 overflow-x-auto rounded bg-muted/50 p-2 text-[11px]">{JSON.stringify(log.safePayload, null, 2)}</pre> : null}
          </div>
        ))}
      </div>
    </AdminPanel>
  )
}

function ReviewTab({ state }: { state: UiState }) {
  const script = [
    'Abrir /mensageria.',
    'Conectar com Meta.',
    'Conceder permissoes.',
    'Selecionar Business.',
    'Selecionar WABA.',
    'Selecionar numero WhatsApp.',
    'Abrir Templates.',
    'Selecionar ou criar template.',
    'Mostrar status do template.',
    'Ir para Envio de Teste.',
    'Enviar mensagem para numero real.',
    'Abrir WhatsApp e mostrar mensagem recebida.',
    'Responder pelo WhatsApp.',
    'Voltar para Inbox.',
    'Mostrar resposta recebida.',
    'Abrir Logs.',
    'Mostrar eventos de envio e webhook.',
  ]

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
      <AdminPanel title="Checklist real da integracao" description="Esta aba nao simula sucesso: ela le o estado salvo da integracao e marca cada item conforme configuracao real.">
        <div className="space-y-2">
          {state.reviewChecklist.map((item) => (
            <div key={item.id} className="rounded-lg border border-border/60 bg-card/80 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{item.label}</p>
                <StatusPill status={item.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      </AdminPanel>
      <AdminPanel title="Roteiro para gravacao" description="Use este fluxo para o screencast de Meta App Review com dados reais da empresa.">
        <ol className="space-y-2 text-sm">
          {script.map((step, index) => (
            <li key={step} className="flex gap-3 rounded-lg border border-border/60 p-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </AdminPanel>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
