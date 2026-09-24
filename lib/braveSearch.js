// freshness=pw (past week) since we only care about this week's
// practice/injury news, not old articles about a past injury.
export async function braveWebSearch(query, count = 8) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&freshness=pw`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY,
    },
  });
  if (!res.ok) {
    throw new Error(`Brave Search failed: ${res.status}`);
  }
  const data = await res.json();
  return (data.web?.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    description: r.description,
  }));
}
