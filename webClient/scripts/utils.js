
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