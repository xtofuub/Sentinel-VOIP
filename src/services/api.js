const BASE_URL = '/api';
const API_LOG_LIMIT = 120;
let apiLogs = [];
const apiLogSubscribers = new Set();

const getTimestamp = () => new Date().toISOString();

const notifyApiLogSubscribers = () => {
    const snapshot = [...apiLogs];
    for (const subscriber of apiLogSubscribers) {
        try {
            subscriber(snapshot);
        } catch {
            // no-op
        }
    }
};

const appendApiLog = (entry) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    apiLogs = [{ id, ...entry }, ...apiLogs].slice(0, API_LOG_LIMIT);
    notifyApiLogSubscribers();
};

export const generateId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16).toUpperCase();
    });
};

export const generateTaskId = () => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 18; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

const tryParseJson = (value) => {
    try {
        return JSON.parse(value);
    } catch {
        return undefined;
    }
};

const extractJsonBlockFromStart = (rawText, start = 0) => {
    const opening = rawText[start];
    const closing = opening === '[' ? ']' : '}';
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < rawText.length; index += 1) {
        const char = rawText[index];

        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === '"') {
                inString = false;
            }
            continue;
        }

        if (char === '"') {
            inString = true;
            continue;
        }

        if (char === opening) {
            depth += 1;
            continue;
        }

        if (char === closing) {
            depth -= 1;
            if (depth === 0) {
                return rawText.slice(start, index + 1);
            }
        }
    }

    return null;
};

const parseApiJson = (text) => {
    const cleaned = (text ?? '').toString().trim().replace(/^\uFEFF/, '');
    if (!cleaned) {
        throw new Error('Empty API response');
    }

    const direct = tryParseJson(cleaned);
    if (direct !== undefined) {
        return direct;
    }

    const marker = cleaned.match(/0day:\s*/i);
    if (marker?.index !== undefined) {
        const fromMarker = cleaned.slice(marker.index + marker[0].length).trim();
        const parsedFromMarker = tryParseJson(fromMarker);
        if (parsedFromMarker !== undefined) {
            return parsedFromMarker;
        }
    }

    const candidateStarts = [];
    for (let index = 0; index < cleaned.length; index += 1) {
        const char = cleaned[index];
        if (char === '[' || char === '{') {
            candidateStarts.push(index);
        }
    }

    for (const start of candidateStarts) {
        const candidate = extractJsonBlockFromStart(cleaned, start);
        if (!candidate) {
            continue;
        }

        const parsedCandidate = tryParseJson(candidate);
        if (parsedCandidate !== undefined) {
            return parsedCandidate;
        }
    }

    throw new Error(`Malformed API response: ${cleaned.slice(0, 120)}`);
};

const firstArrayFromObject = (value, preferredKeys = []) => {
    if (Array.isArray(value)) {
        return value;
    }

    if (!value || typeof value !== 'object') {
        return [];
    }

    for (const key of preferredKeys) {
        if (Array.isArray(value[key])) {
            return value[key];
        }
    }

    const firstArray = Object.values(value).find(Array.isArray);
    return firstArray ?? [];
};

const toNonEmptyString = (value) => {
    if (value === null || value === undefined) {
        return '';
    }
    const normalized = String(value).trim();
    return normalized;
};

const toBoolean = (value) => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value === 1;
    }
    if (typeof value === 'string') {
        return value.trim().toLowerCase() === 'true' || value.trim() === '1';
    }
    return false;
};

const firstNonEmpty = (item, keys) => {
    for (const key of keys) {
        const value = item?.[key];
        if (value !== null && value !== undefined && String(value).trim() !== '') {
            return value;
        }
    }
    return '';
};

const normalizeLanguageItem = (item) => {
    const id = toNonEmptyString(firstNonEmpty(item, ['_id', 'id', 'code', 'c'])).toLowerCase();
    if (!id) {
        return null;
    }

    const name = toNonEmptyString(firstNonEmpty(item, ['tname', 'name', 'label', 'title'])) || id.toUpperCase();
    return {
        ...item,
        _id: id,
        tname: name,
    };
};

const normalizePrankItem = (item) => {
    if (!item || typeof item !== 'object') {
        return null;
    }

    const id = toNonEmptyString(firstNonEmpty(item, ['_id', 'id', 'dial', 'dial_id']));
    const title = toNonEmptyString(firstNonEmpty(item, ['titulo', 'title', 'name', 'nombre', 'tname']));

    if (!id || !title) {
        return null;
    }

    return {
        ...item,
        _id: id,
        titulo: title,
        desc: toNonEmptyString(firstNonEmpty(item, ['desc', 'description', 'detalle', 'summary'])),
        image_url: toNonEmptyString(firstNonEmpty(item, ['image_url', 'image', 'img', 'img_url', 'thumbnail'])),
        example: toNonEmptyString(firstNonEmpty(item, ['example', 'preview', 'sample', 'audio_example', 'demo'])),
        audiofile: toNonEmptyString(firstNonEmpty(item, ['audiofile', 'audio', 'file', 'wav', 'sound'])),
    };
};

