'use client';

import type { ChangeEvent } from 'react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { driveService } from '../../services/driveService';
import styles from './page.module.css';

type DriveItem = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  children?: DriveItem[];
};

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const LOGO_URL =
  'https://framerusercontent.com/images/BZSiFYgRc4wDUAuEybhJbZsIBQY.png';

function isFolder(item: DriveItem): boolean {
  return item.mimeType === FOLDER_MIME_TYPE;
}

function getDisplayName(item: DriveItem): string {
  if (isFolder(item)) return item.name;

  const trimmed = item.name.trim();
  const dotIndex = trimmed.lastIndexOf('.');
  return dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed;
}

function getItemKind(item: DriveItem): string {
  if (isFolder(item)) return 'Folder';
  if (item.mimeType.includes('pdf')) return 'PDF';
  if (item.mimeType.includes('sheet') || item.mimeType.includes('excel')) return 'Spreadsheet';
  if (item.mimeType.includes('document') || item.mimeType.includes('word')) return 'Document';
  if (item.mimeType.includes('presentation') || item.mimeType.includes('powerpoint')) return 'Deck';
  if (item.mimeType.includes('image')) return 'Image';
  return 'File';
}

function isImage(item: DriveItem): boolean {
  return item.mimeType.includes('image');
}

