// src/services/driveService.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const driveService = {
  // 1. Get the Auth URL from Django
  getAuthUrl: async () => {
    // We point directly to the Django endpoint we created
    return `${API_URL}/api/google/auth/`;
  },

  // 2. Fetch the list of files from Django
  listFiles: async () => {
    const response = await fetch(`${API_URL}/api/google/files/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });
    if (!response.ok) throw new Error("Failed to fetch files");
    return response.json();
  },

  getFileContentUrl: (fileId: string) => `${API_URL}/api/google/files/${fileId}/content/`,

  uploadFileToFolder: async (folderId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/google/folders/${folderId}/upload/`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Failed to upload file');
    }

    return response.json();
  },

  deleteFile: async (fileId: string) => {
    const response = await fetch(`${API_URL}/api/google/files/${fileId}/delete/`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Failed to delete file');
    }

    return response.json();
  },
};
