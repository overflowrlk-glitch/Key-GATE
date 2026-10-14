import { useQuery } from "@tanstack/react-query"
import { ChevronDown, ChevronRight, Copy, Download, X } from "lucide-react"
import { Fragment, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTablePagination,
  DataTableRow,
} from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useI18n } from "@/i18n"
import { type AuditLog, admin } from "@/lib/api"
import { formatDate } from "@/lib/utils"

// Tempo relativo ("12s", "3m", "2h", "5d") ao lado da data absoluta — deixa
// óbvio o que acabou de acontecer, sem precisar de string nova por idioma.
function relTime(iso: string): string {
  const secs = (Date.now() - new Date(iso).getTime()) / 1000
  if (secs < 0) return "0s"
  if (secs < 60) return `${Math.floor(secs)}s`
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`
  return `${Math.floor(secs / 86400)}d`
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v)
  return `"${s.replace(/"/g, '""')}"`
}

// Exporta a página atual já filtrada (o servidor pagina; exportar a base
// inteira estouraria a consulta).
function exportCsv(logs: AuditLog[]) {
  const header = ["created_at", "entity", "entity_id", "action", "actor_type", "actor_id", "ip_address", "changes"]
  const lines = [header.join(",")]
  for (const l of logs) {
    lines.push(
      [
        l.created_at,
        l.entity,
        l.entity_id,
        l.action,
        l.actor_type,
        l.actor_id,
        l.ip_address,
        l.changes ? JSON.stringify(l.changes) : "",
      ]
        .map(csvCell)
        .join(","),
    )
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const ENTITIES = ["license", "product", "plan", "user", "api_key", "webhook", "addon", "seat"]

export default function AuditPage() {
  const { t } = useI18n()
  const [entityFilter, setEntityFilter] = useState("")
  const [entityIdFilter, setEntityIdFilter] = useState("")
  const [productFilter, setProductFilter] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [actorFilter, setActorFilter] = useState("")
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(30)
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: productsData } = useQuery({
    queryKey: ["admin", "products", ""],
    queryFn: () => admin.listProducts(),
  })
  const products = productsData?.products || []
  // Grouped product list keeps the dropdown scannable as the product
  // count grows — admins can see at a glance which deployment surface
  // (desktop / saas / hybrid) an audit row belongs to.
  const groupedProducts = {
    desktop: products.filter((p) => p.type === "desktop"),
    saas: products.filter((p) => p.type === "saas"),
    hybrid: products.filter((p) => p.type === "hybrid"),
  }

  // Ações/autores vindos da própria tabela: o dropdown só oferece o que
  // realmente já aconteceu na base.
  const { data: facets } = useQuery({
    queryKey: ["admin", "audit", "facets"],
    queryFn: () => admin.auditLogFacets(),
  })
  const actions = facets?.actions || []
  const actorTypes = facets?.actor_types || []

  const { data, isLoading } = useQuery({
    queryKey: [
      "admin",
      "audit",
      entityFilter,
      entityIdFilter,
      productFilter,
      actionFilter,
      actorFilter,
      search,
      dateFrom,
      dateTo,
      page,
      pageSize,
    ],
    queryFn: () =>
      admin.listAuditLogs({
        entity: entityFilter || undefined,
        entity_id: entityIdFilter || undefined,
        product_id: productFilter || undefined,
        action: actionFilter || undefined,
        actor_type: actorFilter || undefined,
        q: search || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        offset: page * pageSize,
        limit: pageSize,
      }),
  })

  const logs = data?.audit_logs || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasFilters = Boolean(
    entityFilter || entityIdFilter || productFilter || actionFilter || actorFilter || search || dateFrom || dateTo,
  )

  const clearFilters = () => {
    setEntityFilter("")
    setEntityIdFilter("")
    setProductFilter("")
    setActionFilter("")
    setActorFilter("")
    setSearch("")
    setDateFrom("")
    setDateTo("")
    setPage(0)
  }

  const actionColor = (action: string) => {
    if (action === "created") return "bg-emerald-500/15 text-emerald-300"
    if (action === "deleted" || action === "revoked") return "bg-red-500/15 text-red-300"
    if (action === "suspended") return "bg-orange-500/15 text-orange-300"
    return "bg-blue-500/15 text-blue-300"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("audit.title")}</h1>
          <p className="text-muted-foreground">{t("audit.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-3.5 w-3.5" />
              {t("audit.clear")}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => exportCsv(logs)} disabled={logs.length === 0}>
            <Download className="mr-1 h-3.5 w-3.5" />
            {t("audit.export")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder={t("audit.search")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
          className="w-64"
        />
        <Select
          value={entityFilter || "all"}
          onValueChange={(v) => {
            setEntityFilter(v === "all" ? "" : v)
            setPage(0)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("audit.filterEntity")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("audit.allEntities")}</SelectItem>
            {ENTITIES.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={actionFilter || "all"}
          onValueChange={(v) => {
            setActionFilter(v === "all" ? "" : v)
            setPage(0)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("audit.filterAction")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("audit.allActions")}</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={actorFilter || "all"}
          onValueChange={(v) => {
            setActorFilter(v === "all" ? "" : v)
            setPage(0)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("audit.filterActor")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("audit.allActors")}</SelectItem>
            {actorTypes.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={productFilter || "all"}
          onValueChange={(v) => {
            setProductFilter(v === "all" ? "" : v)
            setPage(0)
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder={t("audit.filterProduct")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("audit.allProducts")}</SelectItem>
            {groupedProducts.desktop.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="text-muted-foreground text-xs mr-2">[{t("products.desktop")}]</span>
                {p.name}
              </SelectItem>
            ))}
            {groupedProducts.saas.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="text-muted-foreground text-xs mr-2">[{t("products.saas")}]</span>
                {p.name}
              </SelectItem>
            ))}
            {groupedProducts.hybrid.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="text-muted-foreground text-xs mr-2">[{t("products.hybrid")}]</span>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value)
            setPage(0)
          }}
          className="w-40"
          aria-label={t("audit.from")}
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value)
            setPage(0)
          }}
          className="w-40"
          aria-label={t("audit.to")}
        />
        <Input
          placeholder={t("audit.filterEntityId")}
          value={entityIdFilter}
          onChange={(e) => {
            setEntityIdFilter(e.target.value)
            setPage(0)
          }}
          className="w-56"
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="h-64 animate-pulse bg-muted rounded-lg" />
          ) : (
            <>
              <DataTable>
                <DataTableHeader>
                  <DataTableRow>
                    <DataTableHead className="w-8" />
                    <DataTableHead>{t("common.created")}</DataTableHead>
                    <DataTableHead>{t("audit.entity")}</DataTableHead>
                    <DataTableHead>{t("audit.action")}</DataTableHead>
                    <DataTableHead>{t("audit.actor")}</DataTableHead>
                    <DataTableHead>{t("audit.changes")}</DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {logs.length === 0 && <DataTableEmpty colSpan={6} message={t("audit.empty")} />}
                  {logs.map((log) => {
                    const open = expanded === log.id
                    const changeCount = log.changes ? Object.keys(log.changes).length : 0
                    return (
                      <Fragment key={log.id}>
                        <DataTableRow>
                          <DataTableCell>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                              onClick={() => setExpanded(open ? null : log.id)}
                              aria-label={t("audit.details")}
                            >
                              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </DataTableCell>
                          <DataTableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(log.created_at)}
                            <span className="ml-1">· {relTime(log.created_at)}</span>
                          </DataTableCell>
                          <DataTableCell>
                            <span className="font-medium">{log.entity}</span>
                            <span className="text-muted-foreground text-xs ml-1 break-all">
                              #{log.entity_id.substring(0, 8)}
                            </span>
                          </DataTableCell>
                          <DataTableCell>
                            <Badge className={actionColor(log.action)}>{log.action}</Badge>
                          </DataTableCell>
                          <DataTableCell className="text-muted-foreground text-xs">
                            {log.actor_type || "-"}
                            {log.ip_address && <span className="ml-1">({log.ip_address})</span>}
                          </DataTableCell>
                          <DataTableCell className="text-xs text-muted-foreground max-w-xs truncate">
                            {changeCount > 0 ? JSON.stringify(log.changes) : "-"}
                          </DataTableCell>
                        </DataTableRow>
                        {open && (
                          <DataTableRow className="bg-muted/30">
                            <DataTableCell colSpan={6} className="py-4 text-xs">
                              <div className="space-y-3">
                                <div className="flex flex-wrap gap-x-6 gap-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">{t("audit.fullId")}:</span>
                                    <span className="font-mono break-all">{log.entity_id}</span>
                                    <button
                                      type="button"
                                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                                      onClick={() => navigator.clipboard?.writeText(log.entity_id)}
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">{t("audit.ip")}:</span>{" "}
                                    <span className="font-mono">{log.ip_address || "-"}</span>
                                  </div>
                                  {log.actor_id && (
                                    <div>
                                      <span className="text-muted-foreground">{t("audit.actorId")}:</span>{" "}
                                      <span className="font-mono break-all">{log.actor_id}</span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-muted-foreground mb-1">{t("audit.changes")}</div>
                                  {changeCount > 0 ? (
                                    <pre className="max-h-64 overflow-auto rounded-md bg-background p-3 font-mono text-[11px] whitespace-pre-wrap">
                                      {JSON.stringify(log.changes, null, 2)}
                                    </pre>
                                  ) : (
                                    <div className="text-muted-foreground">{t("audit.noChanges")}</div>
                                  )}
                                </div>
                              </div>
                            </DataTableCell>
                          </DataTableRow>
                        )}
                      </Fragment>
                    )
                  })}
                </DataTableBody>
              </DataTable>
              {total > 0 && (
                <DataTablePagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  pageSize={pageSize}
                  pageSizeOptions={[30, 50, 100]}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size)
                    setPage(0)
                  }}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
