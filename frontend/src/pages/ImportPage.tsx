import { useEffect, useRef, useState } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { uploadTngFile, processImportBatch, getImportHistory } from '@/services/importService';
import { formatCurrency, formatDate } from '@/utils/format';
import type { ImportBatch } from '@/types';

export function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<any[]>([]);
  const [parsedCount, setParsedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState<{ createdCount: number } | null>(null);
  const [history, setHistory] = useState<ImportBatch[]>([]);

  // Password decryption states
  const [password, setPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function loadHistory() {
    const { batches } = await getImportHistory();
    setHistory(batches);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleFile(file: File, filePassword?: string) {
    setError('');
    if (!filePassword) {
      setPassword('');
      setPasswordRequired(false);
      setPendingFile(null);
    }
    setBatch(null);
    setProcessedResult(null);
    setUploading(true);
    try {
      const result = await uploadTngFile(file, filePassword);
      setBatch(result.batch);
      setPreview(result.preview);
      setParsedCount(result.parsedCount);
      setErrorCount(result.errorCount);
      setPasswordRequired(false);
      setPendingFile(null);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || '';
      if (
        errorMessage.toLowerCase().includes('password-protected') ||
        errorMessage.toLowerCase().includes('password required')
      ) {
        setPasswordRequired(true);
        setPendingFile(file);
      } else if (errorMessage.toLowerCase().includes('incorrect password')) {
        setPasswordRequired(true);
        setPendingFile(file);
        setError(errorMessage);
      } else {
        setError(errorMessage || 'Could not parse this file. Please check the format and try again.');
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleProcess() {
    if (!batch) return;
    setProcessing(true);
    try {
      const result = await processImportBatch(batch.id, password);
      setProcessedResult(result);
      loadHistory();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not import these transactions.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload TNG eWallet Export</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
              dragOver ? 'border-paytrack-blue bg-paytrack-blue/5' : 'border-border'
            }`}
          >
            <UploadCloud size={32} className="text-paytrack-blue" />
            <p className="font-medium text-foreground">Drag & drop a CSV, XLSX, or PDF file, or click to browse</p>
            <p className="text-sm text-muted-foreground">Exported directly from the TNG eWallet app or portal</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {passwordRequired && pendingFile && (
            <div className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <div className="flex items-start gap-2 text-amber-800">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold text-sm">Encrypted PDF File Detected</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    The PDF file "{pendingFile.name}" is password-protected. Please enter its password to parse it.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter PDF password"
                  className="w-full max-w-sm rounded border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-paytrack-blue focus:ring-1 focus:ring-paytrack-blue"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && password.trim()) {
                      handleFile(pendingFile, password);
                    }
                  }}
                />
                <Button 
                  onClick={() => handleFile(pendingFile, password)}
                  disabled={uploading || !password.trim()}
                  size="sm"
                >
                  {uploading ? 'Unlocking...' : 'Unlock File'}
                </Button>
              </div>
            </div>
          )}

          {uploading && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Parsing file…
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {batch && !processedResult && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap gap-3 text-sm">
                <Badge tone="green">{parsedCount} rows parsed</Badge>
                {errorCount > 0 && <Badge tone="amber">{errorCount} rows could not be read</Badge>}
              </div>

              {preview.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Payment Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {preview.slice(0, 10).map((row, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">{formatDate(row.date)}</td>
                          <td className="max-w-[240px] truncate px-3 py-2">{row.description}</td>
                          <td className="px-3 py-2">{formatCurrency(row.amount)}</td>
                          <td className="px-3 py-2">{row.paymentMode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 10 && (
                    <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                      Showing 10 of {preview.length} preview rows.
                    </p>
                  )}
                </div>
              )}

              <Button onClick={handleProcess} disabled={processing}>
                {processing ? 'Importing…' : `Confirm & Import ${parsedCount} Transactions`}
              </Button>
            </div>
          )}

          {processedResult && (
            <div className="mt-6 flex items-start gap-3 rounded-md bg-green-50 p-4 text-sm text-green-800">
              <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Import complete</p>
                <p>
                  {processedResult.createdCount} transactions were imported as drafts. Head to the Transactions page to enrich
                  them with categories, receipts, and details.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History size={16} /> Import History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No imports yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {history.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{b.fileName}</p>
                    <p className="text-muted-foreground">
                      {formatDate(b.createdAt)} · {b.user?.fullName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{b.importedCount}/{b.totalRecords} imported</span>
                    <Badge tone={b.status === 'completed' ? 'green' : b.status === 'failed' ? 'red' : 'amber'}>{b.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