const normalizeLanguageList = (data) => {
    const list = firstArrayFromObject(data, ['dialplan_list', 'dialplans', 'languages', 'data', 'list', 'items']);
    return list
        .map(normalizeLanguageItem)
        .filter(Boolean)
        .sort((a, b) => {
            const aOrder = Number(a.order_multi);
            const bOrder = Number(b.order_multi);
            const aHasOrder = Number.isFinite(aOrder);
            const bHasOrder = Number.isFinite(bOrder);

            if (!aHasOrder && !bHasOrder) {
                return 0;
            }
            if (!aHasOrder) {
                return 1;
            }
            if (!bHasOrder) {
                return -1;
            }
            return aOrder - bOrder;
        });
};

const normalizePrankList = (data) => {
    const list = firstArrayFromObject(data, ['dialplan', 'dialplans', 'pranks', 'data', 'list', 'items']);
    const normalized = list.map(normalizePrankItem).filter(Boolean);
    return normalized.sort((a, b) => {
        const aOrder = Number(a.order);
        const bOrder = Number(b.order);
        const aHasOrder = Number.isFinite(aOrder);
        const bHasOrder = Number.isFinite(bOrder);

        if (!aHasOrder && !bHasOrder) {
            return 0;
        }
        if (!aHasOrder) {
            return 1;
        }
        if (!bHasOrder) {
            return -1;
        }
        return aOrder - bOrder;
    });
};

const resolveCallStatus = (item) => {
    const isDeclined = toBoolean(item.ndone);
    const isDone = toBoolean(item.done);
    const isStarted = toBoolean(item.started);
    const isQueued = toBoolean(item.queued);

    if (isDeclined) {
        return 'declined';
    }
    if (isDone) {
        return 'accepted';
    }
    if (isStarted) {
        return 'running';
    }
    if (isQueued) {
        return 'queued';
    }
    return 'pending';
};

const normalizeRecordedCallItem = (item) => {
    if (!item || typeof item !== 'object') {
        return null;
    }

    const id = toNonEmptyString(firstNonEmpty(item, ['_id', 'id']));
    if (!id) {
        return null;
    }

    const audioUrl = toNonEmptyString(firstNonEmpty(item, ['url', 'audio', 'audio_url']));
    const createTimestamp = Number(firstNonEmpty(item, ['create_t', 'f']));
    const hasTimestamp = Number.isFinite(createTimestamp) && createTimestamp > 0;
    const callStatus = resolveCallStatus(item);

    return {
        ...item,
        _id: id,
        uid: toNonEmptyString(firstNonEmpty(item, ['uid'])),
        titulo: toNonEmptyString(firstNonEmpty(item, ['titulo', 'title', 'name'])) || 'Untitled call',
        cou: toNonEmptyString(firstNonEmpty(item, ['cou', 'c'])).toLowerCase(),
        pic: toNonEmptyString(firstNonEmpty(item, ['pic', 'image', 'image_url'])),
        url: audioUrl,
        started: toBoolean(item.started),
        queued: toBoolean(item.queued),
        done: toBoolean(item.done),
        ndone: toBoolean(item.ndone),
        returned: toBoolean(item.returned),
        status: callStatus,
        isPlayable: audioUrl.length > 0,
        timestamp: hasTimestamp ? createTimestamp : 0,
        timeLabel: toNonEmptyString(firstNonEmpty(item, ['fecha', 'real_f'])),
    };
};

const normalizeRecordedCallList = (data) => {
    const list = firstArrayFromObject(data, ['mis_bromas', 'calls', 'records', 'data', 'list', 'items', 'value']);
    return list
        .map(normalizeRecordedCallItem)
        .filter(Boolean)
        .sort((a, b) => b.timestamp - a.timestamp);
};

