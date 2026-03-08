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
  }
};