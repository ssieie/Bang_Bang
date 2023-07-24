const baseUrl = "http://192.168.2.136:8880"
// const baseUrl = "http://47.109.17.168:8880"

async function fetchJson(url, options = {}) {

    const response = await fetch(`${baseUrl}${url}`, options).catch(() => {
        alert('网络连接错误')
    });

    const data = await response.json();

    if (response.ok) {
        return data;
    } else {
        throw new Error(data.error || response.statusText);
    }
}

export default fetchJson