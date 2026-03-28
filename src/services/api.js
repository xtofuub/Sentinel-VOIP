const BASE_URL = '/api';

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

const postApi = async (path, payload) => {
    const response = await fetch(`${BASE_URL}/${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    });

    const text = await response.text();
    if (!response.ok) {
        throw new Error(`Request failed (${response.status}): ${text.slice(0, 120)}`);
    }

    return parseApiJson(text);
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
