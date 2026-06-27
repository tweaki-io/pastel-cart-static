// Kwikpass script to add reusable functions - [Starts] 

// get kwikpass checkout token based on environment
const getEnvPath = (env) => {
  switch (env) {
    case 'dev':
      return 'dev.pdp.gokwik.co';
    case 'production':
      return 'pdp.gokwik.co';
    case 'sandbox':
      return 'sandbox.pdp.gokwik.co';
    case 'qa':
      return 'qa.pdp.gokwik.co';
    default:
      return 'pdp.gokwik.co';
  }
};

const CORE_FUNCTION_EVENTS = Object.freeze({
  LOGOUT_BUTTON_CLICK: 'kp_logout_button_click',
  SUCCESSFULLY_LOGGED_OUT: 'kp_successfully_logged_out',
  REDIRECRED_TO_ACCOUNT_PAGE: 'kp_redirected_to_account_page',
  process_fingerprinting: 'process_fingerprinting',
  store_visitor_information: 'store_visitor_information',
  store_data_from_merchant: 'store_data_from_merchant',
  kp_vst_cnt: 'kp_vst_cnt'
})
const COUNTRY_CODE_INDIA = '+91'
const CORE_TOKEN_SESSION_TYPE = Object.freeze({
  VERIFIED: 'verified',
  KP_SESSION: 'kp_session_type',
  KP_VALID_SESSION: 'kp_valid_session',
})
function isShopifyStore() {
  return !!window?.Shopify?.shop || !!window?.ShopifyAnalytics || !!window?.Shopify?.designMode;
};

window.IS_KP_IFRAME_LOADED = false;
window.KP_MESSAGE_QUEUE = [];


function handleKpPlatformAndIntegrationType() {
  if (window.merchantInfo && !window.merchantInfo?.gkPlatform) {
    window.merchantInfo.gkPlatform = 'SHOPIFY';
  }
  if (window.merchantInfo && !window.merchantInfo?.integrationType) {
    window.merchantInfo.integrationType = isShopifyStore() ? 'PLUGIN' : 'CUSTOM_SHOPIFY';
  }
}

handleKpPlatformAndIntegrationType()

// Function to process the message queue
function processMessageQueue() {
  if (!window.IS_KP_IFRAME_LOADED) return;

  const iframe = document.getElementById('iframe-kp') || document.getElementById('process-sso');
  if (!iframe || !iframe.contentWindow) return;
  while (window.KP_MESSAGE_QUEUE.length > 0) {
    const requestId = getValueFromCookiesOrLocalStorage('kp-request-id');
    const message = window.KP_MESSAGE_QUEUE.shift();
    if (window.kp_health_status == false) {
      document.getElementById('kp-login-button-header-logo')?.addEventListener('click', () => {
        window.location.href = '/account';
      });
      document.getElementById('kp-login-button-header-logo-mobile')?.addEventListener('click', () => {
        window.location.href = '/account';
      });
    } else {
      iframe.contentWindow.postMessage({ ...message, requestId }, '*');
    }
  }
}

