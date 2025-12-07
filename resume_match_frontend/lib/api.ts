/**
 * API utility functions for ResuMatch backend integration
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ProcessResponse {
  evaluation: string;
  email: string;
  status?: string;
}

export interface TextInputRequest {
  cv_content: string;
  job_content: string;
}

/**
 * Check if API is healthy
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Process CV and job description from text input
 */
export async function processText(cvContent: string, jobContent: string): Promise<ProcessResponse> {
  const response = await fetch(`${API_BASE_URL}/api/process-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cv_content: cvContent,
      job_content: jobContent,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to process text: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Process CV and job description from uploaded files
 */
export async function processFiles(cvFile: File, jobFile: File): Promise<ProcessResponse> {
  const formData = new FormData();
  formData.append('cv_file', cvFile);
  formData.append('job_file', jobFile);

  const response = await fetch(`${API_BASE_URL}/api/process-files`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to process files: ${response.statusText}`);
  }

  return response.json();
}

