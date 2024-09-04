function _overrideXMLHttpRequestProxy () { 
  const proxyUrlList = [];
  XMLHttpRequest.prototype.oldOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.oldSend = XMLHttpRequest.prototype.send
  XMLHttpRequest.prototype.oldSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader
  const open = XMLHttpRequest.prototype.oldOpen
  const send = XMLHttpRequest.prototype.oldSend
  const setHeader = XMLHttpRequest.prototype.oldSetRequestHeader
  XMLHttpRequest.prototype.setRequestHeader = function (...rest) {
    if (this.isProxy) return this.cacheHeaderSettings.push(rest)
    XMLHttpRequest.prototype.oldSetRequestHeader.call(this, ...rest)
  }
  XMLHttpRequest.prototype.send = function (...rest) {
    if (this.isProxy && this.proxy.callback) {
      this.catchSendData = rest
      this.proxy.callback(this, open.bind(this), setHeader.bind(this), send.bind(this))
      return
    }
    XMLHttpRequest.prototype.oldSend.call(this, ...rest)
  }
  XMLHttpRequest.prototype.open = function (...rest) {
    const url = rest[1]
    const method = rest[0]
    const proxy = proxyUrlList.find(i =>
      url.includes(i.url) && method.toLocaleUpperCase() === i.method.toLocaleUpperCase()
    )
    if (proxy) {
      this.proxy = proxy;
      this.cacheHeaderSettings = []
      this.openSettings = rest
      return (this.isProxy = true)
    }
    XMLHttpRequest.prototype.oldOpen.call(this, ...rest)
  }
  XMLHttpRequest.prototype.requestOriginal = function (formatSendData, responseCallBack) { 
    try {
      if (!this.isProxy) return
      const _open = open.bind(this)
      const _setHeader = setHeader.bind(this)
      const _send = send.bind(this)
      _open(...this.openSettings)
      this.cacheHeaderSettings.forEach(headerSetting => {
        _setHeader(...headerSetting)
      })
      const oldReadyStateChange = this.onreadystatechange;
      this.onreadystatechange = res => {
        if (!this || this.readyState !== 4) {
          return;
        }
        const copyResponse = {...res.target.response}
        const response = responseCallBack ? responseCallBack(copyResponse) || res.response : copyResponse;
        Object.defineProperty(res.target, 'response', {
          get() { return response }
        })
        oldReadyStateChange(res)
      }
      _send(formatSendData ? formatSendData(this.catchSendData) : this.catchSendData)
    } catch (error) {
      console.log(error);
    }
  }
  function proxyRequest(url, callback, method = 'GET') {
    proxyUrlList.push({ url, callback, method })
  }
  return proxyRequest
}
const proxyRequest = _overrideXMLHttpRequestProxy()
proxyRequest('https://cashier.youzan.com/pay/wsctrade/order/buy/v2/bill-fast.json', (xhr, open, setHeader, send) => {
  xhr.requestOriginal((data) => {
    const params = JSON.parse(data[0]);
    params.delivery.selfFetch.appointmentTel = '136****7996'
    params.delivery.selfFetch.untouchedPhone = 1
    data[0] = JSON.stringify(params)
    return data[0]
  })
}, 'POST')