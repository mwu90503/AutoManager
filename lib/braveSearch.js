// The News endpoint indexes far fresher than general Web search for
// fast-moving sports content - team injury-report pages are a single
// URL updated in place each day, and Brave's web crawler visits those
// less often than its news crawler does. freshness=pd (past day) since
// we only care about the very latest practice report, not older news.
export async function braveNewsSearch(query, count = 8) {
  const url = `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=${count}&freshness=pd`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY,
    },
  });
  if (!res.ok) {
    throw new Error(`Brave News Search failed: ${res.status}`);
  }
  const data = await res.json();
  return (data.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    description: r.description,
    age: r.age,
    pageAge: r.page_age,
    extraSnippets: r.extra_snippets || [],
  }));
}