function openIframe(event = "", kcPhoneNumber = null) {
  const nonAuthedInfo = getNotifyPh('non_authed_info');
  // const nonOtpVerifiedPhone = getNotifyPh('kp_non_otp_verified_user');
  const appUnauthPhoneNumber = getNotifyPh('kpUnauthPhoneNumber');
  const userId = getValueFromCookiesOrLocalStorage('kp_user_id')
  let data = {
    type: 'process-sso',
    event,
    mid: window.merchantInfo.mid,
    isLogout: sessionStorage.getItem('isLogout'),
    userId,
    gkPlatform: window?.merchantInfo?.gkPlatform || 'SHOPIFY',
    integrationType: window?.merchantInfo?.integrationType || 'PLUGIN',
  };
  if (kcPhoneNumber) {
    if (event === CORE_FUNCTION_EVENTS.process_fingerprinting) {
      data.visitorId = kcPhoneNumber;
    } else if (event === CORE_FUNCTION_EVENTS.store_visitor_information) {
      data.visitorInfo = kcPhoneNumber;
    } else if (event === CORE_FUNCTION_EVENTS.store_data_from_merchant) {
      data.queryparams = kcPhoneNumber;
    } else if (event === CORE_FUNCTION_EVENTS.kp_vst_cnt && kcPhoneNumber?.m_count) {
      data.mCount = kcPhoneNumber?.m_count
    } else if (event === CORE_FUNCTION_EVENTS.kp_vst_cnt && kcPhoneNumber?.m_kp_count) {
      data.mKpCount = kcPhoneNumber?.m_kp_count
    } else {
      data.kcPhone = kcPhoneNumber;
    }
  }
  if (nonAuthedInfo?.value) data.nonAuthedInfo = nonAuthedInfo;
  // if (nonOtpVerifiedPhone?.value) data.nonOtpVerifiedPhone = nonOtpVerifiedPhone;
  if (appUnauthPhoneNumber?.value) data.appUnauthPhoneNumber = appUnauthPhoneNumber;
  window.KP_MESSAGE_QUEUE.push(data);
  let iframe = document.getElementById('iframe-kp');
  const iframeLoadedHandler = function () {
    window.IS_KP_IFRAME_LOADED = true;

    window.removeEventListener('kp_iframe_loaded', processMessageQueue);
    processMessageQueue();
  };
  window.addEventListener('kp_iframe_loaded', processMessageQueue);
  if (iframe) {
    // Post message immediately if iframe is already loaded
    if (iframe.contentWindow && window.IS_KP_IFRAME_LOADED) {
      iframeLoadedHandler()
    }
    // Post message again when iframe loads
    iframe.onload = function () {
      iframeLoadedHandler()
    };
  }
}
// get device Width -> used to add UI and functionality based on device width
function getDeviceWidth() {
  return window.innerWidth;
}

// check if cookie exists
function checkCookieExists(cookieName) {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name] = cookie.split('=').map((c) => c.trim());
    if (name === cookieName) {
      return true;
    }
  }
  return false;
}

function kpGetCookieValue(key) {
  const cookies = document.cookie.split(';').map((cookie) => cookie.trim());
  for (const cookie of cookies) {
    const [cookieKey, cookieValue] = cookie.split('=');
    if (cookieKey === key) {
      return cookieValue;
    }
  }
  return null;
}

function kpGetLocalStorageValue(key, isNotIncognito = true) {
  return isNotIncognito && localStorage.getItem(key);
}

function kpSetCookie(key, value, days, isIframe = false, minutes) {
  let expires = '';
  let domain = '';
  if (days || minutes) {
    const expirationDate = new Date();
    if (days) {
      expirationDate.setDate(expirationDate.getDate() + days);
    }
    if (minutes) {
      expirationDate.setTime(expirationDate.getTime() + minutes * 60 * 1000);
    }
    expires = '; expires=' + expirationDate.toUTCString();
  }
  if (isIframe) {
    domain = ';domain=' + getPdpUrl();
  }
  document.cookie =
    key + '=' + (value || '') + expires + '; SameSite=None; Secure; path=/' + domain;
}

function getValueFromCookiesOrLocalStorage(key, isNotIncognito = true) {
  if (key === 'notify_phone_number') {
    return getNotifyPh();
  }
  const cookieValue = kpGetCookieValue(key);
  if (cookieValue == null) {
    const localStorageValue = kpGetLocalStorageValue(key, isNotIncognito);
    return localStorageValue;
  }

  return cookieValue;
}

function setValueInCookiesAndLocalStorage(
  key,
  value,
  isNotIncognito = true,
  expirationDays = 365,
) {
  kpSetCookie(key, value, expirationDays);
  isNotIncognito && window.localStorage.setItem(key, value);
  if (key === XGokwikCoreToken(window.merchantInfo.environment)) {
    setValueInIDB(key, value);
  }

}

function kpDeleteLocalStorageValue(key, isNotIncognito = true) {
  isNotIncognito && localStorage.removeItem(key);
}

