
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
