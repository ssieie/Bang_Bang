const loadingDom = document.getElementById('pageLoading')

export const showLoading = () => {
    loadingDom.classList.add('loading-active')
}

export const hideLoadinng = () => {
    loadingDom.classList.remove('loading-active')
}