function kpDeleteCookie(name) {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

function deleteValueFromCookiesAndLocalStorage(key, isNotIncognito = true) {
  kpDeleteCookie(key);
  kpDeleteLocalStorageValue(key, isNotIncognito);
  if (key === XGokwikCoreToken(window.merchantInfo.environment)) {
    deleteValueInIDB(key);
  }

}

// extract rgb values 
function extractRGBValues(rgbColor, opacity = 1) {
  const values = rgbColor.match(/\d+/g);
  if (values) {
    const r = parseInt(values[0]);
    const g = parseInt(values[1]);
    const b = parseInt(values[2]);
    return `rgba(${r},${g},${b},${opacity})`
  } else {
    return null; // Invalid RGB color format
  }
}

// to get background color from header, if we didn't get color from parent, look background color of parent's parent until we get background color of header.
function findBackgroundColor(element) {
  while (element) {
    const computedStyle = window.getComputedStyle(element);
    const backgroundColor = computedStyle.backgroundColor;
    // Check if the background color is defined and not transparent
    if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
      return backgroundColor;
    }
    // Move to the parent element
    element = element.parentElement;
  }
  // If no defined background color is found in any ancestor, return a default value (e.g., null or 'white')
  return 'rgba(255,255,255,1)';
}

// to get core token based on environment
function XGokwikCoreToken(env) {
  if (env === 'dev' || env === 'local' || env === 'hdev' || env === 'qatwo' || env === 'ndev' || env === 'idev') {
    return 'SANDBOXKWIKSESSIONTOKEN';
  } else if (env === 'production' || env === 'pci-prod') {
    return 'KWIKSESSIONTOKEN';
  } else if (env === 'sandbox') {
    return 'SANDBOXKWIKSESSIONTOKEN';
  } else if (env === 'qa') {
    return 'QAKWIKSESSIONTOKEN';
  }
  return 'SANDBOXKWIKSESSIONTOKEN';
}

// to get kwikpass token based on environment
function XGokwikToken(env) {
  if (env === 'dev' || env === 'local' || env === 'hdev' || env === 'qatwo' || env === 'ndev' || env === 'idev') {
    return 'DEVKWIKUSERTOKEN';
  } else if (env === 'production' || env === 'pci-prod') {
    return 'KWIKUSERTOKEN';
  } else if (env === 'sandbox') {
    return 'SANDBOXKWIKUSERTOKEN';
  } else if (env === 'qa') {
    return 'QAKWIKUSERTOKEN';
  }
  return 'DEVKWIKUSERTOKEN';
}

// to get uni token based on environment
function XGokwikUniToken() {
  return 'ELRTOKEN';
}

// get kwikpass checkout token based on environment
function getKwikpassCheckoutToken(env) {
  switch (env) {
    case 'dev':
      return 'DEVKWIKPASSTOKEN';
    case 'production':
      return 'KWIKPASSTOKEN';
    case 'sandbox':
      return 'SANDBOXKWIKPASSTOKEN';
    case 'qa':
      return 'QAKWIKPASSTOKEN';
    default:
      return 'DEVKWIKPASSTOKEN';
  }
}

function hndlRedrctn(r, shouldAccountPageCheck = true) {
  // handle react native webview redirection
  if (sessionStorage.getItem('is_rn_view')) {
    const event = new CustomEvent('kp_redrc', {
      detail: {
        rdrct_to: r,
      },
    });
    window.dispatchEvent(event);
  } else {
    if ((r === '/account' || r.startsWith('/account/')) && shouldAccountPageCheck) {
      const isCustomAccountPage = sessionStorage.getItem('isCustomAccountPage')
      if (isCustomAccountPage) {
        r = isCustomAccountPage;
      }
      window.location.href = r;
    } else {
      window.location.href = r;
    }
  }
}

