const baseUrl = "http://127.0.0.1:8880"
// const baseUrl = "http://47.109.17.168:8880"

async function fetchJson(url, options = {}) {

    const response = await fetch(`${baseUrl}${url}`, options);

    const data = await response.json();

    if (response.ok) {
        return data;
    } else {
        throw new Error(data.error || response.statusText);
    }
}

export default fetchJson