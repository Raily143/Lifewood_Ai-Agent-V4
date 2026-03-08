'use client';
import { useEffect, useState } from 'react';
import { driveService } from '../../services/driveService';

type DriveItem = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  children?: DriveItem[];
};

function getFileIcon(mimeType: string): string {
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('video')) return '🎬';
  if (mimeType.includes('audio')) return '🎵';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '🗜️';
  return '📄';
}

function FolderTree({ items, depth = 0 }: { items: DriveItem[]; depth?: number }) {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setOpenFolders((prev) => ({ ...prev, [id]: !prev[id] }));

  const isFolder = (item: DriveItem) =>
    item.mimeType === 'application/vnd.google-apps.folder';

  return (
    <ul style={{ listStyle: 'none', paddingLeft: depth === 0 ? 0 : '20px', margin: 0 }}>
      {items.map((item) => (
        <li key={item.id} style={{ margin: '4px 0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px',
              borderRadius: '6px',
              cursor: isFolder(item) ? 'pointer' : 'default',
              backgroundColor: isFolder(item) ? '#f0f4ff' : 'transparent',
              transition: 'background 0.15s',
            }}
            onClick={() => isFolder(item) && toggle(item.id)}
          >
            <span style={{ fontSize: '16px' }}>
              {isFolder(item) ? (openFolders[item.id] ? '📂' : '📁') : getFileIcon(item.mimeType)}
            </span>
            {item.webViewLink ? (
              <a href={item.webViewLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: isFolder(item) ? 600 : 400 }}>{item.name}</a>
            ) : (
              <span style={{ fontWeight: isFolder(item) ? 600 : 400 }}>{item.name}</span>
            )}
            {item.modifiedTime && (
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#888' }}>
                {new Date(item.modifiedTime).toLocaleDateString()}
              </span>
            )}
          </div>
          {isFolder(item) && openFolders[item.id] && item.children && item.children.length > 0 && (
            <FolderTree items={item.children} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function DrivePage() {
  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const data = await driveService.listFiles();
        setFolders(data);
      } catch (err) {
        setError('Failed to load Drive files.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, []);

  if (loading) return <p style={{ padding: '20px' }}>Loading Lifewood folders...</p>;
  if (error) return <p style={{ padding: '20px', color: 'red' }}>{error}</p>;

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '4px' }}>Lifewood Drive</h1>
      <p style={{ color: '#666', marginBottom: '24px', fontSize: '14px' }}>
        Showing {folders.length} Lifewood folder{folders.length !== 1 ? 's' : ''}. Click a folder to expand it.
      </p>
      {folders.length > 0 ? (
        <FolderTree items={folders} />
      ) : (
        <p>No folders containing "lifewood" found in your Drive.</p>
      )}
    </div>
  );
}