function getNotifyPh(key = null) {
  let notifyPhone = kpGetLocalStorageValue('notify_phone_number') || kpGetCookieValue('notify_phone_number');
  if (notifyPhone) {
    if (!notifyPhone?.includes('|')) {
      notifyPhone = `+91|${val}`;
    }
    const encodedPhoneNumber = btoa(notifyPhone);
    setValueInCookiesAndLocalStorage('notifyph', encodedPhoneNumber);
    deleteValueFromCookiesAndLocalStorage('notify_phone_number');
    return notifyPhone;
  }
  const getEncodedPhoneNumber = getValueFromCookiesOrLocalStorage(key ? key : 'notifyph');
  if (getEncodedPhoneNumber) {
    const phoneArray = atob(getEncodedPhoneNumber).split('|');
    if (phoneArray?.length === 1) {
      return {
        country_code: COUNTRY_CODE_INDIA,
        value: phoneArray[0],
      };
    } else {
      return {
        country_code: phoneArray[0],
        value: phoneArray[1],
      };
    }
  }
  return null
}

function handleLogout(redirectTo = '/account/logout', params = {}, logoutFromKp = false) {
  // snowplow event when user click on logout (from anywhere)    
  const existingPhoneNumber = getNotifyPh();
  const event = new CustomEvent('snowplow_event', {
    detail: {
      category: 'logged_in_page',
      action: 'click',
      label: 'logout_button_click',
      property: 'phone_number',
      value: existingPhoneNumber?.value,
      country_code: existingPhoneNumber?.country_code,
      analyticEvent: CORE_FUNCTION_EVENTS.LOGOUT_BUTTON_CLICK,
    },
  });
  window.dispatchEvent(event);
  const kwikpassLogoutEvent = new CustomEvent('kp_user_logged_out');
  window.dispatchEvent(kwikpassLogoutEvent);

  // get logout button element by ID present in our dropdown in desktop and mobile    
  const logoutElement = document.getElementById("logout-button-desktop")
  const logoutElementMobile = document.getElementById("logout-button-mobile")

  // if element is present -> disable it and decrease the opacity during loading
  if (logoutElementMobile) {
    logoutElementMobile.setAttribute("disabled", "disabled")
    logoutElementMobile.style.opacity = "0.7"
  }

  // if element is present -> disable it and decrea the opacity during loading
  if (logoutElement) {
    logoutElement.setAttribute("disabled", "disabled")
    logoutElement.style.opacity = "0.7"
  }

  // remove keys from localStorage, sessionStorage and cookie on logout
  sessionStorage.setItem('isLogout', true);
  deleteValueFromCookiesAndLocalStorage(XGokwikToken(window.merchantInfo.environment));
  deleteValueFromCookiesAndLocalStorage(XGokwikCoreToken(window.merchantInfo.environment));
  deleteValueFromCookiesAndLocalStorage(XGokwikUniToken());
  deleteValueFromCookiesAndLocalStorage(getKwikpassCheckoutToken(window.merchantInfo.environment));
  deleteValueFromCookiesAndLocalStorage('kp_phone_number');
  deleteValueFromCookiesAndLocalStorage('isAccountPageLogin');
  deleteValueFromCookiesAndLocalStorage('KP_API_KEY');
  deleteValueFromCookiesAndLocalStorage('IS_SSO_LOGIN');
  deleteValueFromCookiesAndLocalStorage('KC_PHONE');
  deleteValueFromCookiesAndLocalStorage('kpToken');
  deleteValueFromCookiesAndLocalStorage("idb_ph_no")
  sessionStorage.removeItem('isShopifySession');
  deleteValueFromCookiesAndLocalStorage('notifyph');
  sessionStorage.removeItem(CORE_TOKEN_SESSION_TYPE.KP_SESSION);
  sessionStorage.removeItem(CORE_TOKEN_SESSION_TYPE.KP_VALID_SESSION);
  sessionStorage.removeItem('isLoginTagUpdate');
  kpDeleteCookie('kp_notification_checked');
  sessionStorage.removeItem('KP_CUSTOMER_EMAIL_DATA');
  sessionStorage.removeItem('isInternationalUser');
  localStorage.removeItem('dpdp_ssoed');
  kpDeleteCookie('acs_tkn');
  kpDeleteCookie('sc_tkn');
  kpDeleteCookie('cap_tkn');
  sessionStorage.removeItem('dpdp_ssoed');

  // KP V2
  sessionStorage.removeItem('KP_CUSTOMER_EMAIL_DATA_ERROR');
  sessionStorage.removeItem('KP_CUSTOMER_EMAIL_DATA_MANUAL_LOGIN');

  // close the dropdown if opened
  isDropdownVisible = false
  isDropdownMobileVisible = false
  localStorage.removeItem('kp_email');
  localStorage.removeItem('kp_multiple_email');
  localStorage.removeItem('kp_customer_id')
  localStorage.removeItem('kp_customer_state');
  localStorage.removeItem('needsToUpdatePhone');
  localStorage.removeItem('SHOPIFY_REDIRECT_LINK');
  kpDeleteCookie("coupon_applied", "/");

  // remove disable attribute and update the opacity once api successfullly executed and user logged out from kwikpass.
  if (logoutElement) {
    logoutElement.removeAttribute("disabled")
    logoutElement.style.opacity = "1"
  }
  // remove disable attribute and update the opacity once api successfullly executed and user logged out from kwikpass. - mobile
  if (logoutElementMobile) {
    logoutElementMobile.removeAttribute("disabled")
    logoutElementMobile.style.opacity = "1"
  }
  if (!logoutFromKp) {
    // snowplow event user successfully logout
    const snowplowEvent = new CustomEvent('snowplow_event', {
      detail: {
        category: 'logged_in_page',
        action: 'logged_out',
        label: 'successfully_loggedout',
        property: 'phone_number',
        value: existingPhoneNumber?.value,
        country_code: existingPhoneNumber?.country_code,
        analyticEvent: CORE_FUNCTION_EVENTS.SUCCESSFULLY_LOGGED_OUT
      },
    });
    window.dispatchEvent(snowplowEvent);
    //checking if the redirect is string or not
    if (typeof redirectTo !== 'string') {
      redirectTo = null;
    }
    if (!redirectTo) {
      hndlRedrctn("/account/logout", false)
    } else {
      hndlRedrctn(redirectTo, false)

    }
  }
  if (logoutFromKp) {
    const updateDomEvent = new CustomEvent('update-dom');
    window.dispatchEvent(updateDomEvent);
  }

  const mid = window.merchantInfo?.mid;
  if (mid && window.isWishlistPlusMerchant?.(mid)) {
    window.SwymCallbacks = window.SwymCallbacks || [];
    window.SwymCallbacks.push(function (swat) {
      swat.disconnectShopperContext(function () {}, function () {});
    });
  }
  // To logout user from shopify
}

