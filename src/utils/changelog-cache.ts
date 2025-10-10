const STORAGE_KEY = "task-genius-changelog-cache";

type CacheChannel = "stable" | "beta";

interface ChangelogCacheEntry {
	version: string;
	markdown: string;
	sourceUrl: string;
	updatedAt: number;
}

interface ChangelogCachePayload {
	stable?: ChangelogCacheEntry;
	beta?: ChangelogCacheEntry;
}

const getChannelKey = (isBeta: boolean): CacheChannel =>
	isBeta ? "beta" : "stable";

const getStorage = (): Storage | null => {
	try {
		if (typeof window === "undefined") {
			return null;
		}

		return window.localStorage ?? null;
	} catch {
		return null;
	}
};

const loadCache = (): ChangelogCachePayload => {
	const storage = getStorage();
	if (!storage) {
		return {};
	}

	try {
		const raw = storage.getItem(STORAGE_KEY);
		if (!raw) {
			return {};
		}

		const parsed = JSON.parse(raw) as ChangelogCachePayload;
		if (!parsed || typeof parsed !== "object") {
			return {};
		}

		return parsed;
	} catch {
		return {};
	}
};

const saveCache = (cache: ChangelogCachePayload): void => {
	const storage = getStorage();
	if (!storage) {
		return;
	}

	try {
		const serialized = JSON.stringify(cache);
		storage.setItem(STORAGE_KEY, serialized);
	} catch {
		// Swallow errors silently; cache is an optimization only.
	}
};

export const getCachedChangelog = (
	version: string,
	isBeta: boolean,
): ChangelogCacheEntry | null => {
	const cache = loadCache();
	const channel = getChannelKey(isBeta);
	const entry = cache[channel];
	if (!entry || entry.version !== version) {
		return null;
	}

	return entry;
};

export const getLatestCachedChangelog = (
	isBeta: boolean,
): ChangelogCacheEntry | null => {
	const cache = loadCache();
	const channel = getChannelKey(isBeta);
	return cache[channel] ?? null;
};

export const cacheChangelog = (
	version: string,
	isBeta: boolean,
	data: Pick<ChangelogCacheEntry, "markdown" | "sourceUrl">,
): void => {
	const cache = loadCache();
	const channel = getChannelKey(isBeta);
	cache[channel] = {
		version,
		markdown: data.markdown,
		sourceUrl: data.sourceUrl,
		updatedAt: Date.now(),
	};
	saveCache(cache);
};

