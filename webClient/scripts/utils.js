
function validArgs(p1 = [], p2 = []) {
    if (p1.length != p2.length) {
        return false
    }
    for (let i = 0, len = p1.length; i < len; i++) {
        if (p1[i] !== p2[i]) {
            return false
        }
    }
    return true
}

export const singletonGenerate = (className) => {
    let ins = null
    let params = []
    return new Proxy(className, {
        construct(target, args) {
            if (!ins) {
                ins = Reflect.construct(target, args)
                params = args
            }
            if (!validArgs(params, args)) {
                throw new Error('args inconsistent ', params)
            }
            return ins
        }
    })
}

export const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const arrChunk = (array, size) => {
    const result = [];

    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }

    return result;
}

export const getRandomFloat = (min, max) => {
    return Math.random() * (max - min) + min;
}

export const getRandColorRange = (minColor = 0, maxColor = 255) => {
    if (minColor > maxColor) {
        minColor = 0
        maxColor = 255
    }
    maxColor++
    let r = Math.floor(Math.random() * (maxColor - minColor) + minColor)
    let g = Math.floor(Math.random() * (maxColor - minColor) + minColor)
    let b = Math.floor(Math.random() * (maxColor - minColor) + minColor)
    return {
        cS: `rgba(${r},${g},${b},255)`,
        r, g, b
    }
}

export const throttle = (func, wait, options = null) => {
    let timeout, context, args
    let previous = 0
    if (!options) options = {}

    let later = function () {
        previous = options.leading === false ? 0 : new Date().getTime()
        timeout = null
        func.apply(context, args)
        if (!timeout) context = args = null
    }

    let throttled = function () {
        let now = new Date().getTime()
        if (!previous && options.leading === false) previous = now
        let remaining = wait - (now - previous)
        context = this
        args = arguments
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout)
                timeout = null
            }
            previous = now
            func.apply(context, args)
            if (!timeout) context = args = null
        } else if (!timeout && options.trailing !== false) {
            timeout = setTimeout(later, remaining)
        }
    }

    throttled.cancel = function () {
        clearTimeout(timeout)
        previous = 0
        timeout = null
    }

    return throttled
}

export const uniqueKey = () => {
    let uuid = '', i, random
    for (i = 0; i < 32; i++) {
        random = Math.random() * 16 | 0
        if (i === 8 || i === 12 || i === 16 || i === 20) {
            uuid += '-'
        }
        uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random))
            .toString(16)
    }
    return uuid
}

export const getRandomNumber = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clearFileName(params = '') {
    return params.split('/').pop()
}

export const loadImg = (imgList = []) => {
    const loadTask = []

    for (const url of imgList) {
        loadTask.push(
            new Promise(res => {
                const img = new Image();
                img.src = url;
                img.onload = function () {
                    res({
                        name: clearFileName(url),
                        uri: img
                    })
                };
            })
        )
    }

    return Promise.all(loadTask)
}