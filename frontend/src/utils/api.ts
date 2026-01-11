import axios from 'axios';

const API_BASE_URL = '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Elections
export async function getActiveElections() {
  const response = await api.get('/elections/active');
  return response.data;
}

export async function getElection(electionId: string) {
  const response = await api.get(`/elections/${electionId}`);
  return response.data;
}

export async function getConstituencies(electionId: string) {
  const response = await api.get(`/elections/${electionId}/constituencies`);
  return response.data;
}

export async function getCandidates(electionId: string, constituencyId: string) {
  const response = await api.get(`/elections/${electionId}/constituencies/${constituencyId}/candidates`);
  return response.data;
}

// Device verification
export async function verifyDevice(fingerprintData: any, electionId: string) {
  const response = await api.post('/verify-device', {
    fingerprintData,
    electionId
  });
  return response.data;
}

// Voting
export async function castVote(
  electionId: string,
  constituencyId: string,
  candidateId: string,
  sessionToken: string
) {
  const response = await api.post(
    `/vote/${electionId}`,
    { constituencyId, candidateId },
    { headers: { 'x-session-token': sessionToken } }
  );
  return response.data;
}

// Results
export async function getResults(electionId: string) {
  const response = await api.get(`/results/${electionId}`);
  return response.data;
}

export async function getMapData(electionId: string) {
  const response = await api.get(`/results/${electionId}/map`);
  return response.data;
}

// Admin
export async function adminLogin(email: string, password: string) {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
}

export async function createElection(data: any) {
  const response = await api.post('/elections', data);
  return response.data;
}

export async function uploadCandidates(electionId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/admin/elections/${electionId}/upload-candidates`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export async function uploadMap(electionId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/admin/elections/${electionId}/upload-map`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export default api;