function handleKpAndShopifyLogin(redirectLink, customLogin = false, params = {}) {
  const eventObj = null;
  let pathName = null;
  if (redirectLink) {
    pathName = redirectLink;
  }

  const tokenKpLogin = getValueFromCookiesOrLocalStorage(XGokwikUniToken()) || getValueFromCookiesOrLocalStorage(XGokwikCoreToken(window.merchantInfo.environment)); // for KP login check   
  const gkSessionType = sessionStorage.getItem(CORE_TOKEN_SESSION_TYPE.KP_SESSION);
  const customerId = getCustomerId(); // for Shopify login check
  const isDPDPActive = JSON.parse(localStorage.getItem('dpdp_ssoed'));
  if (!tokenKpLogin && customerId) {
    const redirection = redirectLink || '/account'
    hndlRedrctn(redirection, false)
    return;
  }
  // Check KP token expiration
  if (tokenKpLogin && JSON.parse(gkSessionType) !== CORE_TOKEN_SESSION_TYPE.VERIFIED && sessionStorage.getItem('isLogout') !== 'true') {
    handleLogout();
    return;
  }

  if (pathName === null || isDPDPActive) {
    // redirectionLink not provided
    if (!tokenKpLogin || sessionStorage.getItem('isLogout') === 'true' || isDPDPActive) {
      // KP not logged-in -> no auto-Shopify-login required after KP-login as redirection-link is not provided

      const event = new CustomEvent('open_login_modal', {
        detail: {
          customLogin,
          params
        }
      });
      window.dispatchEvent(event);
    } else {
      const event = new CustomEvent('kp-sso-custom-shopify-login', {
        detail: {
          sso_login: true
        }
      });
      window.dispatchEvent(event);

    }
    // case-> if redirectionLink is not provided and KP logged in, then the button shouldn't be visible (to be handled from merchant side)
  } else {
    // redirectionLink is provided
    if (tokenKpLogin) {
      // KP logged-in
      if (!customerId) {
        // Shopify is not logged-in
        handleShopifyLogin(eventObj, pathName);
      }
      // case-> if redirectionLink is provided and shopify logged in, then the button shouldn't be visible (to be handled from merchant side)
    } else {
      // KP not logged-in
      const event = new CustomEvent('open_login_modal', {
        detail: {
          isKpAndShopifyLogin: true,
          redirectLink: pathName,
          params
        }
      });
      window.dispatchEvent(event);
    }
  }
}

