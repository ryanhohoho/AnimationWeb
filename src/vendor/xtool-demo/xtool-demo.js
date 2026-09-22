function iA(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Vh = { exports: {} }, $r = {}, Lh = { exports: {} }, Uh = {};
var b0;
function sA() {
  return b0 || (b0 = 1, (function(e) {
    function i(Y, st) {
      var K = Y.length;
      Y.push(st);
      t: for (; 0 < K; ) {
        var ft = K - 1 >>> 1, bt = Y[ft];
        if (0 < o(bt, st))
          Y[ft] = st, Y[K] = bt, K = ft;
        else break t;
      }
    }
    function a(Y) {
      return Y.length === 0 ? null : Y[0];
    }
    function r(Y) {
      if (Y.length === 0) return null;
      var st = Y[0], K = Y.pop();
      if (K !== st) {
        Y[0] = K;
        t: for (var ft = 0, bt = Y.length, he = bt >>> 1; ft < he; ) {
          var xn = 2 * (ft + 1) - 1, ls = Y[xn], z = xn + 1, I = Y[z];
          if (0 > o(ls, K))
            z < bt && 0 > o(I, ls) ? (Y[ft] = I, Y[z] = K, ft = z) : (Y[ft] = ls, Y[xn] = K, ft = xn);
          else if (z < bt && 0 > o(I, K))
            Y[ft] = I, Y[z] = K, ft = z;
          else break t;
        }
      }
      return st;
    }
    function o(Y, st) {
      var K = Y.sortIndex - st.sortIndex;
      return K !== 0 ? K : Y.id - st.id;
    }
    if (e.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
      var c = performance;
      e.unstable_now = function() {
        return c.now();
      };
    } else {
      var h = Date, d = h.now();
      e.unstable_now = function() {
        return h.now() - d;
      };
    }
    var m = [], p = [], g = 1, v = null, b = 3, _ = !1, T = !1, x = !1, A = !1, N = typeof setTimeout == "function" ? setTimeout : null, D = typeof clearTimeout == "function" ? clearTimeout : null, k = typeof setImmediate < "u" ? setImmediate : null;
    function G(Y) {
      for (var st = a(p); st !== null; ) {
        if (st.callback === null) r(p);
        else if (st.startTime <= Y)
          r(p), st.sortIndex = st.expirationTime, i(m, st);
        else break;
        st = a(p);
      }
    }
    function X(Y) {
      if (x = !1, G(Y), !T)
        if (a(m) !== null)
          T = !0, q || (q = !0, vt());
        else {
          var st = a(p);
          st !== null && tt(X, st.startTime - Y);
        }
    }
    var q = !1, V = -1, $ = 5, J = -1;
    function Q() {
      return A ? !0 : !(e.unstable_now() - J < $);
    }
    function mt() {
      if (A = !1, q) {
        var Y = e.unstable_now();
        J = Y;
        var st = !0;
        try {
          t: {
            T = !1, x && (x = !1, D(V), V = -1), _ = !0;
            var K = b;
            try {
              e: {
                for (G(Y), v = a(m); v !== null && !(v.expirationTime > Y && Q()); ) {
                  var ft = v.callback;
                  if (typeof ft == "function") {
                    v.callback = null, b = v.priorityLevel;
                    var bt = ft(
                      v.expirationTime <= Y
                    );
                    if (Y = e.unstable_now(), typeof bt == "function") {
                      v.callback = bt, G(Y), st = !0;
                      break e;
                    }
                    v === a(m) && r(m), G(Y);
                  } else r(m);
                  v = a(m);
                }
                if (v !== null) st = !0;
                else {
                  var he = a(p);
                  he !== null && tt(
                    X,
                    he.startTime - Y
                  ), st = !1;
                }
              }
              break t;
            } finally {
              v = null, b = K, _ = !1;
            }
            st = void 0;
          }
        } finally {
          st ? vt() : q = !1;
        }
      }
    }
    var vt;
    if (typeof k == "function")
      vt = function() {
        k(mt);
      };
    else if (typeof MessageChannel < "u") {
      var $t = new MessageChannel(), ee = $t.port2;
      $t.port1.onmessage = mt, vt = function() {
        ee.postMessage(null);
      };
    } else
      vt = function() {
        N(mt, 0);
      };
    function tt(Y, st) {
      V = N(function() {
        Y(e.unstable_now());
      }, st);
    }
    e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(Y) {
      Y.callback = null;
    }, e.unstable_forceFrameRate = function(Y) {
      0 > Y || 125 < Y ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : $ = 0 < Y ? Math.floor(1e3 / Y) : 5;
    }, e.unstable_getCurrentPriorityLevel = function() {
      return b;
    }, e.unstable_next = function(Y) {
      switch (b) {
        case 1:
        case 2:
        case 3:
          var st = 3;
          break;
        default:
          st = b;
      }
      var K = b;
      b = st;
      try {
        return Y();
      } finally {
        b = K;
      }
    }, e.unstable_requestPaint = function() {
      A = !0;
    }, e.unstable_runWithPriority = function(Y, st) {
      switch (Y) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          Y = 3;
      }
      var K = b;
      b = Y;
      try {
        return st();
      } finally {
        b = K;
      }
    }, e.unstable_scheduleCallback = function(Y, st, K) {
      var ft = e.unstable_now();
      switch (typeof K == "object" && K !== null ? (K = K.delay, K = typeof K == "number" && 0 < K ? ft + K : ft) : K = ft, Y) {
        case 1:
          var bt = -1;
          break;
        case 2:
          bt = 250;
          break;
        case 5:
          bt = 1073741823;
          break;
        case 4:
          bt = 1e4;
          break;
        default:
          bt = 5e3;
      }
      return bt = K + bt, Y = {
        id: g++,
        callback: st,
        priorityLevel: Y,
        startTime: K,
        expirationTime: bt,
        sortIndex: -1
      }, K > ft ? (Y.sortIndex = K, i(p, Y), a(m) === null && Y === a(p) && (x ? (D(V), V = -1) : x = !0, tt(X, K - ft))) : (Y.sortIndex = bt, i(m, Y), T || _ || (T = !0, q || (q = !0, vt()))), Y;
    }, e.unstable_shouldYield = Q, e.unstable_wrapCallback = function(Y) {
      var st = b;
      return function() {
        var K = b;
        b = st;
        try {
          return Y.apply(this, arguments);
        } finally {
          b = K;
        }
      };
    };
  })(Uh)), Uh;
}
var S0;
function aA() {
  return S0 || (S0 = 1, Lh.exports = sA()), Lh.exports;
}
var kh = { exports: {} }, dt = {};
var _0;
function rA() {
  if (_0) return dt;
  _0 = 1;
  var e = /* @__PURE__ */ Symbol.for("react.transitional.element"), i = /* @__PURE__ */ Symbol.for("react.portal"), a = /* @__PURE__ */ Symbol.for("react.fragment"), r = /* @__PURE__ */ Symbol.for("react.strict_mode"), o = /* @__PURE__ */ Symbol.for("react.profiler"), c = /* @__PURE__ */ Symbol.for("react.consumer"), h = /* @__PURE__ */ Symbol.for("react.context"), d = /* @__PURE__ */ Symbol.for("react.forward_ref"), m = /* @__PURE__ */ Symbol.for("react.suspense"), p = /* @__PURE__ */ Symbol.for("react.memo"), g = /* @__PURE__ */ Symbol.for("react.lazy"), v = /* @__PURE__ */ Symbol.for("react.activity"), b = /* @__PURE__ */ Symbol.for("react.view_transition"), _ = Symbol.iterator;
  function T(z) {
    return z === null || typeof z != "object" ? null : (z = _ && z[_] || z["@@iterator"], typeof z == "function" ? z : null);
  }
  var x = {
    isMounted: function() {
      return !1;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, A = Object.assign, N = {};
  function D(z, I, ot) {
    this.props = z, this.context = I, this.refs = N, this.updater = ot || x;
  }
  D.prototype.isReactComponent = {}, D.prototype.setState = function(z, I) {
    if (typeof z != "object" && typeof z != "function" && z != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, z, I, "setState");
  }, D.prototype.forceUpdate = function(z) {
    this.updater.enqueueForceUpdate(this, z, "forceUpdate");
  };
  function k() {
  }
  k.prototype = D.prototype;
  function G(z, I, ot) {
    this.props = z, this.context = I, this.refs = N, this.updater = ot || x;
  }
  var X = G.prototype = new k();
  X.constructor = G, A(X, D.prototype), X.isPureReactComponent = !0;
  var q = Array.isArray;
  function V() {
  }
  var $ = { H: null, A: null, T: null, S: null }, J = Object.prototype.hasOwnProperty;
  function Q(z, I, ot) {
    var ut = ot.ref;
    return {
      $$typeof: e,
      type: z,
      key: I,
      ref: ut !== void 0 ? ut : null,
      props: ot
    };
  }
  function mt(z, I) {
    return Q(z.type, I, z.props);
  }
  function vt(z) {
    return typeof z == "object" && z !== null && z.$$typeof === e;
  }
  function $t(z) {
    var I = { "=": "=0", ":": "=2" };
    return "$" + z.replace(/[=:]/g, function(ot) {
      return I[ot];
    });
  }
  var ee = /\/+/g;
  function tt(z, I) {
    return typeof z == "object" && z !== null && z.key != null ? $t("" + z.key) : I.toString(36);
  }
  function Y(z) {
    switch (z.status) {
      case "fulfilled":
        return z.value;
      case "rejected":
        throw z.reason;
      default:
        switch (typeof z.status == "string" ? z.then(V, V) : (z.status = "pending", z.then(
          function(I) {
            z.status === "pending" && (z.status = "fulfilled", z.value = I);
          },
          function(I) {
            z.status === "pending" && (z.status = "rejected", z.reason = I);
          }
        )), z.status) {
          case "fulfilled":
            return z.value;
          case "rejected":
            throw z.reason;
        }
    }
    throw z;
  }
  function st(z, I, ot, ut, At) {
    var Ot = typeof z;
    (Ot === "undefined" || Ot === "boolean") && (z = null);
    var Ct = !1;
    if (z === null) Ct = !0;
    else
      switch (Ot) {
        case "bigint":
        case "string":
        case "number":
          Ct = !0;
          break;
        case "object":
          switch (z.$$typeof) {
            case e:
            case i:
              Ct = !0;
              break;
            case g:
              return Ct = z._init, st(
                Ct(z._payload),
                I,
                ot,
                ut,
                At
              );
          }
      }
    if (Ct)
      return At = At(z), Ct = ut === "" ? "." + tt(z, 0) : ut, q(At) ? (ot = "", Ct != null && (ot = Ct.replace(ee, "$&/") + "/"), st(At, I, ot, "", function(ii) {
        return ii;
      })) : At != null && (vt(At) && (At = mt(
        At,
        ot + (At.key == null || z && z.key === At.key ? "" : ("" + At.key).replace(
          ee,
          "$&/"
        ) + "/") + Ct
      )), I.push(At)), 1;
    Ct = 0;
    var rt = ut === "" ? "." : ut + ":";
    if (q(z))
      for (var ht = 0; ht < z.length; ht++)
        ut = z[ht], Ot = rt + tt(ut, ht), Ct += st(
          ut,
          I,
          ot,
          Ot,
          At
        );
    else if (ht = T(z), typeof ht == "function")
      for (z = ht.call(z), ht = 0; !(ut = z.next()).done; )
        ut = ut.value, Ot = rt + tt(ut, ht++), Ct += st(
          ut,
          I,
          ot,
          Ot,
          At
        );
    else if (Ot === "object") {
      if (typeof z.then == "function")
        return st(
          Y(z),
          I,
          ot,
          ut,
          At
        );
      throw I = String(z), Error(
        "Objects are not valid as a React child (found: " + (I === "[object Object]" ? "object with keys {" + Object.keys(z).join(", ") + "}" : I) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return Ct;
  }
  function K(z, I, ot) {
    if (z == null) return z;
    var ut = [], At = 0;
    return st(z, ut, "", "", function(Ot) {
      return I.call(ot, Ot, At++);
    }), ut;
  }
  function ft(z) {
    if (z._status === -1) {
      var I = z._result, ot = I();
      ot.then(
        function(ut) {
          (z._status === 0 || z._status === -1) && (z._status = 1, z._result = ut, ot.status === void 0 && (ot.status = "fulfilled", ot.value = ut));
        },
        function(ut) {
          (z._status === 0 || z._status === -1) && (z._status = 2, z._result = ut, ot.status === void 0 && (ot.status = "rejected", ot.reason = ut));
        }
      ), z._status === -1 && (z._status = 0, z._result = ot);
    }
    if (z._status === 1) return z._result.default;
    throw z._result;
  }
  var bt = typeof reportError == "function" ? reportError : function(z) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var I = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof z == "object" && z !== null && typeof z.message == "string" ? String(z.message) : String(z),
        error: z
      });
      if (!window.dispatchEvent(I)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", z);
      return;
    }
    console.error(z);
  };
  function he(z) {
    var I = $.T, ot = {};
    ot.types = I !== null ? I.types : null, $.T = ot;
    try {
      var ut = z(), At = $.S;
      At !== null && At(ot, ut), typeof ut == "object" && ut !== null && typeof ut.then == "function" && ut.then(V, bt);
    } catch (Ot) {
      bt(Ot);
    } finally {
      I !== null && ot.types !== null && (I.types = ot.types), $.T = I;
    }
  }
  function xn(z) {
    var I = $.T;
    if (I !== null) {
      var ot = I.types;
      ot === null ? I.types = [z] : ot.indexOf(z) === -1 && ot.push(z);
    } else he(xn.bind(null, z));
  }
  var ls = {
    map: K,
    forEach: function(z, I, ot) {
      K(
        z,
        function() {
          I.apply(this, arguments);
        },
        ot
      );
    },
    count: function(z) {
      var I = 0;
      return K(z, function() {
        I++;
      }), I;
    },
    toArray: function(z) {
      return K(z, function(I) {
        return I;
      }) || [];
    },
    only: function(z) {
      if (!vt(z))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return z;
    }
  };
  return dt.Activity = v, dt.Children = ls, dt.Component = D, dt.Fragment = a, dt.Profiler = o, dt.PureComponent = G, dt.StrictMode = r, dt.Suspense = m, dt.ViewTransition = b, dt.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = $, dt.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(z) {
      return $.H.useMemoCache(z);
    }
  }, dt.addTransitionType = xn, dt.cache = function(z) {
    return function() {
      return z.apply(null, arguments);
    };
  }, dt.cacheSignal = function() {
    return null;
  }, dt.cloneElement = function(z, I, ot) {
    if (z == null)
      throw Error(
        "The argument must be a React element, but you passed " + z + "."
      );
    var ut = A({}, z.props), At = z.key;
    if (I != null)
      for (Ot in I.key !== void 0 && (At = "" + I.key), I)
        !J.call(I, Ot) || Ot === "key" || Ot === "__self" || Ot === "__source" || Ot === "ref" && I.ref === void 0 || (ut[Ot] = I[Ot]);
    var Ot = arguments.length - 2;
    if (Ot === 1) ut.children = ot;
    else if (1 < Ot) {
      for (var Ct = Array(Ot), rt = 0; rt < Ot; rt++)
        Ct[rt] = arguments[rt + 2];
      ut.children = Ct;
    }
    return Q(z.type, At, ut);
  }, dt.createContext = function(z) {
    return z = {
      $$typeof: h,
      _currentValue: z,
      _currentValue2: z,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, z.Provider = z, z.Consumer = {
      $$typeof: c,
      _context: z
    }, z;
  }, dt.createElement = function(z, I, ot) {
    var ut, At = {}, Ot = null;
    if (I != null)
      for (ut in I.key !== void 0 && (Ot = "" + I.key), I)
        J.call(I, ut) && ut !== "key" && ut !== "__self" && ut !== "__source" && (At[ut] = I[ut]);
    var Ct = arguments.length - 2;
    if (Ct === 1) At.children = ot;
    else if (1 < Ct) {
      for (var rt = Array(Ct), ht = 0; ht < Ct; ht++)
        rt[ht] = arguments[ht + 2];
      At.children = rt;
    }
    if (z && z.defaultProps)
      for (ut in Ct = z.defaultProps, Ct)
        At[ut] === void 0 && (At[ut] = Ct[ut]);
    return Q(z, Ot, At);
  }, dt.createRef = function() {
    return { current: null };
  }, dt.forwardRef = function(z) {
    return { $$typeof: d, render: z };
  }, dt.isValidElement = vt, dt.lazy = function(z) {
    return {
      $$typeof: g,
      _payload: { _status: -1, _result: z },
      _init: ft
    };
  }, dt.memo = function(z, I) {
    return {
      $$typeof: p,
      type: z,
      compare: I === void 0 ? null : I
    };
  }, dt.startTransition = he, dt.unstable_useCacheRefresh = function() {
    return $.H.useCacheRefresh();
  }, dt.use = function(z) {
    return $.H.use(z);
  }, dt.useActionState = function(z, I, ot) {
    return $.H.useActionState(z, I, ot);
  }, dt.useCallback = function(z, I) {
    return $.H.useCallback(z, I);
  }, dt.useContext = function(z) {
    return $.H.useContext(z);
  }, dt.useDebugValue = function() {
  }, dt.useDeferredValue = function(z, I) {
    return $.H.useDeferredValue(z, I);
  }, dt.useEffect = function(z, I) {
    return $.H.useEffect(z, I);
  }, dt.useEffectEvent = function(z) {
    return $.H.useEffectEvent(z);
  }, dt.useId = function() {
    return $.H.useId();
  }, dt.useImperativeHandle = function(z, I, ot) {
    return $.H.useImperativeHandle(z, I, ot);
  }, dt.useInsertionEffect = function(z, I) {
    return $.H.useInsertionEffect(z, I);
  }, dt.useLayoutEffect = function(z, I) {
    return $.H.useLayoutEffect(z, I);
  }, dt.useMemo = function(z, I) {
    return $.H.useMemo(z, I);
  }, dt.useOptimistic = function(z, I) {
    return $.H.useOptimistic(z, I);
  }, dt.useReducer = function(z, I, ot) {
    return $.H.useReducer(z, I, ot);
  }, dt.useRef = function(z) {
    return $.H.useRef(z);
  }, dt.useState = function(z) {
    return $.H.useState(z);
  }, dt.useSyncExternalStore = function(z, I, ot) {
    return $.H.useSyncExternalStore(
      z,
      I,
      ot
    );
  }, dt.useTransition = function() {
    return $.H.useTransition();
  }, dt.version = "19.3.0", dt;
}
var T0;
function Wd() {
  return T0 || (T0 = 1, kh.exports = rA()), kh.exports;
}
var Bh = { exports: {} }, Ee = {};
var x0;
function lA() {
  if (x0) return Ee;
  x0 = 1;
  var e = Wd();
  function i(g) {
    var v = "https://react.dev/errors/" + g;
    if (1 < arguments.length) {
      v += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var b = 2; b < arguments.length; b++)
        v += "&args[]=" + encodeURIComponent(arguments[b]);
    }
    return "Minified React error #" + g + "; visit " + v + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function a() {
  }
  var r = {
    d: {
      f: a,
      r: function() {
        throw Error(i(522));
      },
      D: a,
      C: a,
      L: a,
      m: a,
      X: a,
      S: a,
      M: a
    },
    p: 0,
    findDOMNode: null
  }, o = /* @__PURE__ */ Symbol.for("react.portal"), c = /* @__PURE__ */ Symbol.for("react.recoverable"), h = /* @__PURE__ */ Symbol.for("react.optimistic_key");
  function d(g, v, b) {
    var _ = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: o,
      key: _ == null ? null : _ === h ? h : "" + _,
      children: g,
      containerInfo: v,
      implementation: b
    };
  }
  var m = e.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function p(g, v) {
    if (g === "font") return "";
    if (typeof v == "string")
      return v === "use-credentials" ? v : "";
  }
  return Ee.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = r, Ee.browser = function(g) {
    return { $$typeof: c, _reason: g };
  }, Ee.createPortal = function(g, v) {
    var b = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!v || v.nodeType !== 1 && v.nodeType !== 9 && v.nodeType !== 11)
      throw Error(i(299));
    return d(g, v, null, b);
  }, Ee.flushSync = function(g) {
    var v = m.T, b = r.p;
    try {
      if (m.T = null, r.p = 2, g) return g();
    } finally {
      m.T = v, r.p = b, r.d.f();
    }
  }, Ee.preconnect = function(g, v) {
    typeof g == "string" && (v ? (v = v.crossOrigin, v = typeof v == "string" ? v === "use-credentials" ? v : "" : void 0) : v = null, r.d.C(g, v));
  }, Ee.prefetchDNS = function(g) {
    typeof g == "string" && r.d.D(g);
  }, Ee.preinit = function(g, v) {
    if (typeof g == "string" && v && typeof v.as == "string") {
      var b = v.as, _ = p(b, v.crossOrigin), T = typeof v.integrity == "string" ? v.integrity : void 0, x = typeof v.fetchPriority == "string" ? v.fetchPriority : void 0;
      b === "style" ? r.d.S(
        g,
        typeof v.precedence == "string" ? v.precedence : void 0,
        {
          crossOrigin: _,
          integrity: T,
          fetchPriority: x
        }
      ) : b === "script" && r.d.X(g, {
        crossOrigin: _,
        integrity: T,
        fetchPriority: x,
        nonce: typeof v.nonce == "string" ? v.nonce : void 0
      });
    }
  }, Ee.preinitModule = function(g, v) {
    if (typeof g == "string")
      if (typeof v == "object" && v !== null) {
        if (v.as == null || v.as === "script") {
          var b = p(
            v.as,
            v.crossOrigin
          );
          r.d.M(g, {
            crossOrigin: b,
            integrity: typeof v.integrity == "string" ? v.integrity : void 0,
            nonce: typeof v.nonce == "string" ? v.nonce : void 0,
            fetchPriority: typeof v.fetchPriority == "string" ? v.fetchPriority : void 0
          });
        }
      } else v == null && r.d.M(g);
  }, Ee.preload = function(g, v) {
    if (typeof g == "string" && typeof v == "object" && v !== null && typeof v.as == "string") {
      var b = v.as, _ = p(b, v.crossOrigin);
      r.d.L(g, b, {
        crossOrigin: _,
        integrity: typeof v.integrity == "string" ? v.integrity : void 0,
        nonce: typeof v.nonce == "string" ? v.nonce : void 0,
        type: typeof v.type == "string" ? v.type : void 0,
        fetchPriority: typeof v.fetchPriority == "string" ? v.fetchPriority : void 0,
        referrerPolicy: typeof v.referrerPolicy == "string" ? v.referrerPolicy : void 0,
        imageSrcSet: typeof v.imageSrcSet == "string" ? v.imageSrcSet : void 0,
        imageSizes: typeof v.imageSizes == "string" ? v.imageSizes : void 0,
        media: typeof v.media == "string" ? v.media : void 0
      });
    }
  }, Ee.preloadModule = function(g, v) {
    if (typeof g == "string")
      if (v) {
        var b = p(v.as, v.crossOrigin);
        r.d.m(g, {
          as: typeof v.as == "string" && v.as !== "script" ? v.as : void 0,
          crossOrigin: b,
          integrity: typeof v.integrity == "string" ? v.integrity : void 0,
          nonce: typeof v.nonce == "string" ? v.nonce : void 0,
          fetchPriority: typeof v.fetchPriority == "string" ? v.fetchPriority : void 0
        });
      } else r.d.m(g);
  }, Ee.requestFormReset = function(g) {
    r.d.r(g);
  }, Ee.unstable_batchedUpdates = function(g, v) {
    return g(v);
  }, Ee.useFormState = function(g, v, b) {
    return m.H.useFormState(g, v, b);
  }, Ee.useFormStatus = function() {
    return m.H.useHostTransitionStatus();
  }, Ee.version = "19.3.0", Ee;
}
var E0;
function h1() {
  if (E0) return Bh.exports;
  E0 = 1;
  function e() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(e);
      } catch (i) {
        console.error(i);
      }
  }
  return e(), Bh.exports = lA(), Bh.exports;
}
var w0;
function oA() {
  if (w0) return $r;
  w0 = 1;
  var e = aA(), i = Wd(), a = h1();
  function r(t) {
    var n = "https://react.dev/errors/" + t;
    if (1 < arguments.length) {
      n += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var s = 2; s < arguments.length; s++)
        n += "&args[]=" + encodeURIComponent(arguments[s]);
    }
    return "Minified React error #" + t + "; visit " + n + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function o(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11);
  }
  function c(t) {
    for (var n = t, s = n; s && !s.alternate; )
      n = s, (n.flags & 4098) !== 0 && (t = n.return), s = n.return;
    for (; n.return; ) n = n.return;
    return n.tag === 3 ? t : null;
  }
  function h(t) {
    if (t.tag === 13) {
      var n = t.memoizedState;
      if (n === null && (t = t.alternate, t !== null && (n = t.memoizedState)), n !== null) return n.dehydrated;
    }
    return null;
  }
  function d(t) {
    if (t.tag === 31) {
      var n = t.memoizedState;
      if (n === null && (t = t.alternate, t !== null && (n = t.memoizedState)), n !== null) return n.dehydrated;
    }
    return null;
  }
  function m(t) {
    if (c(t) !== t)
      throw Error(r(188));
  }
  function p(t) {
    var n = t.alternate;
    if (!n) {
      if (n = c(t), n === null) throw Error(r(188));
      return n !== t ? null : t;
    }
    for (var s = t, l = n; ; ) {
      var u = s.return;
      if (u === null) break;
      var f = u.alternate;
      if (f === null) {
        if (l = u.return, l !== null) {
          s = l;
          continue;
        }
        break;
      }
      if (u.child === f.child) {
        for (f = u.child; f; ) {
          if (f === s) return m(u), t;
          if (f === l) return m(u), n;
          f = f.sibling;
        }
        throw Error(r(188));
      }
      if (s.return !== l.return) s = u, l = f;
      else {
        for (var y = !1, S = u.child; S; ) {
          if (S === s) {
            y = !0, s = u, l = f;
            break;
          }
          if (S === l) {
            y = !0, l = u, s = f;
            break;
          }
          S = S.sibling;
        }
        if (!y) {
          for (S = f.child; S; ) {
            if (S === s) {
              y = !0, s = f, l = u;
              break;
            }
            if (S === l) {
              y = !0, l = f, s = u;
              break;
            }
            S = S.sibling;
          }
          if (!y) throw Error(r(189));
        }
      }
      if (s.alternate !== l) throw Error(r(190));
    }
    if (s.tag !== 3) throw Error(r(188));
    return s.stateNode.current === s ? t : n;
  }
  function g(t) {
    var n = t.tag;
    if (n === 5 || n === 26 || n === 27 || n === 6) return t;
    for (t = t.child; t !== null; ) {
      if (n = g(t), n !== null) return n;
      t = t.sibling;
    }
    return null;
  }
  function v(t, n, s, l, u, f) {
    for (; t !== null; ) {
      if ((t.tag === 5 || t.tag === 27 || t.tag === 6) && s(t, l, u, f) || (t.tag !== 22 || t.memoizedState === null) && (n || t.tag !== 5 && t.tag !== 27) && v(
        t.child,
        n,
        s,
        l,
        u,
        f
      ))
        return !0;
      t = t.sibling;
    }
    return !1;
  }
  function b(t) {
    for (t = t.return; t !== null; ) {
      if (t.tag === 3 || t.tag === 5 || t.tag === 27) return t;
      t = t.return;
    }
    return null;
  }
  function _(t) {
    var n = !1;
    for (t = t.return; t !== null && (t.tag === 4 && (n = !0), !(t.tag === 3 || t.tag === 5 || t.tag === 27)); )
      t = t.return;
    return n;
  }
  function T(t) {
    var n = [null, null], s = b(t);
    return s === null || x(
      n,
      t,
      s.child,
      { foundSelf: !1 }
    ), n;
  }
  function x(t, n, s, l) {
    for (; s !== null; ) {
      if (s === n) l.foundSelf = !0;
      else if (s.tag === 5 || s.tag === 27 || s.tag === 6) {
        if (l.foundSelf) return t[1] = s, !0;
        t[0] = s;
      } else if ((s.tag !== 22 || s.memoizedState === null) && x(
        t,
        n,
        s.child,
        l
      ))
        return !0;
      s = s.sibling;
    }
    return !1;
  }
  function A(t) {
    switch (t.tag) {
      case 5:
      case 27:
      case 6:
        return t.stateNode;
      case 3:
        return t.stateNode.containerInfo;
      default:
        throw Error(r(559));
    }
  }
  var N = null, D = null;
  function k(t, n, s) {
    return t === s ? !0 : t === n ? (N = t, !0) : !1;
  }
  function G(t, n, s) {
    return t === s ? (D = t, !1) : t === n ? (D !== null && (N = t), !0) : !1;
  }
  function X(t) {
    if (t === null) return null;
    do
      t = t === null ? null : t.return;
    while (t && t.tag !== 5 && t.tag !== 27 && t.tag !== 3);
    return t || null;
  }
  function q(t, n, s) {
    for (var l = 0, u = t; u; u = s(u)) l++;
    u = 0;
    for (var f = n; f; f = s(f)) u++;
    for (; 0 < l - u; ) t = s(t), l--;
    for (; 0 < u - l; ) n = s(n), u--;
    for (; l--; ) {
      if (t === n || n !== null && t === n.alternate)
        return t;
      t = s(t), n = s(n);
    }
    return null;
  }
  var V = Object.assign, $ = /* @__PURE__ */ Symbol.for("react.element"), J = /* @__PURE__ */ Symbol.for("react.transitional.element"), Q = /* @__PURE__ */ Symbol.for("react.portal"), mt = /* @__PURE__ */ Symbol.for("react.fragment"), vt = /* @__PURE__ */ Symbol.for("react.strict_mode"), $t = /* @__PURE__ */ Symbol.for("react.profiler"), ee = /* @__PURE__ */ Symbol.for("react.consumer"), tt = /* @__PURE__ */ Symbol.for("react.context"), Y = /* @__PURE__ */ Symbol.for("react.forward_ref"), st = /* @__PURE__ */ Symbol.for("react.suspense"), K = /* @__PURE__ */ Symbol.for("react.suspense_list"), ft = /* @__PURE__ */ Symbol.for("react.memo"), bt = /* @__PURE__ */ Symbol.for("react.lazy"), he = /* @__PURE__ */ Symbol.for("react.activity"), xn = /* @__PURE__ */ Symbol.for("react.legacy_hidden"), ls = /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel"), z = /* @__PURE__ */ Symbol.for("react.view_transition"), I = /* @__PURE__ */ Symbol.for("react.recoverable"), ot = Symbol.iterator;
  function ut(t) {
    return t === null || typeof t != "object" ? null : (t = ot && t[ot] || t["@@iterator"], typeof t == "function" ? t : null);
  }
  var At = /* @__PURE__ */ Symbol.for("react.client.reference");
  function Ot(t) {
    if (t == null) return null;
    if (typeof t == "function")
      return t.$$typeof === At ? null : t.displayName || t.name || null;
    if (typeof t == "string") return t;
    switch (t) {
      case mt:
        return "Fragment";
      case $t:
        return "Profiler";
      case vt:
        return "StrictMode";
      case st:
        return "Suspense";
      case K:
        return "SuspenseList";
      case he:
        return "Activity";
      case z:
        return "ViewTransition";
    }
    if (typeof t == "object")
      switch (t.$$typeof) {
        case Q:
          return "Portal";
        case tt:
          return t.displayName || "Context";
        case ee:
          return (t._context.displayName || "Context") + ".Consumer";
        case Y:
          var n = t.render;
          return t = t.displayName, t || (t = n.displayName || n.name || "", t = t !== "" ? "ForwardRef(" + t + ")" : "ForwardRef"), t;
        case ft:
          return n = t.displayName || null, n !== null ? n : Ot(t.type) || "Memo";
        case bt:
          n = t._payload, t = t._init;
          try {
            return Ot(t(n));
          } catch {
          }
      }
    return null;
  }
  var Ct = Array.isArray, rt = i.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, ht = a.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, ii = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, Wu = [], Ps = -1;
  function Un(t) {
    return { current: t };
  }
  function ye(t) {
    0 > Ps || (t.current = Wu[Ps], Wu[Ps] = null, Ps--);
  }
  function Zt(t, n) {
    Ps++, Wu[Ps] = t.current, t.current = n;
  }
  var kn = Un(null), Ka = Un(null), Ei = Un(null), Sl = Un(null);
  function _l(t, n) {
    switch (Zt(Ei, n), Zt(Ka, t), Zt(kn, null), n.nodeType) {
      case 9:
      case 11:
        t = (t = n.documentElement) && (t = t.namespaceURI) ? zv(t) : 0;
        break;
      default:
        if (t = n.tagName, n = n.namespaceURI)
          n = zv(n), t = Cv(n, t);
        else
          switch (t) {
            case "svg":
              t = 1;
              break;
            case "math":
              t = 2;
              break;
            default:
              t = 0;
          }
    }
    ye(kn), Zt(kn, t);
  }
  function $s() {
    ye(kn), ye(Ka), ye(Ei);
  }
  function tc(t) {
    var n = t.memoizedState;
    n !== null && (Ma._currentValue = n.memoizedState, Zt(Sl, t)), n = kn.current;
    var s = Cv(n, t.type);
    n !== s && (Zt(Ka, t), Zt(kn, s));
  }
  function Tl(t) {
    Ka.current === t && (ye(kn), ye(Ka)), Sl.current === t && (ye(Sl), Ma._currentValue = ii);
  }
  var ec, Km;
  function wi(t) {
    if (ec === void 0)
      try {
        throw Error();
      } catch (s) {
        var n = s.stack.trim().match(/\n( *(at )?)/);
        ec = n && n[1] || "", Km = -1 < s.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < s.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + ec + t + Km;
  }
  var nc = !1;
  function ic(t, n) {
    if (!t || nc) return "";
    nc = !0;
    var s = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var l = {
        DetermineComponentFrameRoot: function() {
          try {
            if (n) {
              var H = function() {
                throw Error();
              };
              if (Object.defineProperty(H.prototype, "props", {
                set: function() {
                  throw Error();
                }
              }), typeof Reflect == "object" && Reflect.construct) {
                try {
                  Reflect.construct(H, []);
                } catch (F) {
                  var C = F;
                }
                Reflect.construct(t, [], H);
              } else {
                try {
                  H.call();
                } catch (F) {
                  C = F;
                }
                H = !1;
                try {
                  var L = Object.getOwnPropertyDescriptor(
                    t.prototype,
                    "props"
                  );
                  Object.defineProperty(t.prototype, "props", {
                    configurable: !0,
                    set: function() {
                      throw Error();
                    }
                  }), H = !0, new t();
                } finally {
                  H && (L !== void 0 ? Object.defineProperty(t.prototype, "props", L) : delete t.prototype.props);
                }
              }
            } else {
              try {
                throw Error();
              } catch (F) {
                C = F;
              }
              (H = t()) && typeof H.catch == "function" && H.catch(function() {
              });
            }
          } catch (F) {
            if (F && C && typeof F.stack == "string")
              return [F.stack, C.stack];
          }
          return [null, null];
        }
      };
      l.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var u = Object.getOwnPropertyDescriptor(
        l.DetermineComponentFrameRoot,
        "name"
      );
      u && u.configurable && Object.defineProperty(
        l.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
      var f = l.DetermineComponentFrameRoot(), y = f[0], S = f[1];
      if (y && S) {
        var E = y.split(`
`), R = S.split(`
`);
        for (u = l = 0; l < E.length && !E[l].includes("DetermineComponentFrameRoot"); )
          l++;
        for (; u < R.length && !R[u].includes(
          "DetermineComponentFrameRoot"
        ); )
          u++;
        if (l === E.length || u === R.length)
          for (l = E.length - 1, u = R.length - 1; 1 <= l && 0 <= u && E[l] !== R[u]; )
            u--;
        for (; 1 <= l && 0 <= u; l--, u--)
          if (E[l] !== R[u]) {
            if (l !== 1 || u !== 1)
              do
                if (l--, u--, 0 > u || E[l] !== R[u]) {
                  var U = `
` + E[l].replace(" at new ", " at ");
                  return t.displayName && U.includes("<anonymous>") && (U = U.replace("<anonymous>", t.displayName)), U;
                }
              while (1 <= l && 0 <= u);
            break;
          }
      }
    } finally {
      nc = !1, Error.prepareStackTrace = s;
    }
    return (s = t ? t.displayName || t.name : "") ? wi(s) : "";
  }
  function lx(t, n) {
    switch (t.tag) {
      case 26:
      case 27:
      case 5:
        return wi(t.type);
      case 16:
        return wi("Lazy");
      case 13:
        return t.child !== n && n !== null ? wi("Suspense Fallback") : wi("Suspense");
      case 19:
        return wi("SuspenseList");
      case 0:
      case 15:
        return ic(t.type, !1);
      case 11:
        return ic(t.type.render, !1);
      case 1:
        return ic(t.type, !0);
      case 31:
        return wi("Activity");
      case 30:
        return wi("ViewTransition");
      default:
        return "";
    }
  }
  function Fm(t) {
    try {
      var n = "", s = null;
      do
        n += lx(t, s), s = t, t = t.return;
      while (t);
      return n;
    } catch (l) {
      return `
Error generating stack: ` + l.message + `
` + l.stack;
    }
  }
  var sc = Object.prototype.hasOwnProperty, ac = e.unstable_scheduleCallback, rc = e.unstable_cancelCallback, ox = e.unstable_shouldYield, ux = e.unstable_requestPaint, qe = e.unstable_now, cx = e.unstable_getCurrentPriorityLevel, Qm = e.unstable_ImmediatePriority, Jm = e.unstable_UserBlockingPriority, xl = e.unstable_NormalPriority, fx = e.unstable_LowPriority, Wm = e.unstable_IdlePriority, hx = e.log, dx = e.unstable_setDisableYieldValue, Fa = null, Xe = null;
  function Ai(t) {
    if (typeof hx == "function" && dx(t), Xe && typeof Xe.setStrictMode == "function")
      try {
        Xe.setStrictMode(Fa, t);
      } catch {
      }
  }
  var Ke = Math.clz32 ? Math.clz32 : gx, mx = Math.log, px = Math.LN2;
  function gx(t) {
    return t >>>= 0, t === 0 ? 32 : 31 - (mx(t) / px | 0) | 0;
  }
  var El = 256, wl = 262144, Al = 4194304;
  function os(t) {
    var n = t & 42;
    if (n !== 0) return n;
    switch (t & -t) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
        return 64;
      case 128:
        return 128;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
        return t & -t;
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return t & 3932160;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return t & 62914560;
      case 67108864:
        return 67108864;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 0;
      default:
        return t;
    }
  }
  function Ol(t, n, s) {
    var l = t.pendingLanes;
    if (l === 0) return 0;
    var u = 0, f = t.suspendedLanes, y = t.pingedLanes;
    t = t.warmLanes;
    var S = l & 134217727;
    return S !== 0 ? (l = S & ~f, l !== 0 ? u = os(l) : (y &= S, y !== 0 ? u = os(y) : s || (s = S & ~t, s !== 0 && (u = os(s))))) : (S = l & ~f, S !== 0 ? u = os(S) : y !== 0 ? u = os(y) : s || (s = l & ~t, s !== 0 && (u = os(s)))), u === 0 ? 0 : n !== 0 && n !== u && (n & f) === 0 && (f = u & -u, s = n & -n, f >= s || f === 32 && (s & 4194048) !== 0) ? n : u;
  }
  function Qa(t, n) {
    return (t.pendingLanes & ~(t.suspendedLanes & ~t.pingedLanes) & n) === 0;
  }
  function tp(t, n) {
    (n & 8) !== 0 && (n |= n & 32);
    var s = t.entangledLanes;
    if (s !== 0)
      for (t = t.entanglements, s &= n; 0 < s; ) {
        var l = 31 - Ke(s), u = 1 << l;
        n |= t[l], s &= ~u;
      }
    return n;
  }
  function yx(t, n) {
    switch (t) {
      case 1:
      case 2:
      case 4:
      case 8:
      case 64:
        return n + 250;
      case 16:
      case 32:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return n + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return -1;
      case 67108864:
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function ep() {
    var t = Al;
    return Al <<= 1, (Al & 62914560) === 0 && (Al = 4194304), t;
  }
  function lc(t) {
    for (var n = [], s = 0; 31 > s; s++) n.push(t);
    return n;
  }
  function Ja(t, n) {
    t.pendingLanes |= n, n !== 268435456 && (t.suspendedLanes = 0, t.pingedLanes = 0, t.warmLanes = 0);
  }
  function vx(t, n, s, l, u, f) {
    var y = t.pendingLanes;
    t.pendingLanes = s, t.suspendedLanes = 0, t.pingedLanes = 0, t.warmLanes = 0, t.expiredLanes &= s, t.entangledLanes &= s, t.errorRecoveryDisabledLanes &= s, t.shellSuspendCounter = 0;
    var S = t.entanglements, E = t.expirationTimes, R = t.hiddenUpdates;
    for (s = y & ~s; 0 < s; ) {
      var U = 31 - Ke(s), H = 1 << U;
      S[U] = 0, E[U] = -1;
      var C = R[U];
      if (C !== null)
        for (R[U] = null, U = 0; U < C.length; U++) {
          var L = C[U];
          L !== null && (L.lane &= -536870913);
        }
      s &= ~H;
    }
    l !== 0 && np(t, l, 0), f !== 0 && u === 0 && t.tag !== 0 && (t.suspendedLanes |= f & ~(y & ~n));
  }
  function np(t, n, s) {
    t.pendingLanes |= n, t.suspendedLanes &= ~n;
    var l = 31 - Ke(n);
    t.entangledLanes |= n, t.entanglements[l] = t.entanglements[l] | 1073741824 | s & 261930;
  }
  function ip(t, n) {
    var s = t.entangledLanes |= n;
    for (t = t.entanglements; s; ) {
      var l = 31 - Ke(s), u = 1 << l;
      u & n | t[l] & n && (t[l] |= n), s &= ~u;
    }
  }
  function sp(t, n) {
    var s = n & -n;
    return s = (s & 42) !== 0 ? 1 : oc(s), (s & (t.suspendedLanes | n)) !== 0 ? 0 : s;
  }
  function oc(t) {
    switch (t) {
      case 2:
        t = 1;
        break;
      case 8:
        t = 4;
        break;
      case 32:
        t = 16;
        break;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        t = 128;
        break;
      case 268435456:
        t = 134217728;
        break;
      default:
        t = 0;
    }
    return t;
  }
  function uc(t) {
    return t &= -t, 2 < t ? 8 < t ? (t & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
  }
  function ap() {
    var t = ht.p;
    return t !== 0 ? t : (t = window.event, t === void 0 ? 32 : h0(t.type));
  }
  function rp(t, n) {
    var s = ht.p;
    try {
      return ht.p = t, n();
    } finally {
      ht.p = s;
    }
  }
  var si = Math.random().toString(36).slice(2), ve = "__reactFiber$" + si, Ue = "__reactProps$" + si, Gs = "__reactContainer$" + si, lp = "__reactEvents$" + si, bx = "__reactListeners$" + si, Sx = "__reactHandles$" + si, op = "__reactResources$" + si, Wa = "__reactMarker$" + si, zl = "__reactLoad$" + si;
  function Cl(t) {
    delete t[ve], delete t[Ue], delete t[bx], delete t[Sx];
  }
  function us(t) {
    var n;
    if (n = t[ve]) return n;
    for (var s = t.parentNode; s; ) {
      if (n = s[Gs] || s[ve]) {
        if (s = n.alternate, n.child !== null || s !== null && s.child !== null)
          for (t = Iv(t); t !== null; ) {
            if (s = t[ve]) return s;
            t = Iv(t);
          }
        return n;
      }
      t = s, s = t.parentNode;
    }
    return null;
  }
  function Ys(t) {
    if (t = t[ve] || t[Gs]) {
      var n = t.tag;
      if (n === 5 || n === 6 || n === 13 || n === 31 || n === 26 || n === 27 || n === 3)
        return t;
    }
    return null;
  }
  function tr(t) {
    var n = t.tag;
    if (n === 5 || n === 26 || n === 27 || n === 6) return t.stateNode;
    throw Error(r(33));
  }
  function Is(t) {
    var n = t[op];
    return n || (n = t[op] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() }), n;
  }
  function de(t) {
    t[Wa] = !0;
  }
  function up(t) {
    t[zl] = void 0;
  }
  var cp = /* @__PURE__ */ new Set(), fp = {};
  function cs(t, n) {
    qs(t, n), qs(t + "Capture", n);
  }
  function qs(t, n) {
    for (fp[t] = n, t = 0; t < n.length; t++)
      cp.add(n[t]);
  }
  var _x = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), hp = {}, dp = {};
  function Tx(t) {
    return sc.call(dp, t) ? !0 : sc.call(hp, t) ? !1 : _x.test(t) ? dp[t] = !0 : (hp[t] = !0, !1);
  }
  var zt = !1;
  function mp() {
    var t = zt;
    return zt = !1, t;
  }
  function Ml(t, n, s) {
    if (Tx(n))
      if (s === null) t.removeAttribute(n);
      else {
        switch (typeof s) {
          case "undefined":
          case "function":
          case "symbol":
            t.removeAttribute(n);
            return;
          case "boolean":
            var l = n.toLowerCase().slice(0, 5);
            if (l !== "data-" && l !== "aria-") {
              t.removeAttribute(n);
              return;
            }
        }
        t.setAttribute(n, s);
      }
  }
  function Rl(t, n, s) {
    if (s === null) t.removeAttribute(n);
    else {
      switch (typeof s) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          t.removeAttribute(n);
          return;
      }
      t.setAttribute(n, s);
    }
  }
  function ai(t, n, s, l) {
    if (l === null) t.removeAttribute(s);
    else {
      switch (typeof l) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          t.removeAttribute(s);
          return;
      }
      t.setAttributeNS(n, s, l);
    }
  }
  function Fe(t) {
    switch (typeof t) {
      case "bigint":
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return t;
      case "object":
        return t;
      default:
        return "";
    }
  }
  function pp(t) {
    var n = t.type;
    return (t = t.nodeName) && t.toLowerCase() === "input" && (n === "checkbox" || n === "radio");
  }
  function xx(t, n, s) {
    var l = Object.getOwnPropertyDescriptor(
      t.constructor.prototype,
      n
    );
    if (!t.hasOwnProperty(n) && typeof l < "u" && typeof l.get == "function" && typeof l.set == "function") {
      var u = l.get, f = l.set;
      return Object.defineProperty(t, n, {
        configurable: !0,
        get: function() {
          return u.call(this);
        },
        set: function(y) {
          s = "" + y, f.call(this, y);
        }
      }), Object.defineProperty(t, n, {
        enumerable: l.enumerable
      }), {
        getValue: function() {
          return s;
        },
        setValue: function(y) {
          s = "" + y;
        },
        stopTracking: function() {
          t._valueTracker = null, delete t[n];
        }
      };
    }
  }
  function cc(t) {
    if (!t._valueTracker) {
      var n = pp(t) ? "checked" : "value";
      t._valueTracker = xx(
        t,
        n,
        "" + t[n]
      );
    }
  }
  function gp(t) {
    if (!t) return !1;
    var n = t._valueTracker;
    if (!n) return !0;
    var s = n.getValue(), l = "";
    return t && (l = pp(t) ? t.checked ? "true" : "false" : t.value), t = l, t !== s ? (n.setValue(t), !0) : !1;
  }
  var Ex = /[\n"\\]/g;
  function on(t) {
    return t.replace(
      Ex,
      function(n) {
        return "\\" + n.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function fc(t, n, s, l, u, f, y, S) {
    t.name = "", y != null && typeof y != "function" && typeof y != "symbol" && typeof y != "boolean" ? t.type = y : t.removeAttribute("type"), n != null ? y === "number" ? (n === 0 && t.value === "" || t.value != n) && (t.value = "" + Fe(n)) : t.value !== "" + Fe(n) && (t.value = "" + Fe(n)) : y !== "submit" && y !== "reset" || t.removeAttribute("value"), n != null ? y === "number" && t.value == n ? hc(t, Fe(t.value)) : hc(t, Fe(n)) : s != null ? hc(t, Fe(s)) : l != null && t.removeAttribute("value"), u == null && f != null && (t.defaultChecked = !!f), u != null && (t.checked = u && typeof u != "function" && typeof u != "symbol"), S != null && typeof S != "function" && typeof S != "symbol" && typeof S != "boolean" ? t.name = "" + Fe(S) : t.removeAttribute("name");
  }
  function yp(t, n, s, l, u, f, y, S) {
    if (f != null && typeof f != "function" && typeof f != "symbol" && typeof f != "boolean" && (t.type = f), n != null || s != null) {
      if (!(f !== "submit" && f !== "reset" || n != null)) {
        cc(t);
        return;
      }
      s = s != null ? "" + Fe(s) : "", n = n != null ? "" + Fe(n) : s, S || n === t.value || (t.value = n), t.defaultValue = n;
    }
    l = l ?? u, l = typeof l != "function" && typeof l != "symbol" && !!l, t.checked = S ? t.checked : !!l, t.defaultChecked = !!l, y != null && typeof y != "function" && typeof y != "symbol" && typeof y != "boolean" && (t.name = y), cc(t);
  }
  function hc(t, n) {
    t.defaultValue !== "" + n && (t.defaultValue = "" + n);
  }
  function Xs(t, n, s, l) {
    if (t = t.options, n) {
      n = {};
      for (var u = 0; u < s.length; u++)
        n["$" + s[u]] = !0;
      for (s = 0; s < t.length; s++)
        u = n.hasOwnProperty("$" + t[s].value), t[s].selected !== u && (t[s].selected = u), u && l && (t[s].defaultSelected = !0);
    } else {
      for (s = "" + Fe(s), n = null, u = 0; u < t.length; u++) {
        if (t[u].value === s) {
          t[u].selected = !0, l && (t[u].defaultSelected = !0);
          return;
        }
        n !== null || t[u].disabled || (n = t[u]);
      }
      n !== null && (n.selected = !0);
    }
  }
  function vp(t, n, s) {
    if (n != null && (n = "" + Fe(n), n !== t.value && (t.value = n), s == null)) {
      t.defaultValue !== n && (t.defaultValue = n);
      return;
    }
    t.defaultValue = s != null ? "" + Fe(s) : "";
  }
  function bp(t, n, s, l) {
    if (n == null) {
      if (l != null) {
        if (s != null) throw Error(r(92));
        if (Ct(l)) {
          if (1 < l.length) throw Error(r(93));
          l = l[0];
        }
        s = l;
      }
      s == null && (s = ""), n = s;
    }
    s = Fe(n), t.defaultValue = s, l = t.textContent, l === s && l !== "" && l !== null && (t.value = l), cc(t);
  }
  function Ks(t, n) {
    if (n) {
      var s = t.firstChild;
      if (s && s === t.lastChild && s.nodeType === 3) {
        s.nodeValue = n;
        return;
      }
    }
    t.textContent = n;
  }
  var wx = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function Sp(t, n, s) {
    var l = n.indexOf("--") === 0;
    s == null || typeof s == "boolean" || s === "" ? l ? t.setProperty(n, "") : n === "float" ? t.cssFloat = "" : t[n] = "" : l ? t.setProperty(n, s) : typeof s != "number" || s === 0 || wx.has(n) ? n === "float" ? t.cssFloat = s : t[n] = ("" + s).trim() : t[n] = s + "px";
  }
  function _p(t, n, s) {
    if (n != null && typeof n != "object")
      throw Error(r(62));
    if (t = t.style, s != null) {
      for (var l in s)
        !s.hasOwnProperty(l) || n != null && n.hasOwnProperty(l) || (l.indexOf("--") === 0 ? t.setProperty(l, "") : l === "float" ? t.cssFloat = "" : t[l] = "", zt = !0);
      for (var u in n)
        l = n[u], n.hasOwnProperty(u) && s[u] !== l && (Sp(t, u, l), zt = !0);
    } else
      for (var f in n)
        n.hasOwnProperty(f) && Sp(t, f, n[f]);
  }
  function dc(t) {
    if (t.indexOf("-") === -1) return !1;
    switch (t) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return !1;
      default:
        return !0;
    }
  }
  var Ax = /* @__PURE__ */ new Map([
    ["acceptCharset", "accept-charset"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
    ["crossOrigin", "crossorigin"],
    ["accentHeight", "accent-height"],
    ["alignmentBaseline", "alignment-baseline"],
    ["arabicForm", "arabic-form"],
    ["baselineShift", "baseline-shift"],
    ["capHeight", "cap-height"],
    ["clipPath", "clip-path"],
    ["clipRule", "clip-rule"],
    ["colorInterpolation", "color-interpolation"],
    ["colorInterpolationFilters", "color-interpolation-filters"],
    ["colorProfile", "color-profile"],
    ["colorRendering", "color-rendering"],
    ["dominantBaseline", "dominant-baseline"],
    ["enableBackground", "enable-background"],
    ["fillOpacity", "fill-opacity"],
    ["fillRule", "fill-rule"],
    ["floodColor", "flood-color"],
    ["floodOpacity", "flood-opacity"],
    ["fontFamily", "font-family"],
    ["fontSize", "font-size"],
    ["fontSizeAdjust", "font-size-adjust"],
    ["fontStretch", "font-stretch"],
    ["fontStyle", "font-style"],
    ["fontVariant", "font-variant"],
    ["fontWeight", "font-weight"],
    ["glyphName", "glyph-name"],
    ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
    ["glyphOrientationVertical", "glyph-orientation-vertical"],
    ["horizAdvX", "horiz-adv-x"],
    ["horizOriginX", "horiz-origin-x"],
    ["imageRendering", "image-rendering"],
    ["letterSpacing", "letter-spacing"],
    ["lightingColor", "lighting-color"],
    ["markerEnd", "marker-end"],
    ["markerMid", "marker-mid"],
    ["markerStart", "marker-start"],
    ["maskType", "mask-type"],
    ["overlinePosition", "overline-position"],
    ["overlineThickness", "overline-thickness"],
    ["paintOrder", "paint-order"],
    ["panose-1", "panose-1"],
    ["pointerEvents", "pointer-events"],
    ["renderingIntent", "rendering-intent"],
    ["shapeRendering", "shape-rendering"],
    ["stopColor", "stop-color"],
    ["stopOpacity", "stop-opacity"],
    ["strikethroughPosition", "strikethrough-position"],
    ["strikethroughThickness", "strikethrough-thickness"],
    ["strokeDasharray", "stroke-dasharray"],
    ["strokeDashoffset", "stroke-dashoffset"],
    ["strokeLinecap", "stroke-linecap"],
    ["strokeLinejoin", "stroke-linejoin"],
    ["strokeMiterlimit", "stroke-miterlimit"],
    ["strokeOpacity", "stroke-opacity"],
    ["strokeWidth", "stroke-width"],
    ["textAnchor", "text-anchor"],
    ["textDecoration", "text-decoration"],
    ["textRendering", "text-rendering"],
    ["transformOrigin", "transform-origin"],
    ["underlinePosition", "underline-position"],
    ["underlineThickness", "underline-thickness"],
    ["unicodeBidi", "unicode-bidi"],
    ["unicodeRange", "unicode-range"],
    ["unitsPerEm", "units-per-em"],
    ["vAlphabetic", "v-alphabetic"],
    ["vHanging", "v-hanging"],
    ["vIdeographic", "v-ideographic"],
    ["vMathematical", "v-mathematical"],
    ["vectorEffect", "vector-effect"],
    ["vertAdvY", "vert-adv-y"],
    ["vertOriginX", "vert-origin-x"],
    ["vertOriginY", "vert-origin-y"],
    ["wordSpacing", "word-spacing"],
    ["writingMode", "writing-mode"],
    ["xmlnsXlink", "xmlns:xlink"],
    ["xHeight", "x-height"]
  ]), Ox = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function Dl(t) {
    return Ox.test("" + t) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : t;
  }
  function Bn() {
  }
  var mc = null;
  function pc(t) {
    return t = t.target || t.srcElement || window, t.correspondingUseElement && (t = t.correspondingUseElement), t.nodeType === 3 ? t.parentNode : t;
  }
  var Fs = null, Qs = null;
  function Tp(t) {
    var n = Ys(t);
    if (n && (t = n.stateNode)) {
      var s = t[Ue] || null;
      t: switch (t = n.stateNode, n.type) {
        case "input":
          if (fc(
            t,
            s.value,
            s.defaultValue,
            s.defaultValue,
            s.checked,
            s.defaultChecked,
            s.type,
            s.name
          ), n = s.name, s.type === "radio" && n != null) {
            for (s = t; s.parentNode; ) s = s.parentNode;
            for (s = s.querySelectorAll(
              'input[name="' + on(
                "" + n
              ) + '"][type="radio"]'
            ), n = 0; n < s.length; n++) {
              var l = s[n];
              if (l !== t && l.form === t.form) {
                var u = l[Ue] || null;
                if (!u) throw Error(r(90));
                fc(
                  l,
                  u.value,
                  u.defaultValue,
                  u.defaultValue,
                  u.checked,
                  u.defaultChecked,
                  u.type,
                  u.name
                );
              }
            }
            for (n = 0; n < s.length; n++)
              l = s[n], l.form === t.form && gp(l);
          }
          break t;
        case "textarea":
          vp(t, s.value, s.defaultValue);
          break t;
        case "select":
          n = s.value, n != null && Xs(t, !!s.multiple, n, !1);
      }
    }
  }
  var gc = !1;
  function xp(t, n, s) {
    if (gc) return t(n, s);
    gc = !0;
    try {
      var l = t(n);
      return l;
    } finally {
      if (gc = !1, (Fs !== null || Qs !== null) && (No(), Fs && (n = Fs, t = Qs, Qs = Fs = null, Tp(n), t)))
        for (n = 0; n < t.length; n++) Tp(t[n]);
    }
  }
  function er(t, n) {
    var s = t.stateNode;
    if (s === null) return null;
    var l = s[Ue] || null;
    if (l === null) return null;
    s = l[n];
    t: switch (n) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (l = !l.disabled) || (t = t.type, l = !(t === "button" || t === "input" || t === "select" || t === "textarea")), t = !l;
        break t;
      default:
        t = !1;
    }
    if (t) return null;
    if (s && typeof s != "function")
      throw Error(
        r(231, n, typeof s)
      );
    return s;
  }
  var ri = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), yc = !1;
  if (ri)
    try {
      var nr = {};
      Object.defineProperty(nr, "passive", {
        get: function() {
          yc = !0;
        }
      }), window.addEventListener("test", nr, nr), window.removeEventListener("test", nr, nr);
    } catch {
      yc = !1;
    }
  var Oi = null, vc = null, Nl = null;
  function Ep() {
    if (Nl) return Nl;
    var t, n = vc, s = n.length, l, u = "value" in Oi ? Oi.value : Oi.textContent, f = u.length;
    for (t = 0; t < s && n[t] === u[t]; t++) ;
    var y = s - t;
    for (l = 1; l <= y && n[s - l] === u[f - l]; l++) ;
    return Nl = u.slice(t, 1 < l ? 1 - l : void 0);
  }
  function jl(t) {
    var n = t.keyCode;
    return "charCode" in t ? (t = t.charCode, t === 0 && n === 13 && (t = 13)) : t = n, t === 10 && (t = 13), 32 <= t || t === 13 ? t : 0;
  }
  function Vl() {
    return !0;
  }
  function wp() {
    return !1;
  }
  function Me(t) {
    function n(s, l, u, f, y) {
      this._reactName = s, this._targetInst = u, this.type = l, this.nativeEvent = f, this.target = y, this.currentTarget = null;
      for (var S in t)
        t.hasOwnProperty(S) && (s = t[S], this[S] = s ? s(f) : f[S]);
      return this.isDefaultPrevented = (f.defaultPrevented != null ? f.defaultPrevented : f.returnValue === !1) ? Vl : wp, this.isPropagationStopped = wp, this;
    }
    return V(n.prototype, {
      preventDefault: function() {
        this.defaultPrevented = !0;
        var s = this.nativeEvent;
        s && (s.preventDefault ? s.preventDefault() : typeof s.returnValue != "unknown" && (s.returnValue = !1), this.isDefaultPrevented = Vl);
      },
      stopPropagation: function() {
        var s = this.nativeEvent;
        s && (s.stopPropagation ? s.stopPropagation() : typeof s.cancelBubble != "unknown" && (s.cancelBubble = !0), this.isPropagationStopped = Vl);
      },
      persist: function() {
      },
      isPersistent: Vl
    }), n;
  }
  var zi = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(t) {
      return t.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, Ll = Me(zi), ir = V({}, zi, { view: 0, detail: 0 }), zx = Me(ir), bc, Sc, sr, Ul = V({}, ir, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: Tc,
    button: 0,
    buttons: 0,
    relatedTarget: function(t) {
      return t.relatedTarget === void 0 ? t.fromElement === t.srcElement ? t.toElement : t.fromElement : t.relatedTarget;
    },
    movementX: function(t) {
      return "movementX" in t ? t.movementX : (t !== sr && (sr && t.type === "mousemove" ? (bc = t.screenX - sr.screenX, Sc = t.screenY - sr.screenY) : Sc = bc = 0, sr = t), bc);
    },
    movementY: function(t) {
      return "movementY" in t ? t.movementY : Sc;
    }
  }), Ap = Me(Ul), Cx = V({}, Ul, { dataTransfer: 0 }), Mx = Me(Cx), Rx = V({}, ir, { relatedTarget: 0 }), _c = Me(Rx), Dx = V({}, zi, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), Nx = Me(Dx), jx = V({}, zi, {
    clipboardData: function(t) {
      return "clipboardData" in t ? t.clipboardData : window.clipboardData;
    }
  }), Vx = Me(jx), Lx = V({}, zi, { data: 0 }), Op = Me(Lx), Ux = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  }, kx = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  }, Bx = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function Zx(t) {
    var n = this.nativeEvent;
    return n.getModifierState ? n.getModifierState(t) : (t = Bx[t]) ? !!n[t] : !1;
  }
  function Tc() {
    return Zx;
  }
  var Hx = V({}, ir, {
    key: function(t) {
      if (t.key) {
        var n = Ux[t.key] || t.key;
        if (n !== "Unidentified") return n;
      }
      return t.type === "keypress" ? (t = jl(t), t === 13 ? "Enter" : String.fromCharCode(t)) : t.type === "keydown" || t.type === "keyup" ? kx[t.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: Tc,
    charCode: function(t) {
      return t.type === "keypress" ? jl(t) : 0;
    },
    keyCode: function(t) {
      return t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
    },
    which: function(t) {
      return t.type === "keypress" ? jl(t) : t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
    }
  }), Px = Me(Hx), $x = V({}, Ul, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0
  }), zp = Me($x), Gx = V({}, zi, { submitter: 0 }), Yx = Me(Gx), Ix = V({}, ir, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: Tc
  }), qx = Me(Ix), Xx = V({}, zi, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), Kx = Me(Xx), Fx = V({}, Ul, {
    deltaX: function(t) {
      return "deltaX" in t ? t.deltaX : "wheelDeltaX" in t ? -t.wheelDeltaX : 0;
    },
    deltaY: function(t) {
      return "deltaY" in t ? t.deltaY : "wheelDeltaY" in t ? -t.wheelDeltaY : "wheelDelta" in t ? -t.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), Qx = Me(Fx), Jx = V({}, zi, {
    newState: 0,
    oldState: 0,
    source: 0
  }), Wx = Me(Jx), tE = [9, 13, 27, 32], xc = ri && "CompositionEvent" in window, ar = null;
  ri && "documentMode" in document && (ar = document.documentMode);
  var eE = ri && "TextEvent" in window && !ar, Cp = ri && (!xc || ar && 8 < ar && 11 >= ar), Mp = " ", Rp = !1;
  function Dp(t, n) {
    switch (t) {
      case "keyup":
        return tE.indexOf(n.keyCode) !== -1;
      case "keydown":
        return n.keyCode !== 229;
      case "keypress":
      case "mousedown":
      case "focusout":
        return !0;
      default:
        return !1;
    }
  }
  function Np(t) {
    return t = t.detail, typeof t == "object" && "data" in t ? t.data : null;
  }
  var Js = !1;
  function nE(t, n) {
    switch (t) {
      case "compositionend":
        return Np(n);
      case "keypress":
        return n.which !== 32 ? null : (Rp = !0, Mp);
      case "textInput":
        return t = n.data, t === Mp && Rp ? null : t;
      default:
        return null;
    }
  }
  function iE(t, n) {
    if (Js)
      return t === "compositionend" || !xc && Dp(t, n) ? (t = Ep(), Nl = vc = Oi = null, Js = !1, t) : null;
    switch (t) {
      case "paste":
        return null;
      case "keypress":
        if (!(n.ctrlKey || n.altKey || n.metaKey) || n.ctrlKey && n.altKey) {
          if (n.char && 1 < n.char.length)
            return n.char;
          if (n.which) return String.fromCharCode(n.which);
        }
        return null;
      case "compositionend":
        return Cp && n.locale !== "ko" ? null : n.data;
      default:
        return null;
    }
  }
  var sE = {
    color: !0,
    date: !0,
    datetime: !0,
    "datetime-local": !0,
    email: !0,
    month: !0,
    number: !0,
    password: !0,
    range: !0,
    search: !0,
    tel: !0,
    text: !0,
    time: !0,
    url: !0,
    week: !0
  };
  function jp(t) {
    var n = t && t.nodeName && t.nodeName.toLowerCase();
    return n === "input" ? !!sE[t.type] : n === "textarea";
  }
  function Vp(t, n, s, l) {
    Fs ? Qs ? Qs.push(l) : Qs = [l] : Fs = l, n = Bo(n, "onChange"), 0 < n.length && (s = new Ll(
      "onChange",
      "change",
      null,
      s,
      l
    ), t.push({ event: s, listeners: n }));
  }
  var rr = null, lr = null;
  function aE(t) {
    Tv(t, 0);
  }
  function kl(t) {
    var n = tr(t);
    if (gp(n)) return t;
  }
  function Lp(t, n) {
    if (t === "change") return n;
  }
  var Up = !1;
  if (ri) {
    var Ec;
    if (ri) {
      var wc = "oninput" in document;
      if (!wc) {
        var kp = document.createElement("div");
        kp.setAttribute("oninput", "return;"), wc = typeof kp.oninput == "function";
      }
      Ec = wc;
    } else Ec = !1;
    Up = Ec && (!document.documentMode || 9 < document.documentMode);
  }
  function Bp() {
    rr && (rr.detachEvent("onpropertychange", Zp), lr = rr = null);
  }
  function Zp(t) {
    if (t.propertyName === "value" && kl(lr)) {
      var n = [];
      Vp(
        n,
        lr,
        t,
        pc(t)
      ), xp(aE, n);
    }
  }
  function rE(t, n, s) {
    t === "focusin" ? (Bp(), rr = n, lr = s, rr.attachEvent("onpropertychange", Zp)) : t === "focusout" && Bp();
  }
  function lE(t) {
    if (t === "selectionchange" || t === "keyup" || t === "keydown")
      return kl(lr);
  }
  function oE(t, n) {
    if (t === "click") return kl(n);
  }
  function uE(t, n) {
    if (t === "input" || t === "change")
      return kl(n);
  }
  function cE(t, n) {
    return t === n && (t !== 0 || 1 / t === 1 / n) || t !== t && n !== n;
  }
  var Qe = typeof Object.is == "function" ? Object.is : cE;
  function or(t, n) {
    if (Qe(t, n)) return !0;
    if (typeof t != "object" || t === null || typeof n != "object" || n === null)
      return !1;
    var s = Object.keys(t), l = Object.keys(n);
    if (s.length !== l.length) return !1;
    for (l = 0; l < s.length; l++) {
      var u = s[l];
      if (!sc.call(n, u) || !Qe(t[u], n[u]))
        return !1;
    }
    return !0;
  }
  function Ac(t) {
    if (t = t || (typeof document < "u" ? document : void 0), typeof t > "u") return null;
    try {
      return t.activeElement || t.body;
    } catch {
      return t.body;
    }
  }
  function Hp(t) {
    for (; t && t.firstChild; ) t = t.firstChild;
    return t;
  }
  function Pp(t, n) {
    var s = Hp(t);
    t = 0;
    for (var l; s; ) {
      if (s.nodeType === 3) {
        if (l = t + s.textContent.length, t <= n && l >= n)
          return { node: s, offset: n - t };
        t = l;
      }
      t: {
        for (; s; ) {
          if (s.nextSibling) {
            s = s.nextSibling;
            break t;
          }
          s = s.parentNode;
        }
        s = void 0;
      }
      s = Hp(s);
    }
  }
  function $p(t, n) {
    return t && n ? t === n ? !0 : t && t.nodeType === 3 ? !1 : n && n.nodeType === 3 ? $p(t, n.parentNode) : "contains" in t ? t.contains(n) : t.compareDocumentPosition ? !!(t.compareDocumentPosition(n) & 16) : !1 : !1;
  }
  function Gp(t) {
    t = t != null && t.ownerDocument != null && t.ownerDocument.defaultView != null ? t.ownerDocument.defaultView : window;
    for (var n = Ac(t.document); n instanceof t.HTMLIFrameElement; ) {
      try {
        var s = typeof n.contentWindow.location.href == "string";
      } catch {
        s = !1;
      }
      if (s) t = n.contentWindow;
      else break;
      n = Ac(t.document);
    }
    return n;
  }
  function Oc(t) {
    var n = t && t.nodeName && t.nodeName.toLowerCase();
    return n && (n === "input" && (t.type === "text" || t.type === "search" || t.type === "tel" || t.type === "url" || t.type === "password") || n === "textarea" || t.contentEditable === "true");
  }
  var fE = ri && "documentMode" in document && 11 >= document.documentMode, Ws = null, zc = null, ur = null, Cc = !1;
  function Yp(t, n, s) {
    var l = s.window === s ? s.document : s.nodeType === 9 ? s : s.ownerDocument;
    Cc || Ws == null || Ws !== Ac(l) || (l = Ws, "selectionStart" in l && Oc(l) ? l = { start: l.selectionStart, end: l.selectionEnd } : (l = (l.ownerDocument && l.ownerDocument.defaultView || window).getSelection(), l = {
      anchorNode: l.anchorNode,
      anchorOffset: l.anchorOffset,
      focusNode: l.focusNode,
      focusOffset: l.focusOffset
    }), ur && or(ur, l) || (ur = l, l = Bo(zc, "onSelect"), 0 < l.length && (n = new Ll(
      "onSelect",
      "select",
      null,
      n,
      s
    ), t.push({ event: n, listeners: l }), n.target = Ws)));
  }
  function fs(t, n) {
    var s = {};
    return s[t.toLowerCase()] = n.toLowerCase(), s["Webkit" + t] = "webkit" + n, s["Moz" + t] = "moz" + n, s;
  }
  var ta = {
    animationend: fs("Animation", "AnimationEnd"),
    animationiteration: fs("Animation", "AnimationIteration"),
    animationstart: fs("Animation", "AnimationStart"),
    transitionrun: fs("Transition", "TransitionRun"),
    transitionstart: fs("Transition", "TransitionStart"),
    transitioncancel: fs("Transition", "TransitionCancel"),
    transitionend: fs("Transition", "TransitionEnd")
  }, Mc = {}, Ip = {};
  ri && (Ip = document.createElement("div").style, "AnimationEvent" in window || (delete ta.animationend.animation, delete ta.animationiteration.animation, delete ta.animationstart.animation), "TransitionEvent" in window || delete ta.transitionend.transition);
  function hs(t) {
    if (Mc[t]) return Mc[t];
    if (!ta[t]) return t;
    var n = ta[t], s;
    for (s in n)
      if (n.hasOwnProperty(s) && s in Ip)
        return Mc[t] = n[s];
    return t;
  }
  var qp = hs("animationend"), Xp = hs("animationiteration"), Kp = hs("animationstart"), hE = hs("transitionrun"), dE = hs("transitionstart"), mE = hs("transitioncancel"), Fp = hs("transitionend"), Qp = /* @__PURE__ */ new Map(), Rc = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error fullscreenChange fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  Rc.push("scrollEnd");
  function En(t, n) {
    Qp.set(t, n), cs(n, [t]);
  }
  var pE = 0;
  function li(t, n) {
    if (t.name != null && t.name !== "auto") return t.name;
    if (n.autoName !== null) return n.autoName;
    t = zn.identifierPrefix;
    var s = pE++;
    return t = "_" + t + "t_" + s.toString(32) + "_", n.autoName = t;
  }
  function Jp(t) {
    if (t == null || typeof t == "string")
      return t;
    var n = null, s = Sa;
    if (s !== null)
      for (var l = 0; l < s.length; l++) {
        var u = t[s[l]];
        if (u != null) {
          if (u === "none") return "none";
          n = n == null ? u : n + (" " + u);
        }
      }
    return n ?? t.default;
  }
  function oi(t, n) {
    return t = Jp(t), n = Jp(n), n == null ? t === "auto" ? null : t : n === "auto" ? null : n;
  }
  var Bl = typeof reportError == "function" ? reportError : function(t) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var n = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof t == "object" && t !== null && typeof t.message == "string" ? String(t.message) : String(t),
        error: t
      });
      if (!window.dispatchEvent(n)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", t);
      return;
    }
    console.error(t);
  }, un = [], ea = 0, Dc = 0;
  function Zl() {
    for (var t = ea, n = Dc = ea = 0; n < t; ) {
      var s = un[n];
      un[n++] = null;
      var l = un[n];
      un[n++] = null;
      var u = un[n];
      un[n++] = null;
      var f = un[n];
      if (un[n++] = null, l !== null && u !== null) {
        var y = l.pending;
        y === null ? u.next = u : (u.next = y.next, y.next = u), l.pending = u;
      }
      f !== 0 && Wp(s, u, f);
    }
  }
  function Hl(t, n, s, l) {
    un[ea++] = t, un[ea++] = n, un[ea++] = s, un[ea++] = l, Dc |= l, t.lanes |= l, t = t.alternate, t !== null && (t.lanes |= l);
  }
  function Nc(t, n, s, l) {
    return Hl(t, n, s, l), Pl(t);
  }
  function ds(t, n) {
    return Hl(t, null, null, n), Pl(t);
  }
  function Wp(t, n, s) {
    t.lanes |= s;
    var l = t.alternate;
    l !== null && (l.lanes |= s);
    for (var u = !1, f = t.return; f !== null; )
      f.childLanes |= s, l = f.alternate, l !== null && (l.childLanes |= s), f.tag === 22 && (t = f.stateNode, t === null || t._visibility & 1 || (u = !0)), t = f, f = f.return;
    return t.tag === 3 ? (f = t.stateNode, u && n !== null && (u = 31 - Ke(s), t = f.hiddenUpdates, l = t[u], l === null ? t[u] = [n] : l.push(n), n.lane = s | 536870912), f) : null;
  }
  function Pl(t) {
    if (50 < Rr)
      throw Rr = 0, Do = null, Error(r(185));
    for (var n = t.return; n !== null; )
      t = n, n = t.return;
    return t.tag === 3 ? t.stateNode : null;
  }
  var na = {};
  function gE(t, n, s, l) {
    this.tag = t, this.key = s, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = n, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = l, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function ke(t, n, s, l) {
    return new gE(t, n, s, l);
  }
  function jc(t) {
    return t = t.prototype, !(!t || !t.isReactComponent);
  }
  function ui(t, n) {
    var s = t.alternate;
    return s === null ? (s = ke(
      t.tag,
      n,
      t.key,
      t.mode
    ), s.elementType = t.elementType, s.type = t.type, s.stateNode = t.stateNode, s.alternate = t, t.alternate = s) : (s.pendingProps = n, s.type = t.type, s.flags = 0, s.subtreeFlags = 0, s.deletions = null), s.flags = t.flags & 1206910976, s.childLanes = t.childLanes, s.lanes = t.lanes, s.child = t.child, s.memoizedProps = t.memoizedProps, s.memoizedState = t.memoizedState, s.updateQueue = t.updateQueue, n = t.dependencies, s.dependencies = n === null ? null : { lanes: n.lanes, firstContext: n.firstContext }, s.sibling = t.sibling, s.index = t.index, s.ref = t.ref, s.refCleanup = t.refCleanup, s;
  }
  function tg(t, n) {
    t.flags &= 1206910978;
    var s = t.alternate;
    return s === null ? (t.childLanes = 0, t.lanes = n, t.child = null, t.subtreeFlags = 0, t.memoizedProps = null, t.memoizedState = null, t.updateQueue = null, t.dependencies = null, t.stateNode = null) : (t.childLanes = s.childLanes, t.lanes = s.lanes, t.child = s.child, t.subtreeFlags = 0, t.deletions = null, t.memoizedProps = s.memoizedProps, t.memoizedState = s.memoizedState, t.updateQueue = s.updateQueue, t.type = s.type, n = s.dependencies, t.dependencies = n === null ? null : {
      lanes: n.lanes,
      firstContext: n.firstContext
    }), t;
  }
  function $l(t, n, s, l, u, f) {
    var y = 0;
    if (l = t, typeof l == "function") jc(l) && (y = 1);
    else if (typeof l == "string")
      y = Gw(
        t,
        s,
        kn.current
      ) ? 26 : t === "html" || t === "head" || t === "body" ? 27 : 5;
    else
      t: switch (l) {
        case he:
          return t = ke(31, s, n, u), t.elementType = he, t.lanes = f, t;
        case mt:
          return ms(s.children, u, f, n);
        case vt:
          y = 8, u |= 24;
          break;
        case $t:
          return t = ke(12, s, n, u | 2), t.elementType = $t, t.lanes = f, t;
        case st:
          return t = ke(13, s, n, u), t.elementType = st, t.lanes = f, t;
        case K:
          return t = ke(19, s, n, u), t.elementType = K, t.lanes = f, t;
        case xn:
        case z:
          return t = u | 32, t = ke(30, s, n, t), t.elementType = z, t.lanes = f, t.stateNode = {
            autoName: null,
            paired: null,
            clones: null,
            ref: null
          }, t;
        default:
          if (typeof l == "object" && l !== null)
            switch (l.$$typeof) {
              case tt:
                y = 10;
                break t;
              case ee:
                y = 9;
                break t;
              case Y:
                y = 11;
                break t;
              case ft:
                y = 14;
                break t;
              case bt:
                y = 16, l = null;
                break t;
            }
          y = 29, s = Error(
            r(130, t === null ? "null" : typeof t, "")
          ), l = null;
      }
    return n = ke(y, s, n, u), n.elementType = t, n.type = l, n.lanes = f, n;
  }
  function ms(t, n, s, l) {
    return t = ke(7, t, l, n), t.lanes = s, t;
  }
  function Vc(t, n, s) {
    return t = ke(6, t, null, n), t.lanes = s, t;
  }
  function eg(t) {
    var n = ke(18, null, null, 0);
    return n.stateNode = t, n;
  }
  function Lc(t, n, s) {
    return n = ke(
      4,
      t.children !== null ? t.children : [],
      t.key,
      n
    ), n.lanes = s, n.stateNode = {
      containerInfo: t.containerInfo,
      pendingChildren: null,
      implementation: t.implementation
    }, n;
  }
  var ng = /* @__PURE__ */ new WeakMap();
  function cn(t, n) {
    if (typeof t == "object" && t !== null) {
      var s = ng.get(t);
      return s !== void 0 ? s : (n = {
        value: t,
        source: n,
        stack: Fm(n)
      }, ng.set(t, n), n);
    }
    return {
      value: t,
      source: n,
      stack: Fm(n)
    };
  }
  var ia = [], sa = 0, Gl = null, cr = 0, fn = [], hn = 0, Ci = null, Zn = 1, Hn = "";
  function ci(t, n) {
    ia[sa++] = cr, ia[sa++] = Gl, Gl = t, cr = n;
  }
  function ig(t, n, s) {
    fn[hn++] = Zn, fn[hn++] = Hn, fn[hn++] = Ci, Ci = t;
    var l = Zn;
    t = Hn;
    var u = 32 - Ke(l) - 1;
    l &= ~(1 << u), s += 1;
    var f = 32 - Ke(n) + u;
    if (30 < f) {
      var y = u - u % 5;
      f = (l & (1 << y) - 1).toString(32), l >>= y, u -= y, Zn = 1 << 32 - Ke(n) + u | s << u | l, Hn = f + t;
    } else
      Zn = 1 << f | s << u | l, Hn = t;
  }
  function Yl(t) {
    t.return !== null && (ci(t, 1), ig(t, 1, 0));
  }
  function Uc(t) {
    for (; t === Gl; )
      Gl = ia[--sa], ia[sa] = null, cr = ia[--sa], ia[sa] = null;
    for (; t === Ci; )
      Ci = fn[--hn], fn[hn] = null, Hn = fn[--hn], fn[hn] = null, Zn = fn[--hn], fn[hn] = null;
  }
  function sg(t, n) {
    fn[hn++] = Zn, fn[hn++] = Hn, fn[hn++] = Ci, Zn = n.id, Hn = n.overflow, Ci = t;
  }
  var me = null, Ht = null, yt = !1, Mi = null, dn = !1, kc = Error(r(519));
  function Ri(t) {
    var n = Error(
      r(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    throw fr(cn(n, t)), kc;
  }
  function ag(t) {
    var n = t.stateNode, s = t.type, l = t.memoizedProps;
    switch (n[ve] = t, n[Ue] = l, s) {
      case "dialog":
        _t("cancel", n), _t("close", n);
        break;
      case "iframe":
      case "object":
      case "embed":
        _t("load", n);
        break;
      case "video":
      case "audio":
        for (s = 0; s < Nr.length; s++)
          _t(Nr[s], n);
        break;
      case "source":
        _t("error", n);
        break;
      case "img":
      case "image":
      case "link":
        _t("error", n), _t("load", n);
        break;
      case "details":
        _t("toggle", n);
        break;
      case "input":
        _t("invalid", n), yp(
          n,
          l.value,
          l.defaultValue,
          l.checked,
          l.defaultChecked,
          l.type,
          l.name,
          !0
        );
        break;
      case "select":
        _t("invalid", n);
        break;
      case "textarea":
        _t("invalid", n), bp(n, l.value, l.defaultValue, l.children);
    }
    s = l.children, typeof s != "string" && typeof s != "number" && typeof s != "bigint" || n.textContent === "" + s || l.suppressHydrationWarning === !0 || Av(n.textContent, s) ? (l.popover != null && (_t("beforetoggle", n), _t("toggle", n)), l.onScroll != null && _t("scroll", n), l.onScrollEnd != null && _t("scrollend", n), l.onClick != null && (n.onclick = Bn), n = !0) : n = !1, n || Ri(t, !0);
  }
  function Il(t) {
    for (me = t.return; me; )
      switch (me.tag) {
        case 5:
        case 31:
        case 13:
          dn = !1;
          return;
        case 27:
        case 3:
          dn = !0;
          return;
        default:
          me = me.return;
      }
  }
  function aa(t) {
    if (t !== me) return !1;
    if (!yt) return Il(t), yt = !0, !1;
    var n = t.tag, s;
    if ((s = n !== 3 && n !== 27) && ((s = n === 5) && (s = t.type, s = !(s !== "form" && s !== "button") || ph(t.type, t.memoizedProps)), s = !s), s && Ht && Ri(t), Il(t), n === 13) {
      if (t = t.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(r(317));
      Ht = Yv(t);
    } else if (n === 31) {
      if (t = t.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(r(317));
      Ht = Yv(t);
    } else
      n === 27 ? (n = Ht, qi(t.type) ? (t = Eh, Eh = null, Ht = t) : Ht = n) : Ht = me ? pn(t.stateNode.nextSibling) : null;
    return !0;
  }
  function ps() {
    Ht = me = null, yt = !1;
  }
  function Bc() {
    var t = Mi;
    return t !== null && (He === null ? He = t : He.push.apply(
      He,
      t
    ), Mi = null), t;
  }
  function fr(t) {
    Mi === null ? Mi = [t] : Mi.push(t);
  }
  var Zc = Un(null), gs = null, fi = null;
  function Di(t, n, s) {
    Zt(Zc, n._currentValue), n._currentValue = s;
  }
  function hi(t) {
    t._currentValue = Zc.current, ye(Zc);
  }
  function ql(t, n, s) {
    for (; t !== null; ) {
      var l = t.alternate;
      if ((t.childLanes & n) !== n ? (t.childLanes |= n, l !== null && (l.childLanes |= n)) : l !== null && (l.childLanes & n) !== n && (l.childLanes |= n), t === s) break;
      t = t.return;
    }
  }
  function Hc(t, n, s, l) {
    var u = t.child;
    for (u !== null && (u.return = t); u !== null; ) {
      var f = u.dependencies;
      if (f !== null) {
        var y = u.child;
        f = f.firstContext;
        t: for (; f !== null; ) {
          var S = f;
          f = u;
          for (var E = 0; E < n.length; E++)
            if (S.context === n[E]) {
              f.lanes |= s, S = f.alternate, S !== null && (S.lanes |= s), ql(
                f.return,
                s,
                t
              ), l || (y = null);
              break t;
            }
          f = S.next;
        }
      } else if (u.tag === 18) {
        if (y = u.return, y === null) throw Error(r(341));
        y.lanes |= s, f = y.alternate, f !== null && (f.lanes |= s), ql(y, s, t), y = null;
      } else
        u.tag === 13 && u.memoizedState !== null && u.memoizedState.dehydrated === null ? (u.lanes |= s, y = u.alternate, y !== null && (y.lanes |= s), ql(
          u.return,
          s,
          t
        ), y = u.child, y = y !== null ? y.sibling : null) : y = u.child;
      if (y !== null) y.return = u;
      else
        for (y = u; y !== null; ) {
          if (y === t) {
            y = null;
            break;
          }
          if (u = y.sibling, u !== null) {
            u.return = y.return, y = u;
            break;
          }
          y = y.return;
        }
      u = y;
    }
  }
  function ys(t, n, s, l) {
    t = null;
    for (var u = n, f = !1; u !== null; ) {
      if (!f) {
        if ((u.flags & 524288) !== 0) f = !0;
        else if ((u.flags & 262144) !== 0) break;
      }
      if (u.tag === 10) {
        var y = u.alternate;
        if (y === null) throw Error(r(387));
        if (y = y.memoizedProps, y !== null) {
          var S = u.type;
          Qe(u.pendingProps.value, y.value) || (t !== null ? t.push(S) : t = [S]);
        }
      } else if (u === Sl.current) {
        if (y = u.alternate, y === null) throw Error(r(387));
        y.memoizedState.memoizedState !== u.memoizedState.memoizedState && (t !== null ? t.push(Ma) : t = [Ma]);
      }
      u = u.return;
    }
    return t !== null && Hc(
      n,
      t,
      s,
      l
    ), n.flags |= 262144, t !== null;
  }
  function Xl(t) {
    for (t = t.firstContext; t !== null; ) {
      if (!Qe(
        t.context._currentValue,
        t.memoizedValue
      ))
        return !0;
      t = t.next;
    }
    return !1;
  }
  function vs(t) {
    gs = t, fi = null, t = t.dependencies, t !== null && (t.firstContext = null);
  }
  function be(t) {
    return rg(gs, t);
  }
  function Kl(t, n) {
    return gs === null && vs(t), rg(t, n);
  }
  function rg(t, n) {
    var s = n._currentValue;
    if (n = { context: n, memoizedValue: s, next: null }, fi === null) {
      if (t === null) throw Error(r(308));
      fi = n, t.dependencies = { lanes: 0, firstContext: n }, t.flags |= 524288;
    } else fi = fi.next = n;
    return s;
  }
  var yE = typeof AbortController < "u" ? AbortController : function() {
    var t = [], n = this.signal = {
      aborted: !1,
      addEventListener: function(s, l) {
        t.push(l);
      }
    };
    this.abort = function() {
      n.aborted = !0, t.forEach(function(s) {
        return s();
      });
    };
  }, vE = e.unstable_scheduleCallback, bE = e.unstable_NormalPriority, ne = {
    $$typeof: tt,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function Pc() {
    return {
      controller: new yE(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function hr(t) {
    t.refCount--, t.refCount === 0 && vE(bE, function() {
      t.controller.abort();
    });
  }
  function lg(t, n) {
    if ((t.pendingLanes & 4194048) !== 0) {
      var s = t.transitionTypes;
      for (s === null && (s = t.transitionTypes = []), t = 0; t < n.length; t++) {
        var l = n[t];
        s.indexOf(l) === -1 && s.push(l);
      }
    }
  }
  var dr = null;
  function SE(t) {
    var n = t.transitionTypes;
    return t.transitionTypes = null, n;
  }
  var mr = null, $c = 0, bs = 0, ra = null;
  function _E(t, n) {
    if (mr === null) {
      var s = mr = [];
      $c = 0, bs = rh(), ra = {
        status: "pending",
        value: void 0,
        then: function(l) {
          s.push(l);
        }
      };
    }
    return $c++, n.then(og, og), n;
  }
  function og() {
    if (--$c === 0 && (dr = null, mr !== null)) {
      ra !== null && (ra.status = "fulfilled");
      var t = mr;
      mr = null, bs = 0, ra = null;
      for (var n = 0; n < t.length; n++) (0, t[n])();
    }
  }
  function TE(t, n) {
    var s = [], l = {
      status: "pending",
      value: null,
      reason: null,
      then: function(u) {
        s.push(u);
      }
    };
    return t.then(
      function() {
        l.status = "fulfilled", l.value = n;
        for (var u = 0; u < s.length; u++) (0, s[u])(n);
      },
      function(u) {
        for (l.status = "rejected", l.reason = u, u = 0; u < s.length; u++)
          (0, s[u])(void 0);
      }
    ), l;
  }
  var ug = rt.S;
  rt.S = function(t, n) {
    if (ev = qe(), typeof n == "object" && n !== null && typeof n.then == "function" && _E(t, n), dr !== null)
      for (var s = Ea; s !== null; )
        lg(s, dr), s = s.next;
    if (s = t.types, s !== null) {
      for (var l = Ea; l !== null; )
        lg(l, s), l = l.next;
      if (bs !== 0) {
        l = dr, l === null && (l = dr = []);
        for (var u = 0; u < s.length; u++) {
          var f = s[u];
          l.indexOf(f) === -1 && l.push(f);
        }
      }
    }
    ug !== null && ug(t, n);
  };
  var Ss = Un(null);
  function Gc() {
    var t = Ss.current;
    return t !== null ? t : kt.pooledCache;
  }
  function Fl(t, n) {
    n === null ? Zt(Ss, Ss.current) : Zt(Ss, n.pool);
  }
  function cg() {
    var t = Gc();
    return t === null ? null : { parent: ne._currentValue, pool: t };
  }
  var la = Error(r(460)), Yc = Error(r(474)), Ql = Error(r(542)), Jl = { then: function() {
  } };
  function fg(t) {
    return t = t.status, t === "fulfilled" || t === "rejected";
  }
  function hg(t, n, s) {
    switch (s = t[s], s === void 0 ? t.push(n) : s !== n && (n.then(Bn, Bn), n = s), n.status) {
      case "fulfilled":
        return n.value;
      case "rejected":
        throw t = n.reason, mg(t), t === void 0 && !("reason" in n) ? Error(r(600)) : t;
      default:
        if (typeof n.status == "string") n.then(Bn, Bn);
        else {
          if (t = kt, t !== null && 100 < t.shellSuspendCounter)
            throw Error(r(482));
          t = n, t.status = "pending", t.then(
            function(l) {
              if (n.status === "pending") {
                var u = n;
                u.status = "fulfilled", u.value = l;
              }
            },
            function(l) {
              if (n.status === "pending") {
                var u = n;
                u.status = "rejected", u.reason = l;
              }
            }
          );
        }
        switch (n.status) {
          case "fulfilled":
            return n.value;
          case "rejected":
            throw t = n.reason, mg(t), t;
        }
        throw Ts = n, la;
    }
  }
  function _s(t) {
    try {
      var n = t._init;
      return n(t._payload);
    } catch (s) {
      throw s !== null && typeof s == "object" && typeof s.then == "function" ? (Ts = s, la) : s;
    }
  }
  var Ts = null;
  function dg() {
    if (Ts === null) throw Error(r(459));
    var t = Ts;
    return Ts = null, t;
  }
  function mg(t) {
    if (t === la || t === Ql)
      throw Error(r(483));
  }
  var oa = null, pr = 0;
  function Wl(t) {
    var n = pr;
    return pr += 1, oa === null && (oa = []), hg(oa, t, n);
  }
  function Ni(t, n) {
    n = n.props.ref, t.ref = n !== void 0 ? n : null;
  }
  function to(t, n) {
    throw n.$$typeof === $ ? Error(r(525)) : (t = Object.prototype.toString.call(n), Error(
      r(
        31,
        t === "[object Object]" ? "object with keys {" + Object.keys(n).join(", ") + "}" : t
      )
    ));
  }
  function pg(t) {
    function n(M, O) {
      if (t) {
        var j = M.deletions;
        j === null ? (M.deletions = [O], M.flags |= 16) : j.push(O);
      }
    }
    function s(M, O) {
      if (!t) return null;
      for (; O !== null; )
        n(M, O), O = O.sibling;
      return null;
    }
    function l(M) {
      for (var O = /* @__PURE__ */ new Map(); M !== null; )
        M.key === null ? O.set(M.index, M) : O.set(M.key, M), M = M.sibling;
      return O;
    }
    function u(M, O) {
      return M = ui(M, O), M.index = 0, M.sibling = null, M;
    }
    function f(M, O, j) {
      return M.index = j, t ? (j = M.alternate, j !== null ? (j = j.index, j < O ? (M.flags |= 2, O) : j) : (M.flags |= 134217730, O)) : (M.flags |= 1048576, O);
    }
    function y(M) {
      return t && M.alternate === null && (M.flags |= 134217730), M;
    }
    function S(M, O, j, Z) {
      return O === null || O.tag !== 6 ? (O = Vc(j, M.mode, Z), O.return = M, O) : (O = u(O, j), O.return = M, O);
    }
    function E(M, O, j, Z) {
      var W = j.type;
      return W === mt ? (M = U(
        M,
        O,
        j.props.children,
        Z,
        j.key
      ), Ni(M, j), M) : O !== null && (O.elementType === W || typeof W == "object" && W !== null && W.$$typeof === bt && _s(W) === O.type) ? (O = u(O, j.props), Ni(O, j), O.return = M, O) : (O = $l(
        j.type,
        j.key,
        j.props,
        null,
        M.mode,
        Z
      ), Ni(O, j), O.return = M, O);
    }
    function R(M, O, j, Z) {
      return O === null || O.tag !== 4 || O.stateNode.containerInfo !== j.containerInfo || O.stateNode.implementation !== j.implementation ? (O = Lc(j, M.mode, Z), O.return = M, O) : (O = u(O, j.children || []), O.return = M, O);
    }
    function U(M, O, j, Z, W) {
      return O === null || O.tag !== 7 ? (O = ms(
        j,
        M.mode,
        Z,
        W
      ), O.return = M, O) : (O = u(O, j), O.return = M, O);
    }
    function H(M, O, j) {
      if (typeof O == "string" && O !== "" || typeof O == "number" || typeof O == "bigint")
        return O = Vc(
          "" + O,
          M.mode,
          j
        ), O.return = M, O;
      if (typeof O == "object" && O !== null) {
        switch (O.$$typeof) {
          case J:
            return j = $l(
              O.type,
              O.key,
              O.props,
              null,
              M.mode,
              j
            ), Ni(j, O), j.return = M, j;
          case Q:
            return O = Lc(
              O,
              M.mode,
              j
            ), O.return = M, O;
          case bt:
            return O = _s(O), H(M, O, j);
        }
        if (Ct(O) || ut(O))
          return O = ms(
            O,
            M.mode,
            j,
            null
          ), O.return = M, O;
        if (typeof O.then == "function")
          return H(M, Wl(O), j);
        if (O.$$typeof === tt)
          return H(
            M,
            Kl(M, O),
            j
          );
        to(M, O);
      }
      return null;
    }
    function C(M, O, j, Z) {
      var W = O !== null ? O.key : null;
      if (typeof j == "string" && j !== "" || typeof j == "number" || typeof j == "bigint")
        return W !== null ? null : S(M, O, "" + j, Z);
      if (typeof j == "object" && j !== null) {
        switch (j.$$typeof) {
          case J:
            return j.key === W ? E(M, O, j, Z) : null;
          case Q:
            return j.key === W ? R(M, O, j, Z) : null;
          case bt:
            return j = _s(j), C(M, O, j, Z);
        }
        if (Ct(j) || ut(j))
          return W !== null ? null : U(M, O, j, Z, null);
        if (typeof j.then == "function")
          return C(
            M,
            O,
            Wl(j),
            Z
          );
        if (j.$$typeof === tt)
          return C(
            M,
            O,
            Kl(M, j),
            Z
          );
        to(M, j);
      }
      return null;
    }
    function L(M, O, j, Z, W) {
      if (typeof Z == "string" && Z !== "" || typeof Z == "number" || typeof Z == "bigint")
        return M = M.get(j) || null, S(O, M, "" + Z, W);
      if (typeof Z == "object" && Z !== null) {
        switch (Z.$$typeof) {
          case J:
            return M = M.get(
              Z.key === null ? j : Z.key
            ) || null, E(O, M, Z, W);
          case Q:
            return M = M.get(
              Z.key === null ? j : Z.key
            ) || null, R(O, M, Z, W);
          case bt:
            return Z = _s(Z), L(
              M,
              O,
              j,
              Z,
              W
            );
        }
        if (Ct(Z) || ut(Z))
          return M = M.get(j) || null, U(O, M, Z, W, null);
        if (typeof Z.then == "function")
          return L(
            M,
            O,
            j,
            Wl(Z),
            W
          );
        if (Z.$$typeof === tt)
          return L(
            M,
            O,
            j,
            Kl(O, Z),
            W
          );
        to(O, Z);
      }
      return null;
    }
    function F(M, O, j, Z) {
      for (var W = null, xt = null, lt = O, ct = O = 0, ae = null; lt !== null && ct < j.length; ct++) {
        lt.index > ct ? (ae = lt, lt = null) : ae = lt.sibling;
        var wt = C(
          M,
          lt,
          j[ct],
          Z
        );
        if (wt === null) {
          lt === null && (lt = ae);
          break;
        }
        t && lt && wt.alternate === null && n(M, lt), O = f(wt, O, ct), xt === null ? W = wt : xt.sibling = wt, xt = wt, lt = ae;
      }
      if (ct === j.length)
        return s(M, lt), yt && ci(M, ct), W;
      if (lt === null) {
        for (; ct < j.length; ct++)
          lt = H(M, j[ct], Z), lt !== null && (O = f(
            lt,
            O,
            ct
          ), xt === null ? W = lt : xt.sibling = lt, xt = lt);
        return yt && ci(M, ct), W;
      }
      for (lt = l(lt); ct < j.length; ct++)
        ae = L(
          lt,
          M,
          ct,
          j[ct],
          Z
        ), ae !== null && (t && (wt = ae.alternate, wt !== null && lt.delete(wt.key === null ? ct : wt.key)), O = f(
          ae,
          O,
          ct
        ), xt === null ? W = ae : xt.sibling = ae, xt = ae);
      return t && lt.forEach(function(Ji) {
        return n(M, Ji);
      }), yt && ci(M, ct), W;
    }
    function et(M, O, j, Z) {
      if (j == null) throw Error(r(151));
      for (var W = null, xt = null, lt = O, ct = O = 0, ae = null, wt = j.next(); lt !== null && !wt.done; ct++, wt = j.next()) {
        lt.index > ct ? (ae = lt, lt = null) : ae = lt.sibling;
        var Ji = C(M, lt, wt.value, Z);
        if (Ji === null) {
          lt === null && (lt = ae);
          break;
        }
        t && lt && Ji.alternate === null && n(M, lt), O = f(Ji, O, ct), xt === null ? W = Ji : xt.sibling = Ji, xt = Ji, lt = ae;
      }
      if (wt.done)
        return s(M, lt), yt && ci(M, ct), W;
      if (lt === null) {
        for (; !wt.done; ct++, wt = j.next())
          wt = H(M, wt.value, Z), wt !== null && (O = f(wt, O, ct), xt === null ? W = wt : xt.sibling = wt, xt = wt);
        return yt && ci(M, ct), W;
      }
      for (lt = l(lt); !wt.done; ct++, wt = j.next())
        wt = L(lt, M, ct, wt.value, Z), wt !== null && (t && (ae = wt.alternate, ae !== null && lt.delete(
          ae.key === null ? ct : ae.key
        )), O = f(wt, O, ct), xt === null ? W = wt : xt.sibling = wt, xt = wt);
      return t && lt.forEach(function(nA) {
        return n(M, nA);
      }), yt && ci(M, ct), W;
    }
    function gt(M, O, j, Z) {
      if (typeof j == "object" && j !== null && j.type === mt && j.key === null && j.props.ref === void 0 && (j = j.props.children), typeof j == "object" && j !== null) {
        switch (j.$$typeof) {
          case J:
            t: {
              for (var W = j.key; O !== null; ) {
                if (O.key === W) {
                  if (W = j.type, W === mt) {
                    if (O.tag === 7) {
                      s(
                        M,
                        O.sibling
                      ), Z = u(
                        O,
                        j.props.children
                      ), Ni(Z, j), Z.return = M, M = Z;
                      break t;
                    }
                  } else if (O.elementType === W || typeof W == "object" && W !== null && W.$$typeof === bt && _s(W) === O.type) {
                    s(
                      M,
                      O.sibling
                    ), Z = u(O, j.props), Ni(Z, j), Z.return = M, M = Z;
                    break t;
                  }
                  s(M, O);
                  break;
                } else n(M, O);
                O = O.sibling;
              }
              j.type === mt ? (Z = ms(
                j.props.children,
                M.mode,
                Z,
                j.key
              ), Ni(Z, j), Z.return = M, M = Z) : (Z = $l(
                j.type,
                j.key,
                j.props,
                null,
                M.mode,
                Z
              ), Ni(Z, j), Z.return = M, M = Z);
            }
            return y(M);
          case Q:
            t: {
              for (W = j.key; O !== null; ) {
                if (O.key === W)
                  if (O.tag === 4 && O.stateNode.containerInfo === j.containerInfo && O.stateNode.implementation === j.implementation) {
                    s(
                      M,
                      O.sibling
                    ), Z = u(O, j.children || []), Z.return = M, M = Z;
                    break t;
                  } else {
                    s(M, O);
                    break;
                  }
                else n(M, O);
                O = O.sibling;
              }
              Z = Lc(j, M.mode, Z), Z.return = M, M = Z;
            }
            return y(M);
          case bt:
            return j = _s(j), gt(
              M,
              O,
              j,
              Z
            );
        }
        if (Ct(j))
          return F(
            M,
            O,
            j,
            Z
          );
        if (ut(j)) {
          if (W = ut(j), typeof W != "function") throw Error(r(150));
          return j = W.call(j), et(
            M,
            O,
            j,
            Z
          );
        }
        if (typeof j.then == "function")
          return gt(
            M,
            O,
            Wl(j),
            Z
          );
        if (j.$$typeof === tt)
          return gt(
            M,
            O,
            Kl(M, j),
            Z
          );
        to(M, j);
      }
      return typeof j == "string" && j !== "" || typeof j == "number" || typeof j == "bigint" ? (j = "" + j, O !== null && O.tag === 6 ? (s(M, O.sibling), Z = u(O, j), Z.return = M, M = Z) : (s(M, O), Z = Vc(j, M.mode, Z), Z.return = M, M = Z), y(M)) : s(M, O);
    }
    return function(M, O, j, Z) {
      try {
        pr = 0;
        var W = gt(
          M,
          O,
          j,
          Z
        );
        return oa = null, W;
      } catch (lt) {
        if (lt === la || lt === Ql) throw lt;
        var xt = ke(29, lt, null, M.mode);
        return xt.lanes = Z, xt.return = M, xt;
      }
    };
  }
  var xs = pg(!0), gg = pg(!1), ji = !1;
  function Ic(t) {
    t.updateQueue = {
      baseState: t.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function qc(t, n) {
    t = t.updateQueue, n.updateQueue === t && (n.updateQueue = {
      baseState: t.baseState,
      firstBaseUpdate: t.firstBaseUpdate,
      lastBaseUpdate: t.lastBaseUpdate,
      shared: t.shared,
      callbacks: null
    });
  }
  function Vi(t) {
    return { lane: t, tag: 0, payload: null, callback: null, next: null };
  }
  function Li(t, n, s) {
    var l = t.updateQueue;
    if (l === null) return null;
    if (l = l.shared, (Mt & 2) !== 0) {
      var u = l.pending;
      return u === null ? n.next = n : (n.next = u.next, u.next = n), l.pending = n, n = Pl(t), Wp(t, null, s), n;
    }
    return Hl(t, l, n, s), Pl(t);
  }
  function gr(t, n, s) {
    if (n = n.updateQueue, n !== null && (n = n.shared, (s & 4194048) !== 0)) {
      var l = n.lanes;
      l &= t.pendingLanes, s |= l, n.lanes = s, ip(t, s);
    }
  }
  function Xc(t, n) {
    var s = t.updateQueue, l = t.alternate;
    if (l !== null && (l = l.updateQueue, s === l)) {
      var u = null, f = null;
      if (s = s.firstBaseUpdate, s !== null) {
        do {
          var y = {
            lane: s.lane,
            tag: s.tag,
            payload: s.payload,
            callback: null,
            next: null
          };
          f === null ? u = f = y : f = f.next = y, s = s.next;
        } while (s !== null);
        f === null ? u = f = n : f = f.next = n;
      } else u = f = n;
      s = {
        baseState: l.baseState,
        firstBaseUpdate: u,
        lastBaseUpdate: f,
        shared: l.shared,
        callbacks: l.callbacks
      }, t.updateQueue = s;
      return;
    }
    t = s.lastBaseUpdate, t === null ? s.firstBaseUpdate = n : t.next = n, s.lastBaseUpdate = n;
  }
  var Kc = !1;
  function yr() {
    if (Kc) {
      var t = ra;
      if (t !== null) throw t;
    }
  }
  function vr(t, n, s, l) {
    Kc = !1;
    var u = t.updateQueue;
    ji = !1;
    var f = u.firstBaseUpdate, y = u.lastBaseUpdate, S = u.shared.pending;
    if (S !== null) {
      u.shared.pending = null;
      var E = S, R = E.next;
      E.next = null, y === null ? f = R : y.next = R, y = E;
      var U = t.alternate;
      U !== null && (U = U.updateQueue, S = U.lastBaseUpdate, S !== y && (S === null ? U.firstBaseUpdate = R : S.next = R, U.lastBaseUpdate = E));
    }
    if (f !== null) {
      var H = u.baseState;
      y = 0, U = R = E = null, S = f;
      do {
        var C = S.lane & -536870913, L = C !== S.lane;
        if (L ? (Tt & C) === C : (l & C) === C) {
          C !== 0 && C === bs && (Kc = !0), U !== null && (U = U.next = {
            lane: 0,
            tag: S.tag,
            payload: S.payload,
            callback: null,
            next: null
          });
          t: {
            var F = t, et = S;
            C = n;
            var gt = s;
            switch (et.tag) {
              case 1:
                if (F = et.payload, typeof F == "function") {
                  H = F.call(gt, H, C);
                  break t;
                }
                H = F;
                break t;
              case 3:
                F.flags = F.flags & -65537 | 128;
              case 0:
                if (F = et.payload, C = typeof F == "function" ? F.call(gt, H, C) : F, C == null) break t;
                H = V({}, H, C);
                break t;
              case 2:
                ji = !0;
            }
          }
          C = S.callback, C !== null && (t.flags |= 64, L && (t.flags |= 8192), L = u.callbacks, L === null ? u.callbacks = [C] : L.push(C));
        } else
          L = {
            lane: C,
            tag: S.tag,
            payload: S.payload,
            callback: S.callback,
            next: null
          }, U === null ? (R = U = L, E = H) : U = U.next = L, y |= C;
        if (S = S.next, S === null) {
          if (S = u.shared.pending, S === null)
            break;
          L = S, S = L.next, L.next = null, u.lastBaseUpdate = L, u.shared.pending = null;
        }
      } while (!0);
      U === null && (E = H), u.baseState = E, u.firstBaseUpdate = R, u.lastBaseUpdate = U, f === null && (u.shared.lanes = 0), $i |= y, t.lanes = y, t.memoizedState = H;
    }
  }
  function yg(t, n) {
    if (typeof t != "function")
      throw Error(r(191, t));
    t.call(n);
  }
  function vg(t, n) {
    var s = t.callbacks;
    if (s !== null)
      for (t.callbacks = null, t = 0; t < s.length; t++)
        yg(s[t], n);
  }
  var Ui = Un(null), eo = Un(0);
  function bg(t, n) {
    t = yi, Zt(eo, t), Zt(Ui, n), yi = t | n.baseLanes;
  }
  function Fc() {
    Zt(eo, yi), Zt(Ui, Ui.current);
  }
  function Qc() {
    yi = eo.current, ye(Ui), ye(eo);
  }
  var Se = Un(null), Oe = null;
  function ki(t) {
    var n = t.alternate;
    Zt(_e, _e.current & 1), Zt(Se, t), Oe === null && (n === null || Ui.current !== null || n.memoizedState !== null) && (Oe = t);
  }
  function Jc(t) {
    Zt(_e, _e.current), Zt(Se, t), Oe === null && (Oe = t);
  }
  function Sg(t) {
    t.tag === 22 ? (Zt(_e, _e.current), Zt(Se, t), Oe === null && (Oe = t)) : Bi();
  }
  function Bi() {
    Zt(_e, _e.current), Zt(Se, Se.current);
  }
  function Je(t) {
    ye(Se), Oe === t && (Oe = null), ye(_e);
  }
  var _e = Un(0);
  function br(t, n) {
    Zt(Se, Se.current), Zt(_e, n);
  }
  function Wc(t) {
    ye(_e), ye(Se), Oe === t && (Oe = null);
  }
  function no(t) {
    for (var n = t; n !== null; ) {
      if (n.tag === 13) {
        var s = n.memoizedState;
        if (s !== null && (s = s.dehydrated, s === null || Th(s) || xh(s)))
          return n;
      } else if (n.tag === 19 && n.memoizedProps.revealOrder !== "independent") {
        if ((n.flags & 128) !== 0) return n;
      } else if (n.child !== null) {
        n.child.return = n, n = n.child;
        continue;
      }
      if (n === t) break;
      for (; n.sibling === null; ) {
        if (n.return === null || n.return === t) return null;
        n = n.return;
      }
      n.sibling.return = n.return, n = n.sibling;
    }
    return null;
  }
  var di = 0, pt = null, Lt = null, ie = null, io = !1, ua = !1, Es = !1, so = 0, Sr = 0, ca = null, xE = 0;
  function Ft() {
    throw Error(r(321));
  }
  function tf(t, n) {
    if (n === null) return !1;
    for (var s = 0; s < n.length && s < t.length; s++)
      if (!Qe(t[s], n[s])) return !1;
    return !0;
  }
  function ef(t, n, s, l, u, f) {
    return di = f, pt = n, n.memoizedState = null, n.updateQueue = null, n.lanes = 0, rt.H = t === null || t.memoizedState === null ? iy : sy, Es = !1, f = s(l, u), Es = !1, ua && (f = Tg(
      n,
      s,
      l,
      u
    )), _g(t), f;
  }
  function _g(t) {
    rt.H = fo;
    var n = Lt !== null && Lt.next !== null;
    if (di = 0, ie = Lt = pt = null, io = !1, Sr = 0, ca = null, n) throw Error(r(300));
    t === null || se || (t = t.dependencies, t !== null && Xl(t) && (se = !0));
  }
  function Tg(t, n, s, l) {
    pt = t;
    var u = 0;
    do {
      if (ua && (ca = null), Sr = 0, ua = !1, 25 <= u) throw Error(r(301));
      if (u += 1, ie = Lt = null, t.updateQueue != null) {
        var f = t.updateQueue;
        f.lastEffect = null, f.events = null, f.stores = null, f.memoCache != null && (f.memoCache.index = 0);
      }
      rt.H = RE, f = n(s, l);
    } while (ua);
    return f;
  }
  function EE() {
    var t = rt.H, n = t.useState()[0];
    return n = typeof n.then == "function" ? _r(n) : n, t = t.useState()[0], (Lt !== null ? Lt.memoizedState : null) !== t && (pt.flags |= 1024), n;
  }
  function nf() {
    var t = so !== 0;
    return so = 0, t;
  }
  function sf(t, n, s) {
    n.updateQueue = t.updateQueue, n.flags &= -2053, t.lanes &= ~s;
  }
  function af(t) {
    if (io) {
      for (t = t.memoizedState; t !== null; ) {
        var n = t.queue;
        n !== null && (n.pending = null), t = t.next;
      }
      io = !1;
    }
    di = 0, ie = Lt = pt = null, ua = !1, Sr = so = 0, ca = null;
  }
  function Re() {
    var t = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return ie === null ? pt.memoizedState = ie = t : ie = ie.next = t, ie;
  }
  function te() {
    if (Lt === null) {
      var t = pt.alternate;
      t = t !== null ? t.memoizedState : null;
    } else t = Lt.next;
    var n = ie === null ? pt.memoizedState : ie.next;
    if (n !== null)
      ie = n, Lt = t;
    else {
      if (t === null)
        throw pt.alternate === null ? Error(r(467)) : Error(r(310));
      Lt = t, t = {
        memoizedState: Lt.memoizedState,
        baseState: Lt.baseState,
        baseQueue: Lt.baseQueue,
        queue: Lt.queue,
        next: null
      }, ie === null ? pt.memoizedState = ie = t : ie = ie.next = t;
    }
    return ie;
  }
  function ao() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function _r(t) {
    var n = Sr;
    return Sr += 1, ca === null && (ca = []), t = hg(ca, t, n), n = pt, (ie === null ? n.memoizedState : ie.next) === null && (n = n.alternate, rt.H = n === null || n.memoizedState === null ? iy : sy), t;
  }
  function ro(t) {
    if (t !== null && typeof t == "object") {
      if (typeof t.then == "function") return _r(t);
      if (t.$$typeof === I) return;
      if (t.$$typeof === tt) return be(t);
    }
    throw Error(r(438, String(t)));
  }
  function rf(t) {
    var n = null, s = pt.updateQueue;
    if (s !== null && (n = s.memoCache), n == null) {
      var l = pt.alternate;
      l !== null && (l = l.updateQueue, l !== null && (l = l.memoCache, l != null && (n = {
        data: l.data.map(function(u) {
          return u.slice();
        }),
        index: 0
      })));
    }
    if (n == null && (n = { data: [], index: 0 }), s === null && (s = ao(), pt.updateQueue = s), s.memoCache = n, s = n.data[n.index], s === void 0)
      for (s = n.data[n.index] = Array(t), l = 0; l < t; l++)
        s[l] = ls;
    return n.index++, s;
  }
  function mi(t, n) {
    return typeof n == "function" ? n(t) : n;
  }
  function lo(t) {
    var n = te();
    return lf(n, Lt, t);
  }
  function lf(t, n, s) {
    var l = t.queue;
    if (l === null) throw Error(r(311));
    l.lastRenderedReducer = s;
    var u = t.baseQueue, f = l.pending;
    if (f !== null) {
      if (u !== null) {
        var y = u.next;
        u.next = f.next, f.next = y;
      }
      n.baseQueue = u = f, l.pending = null;
    }
    if (f = t.baseState, u === null) t.memoizedState = f;
    else {
      n = u.next;
      var S = y = null, E = null, R = n, U = !1;
      do {
        var H = R.lane & -536870913;
        if (H !== R.lane ? (Tt & H) === H : (di & H) === H) {
          var C = R.revertLane;
          if (C === 0)
            E !== null && (E = E.next = {
              lane: 0,
              revertLane: 0,
              gesture: null,
              action: R.action,
              hasEagerState: R.hasEagerState,
              eagerState: R.eagerState,
              next: null
            }), H === bs && (U = !0);
          else if ((di & C) === C) {
            R = R.next, C === bs && (U = !0);
            continue;
          } else
            H = {
              lane: 0,
              revertLane: R.revertLane,
              gesture: null,
              action: R.action,
              hasEagerState: R.hasEagerState,
              eagerState: R.eagerState,
              next: null
            }, E === null ? (S = E = H, y = f) : E = E.next = H, pt.lanes |= C, $i |= C;
          H = R.action, Es && s(f, H), f = R.hasEagerState ? R.eagerState : s(f, H);
        } else
          C = {
            lane: H,
            revertLane: R.revertLane,
            gesture: R.gesture,
            action: R.action,
            hasEagerState: R.hasEagerState,
            eagerState: R.eagerState,
            next: null
          }, E === null ? (S = E = C, y = f) : E = E.next = C, pt.lanes |= H, $i |= H;
        R = R.next;
      } while (R !== null && R !== n);
      if (E === null ? y = f : E.next = S, !Qe(f, t.memoizedState) && (se = !0, U && (s = ra, s !== null)))
        throw s;
      t.memoizedState = f, t.baseState = y, t.baseQueue = E, l.lastRenderedState = f;
    }
    return u === null && (l.lanes = 0), [t.memoizedState, l.dispatch];
  }
  function of(t) {
    var n = te(), s = n.queue;
    if (s === null) throw Error(r(311));
    s.lastRenderedReducer = t;
    var l = s.dispatch, u = s.pending, f = n.memoizedState;
    if (u !== null) {
      s.pending = null;
      var y = u = u.next;
      do
        f = t(f, y.action), y = y.next;
      while (y !== u);
      Qe(f, n.memoizedState) || (se = !0), n.memoizedState = f, n.baseQueue === null && (n.baseState = f), s.lastRenderedState = f;
    }
    return [f, l];
  }
  function xg(t, n, s) {
    var l = pt, u = te(), f = yt;
    if (f) {
      if (s === void 0) throw Error(r(407));
      s = s();
    } else s = n();
    var y = !Qe(
      (Lt || u).memoizedState,
      s
    );
    if (y && (u.memoizedState = s, se = !0), u = u.queue, ff(Ag.bind(null, l, u, t), [
      t
    ]), t = u.getSnapshot !== n || y || ie !== null && (ie.memoizedState.tag & 1) !== 0, fa(
      t ? 9 : 8,
      { destroy: void 0 },
      wg.bind(null, l, u, s, n),
      null
    ), t) {
      if (l.flags |= 2048, kt === null) throw Error(r(349));
      f || (di & 127) !== 0 || Eg(l, n, s);
    }
    return s;
  }
  function Eg(t, n, s) {
    t.flags |= 16384, t = { getSnapshot: n, value: s }, n = pt.updateQueue, n === null ? (n = ao(), pt.updateQueue = n, n.stores = [t]) : (s = n.stores, s === null ? n.stores = [t] : s.push(t));
  }
  function wg(t, n, s, l) {
    n.value = s, n.getSnapshot = l, Og(n) && zg(t);
  }
  function Ag(t, n, s) {
    return s(function() {
      Og(n) && zg(t);
    });
  }
  function Og(t) {
    var n = t.getSnapshot;
    t = t.value;
    try {
      var s = n();
      return !Qe(t, s);
    } catch {
      return !0;
    }
  }
  function zg(t) {
    var n = ds(t, 2);
    n !== null && Pe(n, t, 2);
  }
  function uf(t) {
    var n = Re();
    if (typeof t == "function") {
      var s = t;
      if (t = s(), Es) {
        Ai(!0);
        try {
          s();
        } finally {
          Ai(!1);
        }
      }
    }
    return n.memoizedState = n.baseState = t, n.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: mi,
      lastRenderedState: t
    }, n;
  }
  function Cg(t, n, s, l) {
    return t.baseState = s, lf(
      t,
      Lt,
      typeof l == "function" ? l : mi
    );
  }
  function wE(t, n, s, l, u) {
    if (co(t)) throw Error(r(485));
    if (t = n.action, t !== null) {
      var f = {
        payload: u,
        action: t,
        next: null,
        isTransition: !0,
        status: "pending",
        value: null,
        reason: null,
        listeners: [],
        then: function(y) {
          f.listeners.push(y);
        }
      };
      rt.T !== null ? s(!0) : f.isTransition = !1, l(f), s = n.pending, s === null ? (f.next = n.pending = f, Mg(n, f)) : (f.next = s.next, n.pending = s.next = f);
    }
  }
  function Mg(t, n) {
    var s = n.action, l = n.payload, u = t.state;
    if (n.isTransition) {
      var f = rt.T, y = {};
      y.types = f !== null ? f.types : null, rt.T = y;
      try {
        var S = s(u, l), E = rt.S;
        E !== null && E(y, S), Rg(t, n, S);
      } catch (R) {
        cf(t, n, R);
      } finally {
        f !== null && y.types !== null && (f.types = y.types), rt.T = f;
      }
    } else
      try {
        f = s(u, l), Rg(t, n, f);
      } catch (R) {
        cf(t, n, R);
      }
  }
  function Rg(t, n, s) {
    s !== null && typeof s == "object" && typeof s.then == "function" ? s.then(
      function(l) {
        Dg(t, n, l);
      },
      function(l) {
        return cf(t, n, l);
      }
    ) : Dg(t, n, s);
  }
  function Dg(t, n, s) {
    n.status = "fulfilled", n.value = s, Ng(n), t.state = s, n = t.pending, n !== null && (s = n.next, s === n ? t.pending = null : (s = s.next, n.next = s, Mg(t, s)));
  }
  function cf(t, n, s) {
    var l = t.pending;
    if (t.pending = null, l !== null) {
      l = l.next;
      do
        n.status = "rejected", n.reason = s, Ng(n), n = n.next;
      while (n !== l);
    }
    t.action = null;
  }
  function Ng(t) {
    t = t.listeners;
    for (var n = 0; n < t.length; n++) (0, t[n])();
  }
  function jg(t, n) {
    return n;
  }
  function Vg(t, n) {
    if (yt) {
      var s = kt.formState;
      if (s !== null) {
        t: {
          var l = pt;
          if (yt) {
            if (Ht) {
              e: {
                for (var u = Ht, f = dn; u.nodeType !== 8; ) {
                  if (!f) {
                    u = null;
                    break e;
                  }
                  if (u = pn(
                    u.nextSibling
                  ), u === null) {
                    u = null;
                    break e;
                  }
                }
                f = u.data, u = f === "F!" || f === "F" ? u : null;
              }
              if (u) {
                Ht = pn(
                  u.nextSibling
                ), l = u.data === "F!";
                break t;
              }
            }
            Ri(l);
          }
          l = !1;
        }
        l && (n = s[0]);
      }
    }
    return s = Re(), s.memoizedState = s.baseState = n, l = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: jg,
      lastRenderedState: n
    }, s.queue = l, s = ty.bind(
      null,
      pt,
      l
    ), l.dispatch = s, l = uf(!1), f = gf.bind(
      null,
      pt,
      !1,
      l.queue
    ), l = Re(), u = {
      state: n,
      dispatch: null,
      action: t,
      pending: null
    }, l.queue = u, s = wE.bind(
      null,
      pt,
      u,
      f,
      s
    ), u.dispatch = s, l.memoizedState = t, [n, s, !1];
  }
  function Lg(t) {
    var n = te();
    return Ug(n, Lt, t);
  }
  function Ug(t, n, s) {
    if (n = lf(
      t,
      n,
      jg
    )[0], t = lo(mi)[0], typeof n == "object" && n !== null && typeof n.then == "function")
      try {
        var l = _r(n);
      } catch (y) {
        throw y === la ? Ql : y;
      }
    else l = n;
    n = te();
    var u = n.queue, f = u.dispatch;
    return s !== n.memoizedState && (pt.flags |= 2048, fa(
      9,
      { destroy: void 0 },
      AE.bind(null, u, s),
      null
    )), [l, f, t];
  }
  function AE(t, n) {
    t.action = n;
  }
  function kg(t) {
    var n = te(), s = Lt;
    if (s !== null)
      return Ug(n, s, t);
    te(), n = n.memoizedState, s = te();
    var l = s.queue.dispatch;
    return s.memoizedState = t, [n, l, !1];
  }
  function fa(t, n, s, l) {
    return t = { tag: t, create: s, deps: l, inst: n, next: null }, n = pt.updateQueue, n === null && (n = ao(), pt.updateQueue = n), s = n.lastEffect, s === null ? n.lastEffect = t.next = t : (l = s.next, s.next = t, t.next = l, n.lastEffect = t), t;
  }
  function Bg() {
    return te().memoizedState;
  }
  function oo(t, n, s, l) {
    var u = Re();
    pt.flags |= t, u.memoizedState = fa(
      1 | n,
      { destroy: void 0 },
      s,
      l === void 0 ? null : l
    );
  }
  function uo(t, n, s, l) {
    var u = te();
    l = l === void 0 ? null : l;
    var f = u.memoizedState.inst;
    Lt !== null && l !== null && tf(l, Lt.memoizedState.deps) ? u.memoizedState = fa(n, f, s, l) : (pt.flags |= t, u.memoizedState = fa(
      1 | n,
      f,
      s,
      l
    ));
  }
  function Zg(t, n) {
    oo(8390656, 8, t, n);
  }
  function ff(t, n) {
    uo(2048, 8, t, n);
  }
  function OE(t) {
    pt.flags |= 4;
    var n = pt.updateQueue;
    if (n === null)
      n = ao(), pt.updateQueue = n, n.events = [t];
    else {
      var s = n.events;
      s === null ? n.events = [t] : s.push(t);
    }
  }
  function Hg(t) {
    var n = te().memoizedState;
    return OE({ ref: n, nextImpl: t }), function() {
      if ((Mt & 2) !== 0) throw Error(r(440));
      return n.impl.apply(void 0, arguments);
    };
  }
  function Pg(t, n) {
    return uo(4, 2, t, n);
  }
  function $g(t, n) {
    return uo(4, 4, t, n);
  }
  function Gg(t, n) {
    if (typeof n == "function") {
      t = t();
      var s = n(t);
      return function() {
        typeof s == "function" ? s() : n(null);
      };
    }
    if (n != null)
      return t = t(), n.current = t, function() {
        n.current = null;
      };
  }
  function Yg(t, n, s) {
    s = s != null ? s.concat([t]) : null, uo(4, 4, Gg.bind(null, n, t), s);
  }
  function hf() {
  }
  function Ig(t, n) {
    var s = te();
    n = n === void 0 ? null : n;
    var l = s.memoizedState;
    return n !== null && tf(n, l[1]) ? l[0] : (s.memoizedState = [t, n], t);
  }
  function qg(t, n) {
    var s = te();
    n = n === void 0 ? null : n;
    var l = s.memoizedState;
    if (n !== null && tf(n, l[1]))
      return l[0];
    if (l = t(), Es) {
      Ai(!0);
      try {
        t();
      } finally {
        Ai(!1);
      }
    }
    return s.memoizedState = [l, n], l;
  }
  function df(t, n, s) {
    return s === void 0 || (di & 1073741824) !== 0 && (Tt & 261930) === 0 ? t.memoizedState = n : (t.memoizedState = s, t = iv(), pt.lanes |= t, $i |= t, s);
  }
  function Xg(t, n, s, l) {
    return Qe(s, n) ? s : Ui.current !== null ? (t = df(t, s, l), Qe(t, n) || (se = !0), t) : (di & 106) === 0 || (di & 1073741824) !== 0 && (Tt & 261930) === 0 ? (se = !0, t.memoizedState = s) : (t = iv(), pt.lanes |= t, $i |= t, n);
  }
  function Kg(t, n, s, l, u) {
    var f = ht.p;
    ht.p = f !== 0 && 8 > f ? f : 8;
    var y = rt.T, S = {};
    S.types = y !== null ? y.types : null, rt.T = S, gf(t, !1, n, s);
    try {
      var E = u(), R = rt.S;
      if (R !== null && R(S, E), E !== null && typeof E == "object" && typeof E.then == "function") {
        var U = TE(
          E,
          l
        );
        Tr(
          t,
          n,
          U,
          nn(t)
        );
      } else
        Tr(
          t,
          n,
          l,
          nn(t)
        );
    } catch (H) {
      Tr(
        t,
        n,
        { then: function() {
        }, status: "rejected", reason: H },
        nn()
      );
    } finally {
      ht.p = f, y !== null && S.types !== null && (y.types = S.types), rt.T = y;
    }
  }
  function zE() {
  }
  function mf(t, n, s, l) {
    if (t.tag !== 5) throw Error(r(476));
    var u = Fg(t).queue;
    Kg(
      t,
      u,
      n,
      ii,
      s === null ? zE : function() {
        return Qg(t), s(l);
      }
    );
  }
  function Fg(t) {
    var n = t.memoizedState;
    if (n !== null) return n;
    n = {
      memoizedState: ii,
      baseState: ii,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: mi,
        lastRenderedState: ii
      },
      next: null
    };
    var s = {};
    return n.next = {
      memoizedState: s,
      baseState: s,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: mi,
        lastRenderedState: s
      },
      next: null
    }, t.memoizedState = n, t = t.alternate, t !== null && (t.memoizedState = n), n;
  }
  function Qg(t) {
    var n = Fg(t);
    n.next === null && (n = t.alternate.memoizedState), Tr(
      t,
      n.next.queue,
      {},
      nn()
    );
  }
  function pf() {
    return be(Ma);
  }
  function Jg() {
    return te().memoizedState;
  }
  function Wg() {
    return te().memoizedState;
  }
  function CE(t) {
    for (var n = t.return; n !== null; ) {
      switch (n.tag) {
        case 24:
        case 3:
          var s = nn();
          t = Vi(s);
          var l = Li(n, t, s);
          l !== null && (Pe(l, n, s), gr(l, n, s)), n = { cache: Pc() }, t.payload = n;
          return;
      }
      n = n.return;
    }
  }
  function ME(t, n, s) {
    var l = nn();
    s = {
      lane: l,
      revertLane: 0,
      gesture: null,
      action: s,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, co(t) ? ey(n, s) : (s = Nc(t, n, s, l), s !== null && (Pe(s, t, l), ny(s, n, l)));
  }
  function ty(t, n, s) {
    var l = nn();
    Tr(t, n, s, l);
  }
  function Tr(t, n, s, l) {
    var u = {
      lane: l,
      revertLane: 0,
      gesture: null,
      action: s,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (co(t)) ey(n, u);
    else {
      var f = t.alternate;
      if (t.lanes === 0 && (f === null || f.lanes === 0) && (f = n.lastRenderedReducer, f !== null))
        try {
          var y = n.lastRenderedState, S = f(y, s);
          if (u.hasEagerState = !0, u.eagerState = S, Qe(S, y))
            return Hl(t, n, u, 0), kt === null && Zl(), !1;
        } catch {
        }
      if (s = Nc(t, n, u, l), s !== null)
        return Pe(s, t, l), ny(s, n, l), !0;
    }
    return !1;
  }
  function gf(t, n, s, l) {
    if (l = {
      lane: 2,
      revertLane: rh(),
      gesture: null,
      action: l,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, co(t)) {
      if (n) throw Error(r(479));
    } else
      n = Nc(
        t,
        s,
        l,
        2
      ), n !== null && Pe(n, t, 2);
  }
  function co(t) {
    var n = t.alternate;
    return t === pt || n !== null && n === pt;
  }
  function ey(t, n) {
    ua = io = !0;
    var s = t.pending;
    s === null ? n.next = n : (n.next = s.next, s.next = n), t.pending = n;
  }
  function ny(t, n, s) {
    if ((s & 4194048) !== 0) {
      var l = n.lanes;
      l &= t.pendingLanes, s |= l, n.lanes = s, ip(t, s);
    }
  }
  var fo = {
    readContext: be,
    use: ro,
    useCallback: Ft,
    useContext: Ft,
    useEffect: Ft,
    useImperativeHandle: Ft,
    useLayoutEffect: Ft,
    useInsertionEffect: Ft,
    useMemo: Ft,
    useReducer: Ft,
    useRef: Ft,
    useState: Ft,
    useDebugValue: Ft,
    useDeferredValue: Ft,
    useTransition: Ft,
    useSyncExternalStore: Ft,
    useId: Ft,
    useHostTransitionStatus: Ft,
    useFormState: Ft,
    useActionState: Ft,
    useOptimistic: Ft,
    useMemoCache: Ft,
    useCacheRefresh: Ft,
    useEffectEvent: Ft
  }, iy = {
    readContext: be,
    use: ro,
    useCallback: function(t, n) {
      return Re().memoizedState = [
        t,
        n === void 0 ? null : n
      ], t;
    },
    useContext: be,
    useEffect: Zg,
    useImperativeHandle: function(t, n, s) {
      s = s != null ? s.concat([t]) : null, oo(
        4194308,
        4,
        Gg.bind(null, n, t),
        s
      );
    },
    useLayoutEffect: function(t, n) {
      return oo(4194308, 4, t, n);
    },
    useInsertionEffect: function(t, n) {
      oo(4, 2, t, n);
    },
    useMemo: function(t, n) {
      var s = Re();
      n = n === void 0 ? null : n;
      var l = t();
      if (Es) {
        Ai(!0);
        try {
          t();
        } finally {
          Ai(!1);
        }
      }
      return s.memoizedState = [l, n], l;
    },
    useReducer: function(t, n, s) {
      var l = Re();
      if (s !== void 0) {
        var u = s(n);
        if (Es) {
          Ai(!0);
          try {
            s(n);
          } finally {
            Ai(!1);
          }
        }
      } else u = n;
      return l.memoizedState = l.baseState = u, t = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: t,
        lastRenderedState: u
      }, l.queue = t, t = t.dispatch = ME.bind(
        null,
        pt,
        t
      ), [l.memoizedState, t];
    },
    useRef: function(t) {
      var n = Re();
      return t = { current: t }, n.memoizedState = t;
    },
    useState: function(t) {
      t = uf(t);
      var n = t.queue, s = ty.bind(null, pt, n);
      return n.dispatch = s, [t.memoizedState, s];
    },
    useDebugValue: hf,
    useDeferredValue: function(t, n) {
      var s = Re();
      return df(s, t, n);
    },
    useTransition: function() {
      var t = uf(!1);
      return t = Kg.bind(
        null,
        pt,
        t.queue,
        !0,
        !1
      ), Re().memoizedState = t, [!1, t];
    },
    useSyncExternalStore: function(t, n, s) {
      var l = pt, u = Re();
      if (yt) {
        if (s === void 0)
          throw Error(r(407));
        s = s();
      } else {
        if (s = n(), kt === null)
          throw Error(r(349));
        (Tt & 127) !== 0 || Eg(l, n, s);
      }
      u.memoizedState = s;
      var f = { value: s, getSnapshot: n };
      return u.queue = f, Zg(Ag.bind(null, l, f, t), [
        t
      ]), l.flags |= 2048, fa(
        9,
        { destroy: void 0 },
        wg.bind(
          null,
          l,
          f,
          s,
          n
        ),
        null
      ), s;
    },
    useId: function() {
      var t = Re(), n = kt.identifierPrefix;
      if (yt) {
        var s = Hn, l = Zn;
        s = (l & ~(1 << 32 - Ke(l) - 1)).toString(32) + s, n = "_" + n + "R_" + s, s = so++, 0 < s && (n += "H" + s.toString(32)), n += "_";
      } else
        s = xE++, n = "_" + n + "r_" + s.toString(32) + "_";
      return t.memoizedState = n;
    },
    useHostTransitionStatus: pf,
    useFormState: Vg,
    useActionState: Vg,
    useOptimistic: function(t) {
      var n = Re();
      n.memoizedState = n.baseState = t;
      var s = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      return n.queue = s, n = gf.bind(
        null,
        pt,
        !0,
        s
      ), s.dispatch = n, [t, n];
    },
    useMemoCache: rf,
    useCacheRefresh: function() {
      return Re().memoizedState = CE.bind(
        null,
        pt
      );
    },
    useEffectEvent: function(t) {
      var n = Re(), s = { impl: t };
      return n.memoizedState = s, function() {
        if ((Mt & 2) !== 0)
          throw Error(r(440));
        return s.impl.apply(void 0, arguments);
      };
    }
  }, sy = {
    readContext: be,
    use: ro,
    useCallback: Ig,
    useContext: be,
    useEffect: ff,
    useImperativeHandle: Yg,
    useInsertionEffect: Pg,
    useLayoutEffect: $g,
    useMemo: qg,
    useReducer: lo,
    useRef: Bg,
    useState: function() {
      return lo(mi);
    },
    useDebugValue: hf,
    useDeferredValue: function(t, n) {
      var s = te();
      return Xg(
        s,
        Lt.memoizedState,
        t,
        n
      );
    },
    useTransition: function() {
      var t = lo(mi)[0], n = te().memoizedState;
      return [
        typeof t == "boolean" ? t : _r(t),
        n
      ];
    },
    useSyncExternalStore: xg,
    useId: Jg,
    useHostTransitionStatus: pf,
    useFormState: Lg,
    useActionState: Lg,
    useOptimistic: function(t, n) {
      var s = te();
      return Cg(s, Lt, t, n);
    },
    useMemoCache: rf,
    useCacheRefresh: Wg,
    useEffectEvent: Hg
  }, RE = {
    readContext: be,
    use: ro,
    useCallback: Ig,
    useContext: be,
    useEffect: ff,
    useImperativeHandle: Yg,
    useInsertionEffect: Pg,
    useLayoutEffect: $g,
    useMemo: qg,
    useReducer: of,
    useRef: Bg,
    useState: function() {
      return of(mi);
    },
    useDebugValue: hf,
    useDeferredValue: function(t, n) {
      var s = te();
      return Lt === null ? df(s, t, n) : Xg(
        s,
        Lt.memoizedState,
        t,
        n
      );
    },
    useTransition: function() {
      var t = of(mi)[0], n = te().memoizedState;
      return [
        typeof t == "boolean" ? t : _r(t),
        n
      ];
    },
    useSyncExternalStore: xg,
    useId: Jg,
    useHostTransitionStatus: pf,
    useFormState: kg,
    useActionState: kg,
    useOptimistic: function(t, n) {
      var s = te();
      return Lt !== null ? Cg(s, Lt, t, n) : (s.baseState = t, [t, s.queue.dispatch]);
    },
    useMemoCache: rf,
    useCacheRefresh: Wg,
    useEffectEvent: Hg
  };
  function yf(t, n, s, l) {
    n = t.memoizedState, s = s(l, n), s = s == null ? n : V({}, n, s), t.memoizedState = s, t.lanes === 0 && (t.updateQueue.baseState = s);
  }
  var vf = {
    enqueueSetState: function(t, n, s) {
      t = t._reactInternals;
      var l = nn(), u = Vi(l);
      u.payload = n, s != null && (u.callback = s), n = Li(t, u, l), n !== null && (Pe(n, t, l), gr(n, t, l));
    },
    enqueueReplaceState: function(t, n, s) {
      t = t._reactInternals;
      var l = nn(), u = Vi(l);
      u.tag = 1, u.payload = n, s != null && (u.callback = s), n = Li(t, u, l), n !== null && (Pe(n, t, l), gr(n, t, l));
    },
    enqueueForceUpdate: function(t, n) {
      t = t._reactInternals;
      var s = nn(), l = Vi(s);
      l.tag = 2, n != null && (l.callback = n), n = Li(t, l, s), n !== null && (Pe(n, t, s), gr(n, t, s));
    }
  };
  function ay(t, n, s, l, u, f, y) {
    return t = t.stateNode, typeof t.shouldComponentUpdate == "function" ? t.shouldComponentUpdate(l, f, y) : n.prototype && n.prototype.isPureReactComponent ? !or(s, l) || !or(u, f) : !0;
  }
  function ry(t, n, s, l) {
    t = n.state, typeof n.componentWillReceiveProps == "function" && n.componentWillReceiveProps(s, l), typeof n.UNSAFE_componentWillReceiveProps == "function" && n.UNSAFE_componentWillReceiveProps(s, l), n.state !== t && vf.enqueueReplaceState(n, n.state, null);
  }
  function ws(t, n) {
    var s = n;
    if ("ref" in n) {
      s = {};
      for (var l in n)
        l !== "ref" && (s[l] = n[l]);
    }
    if (t = t.defaultProps) {
      s === n && (s = V({}, s));
      for (var u in t)
        s[u] === void 0 && (s[u] = t[u]);
    }
    return s;
  }
  function ly(t) {
    Bl(t);
  }
  function oy(t) {
    console.error(t);
  }
  function uy(t) {
    Bl(t);
  }
  function ho(t, n) {
    try {
      var s = t.onUncaughtError;
      s(n.value, { componentStack: n.stack });
    } catch (l) {
      setTimeout(function() {
        throw l;
      });
    }
  }
  function cy(t, n, s) {
    try {
      var l = t.onCaughtError;
      l(s.value, {
        componentStack: s.stack,
        errorBoundary: n.tag === 1 ? n.stateNode : null
      });
    } catch (u) {
      setTimeout(function() {
        throw u;
      });
    }
  }
  function bf(t, n, s) {
    return s = Vi(s), s.tag = 3, s.payload = { element: null }, s.callback = function() {
      ho(t, n);
    }, s;
  }
  function fy(t) {
    return t = Vi(t), t.tag = 3, t;
  }
  function hy(t, n, s, l) {
    var u = s.type.getDerivedStateFromError;
    if (typeof u == "function") {
      var f = l.value;
      t.payload = function() {
        return u(f);
      }, t.callback = function() {
        cy(n, s, l);
      };
    }
    var y = s.stateNode;
    y !== null && typeof y.componentDidCatch == "function" && (t.callback = function() {
      cy(n, s, l), typeof u != "function" && (Gi === null ? Gi = /* @__PURE__ */ new Set([this]) : Gi.add(this));
      var S = l.stack;
      this.componentDidCatch(l.value, {
        componentStack: S !== null ? S : ""
      });
    });
  }
  function DE(t, n, s, l, u) {
    if (s.flags |= 32768, l !== null && typeof l == "object" && typeof l.then == "function") {
      if (n = s.alternate, n !== null && ys(
        n,
        s,
        u,
        !0
      ), s = Se.current, s !== null) {
        switch (s.tag) {
          case 31:
          case 13:
          case 19:
            return Oe === null ? jo() : s.alternate === null && Qt === 0 && (Qt = 3), s.flags &= -257, s.flags |= 65536, s.lanes = u, l === Jl ? s.flags |= 16384 : (n = s.updateQueue, n === null ? s.updateQueue = /* @__PURE__ */ new Set([l]) : n.add(l), ih(t, l, u)), !1;
          case 22:
            return s.flags |= 65536, l === Jl ? s.flags |= 16384 : (n = s.updateQueue, n === null ? (n = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([l])
            }, s.updateQueue = n) : (s = n.retryQueue, s === null ? n.retryQueue = /* @__PURE__ */ new Set([l]) : s.add(l)), ih(t, l, u)), !1;
        }
        throw Error(r(435, s.tag));
      }
      return ih(t, l, u), jo(), !1;
    }
    if (yt)
      return n = Se.current, n !== null ? ((n.flags & 65536) === 0 && (n.flags |= 256), n.flags |= 65536, n.lanes = u, l !== kc && (t = Error(r(422), { cause: l }), fr(cn(t, s)))) : (l !== kc && (n = Error(r(423), {
        cause: l
      }), fr(
        cn(n, s)
      )), t = t.current.alternate, t.flags |= 65536, u &= -u, t.lanes |= u, l = cn(l, s), u = bf(
        t.stateNode,
        l,
        u
      ), Xc(t, u), Qt !== 4 && (Qt = 2)), !1;
    var f = Error(r(520), { cause: l });
    if (f = cn(f, s), Mr === null ? Mr = [f] : Mr.push(f), Qt !== 4 && (Qt = 2), n === null) return !0;
    l = cn(l, s), s = n;
    do {
      switch (s.tag) {
        case 3:
          return s.flags |= 65536, t = u & -u, s.lanes |= t, t = bf(s.stateNode, l, t), Xc(s, t), !1;
        case 1:
          if (n = s.type, f = s.stateNode, (s.flags & 128) === 0 && (typeof n.getDerivedStateFromError == "function" || f !== null && typeof f.componentDidCatch == "function" && (Gi === null || !Gi.has(f))))
            return s.flags |= 65536, u &= -u, s.lanes |= u, u = fy(u), hy(
              u,
              t,
              s,
              l
            ), Xc(s, u), !1;
          break;
        case 22:
          if (s.memoizedState !== null)
            return s.flags |= 65536, !1;
      }
      s = s.return;
    } while (s !== null);
    return !1;
  }
  var Sf = Error(r(461)), se = !1;
  function re(t, n, s, l) {
    n.child = t === null ? gg(n, null, s, l) : xs(
      n,
      t.child,
      s,
      l
    );
  }
  function dy(t, n, s, l, u) {
    s = s.render;
    var f = n.ref;
    if ("ref" in l) {
      var y = {};
      for (var S in l)
        S !== "ref" && (y[S] = l[S]);
    } else y = l;
    return vs(n), l = ef(
      t,
      n,
      s,
      y,
      f,
      u
    ), S = nf(), t !== null && !se ? (sf(t, n, u), pi(t, n, u)) : (yt && S && Yl(n), n.flags |= 1, re(t, n, l, u), n.child);
  }
  function my(t, n, s, l, u) {
    if (t === null) {
      var f = s.type;
      return typeof f == "function" && !jc(f) && f.defaultProps === void 0 && s.compare === null ? (n.tag = 15, n.type = f, py(
        t,
        n,
        f,
        l,
        u
      )) : (t = $l(
        s.type,
        null,
        l,
        n,
        n.mode,
        u
      ), t.ref = n.ref, t.return = n, n.child = t);
    }
    if (f = t.child, !zf(t, u)) {
      var y = f.memoizedProps;
      if (s = s.compare, s = s !== null ? s : or, s(y, l) && t.ref === n.ref)
        return pi(t, n, u);
    }
    return n.flags |= 1, t = ui(f, l), t.ref = n.ref, t.return = n, n.child = t;
  }
  function py(t, n, s, l, u) {
    if (t !== null) {
      var f = t.memoizedProps;
      if (or(f, l) && t.ref === n.ref)
        if (se = !1, n.pendingProps = l = f, zf(t, u))
          (t.flags & 131072) !== 0 && (se = !0);
        else
          return n.lanes = t.lanes, pi(t, n, u);
    }
    return _f(
      t,
      n,
      s,
      l,
      u
    );
  }
  function gy(t, n, s, l) {
    var u = l.children, f = t !== null ? t.memoizedState : null;
    if (t === null && n.stateNode === null && (n.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), l.mode === "hidden") {
      if ((n.flags & 128) !== 0) {
        if (f = f !== null ? f.baseLanes | s : s, t !== null) {
          for (l = n.child = t.child, u = 0; l !== null; )
            u = u | l.lanes | l.childLanes, l = l.sibling;
          l = u & ~f;
        } else l = 0, n.child = null;
        return yy(
          t,
          n,
          f,
          s,
          l
        );
      }
      if ((s & 536870912) !== 0)
        n.memoizedState = { baseLanes: 0, cachePool: null }, t !== null && Fl(
          n,
          f !== null ? f.cachePool : null
        ), f !== null ? bg(n, f) : Fc(), Sg(n);
      else
        return l = n.lanes = 536870912, yy(
          t,
          n,
          f !== null ? f.baseLanes | s : s,
          s,
          l
        );
    } else
      f !== null ? (Fl(n, f.cachePool), bg(n, f), Bi(), n.memoizedState = null) : (t !== null && Fl(n, null), Fc(), Bi());
    return re(t, n, u, s), n.child;
  }
  function xr(t, n) {
    return t !== null && t.tag === 22 || n.stateNode !== null || (n.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), n.sibling;
  }
  function yy(t, n, s, l, u) {
    var f = Gc();
    return f = f === null ? null : { parent: ne._currentValue, pool: f }, n.memoizedState = {
      baseLanes: s,
      cachePool: f
    }, t !== null && Fl(n, null), Fc(), Sg(n), t !== null && ys(t, n, l, !0), n.childLanes = u, null;
  }
  function mo(t, n) {
    return n = po(
      { mode: n.mode, children: n.children },
      t.mode
    ), n.ref = t.ref, t.child = n, n.return = t, n;
  }
  function vy(t, n, s) {
    return xs(n, t.child, null, s), t = mo(n, n.pendingProps), t.flags |= 2, Je(n), n.memoizedState = null, t;
  }
  function NE(t, n, s) {
    var l = n.pendingProps, u = (n.flags & 128) !== 0;
    if (n.flags &= -129, t === null) {
      if (yt) {
        if (l.mode === "hidden")
          return t = mo(n, l), n.lanes = 536870912, t.memoizedState = { baseLanes: 0, cachePool: null }, xr(null, t);
        if (Jc(n), (t = Ht) ? (t = Gv(
          t,
          dn
        ), t = t !== null && t.data === "&" ? t : null, t !== null && (n.memoizedState = {
          dehydrated: t,
          treeContext: Ci !== null ? { id: Zn, overflow: Hn } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, s = eg(t), s.return = n, n.child = s, me = n, Ht = null)) : t = null, t === null) throw Ri(n);
        return n.lanes = 536870912, null;
      }
      return mo(n, l);
    }
    var f = t.memoizedState;
    if (f !== null) {
      var y = f.dehydrated;
      if (Jc(n), u)
        if (n.flags & 256)
          n.flags &= -257, n = vy(
            t,
            n,
            s
          );
        else if (n.memoizedState !== null)
          n.child = t.child, n.flags |= 128, n = null;
        else throw Error(r(558));
      else if (se || ys(t, n, s, !1), u = (s & t.childLanes) !== 0, se || u) {
        if (Ui.current === null) {
          if (l = kt, l !== null && (y = sp(l, s), y !== 0 && y !== f.retryLane))
            throw f.retryLane = y, ds(t, y), Pe(l, t, y), Sf;
          jo();
        }
        n = vy(
          t,
          n,
          s
        );
      } else
        t = f.treeContext, Ht = pn(y.nextSibling), me = n, yt = !0, Mi = null, dn = !1, t !== null && sg(n, t), n = mo(n, l), n.flags |= 134221824;
      return n;
    }
    return t = ui(t.child, {
      mode: l.mode,
      children: l.children
    }), t.ref = n.ref, n.child = t, t.return = n, t;
  }
  function ha(t, n) {
    var s = n.ref;
    if (s === null)
      t !== null && t.ref !== null && (n.flags |= 4194816);
    else {
      if (typeof s != "function" && typeof s != "object")
        throw Error(r(284));
      (t === null || t.ref !== s) && (n.flags |= 4194816);
    }
  }
  function _f(t, n, s, l, u) {
    return vs(n), s = ef(
      t,
      n,
      s,
      l,
      void 0,
      u
    ), l = nf(), t !== null && !se ? (sf(t, n, u), pi(t, n, u)) : (yt && l && Yl(n), n.flags |= 1, re(t, n, s, u), n.child);
  }
  function by(t, n, s, l, u, f) {
    return vs(n), n.updateQueue = null, s = Tg(
      n,
      l,
      s,
      u
    ), _g(t), l = nf(), t !== null && !se ? (sf(t, n, f), pi(t, n, f)) : (yt && l && Yl(n), n.flags |= 1, re(t, n, s, f), n.child);
  }
  function Sy(t, n, s, l, u) {
    if (vs(n), n.stateNode === null) {
      var f = na, y = s.contextType;
      typeof y == "object" && y !== null && (f = be(y)), f = new s(l, f), n.memoizedState = f.state !== null && f.state !== void 0 ? f.state : null, f.updater = vf, n.stateNode = f, f._reactInternals = n, f = n.stateNode, f.props = l, f.state = n.memoizedState, f.refs = {}, Ic(n), y = s.contextType, f.context = typeof y == "object" && y !== null ? be(y) : na, f.state = n.memoizedState, y = s.getDerivedStateFromProps, typeof y == "function" && (yf(
        n,
        s,
        y,
        l
      ), f.state = n.memoizedState), typeof s.getDerivedStateFromProps == "function" || typeof f.getSnapshotBeforeUpdate == "function" || typeof f.UNSAFE_componentWillMount != "function" && typeof f.componentWillMount != "function" || (y = f.state, typeof f.componentWillMount == "function" && f.componentWillMount(), typeof f.UNSAFE_componentWillMount == "function" && f.UNSAFE_componentWillMount(), y !== f.state && vf.enqueueReplaceState(f, f.state, null), vr(n, l, f, u), yr(), f.state = n.memoizedState), typeof f.componentDidMount == "function" && (n.flags |= 4194308), l = !0;
    } else if (t === null) {
      f = n.stateNode;
      var S = n.memoizedProps, E = ws(s, S);
      f.props = E;
      var R = f.context, U = s.contextType;
      y = na, typeof U == "object" && U !== null && (y = be(U));
      var H = s.getDerivedStateFromProps;
      U = typeof H == "function" || typeof f.getSnapshotBeforeUpdate == "function", S = n.pendingProps !== S, U || typeof f.UNSAFE_componentWillReceiveProps != "function" && typeof f.componentWillReceiveProps != "function" || (S || R !== y) && ry(
        n,
        f,
        l,
        y
      ), ji = !1;
      var C = n.memoizedState;
      f.state = C, vr(n, l, f, u), yr(), R = n.memoizedState, S || C !== R || ji ? (typeof H == "function" && (yf(
        n,
        s,
        H,
        l
      ), R = n.memoizedState), (E = ji || ay(
        n,
        s,
        E,
        l,
        C,
        R,
        y
      )) ? (U || typeof f.UNSAFE_componentWillMount != "function" && typeof f.componentWillMount != "function" || (typeof f.componentWillMount == "function" && f.componentWillMount(), typeof f.UNSAFE_componentWillMount == "function" && f.UNSAFE_componentWillMount()), typeof f.componentDidMount == "function" && (n.flags |= 4194308)) : (typeof f.componentDidMount == "function" && (n.flags |= 4194308), n.memoizedProps = l, n.memoizedState = R), f.props = l, f.state = R, f.context = y, l = E) : (typeof f.componentDidMount == "function" && (n.flags |= 4194308), l = !1);
    } else {
      f = n.stateNode, qc(t, n), y = n.memoizedProps, U = ws(s, y), f.props = U, H = n.pendingProps, C = f.context, R = s.contextType, E = na, typeof R == "object" && R !== null && (E = be(R)), S = s.getDerivedStateFromProps, (R = typeof S == "function" || typeof f.getSnapshotBeforeUpdate == "function") || typeof f.UNSAFE_componentWillReceiveProps != "function" && typeof f.componentWillReceiveProps != "function" || (y !== H || C !== E) && ry(
        n,
        f,
        l,
        E
      ), ji = !1, C = n.memoizedState, f.state = C, vr(n, l, f, u), yr();
      var L = n.memoizedState;
      y !== H || C !== L || ji || t !== null && t.dependencies !== null && Xl(t.dependencies) ? (typeof S == "function" && (yf(
        n,
        s,
        S,
        l
      ), L = n.memoizedState), (U = ji || ay(
        n,
        s,
        U,
        l,
        C,
        L,
        E
      ) || t !== null && t.dependencies !== null && Xl(t.dependencies)) ? (R || typeof f.UNSAFE_componentWillUpdate != "function" && typeof f.componentWillUpdate != "function" || (typeof f.componentWillUpdate == "function" && f.componentWillUpdate(l, L, E), typeof f.UNSAFE_componentWillUpdate == "function" && f.UNSAFE_componentWillUpdate(
        l,
        L,
        E
      )), typeof f.componentDidUpdate == "function" && (n.flags |= 4), typeof f.getSnapshotBeforeUpdate == "function" && (n.flags |= 1024)) : (typeof f.componentDidUpdate != "function" || y === t.memoizedProps && C === t.memoizedState || (n.flags |= 4), typeof f.getSnapshotBeforeUpdate != "function" || y === t.memoizedProps && C === t.memoizedState || (n.flags |= 1024), n.memoizedProps = l, n.memoizedState = L), f.props = l, f.state = L, f.context = E, l = U) : (typeof f.componentDidUpdate != "function" || y === t.memoizedProps && C === t.memoizedState || (n.flags |= 4), typeof f.getSnapshotBeforeUpdate != "function" || y === t.memoizedProps && C === t.memoizedState || (n.flags |= 1024), l = !1);
    }
    return f = l, ha(t, n), l = (n.flags & 128) !== 0, f || l ? (f = n.stateNode, s = l && typeof s.getDerivedStateFromError != "function" ? null : f.render(), n.flags |= 1, t !== null && l ? (n.child = xs(
      n,
      t.child,
      null,
      u
    ), n.child = xs(
      n,
      null,
      s,
      u
    )) : re(t, n, s, u), n.memoizedState = f.state, t = n.child) : t = pi(
      t,
      n,
      u
    ), t;
  }
  function _y(t, n, s, l) {
    return ps(), n.flags |= 256, re(t, n, s, l), n.child;
  }
  var Tf = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function xf(t) {
    return { baseLanes: t, cachePool: cg() };
  }
  function Ef(t, n, s) {
    return t = t !== null ? t.childLanes & ~s : 0, n && (t |= en), t;
  }
  function Ty(t, n, s) {
    var l = n.pendingProps, u = !1, f = (n.flags & 128) !== 0, y;
    if ((y = f) || (y = t !== null && t.memoizedState === null ? !1 : (_e.current & 2) !== 0), y && (u = !0, n.flags &= -129), y = (n.flags & 32) !== 0, n.flags &= -33, t === null) {
      if (yt) {
        if (u ? ki(n) : Bi(), (t = Ht) ? (t = Gv(
          t,
          dn
        ), t = t !== null && t.data !== "&" ? t : null, t !== null && (n.memoizedState = {
          dehydrated: t,
          treeContext: Ci !== null ? { id: Zn, overflow: Hn } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, s = eg(t), s.return = n, n.child = s, me = n, Ht = null)) : t = null, t === null) throw Ri(n);
        return xh(t) ? n.lanes = 32 : n.lanes = 536870912, null;
      }
      return f = l.children, l = l.fallback, u ? (Bi(), u = n.mode, f = po(
        { mode: "hidden", children: f },
        u
      ), l = ms(
        l,
        u,
        s,
        null
      ), f.return = n, l.return = n, f.sibling = l, n.child = f, l = n.child, l.memoizedState = xf(s), l.childLanes = Ef(
        t,
        y,
        s
      ), n.memoizedState = Tf, xr(null, l)) : (ki(n), wf(n, f));
    }
    var S = t.memoizedState;
    if (S !== null) {
      var E = S.dehydrated;
      if (E !== null)
        return jE(
          t,
          n,
          f,
          y,
          l,
          E,
          S,
          s
        );
    }
    return u ? (Bi(), u = l.fallback, f = n.mode, S = t.child, E = S.sibling, l = ui(S, {
      mode: "hidden",
      children: l.children
    }), l.subtreeFlags = S.subtreeFlags & 1206910976, E !== null ? u = ui(E, u) : (u = ms(
      u,
      f,
      s,
      null
    ), u.flags |= 2), u.return = n, l.return = n, l.sibling = u, n.child = l, xr(null, l), l = n.child, u = t.child.memoizedState, u === null ? u = xf(s) : (f = u.cachePool, f !== null ? (S = ne._currentValue, f = f.parent !== S ? { parent: S, pool: S } : f) : f = cg(), u = {
      baseLanes: u.baseLanes | s,
      cachePool: f
    }), l.memoizedState = u, l.childLanes = Ef(
      t,
      y,
      s
    ), n.memoizedState = Tf, xr(t.child, l)) : (ki(n), s = t.child, t = s.sibling, s = ui(s, {
      mode: "visible",
      children: l.children
    }), s.return = n, s.sibling = null, t !== null && (y = n.deletions, y === null ? (n.deletions = [t], n.flags |= 16) : y.push(t)), n.child = s, n.memoizedState = null, s);
  }
  function wf(t, n) {
    return n = po(
      { mode: "visible", children: n },
      t.mode
    ), n.return = t, t.child = n;
  }
  function po(t, n) {
    return t = ke(22, t, null, n), t.lanes = 0, t;
  }
  function go(t, n, s) {
    return xs(n, t.child, null, s), t = wf(
      n,
      n.pendingProps.children
    ), t.flags |= 2, n.memoizedState = null, t;
  }
  function jE(t, n, s, l, u, f, y, S) {
    if (s)
      return n.flags & 256 ? (ki(n), n.flags &= -257, go(
        t,
        n,
        S
      )) : n.memoizedState !== null ? (Bi(), n.child = t.child, n.flags |= 128, null) : (Bi(), f = u.fallback, y = n.mode, u = po(
        { mode: "visible", children: u.children },
        y
      ), f = ms(
        f,
        y,
        S,
        null
      ), f.flags |= 2, u.return = n, f.return = n, u.sibling = f, n.child = u, xs(n, t.child, null, S), u = n.child, u.memoizedState = xf(S), u.childLanes = Ef(
        t,
        l,
        S
      ), n.memoizedState = Tf, xr(null, u));
    if (ki(n), xh(f)) {
      if (l = f.nextSibling && f.nextSibling.dataset, l) var E = l.dgst;
      return l = E, l !== "" && (u = Error(r(419)), u.stack = "", u.digest = l, fr({ value: u, source: null, stack: null })), go(
        t,
        n,
        S
      );
    }
    if (se || ys(t, n, S, !1), l = (S & t.childLanes) !== 0, se || l) {
      if (Ui.current !== null)
        return go(
          t,
          n,
          S
        );
      if (l = kt, l !== null && (u = sp(
        l,
        S
      ), u !== 0 && u !== y.retryLane))
        throw y.retryLane = u, ds(t, u), Pe(l, t, u), Sf;
      return Th(f) || jo(), go(
        t,
        n,
        S
      );
    }
    return Th(f) ? (n.flags |= 192, n.child = t.child, null) : (t = y.treeContext, Ht = pn(f.nextSibling), me = n, yt = !0, Mi = null, dn = !1, t !== null && sg(n, t), n = wf(
      n,
      u.children
    ), n.flags |= 134221824, n);
  }
  function xy(t, n, s) {
    t.lanes |= n;
    var l = t.alternate;
    l !== null && (l.lanes |= n), ql(t.return, n, s);
  }
  function Ey(t) {
    for (var n = null; t !== null; ) {
      var s = t.alternate;
      s !== null && no(s) === null && (n = t), t = t.sibling;
    }
    return n;
  }
  function yo(t, n, s, l, u, f) {
    var y = t.memoizedState;
    y === null ? t.memoizedState = {
      isBackwards: n,
      rendering: null,
      renderingStartTime: 0,
      last: l,
      tail: s,
      tailMode: u,
      treeForkCount: f
    } : (y.isBackwards = n, y.rendering = null, y.renderingStartTime = 0, y.last = l, y.tail = s, y.tailMode = u, y.treeForkCount = f);
  }
  function Af(t) {
    var n = t.child;
    for (t.child = null; n !== null; ) {
      var s = n.sibling;
      n.sibling = t.child, t.child = n, n = s;
    }
  }
  function Of(t, n, s) {
    var l = n.pendingProps, u = l.revealOrder, f = l.tail;
    l = l.children;
    var y = _e.current;
    if (n.flags & 128)
      return br(n, y), null;
    var S = (y & 2) !== 0;
    if (S ? (y = y & 1 | 2, n.flags |= 128) : y &= 1, br(n, y), u === "backwards" && t !== null ? (Af(t), re(t, n, l, s), Af(t)) : re(t, n, l, s), l = yt ? cr : 0, !S && t !== null && (t.flags & 128) !== 0)
      t: for (t = n.child; t !== null; ) {
        if (t.tag === 13)
          t.memoizedState !== null && xy(t, s, n);
        else if (t.tag === 19)
          xy(t, s, n);
        else if (t.child !== null) {
          t.child.return = t, t = t.child;
          continue;
        }
        if (t === n) break t;
        for (; t.sibling === null; ) {
          if (t.return === null || t.return === n)
            break t;
          t = t.return;
        }
        t.sibling.return = t.return, t = t.sibling;
      }
    switch (u) {
      case "backwards":
        s = Ey(n.child), s === null ? (u = n.child, n.child = null) : (u = s.sibling, s.sibling = null, Af(n)), yo(
          n,
          !0,
          u,
          null,
          f,
          l
        );
        break;
      case "unstable_legacy-backwards":
        for (s = null, u = n.child, n.child = null; u !== null; ) {
          if (t = u.alternate, t !== null && no(t) === null) {
            n.child = u;
            break;
          }
          t = u.sibling, u.sibling = s, s = u, u = t;
        }
        yo(
          n,
          !0,
          s,
          null,
          f,
          l
        );
        break;
      case "together":
        yo(
          n,
          !1,
          null,
          null,
          void 0,
          l
        );
        break;
      case "independent":
        n.memoizedState = null;
        break;
      default:
        s = Ey(n.child), s === null ? (u = n.child, n.child = null) : (u = s.sibling, s.sibling = null), yo(
          n,
          !1,
          u,
          s,
          f,
          l
        );
    }
    return n.child;
  }
  function wy(t, n, s) {
    var l = n.pendingProps;
    return Di(n, n.type, l.value), re(t, n, l.children, s), n.child;
  }
  function pi(t, n, s) {
    if (t !== null && (n.dependencies = t.dependencies), $i |= n.lanes, (s & n.childLanes) === 0)
      if (t !== null) {
        if (ys(
          t,
          n,
          s,
          !1
        ), (s & n.childLanes) === 0)
          return null;
      } else return null;
    if (t !== null && n.child !== t.child)
      throw Error(r(153));
    if (n.child !== null) {
      for (t = n.child, s = ui(t, t.pendingProps), n.child = s, s.return = n; t.sibling !== null; )
        t = t.sibling, s = s.sibling = ui(t, t.pendingProps), s.return = n;
      s.sibling = null;
    }
    return n.child;
  }
  function zf(t, n) {
    return (t.lanes & n) !== 0 ? !0 : (t = t.dependencies, !!(t !== null && Xl(t)));
  }
  function VE(t, n, s) {
    switch (n.tag) {
      case 3:
        _l(n, n.stateNode.containerInfo), Di(n, ne, t.memoizedState.cache), ps();
        break;
      case 27:
      case 5:
        tc(n);
        break;
      case 4:
        _l(n, n.stateNode.containerInfo);
        break;
      case 10:
        Di(
          n,
          n.type,
          n.memoizedProps.value
        );
        break;
      case 31:
        if (n.memoizedState !== null)
          return n.flags |= 128, Jc(n), null;
        break;
      case 13:
        var l = n.memoizedState;
        if (l !== null) {
          if (l.dehydrated !== null)
            return ki(n), n.flags |= 128, null;
          l = ys(
            t,
            n,
            s,
            !1
          );
          var u = n.child.childLanes;
          return l || (s & u) !== 0 ? Ty(t, n, s) : (ki(n), t = pi(
            t,
            n,
            s
          ), t !== null ? t.sibling : null);
        }
        ki(n);
        break;
      case 19:
        if (n.flags & 128)
          return Of(
            t,
            n,
            s
          );
        if (u = (t.flags & 128) !== 0, l = (s & n.childLanes) !== 0, l || (ys(
          t,
          n,
          s,
          !1
        ), l = (s & n.childLanes) !== 0), u) {
          if (l)
            return Of(
              t,
              n,
              s
            );
          n.flags |= 128;
        }
        if (u = n.memoizedState, u !== null && (u.rendering = null, u.tail = null, u.lastEffect = null), br(n, _e.current), l) break;
        return null;
      case 22:
        return n.lanes = 0, gy(
          t,
          n,
          s,
          n.pendingProps
        );
      case 24:
        Di(n, ne, t.memoizedState.cache);
    }
    return pi(t, n, s);
  }
  function Ay(t, n, s) {
    if (t !== null)
      if (t.memoizedProps !== n.pendingProps)
        se = !0;
      else {
        if (!zf(t, s) && (n.flags & 128) === 0)
          return se = !1, VE(
            t,
            n,
            s
          );
        se = (t.flags & 131072) !== 0;
      }
    else
      se = !1, yt && (n.flags & 1048576) !== 0 && ig(n, cr, n.index);
    switch (n.lanes = 0, n.tag) {
      case 16:
        t: {
          var l = n.pendingProps;
          if (t = _s(n.elementType), n.type = t, typeof t == "function")
            jc(t) ? (l = ws(t, l), n.tag = 1, n = Sy(
              null,
              n,
              t,
              l,
              s
            )) : (n.tag = 0, n = _f(
              null,
              n,
              t,
              l,
              s
            ));
          else {
            if (t != null) {
              var u = t.$$typeof;
              if (u === Y) {
                n.tag = 11, n = dy(
                  null,
                  n,
                  t,
                  l,
                  s
                );
                break t;
              } else if (u === ft) {
                n.tag = 14, n = my(
                  null,
                  n,
                  t,
                  l,
                  s
                );
                break t;
              } else if (u === tt) {
                n.tag = 10, n.type = t, n = wy(
                  null,
                  n,
                  s
                );
                break t;
              }
            }
            throw n = Ot(t) || t, Error(r(306, n, ""));
          }
        }
        return n;
      case 0:
        return _f(
          t,
          n,
          n.type,
          n.pendingProps,
          s
        );
      case 1:
        return l = n.type, u = ws(
          l,
          n.pendingProps
        ), Sy(
          t,
          n,
          l,
          u,
          s
        );
      case 3:
        t: {
          if (_l(
            n,
            n.stateNode.containerInfo
          ), t === null) throw Error(r(387));
          l = n.pendingProps;
          var f = n.memoizedState;
          u = f.element, qc(t, n), vr(n, l, null, s);
          var y = n.memoizedState;
          if (l = y.cache, Di(n, ne, l), l !== f.cache && Hc(
            n,
            [ne],
            s,
            !0
          ), yr(), l = y.element, f.isDehydrated)
            if (f = {
              element: l,
              isDehydrated: !1,
              cache: y.cache
            }, n.updateQueue.baseState = f, n.memoizedState = f, n.flags & 256) {
              n = _y(
                t,
                n,
                l,
                s
              );
              break t;
            } else if (l !== u) {
              u = cn(
                Error(r(424)),
                n
              ), fr(u), n = _y(
                t,
                n,
                l,
                s
              );
              break t;
            } else
              for (t = n.stateNode.containerInfo, t.nodeType === 9 ? t = t.body : t = t.nodeName === "HTML" ? t.ownerDocument.body : t, Ht = pn(t.firstChild), me = n, yt = !0, Mi = null, dn = !0, s = gg(
                n,
                null,
                l,
                s
              ), n.child = s; s; )
                s.flags = s.flags & -3 | 134221824, s = s.sibling;
          else {
            if (ps(), l === u) {
              n = pi(
                t,
                n,
                s
              );
              break t;
            }
            re(t, n, l, s);
          }
          n = n.child;
        }
        return n;
      case 26:
        return ha(t, n), t === null ? (s = Qv(
          n.type,
          null,
          n.pendingProps,
          null
        )) ? n.memoizedState = s : yt || (n.stateNode = Mv(
          n.type,
          n.pendingProps,
          Ei.current,
          n
        )) : n.memoizedState = Qv(
          n.type,
          t.memoizedProps,
          n.pendingProps,
          t.memoizedState
        ), null;
      case 27:
        return tc(n), t === null && yt && (l = n.stateNode = qv(
          n.type,
          n.pendingProps,
          Ei.current
        ), me = n, dn = !0, u = Ht, qi(n.type) ? (Eh = u, Ht = pn(l.firstChild)) : Ht = u), re(
          t,
          n,
          n.pendingProps.children,
          s
        ), ha(t, n), t === null && (n.flags |= 4194304), n.child;
      case 5:
        return t === null && yt && ((u = l = Ht) && (l = Cw(
          l,
          n.type,
          n.pendingProps,
          dn
        ), l !== null ? (n.stateNode = l, me = n, Ht = pn(l.firstChild), dn = !1, u = !0) : u = !1), u || Ri(n)), tc(n), u = n.type, f = n.pendingProps, y = t !== null ? t.memoizedProps : null, l = f.children, ph(u, f) ? l = null : y !== null && ph(u, y) && (n.flags |= 32), n.memoizedState !== null && (u = ef(
          t,
          n,
          EE,
          null,
          null,
          s
        ), Ma._currentValue = u), ha(t, n), re(t, n, l, s), n.child;
      case 6:
        return t === null && yt && ((t = s = Ht) && (s = Mw(
          s,
          n.pendingProps,
          dn
        ), s !== null ? (n.stateNode = s, me = n, Ht = null, t = !0) : t = !1), t || Ri(n)), null;
      case 13:
        return Ty(t, n, s);
      case 4:
        return _l(
          n,
          n.stateNode.containerInfo
        ), l = n.pendingProps, t === null ? n.child = xs(
          n,
          null,
          l,
          s
        ) : re(t, n, l, s), n.child;
      case 11:
        return dy(
          t,
          n,
          n.type,
          n.pendingProps,
          s
        );
      case 7:
        return l = n.pendingProps, ha(t, n), re(t, n, l, s), n.child;
      case 8:
        return re(
          t,
          n,
          n.pendingProps.children,
          s
        ), n.child;
      case 12:
        return re(
          t,
          n,
          n.pendingProps.children,
          s
        ), n.child;
      case 10:
        return wy(t, n, s);
      case 9:
        return u = n.type._context, l = n.pendingProps.children, vs(n), u = be(u), l = l(u), n.flags |= 1, re(t, n, l, s), n.child;
      case 14:
        return my(
          t,
          n,
          n.type,
          n.pendingProps,
          s
        );
      case 15:
        return py(
          t,
          n,
          n.type,
          n.pendingProps,
          s
        );
      case 19:
        return Of(t, n, s);
      case 31:
        return NE(t, n, s);
      case 22:
        return gy(
          t,
          n,
          s,
          n.pendingProps
        );
      case 24:
        return vs(n), l = be(ne), t === null ? (u = Gc(), u === null && (u = kt, f = Pc(), u.pooledCache = f, f.refCount++, f !== null && (u.pooledCacheLanes |= s), u = f), n.memoizedState = { parent: l, cache: u }, Ic(n), Di(n, ne, u)) : ((t.lanes & s) !== 0 && (qc(t, n), vr(n, null, null, s), yr()), u = t.memoizedState, f = n.memoizedState, u.parent !== l ? (u = { parent: l, cache: l }, n.memoizedState = u, n.lanes === 0 && (n.memoizedState = n.updateQueue.baseState = u), Di(n, ne, l)) : (l = f.cache, Di(n, ne, l), l !== u.cache && Hc(
          n,
          [ne],
          s,
          !0
        ))), re(
          t,
          n,
          n.pendingProps.children,
          s
        ), n.child;
      case 30:
        return n.stateNode === null && (n.stateNode = {
          autoName: null,
          paired: null,
          clones: null,
          ref: null
        }), l = n.pendingProps, l.name != null && l.name !== "auto" ? n.flags |= t === null ? 18882560 : 18874368 : yt && Yl(n), t !== null && t.memoizedProps.name !== l.name ? n.flags |= 4194816 : ha(t, n), re(t, n, l.children, s), n.child;
      case 29:
        throw n.pendingProps;
    }
    throw Error(r(156, n.tag));
  }
  function gi(t) {
    t.flags |= 4;
  }
  function Cf(t, n, s, l, u) {
    var f;
    if ((f = (t.mode & 32) !== 0) && (f = s === null ? e0(n, l) : e0(n, l) && (l.src !== s.src || l.srcSet !== s.srcSet)), f) {
      if (t.flags |= 16777216, (u & 335544128) === u)
        if (t.stateNode.complete) t.flags |= 8192;
        else if (lv()) t.flags |= 8192;
        else
          throw Ts = Jl, Yc;
    } else t.flags &= -16777217;
  }
  function Oy(t, n) {
    if (n.type !== "stylesheet" || (n.state.loading & 4) !== 0)
      t.flags &= -16777217;
    else if (t.flags |= 16777216, !n0(n))
      if (lv()) t.flags |= 8192;
      else
        throw Ts = Jl, Yc;
  }
  function vo(t, n) {
    n !== null && (t.flags |= 4), t.flags & 16384 && (n = t.tag !== 22 ? ep() : 536870912, t.lanes |= n, ya |= n);
  }
  function Er(t, n) {
    if (!yt)
      switch (t.tailMode) {
        case "visible":
          break;
        case "collapsed":
          for (var s = t.tail, l = null; s !== null; )
            s.alternate !== null && (l = s), s = s.sibling;
          l === null ? n || t.tail === null ? t.tail = null : t.tail.sibling = null : l.sibling = null;
          break;
        default:
          for (n = t.tail, s = null; n !== null; )
            n.alternate !== null && (s = n), n = n.sibling;
          s === null ? t.tail = null : s.sibling = null;
      }
  }
  function Pt(t) {
    var n = t.alternate !== null && t.alternate.child === t.child, s = 0, l = 0;
    if (n)
      for (var u = t.child; u !== null; )
        s |= u.lanes | u.childLanes, l |= u.subtreeFlags & 1206910976, l |= u.flags & 1206910976, u.return = t, u = u.sibling;
    else
      for (u = t.child; u !== null; )
        s |= u.lanes | u.childLanes, l |= u.subtreeFlags, l |= u.flags, u.return = t, u = u.sibling;
    return t.subtreeFlags |= l, t.childLanes = s, n;
  }
  function LE(t, n, s) {
    var l = n.pendingProps;
    switch (Uc(n), n.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return Pt(n), null;
      case 1:
        return Pt(n), null;
      case 3:
        return s = n.stateNode, l = null, t !== null && (l = t.memoizedState.cache), n.memoizedState.cache !== l && (n.flags |= 2048), hi(ne), $s(), s.pendingContext && (s.context = s.pendingContext, s.pendingContext = null), (t === null || t.child === null) && (aa(n) ? gi(n) : t === null || t.memoizedState.isDehydrated && (n.flags & 256) === 0 || (n.flags |= 1024, Bc())), Pt(n), null;
      case 26:
        var u = n.type, f = n.memoizedState;
        return t === null ? (gi(n), f !== null ? (Pt(n), Oy(n, f)) : (Pt(n), Cf(
          n,
          u,
          null,
          l,
          s
        ))) : f ? f !== t.memoizedState ? (gi(n), Pt(n), Oy(n, f)) : (Pt(n), n.flags &= -16777217) : (t = t.memoizedProps, t !== l && gi(n), Pt(n), Cf(
          n,
          u,
          t,
          l,
          s
        )), null;
      case 27:
        if (Tl(n), s = Ei.current, u = n.type, t !== null && n.stateNode != null)
          t.memoizedProps !== l && gi(n);
        else {
          if (!l) {
            if (n.stateNode === null)
              throw Error(r(166));
            return Pt(n), n.subtreeFlags &= -33554433, null;
          }
          t = kn.current, aa(n) ? ag(n) : (t = qv(u, l, s), n.stateNode = t, gi(n));
        }
        return Pt(n), n.subtreeFlags &= -33554433, null;
      case 5:
        if (Tl(n), u = n.type, t !== null && n.stateNode != null)
          t.memoizedProps !== l && gi(n);
        else {
          if (!l) {
            if (n.stateNode === null)
              throw Error(r(166));
            return Pt(n), n.subtreeFlags &= -33554433, null;
          }
          if (f = kn.current, aa(n))
            ag(n);
          else {
            var y = Vr(
              Ei.current
            );
            switch (f) {
              case 1:
                f = y.createElementNS(
                  "http://www.w3.org/2000/svg",
                  u
                );
                break;
              case 2:
                f = y.createElementNS(
                  "http://www.w3.org/1998/Math/MathML",
                  u
                );
                break;
              default:
                switch (u) {
                  case "svg":
                    f = y.createElementNS(
                      "http://www.w3.org/2000/svg",
                      u
                    );
                    break;
                  case "math":
                    f = y.createElementNS(
                      "http://www.w3.org/1998/Math/MathML",
                      u
                    );
                    break;
                  case "script":
                    f = y.createElement("div"), f.innerHTML = "<script><\/script>", f = f.removeChild(
                      f.firstChild
                    );
                    break;
                  case "select":
                    f = typeof l.is == "string" ? y.createElement("select", {
                      is: l.is
                    }) : y.createElement("select"), l.multiple ? f.multiple = !0 : l.size && (f.size = l.size);
                    break;
                  default:
                    f = typeof l.is == "string" ? y.createElement(u, { is: l.is }) : y.createElement(u);
                }
            }
            f[ve] = n, f[Ue] = l;
            t: for (y = n.child; y !== null; ) {
              if (y.tag === 5 || y.tag === 6)
                f.appendChild(y.stateNode);
              else if (y.tag !== 4 && y.tag !== 27 && y.child !== null) {
                y.child.return = y, y = y.child;
                continue;
              }
              if (y === n) break t;
              for (; y.sibling === null; ) {
                if (y.return === null || y.return === n)
                  break t;
                y = y.return;
              }
              y.sibling.return = y.return, y = y.sibling;
            }
            n.stateNode = f;
            t: switch (xe(f, u, l), u) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                l = !!l.autoFocus;
                break t;
              case "img":
                l = !0;
                break t;
              default:
                l = !1;
            }
            l && gi(n);
          }
        }
        return Pt(n), n.subtreeFlags &= -33554433, Cf(
          n,
          n.type,
          t === null ? null : t.memoizedProps,
          n.pendingProps,
          s
        ), null;
      case 6:
        if (t && n.stateNode != null)
          t.memoizedProps !== l && gi(n);
        else {
          if (typeof l != "string" && n.stateNode === null)
            throw Error(r(166));
          if (t = Ei.current, aa(n)) {
            if (t = n.stateNode, s = n.memoizedProps, l = null, u = me, u !== null)
              switch (u.tag) {
                case 27:
                case 5:
                  l = u.memoizedProps;
              }
            t[ve] = n, t = !!(t.nodeValue === s || l !== null && l.suppressHydrationWarning === !0 || Av(t.nodeValue, s)), t || Ri(n, !0);
          } else
            t = Vr(t).createTextNode(
              l
            ), t[ve] = n, n.stateNode = t;
        }
        return Pt(n), null;
      case 31:
        if (s = n.memoizedState, t === null || t.memoizedState !== null) {
          if (l = aa(n), s !== null) {
            if (t === null) {
              if (!l) throw Error(r(318));
              if (t = n.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(r(557));
              t[ve] = n;
            } else
              ps(), (n.flags & 128) === 0 && (n.memoizedState = null), n.flags |= 4;
            Pt(n), t = !1;
          } else
            s = Bc(), t !== null && t.memoizedState !== null && (t.memoizedState.hydrationErrors = s), t = !0;
          if (!t)
            return n.flags & 256 ? (Je(n), n) : (Je(n), null);
          if ((n.flags & 128) !== 0)
            throw Error(r(558));
        }
        return Pt(n), null;
      case 13:
        if (l = n.memoizedState, t === null || t.memoizedState !== null && t.memoizedState.dehydrated !== null) {
          if (u = aa(n), l !== null && l.dehydrated !== null) {
            if (t === null) {
              if (!u) throw Error(r(318));
              if (u = n.memoizedState, u = u !== null ? u.dehydrated : null, !u) throw Error(r(317));
              u[ve] = n;
            } else
              ps(), (n.flags & 128) === 0 && (n.memoizedState = null), n.flags |= 4;
            Pt(n), u = !1;
          } else
            u = Bc(), t !== null && t.memoizedState !== null && (t.memoizedState.hydrationErrors = u), u = !0;
          if (!u)
            return n.flags & 256 ? (Je(n), n) : (Je(n), null);
        }
        return Je(n), (n.flags & 128) !== 0 ? (n.lanes = s, n) : (s = l !== null, t = t !== null && t.memoizedState !== null, s && (l = n.child, u = null, l.alternate !== null && l.alternate.memoizedState !== null && l.alternate.memoizedState.cachePool !== null && (u = l.alternate.memoizedState.cachePool.pool), f = null, l.memoizedState !== null && l.memoizedState.cachePool !== null && (f = l.memoizedState.cachePool.pool), f !== u && (l.flags |= 2048)), s !== t && s && (n.child.flags |= 8192), vo(n, n.updateQueue), Pt(n), null);
      case 4:
        return $s(), t === null && ch(n.stateNode.containerInfo), n.flags |= 67108864, Pt(n), null;
      case 10:
        return hi(n.type), Pt(n), null;
      case 19:
        if (Wc(n), l = n.memoizedState, l === null) return Pt(n), null;
        if (u = (n.flags & 128) !== 0, f = l.rendering, f === null)
          if (u) Er(l, !1);
          else {
            if (Qt !== 0 || t !== null && (t.flags & 128) !== 0)
              for (t = n.child; t !== null; ) {
                if (f = no(t), f !== null) {
                  for (n.flags |= 128, Er(l, !1), t = f.updateQueue, n.updateQueue = t, vo(n, t), n.subtreeFlags = 0, t = s, s = n.child; s !== null; )
                    tg(s, t), s = s.sibling;
                  return br(
                    n,
                    _e.current & 1 | 2
                  ), yt && ci(n, l.treeForkCount), n.child;
                }
                t = t.sibling;
              }
            l.tail !== null && qe() > Mo && (n.flags |= 128, u = !0, Er(l, !1), n.lanes = 4194304);
          }
        else {
          if (!u)
            if (t = no(f), t !== null) {
              if (n.flags |= 128, u = !0, t = t.updateQueue, n.updateQueue = t, vo(n, t), Er(l, !0), l.tail === null && l.tailMode !== "collapsed" && l.tailMode !== "visible" && !f.alternate && !yt)
                return Pt(n), null;
            } else
              2 * qe() - l.renderingStartTime > Mo && s !== 536870912 && (n.flags |= 128, u = !0, Er(l, !1), n.lanes = 4194304);
          l.isBackwards ? (f.sibling = n.child, n.child = f) : (t = l.last, t !== null ? t.sibling = f : n.child = f, l.last = f);
        }
        if (l.tail !== null) {
          t = l.tail;
          t: {
            for (s = t; s !== null; ) {
              if (s.alternate !== null) {
                s = !1;
                break t;
              }
              s = s.sibling;
            }
            s = !0;
          }
          return l.rendering = t, l.tail = t.sibling, l.renderingStartTime = qe(), t.sibling = null, f = _e.current, f = u ? f & 1 | 2 : f & 1, l.tailMode === "visible" || l.tailMode === "collapsed" || !s || yt ? br(n, f) : (s = f, Zt(Se, n), Zt(_e, s), Oe === null && (Oe = n)), yt && ci(n, l.treeForkCount), t;
        }
        return Pt(n), null;
      case 22:
      case 23:
        return Je(n), Qc(), l = n.memoizedState !== null, t !== null ? t.memoizedState !== null !== l && (n.flags |= 8192) : l && (n.flags |= 8192), l ? (s & 536870912) !== 0 && (n.flags & 128) === 0 && (Pt(n), n.subtreeFlags & 6 && (n.flags |= 8192)) : Pt(n), s = n.updateQueue, s !== null && vo(n, s.retryQueue), s = null, t !== null && t.memoizedState !== null && t.memoizedState.cachePool !== null && (s = t.memoizedState.cachePool.pool), l = null, n.memoizedState !== null && n.memoizedState.cachePool !== null && (l = n.memoizedState.cachePool.pool), l !== s && (n.flags |= 2048), t !== null && ye(Ss), null;
      case 24:
        return s = null, t !== null && (s = t.memoizedState.cache), n.memoizedState.cache !== s && (n.flags |= 2048), hi(ne), Pt(n), null;
      case 25:
        return null;
      case 30:
        return n.flags |= 33554432, Pt(n), null;
    }
    throw Error(r(156, n.tag));
  }
  function UE(t, n) {
    switch (Uc(n), n.tag) {
      case 1:
        return t = n.flags, t & 65536 ? (n.flags = t & -65537 | 128, n) : null;
      case 3:
        return hi(ne), $s(), t = n.flags, (t & 65536) !== 0 && (t & 128) === 0 ? (n.flags = t & -65537 | 128, n) : null;
      case 26:
      case 27:
      case 5:
        return Tl(n), null;
      case 31:
        if (n.memoizedState !== null) {
          if (Je(n), n.alternate === null)
            throw Error(r(340));
          ps();
        }
        return t = n.flags, t & 65536 ? (n.flags = t & -65537 | 128, n) : null;
      case 13:
        if (Je(n), t = n.memoizedState, t !== null && t.dehydrated !== null) {
          if (n.alternate === null)
            throw Error(r(340));
          ps();
        }
        return t = n.flags, t & 65536 ? (n.flags = t & -65537 | 128, n) : null;
      case 19:
        return Wc(n), t = n.flags, t & 65536 ? (n.flags = t & -65537 | 128, t = n.memoizedState, t !== null && (t.rendering = null, t.tail = null), n.flags |= 4, n) : null;
      case 4:
        return $s(), null;
      case 10:
        return hi(n.type), null;
      case 22:
      case 23:
        return Je(n), Qc(), t !== null && ye(Ss), t = n.flags, t & 65536 ? (n.flags = t & -65537 | 128, n) : null;
      case 24:
        return hi(ne), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function zy(t, n) {
    switch (Uc(n), n.tag) {
      case 3:
        hi(ne), $s();
        break;
      case 26:
      case 27:
      case 5:
        Tl(n);
        break;
      case 4:
        $s();
        break;
      case 31:
        n.memoizedState !== null && Je(n);
        break;
      case 13:
        Je(n);
        break;
      case 19:
        Wc(n);
        break;
      case 10:
        hi(n.type);
        break;
      case 22:
      case 23:
        Je(n), Qc(), t !== null && ye(Ss);
        break;
      case 24:
        hi(ne);
    }
  }
  function wr(t, n) {
    try {
      var s = n.updateQueue, l = s !== null ? s.lastEffect : null;
      if (l !== null) {
        var u = l.next;
        s = u;
        do {
          if ((s.tag & t) === t) {
            l = void 0;
            var f = s.create, y = s.inst;
            l = f(), y.destroy = l;
          }
          s = s.next;
        } while (s !== u);
      }
    } catch (S) {
      jt(n, n.return, S);
    }
  }
  function Zi(t, n, s) {
    try {
      var l = n.updateQueue, u = l !== null ? l.lastEffect : null;
      if (u !== null) {
        var f = u.next;
        l = f;
        do {
          if ((l.tag & t) === t) {
            var y = l.inst, S = y.destroy;
            if (S !== void 0) {
              y.destroy = void 0, u = n;
              var E = s, R = S;
              try {
                R();
              } catch (U) {
                jt(
                  u,
                  E,
                  U
                );
              }
            }
          }
          l = l.next;
        } while (l !== f);
      }
    } catch (U) {
      jt(n, n.return, U);
    }
  }
  function Cy(t) {
    var n = t.updateQueue;
    if (n !== null) {
      var s = t.stateNode;
      try {
        vg(n, s);
      } catch (l) {
        jt(t, t.return, l);
      }
    }
  }
  function My(t, n, s) {
    s.props = ws(
      t.type,
      t.memoizedProps
    ), s.state = t.memoizedState;
    try {
      s.componentWillUnmount();
    } catch (l) {
      jt(t, n, l);
    }
  }
  function Pn(t, n) {
    try {
      var s = t.ref;
      if (s !== null) {
        switch (t.tag) {
          case 26:
          case 27:
          case 5:
            var l = t.stateNode;
            break;
          case 30:
            var u = t.stateNode, f = li(t.memoizedProps, u);
            (u.ref === null || u.ref.name !== f) && (u.ref = Uv(f)), l = u.ref;
            break;
          case 7:
            if (t.stateNode === null) {
              var y = new sn(t);
              v(
                t.child,
                !1,
                Ow,
                y,
                void 0,
                void 0
              ), t.stateNode = y;
            }
            l = t.stateNode;
            break;
          default:
            l = t.stateNode;
        }
        typeof s == "function" ? t.refCleanup = s(l) : s.current = l;
      }
    } catch (S) {
      jt(t, n, S);
    }
  }
  function Te(t, n) {
    var s = t.ref, l = t.refCleanup;
    if (s !== null)
      if (typeof l == "function")
        try {
          l();
        } catch (u) {
          jt(t, n, u);
        } finally {
          t.refCleanup = null, t = t.alternate, t != null && (t.refCleanup = null);
        }
      else if (typeof s == "function")
        try {
          s(null);
        } catch (u) {
          jt(t, n, u);
        }
      else s.current = null;
  }
  function bo(t, n) {
    if ((t.tag === 5 || t.tag === 27 || t.tag === 6) && t.alternate === null && n !== null)
      for (var s = 0; s < n.length; s++)
        $v(
          t.stateNode,
          n[s]
        );
  }
  function Ry(t) {
    for (var n = t.return; n !== null && (Rf(n) && $v(t.stateNode, n.stateNode), !Mf(n)); )
      n = n.return;
  }
  function Ar(t) {
    for (var n = t.return; n !== null && (Rf(n) && zw(t.stateNode, n.stateNode), !Mf(n)); )
      n = n.return;
  }
  function Mf(t) {
    return t.tag === 5 || t.tag === 3 || t.tag === 27;
  }
  function Rf(t) {
    return t && t.tag === 7 && t.stateNode !== null;
  }
  function Df(t) {
    var n = t.type, s = t.memoizedProps, l = t.stateNode;
    try {
      t: switch (n) {
        case "button":
        case "input":
        case "select":
        case "textarea":
          s.autoFocus && l.focus();
          break t;
        case "img":
          s.src ? l.src = s.src : s.srcSet && (l.srcset = s.srcSet);
      }
    } catch (u) {
      jt(t, t.return, u);
    }
  }
  function Nf(t, n, s) {
    try {
      var l = t.stateNode;
      uw(l, t.type, s, n), l[Ue] = n;
    } catch (u) {
      jt(t, t.return, u);
    }
  }
  function Dy(t) {
    return t.tag === 5 || t.tag === 3 || t.tag === 26 || t.tag === 27 && qi(t.type) || t.tag === 4;
  }
  function jf(t) {
    t: for (; ; ) {
      for (; t.sibling === null; ) {
        if (t.return === null || Dy(t.return)) return null;
        t = t.return;
      }
      for (t.sibling.return = t.return, t = t.sibling; t.tag !== 5 && t.tag !== 6 && t.tag !== 18; ) {
        if (t.tag === 27 && qi(t.type) || t.flags & 2 || t.child === null || t.tag === 4) continue t;
        t.child.return = t, t = t.child;
      }
      if (!(t.flags & 2)) return t.stateNode;
    }
  }
  function Vf(t, n, s, l) {
    var u = t.tag;
    if (u === 5 || u === 6)
      u = t.stateNode, n ? (s.nodeType === 9 ? s.body : s.nodeName === "HTML" ? s.ownerDocument.body : s).insertBefore(u, n) : (n = s.nodeType === 9 ? s.body : s.nodeName === "HTML" ? s.ownerDocument.body : s, n.appendChild(u), s = s._reactRootContainer, s != null || n.onclick !== null || (n.onclick = Bn)), bo(t, l), zt = !0;
    else if (u !== 4 && (u === 27 && (bo(t, l), l = null, qi(t.type) && (s = t.stateNode, n = null)), t = t.child, t !== null))
      for (Vf(
        t,
        n,
        s,
        l
      ), t = t.sibling; t !== null; )
        Vf(
          t,
          n,
          s,
          l
        ), t = t.sibling;
  }
  function So(t, n, s, l) {
    var u = t.tag;
    if (u === 5 || u === 6)
      u = t.stateNode, n ? s.insertBefore(u, n) : s.appendChild(u), bo(t, l), zt = !0;
    else if (u !== 4 && (u === 27 && (bo(t, l), l = null, qi(t.type) && (s = t.stateNode)), t = t.child, t !== null))
      for (So(
        t,
        n,
        s,
        l
      ), t = t.sibling; t !== null; )
        So(
          t,
          n,
          s,
          l
        ), t = t.sibling;
  }
  function Ny(t) {
    var n = t.stateNode, s = t.memoizedProps;
    try {
      for (var l = t.type, u = n.attributes; u.length; )
        n.removeAttributeNode(u[0]);
      xe(n, l, s), n[ve] = t, n[Ue] = s;
    } catch (f) {
      jt(t, t.return, f);
    }
  }
  var _o = !1, We = null;
  function jy(t) {
    (t.tag === 30 || (t.subtreeFlags & 33554432) !== 0) && (_o = !0);
  }
  var $n = null;
  function Vy() {
    var t = $n;
    return $n = null, t;
  }
  var Be = 0;
  function da(t, n, s, l, u) {
    return Be = 0, Ly(
      t.child,
      n,
      s,
      l,
      u
    );
  }
  function Ly(t, n, s, l, u) {
    for (var f = !1; t !== null; ) {
      if (t.tag === 5) {
        var y = t.stateNode;
        if (l !== null) {
          var S = vh(y);
          l.push(S), S.view && (f = !0);
        } else
          f || vh(y).view && (f = !0);
        _o = !0, Vv(
          y,
          Be === 0 ? n : n + "_" + Be,
          s
        ), Be++;
      } else (t.tag !== 22 || t.memoizedState === null) && (t.tag === 30 && u || Ly(
        t.child,
        n,
        s,
        l,
        u
      ) && (f = !0));
      t = t.sibling;
    }
    return f;
  }
  function Gn(t, n) {
    for (; t !== null; )
      t.tag === 5 ? Lv(t.stateNode, t.memoizedProps) : (t.tag !== 22 || t.memoizedState === null) && (t.tag === 30 && n || Gn(
        t.child,
        n
      )), t = t.sibling;
  }
  function To(t) {
    if ((t.subtreeFlags & 18874368) !== 0)
      for (t = t.child; t !== null; ) {
        if ((t.tag !== 22 || t.memoizedState === null) && (To(t), t.tag === 30 && (t.flags & 18874368) !== 0 && t.stateNode.paired)) {
          var n = t.memoizedProps;
          if (n.name == null || n.name === "auto")
            throw Error(r(544));
          var s = n.name;
          n = oi(n.default, n.share), n !== "none" && (da(
            t,
            s,
            n,
            null,
            !1
          ) || Gn(t.child, !1));
        }
        t = t.sibling;
      }
  }
  function Lf(t, n) {
    if (t.tag === 30) {
      var s = t.stateNode, l = t.memoizedProps, u = li(l, s), f = oi(
        l.default,
        s.paired ? l.share : l.enter
      );
      f !== "none" ? da(t, u, f, null, !1) ? (To(t), s.paired || n || _a(t, l.onEnter)) : Gn(t.child, !1) : To(t);
    } else if ((t.subtreeFlags & 33554432) !== 0)
      for (t = t.child; t !== null; )
        Lf(t, n), t = t.sibling;
    else To(t);
  }
  function Uf(t) {
    if (We !== null && We.size !== 0) {
      var n = We;
      if ((t.subtreeFlags & 18874368) !== 0)
        for (t = t.child; t !== null; ) {
          if (t.tag !== 22 || t.memoizedState === null) {
            if (t.tag === 30 && (t.flags & 18874368) !== 0) {
              var s = t.memoizedProps, l = s.name;
              if (l != null && l !== "auto") {
                var u = n.get(l);
                if (u !== void 0) {
                  var f = oi(
                    s.default,
                    s.share
                  );
                  if (f !== "none" && (da(
                    t,
                    l,
                    f,
                    null,
                    !1
                  ) ? (f = t.stateNode, u.paired = f, f.paired = u, _a(t, s.onShare)) : Gn(t.child, !1)), n.delete(l), n.size === 0) break;
                }
              }
            }
            Uf(t);
          }
          t = t.sibling;
        }
    }
  }
  function kf(t) {
    if (t.tag === 30) {
      var n = t.memoizedProps, s = li(n, t.stateNode), l = We !== null ? We.get(s) : void 0, u = oi(
        n.default,
        l !== void 0 ? n.share : n.exit
      );
      u !== "none" && (da(t, s, u, null, !1) ? l !== void 0 ? (u = t.stateNode, l.paired = u, u.paired = l, We.delete(s), _a(t, n.onShare)) : _a(t, n.onExit) : Gn(t.child, !1)), We !== null && Uf(t);
    } else if ((t.subtreeFlags & 33554432) !== 0)
      for (t = t.child; t !== null; )
        kf(t), t = t.sibling;
    else
      We !== null && Uf(t);
  }
  function Uy(t) {
    for (t = t.child; t !== null; ) {
      if (t.tag === 30) {
        var n = t.memoizedProps, s = li(n, t.stateNode);
        n = oi(n.default, n.update), t.flags &= -5, n !== "none" && da(
          t,
          s,
          n,
          t.memoizedState = [],
          !1
        );
      } else
        (t.subtreeFlags & 33554432) !== 0 && Uy(t);
      t = t.sibling;
    }
  }
  function Bf(t) {
    if ((t.subtreeFlags & 18874368) !== 0)
      for (t = t.child; t !== null; ) {
        if (t.tag !== 22 || t.memoizedState === null) {
          if (t.tag === 30 && (t.flags & 18874368) !== 0) {
            var n = t.stateNode;
            n.paired !== null && (n.paired = null, Gn(t.child, !1));
          }
          Bf(t);
        }
        t = t.sibling;
      }
  }
  function xo(t) {
    if (t.tag === 30)
      t.stateNode.paired = null, Gn(t.child, !1), Bf(t);
    else if ((t.subtreeFlags & 33554432) !== 0)
      for (t = t.child; t !== null; )
        xo(t), t = t.sibling;
    else Bf(t);
  }
  function ky(t) {
    for (t = t.child; t !== null; )
      t.tag === 30 ? Gn(t.child, !1) : (t.subtreeFlags & 33554432) !== 0 && ky(t), t = t.sibling;
  }
  function Zf(t, n, s, l, u, f, y) {
    for (var S = !1; n !== null; ) {
      if (n.tag === 5) {
        var E = n.stateNode;
        if (f !== null && Be < f.length) {
          var R = f[Be], U = vh(E);
          (R.view || U.view) && (S = !0);
          var H;
          if (H = (t.flags & 4) === 0)
            if (U.clip) H = !0;
            else {
              H = R.rect;
              var C = U.rect;
              H = H.y !== C.y || H.x !== C.x || H.height !== C.height || H.width !== C.width;
            }
          H && (t.flags |= 4), U.abs ? U = !R.abs : (R = R.rect, U = U.rect, U = R.height !== U.height || R.width !== U.width), U && (t.flags |= 32);
        } else t.flags |= 32;
        (t.flags & 4) !== 0 && Vv(
          E,
          Be === 0 ? s : s + "_" + Be,
          u
        ), S && (t.flags & 4) !== 0 || ($n === null && ($n = []), $n.push(
          E,
          Be === 0 ? l : l + "_" + Be,
          n.memoizedProps
        )), Be++;
      } else (n.tag !== 22 || n.memoizedState === null) && (n.tag === 30 && y ? t.flags |= n.flags & 32 : Zf(
        t,
        n.child,
        s,
        l,
        u,
        f,
        y
      ) && (S = !0));
      n = n.sibling;
    }
    return S;
  }
  function By(t, n) {
    for (t = t.child; t !== null; ) {
      if (t.tag === 30) {
        var s = t.memoizedProps, l = t.stateNode, u = li(s, l), f = oi(s.default, s.update), y;
        y = t.memoizedState, t.memoizedState = null, l = t;
        var S = t.child;
        Be = 0, u = Zf(
          l,
          S,
          u,
          u,
          f,
          y,
          !1
        ), (t.flags & 4) !== 0 && u && _a(t, s.onUpdate);
      } else
        (t.subtreeFlags & 33554432) !== 0 && By(t);
      t = t.sibling;
    }
  }
  var pe = !1, Dt = !1, Yn = !1, Hf = !1, Zy = typeof WeakSet == "function" ? WeakSet : Set, ge = null, In = !1, Or = !1, Eo = !1, Pf = !1;
  function kE(t, n, s) {
    if (t = t.containerInfo, dh = Ra, t = Gp(t), Oc(t)) {
      if ("selectionStart" in t)
        var l = {
          start: t.selectionStart,
          end: t.selectionEnd
        };
      else
        t: {
          l = (l = t.ownerDocument) && l.defaultView || window;
          var u = l.getSelection && l.getSelection();
          if (u && u.rangeCount !== 0) {
            l = u.anchorNode;
            var f = u.anchorOffset, y = u.focusNode;
            u = u.focusOffset;
            try {
              l.nodeType, y.nodeType;
            } catch {
              l = null;
              break t;
            }
            var S = 0, E = -1, R = -1, U = 0, H = 0, C = t, L = null;
            e: for (; ; ) {
              for (var F; C !== l || f !== 0 && C.nodeType !== 3 || (E = S + f), C !== y || u !== 0 && C.nodeType !== 3 || (R = S + u), C.nodeType === 3 && (S += C.nodeValue.length), (F = C.firstChild) !== null; )
                L = C, C = F;
              for (; ; ) {
                if (C === t) break e;
                if (L === l && ++U === f && (E = S), L === y && ++H === u && (R = S), (F = C.nextSibling) !== null) break;
                C = L, L = C.parentNode;
              }
              C = F;
            }
            l = E === -1 || R === -1 ? null : { start: E, end: R };
          } else l = null;
        }
      l = l || { start: 0, end: 0 };
    } else l = null;
    for (mh = { focusedElem: t, selectionRange: l }, Ra = !1, s = (s & 335544064) === s, ge = n, n = s ? 9270 : 1024; ge !== null; ) {
      if (t = ge, s && (l = t.deletions, l !== null))
        for (f = 0; f < l.length; f++)
          s && kf(l[f]);
      if (t.alternate === null && (t.flags & 2) !== 0)
        s && jy(t), wo(s);
      else {
        if (t.tag === 22) {
          if (l = t.alternate, t.memoizedState !== null) {
            l !== null && l.memoizedState === null && s && kf(l), wo(s);
            continue;
          } else if (l !== null && l.memoizedState !== null) {
            s && jy(t), wo(s);
            continue;
          }
        }
        l = t.child, (t.subtreeFlags & n) !== 0 && l !== null ? (l.return = t, ge = l) : (s && Uy(t), wo(s));
      }
    }
    We = null;
  }
  function wo(t) {
    for (; ge !== null; ) {
      var n = ge, s = t, l = n.alternate, u = n.flags;
      switch (n.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if ((u & 1024) !== 0 && l !== null) {
            s = void 0, u = l.memoizedProps, l = l.memoizedState;
            var f = n.stateNode;
            try {
              var y = ws(
                n.type,
                u
              );
              s = f.getSnapshotBeforeUpdate(
                y,
                l
              ), f.__reactInternalSnapshotBeforeUpdate = s;
            } catch (S) {
              jt(n, n.return, S);
            }
          }
          break;
        case 3:
          if ((u & 1024) !== 0) {
            if (l = n.stateNode.containerInfo, s = l.nodeType, s === 9)
              _h(l);
            else if (s === 1)
              switch (l.nodeName) {
                case "HEAD":
                case "HTML":
                case "BODY":
                  _h(l);
                  break;
                default:
                  l.textContent = "";
              }
          }
          break;
        case 5:
        case 26:
        case 27:
        case 6:
        case 4:
        case 17:
          break;
        case 30:
          s && l !== null && (s = li(
            l.memoizedProps,
            l.stateNode
          ), u = n.memoizedProps, u = oi(u.default, u.update), u !== "none" && da(
            l,
            s,
            u,
            l.memoizedState = [],
            !0
          ));
          break;
        default:
          if ((u & 1024) !== 0) throw Error(r(163));
      }
      if (l = n.sibling, l !== null) {
        l.return = n.return, ge = l;
        break;
      }
      ge = n.return;
    }
  }
  function Hy(t, n, s) {
    var l = s.flags;
    switch (s.tag) {
      case 0:
      case 11:
      case 15:
        qn(t, s), l & 4 && wr(5, s);
        break;
      case 1:
        if (qn(t, s), l & 4)
          if (t = s.stateNode, n === null)
            try {
              t.componentDidMount();
            } catch (y) {
              jt(s, s.return, y);
            }
          else {
            var u = ws(
              s.type,
              n.memoizedProps
            );
            n = n.memoizedState;
            try {
              t.componentDidUpdate(
                u,
                n,
                t.__reactInternalSnapshotBeforeUpdate
              );
            } catch (y) {
              jt(
                s,
                s.return,
                y
              );
            }
          }
        l & 64 && Cy(s), l & 512 && Pn(s, s.return);
        break;
      case 3:
        if (qn(t, s), l & 64 && (t = s.updateQueue, t !== null)) {
          if (n = null, s.child !== null)
            switch (s.child.tag) {
              case 27:
              case 5:
                n = s.child.stateNode;
                break;
              case 1:
                n = s.child.stateNode;
            }
          try {
            vg(t, n);
          } catch (y) {
            jt(s, s.return, y);
          }
        }
        break;
      case 27:
        n === null && l & 4 && Ny(s);
      case 26:
      case 5:
        qn(t, s), n === null && l & 4 && Df(s), l & 512 && Pn(s, s.return);
        break;
      case 12:
        qn(t, s);
        break;
      case 31:
        qn(t, s), l & 4 && Yy(t, s);
        break;
      case 13:
        qn(t, s), l & 4 && Iy(t, s), l & 64 && (t = s.memoizedState, t !== null && (t = t.dehydrated, t !== null && (s = FE.bind(
          null,
          s
        ), Rw(t, s))));
        break;
      case 22:
        if (l = s.memoizedState !== null || pe, !l) {
          var f = n !== null && n.memoizedState !== null || Dt;
          n = pe, u = Dt, pe = l, (Dt = f) && !u ? (l = 2, (s.subtreeFlags & 8772) !== 0 && (l |= 1), On(
            t,
            s,
            l
          )) : qn(t, s), pe = n, Dt = u;
        }
        break;
      case 30:
        qn(t, s), l & 512 && Pn(s, s.return);
        break;
      case 7:
        l & 512 && Pn(s, s.return);
      default:
        qn(t, s);
    }
  }
  function $f(t, n) {
    for (t = t.child; t !== null; )
      Py(t, n), t = t.sibling;
  }
  function Py(t, n) {
    switch (t.tag) {
      case 5:
      case 26:
        try {
          var s = t.stateNode;
          if (n) {
            var l = s.style;
            typeof l.setProperty == "function" ? l.setProperty("display", "none", "important") : l.display = "none";
          } else {
            var u = t.stateNode, f = t.memoizedProps.style, y = f != null && f.hasOwnProperty("display") ? f.display : null;
            u.style.display = y == null || typeof y == "boolean" ? "" : ("" + y).trim();
          }
        } catch (E) {
          jt(t, t.return, E);
        }
        Gf(t, n);
        break;
      case 6:
        try {
          t.stateNode.nodeValue = n ? "" : t.memoizedProps, zt = !0;
        } catch (E) {
          jt(t, t.return, E);
        }
        break;
      case 18:
        try {
          var S = t.stateNode;
          n ? jv(S, !0) : jv(t.stateNode, !1);
        } catch (E) {
          jt(t, t.return, E);
        }
        break;
      case 22:
      case 23:
        t.memoizedState === null && $f(t, n);
        break;
      default:
        $f(t, n);
    }
  }
  function Gf(t, n) {
    if (t.subtreeFlags & 67108864)
      for (t = t.child; t !== null; ) {
        t: {
          var s = t, l = n;
          switch (s.tag) {
            case 4:
              Py(s, l);
              break t;
            case 22:
              s.memoizedState === null && Gf(s, l);
              break t;
            default:
              Gf(s, l);
          }
        }
        t = t.sibling;
      }
  }
  function $y(t) {
    var n = t.alternate;
    n !== null && (t.alternate = null, $y(n)), t.child = null, t.deletions = null, t.sibling = null, t.tag === 5 && (n = t.stateNode, n !== null && Cl(n)), t.stateNode = null, t.return = null, t.dependencies = null, t.memoizedProps = null, t.memoizedState = null, t.pendingProps = null, t.stateNode = null, t.updateQueue = null;
  }
  var Yt = null, Ze = !1;
  function wn(t, n, s) {
    for (s = s.child; s !== null; )
      Gy(t, n, s), s = s.sibling;
  }
  function Gy(t, n, s) {
    if (Xe && typeof Xe.onCommitFiberUnmount == "function")
      try {
        Xe.onCommitFiberUnmount(Fa, s);
      } catch {
      }
    switch (s.tag) {
      case 26:
        Dt || Te(s, n), wn(
          t,
          n,
          s
        ), s.memoizedState ? s.memoizedState.count-- : s.stateNode && !Dt && (s = s.stateNode, s.parentNode.removeChild(s));
        break;
      case 27:
        Dt || Te(s, n), Ar(s);
        var l = Yt, u = Ze;
        qi(s.type) && (Yt = s.stateNode, Ze = !1), wn(
          t,
          n,
          s
        ), Xv(
          s.stateNode,
          s.type,
          s.memoizedProps
        ), Yt = l, Ze = u;
        break;
      case 5:
        Dt || Te(s, n), Ar(s);
      case 6:
        if (s.tag === 6 && Ar(s), l = Yt, u = Ze, Yt = null, wn(
          t,
          n,
          s
        ), Yt = l, Ze = u, Yt !== null)
          if (Ze)
            try {
              (Yt.nodeType === 9 ? Yt.body : Yt.nodeName === "HTML" ? Yt.ownerDocument.body : Yt).removeChild(s.stateNode), zt = !0;
            } catch (f) {
              jt(
                s,
                n,
                f
              );
            }
          else
            try {
              Yt.removeChild(s.stateNode), zt = !0;
            } catch (f) {
              jt(
                s,
                n,
                f
              );
            }
        break;
      case 18:
        Yt !== null && (Ze ? (t = Yt, Nv(
          t.nodeType === 9 ? t.body : t.nodeName === "HTML" ? t.ownerDocument.body : t,
          s.stateNode
        ), Da(t)) : Nv(Yt, s.stateNode));
        break;
      case 4:
        l = Yt, u = Ze, Yt = s.stateNode.containerInfo, Ze = !0, wn(
          t,
          n,
          s
        ), Yt = l, Ze = u;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        Zi(2, s, n), Dt || Zi(4, s, n), wn(
          t,
          n,
          s
        );
        break;
      case 1:
        Dt || (Te(s, n), l = s.stateNode, typeof l.componentWillUnmount == "function" && My(
          s,
          n,
          l
        )), wn(
          t,
          n,
          s
        );
        break;
      case 21:
        wn(
          t,
          n,
          s
        );
        break;
      case 22:
        Dt = (l = Dt) || s.memoizedState !== null, wn(
          t,
          n,
          s
        ), Dt = l;
        break;
      case 30:
        Te(s, n), wn(
          t,
          n,
          s
        );
        break;
      case 7:
        Dt || Te(s, n), wn(
          t,
          n,
          s
        );
        break;
      default:
        wn(
          t,
          n,
          s
        );
    }
  }
  function Yy(t, n) {
    if (n.memoizedState === null && (t = n.alternate, t !== null && (t = t.memoizedState, t !== null))) {
      t = t.dehydrated;
      try {
        Da(t);
      } catch (s) {
        jt(n, n.return, s);
      }
    }
  }
  function Iy(t, n) {
    if (n.memoizedState === null && (t = n.alternate, t !== null && (t = t.memoizedState, t !== null && (t = t.dehydrated, t !== null))))
      try {
        Da(t);
      } catch (s) {
        jt(n, n.return, s);
      }
  }
  function BE(t) {
    switch (t.tag) {
      case 31:
      case 13:
      case 19:
        var n = t.stateNode;
        return n === null && (n = t.stateNode = new Zy()), n;
      case 22:
        return t = t.stateNode, n = t._retryCache, n === null && (n = t._retryCache = new Zy()), n;
      default:
        throw Error(r(435, t.tag));
    }
  }
  function Ao(t, n) {
    var s = BE(t);
    n.forEach(function(l) {
      if (!s.has(l)) {
        s.add(l);
        var u = QE.bind(null, t, l);
        l.then(u, u);
      }
    });
  }
  function De(t, n, s) {
    var l = n.deletions;
    if (l !== null)
      for (var u = 0; u < l.length; u++) {
        var f = l[u], y = t, S = n, E = S;
        t: for (; E !== null; ) {
          switch (E.tag) {
            case 27:
              if (qi(E.type)) {
                Yt = E.stateNode, Ze = !1;
                break t;
              }
              break;
            case 5:
              Yt = E.stateNode, Ze = !1;
              break t;
            case 3:
            case 4:
              Yt = E.stateNode.containerInfo, Ze = !0;
              break t;
          }
          E = E.return;
        }
        if (Yt === null) throw Error(r(160));
        Gy(y, S, f), Yt = null, Ze = !1, y = f.alternate, y !== null && (y.return = null), f.return = null;
      }
    if (n.subtreeFlags & 13886)
      for (n = n.child; n !== null; )
        qy(n, t, s), n = n.sibling;
  }
  var An = null;
  function qy(t, n, s) {
    var l = t.alternate, u = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (u & 4 && (l = t.updateQueue, l = l !== null ? l.events : null, l !== null))
          for (var f = 0; f < l.length; f++) {
            var y = l[f];
            y.ref.impl = y.nextImpl;
          }
        De(n, t, s), Ne(t), u & 4 && (Zi(3, t, t.return), wr(3, t), Zi(5, t, t.return));
        break;
      case 1:
        De(n, t, s), Ne(t), u & 512 && (Dt || l === null || Te(l, l.return)), u & 64 && pe && (t = t.updateQueue, t !== null && (n = t.callbacks, n !== null && (s = t.shared.hiddenCallbacks, t.shared.hiddenCallbacks = s === null ? n : s.concat(n))));
        break;
      case 26:
        if (f = An, De(n, t, s), Ne(t), u & 512 && (Dt || l === null || Te(l, l.return)), u & 4)
          if (u = l !== null ? l.memoizedState : null, s = t.memoizedState, l === null)
            if (s === null)
              if (t.stateNode === null)
                if (pe)
                  t.stateNode = Mv(
                    t.type,
                    t.memoizedProps,
                    n.containerInfo,
                    t
                  );
                else {
                  t: {
                    n = t.type, s = t.memoizedProps, u = f.ownerDocument || f;
                    e: switch (n) {
                      case "title":
                        l = u.getElementsByTagName("title")[0], (!l || l[Wa] || l[ve] || l.namespaceURI === "http://www.w3.org/2000/svg" || l.hasAttribute("itemprop")) && (l = u.createElement(n), u.head.insertBefore(
                          l,
                          u.querySelector("head > title")
                        )), xe(l, n, s), l[ve] = t, de(l), n = l;
                        break t;
                      case "link":
                        if (f = t0(
                          "link",
                          "href",
                          u
                        ).get(n + (s.href || ""))) {
                          for (y = 0; y < f.length; y++)
                            if (l = f[y], l.getAttribute("href") === (s.href == null || s.href === "" ? null : s.href) && l.getAttribute("rel") === (s.rel == null ? null : s.rel) && l.getAttribute("title") === (s.title == null ? null : s.title) && l.getAttribute("crossorigin") === (s.crossOrigin == null ? null : s.crossOrigin)) {
                              f.splice(y, 1);
                              break e;
                            }
                        }
                        l = u.createElement(n), xe(l, n, s), u.head.appendChild(l);
                        break;
                      case "meta":
                        if (f = t0(
                          "meta",
                          "content",
                          u
                        ).get(n + (s.content || ""))) {
                          for (y = 0; y < f.length; y++)
                            if (l = f[y], l.getAttribute("content") === (s.content == null ? null : "" + s.content) && l.getAttribute("name") === (s.name == null ? null : s.name) && l.getAttribute("property") === (s.property == null ? null : s.property) && l.getAttribute("http-equiv") === (s.httpEquiv == null ? null : s.httpEquiv) && l.getAttribute("charset") === (s.charSet == null ? null : s.charSet)) {
                              f.splice(y, 1);
                              break e;
                            }
                        }
                        l = u.createElement(n), xe(l, n, s), u.head.appendChild(l);
                        break;
                      default:
                        throw Error(r(468, n));
                    }
                    l[ve] = t, de(l), n = l;
                  }
                  t.stateNode = n;
                }
              else
                pe || zh(f, t.type, t.stateNode);
            else
              t.stateNode = Wv(
                f,
                s,
                t.memoizedProps
              );
          else
            u !== s ? (u === null ? (n = l.stateNode, n === null || Dt || n.parentNode.removeChild(n)) : u.count--, s === null ? pe || zh(f, t.type, t.stateNode) : Wv(f, s, t.memoizedProps)) : s === null && t.stateNode !== null && Nf(
              t,
              t.memoizedProps,
              l.memoizedProps
            );
        break;
      case 27:
        De(n, t, s), Ne(t), u & 512 && (Dt || l === null || Te(l, l.return)), l !== null && u & 4 && Nf(
          t,
          t.memoizedProps,
          l.memoizedProps
        );
        break;
      case 5:
        if (f = Yn, Yn = !1, De(n, t, s), Yn = f, Ne(t), u & 512 && (Dt || l === null || Te(l, l.return)), t.flags & 32) {
          n = t.stateNode;
          try {
            Ks(n, ""), zt = !0;
          } catch (U) {
            jt(t, t.return, U);
          }
        }
        u & 4 && t.stateNode != null && (n = t.memoizedProps, Nf(
          t,
          n,
          l !== null ? l.memoizedProps : n
        )), u & 1024 && (Hf = !0);
        break;
      case 6:
        if (De(n, t, s), Ne(t), u & 4) {
          if (t.stateNode === null)
            throw Error(r(162));
          n = t.memoizedProps, s = t.stateNode;
          try {
            s.nodeValue = n, zt = !0;
          } catch (U) {
            jt(t, t.return, U);
          }
        }
        break;
      case 3:
        if (zt = !1, Ho = null, f = An, An = Lr(n.containerInfo), De(n, t, s), An = f, Ne(t), u & 4 && l !== null && l.memoizedState.isDehydrated)
          try {
            Da(n.containerInfo);
          } catch (U) {
            jt(t, t.return, U);
          }
        Hf && (Hf = !1, Xy(t)), zt = !1;
        break;
      case 4:
        u = Yn, Yn = pe, l = mp(), f = An, An = Lr(
          t.stateNode.containerInfo
        ), De(n, t, s), Ne(t), An = f, zt && Or && (Eo = !0), zt = l, Yn = u;
        break;
      case 12:
        De(n, t, s), Ne(t);
        break;
      case 31:
        De(n, t, s), Ne(t), u & 4 && (n = t.updateQueue, n !== null && (t.updateQueue = null, Ao(t, n)));
        break;
      case 13:
        De(n, t, s), Ne(t), t.child.flags & 8192 && t.memoizedState !== null != (l !== null && l.memoizedState !== null) && (Co = qe()), u & 4 && (n = t.updateQueue, n !== null && (t.updateQueue = null, Ao(t, n)));
        break;
      case 22:
        f = t.memoizedState !== null, y = l !== null && l.memoizedState !== null;
        var S = pe, E = Dt, R = Yn;
        pe = S || f, Yn = R || f, Dt = E || y, De(n, t, s), Dt = E, Yn = R, pe = S, Ne(t), u & 8192 && (n = t.stateNode, n._visibility = f ? n._visibility & -2 : n._visibility | 1, !f || l === null || y || pe || Dt || (n = y || Dt, s = pe, l = Dt, pe = f || pe, Dt = n, Hi(t, 2), pe = s, Dt = l), !f && Yn || $f(t, f)), u & 4 && (n = t.updateQueue, n !== null && (s = n.retryQueue, s !== null && (n.retryQueue = null, Ao(t, s))));
        break;
      case 19:
        De(n, t, s), Ne(t), u & 4 && (n = t.updateQueue, n !== null && (t.updateQueue = null, Ao(t, n)));
        break;
      case 30:
        u & 512 && (Dt || l === null || Te(l, l.return)), u = mp(), f = Or, y = (s & 335544064) === s, S = t.memoizedProps, Or = y && oi(
          S.default,
          S.update
        ) !== "none", De(n, t, s), Ne(t), y && l !== null && zt && (t.flags |= 4), Or = f, zt = u;
        break;
      case 21:
        break;
      case 7:
        u & 512 && (Dt || l === null || Te(l, l.return)), l && l.stateNode !== null && (l.stateNode._fragmentFiber = t);
      default:
        De(n, t, s), Ne(t);
    }
  }
  function Ne(t) {
    var n = t.flags;
    if (n & 2) {
      try {
        for (var s, l = t.return; l !== null; ) {
          if (Dy(l)) {
            s = l;
            break;
          }
          l = l.return;
        }
        l = null;
        for (var u = t.return; u !== null; ) {
          if (Rf(u)) {
            var f = u.stateNode;
            l === null ? l = [f] : l.push(f);
          }
          if (Mf(u)) break;
          u = u.return;
        }
        var y = l;
        if (s == null) throw Error(r(160));
        switch (s.tag) {
          case 27:
            var S = s.stateNode, E = jf(t);
            So(
              t,
              E,
              S,
              y
            );
            break;
          case 5:
            var R = s.stateNode;
            s.flags & 32 && (Ks(R, ""), s.flags &= -33);
            var U = jf(t);
            So(
              t,
              U,
              R,
              y
            );
            break;
          case 3:
          case 4:
            var H = s.stateNode.containerInfo, C = jf(t);
            Vf(
              t,
              C,
              H,
              y
            );
            break;
          default:
            throw Error(r(161));
        }
      } catch (L) {
        jt(t, t.return, L);
      }
      t.flags &= -3;
    }
    n & 4096 && (t.flags &= -4097);
  }
  function Xy(t) {
    if (t.subtreeFlags & 1024)
      for (t = t.child; t !== null; ) {
        var n = t;
        Xy(n), n.tag === 5 && n.flags & 1024 && (n = n.stateNode, Ra = !0, n.reset(), Ra = !1), t = t.sibling;
      }
  }
  function ma(t, n) {
    if (n.subtreeFlags & 9270)
      for (n = n.child; n !== null; )
        Ky(n, t), n = n.sibling;
    else By(n);
  }
  function Ky(t, n) {
    var s = t.alternate;
    if (s === null) Lf(t, !1);
    else
      switch (t.tag) {
        case 3:
          if (Pf = In = !1, Vy(), ma(n, t), !In && !Eo) {
            if (t = $n, t !== null)
              for (var l = 0; l < t.length; l += 3) {
                s = t[l];
                var u = t[l + 1];
                Lv(s, t[l + 2]), s = s.ownerDocument.documentElement, s !== null && s.animate(
                  { opacity: [0, 0], pointerEvents: ["none", "none"] },
                  {
                    duration: 0,
                    fill: "forwards",
                    pseudoElement: "::view-transition-group(" + u + ")"
                  }
                );
              }
            t = n.containerInfo, t = t.nodeType === 9 ? t.documentElement : t.ownerDocument.documentElement, t !== null && t.style.viewTransitionName === "" && (t.style.viewTransitionName = "none", t.animate(
              { opacity: [0, 0], pointerEvents: ["none", "none"] },
              {
                duration: 0,
                fill: "forwards",
                pseudoElement: "::view-transition-group(root)"
              }
            ), t.animate(
              { width: [0, 0], height: [0, 0] },
              {
                duration: 0,
                fill: "forwards",
                pseudoElement: "::view-transition"
              }
            )), Pf = !0;
          }
          $n = null;
          break;
        case 5:
          ma(n, t);
          break;
        case 4:
          l = In, In = !1, ma(n, t), In && (Eo = !0), In = l;
          break;
        case 22:
          t.memoizedState === null && (s.memoizedState !== null ? Lf(t, !1) : ma(n, t));
          break;
        case 30:
          l = In, u = Vy(), In = !1, ma(n, t), In && (t.flags |= 4);
          var f = t.memoizedProps, y = t.stateNode;
          n = li(f, y), y = li(s.memoizedProps, y);
          var S = oi(f.default, f.update);
          S === "none" ? n = !1 : (f = s.memoizedState, s.memoizedState = null, s = t.child, Be = 0, n = Zf(
            t,
            s,
            n,
            y,
            S,
            f,
            !0
          ), Be !== (f === null ? 0 : f.length) && (t.flags |= 32)), (t.flags & 4) !== 0 && n ? (_a(
            t,
            t.memoizedProps.onUpdate
          ), $n = u) : u !== null && (u.push.apply(u, $n), $n = u), In = (t.flags & 32) !== 0 ? !0 : l;
          break;
        default:
          ma(n, t);
      }
  }
  function qn(t, n) {
    if (n.subtreeFlags & 8772)
      for (n = n.child; n !== null; )
        Hy(t, n.alternate, n), n = n.sibling;
  }
  function Hi(t, n) {
    for (t = t.child; t !== null; ) {
      var s = t, l = n;
      switch (s.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          Zi(4, s, s.return), Hi(
            s,
            l
          );
          break;
        case 1:
          Te(s, s.return);
          var u = s.stateNode;
          typeof u.componentWillUnmount == "function" && My(
            s,
            s.return,
            u
          ), Hi(
            s,
            l
          );
          break;
        case 27:
          (l & 2) !== 0 && Xv(
            s.stateNode,
            s.type,
            s.memoizedProps
          );
        case 5:
          Te(s, s.return), s.tag !== 5 && s.tag !== 27 || Ar(s), Hi(
            s,
            l
          );
          break;
        case 6:
          Ar(s);
          break;
        case 26:
          Te(s, s.return), u = s.stateNode, s.memoizedState !== null || u === null || Dt || u.parentNode.removeChild(u), Hi(
            s,
            l
          );
          break;
        case 22:
          s.memoizedState === null && Hi(
            s,
            l
          );
          break;
        case 30:
          Te(s, s.return), Hi(
            s,
            l
          );
          break;
        case 7:
          Te(s, s.return);
        default:
          Hi(
            s,
            l
          );
      }
      t = t.sibling;
    }
  }
  function On(t, n, s) {
    for (s = (n.subtreeFlags & 8772) !== 0 ? s : s & -2, n = n.child; n !== null; ) {
      var l = n.alternate, u = t, f = n, y = f.flags, S = (s & 1) !== 0;
      switch (f.tag) {
        case 0:
        case 11:
        case 15:
          On(
            u,
            f,
            s
          ), wr(4, f);
          break;
        case 1:
          if (On(
            u,
            f,
            s
          ), l = f, u = l.stateNode, typeof u.componentDidMount == "function")
            try {
              u.componentDidMount();
            } catch (U) {
              jt(l, l.return, U);
            }
          if (l = f, u = l.updateQueue, u !== null) {
            var E = l.stateNode;
            try {
              var R = u.shared.hiddenCallbacks;
              if (R !== null)
                for (u.shared.hiddenCallbacks = null, u = 0; u < R.length; u++)
                  yg(R[u], E);
            } catch (U) {
              jt(l, l.return, U);
            }
          }
          S && y & 64 && Cy(f), Pn(f, f.return);
          break;
        case 27:
          (s & 2) !== 0 && Ny(f);
        case 5:
          f.tag !== 5 && f.tag !== 27 || Ry(f), On(
            u,
            f,
            s
          ), S && l === null && y & 4 && Df(f), Pn(f, f.return);
          break;
        case 6:
          Ry(f);
          break;
        case 26:
          E = f.stateNode, f.memoizedState !== null || E === null || pe || zh(
            Lr(E.ownerDocument),
            f.type,
            E
          ), On(
            u,
            f,
            s
          ), S && l === null && y & 4 && Df(f), Pn(f, f.return);
          break;
        case 12:
          On(
            u,
            f,
            s
          );
          break;
        case 31:
          On(
            u,
            f,
            s
          ), S && y & 4 && Yy(u, f);
          break;
        case 13:
          On(
            u,
            f,
            s
          ), S && y & 4 && Iy(u, f);
          break;
        case 22:
          f.memoizedState === null && On(
            u,
            f,
            s
          ), Pn(f, f.return);
          break;
        case 30:
          On(
            u,
            f,
            s
          ), Pn(f, f.return);
          break;
        case 7:
          Pn(f, f.return);
        default:
          On(
            u,
            f,
            s
          );
      }
      n = n.sibling;
    }
  }
  function Yf(t, n) {
    var s = null;
    t !== null && t.memoizedState !== null && t.memoizedState.cachePool !== null && (s = t.memoizedState.cachePool.pool), t = null, n.memoizedState !== null && n.memoizedState.cachePool !== null && (t = n.memoizedState.cachePool.pool), t !== s && (t != null && t.refCount++, s != null && hr(s));
  }
  function If(t, n) {
    t = null, n.alternate !== null && (t = n.alternate.memoizedState.cache), n = n.memoizedState.cache, n !== t && (n.refCount++, t != null && hr(t));
  }
  function mn(t, n, s, l) {
    var u = (s & 335544064) === s;
    if (n.subtreeFlags & (u ? 10262 : 10256))
      for (n = n.child; n !== null; )
        Fy(
          t,
          n,
          s,
          l
        ), n = n.sibling;
    else u && ky(n);
  }
  function Fy(t, n, s, l) {
    var u = (s & 335544064) === s;
    u && n.alternate === null && n.return !== null && n.return.alternate !== null && xo(n);
    var f = n.flags;
    switch (n.tag) {
      case 0:
      case 11:
      case 15:
        mn(
          t,
          n,
          s,
          l
        ), f & 2048 && wr(9, n);
        break;
      case 1:
        mn(
          t,
          n,
          s,
          l
        );
        break;
      case 3:
        mn(
          t,
          n,
          s,
          l
        ), u && Pf && (t = t.containerInfo, t = t.nodeType === 9 ? t.body : t.nodeName === "HTML" ? t.ownerDocument.body : t, t.style.viewTransitionName === "root" && (t.style.viewTransitionName = ""), t = t.ownerDocument.documentElement, t !== null && t.style.viewTransitionName === "none" && (t.style.viewTransitionName = "")), f & 2048 && (f = null, n.alternate !== null && (f = n.alternate.memoizedState.cache), n = n.memoizedState.cache, n !== f && (n.refCount++, f != null && hr(f)));
        break;
      case 12:
        if (f & 2048) {
          mn(
            t,
            n,
            s,
            l
          ), f = n.stateNode;
          try {
            var y = n.memoizedProps, S = y.id, E = y.onPostCommit;
            typeof E == "function" && E(
              S,
              n.alternate === null ? "mount" : "update",
              f.passiveEffectDuration,
              -0
            );
          } catch (R) {
            jt(n, n.return, R);
          }
        } else
          mn(
            t,
            n,
            s,
            l
          );
        break;
      case 31:
        mn(
          t,
          n,
          s,
          l
        );
        break;
      case 13:
        mn(
          t,
          n,
          s,
          l
        );
        break;
      case 23:
        break;
      case 22:
        y = n.stateNode, S = n.alternate, n.memoizedState !== null ? (u && S !== null && S.memoizedState === null && xo(S), y._visibility & 2 ? mn(
          t,
          n,
          s,
          l
        ) : zr(
          t,
          n
        )) : (u && S !== null && S.memoizedState !== null && xo(n), y._visibility & 2 ? mn(
          t,
          n,
          s,
          l
        ) : (y._visibility |= 2, pa(
          t,
          n,
          s,
          l,
          (n.subtreeFlags & 10256) !== 0 || !1
        ))), f & 2048 && Yf(S, n);
        break;
      case 24:
        mn(
          t,
          n,
          s,
          l
        ), f & 2048 && If(n.alternate, n);
        break;
      case 30:
        u && (f = n.alternate, f !== null && (Gn(f.child, !0), Gn(n.child, !0))), mn(
          t,
          n,
          s,
          l
        );
        break;
      default:
        mn(
          t,
          n,
          s,
          l
        );
    }
  }
  function pa(t, n, s, l, u) {
    for (u = u && ((n.subtreeFlags & 10256) !== 0 || !1), n = n.child; n !== null; ) {
      var f = t, y = n, S = s, E = l, R = y.flags;
      switch (y.tag) {
        case 0:
        case 11:
        case 15:
          pa(
            f,
            y,
            S,
            E,
            u
          ), wr(8, y);
          break;
        case 23:
          break;
        case 22:
          var U = y.stateNode;
          y.memoizedState !== null ? U._visibility & 2 ? pa(
            f,
            y,
            S,
            E,
            u
          ) : zr(
            f,
            y
          ) : (U._visibility |= 2, pa(
            f,
            y,
            S,
            E,
            u
          )), u && R & 2048 && Yf(
            y.alternate,
            y
          );
          break;
        case 24:
          pa(
            f,
            y,
            S,
            E,
            u
          ), u && R & 2048 && If(y.alternate, y);
          break;
        default:
          pa(
            f,
            y,
            S,
            E,
            u
          );
      }
      n = n.sibling;
    }
  }
  function zr(t, n) {
    if (n.subtreeFlags & 10256)
      for (n = n.child; n !== null; ) {
        var s = t, l = n, u = l.flags;
        switch (l.tag) {
          case 22:
            zr(s, l), u & 2048 && Yf(
              l.alternate,
              l
            );
            break;
          case 24:
            zr(s, l), u & 2048 && If(l.alternate, l);
            break;
          default:
            zr(s, l);
        }
        n = n.sibling;
      }
  }
  var As = 8192;
  function Os(t, n, s) {
    if (t.subtreeFlags & As)
      for (t = t.child; t !== null; )
        Qy(
          t,
          n,
          s
        ), t = t.sibling;
  }
  function Qy(t, n, s) {
    switch (t.tag) {
      case 26:
        Os(
          t,
          n,
          s
        ), t.flags & As && (t.memoizedState !== null ? Yw(
          s,
          An,
          t.memoizedState,
          t.memoizedProps
        ) : (t = t.stateNode, (n & 335544128) === n && s0(s, t)));
        break;
      case 5:
        Os(
          t,
          n,
          s
        ), t.flags & As && (t = t.stateNode, (n & 335544128) === n && s0(s, t));
        break;
      case 3:
      case 4:
        var l = An;
        An = Lr(t.stateNode.containerInfo), Os(
          t,
          n,
          s
        ), An = l;
        break;
      case 22:
        t.memoizedState === null && (l = t.alternate, l !== null && l.memoizedState !== null ? (l = As, As = 16777216, Os(
          t,
          n,
          s
        ), As = l) : Os(
          t,
          n,
          s
        ));
        break;
      case 30:
        if ((t.flags & As) !== 0 && (l = t.memoizedProps.name, l != null && l !== "auto")) {
          var u = t.stateNode;
          u.paired = null, We === null && (We = /* @__PURE__ */ new Map()), We.set(l, u);
        }
        Os(
          t,
          n,
          s
        );
        break;
      default:
        Os(
          t,
          n,
          s
        );
    }
  }
  function Jy(t) {
    var n = t.alternate;
    if (n !== null && (t = n.child, t !== null)) {
      n.child = null;
      do
        n = t.sibling, t.sibling = null, t = n;
      while (t !== null);
    }
  }
  function Cr(t) {
    var n = t.deletions;
    if ((t.flags & 16) !== 0) {
      if (n !== null)
        for (var s = 0; s < n.length; s++) {
          var l = n[s];
          ge = l, tv(
            l,
            t
          );
        }
      Jy(t);
    }
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; )
        Wy(t), t = t.sibling;
  }
  function Wy(t) {
    switch (t.tag) {
      case 0:
      case 11:
      case 15:
        Cr(t), t.flags & 2048 && Zi(9, t, t.return);
        break;
      case 3:
        Cr(t);
        break;
      case 12:
        Cr(t);
        break;
      case 22:
        var n = t.stateNode;
        t.memoizedState !== null && n._visibility & 2 && (t.return === null || t.return.tag !== 13) ? (n._visibility &= -3, Oo(t)) : Cr(t);
        break;
      default:
        Cr(t);
    }
  }
  function Oo(t) {
    var n = t.deletions;
    if ((t.flags & 16) !== 0) {
      if (n !== null)
        for (var s = 0; s < n.length; s++) {
          var l = n[s];
          ge = l, tv(
            l,
            t
          );
        }
      Jy(t);
    }
    for (t = t.child; t !== null; ) {
      switch (n = t, n.tag) {
        case 0:
        case 11:
        case 15:
          Zi(8, n, n.return), Oo(n);
          break;
        case 22:
          s = n.stateNode, s._visibility & 2 && (s._visibility &= -3, Oo(n));
          break;
        default:
          Oo(n);
      }
      t = t.sibling;
    }
  }
  function tv(t, n) {
    for (; ge !== null; ) {
      var s = ge;
      switch (s.tag) {
        case 0:
        case 11:
        case 15:
          Zi(8, s, n);
          break;
        case 23:
        case 22:
          if (s.memoizedState !== null && s.memoizedState.cachePool !== null) {
            var l = s.memoizedState.cachePool.pool;
            l != null && l.refCount++;
          }
          break;
        case 24:
          hr(s.memoizedState.cache);
      }
      if (l = s.child, l !== null) l.return = s, ge = l;
      else
        t: for (s = t; ge !== null; ) {
          l = ge;
          var u = l.sibling, f = l.return;
          if ($y(l), l === s) {
            ge = null;
            break t;
          }
          if (u !== null) {
            u.return = f, ge = u;
            break t;
          }
          ge = f;
        }
    }
  }
  var ZE = {
    getCacheForType: function(t) {
      var n = be(ne), s = n.data.get(t);
      return s === void 0 && (s = t(), n.data.set(t, s)), s;
    },
    cacheSignal: function() {
      return be(ne).controller.signal;
    }
  }, HE = typeof WeakMap == "function" ? WeakMap : Map, Mt = 0, kt = null, St = null, Tt = 0, Nt = 0, tn = null, Pi = !1, ga = !1, qf = !1, yi = 0, Qt = 0, $i = 0, zs = 0, zo = 0, en = 0, ya = 0, Mr = null, He = null, Xf = !1, Co = 0, ev = 0, Mo = 1 / 0, Ro = null, Gi = null, Xt = 0, zn = null, Cs = null, Xn = 0, Kf = 0, Ff = null, nv = null, va = null, ba = null, Sa = null, Rr = 0, Do = null;
  function nn() {
    return (Mt & 2) !== 0 && Tt !== 0 ? Tt & -Tt : rt.T !== null ? rh() : ap();
  }
  function iv() {
    if (en === 0)
      if ((Tt & 536870912) === 0 || yt) {
        var t = wl;
        wl <<= 1, (wl & 3932160) === 0 && (wl = 262144), en = t;
      } else en = 536870912;
    return t = Se.current, t !== null && (t.flags |= 32), en;
  }
  function _a(t, n) {
    if (n != null) {
      var s = t.stateNode, l = s.ref;
      l === null && (l = s.ref = Uv(
        li(t.memoizedProps, s)
      )), ba === null && (ba = []), ba.push(n.bind(null, l));
    }
  }
  function Pe(t, n, s) {
    (t === kt && (Nt === 2 || Nt === 9) || t.cancelPendingCommit !== null) && (Ta(t, 0), Yi(
      t,
      Tt,
      en,
      !1
    )), Ja(t, s), ((Mt & 2) === 0 || t !== kt) && (t === kt && ((Mt & 2) === 0 && (zs |= s), Qt === 4 && Yi(
      t,
      Tt,
      en,
      !1
    )), Kn(t));
  }
  function sv(t, n, s) {
    if ((Mt & 6) !== 0) throw Error(r(327));
    var l = !s && (n & 127) === 0 && (n & t.expiredLanes) === 0 || Qa(t, n), u = l ? GE(t, n) : Jf(t, n, !0), f = l;
    do {
      if (u === 0) {
        ga && !l && Yi(t, n, 0, !1);
        break;
      } else {
        if (s = t.current.alternate, f && !PE(s)) {
          u = Jf(t, n, !1), f = !1;
          continue;
        }
        if (u === 2) {
          if (f = n, t.errorRecoveryDisabledLanes & f)
            var y = 0;
          else
            y = t.pendingLanes & -536870913, y = y !== 0 ? y : y & 536870912 ? 536870912 : 0;
          if (y !== 0) {
            n = y;
            t: {
              var S = t;
              u = Mr;
              var E = S.current.memoizedState.isDehydrated;
              if (E && (Ta(S, y).flags |= 256), y = Jf(
                S,
                y,
                !1
              ), y !== 2 && y !== 6) {
                if (qf && !E) {
                  S.errorRecoveryDisabledLanes |= f, zs |= f, u = 4;
                  break t;
                }
                f = He, He = u, f !== null && (He === null ? He = f : He.push.apply(
                  He,
                  f
                ));
              }
              u = y;
            }
            if (f = !1, u !== 2) continue;
          }
        }
        if (u === 1) {
          Ta(t, 0), Yi(t, n, 0, !0);
          break;
        }
        t: {
          switch (l = t, f = u, f) {
            case 0:
            case 1:
              throw Error(r(345));
            case 4:
              if ((n & 4194048) !== n && (n & 62914560) !== n)
                break;
            case 6:
              Yi(
                l,
                n,
                en,
                !Pi
              );
              break t;
            case 2:
              He = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(r(329));
          }
          if ((n & 62914560) === n && (u = Co + 300 - qe(), 10 < u)) {
            if (Yi(
              l,
              n,
              en,
              !Pi
            ), Ol(l, 0, !0) !== 0) break t;
            Xn = n, l.timeoutHandle = yh(
              av.bind(
                null,
                l,
                s,
                He,
                Ro,
                Xf,
                n,
                en,
                zs,
                ya,
                Pi,
                f,
                "Throttled",
                -0,
                0
              ),
              u
            );
            break t;
          }
          av(
            l,
            s,
            He,
            Ro,
            Xf,
            n,
            en,
            zs,
            ya,
            Pi,
            f,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (!0);
    Kn(t);
  }
  function av(t, n, s, l, u, f, y, S, E, R, U, H, C, L) {
    t.timeoutHandle = -1;
    var F = n.subtreeFlags, et = (f & 335544064) === f;
    if (H = null, (et || F & 8192 || (F & 16785408) === 16785408) && (H = {
      stylesheets: null,
      count: 0,
      imgCount: 0,
      imgBytes: 0,
      suspenseyImages: [],
      waitingForImages: !0,
      waitingForViewTransition: !1,
      unsuspend: Bn
    }, We = null, Qy(
      n,
      f,
      H
    ), et && (F = H, et = t.containerInfo, et = (et.nodeType === 9 ? et : et.ownerDocument).__reactViewTransition, et != null && (F.count++, F.waitingForViewTransition = !0, F = Br.bind(F), et.finished.then(F, F))), F = (f & 62914560) === f ? Co - qe() : (f & 4194048) === f ? ev - qe() : 0, F = Iw(
      H,
      F
    ), F !== null)) {
      Xn = f, t.cancelPendingCommit = F(
        dv.bind(
          null,
          t,
          n,
          f,
          s,
          l,
          u,
          y,
          S,
          E,
          R,
          U,
          H,
          null,
          C,
          L
        )
      ), Yi(t, f, y, !R);
      return;
    }
    dv(
      t,
      n,
      f,
      s,
      l,
      u,
      y,
      S,
      E,
      R,
      U,
      H
    );
  }
  function PE(t) {
    for (var n = t; ; ) {
      var s = n.tag;
      if ((s === 0 || s === 11 || s === 15) && n.flags & 16384 && (s = n.updateQueue, s !== null && (s = s.stores, s !== null)))
        for (var l = 0; l < s.length; l++) {
          var u = s[l], f = u.getSnapshot;
          u = u.value;
          try {
            if (!Qe(f(), u)) return !1;
          } catch {
            return !1;
          }
        }
      if (s = n.child, n.subtreeFlags & 16384 && s !== null)
        s.return = n, n = s;
      else {
        if (n === t) break;
        for (; n.sibling === null; ) {
          if (n.return === null || n.return === t) return !0;
          n = n.return;
        }
        n.sibling.return = n.return, n = n.sibling;
      }
    }
    return !0;
  }
  function Yi(t, n, s, l) {
    n = tp(t, n), n &= ~zo, n &= ~zs, t.suspendedLanes |= n, t.pingedLanes &= ~n, l && (t.warmLanes |= n), l = t.expirationTimes;
    for (var u = n; 0 < u; ) {
      var f = 31 - Ke(u), y = 1 << f;
      l[f] = -1, u &= ~y;
    }
    s !== 0 && np(t, s, n);
  }
  function No() {
    return (Mt & 6) === 0 ? (Dr(0), !1) : !0;
  }
  function Qf() {
    if (St !== null) {
      if (Nt === 0)
        var t = St.return;
      else
        t = St, fi = gs = null, af(t), oa = null, pr = 0, t = St;
      for (; t !== null; )
        zy(t.alternate, t), t = t.return;
      St = null;
    }
  }
  function Ta(t, n) {
    var s = t.timeoutHandle;
    return s !== -1 && (t.timeoutHandle = -1, hw(s)), s = t.cancelPendingCommit, s !== null && (t.cancelPendingCommit = null, s()), Xn = 0, Qf(), kt = t, St = s = ui(t.current, null), Tt = n, Nt = 0, tn = null, Pi = !1, ga = Qa(t, n), qf = !1, ya = en = zo = zs = $i = Qt = 0, He = Mr = null, Xf = !1, yi = tp(t, n), Zl(), s;
  }
  function rv(t, n) {
    pt = null, rt.H = fo, n === la || n === Ql ? (n = dg(), Nt = 3) : n === Yc ? (n = dg(), Nt = 4) : Nt = n === Sf ? 8 : n !== null && typeof n == "object" && typeof n.then == "function" ? 6 : 1, tn = n, St === null && (Qt = 1, ho(
      t,
      cn(n, t.current)
    ));
  }
  function lv() {
    var t = Se.current;
    return t === null ? !0 : (Tt & 4194048) === Tt ? Oe === null : (Tt & 62914560) === Tt || (Tt & 536870912) !== 0 ? t === Oe : !1;
  }
  function ov() {
    var t = rt.H;
    return rt.H = fo, t === null ? fo : t;
  }
  function uv() {
    var t = rt.A;
    return rt.A = ZE, t;
  }
  function jo() {
    Qt = 4, Pi || (Tt & 4194048) !== Tt && Se.current !== null || (ga = !0), ($i & 134217727) === 0 && (zs & 134217727) === 0 || kt === null || Yi(
      kt,
      Tt,
      en,
      !1
    );
  }
  function Jf(t, n, s) {
    var l = Mt;
    Mt |= 2;
    var u = ov(), f = uv();
    (kt !== t || Tt !== n) && (Ro = null, Ta(t, n)), n = !1;
    var y = Qt;
    t: do
      try {
        if (Nt !== 0 && St !== null) {
          var S = St, E = tn;
          switch (Nt) {
            case 8:
              Qf(), y = 6;
              break t;
            case 3:
            case 2:
            case 9:
            case 6:
              Se.current === null && (n = !0);
              var R = Nt;
              if (Nt = 0, tn = null, xa(t, S, E, R), s && ga) {
                y = 0;
                break t;
              }
              break;
            default:
              R = Nt, Nt = 0, tn = null, xa(t, S, E, R);
          }
        }
        $E(), y = Qt;
        break;
      } catch (U) {
        rv(t, U);
      }
    while (!0);
    return n && t.shellSuspendCounter++, fi = gs = null, Mt = l, rt.H = u, rt.A = f, St === null && (kt = null, Tt = 0, Zl()), y;
  }
  function $E() {
    for (; St !== null; ) cv(St);
  }
  function GE(t, n) {
    var s = Mt;
    Mt |= 2;
    var l = ov(), u = uv();
    kt !== t || Tt !== n ? (Ro = null, Mo = qe() + 500, Ta(t, n)) : ga = Qa(
      t,
      n
    );
    t: do
      try {
        if (Nt !== 0 && St !== null) {
          n = St;
          var f = tn;
          e: switch (Nt) {
            case 1:
              Nt = 0, tn = null, xa(t, n, f, 1);
              break;
            case 2:
            case 9:
              if (fg(f)) {
                Nt = 0, tn = null, fv(n);
                break;
              }
              n = function() {
                Nt !== 2 && Nt !== 9 || kt !== t || (Nt = 7), Kn(t);
              }, f.then(n, n);
              break t;
            case 3:
              Nt = 7;
              break t;
            case 4:
              Nt = 5;
              break t;
            case 7:
              fg(f) ? (Nt = 0, tn = null, fv(n)) : (Nt = 0, tn = null, xa(t, n, f, 7));
              break;
            case 5:
              var y = null;
              switch (St.tag) {
                case 26:
                  y = St.memoizedState;
                case 5:
                case 27:
                  var S = St;
                  if (y ? n0(y) : S.stateNode.complete) {
                    Nt = 0, tn = null;
                    var E = S.sibling;
                    if (E !== null) St = E;
                    else {
                      var R = S.return;
                      R !== null ? (St = R, Vo(R)) : St = null;
                    }
                    break e;
                  }
              }
              Nt = 0, tn = null, xa(t, n, f, 5);
              break;
            case 6:
              Nt = 0, tn = null, xa(t, n, f, 6);
              break;
            case 8:
              Qf(), Qt = 6;
              break t;
            default:
              throw Error(r(462));
          }
        }
        YE();
        break;
      } catch (U) {
        rv(t, U);
      }
    while (!0);
    return fi = gs = null, rt.H = l, rt.A = u, Mt = s, St !== null ? 0 : (kt = null, Tt = 0, Zl(), Qt);
  }
  function YE() {
    for (; St !== null && !ox(); )
      cv(St);
  }
  function cv(t) {
    var n = Ay(t.alternate, t, yi);
    t.memoizedProps = t.pendingProps, n === null ? Vo(t) : St = n;
  }
  function fv(t) {
    var n = t, s = n.alternate;
    switch (n.tag) {
      case 15:
      case 0:
        n = by(
          s,
          n,
          n.pendingProps,
          n.type,
          void 0,
          Tt
        );
        break;
      case 11:
        n = by(
          s,
          n,
          n.pendingProps,
          n.type.render,
          n.ref,
          Tt
        );
        break;
      case 5:
        af(n);
        var l = n;
        l === me && (yt ? (Il(l), l.tag === 5 && l.stateNode != null && (Ht = l.stateNode)) : (Il(l), yt = !0));
      default:
        zy(s, n), n = St = tg(n, yi), n = Ay(s, n, yi);
    }
    t.memoizedProps = t.pendingProps, n === null ? Vo(t) : St = n;
  }
  function xa(t, n, s, l) {
    fi = gs = null, af(n), oa = null, pr = 0;
    var u = n.return;
    try {
      if (DE(
        t,
        u,
        n,
        s,
        Tt
      )) {
        Qt = 1, ho(
          t,
          cn(s, t.current)
        ), St = null;
        return;
      }
    } catch (f) {
      if (u !== null) throw St = u, f;
      Qt = 1, ho(
        t,
        cn(s, t.current)
      ), St = null;
      return;
    }
    n.flags & 32768 ? (yt || l === 1 ? t = !0 : ga || (Tt & 536870912) !== 0 ? t = !1 : (Pi = t = !0, (l === 2 || l === 9 || l === 3 || l === 6) && (l = Se.current, l !== null && l.tag === 13 && (l.flags |= 16384))), hv(n, t)) : Vo(n);
  }
  function Vo(t) {
    var n = t;
    do {
      if ((n.flags & 32768) !== 0) {
        hv(
          n,
          Pi
        );
        return;
      }
      t = n.return;
      var s = LE(
        n.alternate,
        n,
        yi
      );
      if (s !== null) {
        St = s;
        return;
      }
      if (n = n.sibling, n !== null) {
        St = n;
        return;
      }
      St = n = t;
    } while (n !== null);
    Qt === 0 && (Qt = 5);
  }
  function hv(t, n) {
    do {
      var s = UE(t.alternate, t);
      if (s !== null) {
        s.flags &= 32767, St = s;
        return;
      }
      if (s = t.return, s !== null && (s.flags |= 32768, s.subtreeFlags = 0, s.deletions = null), !n && (t = t.sibling, t !== null)) {
        St = t;
        return;
      }
      St = t = s;
    } while (t !== null);
    Qt = 6, St = null;
  }
  function dv(t, n, s, l, u, f, y, S, E, R, U, H) {
    t.cancelPendingCommit = null;
    do
      Lo();
    while (Xt !== 0);
    if ((Mt & 6) !== 0) throw Error(r(327));
    if (n !== null) {
      if (n === t.current) throw Error(r(177));
      t === kt && (St = kt = null, Tt = 0), Cs = n, zn = t, Xn = s, Ff = u, nv = l, IE(
        t,
        n,
        s,
        y,
        S,
        E,
        H
      );
    }
  }
  function IE(t, n, s, l, u, f, y) {
    var S = n.lanes | n.childLanes;
    if (Kf = S, S |= Dc, vx(
      t,
      s,
      S,
      l,
      u,
      f
    ), ba = null, (s & 335544064) === s ? (Sa = SE(t), l = 10262) : (Sa = null, l = 10256), (n.subtreeFlags & l) !== 0 || (n.flags & l) !== 0 ? (t.callbackNode = null, t.callbackPriority = 0, JE(xl, function() {
      return nh(), null;
    })) : (t.callbackNode = null, t.callbackPriority = 0), _o = !1, l = (n.flags & 13878) !== 0, (n.subtreeFlags & 13878) !== 0 || l) {
      l = rt.T, rt.T = null, u = ht.p, ht.p = 2, f = Mt, Mt |= 4;
      try {
        kE(t, n, s);
      } finally {
        Mt = f, ht.p = u, rt.T = l;
      }
    }
    Xt = 1, _o ? va = vw(
      y,
      t.containerInfo,
      Sa,
      Wf,
      th,
      XE,
      eh,
      nh,
      qE
    ) : (Wf(), th(), eh());
  }
  function qE(t) {
    if (Xt !== 0) {
      var n = zn.onRecoverableError;
      n(t, { componentStack: null });
    }
  }
  function XE() {
    Xt === 3 && (Xt = 0, Ky(Cs, zn), Xt = 4);
  }
  function Wf() {
    if (Xt === 1) {
      Xt = 0;
      var t = zn, n = Cs, s = Xn, l = (n.flags & 13878) !== 0;
      if ((n.subtreeFlags & 13878) !== 0 || l) {
        l = rt.T, rt.T = null;
        var u = ht.p;
        ht.p = 2;
        var f = Mt;
        Mt |= 4;
        try {
          Or = Eo = !1, qy(n, t, s), s = mh;
          var y = Gp(t.containerInfo), S = s.focusedElem, E = s.selectionRange;
          if (y !== S && S && S.ownerDocument && $p(
            S.ownerDocument.documentElement,
            S
          )) {
            if (E !== null && Oc(S)) {
              var R = E.start, U = E.end;
              if (U === void 0 && (U = R), "selectionStart" in S)
                S.selectionStart = R, S.selectionEnd = Math.min(
                  U,
                  S.value.length
                );
              else {
                var H = S.ownerDocument || document, C = H && H.defaultView || window;
                if (C.getSelection) {
                  var L = C.getSelection(), F = S.textContent.length, et = Math.min(E.start, F), gt = E.end === void 0 ? et : Math.min(E.end, F);
                  !L.extend && et > gt && (y = gt, gt = et, et = y);
                  var M = Pp(
                    S,
                    et
                  ), O = Pp(
                    S,
                    gt
                  );
                  if (M && O && (L.rangeCount !== 1 || L.anchorNode !== M.node || L.anchorOffset !== M.offset || L.focusNode !== O.node || L.focusOffset !== O.offset)) {
                    var j = H.createRange();
                    j.setStart(M.node, M.offset), L.removeAllRanges(), et > gt ? (L.addRange(j), L.extend(O.node, O.offset)) : (j.setEnd(O.node, O.offset), L.addRange(j));
                  }
                }
              }
            }
            for (H = [], L = S; L = L.parentNode; )
              L.nodeType === 1 && H.push({
                element: L,
                left: L.scrollLeft,
                top: L.scrollTop
              });
            for (typeof S.focus == "function" && S.focus(), S = 0; S < H.length; S++) {
              var Z = H[S];
              Z.element.scrollLeft = Z.left, Z.element.scrollTop = Z.top;
            }
          }
          Ra = !!dh, mh = dh = null;
        } finally {
          Mt = f, ht.p = u, rt.T = l;
        }
      }
      t.current = n, Xt = 2;
    }
  }
  function th() {
    if (Xt === 2) {
      Xt = 0;
      var t = zn, n = Cs, s = (n.flags & 8772) !== 0;
      if ((n.subtreeFlags & 8772) !== 0 || s) {
        s = rt.T, rt.T = null;
        var l = ht.p;
        ht.p = 2;
        var u = Mt;
        Mt |= 4;
        try {
          Hy(t, n.alternate, n);
        } finally {
          Mt = u, ht.p = l, rt.T = s;
        }
      }
      Xt = 3;
    }
  }
  function eh() {
    if (Xt === 4 || Xt === 3) {
      Xt = 0;
      var t = va;
      va = null, ux();
      var n = zn, s = Cs, l = Xn, u = nv, f = (l & 335544064) === l ? 10262 : 10256;
      if ((s.subtreeFlags & f) !== 0 || (s.flags & f) !== 0 ? Xt = 5 : (Xt = 0, Cs = zn = null, mv(n, n.pendingLanes)), f = n.pendingLanes, f === 0 && (Gi = null), uc(l), s = s.stateNode, Xe && typeof Xe.onCommitFiberRoot == "function")
        try {
          Xe.onCommitFiberRoot(
            Fa,
            s,
            void 0,
            (s.current.flags & 128) === 128
          );
        } catch {
        }
      if (u !== null) {
        s = rt.T, f = ht.p, ht.p = 2, rt.T = null;
        try {
          for (var y = n.onRecoverableError, S = 0; S < u.length; S++) {
            var E = u[S];
            y(E.value, {
              componentStack: E.stack
            });
          }
        } finally {
          rt.T = s, ht.p = f;
        }
      }
      if (u = ba, y = Sa, Sa = null, u !== null && (ba = null, y === null && (y = []), t !== null))
        for (E = 0; E < u.length; E++)
          s = (0, u[E])(
            y
          ), s !== void 0 && t.finished.finally(s);
      (Xn & 3) !== 0 && Lo(), Kn(n), f = n.pendingLanes, (l & 261930) !== 0 && (f & 42) !== 0 ? n === Do ? Rr++ : (Rr = 0, Do = n) : (Rr = 0, Do = null), Dr(0);
    }
  }
  function mv(t, n) {
    (t.pooledCacheLanes &= n) === 0 && (n = t.pooledCache, n != null && (t.pooledCache = null, hr(n)));
  }
  function Lo() {
    return va !== null && (va.skipTransition(), va = null), Wf(), th(), eh(), nh();
  }
  function nh() {
    if (Xt !== 5) return !1;
    var t = zn, n = Kf;
    Kf = 0;
    var s = uc(Xn), l = rt.T, u = ht.p;
    try {
      ht.p = 32 > s ? 32 : s, rt.T = null, s = Ff, Ff = null;
      var f = zn, y = Xn;
      if (Xt = 0, Cs = zn = null, Xn = 0, (Mt & 6) !== 0) throw Error(r(331));
      var S = Mt;
      if (Mt |= 4, Wy(f.current), Fy(
        f,
        f.current,
        y,
        s
      ), Mt = S, Dr(0, !1), Xe && typeof Xe.onPostCommitFiberRoot == "function")
        try {
          Xe.onPostCommitFiberRoot(Fa, f);
        } catch {
        }
      return !0;
    } finally {
      ht.p = u, rt.T = l, mv(t, n);
    }
  }
  function pv(t, n, s) {
    n = cn(s, n), n = bf(t.stateNode, n, 2), t = Li(t, n, 2), t !== null && (Ja(t, 2), Kn(t));
  }
  function jt(t, n, s) {
    if (t.tag === 3)
      pv(t, t, s);
    else
      for (; n !== null; ) {
        if (n.tag === 3) {
          pv(
            n,
            t,
            s
          );
          break;
        } else if (n.tag === 1) {
          var l = n.stateNode;
          if (typeof n.type.getDerivedStateFromError == "function" || typeof l.componentDidCatch == "function" && (Gi === null || !Gi.has(l))) {
            t = cn(s, t), s = fy(2), l = Li(n, s, 2), l !== null && (hy(
              s,
              l,
              n,
              t
            ), Ja(l, 2), Kn(l));
            break;
          }
        }
        n = n.return;
      }
  }
  function ih(t, n, s) {
    var l = t.pingCache;
    if (l === null) {
      l = t.pingCache = new HE();
      var u = /* @__PURE__ */ new Set();
      l.set(n, u);
    } else
      u = l.get(n), u === void 0 && (u = /* @__PURE__ */ new Set(), l.set(n, u));
    u.has(s) || (qf = !0, u.add(s), t = KE.bind(null, t, n, s), n.then(t, t));
  }
  function KE(t, n, s) {
    var l = t.pingCache;
    l !== null && l.delete(n), t.pingedLanes |= t.suspendedLanes & s, t.warmLanes &= ~s, kt === t && (Tt & s) === s && ((Qt === 4 || Qt === 3 && (Tt & 62914560) === Tt && 300 > qe() - Co) && (Mt & 2) === 0 ? Ta(t, 0) : zo |= s, ya === Tt && (ya = 0)), Kn(t);
  }
  function gv(t, n) {
    n === 0 && (n = ep()), t = ds(t, n), t !== null && (Ja(t, n), Kn(t));
  }
  function FE(t) {
    var n = t.memoizedState, s = 0;
    n !== null && (s = n.retryLane), gv(t, s);
  }
  function QE(t, n) {
    var s = 0;
    switch (t.tag) {
      case 31:
      case 13:
        var l = t.stateNode, u = t.memoizedState;
        u !== null && (s = u.retryLane);
        break;
      case 19:
        l = t.stateNode;
        break;
      case 22:
        l = t.stateNode._retryCache;
        break;
      default:
        throw Error(r(314));
    }
    l !== null && l.delete(n), gv(t, s);
  }
  function JE(t, n) {
    return ac(t, n);
  }
  var Ea = null, wa = null, sh = !1, Uo = !1, ah = !1, Ii = 0;
  function Kn(t) {
    t !== wa && t.next === null && (wa === null ? Ea = wa = t : wa = wa.next = t), Uo = !0, sh || (sh = !0, tw());
  }
  function Dr(t, n) {
    if (!ah && Uo) {
      ah = !0;
      do
        for (var s = !1, l = Ea; l !== null; ) {
          if (t !== 0) {
            var u = l.pendingLanes;
            if (u === 0) var f = 0;
            else {
              var y = l.suspendedLanes, S = l.pingedLanes;
              f = (1 << 31 - Ke(42 | t) + 1) - 1, f &= u & ~(y & ~S), f = f & 201326741 ? f & 201326741 | 1 : f ? f | 2 : 0;
            }
            f !== 0 && (s = !0, Sv(l, f));
          } else
            f = Tt, f = Ol(
              l,
              l === kt ? f : 0,
              l.cancelPendingCommit !== null || l.timeoutHandle !== -1
            ), (f & 3) === 0 || Qa(l, f) || (s = !0, Sv(l, f));
          l = l.next;
        }
      while (s);
      ah = !1;
    }
  }
  function WE() {
    yv();
  }
  function yv() {
    Uo = sh = !1;
    var t = 0;
    Ii !== 0 && fw() && (t = Ii);
    for (var n = qe(), s = null, l = Ea; l !== null; ) {
      var u = l.next, f = vv(l, n);
      f === 0 ? (l.next = null, s === null ? Ea = u : s.next = u, u === null && (wa = s)) : (s = l, (t !== 0 || (f & 3) !== 0) && (Uo = !0)), l = u;
    }
    Xt !== 0 && Xt !== 5 || Dr(t), Ii !== 0 && (Ii = 0);
  }
  function vv(t, n) {
    for (var s = t.suspendedLanes, l = t.pingedLanes, u = t.expirationTimes, f = t.pendingLanes & -62914561; 0 < f; ) {
      var y = 31 - Ke(f), S = 1 << y, E = u[y];
      E === -1 ? ((S & s) === 0 || (S & l) !== 0) && (u[y] = yx(S, n)) : E <= n && (t.expiredLanes |= S), f &= ~S;
    }
    if (n = kt, s = Tt, s = Ol(
      t,
      t === n ? s : 0,
      t.cancelPendingCommit !== null || t.timeoutHandle !== -1
    ), l = t.callbackNode, s === 0 || t === n && (Nt === 2 || Nt === 9) || t.cancelPendingCommit !== null)
      return l !== null && l !== null && rc(l), t.callbackNode = null, t.callbackPriority = 0;
    if ((s & 3) === 0 || Qa(t, s)) {
      if (n = s & -s, n === t.callbackPriority) return n;
      switch (l !== null && rc(l), uc(s)) {
        case 2:
        case 8:
          s = Jm;
          break;
        case 32:
          s = xl;
          break;
        case 268435456:
          s = Wm;
          break;
        default:
          s = xl;
      }
      return l = bv.bind(null, t), s = ac(s, l), t.callbackPriority = n, t.callbackNode = s, n;
    }
    return l !== null && l !== null && rc(l), t.callbackPriority = 2, t.callbackNode = null, 2;
  }
  function bv(t, n) {
    if (Xt !== 0 && Xt !== 5)
      return t.callbackNode = null, t.callbackPriority = 0, null;
    var s = t.callbackNode;
    if (Lo() && t.callbackNode !== s)
      return null;
    var l = Tt;
    return l = Ol(
      t,
      t === kt ? l : 0,
      t.cancelPendingCommit !== null || t.timeoutHandle !== -1
    ), l === 0 ? null : (sv(t, l, n), vv(t, qe()), t.callbackNode != null && t.callbackNode === s ? bv.bind(null, t) : null);
  }
  function Sv(t, n) {
    if (Lo()) return null;
    sv(t, n, !0);
  }
  function tw() {
    dw(function() {
      (Mt & 6) !== 0 ? ac(
        Qm,
        WE
      ) : yv();
    });
  }
  function rh() {
    if (Ii === 0) {
      var t = bs;
      t === 0 && (t = El, El <<= 1, (El & 261888) === 0 && (El = 256)), Ii = t;
    }
    return Ii;
  }
  function _v(t) {
    return t == null || typeof t == "symbol" || typeof t == "boolean" ? null : typeof t == "function" ? t : Dl(t);
  }
  function ew(t, n, s, l, u) {
    if (n === "submit" && s && s.stateNode === u) {
      var f = _v(
        (u[Ue] || null).action
      ), y = l.submitter;
      y && (n = (n = y[Ue] || null) ? _v(n.formAction) : y.getAttribute("formAction"), n !== null && (f = n, y = null));
      var S = new Ll(
        "action",
        "action",
        null,
        l,
        u
      );
      t.push({
        event: S,
        listeners: [
          {
            instance: null,
            listener: function() {
              if (l.defaultPrevented) {
                if (Ii !== 0) {
                  var E = new FormData(u, y);
                  mf(
                    s,
                    {
                      pending: !0,
                      data: E,
                      method: u.method,
                      action: f
                    },
                    null,
                    E
                  );
                }
              } else
                typeof f == "function" && (S.preventDefault(), E = new FormData(u, y), mf(
                  s,
                  {
                    pending: !0,
                    data: E,
                    method: u.method,
                    action: f
                  },
                  f,
                  E
                ));
            },
            currentTarget: u
          }
        ]
      });
    }
  }
  for (var lh = 0; lh < Rc.length; lh++) {
    var oh = Rc[lh], nw = oh.toLowerCase(), iw = oh[0].toUpperCase() + oh.slice(1);
    En(
      nw,
      "on" + iw
    );
  }
  En(qp, "onAnimationEnd"), En(Xp, "onAnimationIteration"), En(Kp, "onAnimationStart"), En("dblclick", "onDoubleClick"), En("focusin", "onFocus"), En("focusout", "onBlur"), En(hE, "onTransitionRun"), En(dE, "onTransitionStart"), En(mE, "onTransitionCancel"), En(Fp, "onTransitionEnd"), qs("onMouseEnter", ["mouseout", "mouseover"]), qs("onMouseLeave", ["mouseout", "mouseover"]), qs("onPointerEnter", ["pointerout", "pointerover"]), qs("onPointerLeave", ["pointerout", "pointerover"]), cs(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(" ")
  ), cs(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  ), cs("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]), cs(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  ), cs(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  ), cs(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var Nr = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), sw = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(Nr)
  );
  function Tv(t, n) {
    n = (n & 4) !== 0;
    for (var s = 0; s < t.length; s++) {
      var l = t[s], u = l.event;
      l = l.listeners;
      t: {
        var f = void 0;
        if (n)
          for (var y = l.length - 1; 0 <= y; y--) {
            var S = l[y], E = S.instance, R = S.currentTarget;
            if (S = S.listener, E !== f && u.isPropagationStopped())
              break t;
            f = S, u.currentTarget = R;
            try {
              f(u);
            } catch (U) {
              Bl(U);
            }
            u.currentTarget = null, f = E;
          }
        else
          for (y = 0; y < l.length; y++) {
            if (S = l[y], E = S.instance, R = S.currentTarget, S = S.listener, E !== f && u.isPropagationStopped())
              break t;
            f = S, u.currentTarget = R;
            try {
              f(u);
            } catch (U) {
              Bl(U);
            }
            u.currentTarget = null, f = E;
          }
      }
    }
  }
  function _t(t, n) {
    var s = n[lp];
    s === void 0 && (s = n[lp] = /* @__PURE__ */ new Set());
    var l = t + "__bubble";
    s.has(l) || (xv(n, t, 2, !1), s.add(l));
  }
  function uh(t, n, s) {
    var l = 0;
    n && (l |= 4), xv(
      s,
      t,
      l,
      n
    );
  }
  var ko = "_reactListening" + Math.random().toString(36).slice(2);
  function ch(t) {
    if (!t[ko]) {
      t[ko] = !0, cp.forEach(function(s) {
        s !== "selectionchange" && (sw.has(s) || uh(s, !1, t), uh(s, !0, t));
      });
      var n = t.nodeType === 9 ? t : t.ownerDocument;
      n === null || n[ko] || (n[ko] = !0, uh("selectionchange", !1, n));
    }
  }
  function xv(t, n, s, l) {
    switch (h0(n)) {
      case 2:
        var u = Fw;
        break;
      case 8:
        u = Qw;
        break;
      default:
        u = Mh;
    }
    s = u.bind(
      null,
      n,
      s,
      t
    ), u = void 0, !yc || n !== "touchstart" && n !== "touchmove" && n !== "wheel" || (u = !0), l ? u !== void 0 ? t.addEventListener(n, s, {
      capture: !0,
      passive: u
    }) : t.addEventListener(n, s, !0) : u !== void 0 ? t.addEventListener(n, s, {
      passive: u
    }) : t.addEventListener(n, s, !1);
  }
  function fh(t, n, s, l, u) {
    var f = l;
    if ((n & 1) === 0 && (n & 2) === 0 && l !== null)
      t: for (; ; ) {
        if (l === null) return;
        var y = l.tag;
        if (y === 3 || y === 4) {
          var S = l.stateNode.containerInfo;
          if (S === u) break;
          if (y === 4)
            for (y = l.return; y !== null; ) {
              var E = y.tag;
              if ((E === 3 || E === 4) && y.stateNode.containerInfo === u)
                return;
              y = y.return;
            }
          for (; S !== null; ) {
            if (y = us(S), y === null) return;
            if (E = y.tag, E === 5 || E === 6 || E === 26 || E === 27) {
              l = f = y;
              continue t;
            }
            S = S.parentNode;
          }
        }
        l = l.return;
      }
    xp(function() {
      var R = f, U = pc(s), H = [];
      t: {
        var C = Qp.get(t);
        if (C !== void 0) {
          var L = Ll, F = t;
          switch (t) {
            case "keypress":
              if (jl(s) === 0) break t;
            case "keydown":
            case "keyup":
              L = Px;
              break;
            case "focusin":
              F = "focus", L = _c;
              break;
            case "focusout":
              F = "blur", L = _c;
              break;
            case "beforeblur":
            case "afterblur":
              L = _c;
              break;
            case "click":
              if (s.button === 2) break t;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              L = Ap;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              L = Mx;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              L = qx;
              break;
            case qp:
            case Xp:
            case Kp:
              L = Nx;
              break;
            case Fp:
              L = Kx;
              break;
            case "scroll":
            case "scrollend":
              L = zx;
              break;
            case "wheel":
              L = Qx;
              break;
            case "copy":
            case "cut":
            case "paste":
              L = Vx;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              L = zp;
              break;
            case "submit":
              L = Yx;
              break;
            case "toggle":
            case "beforetoggle":
              L = Wx;
          }
          var et = (n & 4) !== 0, gt = !et && (t === "scroll" || t === "scrollend"), M = et ? C !== null ? C + "Capture" : null : C;
          et = [];
          for (var O = R, j; O !== null; ) {
            var Z = O;
            if (j = Z.stateNode, Z = Z.tag, Z !== 5 && Z !== 26 && Z !== 27 || j === null || M === null || (Z = er(O, M), Z != null && et.push(
              jr(O, Z, j)
            )), gt) break;
            O = O.return;
          }
          0 < et.length && (C = new L(
            C,
            F,
            null,
            s,
            U
          ), H.push({ event: C, listeners: et }));
        }
      }
      if ((n & 7) === 0) {
        t: {
          if (L = t === "mouseover" || t === "pointerover", C = t === "mouseout" || t === "pointerout", L && s !== mc && (F = s.relatedTarget || s.fromElement) && (us(F) || F[Gs]))
            break t;
          (C || L) && (F = U.window === U ? U : (L = U.ownerDocument) ? L.defaultView || L.parentWindow : window, C ? (L = s.relatedTarget || s.toElement, C = R, L = L ? us(L) : null, L !== null && (gt = c(L), et = L.tag, L !== gt || et !== 5 && et !== 27 && et !== 6) && (L = null)) : (C = null, L = R), C !== L && (et = Ap, Z = "onMouseLeave", M = "onMouseEnter", O = "mouse", (t === "pointerout" || t === "pointerover") && (et = zp, Z = "onPointerLeave", M = "onPointerEnter", O = "pointer"), gt = C == null ? F : tr(C), j = L == null ? F : tr(L), F = new et(
            Z,
            O + "leave",
            C,
            s,
            U
          ), F.target = gt, F.relatedTarget = j, Z = null, us(U) === R && (et = new et(
            M,
            O + "enter",
            L,
            s,
            U
          ), et.target = j, et.relatedTarget = gt, Z = et), gt = Z, et = C && L ? q(
            C,
            L,
            aw
          ) : null, C !== null && Ev(
            H,
            F,
            C,
            et,
            !1
          ), L !== null && gt !== null && Ev(
            H,
            gt,
            L,
            et,
            !0
          )));
        }
        t: {
          if (C = R ? tr(R) : window, L = C.nodeName && C.nodeName.toLowerCase(), L === "select" || L === "input" && C.type === "file")
            var W = Lp;
          else if (jp(C))
            if (Up)
              W = uE;
            else {
              W = lE;
              var xt = rE;
            }
          else
            L = C.nodeName, !L || L.toLowerCase() !== "input" || C.type !== "checkbox" && C.type !== "radio" ? R && dc(R.elementType) && (W = Lp) : W = oE;
          if (W && (W = W(t, R))) {
            Vp(
              H,
              W,
              s,
              U
            );
            break t;
          }
          xt && xt(t, C, R);
        }
        switch (xt = R ? tr(R) : window, t) {
          case "focusin":
            (jp(xt) || xt.contentEditable === "true") && (Ws = xt, zc = R, ur = null);
            break;
          case "focusout":
            ur = zc = Ws = null;
            break;
          case "mousedown":
            Cc = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            Cc = !1, Yp(H, s, U);
            break;
          case "selectionchange":
            if (fE) break;
          case "keydown":
          case "keyup":
            Yp(H, s, U);
        }
        var lt;
        if (xc)
          t: {
            switch (t) {
              case "compositionstart":
                var ct = "onCompositionStart";
                break t;
              case "compositionend":
                ct = "onCompositionEnd";
                break t;
              case "compositionupdate":
                ct = "onCompositionUpdate";
                break t;
            }
            ct = void 0;
          }
        else
          Js ? Dp(t, s) && (ct = "onCompositionEnd") : t === "keydown" && s.keyCode === 229 && (ct = "onCompositionStart");
        ct && (Cp && s.locale !== "ko" && (Js || ct !== "onCompositionStart" ? ct === "onCompositionEnd" && Js && (lt = Ep()) : (Oi = U, vc = "value" in Oi ? Oi.value : Oi.textContent, Js = !0)), xt = Bo(R, ct), 0 < xt.length && (ct = new Op(
          ct,
          t,
          null,
          s,
          U
        ), H.push({ event: ct, listeners: xt }), lt ? ct.data = lt : (lt = Np(s), lt !== null && (ct.data = lt)))), (lt = eE ? nE(t, s) : iE(t, s)) && (ct = Bo(R, "onBeforeInput"), 0 < ct.length && (xt = new Op(
          "onBeforeInput",
          "beforeinput",
          null,
          s,
          U
        ), H.push({
          event: xt,
          listeners: ct
        }), xt.data = lt)), ew(
          H,
          t,
          R,
          s,
          U
        );
      }
      Tv(H, n);
    });
  }
  function jr(t, n, s) {
    return {
      instance: t,
      listener: n,
      currentTarget: s
    };
  }
  function Bo(t, n) {
    for (var s = n + "Capture", l = []; t !== null; ) {
      var u = t, f = u.stateNode;
      if (u = u.tag, u !== 5 && u !== 26 && u !== 27 || f === null || (u = er(t, s), u != null && l.unshift(
        jr(t, u, f)
      ), u = er(t, n), u != null && l.push(
        jr(t, u, f)
      )), t.tag === 3) return l;
      t = t.return;
    }
    return [];
  }
  function aw(t) {
    if (t === null) return null;
    do
      t = t.return;
    while (t && t.tag !== 5 && t.tag !== 27);
    return t || null;
  }
  function Ev(t, n, s, l, u) {
    for (var f = n._reactName, y = []; s !== null && s !== l; ) {
      var S = s, E = S.alternate, R = S.stateNode;
      if (S = S.tag, E !== null && E === l) break;
      S !== 5 && S !== 26 && S !== 27 || R === null || (E = R, u ? (R = er(s, f), R != null && y.unshift(
        jr(s, R, E)
      )) : u || (R = er(s, f), R != null && y.push(
        jr(s, R, E)
      ))), s = s.return;
    }
    y.length !== 0 && t.push({ event: n, listeners: y });
  }
  var rw = /\r\n?/g, lw = /\u0000|\uFFFD/g;
  function wv(t) {
    return (typeof t == "string" ? t : "" + t).replace(rw, `
`).replace(lw, "");
  }
  function Av(t, n) {
    return n = wv(n), wv(t) === n;
  }
  function Vt(t, n, s, l, u, f) {
    switch (s) {
      case "children":
        if (typeof l == "string")
          n === "body" || n === "textarea" && l === "" || Ks(t, l);
        else if (typeof l == "number" || typeof l == "bigint")
          n !== "body" && Ks(t, "" + l);
        else return;
        break;
      case "className":
        Rl(t, "class", l);
        break;
      case "tabIndex":
        Rl(t, "tabindex", l);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        Rl(t, s, l);
        break;
      case "style":
        _p(t, l, f);
        return;
      case "data":
        if (n !== "object") {
          Rl(t, "data", l);
          break;
        }
      case "src":
      case "href":
        if (l === "" && (n !== "a" || s !== "href")) {
          t.removeAttribute(s);
          break;
        }
        if (l == null || typeof l == "function" || typeof l == "symbol" || typeof l == "boolean") {
          t.removeAttribute(s);
          break;
        }
        l = Dl(l), t.setAttribute(s, l);
        break;
      case "action":
      case "formAction":
        if (typeof l == "function") {
          t.setAttribute(
            s,
            "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"
          );
          break;
        } else
          typeof f == "function" && (s === "formAction" ? (n !== "input" && Vt(t, n, "name", u.name, u, null), Vt(
            t,
            n,
            "formEncType",
            u.formEncType,
            u,
            null
          ), Vt(
            t,
            n,
            "formMethod",
            u.formMethod,
            u,
            null
          ), Vt(
            t,
            n,
            "formTarget",
            u.formTarget,
            u,
            null
          )) : (Vt(t, n, "encType", u.encType, u, null), Vt(t, n, "method", u.method, u, null), Vt(t, n, "target", u.target, u, null)));
        if (l == null || typeof l == "symbol" || typeof l == "boolean") {
          t.removeAttribute(s);
          break;
        }
        l = Dl(l), t.setAttribute(s, l);
        break;
      case "onClick":
        l != null && (t.onclick = Bn);
        return;
      case "onScroll":
        l != null && _t("scroll", t);
        return;
      case "onScrollEnd":
        l != null && _t("scrollend", t);
        return;
      case "dangerouslySetInnerHTML":
        if (l != null) {
          if (typeof l != "object" || !("__html" in l))
            throw Error(r(61));
          if (s = l.__html, s != null) {
            if (u.children != null) throw Error(r(60));
            f?.__html !== s && (t.innerHTML = s);
          }
        }
        break;
      case "multiple":
        t.multiple = l && typeof l != "function" && typeof l != "symbol";
        break;
      case "muted":
        t.muted = l && typeof l != "function" && typeof l != "symbol";
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "defaultValue":
      case "defaultChecked":
      case "innerHTML":
      case "ref":
        break;
      case "autoFocus":
        break;
      case "xlinkHref":
        if (l == null || typeof l == "function" || typeof l == "boolean" || typeof l == "symbol") {
          t.removeAttribute("xlink:href");
          break;
        }
        s = Dl(l), t.setAttributeNS(
          "http://www.w3.org/1999/xlink",
          "xlink:href",
          s
        );
        break;
      case "contentEditable":
      case "spellCheck":
      case "draggable":
      case "value":
      case "autoReverse":
      case "externalResourcesRequired":
      case "focusable":
      case "preserveAlpha":
        l != null && typeof l != "function" && typeof l != "symbol" ? t.setAttribute(s, l) : t.removeAttribute(s);
        break;
      case "inert":
      case "allowFullScreen":
      case "async":
      case "autoPlay":
      case "controls":
      case "credentialless":
      case "default":
      case "defer":
      case "disabled":
      case "disablePictureInPicture":
      case "disableRemotePlayback":
      case "formNoValidate":
      case "hidden":
      case "loop":
      case "noModule":
      case "noValidate":
      case "open":
      case "playsInline":
      case "readOnly":
      case "required":
      case "reversed":
      case "scoped":
      case "seamless":
      case "itemScope":
        l && typeof l != "function" && typeof l != "symbol" ? t.setAttribute(s, "") : t.removeAttribute(s);
        break;
      case "capture":
      case "download":
        l === !0 ? t.setAttribute(s, "") : l !== !1 && l != null && typeof l != "function" && typeof l != "symbol" ? t.setAttribute(s, l) : t.removeAttribute(s);
        break;
      case "cols":
      case "rows":
      case "size":
      case "span":
        l != null && typeof l != "function" && typeof l != "symbol" && !isNaN(l) && 1 <= l ? t.setAttribute(s, l) : t.removeAttribute(s);
        break;
      case "rowSpan":
      case "start":
        l == null || typeof l == "function" || typeof l == "symbol" || isNaN(l) ? t.removeAttribute(s) : t.setAttribute(s, l);
        break;
      case "popover":
        _t("beforetoggle", t), _t("toggle", t), Ml(t, "popover", l);
        break;
      case "xlinkActuate":
        ai(
          t,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          l
        );
        break;
      case "xlinkArcrole":
        ai(
          t,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          l
        );
        break;
      case "xlinkRole":
        ai(
          t,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          l
        );
        break;
      case "xlinkShow":
        ai(
          t,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          l
        );
        break;
      case "xlinkTitle":
        ai(
          t,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          l
        );
        break;
      case "xlinkType":
        ai(
          t,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          l
        );
        break;
      case "xmlBase":
        ai(
          t,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          l
        );
        break;
      case "xmlLang":
        ai(
          t,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          l
        );
        break;
      case "xmlSpace":
        ai(
          t,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          l
        );
        break;
      case "is":
        Ml(t, "is", l);
        break;
      case "innerText":
      case "textContent":
        return;
      default:
        if (!(2 < s.length) || s[0] !== "o" && s[0] !== "O" || s[1] !== "n" && s[1] !== "N")
          s = Ax.get(s) || s, Ml(t, s, l);
        else return;
    }
    zt = !0;
  }
  function hh(t, n, s, l, u, f) {
    switch (s) {
      case "style":
        _p(t, l, f);
        return;
      case "dangerouslySetInnerHTML":
        if (l != null) {
          if (typeof l != "object" || !("__html" in l))
            throw Error(r(61));
          if (s = l.__html, s != null) {
            if (u.children != null) throw Error(r(60));
            f?.__html !== s && (t.innerHTML = s);
          }
        }
        break;
      case "children":
        if (typeof l == "string") Ks(t, l);
        else if (typeof l == "number" || typeof l == "bigint")
          Ks(t, "" + l);
        else return;
        break;
      case "onScroll":
        l != null && _t("scroll", t);
        return;
      case "onScrollEnd":
        l != null && _t("scrollend", t);
        return;
      case "onClick":
        l != null && (t.onclick = Bn);
        return;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "innerHTML":
      case "ref":
        return;
      case "innerText":
      case "textContent":
        return;
      default:
        if (!fp.hasOwnProperty(s))
          t: {
            if (s[0] === "o" && s[1] === "n" && (u = s.endsWith("Capture"), f = s.slice(2, u ? s.length - 7 : void 0), n = t[Ue] || null, n = n != null ? n[s] : null, typeof n == "function" && t.removeEventListener(f, n, u), typeof l == "function")) {
              typeof n != "function" && n !== null && (s in t ? t[s] = null : t.hasAttribute(s) && t.removeAttribute(s)), t.addEventListener(f, l, u);
              break t;
            }
            zt = !0, s in t ? t[s] = l : l === !0 ? t.setAttribute(s, "") : Ml(t, s, l);
          }
        return;
    }
    zt = !0;
  }
  function xe(t, n, s) {
    switch (n) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "img":
        _t("error", t), _t("load", t);
        var l = !1, u = !1, f;
        for (f in s)
          if (s.hasOwnProperty(f)) {
            var y = s[f];
            if (y != null)
              switch (f) {
                case "src":
                  l = !0;
                  break;
                case "srcSet":
                  u = !0;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  throw Error(r(137, n));
                default:
                  Vt(t, n, f, y, s, null);
              }
          }
        u && Vt(t, n, "srcSet", s.srcSet, s, null), l && Vt(t, n, "src", s.src, s, null);
        return;
      case "input":
        _t("invalid", t);
        var S = f = y = u = null, E = null, R = null;
        for (l in s)
          if (s.hasOwnProperty(l)) {
            var U = s[l];
            if (U != null)
              switch (l) {
                case "name":
                  u = U;
                  break;
                case "type":
                  y = U;
                  break;
                case "checked":
                  E = U;
                  break;
                case "defaultChecked":
                  R = U;
                  break;
                case "value":
                  f = U;
                  break;
                case "defaultValue":
                  S = U;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  if (U != null)
                    throw Error(r(137, n));
                  break;
                default:
                  Vt(t, n, l, U, s, null);
              }
          }
        yp(
          t,
          f,
          S,
          E,
          R,
          y,
          u,
          !1
        );
        return;
      case "select":
        _t("invalid", t), l = y = f = null;
        for (u in s)
          if (s.hasOwnProperty(u) && (S = s[u], S != null))
            switch (u) {
              case "value":
                f = S;
                break;
              case "defaultValue":
                y = S;
                break;
              case "multiple":
                l = S;
              default:
                Vt(t, n, u, S, s, null);
            }
        n = f, s = y, t.multiple = !!l, n != null ? Xs(t, !!l, n, !1) : s != null && Xs(t, !!l, s, !0);
        return;
      case "textarea":
        _t("invalid", t), f = u = l = null;
        for (y in s)
          if (s.hasOwnProperty(y) && (S = s[y], S != null))
            switch (y) {
              case "value":
                l = S;
                break;
              case "defaultValue":
                u = S;
                break;
              case "children":
                f = S;
                break;
              case "dangerouslySetInnerHTML":
                if (S != null) throw Error(r(91));
                break;
              default:
                Vt(t, n, y, S, s, null);
            }
        bp(t, l, u, f);
        return;
      case "option":
        for (E in s)
          s.hasOwnProperty(E) && (l = s[E], l != null) && (E === "selected" ? t.selected = l && typeof l != "function" && typeof l != "symbol" : Vt(t, n, E, l, s, null));
        return;
      case "dialog":
        _t("beforetoggle", t), _t("toggle", t), _t("cancel", t), _t("close", t);
        break;
      case "iframe":
      case "object":
        _t("load", t);
        break;
      case "video":
      case "audio":
        for (l = 0; l < Nr.length; l++)
          _t(Nr[l], t);
        break;
      case "image":
        _t("error", t), _t("load", t);
        break;
      case "details":
        _t("toggle", t);
        break;
      case "embed":
      case "source":
      case "link":
        _t("error", t), _t("load", t);
      case "area":
      case "base":
      case "br":
      case "col":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "track":
      case "wbr":
      case "menuitem":
        for (R in s)
          if (s.hasOwnProperty(R) && (l = s[R], l != null))
            switch (R) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(r(137, n));
              default:
                Vt(t, n, R, l, s, null);
            }
        return;
      default:
        if (dc(n)) {
          for (U in s)
            s.hasOwnProperty(U) && (l = s[U], l !== void 0 && hh(
              t,
              n,
              U,
              l,
              s,
              void 0
            ));
          return;
        }
    }
    for (S in s)
      s.hasOwnProperty(S) && (l = s[S], l != null && Vt(t, n, S, l, s, null));
  }
  var ow = {};
  function uw(t, n, s, l) {
    switch (n) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "input":
        var u = null, f = null, y = null, S = null, E = null, R = null, U = null;
        for (L in s) {
          var H = s[L];
          if (s.hasOwnProperty(L) && H != null)
            switch (L) {
              case "checked":
                break;
              case "value":
                break;
              case "defaultValue":
                E = H;
              default:
                l.hasOwnProperty(L) || Vt(t, n, L, null, l, H);
            }
        }
        for (var C in l) {
          var L = l[C];
          if (H = s[C], l.hasOwnProperty(C) && (L != null || H != null))
            switch (C) {
              case "type":
                L !== H && (zt = !0), f = L;
                break;
              case "name":
                L !== H && (zt = !0), u = L;
                break;
              case "checked":
                L !== H && (zt = !0), R = L;
                break;
              case "defaultChecked":
                L !== H && (zt = !0), U = L;
                break;
              case "value":
                L !== H && (zt = !0), y = L;
                break;
              case "defaultValue":
                L !== H && (zt = !0), S = L;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (L != null)
                  throw Error(r(137, n));
                break;
              default:
                L !== H && Vt(
                  t,
                  n,
                  C,
                  L,
                  l,
                  H
                );
            }
        }
        fc(
          t,
          y,
          S,
          E,
          R,
          U,
          f,
          u
        );
        return;
      case "select":
        L = y = S = C = null;
        for (f in s)
          if (E = s[f], s.hasOwnProperty(f) && E != null)
            switch (f) {
              case "value":
                break;
              case "multiple":
                L = E;
              default:
                l.hasOwnProperty(f) || Vt(
                  t,
                  n,
                  f,
                  null,
                  l,
                  E
                );
            }
        for (u in l)
          if (f = l[u], E = s[u], l.hasOwnProperty(u) && (f != null || E != null))
            switch (u) {
              case "value":
                f !== E && (zt = !0), C = f;
                break;
              case "defaultValue":
                f !== E && (zt = !0), S = f;
                break;
              case "multiple":
                f !== E && (zt = !0), y = f;
              default:
                f !== E && Vt(
                  t,
                  n,
                  u,
                  f,
                  l,
                  E
                );
            }
        n = S, s = y, l = L, C != null ? Xs(t, !!s, C, !1) : !!l != !!s && (n != null ? Xs(t, !!s, n, !0) : Xs(t, !!s, s ? [] : "", !1));
        return;
      case "textarea":
        L = C = null;
        for (S in s)
          if (u = s[S], s.hasOwnProperty(S) && u != null && !l.hasOwnProperty(S))
            switch (S) {
              case "value":
                break;
              case "children":
                break;
              default:
                Vt(t, n, S, null, l, u);
            }
        for (y in l)
          if (u = l[y], f = s[y], l.hasOwnProperty(y) && (u != null || f != null))
            switch (y) {
              case "value":
                u !== f && (zt = !0), C = u;
                break;
              case "defaultValue":
                u !== f && (zt = !0), L = u;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (u != null) throw Error(r(91));
                break;
              default:
                u !== f && Vt(t, n, y, u, l, f);
            }
        vp(t, C, L);
        return;
      case "option":
        for (var F in s)
          C = s[F], s.hasOwnProperty(F) && C != null && !l.hasOwnProperty(F) && (F === "selected" ? t.selected = !1 : Vt(
            t,
            n,
            F,
            null,
            l,
            C
          ));
        for (E in l)
          C = l[E], L = s[E], l.hasOwnProperty(E) && C !== L && (C != null || L != null) && (E === "selected" ? (C !== L && (zt = !0), t.selected = C && typeof C != "function" && typeof C != "symbol") : Vt(
            t,
            n,
            E,
            C,
            l,
            L
          ));
        return;
      case "img":
      case "link":
      case "area":
      case "base":
      case "br":
      case "col":
      case "embed":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "source":
      case "track":
      case "wbr":
      case "menuitem":
        for (var et in s)
          C = s[et], s.hasOwnProperty(et) && C != null && !l.hasOwnProperty(et) && Vt(t, n, et, null, l, C);
        for (R in l)
          if (C = l[R], L = s[R], l.hasOwnProperty(R) && C !== L && (C != null || L != null))
            switch (R) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (C != null)
                  throw Error(r(137, n));
                break;
              default:
                Vt(
                  t,
                  n,
                  R,
                  C,
                  l,
                  L
                );
            }
        return;
      default:
        if (dc(n)) {
          for (var gt in s)
            C = s[gt], s.hasOwnProperty(gt) && C !== void 0 && !l.hasOwnProperty(gt) && hh(
              t,
              n,
              gt,
              void 0,
              l,
              C
            );
          for (U in l)
            C = l[U], L = s[U], !l.hasOwnProperty(U) || C === L || C === void 0 && L === void 0 || hh(
              t,
              n,
              U,
              C,
              l,
              L
            );
          return;
        }
    }
    for (var M in s)
      C = s[M], s.hasOwnProperty(M) && C != null && !l.hasOwnProperty(M) && Vt(t, n, M, null, l, C);
    for (H in l)
      C = l[H], L = s[H], !l.hasOwnProperty(H) || C === L || C == null && L == null || Vt(t, n, H, C, l, L);
  }
  function Ov(t) {
    switch (t) {
      case "css":
      case "script":
      case "font":
      case "img":
      case "image":
      case "input":
      case "link":
        return !0;
      default:
        return !1;
    }
  }
  function cw() {
    if (typeof performance.getEntriesByType == "function") {
      for (var t = 0, n = 0, s = performance.getEntriesByType("resource"), l = 0; l < s.length; l++) {
        var u = s[l], f = u.transferSize, y = u.initiatorType, S = u.duration;
        if (f && S && Ov(y)) {
          for (y = 0, S = u.responseEnd, l += 1; l < s.length; l++) {
            var E = s[l], R = E.startTime;
            if (R > S) break;
            var U = E.transferSize, H = E.initiatorType;
            U && Ov(H) && (E = E.responseEnd, y += U * (E < S ? 1 : (S - R) / (E - R)));
          }
          if (--l, n += 8 * (f + y) / (u.duration / 1e3), t++, 10 < t) break;
        }
      }
      if (0 < t) return n / t / 1e6;
    }
    return navigator.connection && (t = navigator.connection.downlink, typeof t == "number") ? t : 5;
  }
  var dh = null, mh = null;
  function Vr(t) {
    return t.nodeType === 9 ? t : t.ownerDocument;
  }
  function zv(t) {
    switch (t) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function Cv(t, n) {
    if (t === 0)
      switch (n) {
        case "svg":
          return 1;
        case "math":
          return 2;
        default:
          return 0;
      }
    return t === 1 && n === "foreignObject" ? 0 : t;
  }
  function Mv(t, n, s, l) {
    return s = Vr(
      s
    ).createElement(t), s[ve] = l, s[Ue] = n, xe(s, t, n), de(s), s;
  }
  function ph(t, n) {
    return t === "textarea" || t === "noscript" || typeof n.children == "string" || typeof n.children == "number" || typeof n.children == "bigint" || typeof n.dangerouslySetInnerHTML == "object" && n.dangerouslySetInnerHTML !== null && n.dangerouslySetInnerHTML.__html != null;
  }
  var gh = null;
  function fw() {
    var t = window.event;
    return t && t.type === "popstate" ? t === gh ? !1 : (gh = t, !0) : (gh = null, !1);
  }
  var yh = typeof setTimeout == "function" ? setTimeout : void 0, hw = typeof clearTimeout == "function" ? clearTimeout : void 0, Rv = typeof Promise == "function" ? Promise : void 0, Dv = typeof requestAnimationFrame == "function" ? requestAnimationFrame : yh, dw = typeof queueMicrotask == "function" ? queueMicrotask : typeof Rv < "u" ? function(t) {
    return Rv.resolve(null).then(t).catch(mw);
  } : yh;
  function mw(t) {
    setTimeout(function() {
      throw t;
    });
  }
  function qi(t) {
    return t === "head";
  }
  function Nv(t, n) {
    var s = n, l = 0;
    do {
      var u = s.nextSibling;
      if (t.removeChild(s), u && u.nodeType === 8)
        if (s = u.data, s === "/$" || s === "/&") {
          if (l === 0) {
            t.removeChild(u), Da(n);
            return;
          }
          l--;
        } else if (s === "$" || s === "$?" || s === "$~" || s === "$!" || s === "&")
          l++;
        else if (s === "html")
          wh(
            t.ownerDocument.documentElement
          );
        else if (s === "head") {
          s = t.ownerDocument.head, wh(s);
          for (var f = s.firstChild; f; ) {
            var y = f.nextSibling, S = f.nodeName;
            f[Wa] || S === "SCRIPT" || S === "STYLE" || S === "LINK" && f.rel.toLowerCase() === "stylesheet" || s.removeChild(f), f = y;
          }
        } else
          s === "body" && wh(t.ownerDocument.body);
      s = u;
    } while (s);
    Da(n);
  }
  function jv(t, n) {
    var s = t;
    t = 0;
    do {
      var l = s.nextSibling;
      if (s.nodeType === 1 ? n ? (s._stashedDisplay = s.style.display, s.style.display = "none") : (s.style.display = s._stashedDisplay || "", s.getAttribute("style") === "" && s.removeAttribute("style")) : s.nodeType === 3 && (n ? (s._stashedText = s.nodeValue, s.nodeValue = "") : s.nodeValue = s._stashedText || ""), l && l.nodeType === 8)
        if (s = l.data, s === "/$") {
          if (t === 0) break;
          t--;
        } else
          s !== "$" && s !== "$?" && s !== "$~" && s !== "$!" || t++;
      s = l;
    } while (s);
  }
  function Vv(t, n, s) {
    if (n = CSS.escape(n) !== n ? "r-" + btoa(n).replace(/=/g, "") : n, t.style.viewTransitionName = n, s != null && (t.style.viewTransitionClass = s), s = getComputedStyle(t), s.display === "inline") {
      if (n = t.getClientRects(), n.length === 1) var l = 1;
      else
        for (var u = l = 0; u < n.length; u++) {
          var f = n[u];
          0 < f.width && 0 < f.height && l++;
        }
      l === 1 && (t = t.style, t.display = n.length === 1 ? "inline-block" : "block", t.marginTop = "-" + s.paddingTop, t.marginBottom = "-" + s.paddingBottom);
    }
  }
  function Lv(t, n) {
    t = t.style, n = n.style;
    var s = n != null ? n.hasOwnProperty("viewTransitionName") ? n.viewTransitionName : n.hasOwnProperty("view-transition-name") ? n["view-transition-name"] : null : null;
    t.viewTransitionName = s == null || typeof s == "boolean" ? "" : ("" + s).trim(), s = n != null ? n.hasOwnProperty("viewTransitionClass") ? n.viewTransitionClass : n.hasOwnProperty("view-transition-class") ? n["view-transition-class"] : null : null, t.viewTransitionClass = s == null || typeof s == "boolean" ? "" : ("" + s).trim(), t.display === "inline-block" && (n == null ? t.display = t.margin = "" : (s = n.display, t.display = s == null || typeof s == "boolean" ? "" : s, s = n.margin, s != null ? t.margin = s : (s = n.hasOwnProperty("marginTop") ? n.marginTop : n["margin-top"], t.marginTop = s == null || typeof s == "boolean" ? "" : s, n = n.hasOwnProperty("marginBottom") ? n.marginBottom : n["margin-bottom"], t.marginBottom = n == null || typeof n == "boolean" ? "" : n)));
  }
  function pw(t, n, s) {
    return s = s.ownerDocument.defaultView, {
      rect: t,
      abs: n.position === "absolute" || n.position === "fixed",
      clip: n.clipPath !== "none" || n.overflow !== "visible" || n.filter !== "none" || n.mask !== "none" || n.mask !== "none" || n.borderRadius !== "0px",
      view: 0 <= t.bottom && 0 <= t.right && t.top <= s.innerHeight && t.left <= s.innerWidth
    };
  }
  function vh(t) {
    var n = t.getBoundingClientRect(), s = getComputedStyle(t);
    return pw(n, s, t);
  }
  function gw(t) {
    return t.documentElement.clientHeight;
  }
  function yw(t) {
    this.addEventListener("load", t), this.addEventListener("error", t);
  }
  function vw(t, n, s, l, u, f, y, S, E) {
    var R = n.nodeType === 9 ? n : n.ownerDocument;
    try {
      var U = R.startViewTransition({
        update: function() {
          var C = R.defaultView, L = C.navigation && C.navigation.transition, F = R.fonts.status;
          l();
          var et = [];
          if (F === "loaded" && (gw(R), R.fonts.status === "loading" && et.push(R.fonts.ready)), F = et.length, t !== null)
            for (var gt = t.suspenseyImages, M = 0, O = 0; O < gt.length; O++) {
              var j = gt[O];
              if (!j.complete) {
                var Z = j.getBoundingClientRect();
                if (0 < Z.bottom && 0 < Z.right && Z.top < C.innerHeight && Z.left < C.innerWidth) {
                  if (M += i0(j), M > Po) {
                    et.length = F;
                    break;
                  }
                  j = new Promise(
                    yw.bind(j)
                  ), et.push(j);
                }
              }
            }
          if (0 < et.length)
            return C = Promise.race([
              Promise.all(et),
              new Promise(function(W) {
                return setTimeout(W, 500);
              })
            ]).then(u, u), (L ? Promise.allSettled([L.finished, C]) : C).then(f, f);
          if (u(), L)
            return L.finished.then(
              f,
              f
            );
          f();
        },
        types: s
      });
      R.__reactViewTransition = U;
      var H = [];
      return U.ready.then(
        function() {
          for (var C = R.documentElement.getAnimations({
            subtree: !0
          }), L = 0; L < C.length; L++) {
            var F = C[L], et = F.effect, gt = et.pseudoElement;
            if (gt != null && gt.startsWith("::view-transition")) {
              H.push(F), F = et.getKeyframes();
              for (var M = gt = void 0, O = !0, j = 0; j < F.length; j++) {
                var Z = F[j], W = Z.width;
                if (gt === void 0) gt = W;
                else if (gt !== W) {
                  O = !1;
                  break;
                }
                if (W = Z.height, M === void 0) M = W;
                else if (M !== W) {
                  O = !1;
                  break;
                }
                delete Z.width, delete Z.height, Z.transform === "none" && delete Z.transform;
              }
              O && gt !== void 0 && M !== void 0 && (et.setKeyframes(F), O = getComputedStyle(
                et.target,
                et.pseudoElement
              ), O.width !== gt || O.height !== M) && (O = F[0], O.width = gt, O.height = M, O = F[F.length - 1], O.width = gt, O.height = M, et.setKeyframes(F));
            }
          }
          y();
        },
        function(C) {
          R.__reactViewTransition === U && (R.__reactViewTransition = null);
          try {
            typeof C == "object" && C !== null && C.name === "InvalidStateError" && (C.message === "View transition was skipped because document visibility state is hidden." || C.message === "Skipping view transition because document visibility state has become hidden." || C.message === "Skipping view transition because viewport size changed." || C.message === "Transition was aborted because of invalid state") && (C = null), C !== null && E(C);
          } finally {
            l(), u(), y();
          }
        }
      ), U.finished.finally(function() {
        for (var C = 0; C < H.length; C++)
          H[C].cancel();
        R.__reactViewTransition === U && (R.__reactViewTransition = null), S();
      }), U;
    } catch {
      return l(), u(), y(), null;
    }
  }
  function Ms(t, n) {
    this._scope = document.documentElement, this._selector = "::view-transition-" + t + "(" + n + ")";
  }
  Ms.prototype.animate = function(t, n) {
    return n = typeof n == "number" ? { duration: n } : V({}, n), n.pseudoElement = this._selector, this._scope.animate(t, n);
  }, Ms.prototype.getAnimations = function() {
    for (var t = this._scope, n = this._selector, s = t.getAnimations({ subtree: !0 }), l = [], u = 0; u < s.length; u++) {
      var f = s[u].effect;
      f !== null && f.target === t && f.pseudoElement === n && l.push(s[u]);
    }
    return l;
  }, Ms.prototype.getComputedStyle = function() {
    return getComputedStyle(this._scope, this._selector);
  };
  function Uv(t) {
    return {
      name: t,
      group: new Ms("group", t),
      imagePair: new Ms("image-pair", t),
      old: new Ms("old", t),
      new: new Ms("new", t)
    };
  }
  function sn(t) {
    this._fragmentFiber = t, this._observers = this._eventListeners = null;
  }
  sn.prototype.addEventListener = function(t, n, s) {
    var l = null, u = null;
    if (!(s != null && typeof s != "boolean" && (l = s.signal || null, l !== null && l.aborted))) {
      this._eventListeners === null && (this._eventListeners = []);
      var f = this._eventListeners;
      if (Bv(f, t, n, s) === -1) {
        var y = this, S = n;
        s != null && typeof s != "boolean" && s.once === !0 && (S = function(E) {
          y.removeEventListener(
            t,
            n,
            s
          ), typeof n == "function" ? n.call(this, E) : n.handleEvent(E);
        }), l !== null && (u = y.removeEventListener.bind(
          y,
          t,
          n,
          s
        ), l.addEventListener("abort", u, { once: !0 }), u = l.removeEventListener.bind(l, "abort", u)), l = Aa(s), f.push({
          type: t,
          listener: n,
          optionsOrUseCapture: s,
          attachedListener: S,
          cleanup: u
        }), v(
          this._fragmentFiber.child,
          !1,
          bw,
          t,
          S,
          l
        );
      }
      this._eventListeners = f;
    }
  };
  function bw(t, n, s, l) {
    return A(t).addEventListener(
      n,
      s,
      l
    ), !1;
  }
  sn.prototype.removeEventListener = function(t, n, s) {
    var l = this._eventListeners;
    if (l !== null && (n = Bv(
      l,
      t,
      n,
      s
    ), n !== -1)) {
      var u = l[n];
      s = u.attachedListener;
      var f = u.cleanup;
      u = Aa(u.optionsOrUseCapture), v(
        this._fragmentFiber.child,
        !1,
        Sw,
        t,
        s,
        u
      ), l.splice(n, 1), f !== null && f();
    }
  };
  function Sw(t, n, s, l) {
    return A(t).removeEventListener(
      n,
      s,
      l
    ), !1;
  }
  function Aa(t) {
    return t != null && typeof t != "boolean" && (t.once === !0 || t.signal instanceof AbortSignal) ? { capture: t.capture, passive: t.passive } : t;
  }
  function kv(t) {
    return t == null ? "c=0" : typeof t == "boolean" ? "c=" + (t ? "1" : "0") : "c=" + (t.capture ? "1" : "0");
  }
  function Bv(t, n, s, l) {
    if (t.length === 0) return -1;
    l = kv(l);
    for (var u = 0; u < t.length; u++) {
      var f = t[u];
      if (f.type === n && f.listener === s && kv(f.optionsOrUseCapture) === l)
        return u;
    }
    return -1;
  }
  sn.prototype.dispatchEvent = function(t) {
    var n = b(
      this._fragmentFiber
    );
    if (n === null) return !0;
    n = A(n);
    var s = this._eventListeners;
    if (s !== null && 0 < s.length || !t.bubbles) {
      var l = n.nodeType === 9 ? n.createComment("") : document.createTextNode("");
      if (s)
        for (var u = 0; u < s.length; u++) {
          var f = s[u];
          l.addEventListener(
            f.type,
            f.attachedListener,
            Aa(f.optionsOrUseCapture)
          );
        }
      if (n.appendChild(l), t = l.dispatchEvent(t), s)
        for (u = 0; u < s.length; u++)
          f = s[u], l.removeEventListener(
            f.type,
            f.attachedListener,
            Aa(f.optionsOrUseCapture)
          );
      return n.removeChild(l), t;
    }
    return n.dispatchEvent(t);
  }, sn.prototype.focus = function(t) {
    v(
      this._fragmentFiber.child,
      !0,
      Zv,
      t,
      void 0,
      void 0
    );
  };
  function Zv(t, n) {
    return t.tag === 6 ? !1 : (t = A(t), Dw(t, n));
  }
  sn.prototype.focusLast = function(t) {
    var n = [];
    v(
      this._fragmentFiber.child,
      !0,
      bh,
      n,
      void 0,
      void 0
    );
    for (var s = n.length - 1; 0 <= s && !Zv(n[s], t); s--) ;
  };
  function bh(t, n) {
    return n.push(t), !1;
  }
  sn.prototype.blur = function() {
    var t = b(
      this._fragmentFiber
    );
    t !== null && (t = A(t), t = Vr(t).activeElement, t !== null && v(
      this._fragmentFiber.child,
      !1,
      _w,
      t,
      void 0,
      void 0
    ));
  };
  function _w(t, n) {
    return t.tag === 6 ? !1 : (t = A(t), t === n || t.contains(n) ? (n.blur(), !0) : !1);
  }
  sn.prototype.observeUsing = function(t) {
    this._observers === null && (this._observers = /* @__PURE__ */ new Set()), this._observers.add(t), v(
      this._fragmentFiber.child,
      !1,
      Tw,
      t,
      void 0,
      void 0
    );
  };
  function Tw(t, n) {
    return t.tag === 6 || (t = A(t), n.observe(t)), !1;
  }
  sn.prototype.unobserveUsing = function(t) {
    var n = this._observers;
    if (n !== null && n.has(t)) {
      n.delete(t), v(
        this._fragmentFiber.child,
        !1,
        xw,
        t,
        void 0,
        void 0
      );
      for (var s = n = 0; s < Cn.length; s++) {
        var l = Cn[s];
        l.fragmentInstance === this && l.observer === t ? t.unobserve(l.instance) : Cn[n++] = l;
      }
      Cn.length = n;
    }
  };
  function xw(t, n) {
    return t.tag === 6 || (t = A(t), n.unobserve(t)), !1;
  }
  var Cn = [], Sh = !1;
  function Ew(t, n, s) {
    Cn.push({
      fragmentInstance: t,
      observer: n,
      instance: s
    }), Sh || (Sh = !0, Nw(function() {
      Sh = !1;
      var l = Cn;
      Cn = [];
      for (var u = 0; u < l.length; u++) {
        var f = l[u];
        f.observer.unobserve(f.instance);
      }
    }));
  }
  sn.prototype.getClientRects = function() {
    var t = [];
    return v(
      this._fragmentFiber.child,
      !1,
      ww,
      t,
      void 0,
      void 0
    ), t;
  };
  function ww(t, n) {
    if (t.tag === 6) {
      t = t.stateNode;
      var s = t.ownerDocument.createRange();
      s.selectNodeContents(t), n.push.apply(n, s.getClientRects());
    } else
      t = A(t), n.push.apply(n, t.getClientRects());
    return !1;
  }
  sn.prototype.getRootNode = function(t) {
    var n = b(
      this._fragmentFiber
    );
    return n === null ? this : A(n).getRootNode(t);
  }, sn.prototype.compareDocumentPosition = function(t) {
    var n = b(
      this._fragmentFiber
    );
    if (n === null) return Node.DOCUMENT_POSITION_DISCONNECTED;
    var s = [];
    v(
      this._fragmentFiber.child,
      !1,
      bh,
      s,
      void 0,
      void 0
    );
    var l = A(n);
    if (s.length === 0) {
      if (s = l, _(this._fragmentFiber)) {
        t: {
          for (n = this._fragmentFiber.return; n !== null; ) {
            if (n.tag === 4) {
              n = n.stateNode.containerInfo;
              break t;
            }
            if (n.tag === 3 || n.tag === 5 || n.tag === 27)
              break;
            n = n.return;
          }
          n = null;
        }
        n != null && (s = n);
      }
      n = this._fragmentFiber;
      var u = l = s.compareDocumentPosition(t);
      return s === t ? u = Node.DOCUMENT_POSITION_CONTAINS : l & Node.DOCUMENT_POSITION_CONTAINED_BY && (s = T(n)[1], s === null ? u = Node.DOCUMENT_POSITION_PRECEDING : (t = A(s).compareDocumentPosition(
        t
      ), u = t === 0 || t & Node.DOCUMENT_POSITION_FOLLOWING ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING)), u |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
    }
    n = A(s[0]), u = A(s[s.length - 1]);
    var f = _(this._fragmentFiber) ? n.parentElement : l;
    if (f == null)
      return Node.DOCUMENT_POSITION_DISCONNECTED;
    l = f.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_CONTAINED_BY, f = f.compareDocumentPosition(u) & Node.DOCUMENT_POSITION_CONTAINED_BY;
    var y = n.compareDocumentPosition(t), S = u.compareDocumentPosition(t), E = y & Node.DOCUMENT_POSITION_CONTAINED_BY || S & Node.DOCUMENT_POSITION_CONTAINED_BY;
    return S = l && f && y & Node.DOCUMENT_POSITION_FOLLOWING && S & Node.DOCUMENT_POSITION_PRECEDING, n = l && n === t || f && u === t || E || S ? Node.DOCUMENT_POSITION_CONTAINED_BY : !l && n === t || !f && u === t ? Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC : y, n & Node.DOCUMENT_POSITION_DISCONNECTED || n & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC || Aw(
      n,
      this._fragmentFiber,
      s[0],
      s[s.length - 1],
      t
    ) ? n : Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
  };
  function Aw(t, n, s, l, u) {
    var f = us(u);
    if (t & Node.DOCUMENT_POSITION_CONTAINED_BY) {
      if (s = !!f)
        t: {
          for (; f !== null; ) {
            if (f.tag === 7 && (f === n || f.alternate === n)) {
              s = !0;
              break t;
            }
            f = f.return;
          }
          s = !1;
        }
      return s;
    }
    if (t & Node.DOCUMENT_POSITION_CONTAINS) {
      if (f === null)
        return f = u.ownerDocument, u === f || u === f.documentElement || u === f.body;
      t: {
        for (f = n, n = b(n); f !== null; ) {
          if (!(f.tag !== 5 && f.tag !== 3 && f.tag !== 27 || f !== n && f.alternate !== n)) {
            f = !0;
            break t;
          }
          f = f.return;
        }
        f = !1;
      }
      return f;
    }
    return t & Node.DOCUMENT_POSITION_PRECEDING ? ((n = !!f) && !(n = f === s) && (n = q(
      s,
      f,
      X
    ), n === null ? n = !1 : (v(
      n,
      !0,
      k,
      f,
      s
    ), f = N, N = null, n = f !== null)), n) : t & Node.DOCUMENT_POSITION_FOLLOWING ? ((n = !!f) && !(n = f === l) && (n = q(
      l,
      f,
      X
    ), n === null ? n = !1 : (v(
      n,
      !0,
      G,
      f,
      l
    ), f = N, D = N = null, n = f !== null)), n) : !1;
  }
  function Hv(t, n) {
    var s = t.ownerDocument.createRange();
    s.selectNodeContents(t), t = s.getBoundingClientRect(), window.scrollTo(
      window.scrollX + t.left,
      n ? window.scrollY + t.top : window.scrollY + t.bottom - window.innerHeight
    );
  }
  sn.prototype.scrollIntoView = function(t) {
    if (typeof t == "object") throw Error(r(566));
    var n = [];
    v(
      this._fragmentFiber.child,
      !1,
      bh,
      n,
      void 0,
      void 0
    );
    var s = t !== !1;
    if (n.length === 0) {
      var l = T(
        this._fragmentFiber
      );
      if (l = s ? l[1] || l[0] || b(this._fragmentFiber) : l[0] || l[1], l === null) return;
      if (l.tag === 6) {
        t = A(l), Hv(t, s);
        return;
      }
      if (l = A(l), l.nodeType !== 9) {
        if (l.nodeType === 11) {
          s = "host" in l ? l.host : null, s !== null && s.scrollIntoView(t);
          return;
        }
        l.scrollIntoView(t);
      }
    }
    for (l = s ? n.length - 1 : 0; l !== (s ? -1 : n.length); ) {
      var u = n[l];
      u.tag === 6 ? (u = A(u), Hv(u, s)) : A(u).scrollIntoView(t), l += s ? -1 : 1;
    }
  };
  function Ow(t, n) {
    return t = A(t), Pv(t, n), !1;
  }
  function Pv(t, n) {
    t.reactFragments == null && (t.reactFragments = /* @__PURE__ */ new Set()), t.reactFragments.add(n);
  }
  function $v(t, n) {
    var s = n._eventListeners;
    if (s !== null)
      for (var l = 0; l < s.length; l++) {
        var u = s[l];
        t.addEventListener(
          u.type,
          u.attachedListener,
          Aa(u.optionsOrUseCapture)
        );
      }
    t.nodeType !== 3 && (s = n._observers, s !== null && s.forEach(function(f) {
      for (var y = 0, S = 0; S < Cn.length; S++) {
        var E = Cn[S];
        (E.fragmentInstance !== n || E.observer !== f || E.instance !== t) && (Cn[y++] = E);
      }
      Cn.length = y, f.observe(t);
    }), Pv(t, n));
  }
  function zw(t, n) {
    var s = n._eventListeners;
    if (s !== null)
      for (var l = 0; l < s.length; l++) {
        var u = s[l];
        t.removeEventListener(
          u.type,
          u.attachedListener,
          Aa(u.optionsOrUseCapture)
        );
      }
    t.nodeType !== 3 && (s = n._observers, s !== null && s.forEach(function(f) {
      typeof f.rootMargin == "string" ? Ew(
        n,
        f,
        t
      ) : f.unobserve(t);
    }), t.reactFragments != null && t.reactFragments.delete(n));
  }
  function _h(t) {
    var n = t.firstChild;
    for (n && n.nodeType === 10 && (n = n.nextSibling); n; ) {
      var s = n;
      switch (n = n.nextSibling, s.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          _h(s), Cl(s);
          continue;
        case "SCRIPT":
        case "STYLE":
          continue;
        case "LINK":
          if (s.rel.toLowerCase() === "stylesheet") continue;
      }
      t.removeChild(s);
    }
  }
  function Cw(t, n, s, l) {
    for (; t.nodeType === 1; ) {
      var u = s;
      if (t.nodeName.toLowerCase() !== n.toLowerCase()) {
        if (!l && (t.nodeName !== "INPUT" || t.type !== "hidden"))
          break;
      } else if (l) {
        if (!t[Wa])
          switch (n) {
            case "meta":
              if (!t.hasAttribute("itemprop")) break;
              return t;
            case "link":
              if (f = t.getAttribute("rel"), f === "stylesheet" && t.hasAttribute("data-precedence"))
                break;
              if (f !== u.rel || t.getAttribute("href") !== (u.href == null || u.href === "" ? null : u.href) || t.getAttribute("crossorigin") !== (u.crossOrigin == null ? null : u.crossOrigin) || t.getAttribute("title") !== (u.title == null ? null : u.title))
                break;
              return t;
            case "style":
              if (t.hasAttribute("data-precedence")) break;
              return t;
            case "script":
              if (f = t.getAttribute("src"), (f !== (u.src == null ? null : u.src) || t.getAttribute("type") !== (u.type == null ? null : u.type) || t.getAttribute("crossorigin") !== (u.crossOrigin == null ? null : u.crossOrigin)) && f && t.hasAttribute("async") && !t.hasAttribute("itemprop"))
                break;
              return t;
            default:
              return t;
          }
      } else if (n === "input" && t.type === "hidden") {
        var f = u.name == null ? null : "" + u.name;
        if (u.type === "hidden" && t.getAttribute("name") === f)
          return t;
      } else return t;
      if (t = pn(t.nextSibling), t === null) break;
    }
    return null;
  }
  function Mw(t, n, s) {
    if (n === "") return null;
    for (; t.nodeType !== 3; )
      if ((t.nodeType !== 1 || t.nodeName !== "INPUT" || t.type !== "hidden") && !s || (t = pn(t.nextSibling), t === null)) return null;
    return t;
  }
  function Gv(t, n) {
    for (; t.nodeType !== 8; )
      if ((t.nodeType !== 1 || t.nodeName !== "INPUT" || t.type !== "hidden") && !n || (t = pn(t.nextSibling), t === null)) return null;
    return t;
  }
  function Th(t) {
    return t.data === "$?" || t.data === "$~";
  }
  function xh(t) {
    return t.data === "$!" || t.data === "$?" && t.ownerDocument.readyState !== "loading";
  }
  function Rw(t, n) {
    var s = t.ownerDocument;
    if (t.data === "$~") t._reactRetry = n;
    else if (t.data !== "$?" || s.readyState !== "loading")
      n();
    else {
      var l = function() {
        n(), s.removeEventListener("DOMContentLoaded", l);
      };
      s.addEventListener("DOMContentLoaded", l), t._reactRetry = l;
    }
  }
  function pn(t) {
    for (; t != null; t = t.nextSibling) {
      var n = t.nodeType;
      if (n === 1 || n === 3) break;
      if (n === 8) {
        if (n = t.data, n === "$" || n === "$!" || n === "$?" || n === "$~" || n === "&" || n === "F!" || n === "F")
          break;
        if (n === "/$" || n === "/&") return null;
      }
    }
    return t;
  }
  var Eh = null;
  function Yv(t) {
    t = t.nextSibling;
    for (var n = 0; t; ) {
      if (t.nodeType === 8) {
        var s = t.data;
        if (s === "/$" || s === "/&") {
          if (n === 0)
            return pn(t.nextSibling);
          n--;
        } else
          s !== "$" && s !== "$!" && s !== "$?" && s !== "$~" && s !== "&" || n++;
      }
      t = t.nextSibling;
    }
    return null;
  }
  function Iv(t) {
    t = t.previousSibling;
    for (var n = 0; t; ) {
      if (t.nodeType === 8) {
        var s = t.data;
        if (s === "$" || s === "$!" || s === "$?" || s === "$~" || s === "&") {
          if (n === 0) return t;
          n--;
        } else s !== "/$" && s !== "/&" || n++;
      }
      t = t.previousSibling;
    }
    return null;
  }
  function Dw(t, n) {
    function s() {
      l = !0;
    }
    if (t.ownerDocument.activeElement === t) return !0;
    var l = !1;
    try {
      t.ownerDocument.addEventListener("focus", s, !0), (t.focus || HTMLElement.prototype.focus).call(t, n);
    } finally {
      t.ownerDocument.removeEventListener("focus", s, !0);
    }
    return l;
  }
  function Nw(t) {
    Dv(function() {
      Dv(function(n) {
        return t(n);
      });
    });
  }
  function qv(t, n, s) {
    switch (n = Vr(s), t) {
      case "html":
        if (t = n.documentElement, !t) throw Error(r(452));
        return t;
      case "head":
        if (t = n.head, !t) throw Error(r(453));
        return t;
      case "body":
        if (t = n.body, !t) throw Error(r(454));
        return t;
      default:
        throw Error(r(451));
    }
  }
  function Xv(t, n, s) {
    for (var l in s) {
      var u = s[l];
      s.hasOwnProperty(l) && u != null && Vt(t, n, l, null, ow, u);
    }
    s.dangerouslySetInnerHTML != null && (t.textContent = ""), t.onclick === Bn && (t.onclick = null), Cl(t);
  }
  function wh(t) {
    for (var n = t.attributes; n.length; )
      t.removeAttributeNode(n[0]);
    Cl(t);
  }
  var gn = /* @__PURE__ */ new Map(), Kv = /* @__PURE__ */ new Set();
  function Lr(t) {
    if (typeof t.getRootNode == "function") {
      var n = t.getRootNode();
      if (n.nodeType === 9 || n.nodeType === 11) return n;
    }
    return t.nodeType === 9 ? t : t.ownerDocument;
  }
  var vi = ht.d;
  ht.d = {
    f: jw,
    r: Vw,
    D: Lw,
    C: Uw,
    L: kw,
    m: Bw,
    X: Hw,
    S: Zw,
    M: Pw
  };
  function jw() {
    var t = vi.f(), n = No();
    return t || n;
  }
  function Vw(t) {
    var n = Ys(t);
    n !== null && n.tag === 5 && n.type === "form" ? Qg(n) : vi.r(t);
  }
  var Oa = typeof document > "u" ? null : document;
  function Fv(t, n, s) {
    var l = Oa;
    if (l && typeof n == "string" && n) {
      var u = on(n);
      u = 'link[rel="' + t + '"][href="' + u + '"]', typeof s == "string" && (u += '[crossorigin="' + s + '"]'), Kv.has(u) || (Kv.add(u), t = { rel: t, crossOrigin: s, href: n }, l.querySelector(u) === null && (n = l.createElement("link"), xe(n, "link", t), de(n), l.head.appendChild(n)));
    }
  }
  function Lw(t) {
    vi.D(t), Fv("dns-prefetch", t, null);
  }
  function Uw(t, n) {
    vi.C(t, n), Fv("preconnect", t, n);
  }
  function kw(t, n, s) {
    vi.L(t, n, s);
    var l = Oa;
    if (l && t && n) {
      var u = 'link[rel="preload"][as="' + on(n) + '"]';
      n === "image" && s && s.imageSrcSet ? (u += '[imagesrcset="' + on(
        s.imageSrcSet
      ) + '"]', typeof s.imageSizes == "string" && (u += '[imagesizes="' + on(
        s.imageSizes
      ) + '"]')) : u += '[href="' + on(t) + '"]';
      var f = u;
      switch (n) {
        case "style":
          f = za(t);
          break;
        case "script":
          f = Ca(t);
      }
      if (!(gn.has(f) || (t = V(
        {
          rel: "preload",
          href: n === "image" && s && s.imageSrcSet ? void 0 : t,
          as: n
        },
        s
      ), gn.set(f, t), l.querySelector(u) !== null || n === "style" && l.querySelector(Ur(f)) || n === "script" && l.querySelector(kr(f))))) {
        var y = l.createElement("link");
        xe(y, "link", t), n === "style" && (y[zl] = !0, y.onload = y.onerror = function() {
          up(y);
        }), de(y), l.head.appendChild(y);
      }
    }
  }
  function Bw(t, n) {
    vi.m(t, n);
    var s = Oa;
    if (s && t) {
      var l = n && typeof n.as == "string" ? n.as : "script", u = 'link[rel="modulepreload"][as="' + on(l) + '"][href="' + on(t) + '"]', f = u;
      switch (l) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          f = Ca(t);
      }
      if (!gn.has(f) && (t = V({ rel: "modulepreload", href: t }, n), gn.set(f, t), s.querySelector(u) === null)) {
        switch (l) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (s.querySelector(kr(f)))
              return;
        }
        l = s.createElement("link"), xe(l, "link", t), de(l), s.head.appendChild(l);
      }
    }
  }
  function Zw(t, n, s) {
    vi.S(t, n, s);
    var l = Oa;
    if (l && t) {
      var u = Is(l).hoistableStyles, f = za(t);
      n = n || "default";
      var y = u.get(f);
      if (!y) {
        var S = { loading: 0, preload: null };
        if (y = l.querySelector(
          Ur(f)
        ))
          S.loading = 5;
        else {
          t = V(
            { rel: "stylesheet", href: t, "data-precedence": n },
            s
          ), (s = gn.get(f)) && Ah(t, s);
          var E = y = l.createElement("link");
          de(E), xe(E, "link", t), E._p = new Promise(function(R, U) {
            E.onload = R, E.onerror = U;
          }), E.addEventListener("load", function() {
            S.loading |= 1;
          }), E.addEventListener("error", function() {
            S.loading |= 2;
          }), S.loading |= 4, Zo(y, n, l);
        }
        y = {
          type: "stylesheet",
          instance: y,
          count: 1,
          state: S
        }, u.set(f, y);
      }
    }
  }
  function Hw(t, n) {
    vi.X(t, n);
    var s = Oa;
    if (s && t) {
      var l = Is(s).hoistableScripts, u = Ca(t), f = l.get(u);
      f || (f = s.querySelector(kr(u)), f || (t = V({ src: t, async: !0 }, n), (n = gn.get(u)) && Oh(t, n), f = s.createElement("script"), de(f), xe(f, "link", t), s.head.appendChild(f)), f = {
        type: "script",
        instance: f,
        count: 1,
        state: null
      }, l.set(u, f));
    }
  }
  function Pw(t, n) {
    vi.M(t, n);
    var s = Oa;
    if (s && t) {
      var l = Is(s).hoistableScripts, u = Ca(t), f = l.get(u);
      f || (f = s.querySelector(kr(u)), f || (t = V({ src: t, async: !0, type: "module" }, n), (n = gn.get(u)) && Oh(t, n), f = s.createElement("script"), de(f), xe(f, "link", t), s.head.appendChild(f)), f = {
        type: "script",
        instance: f,
        count: 1,
        state: null
      }, l.set(u, f));
    }
  }
  function Qv(t, n, s, l) {
    var u = (u = Ei.current) ? Lr(u) : null;
    if (!u) throw Error(r(446));
    switch (t) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof s.precedence == "string" && typeof s.href == "string" ? (s = za(s.href), n = Is(
          u
        ).hoistableStyles, l = n.get(s), l || (l = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, n.set(s, l)), l) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if (s.rel === "stylesheet" && typeof s.href == "string" && typeof s.precedence == "string") {
          t = za(s.href);
          var f = Is(
            u
          ).hoistableStyles, y = f.get(t);
          if (y || (u = u.ownerDocument || u, y = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, f.set(t, y), (f = u.querySelector(
            Ur(t)
          )) ? f._p || (y.instance = f, y.state.loading = 5) : (f = gn.get(t), f || (f = {
            rel: "preload",
            as: "style",
            href: s.href,
            crossOrigin: s.crossOrigin,
            integrity: s.integrity,
            media: s.media,
            hrefLang: s.hrefLang,
            referrerPolicy: s.referrerPolicy
          }, gn.set(t, f)), $w(
            u,
            t,
            f,
            y.state
          ))), n && l === null)
            throw Error(r(528, ""));
          return y;
        }
        if (n && l !== null)
          throw Error(r(529, ""));
        return null;
      case "script":
        return n = s.async, s = s.src, typeof s == "string" && n && typeof n != "function" && typeof n != "symbol" ? (s = Ca(s), n = Is(
          u
        ).hoistableScripts, l = n.get(s), l || (l = {
          type: "script",
          instance: null,
          count: 0,
          state: null
        }, n.set(s, l)), l) : { type: "void", instance: null, count: 0, state: null };
      default:
        throw Error(r(444, t));
    }
  }
  function za(t) {
    return 'href="' + on(t) + '"';
  }
  function Ur(t) {
    return 'link[rel="stylesheet"][' + t + "]";
  }
  function Jv(t) {
    return V({}, t, {
      "data-precedence": t.precedence,
      precedence: null
    });
  }
  function $w(t, n, s, l) {
    if (n = t.querySelector(
      'link[rel="preload"][as="style"][' + n + "]"
    )) {
      if (n[zl] !== !0) {
        l.loading = 1;
        return;
      }
    } else
      n = t.createElement("link"), n[zl] = !0, n.onload = n.onerror = up.bind(null, n), xe(n, "link", s), de(n), t.head.appendChild(n);
    l.preload = n, n.addEventListener("load", function() {
      return l.loading |= 1;
    }), n.addEventListener("error", function() {
      return l.loading |= 2;
    });
  }
  function Ca(t) {
    return '[src="' + on(t) + '"]';
  }
  function kr(t) {
    return "script[async]" + t;
  }
  function Wv(t, n, s) {
    if (n.count++, n.instance === null)
      switch (n.type) {
        case "style":
          var l = t.querySelector(
            'style[data-href~="' + on(s.href) + '"]'
          );
          if (l)
            return n.instance = l, de(l), l;
          var u = V({}, s, {
            "data-href": s.href,
            "data-precedence": s.precedence,
            href: null,
            precedence: null
          });
          return l = (t.ownerDocument || t).createElement(
            "style"
          ), de(l), xe(l, "style", u), Zo(l, s.precedence, t), n.instance = l;
        case "stylesheet":
          u = za(s.href);
          var f = t.querySelector(
            Ur(u)
          );
          if (f)
            return n.state.loading |= 4, n.instance = f, de(f), f;
          l = Jv(s), (u = gn.get(u)) && Ah(l, u), f = (t.ownerDocument || t).createElement("link"), de(f);
          var y = f;
          return y._p = new Promise(function(S, E) {
            y.onload = S, y.onerror = E;
          }), xe(f, "link", l), n.state.loading |= 4, Zo(f, s.precedence, t), n.instance = f;
        case "script":
          return f = Ca(s.src), (u = t.querySelector(
            kr(f)
          )) ? (n.instance = u, de(u), u) : (l = s, (u = gn.get(f)) && (l = V({}, s), Oh(l, u)), t = t.ownerDocument || t, u = t.createElement("script"), de(u), xe(u, "link", l), t.head.appendChild(u), n.instance = u);
        case "void":
          return null;
        default:
          throw Error(r(443, n.type));
      }
    else
      n.type === "stylesheet" && (n.state.loading & 4) === 0 && (l = n.instance, n.state.loading |= 4, Zo(l, s.precedence, t));
    return n.instance;
  }
  function Zo(t, n, s) {
    for (var l = s.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), u = l.length ? l[l.length - 1] : null, f = u, y = 0; y < l.length; y++) {
      var S = l[y];
      if (S.dataset.precedence === n) f = S;
      else if (f !== u) break;
    }
    f ? f.parentNode.insertBefore(t, f.nextSibling) : (n = s.nodeType === 9 ? s.head : s, n.insertBefore(t, n.firstChild));
  }
  function Ah(t, n) {
    t.crossOrigin == null && (t.crossOrigin = n.crossOrigin), t.referrerPolicy == null && (t.referrerPolicy = n.referrerPolicy), t.title == null && (t.title = n.title);
  }
  function Oh(t, n) {
    t.crossOrigin == null && (t.crossOrigin = n.crossOrigin), t.referrerPolicy == null && (t.referrerPolicy = n.referrerPolicy), t.integrity == null && (t.integrity = n.integrity);
  }
  var Ho = null;
  function t0(t, n, s) {
    if (Ho === null) {
      var l = /* @__PURE__ */ new Map(), u = Ho = /* @__PURE__ */ new Map();
      u.set(s, l);
    } else
      u = Ho, l = u.get(s), l || (l = /* @__PURE__ */ new Map(), u.set(s, l));
    if (l.has(t)) return l;
    for (l.set(t, null), s = s.getElementsByTagName(t), u = 0; u < s.length; u++) {
      var f = s[u];
      if (!(f[Wa] || f[ve] || t === "link" && f.getAttribute("rel") === "stylesheet") && f.namespaceURI !== "http://www.w3.org/2000/svg") {
        var y = f.getAttribute(n) || "";
        y = t + y;
        var S = l.get(y);
        S ? S.push(f) : l.set(y, [f]);
      }
    }
    return l;
  }
  function zh(t, n, s) {
    t = t.ownerDocument || t, t.head.insertBefore(
      s,
      n === "title" ? t.querySelector("head > title") : null
    );
  }
  function Gw(t, n, s) {
    if (s === 1 || n.itemProp != null) return !1;
    switch (t) {
      case "meta":
      case "title":
        return !0;
      case "style":
        if (typeof n.precedence != "string" || typeof n.href != "string" || n.href === "")
          break;
        return !0;
      case "link":
        if (typeof n.rel != "string" || typeof n.href != "string" || n.href === "" || n.onLoad || n.onError)
          break;
        return n.rel === "stylesheet" ? (t = n.disabled, typeof n.precedence == "string" && t == null) : !0;
      case "script":
        if (n.async && typeof n.async != "function" && typeof n.async != "symbol" && !n.onLoad && !n.onError && n.src && typeof n.src == "string")
          return !0;
    }
    return !1;
  }
  function e0(t, n) {
    return t === "img" && n.src != null && n.src !== "" && n.onLoad == null && n.loading !== "lazy";
  }
  function n0(t) {
    return !(t.type === "stylesheet" && (t.state.loading & 3) === 0);
  }
  function i0(t) {
    return (t.width || 100) * (t.height || 100) * (typeof devicePixelRatio == "number" ? devicePixelRatio : 1) * 0.25;
  }
  function s0(t, n) {
    typeof n.decode == "function" && (t.imgCount++, n.complete || (t.imgBytes += i0(n), t.suspenseyImages.push(n)), t = qw.bind(t), n.decode().then(t, t));
  }
  function Yw(t, n, s, l) {
    if (s.type === "stylesheet" && (typeof l.media != "string" || matchMedia(l.media).matches !== !1) && (s.state.loading & 4) === 0) {
      if (s.instance === null) {
        var u = za(l.href), f = n.querySelector(
          Ur(u)
        );
        if (f) {
          n = f._p, n !== null && typeof n == "object" && typeof n.then == "function" && (t.count++, t = Br.bind(t), n.then(t, t)), s.state.loading |= 4, s.instance = f, de(f);
          return;
        }
        f = n.ownerDocument || n, l = Jv(l), (u = gn.get(u)) && Ah(l, u), f = f.createElement("link"), de(f);
        var y = f;
        y._p = new Promise(function(S, E) {
          y.onload = S, y.onerror = E;
        }), xe(f, "link", l), s.instance = f;
      }
      t.stylesheets === null && (t.stylesheets = /* @__PURE__ */ new Map()), t.stylesheets.set(s, n), (n = s.state.preload) && (s.state.loading & 3) === 0 && (t.count++, s = Br.bind(t), n.addEventListener("load", s), n.addEventListener("error", s));
    }
  }
  var Po = 0;
  function Iw(t, n) {
    return t.stylesheets && t.count === 0 && Go(t, t.stylesheets), 0 < t.count || 0 < t.imgCount ? function(s) {
      var l = setTimeout(function() {
        if (t.stylesheets && Go(t, t.stylesheets), t.unsuspend) {
          var f = t.unsuspend;
          t.unsuspend = null, f();
        }
      }, 6e4 + n);
      0 < t.imgBytes && Po === 0 && (Po = 62500 * cw());
      var u = setTimeout(
        function() {
          if (t.waitingForImages = !1, t.count === 0 && (t.stylesheets && Go(t, t.stylesheets), t.unsuspend)) {
            var f = t.unsuspend;
            t.unsuspend = null, f();
          }
        },
        (t.imgBytes > Po ? 50 : 800) + n
      );
      return t.unsuspend = s, function() {
        t.unsuspend = null, clearTimeout(l), clearTimeout(u);
      };
    } : null;
  }
  function a0(t) {
    if (t.count === 0 && (t.imgCount === 0 || !t.waitingForImages)) {
      if (t.stylesheets) Go(t, t.stylesheets);
      else if (t.unsuspend) {
        var n = t.unsuspend;
        t.unsuspend = null, n();
      }
    }
  }
  function Br() {
    this.count--, a0(this);
  }
  function qw() {
    this.imgCount--, a0(this);
  }
  var $o = null;
  function Go(t, n) {
    t.stylesheets = null, t.unsuspend !== null && (t.count++, $o = /* @__PURE__ */ new Map(), n.forEach(Xw, t), $o = null, Br.call(t));
  }
  function Xw(t, n) {
    if (!(n.state.loading & 4)) {
      var s = $o.get(t);
      if (s) var l = s.get(null);
      else {
        s = /* @__PURE__ */ new Map(), $o.set(t, s);
        for (var u = t.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), f = 0; f < u.length; f++) {
          var y = u[f];
          (y.nodeName === "LINK" || y.getAttribute("media") !== "not all") && (s.set(y.dataset.precedence, y), l = y);
        }
        l && s.set(null, l);
      }
      u = n.instance, y = u.getAttribute("data-precedence"), f = s.get(y) || l, f === l && s.set(null, u), s.set(y, u), this.count++, l = Br.bind(this), u.addEventListener("load", l), u.addEventListener("error", l), f ? f.parentNode.insertBefore(u, f.nextSibling) : (t = t.nodeType === 9 ? t.head : t, t.insertBefore(u, t.firstChild)), n.state.loading |= 4;
    }
  }
  var Ma = {
    $$typeof: tt,
    Provider: null,
    Consumer: null,
    _currentValue: ii,
    _currentValue2: ii,
    _threadCount: 0
  };
  function Kw(t, n, s, l, u, f, y, S, E) {
    this.tag = 1, this.containerInfo = t, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = lc(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = lc(0), this.hiddenUpdates = lc(null), this.identifierPrefix = l, this.onUncaughtError = u, this.onCaughtError = f, this.onRecoverableError = y, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = E, this.transitionTypes = null, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function r0(t, n, s, l, u, f, y, S, E, R, U, H) {
    return t = new Kw(
      t,
      n,
      s,
      y,
      E,
      R,
      U,
      H,
      S
    ), n = 1, f === !0 && (n |= 24), f = ke(3, null, null, n), t.current = f, f.stateNode = t, n = Pc(), n.refCount++, t.pooledCache = n, n.refCount++, f.memoizedState = {
      element: l,
      isDehydrated: s,
      cache: n
    }, Ic(f), t;
  }
  function l0(t) {
    return t ? (t = na, t) : na;
  }
  function o0(t, n, s, l, u, f) {
    u = l0(u), l.context === null ? l.context = u : l.pendingContext = u, l = Vi(n), l.payload = { element: s }, f = f === void 0 ? null : f, f !== null && (l.callback = f), s = Li(t, l, n), s !== null && (Pe(s, t, n), gr(s, t, n));
  }
  function u0(t, n) {
    if (t = t.memoizedState, t !== null && t.dehydrated !== null) {
      var s = t.retryLane;
      t.retryLane = s !== 0 && s < n ? s : n;
    }
  }
  function Ch(t, n) {
    u0(t, n), (t = t.alternate) && u0(t, n);
  }
  function c0(t) {
    if (t.tag === 13 || t.tag === 31) {
      var n = ds(t, 67108864);
      n !== null && Pe(n, t, 67108864), Ch(t, 67108864);
    }
  }
  function f0(t) {
    if (t.tag === 13 || t.tag === 31) {
      var n = nn();
      n = oc(n);
      var s = ds(t, n);
      s !== null && Pe(s, t, n), Ch(t, n);
    }
  }
  var Ra = !0;
  function Fw(t, n, s, l) {
    var u = rt.T;
    rt.T = null;
    var f = ht.p;
    try {
      ht.p = 2, Mh(t, n, s, l);
    } finally {
      ht.p = f, rt.T = u;
    }
  }
  function Qw(t, n, s, l) {
    var u = rt.T;
    rt.T = null;
    var f = ht.p;
    try {
      ht.p = 8, Mh(t, n, s, l);
    } finally {
      ht.p = f, rt.T = u;
    }
  }
  function Mh(t, n, s, l) {
    if (Ra) {
      var u = Rh(l);
      if (u === null)
        fh(
          t,
          n,
          l,
          Yo,
          s
        ), d0(t, l);
      else if (Ww(
        u,
        t,
        n,
        s,
        l
      ))
        l.stopPropagation();
      else if (d0(t, l), n & 4 && -1 < Jw.indexOf(t)) {
        for (; u !== null; ) {
          var f = Ys(u);
          if (f !== null)
            switch (f.tag) {
              case 3:
                if (f = f.stateNode, f.current.memoizedState.isDehydrated) {
                  var y = os(f.pendingLanes);
                  if (y !== 0) {
                    var S = f;
                    for (S.pendingLanes |= 2, S.entangledLanes |= 2; y; ) {
                      var E = 1 << 31 - Ke(y);
                      S.entanglements[1] |= E, y &= ~E;
                    }
                    Kn(f), (Mt & 6) === 0 && (Mo = qe() + 500, Dr(0));
                  }
                }
                break;
              case 31:
              case 13:
                S = ds(f, 2), S !== null && Pe(S, f, 2), No(), Ch(f, 2);
            }
          if (f = Rh(l), f === null && fh(
            t,
            n,
            l,
            Yo,
            s
          ), f === u) break;
          u = f;
        }
        u !== null && l.stopPropagation();
      } else
        fh(
          t,
          n,
          l,
          null,
          s
        );
    }
  }
  function Rh(t) {
    return t = pc(t), Dh(t);
  }
  var Yo = null;
  function Dh(t) {
    if (Yo = null, t = us(t), t !== null) {
      var n = c(t);
      if (n === null) t = null;
      else {
        var s = n.tag;
        if (s === 13) {
          if (t = h(n), t !== null) return t;
          t = null;
        } else if (s === 31) {
          if (t = d(n), t !== null) return t;
          t = null;
        } else if (s === 3) {
          if (n.stateNode.current.memoizedState.isDehydrated)
            return n.tag === 3 ? n.stateNode.containerInfo : null;
          t = null;
        } else n !== t && (t = null);
      }
    }
    return Yo = t, null;
  }
  function h0(t) {
    switch (t) {
      case "beforetoggle":
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "seeked":
      case "submit":
      case "toggle":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "fullscreenerror":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 2;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "resize":
      case "scroll":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 8;
      case "message":
        switch (cx()) {
          case Qm:
            return 2;
          case Jm:
            return 8;
          case xl:
          case fx:
            return 32;
          case Wm:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var Nh = !1, Xi = null, Ki = null, Fi = null, Zr = /* @__PURE__ */ new Map(), Hr = /* @__PURE__ */ new Map(), Qi = [], Jw = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function d0(t, n) {
    switch (t) {
      case "focusin":
      case "focusout":
        Xi = null;
        break;
      case "dragenter":
      case "dragleave":
        Ki = null;
        break;
      case "mouseover":
      case "mouseout":
        Fi = null;
        break;
      case "pointerover":
      case "pointerout":
        Zr.delete(n.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        Hr.delete(n.pointerId);
    }
  }
  function Pr(t, n, s, l, u, f) {
    return t === null || t.nativeEvent !== f ? (t = {
      blockedOn: n,
      domEventName: s,
      eventSystemFlags: l,
      nativeEvent: f,
      targetContainers: [u]
    }, n !== null && (n = Ys(n), n !== null && c0(n)), t) : (t.eventSystemFlags |= l, n = t.targetContainers, u !== null && n.indexOf(u) === -1 && n.push(u), t);
  }
  function Ww(t, n, s, l, u) {
    switch (n) {
      case "focusin":
        return Xi = Pr(
          Xi,
          t,
          n,
          s,
          l,
          u
        ), !0;
      case "dragenter":
        return Ki = Pr(
          Ki,
          t,
          n,
          s,
          l,
          u
        ), !0;
      case "mouseover":
        return Fi = Pr(
          Fi,
          t,
          n,
          s,
          l,
          u
        ), !0;
      case "pointerover":
        var f = u.pointerId;
        return Zr.set(
          f,
          Pr(
            Zr.get(f) || null,
            t,
            n,
            s,
            l,
            u
          )
        ), !0;
      case "gotpointercapture":
        return f = u.pointerId, Hr.set(
          f,
          Pr(
            Hr.get(f) || null,
            t,
            n,
            s,
            l,
            u
          )
        ), !0;
    }
    return !1;
  }
  function m0(t) {
    var n = us(t.target);
    if (n !== null) {
      var s = c(n);
      if (s !== null) {
        if (n = s.tag, n === 13) {
          if (n = h(s), n !== null) {
            t.blockedOn = n, rp(t.priority, function() {
              f0(s);
            });
            return;
          }
        } else if (n === 31) {
          if (n = d(s), n !== null) {
            t.blockedOn = n, rp(t.priority, function() {
              f0(s);
            });
            return;
          }
        } else if (n === 3 && s.stateNode.current.memoizedState.isDehydrated) {
          t.blockedOn = s.tag === 3 ? s.stateNode.containerInfo : null;
          return;
        }
      }
    }
    t.blockedOn = null;
  }
  function Io(t) {
    if (t.blockedOn !== null) return !1;
    for (var n = t.targetContainers; 0 < n.length; ) {
      var s = Rh(t.nativeEvent);
      if (s === null) {
        s = t.nativeEvent;
        var l = new s.constructor(
          s.type,
          s
        );
        mc = l, s.target.dispatchEvent(l), mc = null;
      } else
        return n = Ys(s), n !== null && c0(n), t.blockedOn = s, !1;
      n.shift();
    }
    return !0;
  }
  function p0(t, n, s) {
    Io(t) && s.delete(n);
  }
  function tA() {
    Nh = !1, Xi !== null && Io(Xi) && (Xi = null), Ki !== null && Io(Ki) && (Ki = null), Fi !== null && Io(Fi) && (Fi = null), Zr.forEach(p0), Hr.forEach(p0);
  }
  function qo(t, n) {
    t.blockedOn === n && (t.blockedOn = null, Nh || (Nh = !0, e.unstable_scheduleCallback(
      e.unstable_NormalPriority,
      tA
    )));
  }
  var Xo = null;
  function g0(t) {
    Xo !== t && (Xo = t, e.unstable_scheduleCallback(
      e.unstable_NormalPriority,
      function() {
        Xo === t && (Xo = null);
        for (var n = 0; n < t.length; n += 3) {
          var s = t[n], l = t[n + 1], u = t[n + 2];
          if (typeof l != "function") {
            if (Dh(l || s) === null)
              continue;
            break;
          }
          var f = Ys(s);
          f !== null && (t.splice(n, 3), n -= 3, mf(
            f,
            {
              pending: !0,
              data: u,
              method: s.method,
              action: l
            },
            l,
            u
          ));
        }
      }
    ));
  }
  function Da(t) {
    function n(E) {
      return qo(E, t);
    }
    Xi !== null && qo(Xi, t), Ki !== null && qo(Ki, t), Fi !== null && qo(Fi, t), Zr.forEach(n), Hr.forEach(n);
    for (var s = 0; s < Qi.length; s++) {
      var l = Qi[s];
      l.blockedOn === t && (l.blockedOn = null);
    }
    for (; 0 < Qi.length && (s = Qi[0], s.blockedOn === null); )
      m0(s), s.blockedOn === null && Qi.shift();
    if (s = (t.ownerDocument || t).$$reactFormReplay, s != null)
      for (l = 0; l < s.length; l += 3) {
        var u = s[l], f = s[l + 1], y = u[Ue] || null;
        if (typeof f == "function")
          y || g0(s);
        else if (y) {
          var S = null;
          if (f && f.hasAttribute("formAction")) {
            if (u = f, y = f[Ue] || null)
              S = y.formAction;
            else if (Dh(u) !== null) continue;
          } else S = y.action;
          typeof S == "function" ? s[l + 1] = S : (s.splice(l, 3), l -= 3), g0(s);
        }
      }
  }
  function y0() {
    function t(f) {
      f.canIntercept && f.info === "react-transition" && f.intercept({
        handler: function() {
          return new Promise(function(y) {
            return u = y;
          });
        },
        focusReset: "manual",
        scroll: "manual"
      });
    }
    function n() {
      u !== null && (u(), u = null), l || setTimeout(s, 20);
    }
    function s() {
      if (!l && !navigation.transition) {
        var f = navigation.currentEntry;
        f && f.url != null && navigation.navigate(f.url, {
          state: f.getState(),
          info: "react-transition",
          history: "replace"
        });
      }
    }
    if (typeof navigation == "object") {
      var l = !1, u = null;
      return navigation.addEventListener("navigate", t), navigation.addEventListener("navigatesuccess", n), navigation.addEventListener("navigateerror", n), setTimeout(s, 100), function() {
        l = !0, navigation.removeEventListener("navigate", t), navigation.removeEventListener("navigatesuccess", n), navigation.removeEventListener("navigateerror", n), u !== null && (u(), u = null);
      };
    }
  }
  function jh(t) {
    this._internalRoot = t;
  }
  Ko.prototype.render = jh.prototype.render = function(t) {
    var n = this._internalRoot;
    if (n === null) throw Error(r(409));
    var s = n.current, l = nn();
    o0(s, l, t, n, null, null);
  }, Ko.prototype.unmount = jh.prototype.unmount = function() {
    var t = this._internalRoot;
    if (t !== null) {
      this._internalRoot = null;
      var n = t.containerInfo;
      o0(t.current, 2, null, t, null, null), No(), n[Gs] = null;
    }
  };
  function Ko(t) {
    this._internalRoot = t;
  }
  Ko.prototype.unstable_scheduleHydration = function(t) {
    if (t) {
      var n = ap();
      t = { blockedOn: null, target: t, priority: n };
      for (var s = 0; s < Qi.length && n !== 0 && n < Qi[s].priority; s++) ;
      Qi.splice(s, 0, t), s === 0 && m0(t);
    }
  };
  var v0 = i.version;
  if (v0 !== "19.3.0")
    throw Error(
      r(
        527,
        v0,
        "19.3.0"
      )
    );
  ht.findDOMNode = function(t) {
    var n = t._reactInternals;
    if (n === void 0)
      throw typeof t.render == "function" ? Error(r(188)) : (t = Object.keys(t).join(","), Error(r(268, t)));
    return t = p(n), t = t !== null ? g(t) : null, t = t === null ? null : t.stateNode, t;
  };
  var eA = {
    bundleType: 0,
    version: "19.3.0",
    rendererPackageName: "react-dom",
    currentDispatcherRef: rt,
    reconcilerVersion: "19.3.0"
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Fo = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Fo.isDisabled && Fo.supportsFiber)
      try {
        Fa = Fo.inject(
          eA
        ), Xe = Fo;
      } catch {
      }
  }
  return $r.createRoot = function(t, n) {
    if (!o(t)) throw Error(r(299));
    var s = !1, l = "", u = ly, f = oy, y = uy;
    return n != null && (n.unstable_strictMode === !0 && (s = !0), n.identifierPrefix !== void 0 && (l = n.identifierPrefix), n.onUncaughtError !== void 0 && (u = n.onUncaughtError), n.onCaughtError !== void 0 && (f = n.onCaughtError), n.onRecoverableError !== void 0 && (y = n.onRecoverableError)), n = r0(
      t,
      1,
      !1,
      null,
      null,
      s,
      l,
      null,
      u,
      f,
      y,
      y0
    ), t[Gs] = n.current, ch(t), new jh(n);
  }, $r.hydrateRoot = function(t, n, s) {
    if (!o(t)) throw Error(r(299));
    var l = !1, u = "", f = ly, y = oy, S = uy, E = null;
    return s != null && (s.unstable_strictMode === !0 && (l = !0), s.identifierPrefix !== void 0 && (u = s.identifierPrefix), s.onUncaughtError !== void 0 && (f = s.onUncaughtError), s.onCaughtError !== void 0 && (y = s.onCaughtError), s.onRecoverableError !== void 0 && (S = s.onRecoverableError), s.formState !== void 0 && (E = s.formState)), n = r0(
      t,
      1,
      !0,
      n,
      s ?? null,
      l,
      u,
      E,
      f,
      y,
      S,
      y0
    ), n.context = l0(null), s = n.current, l = nn(), l = oc(l), u = Vi(l), u.callback = null, Li(s, u, l), s = l, n.current.lanes = s, Ja(n, s), Kn(n), t[Gs] = n.current, ch(t), new Ko(n);
  }, $r.version = "19.3.0", $r;
}
var A0;
function uA() {
  if (A0) return Vh.exports;
  A0 = 1;
  function e() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(e);
      } catch (i) {
        console.error(i);
      }
  }
  return e(), Vh.exports = oA(), Vh.exports;
}
var cA = uA(), B = Wd();
const Qo = /* @__PURE__ */ iA(B);
var Zh = { exports: {} }, Gr = {};
var O0;
function fA() {
  if (O0) return Gr;
  O0 = 1;
  var e = /* @__PURE__ */ Symbol.for("react.transitional.element"), i = /* @__PURE__ */ Symbol.for("react.fragment");
  function a(r, o, c) {
    var h = null;
    if (c !== void 0 && (h = "" + c), o.key !== void 0 && (h = "" + o.key), "key" in o) {
      c = {};
      for (var d in o)
        d !== "key" && (c[d] = o[d]);
    } else c = o;
    return o = c.ref, {
      $$typeof: e,
      type: r,
      key: h,
      ref: o !== void 0 ? o : null,
      props: c
    };
  }
  return Gr.Fragment = i, Gr.jsx = a, Gr.jsxs = a, Gr;
}
var z0;
function hA() {
  return z0 || (z0 = 1, Zh.exports = fA()), Zh.exports;
}
var w = hA();
const d1 = B.createContext({});
function dA(e) {
  const i = B.useRef(null);
  return i.current === null && (i.current = e()), i.current;
}
const mA = typeof window < "u", pA = mA ? B.useLayoutEffect : B.useEffect, tm = /* @__PURE__ */ B.createContext(null);
function em(e, i) {
  e.indexOf(i) === -1 && e.push(i);
}
function Su(e, i) {
  const a = e.indexOf(i);
  a > -1 && e.splice(a, 1);
}
const jn = (e, i, a) => a > i ? i : a < e ? e : a;
let Zu = () => {
};
const _i = {}, nm = (e) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(e), m1 = (e) => typeof e == "object" && e !== null, im = (e) => /^0[^.\s]+$/u.test(e);
// @__NO_SIDE_EFFECTS__
function p1(e) {
  let i;
  return () => (i === void 0 && (i = e()), i);
}
const Nn = /* @__NO_SIDE_EFFECTS__ */ (e) => e, pl = (...e) => e.reduce((i, a) => (r) => a(i(r))), ll = /* @__NO_SIDE_EFFECTS__ */ (e, i, a) => {
  const r = i - e;
  return r ? (a - e) / r : 1;
};
class _u {
  constructor() {
    this.subscriptions = [];
  }
  add(i) {
    return em(this.subscriptions, i), () => this.remove(i);
  }
  remove(i) {
    Su(this.subscriptions, i);
  }
  notify(i, a, r) {
    const o = this.subscriptions.length;
    if (o)
      if (o === 1)
        this.subscriptions[0](i, a, r);
      else
        for (let c = 0; c < o; c++) {
          const h = this.subscriptions[c];
          h && h(i, a, r);
        }
  }
  getSize() {
    return this.subscriptions.length;
  }
  clear() {
    this.subscriptions.length = 0;
  }
}
const bn = /* @__NO_SIDE_EFFECTS__ */ (e) => e * 1e3, rn = /* @__NO_SIDE_EFFECTS__ */ (e) => e / 1e3, g1 = /* @__NO_SIDE_EFFECTS__ */ (e, i) => i ? e * (1e3 / i) : 0, y1 = (e, i, a) => (((1 - 3 * a + 3 * i) * e + (3 * a - 6 * i)) * e + 3 * i) * e, gA = 1e-7, yA = 12;
function vA(e, i, a, r, o) {
  let c, h, d = 0;
  do
    h = i + (a - i) / 2, c = y1(h, r, o) - e, c > 0 ? a = h : i = h;
  while (Math.abs(c) > gA && ++d < yA);
  return h;
}
// @__NO_SIDE_EFFECTS__
function gl(e, i, a, r) {
  if (e === i && a === r)
    return Nn;
  const o = (c) => vA(c, 0, 1, e, a);
  return (c) => c === 0 || c === 1 ? c : y1(o(c), i, r);
}
const v1 = /* @__NO_SIDE_EFFECTS__ */ (e) => (i) => i <= 0.5 ? e(2 * i) / 2 : (2 - e(2 * (1 - i))) / 2, b1 = /* @__NO_SIDE_EFFECTS__ */ (e) => (i) => 1 - e(1 - i), S1 = /* @__PURE__ */ gl(0.33, 1.53, 0.69, 0.99), sm = /* @__PURE__ */ b1(S1), _1 = /* @__PURE__ */ v1(sm), T1 = (e) => e >= 1 ? 1 : (e *= 2) < 1 ? 0.5 * sm(e) : 0.5 * (2 - Math.pow(2, -10 * (e - 1))), am = (e) => 1 - Math.sin(Math.acos(e)), x1 = /* @__PURE__ */ b1(am), E1 = /* @__PURE__ */ v1(am), bA = /* @__PURE__ */ gl(0.42, 0, 1, 1), SA = /* @__PURE__ */ gl(0, 0, 0.58, 1), w1 = /* @__PURE__ */ gl(0.42, 0, 0.58, 1), _A = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] != "number", A1 = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] == "number", TA = {
  linear: Nn,
  easeIn: bA,
  easeInOut: w1,
  easeOut: SA,
  circIn: am,
  circInOut: E1,
  circOut: x1,
  backIn: sm,
  backInOut: _1,
  backOut: S1,
  anticipate: T1
}, xA = (e) => typeof e == "string", C0 = (e) => {
  if (/* @__PURE__ */ A1(e)) {
    Zu(e.length === 4);
    const [i, a, r, o] = e;
    return /* @__PURE__ */ gl(i, a, r, o);
  } else if (xA(e))
    return TA[e];
  return e;
}, Jo = [
  "setup",
  // Compute
  "read",
  // Read
  "resolveKeyframes",
  // Write/Read/Write/Read
  "preUpdate",
  // Compute
  "update",
  // Compute
  "preRender",
  // Compute
  "render",
  // Write
  "postRender"
  // Compute
];
function EA(e) {
  let i = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Set(), r = !1, o = !1;
  const c = /* @__PURE__ */ new Set();
  let h = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  };
  function d(p) {
    c.has(p) && (a.add(p), e()), p(h);
  }
  const m = {
    /**
     * Schedule a process to run on the next frame.
     */
    schedule: (p, g = !1, v = !1) => {
      const _ = v && r ? i : a;
      return g && c.add(p), _.add(p), p;
    },
    /**
     * Cancel the provided callback from running on the next frame.
     */
    cancel: (p) => {
      a.delete(p), c.delete(p);
    },
    /**
     * Execute all schedule callbacks.
     */
    process: (p) => {
      if (h = p, r) {
        o = !0;
        return;
      }
      r = !0;
      const g = i;
      i = a, a = g, i.forEach(d), i.clear(), r = !1, o && (o = !1, m.process(p));
    }
  };
  return m;
}
const wA = 40;
function O1(e, i) {
  let a = !1, r = !0;
  const o = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  }, c = () => a = !0, h = Jo.reduce((k, G) => (k[G] = EA(c), k), {}), { setup: d, read: m, resolveKeyframes: p, preUpdate: g, update: v, preRender: b, render: _, postRender: T } = h, x = () => {
    const k = _i.useManualTiming, G = k ? o.timestamp : performance.now();
    a = !1, k || (o.delta = r ? 1e3 / 60 : Math.max(Math.min(G - o.timestamp, wA), 1)), o.timestamp = G, o.isProcessing = !0, d.process(o), m.process(o), p.process(o), g.process(o), v.process(o), b.process(o), _.process(o), T.process(o), o.isProcessing = !1, a && i && (r = !1, e(x));
  }, A = () => {
    a = !0, r = !0, o.isProcessing || e(x);
  };
  return { schedule: Jo.reduce((k, G) => {
    const X = h[G];
    return k[G] = (q, V = !1, $ = !1) => (a || A(), X.schedule(q, V, $)), k;
  }, {}), cancel: (k) => {
    for (let G = 0; G < Jo.length; G++)
      h[Jo[G]].cancel(k);
  }, state: o, steps: h };
}
const { schedule: Bt, cancel: es, state: oe, steps: Hh } = /* @__PURE__ */ O1(typeof requestAnimationFrame < "u" ? requestAnimationFrame : Nn, !0);
let cu;
function AA() {
  cu = void 0;
}
const ze = {
  now: () => (cu === void 0 && ze.set(oe.isProcessing || _i.useManualTiming ? oe.timestamp : performance.now()), cu),
  set: (e) => {
    cu = e, queueMicrotask(AA);
  }
}, ka = (e) => Math.round(e * 1e5) / 1e5, z1 = (e) => (i) => typeof i == "string" && i.startsWith(e), C1 = /* @__PURE__ */ z1("--"), OA = /* @__PURE__ */ z1("var(--"), rm = (e) => OA(e) ? zA.test(e.split("/*")[0].trim()) : !1, zA = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;
function M0(e) {
  return typeof e != "string" ? !1 : e.split("/*")[0].includes("var(--");
}
const Ya = {
  test: (e) => typeof e == "number",
  parse: parseFloat,
  transform: (e) => e
}, ol = {
  ...Ya,
  transform: (e) => jn(0, 1, e)
}, Wo = {
  ...Ya,
  default: 1
}, lm = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
function CA(e) {
  return e == null;
}
const MA = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu, om = (e, i) => (a) => !!(typeof a == "string" && MA.test(a) && a.startsWith(e) || i && !CA(a) && Object.prototype.hasOwnProperty.call(a, i)), M1 = (e, i, a) => (r) => {
  if (typeof r != "string")
    return r;
  const [o, c, h, d] = r.match(lm);
  return {
    [e]: parseFloat(o),
    [i]: parseFloat(c),
    [a]: parseFloat(h),
    alpha: d !== void 0 ? parseFloat(d) : 1
  };
}, RA = (e) => jn(0, 255, e), Ph = {
  ...Ya,
  transform: (e) => Math.round(RA(e))
}, Ns = {
  test: /* @__PURE__ */ om("rgb", "red"),
  parse: /* @__PURE__ */ M1("red", "green", "blue"),
  transform: ({ red: e, green: i, blue: a, alpha: r = 1 }) => "rgba(" + Ph.transform(e) + ", " + Ph.transform(i) + ", " + Ph.transform(a) + ", " + ka(ol.transform(r)) + ")"
};
function DA(e) {
  let i = "", a = "", r = "", o = "";
  return e.length > 5 ? (i = e.substring(1, 3), a = e.substring(3, 5), r = e.substring(5, 7), o = e.substring(7, 9)) : (i = e.substring(1, 2), a = e.substring(2, 3), r = e.substring(3, 4), o = e.substring(4, 5), i += i, a += a, r += r, o += o), {
    red: parseInt(i, 16),
    green: parseInt(a, 16),
    blue: parseInt(r, 16),
    alpha: o ? parseInt(o, 16) / 255 : 1
  };
}
const gd = {
  test: /* @__PURE__ */ om("#"),
  parse: DA,
  transform: Ns.transform
}, yl = /* @__NO_SIDE_EFFECTS__ */ (e) => ({
  test: (i) => typeof i == "string" && i.endsWith(e) && i.split(" ").length === 1,
  parse: parseFloat,
  transform: (i) => `${i}${e}`
}), bi = /* @__PURE__ */ yl("deg"), Jn = /* @__PURE__ */ yl("%"), nt = /* @__PURE__ */ yl("px"), NA = /* @__PURE__ */ yl("vh"), jA = /* @__PURE__ */ yl("vw"), R0 = {
  ...Jn,
  parse: (e) => Jn.parse(e) / 100,
  transform: (e) => Jn.transform(e * 100)
}, Va = {
  test: /* @__PURE__ */ om("hsl", "hue"),
  parse: /* @__PURE__ */ M1("hue", "saturation", "lightness"),
  transform: ({ hue: e, saturation: i, lightness: a, alpha: r = 1 }) => "hsla(" + Math.round(e) + ", " + Jn.transform(ka(i)) + ", " + Jn.transform(ka(a)) + ", " + ka(ol.transform(r)) + ")"
}, ue = {
  test: (e) => Ns.test(e) || gd.test(e) || Va.test(e),
  parse: (e) => Ns.test(e) ? Ns.parse(e) : Va.test(e) ? Va.parse(e) : gd.parse(e),
  transform: (e) => typeof e == "string" ? e : e.hasOwnProperty("red") ? Ns.transform(e) : Va.transform(e),
  getAnimatableNone: (e) => {
    const i = ue.parse(e);
    return i.alpha = 0, ue.transform(i);
  }
}, VA = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu, R1 = /* @__PURE__ */ new RegExp(lm.source), D1 = /* @__PURE__ */ new RegExp(VA.source, "i");
function LA(e) {
  return isNaN(e) && typeof e == "string" && (R1.test(e) || D1.test(e));
}
const N1 = "number", j1 = "color", UA = "var", kA = "var(", D0 = "${}", BA = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;
function ZA(e) {
  const i = e.toString();
  return R1.test(i) || D1.test(i);
}
function ul(e) {
  const i = e.toString(), a = [], r = {
    color: [],
    number: [],
    var: []
  }, o = [];
  let c = 0;
  const d = i.replace(BA, (m) => (ue.test(m) ? (r.color.push(c), o.push(j1), a.push(ue.parse(m))) : m.startsWith(kA) ? (r.var.push(c), o.push(UA), a.push(m)) : (r.number.push(c), o.push(N1), a.push(parseFloat(m))), ++c, D0)).split(D0);
  return { values: a, split: d, indexes: r, types: o };
}
function HA(e) {
  return ul(e).values;
}
function V1({ split: e, types: i }) {
  const a = e.length;
  return (r) => {
    let o = "";
    for (let c = 0; c < a; c++)
      if (o += e[c], r[c] !== void 0) {
        const h = i[c];
        h === N1 ? o += ka(r[c]) : h === j1 ? o += ue.transform(r[c]) : o += r[c];
      }
    return o;
  };
}
function PA(e) {
  return V1(ul(e));
}
const $A = (e) => typeof e == "number" ? 0 : ue.test(e) ? ue.getAnimatableNone(e) : e, GA = (e, i) => typeof e == "number" ? i?.trim().endsWith("/") ? e : 0 : $A(e);
function YA(e) {
  const i = ul(e);
  return V1(i)(i.values.map((r, o) => GA(r, i.split[o])));
}
const ln = {
  test: LA,
  parse: HA,
  createTransformer: PA,
  getAnimatableNone: YA
};
function $h(e, i, a) {
  return a < 0 && (a += 1), a > 1 && (a -= 1), a < 1 / 6 ? e + (i - e) * 6 * a : a < 1 / 2 ? i : a < 2 / 3 ? e + (i - e) * (2 / 3 - a) * 6 : e;
}
function IA({ hue: e, saturation: i, lightness: a, alpha: r }) {
  e /= 360, i /= 100, a /= 100;
  let o = 0, c = 0, h = 0;
  if (!i)
    o = c = h = a;
  else {
    const d = a < 0.5 ? a * (1 + i) : a + i - a * i, m = 2 * a - d;
    o = $h(m, d, e + 1 / 3), c = $h(m, d, e), h = $h(m, d, e - 1 / 3);
  }
  return {
    red: Math.round(o * 255),
    green: Math.round(c * 255),
    blue: Math.round(h * 255),
    alpha: r
  };
}
function Tu(e, i) {
  return (a) => a > 0 ? i : e;
}
const Ut = (e, i, a) => e + (i - e) * a, Gh = (e, i, a) => {
  const r = e * e, o = a * (i * i - r) + r;
  return o < 0 ? 0 : Math.sqrt(o);
}, qA = [gd, Ns, Va], XA = (e) => qA.find((i) => i.test(e));
function N0(e) {
  const i = XA(e);
  if (!i)
    return !1;
  let a = i.parse(e);
  return i === Va && (a = IA(a)), a;
}
const j0 = (e, i) => {
  const a = N0(e), r = N0(i);
  if (!a || !r)
    return Tu(e, i);
  const o = { ...a };
  return (c) => (o.red = Gh(a.red, r.red, c), o.green = Gh(a.green, r.green, c), o.blue = Gh(a.blue, r.blue, c), o.alpha = Ut(a.alpha, r.alpha, c), Ns.transform(o));
}, yd = /* @__PURE__ */ new Set(["none", "hidden"]);
function KA(e, i) {
  return yd.has(e) ? (a) => a <= 0 ? e : i : (a) => a >= 1 ? i : e;
}
function FA(e, i) {
  return (a) => Ut(e, i, a);
}
function um(e) {
  return typeof e == "number" ? FA : typeof e == "string" ? rm(e) ? Tu : ue.test(e) ? j0 : WA : Array.isArray(e) ? L1 : typeof e == "object" ? ue.test(e) ? j0 : QA : Tu;
}
function L1(e, i) {
  const a = [...e], r = a.length, o = e.map((c, h) => um(c)(c, i[h]));
  return (c) => {
    for (let h = 0; h < r; h++)
      a[h] = o[h](c);
    return a;
  };
}
function QA(e, i) {
  const a = { ...e, ...i }, r = {};
  for (const o in a)
    e[o] !== void 0 && i[o] !== void 0 && (r[o] = um(e[o])(e[o], i[o]));
  return (o) => {
    for (const c in r)
      a[c] = r[c](o);
    return a;
  };
}
function JA(e, i) {
  const a = [], r = { color: 0, var: 0, number: 0 };
  for (let o = 0; o < i.values.length; o++) {
    const c = i.types[o], h = e.indexes[c][r[c]], d = e.values[h] ?? 0;
    a[o] = d, r[c]++;
  }
  return a;
}
const WA = (e, i) => {
  const a = ln.createTransformer(i), r = ul(e), o = ul(i);
  return r.indexes.var.length === o.indexes.var.length && r.indexes.color.length === o.indexes.color.length && r.indexes.number.length >= o.indexes.number.length ? yd.has(e) && !o.values.length || yd.has(i) && !r.values.length ? KA(e, i) : pl(L1(JA(r, o), o.values), a) : Tu(e, i);
}, V0 = /^(-?(?:\d+(?:\.\d*)?|\.\d+))([a-z%]*)$/iu;
function tO(e, i) {
  const a = V0.exec(e);
  if (!a)
    return;
  const r = V0.exec(i);
  if (!r || a[2] !== r[2])
    return;
  const o = a[2], c = parseFloat(a[1]), h = parseFloat(r[1]);
  return (d) => ka(Ut(c, h, d)) + o;
}
function cm(e, i, a) {
  if (typeof e == "number" && typeof i == "number" && typeof a == "number")
    return Ut(e, i, a);
  if (typeof e == "string" && typeof i == "string") {
    const o = tO(e, i);
    if (o)
      return o;
  }
  return um(e)(e, i);
}
const eO = (e) => {
  const i = ({ timestamp: a }) => e(a);
  return {
    start: (a = !0) => Bt.update(i, a),
    stop: () => es(i),
    /**
     * If we're processing this frame we can use the
     * framelocked timestamp to keep things in sync.
     */
    now: () => oe.isProcessing ? oe.timestamp : ze.now()
  };
}, U1 = (e, i, a = 10) => {
  let r = "";
  const o = Math.max(Math.round(i / a), 2);
  for (let c = 0; c < o; c++)
    r += Math.round(e(c / (o - 1)) * 1e4) / 1e4 + ", ";
  return `linear(${r.substring(0, r.length - 2)})`;
}, fm = 2e4;
function hm(e, i = 50, a = fm, r) {
  let o = 0, c = e.next(o);
  for (; !c.done && o < a; )
    o += i, c = e.next(o);
  return o >= a ? 1 / 0 : o;
}
function nO(e, i = 100, a) {
  const r = a({ ...e, keyframes: [0, i] }), o = Math.min(hm(r), fm);
  return {
    type: "keyframes",
    ease: (c) => r.next(o * c).value / i,
    duration: /* @__PURE__ */ rn(o)
  };
}
const Jt = {
  // Default spring physics
  stiffness: 100,
  damping: 10,
  mass: 1,
  velocity: 0,
  // Default duration/bounce-based options
  duration: 800,
  // in ms
  bounce: 0.3,
  visualDuration: 0.3,
  // in seconds
  // Rest thresholds
  restSpeed: {
    granular: 0.01,
    default: 2
  },
  restDelta: {
    granular: 5e-3,
    default: 0.5
  },
  // Limits
  minDuration: 0.01,
  // in seconds
  maxDuration: 10,
  // in seconds
  minDamping: 0.05,
  maxDamping: 1
};
function vd(e, i) {
  return e * Math.sqrt(1 - i * i);
}
const iO = 12;
function sO(e, i, a) {
  let r = a;
  for (let o = 1; o < iO; o++)
    r = r - e(r) / i(r);
  return r;
}
const Yh = 1e-3;
function aO({ duration: e = Jt.duration, bounce: i = Jt.bounce, velocity: a = Jt.velocity, mass: r = Jt.mass }) {
  let o, c, h = 1 - i;
  h = jn(Jt.minDamping, Jt.maxDamping, h), e = jn(Jt.minDuration, Jt.maxDuration, /* @__PURE__ */ rn(e)), h < 1 ? (o = (p) => {
    const g = p * h, v = g * e, b = g - a, _ = vd(p, h), T = Math.exp(-v);
    return Yh - b / _ * T;
  }, c = (p) => {
    const v = p * h * e, b = v * a + a, _ = h * h * p * p * e, T = Math.exp(-v), x = vd(p * p, h);
    return (-o(p) + Yh > 0 ? -1 : 1) * ((b - _) * T) / x;
  }) : (o = (p) => {
    const g = Math.exp(-p * e), v = (p - a) * e + 1;
    return -Yh + g * v;
  }, c = (p) => {
    const g = Math.exp(-p * e), v = (a - p) * (e * e);
    return g * v;
  });
  const d = 5 / e, m = sO(o, c, d);
  if (e = /* @__PURE__ */ bn(e), isNaN(m))
    return {
      stiffness: Jt.stiffness,
      damping: Jt.damping,
      duration: e
    };
  {
    const p = m * m * r;
    return {
      stiffness: p,
      damping: h * 2 * Math.sqrt(r * p),
      duration: e
    };
  }
}
const k1 = ["duration", "bounce"], B1 = ["stiffness", "damping", "mass"];
function xu(e, i) {
  return i.some((a) => e[a] !== void 0);
}
function rO(e) {
  let i = {
    velocity: Jt.velocity,
    stiffness: Jt.stiffness,
    damping: Jt.damping,
    mass: Jt.mass,
    isResolvedFromDuration: !1,
    ...e
  };
  if (!xu(e, B1) && xu(e, k1))
    if (i.velocity = 0, e.visualDuration) {
      const a = e.visualDuration, r = 2 * Math.PI / (a * 1.2), o = r * r, c = 2 * jn(0.05, 1, 1 - (e.bounce || 0)) * Math.sqrt(o);
      i = {
        ...i,
        mass: Jt.mass,
        stiffness: o,
        damping: c
      };
    } else {
      const a = aO({ ...e, velocity: 0 });
      i = {
        ...i,
        ...a,
        mass: Jt.mass
      }, i.isResolvedFromDuration = !0;
    }
  return i;
}
function Eu(e = Jt.visualDuration, i = Jt.bounce) {
  const a = typeof e != "object" ? {
    visualDuration: e,
    keyframes: [0, 1],
    bounce: i
  } : e, r = a.keyframes[0], o = a.keyframes[a.keyframes.length - 1], c = { done: !1, value: r }, { stiffness: h, damping: d, mass: m, duration: p, velocity: g, isResolvedFromDuration: v } = rO({
    ...a,
    velocity: -/* @__PURE__ */ rn(a.velocity || 0)
  }), b = d / (2 * Math.sqrt(h * m)), _ = /* @__PURE__ */ rn(Math.sqrt(h / m)), T = b * _, x = {
    target: o,
    delta: o - r,
    velocity: g || 0,
    restSpeed: 0,
    restDelta: 0
  }, A = () => {
    const V = Math.abs(x.delta) < 5;
    x.restSpeed = a.restSpeed || (V ? Jt.restSpeed.granular : Jt.restSpeed.default), x.restDelta = a.restDelta || (V ? Jt.restDelta.granular : Jt.restDelta.default);
  };
  A();
  let N, D, k;
  if (b < 1) {
    const V = vd(_, b), $ = { A: 0, sinC: 0, cosC: 0, t: -1, env: 0, sin: 0, cos: 0 };
    k = () => {
      $.A = (x.velocity + T * x.delta) / V, $.sinC = T * $.A + x.delta * V, $.cosC = T * x.delta - $.A * V;
    };
    const J = (Q) => {
      Q !== $.t && ($.t = Q, $.env = Math.exp(-T * Q), $.sin = Math.sin(V * Q), $.cos = Math.cos(V * Q));
    };
    N = (Q) => (J(Q), x.target - $.env * ($.A * $.sin + x.delta * $.cos)), D = (Q) => (J(Q), $.env * ($.sinC * $.sin + $.cosC * $.cos));
  } else if (b === 1) {
    N = ($) => x.target - Math.exp(-_ * $) * (x.delta + (x.velocity + _ * x.delta) * $);
    const V = { C: 0 };
    k = () => {
      V.C = x.velocity + _ * x.delta;
    }, D = ($) => Math.exp(-_ * $) * (_ * V.C * $ - x.velocity);
  } else {
    const V = _ * Math.sqrt(b * b - 1);
    N = (J) => {
      const Q = Math.exp(-T * J), mt = Math.min(V * J, 300);
      return x.target - Q * ((x.velocity + T * x.delta) * Math.sinh(mt) + V * x.delta * Math.cosh(mt)) / V;
    };
    const $ = { P: 0, sinh: 0, cosh: 0 };
    k = () => {
      $.P = (x.velocity + T * x.delta) / V, $.sinh = T * $.P - x.delta * V, $.cosh = T * x.delta - $.P * V;
    }, D = (J) => {
      const Q = Math.exp(-T * J), mt = Math.min(V * J, 300);
      return Q * ($.sinh * Math.sinh(mt) + $.cosh * Math.cosh(mt));
    };
  }
  k();
  const G = !xu(a, B1) && xu(a, k1), X = v && p || null, q = {
    calculatedDuration: X,
    /**
     * Aim the spring at a new target from its current position and
     * velocity, reusing the resolved physics and closures.
     */
    retarget: (V, $) => {
      x.target = V[V.length - 1], x.delta = x.target - V[0], x.velocity = G ? 0 : -/* @__PURE__ */ rn($), a.restSpeed && a.restDelta || A(), q.calculatedDuration = X, c.done = !1, k();
    },
    velocity: (V) => /* @__PURE__ */ bn(D(V)),
    next: (V) => {
      const $ = N(V);
      if (v)
        c.done = V >= p;
      else {
        const J = /* @__PURE__ */ bn(D(V));
        c.done = Math.abs(J) <= x.restSpeed && Math.abs(x.target - $) <= x.restDelta;
      }
      return c.value = c.done ? x.target : $, c;
    },
    toString: () => {
      const V = Math.min(hm(q), fm), $ = U1((J) => q.next(V * J).value, V, 30);
      return V + "ms " + $;
    },
    toTransition: () => {
    }
  };
  return q;
}
Eu.applyToOptions = (e) => {
  const i = nO(e, 100, Eu);
  return e.ease = i.ease, e.duration = /* @__PURE__ */ bn(i.duration), e.type = "keyframes", e;
};
function bd({ keyframes: e, velocity: i = 0, power: a = 0.8, timeConstant: r = 325, bounceDamping: o = 10, bounceStiffness: c = 500, modifyTarget: h, min: d, max: m, restDelta: p = 0.5, restSpeed: g }) {
  const v = e[0], b = {
    done: !1,
    value: v
  }, _ = (V) => V < d || V > m, T = (V) => d === void 0 ? m : m === void 0 || Math.abs(d - V) < Math.abs(m - V) ? d : m;
  let x = a * i;
  const A = v + x, N = h === void 0 ? A : h(A);
  N !== A && (x = N - v);
  const D = (V) => -x * Math.exp(-V / r), k = (V) => {
    const $ = D(V);
    b.done = Math.abs($) <= p, b.value = b.done ? N : N + $;
  };
  let G, X;
  const q = (V) => {
    _(b.value) && (G = V, X = Eu({
      keyframes: [b.value, T(b.value)],
      /**
       * The friction curve is target + calcDelta(t), so its exact
       * derivative is -calcDelta(t) / timeConstant in units/ms,
       * converted here to the units/second expected by spring.
       */
      velocity: -D(V) / r * 1e3,
      damping: o,
      stiffness: c,
      restDelta: p,
      restSpeed: g
    }));
  };
  return q(0), {
    calculatedDuration: null,
    next: (V) => {
      let $ = !1;
      return !X && G === void 0 && ($ = !0, k(V), q(V)), G !== void 0 && V >= G ? X.next(V - G) : (!$ && k(V), b);
    }
  };
}
function lO(e, i, a) {
  const r = [], o = a || _i.mix || cm, c = e.length - 1;
  for (let h = 0; h < c; h++) {
    let d = o(e[h], e[h + 1]);
    if (i) {
      const m = Array.isArray(i) ? i[h] || Nn : i;
      d = pl(m, d);
    }
    r.push(d);
  }
  return r;
}
function oO(e, i, { clamp: a = !0, ease: r, mixer: o } = {}) {
  const c = e.length;
  if (Zu(c === i.length), c === 1)
    return () => i[0];
  if (c === 2 && i[0] === i[1])
    return () => i[1];
  const h = e[0] === e[1];
  e[0] > e[c - 1] && (e = [...e].reverse(), i = [...i].reverse());
  const d = lO(i, r, o), m = d.length, p = (g) => {
    if (h && g < e[0])
      return i[0];
    let v = 0;
    if (m > 1)
      for (; v < e.length - 2 && !(g < e[v + 1]); v++)
        ;
    const b = /* @__PURE__ */ ll(e[v], e[v + 1], g);
    return d[v](b);
  };
  return a ? (g) => p(jn(e[0], e[c - 1], g)) : p;
}
function uO(e, i) {
  const a = e[e.length - 1];
  for (let r = 1; r <= i; r++) {
    const o = /* @__PURE__ */ ll(0, i, r);
    e.push(Ut(a, 1, o));
  }
}
function cO(e) {
  const i = [0];
  return uO(i, e.length - 1), i;
}
function fO(e, i) {
  return e.map((a) => a * i);
}
function hO(e, i) {
  return e.map(() => i || w1).splice(0, e.length - 1);
}
function tl({ duration: e = 300, keyframes: i, times: a, ease: r = "easeInOut" }) {
  const o = /* @__PURE__ */ _A(r) ? r.map(C0) : C0(r), c = {
    done: !1,
    value: i[0]
  };
  if (i.length === 2 && !Array.isArray(o) && (!a || a.length !== 2 || a[0] === 0 && a[1] === 1)) {
    const [m, p] = i, g = m === p ? void 0 : (_i.mix || cm)(m, p);
    return {
      calculatedDuration: e,
      next: (v) => (c.value = g ? g(o(e > 0 ? jn(0, 1, v / e) : 1)) : p, c.done = v >= e, c)
    };
  }
  const h = fO(
    // Only use the provided offsets if they're the correct length
    // TODO Maybe we should warn here if there's a length mismatch
    a && a.length === i.length ? a : cO(i),
    e
  ), d = oO(h, i, {
    ease: Array.isArray(o) ? o : hO(i, o)
  });
  return {
    calculatedDuration: e,
    next: (m) => (c.value = d(m), c.done = m >= e, c)
  };
}
const dO = 5;
function mO(e, i, a) {
  const r = Math.max(i - dO, 0);
  return /* @__PURE__ */ g1(a - e(r), i - r);
}
function pO(e, i, a = 0) {
  return i <= 0 ? a : e.velocity ? e.velocity(i) : mO((r) => e.next(r).value, i, e.next(i).value);
}
const gO = (e) => e !== null;
function Hu(e, { repeat: i, repeatType: a = "loop" }, r, o = 1) {
  const c = e.filter(gO), d = o < 0 || i && a !== "loop" && i % 2 === 1 ? 0 : c.length - 1;
  return !d || r === void 0 ? c[d] : r;
}
const yO = {
  decay: bd,
  inertia: bd,
  tween: tl,
  keyframes: tl,
  spring: Eu
};
function Z1(e) {
  typeof e.type == "string" && (e.type = yO[e.type]);
}
function H1(e, i) {
  return {
    kind: e,
    animation: i,
    timestamp: ze.now(),
    frameTimestamp: oe.timestamp,
    frameIsProcessing: oe.isProcessing
  };
}
function P1(e, i, a) {
  const r = globalThis.__MOTION_INSPECT__;
  if (r)
    try {
      r({
        ...H1("animation-start", e),
        options: a ? { ...i, ...a } : i
      });
    } catch {
    }
}
function vO(e, i) {
  const a = globalThis.__MOTION_INSPECT__;
  if (a)
    try {
      a({
        ...H1("layout-animation-start", e),
        node: i
      });
    } catch {
    }
}
class dm {
  constructor() {
    this.isResolved = !1;
  }
  get finished() {
    return this._finished || (this._finished = this.isResolved ? Promise.resolve() : new Promise((i) => {
      this._resolve = i;
    })), this._finished;
  }
  updateFinished() {
    this._finished = this._resolve = void 0, this.isResolved = !1;
  }
  notifyFinished() {
    this.isResolved = !0, this._resolve?.();
  }
  /**
   * Allows the animation to be awaited.
   *
   * @deprecated Use `finished` instead.
   */
  then(i, a) {
    return this.finished.then(i, a);
  }
}
const bO = (e) => e / 100;
class wu extends dm {
  constructor(i) {
    super(), this.state = "idle", this.startTime = null, this.isStopped = !1, this.currentTime = 0, this.holdTime = null, this.playbackSpeed = 1, this.delayState = {
      done: !1,
      value: void 0
    }, this.stop = () => {
      const { motionValue: a } = this.options;
      a && a.updatedAt !== ze.now() && this.tick(ze.now()), this.isStopped = !0, this.state !== "idle" && (this.teardown(), this.options.onStop?.());
    }, this.options = i, this.initAnimation(), this.play(), i.autoplay === !1 && this.pause(), P1(this, this.options);
  }
  initAnimation() {
    const { options: i } = this;
    Z1(i);
    const { type: a = tl, repeat: r = 0, repeatDelay: o = 0, repeatType: c, velocity: h = 0 } = i;
    let { keyframes: d } = i;
    const m = a || tl;
    m !== tl && typeof d[0] != "number" && (this.mixKeyframes = pl(bO, cm(d[0], d[1])), d = [0, 100]);
    const p = m(d === i.keyframes ? i : { ...i, keyframes: d });
    c === "mirror" && (this.mirroredGenerator = m({
      ...i,
      keyframes: [...d].reverse(),
      velocity: -h
    })), p.calculatedDuration === null && (p.calculatedDuration = hm(p));
    const { calculatedDuration: g } = p;
    this.calculatedDuration = g, this.resolvedDuration = g + o, this.totalDuration = this.resolvedDuration * (r + 1) - o, this.generator = p;
  }
  updateTime(i) {
    const a = Math.round(i - this.startTime) * this.playbackSpeed;
    this.holdTime !== null ? this.currentTime = this.holdTime : this.currentTime = a;
  }
  tick(i, a = !1) {
    const { generator: r, totalDuration: o, mixKeyframes: c, mirroredGenerator: h, resolvedDuration: d, calculatedDuration: m } = this;
    if (this.startTime === null)
      return r.next(0);
    const { delay: p = 0, keyframes: g, repeat: v, repeatType: b, repeatDelay: _, type: T, onUpdate: x, finalKeyframe: A } = this.options;
    this.speed > 0 ? this.startTime = Math.min(this.startTime, i) : this.speed < 0 && (this.startTime = Math.min(i - o / this.speed, this.startTime)), a ? this.currentTime = i : this.updateTime(i);
    const N = this.currentTime - p * (this.playbackSpeed >= 0 ? 1 : -1), D = this.playbackSpeed >= 0 ? N < 0 : N > o;
    this.currentTime = Math.max(N, 0), this.state === "finished" && this.holdTime === null && (this.currentTime = o);
    let k = this.currentTime, G = r;
    if (v) {
      const $ = Math.min(this.currentTime, o) / d;
      let J = Math.floor($), Q = $ % 1;
      !Q && $ >= 1 && (Q = 1), Q === 1 && J--, J = Math.min(J, v + 1), J % 2 && (b === "reverse" ? (Q = 1 - Q, _ && (Q -= _ / d)) : b === "mirror" && (G = h)), k = jn(0, 1, Q) * d;
    }
    let X;
    D ? (this.delayState.value = g[0], X = this.delayState) : X = G.next(k), c && !D && (X.value = c(X.value));
    let { done: q } = X;
    !D && m !== null && (q = this.playbackSpeed >= 0 ? this.currentTime >= o : this.currentTime <= 0);
    const V = this.holdTime === null && (this.state === "finished" || this.state === "running" && q);
    return V && T !== bd && (X.value = Hu(g, this.options, A, this.speed)), x && x(X.value), V && this.finish(), X;
  }
  /**
   * Allows the returned animation to be awaited or promise-chained. Currently
   * resolves when the animation finishes at all but in a future update could/should
   * reject if its cancels.
   */
  then(i, a) {
    return this.finished.then(i, a);
  }
  get duration() {
    return /* @__PURE__ */ rn(this.calculatedDuration);
  }
  get iterationDuration() {
    const { delay: i = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ rn(i);
  }
  get time() {
    return /* @__PURE__ */ rn(this.currentTime);
  }
  set time(i) {
    i = /* @__PURE__ */ bn(i), this.currentTime = i, this.startTime === null || this.holdTime !== null || this.playbackSpeed === 0 ? this.holdTime = i : this.driver && (this.startTime = this.driver.now() - i / this.playbackSpeed), this.driver ? this.driver.start(!1) : (this.startTime = 0, this.state = "paused", this.holdTime = i, this.tick(i));
  }
  /**
   * Returns the generator's velocity at the current time in units/second.
   * Uses the analytical derivative when available (springs), avoiding
   * the MotionValue's frame-dependent velocity estimation.
   */
  getGeneratorVelocity() {
    return pO(this.generator, this.currentTime, this.options.velocity);
  }
  get speed() {
    return this.playbackSpeed;
  }
  set speed(i) {
    const a = this.playbackSpeed !== i;
    a && this.driver && this.updateTime(ze.now()), this.playbackSpeed = i, a && this.driver && (this.time = /* @__PURE__ */ rn(this.currentTime));
  }
  play() {
    if (this.isStopped)
      return;
    const { driver: i = eO, startTime: a } = this.options;
    this.driver || (this.driver = i((o) => this.tick(o))), this.options.onPlay?.();
    const r = this.driver.now();
    this.state === "finished" ? (this.updateFinished(), this.startTime = r) : this.holdTime !== null ? this.startTime = r - this.holdTime : this.startTime || (this.startTime = a ?? r), this.state === "finished" && this.speed < 0 && (this.startTime += this.calculatedDuration), this.holdTime = null, this.state = "running", this.driver.start();
  }
  pause() {
    this.state = "paused", this.updateTime(ze.now()), this.holdTime = this.currentTime;
  }
  complete() {
    this.state !== "running" && this.play(), this.state = "finished", this.holdTime = null;
  }
  finish() {
    this.notifyFinished(), this.teardown(), this.state = "finished", this.options.onComplete?.();
  }
  cancel() {
    this.holdTime = null, this.startTime = 0, this.tick(0), this.teardown(), this.options.onCancel?.();
  }
  teardown() {
    this.state = "idle", this.stopDriver(), this.startTime = this.holdTime = null;
  }
  stopDriver() {
    this.driver && (this.driver.stop(), this.driver = void 0);
  }
  sample(i) {
    return this.startTime = 0, this.tick(i, !0);
  }
  attachTimeline(i) {
    return this.options.allowFlatten && (this.options.type = "keyframes", this.options.ease = "linear", this.initAnimation()), this.driver?.stop(), i.observe(this);
  }
}
const SO = /* @__PURE__ */ new Set(["brightness", "contrast", "saturate", "opacity"]);
function _O(e) {
  const [i, a] = e.slice(0, -1).split("(");
  if (i === "drop-shadow")
    return e;
  const [r] = a.match(lm) || [];
  if (!r)
    return e;
  const o = a.replace(r, "");
  let c = SO.has(i) ? 1 : 0;
  return r !== a && (c *= 100), i + "(" + c + o + ")";
}
const TO = /\b([a-z-]*)\(.*?\)/gu, Sd = {
  ...ln,
  getAnimatableNone: (e) => {
    const i = e.match(TO);
    return i ? i.map(_O).join(" ") : e;
  }
}, _d = {
  ...ln,
  getAnimatableNone: (e) => {
    const i = ln.parse(e);
    return ln.createTransformer(e)(i.map((r) => typeof r == "number" ? 0 : typeof r == "object" ? { ...r, alpha: 1 } : r));
  }
}, L0 = {
  ...Ya,
  transform: Math.round
}, xO = {
  rotate: bi,
  /**
   * Internal channel for `transition.path` orientToPath. Composed onto
   * `rotate` at the transform-build sites so the user's `rotate` is
   * never read or overwritten. Not part of `transformPropOrder`.
   */
  pathRotation: bi,
  rotateX: bi,
  rotateY: bi,
  rotateZ: bi,
  scale: Wo,
  scaleX: Wo,
  scaleY: Wo,
  scaleZ: Wo,
  skew: bi,
  skewX: bi,
  skewY: bi,
  distance: nt,
  translateX: nt,
  translateY: nt,
  translateZ: nt,
  x: nt,
  y: nt,
  z: nt,
  perspective: nt,
  transformPerspective: nt,
  opacity: ol,
  originX: R0,
  originY: R0,
  originZ: nt
}, Au = {
  // Border props
  borderWidth: nt,
  borderTopWidth: nt,
  borderRightWidth: nt,
  borderBottomWidth: nt,
  borderLeftWidth: nt,
  borderRadius: nt,
  borderTopLeftRadius: nt,
  borderTopRightRadius: nt,
  borderBottomRightRadius: nt,
  borderBottomLeftRadius: nt,
  // Positioning props
  width: nt,
  maxWidth: nt,
  height: nt,
  maxHeight: nt,
  top: nt,
  right: nt,
  bottom: nt,
  left: nt,
  inset: nt,
  insetBlock: nt,
  insetBlockStart: nt,
  insetBlockEnd: nt,
  insetInline: nt,
  insetInlineStart: nt,
  insetInlineEnd: nt,
  // Spacing props
  padding: nt,
  paddingTop: nt,
  paddingRight: nt,
  paddingBottom: nt,
  paddingLeft: nt,
  paddingBlock: nt,
  paddingBlockStart: nt,
  paddingBlockEnd: nt,
  paddingInline: nt,
  paddingInlineStart: nt,
  paddingInlineEnd: nt,
  margin: nt,
  marginTop: nt,
  marginRight: nt,
  marginBottom: nt,
  marginLeft: nt,
  marginBlock: nt,
  marginBlockStart: nt,
  marginBlockEnd: nt,
  marginInline: nt,
  marginInlineStart: nt,
  marginInlineEnd: nt,
  // Typography
  fontSize: nt,
  // Misc
  backgroundPositionX: nt,
  backgroundPositionY: nt,
  ...xO,
  zIndex: L0,
  // SVG
  fillOpacity: ol,
  strokeOpacity: ol,
  numOctaves: L0
}, EO = {
  ...Au,
  // Color props
  color: ue,
  backgroundColor: ue,
  outlineColor: ue,
  fill: ue,
  stroke: ue,
  // Border props
  borderColor: ue,
  borderTopColor: ue,
  borderRightColor: ue,
  borderBottomColor: ue,
  borderLeftColor: ue,
  filter: Sd,
  WebkitFilter: Sd,
  mask: _d,
  WebkitMask: _d
}, $1 = (e) => EO[e], wO = /* @__PURE__ */ new Set([Sd, _d]);
function mm(e, i) {
  let a = $1(e);
  return wO.has(a) || (a = ln), a.getAnimatableNone ? a.getAnimatableNone(i) : void 0;
}
function AO(e) {
  for (let i = 1; i < e.length; i++)
    e[i] ?? (e[i] = e[i - 1]);
}
const js = (e) => e * 180 / Math.PI, Td = (e) => {
  const i = js(Math.atan2(e[1], e[0]));
  return xd(i);
}, OO = {
  x: 4,
  y: 5,
  translateX: 4,
  translateY: 5,
  scaleX: 0,
  scaleY: 3,
  scale: (e) => (Math.abs(e[0]) + Math.abs(e[3])) / 2,
  rotate: Td,
  rotateZ: Td,
  skewX: (e) => js(Math.atan(e[1])),
  skewY: (e) => js(Math.atan(e[2])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[2])) / 2
}, xd = (e) => (e = e % 360, e < 0 && (e += 360), e), U0 = Td, k0 = (e) => Math.sqrt(e[0] * e[0] + e[1] * e[1]), B0 = (e) => Math.sqrt(e[4] * e[4] + e[5] * e[5]), zO = {
  x: 12,
  y: 13,
  z: 14,
  translateX: 12,
  translateY: 13,
  translateZ: 14,
  scaleX: k0,
  scaleY: B0,
  scale: (e) => (k0(e) + B0(e)) / 2,
  rotateX: (e) => xd(js(Math.atan2(e[6], e[5]))),
  rotateY: (e) => xd(js(Math.atan2(-e[2], e[0]))),
  rotateZ: U0,
  rotate: U0,
  skewX: (e) => js(Math.atan(e[4])),
  skewY: (e) => js(Math.atan(e[1])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[4])) / 2
};
function Ed(e) {
  return e.includes("scale") ? 1 : 0;
}
function wd(e, i) {
  if (!e || e === "none")
    return Ed(i);
  const a = e.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);
  let r, o;
  if (a)
    r = zO, o = a;
  else {
    const d = e.match(/^matrix\(([-\d.e\s,]+)\)$/u);
    r = OO, o = d;
  }
  if (!o)
    return Ed(i);
  const c = r[i], h = o[1].split(",").map(MO);
  return typeof c == "function" ? c(h) : h[c];
}
const CO = (e, i) => {
  const { transform: a = "none" } = getComputedStyle(e);
  return wd(a, i);
};
function MO(e) {
  return parseFloat(e.trim());
}
const Ia = [
  "transformPerspective",
  "x",
  "y",
  "z",
  "translateX",
  "translateY",
  "translateZ",
  "scale",
  "scaleX",
  "scaleY",
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "skew",
  "skewX",
  "skewY"
], qa = /* @__PURE__ */ new Set([...Ia, "pathRotation"]), Z0 = (e) => e === Ya || e === nt, RO = /* @__PURE__ */ new Set(["x", "y", "z"]), DO = Ia.filter((e) => !RO.has(e));
function NO(e) {
  const i = [];
  return DO.forEach((a) => {
    const r = e.getValue(a);
    if (r !== void 0) {
      const o = r.get(), c = a.startsWith("scale") ? 1 : 0;
      if (o === c)
        return;
      i.push([a, o]), r.set(c);
    }
  }), i;
}
const jO = /* @__PURE__ */ new Set(["bottom", "right"]);
function H0(e, i, a, r, o, c) {
  const h = parseFloat(e);
  if (!isNaN(h))
    return h;
  const { min: d, max: m } = i()[a], p = m - d;
  return c === "border-box" ? p : p - parseFloat(r) - parseFloat(o);
}
const Vs = {
  // Dimensions
  width: ({ width: e, paddingLeft: i = "0", paddingRight: a = "0", boxSizing: r }, o) => H0(e, o, "x", i, a, r),
  height: ({ height: e, paddingTop: i = "0", paddingBottom: a = "0", boxSizing: r }, o) => H0(e, o, "y", i, a, r),
  top: ({ top: e }) => parseFloat(e),
  left: ({ left: e }) => parseFloat(e),
  bottom: ({ top: e }, i) => {
    const { y: a } = i();
    return parseFloat(e) + (a.max - a.min);
  },
  right: ({ left: e }, i) => {
    const { x: a } = i();
    return parseFloat(e) + (a.max - a.min);
  },
  // Transform
  x: ({ transform: e }) => wd(e, "x"),
  y: ({ transform: e }) => wd(e, "y")
};
Vs.translateX = Vs.x;
Vs.translateY = Vs.y;
const Ls = /* @__PURE__ */ new Set();
let Ad = !1, Od = !1, zd = !1;
function G1() {
  if (Od) {
    const e = [], i = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Set();
    Ls.forEach((o) => {
      o.needsMeasurement && (e.push(o), i.add(o.element), jO.has(o.name) && a.add(o.element));
    });
    const r = /* @__PURE__ */ new Map();
    a.forEach((o) => {
      const c = NO(o);
      c.length && (r.set(o, c), o.render());
    }), e.forEach((o) => o.measureInitialState()), i.forEach((o) => {
      o.render();
      const c = r.get(o);
      c && c.forEach(([h, d]) => {
        o.getValue(h)?.set(d);
      });
    }), e.forEach((o) => o.measureEndState()), e.forEach((o) => {
      o.suspendedScrollY !== void 0 && window.scrollTo(0, o.suspendedScrollY);
    });
  }
  Od = !1, Ad = !1, Ls.forEach((e) => e.complete(zd)), Ls.clear();
}
function Y1() {
  Ls.forEach((e) => {
    e.readKeyframes(), e.needsMeasurement && (Od = !0);
  });
}
function VO() {
  zd = !0, Y1(), G1(), zd = !1;
}
function LO(e, i, a) {
  if (typeof e == "string") {
    if (nm(e) || im(e))
      return parseFloat(e);
    if (!ln.test(e) && ln.test(a))
      return mm(i, a);
  }
  return e ?? void 0;
}
class pm {
  constructor(i, a, r, o, c, h = !1) {
    this.state = "pending", this.isAsync = !1, this.needsMeasurement = !1, this.unresolvedKeyframes = [...i], this.onComplete = a, this.name = r, this.motionValue = o, this.element = c, this.isAsync = h;
  }
  scheduleResolve() {
    this.state = "scheduled", this.isAsync ? (Ls.add(this), Ad || (Ad = !0, Bt.read(Y1), Bt.resolveKeyframes(G1))) : (this.readKeyframes(), this.complete());
  }
  readKeyframes() {
    const { unresolvedKeyframes: i, name: a, element: r, motionValue: o } = this;
    if (i[0] === null) {
      const c = o?.get(), h = i[i.length - 1];
      if (c !== void 0)
        i[0] = c;
      else if (r && a) {
        const d = LO(r.readValue(a, h), a, h);
        d !== void 0 && (i[0] = d);
      }
      i[0] === void 0 && (i[0] = h), o && c === void 0 && o.set(i[0]);
    }
    AO(i);
  }
  setFinalKeyframe() {
  }
  measureInitialState() {
  }
  renderEndStyles() {
  }
  measureEndState() {
  }
  complete(i = !1) {
    this.state = "complete", this.onComplete(this.unresolvedKeyframes, this.finalKeyframe, i), Ls.delete(this);
  }
  cancel() {
    this.state === "scheduled" && (Ls.delete(this), this.state = "pending");
  }
  resume() {
    this.state === "pending" && this.scheduleResolve();
  }
}
const UO = (e) => e.startsWith("--");
function I1(e, i, a) {
  UO(i) ? e.style.setProperty(i, a) : e.style[i] = a;
}
const kO = {};
function q1(e, i) {
  const a = /* @__PURE__ */ p1(e);
  return () => kO[i] ?? a();
}
const BO = /* @__PURE__ */ q1(() => window.ScrollTimeline !== void 0, "scrollTimeline"), X1 = /* @__PURE__ */ q1(() => {
  try {
    document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
  } catch {
    return !1;
  }
  return !0;
}, "linearEasing"), Fr = ([e, i, a, r]) => `cubic-bezier(${e}, ${i}, ${a}, ${r})`, P0 = {
  linear: "linear",
  ease: "ease",
  easeIn: "ease-in",
  easeOut: "ease-out",
  easeInOut: "ease-in-out",
  circIn: /* @__PURE__ */ Fr([0, 0.65, 0.55, 1]),
  circOut: /* @__PURE__ */ Fr([0.55, 0, 1, 0.45]),
  backIn: /* @__PURE__ */ Fr([0.31, 0.01, 0.66, -0.59]),
  backOut: /* @__PURE__ */ Fr([0.33, 1.53, 0.69, 0.99])
};
function K1(e, i) {
  if (e)
    return typeof e == "function" ? X1() ? U1(e, i) : "ease-out" : /* @__PURE__ */ A1(e) ? Fr(e) : Array.isArray(e) ? e.map((a) => K1(a, i) || P0.easeOut) : P0[e];
}
function ZO(e, i, a, { delay: r = 0, duration: o = 300, repeat: c = 0, repeatType: h = "loop", ease: d = "easeOut", times: m } = {}, p = void 0) {
  const g = {
    [i]: a
  };
  m && (g.offset = m);
  const v = K1(d, o);
  Array.isArray(v) && (g.easing = v);
  const b = {
    delay: r,
    duration: o,
    easing: Array.isArray(v) ? "linear" : v,
    fill: "both",
    iterations: c + 1,
    direction: h === "reverse" ? "alternate" : "normal"
  };
  return p && (b.pseudoElement = p), e.animate(g, b);
}
function F1(e) {
  return typeof e == "function" && "applyToOptions" in e;
}
function HO({ type: e, ...i }) {
  return F1(e) && X1() ? e.applyToOptions(i) : (i.duration ?? (i.duration = 300), i.ease ?? (i.ease = "easeOut"), i);
}
class Q1 extends dm {
  constructor(i) {
    if (super(), this.finishedTime = null, this.isStopped = !1, this.manualStartTime = null, !i)
      return;
    const { element: a, name: r, keyframes: o, pseudoElement: c, allowFlatten: h = !1, finalKeyframe: d, onComplete: m } = i;
    this.isPseudoElement = !!c, this.allowFlatten = h, this.options = i, Zu(typeof i.type != "string");
    const p = HO(i);
    this.animation = ZO(a, r, o, p, c), p.autoplay === !1 && this.animation.pause(), this.animation.onfinish = () => {
      if (this.finishedTime = this.time, !c) {
        const g = Hu(o, this.options, d, this.speed);
        this.updateMotionValue && this.updateMotionValue(g), I1(a, r, g), this.animation.cancel();
      }
      m?.(), this.notifyFinished();
    }, P1(this, i, p);
  }
  play() {
    this.isStopped || (this.manualStartTime = null, this.animation.play(), this.state === "finished" && this.updateFinished());
  }
  pause() {
    this.animation.pause();
  }
  complete() {
    this.animation.finish?.();
  }
  cancel() {
    try {
      this.animation.cancel();
    } catch {
    }
  }
  stop() {
    if (this.isStopped)
      return;
    this.isStopped = !0;
    const { state: i } = this;
    i === "idle" || i === "finished" || (this.updateMotionValue ? this.updateMotionValue() : this.commitStyles(), this.isPseudoElement || this.cancel());
  }
  /**
   * WAAPI doesn't natively have any interruption capabilities.
   *
   * In this method, we commit styles back to the DOM before cancelling
   * the animation.
   *
   * This is designed to be overridden by NativeAnimationExtended, which
   * will create a renderless JS animation and sample it twice to calculate
   * its current value, "previous" value, and therefore allow
   * Motion to also correctly calculate velocity for any subsequent animation
   * while deferring the commit until the next animation frame.
   */
  commitStyles() {
    const i = this.options?.element;
    !this.isPseudoElement && i?.isConnected && this.animation.commitStyles?.();
  }
  get duration() {
    const i = this.animation.effect?.getComputedTiming?.().duration || 0;
    return /* @__PURE__ */ rn(Number(i));
  }
  get iterationDuration() {
    const { delay: i = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ rn(i);
  }
  get time() {
    return /* @__PURE__ */ rn(Number(this.animation.currentTime) || 0);
  }
  set time(i) {
    const a = this.finishedTime !== null;
    this.manualStartTime = null, this.finishedTime = null, this.animation.currentTime = /* @__PURE__ */ bn(i), a && this.animation.pause();
  }
  /**
   * The playback speed of the animation.
   * 1 = normal speed, 2 = double speed, 0.5 = half speed.
   */
  get speed() {
    return this.animation.playbackRate;
  }
  set speed(i) {
    i < 0 && (this.finishedTime = null), this.animation.playbackRate = i;
  }
  get state() {
    return this.finishedTime !== null ? "finished" : this.animation.playState;
  }
  get startTime() {
    return this.manualStartTime ?? Number(this.animation.startTime);
  }
  set startTime(i) {
    this.manualStartTime = this.animation.startTime = i;
  }
  /**
   * Attaches a timeline to the animation, for instance the `ScrollTimeline`.
   */
  attachTimeline({ timeline: i, rangeStart: a, rangeEnd: r, observe: o }) {
    return this.allowFlatten && this.animation.effect?.updateTiming({ easing: "linear" }), this.animation.onfinish = null, i && BO() ? (this.animation.timeline = i, a && (this.animation.rangeStart = a), r && (this.animation.rangeEnd = r), Nn) : o(this);
  }
}
const J1 = {
  anticipate: T1,
  backInOut: _1,
  circInOut: E1
};
function PO(e) {
  return e in J1;
}
function $O(e) {
  typeof e.ease == "string" && PO(e.ease) && (e.ease = J1[e.ease]);
}
const Ih = 10;
class GO extends Q1 {
  constructor(i) {
    $O(i), Z1(i), super(i), i.startTime !== void 0 && i.autoplay !== !1 && (this.startTime = i.startTime), this.options = i;
  }
  /**
   * WAAPI doesn't natively have any interruption capabilities.
   *
   * Rather than read committed styles back out of the DOM, we can
   * create a renderless JS animation and sample it twice to calculate
   * its current value, "previous" value, and therefore allow
   * Motion to calculate velocity for any subsequent animation.
   */
  updateMotionValue(i) {
    const { motionValue: a, onUpdate: r, onComplete: o, element: c, ...h } = this.options;
    if (!a)
      return;
    if (i !== void 0) {
      a.set(i);
      return;
    }
    const d = new wu({
      ...h,
      autoplay: !1
    }), m = Math.max(Ih, ze.now() - this.startTime), p = jn(0, Ih, m - Ih), g = d.sample(m).value, { name: v } = this.options;
    c && v && I1(c, v, g), a.setWithVelocity(d.sample(Math.max(0, m - p)).value, g, p), d.stop();
  }
}
const $0 = (e, i) => i === "zIndex" ? !1 : !!(typeof e == "number" || Array.isArray(e) || typeof e == "string" && // It's animatable if we have a string
(ln.test(e) || e === "0") && // And it contains numbers and/or colors
!e.startsWith("url("));
function YO(e) {
  const i = e[0];
  if (e.length === 1)
    return !0;
  for (let a = 0; a < e.length; a++)
    if (e[a] !== i)
      return !0;
}
function IO(e, i, a, r) {
  const o = e[0];
  if (o === null)
    return !1;
  if (i === "display" || i === "visibility")
    return !0;
  const c = e[e.length - 1], h = $0(o, i), d = $0(c, i);
  return !h || !d ? !1 : YO(e) || (a === "spring" || F1(a)) && r;
}
function Cd(e) {
  e.duration = 0, e.type = "keyframes";
}
const Md = /* @__PURE__ */ new Set([
  "opacity",
  "clipPath",
  "filter",
  "transform",
  "backgroundColor"
]), qO = /^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;
function XO(e) {
  for (let i = 0; i < e.length; i++)
    if (typeof e[i] == "string" && qO.test(e[i]))
      return !0;
  return !1;
}
const G0 = /* @__PURE__ */ new Set([
  "color",
  "backgroundColor",
  "outlineColor",
  "fill",
  "stroke",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor"
]), KO = /* @__PURE__ */ p1(() => Object.hasOwnProperty.call(Element.prototype, "animate"));
function FO(e) {
  const { motionValue: i, name: a, repeatDelay: r, repeatType: o, damping: c, type: h, keyframes: d } = e;
  if (!a || !(Md.has(a) || G0.has(a)))
    return !1;
  const m = i?.owner?.current;
  if (!(m instanceof HTMLElement) && !(m instanceof SVGElement))
    return !1;
  const { onUpdate: p, transformTemplate: g } = i.owner.getProps();
  return KO() && /**
   * Force WAAPI for color properties with browser-only color formats
   * (oklch, oklab, lab, lch, etc.) that the JS animation path can't parse.
   */
  (Md.has(a) || G0.has(a) && XO(d)) && (a !== "transform" || !g) && /**
   * If we're outputting values to onUpdate then we can't use WAAPI as there's
   * no way to read the value from WAAPI every frame.
   */
  !p && !r && o !== "mirror" && c !== 0 && h !== "inertia";
}
const QO = 40;
class JO extends dm {
  constructor(i) {
    super(), this.stop = () => {
      this._animation && (this._animation.stop(), this.stopTimeline?.()), this.keyframeResolver?.cancel();
    }, this.createdAt = ze.now();
    const { keyframes: a, name: r, motionValue: o, element: c } = i, h = i;
    h.autoplay ?? (h.autoplay = !0), h.delay ?? (h.delay = 0), h.type ?? (h.type = "keyframes"), h.repeat ?? (h.repeat = 0), h.repeatDelay ?? (h.repeatDelay = 0), h.repeatType ?? (h.repeatType = "loop");
    const d = c?.KeyframeResolver || pm;
    this.keyframeResolver = new d(a, (m, p, g) => this.onKeyframesResolved(m, p, h, !g), r, o, c), this.keyframeResolver?.scheduleResolve();
  }
  onKeyframesResolved(i, a, r, o) {
    this.keyframeResolver = void 0;
    const { name: c, type: h, velocity: d, delay: m, isHandoff: p, onUpdate: g } = r;
    this.resolvedAt = ze.now();
    let v = !0;
    IO(i, c, h, d) || (v = !1, (_i.instantAnimations || !m) && g?.(Hu(i, r, a)), i[0] = i[i.length - 1], Cd(r), r.repeat = 0);
    const b = o ? this.resolvedAt ? this.resolvedAt - this.createdAt > QO ? this.resolvedAt : this.createdAt : this.createdAt : void 0, { onComplete: _ } = r;
    r.startTime ?? (r.startTime = b), r.finalKeyframe = a, r.keyframes = i, r.onComplete = () => {
      _?.(), this.notifyFinished();
    };
    const T = v && !p && FO(r);
    let x;
    if (T) {
      r.element = r.motionValue?.owner?.current;
      try {
        x = new GO(r);
      } catch {
        x = new wu(r);
      }
    } else
      x = new wu(r);
    this.pendingTimeline && (this.stopTimeline = x.attachTimeline(this.pendingTimeline), this.pendingTimeline = void 0), this._animation = x;
  }
  get finished() {
    return this._animation ? this._animation.finished : super.finished;
  }
  then(i, a) {
    return this.finished.finally(i).then(() => {
    });
  }
  get animation() {
    return this._animation || (this.keyframeResolver?.resume(), VO()), this._animation;
  }
  get duration() {
    return this.animation.duration;
  }
  get iterationDuration() {
    return this.animation.iterationDuration;
  }
  get time() {
    return this.animation.time;
  }
  set time(i) {
    this.animation.time = i;
  }
  get speed() {
    return this.animation.speed;
  }
  get state() {
    return this.animation.state;
  }
  set speed(i) {
    this.animation.speed = i;
  }
  get startTime() {
    return this.animation.startTime;
  }
  attachTimeline(i) {
    return this._animation ? this.stopTimeline = this.animation.attachTimeline(i) : this.pendingTimeline = i, () => this.stop();
  }
  play() {
    this.animation.play();
  }
  pause() {
    this.animation.pause();
  }
  complete() {
    this.animation.complete();
  }
  cancel() {
    this._animation && this.animation.cancel(), this.keyframeResolver?.cancel();
  }
}
function W1(e, i, a, r = 0, o = 1) {
  const c = Array.from(e).sort((p, g) => p.sortNodePosition(g)).indexOf(i), h = e.size, d = (h - 1) * r;
  return typeof a == "function" ? a(c, h) : o === 1 ? c * r : d - c * r;
}
const Y0 = 30, WO = (e) => !isNaN(parseFloat(e));
class tz {
  /**
   * @param init - The initiating value
   * @param config - Optional configuration options
   *
   * -  `transformer`: A function to transform incoming values with.
   */
  constructor(i, a = {}) {
    this.canTrackVelocity = null, this.events = {}, this.updateAndNotify = (r) => {
      const o = ze.now();
      if (this.updatedAt !== o && this.setPrevFrameValue(), this.prev = this.current, this.setCurrent(r), this.current !== this.prev && (this.notifyChange(), this.dependents))
        for (const c of this.dependents)
          c.dirty();
    }, this.hasAnimated = !1, this.setCurrent(i), this.owner = a.owner;
  }
  setCurrent(i) {
    this.current = i, this.updatedAt = ze.now(), this.canTrackVelocity === null && i !== void 0 && (this.canTrackVelocity = WO(this.current));
  }
  setPrevFrameValue(i = this.current) {
    this.prevFrameValue = i, this.prevUpdatedAt = this.updatedAt;
  }
  /**
   * Adds a function that will be notified when the `MotionValue` is updated.
   *
   * It returns a function that, when called, will cancel the subscription.
   *
   * When calling `onChange` inside a React component, it should be wrapped with the
   * `useEffect` hook. As it returns an unsubscribe function, this should be returned
   * from the `useEffect` function to ensure you don't add duplicate subscribers..
   *
   * ```jsx
   * export const MyComponent = () => {
   *   const x = useMotionValue(0)
   *   const y = useMotionValue(0)
   *   const opacity = useMotionValue(1)
   *
   *   useEffect(() => {
   *     function updateOpacity() {
   *       const maxXY = Math.max(x.get(), y.get())
   *       const newOpacity = transform(maxXY, [0, 100], [1, 0])
   *       opacity.set(newOpacity)
   *     }
   *
   *     const unsubscribeX = x.on("change", updateOpacity)
   *     const unsubscribeY = y.on("change", updateOpacity)
   *
   *     return () => {
   *       unsubscribeX()
   *       unsubscribeY()
   *     }
   *   }, [])
   *
   *   return <motion.div style={{ x }} />
   * }
   * ```
   *
   * @param subscriber - A function that receives the latest value.
   * @returns A function that, when called, will cancel this subscription.
   *
   * @deprecated
   */
  onChange(i) {
    return this.on("change", i);
  }
  on(i, a) {
    var r;
    return i === "change" ? this.onChangeSubscribe(a) : ((r = this.events)[i] || (r[i] = new _u())).add(a);
  }
  onChangeSubscribe(i) {
    const { events: a } = this;
    return !a.change && !this.changeSubscriber ? this.changeSubscriber = i : (a.change || (a.change = new _u(), a.change.add(this.changeSubscriber), this.changeSubscriber = void 0), a.change.add(i)), () => {
      this.changeSubscriber === i ? this.changeSubscriber = void 0 : a.change?.remove(i), this.stopIfUnobserved();
    };
  }
  /**
   * If we have no more change listeners by the start
   * of the next frame, stop active animations.
   */
  stopIfUnobserved() {
    Bt.read(() => {
      !this.changeSubscriber && !this.events.change?.getSize() && this.stop();
    });
  }
  clearListeners() {
    this.changeSubscriber = void 0;
    for (const i in this.events)
      this.events[i].clear();
  }
  /**
   * Attaches a passive effect to the `MotionValue`.
   */
  attach(i, a) {
    this.passiveEffect = i, this.stopPassiveEffect = a;
  }
  /**
   * Sets the state of the `MotionValue`.
   *
   * @remarks
   *
   * ```jsx
   * const x = useMotionValue(0)
   * x.set(10)
   * ```
   *
   * @param latest - Latest value to set.
   * @param render - Whether to notify render subscribers. Defaults to `true`
   *
   * @public
   */
  set(i) {
    this.passiveEffect ? this.passiveEffect(i, this.updateAndNotify) : this.updateAndNotify(i);
  }
  setWithVelocity(i, a, r) {
    this.set(a), this.prev = void 0, this.prevFrameValue = i, this.prevUpdatedAt = this.updatedAt - r;
  }
  /**
   * Set the state of the `MotionValue`, stopping any active animations,
   * effects, and resets velocity to `0`.
   */
  jump(i, a = !0) {
    this.updateAndNotify(i), this.prev = i, this.prevUpdatedAt = this.prevFrameValue = void 0, a && this.stop(), this.stopPassiveEffect && this.stopPassiveEffect();
  }
  dirty() {
    this.notifyChange();
  }
  notifyChange() {
    const { current: i, changeSubscriber: a } = this;
    a ? a(i) : this.events.change?.notify(i);
  }
  addDependent(i) {
    this.dependents || (this.dependents = /* @__PURE__ */ new Set()), this.dependents.add(i);
  }
  removeDependent(i) {
    this.dependents && this.dependents.delete(i);
  }
  /**
   * Returns the latest state of `MotionValue`
   *
   * @returns - The latest state of `MotionValue`
   *
   * @public
   */
  get() {
    return this.current;
  }
  /**
   * @public
   */
  getPrevious() {
    return this.prev;
  }
  /**
   * Returns the latest velocity of `MotionValue`
   *
   * @returns - The latest velocity of `MotionValue`. Returns `0` if the state is non-numerical.
   *
   * @public
   */
  getVelocity() {
    const i = ze.now();
    if (!this.canTrackVelocity || this.prevFrameValue === void 0 || i - this.updatedAt > Y0)
      return 0;
    const a = Math.min(this.updatedAt - this.prevUpdatedAt, Y0);
    return /* @__PURE__ */ g1(parseFloat(this.current) - parseFloat(this.prevFrameValue), a);
  }
  /**
   * Registers a new animation to control this `MotionValue`. Only one
   * animation can drive a `MotionValue` at one time.
   *
   * ```jsx
   * value.start()
   * ```
   *
   * @param animation - A function that starts the provided animation
   */
  start(i) {
    return this.stop(), new Promise((a) => {
      this.hasAnimated = !0;
      let r = !1, o;
      o = i(() => {
        r = !0, this.events.animationComplete?.notify(), this.animation === o && this.clearAnimation(), a();
      }), r || (this.animation = o), this.events.animationStart?.notify();
    });
  }
  /**
   * Stop the currently active animation.
   *
   * @public
   */
  stop() {
    this.animation && (this.animation.stop(), this.events.animationCancel && this.events.animationCancel.notify()), this.clearAnimation();
  }
  /**
   * Returns `true` if this value is currently animating.
   *
   * @public
   */
  isAnimating() {
    return !!this.animation;
  }
  clearAnimation() {
    this.animation = void 0;
  }
  /**
   * Destroy and clean up subscribers to this `MotionValue`.
   *
   * The `MotionValue` hooks like `useMotionValue` and `useTransform` automatically
   * handle the lifecycle of the returned `MotionValue`, so this method is only necessary if you've manually
   * created a `MotionValue` via the `motionValue` function.
   *
   * @public
   */
  destroy() {
    this.dependents?.clear(), this.events.destroy?.notify(), this.clearListeners(), this.stop(), this.stopPassiveEffect && this.stopPassiveEffect();
  }
}
function Ba(e, i) {
  return new tz(e, i);
}
function t_(e, i) {
  if (e?.inherit && i) {
    const { inherit: a, ...r } = e;
    return { ...i, ...r };
  }
  return e;
}
function gm(e, i) {
  const a = e?.[i] ?? e?.default ?? e;
  return a !== e ? t_(a, e) : a;
}
const ez = {
  type: "spring",
  stiffness: 500,
  damping: 25,
  restSpeed: 10
}, nz = (e) => ({
  type: "spring",
  stiffness: 550,
  damping: e === 0 ? 2 * Math.sqrt(550) : 30,
  restSpeed: 10
}), iz = {
  type: "keyframes",
  duration: 0.8
}, sz = {
  type: "keyframes",
  ease: [0.25, 0.1, 0.35, 1],
  duration: 0.3
}, az = (e, { keyframes: i }) => i.length > 2 ? iz : qa.has(e) ? e.startsWith("scale") ? nz(i[1]) : ez : sz, rz = /* @__PURE__ */ new Set([
  "when",
  "delay",
  "delayChildren",
  "staggerChildren",
  "staggerDirection",
  "repeat",
  "repeatType",
  "repeatDelay",
  "from",
  "elapsed"
]);
function lz(e) {
  for (const i in e)
    if (!rz.has(i))
      return !0;
  return !1;
}
const ym = (e, i, a, r = {}, o, c) => (h) => {
  const d = gm(r, e) || {}, m = d.delay || r.delay || 0;
  let { elapsed: p = 0 } = r;
  p = p - /* @__PURE__ */ bn(m);
  const g = {
    keyframes: Array.isArray(a) ? a : [null, a],
    ease: "easeOut",
    velocity: i.getVelocity(),
    ...d,
    delay: -p,
    onUpdate: (b) => {
      i.set(b), d.onUpdate && d.onUpdate(b);
    },
    onComplete: () => {
      h(), d.onComplete && d.onComplete();
    },
    name: e,
    motionValue: i,
    element: c ? void 0 : o
  };
  lz(d) || Object.assign(g, az(e, g)), g.duration && (g.duration = /* @__PURE__ */ bn(g.duration)), g.repeatDelay && (g.repeatDelay = /* @__PURE__ */ bn(g.repeatDelay)), g.from !== void 0 && (g.keyframes[0] = g.from);
  let v = !1;
  if ((g.type === !1 || g.duration === 0 && !g.repeatDelay) && (Cd(g), g.delay === 0 && (v = !0)), (_i.instantAnimations || _i.skipAnimations || o?.shouldSkipAnimations || d.skipAnimations) && (v = !0, Cd(g), g.delay = 0), g.allowFlatten = !d.type && !d.ease, v && !c && i.get() !== void 0) {
    const b = Hu(g.keyframes, d);
    if (b !== void 0) {
      Bt.update(() => {
        g.onUpdate(b), g.onComplete();
      });
      return;
    }
  }
  return d.isSync ? new wu(g) : new JO(g);
}, oz = (
  // eslint-disable-next-line redos-detector/no-unsafe-regex -- false positive, as it can match a lot of words
  /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u
);
function uz(e) {
  const i = oz.exec(e);
  if (!i)
    return [,];
  const [, a, r, o] = i;
  return [`--${a ?? r}`, o];
}
function e_(e, i, a = 1) {
  const [r, o] = uz(e);
  if (!r)
    return;
  const c = window.getComputedStyle(i).getPropertyValue(r);
  if (c) {
    const h = c.trim();
    return nm(h) ? parseFloat(h) : h;
  }
  return rm(o) ? e_(o, i, a + 1) : o;
}
function I0(e) {
  const i = [{}, {}];
  return e?.values.forEach((a, r) => {
    i[0][r] = a.get(), i[1][r] = a.getVelocity();
  }), i;
}
function vm(e, i, a, r) {
  if (typeof i == "function") {
    const [o, c] = I0(r);
    i = i(a !== void 0 ? a : e.custom, o, c);
  }
  if (typeof i == "string" && (i = e.variants && e.variants[i]), typeof i == "function") {
    const [o, c] = I0(r);
    i = i(a !== void 0 ? a : e.custom, o, c);
  }
  return i;
}
function Us(e, i, a) {
  const r = e.getProps();
  return vm(r, i, a !== void 0 ? a : r.custom, e);
}
const n_ = /* @__PURE__ */ new Set([
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  ...Ia
]), Rd = (e) => Array.isArray(e);
function cz(e, i, a) {
  e.hasValue(i) ? e.getValue(i).set(a) : e.addValue(i, Ba(a));
}
function fz(e) {
  return Rd(e) ? e[e.length - 1] || 0 : e;
}
function hz(e, i) {
  const a = Us(e, i);
  let { transitionEnd: r = {}, transition: o = {}, ...c } = a || {};
  c = { ...c, ...r };
  for (const h in c) {
    const d = fz(c[h]);
    cz(e, h, d);
  }
}
const Ae = (e) => !!(e && e.getVelocity);
function dz(e) {
  return !!(Ae(e) && e.add);
}
function Dd(e, i) {
  const a = e.getValue("willChange");
  if (dz(a))
    return a.add(i);
  if (!a && _i.WillChange) {
    const r = new _i.WillChange("auto");
    e.addValue("willChange", r), r.add(i);
  }
}
function bm(e) {
  return e.replace(/([A-Z])/g, (i) => `-${i.toLowerCase()}`);
}
const mz = "framerAppearId", i_ = "data-" + bm(mz);
function s_(e) {
  return e.props[i_];
}
const pz = typeof window < "u";
function gz({ protectedKeys: e, needsAnimating: i }, a) {
  const r = e.hasOwnProperty(a) && i[a] !== !0;
  return i[a] = !1, r;
}
function a_(e, i, { delay: a = 0, transitionOverride: r, type: o } = {}) {
  let { transition: c, transitionEnd: h, ...d } = i;
  const m = e.getDefaultTransition();
  c = c ? t_(c, m) : m;
  const p = c?.reduceMotion, g = c?.skipAnimations;
  r && (c = r);
  const v = [], b = o && e.animationState && e.animationState.getState()[o], _ = c?.path;
  _ && _.animateVisualElement(e, d, c, a, v);
  for (const T in d) {
    const x = e.getValue(T, e.latestValues[T] ?? null), A = d[T];
    if (A === void 0 || b && gz(b, T))
      continue;
    const N = {
      delay: a,
      ...gm(c || {}, T)
    };
    g && (N.skipAnimations = !0);
    const D = x.get();
    if (D !== void 0 && !x.isAnimating() && !Array.isArray(A) && A === D && !N.velocity) {
      Bt.update(() => x.set(A));
      continue;
    }
    let k = !1;
    if (pz && window.MotionHandoffAnimation) {
      const q = s_(e);
      if (q) {
        const V = window.MotionHandoffAnimation(q, T, Bt);
        V !== null && (N.startTime = V, k = !0);
      }
    }
    Dd(e, T);
    const G = p ?? e.shouldReduceMotion;
    x.start(ym(T, x, A, G && n_.has(T) ? { type: !1 } : N, e, k));
    const X = x.animation;
    X && v.push(X);
  }
  if (h) {
    const T = () => Bt.update(() => {
      h && hz(e, h);
    });
    v.length ? Promise.all(v).then(T) : T();
  }
  return v;
}
function Nd(e, i, a = {}) {
  const r = Us(e, i, a.type === "exit" ? e.presenceContext?.custom : void 0);
  let { transition: o = e.getDefaultTransition() || {} } = r || {};
  a.transitionOverride && (o = a.transitionOverride);
  const c = r ? () => Promise.all(a_(e, r, a)) : () => Promise.resolve(), h = e.variantChildren && e.variantChildren.size ? (m = 0) => {
    const { delayChildren: p = 0, staggerChildren: g, staggerDirection: v } = o;
    return yz(e, i, m, p, g, v, a);
  } : () => Promise.resolve(), { when: d } = o;
  if (d) {
    const [m, p] = d === "beforeChildren" ? [c, h] : [h, c];
    return m().then(() => p());
  } else
    return Promise.all([c(), h(a.delay)]);
}
function yz(e, i, a = 0, r = 0, o = 0, c = 1, h) {
  const d = [];
  for (const m of e.variantChildren)
    m.notify("AnimationStart", i), d.push(Nd(m, i, {
      ...h,
      delay: a + (typeof r == "function" ? 0 : r) + W1(e.variantChildren, m, r, o, c)
    }).then(() => m.notify("AnimationComplete", i)));
  return Promise.all(d);
}
function vz(e, i, a = {}) {
  e.notify("AnimationStart", i);
  let r;
  if (Array.isArray(i)) {
    const o = i.map((c) => Nd(e, c, a));
    r = Promise.all(o);
  } else if (typeof i == "string")
    r = Nd(e, i, a);
  else {
    const o = typeof i == "function" ? Us(e, i, a.custom) : i;
    r = Promise.all(a_(e, o, a));
  }
  return r.then(() => {
    e.notify("AnimationComplete", i);
  });
}
const bz = {
  test: (e) => e === "auto",
  parse: (e) => e
}, Sz = (e) => (i) => i.test(e), _z = [Ya, nt, Jn, bi, jA, NA, bz], q0 = (e) => _z.find(Sz(e));
function Tz(e) {
  return typeof e == "number" ? e === 0 : e !== null ? e === "none" || e === "0" || im(e) : !0;
}
const xz = /* @__PURE__ */ new Set(["auto", "none", "0"]);
function Ez(e, i, a) {
  let r = 0, o;
  for (; r < e.length && !o; ) {
    const c = e[r];
    typeof c == "string" && !xz.has(c) && ZA(c) && (o = e[r]), r++;
  }
  if (o && a)
    for (const c of i)
      e[c] !== o && (e[c] = mm(a, o));
}
class wz extends pm {
  constructor(i, a, r, o, c) {
    super(i, a, r, o, c, !0);
  }
  readKeyframes() {
    const { unresolvedKeyframes: i, element: a, name: r } = this;
    if (!a || !a.current)
      return;
    super.readKeyframes();
    for (let g = 0; g < i.length; g++) {
      let v = i[g];
      if (typeof v == "string" && (v = v.trim(), rm(v))) {
        const b = e_(v, a.current);
        b !== void 0 && (i[g] = b), g === i.length - 1 && (this.finalKeyframe = v);
      }
    }
    if (this.resolveNoneKeyframes(), !n_.has(r) || i.length !== 2)
      return;
    const [o, c] = i;
    if (typeof o == "number" && typeof c == "number")
      return;
    const h = q0(o), d = q0(c), m = M0(o), p = M0(c);
    if (m !== p && Vs[r]) {
      this.needsMeasurement = !0;
      return;
    }
    if (h !== d)
      if (Z0(h) && Z0(d))
        for (let g = 0; g < i.length; g++) {
          const v = i[g];
          typeof v == "string" && (i[g] = parseFloat(v));
        }
      else Vs[r] && (this.needsMeasurement = !0);
  }
  resolveNoneKeyframes() {
    const { unresolvedKeyframes: i, name: a } = this, r = [];
    for (let o = 0; o < i.length; o++)
      (i[o] === null || Tz(i[o])) && r.push(o);
    r.length && Ez(i, r, a);
  }
  measure() {
    const { element: i, name: a } = this;
    return Vs[a](window.getComputedStyle(i.current), () => i.measureViewportBox());
  }
  measureInitialState() {
    const { element: i, unresolvedKeyframes: a, name: r } = this;
    if (!i || !i.current)
      return;
    r === "height" && (this.suspendedScrollY = window.pageYOffset), this.measuredOrigin = this.measure(), a[0] = this.measuredOrigin;
    const o = a[a.length - 1];
    o !== void 0 && this.motionValue?.jump(o, !1);
  }
  measureEndState() {
    const { element: i, unresolvedKeyframes: a } = this;
    if (!i || !i.current)
      return;
    this.motionValue?.jump(this.measuredOrigin, !1);
    const r = a.length - 1, o = a[r];
    a[r] = this.measure(), o !== null && this.finalKeyframe === void 0 && (this.finalKeyframe = o), this.removedTransforms?.length && this.removedTransforms.forEach(([c, h]) => {
      i.getValue(c).set(h);
    }), this.resolveNoneKeyframes();
  }
}
const Sm = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomRightRadius",
  "borderBottomLeftRadius"
];
function Az(e) {
  return m1(e) && "offsetHeight" in e && !("ownerSVGElement" in e);
}
function _m(e) {
  return m1(e) && "ownerSVGElement" in e;
}
const jd = (e, i) => i && typeof e == "number" ? i.transform(e) : e;
function r_(e, i, a) {
  if (e == null)
    return [];
  if (e instanceof EventTarget)
    return [e];
  if (typeof e == "string") {
    let r = document;
    const o = a?.[e] ?? r.querySelectorAll(e);
    return o ? Array.from(o) : [];
  }
  return Array.from(e).filter((r) => r != null);
}
const Oz = {
  x: "translateX",
  y: "translateY",
  z: "translateZ",
  transformPerspective: "perspective"
}, zz = Ia.length;
function Cz(e, i, a) {
  let r = "", o = !0;
  for (let h = 0; h < zz; h++) {
    const d = Ia[h], m = e[d];
    if (m === void 0)
      continue;
    let p = !0;
    if (typeof m == "number")
      p = m === (d.startsWith("scale") ? 1 : 0);
    else {
      const g = parseFloat(m);
      p = d.startsWith("scale") ? g === 1 : g === 0;
    }
    if (!p || a) {
      const g = jd(m, Au[d]);
      if (!p) {
        o = !1;
        const v = Oz[d] || d;
        r += `${v}(${g}) `;
      }
      a && (i[d] = g);
    }
  }
  const c = e.pathRotation;
  return c && (o = !1, r += `rotate(${jd(c, Au.pathRotation)}) `), r = r.trim(), a ? r = a(i, o ? "" : r) : o && (r = "none"), r;
}
function Tm(e, i, a) {
  const { style: r, vars: o, transformOrigin: c } = e;
  let h = !1, d = !1;
  for (const m in i) {
    const p = i[m];
    if (qa.has(m)) {
      h = !0;
      continue;
    } else if (C1(m)) {
      o[m] = p;
      continue;
    } else {
      const g = jd(p, Au[m]);
      m.startsWith("origin") ? (d = !0, c[m] = g) : r[m] = g;
    }
  }
  if (i.transform || (h || a ? r.transform = Cz(i, e.transform, a) : r.transform && (r.transform = "none")), d) {
    const { originX: m = "50%", originY: p = "50%", originZ: g = 0 } = c;
    r.transformOrigin = `${m} ${p} ${g}`;
  }
}
const Mz = {
  offset: "stroke-dashoffset",
  array: "stroke-dasharray"
}, Rz = {
  offset: "strokeDashoffset",
  array: "strokeDasharray"
};
function Dz(e, i, a = 1, r = 0, o = !0) {
  e.pathLength = 1;
  const c = o ? Mz : Rz;
  e[c.offset] = `${-r}`, e[c.array] = `${i} ${a}`;
}
const l_ = [
  "transform",
  "opacity",
  "offsetDistance",
  "offsetPath",
  "offsetRotate",
  "offsetAnchor"
];
function o_(e, {
  attrX: i,
  attrY: a,
  attrScale: r,
  pathLength: o,
  pathSpacing: c = 1,
  pathOffset: h = 0,
  // This is object creation, which we try to avoid per-frame.
  ...d
}, m, p, g) {
  if (Tm(e, d, p), m) {
    e.style.viewBox && (e.attrs.viewBox = e.style.viewBox);
    return;
  }
  e.attrs = e.style, e.style = {};
  const { attrs: v, style: b } = e;
  for (const _ of l_)
    v[_] !== void 0 && (b[_] = v[_], delete v[_]);
  (b.transform || v.transformOrigin) && (b.transformOrigin = v.transformOrigin ?? "50% 50%", delete v.transformOrigin), b.transform && (b.transformBox = g?.transformBox ?? "fill-box", delete v.transformBox), i !== void 0 && (v.x = i), a !== void 0 && (v.y = a), r !== void 0 && (v.scale = r), o !== void 0 && Dz(v, o, c, h, !1);
}
function u_({ top: e, left: i, right: a, bottom: r }) {
  return {
    x: { min: i, max: a },
    y: { min: e, max: r }
  };
}
function Nz({ x: e, y: i }) {
  return { top: i.min, right: e.max, bottom: i.max, left: e.min };
}
function jz(e, i) {
  if (!i)
    return e;
  const a = i({ x: e.left, y: e.top }), r = i({ x: e.right, y: e.bottom });
  return {
    top: a.y,
    left: a.x,
    bottom: r.y,
    right: r.x
  };
}
function qh(e) {
  return e === void 0 || e === 1;
}
function Vd({ scale: e, scaleX: i, scaleY: a }) {
  return !qh(e) || !qh(i) || !qh(a);
}
function Ds(e) {
  return Vd(e) || c_(e) || e.z || e.rotate || e.rotateX || e.rotateY || e.skewX || e.skewY;
}
function c_(e) {
  return X0(e.x) || X0(e.y);
}
function X0(e) {
  return e && e !== "0%";
}
function Ou(e, i, a) {
  const r = e - a, o = i * r;
  return a + o;
}
function K0(e, i, a, r, o) {
  return o !== void 0 && (e = Ou(e, o, r)), Ou(e, a, r) + i;
}
function Ld(e, i = 0, a = 1, r, o) {
  e.min = K0(e.min, i, a, r, o), e.max = K0(e.max, i, a, r, o);
}
function f_(e, { x: i, y: a }) {
  Ld(e.x, i.translate, i.scale, i.originPoint), Ld(e.y, a.translate, a.scale, a.originPoint);
}
const F0 = 0.999999999999, Q0 = 1.0000000000001;
function Vz(e, i, a, r = !1) {
  const o = a.length;
  if (!o)
    return;
  i.x = i.y = 1;
  let c, h;
  for (let d = 0; d < o; d++) {
    c = a[d], h = c.projectionDelta;
    const { visualElement: m } = c.options;
    m && m.props.style && m.props.style.display === "contents" || (r && c.options.layoutScroll && c.scroll && c !== c.root && (Qn(e.x, -c.scroll.offset.x), Qn(e.y, -c.scroll.offset.y)), h && (i.x *= h.x.scale, i.y *= h.y.scale, f_(e, h)), r && Ds(c.latestValues) && fu(e, c.latestValues, c.layout?.layoutBox));
  }
  i.x < Q0 && i.x > F0 && (i.x = 1), i.y < Q0 && i.y > F0 && (i.y = 1);
}
function Qn(e, i) {
  e.min += i, e.max += i;
}
function J0(e, i, a, r, o = 0.5) {
  const c = Ut(e.min, e.max, o);
  Ld(e, i, a, c, r);
}
function W0(e, i) {
  return typeof e == "string" ? parseFloat(e) / 100 * (i.max - i.min) : e;
}
function fu(e, i, a) {
  const r = a ?? e;
  J0(e.x, W0(i.x, r.x), i.scaleX, i.scale, i.originX), J0(e.y, W0(i.y, r.y), i.scaleY, i.scale, i.originY);
}
function h_(e, i) {
  return u_(jz(e.getBoundingClientRect(), i));
}
function Lz(e, i, a) {
  const r = h_(e, a), { scroll: o } = i;
  return o && (Qn(r.x, o.offset.x), Qn(r.y, o.offset.y)), r;
}
const { schedule: xm } = /* @__PURE__ */ O1(queueMicrotask, !1), Rn = {
  x: !1,
  y: !1
};
function d_() {
  return Rn.x || Rn.y;
}
function Uz(e) {
  return e === "x" || e === "y" ? Rn[e] ? null : (Rn[e] = !0, () => {
    Rn[e] = !1;
  }) : Rn.x || Rn.y ? null : (Rn.x = Rn.y = !0, () => {
    Rn.x = Rn.y = !1;
  });
}
function m_(e, i) {
  const a = r_(e), r = new AbortController(), o = {
    passive: !0,
    ...i,
    signal: r.signal
  };
  return [a, o, () => r.abort()];
}
function kz(e) {
  return !(e.pointerType === "touch" || d_());
}
function Bz(e, i, a = {}) {
  const [r, o, c] = m_(e, a);
  return r.forEach((h) => {
    let d = !1, m = !1, p;
    const g = () => {
      h.removeEventListener("pointerleave", T);
    }, v = (A) => {
      p && (p(A), p = void 0), g();
    }, b = (A) => {
      d = !1, window.removeEventListener("pointerup", b), window.removeEventListener("pointercancel", b), m && (m = !1, v(A));
    }, _ = () => {
      d = !0, window.addEventListener("pointerup", b, o), window.addEventListener("pointercancel", b, o);
    }, T = (A) => {
      if (A.pointerType !== "touch") {
        if (d) {
          m = !0;
          return;
        }
        v(A);
      }
    }, x = (A) => {
      if (!kz(A))
        return;
      m = !1;
      const N = i(h, A);
      typeof N == "function" && (p = N, h.addEventListener("pointerleave", T, o));
    };
    h.addEventListener("pointerenter", x, o), h.addEventListener("pointerdown", _, o);
  }), c;
}
const p_ = (e, i) => i ? e === i ? !0 : p_(e, i.parentElement) : !1, Em = (e) => e.pointerType === "mouse" ? typeof e.button != "number" || e.button <= 0 : e.isPrimary !== !1, Zz = /* @__PURE__ */ new Set([
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "A"
]);
function Hz(e) {
  return Zz.has(e.tagName) || e.isContentEditable === !0;
}
const Pz = /* @__PURE__ */ new Set(["INPUT", "SELECT", "TEXTAREA"]);
function $z(e) {
  return Pz.has(e.tagName) || e.isContentEditable === !0;
}
const hu = /* @__PURE__ */ new WeakSet();
function tb(e) {
  return (i) => {
    i.key === "Enter" && e(i);
  };
}
function Xh(e, i) {
  e.dispatchEvent(new PointerEvent("pointer" + i, { isPrimary: !0, bubbles: !0 }));
}
const Gz = (e, i) => {
  const a = e.currentTarget;
  if (!a)
    return;
  const r = tb(() => {
    if (hu.has(a))
      return;
    Xh(a, "down");
    const o = tb(() => {
      Xh(a, "up");
    }), c = () => Xh(a, "cancel");
    a.addEventListener("keyup", o, i), a.addEventListener("blur", c, i);
  });
  a.addEventListener("keydown", r, i), a.addEventListener("blur", () => a.removeEventListener("keydown", r), i);
};
function eb(e) {
  return Em(e) && !d_();
}
const nb = /* @__PURE__ */ new WeakSet();
function Yz(e, i, a = {}) {
  const [r, o, c] = m_(e, a), h = (d) => {
    const m = d.currentTarget;
    if (!eb(d) || nb.has(d))
      return;
    hu.add(m), a.stopPropagation && nb.add(d);
    const p = i(m, d), g = { ...o, capture: !0 }, v = (T, x) => {
      window.removeEventListener("pointerup", b, g), window.removeEventListener("pointercancel", _, g), hu.has(m) && hu.delete(m), eb(T) && typeof p == "function" && p(T, { success: x });
    }, b = (T) => {
      v(T, m === window || m === document || a.useGlobalTarget || p_(m, T.target));
    }, _ = (T) => {
      v(T, !1);
    };
    window.addEventListener("pointerup", b, g), window.addEventListener("pointercancel", _, g);
  };
  return r.forEach((d) => {
    (a.useGlobalTarget ? window : d).addEventListener("pointerdown", h, o), Az(d) && (d.addEventListener("focus", (p) => Gz(p, o)), !Hz(d) && !d.hasAttribute("tabindex") && (d.tabIndex = 0));
  }), c;
}
const du = /* @__PURE__ */ new WeakMap();
let mu;
const g_ = (e, i, a) => (r, o) => o && o[0] ? o[0][e + "Size"] : _m(r) && "getBBox" in r ? r.getBBox()[i] : r[a], Iz = /* @__PURE__ */ g_("inline", "width", "offsetWidth"), qz = /* @__PURE__ */ g_("block", "height", "offsetHeight");
function Xz({ target: e, borderBoxSize: i }) {
  du.get(e)?.forEach((a) => {
    a(e, {
      get width() {
        return Iz(e, i);
      },
      get height() {
        return qz(e, i);
      }
    });
  });
}
function Kz(e) {
  e.forEach(Xz);
}
function Fz() {
  typeof ResizeObserver > "u" || (mu = new ResizeObserver(Kz));
}
function Qz(e, i) {
  mu || Fz();
  const a = r_(e);
  return a.forEach((r) => {
    let o = du.get(r);
    o || (o = /* @__PURE__ */ new Set(), du.set(r, o)), o.add(i), mu?.observe(r);
  }), () => {
    a.forEach((r) => {
      const o = du.get(r);
      o?.delete(i), o?.size || mu?.unobserve(r);
    });
  };
}
const pu = /* @__PURE__ */ new Set();
let La;
function Jz() {
  La = () => {
    const e = {
      get width() {
        return window.innerWidth;
      },
      get height() {
        return window.innerHeight;
      }
    };
    pu.forEach((i) => i(e));
  }, window.addEventListener("resize", La);
}
function Wz(e) {
  return pu.add(e), La || Jz(), () => {
    pu.delete(e), !pu.size && typeof La == "function" && (window.removeEventListener("resize", La), La = void 0);
  };
}
function ib(e, i) {
  return typeof e == "function" ? Wz(e) : Qz(e, i);
}
function tC(e) {
  return _m(e) && e.tagName === "svg";
}
const sb = () => ({
  translate: 0,
  scale: 1,
  origin: 0,
  originPoint: 0
}), Ua = () => ({
  x: sb(),
  y: sb()
}), ab = () => ({ min: 0, max: 0 }), le = () => ({
  x: ab(),
  y: ab()
}), eC = /* @__PURE__ */ new WeakMap();
function Pu(e) {
  return e !== null && typeof e == "object" && typeof e.start == "function";
}
function cl(e) {
  return typeof e == "string" || Array.isArray(e);
}
const wm = [
  "animate",
  "whileInView",
  "whileFocus",
  "whileHover",
  "whileTap",
  "whileDrag",
  "exit"
], zu = ["initial", ...wm];
function $u(e) {
  if (Pu(e.animate))
    return !0;
  for (let i = 0; i < zu.length; i++)
    if (cl(e[zu[i]]))
      return !0;
  return !1;
}
function y_(e) {
  return !!($u(e) || e.variants);
}
function nC(e, i, a) {
  for (const r in i) {
    const o = i[r], c = a[r];
    if (Ae(o))
      e.addValue(r, o);
    else if (Ae(c))
      e.addValue(r, Ba(o, { owner: e }));
    else if (c !== o)
      if (e.hasValue(r)) {
        const h = e.getValue(r);
        h.liveStyle === !0 ? h.jump(o) : h.hasAnimated || h.set(o);
      } else {
        const h = e.getStaticValue(r);
        e.addValue(r, Ba(h !== void 0 ? h : o, { owner: e }));
      }
  }
  for (const r in a)
    i[r] === void 0 && e.removeValue(r);
  return i;
}
const Cu = { current: null }, Am = { current: !1 }, iC = typeof window < "u";
function v_() {
  if (Am.current = !0, !!iC)
    if (window.matchMedia) {
      const e = window.matchMedia("(prefers-reduced-motion)"), i = () => Cu.current = e.matches;
      e.addEventListener("change", i), i();
    } else
      Cu.current = !1;
}
const rb = [
  "AnimationStart",
  "AnimationComplete",
  "Update",
  "BeforeLayoutMeasure",
  "LayoutMeasure",
  "LayoutAnimationStart",
  "LayoutAnimationComplete"
];
let Mu = {};
function b_(e) {
  Mu = e;
}
function sC() {
  return Mu;
}
class aC {
  /**
   * This method takes React props and returns found MotionValues. For example, HTML
   * MotionValues will be found within the style prop, whereas for Three.js within attribute arrays.
   *
   * This isn't an abstract method as it needs calling in the constructor, but it is
   * intended to be one.
   */
  scrapeMotionValuesFromProps(i, a, r) {
    return {};
  }
  constructor({ parent: i, props: a, presenceContext: r, reducedMotionConfig: o, skipAnimations: c, blockInitialAnimation: h, visualState: d }, m = {}) {
    this.current = null, this.children = /* @__PURE__ */ new Set(), this.isVariantNode = !1, this.isControllingVariants = !1, this.shouldReduceMotion = null, this.shouldSkipAnimations = !1, this.values = /* @__PURE__ */ new Map(), this.KeyframeResolver = pm, this.features = {}, this.valueSubscriptions = /* @__PURE__ */ new Map(), this.prevMotionValues = {}, this.hasBeenMounted = !1, this.events = {}, this.propEventSubscriptions = {}, this.notifyUpdate = () => this.notify("Update", this.latestValues), this.render = () => {
      this.current && (this.triggerBuild(), this.renderInstance(this.current, this.renderState, this.props.style, this.projection));
    }, this.renderScheduledAt = 0, this.scheduleRender = () => {
      const _ = ze.now();
      this.renderScheduledAt < _ && (this.renderScheduledAt = _, Bt.render(this.render, !1, !0));
    };
    const { latestValues: p, renderState: g } = d;
    this.latestValues = p, this.baseTarget = { ...p }, this.initialValues = a.initial ? { ...p } : {}, this.renderState = g, this.parent = i, this.props = a, this.presenceContext = r, this.depth = i ? i.depth + 1 : 0, this.reducedMotionConfig = o, this.skipAnimationsConfig = c, this.options = m, this.blockInitialAnimation = !!h, this.isControllingVariants = $u(a), this.isVariantNode = y_(a), this.isVariantNode && (this.variantChildren = /* @__PURE__ */ new Set()), this.manuallyAnimateOnMount = !!(i && i.current);
    const { willChange: v, ...b } = this.scrapeMotionValuesFromProps(a, {}, this);
    for (const _ in b) {
      const T = b[_];
      p[_] !== void 0 && Ae(T) && T.set(p[_]);
    }
  }
  mount(i) {
    if (this.hasBeenMounted)
      for (const a in this.initialValues)
        this.values.get(a)?.jump(this.initialValues[a]), this.latestValues[a] = this.initialValues[a];
    this.current = i, eC.set(i, this), this.projection && !this.projection.instance && this.projection.mount(i), this.parent && this.isVariantNode && !this.isControllingVariants && (this.removeFromVariantTree = this.parent.addVariantChild(this)), this.values.forEach((a, r) => this.bindToMotionValue(r, a)), this.reducedMotionConfig === "never" ? this.shouldReduceMotion = !1 : this.reducedMotionConfig === "always" ? this.shouldReduceMotion = !0 : (Am.current || v_(), this.shouldReduceMotion = Cu.current), this.shouldSkipAnimations = this.skipAnimationsConfig ?? !1, this.parent?.addChild(this), this.update(this.props, this.presenceContext), this.hasBeenMounted = !0;
  }
  unmount() {
    this.projection && this.projection.unmount(), es(this.notifyUpdate), es(this.render), this.valueSubscriptions.forEach((i) => i()), this.valueSubscriptions.clear(), this.removeFromVariantTree && this.removeFromVariantTree(), this.parent?.removeChild(this);
    for (const i in this.events)
      this.events[i].clear();
    for (const i in this.features) {
      const a = this.features[i];
      a && (a.unmount(), a.isMounted = !1);
    }
    this.current = null;
  }
  addChild(i) {
    this.children.add(i), this.enteringChildren ?? (this.enteringChildren = /* @__PURE__ */ new Set()), this.enteringChildren.add(i);
  }
  removeChild(i) {
    this.children.delete(i), this.enteringChildren && this.enteringChildren.delete(i);
  }
  bindToMotionValue(i, a) {
    if (this.valueSubscriptions.has(i) && this.valueSubscriptions.get(i)(), a.accelerate && Md.has(i) && this.current instanceof HTMLElement) {
      const { factory: h, keyframes: d, times: m, ease: p, duration: g } = a.accelerate, v = new Q1({
        element: this.current,
        name: i,
        keyframes: d,
        times: m,
        ease: p,
        duration: /* @__PURE__ */ bn(g)
      }), b = h(v);
      this.valueSubscriptions.set(i, () => {
        b(), v.cancel();
      });
      return;
    }
    const r = qa.has(i);
    r && this.onBindTransform && this.onBindTransform();
    const o = a.on("change", (h) => {
      this.latestValues[i] = h, this.props.onUpdate && Bt.preRender(this.notifyUpdate), r && this.projection && (this.projection.isTransformDirty = !0), this.scheduleRender();
    });
    let c;
    typeof window < "u" && window.MotionCheckAppearSync && (c = window.MotionCheckAppearSync(this, i, a)), this.valueSubscriptions.set(i, () => {
      o(), c && c();
    });
  }
  sortNodePosition(i) {
    return !this.current || !this.sortInstanceNodePosition || this.type !== i.type ? 0 : this.sortInstanceNodePosition(this.current, i.current);
  }
  updateFeatures() {
    let i = "animation";
    for (i in Mu) {
      const a = Mu[i];
      if (!a)
        continue;
      const { isEnabled: r, Feature: o } = a;
      if (!this.features[i] && o && r(this.props) && (this.features[i] = new o(this)), this.features[i]) {
        const c = this.features[i];
        c.isMounted ? c.update() : (c.mount(), c.isMounted = !0);
      }
    }
  }
  triggerBuild() {
    this.build(this.renderState, this.latestValues, this.props);
  }
  /**
   * Measure the current viewport box with or without transforms.
   * Only measures axis-aligned boxes, rotate and skew must be manually
   * removed with a re-render to work.
   */
  measureViewportBox() {
    return this.current ? this.measureInstanceViewportBox(this.current, this.props) : le();
  }
  getStaticValue(i) {
    return this.latestValues[i];
  }
  setStaticValue(i, a) {
    this.latestValues[i] = a;
  }
  /**
   * Update the provided props. Ensure any newly-added motion values are
   * added to our map, old ones removed, and listeners updated.
   */
  update(i, a) {
    (i.transformTemplate || this.props.transformTemplate) && this.scheduleRender(), this.prevProps = this.props, this.props = i, this.prevPresenceContext = this.presenceContext, this.presenceContext = a;
    for (let r = 0; r < rb.length; r++) {
      const o = rb[r];
      this.propEventSubscriptions[o] && (this.propEventSubscriptions[o](), delete this.propEventSubscriptions[o]);
      const c = "on" + o, h = i[c];
      h && (this.propEventSubscriptions[o] = this.on(o, h));
    }
    this.prevMotionValues = nC(this, this.scrapeMotionValuesFromProps(i, this.prevProps || {}, this), this.prevMotionValues), this.handleChildMotionValue && this.handleChildMotionValue();
  }
  getProps() {
    return this.props;
  }
  /**
   * Returns the variant definition with a given name.
   */
  getVariant(i) {
    return this.props.variants ? this.props.variants[i] : void 0;
  }
  /**
   * Returns the defined default transition on this component.
   */
  getDefaultTransition() {
    return this.props.transition;
  }
  getTransformPagePoint() {
    return this.props.transformPagePoint;
  }
  getClosestVariantNode() {
    return this.isVariantNode ? this : this.parent ? this.parent.getClosestVariantNode() : void 0;
  }
  /**
   * Add a child visual element to our set of children.
   */
  addVariantChild(i) {
    const a = this.getClosestVariantNode();
    if (a)
      return a.variantChildren && a.variantChildren.add(i), () => a.variantChildren.delete(i);
  }
  /**
   * Add a motion value and bind it to this visual element.
   */
  addValue(i, a) {
    const r = this.values.get(i);
    a !== r && (r && this.removeValue(i), this.bindToMotionValue(i, a), this.values.set(i, a), this.latestValues[i] = a.get());
  }
  /**
   * Remove a motion value and unbind any active subscriptions.
   */
  removeValue(i) {
    this.values.delete(i);
    const a = this.valueSubscriptions.get(i);
    a && (a(), this.valueSubscriptions.delete(i)), delete this.latestValues[i], this.removeValueFromRenderState(i, this.renderState);
  }
  /**
   * Check whether we have a motion value for this key
   */
  hasValue(i) {
    return this.values.has(i);
  }
  getValue(i, a) {
    if (this.props.values && this.props.values[i])
      return this.props.values[i];
    let r = this.values.get(i);
    return r === void 0 && a !== void 0 && (r = Ba(a === null ? void 0 : a, { owner: this }), this.addValue(i, r)), r;
  }
  /**
   * If we're trying to animate to a previously unencountered value,
   * we need to check for it in our state and as a last resort read it
   * directly from the instance (which might have performance implications).
   */
  readValue(i, a) {
    let r = this.latestValues[i] !== void 0 || !this.current ? this.latestValues[i] : this.getBaseTargetFromProps(this.props, i) ?? this.readValueFromInstance(this.current, i, this.options);
    return r != null && (typeof r == "string" && (nm(r) || im(r)) ? r = parseFloat(r) : (
      /**
       * If the value as read isn't animatable (e.g. "none") but
       * the target is, derive an animatable none from the target.
       * A value is animatable if it's a number or contains a
       * number or color, which is cheaper to check than trying
       * every value type in turn.
       */
      typeof r != "number" && !ln.test(r) && ln.test(a) && (r = mm(i, a))
    ), this.setBaseTarget(i, Ae(r) ? r.get() : r)), Ae(r) ? r.get() : r;
  }
  /**
   * Set the base target to later animate back to. This is currently
   * only hydrated on creation and when we first read a value.
   */
  setBaseTarget(i, a) {
    this.baseTarget[i] = a;
  }
  /**
   * Find the base target for a value thats been removed from all animation
   * props.
   */
  getBaseTarget(i) {
    const { initial: a } = this.props;
    let r;
    if (typeof a == "string" || typeof a == "object") {
      const c = vm(this.props, a, this.presenceContext?.custom);
      c && (r = c[i]);
    }
    if (a && r !== void 0)
      return r;
    const o = this.getBaseTargetFromProps(this.props, i);
    return o !== void 0 && !Ae(o) ? o : this.initialValues[i] !== void 0 && r === void 0 ? void 0 : this.baseTarget[i];
  }
  on(i, a) {
    return this.events[i] || (this.events[i] = new _u()), this.events[i].add(a);
  }
  notify(i, ...a) {
    this.events[i] && this.events[i].notify(...a);
  }
  scheduleRenderMicrotask() {
    xm.render(this.render);
  }
}
class S_ extends aC {
  constructor() {
    super(...arguments), this.KeyframeResolver = wz;
  }
  sortInstanceNodePosition(i, a) {
    return i.compareDocumentPosition(a) & 2 ? 1 : -1;
  }
  getBaseTargetFromProps(i, a) {
    const r = i.style;
    return r ? r[a] : void 0;
  }
  removeValueFromRenderState(i, { vars: a, style: r }) {
    delete a[i], delete r[i];
  }
  handleChildMotionValue() {
    this.childSubscription && (this.childSubscription(), delete this.childSubscription);
    const { children: i } = this.props;
    Ae(i) && (this.childSubscription = i.on("change", (a) => {
      this.current && (this.current.textContent = `${a}`);
    }));
  }
}
class as {
  constructor(i) {
    this.isMounted = !1, this.node = i;
  }
  update() {
  }
}
function __(e, { style: i, vars: a }, r, o) {
  const c = e.style;
  let h;
  for (h in i)
    c[h] = i[h];
  o?.applyProjectionStyles(c, r);
  for (h in a)
    c.setProperty(h, a[h]);
}
function lb(e, i) {
  return i.max === i.min ? 0 : e / (i.max - i.min) * 100;
}
const Yr = {
  correct: (e, i) => {
    if (!i.target)
      return e;
    if (typeof e == "string")
      if (nt.test(e))
        e = parseFloat(e);
      else
        return e;
    const a = lb(e, i.target.x), r = lb(e, i.target.y);
    return `${a}% ${r}%`;
  }
}, rC = {
  correct: (e, { treeScale: i, projectionDelta: a }) => {
    const r = e, o = ln.parse(e);
    if (o.length > 5)
      return r;
    const c = ln.createTransformer(e), h = typeof o[0] != "number" ? 1 : 0, d = a.x.scale * i.x, m = a.y.scale * i.y;
    o[0 + h] /= d, o[1 + h] /= m;
    const p = Ut(d, m, 0.5);
    return typeof o[2 + h] == "number" && (o[2 + h] /= p), typeof o[3 + h] == "number" && (o[3 + h] /= p), c(o);
  }
}, Ud = {
  borderRadius: {
    ...Yr,
    applyTo: [...Sm]
  },
  borderTopLeftRadius: Yr,
  borderTopRightRadius: Yr,
  borderBottomLeftRadius: Yr,
  borderBottomRightRadius: Yr,
  boxShadow: rC
};
function T_(e, { layout: i, layoutId: a }) {
  return qa.has(e) || e.startsWith("origin") || (i || a !== void 0) && (!!Ud[e] || e === "opacity");
}
function Om(e, i, a) {
  const r = e.style, o = i?.style, c = {};
  if (!r)
    return c;
  for (const h in r)
    (Ae(r[h]) || o && Ae(o[h]) || T_(h, e) || a?.getValue(h)?.liveStyle !== void 0) && (c[h] = r[h]);
  return c;
}
function lC(e) {
  return window.getComputedStyle(e);
}
class oC extends S_ {
  constructor() {
    super(...arguments), this.type = "html", this.renderInstance = __;
  }
  mount(i) {
    Zu(!!i.style), super.mount(i);
  }
  readValueFromInstance(i, a) {
    if (qa.has(a))
      return this.projection?.isProjecting ? Ed(a) : CO(i, a);
    {
      const r = lC(i), o = (C1(a) ? r.getPropertyValue(a) : r[a]) || 0;
      return typeof o == "string" ? o.trim() : o;
    }
  }
  measureInstanceViewportBox(i, { transformPagePoint: a }) {
    return h_(i, a);
  }
  build(i, a, r) {
    Tm(i, a, r.transformTemplate);
  }
  scrapeMotionValuesFromProps(i, a, r) {
    return Om(i, a, r);
  }
}
const x_ = /* @__PURE__ */ new Set([
  "baseFrequency",
  "diffuseConstant",
  "kernelMatrix",
  "kernelUnitLength",
  "keySplines",
  "keyTimes",
  "limitingConeAngle",
  "markerHeight",
  "markerWidth",
  "numOctaves",
  "targetX",
  "targetY",
  "surfaceScale",
  "specularConstant",
  "specularExponent",
  "stdDeviation",
  "tableValues",
  "viewBox",
  "gradientTransform",
  "pathLength",
  "startOffset",
  "textLength",
  "lengthAdjust"
]), E_ = (e) => typeof e == "string" && e.toLowerCase() === "svg";
function uC(e, i, a, r) {
  __(e, i, void 0, r);
  for (const o in i.attrs)
    e.setAttribute(x_.has(o) ? o : bm(o), i.attrs[o]);
}
function w_(e, i, a) {
  const r = Om(e, i, a);
  for (const o in e)
    if (Ae(e[o]) || Ae(i[o])) {
      const c = Ia.indexOf(o) !== -1 ? "attr" + o.charAt(0).toUpperCase() + o.substring(1) : o;
      r[c] = e[o];
    }
  return r;
}
class cC extends S_ {
  constructor() {
    super(...arguments), this.type = "svg", this.isSVGTag = !1, this.measureInstanceViewportBox = le;
  }
  getBaseTargetFromProps(i, a) {
    return i[a];
  }
  readValueFromInstance(i, a) {
    if (qa.has(a)) {
      const r = $1(a);
      return r && r.default || 0;
    }
    if (l_.includes(a)) {
      const o = getComputedStyle(i)[a];
      if (typeof o == "string" && o)
        return o.trim();
    }
    return a = x_.has(a) ? a : bm(a), i.getAttribute(a);
  }
  scrapeMotionValuesFromProps(i, a, r) {
    return w_(i, a, r);
  }
  build(i, a, r) {
    o_(i, a, this.isSVGTag, r.transformTemplate, r.style);
  }
  renderInstance(i, a, r, o) {
    uC(i, a, r, o);
  }
  mount(i) {
    this.isSVGTag = E_(i.tagName), super.mount(i);
  }
}
const fC = zu.length;
function A_(e) {
  if (!e)
    return;
  if (!e.isControllingVariants) {
    const a = e.parent ? A_(e.parent) || {} : {};
    return e.props.initial !== void 0 && (a.initial = e.props.initial), a;
  }
  const i = {};
  for (let a = 0; a < fC; a++) {
    const r = zu[a], o = e.props[r];
    (cl(o) || o === !1) && (i[r] = o);
  }
  return i;
}
function O_(e, i) {
  if (!Array.isArray(i))
    return !1;
  const a = i.length;
  if (a !== e.length)
    return !1;
  for (let r = 0; r < a; r++)
    if (i[r] !== e[r])
      return !1;
  return !0;
}
const hC = [...wm].reverse(), dC = wm.length;
function mC(e) {
  return (i) => Promise.all(i.map(({ animation: a, options: r }) => vz(e, a, r)));
}
function pC(e) {
  let i = mC(e), a = ob(), r = !0, o = !1;
  const c = (p) => (g, v) => {
    const b = Us(e, v, p === "exit" ? e.presenceContext?.custom : void 0);
    if (b) {
      const { transition: _, transitionEnd: T, ...x } = b;
      g = { ...g, ...x, ...T };
    }
    return g;
  };
  function h(p) {
    i = p(e);
  }
  function d(p) {
    const { props: g } = e, v = A_(e.parent) || {}, b = [], _ = /* @__PURE__ */ new Set();
    let T = {}, x = 1 / 0;
    for (let N = 0; N < dC; N++) {
      const D = hC[N], k = a[D], G = g[D] !== void 0 ? g[D] : v[D], X = cl(G), q = D === p ? k.isActive : null;
      q === !1 && (x = N);
      let V = G === v[D] && G !== g[D] && X;
      if (V && (r || o) && e.manuallyAnimateOnMount && (V = !1), k.protectedKeys = { ...T }, // If it isn't active and hasn't *just* been set as inactive
      !k.isActive && q === null || // If we didn't and don't have any defined prop for this animation type
      !G && !k.prevProp || // Or if the prop doesn't define an animation
      Pu(G) || typeof G == "boolean")
        continue;
      if (D === "exit" && k.isActive && q !== !0) {
        k.prevResolvedValues && (T = {
          ...T,
          ...k.prevResolvedValues
        });
        continue;
      }
      const $ = gC(k.prevProp, G);
      let J = $ || // If we're making this variant active, we want to always make it active
      D === p && k.isActive && !V && X || // If we removed a higher-priority variant (i is in reverse order)
      N > x && X, Q = !1;
      const mt = Array.isArray(G) ? G : [G];
      let vt = mt.reduce(c(D), {});
      q === !1 && (vt = {});
      const { prevResolvedValues: $t = {} } = k, ee = {
        ...$t,
        ...vt
      }, tt = (K) => {
        J = !0, _.has(K) && (Q = !0, _.delete(K)), k.needsAnimating[K] = !0;
        const ft = e.getValue(K);
        ft && (ft.liveStyle = !1);
      };
      for (const K in ee) {
        const ft = vt[K], bt = $t[K];
        if (T.hasOwnProperty(K))
          continue;
        let he = !1;
        Rd(ft) && Rd(bt) ? he = !O_(ft, bt) || $ : he = ft !== bt, he ? ft != null ? tt(K) : _.add(K) : ft !== void 0 && _.has(K) ? tt(K) : k.protectedKeys[K] = !0;
      }
      k.prevProp = G, k.prevResolvedValues = vt, k.isActive && (T = { ...T, ...vt }), (r || o) && e.blockInitialAnimation && (J = !1);
      const Y = V && $;
      J && (!Y || Q) && b.push(...mt.map((K) => {
        const ft = { type: D };
        if (typeof K == "string" && (r || o) && !Y && e.manuallyAnimateOnMount && e.parent) {
          const { parent: bt } = e, he = Us(bt, K);
          if (bt.enteringChildren && he) {
            const { delayChildren: xn } = he.transition || {};
            ft.delay = W1(bt.enteringChildren, e, xn);
          }
        }
        return {
          animation: K,
          options: ft
        };
      }));
    }
    if (_.size) {
      const N = {};
      if (typeof g.initial != "boolean") {
        const D = Us(e, Array.isArray(g.initial) ? g.initial[0] : g.initial);
        D && D.transition && (N.transition = D.transition);
      }
      _.forEach((D) => {
        const k = e.getBaseTarget(D), G = e.getValue(D);
        G && (G.liveStyle = !0), N[D] = k ?? null;
      }), b.push({ animation: N });
    }
    let A = !!b.length;
    return r && (g.initial === !1 || g.initial === g.animate) && !e.manuallyAnimateOnMount && (A = !1), r = !1, o = !1, A ? i(b) : Promise.resolve();
  }
  function m(p, g) {
    if (a[p].isActive === g)
      return Promise.resolve();
    e.variantChildren?.forEach((b) => b.animationState?.setActive(p, g)), a[p].isActive = g;
    const v = d(p);
    for (const b in a)
      a[b].protectedKeys = {};
    return v;
  }
  return {
    animateChanges: d,
    setActive: m,
    setAnimateFunction: h,
    getState: () => a,
    reset: () => {
      a = ob(), o = !0;
    }
  };
}
function gC(e, i) {
  return typeof i == "string" ? i !== e : Array.isArray(i) ? !O_(i, e) : !1;
}
function Rs(e = !1) {
  return {
    isActive: e,
    protectedKeys: {},
    needsAnimating: {},
    prevResolvedValues: {}
  };
}
function ob() {
  return {
    animate: Rs(!0),
    whileInView: Rs(),
    whileHover: Rs(),
    whileTap: Rs(),
    whileDrag: Rs(),
    whileFocus: Rs(),
    exit: Rs()
  };
}
function kd(e, i) {
  e.min = i.min, e.max = i.max;
}
function Mn(e, i) {
  kd(e.x, i.x), kd(e.y, i.y);
}
function ub(e, i) {
  e.translate = i.translate, e.scale = i.scale, e.originPoint = i.originPoint, e.origin = i.origin;
}
const z_ = 1e-4, yC = 1 - z_, vC = 1 + z_, C_ = 0.01, bC = 0 - C_, SC = 0 + C_;
function Ve(e) {
  return e.max - e.min;
}
function _C(e, i, a) {
  return Math.abs(e - i) <= a;
}
function cb(e, i, a, r = 0.5) {
  e.origin = r, e.originPoint = Ut(i.min, i.max, e.origin), e.scale = Ve(a) / Ve(i), e.translate = Ut(a.min, a.max, e.origin) - e.originPoint, (e.scale >= yC && e.scale <= vC || isNaN(e.scale)) && (e.scale = 1), (e.translate >= bC && e.translate <= SC || isNaN(e.translate)) && (e.translate = 0);
}
function el(e, i, a, r) {
  cb(e.x, i.x, a.x, r ? r.originX : void 0), cb(e.y, i.y, a.y, r ? r.originY : void 0);
}
function fb(e, i, a, r = 0) {
  const o = r ? Ut(a.min, a.max, r) : a.min;
  e.min = o + i.min, e.max = e.min + Ve(i);
}
function TC(e, i, a, r) {
  fb(e.x, i.x, a.x, r?.x), fb(e.y, i.y, a.y, r?.y);
}
function hb(e, i, a, r = 0) {
  const o = r ? Ut(a.min, a.max, r) : a.min;
  e.min = i.min - o, e.max = e.min + Ve(i);
}
function Ru(e, i, a, r) {
  hb(e.x, i.x, a.x, r?.x), hb(e.y, i.y, a.y, r?.y);
}
function db(e, i, a, r, o) {
  return e -= i, e = Ou(e, 1 / a, r), o !== void 0 && (e = Ou(e, 1 / o, r)), e;
}
function xC(e, i = 0, a = 1, r = 0.5, o, c = e, h = e) {
  if (Jn.test(i) && (i = parseFloat(i), i = Ut(h.min, h.max, i / 100) - h.min), typeof i != "number")
    return;
  let d = Ut(c.min, c.max, r);
  e === c && (d -= i), e.min = db(e.min, i, a, d, o), e.max = db(e.max, i, a, d, o);
}
function mb(e, i, [a, r, o], c, h) {
  xC(e, i[a], i[r], i[o], i.scale, c, h);
}
const EC = ["x", "scaleX", "originX"], wC = ["y", "scaleY", "originY"];
function pb(e, i, a, r) {
  mb(e.x, i, EC, a ? a.x : void 0, r ? r.x : void 0), mb(e.y, i, wC, a ? a.y : void 0, r ? r.y : void 0);
}
function gb(e) {
  return e.translate === 0 && e.scale === 1;
}
function M_(e) {
  return gb(e.x) && gb(e.y);
}
function yb(e, i) {
  return e.min === i.min && e.max === i.max;
}
function AC(e, i) {
  return yb(e.x, i.x) && yb(e.y, i.y);
}
function vb(e, i) {
  return Math.round(e.min) === Math.round(i.min) && Math.round(e.max) === Math.round(i.max);
}
function R_(e, i) {
  return vb(e.x, i.x) && vb(e.y, i.y);
}
function bb(e) {
  return Ve(e.x) / Ve(e.y);
}
function Sb(e, i) {
  return e.translate === i.translate && e.scale === i.scale && e.originPoint === i.originPoint;
}
function Fn(e) {
  return [e("x"), e("y")];
}
function OC(e, i, a) {
  let r = "";
  const o = e.x.translate / i.x, c = e.y.translate / i.y, h = a?.z || 0;
  if ((o || c || h) && (r = `translate3d(${o}px, ${c}px, ${h}px) `), (i.x !== 1 || i.y !== 1) && (r += `scale(${1 / i.x}, ${1 / i.y}) `), a) {
    const { transformPerspective: p, rotate: g, pathRotation: v, rotateX: b, rotateY: _, skewX: T, skewY: x } = a;
    p && (r = `perspective(${p}px) ${r}`), g && (r += `rotate(${g}deg) `), v && (r += `rotate(${v}deg) `), b && (r += `rotateX(${b}deg) `), _ && (r += `rotateY(${_}deg) `), T && (r += `skewX(${T}deg) `), x && (r += `skewY(${x}deg) `);
  }
  const d = e.x.scale * i.x, m = e.y.scale * i.y;
  return (d !== 1 || m !== 1) && (r += `scale(${d}, ${m})`), r || "none";
}
const zC = Sm.length, _b = (e) => typeof e == "string" ? parseFloat(e) : e, Tb = (e) => typeof e == "number" || nt.test(e);
function CC(e, i, a, r, o, c) {
  o ? (e.opacity = Ut(0, a.opacity ?? 1, MC(r)), e.opacityExit = Ut(i.opacity ?? 1, 0, RC(r))) : c && (e.opacity = Ut(i.opacity ?? 1, a.opacity ?? 1, r));
  for (let h = 0; h < zC; h++) {
    const d = Sm[h];
    let m = xb(i, d), p = xb(a, d);
    if (m === void 0 && p === void 0)
      continue;
    m || (m = 0), p || (p = 0), m === 0 || p === 0 || Tb(m) === Tb(p) ? (e[d] = Math.max(Ut(_b(m), _b(p), r), 0), (Jn.test(p) || Jn.test(m)) && (e[d] += "%")) : e[d] = p;
  }
  (i.rotate || a.rotate) && (e.rotate = Ut(i.rotate || 0, a.rotate || 0, r));
}
function xb(e, i) {
  return e[i] !== void 0 ? e[i] : e.borderRadius;
}
const MC = /* @__PURE__ */ D_(0, 0.5, x1), RC = /* @__PURE__ */ D_(0.5, 0.95, Nn);
function D_(e, i, a) {
  return (r) => r < e ? 0 : r > i ? 1 : a(/* @__PURE__ */ ll(e, i, r));
}
function DC(e, i, a) {
  const r = Ae(e) ? e : Ba(e);
  return r.start(ym("", r, i, a)), r.animation;
}
function fl(e, i, a, r = { passive: !0 }) {
  return e.addEventListener(i, a, r), () => e.removeEventListener(i, a, r);
}
const NC = (e, i) => e.depth - i.depth;
class jC {
  constructor() {
    this.children = [], this.isDirty = !1;
  }
  add(i) {
    em(this.children, i), this.isDirty = !0;
  }
  remove(i) {
    Su(this.children, i), this.isDirty = !0;
  }
  forEach(i) {
    this.isDirty && this.children.sort(NC), this.isDirty = !1, this.children.forEach(i);
  }
}
function VC(e, i) {
  const a = ze.now(), r = ({ timestamp: o }) => {
    const c = o - a;
    c >= i && (es(r), e(c - i));
  };
  return Bt.setup(r, !0), () => es(r);
}
function gu(e) {
  return Ae(e) ? e.get() : e;
}
class LC {
  constructor() {
    this.members = [];
  }
  add(i) {
    em(this.members, i);
    for (let a = this.members.length - 1; a >= 0; a--) {
      const r = this.members[a];
      if (r === i || r === this.lead || r === this.prevLead)
        continue;
      const o = r.instance;
      (!o || o.isConnected === !1) && !r.snapshot && (Su(this.members, r), r.unmount());
    }
    i.scheduleRender();
  }
  remove(i) {
    if (Su(this.members, i), i === this.prevLead && (this.prevLead = void 0), i === this.lead) {
      const a = this.members[this.members.length - 1];
      a && this.promote(a);
    }
  }
  relegate(i) {
    for (let a = this.members.indexOf(i) - 1; a >= 0; a--) {
      const r = this.members[a];
      if (r.isPresent !== !1 && r.instance?.isConnected !== !1)
        return this.promote(r), !0;
    }
    return !1;
  }
  promote(i, a) {
    const r = this.lead;
    if (i !== r && (this.prevLead = r, this.lead = i, i.show(), r)) {
      r.updateSnapshot(), i.scheduleRender();
      const { layoutDependency: o } = r.options, { layoutDependency: c } = i.options;
      (o === void 0 || o !== c) && (i.resumeFrom = r, a && (r.preserveOpacity = !0), r.snapshot && (i.snapshot = r.snapshot, i.snapshot.latestValues = r.animationValues || r.latestValues), i.root?.isUpdating && (i.isLayoutDirty = !0)), i.options.crossfade === !1 && r.hide();
    }
  }
  exitAnimationComplete() {
    this.members.forEach((i) => {
      i.options.onExitComplete?.(), i.resumingFrom?.options.onExitComplete?.();
    });
  }
  scheduleRender() {
    this.members.forEach((i) => i.instance && i.scheduleRender(!1));
  }
  removeLeadSnapshot() {
    this.lead?.snapshot && (this.lead.snapshot = void 0);
  }
}
const yu = {
  /**
   * Global flag as to whether the tree has animated since the last time
   * we resized the window
   */
  hasAnimatedSinceResize: !0,
  /**
   * We set this to true once, on the first update. Any nodes added to the tree beyond that
   * update will be given a `data-projection-id` attribute.
   */
  hasEverUpdated: !1
}, Kh = ["", "X", "Y", "Z"], UC = 1e3;
let kC = 0;
function Fh(e, i, a, r) {
  const { latestValues: o } = i;
  o[e] && (a[e] = o[e], i.setStaticValue(e, 0), r && (r[e] = 0));
}
function N_(e) {
  if (e.hasCheckedOptimisedAppear = !0, e.root === e)
    return;
  const { visualElement: i } = e.options;
  if (!i)
    return;
  const a = s_(i);
  if (window.MotionHasOptimisedAnimation(a, "transform")) {
    const { layout: o, layoutId: c } = e.options;
    window.MotionCancelOptimisedAnimation(a, "transform", Bt, !(o || c));
  }
  const { parent: r } = e;
  r && !r.hasCheckedOptimisedAppear && N_(r);
}
function j_({ attachResizeListener: e, defaultParent: i, measureScroll: a, checkIsScrollRoot: r, resetTransform: o }) {
  return class {
    constructor(h = {}, d = i?.()) {
      this.id = kC++, this.animationId = 0, this.animationCommitId = 0, this.children = /* @__PURE__ */ new Set(), this.options = {}, this.isTreeAnimating = !1, this.isAnimationBlocked = !1, this.isLayoutDirty = !1, this.isProjectionDirty = !1, this.isSharedProjectionDirty = !1, this.isTransformDirty = !1, this.updateManuallyBlocked = !1, this.updateBlockedByResize = !1, this.isUpdating = !1, this.isSVG = !1, this.needsReset = !1, this.shouldResetTransform = !1, this.hasCheckedOptimisedAppear = !1, this.treeScale = { x: 1, y: 1 }, this.eventHandlers = /* @__PURE__ */ new Map(), this.hasTreeAnimated = !1, this.layoutVersion = 0, this.updateScheduled = !1, this.scheduleUpdate = () => this.update(), this.projectionUpdateScheduled = !1, this.checkUpdateFailed = () => {
        this.isUpdating && (this.isUpdating = !1, this.clearAllSnapshots());
      }, this.updateProjection = () => {
        this.projectionUpdateScheduled = !1, this.nodes.forEach(HC), this.nodes.forEach(qC), this.nodes.forEach(XC), this.nodes.forEach(PC);
      }, this.resolvedRelativeTargetAt = 0, this.linkedParentVersion = 0, this.hasProjected = !1, this.isVisible = !0, this.animationProgress = 0, this.sharedNodes = /* @__PURE__ */ new Map(), this.latestValues = h, this.root = d ? d.root || d : this, this.path = d ? [...d.path, d] : [], this.parent = d, this.depth = d ? d.depth + 1 : 0;
      for (let m = 0; m < this.path.length; m++)
        this.path[m].shouldResetTransform = !0;
      this.root === this && (this.nodes = new jC());
    }
    addEventListener(h, d) {
      return this.eventHandlers.has(h) || this.eventHandlers.set(h, new _u()), this.eventHandlers.get(h).add(d);
    }
    notifyListeners(h, ...d) {
      const m = this.eventHandlers.get(h);
      m && m.notify(...d);
    }
    hasListeners(h) {
      return this.eventHandlers.has(h);
    }
    /**
     * Lifecycles
     */
    mount(h) {
      if (this.instance)
        return;
      this.isSVG = _m(h) && !tC(h), this.instance = h;
      const { layoutId: d, layout: m, visualElement: p } = this.options;
      if (p && !p.current && p.mount(h), this.root.nodes.add(this), this.parent && this.parent.children.add(this), this.root.hasTreeAnimated && (m || d) && (this.isLayoutDirty = !0), e) {
        let g, v = 0;
        const b = () => this.root.updateBlockedByResize = !1;
        Bt.read(() => {
          v = window.innerWidth;
        }), e(h, () => {
          const _ = window.innerWidth;
          _ !== v && (v = _, this.root.updateBlockedByResize = !0, g && g(), g = VC(b, 250), yu.hasAnimatedSinceResize && (yu.hasAnimatedSinceResize = !1, this.nodes.forEach(Ab)));
        });
      }
      d && this.root.registerSharedNode(d, this), this.options.animate !== !1 && p && (d || m) && this.addEventListener("didUpdate", ({ delta: g, hasLayoutChanged: v, hasRelativeLayoutChanged: b, layout: _ }) => {
        if (this.isTreeAnimationBlocked()) {
          this.target = void 0, this.relativeTarget = void 0;
          return;
        }
        const T = this.options.transition || p.getDefaultTransition() || WC, { onLayoutAnimationStart: x, onLayoutAnimationComplete: A } = p.getProps(), N = !this.targetLayout || !R_(this.targetLayout, _), D = !v && b;
        if (this.options.layoutRoot || this.resumeFrom || D || v && (N || !this.currentAnimation)) {
          this.resumeFrom && (this.resumingFrom = this.resumeFrom, this.resumingFrom.resumingFrom = void 0);
          const k = {
            ...gm(T, "layout"),
            onPlay: x,
            onComplete: A
          };
          (p.shouldReduceMotion || this.options.layoutRoot) && (k.delay = 0, k.type = !1), this.startAnimation(k), this.setAnimationOrigin(g, D, k.path);
        } else
          v || Ab(this), this.isLead() && this.options.onExitComplete && this.options.onExitComplete();
        this.targetLayout = _;
      });
    }
    unmount() {
      this.options.layoutId && this.willUpdate(), this.root.nodes.remove(this);
      const h = this.getStack();
      h && h.remove(this), this.parent && this.parent.children.delete(this), this.instance = void 0, this.eventHandlers.clear(), es(this.updateProjection);
    }
    // only on the root
    blockUpdate() {
      this.updateManuallyBlocked = !0;
    }
    unblockUpdate() {
      this.updateManuallyBlocked = !1;
    }
    isUpdateBlocked() {
      return this.updateManuallyBlocked || this.updateBlockedByResize;
    }
    isTreeAnimationBlocked() {
      return this.isAnimationBlocked || this.parent && this.parent.isTreeAnimationBlocked() || !1;
    }
    // Note: currently only running on root node
    startUpdate() {
      this.isUpdateBlocked() || (this.isUpdating = !0, this.nodes && this.nodes.forEach(KC), this.animationId++);
    }
    getTransformTemplate() {
      const { visualElement: h } = this.options;
      return h && h.getProps().transformTemplate;
    }
    willUpdate(h = !0) {
      if (this.root.hasTreeAnimated = !0, this.root.isUpdateBlocked()) {
        this.options.onExitComplete && this.options.onExitComplete();
        return;
      }
      if (window.MotionCancelOptimisedAnimation && !this.hasCheckedOptimisedAppear && N_(this), !this.root.isUpdating && this.root.startUpdate(), this.isLayoutDirty)
        return;
      this.isLayoutDirty = !0;
      for (let g = 0; g < this.path.length; g++) {
        const v = this.path[g];
        v.shouldResetTransform = !0, (typeof v.latestValues.x == "string" || typeof v.latestValues.y == "string") && (v.isLayoutDirty = !0), v.updateScroll("snapshot"), v.options.layoutRoot && v.willUpdate(!1);
      }
      const { layoutId: d, layout: m } = this.options;
      if (d === void 0 && !m)
        return;
      const p = this.getTransformTemplate();
      this.prevTransformTemplateValue = p ? p(this.latestValues, "") : void 0, this.updateSnapshot(), h && this.notifyListeners("willUpdate");
    }
    update() {
      if (this.updateScheduled = !1, this.isUpdateBlocked()) {
        const m = this.updateBlockedByResize;
        this.unblockUpdate(), this.updateBlockedByResize = !1, this.clearAllSnapshots(), m && this.nodes.forEach(GC), this.nodes.forEach(Eb);
        return;
      }
      if (this.animationId <= this.animationCommitId) {
        this.nodes.forEach(wb);
        return;
      }
      this.animationCommitId = this.animationId, this.isUpdating ? (this.isUpdating = !1, this.nodes.forEach(YC), this.nodes.forEach(IC), this.nodes.forEach(BC), this.nodes.forEach(ZC)) : this.nodes.forEach(wb), this.clearAllSnapshots();
      const d = ze.now();
      oe.delta = jn(0, 1e3 / 60, d - oe.timestamp), oe.timestamp = d, oe.isProcessing = !0, Hh.update.process(oe), Hh.preRender.process(oe), Hh.render.process(oe), oe.isProcessing = !1;
    }
    didUpdate() {
      this.updateScheduled || (this.updateScheduled = !0, xm.read(this.scheduleUpdate));
    }
    clearAllSnapshots() {
      this.nodes.forEach($C), this.sharedNodes.forEach(FC);
    }
    scheduleUpdateProjection() {
      this.projectionUpdateScheduled || (this.projectionUpdateScheduled = !0, Bt.preRender(this.updateProjection, !1, !0));
    }
    scheduleCheckAfterUnmount() {
      Bt.postRender(() => {
        this.isLayoutDirty ? this.root.didUpdate() : this.root.checkUpdateFailed();
      });
    }
    /**
     * Update measurements
     */
    updateSnapshot() {
      this.snapshot || !this.instance || (this.snapshot = this.measure(), this.snapshot && !Ve(this.snapshot.measuredBox.x) && !Ve(this.snapshot.measuredBox.y) && (this.snapshot = void 0));
    }
    updateLayout() {
      if (!this.instance || (this.updateScroll(), !(this.options.alwaysMeasureLayout && this.isLead()) && !this.isLayoutDirty))
        return;
      if (this.resumeFrom && !this.resumeFrom.instance)
        for (let m = 0; m < this.path.length; m++)
          this.path[m].updateScroll();
      const h = this.layout;
      this.layout = this.measure(!1), this.layoutVersion++, this.layoutCorrected || (this.layoutCorrected = le()), this.isLayoutDirty = !1, this.projectionDelta = void 0, this.notifyListeners("measure", this.layout.layoutBox);
      const { visualElement: d } = this.options;
      d && d.notify("LayoutMeasure", this.layout.layoutBox, h ? h.layoutBox : void 0);
    }
    updateScroll(h = "measure") {
      let d = !!(this.options.layoutScroll && this.instance);
      if (this.scroll && this.scroll.animationId === this.root.animationId && this.scroll.phase === h && (d = !1), d && this.instance) {
        const m = r(this.instance);
        this.scroll = {
          animationId: this.root.animationId,
          phase: h,
          isRoot: m,
          offset: a(this.instance),
          wasRoot: this.scroll ? this.scroll.isRoot : m
        };
      }
    }
    resetTransform() {
      if (!o)
        return;
      const h = this.isLayoutDirty || this.shouldResetTransform || this.options.alwaysMeasureLayout, d = this.projectionDelta && !M_(this.projectionDelta), m = this.getTransformTemplate(), p = m ? m(this.latestValues, "") : void 0, g = p !== this.prevTransformTemplateValue;
      h && this.instance && (d || Ds(this.latestValues) || g) && (o(this.instance, p), this.shouldResetTransform = !1, this.scheduleRender());
    }
    measure(h = !0) {
      const d = this.measurePageBox();
      let m = this.removeElementScroll(d);
      return h && (m = this.removeTransform(m)), t2(m), {
        animationId: this.root.animationId,
        measuredBox: d,
        layoutBox: m,
        latestValues: {},
        source: this.id
      };
    }
    measurePageBox() {
      const { visualElement: h } = this.options;
      if (!h)
        return le();
      const d = h.measureViewportBox();
      if (!(this.scroll?.wasRoot || this.path.some(e2))) {
        const { scroll: p } = this.root;
        p && (Qn(d.x, p.offset.x), Qn(d.y, p.offset.y));
      }
      return d;
    }
    removeElementScroll(h) {
      const d = le();
      if (Mn(d, h), this.scroll?.wasRoot)
        return d;
      for (let m = 0; m < this.path.length; m++) {
        const p = this.path[m], { scroll: g, options: v } = p;
        p !== this.root && g && v.layoutScroll && (g.wasRoot && Mn(d, h), Qn(d.x, g.offset.x), Qn(d.y, g.offset.y));
      }
      return d;
    }
    applyTransform(h, d = !1, m) {
      const p = m || le();
      Mn(p, h);
      for (let g = 0; g < this.path.length; g++) {
        const v = this.path[g];
        !d && v.options.layoutScroll && v.scroll && v !== v.root && (Qn(p.x, -v.scroll.offset.x), Qn(p.y, -v.scroll.offset.y)), Ds(v.latestValues) && fu(p, v.latestValues, v.layout?.layoutBox);
      }
      return Ds(this.latestValues) && fu(p, this.latestValues, this.layout?.layoutBox), p;
    }
    removeTransform(h) {
      const d = le();
      Mn(d, h);
      for (let m = 0; m < this.path.length; m++) {
        const p = this.path[m];
        if (!Ds(p.latestValues))
          continue;
        let g;
        p.instance && (Vd(p.latestValues) && p.updateSnapshot(), g = le(), Mn(g, p.measurePageBox())), pb(d, p.latestValues, p.snapshot?.layoutBox, g);
      }
      return Ds(this.latestValues) && pb(d, this.latestValues), d;
    }
    setTargetDelta(h) {
      this.targetDelta = h, this.root.scheduleUpdateProjection(), this.isProjectionDirty = !0;
    }
    setOptions(h) {
      this.options = {
        ...this.options,
        ...h,
        crossfade: h.crossfade !== void 0 ? h.crossfade : !0
      };
    }
    clearMeasurements() {
      this.scroll = void 0, this.layout = void 0, this.snapshot = void 0, this.prevTransformTemplateValue = void 0, this.targetDelta = void 0, this.target = void 0, this.isLayoutDirty = !1;
    }
    forceRelativeParentToResolveTarget() {
      this.relativeParent && this.relativeParent.resolvedRelativeTargetAt !== oe.timestamp && this.relativeParent.resolveTargetDelta(!0);
    }
    resolveTargetDelta(h = !1) {
      const d = this.getLead();
      this.isProjectionDirty || (this.isProjectionDirty = d.isProjectionDirty), this.isTransformDirty || (this.isTransformDirty = d.isTransformDirty), this.isSharedProjectionDirty || (this.isSharedProjectionDirty = d.isSharedProjectionDirty);
      const m = !!this.resumingFrom || this !== d;
      if (!(h || m && this.isSharedProjectionDirty || this.isProjectionDirty || this.parent?.isProjectionDirty || this.attemptToResolveRelativeTarget || this.root.updateBlockedByResize))
        return;
      const { layout: g, layoutId: v } = this.options;
      if (!this.layout || !(g || v))
        return;
      this.resolvedRelativeTargetAt = oe.timestamp;
      const b = this.getClosestProjectingParent();
      b && this.linkedParentVersion !== b.layoutVersion && !b.options.layoutRoot && this.removeRelativeTarget(), !this.targetDelta && !this.relativeTarget && (this.options.layoutAnchor !== !1 && b && b.layout ? this.createRelativeTarget(b, this.layout.layoutBox, b.layout.layoutBox) : this.removeRelativeTarget()), !(!this.relativeTarget && !this.targetDelta) && (this.target || (this.target = le(), this.targetWithTransforms = le()), this.relativeTarget && this.relativeTargetOrigin && this.relativeParent && this.relativeParent.target ? (this.forceRelativeParentToResolveTarget(), TC(this.target, this.relativeTarget, this.relativeParent.target, this.options.layoutAnchor || void 0)) : this.targetDelta ? (this.resumingFrom ? this.applyTransform(this.layout.layoutBox, !1, this.target) : Mn(this.target, this.layout.layoutBox), f_(this.target, this.targetDelta)) : Mn(this.target, this.layout.layoutBox), this.attemptToResolveRelativeTarget && (this.attemptToResolveRelativeTarget = !1, this.options.layoutAnchor !== !1 && b && !!b.resumingFrom == !!this.resumingFrom && !b.options.layoutScroll && b.target && this.animationProgress !== 1 ? this.createRelativeTarget(b, this.target, b.target) : this.relativeParent = this.relativeTarget = void 0));
    }
    getClosestProjectingParent() {
      if (!(!this.parent || Vd(this.parent.latestValues) || c_(this.parent.latestValues)))
        return this.parent.isProjecting() ? this.parent : this.parent.getClosestProjectingParent();
    }
    isProjecting() {
      return !!((this.relativeTarget || this.targetDelta || this.options.layoutRoot) && this.layout);
    }
    createRelativeTarget(h, d, m) {
      this.relativeParent = h, this.linkedParentVersion = h.layoutVersion, this.forceRelativeParentToResolveTarget(), this.relativeTarget = le(), this.relativeTargetOrigin = le(), Ru(this.relativeTargetOrigin, d, m, this.options.layoutAnchor || void 0), Mn(this.relativeTarget, this.relativeTargetOrigin);
    }
    removeRelativeTarget() {
      this.relativeParent = this.relativeTarget = void 0;
    }
    calcProjection() {
      const h = this.getLead(), d = !!this.resumingFrom || this !== h;
      let m = !0;
      if ((this.isProjectionDirty || this.parent?.isProjectionDirty) && (m = !1), d && (this.isSharedProjectionDirty || this.isTransformDirty) && (m = !1), this.resolvedRelativeTargetAt === oe.timestamp && (m = !1), m)
        return;
      const { layout: p, layoutId: g } = this.options;
      if (this.isTreeAnimating = !!(this.parent && this.parent.isTreeAnimating || this.currentAnimation || this.pendingAnimation), this.isTreeAnimating || (this.targetDelta = this.relativeTarget = void 0), !this.layout || !(p || g))
        return;
      Mn(this.layoutCorrected, this.layout.layoutBox);
      const v = this.treeScale.x, b = this.treeScale.y;
      Vz(this.layoutCorrected, this.treeScale, this.path, d), h.layout && !h.target && (this.treeScale.x !== 1 || this.treeScale.y !== 1) && (h.target = h.layout.layoutBox, h.targetWithTransforms = le());
      const { target: _ } = h;
      if (!_) {
        this.prevProjectionDelta && (this.createProjectionDeltas(), this.scheduleRender());
        return;
      }
      !this.projectionDelta || !this.prevProjectionDelta ? this.createProjectionDeltas() : (ub(this.prevProjectionDelta.x, this.projectionDelta.x), ub(this.prevProjectionDelta.y, this.projectionDelta.y)), el(this.projectionDelta, this.layoutCorrected, _, this.latestValues), (this.treeScale.x !== v || this.treeScale.y !== b || !Sb(this.projectionDelta.x, this.prevProjectionDelta.x) || !Sb(this.projectionDelta.y, this.prevProjectionDelta.y)) && (this.hasProjected = !0, this.scheduleRender(), this.notifyListeners("projectionUpdate", _));
    }
    hide() {
      this.isVisible = !1;
    }
    show() {
      this.isVisible = !0;
    }
    scheduleRender(h = !0) {
      if (this.options.visualElement?.scheduleRender(), h) {
        const d = this.getStack();
        d && d.scheduleRender();
      }
      this.resumingFrom && !this.resumingFrom.instance && (this.resumingFrom = void 0);
    }
    createProjectionDeltas() {
      this.prevProjectionDelta = Ua(), this.projectionDelta = Ua(), this.projectionDeltaWithTransform = Ua();
    }
    setAnimationOrigin(h, d = !1, m) {
      const p = this.snapshot, g = p ? p.latestValues : {}, v = { ...this.latestValues }, b = Ua();
      (!this.relativeParent || !this.relativeParent.options.layoutRoot) && (this.relativeTarget = this.relativeTargetOrigin = void 0), this.attemptToResolveRelativeTarget = !d;
      const _ = le(), T = p ? p.source : void 0, x = this.layout ? this.layout.source : void 0, A = T !== x, N = this.getStack(), D = !N || N.members.length <= 1, k = !!(A && !D && this.options.crossfade === !0 && !this.path.some(JC));
      this.animationProgress = 0;
      let G;
      const X = m?.interpolateProjection(h);
      this.mixTargetDelta = (q) => {
        const V = q / 1e3, $ = X?.(V);
        $ ? (b.x.translate = $.x, b.x.scale = Ut(h.x.scale, 1, V), b.x.origin = h.x.origin, b.x.originPoint = h.x.originPoint, b.y.translate = $.y, b.y.scale = Ut(h.y.scale, 1, V), b.y.origin = h.y.origin, b.y.originPoint = h.y.originPoint) : (Ob(b.x, h.x, V), Ob(b.y, h.y, V)), this.setTargetDelta(b), this.relativeTarget && this.relativeTargetOrigin && this.layout && this.relativeParent && this.relativeParent.layout && (Ru(_, this.layout.layoutBox, this.relativeParent.layout.layoutBox, this.options.layoutAnchor || void 0), QC(this.relativeTarget, this.relativeTargetOrigin, _, V), G && AC(this.relativeTarget, G) && (this.isProjectionDirty = !1), G || (G = le()), Mn(G, this.relativeTarget)), A && (this.animationValues = v, CC(v, g, this.latestValues, V, k, D)), $ && $.rotate !== void 0 && (this.animationValues || (this.animationValues = v), this.animationValues.pathRotation = $.rotate), this.root.scheduleUpdateProjection(), this.scheduleRender(), this.animationProgress = V;
      }, this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0);
    }
    startAnimation(h) {
      this.notifyListeners("animationStart"), this.currentAnimation?.stop(), this.resumingFrom?.currentAnimation?.stop(), this.pendingAnimation && (es(this.pendingAnimation), this.pendingAnimation = void 0), this.pendingAnimation = Bt.update(() => {
        yu.hasAnimatedSinceResize = !0, this.motionValue || (this.motionValue = Ba(0)), this.motionValue.jump(0, !1), this.currentAnimation = DC(this.motionValue, [0, 1e3], {
          ...h,
          velocity: 0,
          isSync: !0,
          onUpdate: (d) => {
            this.mixTargetDelta(d), h.onUpdate && h.onUpdate(d);
          },
          onComplete: () => {
            h.onComplete && h.onComplete(), this.completeAnimation();
          }
        }), vO(this.currentAnimation, this), this.resumingFrom && (this.resumingFrom.currentAnimation = this.currentAnimation), this.pendingAnimation = void 0;
      });
    }
    completeAnimation() {
      this.resumingFrom && (this.resumingFrom.currentAnimation = void 0, this.resumingFrom.preserveOpacity = void 0);
      const h = this.getStack();
      h && h.exitAnimationComplete(), this.resumingFrom = this.currentAnimation = this.animationValues = void 0, this.notifyListeners("animationComplete");
    }
    finishAnimation() {
      this.currentAnimation && (this.mixTargetDelta && this.mixTargetDelta(UC), this.currentAnimation.stop()), this.completeAnimation();
    }
    applyTransformsToTarget() {
      const h = this.getLead(), { targetWithTransforms: d, layout: m, latestValues: p } = h;
      let { target: g } = h;
      if (!(!d || !g || !m)) {
        if (this !== h && this.layout && m && V_(this.options.animationType, this.layout.layoutBox, m.layoutBox)) {
          g = this.target || le();
          const v = Ve(this.layout.layoutBox.x);
          g.x.min = h.target.x.min, g.x.max = g.x.min + v;
          const b = Ve(this.layout.layoutBox.y);
          g.y.min = h.target.y.min, g.y.max = g.y.min + b;
        }
        Mn(d, g), fu(d, p), el(this.projectionDeltaWithTransform, this.layoutCorrected, d, p);
      }
    }
    registerSharedNode(h, d) {
      this.sharedNodes.has(h) || this.sharedNodes.set(h, new LC()), this.sharedNodes.get(h).add(d);
      const p = d.options.initialPromotionConfig;
      d.promote({
        transition: p ? p.transition : void 0,
        preserveFollowOpacity: p && p.shouldPreserveFollowOpacity ? p.shouldPreserveFollowOpacity(d) : void 0
      });
    }
    isLead() {
      const h = this.getStack();
      return h ? h.lead === this : !0;
    }
    getLead() {
      const { layoutId: h } = this.options;
      return h ? this.getStack()?.lead || this : this;
    }
    getPrevLead() {
      const { layoutId: h } = this.options;
      return h ? this.getStack()?.prevLead : void 0;
    }
    getStack() {
      const { layoutId: h } = this.options;
      if (h)
        return this.root.sharedNodes.get(h);
    }
    promote({ needsReset: h, transition: d, preserveFollowOpacity: m } = {}) {
      const p = this.getStack();
      p && p.promote(this, m), h && (this.projectionDelta = void 0, this.needsReset = !0), d && this.setOptions({ transition: d });
    }
    relegate() {
      const h = this.getStack();
      return h ? h.relegate(this) : !1;
    }
    resetSkewAndRotation() {
      const { visualElement: h } = this.options;
      if (!h)
        return;
      let d = !1;
      const { latestValues: m } = h;
      if ((m.z || m.rotate || m.rotateX || m.rotateY || m.rotateZ || m.skewX || m.skewY) && (d = !0), !d)
        return;
      const p = {};
      m.z && Fh("z", h, p, this.animationValues);
      for (let g = 0; g < Kh.length; g++)
        Fh(`rotate${Kh[g]}`, h, p, this.animationValues), Fh(`skew${Kh[g]}`, h, p, this.animationValues);
      h.render();
      for (const g in p)
        h.setStaticValue(g, p[g]), this.animationValues && (this.animationValues[g] = p[g]);
      h.scheduleRender();
    }
    applyProjectionStyles(h, d) {
      if (!this.instance || this.isSVG)
        return;
      if (!this.isVisible) {
        h.visibility = "hidden";
        return;
      }
      const m = this.getTransformTemplate();
      if (this.needsReset) {
        this.needsReset = !1, h.visibility = "", h.opacity = "", h.pointerEvents = gu(d?.pointerEvents) || "", h.transform = m ? m(this.latestValues, "") : "none";
        return;
      }
      const p = this.getLead();
      if (!this.projectionDelta || !this.layout || !p.target) {
        this.options.layoutId && (h.opacity = this.latestValues.opacity !== void 0 ? this.latestValues.opacity : 1, h.pointerEvents = gu(d?.pointerEvents) || ""), this.hasProjected && !Ds(this.latestValues) && (h.transform = m ? m({}, "") : "none", this.hasProjected = !1);
        return;
      }
      h.visibility = "";
      const g = p.animationValues || p.latestValues;
      this.applyTransformsToTarget();
      let v = OC(this.projectionDeltaWithTransform, this.treeScale, g);
      m && (v = m(g, v)), h.transform = v;
      const { x: b, y: _ } = this.projectionDelta;
      h.transformOrigin = `${b.origin * 100}% ${_.origin * 100}% 0`, p.animationValues ? h.opacity = p === this ? g.opacity ?? this.latestValues.opacity ?? 1 : this.preserveOpacity ? this.latestValues.opacity : g.opacityExit : h.opacity = p === this ? g.opacity !== void 0 ? g.opacity : "" : g.opacityExit !== void 0 ? g.opacityExit : 0;
      for (const T in Ud) {
        if (g[T] === void 0)
          continue;
        const { correct: x, applyTo: A, isCSSVariable: N } = Ud[T], D = v === "none" ? g[T] : x(g[T], p);
        if (A) {
          const k = A.length;
          for (let G = 0; G < k; G++)
            h[A[G]] = D;
        } else
          N ? this.options.visualElement.renderState.vars[T] = D : h[T] = D;
      }
      this.options.layoutId && (h.pointerEvents = p === this ? gu(d?.pointerEvents) || "" : "none");
    }
    clearSnapshot() {
      this.resumeFrom = this.snapshot = void 0;
    }
    // Only run on root
    resetTree() {
      this.root.nodes.forEach((h) => h.currentAnimation?.stop()), this.root.nodes.forEach(Eb), this.root.sharedNodes.clear();
    }
  };
}
function BC(e) {
  e.updateLayout();
}
function ZC(e) {
  const i = e.resumeFrom?.snapshot || e.snapshot;
  if (e.isLead() && e.layout && i && e.hasListeners("didUpdate")) {
    const { layoutBox: a, measuredBox: r } = e.layout, { animationType: o } = e.options, c = i.source !== e.layout.source;
    if (o === "size")
      Fn((g) => {
        const v = c ? i.measuredBox[g] : i.layoutBox[g], b = Ve(v);
        v.min = a[g].min, v.max = v.min + b;
      });
    else if (o === "x" || o === "y") {
      const g = o === "x" ? "y" : "x";
      kd(c ? i.measuredBox[g] : i.layoutBox[g], a[g]);
    } else V_(o, i.layoutBox, a) && Fn((g) => {
      const v = c ? i.measuredBox[g] : i.layoutBox[g], b = Ve(a[g]);
      v.max = v.min + b, e.relativeTarget && !e.currentAnimation && (e.isProjectionDirty = !0, e.relativeTarget[g].max = e.relativeTarget[g].min + b);
    });
    const h = Ua();
    el(h, a, i.layoutBox);
    const d = Ua();
    c ? el(d, e.applyTransform(r, !0), i.measuredBox) : el(d, a, i.layoutBox);
    const m = !M_(h);
    let p = !1;
    if (!e.resumeFrom) {
      const g = e.getClosestProjectingParent();
      if (g && !g.resumeFrom) {
        const { snapshot: v, layout: b } = g;
        if (v && b) {
          const _ = e.options.layoutAnchor || void 0, T = le();
          Ru(T, i.layoutBox, v.layoutBox, _);
          const x = le();
          Ru(x, a, b.layoutBox, _), R_(T, x) || (p = !0), g.options.layoutRoot && (e.relativeTarget = x, e.relativeTargetOrigin = T, e.relativeParent = g);
        }
      }
    }
    e.notifyListeners("didUpdate", {
      layout: a,
      snapshot: i,
      delta: d,
      layoutDelta: h,
      hasLayoutChanged: m,
      hasRelativeLayoutChanged: p
    });
  } else if (e.isLead()) {
    const { onExitComplete: a } = e.options;
    a && a();
  }
  e.options.transition = void 0;
}
function HC(e) {
  e.parent && (e.isProjecting() || (e.isProjectionDirty = e.parent.isProjectionDirty), e.isSharedProjectionDirty || (e.isSharedProjectionDirty = !!(e.isProjectionDirty || e.parent.isProjectionDirty || e.parent.isSharedProjectionDirty)), e.isTransformDirty || (e.isTransformDirty = e.parent.isTransformDirty));
}
function PC(e) {
  e.isProjectionDirty = e.isSharedProjectionDirty = e.isTransformDirty = !1;
}
function $C(e) {
  e.clearSnapshot();
}
function Eb(e) {
  e.clearMeasurements();
}
function GC(e) {
  e.isLayoutDirty = !0, e.updateLayout();
}
function wb(e) {
  e.isLayoutDirty = !1;
}
function YC(e) {
  e.isAnimationBlocked && e.layout && !e.isLayoutDirty && (e.snapshot = e.layout, e.isLayoutDirty = !0);
}
function IC(e) {
  const { visualElement: i } = e.options;
  i && i.getProps().onBeforeLayoutMeasure && i.notify("BeforeLayoutMeasure"), e.resetTransform();
}
function Ab(e) {
  e.finishAnimation(), e.targetDelta = e.relativeTarget = e.target = void 0, e.isProjectionDirty = !0;
}
function qC(e) {
  e.resolveTargetDelta();
}
function XC(e) {
  e.calcProjection();
}
function KC(e) {
  e.resetSkewAndRotation();
}
function FC(e) {
  e.removeLeadSnapshot();
}
function Ob(e, i, a) {
  e.translate = Ut(i.translate, 0, a), e.scale = Ut(i.scale, 1, a), e.origin = i.origin, e.originPoint = i.originPoint;
}
function zb(e, i, a, r) {
  e.min = Ut(i.min, a.min, r), e.max = Ut(i.max, a.max, r);
}
function QC(e, i, a, r) {
  zb(e.x, i.x, a.x, r), zb(e.y, i.y, a.y, r);
}
function JC(e) {
  return e.animationValues && e.animationValues.opacityExit !== void 0;
}
const WC = {
  duration: 0.45,
  ease: [0.4, 0, 0.1, 1]
}, Cb = (e) => typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().includes(e), Mb = Cb("applewebkit/") && !Cb("chrome/") ? Math.round : Nn;
function Rb(e) {
  e.min = Mb(e.min), e.max = Mb(e.max);
}
function t2(e) {
  Rb(e.x), Rb(e.y);
}
function V_(e, i, a) {
  return e === "position" || e === "preserve-aspect" && !_C(bb(i), bb(a), 0.2);
}
function e2(e) {
  return e !== e.root && e.scroll?.wasRoot;
}
const n2 = j_({
  attachResizeListener: (e, i) => fl(e, "resize", i),
  measureScroll: () => ({
    x: document.documentElement.scrollLeft || document.body?.scrollLeft || 0,
    y: document.documentElement.scrollTop || document.body?.scrollTop || 0
  }),
  checkIsScrollRoot: () => !0
}), Qh = {
  current: void 0
}, L_ = j_({
  measureScroll: (e) => ({
    x: e.scrollLeft,
    y: e.scrollTop
  }),
  defaultParent: () => {
    if (!Qh.current) {
      const e = new n2({});
      e.mount(window), e.setOptions({ layoutScroll: !0 }), Qh.current = e;
    }
    return Qh.current;
  },
  resetTransform: (e, i) => {
    e.style.transform = i !== void 0 ? i : "none";
  },
  checkIsScrollRoot: (e) => window.getComputedStyle(e).position === "fixed"
}), U_ = B.createContext({
  transformPagePoint: (e) => e,
  isStatic: !1,
  reducedMotion: "never"
});
function i2(e = !0) {
  const i = B.useContext(tm);
  if (i === null)
    return [!0, null];
  const { isPresent: a, onExitComplete: r, register: o } = i, c = B.useId();
  B.useEffect(() => {
    if (e)
      return o(c);
  }, [e]);
  const h = B.useCallback(() => e && r && r(c), [c, r, e]);
  return !a && r ? [!1, h] : [!0];
}
const k_ = B.createContext({ strict: !1 }), Db = {
  animation: [
    "animate",
    "variants",
    "whileHover",
    "whileTap",
    "exit",
    "whileInView",
    "whileFocus",
    "whileDrag"
  ],
  exit: ["exit"],
  drag: ["drag", "dragControls"],
  focus: ["whileFocus"],
  hover: ["whileHover", "onHoverStart", "onHoverEnd"],
  tap: ["whileTap", "onTap", "onTapStart", "onTapCancel"],
  pan: ["onPan", "onPanStart", "onPanSessionStart", "onPanEnd"],
  inView: ["whileInView", "onViewportEnter", "onViewportLeave"],
  layout: ["layout", "layoutId"]
};
let Nb = !1;
function s2() {
  if (Nb)
    return;
  const e = {};
  for (const i in Db)
    e[i] = {
      isEnabled: (a) => Db[i].some((r) => !!a[r])
    };
  b_(e), Nb = !0;
}
function B_() {
  return s2(), sC();
}
function a2(e) {
  const i = B_();
  for (const a in e)
    i[a] = {
      ...i[a],
      ...e[a]
    };
  b_(i);
}
const Gu = /* @__PURE__ */ B.createContext({});
function r2(e, i) {
  if ($u(e)) {
    const { initial: a, animate: r } = e;
    return {
      initial: a === !1 || cl(a) ? a : void 0,
      animate: cl(r) ? r : void 0
    };
  }
  return e.inherit !== !1 ? i : {};
}
function l2(e) {
  const { initial: i, animate: a } = r2(e, B.useContext(Gu));
  return B.useMemo(() => ({ initial: i, animate: a }), [jb(i), jb(a)]);
}
function jb(e) {
  return Array.isArray(e) ? e.join(" ") : e;
}
const zm = () => ({
  style: {},
  transform: {},
  transformOrigin: {},
  vars: {}
});
function Z_(e, i, a) {
  for (const r in i)
    !Ae(i[r]) && !T_(r, a) && (e[r] = i[r]);
}
function o2({ transformTemplate: e }, i) {
  return B.useMemo(() => {
    const a = zm();
    return Tm(a, i, e), Object.assign({}, a.vars, a.style);
  }, [i]);
}
function u2(e, i) {
  const a = e.style || {}, r = {};
  return Z_(r, a, e), Object.assign(r, o2(e, i)), r;
}
function c2(e, i) {
  const a = {}, r = u2(e, i);
  return e.drag && e.dragListener !== !1 && (a.draggable = !1, r.userSelect = r.WebkitUserSelect = r.WebkitTouchCallout = "none", r.touchAction = e.drag === !0 ? "none" : `pan-${e.drag === "x" ? "y" : "x"}`), e.tabIndex === void 0 && (e.onTap || e.onTapStart || e.whileTap) && (a.tabIndex = 0), a.style = r, a;
}
const H_ = () => ({
  ...zm(),
  attrs: {}
});
function f2(e, i, a, r) {
  const o = B.useMemo(() => {
    const c = H_();
    return o_(c, i, E_(r), e.transformTemplate, e.style), {
      ...c.attrs,
      style: { ...c.style }
    };
  }, [i]);
  if (e.style) {
    const c = {};
    Z_(c, e.style, e), o.style = { ...c, ...o.style };
  }
  return o;
}
const h2 = /* @__PURE__ */ new Set([
  "animate",
  "exit",
  "variants",
  "initial",
  "style",
  "values",
  "variants",
  "transition",
  "transformTemplate",
  "custom",
  "inherit",
  "onBeforeLayoutMeasure",
  "onAnimationStart",
  "onAnimationComplete",
  "onUpdate",
  "onDragStart",
  "onDrag",
  "onDragEnd",
  "onMeasureDragConstraints",
  "onDirectionLock",
  "onDragTransitionEnd",
  "_dragX",
  "_dragY",
  "onHoverStart",
  "onHoverEnd",
  "onViewportEnter",
  "onViewportLeave",
  "globalTapTarget",
  "propagate",
  "ignoreStrict",
  "viewport"
]);
function Du(e) {
  return e.startsWith("while") || e.startsWith("drag") && e !== "draggable" || e.startsWith("layout") || e.startsWith("onTap") || e.startsWith("onPan") || e.startsWith("onLayout") || h2.has(e);
}
function d2(e, i) {
  return e.startsWith("on") ? !Du(e) : i?.(e) ?? !Du(e);
}
function m2(e, i, a, r) {
  const o = {};
  for (const c in e)
    c === "values" && typeof e.values == "object" || Ae(e[c]) || (d2(c, r) || a === !0 && Du(c) || !i && !Du(c) || // If trying to use native HTML drag events, forward drag listeners
    e.draggable && c.startsWith("onDrag")) && (o[c] = e[c]);
  return o;
}
const p2 = [
  "animate",
  "circle",
  "defs",
  "desc",
  "ellipse",
  "g",
  "image",
  "line",
  "filter",
  "marker",
  "mask",
  "metadata",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "rect",
  "stop",
  "switch",
  "symbol",
  "svg",
  "text",
  "tspan",
  "use",
  "view"
];
function Cm(e) {
  return (
    /**
     * If it's not a string, it's a custom React component. Currently we only support
     * HTML custom React components.
     */
    typeof e != "string" || /**
     * If it contains a dash, the element is a custom HTML webcomponent.
     */
    e.includes("-") ? !1 : (
      /**
       * If it's in our list of lowercase SVG tags, it's an SVG component
       */
      !!(p2.indexOf(e) > -1 || /**
       * If it contains a capital letter, it's an SVG component
       */
      /[A-Z]/u.test(e))
    )
  );
}
function g2(e, i, a, { latestValues: r }, o, c = !1, h, d) {
  const p = (h ?? Cm(e) ? f2 : c2)(i, r, o, e), g = m2(i, typeof e == "string", c, d), v = e !== B.Fragment ? { ...g, ...p, ref: a } : {}, { children: b } = i, _ = B.useMemo(() => Ae(b) ? b.get() : b, [b]);
  return B.createElement(e, {
    ...v,
    children: _
  });
}
function y2({ scrapeMotionValuesFromProps: e, createRenderState: i }, a, r, o) {
  return {
    latestValues: v2(a, r, o, e),
    renderState: i()
  };
}
function v2(e, i, a, r) {
  const o = {}, c = r(e, {});
  for (const b in c)
    o[b] = gu(c[b]);
  let { initial: h, animate: d } = e;
  const m = $u(e), p = y_(e);
  i && p && !m && e.inherit !== !1 && (h === void 0 && (h = i.initial), d === void 0 && (d = i.animate));
  let g = a ? a.initial === !1 : !1;
  g = g || h === !1;
  const v = g ? d : h;
  if (v && typeof v != "boolean" && !Pu(v)) {
    const b = Array.isArray(v) ? v : [v];
    for (let _ = 0; _ < b.length; _++) {
      const T = vm(e, b[_]);
      if (T) {
        const { transitionEnd: x, transition: A, ...N } = T;
        for (const D in N) {
          let k = N[D];
          if (Array.isArray(k)) {
            const G = g ? k.length - 1 : 0;
            k = k[G];
          }
          k !== null && (o[D] = k);
        }
        for (const D in x)
          o[D] = x[D];
      }
    }
  }
  return o;
}
const P_ = (e) => (i, a) => {
  const r = B.useContext(Gu), o = B.useContext(tm), c = () => y2(e, i, r, o);
  return a ? c() : dA(c);
}, b2 = /* @__PURE__ */ P_({
  scrapeMotionValuesFromProps: Om,
  createRenderState: zm
}), S2 = /* @__PURE__ */ P_({
  scrapeMotionValuesFromProps: w_,
  createRenderState: H_
}), _2 = /* @__PURE__ */ Symbol.for("motionComponentSymbol");
function T2(e, i, a) {
  const r = B.useRef(a);
  B.useInsertionEffect(() => {
    r.current = a;
  });
  const o = B.useRef(null);
  return B.useCallback((c) => {
    c && e.onMount?.(c), i && (c ? i.mount(c) : i.unmount());
    const h = r.current;
    if (typeof h == "function")
      if (c) {
        const d = h(c);
        typeof d == "function" && (o.current = d);
      } else o.current ? (o.current(), o.current = null) : h(c);
    else h && (h.current = c);
  }, [i]);
}
const $_ = B.createContext({});
function ja(e) {
  return e && typeof e == "object" && Object.prototype.hasOwnProperty.call(e, "current");
}
function x2(e, i, a, r, o, c) {
  const { visualElement: h } = B.useContext(Gu), d = B.useContext(k_), m = B.useContext(tm), p = B.useContext(U_), g = p.reducedMotion, v = p.skipAnimations, b = B.useRef(null), _ = B.useRef(!1);
  r = r || d.renderer, !b.current && r && (b.current = r(e, {
    visualState: i,
    parent: h,
    props: a,
    presenceContext: m,
    blockInitialAnimation: m ? m.initial === !1 : !1,
    reducedMotionConfig: g,
    skipAnimations: v,
    isSVG: c
  }), _.current && b.current && (b.current.manuallyAnimateOnMount = !0));
  const T = b.current, x = B.useContext($_);
  T && !T.projection && o && (T.type === "html" || T.type === "svg") && E2(b.current, a, o, x);
  const A = B.useRef(!1);
  B.useInsertionEffect(() => {
    T && A.current && T.update(a, m);
  });
  const N = a[i_], D = B.useRef(!!N && typeof window < "u" && !window.MotionHandoffIsComplete?.(N) && window.MotionHasOptimisedAnimation?.(N));
  return pA(() => {
    _.current = !0, T && (A.current = !0, window.MotionIsMounted = !0, T.updateFeatures(), T.scheduleRenderMicrotask(), D.current && T.animationState && T.animationState.animateChanges());
  }), B.useEffect(() => {
    T && (!D.current && T.animationState && T.animationState.animateChanges(), D.current && (queueMicrotask(() => {
      window.MotionHandoffMarkAsComplete?.(N);
    }), D.current = !1), T.enteringChildren = void 0);
  }), T;
}
function E2(e, i, a, r) {
  const { layoutId: o, layout: c, drag: h, dragConstraints: d, layoutScroll: m, layoutRoot: p, layoutAnchor: g, layoutCrossfade: v } = i;
  e.projection = new a(e.latestValues, i["data-framer-portal-id"] ? void 0 : G_(e.parent)), e.projection.setOptions({
    layoutId: o,
    layout: c,
    alwaysMeasureLayout: !!h || d && ja(d),
    visualElement: e,
    /**
     * TODO: Update options in an effect. This could be tricky as it'll be too late
     * to update by the time layout animations run.
     * We also need to fix this safeToRemove by linking it up to the one returned by usePresence,
     * ensuring it gets called if there's no potential layout animations.
     *
     */
    animationType: typeof c == "string" ? c : "both",
    initialPromotionConfig: r,
    crossfade: v,
    layoutScroll: m,
    layoutRoot: p,
    layoutAnchor: g
  });
}
function G_(e) {
  if (e)
    return e.options.allowProjection !== !1 ? e.projection : G_(e.parent);
}
function Jh(e, { forwardMotionProps: i = !1, type: a } = {}, r, o) {
  r && a2(r);
  const c = a ? a === "svg" : Cm(e), h = c ? S2 : b2;
  function d(p, g) {
    let v;
    const b = {
      ...B.useContext(U_),
      ...p,
      layoutId: w2(p)
    }, { isStatic: _, isValidProp: T } = b, x = l2(p), A = h(p, _);
    if (!_ && typeof window < "u") {
      A2();
      const N = O2(b);
      v = N.MeasureLayout, x.visualElement = x2(e, A, b, o, N.ProjectionNode, c);
    }
    return w.jsxs(Gu.Provider, { value: x, children: [v && x.visualElement ? w.jsx(v, { visualElement: x.visualElement, ...b }) : null, g2(e, p, T2(A, x.visualElement, g), A, _, i, c, T)] });
  }
  d.displayName = `motion.${typeof e == "string" ? e : `create(${e.displayName ?? e.name ?? ""})`}`;
  const m = B.forwardRef(d);
  return m[_2] = e, m;
}
function w2({ layoutId: e }) {
  const i = B.useContext(d1).id;
  return i && e !== void 0 ? i + "-" + e : e;
}
function A2(e, i) {
  B.useContext(k_).strict;
}
function O2(e) {
  const i = B_(), { drag: a, layout: r } = i;
  if (!a && !r)
    return {};
  const o = { ...a, ...r };
  return {
    MeasureLayout: a?.isEnabled(e) || r?.isEnabled(e) ? o.MeasureLayout : void 0,
    ProjectionNode: o.ProjectionNode
  };
}
function z2(e, i) {
  if (typeof Proxy > "u")
    return Jh;
  const a = /* @__PURE__ */ new Map(), r = (c, h) => Jh(c, h, e, i), o = (c, h) => r(c, h);
  return new Proxy(o, {
    /**
     * Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
     * The prop name is passed through as `key` and we can use that to generate a `motion`
     * DOM component with that name.
     */
    get: (c, h) => h === "create" ? r : (a.has(h) || a.set(h, Jh(h, void 0, e, i)), a.get(h))
  });
}
const C2 = (e, i) => i.isSVG ?? Cm(e) ? new cC(i) : new oC(i, {
  allowProjection: e !== B.Fragment
});
class M2 extends as {
  /**
   * We dynamically generate the AnimationState manager as it contains a reference
   * to the underlying animation library. We only want to load that if we load this,
   * so people can optionally code split it out using the `m` component.
   */
  constructor(i) {
    super(i), i.animationState || (i.animationState = pC(i));
  }
  updateAnimationControlsSubscription() {
    const { animate: i } = this.node.getProps();
    Pu(i) && (this.unmountControls = i.subscribe(this.node));
  }
  /**
   * Subscribe any provided AnimationControls to the component's VisualElement
   */
  mount() {
    this.updateAnimationControlsSubscription();
  }
  update() {
    const { animate: i } = this.node.getProps(), { animate: a } = this.node.prevProps || {};
    i !== a && this.updateAnimationControlsSubscription();
  }
  unmount() {
    this.node.animationState.reset(), this.unmountControls?.();
  }
}
let R2 = 0;
class D2 extends as {
  constructor() {
    super(...arguments), this.id = R2++, this.isExitComplete = !1;
  }
  update() {
    if (!this.node.presenceContext)
      return;
    const { isPresent: i, onExitComplete: a } = this.node.presenceContext, { isPresent: r } = this.node.prevPresenceContext || {};
    if (!this.node.animationState || i === r)
      return;
    if (i && r === !1) {
      if (this.isExitComplete) {
        const { initial: c, custom: h } = this.node.getProps();
        if (typeof c == "string" || typeof c == "object" && c !== null && !Array.isArray(c)) {
          const d = Us(this.node, c, h);
          if (d) {
            const { transition: m, transitionEnd: p, ...g } = d;
            for (const v in g)
              this.node.getValue(v)?.jump(g[v]);
          }
        }
        this.node.animationState.reset(), this.node.animationState.animateChanges();
      } else
        this.node.animationState.setActive("exit", !1);
      this.isExitComplete = !1;
      return;
    }
    const o = this.node.animationState.setActive("exit", !i);
    a && !i && o.then(() => {
      this.isExitComplete = !0, a(this.id);
    });
  }
  mount() {
    const { register: i, onExitComplete: a } = this.node.presenceContext || {};
    a && a(this.id), i && (this.unmount = i(this.id));
  }
  unmount() {
  }
}
const N2 = {
  animation: {
    Feature: M2
  },
  exit: {
    Feature: D2
  }
};
function vl(e) {
  return {
    point: {
      x: e.pageX,
      y: e.pageY
    }
  };
}
const j2 = (e) => (i) => Em(i) && e(i, vl(i));
function nl(e, i, a, r) {
  return fl(e, i, j2(a), r);
}
const Y_ = ({ current: e }) => e ? e.ownerDocument.defaultView : null, Vb = (e, i) => Math.abs(e - i);
function V2(e, i) {
  const a = Vb(e.x, i.x), r = Vb(e.y, i.y);
  return Math.sqrt(a ** 2 + r ** 2);
}
const Lb = /* @__PURE__ */ new Set(["auto", "scroll"]);
class I_ {
  constructor(i, a, { transformPagePoint: r, contextWindow: o = window, dragSnapToOrigin: c = !1, distanceThreshold: h = 3, element: d } = {}) {
    if (this.startEvent = null, this.lastMoveEvent = null, this.lastMoveEventInfo = null, this.lastRawMoveEventInfo = null, this.handlers = {}, this.contextWindow = window, this.scrollPositions = /* @__PURE__ */ new Map(), this.removeScrollListeners = null, this.onElementScroll = (T) => {
      this.handleScroll(T.target);
    }, this.onWindowScroll = () => {
      this.handleScroll(window);
    }, this.updatePoint = () => {
      if (!(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      this.lastRawMoveEventInfo && (this.lastMoveEventInfo = tu(this.lastRawMoveEventInfo, this.transformPagePoint));
      const T = Wh(this.lastMoveEventInfo, this.history), x = this.startEvent !== null, A = V2(T.offset, { x: 0, y: 0 }) >= this.distanceThreshold;
      if (!x && !A)
        return;
      const { point: N } = T, { timestamp: D } = oe;
      this.history.push({ ...N, timestamp: D });
      const { onStart: k, onMove: G } = this.handlers;
      x || (k && k(this.lastMoveEvent, T), this.startEvent = this.lastMoveEvent), G && G(this.lastMoveEvent, T);
    }, this.handlePointerMove = (T, x) => {
      this.lastMoveEvent = T, this.lastRawMoveEventInfo = x, this.lastMoveEventInfo = tu(x, this.transformPagePoint), Bt.update(this.updatePoint, !0);
    }, this.handlePointerUp = (T, x) => {
      this.end();
      const { onEnd: A, onSessionEnd: N, resumeAnimation: D } = this.handlers;
      if ((this.dragSnapToOrigin || !this.startEvent) && D && D(), !(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      const k = Wh(T.type === "pointercancel" ? this.lastMoveEventInfo : tu(x, this.transformPagePoint), this.history);
      this.startEvent && A && A(T, k), N && N(T, k);
    }, !Em(i))
      return;
    this.dragSnapToOrigin = c, this.handlers = a, this.transformPagePoint = r, this.distanceThreshold = h, this.contextWindow = o || window;
    const m = vl(i), p = tu(m, this.transformPagePoint), { point: g } = p, { timestamp: v } = oe;
    this.history = [{ ...g, timestamp: v }];
    const { onSessionStart: b } = a;
    b && b(i, Wh(p, this.history));
    const _ = { passive: !0, capture: !0 };
    this.removeListeners = pl(nl(this.contextWindow, "pointermove", this.handlePointerMove, _), nl(this.contextWindow, "pointerup", this.handlePointerUp, _), nl(this.contextWindow, "pointercancel", this.handlePointerUp, _)), d && this.startScrollTracking(d);
  }
  /**
   * Start tracking scroll on ancestors and window.
   */
  startScrollTracking(i) {
    let a = i.parentElement;
    for (; a; ) {
      const r = getComputedStyle(a);
      (Lb.has(r.overflowX) || Lb.has(r.overflowY)) && this.scrollPositions.set(a, {
        x: a.scrollLeft,
        y: a.scrollTop
      }), a = a.parentElement;
    }
    this.scrollPositions.set(window, {
      x: window.scrollX,
      y: window.scrollY
    }), window.addEventListener("scroll", this.onElementScroll, {
      capture: !0
    }), window.addEventListener("scroll", this.onWindowScroll), this.removeScrollListeners = () => {
      window.removeEventListener("scroll", this.onElementScroll, {
        capture: !0
      }), window.removeEventListener("scroll", this.onWindowScroll);
    };
  }
  /**
   * Handle scroll compensation during drag.
   *
   * For element scroll: adjusts history origin since pageX/pageY doesn't change.
   * For window scroll: adjusts lastMoveEventInfo since pageX/pageY would change.
   */
  handleScroll(i) {
    const a = this.scrollPositions.get(i);
    if (!a)
      return;
    const r = i === window, o = r ? { x: window.scrollX, y: window.scrollY } : {
      x: i.scrollLeft,
      y: i.scrollTop
    }, c = { x: o.x - a.x, y: o.y - a.y };
    c.x === 0 && c.y === 0 || (r ? this.lastMoveEventInfo && (this.lastMoveEventInfo.point.x += c.x, this.lastMoveEventInfo.point.y += c.y) : this.history.length > 0 && (this.history[0].x -= c.x, this.history[0].y -= c.y), this.scrollPositions.set(i, o), Bt.update(this.updatePoint, !0));
  }
  updateHandlers(i) {
    this.handlers = i;
  }
  end() {
    this.removeListeners && this.removeListeners(), this.removeScrollListeners && this.removeScrollListeners(), this.scrollPositions.clear(), es(this.updatePoint);
  }
}
function tu(e, i) {
  return i ? { point: i(e.point) } : e;
}
function Ub(e, i) {
  return { x: e.x - i.x, y: e.y - i.y };
}
function Wh({ point: e }, i) {
  return {
    point: e,
    delta: Ub(e, q_(i)),
    offset: Ub(e, L2(i)),
    velocity: U2(i, 0.1)
  };
}
function L2(e) {
  return e[0];
}
function q_(e) {
  return e[e.length - 1];
}
function U2(e, i) {
  if (e.length < 2)
    return { x: 0, y: 0 };
  let a = e.length - 1, r = null;
  const o = q_(e);
  for (; a >= 0 && (r = e[a], !(o.timestamp - r.timestamp > /* @__PURE__ */ bn(i))); )
    a--;
  if (!r)
    return { x: 0, y: 0 };
  r === e[0] && e.length > 2 && o.timestamp - r.timestamp > /* @__PURE__ */ bn(i) * 2 && (r = e[1]);
  const c = /* @__PURE__ */ rn(o.timestamp - r.timestamp);
  if (c === 0)
    return { x: 0, y: 0 };
  const h = {
    x: (o.x - r.x) / c,
    y: (o.y - r.y) / c
  };
  return h.x === 1 / 0 && (h.x = 0), h.y === 1 / 0 && (h.y = 0), h;
}
function k2(e, { min: i, max: a }, r) {
  return i !== void 0 && e < i ? e = r ? Ut(i, e, r.min) : Math.max(e, i) : a !== void 0 && e > a && (e = r ? Ut(a, e, r.max) : Math.min(e, a)), e;
}
function kb(e, i, a) {
  return {
    min: i !== void 0 ? e.min + i : void 0,
    max: a !== void 0 ? e.max + a - (e.max - e.min) : void 0
  };
}
function B2(e, { top: i, left: a, bottom: r, right: o }) {
  return {
    x: kb(e.x, a, o),
    y: kb(e.y, i, r)
  };
}
function Bb(e, i) {
  let a = i.min - e.min, r = i.max - e.max;
  return i.max - i.min < e.max - e.min && ([a, r] = [r, a]), { min: a, max: r };
}
function Z2(e, i) {
  return {
    x: Bb(e.x, i.x),
    y: Bb(e.y, i.y)
  };
}
function H2(e, i) {
  let a = 0.5;
  const r = Ve(e), o = Ve(i);
  return o > r ? a = /* @__PURE__ */ ll(i.min, i.max - r, e.min) : r > o && (a = /* @__PURE__ */ ll(e.min, e.max - o, i.min)), jn(0, 1, a);
}
function P2(e, i) {
  const a = {};
  return i.min !== void 0 && (a.min = i.min - e.min), i.max !== void 0 && (a.max = i.max - e.min), a;
}
const Bd = 0.35;
function $2(e = Bd) {
  return e === !1 ? e = 0 : e === !0 && (e = Bd), {
    x: Zb(e, "left", "right"),
    y: Zb(e, "top", "bottom")
  };
}
function Zb(e, i, a) {
  return {
    min: Hb(e, i),
    max: Hb(e, a)
  };
}
function Hb(e, i) {
  return typeof e == "number" ? e : e[i] || 0;
}
const G2 = /* @__PURE__ */ new WeakMap();
class Y2 {
  constructor(i) {
    this.openDragLock = null, this.isDragging = !1, this.currentDirection = null, this.originPoint = { x: 0, y: 0 }, this.constraints = !1, this.hasMutatedConstraints = !1, this.elastic = le(), this.latestPointerEvent = null, this.latestPanInfo = null, this.visualElement = i;
  }
  start(i, { snapToCursor: a = !1, distanceThreshold: r } = {}) {
    const { presenceContext: o } = this.visualElement;
    if (o && o.isPresent === !1)
      return;
    const c = (v) => {
      a && this.snapToCursor(vl(v).point), this.stopAnimation();
    }, h = (v, b) => {
      const { drag: _, dragPropagation: T, onDragStart: x } = this.getProps();
      if (_ && !T && (this.openDragLock && this.openDragLock(), this.openDragLock = Uz(_), !this.openDragLock))
        return;
      this.latestPointerEvent = v, this.latestPanInfo = b, this.isDragging = !0, this.currentDirection = null, this.resolveConstraints(), this.visualElement.projection && (this.visualElement.projection.isAnimationBlocked = !0, this.visualElement.projection.target = void 0), Fn((N) => {
        let D = this.getAxisMotionValue(N).get() || 0;
        if (Jn.test(D)) {
          const { projection: k } = this.visualElement;
          if (k && k.layout) {
            const G = k.layout.layoutBox[N];
            G && (D = Ve(G) * (parseFloat(D) / 100));
          }
        }
        this.originPoint[N] = D;
      }), x && Bt.update(() => x(v, b), !1, !0), Dd(this.visualElement, "transform");
      const { animationState: A } = this.visualElement;
      A && A.setActive("whileDrag", !0);
    }, d = (v, b) => {
      this.latestPointerEvent = v, this.latestPanInfo = b;
      const { dragPropagation: _, dragDirectionLock: T, onDirectionLock: x, onDrag: A } = this.getProps();
      if (!_ && !this.openDragLock)
        return;
      const { offset: N } = b;
      if (T && this.currentDirection === null) {
        this.currentDirection = q2(N), this.currentDirection !== null && x && x(this.currentDirection);
        return;
      }
      this.updateAxis("x", b.point, N), this.updateAxis("y", b.point, N), this.visualElement.render(), A && Bt.update(() => A(v, b), !1, !0);
    }, m = (v, b) => {
      this.latestPointerEvent = v, this.latestPanInfo = b, this.stop(v, b), this.latestPointerEvent = null, this.latestPanInfo = null;
    }, p = () => {
      const { dragSnapToOrigin: v } = this.getProps();
      (v || this.constraints) && this.startAnimation({ x: 0, y: 0 });
    }, { dragSnapToOrigin: g } = this.getProps();
    this.panSession = new I_(i, {
      onSessionStart: c,
      onStart: h,
      onMove: d,
      onSessionEnd: m,
      resumeAnimation: p
    }, {
      transformPagePoint: this.visualElement.getTransformPagePoint(),
      dragSnapToOrigin: g,
      distanceThreshold: r,
      contextWindow: Y_(this.visualElement),
      element: this.visualElement.current
    });
  }
  /**
   * @internal
   */
  stop(i, a) {
    const r = i || this.latestPointerEvent, o = a || this.latestPanInfo, c = this.isDragging;
    if (this.cancel(), !c || !o || !r)
      return;
    const { velocity: h } = o;
    this.startAnimation(h);
    const { onDragEnd: d } = this.getProps();
    d && Bt.postRender(() => d(r, o));
  }
  /**
   * @internal
   */
  cancel() {
    this.isDragging = !1;
    const { projection: i, animationState: a } = this.visualElement;
    i && (i.isAnimationBlocked = !1), this.endPanSession();
    const { dragPropagation: r } = this.getProps();
    !r && this.openDragLock && (this.openDragLock(), this.openDragLock = null), a && a.setActive("whileDrag", !1);
  }
  /**
   * Clean up the pan session without modifying other drag state.
   * This is used during unmount to ensure event listeners are removed
   * without affecting projection animations or drag locks.
   * @internal
   */
  endPanSession() {
    this.panSession && this.panSession.end(), this.panSession = void 0;
  }
  updateAxis(i, a, r) {
    const { drag: o } = this.getProps();
    if (!r || !eu(i, o, this.currentDirection))
      return;
    const c = this.getAxisMotionValue(i);
    let h = this.originPoint[i] + r[i];
    this.constraints && this.constraints[i] && (h = k2(h, this.constraints[i], this.elastic[i])), c.set(h);
  }
  resolveConstraints() {
    const { dragConstraints: i, dragElastic: a } = this.getProps(), r = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(!1) : this.visualElement.projection?.layout, o = this.constraints;
    i && ja(i) ? this.constraints || (this.constraints = this.resolveRefConstraints()) : i && r ? this.constraints = B2(r.layoutBox, i) : this.constraints = !1, this.elastic = $2(a), o !== this.constraints && !ja(i) && r && this.constraints && !this.hasMutatedConstraints && Fn((c) => {
      this.constraints !== !1 && this.getAxisMotionValue(c) && (this.constraints[c] = P2(r.layoutBox[c], this.constraints[c]));
    });
  }
  resolveRefConstraints() {
    const { dragConstraints: i, onMeasureDragConstraints: a } = this.getProps();
    if (!i || !ja(i))
      return !1;
    const r = i.current, { projection: o } = this.visualElement;
    if (!o || !o.layout)
      return !1;
    o.root && (o.root.scroll = void 0, o.root.updateScroll());
    const c = Lz(r, o.root, this.visualElement.getTransformPagePoint());
    let h = Z2(o.layout.layoutBox, c);
    if (a) {
      const d = a(Nz(h));
      this.hasMutatedConstraints = !!d, d && (h = u_(d));
    }
    return h;
  }
  startAnimation(i) {
    const { drag: a, dragMomentum: r, dragElastic: o, dragTransition: c, dragSnapToOrigin: h, onDragTransitionEnd: d } = this.getProps(), m = this.constraints || {}, p = Fn((g) => {
      if (!eu(g, a, this.currentDirection))
        return;
      let v = m && m[g] || {};
      (h === !0 || h === g) && (v = { min: 0, max: 0 });
      const b = o ? 200 : 1e6, _ = o ? 40 : 1e7, T = {
        type: "inertia",
        velocity: r ? i[g] : 0,
        bounceStiffness: b,
        bounceDamping: _,
        timeConstant: 750,
        restDelta: 1,
        restSpeed: 10,
        ...c,
        ...v
      };
      return this.startAxisValueAnimation(g, T);
    });
    return Promise.all(p).then(d);
  }
  startAxisValueAnimation(i, a) {
    const r = this.getAxisMotionValue(i);
    return Dd(this.visualElement, i), r.start(ym(i, r, 0, a, this.visualElement, !1));
  }
  stopAnimation() {
    Fn((i) => this.getAxisMotionValue(i).stop());
  }
  /**
   * Drag works differently depending on which props are provided.
   *
   * - If _dragX and _dragY are provided, we output the gesture delta directly to those motion values.
   * - Otherwise, we apply the delta to the x/y motion values.
   */
  getAxisMotionValue(i) {
    const a = `_drag${i.toUpperCase()}`, o = this.visualElement.getProps()[a];
    return o || this.visualElement.getValue(i, this.visualElement.latestValues[i] ?? 0);
  }
  snapToCursor(i) {
    Fn((a) => {
      const { drag: r } = this.getProps();
      if (!eu(a, r, this.currentDirection))
        return;
      const { projection: o } = this.visualElement, c = this.getAxisMotionValue(a);
      if (o && o.layout) {
        const { min: h, max: d } = o.layout.layoutBox[a], m = c.get() || 0;
        c.set(i[a] - Ut(h, d, 0.5) + m);
      }
    });
  }
  /**
   * When the viewport resizes we want to check if the measured constraints
   * have changed and, if so, reposition the element within those new constraints
   * relative to where it was before the resize.
   */
  scalePositionWithinConstraints() {
    if (!this.visualElement.current)
      return;
    const { drag: i, dragConstraints: a } = this.getProps(), { projection: r } = this.visualElement;
    if (!ja(a) || !r || !this.constraints)
      return;
    this.stopAnimation();
    const o = { x: 0, y: 0 };
    Fn((h) => {
      const d = this.getAxisMotionValue(h);
      if (d && this.constraints !== !1) {
        const m = d.get();
        o[h] = H2({ min: m, max: m }, this.constraints[h]);
      }
    });
    const { transformTemplate: c } = this.visualElement.getProps();
    this.visualElement.current.style.transform = c ? c({}, "") : "none", r.root && r.root.updateScroll(), r.updateLayout(), this.constraints = !1, this.resolveConstraints(), Fn((h) => {
      if (!eu(h, i, null))
        return;
      const d = this.getAxisMotionValue(h), { min: m, max: p } = this.constraints[h];
      d.set(Ut(m, p, o[h]));
    }), this.visualElement.render();
  }
  addListeners() {
    if (!this.visualElement.current)
      return;
    G2.set(this.visualElement, this);
    const i = this.visualElement.current, a = nl(i, "pointerdown", (p) => {
      const { drag: g, dragListener: v = !0 } = this.getProps(), b = p.target, _ = b !== i && $z(b);
      g && v && !_ && this.start(p);
    });
    let r;
    const o = () => {
      const { dragConstraints: p } = this.getProps();
      ja(p) && p.current && (this.constraints = this.resolveRefConstraints(), r || (r = I2(i, p.current, () => this.scalePositionWithinConstraints())));
    }, { projection: c } = this.visualElement, h = c.addEventListener("measure", o);
    c && !c.layout && (c.root && c.root.updateScroll(), c.updateLayout()), Bt.read(o);
    const d = fl(window, "resize", () => this.scalePositionWithinConstraints()), m = c.addEventListener("didUpdate", (({ delta: p, hasLayoutChanged: g }) => {
      this.isDragging && g && (Fn((v) => {
        const b = this.getAxisMotionValue(v);
        b && (this.originPoint[v] += p[v].translate, b.set(b.get() + p[v].translate));
      }), this.visualElement.render());
    }));
    return () => {
      d(), a(), h(), m && m(), r && r();
    };
  }
  getProps() {
    const i = this.visualElement.getProps(), { drag: a = !1, dragDirectionLock: r = !1, dragPropagation: o = !1, dragConstraints: c = !1, dragElastic: h = Bd, dragMomentum: d = !0 } = i;
    return {
      ...i,
      drag: a,
      dragDirectionLock: r,
      dragPropagation: o,
      dragConstraints: c,
      dragElastic: h,
      dragMomentum: d
    };
  }
}
function Pb(e) {
  let i = !0;
  return () => {
    if (i) {
      i = !1;
      return;
    }
    e();
  };
}
function I2(e, i, a) {
  const r = ib(e, Pb(a)), o = ib(i, Pb(a));
  return () => {
    r(), o();
  };
}
function eu(e, i, a) {
  return (i === !0 || i === e) && (a === null || a === e);
}
function q2(e, i = 10) {
  let a = null;
  return Math.abs(e.y) > i ? a = "y" : Math.abs(e.x) > i && (a = "x"), a;
}
class X2 extends as {
  constructor(i) {
    super(i), this.removeGroupControls = Nn, this.removeListeners = Nn, this.controls = new Y2(i);
  }
  mount() {
    const { dragControls: i } = this.node.getProps();
    i && (this.removeGroupControls = i.subscribe(this.controls)), this.removeListeners = this.controls.addListeners() || Nn;
  }
  update() {
    const { dragControls: i } = this.node.getProps(), { dragControls: a } = this.node.prevProps || {};
    i !== a && (this.removeGroupControls(), i && (this.removeGroupControls = i.subscribe(this.controls)));
  }
  unmount() {
    this.removeGroupControls(), this.removeListeners(), this.controls.isDragging || this.controls.endPanSession();
  }
}
const td = (e) => (i, a) => {
  e && Bt.update(() => e(i, a), !1, !0);
};
class K2 extends as {
  constructor() {
    super(...arguments), this.removePointerDownListener = Nn;
  }
  onPointerDown(i) {
    this.session = new I_(i, this.createPanHandlers(), {
      transformPagePoint: this.node.getTransformPagePoint(),
      contextWindow: Y_(this.node)
    });
  }
  createPanHandlers() {
    const { onPanSessionStart: i, onPanStart: a, onPan: r, onPanEnd: o } = this.node.getProps();
    return {
      onSessionStart: td(i),
      onStart: td(a),
      onMove: td(r),
      onEnd: (c, h) => {
        delete this.session, o && Bt.postRender(() => o(c, h));
      }
    };
  }
  mount() {
    this.removePointerDownListener = nl(this.node.current, "pointerdown", (i) => this.onPointerDown(i));
  }
  update() {
    this.session && this.session.updateHandlers(this.createPanHandlers());
  }
  unmount() {
    this.removePointerDownListener(), this.session && this.session.end();
  }
}
let ed = !1;
class F2 extends B.Component {
  /**
   * This only mounts projection nodes for components that
   * need measuring, we might want to do it for all components
   * in order to incorporate transforms
   */
  componentDidMount() {
    const { visualElement: i, layoutGroup: a, switchLayoutGroup: r, layoutId: o } = this.props, { projection: c } = i;
    c && (a.group && a.group.add(c), r && r.register && o && r.register(c), ed && c.root.didUpdate(), c.addEventListener("animationComplete", () => {
      this.safeToRemove();
    }), c.setOptions({
      ...c.options,
      layoutDependency: this.props.layoutDependency,
      onExitComplete: () => this.safeToRemove()
    })), yu.hasEverUpdated = !0;
  }
  getSnapshotBeforeUpdate(i) {
    const { layoutDependency: a, visualElement: r, drag: o, isPresent: c } = this.props, { projection: h } = r;
    return h && (h.isPresent = c, i.layoutDependency !== a && h.setOptions({
      ...h.options,
      layoutDependency: a
    }), ed = !0, o || i.layoutDependency !== a || a === void 0 || i.isPresent !== c ? h.willUpdate() : this.safeToRemove(), i.isPresent !== c && (c ? h.promote() : h.relegate() || Bt.postRender(() => {
      const d = h.getStack();
      (!d || !d.members.length) && this.safeToRemove();
    }))), null;
  }
  componentDidUpdate() {
    const { visualElement: i, layoutAnchor: a } = this.props, { projection: r } = i;
    r && (r.options.layoutAnchor = a, r.root.didUpdate(), xm.postRender(() => {
      !r.currentAnimation && r.isLead() && this.safeToRemove();
    }));
  }
  componentWillUnmount() {
    const { visualElement: i, layoutGroup: a, switchLayoutGroup: r } = this.props, { projection: o } = i;
    ed = !0, o && (o.scheduleCheckAfterUnmount(), a && a.group && a.group.remove(o), r && r.deregister && r.deregister(o));
  }
  safeToRemove() {
    const { safeToRemove: i } = this.props;
    i && i();
  }
  render() {
    return null;
  }
}
function X_(e) {
  const [i, a] = i2(), r = B.useContext(d1);
  return w.jsx(F2, { ...e, layoutGroup: r, switchLayoutGroup: B.useContext($_), isPresent: i, safeToRemove: a });
}
const Q2 = {
  pan: {
    Feature: K2
  },
  drag: {
    Feature: X2,
    ProjectionNode: L_,
    MeasureLayout: X_
  }
};
function $b(e, i, a) {
  const { props: r } = e;
  e.animationState && r.whileHover && e.animationState.setActive("whileHover", a === "Start");
  const o = "onHover" + a, c = r[o];
  c && Bt.postRender(() => c(i, vl(i)));
}
class J2 extends as {
  mount() {
    const { current: i } = this.node;
    i && (this.unmount = Bz(i, (a, r) => ($b(this.node, r, "Start"), (o) => $b(this.node, o, "End"))));
  }
  unmount() {
  }
}
class W2 extends as {
  constructor() {
    super(...arguments), this.isActive = !1;
  }
  onFocus() {
    let i = !1;
    try {
      i = this.node.current.matches(":focus-visible");
    } catch {
      i = !0;
    }
    !i || !this.node.animationState || (this.node.animationState.setActive("whileFocus", !0), this.isActive = !0);
  }
  onBlur() {
    !this.isActive || !this.node.animationState || (this.node.animationState.setActive("whileFocus", !1), this.isActive = !1);
  }
  mount() {
    this.unmount = pl(fl(this.node.current, "focus", () => this.onFocus()), fl(this.node.current, "blur", () => this.onBlur()));
  }
  unmount() {
  }
}
function Gb(e, i, a) {
  const { props: r } = e;
  if (e.current instanceof HTMLButtonElement && e.current.disabled)
    return;
  e.animationState && r.whileTap && e.animationState.setActive("whileTap", a === "Start");
  const o = "onTap" + (a === "End" ? "" : a), c = r[o];
  c && Bt.postRender(() => c(i, vl(i)));
}
class tM extends as {
  mount() {
    const { current: i } = this.node;
    if (!i)
      return;
    const { globalTapTarget: a, propagate: r } = this.node.props;
    this.unmount = Yz(i, (o, c) => (Gb(this.node, c, "Start"), (h, { success: d }) => Gb(this.node, h, d ? "End" : "Cancel")), {
      useGlobalTarget: a,
      stopPropagation: r?.tap === !1
    });
  }
  unmount() {
  }
}
const Zd = /* @__PURE__ */ new WeakMap(), nd = /* @__PURE__ */ new WeakMap(), eM = (e) => {
  const i = Zd.get(e.target);
  i && i(e);
}, nM = (e) => {
  e.forEach(eM);
};
function iM({ root: e, ...i }) {
  const a = e || document;
  nd.has(a) || nd.set(a, {});
  const r = nd.get(a), o = JSON.stringify(i);
  return r[o] || (r[o] = new IntersectionObserver(nM, { root: e, ...i })), r[o];
}
function sM(e, i, a) {
  const r = iM(i);
  return Zd.set(e, a), r.observe(e), () => {
    Zd.delete(e), r.unobserve(e);
  };
}
const aM = {
  some: 0,
  all: 1
};
class rM extends as {
  constructor() {
    super(...arguments), this.hasEnteredView = !1, this.isInView = !1;
  }
  startObserver() {
    this.stopObserver?.();
    const { viewport: i = {} } = this.node.getProps(), { root: a, margin: r, amount: o = "some", once: c } = i, h = {
      root: a ? a.current : void 0,
      rootMargin: r,
      threshold: typeof o == "number" ? o : aM[o]
    }, d = (m) => {
      const { isIntersecting: p } = m;
      if (this.isInView === p || (this.isInView = p, c && !p && this.hasEnteredView))
        return;
      p && (this.hasEnteredView = !0), this.node.animationState && this.node.animationState.setActive("whileInView", p);
      const { onViewportEnter: g, onViewportLeave: v } = this.node.getProps(), b = p ? g : v;
      b && b(m);
    };
    this.stopObserver = sM(this.node.current, h, d);
  }
  mount() {
    this.startObserver();
  }
  update() {
    if (typeof IntersectionObserver > "u")
      return;
    const { props: i, prevProps: a } = this.node;
    ["amount", "margin", "root"].some(lM(i, a)) && this.startObserver();
  }
  unmount() {
    this.stopObserver?.(), this.hasEnteredView = !1, this.isInView = !1;
  }
}
function lM({ viewport: e = {} }, { viewport: i = {} } = {}) {
  return (a) => e[a] !== i[a];
}
const oM = {
  inView: {
    Feature: rM
  },
  tap: {
    Feature: tM
  },
  focus: {
    Feature: W2
  },
  hover: {
    Feature: J2
  }
}, uM = {
  layout: {
    ProjectionNode: L_,
    MeasureLayout: X_
  }
}, cM = {
  ...N2,
  ...oM,
  ...Q2,
  ...uM
}, fM = /* @__PURE__ */ z2(cM, C2);
function ni() {
  !Am.current && v_();
  const [e] = B.useState(Cu.current);
  return e;
}
const Wn = fM, Yu = { type: "spring", bounce: 0, visualDuration: 0.4 }, K_ = { type: "spring", bounce: 0, visualDuration: 0.25 }, Mm = { type: "spring", bounce: 0, visualDuration: 0.1 }, Rm = 0.97;
function Yb(e, i, a = 0.55) {
  const r = i + a * Math.abs(e);
  return r === 0 ? 0 : e * i * a / r;
}
const hM = {
  /** Window frame and large panels. */
  window: 1.8,
  /** Grouped form cards, callouts, the completion card. */
  group: 1.6,
  /** Sidebar selection, list rows. */
  item: 1.4,
  /** Push buttons, pop-up buttons, fields, checkboxes. */
  control: 1.2
};
function Sn(e) {
  return { cornerShape: `superellipse(${hM[e]})` };
}
function Dm(e = !1) {
  const [i, a] = B.useState(!1), r = B.useRef(!1), o = B.useCallback(
    (h) => {
      if (!(e || h.button !== 0)) {
        r.current = !0, a(!0);
        try {
          h.currentTarget.setPointerCapture(h.pointerId);
        } catch {
        }
      }
    },
    [e]
  ), c = B.useCallback((h) => {
    r.current = !1, a(!1);
    try {
      h.currentTarget.releasePointerCapture(h.pointerId);
    } catch {
    }
  }, []);
  return {
    pressed: i,
    handlers: {
      onPointerDown: o,
      onPointerUp: c,
      onPointerCancel: c,
      onPointerLeave: () => a(!1),
      onPointerEnter: (h) => {
        r.current && h.buttons === 1 && a(!0);
      }
    }
  };
}
const dM = {
  plain: "bg-control text-label",
  accent: "bg-accent-fill text-on-accent",
  danger: "bg-danger text-on-accent"
};
function Le({
  children: e,
  variant: i = "plain",
  type: a = "button",
  disabled: r = !1,
  wide: o = !1,
  onClick: c,
  className: h = "",
  ...d
}) {
  const { pressed: m, handlers: p } = Dm(r), g = ni();
  return /* @__PURE__ */ w.jsx(
    Wn.button,
    {
      ...d,
      ...p,
      type: a,
      disabled: r,
      onClick: c,
      animate: { scale: m && !g ? Rm : 1 },
      transition: Mm,
      style: Sn("control"),
      className: `inline-flex h-(--control-h) items-center justify-center rounded-control px-2.5 text-[13px] leading-4 font-[510] disabled:opacity-40 ${dM[i]} ${o ? "w-full" : ""} ${h}`,
      children: e
    }
  );
}
const mM = {
  info: "text-accent",
  warning: "text-warning",
  error: "text-danger"
};
function ks({ tone: e = "info", title: i, children: a, command: r }) {
  return /* @__PURE__ */ w.jsxs(
    "div",
    {
      style: Sn("group"),
      className: "flex gap-2.5 rounded-group bg-group p-3 shadow-[inset_0_0_0_0.5px_var(--separator)]",
      children: [
        /* @__PURE__ */ w.jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": !0, className: `mt-px h-4 w-4 shrink-0 ${mM[e]}`, children: /* @__PURE__ */ w.jsx(
          "path",
          {
            d: e === "info" ? "M12 10.5v6M12 7.5v.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" : "M12 9v5M12 17.5v.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round"
          }
        ) }),
        /* @__PURE__ */ w.jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ w.jsx("div", { className: "text-[13px] leading-4 font-[510] text-label", children: i }),
          a !== void 0 && /* @__PURE__ */ w.jsx("div", { className: "mt-0.5 text-[11px] leading-[15px] text-label-2", children: a }),
          r !== void 0 && /* @__PURE__ */ w.jsx("code", { className: "mt-1.5 block rounded-control bg-fill-strong px-1.5 py-1 font-mono text-[11px] leading-[15px] text-label select-text", children: r })
        ] })
      ]
    }
  );
}
function Ib({ checked: e, onChange: i, label: a, disabled: r = !1, id: o }) {
  const c = ni();
  return /* @__PURE__ */ w.jsxs(
    "label",
    {
      className: `inline-flex items-center gap-1.5 text-[13px] leading-4 font-[510] text-label ${r ? "opacity-40" : "cursor-default"}`,
      children: [
        /* @__PURE__ */ w.jsxs("span", { className: "relative inline-flex", children: [
          /* @__PURE__ */ w.jsx(
            "input",
            {
              id: o,
              type: "checkbox",
              checked: e,
              disabled: r,
              onChange: (h) => i(h.currentTarget.checked),
              className: "peer absolute inset-0 h-full w-full cursor-default opacity-0"
            }
          ),
          /* @__PURE__ */ w.jsx(
            Wn.span,
            {
              "aria-hidden": !0,
              style: Sn("control"),
              animate: { scale: c || e ? 1 : 0.96 },
              transition: K_,
              className: `grid h-3.5 w-3.5 place-items-center rounded-check peer-focus-visible:shadow-(--focus-ring) ${e ? "bg-accent" : "bg-fill-strong"}`,
              children: e && /* @__PURE__ */ w.jsx("svg", { viewBox: "0 0 14 14", className: "h-3 w-3", "aria-hidden": !0, children: /* @__PURE__ */ w.jsx(
                Wn.path,
                {
                  d: "M3.2 7.2 5.9 9.9 10.9 4.3",
                  fill: "none",
                  stroke: "var(--on-accent)",
                  strokeWidth: "1.8",
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  initial: c ? !1 : { pathLength: 0 },
                  animate: { pathLength: 1 },
                  transition: { duration: c ? 0 : 0.18, ease: [0.25, 1, 0.5, 1] }
                }
              ) })
            }
          )
        ] }),
        a !== void 0 && /* @__PURE__ */ w.jsx("span", { children: a })
      ]
    }
  );
}
function Za({ children: e }) {
  return /* @__PURE__ */ w.jsx("div", { className: "px-(--form-pad-x) pb-1.5 text-[11px] leading-[14px] font-bold text-label-2", children: e });
}
function Bs({ children: e }) {
  return /* @__PURE__ */ w.jsx(
    "div",
    {
      style: Sn("group"),
      className: "rounded-group bg-group px-(--form-pad-x)",
      role: "group",
      children: e
    }
  );
}
function $e({ title: e, subtitle: i, children: a, stacked: r = !1 }) {
  return /* @__PURE__ */ w.jsxs(
    "div",
    {
      className: `flex gap-4 py-0.5 not-last:shadow-[inset_0_-1px_0_var(--separator)] ${r ? "flex-col justify-center py-2.5" : "min-h-(--form-row-h) items-center"}`,
      children: [
        /* @__PURE__ */ w.jsxs("span", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ w.jsx(
            "span",
            {
              className: `block text-[13px] leading-4 font-[510] text-label ${r ? "" : "truncate"}`,
              children: e
            }
          ),
          i !== void 0 && /*
          * A stacked row's subtitle is a sentence and wraps; an inline row's
          * is a detail beside a control, where a second line would push the
          * control out of its 42px row.
          */
          /* @__PURE__ */ w.jsx(
            "span",
            {
              className: `block text-[11px] leading-[14px] text-label-2 ${r ? "" : "truncate"}`,
              children: i
            }
          )
        ] }),
        a !== void 0 && /* @__PURE__ */ w.jsx("span", { className: "shrink-0", children: a })
      ]
    }
  );
}
function pM({
  options: e,
  value: i,
  onChange: a,
  disabled: r = !1,
  id: o,
  ...c
}) {
  const { pressed: h, handlers: d } = Dm(r), m = ni(), p = e.find((g) => g.value === i);
  return /* @__PURE__ */ w.jsxs(
    Wn.span,
    {
      ...d,
      animate: { scale: h && !m ? Rm : 1 },
      transition: Mm,
      style: Sn("control"),
      className: `relative inline-flex h-(--control-h) items-center gap-1.5 rounded-control bg-control pr-1.5 pl-2 ${r ? "opacity-40" : ""}`,
      children: [
        /* @__PURE__ */ w.jsx("span", { className: "max-w-[220px] truncate text-[13px] leading-4 font-[510] text-label", children: p?.label ?? i }),
        /* @__PURE__ */ w.jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": !0, className: "h-2.5 w-2.5 shrink-0 text-label", children: /* @__PURE__ */ w.jsx(
          "path",
          {
            d: "m7 9.5 5-5 5 5M7 14.5l5 5 5-5",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "3",
            strokeLinecap: "round",
            strokeLinejoin: "round"
          }
        ) }),
        /* @__PURE__ */ w.jsx(
          "select",
          {
            ...c,
            id: o,
            value: i,
            disabled: r,
            onChange: (g) => a(g.currentTarget.value),
            className: "absolute inset-0 h-full w-full cursor-default opacity-0",
            children: e.map((g) => /* @__PURE__ */ w.jsx("option", { value: g.value, children: g.label }, g.value))
          }
        )
      ]
    }
  );
}
function qb({ value: e, thin: i = !1, ...a }) {
  const r = ni(), o = Math.min(1, Math.max(0, Number.isFinite(e) ? e : 0));
  return /* @__PURE__ */ w.jsx(
    "div",
    {
      role: "progressbar",
      "aria-label": a["aria-label"],
      "aria-valuemin": 0,
      "aria-valuemax": 100,
      "aria-valuenow": Math.round(o * 100),
      className: `w-full overflow-hidden rounded-full bg-fill-strong ${i ? "h-[3px]" : "h-1.5"}`,
      children: /* @__PURE__ */ w.jsx(
        Wn.div,
        {
          className: "h-full rounded-full bg-accent",
          style: { transformOrigin: "left" },
          animate: { scaleX: o },
          initial: { scaleX: 0 },
          transition: r ? { duration: 0 } : Yu
        }
      )
    }
  );
}
function gM({ size: e = 16, ...i }) {
  const a = ni();
  return /* @__PURE__ */ w.jsxs(
    Wn.svg,
    {
      viewBox: "0 0 16 16",
      width: e,
      height: e,
      role: "status",
      "aria-label": i["aria-label"] ?? "Working",
      animate: a ? void 0 : { rotate: 360 },
      transition: { duration: 0.9, ease: "linear", repeat: 1 / 0 },
      children: [
        /* @__PURE__ */ w.jsx(
          "circle",
          {
            cx: "8",
            cy: "8",
            r: "6.5",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            opacity: "0.25"
          }
        ),
        /* @__PURE__ */ w.jsx(
          "path",
          {
            d: "M8 1.5A6.5 6.5 0 0 1 14.5 8",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round"
          }
        )
      ]
    }
  );
}
const yM = { success: 1600, error: 2400, cancelled: 1200 }, vM = {
  idle: "bg-accent-fill text-on-accent",
  running: "bg-accent-fill text-on-accent",
  success: "bg-success text-on-accent",
  error: "bg-danger text-on-accent",
  cancelled: "bg-control text-label"
}, bM = {
  idle: "Generate Batches",
  running: "Generating...",
  success: "Done",
  error: "Failed",
  cancelled: "Cancelled"
};
function SM({ state: e, onRun: i, disabledReason: a, label: r, onSettled: o }) {
  const c = a !== void 0, h = e === "running", { pressed: d, handlers: m } = Dm(c || h), p = ni(), [g, v] = B.useState(!1);
  return B.useEffect(() => {
    if (e === "idle" || e === "running") return;
    const b = window.setTimeout(() => o?.(), yM[e]);
    return () => window.clearTimeout(b);
  }, [e, o]), B.useEffect(() => {
    if (e !== "success") return;
    v(!0);
    const b = window.setTimeout(() => v(!1), 260);
    return () => window.clearTimeout(b);
  }, [e]), /* @__PURE__ */ w.jsxs(
    Wn.button,
    {
      ...m,
      type: "button",
      disabled: c || h,
      "aria-busy": h,
      "aria-live": "polite",
      title: a,
      onClick: () => {
        c || h || i();
      },
      animate: {
        scale: p ? 1 : d ? Rm : g ? 1.03 : 1
      },
      transition: d ? Mm : g ? { ...Yu, bounce: 0.35 } : K_,
      style: Sn("control"),
      className: `inline-flex h-7 min-w-[168px] items-center justify-center gap-1.5 rounded-control px-3 text-[13px] leading-4 font-[510] ${vM[e]} ${c ? "opacity-40" : "opacity-100"}`,
      children: [
        h && /* @__PURE__ */ w.jsx(gM, { size: 13, "aria-label": "Generating" }),
        e === "success" && /* @__PURE__ */ w.jsx(_M, {}),
        /* @__PURE__ */ w.jsx("span", { children: r ?? bM[e] })
      ]
    }
  );
}
function _M() {
  const e = ni();
  return /* @__PURE__ */ w.jsx("svg", { viewBox: "0 0 14 14", width: 13, height: 13, "aria-hidden": !0, children: /* @__PURE__ */ w.jsx(
    Wn.path,
    {
      d: "M3 7.4 5.8 10.2 11 4.4",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      initial: e ? !1 : { pathLength: 0 },
      animate: { pathLength: 1 },
      transition: { duration: e ? 0 : 0.22, ease: [0.25, 1, 0.5, 1] }
    }
  ) });
}
function F_({
  segments: e,
  value: i,
  onChange: a,
  name: r,
  ...o
}) {
  const c = ni(), h = e.findIndex((m) => m.value === i);
  function d(m) {
    const p = e[(h + m + e.length) % e.length];
    p && a(p.value);
  }
  return /* @__PURE__ */ w.jsx(
    "div",
    {
      ...o,
      role: "tablist",
      style: Sn("control"),
      className: "inline-flex rounded-control bg-segment-track p-0.5",
      onKeyDown: (m) => {
        if (m.key === "ArrowRight" || m.key === "ArrowDown") d(1);
        else if (m.key === "ArrowLeft" || m.key === "ArrowUp") d(-1);
        else return;
        m.preventDefault();
      },
      children: e.map((m) => {
        const p = m.value === i;
        return /* @__PURE__ */ w.jsxs(
          "button",
          {
            type: "button",
            role: "tab",
            "aria-selected": p,
            tabIndex: p ? 0 : -1,
            onClick: () => a(m.value),
            className: "relative px-2.5 py-0.5 text-[13px] leading-4 font-[510]",
            children: [
              p && /* @__PURE__ */ w.jsx(
                Wn.span,
                {
                  "aria-hidden": !0,
                  layoutId: `segmented-${r}`,
                  style: Sn("control"),
                  transition: c ? { duration: 0 } : Yu,
                  className: "absolute inset-0 rounded-control bg-segment-on"
                }
              ),
              /* @__PURE__ */ w.jsx("span", { className: `relative ${p ? "text-label" : "text-label-2"}`, children: m.label })
            ]
          },
          m.value
        );
      })
    }
  );
}
function Iu({
  value: e,
  onChange: i,
  placeholder: a,
  disabled: r = !1,
  mono: o = !1,
  maxLength: c,
  inputMode: h = "text",
  width: d,
  id: m,
  ...p
}) {
  return /* @__PURE__ */ w.jsx(
    "input",
    {
      ...p,
      id: m,
      type: "text",
      value: e,
      placeholder: a,
      disabled: r,
      maxLength: c,
      inputMode: h,
      spellCheck: !1,
      autoComplete: "off",
      "data-focus-ring": "self",
      onChange: (g) => i(g.currentTarget.value),
      style: { ...Sn("control"), ...d === void 0 ? {} : { width: d } },
      className: `h-(--control-h) rounded-control bg-field px-1.5 text-[13px] leading-4 text-label shadow-[0_0_0_1px_var(--field-ring)] select-text placeholder:text-label-3 focus-visible:shadow-(--focus-ring) disabled:opacity-40 ${o ? "font-mono [font-variant-numeric:tabular-nums]" : ""}`
    }
  );
}
function Xb({
  value: e,
  onChange: i,
  min: a = 0,
  max: r = Number.MAX_SAFE_INTEGER,
  disabled: o = !1,
  id: c,
  ...h
}) {
  const d = (m) => i(Math.min(r, Math.max(a, m)));
  return /* @__PURE__ */ w.jsxs("span", { className: "inline-flex items-center gap-1", children: [
    /* @__PURE__ */ w.jsx(
      Iu,
      {
        id: c,
        "aria-label": h["aria-label"],
        value: String(e),
        disabled: o,
        inputMode: "numeric",
        mono: !0,
        width: 60,
        onChange: (m) => {
          const p = m.replace(/[^\d]/g, "");
          d(p === "" ? a : Number(p));
        }
      }
    ),
    /* @__PURE__ */ w.jsx(
      "span",
      {
        "aria-hidden": !0,
        style: Sn("control"),
        className: "flex h-(--control-h) w-[16px] flex-col overflow-hidden rounded-control bg-control",
        children: [
          ["up", 1, "m5 9 5-5 5 5"],
          ["down", -1, "m5 4 5 5 5-5"]
        ].map(([m, p, g]) => /* @__PURE__ */ w.jsx(
          "button",
          {
            type: "button",
            tabIndex: -1,
            disabled: o,
            onClick: () => d(e + p),
            className: "grid flex-1 place-items-center not-last:shadow-[inset_0_-1px_0_var(--stepper-separator)]",
            children: /* @__PURE__ */ w.jsx("svg", { viewBox: "0 0 20 13", className: "h-[7px] w-[9px] text-label", children: /* @__PURE__ */ w.jsx(
              "path",
              {
                d: g,
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2.5",
                strokeLinecap: "round",
                strokeLinejoin: "round"
              }
            ) })
          },
          m
        ))
      }
    )
  ] });
}
function TM({ checked: e, onChange: i, disabled: a = !1, id: r, ...o }) {
  const c = ni();
  return /* @__PURE__ */ w.jsx(
    "button",
    {
      ...o,
      id: r,
      type: "button",
      role: "switch",
      "aria-checked": e,
      disabled: a,
      onClick: () => i(!e),
      className: `relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-(--dur-fast) disabled:opacity-40 ${e ? "bg-accent" : "bg-fill-strong"}`,
      children: /* @__PURE__ */ w.jsx(
        Wn.span,
        {
          "aria-hidden": !0,
          className: "absolute top-0.5 left-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.2)]",
          animate: { x: e ? 16 : 0 },
          transition: c ? { duration: 0 } : Yu
        }
      )
    }
  );
}
var xM = h1();
function EM(e) {
  return typeof e == "object" ? e.key : e;
}
function wM(e, i) {
  const a = e.length;
  return new Proxy(e, {
    get(r, o, c) {
      if (typeof o == "string") {
        const h = o.charCodeAt(0);
        if (h >= 48 && h <= 57) {
          const d = +o;
          if (Number.isInteger(d) && d >= 0 && d < a) {
            let m = r[d];
            if (typeof m != "object") {
              const p = i[d * 2];
              m = r[d] = {
                index: d,
                key: m,
                start: p,
                size: i[d * 2 + 1],
                end: p + i[d * 2 + 1],
                lane: 0
              };
            }
            return m;
          }
        }
        if (o === "length") return a;
      }
      return Reflect.get(r, o, c);
    }
  });
}
function Na(e, i, a) {
  let r = a.initialDeps ?? [], o, c = !0;
  function h() {
    const d = e();
    return (d.length !== r.length || d.some((p, g) => r[g] !== p)) && (r = d, o = i(...d), a?.onChange && !(c && a.skipInitialOnChange) && a.onChange(o), c = !1), o;
  }
  return h.updateDeps = (d) => {
    r = d;
  }, h;
}
function Kb(e, i) {
  if (e === void 0)
    throw new Error("Unexpected undefined");
  return e;
}
const Fb = (e, i) => Math.abs(e - i) < 1.01, AM = (e, i, a) => {
  let r;
  return Object.assign(
    function(...o) {
      e.clearTimeout(r), r = e.setTimeout(() => i.apply(this, o), a);
    },
    {
      // The handle is closure-local, so a caller that has already
      // unsubscribed has no way to stop a queued call. Teardown paths use
      // this to drop the pending invocation instead of letting it land.
      cancel: () => {
        e.clearTimeout(r);
      }
    }
  );
};
let Ir;
const id = () => {
  if (Ir !== void 0) return Ir;
  if (typeof navigator > "u") return Ir = !1;
  if (/iP(hone|od|ad)/.test(navigator.userAgent)) return Ir = !0;
  const e = navigator.maxTouchPoints;
  return Ir = navigator.platform === "MacIntel" && e !== void 0 && e > 0;
}, Qb = (e) => {
  const { offsetWidth: i, offsetHeight: a } = e;
  return { width: i, height: a };
}, OM = (e) => e, zM = (e) => {
  const i = Math.max(e.startIndex - e.overscan, 0), r = Math.min(e.endIndex + e.overscan, e.count - 1) - i + 1, o = new Array(r);
  for (let c = 0; c < r; c++)
    o[c] = i + c;
  return o;
}, CM = (e, i) => {
  const a = e.scrollElement;
  if (!a)
    return;
  const r = e.targetWindow;
  if (!r)
    return;
  const o = (h) => {
    const { width: d, height: m } = h;
    i({ width: Math.round(d), height: Math.round(m) });
  };
  if (o(Qb(a)), !r.ResizeObserver)
    return () => {
    };
  const c = new r.ResizeObserver((h) => {
    const d = () => {
      const m = h[0];
      if (m?.borderBoxSize) {
        const p = m.borderBoxSize[0];
        if (p) {
          o({ width: p.inlineSize, height: p.blockSize });
          return;
        }
      }
      o(Qb(a));
    };
    e.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(d) : d();
  });
  return c.observe(a, { box: "border-box" }), () => {
    c.unobserve(a);
  };
}, Nu = {
  passive: !0
}, MM = typeof window > "u" ? !0 : "onscrollend" in window, RM = (e, i, a) => {
  const r = e.scrollElement;
  if (!r)
    return;
  const o = e.targetWindow;
  if (!o)
    return;
  const c = e.options.useScrollendEvent && MM;
  let h = 0;
  const d = c ? null : AM(
    o,
    () => i(a(r), !1),
    e.options.isScrollingResetDelay
  ), m = (v) => () => {
    h = a(r), d?.(), i(h, v);
  }, p = m(!0), g = m(!1);
  return r.addEventListener("scroll", p, Nu), c && r.addEventListener("scrollend", g, Nu), () => {
    r.removeEventListener("scroll", p), c && r.removeEventListener("scrollend", g), d?.cancel();
  };
}, DM = (e, i) => RM(e, i, (a) => {
  const { horizontal: r, isRtl: o } = e.options;
  return r ? a.scrollLeft * (o && -1 || 1) : a.scrollTop;
}), NM = (e, i, a) => {
  if (a.options.useCachedMeasurements) {
    const r = a.indexFromElement(e), o = a.options.getItemKey(r);
    return a.itemSizeCache.get(o) ?? a.options.estimateSize(r);
  }
  if (i?.borderBoxSize) {
    const r = i.borderBoxSize[0];
    if (r)
      return Math.round(
        r[a.options.horizontal ? "inlineSize" : "blockSize"]
      );
  }
  if (!i) {
    const r = a.indexFromElement(e), o = a.options.getItemKey(r), c = a.itemSizeCache.get(o);
    if (c !== void 0)
      return c;
  }
  return e[a.options.horizontal ? "offsetWidth" : "offsetHeight"];
}, jM = (e, {
  adjustments: i = 0,
  behavior: a
}, r) => {
  var o, c;
  (c = (o = r.scrollElement) == null ? void 0 : o.scrollTo) == null || c.call(o, {
    [r.options.horizontal ? "left" : "top"]: e + i,
    behavior: a
  });
}, VM = jM;
function LM(e, i, a, r) {
  if (i === 0) return !1;
  const o = r(0), c = /* @__PURE__ */ new Set();
  let h = 0;
  for (; h < e; ) {
    const m = a(h);
    if (m === o) break;
    c.add(m), h++;
  }
  const d = e - h;
  if (d === 0 || d >= i) return !1;
  for (let m = 0; m < d; m++)
    if (r(m) !== a(h + m)) return !1;
  for (let m = d; m < i; m++)
    if (c.has(r(m))) return !1;
  return !0;
}
class UM {
  constructor(i) {
    this.unsubs = [], this.scrollElement = null, this.targetWindow = null, this.isScrolling = !1, this.scrollState = null, this.measurementsCache = [], this._singleLaneMeasurements = null, this.itemSizeCache = /* @__PURE__ */ new Map(), this.itemSizeCacheVersion = 0, this.laneAssignments = /* @__PURE__ */ new Map(), this.pendingMin = null, this.prevLanes = void 0, this.lanesChangedFlag = !1, this.lanesSettling = !1, this.pendingScrollAnchor = null, this.scrollRect = null, this.scrollOffset = null, this.scrollDirection = null, this.scrollAdjustments = 0, this._iosDeferredAdjustment = 0, this._iosTouching = !1, this._iosJustTouchEnded = !1, this._iosTouchEndTimerId = null, this._intendedScrollOffset = null, this._clampedAdjustment = null, this.elementsCache = /* @__PURE__ */ new Map(), this.now = () => {
      var a, r, o;
      return ((o = (r = (a = this.targetWindow) == null ? void 0 : a.performance) == null ? void 0 : r.now) == null ? void 0 : o.call(r)) ?? Date.now();
    }, this.observer = /* @__PURE__ */ (() => {
      let a = null;
      const r = () => a || (!this.targetWindow || !this.targetWindow.ResizeObserver ? null : a = new this.targetWindow.ResizeObserver((o) => {
        o.forEach((c) => {
          const h = () => {
            const d = c.target, m = this.indexFromElement(d);
            if (!d.isConnected) {
              this.observer.unobserve(d);
              for (const [p, g] of this.elementsCache)
                if (g === d) {
                  this.elementsCache.delete(p);
                  break;
                }
              return;
            }
            this.isIndexInRange(m) && this.shouldMeasureDuringScroll(m) && this.resizeItem(
              m,
              this.options.measureElement(d, c, this)
            );
          };
          this.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(h) : h();
        });
      }));
      return {
        disconnect: () => {
          var o;
          (o = r()) == null || o.disconnect(), a = null;
        },
        observe: (o) => {
          var c;
          return (c = r()) == null ? void 0 : c.observe(o, { box: "border-box" });
        },
        unobserve: (o) => {
          var c;
          return (c = r()) == null ? void 0 : c.unobserve(o);
        }
      };
    })(), this.range = null, this.setOptions = (a) => {
      var r;
      const o = {
        debug: !1,
        initialOffset: 0,
        overscan: 1,
        paddingStart: 0,
        paddingEnd: 0,
        scrollPaddingStart: 0,
        scrollPaddingEnd: 0,
        horizontal: !1,
        getItemKey: OM,
        rangeExtractor: zM,
        onChange: () => {
        },
        measureElement: NM,
        initialRect: { width: 0, height: 0 },
        scrollMargin: 0,
        gap: 0,
        indexAttribute: "data-index",
        initialMeasurementsCache: [],
        lanes: 1,
        anchorTo: "start",
        followOnAppend: !1,
        scrollEndThreshold: 1,
        isScrollingResetDelay: 150,
        enabled: !0,
        isRtl: !1,
        useScrollendEvent: !1,
        useAnimationFrameWithResizeObserver: !1,
        laneAssignmentMode: "estimate",
        useCachedMeasurements: !1
      };
      for (const v in a) {
        const b = a[v];
        b !== void 0 && (o[v] = b);
      }
      const c = this.options;
      let h = null, d = null, m = !1;
      if (c !== void 0 && c.enabled && o.enabled && o.anchorTo === "end" && this.scrollElement !== null) {
        const v = c.count, b = o.count, _ = this.getMeasurements(), T = ((r = this._singleLaneMeasurements) == null ? void 0 : r.items) ?? _, x = (G) => EM(T[G]), A = v > 0 ? x(0) : null, N = v > 0 ? x(v - 1) : null;
        if (b !== v || v > 0 && b > 0 && (o.getItemKey(0) !== A || o.getItemKey(b - 1) !== N)) {
          m = !0;
          const G = v > 0 ? this.getVirtualItemForOffset(this.getScrollOffset()) ?? _[0] : null;
          G && (h = [G.key, this.getScrollOffset() - G.start]);
          const X = o.followOnAppend === !0 ? "auto" : o.followOnAppend || null;
          X && b > 0 && this.isAtEnd(c.scrollEndThreshold) && (v === 0 || o.getItemKey(b - 1) !== N) && (b > v || LM(
            v,
            b,
            x,
            o.getItemKey
          )) && (d = X);
        }
      }
      this.options = o, m && (this.pendingMin = 0, this.itemSizeCacheVersion++);
      let p = !1, g = 0;
      if (h && this.scrollOffset !== null) {
        const [v, b] = h, _ = this.getMeasurements(), { count: T, getItemKey: x } = this.options;
        let A = 0;
        for (; A < T && x(A) !== v; )
          A++;
        if (A < T) {
          const N = _[A];
          if (N) {
            const D = Math.max(0, N.start + b);
            !d && D !== this.scrollOffset && (g = D - this.scrollOffset, this.scrollOffset = D, p = !0);
          }
        }
      }
      (p || d) && (this.pendingScrollAnchor = [
        p ? h[0] : null,
        p ? h[1] : 0,
        d,
        g
      ]);
    }, this.notify = (a) => {
      var r, o;
      (o = (r = this.options).onChange) == null || o.call(r, this, a);
    }, this.maybeNotify = Na(
      () => (this.calculateRange(), [
        this.isScrolling,
        this.range ? this.range.startIndex : null,
        this.range ? this.range.endIndex : null
      ]),
      (a) => {
        this.notify(a);
      },
      {
        key: !1,
        debug: () => this.options.debug,
        initialDeps: [
          this.isScrolling,
          this.range ? this.range.startIndex : null,
          this.range ? this.range.endIndex : null
        ]
      }
    ), this.cleanup = () => {
      this.unsubs.filter(Boolean).forEach((a) => a()), this.unsubs = [], this.observer.disconnect(), this.rafId != null && this.targetWindow && (this.targetWindow.cancelAnimationFrame(this.rafId), this.rafId = null), this.scrollState = null, this.isScrolling = !1, this.scrollDirection = null, this._iosDeferredAdjustment = 0, this._iosTouching = !1, this._iosJustTouchEnded = !1, this._clampedAdjustment = null, this.scrollElement = null, this.targetWindow = null;
    }, this._didMount = () => () => {
      this.cleanup();
    }, this._willUpdate = () => {
      var a, r;
      const o = this.options.enabled ? this.options.getScrollElement() : null;
      if (this.scrollElement !== o) {
        if (this.cleanup(), !o) {
          this.maybeNotify();
          return;
        }
        if (this.scrollElement = o, this.scrollElement && "ownerDocument" in this.scrollElement ? this.targetWindow = this.scrollElement.ownerDocument.defaultView : this.targetWindow = ((a = this.scrollElement) == null ? void 0 : a.window) ?? null, this.elementsCache.forEach((h) => {
          this.observer.observe(h);
        }), this.unsubs.push(
          this.options.observeElementRect(this, (h) => {
            this.scrollRect = h, this.maybeNotify();
          })
        ), this.unsubs.push(
          this.options.observeElementOffset(this, (h, d) => {
            if (d && this._intendedScrollOffset === null && h === this.scrollOffset)
              return;
            this._intendedScrollOffset !== null && Math.abs(h - this._intendedScrollOffset) < 1.5 && (h = this._intendedScrollOffset), this._intendedScrollOffset = null, this._clampedAdjustment !== null && Math.abs(h - this._clampedAdjustment.maxAtWrite) >= 1.5 && (this._clampedAdjustment = null), this.scrollAdjustments = 0;
            const m = this.getScrollOffset();
            this.scrollDirection = d ? m === h ? this.scrollDirection : m < h ? "forward" : "backward" : null, this.scrollOffset = h, this.isScrolling = d, this._flushIosDeferredIfReady(), this.scrollState && this.scheduleScrollReconcile(), this.maybeNotify();
          })
        ), "addEventListener" in this.scrollElement) {
          const h = this.scrollElement, d = () => {
            this._iosTouching = !0, this._iosJustTouchEnded = !1, this._iosTouchEndTimerId !== null && this.targetWindow != null && (this.targetWindow.clearTimeout(this._iosTouchEndTimerId), this._iosTouchEndTimerId = null);
          }, m = () => {
            this._iosTouching = !1, !(!id() || this.targetWindow == null) && (this._iosJustTouchEnded = !0, this._iosTouchEndTimerId = this.targetWindow.setTimeout(() => {
              this._iosJustTouchEnded = !1, this._iosTouchEndTimerId = null, this._flushIosDeferredIfReady();
            }, 150));
          };
          h.addEventListener(
            "touchstart",
            d,
            Nu
          ), h.addEventListener(
            "touchend",
            m,
            Nu
          ), this.unsubs.push(() => {
            h.removeEventListener("touchstart", d), h.removeEventListener("touchend", m), this._iosTouchEndTimerId !== null && this.targetWindow != null && (this.targetWindow.clearTimeout(this._iosTouchEndTimerId), this._iosTouchEndTimerId = null);
          });
        }
        this._scrollToOffset(this.getScrollOffset(), {
          adjustments: void 0,
          behavior: void 0
        });
      }
      const c = this.pendingScrollAnchor;
      if (this.pendingScrollAnchor = null, c && this.scrollElement && this.options.enabled) {
        const [h, d, m, p] = c;
        h !== null && !m && (id() && (this.isScrolling || this._iosTouching || this._iosJustTouchEnded) ? p !== 0 && (this._iosDeferredAdjustment += p) : ((r = this.scrollState) == null ? void 0 : r.behavior) === "smooth" && !Fb(
          this.getScrollOffset() - p,
          this.scrollState.lastTargetOffset
        ) || this._scrollToOffset(this.getScrollOffset(), {
          adjustments: void 0,
          behavior: void 0
        })), m && this.scrollToEnd({ behavior: m });
      }
      this._retryClampedAdjustment();
    }, this._retryClampedAdjustment = () => {
      if (this._clampedAdjustment === null || !this.scrollElement || !this.options.enabled)
        return;
      const { target: a, maxAtWrite: r } = this._clampedAdjustment, o = this.getMaxScrollOffset();
      o > r + 0.5 && (this._clampedAdjustment = a > o + 0.5 ? { target: a, maxAtWrite: o } : null, this._scrollToOffset(a, {
        adjustments: void 0,
        behavior: void 0
      }));
    }, this._flushIosDeferredIfReady = () => {
      if (this._iosDeferredAdjustment === 0 || this.isScrolling || this._iosTouching || this._iosJustTouchEnded) return;
      const a = this.getScrollOffset(), r = this.getMaxScrollOffset();
      if (a < 0 || a > r) return;
      if (this._iosDeferredAdjustment < 0 && a >= r - 1) {
        this._iosDeferredAdjustment = 0;
        return;
      }
      const o = this._iosDeferredAdjustment;
      this._iosDeferredAdjustment = 0, this._scrollToOffset(a, {
        adjustments: this.scrollAdjustments += o,
        behavior: void 0
      });
    }, this.rafId = null, this.getSize = () => this.options.enabled ? (this.scrollRect = this.scrollRect ?? this.options.initialRect, this.scrollRect[this.options.horizontal ? "width" : "height"]) : (this.scrollRect = null, 0), this.getScrollOffset = () => this.options.enabled ? (this.scrollOffset = this.scrollOffset ?? (typeof this.options.initialOffset == "function" ? this.options.initialOffset() : this.options.initialOffset), this.scrollOffset) : (this.scrollOffset = null, 0), this.getMeasurementOptions = Na(
      () => [
        this.options.count,
        this.options.paddingStart,
        this.options.scrollMargin,
        this.options.getItemKey,
        this.options.enabled,
        this.options.lanes,
        this.options.laneAssignmentMode,
        this.options.gap
      ],
      (a, r, o, c, h, d, m, p) => (this.prevLanes !== void 0 && this.prevLanes !== d && (this.lanesChangedFlag = !0), this.prevLanes = d, this.pendingMin = null, {
        count: a,
        paddingStart: r,
        scrollMargin: o,
        getItemKey: c,
        enabled: h,
        lanes: d,
        laneAssignmentMode: m,
        gap: p
      }),
      {
        key: !1
      }
    ), this.isIndexInRange = (a) => a >= 0 && a < this.options.count, this.getMeasurements = Na(
      () => [this.getMeasurementOptions(), this.itemSizeCacheVersion],
      ({
        count: a,
        paddingStart: r,
        scrollMargin: o,
        getItemKey: c,
        enabled: h,
        lanes: d,
        laneAssignmentMode: m,
        gap: p
      }, g) => {
        var v;
        const b = this.itemSizeCache;
        if (!h)
          return this.measurementsCache = [], this._singleLaneMeasurements = null, this.itemSizeCache.clear(), this.laneAssignments.clear(), [];
        if (this.laneAssignments.size > a)
          for (const D of this.laneAssignments.keys())
            D >= a && this.laneAssignments.delete(D);
        this.lanesChangedFlag && (this.lanesChangedFlag = !1, this.lanesSettling = !0, this.measurementsCache = [], this._singleLaneMeasurements = null, this.itemSizeCache.clear(), this.laneAssignments.clear(), this.pendingMin = null), this.measurementsCache.length === 0 && !this.lanesSettling && (this.measurementsCache = this.options.initialMeasurementsCache, this.measurementsCache.forEach((D) => {
          this.itemSizeCache.set(D.key, D.size);
        }));
        const _ = this.lanesSettling ? 0 : this.pendingMin ?? 0;
        if (this.pendingMin = null, this.lanesSettling && this.measurementsCache.length === a && (this.lanesSettling = !1), d === 1) {
          const D = a * 2;
          let k = (v = this._singleLaneMeasurements) == null ? void 0 : v.flat;
          if (!k || k.length < D) {
            const V = new Float64Array(D);
            k && _ > 0 && V.set(k.subarray(0, _ * 2)), k = V;
          }
          const G = _ === 0 ? new Array(a) : this._singleLaneMeasurements.items.slice();
          let X;
          if (_ === 0)
            X = r + o;
          else {
            const V = _ - 1;
            X = k[V * 2] + k[V * 2 + 1] + p;
          }
          for (let V = _; V < a; V++) {
            const $ = c(V);
            G[V] = $;
            const J = b.get($), Q = typeof J == "number" ? J : this.options.estimateSize(V);
            k[V * 2] = X, k[V * 2 + 1] = Q, X += Q + p;
          }
          this._singleLaneMeasurements = { flat: k, items: G };
          const q = wM(G, k);
          return this.measurementsCache = q, q;
        }
        const T = this.measurementsCache.slice(0, _), x = new Array(d).fill(
          void 0
        ), A = new Float64Array(d);
        let N = 0;
        for (let D = 0; D < _; D++) {
          const k = T[D];
          k && (x[k.lane] === void 0 && N++, x[k.lane] = D, A[k.lane] = k.end);
        }
        for (let D = _; D < a; D++) {
          const k = c(D), G = this.laneAssignments.get(D);
          let X, q;
          const V = m === "estimate" || b.has(k);
          if (G !== void 0 && this.options.lanes > 1) {
            X = G;
            const mt = x[X], vt = mt !== void 0 ? T[mt] : void 0;
            q = vt ? vt.end + p : r + o;
          } else if (N === d) {
            let mt = 0, vt = A[0], $t = x[0];
            for (let ee = 1; ee < d; ee++) {
              const tt = A[ee];
              (tt < vt || tt === vt && x[ee] < $t) && (mt = ee, vt = tt, $t = x[ee]);
            }
            X = mt, q = vt + p, V && this.laneAssignments.set(D, X);
          } else
            X = D % this.options.lanes, q = r + o, V && this.laneAssignments.set(D, X);
          const $ = b.get(k), J = typeof $ == "number" ? $ : this.options.estimateSize(D), Q = q + J;
          T[D] = {
            index: D,
            start: q,
            size: J,
            end: Q,
            key: k,
            lane: X
          }, x[X] === void 0 && N++, x[X] = D, A[X] = Q;
        }
        return this.measurementsCache = T, T;
      },
      {
        key: !1,
        debug: () => this.options.debug
      }
    ), this.calculateRange = Na(
      () => [
        this.getMeasurements(),
        this.getSize(),
        this.getScrollOffset(),
        this.options.lanes
      ],
      (a, r, o, c) => a.length === 0 || r === 0 ? (this.range = null, null) : (this.range = BM(
        a,
        r,
        o,
        c,
        // Pass the typed array so binary search + forward-walk can read
        // start/end directly from Float64Array, skipping the Proxy traps.
        c === 1 && this._singleLaneMeasurements !== null ? this._singleLaneMeasurements.flat : null
      ), this.range),
      {
        key: !1,
        debug: () => this.options.debug
      }
    ), this.getVirtualIndexes = Na(
      () => {
        let a = null, r = null;
        const o = this.calculateRange();
        return o && (a = o.startIndex, r = o.endIndex), this.maybeNotify.updateDeps([this.isScrolling, a, r]), [
          this.options.rangeExtractor,
          this.options.overscan,
          this.options.count,
          a,
          r
        ];
      },
      (a, r, o, c, h) => c === null || h === null ? [] : a({
        startIndex: c,
        endIndex: h,
        overscan: r,
        count: o
      }),
      {
        key: !1,
        debug: () => this.options.debug
      }
    ), this.indexFromElement = (a) => {
      const r = this.options.indexAttribute, o = a.getAttribute(r);
      return o ? parseInt(o, 10) : (console.warn(
        `Missing attribute name '${r}={index}' on measured element.`
      ), -1);
    }, this.shouldMeasureDuringScroll = (a) => {
      var r;
      if (!this.scrollState || this.scrollState.behavior !== "smooth")
        return !0;
      const o = this.scrollState.index ?? ((r = this.getVirtualItemForOffset(this.scrollState.lastTargetOffset)) == null ? void 0 : r.index);
      if (o !== void 0 && this.range) {
        const c = Math.max(
          this.options.overscan,
          Math.ceil((this.range.endIndex - this.range.startIndex) / 2)
        ), h = Math.max(0, o - c), d = Math.min(
          this.options.count - 1,
          o + c
        );
        return a >= h && a <= d;
      }
      return !0;
    }, this.measureElement = (a) => {
      if (!a) {
        this.elementsCache.forEach((h, d) => {
          h.isConnected || (this.observer.unobserve(h), this.elementsCache.delete(d));
        });
        return;
      }
      const r = this.indexFromElement(a);
      if (!this.isIndexInRange(r)) return;
      const o = this.options.getItemKey(r), c = this.elementsCache.get(o);
      c !== a && (c && this.observer.unobserve(c), this.observer.observe(a), this.elementsCache.set(o, a)), (!this.isScrolling || this.scrollState) && this.shouldMeasureDuringScroll(r) && this.resizeItem(r, this.options.measureElement(a, void 0, this));
    }, this.resizeItem = (a, r) => {
      var o, c, h;
      if (!this.isIndexInRange(a)) return;
      let d, m, p;
      const g = (o = this._singleLaneMeasurements) == null ? void 0 : o.flat;
      if (this.options.lanes === 1 && g != null)
        p = this.options.getItemKey(a), m = g[a * 2], d = g[a * 2 + 1];
      else {
        const _ = this.measurementsCache[a];
        if (!_) return;
        p = _.key, m = _.start, d = _.size;
      }
      const v = this.itemSizeCache.get(p) ?? d, b = r - v;
      if (b !== 0) {
        const _ = this.options.anchorTo === "end" && ((c = this.scrollState) == null ? void 0 : c.behavior) !== "smooth" && this.getVirtualDistanceFromEnd() <= this.options.scrollEndThreshold, T = _ ? this.getTotalSize() : 0, x = this.getScrollOffset() + this.scrollAdjustments, N = !this.itemSizeCache.has(p) ? (
          // First measurement: compensate any item whose top sits above the
          // fold — the estimate→actual delta must be corrected regardless of
          // scroll direction, since the whole estimated block was above it.
          m < x
        ) : (
          // Re-measurement: only compensate an item that is ENTIRELY above the
          // fold. An item that merely *spans* the fold (top above, bottom
          // below — e.g. a streaming chat message growing at its bottom)
          // changes size *below* the anchor point, so shifting scrollTop by the
          // delta would drag the viewport downward on every growth (#1218).
          // Also skip during backward scroll to avoid the "items jump while
          // scrolling up" cascade.
          m + v <= x && this.scrollDirection !== "backward"
        ), D = ((h = this.scrollState) == null ? void 0 : h.behavior) !== "smooth" && (this.shouldAdjustScrollPositionOnItemSizeChange !== void 0 ? this.shouldAdjustScrollPositionOnItemSizeChange(
          // The callback expects a VirtualItem; build one lazily only
          // when the consumer actually supplied a custom predicate.
          this.measurementsCache[a] ?? {
            index: a,
            key: p,
            start: m,
            size: d,
            end: m + d,
            lane: 0
          },
          b,
          this
        ) : N);
        (this.pendingMin === null || a < this.pendingMin) && (this.pendingMin = a), this.itemSizeCache.set(p, r), this.itemSizeCacheVersion++;
        let k = !1;
        _ ? k = this.applyScrollAdjustment(
          this.getTotalSize() - T
        ) : D && (k = this.applyScrollAdjustment(b)), this.notify(k), this._retryClampedAdjustment();
      }
    }, this.getVirtualItems = Na(
      () => [this.getVirtualIndexes(), this.getMeasurements()],
      (a, r) => {
        const o = [];
        for (let c = 0, h = a.length; c < h; c++) {
          const d = a[c], m = r[d];
          o.push(m);
        }
        return o;
      },
      {
        key: !1,
        debug: () => this.options.debug
      }
    ), this.getVirtualItemForOffset = (a) => {
      var r;
      const o = this.getMeasurements();
      if (o.length === 0)
        return;
      const c = (r = this._singleLaneMeasurements) == null ? void 0 : r.flat, h = this.options.lanes === 1 && c != null, d = Q_(
        0,
        o.length - 1,
        h ? (m) => c[m * 2] : (m) => Kb(o[m]).start,
        a
      );
      return Kb(o[d]);
    }, this.getMaxScrollOffset = () => {
      if (!this.scrollElement) return 0;
      if ("scrollHeight" in this.scrollElement)
        return this.options.horizontal ? this.scrollElement.scrollWidth - this.scrollElement.clientWidth : this.scrollElement.scrollHeight - this.scrollElement.clientHeight;
      {
        const a = this.scrollElement.document.documentElement;
        return this.options.horizontal ? a.scrollWidth - this.scrollElement.innerWidth : a.scrollHeight - this.scrollElement.innerHeight;
      }
    }, this.getVirtualDistanceFromEnd = () => Math.max(
      this.getTotalSize() - this.getSize() - this.getScrollOffset(),
      0
    ), this.getDistanceFromEnd = () => Math.max(this.getMaxScrollOffset() - this.getScrollOffset(), 0), this.isAtEnd = (a = this.options.scrollEndThreshold) => this.getDistanceFromEnd() <= a, this.getOffsetForAlignment = (a, r, o = 0) => {
      if (!this.scrollElement) return 0;
      const c = this.getSize(), h = this.getScrollOffset();
      r === "auto" && (r = a >= h + c ? "end" : "start"), r === "center" ? a += (o - c) / 2 : r === "end" && (a -= c);
      const d = this.getMaxScrollOffset();
      return Math.max(Math.min(d, a), 0);
    }, this.getOffsetForIndex = (a, r = "auto") => {
      a = Math.max(0, Math.min(a, this.options.count - 1));
      const o = this.getSize(), c = this.getScrollOffset(), h = this.measurementsCache[a];
      if (!h) return;
      if (r === "auto")
        if (h.end >= c + o - this.options.scrollPaddingEnd)
          r = "end";
        else if (h.start <= c + this.options.scrollPaddingStart)
          r = "start";
        else
          return [c, r];
      if (r === "end" && a === this.options.count - 1)
        return [this.getMaxScrollOffset(), r];
      const d = r === "end" ? h.end + this.options.scrollPaddingEnd : h.start - this.options.scrollPaddingStart;
      return [
        this.getOffsetForAlignment(d, r, h.size),
        r
      ];
    }, this.scrollToOffset = (a, { align: r = "start", behavior: o = "auto" } = {}) => {
      this._iosDeferredAdjustment = 0;
      const c = this.getOffsetForAlignment(a, r), h = this.now();
      this.scrollState = {
        index: null,
        align: r,
        behavior: o,
        startedAt: h,
        lastTargetOffset: c,
        stableFrames: 0
      }, this._scrollToOffset(c, { adjustments: void 0, behavior: o }), this.scheduleScrollReconcile();
    }, this.scrollToIndex = (a, {
      align: r = "auto",
      behavior: o = "auto"
    } = {}) => {
      this._iosDeferredAdjustment = 0, a = Math.max(0, Math.min(a, this.options.count - 1));
      const c = this.getOffsetForIndex(a, r);
      if (!c)
        return;
      const [h, d] = c, m = this.now();
      this.scrollState = {
        index: a,
        align: d,
        behavior: o,
        startedAt: m,
        lastTargetOffset: h,
        stableFrames: 0
      }, this._scrollToOffset(h, { adjustments: void 0, behavior: o }), this.scheduleScrollReconcile();
    }, this.scrollBy = (a, { behavior: r = "auto" } = {}) => {
      const o = this.getScrollOffset() + a, c = this.now();
      this.scrollState = {
        index: null,
        align: "start",
        behavior: r,
        startedAt: c,
        lastTargetOffset: o,
        stableFrames: 0
      }, this._scrollToOffset(o, { adjustments: void 0, behavior: r }), this.scheduleScrollReconcile();
    }, this.scrollToEnd = ({ behavior: a = "auto" } = {}) => {
      if (this.options.count > 0) {
        this.scrollToIndex(this.options.count - 1, {
          align: "end",
          behavior: a
        });
        return;
      }
      this.scrollToOffset(Math.max(this.getTotalSize() - this.getSize(), 0), {
        behavior: a
      });
    }, this.getTotalSize = () => {
      var a, r;
      const o = this.getMeasurements();
      let c;
      if (o.length === 0)
        c = this.options.paddingStart;
      else if (this.options.lanes === 1) {
        const h = o.length - 1, d = (a = this._singleLaneMeasurements) == null ? void 0 : a.flat;
        d != null ? c = d[h * 2] + d[h * 2 + 1] : c = ((r = o[h]) == null ? void 0 : r.end) ?? 0;
      } else {
        const h = Array(this.options.lanes).fill(null);
        let d = o.length - 1;
        for (; d >= 0 && h.some((m) => m === null); ) {
          const m = o[d];
          h[m.lane] === null && (h[m.lane] = m.end), d--;
        }
        c = Math.max(...h.filter((m) => m !== null));
      }
      return Math.max(
        c - this.options.scrollMargin + this.options.paddingEnd,
        0
      );
    }, this.takeSnapshot = () => {
      const a = [];
      if (this.itemSizeCache.size === 0) return a;
      const r = this.getMeasurements();
      for (const o of r)
        o && this.itemSizeCache.has(o.key) && a.push({
          index: o.index,
          key: o.key,
          start: o.start,
          size: o.size,
          end: o.end,
          lane: o.lane
        });
      return a;
    }, this._scrollToOffset = (a, {
      adjustments: r,
      behavior: o
    }) => {
      this._intendedScrollOffset = a + (r ?? 0), this.options.scrollToFn(a, { behavior: o, adjustments: r }, this);
    }, this.measure = () => {
      this.pendingMin = null, this.itemSizeCache.clear(), this.laneAssignments.clear(), this.itemSizeCacheVersion++, this.notify(!1);
    }, this.setOptions(i);
  }
  // Returns `true` when it performed a synchronous `scrollTop` write this
  // tick, `false` when the delta was zero or the write was deferred (iOS).
  // `resizeItem` uses that to decide whether the follow-up `notify` must be
  // synchronous so the grown transforms commit in the same paint (#1227).
  applyScrollAdjustment(i, a) {
    if (i === 0) return !1;
    if (id() && (this.isScrolling || this._iosTouching || this._iosJustTouchEnded))
      return this._iosDeferredAdjustment += i, !1;
    {
      const r = this.getScrollOffset() + this.scrollAdjustments + i, o = this.scrollElement, c = o !== null && ("scrollHeight" in o || "document" in o) ? this.getMaxScrollOffset() : null;
      return this._clampedAdjustment = c !== null && r > c + 0.5 ? { target: r, maxAtWrite: c } : null, this._scrollToOffset(this.getScrollOffset(), {
        adjustments: this.scrollAdjustments += i,
        behavior: a
      }), this.scrollOffset !== null && (this.scrollOffset += this.scrollAdjustments, this.scrollOffset < 0 && (this.scrollOffset = 0), this.scrollAdjustments = 0), !0;
    }
  }
  scheduleScrollReconcile() {
    if (!this.targetWindow) {
      this.scrollState = null;
      return;
    }
    this.rafId == null && (this.rafId = this.targetWindow.requestAnimationFrame(() => {
      this.rafId = null, this.reconcileScroll();
    }));
  }
  reconcileScroll() {
    if (!this.scrollState || !this.scrollElement) return;
    if (this.now() - this.scrollState.startedAt > 5e3) {
      this.scrollState = null;
      return;
    }
    const r = this.scrollState.index != null ? this.getOffsetForIndex(this.scrollState.index, this.scrollState.align) : void 0, o = r ? r[0] : this.scrollState.lastTargetOffset, c = 1, h = o !== this.scrollState.lastTargetOffset;
    if (!h && Fb(o, this.getScrollOffset())) {
      if (this.scrollState.stableFrames++, this.scrollState.stableFrames >= c) {
        this.getScrollOffset() !== o && this._scrollToOffset(o, {
          adjustments: void 0,
          behavior: "auto"
        }), this.scrollState = null;
        return;
      }
    } else if (this.scrollState.stableFrames = 0, h) {
      const d = this.getSize() || 600, m = Math.abs(o - this.getScrollOffset()), p = this.scrollState.behavior === "smooth" && m > d;
      this.scrollState.lastTargetOffset = o, p || (this.scrollState.behavior = "auto"), this._scrollToOffset(o, {
        adjustments: void 0,
        behavior: p ? "smooth" : "auto"
      });
    }
    this.scheduleScrollReconcile();
  }
}
const Q_ = (e, i, a, r) => {
  for (; e <= i; ) {
    const o = (e + i) / 2 | 0, c = a(o);
    if (c < r)
      e = o + 1;
    else if (c > r)
      i = o - 1;
    else
      return o;
  }
  return e > 0 ? e - 1 : 0;
};
function kM(e, i, a) {
  let r = 0;
  for (; r <= i; ) {
    const o = (r + i) / 2 | 0, c = e[o * 2];
    if (c < a)
      r = o + 1;
    else if (c > a)
      i = o - 1;
    else
      return o;
  }
  return r > 0 ? r - 1 : 0;
}
function BM(e, i, a, r, o) {
  const c = e.length - 1;
  if (e.length <= r)
    return { startIndex: 0, endIndex: c };
  if (r === 1 && o !== null) {
    const p = kM(
      o,
      c,
      a
    );
    let g = p;
    const v = a + i;
    for (; g < c && o[g * 2] + o[g * 2 + 1] < v; )
      g++;
    return { startIndex: p, endIndex: g };
  }
  let d = Q_(0, c, (p) => e[p].start, a), m = d;
  if (r === 1)
    for (; m < c && e[m].end < a + i; )
      m++;
  else if (r > 1) {
    const p = Array(r).fill(0);
    for (; m < c && p.some((v) => v < a + i); ) {
      const v = e[m];
      p[v.lane] = v.end, m++;
    }
    const g = Array(r).fill(a + i);
    for (; d >= 0 && g.some((v) => v >= a); ) {
      const v = e[d];
      g[v.lane] = v.start, d--;
    }
    d = Math.max(0, d - d % r), m = Math.min(c, m + (r - 1 - m % r));
  }
  return { startIndex: d, endIndex: m };
}
const sd = typeof document < "u" ? B.useLayoutEffect : B.useEffect;
function ZM({
  useFlushSync: e = !0,
  directDomUpdates: i = !1,
  directDomUpdatesMode: a = "transform",
  ...r
}) {
  const o = B.useReducer((v) => v + 1, 0)[1], c = B.useRef({
    enabled: i,
    mode: a,
    container: null,
    lastSize: null,
    // Keyed by the element itself so a remounted node (same key, new DOM
    // node — e.g. when `enabled` is toggled off then on) is treated as fresh
    // and gets its style written.
    lastPositions: /* @__PURE__ */ new WeakMap(),
    prevRange: null
  });
  c.current.enabled = i, c.current.mode = a;
  const h = B.useRef(!1), d = (v) => {
    const b = c.current;
    if (!b.enabled || !b.container) return;
    const _ = v.getTotalSize();
    if (_ !== b.lastSize) {
      b.lastSize = _;
      const T = v.options.horizontal ? "width" : "height";
      b.container.style[T] = `${_}px`;
    }
  }, m = (v) => {
    const b = c.current;
    if (!b.enabled || !b.container) return;
    d(v);
    const _ = !!v.options.horizontal, T = b.mode === "transform", x = _ ? "left" : "top", A = v.options.scrollMargin, N = v.getVirtualItems();
    for (const D of N) {
      const k = D.start - A, G = v.elementsCache.get(D.key);
      G && b.lastPositions.get(G) !== k && (b.lastPositions.set(G, k), T ? G.style.transform = _ ? `translate3d(${k}px, 0, 0)` : `translate3d(0, ${k}px, 0)` : G.style[x] = `${k}px`);
    }
  }, p = {
    ...r,
    onChange: (v, b) => {
      var _;
      const T = c.current;
      let x = !0;
      if (T.enabled) {
        m(v);
        const A = v.range, N = T.prevRange;
        x = !N || N.isScrolling !== v.isScrolling || N.startIndex !== A?.startIndex || N.endIndex !== A?.endIndex, x && (T.prevRange = A ? {
          startIndex: A.startIndex,
          endIndex: A.endIndex,
          isScrolling: v.isScrolling
        } : null);
      }
      x && (e && b && !h.current ? xM.flushSync(o) : o()), (_ = r.onChange) == null || _.call(r, v, b);
    }
  }, [g] = B.useState(() => {
    const v = new UM(p), b = v.measureElement;
    return v.measureElement = (_) => {
      h.current = !0;
      try {
        b(_);
      } finally {
        h.current = !1;
      }
    }, Object.assign(v, {
      containerRef: (_) => {
        const T = c.current;
        if (T.container = _, T.lastSize = null, _ && T.enabled) {
          const x = v.getTotalSize();
          T.lastSize = x;
          const A = v.options.horizontal ? "width" : "height";
          _.style[A] = `${x}px`;
        }
      }
    });
  });
  return g.setOptions(p), sd(() => g._didMount(), []), sd(() => (d(g), g._willUpdate())), sd(() => {
    m(g);
  }), g;
}
function HM(e) {
  return ZM({
    observeElementRect: CM,
    observeElementOffset: DM,
    scrollToFn: VM,
    ...e
  });
}
function PM(e) {
  switch (e.ev) {
    case "run_start":
      return {
        text: `run_start  python ${e.python}  protocol ${e.protocol}`,
        level: "info"
      };
    case "template_loaded": {
      const { batchSize: i, order: a, serialLayer: r, template: o } = e.geometry;
      return {
        text: `template_loaded  ${i} pockets  ${a ?? "unsaved"}-major  layer ${r ?? "none"}  ${o?.format ?? "unknown"}`,
        level: "info"
      };
    }
    case "serials_loaded": {
      const i = e.skippedHeaderRows.length, a = i === 0 ? "" : `  skipped ${i} header row${i === 1 ? "" : "s"}`, r = e.first == null || e.last == null ? "" : `  ${e.first}..${e.last}`;
      return {
        text: `serials_loaded  ${e.total} serials${r}  ${e.totalBatches} batches${a}`,
        level: "info"
      };
    }
    case "batch_start":
      return {
        text: `batch_start  ${e.index}  ${e.count} serials  ${e.filename}`,
        level: "info"
      };
    case "pocket_filled":
      return {
        text: `pocket_filled  batch ${e.batch}  slot ${e.slot}  pocket ${e.pocket}  ${e.serial}`,
        level: "info"
      };
    case "pocket_hidden":
      return {
        text: `pocket_hidden  batch ${e.batch}  slot ${e.slot}  pocket ${e.pocket}  ${e.ids.length} element(s)`,
        level: "info"
      };
    case "batch_saving":
      return { text: `batch_saving  ${e.index}  ${e.path}`, level: "info" };
    case "batch_written": {
      const i = e.bytes == null ? "" : `  ${e.bytes} bytes`;
      return {
        text: `batch_written  ${e.index}  ${e.filename}  ${e.count} serials${i}  ${Math.round(e.saveMs)} ms`,
        level: "info"
      };
    }
    case "warning":
      return { text: `warning  ${e.message}`, level: "warn" };
    case "done":
      return {
        text: `done  ${e.batches} batch file(s)  ${e.outDir}  ${e.totalMs} ms`,
        level: "info"
      };
    case "error":
      return { text: `error  ${e.code}  ${e.message}`, level: "error" };
  }
}
const $M = /* @__PURE__ */ new Set(["geometry", "glyphs", "outlines", "elements", "pockets", "slots", "p"]);
function J_(e) {
  return JSON.stringify(
    e,
    (i, a) => $M.has(i) ? Array.isArray(a) ? `<${a.length} item(s), not shown>` : a !== null && typeof a == "object" ? `<${Object.keys(a).length} key(s), not shown>` : a : a,
    2
  );
}
function GM(e) {
  return B.useSyncExternalStore(e.subscribe, e.getVersion, () => 0);
}
const qr = 18, YM = 15, IM = 16, qM = {
  info: "text-label-2",
  warn: "text-warning",
  error: "text-danger"
};
function XM({ buffer: e, rows: i = 6, className: a = "" }) {
  GM(e);
  const r = B.useRef(null), [o, c] = B.useState(!0), [h, d] = B.useState(!1), [m, p] = B.useState(!1), [g, v] = B.useState(""), [b, _] = B.useState(null), [T, x] = B.useState(!1);
  B.useEffect(() => {
    e.setFilter({ showProtocol: m, query: g, levels: /* @__PURE__ */ new Set() });
  }, [e, m, g]);
  const A = e.visibleCount(), N = B.useCallback(
    (q) => {
      if (b === null) return qr;
      const V = e.visibleAt(q);
      if (V === void 0 || V.seq !== b || V.event === void 0)
        return qr;
      const $ = J_(V.event).split(`
`).length;
      return qr + $ * YM + IM;
    },
    [e, b]
  ), D = HM({
    count: A,
    getScrollElement: () => r.current,
    estimateSize: N,
    overscan: 12
  });
  B.useLayoutEffect(() => {
    !o || A === 0 || D.scrollToIndex(A - 1, { align: "end" });
  }, [o, A, D]);
  const k = B.useCallback((q) => {
    const V = window.getSelection(), $ = r.current;
    if (V === null || V.isCollapsed || $ === null) return;
    const J = [];
    for (const Q of $.querySelectorAll("[data-index]"))
      V.containsNode(Q, !0) && J.push(Q.textContent ?? "");
    J.length !== 0 && (q.clipboardData.setData("text/plain", J.join(`
`)), q.preventDefault());
  }, []), G = B.useCallback(() => {
    const q = r.current;
    if (q === null) return;
    const V = q.scrollHeight - q.scrollTop - q.clientHeight;
    c(V <= qr);
  }, []);
  async function X() {
    try {
      await navigator.clipboard.writeText(e.toText()), x(!0), setTimeout(() => x(!1), 1200);
    } catch {
    }
  }
  return /* @__PURE__ */ w.jsxs(
    "section",
    {
      style: Sn("group"),
      className: `flex flex-col overflow-hidden rounded-group bg-console shadow-[inset_0_0_0_0.5px_var(--separator)] ${a}`,
      "aria-label": "Console",
      children: [
        /* @__PURE__ */ w.jsxs("header", { className: "flex shrink-0 items-center gap-2 px-2.5 py-1.5 shadow-[inset_0_-1px_0_var(--separator)]", children: [
          /* @__PURE__ */ w.jsx("span", { className: "text-[11px] leading-4 font-bold text-label", children: "Console" }),
          /* @__PURE__ */ w.jsxs("span", { className: "font-mono text-[11px] leading-4 text-label-3 [font-variant-numeric:tabular-nums]", children: [
            A.toLocaleString(),
            " shown",
            e.dropped > 0 && ` · ${e.dropped.toLocaleString()} dropped`
          ] }),
          /* @__PURE__ */ w.jsx("span", { className: "flex-1" }),
          /* @__PURE__ */ w.jsx(
            Iu,
            {
              value: g,
              onChange: v,
              placeholder: "Filter",
              "aria-label": "Filter console",
              width: 132,
              mono: !0
            }
          ),
          /* @__PURE__ */ w.jsx(Ib, { checked: m, onChange: p, label: "Protocol" }),
          /* @__PURE__ */ w.jsx(Ib, { checked: h, onChange: d, label: "Wrap" }),
          /* @__PURE__ */ w.jsx(Le, { onClick: () => {
            X();
          }, children: T ? "Copied" : "Copy" }),
          /* @__PURE__ */ w.jsx(
            Le,
            {
              onClick: () => {
                e.clear(), _(null);
              },
              children: "Clear"
            }
          )
        ] }),
        /* @__PURE__ */ w.jsxs("div", { className: "relative shrink-0", children: [
          /* @__PURE__ */ w.jsx(
            "div",
            {
              ref: r,
              onScroll: G,
              onCopy: k,
              role: "log",
              "aria-label": "Console output",
              "aria-live": "off",
              tabIndex: 0,
              style: { height: i * qr, overflowAnchor: "none" },
              className: "overflow-auto overscroll-contain px-2.5 py-1 select-text",
              children: /* @__PURE__ */ w.jsx("div", { style: { height: D.getTotalSize(), position: "relative" }, children: D.getVirtualItems().map((q) => {
                const V = e.visibleAt(q.index);
                return V === void 0 ? null : /* @__PURE__ */ w.jsx(
                  KM,
                  {
                    index: q.index,
                    entry: V,
                    top: q.start,
                    wrap: h,
                    measure: h ? D.measureElement : void 0,
                    expanded: b === V.seq,
                    onToggle: () => _(b === V.seq ? null : V.seq)
                  },
                  V.seq
                );
              }) })
            }
          ),
          !o && A > 0 && /* @__PURE__ */ w.jsx(
            "button",
            {
              type: "button",
              onClick: () => c(!0),
              style: Sn("control"),
              className: "absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-accent-fill px-2.5 py-1 text-[11px] leading-4 font-[510] text-on-accent shadow-[0_2px_8px_rgb(0_0_0/0.25)]",
              children: "Jump to latest"
            }
          )
        ] })
      ]
    }
  );
}
function KM({ index: e, entry: i, top: a, wrap: r, measure: o, expanded: c, onToggle: h }) {
  const d = i.kind === "proto", m = /* @__PURE__ */ w.jsx(
    "span",
    {
      className: `${qM[i.level]} ${r ? "break-all whitespace-pre-wrap" : "whitespace-pre"}`,
      children: i.text
    }
  );
  return /* @__PURE__ */ w.jsxs(
    "div",
    {
      ref: o,
      "data-index": e,
      style: { position: "absolute", top: a, left: 0, width: "100%", contain: "layout paint" },
      className: "font-mono text-[12px] leading-[18px] [font-variant-numeric:tabular-nums]",
      children: [
        d ? /* @__PURE__ */ w.jsxs(
          "button",
          {
            type: "button",
            onClick: h,
            "aria-expanded": c,
            className: "flex w-full items-start gap-1 text-left",
            children: [
              /* @__PURE__ */ w.jsx("span", { "aria-hidden": !0, className: "shrink-0 text-label-3", children: c ? "▾" : "▸" }),
              m
            ]
          }
        ) : m,
        c && i.event !== void 0 && /* @__PURE__ */ w.jsx("pre", { className: "mt-0.5 mb-1 overflow-x-auto rounded-control bg-group p-2 text-[11px] leading-[15px] text-label-2 select-text", children: J_(i.event) })
      ]
    }
  );
}
const FM = [1, 0, 0, 1, 0, 0];
function W_(e, i, a, r) {
  const o = (i ?? 0) * Math.PI / 180, c = e ?? 1, h = Math.cos(o), d = Math.sin(o);
  return [c * h, c * d, -c * d, c * h, a, r];
}
const ad = /([MLQZmlqz])|([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)/g, QM = 4;
function Jb(e) {
  const i = Number(e.toFixed(QM));
  return Object.is(i, -0) ? 0 : i;
}
function il(e, i = FM) {
  const [a, r, o, c, h, d] = i, m = [], p = [];
  ad.lastIndex = 0;
  for (let v = ad.exec(e); v !== null; v = ad.exec(e))
    v[1] !== void 0 ? m.push({ name: v[1], at: p.length }) : v[2] !== void 0 && p.push(Number(v[2]));
  const g = [];
  for (let v = 0; v < m.length; v += 1) {
    const b = m[v];
    if (b === void 0) continue;
    const _ = m[v + 1]?.at ?? p.length, T = b.name.toUpperCase();
    if (T === "Z") {
      g.push("Z");
      continue;
    }
    const x = [];
    for (let A = b.at; A + 1 < _; A += 2) {
      const N = p[A] ?? 0, D = p[A + 1] ?? 0;
      x.push(`${Jb(a * N + o * D + h)},${Jb(r * N + c * D + d)}`);
    }
    x.length > 0 && g.push(T + x.join(" "));
  }
  return g.join("");
}
function JM(e, i) {
  return `M0,0L${e},0L${e},${i} L0,${i}Z`;
}
function WM(e, i) {
  return `M0,0L${e},${i}`;
}
const tR = "var(--jig-stroke)", nu = 6;
function Wb(e, i) {
  return i == null ? 0 : e.layers?.[i]?.order ?? 0;
}
function eR(e, i) {
  const a = typeof e[3] == "number" ? e[3] : i.s, r = typeof e[4] == "number" ? e[4] : i.a;
  return W_(a, r, Number(e[1]), Number(e[2]));
}
function tS(e, i) {
  const a = e.chars ?? [];
  let r = "";
  for (const o of a) {
    const c = i[String(o[0])];
    c !== void 0 && (r += il(c, eR(o, e)));
  }
  return r;
}
function nR(e) {
  return e.visible ? e.ignored ? "reference" : "engrave" : "hidden";
}
const iR = 1;
function eS(e) {
  const i = [...e].sort((m, p) => m - p), a = [];
  let r = 0, o = 0, c = Number.NaN;
  for (const m of i) {
    if (o === 0 || m - c <= iR) {
      o === 0 && (c = m), r += m, o += 1;
      continue;
    }
    a.push(r / o), c = m, r = m, o = 1;
  }
  if (o > 0 && a.push(r / o), a.length < 2) return 0;
  const h = [];
  for (let m = 1; m < a.length; m += 1)
    h.push((a[m] ?? 0) - (a[m - 1] ?? 0));
  h.sort((m, p) => m - p);
  const d = Math.floor(h.length / 2);
  return h.length % 2 === 0 ? ((h[d - 1] ?? 0) + (h[d] ?? 0)) / 2 : h[d] ?? 0;
}
function nS(e) {
  const i = e.outlines, a = [], r = [...e.elements].sort(
    (_, T) => Wb(e, _.layer) - Wb(e, T.layer)
  );
  let o = 0;
  for (const _ of r) {
    const T = nR(_), x = _.id ?? `unnamed-${o += 1}`, A = T === "reference" ? tR : _.layer ?? "#000000", N = _.t ?? void 0;
    if (_.type === "RECT" && _.w !== void 0 && _.h !== void 0)
      a.push({ key: x, d: il(JM(_.w, _.h), N), kind: T, layer: A, filled: !1 });
    else if (_.type === "LINE" && _.x2 !== void 0 && _.y2 !== void 0)
      a.push({ key: x, d: il(WM(_.x2, _.y2), N), kind: T, layer: A, filled: !1 });
    else if (_.type === "PATH" && _.o !== void 0) {
      const D = i[_.o];
      D !== void 0 && a.push({ key: x, d: il(D, N), kind: T, layer: A, filled: !1 });
    } else if (_.type === "TEXT") {
      if (_.role === "serial") continue;
      const D = tS(_, i);
      D !== "" && a.push({ key: x, d: D, kind: T, layer: A, filled: !0 });
    }
  }
  const c = /* @__PURE__ */ new Map();
  for (const _ of e.elements)
    _.type === "TEXT" && _.role === "serial" && _.pocket !== void 0 && c.set(_.pocket, _);
  const h = eS(e.pockets.map((_) => _.cx)), d = eS(e.pockets.map((_) => _.cy)), m = (h || d) * 0.4, p = (d || h) * 0.4, g = e.pockets.map((_) => {
    const T = c.get(_.i), x = (T?.chars ?? []).map((A) => ({
      outlineId: String(A[0]),
      x: Number(A[1]),
      y: Number(A[2]),
      scale: typeof A[3] == "number" ? A[3] : T?.s ?? null,
      angle: typeof A[4] == "number" ? A[4] : T?.a ?? null
    }));
    return {
      index: _.i,
      slot: _.slot ?? null,
      cx: _.cx,
      cy: _.cy,
      badgeX: _.cx - m,
      badgeY: _.cy - p,
      serialId: T?.id ?? null,
      placeholder: T === void 0 ? "" : tS(T, i),
      chars: x,
      extras: (_.extras ?? []).filter((A) => A !== null)
    };
  }), v = e.bbox, b = c.values().next().value;
  return {
    shapes: a,
    pockets: g,
    outlines: i,
    glyphs: e.glyphs ?? {},
    serialLayer: e.serialLayer ?? "#000000",
    serialScale: b?.s ?? null,
    serialAngle: b?.a ?? null,
    viewBox: {
      x: v.minX - nu,
      y: v.minY - nu,
      width: v.maxX - v.minX + nu * 2,
      height: v.maxY - v.minY + nu * 2
    },
    batchSize: e.batchSize,
    order: e.order ?? null
  };
}
function sR(e, i, a) {
  let r = "";
  for (let o = 0; o < e.length; o += 1) {
    const c = e[o];
    if (c === void 0) continue;
    const h = a.glyphs[c], d = h === void 0 ? void 0 : a.outlines[h], m = i[o];
    d === void 0 || m === void 0 || (r += il(d, W_(a.serialScale, a.serialAngle, m[0], m[1])));
  }
  return r;
}
const aR = 140, rR = 180, lR = 0.12;
class oR {
  /*
   * A SET per pocket, not one view.
   *
   * The viewer and the minimap both watch the same pockets, and with a single
   * view per index whichever mounted second silently replaced the first --
   * the minimap would fill while the drawing stayed empty, or the other way
   * round, depending on mount order. Fanning out is also what guarantees the
   * two cannot disagree about what is filled.
   */
  views = /* @__PURE__ */ new Map();
  states = /* @__PURE__ */ new Map();
  animations = /* @__PURE__ */ new Map();
  handle = null;
  reduced;
  now;
  schedule;
  cancelFrame;
  constructor(i = {}) {
    this.now = i.now ?? (() => performance.now()), this.schedule = i.schedule ?? ((a) => requestAnimationFrame(a)), this.cancelFrame = i.cancel ?? ((a) => cancelAnimationFrame(a)), this.reduced = i.reducedMotion ?? !1;
  }
  /** Attach a view of a pocket. Called as React mounts each pocket, once. */
  register(i, a) {
    const r = this.views.get(i), o = r ?? /* @__PURE__ */ new Set();
    return r === void 0 && this.views.set(i, o), o.add(a), this.states.set(i, this.states.get(i) ?? "placeholder"), () => {
      o.delete(a), o.size === 0 && (this.views.delete(i), this.animations.delete(i));
    };
  }
  /** Apply something to every view of a pocket. */
  each(i, a) {
    const r = this.views.get(i);
    if (r === void 0 || r.size === 0) return !1;
    for (const o of r) a(o);
    return !0;
  }
  stateOf(i) {
    return this.states.get(i) ?? "placeholder";
  }
  /** How many pockets are mid-animation. Used by the stress harness. */
  get active() {
    return this.animations.size;
  }
  /**
   * Reduced motion does not mean no feedback -- it means a non-vestibular
   * equivalent. The reveal becomes a step to the finished state; the pocket
   * still changes, and still changes at the moment the laser reached it.
   */
  setReducedMotion(i) {
    if (this.reduced = i, !!i) {
      for (const [a, r] of this.animations)
        this.finish(a, r.kind);
      this.animations.clear(), this.stop();
    }
  }
  /**
   * A pocket has been engraved.
   *
   * Starting a trace on a pocket that is already tracing replaces it rather
   * than queueing: the later event is the truth, and a queue would drift
   * further behind the machine with every batch.
   */
  fill(i, a) {
    if (this.states.set(i, "tracing"), !!this.each(i, (r) => r.setSerial(a))) {
      if (this.reduced) {
        this.finish(i, "trace");
        return;
      }
      this.each(i, (r) => {
        r.setPlaceholder(0), r.setProgress(0);
      }), this.animations.set(i, {
        index: i,
        kind: "trace",
        startedAt: this.now(),
        duration: aR
      }), this.start();
    }
  }
  /** A pocket this batch does not use. */
  hide(i) {
    if (this.states.set(i, "hidden"), this.views.get(i) !== void 0) {
      if (this.reduced) {
        this.finish(i, "hide");
        return;
      }
      this.animations.set(i, { index: i, kind: "hide", startedAt: this.now(), duration: rR }), this.start();
    }
  }
  /** Back to placeholders, for the next batch. */
  reset() {
    this.animations.clear(), this.stop();
    for (const i of this.views.keys())
      this.states.set(i, "placeholder"), this.each(i, (a) => {
        a.setSerial(""), a.setProgress(0), a.setPlaceholder(1), a.setHidden(0);
      });
  }
  /**
   * Advance every running animation to a given moment, without waiting for a
   * frame. Used by the measurement harness, which needs to time one frame's
   * worth of work in a window the compositor may not be painting.
   */
  advanceTo(i) {
    this.tick(i);
  }
  /** Stop the frame loop. Called when the viewer unmounts. */
  dispose() {
    this.animations.clear(), this.views.clear(), this.stop();
  }
  /* --------------------------------------------------------------------- *
   * The frame loop
   * --------------------------------------------------------------------- */
  start() {
    this.handle === null && (this.handle = this.schedule(this.tick));
  }
  stop() {
    this.handle !== null && (this.cancelFrame(this.handle), this.handle = null);
  }
  /**
   * One frame advances every running animation.
   *
   * All of them, in one pass, rather than a timer per pocket: 75 timers is 75
   * callbacks the browser has to coalesce anyway, and they would not be
   * guaranteed to land in the same frame as each other.
   */
  tick = (i) => {
    this.handle = null;
    const a = [];
    for (const [r, o] of this.animations) {
      const c = Math.min(1, (i - o.startedAt) / o.duration);
      if (!this.each(r, (d) => {
        o.kind === "trace" ? d.setProgress(c) : d.setHidden(c);
      })) {
        a.push(r);
        continue;
      }
      c >= 1 && (this.finish(r, o.kind), a.push(r));
    }
    for (const r of a) this.animations.delete(r);
    this.animations.size > 0 && this.start();
  };
  finish(i, a) {
    a === "trace" ? (this.each(i, (r) => {
      r.setProgress(1), r.setPlaceholder(0);
    }), this.states.set(i, "filled")) : (this.each(i, (r) => r.setHidden(1)), this.states.set(i, "hidden"));
  }
}
function uR(e, i) {
  return { array: `${e} ${e}`, offset: e * (1 - i) };
}
function cR(e, i) {
  const a = Math.max(1, e * lR);
  return {
    array: `${a} ${e}`,
    // Slides the short dash so its leading edge sits exactly at the head of
    // the reveal.
    offset: a - e * i,
    visible: i > 0 && i < 1
  };
}
const fR = 0.5, hR = 40, iS = 120, sS = { scale: 1, x: 0, y: 0 };
function dR(e, i, a = 0.02) {
  if (e.width <= 0 || e.height <= 0 || i.width <= 0 || i.height <= 0) return sS;
  const r = Math.min(i.width / e.width, i.height / e.height) * (1 - a);
  return {
    scale: r,
    x: (i.width - e.width * r) / 2 - e.x * r,
    y: (i.height - e.height * r) / 2 - e.y * r
  };
}
function tT(e, i) {
  return { x: (i.x - e.x) / e.scale, y: (i.y - e.y) / e.scale };
}
function aS(e, i, a, r) {
  const o = eT(e.scale * i, r), c = tT(e, a);
  return { scale: o, x: a.x - c.x * o, y: a.y - c.y * o };
}
function eT(e, i) {
  const a = i * fR;
  return Math.min(hR, Math.max(a, e));
}
function nT(e, i, a) {
  const r = i.width * e.scale, o = i.height * e.scale, c = i.x * e.scale + e.x, h = i.y * e.scale + e.y;
  return {
    x: rS(c, r, a.width),
    y: rS(h, o, a.height)
  };
}
function rS(e, i, a) {
  if (i <= a)
    return e - (a - i) / 2;
  if (e > 0) return e;
  const r = e + i;
  return r < a ? r - a : 0;
}
function mR(e, i, a) {
  const r = nT(e, i, a);
  return r.x === 0 && r.y === 0 ? e : {
    scale: e.scale,
    x: e.x - r.x + Yb(r.x, iS),
    y: e.y - r.y + Yb(r.y, iS)
  };
}
function lS(e, i, a) {
  const r = nT(e, i, a);
  return r.x === 0 && r.y === 0 ? e : { scale: e.scale, x: e.x - r.x, y: e.y - r.y };
}
function pR(e) {
  return Math.exp(-e * 15e-4);
}
function oS(e, i) {
  return Math.abs(e.scale - i.scale) < 1e-6 && Math.abs(e.x - i.x) < 1e-3 && Math.abs(e.y - i.y) < 1e-3;
}
const gR = 320;
function yR(e, i = !0) {
  const a = B.useRef(null), r = B.useRef(null), o = B.useRef(null), c = B.useRef({ scale: 1, x: 0, y: 0 }), h = B.useRef({ width: 0, height: 0 }), d = B.useRef(1), [m, p] = B.useState(c.current), [g, v] = B.useState(1), b = B.useCallback((x) => {
    c.current = x;
    const A = `translate(${x.x} ${x.y}) scale(${x.scale})`;
    r.current?.setAttribute("transform", A), o.current?.setAttribute("transform", A), p((N) => oS(N, x) ? N : x);
  }, []), _ = B.useCallback(() => {
    const x = dR(e, h.current);
    d.current = x.scale, v(x.scale), b(x);
  }, [b, e]), T = B.useCallback(
    (x) => {
      const { width: A, height: N } = h.current;
      b(aS(c.current, x, { x: A / 2, y: N / 2 }, d.current));
    },
    [b]
  );
  return B.useEffect(() => {
    const x = a.current;
    if (x === null) return;
    const A = () => {
      const D = x.getBoundingClientRect(), k = D.width !== h.current.width || D.height !== h.current.height;
      h.current = { width: D.width, height: D.height }, k && _();
    };
    if (A(), typeof ResizeObserver > "u") return;
    const N = new ResizeObserver(A);
    return N.observe(x), () => N.disconnect();
  }, [_]), B.useEffect(() => {
    const x = a.current;
    if (x === null || !i) return;
    let A = null, N = { x: 0, y: 0 }, D = 0;
    const k = (J) => {
      const Q = x.getBoundingClientRect();
      return { x: J.clientX - Q.left, y: J.clientY - Q.top };
    }, G = (J) => {
      J.button === 0 && (D !== 0 && (cancelAnimationFrame(D), D = 0), A = J.pointerId, N = k(J), x.setPointerCapture(J.pointerId));
    }, X = (J) => {
      if (A !== J.pointerId) return;
      const Q = k(J), mt = {
        ...c.current,
        x: c.current.x + (Q.x - N.x),
        y: c.current.y + (Q.y - N.y)
      };
      N = Q, b(mR(mt, e, h.current));
    }, q = (J) => {
      if (A !== J.pointerId) return;
      A = null;
      try {
        x.releasePointerCapture(J.pointerId);
      } catch {
      }
      const Q = c.current, mt = lS(Q, e, h.current);
      if (oS(Q, mt)) return;
      const vt = performance.now(), $t = (ee) => {
        const tt = Math.min(1, (ee - vt) / gR), Y = 1 - Math.pow(1 - tt, 3);
        b({
          scale: Q.scale,
          x: Q.x + (mt.x - Q.x) * Y,
          y: Q.y + (mt.y - Q.y) * Y
        }), D = tt < 1 ? requestAnimationFrame($t) : 0;
      };
      D = requestAnimationFrame($t);
    }, V = (J) => {
      J.preventDefault();
      const Q = k(J);
      if (J.ctrlKey || J.metaKey) {
        b(aS(c.current, pR(J.deltaY), Q, d.current));
        return;
      }
      const mt = {
        ...c.current,
        x: c.current.x - J.deltaX,
        y: c.current.y - J.deltaY
      };
      b(lS(mt, e, h.current));
    }, $ = (J) => {
      const Q = k(J), mt = d.current;
      if (c.current.scale > mt * 1.05) {
        _();
        return;
      }
      const vt = tT(c.current, Q), $t = eT(mt * 3, mt);
      b({ scale: $t, x: Q.x - vt.x * $t, y: Q.y - vt.y * $t });
    };
    return x.addEventListener("pointerdown", G), x.addEventListener("pointermove", X), x.addEventListener("pointerup", q), x.addEventListener("pointercancel", q), x.addEventListener("wheel", V, { passive: !1 }), x.addEventListener("dblclick", $), () => {
      x.removeEventListener("pointerdown", G), x.removeEventListener("pointermove", X), x.removeEventListener("pointerup", q), x.removeEventListener("pointercancel", q), x.removeEventListener("wheel", V), x.removeEventListener("dblclick", $), D !== 0 && cancelAnimationFrame(D);
    };
  }, [b, e, i, _]), { containerRef: a, stageRef: r, liveRef: o, view: m, fitted: g, fitNow: _, zoomBy: T };
}
const Hd = 1, vR = 0.75, uS = 0.35, Pd = 0.16;
function bR({
  scene: e,
  timeline: i,
  showSlots: a = !0,
  className: r = ""
}) {
  const o = ni(), { containerRef: c, stageRef: h, liveRef: d, view: m, fitNow: p } = yR(e.viewBox);
  B.useEffect(() => {
    i.setReducedMotion(o ?? !1);
  }, [i, o]);
  const g = B.useMemo(
    () => e.shapes.map((v) => /* @__PURE__ */ w.jsx(SR, { shape: v }, v.key)),
    [e]
  );
  return /* @__PURE__ */ w.jsxs(
    "div",
    {
      ref: c,
      className: `relative touch-none overflow-hidden [contain:paint] bg-viewer select-none ${r}`,
      role: "img",
      "aria-label": `Template with ${e.pockets.length} pockets`,
      children: [
        /* @__PURE__ */ w.jsx(
          "svg",
          {
            className: "absolute inset-0 h-full w-full [will-change:transform]",
            preserveAspectRatio: "none",
            "aria-hidden": !0,
            children: /* @__PURE__ */ w.jsx("g", { ref: h, children: g })
          }
        ),
        /* @__PURE__ */ w.jsx("svg", { className: "absolute inset-0 h-full w-full", preserveAspectRatio: "none", "aria-hidden": !0, children: /* @__PURE__ */ w.jsx("g", { ref: d, children: e.pockets.map((v) => /* @__PURE__ */ w.jsx(
          _R,
          {
            pocket: v,
            timeline: i,
            colour: e.serialLayer,
            showSlot: a
          },
          v.index
        )) }) }),
        /* @__PURE__ */ w.jsx(
          "button",
          {
            type: "button",
            onClick: p,
            className: "absolute right-2 bottom-2 rounded-control bg-control px-2 py-1 text-[11px] leading-4 font-[510] text-label",
            children: "Fit"
          }
        ),
        /* @__PURE__ */ w.jsxs("span", { className: "absolute bottom-2 left-2 font-mono text-[11px] leading-4 text-label-3 [font-variant-numeric:tabular-nums]", children: [
          Math.round(m.scale * 100) / 100,
          "×"
        ] })
      ]
    }
  );
}
const SR = B.memo(function({ shape: i }) {
  return i.filled ? /* @__PURE__ */ w.jsx(
    "path",
    {
      d: i.d,
      fill: i.layer,
      stroke: "none",
      opacity: i.kind === "hidden" ? Pd : 1
    }
  ) : /* @__PURE__ */ w.jsx(
    "path",
    {
      d: i.d,
      fill: "none",
      stroke: i.layer,
      strokeWidth: i.kind === "reference" ? vR : Hd,
      vectorEffect: "non-scaling-stroke",
      opacity: i.kind === "reference" ? 0.55 : i.kind === "hidden" ? Pd : 1
    }
  );
}), _R = B.memo(function({ pocket: i, timeline: a, colour: r, showSlot: o }) {
  const c = B.useRef(null), h = B.useRef(null), d = B.useRef(null), m = B.useRef(null);
  return B.useEffect(() => {
    const p = {
      setSerial(g) {
        h.current?.setAttribute("d", g), d.current?.setAttribute("d", g);
      },
      setProgress(g) {
        const v = h.current, b = d.current;
        if (v === null || b === null) return;
        let _ = Number(v.dataset.length ?? "0");
        _ === 0 && (_ = v.getTotalLength(), v.dataset.length = String(_));
        const T = uR(_, g);
        v.setAttribute("stroke-dasharray", T.array), v.setAttribute("stroke-dashoffset", String(T.offset)), v.setAttribute("fill-opacity", String(g)), v.setAttribute("stroke-opacity", String(1 - g));
        const x = cR(_, g);
        b.setAttribute("stroke-dasharray", x.array), b.setAttribute("stroke-dashoffset", String(x.offset)), b.setAttribute("opacity", x.visible ? "1" : "0");
      },
      setPlaceholder(g) {
        c.current?.setAttribute("opacity", String(g * uS));
      },
      setHidden(g) {
        m.current?.setAttribute("opacity", String(1 - g * (1 - Pd)));
      }
    };
    return a.register(i.index, p);
  }, [a, i.index]), /* @__PURE__ */ w.jsxs("g", { ref: m, "data-pocket": i.index, children: [
    /* @__PURE__ */ w.jsx(
      "path",
      {
        ref: c,
        d: i.placeholder,
        fill: r,
        stroke: "none",
        opacity: uS
      }
    ),
    /* @__PURE__ */ w.jsx(
      "path",
      {
        ref: h,
        d: "",
        fill: r,
        fillOpacity: 0,
        stroke: r,
        strokeOpacity: 1,
        strokeWidth: Hd,
        vectorEffect: "non-scaling-stroke"
      }
    ),
    /* @__PURE__ */ w.jsx(
      "path",
      {
        ref: d,
        d: "",
        fill: "none",
        stroke: "var(--laser)",
        strokeWidth: Hd * 2.5,
        strokeLinecap: "round",
        vectorEffect: "non-scaling-stroke",
        opacity: 0
      }
    ),
    o && i.slot !== null && /* @__PURE__ */ w.jsx(
      "text",
      {
        x: i.badgeX,
        y: i.badgeY,
        textAnchor: "start",
        dominantBaseline: "hanging",
        fill: "var(--label-3)",
        fontSize: 6,
        pointerEvents: "none",
        children: i.slot + 1
      }
    )
  ] });
}), cS = (e) => {
  let i;
  const a = /* @__PURE__ */ new Set(), r = (p, g) => {
    const v = typeof p == "function" ? p(i) : p;
    if (!Object.is(v, i)) {
      const b = i;
      i = g ?? (typeof v != "object" || v === null) ? v : Object.assign({}, i, v), a.forEach((_) => _(i, b));
    }
  }, o = () => i, d = { setState: r, getState: o, getInitialState: () => m, subscribe: (p) => (a.add(p), () => a.delete(p)) }, m = i = e(r, o, d);
  return d;
}, TR = ((e) => e ? cS(e) : cS), xR = (e) => e;
function ER(e, i = xR) {
  const a = Qo.useSyncExternalStore(
    e.subscribe,
    Qo.useCallback(() => i(e.getState()), [e, i]),
    Qo.useCallback(() => i(e.getInitialState()), [e, i])
  );
  return Qo.useDebugValue(a), a;
}
const fS = (e) => {
  const i = TR(e), a = (r) => ER(i, r);
  return Object.assign(a, i), a;
}, iT = ((e) => e ? fS(e) : fS), yn = iT((e) => ({
  templatePath: null,
  csvPath: null,
  prefix: "E",
  order: "col",
  glyphsPath: null,
  outDir: null,
  startRow: 0,
  maxBatches: null,
  templates: [],
  defaultCsvPath: null,
  set(i, a) {
    e({ [i]: a });
  },
  hydrate(i) {
    e(i);
  }
}));
function hS(e) {
  if (e.templatePath === null) return { reason: "Choose a template" };
  if (e.csvPath === null) return { reason: "Choose a serial file" };
  const i = {
    templatePath: e.templatePath,
    csvPath: e.csvPath,
    prefix: e.prefix,
    order: e.order
  };
  return e.glyphsPath !== null && (i.glyphsPath = e.glyphsPath), e.outDir !== null && (i.outDir = e.outDir), e.startRow > 0 && (i.startRow = e.startRow), e.maxBatches !== null && (i.maxBatches = e.maxBatches), { config: i };
}
function wR(e) {
  return e.templates.find((i) => i.path === e.templatePath) ?? null;
}
const rd = {
  status: "idle",
  runId: null,
  geometry: null,
  outDir: null,
  serialsTotal: 0,
  batchesTotal: 0,
  batchIndex: 0,
  pocketsFilled: 0,
  batchSize: 0,
  written: [],
  failure: null,
  durationMs: null,
  skippedHeaderRows: 0,
  startedAt: null
}, we = iT((e, i) => ({
  ...rd,
  beginStart() {
    e({ ...rd, status: "starting", startedAt: Date.now() });
  },
  started(a) {
    e({ runId: a, status: "running" });
  },
  failLocally(a, r) {
    e({ status: "error", failure: { code: a, message: r } });
  },
  reset() {
    e({ ...rd });
  },
  apply(a) {
    const r = {}, o = i();
    let c = o.written;
    for (const h of a) {
      if (h.type === "exit") {
        r.durationMs = h.durationMs, h.signal !== null ? r.status = "cancelled" : h.code !== 0 ? ((r.failure ?? o.failure) === null && (r.failure = {
          code: "crashed",
          message: `The generator exited with code ${String(h.code)} and reported nothing.`
        }), r.status = "error") : (r.status ?? o.status) !== "error" && (r.status = "success");
        continue;
      }
      if (h.type !== "proto") continue;
      const d = h.event;
      switch (d.ev) {
        case "template_loaded":
          r.geometry = d.geometry, r.outDir = d.outDir, r.batchSize = d.geometry.batchSize;
          break;
        case "serials_loaded":
          r.serialsTotal = d.total, r.batchesTotal = d.totalBatches, r.batchSize = d.batchSize, r.skippedHeaderRows = d.skippedHeaderRows.length;
          break;
        case "batch_start":
          r.batchIndex = d.index, r.pocketsFilled = 0, r.status = "running";
          break;
        case "pocket_filled":
          r.pocketsFilled = (r.pocketsFilled ?? o.pocketsFilled) + 1;
          break;
        case "batch_saving":
          r.status = "saving";
          break;
        case "batch_written":
          c = [
            ...c,
            {
              index: d.index,
              filename: d.filename,
              path: d.path,
              count: d.count,
              bytes: d.bytes ?? null
            }
          ], r.status = "running";
          break;
        case "done":
          r.outDir = d.outDir, r.durationMs = d.totalMs;
          break;
        case "error":
          r.failure = {
            code: d.code,
            message: d.message,
            row: d.row,
            value: d.value,
            chars: d.chars,
            angle: d.angle
          }, r.status = "error";
          break;
      }
    }
    c !== o.written && (r.written = c), Object.keys(r).length > 0 && e(r);
  }
}));
function Qr(e) {
  return e === "starting" || e === "running" || e === "saving";
}
function AR(e) {
  if (e.batchesTotal === 0) return null;
  const i = e.written.length, a = e.batchSize === 0 ? 0 : Math.min(1, e.pocketsFilled / e.batchSize);
  return Math.min(1, (i + a) / e.batchesTotal);
}
let sT = null;
function dS(e) {
  sT = e;
}
function fe() {
  return sT ?? window.xtool ?? null;
}
function OR() {
  const [e, i] = B.useState({ state: "idle" }), a = B.useCallback(() => {
    const r = fe();
    if (!r) {
      i({ state: "error", message: "Not running in the desktop app." });
      return;
    }
    i({ state: "loading" }), r.environment().then(
      (o) => {
        i({ state: "ready", value: o });
      },
      (o) => {
        i({
          state: "error",
          message: o instanceof Error ? o.message : String(o)
        });
      }
    );
  }, []);
  return B.useEffect(a, [a]), { report: e, refresh: a };
}
function zR(e) {
  const i = B.useRef(e);
  i.current = e, B.useEffect(() => {
    const a = fe();
    if (a)
      return a.onEvent((r) => {
        i.current(r);
      });
  }, []);
}
const mS = "Open donor.xs in xTool Studio, add a text box containing these characters anywhere, save it, and run again.", pS = "Open the file in xTool Studio and save it again.";
function gS(e) {
  return (e ?? []).map((i) => `"${i}"`).join(", ");
}
function CR(e) {
  const i = e.message.replace(/^error:\s*/i, "");
  switch (e.code) {
    case "openpyxl_missing":
      return {
        title: "Excel files need an extra package",
        detail: i,
        hint: 'Install it with "pip install openpyxl", or save the serials as a .csv file instead.'
      };
    case "no_templates":
      return {
        title: "No templates found",
        detail: i,
        hint: "Add .xs or .xcs files to the templates folder."
      };
    case "template_not_found":
      return { title: "That template file is missing", detail: i, hint: "Choose a template again." };
    case "donor_not_found":
      return {
        title: "The glyph donor is missing",
        detail: i,
        hint: "Restore donor.xs next to the script, or choose another donor under Advanced."
      };
    case "unsupported_format":
      return {
        title: "That file type is not supported",
        detail: i,
        hint: "Templates are .xs or .xcs."
      };
    case "not_valid_xs":
    case "no_active_canvas":
    case "missing_canvas_meta":
    case "no_display_chunks":
      return { title: "That template file looks damaged", detail: i, hint: pS };
    case "no_placeholders":
      return {
        title: "No serial placeholders in the template",
        detail: i,
        hint: "Each pocket needs a text such as EXXXXXXX or E1234567."
      };
    case "extra_match_too_far":
      return {
        title: "A per-pocket label could not be matched to its pocket",
        detail: i,
        hint: "A text that happens to repeat once per pocket is treated as a label. Check the template."
      };
    case "bad_order":
      return { title: "Load order must be row or column", detail: i };
    case "malformed_order_file":
      return {
        title: "template_orders.json is damaged",
        detail: i,
        hint: "Fix the file, or delete it and choose the load order again."
      };
    case "no_data":
      return {
        title: "The serial file is empty",
        detail: i,
        hint: "Put one serial per row in column A."
      };
    case "bad_serial_row":
      return {
        title: e.row !== void 0 ? `Row ${e.row} is not a valid serial` : "A row is not a valid serial",
        detail: i,
        hint: e.value !== void 0 ? `"${e.value}" contains something other than letters and digits. Fix that row and run again.` : "Serials may contain only letters and digits."
      };
    case "missing_glyphs":
    case "missing_glyphs_legacy":
      return {
        title: `The donor has no glyph for ${gS(e.chars) || "a character you used"}`,
        detail: i,
        hint: mS
      };
    case "missing_gids":
      return {
        title: `The donor lacks font data for ${gS(e.chars) || "a character you used"}`,
        detail: i,
        hint: mS
      };
    case "unsupported_angle":
      return {
        title: "This template rotates its text by an unsupported angle",
        detail: i,
        hint: "Serial text can be horizontal or rotated 90 degrees either way."
      };
    case "no_processing_entry":
    case "no_processing_mode":
      return { title: "The template's processing settings are incomplete", detail: i, hint: pS };
    case "csv_not_found":
      return { title: "That serial file is missing", detail: i, hint: "Choose a file again." };
    case "cancelled":
      return { title: "Cancelled", detail: i };
    case "internal_assertion":
      return {
        title: "The generator stopped on an internal check",
        detail: i,
        hint: "This is a bug, not a problem with your input. Keep the console output when you report it."
      };
    default:
      return { title: "The generator stopped", detail: i };
  }
}
const MR = [
  { value: "col", label: "Column-major" },
  { value: "row", label: "Row-major" }
], RR = {
  col: "Fills top to bottom, one column at a time — match how you load the jig.",
  row: "Fills left to right, one row at a time — match how you load the jig."
};
function DR({ runner: e }) {
  const i = yn(), a = we(), [r, o] = B.useState(!1), [c, h] = B.useState(!0), d = Qr(a.status), m = wR(i), p = d ? "running" : a.status === "success" ? "success" : a.status === "error" ? "error" : a.status === "cancelled" ? "cancelled" : "idle", g = B.useCallback(() => {
    Qr(we.getState().status) || we.getState().reset();
  }, []);
  B.useEffect(() => {
    const _ = (T) => {
      (T.metaKey || T.ctrlKey) && (T.key === "Enter" ? (T.preventDefault(), Qr(we.getState().status) || e.start()) : T.key === "." && (T.preventDefault(), Qr(we.getState().status) && e.cancel()));
    };
    return window.addEventListener("keydown", _), () => window.removeEventListener("keydown", _);
  }, [e]);
  const v = AR(a), b = B.useMemo(
    () => i.templates.map((_) => ({ value: _.path, label: _.name })),
    [i.templates]
  );
  return (
    /*
     * THE FORM COLUMN IS A FIXED WIDTH, and that is about the JIG.
     *
     * It was `minmax(320px,380px)`, so its width tracked its own content — and
     * its content changes when a run starts: the "⌘↩ to start" hint goes, the
     * button's label shortens to "Generating...", and a Cancel appears. The
     * column breathed by about forty pixels, the viewer beside it grew by the
     * same, its ResizeObserver saw a real size change and refitted the drawing.
     * So the jig visibly re-zoomed at the exact moment the reader's attention
     * was on it, and nothing had asked it to.
     *
     * Fixing the width fixes it at the cause. A form column that changes width
     * while you are reading it is unsettling on its own account; that it was
     * also re-scaling the drawing next to it is the part that showed.
     *
     * 340 AND NOT 380, which was the first attempt: pinning it at its maximum
     * took forty pixels off the jig and the console for ever, and those are the
     * two things worth looking at. The range it used to breathe across was
     * 320-380 and everything in this column fits at the bottom of it, so a
     * value near there costs the form nothing and gives the drawing back.
     */
    /* @__PURE__ */ w.jsxs("div", { className: "grid min-h-0 flex-1 gap-5 overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)]", children: [
      /* @__PURE__ */ w.jsx("div", { className: "min-h-0 overflow-y-auto pr-1", children: /* @__PURE__ */ w.jsxs("div", { className: "grid gap-4", children: [
        /* @__PURE__ */ w.jsxs("div", { children: [
          /* @__PURE__ */ w.jsx(Za, { children: "Source" }),
          /* @__PURE__ */ w.jsxs(Bs, { children: [
            /* @__PURE__ */ w.jsx(
              $e,
              {
                title: "Template",
                subtitle: m === null ? `${i.templates.length} in templates/` : `${m.pockets ?? "?"} pockets · ${m.format}${m.order === void 0 ? "" : ` · ${m.order}-major saved`}`,
                children: /* @__PURE__ */ w.jsx(
                  pM,
                  {
                    "aria-label": "Template",
                    value: i.templatePath ?? "",
                    onChange: (_) => i.set("templatePath", _),
                    disabled: d || b.length === 0,
                    options: b.length === 0 ? [{ value: "", label: "No templates found" }] : b
                  }
                )
              }
            ),
            /* @__PURE__ */ w.jsx(
              $e,
              {
                title: "Serial file",
                subtitle: i.csvPath ?? i.defaultCsvPath ?? "None found",
                children: /* @__PURE__ */ w.jsx(
                  Le,
                  {
                    disabled: d,
                    onClick: () => {
                      fe()?.pickFile("csv").then((_) => {
                        _ !== null && i.set("csvPath", _);
                      });
                    },
                    children: "Choose"
                  }
                )
              }
            ),
            /* @__PURE__ */ w.jsx($e, { title: "Prefix", subtitle: "Prepended to every serial", children: /* @__PURE__ */ w.jsx(
              Iu,
              {
                "aria-label": "Prefix",
                value: i.prefix,
                onChange: (_) => i.set("prefix", _),
                disabled: d,
                maxLength: 16,
                width: 76,
                mono: !0
              }
            ) })
          ] })
        ] }),
        /* @__PURE__ */ w.jsxs("div", { children: [
          /* @__PURE__ */ w.jsx(Za, { children: "Load order" }),
          /* @__PURE__ */ w.jsx(Bs, { children: /* @__PURE__ */ w.jsx($e, { title: "Order", subtitle: RR[i.order], stacked: !0, children: /* @__PURE__ */ w.jsx(
            F_,
            {
              name: "load-order",
              "aria-label": "Load order",
              segments: MR,
              value: i.order,
              onChange: (_) => {
                i.set("order", _);
                const T = m?.stem;
                T !== void 0 && fe()?.setTemplateOrder(T, _);
              }
            }
          ) }) })
        ] }),
        /* @__PURE__ */ w.jsxs("div", { children: [
          /* @__PURE__ */ w.jsxs(
            "button",
            {
              type: "button",
              onClick: () => o(!r),
              "aria-expanded": r,
              className: "flex items-center gap-1 px-(--form-pad-x) pb-1.5 text-[11px] leading-[14px] font-bold text-label-2",
              children: [
                /* @__PURE__ */ w.jsx("span", { "aria-hidden": !0, children: r ? "▾" : "▸" }),
                " Advanced"
              ]
            }
          ),
          r && /* @__PURE__ */ w.jsxs(Bs, { children: [
            /* @__PURE__ */ w.jsx($e, { title: "Glyph donor", subtitle: i.glyphsPath ?? "donor.xs", children: /* @__PURE__ */ w.jsx(
              Le,
              {
                disabled: d,
                onClick: () => {
                  fe()?.pickFile("donor").then((_) => {
                    _ !== null && i.set("glyphsPath", _);
                  });
                },
                children: "Choose"
              }
            ) }),
            /* @__PURE__ */ w.jsx(
              $e,
              {
                title: "Output folder",
                subtitle: i.outDir ?? "batches/<template name>",
                children: /* @__PURE__ */ w.jsx(
                  Le,
                  {
                    disabled: d,
                    onClick: () => {
                      fe()?.pickFile("folder").then((_) => {
                        _ !== null && i.set("outDir", _);
                      });
                    },
                    children: "Choose"
                  }
                )
              }
            ),
            /* @__PURE__ */ w.jsx($e, { title: "Skip first rows", subtitle: "Header rows are skipped anyway", children: /* @__PURE__ */ w.jsx(
              Xb,
              {
                "aria-label": "Skip first rows",
                value: i.startRow,
                onChange: (_) => i.set("startRow", _),
                disabled: d
              }
            ) }),
            /* @__PURE__ */ w.jsx($e, { title: "Limit batches", subtitle: "For testing a new template", children: /* @__PURE__ */ w.jsxs("span", { className: "flex items-center gap-2", children: [
              i.maxBatches !== null && /* @__PURE__ */ w.jsx(
                Xb,
                {
                  "aria-label": "Maximum batches",
                  value: i.maxBatches,
                  min: 1,
                  onChange: (_) => i.set("maxBatches", _),
                  disabled: d
                }
              ),
              /* @__PURE__ */ w.jsx(
                TM,
                {
                  "aria-label": "Limit batches",
                  checked: i.maxBatches !== null,
                  disabled: d,
                  onChange: (_) => i.set("maxBatches", _ ? 1 : null)
                }
              )
            ] }) })
          ] })
        ] }),
        /* @__PURE__ */ w.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ w.jsx(
            SM,
            {
              state: p,
              onRun: e.start,
              onSettled: g,
              disabledReason: e.blocked
            }
          ),
          d && /* @__PURE__ */ w.jsx(Le, { onClick: e.cancel, children: "Cancel" }),
          /* @__PURE__ */ w.jsx("span", { className: "text-[11px] leading-4 text-label-2", children: d ? `Batch ${a.batchIndex} of ${a.batchesTotal === 0 ? "?" : a.batchesTotal}` : a.serialsTotal > 0 ? `${a.serialsTotal} serials` : "⌘↩ to start" })
        ] }),
        /* @__PURE__ */ w.jsx(NR, { runner: e })
      ] }) }),
      /* @__PURE__ */ w.jsxs("div", { className: "grid min-h-0 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto_auto] gap-3", children: [
        e.scene === null ? /* @__PURE__ */ w.jsx("div", { className: "grid place-items-center rounded-group bg-viewer text-[13px] text-label-2 shadow-[inset_0_0_0_0.5px_var(--separator)]", children: "Choose a template to see the jig." }) : /* @__PURE__ */ w.jsx(
          bR,
          {
            scene: e.scene,
            timeline: e.timeline,
            className: "rounded-group shadow-[inset_0_0_0_0.5px_var(--separator)]"
          }
        ),
        /* @__PURE__ */ w.jsxs("div", { className: "grid gap-1.5", children: [
          /* @__PURE__ */ w.jsxs("div", { className: "flex h-4 items-baseline gap-2 text-[11px] leading-4", children: [
            /* @__PURE__ */ w.jsx("span", { className: "font-[510] whitespace-nowrap text-label", children: d ? `Batch ${a.batchIndex}` : a.status === "success" ? "Done" : "Ready" }),
            /* @__PURE__ */ w.jsx("span", { className: "whitespace-nowrap text-label-2", children: a.batchSize > 0 && d ? `pocket ${a.pocketsFilled}/${a.batchSize}` : a.written.length > 0 ? `${a.written.length} file(s)` : "" }),
            /* @__PURE__ */ w.jsx("span", { className: "min-w-0 flex-1 truncate text-right font-mono text-label-3", children: a.written.at(-1)?.filename ?? "" })
          ] }),
          /* @__PURE__ */ w.jsx(qb, { value: v ?? 0, "aria-label": "Batches written" }),
          /* @__PURE__ */ w.jsx(
            qb,
            {
              value: a.batchSize === 0 ? 0 : a.pocketsFilled / a.batchSize,
              thin: !0,
              "aria-label": "Pockets in this batch"
            }
          )
        ] }),
        /* @__PURE__ */ w.jsxs("div", { className: "grid gap-1.5", children: [
          /* @__PURE__ */ w.jsxs(
            "button",
            {
              type: "button",
              onClick: () => h(!c),
              "aria-expanded": c,
              className: "justify-self-start text-[11px] leading-4 font-bold text-label-2",
              children: [
                /* @__PURE__ */ w.jsx("span", { "aria-hidden": !0, children: c ? "▾" : "▸" }),
                " Console"
              ]
            }
          ),
          c && /* @__PURE__ */ w.jsx(XM, { buffer: e.log, rows: 11 })
        ] })
      ] })
    ] })
  );
}
function NR({ runner: e }) {
  const i = we();
  if (i.status === "error" && i.failure !== null) {
    const a = CR(i.failure);
    return /* @__PURE__ */ w.jsxs(ks, { tone: "error", title: a.title, children: [
      a.detail,
      a.hint !== void 0 && /* @__PURE__ */ w.jsx("span", { className: "mt-1 block text-label-3", children: a.hint })
    ] });
  }
  return i.status === "cancelled" ? /* @__PURE__ */ w.jsx(ks, { tone: "warning", title: "Cancelled", children: i.written.length === 0 ? "No files were written." : `${i.written.length} file(s) were written before the run stopped, and are complete.` }) : i.status === "success" ? /* @__PURE__ */ w.jsxs("div", { className: "grid gap-2", children: [
    /* @__PURE__ */ w.jsxs(
      ks,
      {
        tone: "info",
        title: `${i.written.length} file(s) from ${i.serialsTotal} serials`,
        children: [
          i.outDir,
          i.skippedHeaderRows > 0 && ` · ${i.skippedHeaderRows} header row(s) skipped`
        ]
      }
    ),
    /* @__PURE__ */ w.jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ w.jsx(
        Le,
        {
          onClick: () => {
            i.outDir !== null && fe()?.reveal(i.outDir);
          },
          children: "Reveal in Finder"
        }
      ),
      /* @__PURE__ */ w.jsx(Le, { onClick: () => e.log.clear(), children: "Clear console" })
    ] })
  ] }) : null;
}
const jR = [
  { value: "col", label: "Column" },
  { value: "row", label: "Row" }
];
function VR() {
  const e = yn(), [i, a] = B.useState(null);
  B.useEffect(() => {
    fe()?.listTemplates().then((o) => yn.getState().hydrate({ templates: o }), yS);
  }, []);
  const r = e.templates.filter((o) => o.order === void 0);
  return /* @__PURE__ */ w.jsxs("div", { className: "grid content-start gap-4 overflow-y-auto", children: [
    /* @__PURE__ */ w.jsxs("div", { children: [
      /* @__PURE__ */ w.jsxs(Za, { children: [
        "Templates folder · ",
        e.templates.length,
        " file",
        e.templates.length === 1 ? "" : "s"
      ] }),
      /* @__PURE__ */ w.jsxs(Bs, { children: [
        e.templates.length === 0 && /* @__PURE__ */ w.jsx($e, { title: "No templates found", subtitle: "Add .xs or .xcs files to templates/" }),
        e.templates.map((o) => /* @__PURE__ */ w.jsx(
          LR,
          {
            template: o,
            busy: i === o.stem,
            selected: o.path === e.templatePath,
            onSelect: () => e.set("templatePath", o.path),
            onOrder: (c) => {
              a(o.stem), fe()?.setTemplateOrder(o.stem, c).then(
                () => e.hydrate({
                  templates: yn.getState().templates.map(
                    (h) => h.stem === o.stem ? { ...h, order: c } : h
                  )
                }),
                yS
              ).finally(() => a(null));
            }
          },
          o.path
        ))
      ] })
    ] }),
    r.length > 0 && /* @__PURE__ */ w.jsx(ks, { tone: "info", title: `${r.length} template(s) have no saved load order`, children: "The app always sends the order explicitly, so a run works either way. The console version of the script prompts for it, which fails when its input is not a terminal." })
  ] });
}
function LR({ template: e, selected: i, busy: a, onSelect: r, onOrder: o }) {
  return /* @__PURE__ */ w.jsx(
    $e,
    {
      title: /* @__PURE__ */ w.jsxs("button", { type: "button", onClick: r, className: "text-left", children: [
        e.name,
        i && /* @__PURE__ */ w.jsx("span", { className: "ml-1.5 text-label-3", children: "selected" })
      ] }),
      subtitle: `${e.format}${e.pockets === void 0 ? "" : ` · ${e.pockets} pockets`}${e.order === void 0 ? " · no saved order" : ""}`,
      children: /* @__PURE__ */ w.jsx("span", { className: a ? "opacity-40" : "", children: /* @__PURE__ */ w.jsx(
        F_,
        {
          name: `order-${e.stem}`,
          "aria-label": `Load order for ${e.name}`,
          segments: jR,
          value: e.order ?? "col",
          onChange: o
        }
      ) })
    }
  );
}
function yS() {
}
function UR() {
  const e = we(), [i, a] = B.useState(null), r = B.useCallback(() => {
    const o = fe();
    o === null || e.outDir === null || o.listOutputs(e.outDir).then(a, () => a([]));
  }, [e.outDir]);
  return B.useEffect(r, [r]), e.outDir === null ? /* @__PURE__ */ w.jsx("div", { className: "grid place-items-center text-center", children: /* @__PURE__ */ w.jsxs("div", { children: [
    /* @__PURE__ */ w.jsx("p", { className: "m-0 text-[13px] font-[510] text-label", children: "No batches yet" }),
    /* @__PURE__ */ w.jsx("p", { className: "m-0 text-[11px] text-label-2", children: "Generated files appear here once a run has written some." })
  ] }) }) : /* @__PURE__ */ w.jsxs("div", { className: "grid content-start gap-4 overflow-y-auto", children: [
    /* @__PURE__ */ w.jsxs("div", { children: [
      /* @__PURE__ */ w.jsx(Za, { children: e.outDir }),
      /* @__PURE__ */ w.jsxs(Bs, { children: [
        (i ?? []).length === 0 && /* @__PURE__ */ w.jsx($e, { title: "Nothing in this folder yet" }),
        (i ?? []).map((o) => /* @__PURE__ */ w.jsx(
          $e,
          {
            title: o.name,
            subtitle: `${kR(o.sizeBytes)} · ${new Date(
              o.mtimeMs
            ).toLocaleTimeString()}`,
            children: /* @__PURE__ */ w.jsxs("span", { className: "flex gap-1.5", children: [
              /* @__PURE__ */ w.jsx(Le, { onClick: () => {
                fe()?.reveal(o.path);
              }, children: "Reveal" }),
              /* @__PURE__ */ w.jsx(Le, { onClick: () => {
                fe()?.open(o.path);
              }, children: "Open" })
            ] })
          },
          o.path
        ))
      ] })
    ] }),
    /* @__PURE__ */ w.jsx(Le, { onClick: r, wide: !1, children: "Refresh" })
  ] });
}
function kR(e) {
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${Math.round(e / 1024)} KB` : `${(e / (1024 * 1024)).toFixed(1)} MB`;
}
const BR = {
  ok: "bg-success",
  warn: "bg-warning",
  error: "bg-danger"
}, ZR = {
  ok: "Ready",
  warn: "Check",
  error: "Blocked"
};
function HR() {
  const { report: e, refresh: i } = OR();
  return /* @__PURE__ */ w.jsxs("div", { className: "grid content-start gap-4 overflow-y-auto", children: [
    /* @__PURE__ */ w.jsx($R, { report: e, refresh: i }),
    /* @__PURE__ */ w.jsx(PR, { onChange: i })
  ] });
}
function PR({ onChange: e }) {
  const [i, a] = B.useState(""), [r, o] = B.useState(""), [c, h] = B.useState(!1);
  B.useEffect(() => {
    fe()?.getSettings().then((m) => {
      a(m.pythonPath), o(m.pythonPath);
    }, vS);
  }, []);
  const d = (m) => {
    const p = fe();
    p !== null && (h(!0), p.setSettings({ pythonPath: m }).then(() => {
      o(m), e();
    }, vS).finally(() => h(!1)));
  };
  return /* @__PURE__ */ w.jsxs("div", { children: [
    /* @__PURE__ */ w.jsx(Za, { children: "Interpreter" }),
    /* @__PURE__ */ w.jsx(Bs, { children: /* @__PURE__ */ w.jsx(
      $e,
      {
        title: "Python",
        subtitle: r === "" ? "Searching the PATH automatically. Enter a full path to override." : "Overridden. Clear the field to search automatically again.",
        stacked: !0,
        children: /* @__PURE__ */ w.jsxs("span", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ w.jsx(
            Iu,
            {
              "aria-label": "Python interpreter path",
              value: i,
              onChange: a,
              placeholder: "/usr/local/bin/python3",
              disabled: c,
              mono: !0,
              width: 320
            }
          ),
          /* @__PURE__ */ w.jsx(Le, { onClick: () => d(i.trim()), disabled: c || i.trim() === r, children: "Use this" }),
          r !== "" && /* @__PURE__ */ w.jsx(
            Le,
            {
              onClick: () => {
                a(""), d("");
              },
              disabled: c,
              children: "Clear"
            }
          )
        ] })
      }
    ) })
  ] });
}
function vS() {
}
function $R({
  report: e,
  refresh: i
}) {
  if (e.state === "loading" || e.state === "idle")
    return /* @__PURE__ */ w.jsx("p", { className: "m-0 text-[13px] text-label-2", children: "Checking..." });
  if (e.state === "error")
    return /* @__PURE__ */ w.jsxs("div", { className: "grid content-start gap-3", children: [
      /* @__PURE__ */ w.jsx(ks, { tone: "warning", title: "Preflight is unavailable", children: e.message }),
      /* @__PURE__ */ w.jsx(Le, { onClick: i, children: "Try again" })
    ] });
  const a = e.value.checks.filter((r) => r.status === "error");
  return /* @__PURE__ */ w.jsxs("div", { className: "grid content-start gap-4", children: [
    /* @__PURE__ */ w.jsxs("div", { children: [
      /* @__PURE__ */ w.jsx(Za, { children: "Preflight" }),
      /* @__PURE__ */ w.jsx(Bs, { children: e.value.checks.map((r) => /* @__PURE__ */ w.jsx(
        $e,
        {
          title: /* @__PURE__ */ w.jsxs("span", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ w.jsx(
              "span",
              {
                "aria-hidden": !0,
                className: `h-2 w-2 shrink-0 rounded-full ${BR[r.status]}`
              }
            ),
            r.title
          ] }),
          subtitle: r.detail,
          children: /* @__PURE__ */ w.jsx(
            "span",
            {
              className: `text-[11px] leading-4 font-[510] ${r.status === "ok" ? "text-label-2" : "text-label"}`,
              children: ZR[r.status]
            }
          )
        },
        r.id
      )) })
    ] }),
    e.value.checks.filter((r) => r.fix !== void 0).map((r) => /* @__PURE__ */ w.jsxs(
      ks,
      {
        tone: r.status === "error" ? "error" : "warning",
        title: r.title,
        command: r.fix,
        children: [
          r.detail,
          " This app never installs anything on your behalf."
        ]
      },
      r.id
    )),
    a.length === 0 && /* @__PURE__ */ w.jsx(ks, { tone: "info", title: "Ready to generate", children: "Everything the generator needs is present on this machine." }),
    /* @__PURE__ */ w.jsx(Le, { onClick: i, children: "Re-check" })
  ] });
}
const ld = 2, GR = 20, YR = B.memo(function({
  pockets: i,
  timeline: a,
  size: r = 64,
  maxHeight: o = 64
}) {
  const c = new Set(i.map((p) => Math.round(p.cx))).size, h = Math.max(1, Math.ceil(i.length / Math.max(1, c))), d = [...i].sort((p, g) => p.cy - g.cy || p.cx - g.cx), m = Math.max(
    3,
    Math.min(
      GR,
      (r - (c - 1) * ld) / c,
      (o - (h - 1) * ld) / h
    )
  );
  return /* @__PURE__ */ w.jsx(
    "div",
    {
      className: "mx-auto grid gap-[2px]",
      style: {
        width: c * m + (c - 1) * ld,
        gridTemplateColumns: `repeat(${c}, ${String(m)}px)`,
        gridTemplateRows: `repeat(${h}, ${String(m)}px)`
      },
      "aria-hidden": !0,
      children: d.map((p) => /* @__PURE__ */ w.jsx(IR, { index: p.index, timeline: a }, p.index))
    }
  );
}), IR = B.memo(function({ index: i, timeline: a }) {
  const r = B.useRef(null);
  return B.useEffect(() => {
    const o = {
      setSerial() {
      },
      setProgress(c) {
        const h = r.current;
        h !== null && (h.style.backgroundColor = "var(--engrave)", h.style.opacity = String(0.25 + c * 0.75));
      },
      setPlaceholder() {
      },
      setHidden(c) {
        const h = r.current;
        if (h !== null) {
          if (c === 0) {
            h.style.backgroundColor = "var(--fill-strong)", h.style.opacity = "1";
            return;
          }
          h.style.backgroundColor = "var(--fill-strong)", h.style.opacity = String(1 - c * 0.7);
        }
      }
    };
    return a.register(i, o);
  }, [a, i]), /* @__PURE__ */ w.jsx(
    "span",
    {
      ref: r,
      "data-cell": i,
      className: "rounded-[2px]",
      style: { backgroundColor: "var(--fill-strong)" }
    }
  );
});
function qR(e) {
  B.useEffect(() => {
    const h = fe();
    if (h === null) return;
    const d = yn.getState();
    h.listTemplates().then((m) => {
      d.hydrate({ templates: m }), yn.getState().templatePath === null && m[0] !== void 0 && d.set("templatePath", m[0].path);
    }, Xr), h.defaultSerialFile().then((m) => {
      d.hydrate({ defaultCsvPath: m }), yn.getState().csvPath === null && m !== null && d.set("csvPath", m);
    }, Xr), h.getSettings().then((m) => {
      const p = yn.getState();
      d.hydrate({
        prefix: m.prefix === "" ? p.prefix : m.prefix,
        order: m.order,
        ...m.lastTemplatePath === "" ? {} : { templatePath: m.lastTemplatePath },
        ...m.lastCsvPath === "" ? {} : { csvPath: m.lastCsvPath }
      });
    }, Xr);
  }, []);
  const i = yn((h) => h.templatePath), { preview: a } = e;
  B.useEffect(() => {
    const h = fe();
    if (h === null || i === null) return;
    let d = !0;
    return h.inspectTemplate(i).then((m) => {
      !d || "error" in m || a(m);
    }, Xr), () => {
      d = !1;
    };
  }, [i, a]);
  const { prefix: r, order: o, csvPath: c } = yn();
  B.useEffect(() => {
    const h = fe();
    h !== null && h.setSettings({
      prefix: r,
      order: o,
      ...i === null ? {} : { lastTemplatePath: i },
      ...c === null ? {} : { lastCsvPath: c }
    }).catch(Xr);
  }, [r, o, i, c]);
}
function Xr() {
}
const XR = {
  showProtocol: !1,
  query: "",
  levels: /* @__PURE__ */ new Set()
}, KR = 2e4, FR = typeof requestAnimationFrame == "function" ? (e) => {
  const i = requestAnimationFrame(e);
  return () => cancelAnimationFrame(i);
} : (e) => {
  const i = setTimeout(e, 16);
  return () => clearTimeout(i);
};
class QR {
  capacity;
  schedule;
  ring;
  /** How many entries have ever been appended, across evictions. */
  total = 0;
  droppedCount = 0;
  version = 0;
  filter = XR;
  /**
   * Sequence numbers that pass the filter, oldest first.
   *
   * Kept incrementally rather than recomputed: filtering 20000 rows on every
   * frame is the other way to lose the main thread. Evicted entries leave dead
   * values at the front, skipped with a cursor and compacted occasionally, so
   * eviction stays amortised constant rather than shifting the array.
   */
  matches = [];
  matchStart = 0;
  listeners = /* @__PURE__ */ new Set();
  cancelPending = null;
  constructor(i = KR, a = FR) {
    if (!Number.isInteger(i) || i < 1)
      throw new RangeError(`capacity must be a positive integer, got ${i}`);
    this.capacity = i, this.schedule = a, this.ring = new Array(i);
  }
  /* --------------------------------------------------------------------- *
   * Writing
   * --------------------------------------------------------------------- */
  /**
   * Append the loggable events from one IPC batch.
   *
   * `started` and `exit` are the run's state, not its output, and belong to the
   * run store; they are ignored here rather than printed as pseudo-lines.
   */
  append(i) {
    let a = !1;
    for (const r of i)
      if (r.type === "line")
        this.push({
          seq: this.total,
          kind: "line",
          level: r.level,
          text: r.text,
          at: r.at,
          stream: r.stream
        }), a = !0;
      else if (r.type === "proto") {
        const { text: o, level: c } = PM(r.event);
        this.push({
          seq: this.total,
          kind: "proto",
          level: c,
          text: o,
          at: r.at,
          event: r.event
        }), a = !0;
      }
    a && this.notify();
  }
  push(i) {
    const a = this.total - this.capacity;
    this.ring[this.total % this.capacity] = i, this.total += 1, a >= 0 && (this.droppedCount += 1);
    const r = this.total - this.capacity;
    for (; ; ) {
      const o = this.matches[this.matchStart];
      if (o === void 0 || o >= r) break;
      this.matchStart += 1;
    }
    this.matchStart > 4096 && this.matchStart * 2 > this.matches.length && (this.matches = this.matches.slice(this.matchStart), this.matchStart = 0), this.passes(i) && this.matches.push(i.seq);
  }
  clear() {
    this.ring.fill(void 0), this.total = 0, this.droppedCount = 0, this.matches = [], this.matchStart = 0, this.notifyNow();
  }
  /* --------------------------------------------------------------------- *
   * Filtering
   * --------------------------------------------------------------------- */
  setFilter(i) {
    this.filter = i, this.rebuild(), this.notifyNow();
  }
  getFilter() {
    return this.filter;
  }
  passes(i) {
    const { showProtocol: a, query: r, levels: o } = this.filter;
    return i.kind === "proto" && !a || o.size > 0 && !o.has(i.level) ? !1 : r !== "" ? i.text.toLowerCase().includes(r.toLowerCase()) : !0;
  }
  /** Recompute the match list over whatever the ring still holds. */
  rebuild() {
    const i = [], a = Math.max(0, this.total - this.capacity);
    for (let r = a; r < this.total; r += 1) {
      const o = this.ring[r % this.capacity];
      o !== void 0 && this.passes(o) && i.push(r);
    }
    this.matches = i, this.matchStart = 0;
  }
  /* --------------------------------------------------------------------- *
   * Reading
   * --------------------------------------------------------------------- */
  /**
   * The snapshot React subscribes to: a number, not the rows.
   *
   * useSyncExternalStore compares snapshots by identity and would loop forever
   * on a freshly built array. A counter is stable between notifications and
   * costs nothing to produce.
   */
  getVersion = () => this.version;
  /** How many rows the current filter admits. */
  visibleCount() {
    return this.matches.length - this.matchStart;
  }
  /** The nth visible row, oldest first, or undefined when out of range. */
  visibleAt(i) {
    const a = this.matches[this.matchStart + i];
    if (a !== void 0)
      return this.ring[a % this.capacity];
  }
  /** Every row the buffer holds, regardless of filter. Used by tests. */
  get length() {
    return Math.min(this.total, this.capacity);
  }
  /** How many rows were dropped to stay within capacity. */
  get dropped() {
    return this.droppedCount;
  }
  /** Total appended over the run's life, including dropped rows. */
  get appended() {
    return this.total;
  }
  /**
   * The visible rows as text, for Copy.
   *
   * Built on demand and never cached: it is one user action, and caching it
   * would mean invalidating on every append.
   */
  toText() {
    const i = [];
    for (let a = 0; a < this.visibleCount(); a += 1) {
      const r = this.visibleAt(a);
      r !== void 0 && i.push(r.text);
    }
    return i.join(`
`);
  }
  /* --------------------------------------------------------------------- *
   * Subscription
   * --------------------------------------------------------------------- */
  subscribe = (i) => (this.listeners.add(i), () => {
    this.listeners.delete(i), this.listeners.size === 0 && this.cancelPending !== null && (this.cancelPending(), this.cancelPending = null);
  });
  /**
   * One notification per frame, however many appends happened in it.
   *
   * This is the whole reason the console can keep up: the arrival rate is set
   * by the script, the render rate is set by the display.
   */
  notify() {
    this.cancelPending === null && (this.cancelPending = this.schedule(() => {
      this.cancelPending = null, this.version += 1;
      for (const i of this.listeners) i();
    }));
  }
  /**
   * Notify without waiting for a frame.
   *
   * Coalescing exists for APPENDS, which arrive in bursts nobody asked for.
   * Typing in the filter box or hitting Clear is a direct manipulation, and a
   * frame of latency on one of those is the kind of lag Apple's guidance calls
   * the moment directness falls away. It also keeps the control and the list
   * in the same React commit, so they can never disagree.
   */
  notifyNow() {
    this.cancelPending !== null && (this.cancelPending(), this.cancelPending = null), this.version += 1;
    for (const i of this.listeners) i();
  }
  /** Deliver any pending append notification immediately. For tests. */
  flush() {
    this.cancelPending !== null && this.notifyNow();
  }
}
function $d(e) {
  const i = Object.values(e).filter((r) => typeof r == "number");
  return Object.entries(e).filter(([r, o]) => i.indexOf(+r) === -1).map(([r, o]) => o);
}
function bS(e, i = "|") {
  return e.map((a) => uT(a)).join(i);
}
function Gd(e, i) {
  return typeof i == "bigint" ? i.toString() : i;
}
class JR {
  constructor(i) {
    this._getter = i, this._value = void 0;
  }
  get value() {
    const i = this._getter;
    return i !== void 0 && (this._value = i(), this._getter = void 0), this._value;
  }
}
function qu(e) {
  return new JR(e);
}
function WR(e) {
  return e == null;
}
function Nm(e) {
  const i = e.startsWith("^") ? 1 : 0, a = e.endsWith("$") ? e.length - 1 : e.length;
  return e.slice(i, a);
}
function tD(e, i) {
  const a = e / i, r = Math.round(a), o = 4 * Number.EPSILON * Math.max(Math.abs(a), 1);
  return Math.abs(a - r) < o ? 0 : a - r;
}
function xi(e, i, a) {
  Object.defineProperty(e, i, {
    value: a,
    writable: !0,
    enumerable: !0,
    configurable: !0
  });
}
function jm(e) {
  const i = Object.getOwnPropertyDescriptor(e, "shape");
  return i?.get ? i.get.raw : i?.value;
}
function Ti(e) {
  return jm(e._zod.def) ?? e._zod.def.shape;
}
function aT(e, i, a) {
  Object.defineProperty(e, i, {
    get() {
      const r = a();
      return xi(this, i, r), r;
    },
    enumerable: !0,
    configurable: !0
  });
}
function rT(e, i, a) {
  i in e ? xi(e, i, a) : e[i] = a;
}
function Hs(e, i, a, r) {
  const o = Ti(i);
  for (const c of a) {
    const h = Object.getOwnPropertyDescriptor(o, c);
    h.enumerable && (h.get ? aT(e, c, () => {
      const d = i._zod.def.shape[c];
      return r ? r(d, c) : d;
    }) : rT(e, c, r ? r(h.value, c) : h.value));
  }
}
function eD(e, i) {
  for (const a of Reflect.ownKeys(i)) {
    const r = Object.getOwnPropertyDescriptor(i, a);
    r.enumerable && (r.get ? aT(e, a, () => i[a]) : rT(e, a, r.value));
  }
}
function an(...e) {
  const i = {};
  for (const a of e) {
    const r = Object.getOwnPropertyDescriptors(a);
    Object.assign(i, r);
  }
  return Object.defineProperties({}, i);
}
function nD(e) {
  return JSON.stringify(e);
}
function iD(e) {
  return e.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
const lT = "captureStackTrace" in Error ? Error.captureStackTrace : (...e) => {
};
function hl(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
const sD = /* @__PURE__ */ qu(() => {
  if (_n.jitless || typeof navigator < "u" && navigator?.userAgent?.includes("Cloudflare"))
    return !1;
  try {
    const e = Function;
    return new e(""), !0;
  } catch {
    return !1;
  }
});
function Ha(e) {
  if (hl(e) === !1)
    return !1;
  const i = e.constructor;
  if (i === void 0 || typeof i != "function")
    return !0;
  const a = i.prototype;
  return !(hl(a) === !1 || Object.prototype.hasOwnProperty.call(a, "isPrototypeOf") === !1);
}
function oT(e) {
  return Ha(e) ? { ...e } : Array.isArray(e) ? [...e] : e instanceof Map ? new Map(e) : e instanceof Set ? new Set(e) : e;
}
const aD = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
function Pa(e) {
  return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function rs(e, i, a) {
  const r = new e._zod.constr(i ?? e._zod.def);
  return (!i || a?.parent) && (r._zod.parent = e), r;
}
function at(e) {
  const i = e;
  if (!i)
    return {};
  if (typeof i == "string")
    return { error: () => i };
  if (i?.message !== void 0) {
    if (i?.error !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    i.error = i.message;
  }
  return delete i.message, typeof i.error == "string" ? { ...i, error: () => i.error } : i;
}
function uT(e) {
  return typeof e == "bigint" ? e.toString() + "n" : typeof e == "string" ? `"${e}"` : `${e}`;
}
function rD(e) {
  return Object.keys(e).filter((i) => e[i]._zod.optin !== void 0 && e[i]._zod.optout === "optional");
}
const cT = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-34028234663852886e22, 34028234663852886e22],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
}, lD = {
  int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
  uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
};
function oD(e, i) {
  const a = e._zod.def, r = a.checks;
  if (r && r.length > 0)
    throw new Error(".pick() cannot be used on object schemas containing refinements");
  const c = {};
  return Hs(c, e, Xu(e, i)), rs(e, an(a, { shape: c, checks: [] }));
}
function Xu(e, i) {
  const a = Ti(e), r = [];
  for (const o of Reflect.ownKeys(i)) {
    if (!Object.getOwnPropertyDescriptor(a, o)?.enumerable)
      throw new Error(`Unrecognized key: "${String(o)}"`);
    i[o] && r.push(o);
  }
  return r;
}
function uD(e, i) {
  const a = e._zod.def, r = a.checks;
  if (r && r.length > 0)
    throw new Error(".omit() cannot be used on object schemas containing refinements");
  const c = new Set(Xu(e, i)), h = {};
  return Hs(h, e, Reflect.ownKeys(Ti(e)).filter((d) => !c.has(d))), rs(e, an(a, { shape: h, checks: [] }));
}
function cD(e, i) {
  if (!Ha(i))
    throw new Error("Invalid input to extend: expected a plain object");
  const a = e._zod.def.checks;
  if (a && a.length > 0) {
    const o = Ti(e);
    for (const c of Reflect.ownKeys(i))
      if (Object.getOwnPropertyDescriptor(o, c) !== void 0)
        throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
  }
  return rs(e, an(e._zod.def, { shape: fT(e, i) }));
}
function fT(e, i) {
  const a = {};
  return Hs(a, e, Reflect.ownKeys(Ti(e))), eD(a, i), a;
}
function fD(e, i) {
  if (!Ha(i))
    throw new Error("Invalid input to safeExtend: expected a plain object");
  return rs(e, an(e._zod.def, { shape: fT(e, i) }));
}
function hD(e, i) {
  if (!i?._zod?.def)
    throw new Error("Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.");
  if (e._zod.def.checks?.length)
    throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
  const a = {};
  Hs(a, e, Reflect.ownKeys(Ti(e))), Hs(a, i, Reflect.ownKeys(Ti(i)));
  const r = an(e._zod.def, {
    shape: a,
    get catchall() {
      return i._zod.def.catchall;
    },
    checks: i._zod.def.checks ?? []
  });
  return rs(e, r);
}
function SS(e, i, a, r = "partial") {
  const c = i._zod.def.checks;
  if (c && c.length > 0)
    throw new Error(`.${r}() cannot be used on object schemas containing refinements`);
  const d = a ? new Set(Xu(i, a)) : void 0, m = {};
  return Hs(m, i, Reflect.ownKeys(Ti(i)), e && ((p, g) => d && !d.has(g) ? p : new e({ type: "optional", innerType: p }))), rs(i, an(i._zod.def, { shape: m, checks: [] }));
}
function dD(e, i, a) {
  const r = a ? new Set(Xu(i, a)) : void 0, o = {};
  return Hs(o, i, Reflect.ownKeys(Ti(i)), (c, h) => (
    // overwrite with non-optional
    r && !r.has(h) ? c : new e({ type: "nonoptional", innerType: c })
  )), rs(i, an(i._zod.def, { shape: o }));
}
function Dn(e, i = 0) {
  if (e.aborted === !0)
    return !0;
  for (let a = i; a < e.issues.length; a++)
    if (e.issues[a]?.continue !== !0)
      return !0;
  return !1;
}
function mD(e, i = 0) {
  if (e.aborted === !0)
    return !0;
  for (let a = i; a < e.issues.length; a++)
    if (e.issues[a]?.continue === !1)
      return !0;
  return !1;
}
function ts(e, i) {
  return i.map((a) => {
    var r;
    return (r = a).path ?? (r.path = []), a.path.unshift(e), a;
  });
}
function Kr(e) {
  return typeof e == "string" ? e : e?.message;
}
function _S(e, i, a) {
  var r;
  for (let o = i; o < e.length; o++)
    (r = e[o]).schema ?? (r.schema = a);
}
function ns(e, i, a) {
  var r;
  const o = e.inst?._zod?.traits;
  o?.has("$ZodType") && (o.has("$ZodCheck") ? (r = e).schema ?? (r.schema = e.inst) : e.schema = e.inst);
  const c = e.schema !== e.inst ? e.schema?._zod.def?.error : void 0, h = e.message ? e.message : Kr(e.inst?._zod.def?.error?.(e)) ?? Kr(c?.(e)) ?? Kr(i?.error?.(e)) ?? Kr(a.customError?.(e)) ?? Kr(a.localeError?.(e)) ?? "Invalid input", d = {};
  for (const m of Object.keys(e))
    m === "inst" || m === "schema" || m === "continue" || m === "input" || m === "__proto__" || (d[m] = e[m]);
  return d.path ?? (d.path = []), d.message = h, i?.reportInput && (d.input = e.input), d;
}
const pD = /[\uD800-\uDBFF]/;
function Vm(e) {
  const i = e.length;
  if (!pD.test(e))
    return i;
  let a = i;
  for (let r = 0; r < i - 1; r++)
    (e.charCodeAt(r) & 64512) === 55296 && (e.charCodeAt(r + 1) & 64512) === 56320 && (a--, r++);
  return a;
}
function Lm(e) {
  return Array.isArray(e) ? "array" : typeof e == "string" ? "string" : "unknown";
}
function gD(e) {
  const i = typeof e;
  switch (i) {
    case "number":
      return Number.isNaN(e) ? "nan" : "number";
    case "object": {
      if (e === null)
        return "null";
      if (Array.isArray(e))
        return "array";
      const a = e;
      if (a && Object.getPrototypeOf(a) !== Object.prototype && "constructor" in a && a.constructor)
        return a.constructor.name;
    }
  }
  return i;
}
function dl(...e) {
  const [i, a, r] = e;
  return typeof i == "string" ? {
    message: i,
    code: "custom",
    input: a,
    inst: r
  } : { ...i };
}
function yD(e, i) {
  for (const a in i) {
    const r = Object.getOwnPropertyDescriptor(i, a);
    r.get ? Object.defineProperty(e, a, { ...r, enumerable: !1 }) : vD(e, a, r.value);
  }
}
function is(e, i, a, r = !0) {
  return Object.defineProperty(e, i, { configurable: !0, writable: !0, enumerable: r, value: a }), a;
}
function hT(e, i, a) {
  return is(e, i, a, !1);
}
function dT(e, i) {
  for (const a in e) {
    const r = e[a];
    Object.defineProperty(i, a, {
      configurable: !0,
      enumerable: !0,
      get() {
        return is(this, a, r(this));
      },
      set(o) {
        is(this, a, o);
      }
    });
  }
  return i;
}
function vD(e, i, a) {
  Object.defineProperty(e, i, {
    configurable: !0,
    get() {
      return this == null ? a : is(this, i, a.bind(this));
    },
    set(r) {
      is(this, i, r);
    }
  });
}
function bD(e, i) {
  const a = Object.getPrototypeOf(e);
  return i in a ? void 0 : a;
}
let od, Wi = !1;
const SD = {
  configurable: !0,
  get() {
    Wi = !0;
  }
};
function Rt(e, i, a) {
  const r = Object.getPrototypeOf(e._zod);
  if (i in r && od !== e._zod) {
    od = void 0;
    return;
  }
  od = e._zod, Object.defineProperty(r, i, {
    configurable: !0,
    get() {
      Object.defineProperty(this, i, SD);
      const o = Wi;
      Wi = !1;
      try {
        const c = a(this);
        return Wi ? delete this[i] : Object.defineProperty(this, i, { configurable: !0, writable: !0, value: c }), Wi = Wi || o, c;
      } catch (c) {
        throw delete this[i], Wi = Wi || o, c;
      }
    },
    set(o) {
      Object.defineProperty(this, i, { configurable: !0, writable: !0, value: o });
    }
  });
}
function _D(e, i, a, r) {
  const o = bD(e, i);
  o && Object.defineProperty(o, i, {
    configurable: !0,
    get() {
      const c = { configurable: !0, writable: !0, enumerable: r, value: void 0 };
      return Object.defineProperty(this, i, c), c.value = a(this), Object.defineProperty(this, i, c), c.value;
    },
    set(c) {
      Object.defineProperty(this, i, { configurable: !0, writable: !0, enumerable: r, value: c });
    }
  });
}
const TD = "~constantCatch";
function xD(e) {
  const i = () => e;
  return i[TD] = !0, i;
}
var TS;
const ud = { value: void 0, enumerable: !1 };
let xS = "captureStackTrace" in Error ? Error : null;
function ED(e) {
  const i = xS;
  if (i) {
    const a = i.stackTraceLimit;
    if (typeof a == "number") {
      try {
        i.stackTraceLimit = 0;
      } catch {
        return xS = null, new e();
      }
      try {
        return new e();
      } finally {
        i.stackTraceLimit = a;
      }
    }
  }
  return new e();
}
function P(e, i, a, r) {
  const o = {};
  function c(b) {
    this.def = b, this.constr = v, this.traits = /* @__PURE__ */ new Set();
  }
  c.prototype = o;
  const h = a, d = h && /* @__PURE__ */ new WeakSet();
  function m(b, _) {
    if (b._zod) {
      if (b._zod.traits.has(e))
        return;
    } else {
      ud.value = new c(_);
      try {
        Object.defineProperty(b, "_zod", ud);
      } finally {
        ud.value = void 0;
      }
    }
    if (b._zod.traits.add(e), i(b, _), d) {
      const x = Object.getPrototypeOf(b), A = b._zod.constr.prototype;
      let N = x;
      for (; N && N !== A; )
        N = Object.getPrototypeOf(N);
      const D = N ?? x;
      d.has(D) || (d.add(D), yD(D, h));
    }
    const T = v.prototype;
    for (const x in T)
      Object.prototype.hasOwnProperty.call(T, x) && (x in b || (b[x] = T[x].bind(b)));
  }
  const p = r?.Parent ?? Object;
  class g extends p {
  }
  Object.defineProperty(g, "name", { value: e });
  function v(b) {
    const _ = r?.Parent ? ED(g) : this;
    m(_, b);
    const T = _._zod.deferred;
    if (T) {
      for (const A of T)
        A();
      _._zod.deferred = void 0;
    }
    const x = globalThis.__zod_globalConfig?.postProcessor;
    return x && x(_), _;
  }
  return Object.defineProperty(v, "init", { value: m }), Object.defineProperty(v, Symbol.hasInstance, {
    value: (b) => r?.Parent && b instanceof r.Parent ? !0 : b?._zod?.traits?.has(e)
  }), Object.defineProperty(v, "name", { value: e }), v;
}
class Zs extends Error {
  constructor() {
    super("Encountered Promise during synchronous parse. Use .parseAsync() instead.");
  }
}
class mT extends Error {
  constructor(i) {
    super(`Encountered unidirectional transform during encode: ${i}`), this.name = "ZodEncodeError";
  }
}
(TS = globalThis).__zod_globalConfig ?? (TS.__zod_globalConfig = {});
const _n = globalThis.__zod_globalConfig;
function ti(e) {
  return e && Object.assign(_n, e), _n;
}
function wD() {
  const e = this._zod;
  return e.message ?? (e.message = JSON.stringify(e.def, Gd, 2)), e.message;
}
function AD(e) {
  this._zod.message = e;
}
const OD = {
  get: wD,
  set: AD,
  enumerable: !0,
  configurable: !0
}, cd = { value: void 0, enumerable: !1 }, ES = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]), zD = (e, i) => {
  e.name = "$ZodError", cd.value = i, Object.defineProperty(e, "issues", cd), cd.value = void 0, Object.defineProperty(e, "message", OD);
  const a = Object.getPrototypeOf(e);
  ES.has(a) || (ES.add(a), Object.defineProperty(a, "toString", {
    configurable: !0,
    enumerable: !1,
    get() {
      const r = () => this.message;
      return Object.defineProperty(this, "toString", { value: r, configurable: !0, writable: !0 }), r;
    },
    set(r) {
      Object.defineProperty(this, "toString", { value: r, configurable: !0, writable: !0 });
    }
  }));
}, CD = P("$ZodError", zD);
function MD(e, i, a) {
  return Object.prototype.hasOwnProperty.call(e, i) || (i === "__proto__" ? Object.defineProperty(e, i, { value: a(), writable: !0, enumerable: !0, configurable: !0 }) : e[i] = a()), e[i];
}
function RD(e, i = (a) => a.message) {
  const a = {}, r = [];
  for (const o of e.issues)
    o.path.length > 0 ? MD(a, o.path[0], () => []).push(i(o)) : r.push(i(o));
  return { formErrors: r, fieldErrors: a };
}
function DD(e, i = (a) => a.message) {
  const a = { _errors: [] }, r = (o, c = []) => {
    for (const h of o.issues)
      if (h.code === "invalid_union" && h.errors.length)
        h.errors.map((d) => r({ issues: d }, [...c, ...h.path]));
      else if (h.code === "invalid_key")
        r({ issues: h.issues }, [...c, ...h.path]);
      else if (h.code === "invalid_element")
        r({ issues: h.issues }, [...c, ...h.path]);
      else {
        const d = [...c, ...h.path];
        if (d.length === 0)
          a._errors.push(i(h));
        else {
          let m = a, p = 0;
          for (; p < d.length; ) {
            const g = d[p], v = p === d.length - 1;
            if (g === "_errors") {
              v && m._errors.push(i(h)), p++;
              continue;
            }
            Object.prototype.hasOwnProperty.call(m, g) || Object.defineProperty(m, g, {
              value: { _errors: [] },
              enumerable: !0,
              writable: !0,
              configurable: !0
            });
            const b = m[g];
            v && b._errors.push(i(h)), m = b, p++;
          }
        }
      }
  };
  return r(e), a;
}
function Ku(e, i) {
  return { callee: i?.callee ?? e, Err: i?.Err };
}
const Um = (e) => {
  const i = (a, r, o, c) => {
    const h = o ? { ...o, async: !1 } : { async: !1 }, d = a._zod.run({ value: r, issues: [] }, h);
    if (d instanceof Promise)
      throw new Zs();
    if (d.issues.length) {
      const m = new (c?.Err ?? e)(d.issues.map((p) => ns(p, h, ti())));
      throw lT(m, c?.callee ?? i), m;
    }
    return d.value;
  };
  return i;
}, km = (e) => {
  const i = async (a, r, o, c) => {
    const h = o ? { ...o, async: !0 } : { async: !0 };
    let d = a._zod.run({ value: r, issues: [] }, h);
    if (d instanceof Promise && (d = await d), d.issues.length) {
      const m = new (c?.Err ?? e)(d.issues.map((p) => ns(p, h, ti())));
      throw lT(m, c?.callee ?? i), m;
    }
    return d.value;
  };
  return i;
}, Bm = (e) => (i, a, r) => {
  const o = r ? { ...r, async: !1 } : { async: !1 }, c = i._zod.run({ value: a, issues: [] }, o);
  if (c instanceof Promise)
    throw new Zs();
  return c.issues.length ? pT(e, c.issues, o) : { success: !0, data: c.value };
};
function pT(e, i, a) {
  let r;
  return {
    success: !1,
    get error() {
      return r || (r = new e(i.map((o) => ns(o, a, ti()))), i = void 0, a = void 0), r;
    },
    set error(o) {
      r = o, i = void 0, a = void 0;
    }
  };
}
const Zm = (e) => async (i, a, r) => {
  const o = r ? { ...r, async: !0 } : { async: !0 };
  let c = i._zod.run({ value: a, issues: [] }, o);
  return c instanceof Promise && (c = await c), c.issues.length ? pT(e, c.issues, o) : { success: !0, data: c.value };
}, ND = /* @__PURE__ */ Symbol.for("zod.compile.invalid"), jD = /* @__PURE__ */ Symbol.for("zod.compile.fallback"), VD = ((e, i, a) => {
  const r = e._zod.bag.validator;
  if (r !== void 0) {
    if (r(i) !== ND)
      return !0;
    if (r.definite === !0 && a === void 0)
      return !1;
  }
  return LD(e, i, a);
});
function LD(e, i, a) {
  const r = a ? { ...a, async: !1, abortEarly: !0 } : { async: !1, abortEarly: !0 }, o = e._zod.bag.fallbackRun;
  let c;
  if (o ? (r[jD] = !0, c = o({ value: i, issues: [] }, r)) : c = e._zod.run({ value: i, issues: [] }, r), c instanceof Promise)
    throw new Zs();
  return c.issues.length === 0;
}
const UD = async (e, i, a) => {
  const r = a ? { ...a, async: !0, abortEarly: !0 } : { async: !0, abortEarly: !0 };
  let o = e._zod.run({ value: i, issues: [] }, r);
  return o instanceof Promise && (o = await o), o.issues.length === 0;
}, kD = (e) => {
  const i = Um(e), a = (r, o, c, h) => {
    const d = c ? { ...c, direction: "backward" } : { direction: "backward" };
    return i(r, o, d, Ku(a, h));
  };
  return a;
}, BD = (e) => {
  const i = Um(e), a = (r, o, c, h) => i(r, o, c, Ku(a, h));
  return a;
}, ZD = (e) => {
  const i = km(e), a = async (r, o, c, h) => {
    const d = c ? { ...c, direction: "backward" } : { direction: "backward" };
    return await i(r, o, d, Ku(a, h));
  };
  return a;
}, HD = (e) => {
  const i = km(e), a = async (r, o, c, h) => await i(r, o, c, Ku(a, h));
  return a;
}, PD = (e) => (i, a, r) => {
  const o = r ? { ...r, direction: "backward" } : { direction: "backward" };
  return Bm(e)(i, a, o);
}, $D = (e) => (i, a, r) => Bm(e)(i, a, r), GD = (e) => async (i, a, r) => {
  const o = r ? { ...r, direction: "backward" } : { direction: "backward" };
  return Zm(e)(i, a, o);
}, YD = (e) => async (i, a, r) => Zm(e)(i, a, r), ID = /^[cC][0-9a-z]{6,}$/, qD = /^[0-9a-z]+$/, XD = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/, KD = /^[0-9a-vA-V]{20}$/, FD = /^[A-Za-z0-9]{27}$/, QD = /^[a-zA-Z0-9_-]{21}$/;
function JD(e) {
  return new RegExp(`^[a-zA-Z0-9_-]{${e}}$`);
}
const WD = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/, tN = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/, wS = (e) => e ? new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${e}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`) : /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/, eN = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/, nN = "^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$";
function iN() {
  return new RegExp(nN, "u");
}
const sN = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, aN = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/, rN = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/, lN = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/, oN = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/, uN = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/, cN = /^https?$/, fN = /^\+[1-9]\d{6,14}$/, gT = "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))";
function hN(e) {
  return new RegExp(`^${e}$`);
}
const dN = /* @__PURE__ */ hN(gT);
function Yd(e) {
  const i = "(?:[01]\\d|2[0-3]):[0-5]\\d";
  return typeof e.precision == "number" ? e.precision === -1 ? `${i}` : e.precision === 0 ? `${i}:[0-5]\\d` : `${i}:[0-5]\\d\\.\\d{${e.precision}}` : e.seconds ? `${i}:[0-5]\\d(?:\\.\\d+)?` : `${i}(?::[0-5]\\d(?:\\.\\d+)?)?`;
}
function mN(e) {
  return new RegExp(`^${Yd(e)}$`);
}
function pN(e) {
  const i = ["Z"];
  e.offset && i.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
  const a = `${Yd({ precision: e.precision, seconds: !0 })}(?:${i.join("|")})`, r = e.local ? `${a}|${Yd({ precision: e.precision })}` : a;
  return new RegExp(`^${gT}T(?:${r})$`);
}
const gN = /^[\s\S]{0,}$/, yN = /^-?\d+$/, Hm = /^-?\d+(?:\.\d+)?$/, vN = /^(?:true|false)$/i, bN = /^[^A-Z]*$/, SN = /^[^a-z]*$/, Ye = /* @__PURE__ */ P("$ZodCheck", (e, i) => {
  var a;
  e._zod ?? (e._zod = {}), e._zod.def = i, (a = e._zod).onattach ?? (a.onattach = []);
}), Pm = (e) => {
  const i = e.value;
  return !WR(i) && i.length !== void 0;
}, ju = {
  number: "number",
  bigint: "bigint",
  object: "date"
}, yT = /* @__PURE__ */ P("$ZodCheckLessThan", (e, i) => {
  Ye.init(e, i);
  const a = ju[typeof i.value];
  e._zod.check = (r) => {
    (i.inclusive ? r.value <= i.value : r.value < i.value) || r.issues.push({
      origin: ju[typeof r.value] ?? a,
      code: "too_big",
      maximum: typeof i.value == "object" ? i.value.getTime() : i.value,
      input: r.value,
      inclusive: i.inclusive,
      inst: e,
      continue: !i.abort
    });
  };
}), vT = /* @__PURE__ */ P("$ZodCheckGreaterThan", (e, i) => {
  Ye.init(e, i);
  const a = ju[typeof i.value];
  e._zod.check = (r) => {
    (i.inclusive ? r.value >= i.value : r.value > i.value) || r.issues.push({
      origin: ju[typeof r.value] ?? a,
      code: "too_small",
      minimum: typeof i.value == "object" ? i.value.getTime() : i.value,
      input: r.value,
      inclusive: i.inclusive,
      inst: e,
      continue: !i.abort
    });
  };
}), _N = /* @__PURE__ */ P("$ZodCheckMultipleOf", (e, i) => {
  Ye.init(e, i), e._zod.check = (a) => {
    if (typeof a.value != typeof i.value)
      throw new Error("Cannot mix number and bigint in multiple_of check.");
    (typeof a.value == "bigint" ? (
      // `value % 0n` throws, and nothing is a multiple of zero — the number branch already fails this way via NaN
      i.value !== BigInt(0) && a.value % i.value === BigInt(0)
    ) : tD(a.value, i.value) === 0) || a.issues.push({
      origin: typeof a.value,
      code: "not_multiple_of",
      divisor: i.value,
      input: a.value,
      inst: e,
      continue: !i.abort
    });
  };
}), TN = /* @__PURE__ */ P("$ZodCheckNumberFormat", (e, i) => {
  Ye.init(e, i), i.format = i.format || "float64";
  const a = i.format?.includes("int"), r = a ? "int" : "number", [o, c] = cT[i.format];
  e._zod.check = (h) => {
    const d = h.value;
    if (a) {
      if (!Number.isInteger(d)) {
        h.issues.push({
          expected: r,
          format: i.format,
          code: "invalid_type",
          continue: !1,
          input: d,
          inst: e
        });
        return;
      }
      if (!Number.isSafeInteger(d)) {
        d > 0 ? h.issues.push({
          input: d,
          code: "too_big",
          maximum: Number.MAX_SAFE_INTEGER,
          note: "Integers must be within the safe integer range.",
          inst: e,
          origin: r,
          inclusive: !0,
          continue: !i.abort
        }) : h.issues.push({
          input: d,
          code: "too_small",
          minimum: Number.MIN_SAFE_INTEGER,
          note: "Integers must be within the safe integer range.",
          inst: e,
          origin: r,
          inclusive: !0,
          continue: !i.abort
        });
        return;
      }
    }
    d < o && h.issues.push({
      origin: "number",
      input: d,
      code: "too_small",
      minimum: o,
      inclusive: !0,
      inst: e,
      continue: !i.abort
    }), d > c && h.issues.push({
      origin: "number",
      input: d,
      code: "too_big",
      maximum: c,
      inclusive: !0,
      inst: e,
      continue: !i.abort
    });
  };
}), xN = /* @__PURE__ */ P("$ZodCheckMaxLength", (e, i) => {
  var a;
  Ye.init(e, i), (a = e._zod.def).when ?? (a.when = Pm), e._zod.check = (r) => {
    const o = r.value, c = o.length;
    if ((typeof o == "string" && c > i.maximum ? Vm(o) : c) <= i.maximum)
      return;
    const d = Lm(o);
    r.issues.push({
      origin: d,
      code: "too_big",
      maximum: i.maximum,
      inclusive: !0,
      input: o,
      inst: e,
      continue: !i.abort
    });
  };
}), EN = /* @__PURE__ */ P("$ZodCheckMinLength", (e, i) => {
  var a;
  Ye.init(e, i), (a = e._zod.def).when ?? (a.when = Pm), e._zod.check = (r) => {
    const o = r.value, c = o.length;
    if ((typeof o == "string" && c >= i.minimum && c < i.minimum * 2 ? Vm(o) : c) >= i.minimum)
      return;
    const d = Lm(o);
    r.issues.push({
      origin: d,
      code: "too_small",
      minimum: i.minimum,
      inclusive: !0,
      input: o,
      inst: e,
      continue: !i.abort
    });
  };
}), wN = /* @__PURE__ */ P("$ZodCheckLengthEquals", (e, i) => {
  var a;
  Ye.init(e, i), (a = e._zod.def).when ?? (a.when = Pm), e._zod.check = (r) => {
    const o = r.value, c = o.length, h = typeof o == "string" && c >= i.length && c <= i.length * 2 ? Vm(o) : c;
    if (h === i.length)
      return;
    const d = Lm(o), m = h > i.length;
    r.issues.push({
      origin: d,
      ...m ? { code: "too_big", maximum: i.length } : { code: "too_small", minimum: i.length },
      inclusive: !0,
      exact: !0,
      input: r.value,
      inst: e,
      continue: !i.abort
    });
  };
}), Fu = /* @__PURE__ */ P("$ZodCheckStringFormat", (e, i) => {
  var a, r;
  Ye.init(e, i), i.pattern ? (a = e._zod).check ?? (a.check = (o) => {
    i.pattern.lastIndex = 0, !i.pattern.test(o.value) && o.issues.push({
      origin: "string",
      code: "invalid_format",
      format: i.format,
      input: o.value,
      ...i.pattern ? { pattern: i.pattern.toString() } : {},
      inst: e,
      continue: !i.abort
    });
  }) : (r = e._zod).check ?? (r.check = () => {
  });
}), AN = /* @__PURE__ */ P("$ZodCheckRegex", (e, i) => {
  Fu.init(e, i), e._zod.check = (a) => {
    i.pattern.lastIndex = 0, !i.pattern.test(a.value) && a.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: a.value,
      pattern: i.pattern.toString(),
      inst: e,
      continue: !i.abort
    });
  };
}), ON = /* @__PURE__ */ P("$ZodCheckLowerCase", (e, i) => {
  i.pattern ?? (i.pattern = bN), Fu.init(e, i);
}), zN = /* @__PURE__ */ P("$ZodCheckUpperCase", (e, i) => {
  i.pattern ?? (i.pattern = SN), Fu.init(e, i);
}), CN = /* @__PURE__ */ P("$ZodCheckIncludes", (e, i) => {
  Ye.init(e, i);
  const a = Pa(i.includes), r = new RegExp(typeof i.position == "number" ? `^.{${i.position},}${a}` : a);
  i.pattern = r, e._zod.check = (o) => {
    o.value.includes(i.includes, i.position) || o.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: i.includes,
      input: o.value,
      inst: e,
      continue: !i.abort
    });
  };
}), MN = /* @__PURE__ */ P("$ZodCheckStartsWith", (e, i) => {
  Ye.init(e, i);
  const a = new RegExp(`^${Pa(i.prefix)}.*`);
  i.pattern ?? (i.pattern = a), e._zod.check = (r) => {
    r.value.startsWith(i.prefix) || r.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "starts_with",
      prefix: i.prefix,
      input: r.value,
      inst: e,
      continue: !i.abort
    });
  };
}), RN = /* @__PURE__ */ P("$ZodCheckEndsWith", (e, i) => {
  Ye.init(e, i);
  const a = new RegExp(`.*${Pa(i.suffix)}$`);
  i.pattern ?? (i.pattern = a), e._zod.check = (r) => {
    r.value.endsWith(i.suffix) || r.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "ends_with",
      suffix: i.suffix,
      input: r.value,
      inst: e,
      continue: !i.abort
    });
  };
}), DN = /* @__PURE__ */ P("$ZodCheckOverwrite", (e, i) => {
  Ye.init(e, i), e._zod.check = (a) => {
    a.value = i.tx(a.value);
  };
});
class NN {
  constructor(i = [], a = {}) {
    this.content = [], this.indent = 0, this.args = i, this.closed = a;
  }
  // the compiler catches a child's throw and keeps writing into this doc, so the indent has to unwind with it
  indented(i) {
    this.indent += 1;
    try {
      i(this);
    } finally {
      this.indent -= 1;
    }
  }
  write(i) {
    if (typeof i == "function") {
      i(this, { execution: "sync" }), i(this, { execution: "async" });
      return;
    }
    const r = i.split(`
`).filter((h) => h), o = Math.min(...r.map((h) => h.length - h.trimStart().length)), c = r.map((h) => h.slice(o)).map((h) => " ".repeat(this.indent * 2) + h);
    for (const h of c)
      this.content.push(h);
  }
  compile() {
    const i = Function, a = this?.content ?? [""];
    return new i(...Object.keys(this.closed), `return function (${this.args.join(", ")}) {
${a.join(`
`)}
};`)(...Object.values(this.closed));
  }
}
const jN = {
  major: 4,
  minor: 6,
  patch: 5
}, Gt = /* @__PURE__ */ P("$ZodType", (e, i) => {
  var a;
  e ?? (e = {}), e._zod.def = i, e._zod.bag = e._zod.bag || {}, e._zod.version = jN;
  const r = e._zod.def.checks, o = e._zod.traits.has("$ZodCheck") ? [e, ...r ?? []] : r?.length ? [...r] : [];
  for (const c of o)
    for (const h of c._zod.onattach)
      h(e);
  if (o.length === 0)
    (a = e._zod).deferred ?? (a.deferred = []), e._zod.deferred?.push(() => {
      e._zod.run = e._zod.parse;
    });
  else {
    const c = (d, m, p) => {
      if (d.memo)
        return d;
      let g = Dn(d), v;
      for (const b of m) {
        if (b._zod.def.when) {
          if (mD(d) || !b._zod.def.when(d))
            continue;
        } else if (g)
          continue;
        const _ = d.issues.length, T = b._zod.check(d);
        if (T instanceof Promise && p?.async === !1)
          throw new Zs();
        if (v || T instanceof Promise)
          v = (v ?? Promise.resolve()).then(async () => {
            await T, d.issues.length !== _ && (_S(d.issues, _, e), g || (g = Dn(d, _)));
          });
        else {
          if (d.issues.length === _)
            continue;
          _S(d.issues, _, e), g || (g = Dn(d, _));
        }
      }
      return v ? v.then(() => d) : d;
    }, h = (d, m, p) => {
      if (Dn(d))
        return d.aborted = !0, d;
      const g = c(m, o, p);
      if (g instanceof Promise) {
        if (p.async === !1)
          throw new Zs();
        return g.then((v) => e._zod.parse(v, p));
      }
      return e._zod.parse(g, p);
    };
    e._zod.run = (d, m) => {
      if (m.skipChecks)
        return e._zod.parse(d, m);
      if (m.direction === "backward") {
        const g = e._zod.parse({ value: d.value, issues: [] }, { ...m, skipChecks: !0 });
        return g instanceof Promise ? g.then((v) => h(v, d, m)) : h(g, d, m);
      }
      const p = e._zod.parse(d, m);
      if (p instanceof Promise) {
        if (m.async === !1)
          throw new Zs();
        return p.then((g) => c(g, o, m));
      }
      return c(p, o, m);
    };
  }
}, {
  // Wrappers extend this by installing a richer factory over it; reading it eagerly would defeat the laziness.
  get "~standard"() {
    return hT(this, "~standard", ST(this));
  },
  set "~standard"(e) {
    is(this, "~standard", e);
  }
}), bT = (e, i) => e.issues.length ? { issues: e.issues.map((a) => ns(a, i, ti())) } : { value: e.value };
async function VN(e, i) {
  const a = { async: !0 };
  return bT(await e._zod.run({ value: i, issues: [] }, a), a);
}
function ST(e) {
  return {
    validate: (i) => {
      const a = { async: !1 };
      try {
        const r = e._zod.run({ value: i, issues: [] }, a);
        if (!(r instanceof Promise))
          return bT(r, a);
      } catch {
      }
      return VN(e, i);
    },
    vendor: "zod",
    version: 1
  };
}
const $m = /* @__PURE__ */ P("$ZodString", (e, i) => {
  Gt.init(e, i), e._zod.pattern = i.pattern ?? gN, e._zod.parse = (a, r) => {
    if (i.coerce)
      try {
        a.value = String(a.value);
      } catch {
      }
    return typeof a.value == "string" || a.issues.push({
      expected: "string",
      code: "invalid_type",
      input: a.value,
      inst: e
    }), a;
  };
}), It = /* @__PURE__ */ P("$ZodStringFormat", (e, i) => {
  Fu.init(e, i), $m.init(e, i);
}), LN = /* @__PURE__ */ P("$ZodGUID", (e, i) => {
  i.pattern ?? (i.pattern = tN), It.init(e, i);
}), UN = /* @__PURE__ */ P("$ZodUUID", (e, i) => {
  if (i.version) {
    const r = {
      v1: 1,
      v2: 2,
      v3: 3,
      v4: 4,
      v5: 5,
      v6: 6,
      v7: 7,
      v8: 8
    }[i.version];
    if (r === void 0)
      throw new Error(`Invalid UUID version: "${i.version}"`);
    i.pattern ?? (i.pattern = wS(r));
  } else
    i.pattern ?? (i.pattern = wS());
  It.init(e, i);
}), kN = /* @__PURE__ */ P("$ZodEmail", (e, i) => {
  i.pattern ?? (i.pattern = eN), It.init(e, i);
}), _T = 1, Vu = 2;
function TT(e) {
  try {
    return typeof URL < "u" && typeof URL.canParse == "function" ? URL.canParse(e) : (new URL(e), !0);
  } catch {
    return !1;
  }
}
function BN(e, i) {
  return !("normalize" in i) && !("hostname" in i) && !("protocol" in i) ? TT(e) || Vu : ZN(e, i);
}
function ZN(e, i) {
  if (!i.normalize && i.protocol?.source === cN.source && !/^https?:\/\//i.test(e))
    return _T;
  try {
    if (typeof URL < "u") {
      const a = URL;
      if (typeof a.parse == "function")
        return a.parse(e) ?? Vu;
    }
    return new URL(e);
  } catch {
    return Vu;
  }
}
const HN = /[\t\n\r]/g;
function AS(e) {
  return e.replace(HN, "");
}
function PN(e, i) {
  return i.lastIndex = 0, i.test(e.hostname);
}
function $N(e, i) {
  return i.lastIndex = 0, i.test(e.protocol.endsWith(":") ? e.protocol.slice(0, -1) : e.protocol);
}
const GN = /* @__PURE__ */ P("$ZodURL", (e, i) => {
  It.init(e, i), e._zod.check = (a) => {
    try {
      const r = a.value.trim(), o = BN(r, i);
      if (o === _T) {
        a.issues.push({
          code: "invalid_format",
          format: "url",
          note: "Invalid URL format",
          input: a.value,
          inst: e,
          continue: !i.abort
        });
        return;
      }
      if (o === Vu) {
        a.issues.push({
          code: "invalid_format",
          format: "url",
          input: a.value,
          inst: e,
          continue: !i.abort
        });
        return;
      }
      if (o === !0) {
        a.value = AS(r);
        return;
      }
      i.hostname && !PN(o, i.hostname) && a.issues.push({
        code: "invalid_format",
        format: "url",
        note: "Invalid hostname",
        pattern: i.hostname.source,
        input: a.value,
        inst: e,
        continue: !i.abort
      }), i.protocol && !$N(o, i.protocol) && a.issues.push({
        code: "invalid_format",
        format: "url",
        note: "Invalid protocol",
        pattern: i.protocol.source,
        input: a.value,
        inst: e,
        continue: !i.abort
      }), a.value = i.normalize ? o.href : AS(r);
      return;
    } catch {
      a.issues.push({
        code: "invalid_format",
        format: "url",
        input: a.value,
        inst: e,
        continue: !i.abort
      });
    }
  };
}), YN = /* @__PURE__ */ P("$ZodEmoji", (e, i) => {
  i.pattern ?? (i.pattern = iN()), It.init(e, i);
}), IN = /* @__PURE__ */ P("$ZodNanoID", (e, i) => {
  if (i.length !== void 0 && (!Number.isInteger(i.length) || i.length < 1))
    throw new Error(`Invalid nanoid length: ${i.length}`);
  i.pattern ?? (i.pattern = i.length === void 0 ? QD : JD(i.length)), It.init(e, i);
}), qN = /* @__PURE__ */ P("$ZodCUID", (e, i) => {
  i.pattern ?? (i.pattern = ID), It.init(e, i);
}), XN = /* @__PURE__ */ P("$ZodCUID2", (e, i) => {
  i.pattern ?? (i.pattern = qD), It.init(e, i);
}), KN = /* @__PURE__ */ P("$ZodULID", (e, i) => {
  i.pattern ?? (i.pattern = XD), It.init(e, i);
}), FN = /* @__PURE__ */ P("$ZodXID", (e, i) => {
  i.pattern ?? (i.pattern = KD), It.init(e, i);
}), QN = /* @__PURE__ */ P("$ZodKSUID", (e, i) => {
  i.pattern ?? (i.pattern = FD), It.init(e, i);
}), JN = /* @__PURE__ */ P("$ZodISODateTime", (e, i) => {
  i.pattern ?? (i.pattern = pN(i)), It.init(e, i);
}), WN = /* @__PURE__ */ P("$ZodISODate", (e, i) => {
  i.pattern ?? (i.pattern = dN), It.init(e, i);
}), t3 = /* @__PURE__ */ P("$ZodISOTime", (e, i) => {
  i.pattern ?? (i.pattern = mN(i)), It.init(e, i);
}), e3 = /* @__PURE__ */ P("$ZodISODuration", (e, i) => {
  i.pattern ?? (i.pattern = WD), It.init(e, i);
}), n3 = /* @__PURE__ */ P("$ZodIPv4", (e, i) => {
  i.pattern ?? (i.pattern = sN), It.init(e, i);
}), i3 = /^[0-9a-fA-F:.]+$/;
function xT(e) {
  return i3.test(e) ? TT(`http://[${e}]`) : !1;
}
const s3 = /* @__PURE__ */ P("$ZodIPv6", (e, i) => {
  i.pattern ?? (i.pattern = aN), It.init(e, i), e._zod.check = (a) => {
    xT(a.value) || a.issues.push({
      code: "invalid_format",
      format: "ipv6",
      input: a.value,
      inst: e,
      continue: !i.abort
    });
  };
}), a3 = /* @__PURE__ */ P("$ZodCIDRv4", (e, i) => {
  i.pattern ?? (i.pattern = rN), It.init(e, i);
});
function r3(e) {
  const i = e.split("/");
  if (i.length !== 2)
    return !1;
  const [a, r] = i;
  if (!r)
    return !1;
  const o = Number(r);
  return `${o}` !== r || o < 0 || o > 128 ? !1 : xT(a);
}
const l3 = /* @__PURE__ */ P("$ZodCIDRv6", (e, i) => {
  i.pattern ?? (i.pattern = lN), It.init(e, i), e._zod.check = (a) => {
    r3(a.value) || a.issues.push({
      code: "invalid_format",
      format: "cidrv6",
      input: a.value,
      inst: e,
      continue: !i.abort
    });
  };
});
function ET(e) {
  if (e === "")
    return !0;
  if (/\s/.test(e) || e.length % 4 !== 0)
    return !1;
  try {
    return atob(e), !0;
  } catch {
    return !1;
  }
}
const wT = /^[0-9a-zA-Z+/]*={0,2}$/, o3 = /* @__PURE__ */ P("$ZodBase64", (e, i) => {
  i.pattern ?? (i.pattern = wT), It.init(e, i), e._zod.check = (a) => {
    ET(a.value) || a.issues.push({
      code: "invalid_format",
      format: "base64",
      input: a.value,
      inst: e,
      continue: !i.abort
    });
  };
}), Gm = /^[A-Za-z0-9_-]*$/;
function u3(e) {
  if (!Gm.test(e))
    return !1;
  const i = e.replace(/[-_]/g, (r) => r === "-" ? "+" : "/"), a = i.padEnd(Math.ceil(i.length / 4) * 4, "=");
  return ET(a);
}
const c3 = /* @__PURE__ */ P("$ZodBase64URL", (e, i) => {
  i.pattern ?? (i.pattern = Gm), It.init(e, i), e._zod.check = (a) => {
    u3(a.value) || a.issues.push({
      code: "invalid_format",
      format: "base64url",
      input: a.value,
      inst: e,
      continue: !i.abort
    });
  };
}), f3 = /* @__PURE__ */ P("$ZodE164", (e, i) => {
  i.pattern ?? (i.pattern = fN), It.init(e, i);
});
function h3(e, i = null) {
  try {
    const a = e.split(".");
    if (a.length !== 3)
      return !1;
    const [r] = a;
    if (!r)
      return !1;
    const o = JSON.parse(atob(r));
    return !("typ" in o && o?.typ !== "JWT" || !o.alg || i && (!("alg" in o) || o.alg !== i));
  } catch {
    return !1;
  }
}
const d3 = /* @__PURE__ */ P("$ZodJWT", (e, i) => {
  It.init(e, i), e._zod.check = (a) => {
    h3(a.value, i.alg) || a.issues.push({
      code: "invalid_format",
      format: "jwt",
      input: a.value,
      inst: e,
      continue: !i.abort
    });
  };
}), AT = /* @__PURE__ */ P("$ZodNumber", (e, i) => {
  Gt.init(e, i), e._zod.pattern = Hm, e._zod.parse = (a, r) => {
    if (i.coerce)
      try {
        a.value = Number(a.value);
      } catch {
      }
    const o = a.value;
    if (typeof o == "number" && !Number.isNaN(o) && Number.isFinite(o))
      return a;
    const c = typeof o == "number" ? Number.isNaN(o) ? "NaN" : Number.isFinite(o) ? void 0 : String(o) : void 0;
    return a.issues.push({
      expected: "number",
      code: "invalid_type",
      input: o,
      inst: e,
      ...c ? { received: c } : {}
    }), a;
  };
}), m3 = /* @__PURE__ */ P("$ZodNumberFormat", (e, i) => {
  TN.init(e, i), AT.init(e, i);
}), p3 = /* @__PURE__ */ P("$ZodBoolean", (e, i) => {
  Gt.init(e, i), e._zod.pattern = vN, e._zod.parse = (a, r) => {
    if (i.coerce)
      try {
        a.value = !!a.value;
      } catch {
      }
    const o = a.value;
    return typeof o == "boolean" || a.issues.push({
      expected: "boolean",
      code: "invalid_type",
      input: o,
      inst: e
    }), a;
  };
}), g3 = /* @__PURE__ */ P("$ZodUnknown", (e, i) => {
  Gt.init(e, i), e._zod.parse = (a) => a;
}), y3 = /* @__PURE__ */ P("$ZodNever", (e, i) => {
  Gt.init(e, i), e._zod.parse = (a, r) => (a.issues.push({
    expected: "never",
    code: "invalid_type",
    input: a.value,
    inst: e
  }), a);
});
function OS(e, i, a) {
  e.issues.length && i.issues.push(...ts(a, e.issues)), i.value[a] = e.value;
}
const v3 = /* @__PURE__ */ P("$ZodArray", (e, i) => {
  Gt.init(e, i);
  const a = _n.memoizer;
  a?.attach(e), e._zod.parse = (r, o) => {
    const c = r.value;
    if (!Array.isArray(c))
      return r.issues.push({
        expected: "array",
        code: "invalid_type",
        input: c,
        inst: e
      }), r;
    r.value = a ? a.alloc(e, r, Array(c.length), o) : Array(c.length);
    const h = [], d = o?.abortEarly;
    for (let m = 0; m < c.length; m++) {
      const p = c[m], g = i.element._zod.run({
        value: p,
        issues: []
      }, o);
      if (g instanceof Promise)
        h.push(g.then((v) => OS(v, r, m)));
      else if (OS(g, r, m), d && g.issues.length !== 0 && Dn(g))
        break;
    }
    return h.length ? Promise.all(h).then(() => r) : r;
  };
});
function Lu(e, i, a, r, o, c) {
  const h = a in r, d = c === "optional";
  if (!(!h && d && o === "optional")) {
    if (e.issues.length) {
      if (o !== void 0 && d && !h)
        return;
      i.issues.push(...ts(a, e.issues));
    }
    if (!h && o === void 0) {
      e.issues.length || i.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: void 0,
        path: [a]
      });
      return;
    }
    e.value === void 0 ? (h || o === "defaulted" && !d) && (i.value[a] = void 0) : i.value[a] = e.value;
  }
}
const b3 = [];
function OT(e) {
  const i = Object.keys(e.shape), a = Object.getOwnPropertySymbols(e.shape), r = a.length ? a : b3, o = r.length ? [...i, ...r] : i;
  for (const h of o)
    if (!e.shape?.[h]?._zod?.traits?.has("$ZodType"))
      throw new Error(`Invalid element at key "${String(h)}": expected a Zod schema`);
  const c = rD(e.shape);
  return {
    ...e,
    allKeys: o,
    symbolKeys: r,
    // string-only: handleCatchall matches it against `for...in`, which never yields a symbol
    keySet: new Set(i),
    numKeys: i.length,
    optionalKeys: new Set(c)
  };
}
function zT(e, i, a, r, o, c, h) {
  const d = [], m = o.keySet, p = o.catchall._zod, g = p.def.type, v = p.optin, b = p.optout;
  let _ = 0;
  for (const T in i) {
    if (h && a.issues.length !== _) {
      if (Dn(a, _))
        break;
      _ = a.issues.length;
    }
    if (m.has(T))
      continue;
    if (T === "__proto__") {
      g === "never" && d.push(T);
      continue;
    }
    if (g === "never") {
      d.push(T);
      continue;
    }
    const x = p.run({ value: i[T], issues: [] }, r);
    x instanceof Promise ? e.push(x.then((A) => Lu(A, a, T, i, v, b))) : Lu(x, a, T, i, v, b);
  }
  return d.length && a.issues.push({
    code: "unrecognized_keys",
    keys: d,
    input: i,
    inst: c,
    // Describes the shape of the input, not the validity of the parsed value, so it never aborts. The parse still fails; the schema's own checks just get to run first, and an enclosing intersection can reconcile the key against a sibling operand.
    continue: !0
  }), e.length ? Promise.all(e).then(() => a) : a;
}
const S3 = /* @__PURE__ */ P("$ZodObject", (e, i) => {
  Gt.init(e, i);
  const a = Object.getOwnPropertyDescriptor(i, "shape"), r = a?.get ? a.get.raw : i.shape ?? {};
  if (r) {
    const p = () => {
      const g = { ...r };
      return Object.defineProperty(i, "shape", { value: g }), p.raw = g, g;
    };
    p.raw = r, Object.defineProperty(i, "shape", { get: p });
  }
  const o = qu(() => OT(i));
  Rt(e, "propValues", (p) => {
    const g = p.def.shape, v = {};
    for (const b in g) {
      const _ = g[b]._zod;
      if (_.values) {
        Object.prototype.hasOwnProperty.call(v, b) || xi(v, b, /* @__PURE__ */ new Set());
        for (const T of _.values)
          v[b].add(T);
        _.optin !== void 0 && v[b].add(void 0);
      }
    }
    return v;
  });
  const c = hl, h = i.catchall;
  let d;
  const m = _n.memoizer;
  m?.attach(e), e._zod.parse = (p, g) => {
    d ?? (d = o.value);
    const v = p.value;
    if (!c(v))
      return p.issues.push({
        expected: "object",
        code: "invalid_type",
        input: v,
        inst: e
      }), p;
    p.value = m ? m.alloc(e, p, {}, g) : {};
    const b = [], _ = d.shape, T = g?.abortEarly;
    let x = p.issues.length;
    for (const A of d.allKeys) {
      if (T && p.issues.length !== x) {
        if (Dn(p, x))
          break;
        x = p.issues.length;
      }
      if (A === "__proto__")
        continue;
      const N = _[A], D = N._zod.optin, k = N._zod.optout, G = N._zod.run({ value: v[A], issues: [] }, g);
      G instanceof Promise ? b.push(G.then((X) => Lu(X, p, A, v, D, k))) : Lu(G, p, A, v, D, k);
    }
    return h ? zT(b, v, p, g, o.value, e, T === !0) : b.length ? Promise.all(b).then(() => p) : p;
  };
}), _3 = /* @__PURE__ */ P("$ZodObjectJIT", (e, i) => {
  S3.init(e, i);
  const a = e._zod.parse, r = qu(() => OT(i)), o = _n.memoizer, c = (_) => {
    const T = r.value, x = T.symbolKeys, A = new NN(["payload", "ctx"], { shape: _, inst: e, memo: o, syms: x }), N = (X) => `shape[${X}]._zod.run({ value: input[${X}], issues: [] }, ctx)`, D = (X, q) => `
          let ${X}_ab = false;
          for (let i = 0; i < ${X}.issues.length; i++) {
            const iss = ${X}.issues[i];
            iss.path = iss.path ? [${q}, ...iss.path] : [${q}];
            payload.issues.push(iss);
            if (iss.continue !== true) ${X}_ab = true;
          }
          if (${X}_ab && ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }`;
    A.write("const input = payload.value;");
    const k = /* @__PURE__ */ Object.create(null);
    let G = 0;
    for (const X of T.allKeys)
      k[X] = `key_${G++}`;
    A.write(o ? "const newResult = memo.alloc(inst, payload, {}, ctx);" : "const newResult = {};");
    for (const X of T.allKeys) {
      if (X === "__proto__")
        continue;
      const q = k[X], V = typeof X == "symbol" ? `syms[${x.indexOf(X)}]` : nD(X), $ = `${V} in input`, J = _[X], Q = J?._zod?.optin, mt = Q !== void 0, vt = J?._zod?.optout === "optional";
      if (A.write(`const ${q} = ${N(V)};`), mt && vt) {
        const $t = Q === "optional" ? `${q}_present` : `${q}.value !== undefined || ${q}_present`;
        A.write(`
        const ${q}_present = ${$};
        if (!${q}.issues.length || ${q}_present) {
          if (${q}.issues.length) {${D(q, V)}
          }

          if (${$t}) {
            newResult[${V}] = ${q}.value;
          }
        }

      `);
      } else mt ? (A.write(`
        if (${q}.issues.length) {${D(q, V)}
        }
      `), Q === "defaulted" ? A.write(`newResult[${V}] = ${q}.value;`) : A.write(`
        if (${q}.value !== undefined || ${$}) {
          newResult[${V}] = ${q}.value;
        }
      `)) : A.write(`
        const ${q}_present = ${$};
        if (${q}.issues.length) {${D(q, V)}
        }
        if (!${q}_present && !${q}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${V}]
          });
          if (ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }
        }

        if (${q}_present) {
          newResult[${V}] = ${q}.value;
        }

      `);
    }
    return A.write("payload.value = newResult;"), A.write("return payload;"), A.compile();
  };
  let h;
  const d = hl, m = !_n.jitless, g = m && sD.value, v = i.catchall;
  let b;
  e._zod.parse = (_, T) => {
    b ?? (b = r.value);
    const x = _.value;
    return d(x) ? m && g && T?.async === !1 && T.jitless !== !0 ? (h || (h = c(i.shape)), _ = h(_, T), v ? zT([], x, _, T, b, e, T?.abortEarly === !0) : _) : a(_, T) : (_.issues.push({
      expected: "object",
      code: "invalid_type",
      input: x,
      inst: e
    }), _);
  };
});
function zS(e, i, a, r) {
  for (const c of e)
    if (c.issues.length === 0)
      return i.value = c.value, i;
  const o = e.filter((c) => !Dn(c));
  return o.length === 1 ? (i.value = o[0].value, o[0]) : (i.issues.push({
    code: "invalid_union",
    input: i.value,
    inst: a,
    errors: e.map((c) => c.issues.map((h) => ns(h, r, ti())))
  }), i);
}
const CT = /* @__PURE__ */ P("$ZodUnion", (e, i) => {
  Gt.init(e, i), Rt(e, "optin", (r) => r.def.options.some((o) => o._zod.optin === "defaulted") ? "defaulted" : r.def.options.some((o) => o._zod.optin !== void 0) ? "optional" : void 0), Rt(e, "optout", (r) => r.def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0), Rt(e, "values", (r) => {
    if (r.def.options.every((o) => o._zod.values))
      return new Set(r.def.options.flatMap((o) => Array.from(o._zod.values)));
  }), Rt(e, "pattern", (r) => {
    if (r.def.options.every((o) => o._zod.pattern)) {
      const o = r.def.options.map((c) => c._zod.pattern);
      return new RegExp(`^(${o.map((c) => Nm(c.source)).join("|")})$`);
    }
  });
  const a = i.options.length === 1 ? i.options[0]._zod.run : null;
  e._zod.parse = (r, o) => {
    if (a)
      return a(r, o);
    let c = !1;
    const h = [];
    for (const d of i.options) {
      const m = d._zod.run({
        value: r.value,
        issues: []
      }, o);
      if (m instanceof Promise)
        h.push(m), c = !0;
      else {
        if (m.issues.length === 0)
          return m;
        h.push(m);
      }
    }
    return c ? Promise.all(h).then((d) => zS(d, r, e, o)) : zS(h, r, e, o);
  };
});
function T3(e) {
  const i = /* @__PURE__ */ new Map();
  for (const a of e.options) {
    const r = a._zod.propValues?.[e.discriminator];
    if (!r || r.size === 0)
      throw new Error(`Invalid discriminated union option at index "${e.options.indexOf(a)}"`);
    for (const o of r)
      if (i.has(o)) {
        if (o !== void 0)
          throw new Error(`Duplicate discriminator value "${String(o)}"`);
        i.set(o, null);
      } else
        i.set(o, a);
  }
  return i;
}
const x3 = /* @__PURE__ */ P("$ZodDiscriminatedUnion", (e, i) => {
  i.inclusive = !1, CT.init(e, i);
  const a = e._zod.parse;
  Rt(e, "propValues", (o) => {
    const c = {};
    let h = 0;
    for (const d of o.def.options) {
      const m = d._zod.propValues;
      if (!m || Object.keys(m).length === 0)
        throw new Error(`Invalid discriminated union option at index "${o.def.options.indexOf(d)}"`);
      m[o.def.discriminator]?.has(void 0) && h++;
      for (const [p, g] of Object.entries(m)) {
        Object.prototype.hasOwnProperty.call(c, p) || xi(c, p, /* @__PURE__ */ new Set());
        for (const v of g)
          c[p].add(v);
      }
    }
    return !o.def.unionFallback && h > 1 && c[o.def.discriminator]?.delete(void 0), c;
  }), i.options.forEach((o, c) => {
    const h = jm(o._zod.def);
    if (h && !Object.prototype.hasOwnProperty.call(h, i.discriminator))
      throw new Error(`Invalid discriminated union option at index "${c}"`);
  });
  const r = qu(() => T3(i));
  e._zod.parse = (o, c) => {
    const h = o.value;
    if (!hl(h))
      return o.issues.push({
        code: "invalid_type",
        expected: "object",
        input: h,
        inst: e
      }), o;
    const d = h?.[i.discriminator], m = r.value.get(d);
    return m && (d !== void 0 || c.direction !== "backward") ? m._zod.run(o, c) : i.unionFallback || c.direction === "backward" ? a(o, c) : (o.issues.push({
      code: "invalid_union",
      errors: [],
      note: "No matching discriminator",
      discriminator: i.discriminator,
      options: Array.from(r.value.keys()).filter((p) => r.value.get(p) !== null),
      input: h,
      path: [i.discriminator],
      inst: e
    }), o);
  };
}), E3 = /* @__PURE__ */ P("$ZodIntersection", (e, i) => {
  Gt.init(e, i), e._zod.parse = (a, r) => {
    const o = a.value, c = i.left._zod.run({ value: o, issues: [] }, r), h = i.right._zod.run({ value: o, issues: [] }, r);
    return c instanceof Promise || h instanceof Promise ? Promise.all([c, h]).then(([m, p]) => CS(a, m, p)) : CS(a, c, h);
  };
});
function Id(e, i) {
  if (e === i)
    return { valid: !0, data: e };
  if (e instanceof Date && i instanceof Date && +e == +i)
    return { valid: !0, data: e };
  if (Ha(e) && Ha(i)) {
    const a = Object.keys(i), r = Object.keys(e).filter((c) => a.indexOf(c) !== -1), o = { ...e, ...i };
    Object.prototype.hasOwnProperty.call(o, "__proto__") && delete o.__proto__;
    for (const c of r) {
      if (c === "__proto__")
        continue;
      const h = Id(e[c], i[c]);
      if (!h.valid)
        return {
          valid: !1,
          mergeErrorPath: [c, ...h.mergeErrorPath]
        };
      o[c] = h.data;
    }
    return { valid: !0, data: o };
  }
  if (Array.isArray(e) && Array.isArray(i)) {
    if (e.length !== i.length)
      return { valid: !1, mergeErrorPath: [] };
    const a = [];
    for (let r = 0; r < e.length; r++) {
      const o = e[r], c = i[r], h = Id(o, c);
      if (!h.valid)
        return {
          valid: !1,
          mergeErrorPath: [r, ...h.mergeErrorPath]
        };
      a.push(h.data);
    }
    return { valid: !0, data: a };
  }
  return { valid: !1, mergeErrorPath: [] };
}
function CS(e, i, a) {
  const r = /* @__PURE__ */ new Map();
  let o;
  const c = /* @__PURE__ */ new Map(), h = (p, g) => {
    let v;
    if (p.code === "unrecognized_keys" && !p.path?.length)
      o ?? (o = p), v = p.keys;
    else if (p.code === "invalid_key" && p.origin === "record" && p.path?.length === 1) {
      const b = String(p.path[0]);
      c.has(b) || c.set(b, p), v = [b];
    } else
      return !1;
    for (const b of v)
      r.has(b) || r.set(b, {}), r.get(b)[g] = !0;
    return !0;
  };
  for (const p of i.issues)
    h(p, "l") || e.issues.push(p);
  for (const p of a.issues)
    h(p, "r") || e.issues.push(p);
  const d = [...r].filter(([, p]) => p.l && p.r).map(([p]) => p);
  if (d.length) {
    const p = o ? d.filter((g) => o.keys.includes(g)) : [];
    p.length && e.issues.push({ ...o, keys: p });
    for (const g of d)
      !p.includes(g) && c.has(g) && e.issues.push(c.get(g));
  }
  const m = Id(i.value, a.value);
  if (!m.valid) {
    if (Dn(e))
      return e;
    throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(m.mergeErrorPath)}`);
  }
  return e.value = m.data, e;
}
const w3 = /* @__PURE__ */ P("$ZodTuple", (e, i) => {
  Gt.init(e, i);
  const a = i.items, r = _n.memoizer;
  r?.attach(e), e._zod.parse = (o, c) => {
    const h = o.value;
    if (!Array.isArray(h))
      return o.issues.push({
        input: h,
        inst: e,
        expected: "tuple",
        code: "invalid_type"
      }), o;
    o.value = r ? r.alloc(e, o, [], c) : [];
    const d = [], m = MS(a, "optin"), p = MS(a, "optout");
    if (!i.rest) {
      if (h.length < m)
        return o.issues.push({
          code: "too_small",
          minimum: m,
          inclusive: !0,
          input: h,
          inst: e,
          origin: "array"
        }), o;
      h.length > a.length && o.issues.push({
        code: "too_big",
        maximum: a.length,
        inclusive: !0,
        input: h,
        inst: e,
        origin: "array"
      });
    }
    const g = new Array(a.length), v = i.rest ? c?.abortEarly : void 0;
    let b = !1;
    for (let _ = 0; _ < a.length; _++) {
      const T = a[_]._zod.run({ value: h[_], issues: [] }, c);
      T instanceof Promise ? d.push(T.then((x) => {
        g[_] = x;
      })) : (g[_] = T, v && !b && T.issues.length && (b = Dn(T)));
    }
    if (i.rest && !b) {
      let _ = a.length - 1;
      const T = h.slice(a.length);
      let x = o.issues.length;
      for (const A of T) {
        if (v && o.issues.length !== x) {
          if (Dn(o, x))
            break;
          x = o.issues.length;
        }
        _++;
        const N = i.rest._zod.run({ value: A, issues: [] }, c);
        N instanceof Promise ? d.push(N.then((D) => RS(D, o, _))) : RS(N, o, _);
      }
    }
    return d.length ? Promise.all(d).then(() => DS(g, o, a, h, p)) : DS(g, o, a, h, p);
  };
});
function MS(e, i) {
  for (let a = e.length - 1; a >= 0; a--)
    if (!(i === "optin" ? e[a]._zod.optin !== void 0 : e[a]._zod.optout === "optional"))
      return a + 1;
  return 0;
}
function RS(e, i, a) {
  e.issues.length && i.issues.push(...ts(a, e.issues)), i.value[a] = e.value;
}
function DS(e, i, a, r, o) {
  for (let c = 0; c < a.length; c++) {
    const h = e[c], d = c < r.length;
    if (!d && c >= o && a[c]._zod.optin === "optional") {
      i.value.length = c;
      break;
    }
    if (h.issues.length) {
      if (!d && c >= o) {
        i.value.length = c;
        break;
      }
      i.issues.push(...ts(c, h.issues));
    }
    i.value[c] = h.value;
  }
  for (let c = i.value.length - 1; c >= r.length && (a[c]._zod.optout === "optional" && i.value[c] === void 0); c--)
    i.value.length = c;
  return i;
}
const A3 = /* @__PURE__ */ P("$ZodRecord", (e, i) => {
  Gt.init(e, i);
  const a = _n.memoizer;
  a?.attach(e), e._zod.parse = (r, o) => {
    const c = r.value;
    if (!Ha(c))
      return r.issues.push({
        expected: "record",
        code: "invalid_type",
        input: c,
        inst: e
      }), r;
    const h = [], d = i.keyType._zod.values;
    if (d && !i.partial) {
      r.value = a ? a.alloc(e, r, {}, o) : {};
      const m = /* @__PURE__ */ new Set();
      for (const g of d)
        if (typeof g == "string" || typeof g == "number" || typeof g == "symbol") {
          if (m.add(typeof g == "number" ? g.toString() : g), g === "__proto__")
            continue;
          const v = i.keyType._zod.run({ value: g, issues: [] }, o);
          if (v instanceof Promise)
            throw new Error("Async schemas not supported in object keys currently");
          if (v.issues.length) {
            r.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: v.issues.map((T) => ns(T, o, ti())),
              input: g,
              path: [g],
              inst: e
            });
            continue;
          }
          const b = v.value;
          if (b === "__proto__")
            continue;
          const _ = i.valueType._zod.run({ value: c[g], issues: [] }, o);
          _ instanceof Promise ? h.push(_.then((T) => {
            T.issues.length && r.issues.push(...ts(g, T.issues)), r.value[b] = T.value;
          })) : (_.issues.length && r.issues.push(...ts(g, _.issues)), r.value[b] = _.value);
        }
      let p;
      for (const g in c)
        if (!m.has(g))
          if (i.mode === "loose") {
            if (g === "__proto__")
              continue;
            r.value[g] = c[g];
          } else
            p = p ?? [], p.push(g);
      p && p.length > 0 && r.issues.push({
        code: "unrecognized_keys",
        input: c,
        inst: e,
        keys: p,
        continue: !0
      });
    } else {
      r.value = a ? a.alloc(e, r, {}, o) : {};
      let m;
      for (const p of Reflect.ownKeys(c)) {
        if (p === "__proto__" || !Object.prototype.propertyIsEnumerable.call(c, p))
          continue;
        let g = i.keyType._zod.run({ value: p, issues: [] }, o);
        if (g instanceof Promise)
          throw new Error("Async schemas not supported in object keys currently");
        if (typeof p == "string" && Hm.test(p) && g.issues.length) {
          const T = i.keyType._zod.run({ value: Number(p), issues: [] }, o);
          if (T instanceof Promise)
            throw new Error("Async schemas not supported in object keys currently");
          T.issues.length === 0 && (g = T);
        }
        if (g.issues.length) {
          i.mode === "loose" ? r.value[p] = c[p] : d ? (m = m ?? [], m.push(p)) : r.issues.push({
            code: "invalid_key",
            origin: "record",
            issues: g.issues.map((T) => ns(T, o, ti())),
            input: p,
            path: [p],
            inst: e
          });
          continue;
        }
        const b = g.value;
        if (b === "__proto__")
          continue;
        const _ = i.valueType._zod.run({ value: c[p], issues: [] }, o);
        _ instanceof Promise ? h.push(_.then((T) => {
          T.issues.length && r.issues.push(...ts(p, T.issues)), r.value[b] = T.value;
        })) : (_.issues.length && r.issues.push(...ts(p, _.issues)), r.value[b] = _.value);
      }
      m && m.length > 0 && r.issues.push({
        code: "unrecognized_keys",
        input: c,
        inst: e,
        keys: m,
        continue: !0
      });
    }
    return h.length ? Promise.all(h).then(() => r) : r;
  };
}), O3 = /* @__PURE__ */ P("$ZodEnum", (e, i) => {
  Gt.init(e, i);
  const a = $d(i.entries), r = new Set(a);
  e._zod.values = r, Rt(e, "pattern", (o) => {
    const c = $d(o.def.entries).filter((h) => aD.has(typeof h));
    return new RegExp(c.length ? `^(${c.map((h) => Pa(h.toString())).join("|")})$` : "^[^\\s\\S]$");
  }), e._zod.parse = (o, c) => {
    const h = o.value;
    return r.has(h) || o.issues.push({
      code: "invalid_value",
      values: a,
      input: h,
      inst: e
    }), o;
  };
}), z3 = /* @__PURE__ */ P("$ZodLiteral", (e, i) => {
  Gt.init(e, i);
  const a = new Set(i.values);
  e._zod.values = a, Rt(e, "pattern", (r) => {
    const o = r.def.values;
    return new RegExp(o.length ? `^(${o.map((c) => typeof c == "string" ? Pa(c) : c ? Pa(c.toString()) : String(c)).join("|")})$` : "^[^\\s\\S]$");
  }), e._zod.parse = (r, o) => {
    const c = r.value;
    return a.has(c) || r.issues.push({
      code: "invalid_value",
      values: i.values,
      input: c,
      inst: e
    }), r;
  };
}), C3 = /* @__PURE__ */ P("$ZodTransform", (e, i) => {
  Gt.init(e, i), e._zod.optin = "optional", _n.memoizer?.guard(e), e._zod.parse = (a, r) => {
    if (r.direction === "backward")
      throw new mT(e.constructor.name);
    const o = i.transform(a.value, a);
    if (r.async)
      return (o instanceof Promise ? o : Promise.resolve(o)).then((h) => (a.value = h, a));
    if (o instanceof Promise)
      throw new Zs();
    return a.value = o, a;
  };
});
function NS(e, i) {
  return e.value = i.issues.length ? void 0 : i.value, e;
}
const MT = /* @__PURE__ */ P("$ZodOptional", (e, i) => {
  Gt.init(e, i), Rt(e, "optin", (a) => a.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional"), e._zod.optout = "optional", Rt(e, "values", (a) => {
    const r = a.def.innerType._zod.values;
    return r ? /* @__PURE__ */ new Set([...r, void 0]) : void 0;
  }), Rt(e, "pattern", (a) => {
    const r = a.def.innerType._zod.pattern;
    return r ? new RegExp(`^(${Nm(r.source)})?$`) : void 0;
  }), e._zod.parse = (a, r) => {
    if (a.value === void 0) {
      if (i.innerType._zod.optin !== "defaulted")
        return a;
      const o = i.innerType._zod.run({ value: a.value, issues: [] }, r);
      return o instanceof Promise ? o.then((c) => NS(a, c)) : NS(a, o);
    }
    return i.innerType._zod.run(a, r);
  };
}), M3 = /* @__PURE__ */ P("$ZodExactOptional", (e, i) => {
  MT.init(e, i), Rt(e, "values", (a) => a.def.innerType._zod.values), Rt(e, "pattern", (a) => a.def.innerType._zod.pattern), e._zod.parse = (a, r) => i.innerType._zod.run(a, r);
}), R3 = /* @__PURE__ */ P("$ZodNullable", (e, i) => {
  Gt.init(e, i), Rt(e, "optin", (a) => a.def.innerType._zod.optin), Rt(e, "optout", (a) => a.def.innerType._zod.optout), Rt(e, "pattern", (a) => {
    const r = a.def.innerType._zod.pattern;
    return r ? new RegExp(`^(${Nm(r.source)}|null)$`) : void 0;
  }), Rt(e, "values", (a) => a.def.innerType._zod.values ? /* @__PURE__ */ new Set([...a.def.innerType._zod.values, null]) : void 0), e._zod.parse = (a, r) => a.value === null ? a : i.innerType._zod.run(a, r);
}), D3 = /* @__PURE__ */ P("$ZodDefault", (e, i) => {
  Gt.init(e, i), e._zod.optin = "defaulted", Rt(e, "values", (a) => a.def.innerType._zod.values), e._zod.parse = (a, r) => {
    if (r.direction === "backward")
      return i.innerType._zod.run(a, r);
    if (a.value === void 0)
      return a.value = i.defaultValue, a;
    const o = i.innerType._zod.run(a, r);
    return o instanceof Promise ? o.then((c) => jS(c, i)) : jS(o, i);
  };
});
function jS(e, i) {
  return e.value === void 0 && (e.value = i.defaultValue), e;
}
const N3 = /* @__PURE__ */ P("$ZodPrefault", (e, i) => {
  Gt.init(e, i), e._zod.optin = "defaulted", Rt(e, "values", (a) => a.def.innerType._zod.values), e._zod.parse = (a, r) => (r.direction === "backward" || a.value === void 0 && (a.value = i.defaultValue), i.innerType._zod.run(a, r));
}), j3 = /* @__PURE__ */ P("$ZodNonOptional", (e, i) => {
  Gt.init(e, i), Rt(e, "values", (a) => {
    const r = a.def.innerType._zod.values;
    return r ? new Set([...r].filter((o) => o !== void 0)) : void 0;
  }), e._zod.parse = (a, r) => {
    const o = i.innerType._zod.run(a, r);
    return o instanceof Promise ? o.then((c) => VS(c, e)) : VS(o, e);
  };
});
function VS(e, i) {
  return !e.issues.length && e.value === void 0 && e.issues.push({
    code: "invalid_type",
    expected: "nonoptional",
    input: e.value,
    inst: i
  }), e;
}
function LS(e, i, a, r) {
  return i.issues.length ? (e.value = a.catchValue({
    ...i,
    value: e.value,
    error: {
      issues: i.issues.map((o) => ns(o, r, ti()))
    },
    input: e.value
  }), e) : (e.value = i.value, i.memo && (e.memo = !0), e);
}
const V3 = /* @__PURE__ */ P("$ZodCatch", (e, i) => {
  Gt.init(e, i), Rt(e, "optin", (a) => a.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional"), Rt(e, "optout", (a) => a.def.innerType._zod.optout), Rt(e, "values", (a) => a.def.innerType._zod.values), e._zod.parse = (a, r) => {
    if (r.direction === "backward")
      return i.innerType._zod.run(a, r);
    const o = i.innerType._zod.run({ value: a.value, issues: [] }, r);
    return o instanceof Promise ? o.then((c) => LS(a, c, i, r)) : LS(a, o, i, r);
  };
}), L3 = /* @__PURE__ */ P("$ZodPipe", (e, i) => {
  Gt.init(e, i), Rt(e, "values", (a) => a.def.in._zod.values), Rt(e, "optin", (a) => a.def.in._zod.optin), Rt(e, "optout", (a) => a.def.out._zod.optout), Rt(e, "propValues", (a) => a.def.in._zod.propValues), e._zod.parse = (a, r) => {
    if (r.direction === "backward") {
      const c = i.out._zod.run(a, r);
      return c instanceof Promise ? c.then((h) => iu(h, i.in, r)) : iu(c, i.in, r);
    }
    const o = i.in._zod.run(a, r);
    return o instanceof Promise ? o.then((c) => iu(c, i.out, r)) : iu(o, i.out, r);
  };
});
function iu(e, i, a) {
  return e.issues.some((r) => r.code !== "unrecognized_keys") ? (e.aborted = !0, e) : i._zod.run({ value: e.value, issues: e.issues }, a);
}
const U3 = /* @__PURE__ */ P("$ZodReadonly", (e, i) => {
  Gt.init(e, i), Rt(e, "propValues", (a) => a.def.innerType._zod.propValues), Rt(e, "values", (a) => a.def.innerType._zod.values), Rt(e, "optin", (a) => a.def.innerType?._zod?.optin), Rt(e, "optout", (a) => a.def.innerType?._zod?.optout), e._zod.parse = (a, r) => {
    if (r.direction === "backward")
      return i.innerType._zod.run(a, r);
    const o = i.innerType._zod.run(a, r);
    return o instanceof Promise ? o.then(US) : US(o);
  };
});
function US(e) {
  return e.memo || (e.value = Object.freeze(e.value)), e;
}
const k3 = /* @__PURE__ */ P("$ZodCustom", (e, i) => {
  Ye.init(e, i), Gt.init(e, i), e._zod.parse = (a, r) => a, e._zod.check = (a) => {
    const r = a.value, o = i.fn(r);
    if (o instanceof Promise)
      return o.then((c) => kS(c, a, r, e));
    kS(o, a, r, e);
  };
});
function kS(e, i, a, r) {
  if (!e) {
    const o = {
      code: "custom",
      input: a,
      inst: r,
      // incorporates params.error into issue reporting
      path: [...r._zod.def.path ?? []],
      // incorporates params.error into issue reporting
      continue: !r._zod.def.abort
      // params: inst._zod.def.params,
    };
    r._zod.def.params && (o.params = r._zod.def.params), i.issues.push(dl(o));
  }
}
class B3 extends Error {
  constructor() {
    super("Cannot parse a reference cycle that closes through a transform"), this.name = "ZodCyclicError";
  }
}
const qd = "~memo", BS = [];
function RT(e) {
  return e !== null && typeof e == "object";
}
function fd(e) {
  return e.map((i) => i.path ? { ...i, path: i.path.slice() } : { ...i });
}
const DT = /* @__PURE__ */ new WeakMap(), Jr = 0, vu = 1, sl = 2;
function bu(e, i, a) {
  const r = DT.get(e);
  if (r !== void 0)
    return r ? sl : Jr;
  if (i.has(e))
    return sl;
  i.add(e);
  let o = Jr;
  const c = (g) => {
    if (o !== sl && g?._zod) {
      const v = bu(g, i);
      v > o && (o = v);
    }
  }, h = (g, v) => {
    let b = Jr;
    for (const _ of Reflect.ownKeys(g)) {
      const T = Object.getOwnPropertyDescriptor(g, _);
      if (!T.enumerable)
        continue;
      const x = T.get ? vu : T.value?._zod ? bu(T.value, i) : Jr;
      x > b && (b = x);
    }
    return b;
  }, d = (g) => {
    g > o && (o = g);
  }, m = e._zod.def;
  switch (m.type) {
    case "object": {
      const g = jm(m);
      d(g ? h(g) : vu), c(m.catchall);
      break;
    }
    case "array":
      c(m.element);
      break;
    case "tuple":
      for (const g of m.items)
        c(g);
      c(m.rest);
      break;
    case "record":
    case "map":
      c(m.keyType), c(m.valueType);
      break;
    case "set":
      c(m.valueType);
      break;
    case "union":
      for (const g of m.options)
        c(g);
      break;
    case "intersection":
      c(m.left), c(m.right);
      break;
    case "optional":
    case "nullable":
    case "default":
    case "prefault":
    case "catch":
    case "readonly":
    case "nonoptional":
    case "promise":
    case "success":
      c(m.innerType);
      break;
    case "pipe":
      c(m.in), c(m.out);
      break;
    case "function":
      c(m.input), c(m.output);
      break;
    // `$ZodLazy` caches its inner on the def, so a resolved edge is followed exactly
    case "lazy": {
      const g = m._cachedInner ?? void 0;
      d(g ? bu(g, i) : vu);
      break;
    }
    // a leaf by choice: `parts` are regex fragments, not data positions
    case "template_literal":
    // leaves
    case "string":
    case "number":
    case "int":
    case "boolean":
    case "bigint":
    case "symbol":
    case "undefined":
    case "null":
    case "void":
    case "never":
    case "any":
    case "unknown":
    case "date":
    case "nan":
    case "enum":
    case "literal":
    case "file":
    case "transform":
    case "custom":
      break;
    default:
      for (const g in m) {
        const v = Object.getOwnPropertyDescriptor(m, g);
        if (!v || v.get)
          continue;
        const b = v.value;
        if (!(!b || typeof b != "object")) {
          if (b._zod)
            c(b);
          else if (Array.isArray(b))
            for (const _ of b)
              c(_);
        }
      }
  }
  return i.delete(e), Z3(e, o);
}
function Z3(e, i) {
  return i !== vu && DT.set(e, i === sl), i;
}
function H3(e, i) {
  let a = e.buckets.get(i);
  return a || (a = /* @__PURE__ */ new WeakMap(), e.buckets.set(i, a)), a;
}
let su;
const au = [], P3 = {
  alloc(e, i, a) {
    const r = su;
    if (!r)
      return a;
    su = void 0;
    const o = { value: a, issues: null };
    return r.set(i.value, o), au.push(o), a;
  },
  guard(e) {
    var i;
    (i = e._zod).deferred ?? (i.deferred = []), e._zod.deferred.push(() => {
      const a = e._zod.parse, r = (o, c) => {
        if (c.direction !== "backward" && G3(c, o.value))
          throw new B3();
        return a(o, c);
      };
      e._zod.parse = r, e._zod.run === a && (e._zod.run = r);
    });
  },
  attach(e) {
    var i;
    let a, r = !1, o, c;
    (i = e._zod).deferred ?? (i.deferred = []), e._zod.deferred.push(() => {
      const h = e._zod.parse, d = (m, p) => {
        if (a === void 0) {
          const N = bu(e, /* @__PURE__ */ new Set());
          if (N === Jr)
            return e._zod.parse = h, e._zod.run === d && (e._zod.run = h), h(m, p);
          N === sl || r ? a = !0 : r = !0;
        }
        const g = m.value;
        if (!RT(g))
          return h(m, p);
        let v = p[qd];
        v || (v = { buckets: /* @__PURE__ */ new WeakMap(), backEdges: void 0 }, p[qd] = v);
        let b;
        o === p ? b = c : (b = H3(v, e), o = p, c = b);
        const _ = b.get(g);
        if (_)
          return m.value = _.value, _.issues ? _.issues.length && m.issues.push(...fd(_.issues)) : (m.memo = !0, v.backEdges ?? (v.backEdges = /* @__PURE__ */ new WeakSet()), v.backEdges.add(_.value)), m;
        su = b;
        const T = au.length, x = h(m, p);
        su = void 0;
        const A = au.length > T ? au.pop() : void 0;
        return x instanceof Promise ? x.then((N) => (A && (A.issues = N.issues.length ? fd(N.issues) : BS), N)) : (A && (A.issues = x.issues.length ? fd(x.issues) : BS), x);
      };
      e._zod.parse = d, e._zod.run === h && (e._zod.run = d);
    });
  }
};
function $3() {
  return P3;
}
function G3(e, i) {
  const a = e[qd]?.backEdges;
  return a !== void 0 && RT(i) && a.has(i);
}
const Y3 = () => {
  const e = {
    string: { unit: "characters", verb: "to have" },
    file: { unit: "bytes", verb: "to have" },
    array: { unit: "items", verb: "to have" },
    set: { unit: "items", verb: "to have" },
    map: { unit: "entries", verb: "to have" }
  };
  function i(c) {
    return e[c] ?? null;
  }
  const a = {
    regex: "input",
    email: "email address",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datetime",
    date: "ISO date",
    time: "ISO time",
    duration: "ISO duration",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    mac: "MAC address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded string",
    base64url: "base64url-encoded string",
    json_string: "JSON string",
    e164: "E.164 number",
    currency_code: "currency code",
    credit_card: "credit card number",
    iban: "IBAN",
    jwt: "JWT",
    template_literal: "input"
  }, r = {
    // Compatibility: "nan" -> "NaN" for display
    nan: "NaN"
    // All other type names omitted - they fall back to raw values via ?? operator
  };
  function o(c, h) {
    return c === "number" && typeof h == "number" && !Number.isFinite(h) ? String(h) : r[c] ?? c;
  }
  return (c) => {
    switch (c.code) {
      case "invalid_type": {
        const h = o(c.expected), d = gD(c.input), m = o(d, c.input);
        return `Invalid input: expected ${h}, received ${m}`;
      }
      case "invalid_value":
        return c.values.length === 1 ? `Invalid input: expected ${uT(c.values[0])}` : `Invalid option: expected one of ${bS(c.values, "|")}`;
      case "too_big": {
        const h = c.exact ? "exactly " : c.inclusive ? "<=" : "<", d = i(c.origin);
        return d ? `Too big: expected ${c.origin ?? "value"} to have ${h}${c.maximum.toString()} ${d.unit ?? "elements"}` : `Too big: expected ${c.origin ?? "value"} to be ${h}${c.maximum.toString()}`;
      }
      case "too_small": {
        const h = c.exact ? "exactly " : c.inclusive ? ">=" : ">", d = i(c.origin);
        return d ? `Too small: expected ${c.origin} to have ${h}${c.minimum.toString()} ${d.unit}` : `Too small: expected ${c.origin} to be ${h}${c.minimum.toString()}`;
      }
      case "invalid_format": {
        const h = c;
        return h.format === "starts_with" ? `Invalid string: must start with "${h.prefix}"` : h.format === "ends_with" ? `Invalid string: must end with "${h.suffix}"` : h.format === "includes" ? `Invalid string: must include "${h.includes}"` : h.format === "regex" ? `Invalid string: must match pattern ${h.pattern}` : `Invalid ${a[h.format] ?? c.format}`;
      }
      case "not_multiple_of":
        return `Invalid number: must be a multiple of ${c.divisor}`;
      case "unrecognized_keys":
        return `Unrecognized key${c.keys.length > 1 ? "s" : ""}: ${bS(c.keys, ", ")}`;
      case "invalid_key":
        return `Invalid key in ${c.origin}`;
      case "invalid_union":
        return c.options && Array.isArray(c.options) && c.options.length > 0 ? `Invalid discriminator value. Expected ${c.options.map((d) => `'${d}'`).join(" | ")}` : c.inclusive === !1 ? "Invalid input: more than one option matched" : "Invalid input";
      case "invalid_element":
        return `Invalid value in ${c.origin}`;
      default:
        return "Invalid input";
    }
  };
};
function I3() {
  return {
    localeError: Y3()
  };
}
var ZS;
class q3 {
  constructor() {
    this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map();
  }
  add(i, ...a) {
    const r = a[0];
    return this._map.set(i, r), r && typeof r == "object" && "id" in r && this._idmap.set(r.id, i), this;
  }
  clear() {
    return this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map(), this;
  }
  remove(i) {
    const a = this._map.get(i);
    return a && typeof a == "object" && "id" in a && this._idmap.delete(a.id), this._map.delete(i), this;
  }
  get(i) {
    const a = i._zod.parent;
    if (a) {
      const r = { ...this.get(a) ?? {} };
      delete r.id;
      const o = { ...r, ...this._map.get(i) };
      return Object.keys(o).length ? o : void 0;
    }
    return this._map.get(i);
  }
  has(i) {
    return this._map.has(i);
  }
}
function X3() {
  return new q3();
}
(ZS = globalThis).__zod_globalRegistry ?? (ZS.__zod_globalRegistry = X3());
const Wr = globalThis.__zod_globalRegistry;
function NT(e) {
  return e.checks && (e.checks = [...e.checks]), e;
}
// @__NO_SIDE_EFFECTS__
function K3(e, i) {
  return new e(NT({ type: "string", ...at(i) }));
}
// @__NO_SIDE_EFFECTS__
function F3(e, i) {
  return new e({
    type: "string",
    format: "email",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function Q3(e, i) {
  return new e({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function J3(e, i) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function W3(e, i) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v4",
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function t4(e, i) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v6",
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function e4(e, i) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v7",
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function n4(e, i) {
  return new e({
    type: "string",
    format: "url",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function i4(e, i) {
  return new e({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function s4(e, i) {
  return new e({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function a4(e, i) {
  return new e({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function r4(e, i) {
  return new e({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function l4(e, i) {
  return new e({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function o4(e, i) {
  return new e({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function u4(e, i) {
  return new e({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function c4(e, i) {
  return new e({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function f4(e, i) {
  return new e({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function h4(e, i) {
  return new e({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function d4(e, i) {
  return new e({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function m4(e, i) {
  return new e({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function p4(e, i) {
  return new e({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function g4(e, i) {
  return new e({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function y4(e, i) {
  return new e({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: !1,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function v4(e, i) {
  return new e({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: !1,
    local: !1,
    precision: null,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function b4(e, i) {
  return new e({
    type: "string",
    format: "date",
    check: "string_format",
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function S4(e, i) {
  return new e({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function _4(e, i) {
  return new e({
    type: "string",
    format: "duration",
    check: "string_format",
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function T4(e, i) {
  return new e(NT({ type: "number", checks: [], ...at(i) }));
}
// @__NO_SIDE_EFFECTS__
function x4(e, i) {
  return new e({
    type: "number",
    check: "number_format",
    abort: !1,
    format: "safeint",
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function E4(e, i) {
  return new e({
    type: "boolean",
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function w4(e) {
  return new e({
    type: "unknown"
  });
}
// @__NO_SIDE_EFFECTS__
function A4(e, i) {
  return new e({
    type: "never",
    ...at(i)
  });
}
// @__NO_SIDE_EFFECTS__
function HS(e, i) {
  return new yT({
    check: "less_than",
    ...at(i),
    value: e,
    inclusive: !1
  });
}
// @__NO_SIDE_EFFECTS__
function hd(e, i) {
  return new yT({
    check: "less_than",
    ...at(i),
    value: e,
    inclusive: !0
  });
}
// @__NO_SIDE_EFFECTS__
function PS(e, i) {
  return new vT({
    check: "greater_than",
    ...at(i),
    value: e,
    inclusive: !1
  });
}
// @__NO_SIDE_EFFECTS__
function dd(e, i) {
  return new vT({
    check: "greater_than",
    ...at(i),
    value: e,
    inclusive: !0
  });
}
// @__NO_SIDE_EFFECTS__
function $S(e, i) {
  return new _N({
    check: "multiple_of",
    ...at(i),
    value: e
  });
}
// @__NO_SIDE_EFFECTS__
function jT(e, i) {
  return new xN({
    check: "max_length",
    ...at(i),
    maximum: e
  });
}
// @__NO_SIDE_EFFECTS__
function Uu(e, i) {
  return new EN({
    check: "min_length",
    ...at(i),
    minimum: e
  });
}
// @__NO_SIDE_EFFECTS__
function VT(e, i) {
  return new wN({
    check: "length_equals",
    ...at(i),
    length: e
  });
}
// @__NO_SIDE_EFFECTS__
function O4(e, i) {
  return new AN({
    check: "string_format",
    format: "regex",
    ...at(i),
    pattern: e
  });
}
// @__NO_SIDE_EFFECTS__
function z4(e) {
  return new ON({
    check: "string_format",
    format: "lowercase",
    ...at(e)
  });
}
// @__NO_SIDE_EFFECTS__
function C4(e) {
  return new zN({
    check: "string_format",
    format: "uppercase",
    ...at(e)
  });
}
// @__NO_SIDE_EFFECTS__
function M4(e, i) {
  return new CN({
    check: "string_format",
    format: "includes",
    ...at(i),
    includes: e
  });
}
// @__NO_SIDE_EFFECTS__
function R4(e, i) {
  return new MN({
    check: "string_format",
    format: "starts_with",
    ...at(i),
    prefix: e
  });
}
// @__NO_SIDE_EFFECTS__
function D4(e, i) {
  return new RN({
    check: "string_format",
    format: "ends_with",
    ...at(i),
    suffix: e
  });
}
// @__NO_SIDE_EFFECTS__
function Xa(e) {
  return new DN({
    check: "overwrite",
    tx: e
  });
}
// @__NO_SIDE_EFFECTS__
function N4(e) {
  return /* @__PURE__ */ Xa((i) => i.normalize(e));
}
// @__NO_SIDE_EFFECTS__
function j4() {
  return /* @__PURE__ */ Xa((e) => e.trim());
}
// @__NO_SIDE_EFFECTS__
function V4() {
  return /* @__PURE__ */ Xa((e) => e.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function L4() {
  return /* @__PURE__ */ Xa((e) => e.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function U4() {
  return /* @__PURE__ */ Xa((e) => iD(e));
}
// @__NO_SIDE_EFFECTS__
function k4(e, i, a) {
  return new e({
    type: "array",
    element: i,
    // get element() {
    //   return element;
    // },
    ...at(a)
  });
}
// @__NO_SIDE_EFFECTS__
function B4(e, i, a) {
  return new e({
    type: "custom",
    check: "custom",
    fn: i,
    ...at(a)
  });
}
// @__NO_SIDE_EFFECTS__
function Z4(e, i) {
  const a = /* @__PURE__ */ H4((r) => (r.addIssue = (o) => {
    if (typeof o == "string")
      r.issues.push(dl(o, r.value, a._zod.def));
    else {
      const c = o;
      c.fatal && (c.continue = !1), c.code ?? (c.code = "custom"), "input" in c || (c.input = r.value), c.inst ?? (c.inst = a), c.continue ?? (c.continue = !a._zod.def.abort), r.issues.push(dl(c));
    }
  }, e(r.value, r)), i);
  return a;
}
// @__NO_SIDE_EFFECTS__
function H4(e, i) {
  const a = new Ye({
    check: "custom",
    ...at(i)
  });
  return a._zod.check = e, a;
}
function al(e, ...i) {
  for (const a of i)
    for (const r of Reflect.ownKeys(a))
      Object.prototype.propertyIsEnumerable.call(a, r) && xi(e, r, a[r]);
  return e;
}
function LT(e) {
  let i = e?.target ?? "draft-2020-12";
  return i === "draft-4" && (i = "draft-04"), i === "draft-7" && (i = "draft-07"), {
    processors: e.processors ?? {},
    metadataRegistry: e?.metadata ?? Wr,
    target: i,
    unrepresentable: e?.unrepresentable ?? "throw",
    override: e?.override ?? (() => {
    }),
    io: e?.io ?? "output",
    counter: 0,
    seen: /* @__PURE__ */ new Map(),
    sharedDefsExtractedFor: void 0,
    sharedEmitDoneFor: void 0,
    cycles: e?.cycles ?? "ref",
    reused: e?.reused ?? "inline",
    intersections: [],
    deferred: [],
    external: e?.external ?? void 0
  };
}
function ss(e, i, a, r, o) {
  const c = typeof i.unrepresentable == "function" ? i.unrepresentable({ zodSchema: e, path: r.path, message: o }) : i.unrepresentable;
  if (c === "any")
    return !1;
  if (c === void 0 || c === "throw")
    throw new Error(o);
  return Object.assign(a, c), !0;
}
function Wt(e, i, a = { path: [], schemaPath: [] }) {
  var r;
  const o = e._zod.def, c = i.seen.get(e);
  if (c)
    return c.count++, a.schemaPath.includes(e) && (c.cycle = a.path), c.schema;
  const h = { schema: {}, count: 1, cycle: void 0, path: a.path };
  i.seen.set(e, h), i.sharedDefsExtractedFor = void 0, i.sharedEmitDoneFor = void 0;
  const d = e._zod.toJSONSchema?.();
  if (d)
    h.schema = d;
  else {
    const g = {
      ...a,
      schemaPath: [...a.schemaPath, e],
      path: a.path
    };
    if (e._zod.processJSONSchema)
      e._zod.processJSONSchema(i, h.schema, g);
    else {
      const b = h.schema, _ = i.processors[o.type];
      if (!_)
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${o.type}`);
      _(e, i, b, g);
    }
    const v = e._zod.parent;
    v && (h.ref || (h.ref = v), Wt(v, i, g), i.seen.get(v).isParent = !0);
  }
  const m = i.metadataRegistry.get(e);
  return m && al(h.schema, m), i.io === "input" && je(e) && (delete h.schema.examples, delete h.schema.default), i.io === "input" && "_prefault" in h.schema && ((r = h.schema).default ?? (r.default = h.schema._prefault)), delete h.schema._prefault, i.seen.get(e).schema;
}
function GS(e) {
  return e.replace(/~/g, "~0").replace(/\//g, "~1");
}
function UT(e, i) {
  const a = e.seen.get(i);
  if (!a)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  if (e.external && e.sharedDefsExtractedFor === e.external)
    return;
  const r = /* @__PURE__ */ new Map();
  for (const h of e.seen.entries()) {
    const d = e.metadataRegistry.get(h[0])?.id;
    if (d) {
      const m = r.get(d);
      if (m && m !== h[0])
        throw new Error(`Duplicate schema id "${d}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      r.set(d, h[0]);
    }
  }
  const o = (h) => {
    const d = e.target === "draft-2020-12" ? "$defs" : "definitions";
    if (e.external) {
      const v = e.external.registry.get(h[0])?.id, b = e.external.uri ?? ((T) => T);
      if (v)
        return { ref: b(v) };
      const _ = h[1].defId ?? h[1].schema.id ?? `schema${e.counter++}`;
      return h[1].defId = _, { defId: _, ref: `${b("__shared")}#/${d}/${GS(_)}` };
    }
    const m = "#", p = `${m}/${d}/`;
    if (h[1] === a && !h[1].schema.id)
      return { ref: m };
    const g = h[1].schema.id ?? `__schema${e.counter++}`;
    return { defId: g, ref: p + GS(g) };
  }, c = (h) => {
    if (h[1].schema.$ref)
      return;
    const d = h[1], { ref: m, defId: p } = o(h);
    d.def = { ...d.schema }, p && (d.defId = p);
    const g = d.schema;
    for (const v in g)
      delete g[v];
    g.$ref = m;
  };
  if (e.cycles === "throw")
    for (const h of e.seen.entries()) {
      const d = h[1];
      if (d.cycle)
        throw new Error(`Cycle detected: #/${d.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
    }
  for (const h of e.seen.entries()) {
    const d = h[1];
    if (i === h[0]) {
      c(h);
      continue;
    }
    if (e.external) {
      const p = e.external.registry.get(h[0])?.id;
      if (i !== h[0] && p) {
        c(h);
        continue;
      }
    }
    if (e.metadataRegistry.get(h[0])?.id) {
      c(h);
      continue;
    }
    if (d.cycle) {
      c(h);
      continue;
    }
    d.count > 1 && e.reused === "ref" && c(h);
  }
  e.external && (e.sharedDefsExtractedFor = e.external);
}
function kT(e) {
  const i = e.anyOf;
  if (!Array.isArray(i) || i.length === 0 || e.type !== void 0)
    return;
  const a = [];
  for (const r of i) {
    if (!r || typeof r != "object")
      return;
    kT(r);
    const o = Object.keys(r);
    if (o.length !== 1 || o[0] !== "type")
      return;
    const c = r.type;
    for (const h of Array.isArray(c) ? c : [c]) {
      if (typeof h != "string")
        return;
      a.includes(h) || a.push(h);
    }
  }
  delete e.anyOf, e.type = a.length === 1 ? a[0] : a;
}
const BT = /* @__PURE__ */ new Set(["type", "properties", "required", "additionalProperties"]), YS = ["oneOf", "anyOf"];
function IS(e) {
  const i = e.additionalProperties;
  return i === void 0 || i === !1 || typeof i != "object" || i === null ? null : Object.keys(i).length ? i : null;
}
function Xd(e) {
  const i = [];
  for (const c of e) {
    if (typeof c != "object" || c.type !== "object")
      return null;
    for (const h in c)
      if (!BT.has(h))
        return null;
    i.push(c);
  }
  const a = {}, r = /* @__PURE__ */ new Set();
  for (const c of i) {
    for (const h in c.properties) {
      if (Object.prototype.hasOwnProperty.call(a, h))
        continue;
      const d = [];
      for (const p of i) {
        const g = p.properties?.[h] ?? IS(p);
        g != null && (d.some((v) => JSON.stringify(v) === JSON.stringify(g)) || d.push(g));
      }
      const m = d.length === 1 ? d[0] : Xd(d) ?? { allOf: d };
      xi(a, h, m);
    }
    for (const h of c.required ?? [])
      r.add(h);
  }
  const o = { type: "object", properties: a };
  if (r.size && (o.required = [...r]), i.every((c) => c.additionalProperties === !1))
    o.additionalProperties = !1;
  else {
    const c = [];
    for (const h of i) {
      const d = IS(h);
      d && !c.some((m) => JSON.stringify(m) === JSON.stringify(d)) && c.push(d);
    }
    c.length === 1 ? o.additionalProperties = c[0] : c.length > 1 && (o.additionalProperties = { allOf: c });
  }
  return o;
}
function P4(e) {
  const i = e.allOf;
  if (!Array.isArray(i) || i.length < 2)
    return;
  for (const o of BT)
    if (o in e)
      return;
  const a = i.filter((o) => YS.some((c) => Array.isArray(o[c])));
  let r = null;
  if (!a.length)
    r = Xd(i);
  else {
    const o = a[0], c = YS.find((m) => Array.isArray(o[m]));
    if (Object.keys(o).length !== 1)
      return;
    const h = i.filter((m) => m !== o), d = o[c].map((m) => Xd([...h, m]));
    if (d.some((m) => !m))
      return;
    r = { [c]: d };
  }
  r && (delete e.allOf, al(e, r));
}
function ZT(e, i) {
  const a = e.seen.get(i);
  if (!a)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const r = (d) => {
    const m = e.seen.get(d);
    if (m.ref === null)
      return;
    const p = m.def ?? m.schema, g = { ...p }, v = m.ref;
    if (m.ref = null, v) {
      r(v);
      const _ = e.seen.get(v), T = _.schema;
      if (T.$ref && (e.target === "draft-07" || e.target === "draft-04" || e.target === "openapi-3.0") ? (p.allOf = p.allOf ?? [], p.allOf.push(T)) : al(p, T), al(p, g), d._zod.parent === v)
        for (const A in p)
          A === "$ref" || A === "allOf" || A in g || delete p[A];
      if (T.$ref && _.def)
        for (const A in p)
          A === "$ref" || A === "allOf" || A in _.def && JSON.stringify(p[A]) === JSON.stringify(_.def[A]) && delete p[A];
    }
    const b = d._zod.parent;
    if (b && b !== v) {
      r(b);
      const _ = e.seen.get(b);
      if (_?.schema.$ref && (p.$ref = _.schema.$ref, _.def))
        for (const T in p)
          T === "$ref" || T === "allOf" || T in _.def && JSON.stringify(p[T]) === JSON.stringify(_.def[T]) && delete p[T];
    }
    e.override({
      zodSchema: d,
      jsonSchema: p,
      path: m.path ?? []
    });
  };
  if (!e.external || e.sharedEmitDoneFor !== e.external) {
    for (const d of [...e.seen.entries()].reverse())
      r(d[0]);
    if (e.target !== "openapi-3.0")
      for (const d of e.seen.entries())
        kT(d[1].def ?? d[1].schema);
    for (const d of e.deferred)
      d();
    if (e.intersections.length) {
      const d = /* @__PURE__ */ new Map();
      for (const m of e.seen.values())
        for (const p of [m.schema, m.def]) {
          const g = p?.allOf;
          if (!Array.isArray(g))
            continue;
          const v = d.get(g);
          v ? v.push(p) : d.set(g, [p]);
        }
      for (const m of e.intersections)
        for (const p of d.get(m) ?? [])
          P4(p);
    }
  }
  const o = {};
  if (e.target === "draft-2020-12" ? o.$schema = "https://json-schema.org/draft/2020-12/schema" : e.target === "draft-07" ? o.$schema = "http://json-schema.org/draft-07/schema#" : e.target === "draft-04" ? o.$schema = "http://json-schema.org/draft-04/schema#" : e.target, e.external?.uri) {
    const d = e.external.registry.get(i)?.id;
    if (!d)
      throw new Error("Schema is missing an `id` property");
    o.$id = e.external.uri(d);
  }
  al(o, a.defId ? a.schema : a.def ?? a.schema);
  const c = e.metadataRegistry.get(i)?.id;
  c !== void 0 && o.id === c && delete o.id;
  const h = e.external?.defs ?? {};
  if (!e.external || e.sharedEmitDoneFor !== e.external)
    for (const d of e.seen.entries()) {
      const m = d[1];
      m.def && m.defId && (m.def.id === m.defId && delete m.def.id, xi(h, m.defId, m.def));
    }
  e.external && (e.sharedEmitDoneFor = e.external), e.external || Object.keys(h).length > 0 && (e.target === "draft-2020-12" ? o.$defs = h : o.definitions = h);
  try {
    const d = JSON.parse(JSON.stringify(o));
    return Object.defineProperty(d, "~standard", {
      value: {
        ...i["~standard"],
        jsonSchema: {
          input: ku(i, "input", e.processors),
          output: ku(i, "output", e.processors)
        }
      },
      enumerable: !1,
      writable: !1
    }), d;
  } catch {
    throw new Error("Error converting schema to JSON.");
  }
}
function je(e, i) {
  const a = i ?? { seen: /* @__PURE__ */ new Set() };
  if (a.seen.has(e))
    return !1;
  a.seen.add(e);
  const r = e._zod.def;
  if (r.type === "transform")
    return !0;
  if (r.type === "array")
    return je(r.element, a);
  if (r.type === "set")
    return je(r.valueType, a);
  if (r.type === "lazy")
    return je(r.getter(), a);
  if (r.type === "promise" || r.type === "optional" || r.type === "nonoptional" || r.type === "nullable" || r.type === "readonly" || r.type === "default" || r.type === "prefault" || r.type === "catch")
    return je(r.innerType, a);
  if (r.type === "intersection")
    return je(r.left, a) || je(r.right, a);
  if (r.type === "record" || r.type === "map")
    return je(r.keyType, a) || je(r.valueType, a);
  if (r.type === "pipe")
    return e._zod.traits.has("$ZodCodec") ? !0 : je(r.in, a) || je(r.out, a);
  if (r.type === "object") {
    for (const o in r.shape)
      if (je(r.shape[o], a))
        return !0;
    return !1;
  }
  if (r.type === "union") {
    for (const o of r.options)
      if (je(o, a))
        return !0;
    return !1;
  }
  if (r.type === "tuple") {
    for (const o of r.items)
      if (je(o, a))
        return !0;
    return !!(r.rest && je(r.rest, a));
  }
  return !1;
}
const $4 = (e, i = {}) => (a) => {
  const r = LT({ ...a, processors: i });
  return Wt(e, r), UT(r, e), ZT(r, e);
}, ku = (e, i, a = {}) => (r) => {
  const { libraryOptions: o, target: c } = r ?? {}, h = LT({ ...o ?? {}, target: c, io: i, processors: a });
  return Wt(e, h), UT(h, e), ZT(h, e);
}, $a = (e, i, a) => {
  (e[i] === void 0 || a > e[i]) && (e[i] = a);
}, Ga = (e, i, a) => {
  (e[i] === void 0 || a < e[i]) && (e[i] = a);
}, qS = (e, i) => {
  $a(e, "minimum", i), Ga(e, "maximum", i);
}, HT = (e, i) => {
  e.multipleOf ?? (e.multipleOf = []), e.multipleOf.includes(i) || e.multipleOf.push(i);
}, PT = (e, i) => {
  e.patterns ?? (e.patterns = /* @__PURE__ */ new Set()), e.patterns.add(i);
}, $T = (e, i) => {
  e.mime = e.mime ? e.mime.filter((a) => i.includes(a)) : [...i];
}, GT = (e, i) => {
  e.format = i, i.includes("int") && (e.isInt = !0);
}, XS = (e, i) => $a(e, "minimum", i.minimum), KS = (e, i) => Ga(e, "maximum", i.maximum), FS = (e) => (i, a) => {
  GT(i, a.format);
  const [r, o] = e[a.format];
  $a(i, "minimum", r), Ga(i, "maximum", o);
}, G4 = {
  greater_than: (e, i) => $a(e, i.inclusive ? "minimum" : "exclusiveMinimum", i.value),
  less_than: (e, i) => Ga(e, i.inclusive ? "maximum" : "exclusiveMaximum", i.value),
  multiple_of: (e, i) => HT(e, i.value),
  number_format: FS(cT),
  bigint_format: FS(lD),
  min_length: XS,
  max_length: KS,
  length_equals: (e, i) => qS(e, i.length),
  min_size: XS,
  max_size: KS,
  size_equals: (e, i) => qS(e, i.size),
  string_format: (e, i) => {
    GT(e, i.format), i.pattern && PT(e, i.pattern), (i.format === "base64" || i.format === "base64url") && (e.contentEncoding = i.format), (i.local || i.precision === -1) && (e.laxFormat = !0);
  },
  mime_type: (e, i) => $T(e, i.mime)
};
function vn(e) {
  const i = {}, a = e._zod.def, r = e._zod.traits.has("$ZodCheck") ? [e, ...a.checks ?? []] : a.checks ?? [];
  for (const c of r)
    G4[c._zod.def.check]?.(i, c._zod.def);
  const o = e._zod.bag;
  o.minimum !== void 0 && $a(i, "minimum", o.minimum), o.exclusiveMinimum !== void 0 && $a(i, "exclusiveMinimum", o.exclusiveMinimum), o.maximum !== void 0 && Ga(i, "maximum", o.maximum), o.exclusiveMaximum !== void 0 && Ga(i, "exclusiveMaximum", o.exclusiveMaximum), o.multipleOf !== void 0 && HT(i, o.multipleOf), o.format !== void 0 && (i.format ?? (i.format = o.format), o.format.includes("int") && (i.isInt = !0)), o.mime && $T(i, o.mime);
  for (const c of o.patterns ?? [])
    PT(i, c);
  return i;
}
const Y4 = {
  guid: "uuid",
  url: "uri",
  datetime: "date-time",
  json_string: "json-string",
  regex: ""
  // do not set
}, I4 = /* @__PURE__ */ new Map([
  [wT, oN],
  [Gm, uN]
]), YT = (e) => I4.get(e) ?? e, q4 = (e, i, a, r) => {
  const o = a;
  o.type = "string";
  const { minimum: c, maximum: h, format: d, patterns: m, contentEncoding: p, laxFormat: g } = vn(e);
  if (typeof c == "number" && (o.minLength = c), typeof h == "number" && (o.maxLength = h), d && (o.format = Y4[d] ?? d, o.format === "" && delete o.format, (d === "time" || g) && delete o.format), p && (o.contentEncoding = p), m && m.size > 0) {
    const v = [...m].map(YT);
    v.length === 1 ? o.pattern = v[0].source : v.length > 1 && (o.allOf = [
      ...v.map((b) => ({
        ...i.target === "draft-07" || i.target === "draft-04" || i.target === "openapi-3.0" ? { type: "string" } : {},
        pattern: b.source
      }))
    ]);
  }
}, X4 = (e, i, a, r) => {
  const o = a, { minimum: c, maximum: h, multipleOf: d, exclusiveMaximum: m, exclusiveMinimum: p, isInt: g } = vn(e);
  o.type = g ? "integer" : "number";
  const v = typeof p == "number" && p >= (c ?? Number.NEGATIVE_INFINITY), b = typeof m == "number" && m <= (h ?? Number.POSITIVE_INFINITY), _ = i.target === "draft-04" || i.target === "openapi-3.0";
  if (v ? _ ? (o.minimum = p, o.exclusiveMinimum = !0) : o.exclusiveMinimum = p : typeof c == "number" && (o.minimum = c), b ? _ ? (o.maximum = m, o.exclusiveMaximum = !0) : o.exclusiveMaximum = m : typeof h == "number" && (o.maximum = h), d) {
    const T = /* @__PURE__ */ new Set();
    for (const N of d)
      Number.isFinite(N) && N !== 0 ? T.add(Math.abs(N)) : ss(e, i, o, r, `A multipleOf divisor of ${N} cannot be represented in JSON Schema`);
    const [x, ...A] = T;
    x !== void 0 && (o.multipleOf = x), A.length && (o.allOf = [...o.allOf ?? [], ...A.map((N) => ({ multipleOf: N }))]);
  }
}, K4 = (e, i, a, r) => {
  a.type = "boolean";
}, F4 = (e, i, a, r) => {
  a.not = {};
}, Q4 = (e, i, a, r) => {
}, J4 = (e, i, a, r) => {
  const o = e._zod.def, c = $d(o.entries);
  if (c.length === 0) {
    a.not = {};
    return;
  }
  c.every((h) => typeof h == "number") && (a.type = "number"), c.every((h) => typeof h == "string") && (a.type = "string"), a.enum = c;
}, W4 = (e, i, a, r) => {
  const o = e._zod.def;
  if (o.values.length === 0) {
    a.not = {};
    return;
  }
  const c = [];
  for (const h of o.values)
    if (h === void 0) {
      if (ss(e, i, a, r, "Literal `undefined` cannot be represented in JSON Schema"))
        return;
    } else if (typeof h == "bigint") {
      if (ss(e, i, a, r, "BigInt literals cannot be represented in JSON Schema"))
        return;
      c.push(Number(h));
    } else
      c.push(h);
  if (c.length !== 0) if (c.length === 1) {
    const h = c[0];
    a.type = h === null ? "null" : typeof h, i.target === "draft-04" || i.target === "openapi-3.0" ? a.enum = [h] : a.const = h;
  } else
    c.every((h) => typeof h == "number") && (a.type = "number"), c.every((h) => typeof h == "string") && (a.type = "string"), c.every((h) => typeof h == "boolean") && (a.type = "boolean"), c.every((h) => h === null) && (a.type = "null"), a.enum = c;
}, tj = (e, i, a, r) => {
  ss(e, i, a, r, "Custom types cannot be represented in JSON Schema");
}, ej = (e, i, a, r) => {
  ss(e, i, a, r, "Transforms cannot be represented in JSON Schema");
}, nj = (e, i, a, r) => {
  const o = a, c = e._zod.def, { minimum: h, maximum: d } = vn(e);
  typeof h == "number" && (o.minItems = h), typeof d == "number" && (o.maxItems = d), o.type = "array", o.items = Wt(c.element, i, {
    ...r,
    path: [...r.path, "items"]
  });
};
function ml(e) {
  const i = e._zod.def;
  return i.type === "pipe" && i.in._zod.traits.has("$ZodTransform") ? ml(i.out) : i.type === "catch" ? ml(i.innerType) : e._zod.optin;
}
const ij = (e, i, a, r) => {
  const o = a, c = e._zod.def, h = c.shape;
  if (Object.getOwnPropertySymbols(h).length && ss(e, i, o, r, "Symbol keys cannot be represented in JSON Schema"))
    return;
  o.type = "object", o.properties = {};
  for (const p in h)
    xi(o.properties, p, Wt(h[p], i, {
      ...r,
      path: [...r.path, "properties", p]
    }));
  const m = [];
  for (const p of Object.keys(h)) {
    const g = c.shape[p];
    (i.io === "input" ? ml(g) === void 0 : g._zod.optout === void 0) && m.push(p);
  }
  m.length > 0 && (o.required = m), c.catchall?._zod.def.type === "never" ? o.additionalProperties = !1 : c.catchall ? c.catchall && (o.additionalProperties = Wt(c.catchall, i, {
    ...r,
    path: [...r.path, "additionalProperties"]
  })) : i.io === "output" && (o.additionalProperties = !1);
}, sj = (e, i, a, r) => {
  const o = e._zod.def, c = o.inclusive === !1, h = o.options.map((d, m) => Wt(d, i, {
    ...r,
    path: [...r.path, c ? "oneOf" : "anyOf", m]
  }));
  c ? a.oneOf = h : a.anyOf = h;
}, aj = (e, i, a, r) => {
  const o = e._zod.def, c = Wt(o.left, i, {
    ...r,
    path: [...r.path, "allOf", 0]
  }), h = Wt(o.right, i, {
    ...r,
    path: [...r.path, "allOf", 1]
  }), d = (p) => "allOf" in p && Object.keys(p).length === 1, m = [
    ...d(c) ? c.allOf : [c],
    ...d(h) ? h.allOf : [h]
  ];
  a.allOf = m, i.intersections.push(m);
}, rj = (e, i, a, r) => {
  const o = a, c = e._zod.def;
  o.type = "array";
  const h = i.target === "draft-2020-12" ? "prefixItems" : "items", d = i.target === "draft-2020-12" || i.target === "openapi-3.0" ? "items" : "additionalItems", m = c.items.map((x, A) => Wt(x, i, {
    ...r,
    path: [...r.path, h, A]
  })), p = c.rest ? Wt(c.rest, i, {
    ...r,
    path: [...r.path, d, ...i.target === "openapi-3.0" ? [c.items.length] : []]
  }) : null;
  let g = c.items.length;
  for (; g > 0; ) {
    const x = c.items[g - 1];
    if (!(i.io === "input" ? ml(x) !== void 0 : x._zod.optout === "optional"))
      break;
    g--;
  }
  const v = c.items.length, b = !c.rest;
  i.target === "draft-2020-12" ? (o.prefixItems = m, b ? o.items = !1 : p && (o.items = p), g > 0 && (o.minItems = g), b && (o.maxItems = v)) : i.target === "openapi-3.0" ? (o.items = {
    anyOf: m
  }, p && o.items.anyOf.push(p), g > 0 && (o.minItems = g), b && (o.maxItems = v)) : (o.items = m, b ? o.additionalItems = !1 : p && (o.additionalItems = p), g > 0 && (o.minItems = g), b && (o.maxItems = v));
  const { minimum: _, maximum: T } = vn(e);
  typeof _ == "number" && (o.minItems = _), typeof T == "number" && (o.maxItems = T);
};
function Kd(e, i, a) {
  if (i.$ref) {
    if (a.has(i))
      return i;
    a.add(i);
    const T = e.get(i)?.def;
    if (!T)
      return i;
    const x = Kd(e, T, a);
    return x === T ? i : x;
  }
  for (const T of ["anyOf", "oneOf"]) {
    const x = i[T];
    if (!Array.isArray(x))
      continue;
    const A = x.map((N) => Kd(e, N, a));
    A.some((N, D) => N !== x[D]) && (i = { ...i, [T]: A });
  }
  const r = Array.isArray(i.type) ? i.type : [i.type], o = !r.includes("string") && r.some((T) => T === "number" || T === "integer"), c = i.enum ?? (i.const !== void 0 ? [i.const] : void 0);
  if (!o && !c?.some((T) => typeof T == "number"))
    return i;
  const { minimum: h, maximum: d, exclusiveMinimum: m, exclusiveMaximum: p, multipleOf: g, format: v, id: b, ..._ } = i;
  return _.enum ? _.enum = _.enum.map((T) => typeof T == "number" ? String(T) : T) : typeof _.const == "number" && (_.const = String(_.const)), o && (_.type = "string", c || (_.pattern = (r.includes("number") ? Hm : yN).source)), _;
}
const Fd = /* @__PURE__ */ new WeakMap();
function lj(e) {
  const i = /* @__PURE__ */ new Map();
  for (const r of e.seen.values())
    r.def && !i.has(r.schema) && i.set(r.schema, r);
  const a = /* @__PURE__ */ new Map();
  for (const r of Fd.get(e) ?? []) {
    const o = e.seen.get(r), c = (o?.def ?? o?.schema)?.propertyNames;
    if (!c || c === !0 || a.has(c))
      continue;
    const h = Kd(i, c, /* @__PURE__ */ new Set());
    h !== c && a.set(c, h);
  }
  if (a.size)
    for (const r of e.seen.values())
      for (const o of [r.schema, r.def]) {
        const c = o && a.get(o.propertyNames);
        c && (o.propertyNames = c);
      }
}
const oj = (e, i, a, r) => {
  const o = a, c = e._zod.def;
  o.type = "object";
  const h = c.keyType, d = vn(h).patterns;
  if (c.mode === "loose" && d && d.size > 0) {
    const g = Wt(c.valueType, i, {
      ...r,
      path: [...r.path, "patternProperties", "*"]
    });
    o.patternProperties = {};
    for (const v of d)
      xi(o.patternProperties, YT(v).source, g);
  } else {
    if (i.target === "draft-07" || i.target === "draft-2020-12") {
      o.propertyNames = Wt(c.keyType, i, {
        ...r,
        path: [...r.path, "propertyNames"]
      });
      let g = Fd.get(i);
      g || (g = [], Fd.set(i, g), i.deferred.push(() => lj(i))), g.push(e);
    }
    o.additionalProperties = Wt(c.valueType, i, {
      ...r,
      path: [...r.path, "additionalProperties"]
    });
  }
  const m = h._zod.values, p = i.io === "input" && ml(c.valueType) !== void 0;
  if (m && !c.partial && !p) {
    const g = [...m].filter((v) => typeof v == "string" || typeof v == "number");
    g.length > 0 && (o.required = g.map(String));
  }
}, uj = (e, i, a, r) => {
  const o = e._zod.def, c = Wt(o.innerType, i, r), h = i.seen.get(e);
  i.target === "openapi-3.0" ? (h.ref = o.innerType, a.nullable = !0) : a.anyOf = [c, { type: "null" }];
}, cj = (e, i, a, r) => {
  const o = e._zod.def;
  Wt(o.innerType, i, r);
  const c = i.seen.get(e);
  c.ref = o.innerType;
}, Ym = /* @__PURE__ */ Symbol();
function IT(e, i, a, r, o) {
  let c = !1;
  const h = JSON.stringify(e, (d, m) => typeof m != "bigint" ? m : (c = !0, null));
  return c ? (ss(i, a, r, o, "BigInt defaults cannot be represented in JSON Schema"), Ym) : JSON.parse(h);
}
const fj = (e, i, a, r) => {
  const o = e._zod.def;
  Wt(o.innerType, i, r);
  const c = i.seen.get(e);
  c.ref = o.innerType;
  const h = IT(o.defaultValue, e, i, a, r);
  h !== Ym && (a.default = h);
}, hj = (e, i, a, r) => {
  const o = e._zod.def;
  Wt(o.innerType, i, r);
  const c = i.seen.get(e);
  if (c.ref = o.innerType, i.io !== "input")
    return;
  const h = IT(o.defaultValue, e, i, a, r);
  h !== Ym && (a._prefault = h);
}, dj = (e, i, a, r) => {
  const o = e._zod.def;
  Wt(o.innerType, i, r);
  const c = i.seen.get(e);
  c.ref = o.innerType;
  let h;
  try {
    h = o.catchValue(void 0);
  } catch {
    ss(e, i, a, r, "Dynamic catch values are not supported in JSON Schema");
    return;
  }
  a.default = h;
}, mj = (e, i, a, r) => {
  const o = e._zod.def, c = o.in._zod.traits.has("$ZodTransform"), h = i.io === "input" ? c ? o.out : o.in : o.out;
  Wt(h, i, r);
  const d = i.seen.get(e);
  d.ref = h;
}, pj = (e, i, a, r) => {
  const o = e._zod.def;
  Wt(o.innerType, i, r);
  const c = i.seen.get(e);
  c.ref = o.innerType, a.readOnly = !0;
}, qT = (e, i, a, r) => {
  const o = e._zod.def;
  Wt(o.innerType, i, r);
  const c = i.seen.get(e);
  c.ref = o.innerType;
}, QS = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
function ru(e, i, a) {
  Object.defineProperty(e, i, {
    configurable: !0,
    enumerable: !1,
    get() {
      const r = a(this);
      return Object.defineProperty(this, i, { value: r, configurable: !0, writable: !0 }), r;
    },
    set(r) {
      Object.defineProperty(this, i, { value: r, configurable: !0, writable: !0 });
    }
  });
}
const gj = (e, i) => {
  CD.init(e, i), e.name = "ZodError";
  const a = Object.getPrototypeOf(e);
  QS.has(a) || (QS.add(a), ru(a, "format", (r) => (o) => DD(r, o)), ru(a, "flatten", (r) => (o) => RD(r, o)), ru(a, "addIssue", (r) => (o) => {
    r.issues.push(o), r.message = JSON.stringify(r.issues, Gd, 2);
  }), ru(a, "addIssues", (r) => (o) => {
    r.issues.push(...o), r.message = JSON.stringify(r.issues, Gd, 2);
  }), Object.defineProperty(a, "isEmpty", {
    configurable: !0,
    enumerable: !1,
    get() {
      return this.issues.length === 0;
    }
  }));
}, Tn = /* @__PURE__ */ P("ZodError", gj, void 0, {
  Parent: Error
}), yj = /* @__PURE__ */ Um(Tn), vj = /* @__PURE__ */ km(Tn), bj = /* @__PURE__ */ Bm(Tn), Sj = /* @__PURE__ */ Zm(Tn), _j = /* @__PURE__ */ kD(Tn), Tj = /* @__PURE__ */ BD(Tn), xj = /* @__PURE__ */ ZD(Tn), Ej = /* @__PURE__ */ HD(Tn), wj = /* @__PURE__ */ PD(Tn), Aj = /* @__PURE__ */ $D(Tn), Oj = /* @__PURE__ */ GD(Tn), zj = /* @__PURE__ */ YD(Tn);
function Cj() {
  _n.localeError || ti(I3());
}
function bl() {
  _n.memoizer || ti({ memoizer: $3() });
}
const qt = /* @__PURE__ */ P("ZodType", (e, i) => (Cj(), Gt.init(e, i), e.def = i, e.type = i.type, e), {
  check(...e) {
    const i = this.def;
    return this.clone(an(i, {
      checks: [
        ...i.checks ?? [],
        ...e.map((a) => typeof a == "function" ? { _zod: { check: a, def: { check: "custom" }, onattach: [] } } : a)
      ]
    }), { parent: !0 });
  },
  with(...e) {
    return this.check(...e);
  },
  clone(e, i) {
    return rs(this, e, i);
  },
  brand() {
    return this;
  },
  register(e, i) {
    return e.add(this, i), this;
  },
  refine(e, i) {
    return this.check(w5(e, i));
  },
  superRefine(e, i) {
    return this.check(A5(e, i));
  },
  overwrite(e) {
    return this.check(/* @__PURE__ */ Xa(e));
  },
  optional() {
    return WS(this);
  },
  exactOptional() {
    return h5(this);
  },
  nullable() {
    return t1(this);
  },
  nullish() {
    return WS(t1(this));
  },
  nonoptional(e) {
    return v5(this, e);
  },
  array() {
    return Ce(this);
  },
  or(e) {
    return WT([this, e]);
  },
  and(e) {
    return l5(this, e);
  },
  transform(e) {
    return e1(this, f5(e));
  },
  default(e) {
    return p5(this, e);
  },
  prefault(e) {
    return y5(this, e);
  },
  catch(e) {
    return S5(this, e);
  },
  pipe(e) {
    return e1(this, e);
  },
  readonly() {
    return x5(this);
  },
  describe(e) {
    const i = this.clone();
    return Wr.add(i, { description: e }), i;
  },
  meta(...e) {
    if (e.length === 0)
      return Wr.get(this);
    const i = this.clone();
    return Wr.add(i, e[0]), i;
  },
  isOptional() {
    return this.safeParse(void 0).success;
  },
  isNullable() {
    return this.safeParse(null).success;
  },
  apply(e, ...i) {
    return i.length === 0 ? e(this) : e(this, ...i);
  },
  // Overrides core's `~standard` to add `jsonSchema`. Must stay a prototype entry: redefining it per instance demotes instances to dictionary mode.
  get "~standard"() {
    return hT(this, "~standard", {
      ...ST(this),
      jsonSchema: {
        input: ku(this, "input"),
        output: ku(this, "output")
      }
    });
  },
  set "~standard"(e) {
    is(this, "~standard", e);
  },
  parse: function e(i, a) {
    return yj(this, i, a, { callee: e });
  },
  parseAsync: async function e(i, a) {
    return await vj(this, i, a, { callee: e });
  },
  safeParse(e, i) {
    return bj(this, e, i);
  },
  async safeParseAsync(e, i) {
    return Sj(this, e, i);
  },
  // `spa` is an alias: same function object as `safeParseAsync`, as before.
  get spa() {
    return this?.safeParseAsync;
  },
  set spa(e) {
    is(this, "spa", e);
  },
  validate(e, i) {
    return VD(this, e, i);
  },
  validateAsync(e, i) {
    return UD(this, e, i);
  },
  encode: function e(i, a) {
    return _j(this, i, a, { callee: e });
  },
  decode: function e(i, a) {
    return Tj(this, i, a, { callee: e });
  },
  encodeAsync: async function e(i, a) {
    return await xj(this, i, a, { callee: e });
  },
  decodeAsync: async function e(i, a) {
    return await Ej(this, i, a, { callee: e });
  },
  safeEncode(e, i) {
    return wj(this, e, i);
  },
  safeDecode(e, i) {
    return Aj(this, e, i);
  },
  async safeEncodeAsync(e, i) {
    return Oj(this, e, i);
  },
  async safeDecodeAsync(e, i) {
    return zj(this, e, i);
  },
  toJSONSchema(e) {
    return $4(this, {})(e);
  },
  // Reads through to the registry on every access, so it must not cache.
  get description() {
    return Wr.get(this)?.description;
  },
  // No setter: `schema._def = x` throws, as it did when `_def` was a non-writable own property.
  get _def() {
    return this._zod.def;
  }
}), XT = /* @__PURE__ */ P(
  "_ZodString",
  (e, i) => {
    $m.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => q4(e, a, r);
  },
  /* @__PURE__ */ dT({
    format: (e) => vn(e).format ?? null,
    minLength: (e) => vn(e).minimum ?? null,
    maxLength: (e) => vn(e).maximum ?? null
  }, {
    regex(...e) {
      return this.check(/* @__PURE__ */ O4(...e));
    },
    includes(...e) {
      return this.check(/* @__PURE__ */ M4(...e));
    },
    startsWith(...e) {
      return this.check(/* @__PURE__ */ R4(...e));
    },
    endsWith(...e) {
      return this.check(/* @__PURE__ */ D4(...e));
    },
    min(...e) {
      return this.check(/* @__PURE__ */ Uu(...e));
    },
    max(...e) {
      return this.check(/* @__PURE__ */ jT(...e));
    },
    length(...e) {
      return this.check(/* @__PURE__ */ VT(...e));
    },
    nonempty(...e) {
      return this.check(/* @__PURE__ */ Uu(1, ...e));
    },
    lowercase(e) {
      return this.check(/* @__PURE__ */ z4(e));
    },
    uppercase(e) {
      return this.check(/* @__PURE__ */ C4(e));
    },
    trim() {
      return this.check(/* @__PURE__ */ j4());
    },
    normalize(...e) {
      return this.check(/* @__PURE__ */ N4(...e));
    },
    toLowerCase() {
      return this.check(/* @__PURE__ */ V4());
    },
    toUpperCase() {
      return this.check(/* @__PURE__ */ L4());
    },
    slugify() {
      return this.check(/* @__PURE__ */ U4());
    }
  })
), Mj = /* @__PURE__ */ P("ZodString", (e, i) => {
  $m.init(e, i), XT.init(e, i);
}, {
  email(e) {
    return this.check(/* @__PURE__ */ F3(Vj, e));
  },
  url(e) {
    return this.check(/* @__PURE__ */ n4(Uj, e));
  },
  jwt(e) {
    return this.check(/* @__PURE__ */ y4(Jj, e));
  },
  emoji(e) {
    return this.check(/* @__PURE__ */ i4(kj, e));
  },
  guid(e) {
    return this.check(/* @__PURE__ */ Q3(Lj, e));
  },
  uuid(e) {
    return this.check(/* @__PURE__ */ J3(lu, e));
  },
  uuidv4(e) {
    return this.check(/* @__PURE__ */ W3(lu, e));
  },
  uuidv6(e) {
    return this.check(/* @__PURE__ */ t4(lu, e));
  },
  uuidv7(e) {
    return this.check(/* @__PURE__ */ e4(lu, e));
  },
  nanoid(e) {
    return this.check(/* @__PURE__ */ s4(Bj, e));
  },
  cuid(e) {
    return this.check(/* @__PURE__ */ a4(Zj, e));
  },
  cuid2(e) {
    return this.check(/* @__PURE__ */ r4(Hj, e));
  },
  ulid(e) {
    return this.check(/* @__PURE__ */ l4(Pj, e));
  },
  base64(e) {
    return this.check(/* @__PURE__ */ m4(Kj, e));
  },
  base64url(e) {
    return this.check(/* @__PURE__ */ p4(Fj, e));
  },
  xid(e) {
    return this.check(/* @__PURE__ */ o4($j, e));
  },
  ksuid(e) {
    return this.check(/* @__PURE__ */ u4(Gj, e));
  },
  ipv4(e) {
    return this.check(/* @__PURE__ */ c4(Yj, e));
  },
  ipv6(e) {
    return this.check(/* @__PURE__ */ f4(Ij, e));
  },
  cidrv4(e) {
    return this.check(/* @__PURE__ */ h4(qj, e));
  },
  cidrv6(e) {
    return this.check(/* @__PURE__ */ d4(Xj, e));
  },
  e164(e) {
    return this.check(/* @__PURE__ */ g4(Qj, e));
  },
  datetime(e) {
    return this.check(/* @__PURE__ */ v4(Rj, e));
  },
  date(e) {
    return this.check(/* @__PURE__ */ b4(Dj, e));
  },
  time(e) {
    return this.check(/* @__PURE__ */ S4(Nj, e));
  },
  duration(e) {
    return this.check(/* @__PURE__ */ _4(jj, e));
  }
});
function it(e) {
  return /* @__PURE__ */ K3(Mj, e);
}
const Kt = /* @__PURE__ */ P("ZodStringFormat", (e, i) => {
  It.init(e, i), XT.init(e, i);
}), Rj = /* @__PURE__ */ P("ZodISODateTime", (e, i) => {
  JN.init(e, i), Kt.init(e, i);
}), Dj = /* @__PURE__ */ P("ZodISODate", (e, i) => {
  WN.init(e, i), Kt.init(e, i);
}), Nj = /* @__PURE__ */ P("ZodISOTime", (e, i) => {
  t3.init(e, i), Kt.init(e, i);
}), jj = /* @__PURE__ */ P("ZodISODuration", (e, i) => {
  e3.init(e, i), Kt.init(e, i);
}), Vj = /* @__PURE__ */ P("ZodEmail", (e, i) => {
  kN.init(e, i), Kt.init(e, i);
}), Lj = /* @__PURE__ */ P("ZodGUID", (e, i) => {
  LN.init(e, i), Kt.init(e, i);
}), lu = /* @__PURE__ */ P("ZodUUID", (e, i) => {
  UN.init(e, i), Kt.init(e, i);
}), Uj = /* @__PURE__ */ P("ZodURL", (e, i) => {
  GN.init(e, i), Kt.init(e, i);
}), kj = /* @__PURE__ */ P("ZodEmoji", (e, i) => {
  YN.init(e, i), Kt.init(e, i);
}), Bj = /* @__PURE__ */ P("ZodNanoID", (e, i) => {
  IN.init(e, i), Kt.init(e, i);
}), Zj = /* @__PURE__ */ P("ZodCUID", (e, i) => {
  qN.init(e, i), Kt.init(e, i);
}), Hj = /* @__PURE__ */ P("ZodCUID2", (e, i) => {
  XN.init(e, i), Kt.init(e, i);
}), Pj = /* @__PURE__ */ P("ZodULID", (e, i) => {
  KN.init(e, i), Kt.init(e, i);
}), $j = /* @__PURE__ */ P("ZodXID", (e, i) => {
  FN.init(e, i), Kt.init(e, i);
}), Gj = /* @__PURE__ */ P("ZodKSUID", (e, i) => {
  QN.init(e, i), Kt.init(e, i);
}), Yj = /* @__PURE__ */ P("ZodIPv4", (e, i) => {
  n3.init(e, i), Kt.init(e, i);
}), Ij = /* @__PURE__ */ P("ZodIPv6", (e, i) => {
  s3.init(e, i), Kt.init(e, i);
}), qj = /* @__PURE__ */ P("ZodCIDRv4", (e, i) => {
  a3.init(e, i), Kt.init(e, i);
}), Xj = /* @__PURE__ */ P("ZodCIDRv6", (e, i) => {
  l3.init(e, i), Kt.init(e, i);
}), Kj = /* @__PURE__ */ P("ZodBase64", (e, i) => {
  o3.init(e, i), Kt.init(e, i);
}), Fj = /* @__PURE__ */ P("ZodBase64URL", (e, i) => {
  c3.init(e, i), Kt.init(e, i);
}), Qj = /* @__PURE__ */ P("ZodE164", (e, i) => {
  f3.init(e, i), Kt.init(e, i);
}), Jj = /* @__PURE__ */ P("ZodJWT", (e, i) => {
  d3.init(e, i), Kt.init(e, i);
}), KT = /* @__PURE__ */ P(
  "ZodNumber",
  (e, i) => {
    AT.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => X4(e, a, r, o), e.isFinite = !0;
  },
  /* @__PURE__ */ dT({
    minValue: (e) => {
      const { minimum: i, exclusiveMinimum: a } = vn(e);
      return Math.max(i ?? Number.NEGATIVE_INFINITY, a ?? Number.NEGATIVE_INFINITY);
    },
    maxValue: (e) => {
      const { maximum: i, exclusiveMaximum: a } = vn(e);
      return Math.min(i ?? Number.POSITIVE_INFINITY, a ?? Number.POSITIVE_INFINITY);
    },
    isInt: (e) => {
      const { isInt: i, multipleOf: a } = vn(e);
      return !!i || !!a?.some(Number.isSafeInteger);
    },
    format: (e) => vn(e).format ?? null
  }, {
    gt(e, i) {
      return this.check(/* @__PURE__ */ PS(e, i));
    },
    gte(e, i) {
      return this.check(/* @__PURE__ */ dd(e, i));
    },
    min(e, i) {
      return this.check(/* @__PURE__ */ dd(e, i));
    },
    lt(e, i) {
      return this.check(/* @__PURE__ */ HS(e, i));
    },
    lte(e, i) {
      return this.check(/* @__PURE__ */ hd(e, i));
    },
    max(e, i) {
      return this.check(/* @__PURE__ */ hd(e, i));
    },
    int(e) {
      return this.check(Vn(e));
    },
    safe(e) {
      return this.check(Vn(e));
    },
    positive(e) {
      return this.check(/* @__PURE__ */ PS(0, e));
    },
    nonnegative(e) {
      return this.check(/* @__PURE__ */ dd(0, e));
    },
    negative(e) {
      return this.check(/* @__PURE__ */ HS(0, e));
    },
    nonpositive(e) {
      return this.check(/* @__PURE__ */ hd(0, e));
    },
    multipleOf(e, i) {
      return this.check(/* @__PURE__ */ $S(e, i));
    },
    step(e, i) {
      return this.check(/* @__PURE__ */ $S(e, i));
    },
    finite() {
      return this;
    }
  })
);
function Et(e) {
  return /* @__PURE__ */ T4(KT, e);
}
const Wj = /* @__PURE__ */ P("ZodNumberFormat", (e, i) => {
  m3.init(e, i), KT.init(e, i);
});
function Vn(e) {
  return /* @__PURE__ */ x4(Wj, e);
}
const t5 = /* @__PURE__ */ P("ZodBoolean", (e, i) => {
  p3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => K4(e, a, r);
});
function rl(e) {
  return /* @__PURE__ */ E4(t5, e);
}
const e5 = /* @__PURE__ */ P("ZodUnknown", (e, i) => {
  g3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => Q4();
});
function Qd() {
  return /* @__PURE__ */ w4(e5);
}
const n5 = /* @__PURE__ */ P("ZodNever", (e, i) => {
  y3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => F4(e, a, r);
});
function FT(e) {
  return /* @__PURE__ */ A4(n5, e);
}
const i5 = /* @__PURE__ */ P("ZodArray", (e, i) => {
  bl(), v3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => nj(e, a, r, o), e.element = i.element;
}, {
  min(e, i) {
    return this.check(/* @__PURE__ */ Uu(e, i));
  },
  nonempty(e) {
    return this.check(/* @__PURE__ */ Uu(1, e));
  },
  max(e, i) {
    return this.check(/* @__PURE__ */ jT(e, i));
  },
  length(e, i) {
    return this.check(/* @__PURE__ */ VT(e, i));
  },
  unwrap() {
    return this.element;
  }
});
function Ce(e, i) {
  return /* @__PURE__ */ k4(i5, e, i);
}
const QT = /* @__PURE__ */ P("ZodObject", (e, i) => {
  bl(), _3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => ij(e, a, r, o), _D(e, "shape", (a) => a._zod.def.shape, !1);
}, {
  keyof() {
    return Qu(Object.keys(this._zod.def.shape));
  },
  catchall(e) {
    return this.clone(an(this._zod.def, { catchall: e }));
  },
  passthrough() {
    return this.clone(an(this._zod.def, { catchall: Qd() }));
  },
  loose() {
    return this.clone(an(this._zod.def, { catchall: Qd() }));
  },
  strict() {
    return this.clone(an(this._zod.def, { catchall: FT() }));
  },
  strip() {
    return this.clone(an(this._zod.def, { catchall: void 0 }));
  },
  extend(e) {
    return cD(this, e);
  },
  safeExtend(e) {
    return fD(this, e);
  },
  merge(e) {
    return hD(this, e);
  },
  pick(e) {
    return oD(this, e);
  },
  omit(e) {
    return uD(this, e);
  },
  partial(...e) {
    return SS(Im, this, e[0]);
  },
  exactPartial(...e) {
    return SS(tx, this, e[0], "exactPartial");
  },
  required(...e) {
    return dD(ex, this, e[0]);
  }
});
function Ie(e, i) {
  return new QT({
    type: "object",
    shape: e,
    catchall: FT(),
    ...at(i)
  });
}
function Si(e, i) {
  return new QT({
    type: "object",
    shape: e,
    catchall: Qd(),
    ...at(i)
  });
}
const JT = /* @__PURE__ */ P("ZodUnion", (e, i) => {
  CT.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => sj(e, a, r, o), e.options = i.options;
});
function WT(e, i) {
  return new JT({
    type: "union",
    options: e,
    ...at(i)
  });
}
const s5 = /* @__PURE__ */ P("ZodDiscriminatedUnion", (e, i) => {
  JT.init(e, i), x3.init(e, i);
});
function a5(e, i, a) {
  return new s5({
    type: "union",
    options: i,
    discriminator: e,
    ...at(a)
  });
}
const r5 = /* @__PURE__ */ P("ZodIntersection", (e, i) => {
  E3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => aj(e, a, r, o);
});
function l5(e, i) {
  return new r5({
    type: "intersection",
    left: e,
    right: i
  });
}
const o5 = /* @__PURE__ */ P("ZodTuple", (e, i) => {
  bl(), w3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => rj(e, a, r, o);
}, {
  rest(e) {
    return this.clone({
      ...this._zod.def,
      rest: e
    });
  },
  partial() {
    const e = this._zod.def;
    if (e.checks?.length)
      throw new Error(".partial() cannot be used on tuple schemas containing refinements");
    return this.clone({
      ...e,
      items: e.items.map((i) => new Im({ type: "optional", innerType: i }))
    });
  }
});
function Bu(e, i, a) {
  const r = i instanceof Gt, o = r ? a : i, c = r ? i : null;
  return new o5({
    type: "tuple",
    items: e,
    rest: c,
    ...at(o)
  });
}
const JS = /* @__PURE__ */ P("ZodRecord", (e, i) => {
  bl(), A3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => oj(e, a, r, o), e.keyType = i.keyType, e.valueType = i.valueType;
});
function md(e, i, a) {
  return !i || !i._zod ? new JS({
    type: "record",
    keyType: it(),
    valueType: e,
    ...at(i)
  }) : new JS({
    type: "record",
    keyType: e,
    valueType: i,
    ...at(a)
  });
}
const Jd = /* @__PURE__ */ P("ZodEnum", (e, i) => {
  O3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (r, o, c) => J4(e, r, o), e.enum = i.entries, e.options = [...e._zod.values];
  const a = new Set(Object.keys(i.entries));
  e.extract = (r, o) => {
    const c = {};
    for (const h of r)
      if (a.has(h))
        c[h] = i.entries[h];
      else
        throw new Error(`Key ${h} not found in enum`);
    return new Jd({
      ...i,
      checks: [],
      ...at(o),
      entries: c
    });
  }, e.exclude = (r, o) => {
    const c = { ...i.entries };
    for (const h of r)
      if (a.has(h))
        delete c[h];
      else
        throw new Error(`Key ${h} not found in enum`);
    return new Jd({
      ...i,
      checks: [],
      ...at(o),
      entries: c
    });
  };
});
function Qu(e, i) {
  const a = Array.isArray(e) ? Object.fromEntries(e.map((r) => [r, r])) : e;
  return new Jd({
    type: "enum",
    entries: a,
    ...at(i)
  });
}
const u5 = /* @__PURE__ */ P("ZodLiteral", (e, i) => {
  z3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => W4(e, a, r, o), e.values = new Set(i.values), Object.defineProperty(e, "value", {
    get() {
      if (i.values.length > 1)
        throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
      return i.values[0];
    }
  });
});
function Ge(e, i) {
  return new u5({
    type: "literal",
    values: Array.isArray(e) ? e : [e],
    ...at(i)
  });
}
const c5 = /* @__PURE__ */ P("ZodTransform", (e, i) => {
  bl(), C3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => ej(e, a, r, o), e._zod.parse = (a, r) => {
    if (r.direction === "backward")
      throw new mT(e.constructor.name);
    a.addIssue = (c) => {
      if (typeof c == "string")
        a.issues.push(dl(c, a.value, i));
      else {
        const h = c;
        h.fatal && (h.continue = !1), h.code ?? (h.code = "custom"), "input" in h || (h.input = a.value), h.inst ?? (h.inst = e), a.issues.push(dl(h));
      }
    };
    const o = i.transform(a.value, a);
    return o instanceof Promise ? o.then((c) => (a.value = c, a)) : (a.value = o, a);
  };
});
function f5(e) {
  return new c5({
    type: "transform",
    transform: e
  });
}
const Im = /* @__PURE__ */ P("ZodOptional", (e, i) => {
  MT.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => qT(e, a, r, o), e.unwrap = () => e._zod.def.innerType;
});
function WS(e) {
  return new Im({
    type: "optional",
    innerType: e
  });
}
const tx = /* @__PURE__ */ P("ZodExactOptional", (e, i) => {
  M3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => qT(e, a, r, o), e.unwrap = () => e._zod.def.innerType;
});
function h5(e) {
  return new tx({
    type: "optional",
    innerType: e
  });
}
const d5 = /* @__PURE__ */ P("ZodNullable", (e, i) => {
  R3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => uj(e, a, r, o), e.unwrap = () => e._zod.def.innerType;
});
function t1(e) {
  return new d5({
    type: "nullable",
    innerType: e
  });
}
const m5 = /* @__PURE__ */ P("ZodDefault", (e, i) => {
  D3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => fj(e, a, r, o), e.unwrap = () => e._zod.def.innerType, e.removeDefault = e.unwrap;
});
function p5(e, i) {
  return new m5({
    type: "default",
    innerType: e,
    get defaultValue() {
      return typeof i == "function" ? i() : oT(i);
    }
  });
}
const g5 = /* @__PURE__ */ P("ZodPrefault", (e, i) => {
  N3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => hj(e, a, r, o), e.unwrap = () => e._zod.def.innerType;
});
function y5(e, i) {
  return new g5({
    type: "prefault",
    innerType: e,
    get defaultValue() {
      return typeof i == "function" ? i() : oT(i);
    }
  });
}
const ex = /* @__PURE__ */ P("ZodNonOptional", (e, i) => {
  j3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => cj(e, a, r, o), e.unwrap = () => e._zod.def.innerType;
});
function v5(e, i) {
  return new ex({
    type: "nonoptional",
    innerType: e,
    ...at(i)
  });
}
const b5 = /* @__PURE__ */ P("ZodCatch", (e, i) => {
  V3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => dj(e, a, r, o), e.unwrap = () => e._zod.def.innerType, e.removeCatch = e.unwrap;
});
function S5(e, i) {
  return new b5({
    type: "catch",
    innerType: e,
    catchValue: typeof i == "function" ? i : xD(i)
  });
}
const _5 = /* @__PURE__ */ P("ZodPipe", (e, i) => {
  L3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => mj(e, a, r, o), e.in = i.in, e.out = i.out;
});
function e1(e, i) {
  return new _5({
    type: "pipe",
    in: e,
    out: i
    // ...util.normalizeParams(params),
  });
}
const T5 = /* @__PURE__ */ P("ZodReadonly", (e, i) => {
  U3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => pj(e, a, r, o), e.unwrap = () => e._zod.def.innerType;
});
function x5(e) {
  return new T5({
    type: "readonly",
    innerType: e
  });
}
const E5 = /* @__PURE__ */ P("ZodCustom", (e, i) => {
  k3.init(e, i), qt.init(e, i), e._zod.processJSONSchema = (a, r, o) => tj(e, a, r, o);
});
function w5(e, i = {}) {
  return /* @__PURE__ */ B4(E5, e, i);
}
function A5(e, i) {
  return /* @__PURE__ */ Z4(e, i);
}
const pd = "RUN_IN_PROGRESS", O5 = [".xs", ".xcs"], z5 = [".csv", ".xlsx", ".xlsm"], C5 = Qu(["row", "col"]);
function nx(e) {
  for (const i of e) {
    const a = i.codePointAt(0) ?? 0;
    if (a < 32 || a === 127) return !1;
  }
  return !0;
}
function n1(e, i) {
  const a = e.toLowerCase();
  return i.some((r) => a.endsWith(r));
}
const ou = it().min(1).refine(nx, "path contains control characters");
Ie({
  templatePath: ou.refine(
    (e) => n1(e, O5),
    "templates must be .xs or .xcs"
  ),
  csvPath: ou.refine(
    (e) => n1(e, z5),
    "serial files must be .csv, .xlsx or .xlsm"
  ),
  /** Any printable text, including empty. */
  prefix: it().max(16).refine(nx, "prefix contains control characters"),
  order: C5,
  glyphsPath: ou.optional(),
  outDir: ou.optional(),
  startRow: Vn().min(0).optional(),
  maxBatches: Vn().min(1).optional()
});
function M5() {
  const e = B.useRef(null);
  e.current ??= new QR();
  const i = B.useRef(null);
  i.current ??= new oR();
  const a = e.current, r = i.current, o = yn(), c = we(), [h, d] = B.useState(null), m = B.useRef(null);
  B.useEffect(() => () => r.dispose(), [r]);
  const g = B.useMemo(() => c.geometry === null ? null : nS(c.geometry), [c.geometry]) ?? h;
  m.current = g;
  const v = B.useCallback(
    (A) => {
      d(nS(A)), r.reset();
    },
    [r]
  );
  zR(
    B.useCallback(
      (A) => {
        a.append(A), c.apply(A);
        const N = m.current;
        for (const D of A) {
          if (D.type !== "proto") continue;
          const k = D.event;
          k.ev === "pocket_filled" && N !== null ? r.fill(k.pocket, sR(k.serial, k.p, N)) : k.ev === "pocket_hidden" ? r.hide(k.pocket) : k.ev === "batch_start" && r.reset();
        }
      },
      [a, c, r]
    )
  );
  const b = hS(o), _ = "reason" in b ? b.reason : void 0, T = B.useCallback(() => {
    const A = fe(), N = hS(yn.getState());
    if (!("reason" in N)) {
      if (A === null) {
        we.getState().failLocally("no_bridge", "Not running in the desktop app.");
        return;
      }
      we.getState().status === "idle" && (we.getState().beginStart(), a.clear(), r.reset(), A.run(N.config).then(
        ({ runId: D }) => we.getState().started(D),
        (D) => {
          const k = D instanceof Error ? D.message : String(D);
          we.getState().failLocally(
            k.includes(pd) ? pd : "start_failed",
            k.includes(pd) ? "A run is already in progress." : `The generator could not be started. ${k}`
          );
        }
      ));
    }
  }, [a, r]), x = B.useCallback(() => {
    const A = fe(), N = we.getState().runId;
    A === null || N === null || A.cancel(N);
  }, []);
  return B.useMemo(
    () => ({ log: a, timeline: r, scene: g, preview: v, start: T, cancel: x, blocked: _ }),
    [a, r, g, v, T, x, _]
  );
}
const uu = [
  { id: "generate", label: "Generate", section: "Workflow" },
  { id: "templates", label: "Templates", section: "Workflow" },
  { id: "batches", label: "Batches", section: "Workflow" },
  { id: "environment", label: "Environment", section: "System" }
], R5 = ["Workflow", "System"], D5 = 40;
function N5() {
  const e = B.useRef(null), [i, a] = B.useState(212);
  return B.useEffect(() => {
    const r = e.current;
    if (r === null) return;
    const o = () => {
      const h = r.firstElementChild, m = [...r.querySelector("nav")?.children ?? []].reduce(
        (g, v) => g + v.getBoundingClientRect().height,
        0
      ), p = (h?.getBoundingClientRect().height ?? 0) + m + D5;
      a(Math.max(110, Math.round(r.getBoundingClientRect().height - p)));
    }, c = new ResizeObserver(o);
    return c.observe(r), o(), () => {
      c.disconnect();
    };
  }, []), [e, i];
}
function j5() {
  const [e, i] = B.useState("generate"), [a, r] = N5(), o = M5();
  qR(o);
  const c = we(), h = Qr(c.status);
  B.useEffect(() => {
    const m = (p) => {
      if (!(p.metaKey || p.ctrlKey)) return;
      const g = Number(p.key) - 1, v = uu[g];
      v !== void 0 && (p.preventDefault(), i(v.id));
    };
    return window.addEventListener("keydown", m), () => window.removeEventListener("keydown", m);
  }, []);
  const d = uu.find((m) => m.id === e) ?? uu[0];
  return /* @__PURE__ */ w.jsxs("div", { className: "flex h-full", children: [
    /* @__PURE__ */ w.jsxs("aside", { ref: a, className: "flex w-(--sidebar-w) shrink-0 flex-col bg-sidebar", children: [
      /* @__PURE__ */ w.jsx("div", { className: "h-(--toolbar-h) shrink-0 [-webkit-app-region:drag]" }),
      /* @__PURE__ */ w.jsx("nav", { className: "min-h-0 flex-1 overflow-y-auto px-(--sidebar-inset) pb-2.5", children: R5.map((m) => /* @__PURE__ */ w.jsxs("div", { children: [
        /* @__PURE__ */ w.jsx("div", { className: "flex h-(--section-h) items-end pb-[9px] pl-1 text-[11px] leading-[14px] font-bold text-section", children: m }),
        uu.filter((p) => p.section === m).map((p) => /* @__PURE__ */ w.jsxs(
          "button",
          {
            type: "button",
            "aria-current": p.id === e ? "page" : void 0,
            onClick: () => i(p.id),
            className: "flex h-(--item-h) w-full items-center rounded-item pr-2 pl-1.5 text-left text-[13px] leading-4 font-[510] text-item aria-[current=page]:bg-item-select",
            children: [
              /* @__PURE__ */ w.jsx("span", { className: "flex-1", children: p.label }),
              p.id === "templates" && /* @__PURE__ */ w.jsx("span", { className: "text-[11px] text-detail", children: (o.scene === null, "") })
            ]
          },
          p.id
        ))
      ] }, m)) }),
      o.scene !== null && /* @__PURE__ */ w.jsxs("div", { className: "shrink-0 px-(--sidebar-inset) pb-4", children: [
        /* @__PURE__ */ w.jsxs("div", { className: "flex items-baseline justify-between pb-1.5 text-[11px] leading-4", children: [
          /* @__PURE__ */ w.jsx("span", { className: "text-section", children: "Jig" }),
          /* @__PURE__ */ w.jsxs("span", { className: "font-mono text-detail [font-variant-numeric:tabular-nums]", children: [
            c.pocketsFilled,
            "/",
            o.scene.pockets.length
          ] })
        ] }),
        /* @__PURE__ */ w.jsx(
          YR,
          {
            pockets: o.scene.pockets,
            timeline: o.timeline,
            size: 212,
            maxHeight: r
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ w.jsxs("main", { className: "flex min-w-0 flex-1 flex-col bg-window", children: [
      /* @__PURE__ */ w.jsxs("header", { className: "flex h-(--toolbar-h) shrink-0 items-center gap-3 px-[18px] [-webkit-app-region:drag]", children: [
        /* @__PURE__ */ w.jsx("h1", { className: "m-0 text-[13px] leading-[15px] font-bold text-label", children: d.label }),
        h && /* @__PURE__ */ w.jsx("span", { className: "text-[11px] leading-4 text-label-2", children: c.status === "saving" ? "Saving…" : "Generating…" })
      ] }),
      /* @__PURE__ */ w.jsxs("div", { className: "flex min-h-0 flex-1 flex-col overflow-hidden p-(--content-pad) pt-0", children: [
        e === "generate" && /* @__PURE__ */ w.jsx(DR, { runner: o }),
        e === "templates" && /* @__PURE__ */ w.jsx(VR, {}),
        e === "batches" && /* @__PURE__ */ w.jsx(UR, {}),
        e === "environment" && /* @__PURE__ */ w.jsx(HR, {})
      ] })
    ] })
  ] });
}
const V5 = 32 * 1024 * 1024;
class i1 {
  decoder = new TextDecoder("utf-8");
  pending = [];
  pendingLength = 0;
  discarding = !1;
  discardedLength = 0;
  maxLineLength;
  constructor(i = V5) {
    this.maxLineLength = i;
  }
  /** Feed a chunk; get back every line it completed, without terminators. */
  push(i) {
    const a = typeof i == "string" ? i : this.decoder.decode(i, { stream: !0 });
    return this.consume(a);
  }
  /**
   * Call once when the stream ends. Emits a final line that had no terminator,
   * such as an interactive prompt or a line cut short by a kill.
   */
  flush() {
    const i = this.consume(this.decoder.decode());
    return this.discarding ? i.push(this.finishLine()) : this.pendingLength > 0 && i.push(this.finishLine()), i;
  }
  consume(i) {
    const a = [];
    let r = 0;
    for (; ; ) {
      const o = i.indexOf(`
`, r);
      if (this.append(o === -1 ? i.slice(r) : i.slice(r, o)), o === -1) break;
      a.push(this.finishLine()), r = o + 1;
    }
    return a;
  }
  append(i) {
    if (i.length !== 0) {
      if (this.discarding) {
        this.discardedLength += i.length;
        return;
      }
      this.pending.push(i), this.pendingLength += i.length, this.pendingLength > this.maxLineLength && (this.discarding = !0, this.discardedLength = this.pendingLength, this.pending = [], this.pendingLength = 0);
    }
  }
  finishLine() {
    let i;
    return this.discarding ? (i = `[line too long: ${String(this.discardedLength)} characters discarded]`, this.discarding = !1, this.discardedLength = 0) : (i = this.pending.join(""), i.endsWith("\r") && (i = i.slice(0, -1))), this.pending = [], this.pendingLength = 0, i;
  }
}
const ix = "@@XT ", sx = 1, ce = Vn().min(0), ei = Vn().min(1), Ln = Et().min(0), L5 = Bu([
  Et(),
  Et(),
  Et(),
  Et(),
  Et(),
  Et()
]), U5 = WT([
  Bu([it(), Et(), Et()]),
  Bu([it(), Et(), Et(), Et(), Et()])
]), k5 = Si({
  id: it().nullable(),
  type: it(),
  layer: it().nullable().optional(),
  /** Editor visibility. Draw it when true. */
  visible: rl(),
  /** Skipped by the laser but still drawn: jig outlines, registration marks. */
  ignored: rl(),
  t: L5.optional(),
  o: it().optional(),
  x2: Et().optional(),
  y2: Et().optional(),
  w: Et().optional(),
  h: Et().optional(),
  rx: Et().optional(),
  role: Qu(["serial", "extra", "other"]).optional(),
  pocket: ce.optional(),
  text: it().optional(),
  s: Et().nullable().optional(),
  a: Et().nullable().optional(),
  chars: Ce(U5).optional(),
  unsupported: rl().optional()
}), B5 = Si({
  i: ce,
  id: it().nullable().optional(),
  cx: Et(),
  cy: Et(),
  slot: Vn().nullable().optional(),
  extras: Ce(it().nullable()).optional()
}), Z5 = Qu(["row", "col"]), qm = Si({
  protocol: Ge(sx),
  units: Ge("mm"),
  template: Si({
    path: it(),
    name: it(),
    stem: it(),
    format: it().nullable()
  }).optional(),
  bbox: Si({
    minX: Et(),
    minY: Et(),
    maxX: Et(),
    maxY: Et()
  }),
  layers: md(
    it(),
    Si({ name: it(), order: Et(), visible: rl() })
  ).optional(),
  /** Deduplicated path data. Templates repeat a few dozen outlines thousands of times. */
  outlines: md(it(), it()),
  /** Character to outline id, for every character a run can write. */
  glyphs: md(it(), it()).optional(),
  elements: Ce(k5),
  pockets: Ce(B5),
  /** Slot to pocket: slot 0 is filled first. */
  slots: Ce(ce).optional(),
  batchSize: ce,
  serialLayer: it().nullable().optional(),
  serialAngle: Et().nullable().optional(),
  /** Null when the template has no saved load order. */
  order: Z5.nullable().optional(),
  counts: Si({
    displays: ce,
    elements: ce,
    outlines: ce,
    engraved: ce,
    reference: ce
  }).optional()
}), ax = Ie({
  /** 1-based over the non-empty rows of the serial file. */
  row: ei,
  value: it()
}), H5 = Ie({
  ev: Ge("run_start"),
  t: Ln,
  protocol: Ge(sx),
  argv: Ce(it()),
  cwd: it(),
  python: it()
}), P5 = Ie({
  ev: Ge("template_loaded"),
  t: Ln,
  donor: it().nullable().optional(),
  outDir: it(),
  geometry: qm
}), $5 = Ie({
  ev: Ge("serials_loaded"),
  t: Ln,
  total: ce,
  prefix: it(),
  first: it().nullable().optional(),
  last: it().nullable().optional(),
  batchSize: ei,
  totalBatches: ce,
  maxBatches: Vn().nullable().optional(),
  source: it().optional(),
  skippedHeaderRows: Ce(ax)
}), G5 = Ie({
  ev: Ge("batch_start"),
  t: Ln,
  index: ei,
  count: ei,
  filename: it()
}), Y5 = Ie({
  ev: Ge("pocket_filled"),
  t: Ln,
  batch: ei,
  slot: ce,
  pocket: ce,
  id: it(),
  serial: it(),
  s: Et().nullable().optional(),
  a: Et().nullable().optional(),
  /** One [offsetX, offsetY] per character, in serial order. */
  p: Ce(Bu([Et(), Et()]))
}), I5 = Ie({
  ev: Ge("pocket_hidden"),
  t: Ln,
  batch: ei,
  slot: ce,
  pocket: ce,
  ids: Ce(it()).min(1)
}), q5 = Ie({
  ev: Ge("batch_saving"),
  t: Ln,
  index: ei,
  path: it(),
  filename: it()
}), X5 = Ie({
  ev: Ge("batch_written"),
  t: Ln,
  index: ei,
  path: it(),
  filename: it(),
  count: ei,
  saveMs: Et().min(0),
  bytes: ce.nullable().optional()
}), K5 = Si({
  ev: Ge("warning"),
  t: Ln,
  message: it(),
  code: it().optional(),
  /** For code `non_pocket_text`: the most common ignored text groups. */
  groups: Ce(Si({ count: ei, text: it() })).optional(),
  /** For code `non_pocket_text`: how many further groups were not listed. */
  more: ce.optional()
}), F5 = Ie({
  ev: Ge("done"),
  t: Ln,
  batches: ce,
  outDir: it(),
  totalMs: Et().min(0)
}), Q5 = Ie({
  ev: Ge("error"),
  t: Ln,
  /** Stable slug. The UI maps on this, never on the message text. */
  code: it(),
  message: it(),
  row: Vn().optional(),
  value: it().optional(),
  chars: Ce(it()).optional(),
  angle: Et().optional()
}), J5 = a5("ev", [
  H5,
  P5,
  $5,
  G5,
  Y5,
  I5,
  q5,
  X5,
  K5,
  F5,
  Q5
]);
qm.extend({
  orderKnown: rl(),
  sampleText: it(),
  donor: it().nullable(),
  log: Ce(it())
});
Ie({
  file: it(),
  name: it(),
  count: ce,
  first: it().nullable(),
  last: it().nullable(),
  firstRow: Vn().nullable(),
  skippedHeaderRows: Ce(ax)
});
Ie({
  error: it(),
  message: it(),
  log: Ce(it()).optional(),
  row: Vn().optional(),
  value: it().optional(),
  chars: Ce(it()).optional(),
  angle: Et().optional()
});
const s1 = 160;
function W5(e) {
  return e.length > s1 ? `${e.slice(0, s1)}...` : e;
}
function t6(e) {
  const i = e.slice(ix.length);
  let a;
  try {
    a = JSON.parse(i);
  } catch (d) {
    return { ok: !1, reason: `not valid JSON (${d instanceof Error ? d.message : "unknown error"})` };
  }
  const r = J5.safeParse(a);
  if (r.success) return { ok: !0, event: r.data };
  const o = typeof a == "object" && a !== null && "ev" in a ? String(a.ev) : "(none)", c = r.error.issues[0], h = c && c.path.length > 0 ? `${c.path.join(".")}: ` : "";
  return { ok: !1, reason: `event "${o}" rejected: ${h}${c?.message ?? "invalid"}` };
}
const e6 = /^\s*warning\b/i, n6 = /\b[A-Za-z]+Warning:/, i6 = /^\s*warning:/i, s6 = /^\s*error:/i;
function a6(e, i) {
  return e === "stderr" ? e6.test(i) || n6.test(i) ? "warn" : "error" : i6.test(i) ? "warn" : s6.test(i) ? "error" : "info";
}
function r6(e = {}) {
  const i = e.now ?? Date.now, a = {
    stdout: new i1(e.maxLineLength),
    stderr: new i1(e.maxLineLength)
  };
  function r(c, h) {
    const d = i();
    if (c === "stdout" && h.startsWith(ix)) {
      const m = t6(h);
      return m.ok ? { type: "proto", event: m.event, at: d } : {
        type: "line",
        stream: c,
        level: "warn",
        text: `Ignored a malformed protocol line: ${m.reason}. ${W5(h)}`,
        at: d
      };
    }
    return { type: "line", stream: c, text: h, level: a6(c, h), at: d };
  }
  function o(c, h) {
    return h.map((d) => r(c, d));
  }
  return {
    push(c, h) {
      return o(c, a[c].push(h));
    },
    end() {
      return [
        ...o("stdout", a.stdout.flush()),
        ...o("stderr", a.stderr.flush())
      ];
    }
  };
}
function a1(e, i, a = 0) {
  const r = r6({ now: () => 0 }), o = [...r.push("stdout", e), ...r.push("stderr", i), ...r.end()], c = [];
  let h = 0;
  for (const d of o)
    d.type === "proto" && (h = Math.max(h, d.event.t * 1e3)), c.push({ at: h, event: d });
  return c.push({
    at: h,
    event: { type: "exit", code: a, signal: null, durationMs: h }
  }), c;
}
const l6 = 55;
function o6(e, i) {
  const { pace: a, cinematic: r, onEvents: o, onFinished: c } = i, h = i.now ?? (() => performance.now()), d = i.schedule ?? ((x) => requestAnimationFrame(x)), m = i.cancel ?? ((x) => cancelAnimationFrame(x)), p = a === "real" ? 1 : Math.max(0.01, a), g = r ? u6(e) : e.map((x) => x.at), v = h();
  let b = 0, _ = 0;
  const T = (x) => {
    const A = (x - v) * p, N = [];
    for (; b < e.length && (g[b] ?? 0) <= A; ) {
      const D = e[b];
      D !== void 0 && N.push(D.event), b += 1;
    }
    if (N.length > 0 && o(N), b >= e.length) {
      c?.();
      return;
    }
    i.shouldContinue?.() !== !1 && (_ = d(T));
  };
  return _ = d(T), {
    stop: () => {
      _ !== 0 && m(_), _ = 0;
    }
  };
}
function u6(e) {
  const i = [];
  let a = -1 / 0;
  for (const r of e) {
    const c = r.event.type === "proto" && r.event.event.ev === "pocket_filled" ? Math.max(r.at, a + l6) : Math.max(r.at, a);
    i.push(c), a = c;
  }
  return i;
}
const c6 = 340, f6 = 200, h6 = 110, d6 = 320, r1 = 130, m6 = 4e3, p6 = 40;
function g6(e) {
  const { root: i, onCursor: a, frame: r, onStep: o } = e, c = e.sleep ?? ((g) => new Promise((v) => setTimeout(v, g)));
  let h = !1;
  function d(g) {
    const v = g.getBoundingClientRect(), b = r();
    return {
      x: v.left - b.left + v.width * 0.42,
      y: v.top - b.top + v.height * 0.56
    };
  }
  async function m(g) {
    const v = Date.now() + m6;
    for (; ; ) {
      const b = g.find(i);
      if (b !== null) return b;
      if (h || Date.now() > v) return null;
      await c(p6);
    }
  }
  async function p(g) {
    const v = await m(g);
    if (v === null || h) return;
    o?.(g.label);
    const { x: b, y: _ } = d(v);
    a({ x: b, y: _, pressed: !1, shown: !0 }), await c(c6), !h && (await c(f6), a({ x: b, y: _, pressed: !0, shown: !0 }), await c(h6), g.type === void 0 ? (v.click(), a({ x: b, y: _, pressed: !1, shown: !0 })) : (a({ x: b, y: _, pressed: !1, shown: !0 }), await y6(v, g.type, c, () => h)), await c(d6));
  }
  return {
    async run(g) {
      for (const v of g) {
        if (h) break;
        await p(v);
      }
      a({ x: 0, y: 0, pressed: !1, shown: !1 });
    },
    stop() {
      h = !0, a({ x: 0, y: 0, pressed: !1, shown: !1 });
    },
    get stopped() {
      return h;
    }
  };
}
async function y6(e, i, a, r) {
  const o = Object.getOwnPropertyDescriptor(
    globalThis.HTMLInputElement?.prototype ?? {},
    "value"
  )?.set, c = (h) => {
    o === void 0 ? e.value = h : o.call(e, h), e.dispatchEvent(new Event("input", { bubbles: !0 }));
  };
  c(""), await a(r1);
  for (let h = 1; h <= i.length; h += 1) {
    if (r()) return;
    c(i.slice(0, h)), await a(r1);
  }
}
const Xm = (e) => [
  ...e.querySelectorAll("button")
], Ju = (e) => (e.textContent ?? "").replace(/\s+/g, " ").trim(), l1 = (e) => ({
  label: `Open ${e}`,
  find: (i) => Xm(i).find((a) => Ju(a) === e) ?? null
}), v6 = (e) => ({
  label: `Choose ${e}`,
  // `startsWith`, because the row appends "selected" to the name once it is.
  find: (i) => Xm(i).find((a) => Ju(a).startsWith(e)) ?? null
}), b6 = (e) => ({
  label: e === "col" ? "Column-major" : "Row-major",
  find: (i) => {
    const a = i.querySelector('[aria-label="Load order"]');
    if (a === null) return null;
    const r = e === "col" ? "Column-major" : "Row-major";
    return [...a.querySelectorAll('[role="tab"]')].find((o) => Ju(o) === r) ?? null;
  }
}), S6 = (e) => ({
  label: `Prefix ${e}`,
  find: (i) => i.querySelector('input[aria-label="Prefix"]'),
  type: e
}), o1 = () => ({
  label: "Generate batches",
  find: (e) => Xm(e).find((i) => Ju(i).startsWith("Generate Batches")) ?? null
}), u1 = {
  pythonPath: "",
  lastTemplatePath: "",
  lastCsvPath: "",
  // The generator's OWN default, so the script has something true to change.
  prefix: "E",
  order: "col",
  consoleOpen: !0,
  window: { width: 1280, height: 860 }
};
async function rx(e) {
  const i = await fetch(e);
  if (!i.ok) throw new Error(`${e} returned ${String(i.status)}`);
  return i.text();
}
function _6() {
  return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? !1;
}
function T6(e) {
  const i = [];
  for (const a of e)
    if (i.push(a.event), a.event.type === "proto" && a.event.event.ev === "batch_written") return i;
  return i;
}
const x6 = (e) => new Promise((i) => setTimeout(i, e));
function c1(e) {
  const i = /* @__PURE__ */ new Map();
  return (a) => {
    const r = i.get(a);
    if (r !== void 0) return r;
    const o = e(a);
    return i.set(a, o), o;
  };
}
async function A6(e, i) {
  const {
    recordings: a,
    templates: r,
    pace: o = 6,
    cinematic: c = !0,
    betweenMs: h = 2e3,
    onRecordingStart: d,
    onLines: m,
    onCursor: p,
    onStep: g
  } = i;
  if (a.length === 0) throw new RangeError("mountDemo needs at least one recording");
  if (r.length === 0) throw new RangeError("mountDemo needs at least one template");
  const v = i.settled ?? _6(), b = i.manifestUrl === void 0 ? null : await f1(i.manifestUrl), _ = E6(b), T = c1((tt) => rx(tt)), x = c1(async (tt) => f1(tt));
  let A;
  const N = /* @__PURE__ */ new Set(), D = (tt) => {
    const Y = A === void 0 ? tt : tt.map(
      (K) => K.type === "proto" && K.event.ev === "template_loaded" ? {
        ...K,
        event: {
          ...K.event,
          geometry: { ...K.event.geometry, serialLayer: A }
        }
      } : K
    );
    for (const K of N) K(Y);
    if (m === void 0) return;
    const st = [];
    for (const K of Y)
      K.type === "line" && st.push({ text: K.text, level: K.level, stream: K.stream });
    st.length > 0 && m(st);
  };
  let k = null;
  const G = {
    platform: "web",
    environment: () => Promise.resolve({
      checks: [
        {
          id: "python",
          status: "ok",
          title: "Recording",
          detail: "A real run of the generator, played back. Serials are synthetic."
        }
      ],
      python: null,
      scriptDir: "XTool_masterScript"
    }),
    listTemplates: () => Promise.resolve(
      r.map((tt) => ({
        name: tt.name,
        stem: tt.stem,
        path: tt.path,
        format: tt.format,
        pockets: tt.pockets
      }))
    ),
    inspectTemplate: async (tt) => {
      const Y = r.find((K) => K.path === tt);
      if (Y === void 0)
        return { error: "template_not_found", message: `no such template: ${tt}` };
      const st = qm.safeParse(await x(Y.previewUrl));
      return st.success ? {
        ...st.data,
        ...Y.serialColour === void 0 ? {} : { serialLayer: Y.serialColour },
        orderKnown: !0,
        sampleText: "XXXXXXXX",
        donor: "donor.xs",
        log: []
      } : { error: "bad_snapshot", message: "The preview is not valid." };
    },
    setTemplateOrder: () => Promise.resolve(),
    defaultSerialFile: () => Promise.resolve("serials.csv"),
    previewSerials: () => Promise.resolve({
      file: "serials.csv",
      name: "serials.csv",
      count: _.count,
      first: _.first,
      last: _.last,
      firstRow: 1,
      skippedHeaderRows: []
    }),
    // No file system in a tab. Saying so beats a dialog that cannot open.
    pickFile: () => Promise.resolve(null),
    /*
     * THE SCRIPT PRESSES THE REAL BUTTON, so this is the real handler.
     *
     * `runner.start()` calls this, exactly as it does on the desktop. What it
     * starts is a recording rather than a process, and the promise the caller
     * gets back is the same shape either way.
     */
    run: () => (mt(), Promise.resolve({ runId: "demo" })),
    cancel: () => (k?.stop(), k = null, D([{ type: "exit", code: null, signal: "SIGTERM", durationMs: 0 }]), Promise.resolve()),
    onEvent: (tt) => (N.add(tt), () => N.delete(tt)),
    listOutputs: () => Promise.resolve([]),
    reveal: () => Promise.resolve(),
    open: () => Promise.resolve(),
    getSettings: () => Promise.resolve({ ...u1, lastTemplatePath: "" }),
    setSettings: (tt) => Promise.resolve({ ...u1, ...tt })
  };
  e.style.position = "relative", e.style.height = "100%";
  const X = e.ownerDocument.createElement("div");
  X.id = "root", e.append(X), we.getState().reset(), dS(G);
  const q = cA.createRoot(X);
  q.render(B.createElement(j5)), X.setAttribute("inert", ""), X.style.pointerEvents = "none";
  let V = !1, $ = null, J = [], Q = o;
  function mt() {
    V || (k?.stop(), k = o6(J, {
      pace: Q,
      cinematic: c,
      onEvents: D,
      onFinished: () => {
        k = null;
        const tt = $;
        $ = null, tt?.();
      }
    }));
  }
  const vt = g6({
    root: X,
    frame: () => e.getBoundingClientRect(),
    onCursor: (tt) => p?.(tt),
    ...g === void 0 ? {} : { onStep: g }
  });
  function $t(tt) {
    const Y = r.find((st) => st.path === tt.templatePath);
    return [
      l1("Templates"),
      ...Y === void 0 ? [] : [v6(Y.name)],
      l1("Generate"),
      b6(tt.order),
      // The generator's default prefix is 'E'; this pipeline's serials are 'X'.
      // A real step, and the one beat in the approach that is not a button.
      S6("X"),
      o1()
    ];
  }
  async function ee() {
    for (let tt = 0; !V; tt = (tt + 1) % a.length) {
      const Y = a[tt];
      if (Y === void 0) return;
      d?.(Y.label), A = r.find((ft) => ft.path === Y.templatePath)?.serialColour;
      const st = T(Y.url);
      if (await vt.run($t(Y).slice(0, -1)), J = a1(await st, "", 0), Q = Y.pace ?? o, A = r.find((ft) => ft.path === Y.templatePath)?.serialColour, V) return;
      const K = new Promise((ft) => {
        $ = ft;
      });
      if (await vt.run([o1()]), await K, V) return;
      await x6(h);
    }
  }
  if (v) {
    const tt = a[0];
    tt !== void 0 && (d?.(tt.label), D(T6(a1(await T(tt.url), "", 0))));
  } else
    ee();
  return {
    destroy() {
      V = !0, vt.stop(), k?.stop(), k = null, $ = null, we.getState().reset(), N.clear(), dS(null), q.unmount();
    }
  };
}
async function f1(e) {
  return JSON.parse(await rx(e));
}
function E6(e) {
  const i = e, a = typeof i?.count == "number" ? i.count : 0, r = typeof i?.firstSerial == "string" ? i.firstSerial : "", o = typeof i?.prefix == "string" ? i.prefix : "", c = Number(r.slice(o.length)), h = a > 0 && Number.isFinite(c) ? `${o}${String(c + a - 1)}` : r;
  return { count: a, first: r, last: h };
}
export {
  A6 as mountDemo
};
