export async function fetchChatAssistants(apiUrl: string, apiKey: string) {
	const response = await fetch(
		`${apiUrl}/api/v1/chats?page=1&page_size=30&orderby=update_time&desc=true`,
		{
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		}
	);

	const data = await response.json();
	if (data.code === 0 && Array.isArray(data.data)) {
		return data.data;
	}
	throw new Error(data.message || 'Failed to fetch chat assistants');
} 