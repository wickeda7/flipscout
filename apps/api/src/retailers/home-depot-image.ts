/** Select a supplied image URL; never invent a larger CDN rendition. */
export function homeDepotImage(images: unknown): string | null {
	if (!Array.isArray(images)) return null;
	const groups = images.some(Array.isArray) ? images : [images];
	for (const group of groups) {
		if (!Array.isArray(group)) continue;
		const urls = group.flatMap((value: unknown) => {
			if (typeof value !== 'string') return [];
			try {
				const url = new URL(value);
				if (
					url.protocol !== 'https:' ||
					url.hostname !== 'images.thdstatic.com' ||
					url.port ||
					url.username ||
					url.password ||
					!/\.(?:jpe?g|png|webp)$/i.test(url.pathname)
				)
					return [];
				const size = Number(url.pathname.match(/_(\d+)\.(?:jpe?g|png|webp)$/i)?.[1] ?? 0);
				return [{ url: url.href, size }];
			} catch {
				return [];
			}
		});
		if (urls.length) return urls.sort((a, b) => b.size - a.size)[0].url;
	}
	return null;
}