function formatDate(date?: string): string {
  if (!date) return 'No activity date';

  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatFileSize(size?: string): string {
  if (!size) return 'Google Workspace';

  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function summarizeTree(items: DriveItem[]) {
  let folderCount = 0;
  let fileCount = 0;

  for (const item of items) {
    if (isFolder(item)) {
      folderCount += 1;
      const nested = summarizeTree(item.children ?? []);
      folderCount += nested.folderCount;
      fileCount += nested.fileCount;
    } else {
      fileCount += 1;
    }
  }

  return { folderCount, fileCount };
}

function findItemById(items: DriveItem[], id: string | null): DriveItem | null {
  if (!id) return null;

  for (const item of items) {
    if (item.id === id) return item;
    if (item.children?.length) {
      const nested = findItemById(item.children, id);
      if (nested) return nested;
    }
  }

  return null;
}

function flattenFiles(items: DriveItem[]): DriveItem[] {
  const results: DriveItem[] = [];

  for (const item of items) {
    if (isFolder(item)) {
      results.push(...flattenFiles(item.children ?? []));
    } else {
      results.push(item);
    }
  }

  return results;
}

function insertChildIntoFolder(items: DriveItem[], folderId: string, child: DriveItem): DriveItem[] {
  return items.map((item) => {
    if (item.id === folderId) {
      const children = item.children ?? [];
      const exists = children.some((existingChild) => existingChild.id === child.id);

      return {
        ...item,
        children: exists ? children : [child, ...children],
      };
    }

    if (item.children?.length) {
      return {
        ...item,
        children: insertChildIntoFolder(item.children, folderId, child),
      };
    }

    return item;
  });
}

function removeItemFromTree(items: DriveItem[], itemId: string): DriveItem[] {
  return items
    .filter((item) => item.id !== itemId)
    .map((item) => ({
      ...item,
      children: item.children ? removeItemFromTree(item.children, itemId) : item.children,
    }));
}

export default function DrivePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState<'tiles' | 'content'>('tiles');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(searchInput.trim().toLowerCase());

  useEffect(() => {
    setConnectionStatus(new URLSearchParams(window.location.search).get('status'));
  }, []);

  async function fetchFiles(preferredFolderId?: string | null) {
    try {
      const data = await driveService.listFiles();
      setFolders(data);

      const targetId = preferredFolderId ?? selectedFolderId ?? data[0]?.id ?? null;
      setSelectedFolderId(targetId);
      setError(null);
      setUploadError(null);
    } catch (err) {
      setError('Failed to load scanned Google Drive folders.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = summarizeTree(folders);
  const selectedFolder = findItemById(folders, selectedFolderId) ?? folders[0] ?? null;
  const rootFolders = useMemo(() => {
    if (!deferredSearch) return folders;
    return folders.filter((folder) => folder.name.toLowerCase().includes(deferredSearch));
  }, [deferredSearch, folders]);

  const selectedContents = useMemo(() => {
    if (!selectedFolder) return [];

    const children = selectedFolder.children ?? [];
    if (!deferredSearch) return children;

    return children.filter((item) => item.name.toLowerCase().includes(deferredSearch));
  }, [deferredSearch, selectedFolder]);

  const recentFiles = useMemo(
    () =>
      flattenFiles(selectedFolder?.children ?? [])
        .sort((left, right) => {
          const leftTime = left.modifiedTime ? Date.parse(left.modifiedTime) : 0;
          const rightTime = right.modifiedTime ? Date.parse(right.modifiedTime) : 0;
          return rightTime - leftTime;
        })
        .slice(0, 4),
    [selectedFolder]
  );

  function openPreview(item: DriveItem) {
    if (!item.webViewLink || isFolder(item)) return;
    setPreviewItem(item);
  }

  function handleUploadClick() {
    if (!selectedFolder?.id || uploading) return;
    fileInputRef.current?.click();
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedFolder?.id) return;

    try {
      setUploading(true);
      setUploadError(null);
      const uploadedItem = await driveService.uploadFileToFolder(selectedFolder.id, file);

      setFolders((currentFolders) =>
        insertChildIntoFolder(currentFolders, selectedFolder.id, uploadedItem)
      );

      // Re-sync in the background so local state stays aligned with Google Drive
      setTimeout(() => {
        fetchFiles(selectedFolder.id);
      }, 800);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Failed to upload file';
      setUploadError(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteItem(item: DriveItem) {
    const confirmed = window.confirm(`Delete "${getDisplayName(item)}" from Google Drive?`);
    if (!confirmed) return;

    try {
      setDeletingId(item.id);
      setUploadError(null);
      await driveService.deleteFile(item.id);

      setFolders((currentFolders) => removeItemFromTree(currentFolders, item.id));

      if (previewItem?.id === item.id) {
        setPreviewItem(null);
      }

      setTimeout(() => {
        fetchFiles(selectedFolder?.id ?? null);
      }, 800);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete file';
      setUploadError(message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.loadingState}>
          <span className={styles.badge}>Drive Sync</span>
          <h1>Loading scanned folders</h1>
          <p>Preparing your Lifewood Google Drive dashboard.</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.loadingState}>
          <span className={styles.badge}>Connection issue</span>
          <h1>Drive data is not available</h1>
          <p>{error}</p>
          <a className={styles.primaryAction} href="/">
            Return to landing page
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.pageShell}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/drive">
          <img alt="Lifewood" className={styles.brandLogo} src={LOGO_URL} />
        </a>
        <div className={styles.topbarActions}>
          <a className={styles.signOut} href="/">
            Sign Out
          </a>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCard}>
          <span className={styles.badge}>Lifewood OCR Workspace</span>
          <h1>
            Good day, <em>admin</em>
          </h1>
          <p>Choose a scanned expense folder to open its review workspace.</p>
        </div>
        <div className={styles.heroMetrics}>
          <article className={styles.metricCard}>
            <span>Top-level scans</span>
            <strong>{folders.length}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Nested folders</span>
            <strong>{stats.folderCount}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Files indexed</span>
            <strong>{stats.fileCount}</strong>
          </article>
        </div>
      </section>

      {connectionStatus === 'success' ? (
        <section className={styles.statusBar}>
          <span className={styles.statusPill}>Connected</span>
          <p>Google Drive connected successfully. The scanned folders below are ready for review.</p>
        </section>
      ) : null}

      <section className={styles.controls}>
        <div>
          <h2>Expense Folders</h2>
          <p>Each card represents a scanned folder from your connected Google Drive.</p>
        </div>
        <div className={styles.controlActions}>
          <label className={styles.searchBox}>
            <span className={styles.searchIcon}>o</span>
            <input
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search folders..."
              type="search"
              value={searchInput}
            />
          </label>
          <div className={styles.viewToggle}>
            <button
              className={viewMode === 'tiles' ? styles.viewToggleActive : ''}
              onClick={() => setViewMode('tiles')}
              type="button"
            >
              Tiles
            </button>
            <button
              className={viewMode === 'content' ? styles.viewToggleActive : ''}
              onClick={() => setViewMode('content')}
              type="button"
            >
              Content
            </button>
          </div>
        </div>
      </section>

      <input
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
        className={styles.hiddenInput}
        onChange={handleFileSelected}
        ref={fileInputRef}
        type="file"
      />

      {viewMode === 'tiles' ? (
        <section className={styles.folderGrid}>
          {rootFolders.map((folder) => (
            <button
              className={`${styles.folderCard} ${selectedFolder?.id === folder.id ? styles.folderCardActive : ''}`}
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              type="button"
            >
              <span className={styles.folderIcon}>[]</span>
              <h3>{folder.name}</h3>
              <p>{folder.children?.length ?? 0} scanned items</p>
              <span className={styles.folderLink}>Open Folder</span>
            </button>
          ))}
        </section>
      ) : (
        <section className={styles.folderList}>
          {rootFolders.map((folder) => (
            <button
              className={`${styles.folderListRow} ${selectedFolder?.id === folder.id ? styles.folderListRowActive : ''}`}
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              type="button"
            >
              <span className={styles.folderListIcon}>[]</span>
              <div className={styles.folderListBody}>
                <strong>{folder.name}</strong>
                <span>Open folder content</span>
              </div>
              <div className={styles.folderListMeta}>
                <span>{folder.children?.length ?? 0} items</span>
                <span>Open</span>
              </div>
            </button>
          ))}
        </section>
      )}

      {selectedFolder ? (
        <section className={styles.workspaceShell}>
          <div className={styles.workspaceToolbar}>
            <div className={styles.workspaceHeader}>
              <span className={styles.badge}>Functions</span>
              <div className={styles.workspaceTitleRow}>
                <button
                  className={styles.backButton}
                  onClick={() => setSelectedFolderId(folders[0]?.id ?? null)}
                  type="button"
                >
                  &lt;
                </button>
                <span className={styles.titleAccent} />
                <h2>{selectedFolder.name} - Expense OCR Workspace</h2>
              </div>
            </div>
            <div className={styles.workspaceActions}>
              <button className={styles.primaryAction} onClick={handleUploadClick} type="button">
                {uploading ? 'Uploading...' : 'Upload Receipt'}
              </button>
              <button className={styles.secondaryAction} type="button">
                Export
              </button>
            </div>
          </div>

          <div className={styles.workspaceFilters}>
            <label className={styles.workspaceSearch}>
              <span className={styles.searchIcon}>o</span>
              <input
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by receipt no, employee, or description..."
                type="search"
                value={searchInput}
              />
            </label>
            <label className={styles.statusField}>
              <span>Status</span>
              <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                <option>All Statuses</option>
                <option>Ready</option>
                <option>Needs Review</option>
              </select>
            </label>
          </div>

          {uploadError ? <p className={styles.inlineError}>{uploadError}</p> : null}

          <section className={styles.contentsSection}>
            <div className={styles.contentsHeader}>
              <span className={styles.contentsBadge}>Contents</span>
              <span className={styles.contentsMeta}>{selectedContents.length} items found</span>
            </div>

            {selectedContents.length > 0 ? (
              <div className={styles.tableWrap}>
                <div className={styles.tableHeader}>
                  <span>Name</span>
                  <span>Type</span>
                  <span>Size</span>
                  <span>Date</span>
                  <span>Actions</span>
                </div>
                <div className={styles.tableBody}>
                  {selectedContents.map((item) => (
                    <div className={styles.tableRow} key={item.id}>
                      <span className={styles.tableName}>{getDisplayName(item)}</span>
                      <span className={styles.tableCellMuted}>{getItemKind(item)}</span>
                      <span className={styles.tableCellMuted}>
                        {isFolder(item) ? `${item.children?.length ?? 0} items` : formatFileSize(item.size)}
                      </span>
                      <span className={styles.tableCellMuted}>{formatDate(item.modifiedTime)}</span>
                      <div className={styles.tableActions}>
                        {isFolder(item) ? (
                          <button
                            className={styles.tableAction}
                            onClick={() => setSelectedFolderId(item.id)}
                            type="button"
                          >
                            Open folder
                          </button>
                        ) : (
                          <button
                            className={styles.tableAction}
                            onClick={() => openPreview(item)}
                            type="button"
                          >
                            View content
                          </button>
                        )}
                        <button
                          className={styles.tableDeleteAction}
                          disabled={deletingId === item.id}
                          onClick={() => handleDeleteItem(item)}
                          type="button"
                        >
                          {deletingId === item.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.emptyWorkspace}>
                <p>No receipts found. Upload your first receipt to get started.</p>
              </div>
            )}
          </section>
        </section>
      ) : null}

      {previewItem ? (
        <div aria-modal="true" className={styles.modalOverlay} onClick={() => setPreviewItem(null)} role="dialog">
          <section className={styles.modalPanel} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.sectionLabel}>File preview</span>
                <h2>{getDisplayName(previewItem)}</h2>
              </div>
              <button className={styles.modalClose} onClick={() => setPreviewItem(null)} type="button">
                x
              </button>
            </div>
            <div className={styles.modalInfo}>
              <span className={styles.itemBadge}>{getItemKind(previewItem)}</span>
              <span>{formatFileSize(previewItem.size)}</span>
              <span>{formatDate(previewItem.modifiedTime)}</span>
            </div>
            {isImage(previewItem) ? (
              <div className={styles.modalImageWrap}>
                <img
                  alt={getDisplayName(previewItem)}
                  className={styles.modalImage}
                  src={driveService.getFileContentUrl(previewItem.id)}
                />
              </div>
            ) : (
              <iframe
                className={styles.modalFrame}
                referrerPolicy="no-referrer"
                src={previewItem.webViewLink ?? ''}
                title={previewItem.name}
              />
            )}
            <div className={styles.modalActions}>
              <button className={styles.secondaryAction} onClick={() => setPreviewItem(null)} type="button">
                Close
              </button>
              <a className={styles.primaryAction} href={previewItem.webViewLink ?? '#'} rel="noreferrer" target="_blank">
                Open in Drive
              </a>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
