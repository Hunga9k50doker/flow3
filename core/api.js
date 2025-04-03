const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
const axios = require("axios");
const colors = require("colors");
const { HttpsProxyAgent } = require("https-proxy-agent");
const settings = require("./config/config.js");
const { sleep, loadData, getRandomNumber, saveToken, isTokenExpired, saveJson, getRandomElement, generateRandomNumber } = require("./utils.js");

async function AxiosmakeRequest(
  url,
  method,
  data = {},
  options = {
    retries: 1,
    isAuth: false,
    extraHeaders: {},
  }
) {
  const { retries, isAuth, extraHeaders } = options;

  const headers = {
    ...this.headers,
    ...extraHeaders,
  };

  if (!isAuth) {
    headers["authorization"] = `Bearer ${this.token}`;
  }

  let proxyAgent = null;
  if (settings.USE_PROXY) {
    proxyAgent = new HttpsProxyAgent(this.proxy);
  }
  let currRetries = 0;
  do {
    try {
      const response = await axios({
        method,
        url,
        headers,
        timeout: 60000,
        ...(proxyAgent ? { httpsAgent: proxyAgent, httpAgent: proxyAgent } : {}),
        ...(method.toLowerCase() != "get" ? { data: JSON.stringify(data || {}) } : {}),
      });
      if (response?.data?.data) return { status: response.status, success: true, data: response.data.data };
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error.message;
      this.log(`Request failed: ${url} | ${error.message}...`, "warning");

      if (error.message.includes("stream has been aborted")) {
        return { success: false, status: error.status, data: null, error: errorMessage };
      }
      if (error.status == 401) {
        this.log(`Unauthorized: ${url}`);
        await sleep(1);
        process.exit(1);
      }
      if (error.status == 400) {
        this.log(`Invalid request for ${url}, maybe have new update from server | contact: https://t.me/airdrophuntersieutoc to get new update!`, "error");
        return { success: false, status: error.status, error: errorMessage };
      }
      if (error.status == 429) {
        this.log(`Rate limit ${error.message}, waiting 30s to retries`, "warning");
        await sleep(60);
      }
      await sleep(settings.DELAY_BETWEEN_REQUESTS);
      currRetries++;
      if (currRetries > retries) {
        return { status: error.status, success: false, error: errorMessage };
      }
    }
  } while (currRetries <= retries);
}

async function NodeFetchMakeRequest(
  url,
  method,
  data = {},
  options = {
    retries: 1,
    isAuth: false,
    extraHeaders: {},
  }
) {
  const { retries, isAuth, extraHeaders } = options;
  const headers = {
    ...this.headers,
    ...extraHeaders,
  };

  if (!isAuth) {
    headers["authorization"] = `Bearer ${this.token}`;
  }

  let proxyAgent = null;
  if (settings.USE_PROXY) {
    proxyAgent = new HttpsProxyAgent(this.proxy);
  }

  let currRetries = 0;
  do {
    try {
      const fetchOptions = {
        method,
        headers,
        timeout: 60000,
        agent: proxyAgent,
      };

      if (method.toLowerCase() !== "get") {
        fetchOptions.body = JSON.stringify(data);
        fetchOptions.headers["Content-Type"] = "application/json";
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorData = await response.json();
        throw {
          status: response.status,
          message: errorData.error || errorData.message || response.statusText,
        };
      }

      const responseData = await response.json();
      if (responseData?.data) {
        return { status: response.status, success: true, data: responseData.data };
      }
      return { success: true, data: responseData, status: response.status };
    } catch (error) {
      const errorMessage = error.message || "Unknown error";
      this.log(`Request failed: ${url} | ${errorMessage}...`, "warning");

      if (error.message.includes("stream has been aborted")) {
        return { success: false, status: error.status, data: null, error: errorMessage };
      }
      if (error.status === 401) {
        this.log(`Unauthorized: ${url}`);
        await sleep(1);
        process.exit(1);
      }
      if (error.status === 400) {
        this.log(`Invalid request for ${url}, maybe have new update from server | contact: https://t.me/airdrophuntersieutoc to get new update!`, "error");
        return { success: false, status: error.status, error: errorMessage };
      }
      if (error.status === 429) {
        this.log(`Rate limit ${errorMessage}, waiting 30s to retry`, "warning");
        await sleep(30);
      }
      await sleep(settings.DELAY_BETWEEN_REQUESTS);
      currRetries++;
      if (currRetries > retries) {
        return { status: error.status, success: false, error: errorMessage };
      }
    }
  } while (currRetries <= retries);
}

module.exports = {
  AxiosmakeRequest,
  NodeFetchMakeRequest,
};