const postApi = async (path, payload) => {
    const startedAt = Date.now();
    const url = `${BASE_URL}/${path}`;
    let hasLogged = false;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        const durationMs = Date.now() - startedAt;

        if (!response.ok) {
            const message = `Request failed (${response.status}): ${text.slice(0, 120)}`;
            appendApiLog({
                ts: getTimestamp(),
                path,
                url,
                request: payload,
                ok: false,
                status: response.status,
                durationMs,
                response: text.slice(0, 4000),
                error: message,
            });
            hasLogged = true;
            throw new Error(message);
        }

        let parsed;
        try {
            parsed = parseApiJson(text);
        } catch (error) {
            appendApiLog({
                ts: getTimestamp(),
                path,
                url,
                request: payload,
                ok: false,
                status: response.status,
                durationMs,
                response: text.slice(0, 4000),
                error: error?.message || 'Parse error',
            });
            hasLogged = true;
            throw error;
        }

        appendApiLog({
            ts: getTimestamp(),
            path,
            url,
            request: payload,
            ok: true,
            status: response.status,
            durationMs,
            response: parsed,
        });
        hasLogged = true;

        if (parsed?.res === 'KO' || parsed?.res === 'ko') {
            let errorMsg = 'API Error';
            if (typeof parsed.content === 'string') {
                errorMsg = parsed.content;
            } else if (parsed.content?.et) {
                try {
                    const innerEt = JSON.parse(parsed.content.et);
                    errorMsg = innerEt.et || innerEt.ec || innerEt.res || 'API Error';
                } catch {
                    errorMsg = parsed.content.et;
                }
            } else if (parsed.msg) {
                errorMsg = parsed.msg;
            } else if (parsed.error) {
                errorMsg = parsed.error;
            }
            throw new Error(`API Refused (${parsed.code || 400}): ${errorMsg}`);
        }

        return parsed;
    } catch (error) {
        if (!hasLogged) {
            appendApiLog({
                ts: getTimestamp(),
                path,
                url,
                request: payload,
                ok: false,
                status: 0,
                durationMs: Date.now() - startedAt,
                response: null,
                error: error?.message || 'Network error',
            });
        }
        throw error;
    }
};

export const getDialplanList = async (did) => {
    const response = await postApi('get_dialplan_list', { did });
    return normalizeLanguageList(response);
};

export const getPranks = async (countryCode, uid, selectedCountryCode = countryCode) => {
    const payload = { c: countryCode, uid };
    if (selectedCountryCode) {
        payload.chc = selectedCountryCode;
    }

    const response = await postApi('get_dialplan_ios.lua', payload);
    return normalizePrankList(response);
};

const getLocaleForCountry = (countryCode) => {
    const mapping = {
        'fi': 'fi_FI',
        'es': 'es_ES',
        'gb': 'en_GB',
        'us': 'en_US',
        'fr': 'fr_FR',
        'de': 'de_DE',
        'it': 'it_IT',
        'pl': 'pl_PL',
        'pt': 'pt_PT',
        'br': 'pt_BR',
        'mx': 'es_MX',
        'co': 'es_CO',
        'ar': 'es_AR'
    };
    return mapping[countryCode.toLowerCase()] || `${countryCode.toLowerCase()}_${countryCode.toUpperCase()}`;
};

export const createAccount = async (did, countryCode = 'fi') => {
    const payload = {
        did: did,
        dtype: "uid",
        route: "jl_azul",
        tags: { 
            c: countryCode.toUpperCase(), 
            l: getLocaleForCountry(countryCode), 
            v: "6.7", 
            r: "16.2", 
            mf: "Apple" 
        },
        timezone: "Europe/Helsinki"
    };
    return postApi('create.lua', payload);
};

export const syncIdentity = async (did, uid) => {
    return postApi('get_user.lua', { did, uid });
};

export const launchPrank = async (data) => {
    return postApi('create_task_ios.lua', data);
};

export const getRecordedCalls = async (countryCode, uid) => {
    const payload = {
        c: toNonEmptyString(countryCode).toLowerCase() || 'fi',
        lpd: true,
        uid: toNonEmptyString(uid),
    };
    const response = await postApi('get_mis_bromas_ios.lua', payload);
    return normalizeRecordedCallList(response);
};

export const resolveUid = (...sources) => {
    for (const source of sources) {
        if (!source) {
            continue;
        }

        if (typeof source === 'string' && source.trim()) {
            return source.trim();
        }

        if (typeof source !== 'object') {
            continue;
        }

        const directUid = toNonEmptyString(source.uid);
        if (directUid) {
            return directUid;
        }

        const nestedUserInfo = source.user_info || source.userInfo || source.user;
        if (nestedUserInfo) {
            const userUid = toNonEmptyString(nestedUserInfo.uid);
            if (userUid) {
                return userUid;
            }

            if (Array.isArray(nestedUserInfo._id) && nestedUserInfo._id.length > 0) {
                const idValue = toNonEmptyString(nestedUserInfo._id[0]);
                if (idValue) {
                    return idValue;
                }
            }
        }
    }

    return '';
};

export const getApiLogs = () => {
    return [...apiLogs];
};

export const clearApiLogs = () => {
    apiLogs = [];
    notifyApiLogSubscribers();
};

export const subscribeApiLogs = (listener) => {
    if (typeof listener !== 'function') {
        return () => {};
    }
    apiLogSubscribers.add(listener);
    listener(getApiLogs());
    return () => {
        apiLogSubscribers.delete(listener);
    };
};