function handleShopifyLogin(e, redirectLink, isManualLoginEnable) {
  const token = getValueFromCookiesOrLocalStorage(XGokwikUniToken()) || getValueFromCookiesOrLocalStorage(XGokwikCoreToken(window.merchantInfo.environment)); // for KP login check   
  const gkSessionType = sessionStorage.getItem(CORE_TOKEN_SESSION_TYPE.KP_SESSION);
  const customerId = getCustomerId();
  if (
    token &&
    customerId !== null &&
    kpGetLocalStorageValue('kp_customer_id') != customerId
  ) {
    window.location.href = '/account';
  }
  if (token && JSON.parse(gkSessionType) !== CORE_TOKEN_SESSION_TYPE.VERIFIED) {
    // KP not logged-in
    if (customerId) {
      const redirection = redirectLink || '/account'
      hndlRedrctn(redirection, false)
      return;
    }
    const event = new CustomEvent('open_login_modal', {
      detail: {
        isKpAndShopifyLogin: true,
        redirectLink,
      }
    });
    window.dispatchEvent(event);
  } else {
    let currentElement = e?.target;
    if (customerId === null) {
      const event = new CustomEvent('shopify-session', {
        detail: { redirectUrl: redirectLink, isManualLoginEnable },
      });
      if (isElementsWithAccountClickable) {
        isElementsWithAccountClickable = false;
        currentElement?.classList?.add("kp-disabled-text-color");
        setTimeout(() => {
          isElementsWithAccountClickable = true;
          currentElement?.classList?.remove("kp-disabled-text-color");
        }, 2000)
        window.dispatchEvent(event);
      }
    } else {
      const existingPhoneNumber = getNotifyPh();
      const snowplowEvent = new CustomEvent('snowplow_event', {
        detail: {
          category: 'logged_in_page',
          action: 'automated',
          label: 'redirected_to_account_page',
          property: 'phone_number',
          value: existingPhoneNumber?.value,
          country_code: existingPhoneNumber?.country_code,
          analyticEvent: CORE_FUNCTION_EVENTS.REDIRECRED_TO_ACCOUNT_PAGE,
        },
      });
      window.dispatchEvent(snowplowEvent);
      hndlRedrctn(redirectLink);
    }
  }
}

// Shopify session on Shopify checkout button
function shopifyCheckout(e) {
  e.preventDefault();
  const event = new CustomEvent('shopify-session', {
    detail: { redirectUrl: '/checkout', isManualLoginEnable: false },
  });
  window.dispatchEvent(event);
}

function kp_trigger_popup(id) {
  if (id) {
    const event = new CustomEvent('open_login_autoload', { detail: { autoloadPopupId: id } });
    window.dispatchEvent(event);
  }
}
function kp_fire_custom_meta_event(eventName) {
  if (eventName) {
    const event = new CustomEvent('fire_custom_meta_event', { detail: { eventName } });
    window.dispatchEvent(event);
  }
}



