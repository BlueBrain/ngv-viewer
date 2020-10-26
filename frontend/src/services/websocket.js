
import get from 'lodash/get';

import config from '@/config';
import eventBus from './event-bus';


const socketState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

const reconnectTimeout = 2000;


function getSocketUrlFromConfig(conf) {
  const { location } = window;

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = get(conf, 'server.host', location.host);
  const port = get(conf, 'server.port', '');

  const socketUrl = `${protocol}//${host}:${port}/ws`;

  return socketUrl;
}


class Ws {
  constructor() {
    this.cmdId = 0;
    this.messageQueue = [];
    this.messageContext = {};
    this.requestResolvers = new Map();
    this.socket = null;

    this._initWebSocket();
  }

  /**
   * Send message
   * @param {String} message
   * @param {*} data
   * @param {*} cmdId
   */
  send(message, data, cmdId = null) {
    switch (this.socket.readyState) {
      case socketState.OPEN: {
        this.socket.send(JSON.stringify({
          data,
          context: this.messageContext,
          cmd: message,
          cmdid: cmdId,
          timestamp: Date.now(),
        }));
        break;
      }
      case socketState.CONNECTING:
      case socketState.CLOSING:
      case socketState.CLOSED:
      default: {
        this.messageQueue.push([message, data, cmdId]);
        break;
      }
    }
  }

  /**
   * Set a message context that will be sent to backend
   * with every websocket message
   *
   * @param {Object} context
   */
  setMessageContext(context) {
    this.messageContext = context;
  }

  async request(message, data) {
    const currentCmdId = ++this.cmdId;
    const response = new Promise((resolve) => {
      this.requestResolvers.set(currentCmdId, resolve);
    });
    this.send(message, data, currentCmdId);
    return response;
  }

  _initWebSocket() {
    const socketUrl = getSocketUrlFromConfig(config);
    this.socket = new WebSocket(socketUrl);

    this.socket.addEventListener('open', () => this._processQueue());
    this.socket.addEventListener('error', e => console.error(e));
    this.socket.addEventListener('close', () => this._reconnect());

    this.socket.addEventListener('message', (e) => {
      const message = JSON.parse(e.data);

      const cmdId = get(message, 'data.cmdid');
      if (cmdId) {
        const requestResolver = this.requestResolvers.get(cmdId);
        requestResolver(message.data);
        this.requestResolvers.delete(cmdId);
        return;
      }

      eventBus.$emit(`ws:${message.cmd}`, message.data);
    });
  }

  _reconnect() {
    setTimeout(() => this._initWebSocket(), reconnectTimeout);
  }

  _processQueue() {
    let queueLength = this.messageQueue.length;
    while (queueLength--) {
      const message = this.messageQueue.shift();
      this.send(...message);
    }
  }
}


export default new Ws();
