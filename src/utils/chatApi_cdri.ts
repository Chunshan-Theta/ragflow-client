export async function fetchChatAssistants(apiUrl: string, apiKey: string) {
	const response = await fetch(
		`https://api.cdri.voiss.cc/api/topic/`,
	);

	const data = await response.json();
	if (data.code === 0 && Array.isArray(data.data)) {
		return data.data;
	}
	throw new Error(data.message || 'Failed to fetch chat assistants');
} 