function handleDOMUpdate() {
  const token = getValueFromCookiesOrLocalStorage(XGokwikUniToken()) || getValueFromCookiesOrLocalStorage(XGokwikCoreToken(window.merchantInfo.environment)); const isLogout = sessionStorage.getItem('isLogout');
  const phoneNumber = getValueFromCookiesOrLocalStorage('notify_phone_number');
  if ((!token && !isLogout) || (token && !phoneNumber)) {
    openIframe('kp_sso_token')
  }
}

function kpHandleLogin(redirectLink, customLogin, params) {
  const token = getValueFromCookiesOrLocalStorage(XGokwikUniToken()) || getValueFromCookiesOrLocalStorage(XGokwikCoreToken(window.merchantInfo.environment)); const customerId = getCustomerId();
  if (token && customerId != null && redirectLink) {
    hndlRedrctn(redirectLink)
  } else if (customerId) {
    const redirection = redirectLink || '/account'
    hndlRedrctn(redirection, false)
    return;
  } else {
    handleKpAndShopifyLogin(redirectLink, customLogin, params)
  }
}


//indexedDB scripts
const DB_NAME = 'KP_DB';
const STORE_NAME = 'kp_storage';
const DB_VERSION = 1;

// Open or create the database
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Set token
async function setValueInIDB(key, value) {

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.put(value, key);
  return (
    tx.complete ||
    new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    })
  );
}



async function deleteValueInIDB(key) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.delete(key);
  return (
    tx.complete ||
    new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    })
  );
}

function kpExtractUTMParams(url) {
  // Canonical UTM keys and their aliases
  const keyMapping = {
    utm_source: ['utm_source', 'gad_source', 'fbad_source'],
    utm_campaign: ['utm_campaign', 'gad_campaignid', 'utm_campaignid'],
    utm_medium: ['utm_medium', 'gad_medium', 'fbad_medium'],
    utm_content: ['utm_content', 'gad_content', 'fbad_content'],
    utm_term: ['utm_term', 'gad_term', 'fbad_term'],
  };

  const params = new URL(url).searchParams;
  const utmData = [];

  for (const [utmKey, aliases] of Object.entries(keyMapping)) {
    for (const alias of aliases) {
      let value = params.get(alias);
      if (value !== null) {
        if (utmKey === 'utm_source' && !url.includes('utm_source')) {
          if (url.includes('gclid') || url.includes('gad_source')) {
            value = 'google';
          } else if (url.includes('fbclid')) {
            value = 'facebook';
          } else if (url.includes('msclkid')) {
            value = 'bing';
          } else if (url.includes('li_fat_id')) {
            value = 'linkedin';
          } else if (url.includes('tclid') || url.includes('twclid')) {
            value = 'twitter';
          }
        }
        utmData.push(`${utmKey}=${value}`);
        break; // Stop after finding the first matching alias
      }
    }
  }

  return utmData.join('&');
}
function kwikForm(options) {
  if (options?.containerId && window.__KP_LOGIN_SDK_INSTANCE__?.kwikForm) {
    window.__KP_LOGIN_SDK_INSTANCE__.kwikForm(options);
    return;
  }
  if (options?.containerId) {
    const containerId = String(options.containerId).replace(/^#/, '');
    const selector = '#' + containerId;
    const embeddedForm = {
      containerId,
      status: options.status !== false,
      minHeight: options.minHeight,
      maxHeight: options.maxHeight,
    };
    window.dispatchEvent(new CustomEvent('open_kf_modal', { detail: { show: true, container: selector, embeddedForm } }));
    return;
  }
  const userLoggedInEvent = new CustomEvent('open_kf_modal', { detail: { show: true } });
  window.dispatchEvent(userLoggedInEvent);
}
const kpUtmString = kpExtractUTMParams(window.location.href)
// 0.0208 days is ~30mins
kpUtmString && kpSetCookie('kp_utm_source', encodeURIComponent(kpUtmString), null, false, 30);

// Kwikpass script to add reusable functions - [Ends] 