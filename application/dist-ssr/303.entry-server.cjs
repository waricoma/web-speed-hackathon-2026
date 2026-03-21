"use strict";
exports.id = 303;
exports.ids = [303];
exports.modules = {

/***/ 7303:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  AuthModalPage: () => (/* binding */ AuthModalPage)
});

// EXTERNAL MODULE: ../node_modules/.pnpm/react@19.2.0/node_modules/react/index.js
var react = __webpack_require__(3303);
;// ./src/auth/validation.ts
const validate = values => {
  const errors = {};
  const normalizedName = values.name?.trim() || "";
  const normalizedPassword = values.password?.trim() || "";
  const normalizedUsername = values.username?.trim() || "";
  if (values.type === "signup" && normalizedName.length === 0) {
    errors.name = "名前を入力してください";
  }
  if (/^[\p{Letter}\p{Number}]{16,}$/u.test(normalizedPassword)) {
    errors.password = "パスワードには記号を含める必要があります";
  }
  if (normalizedPassword.length === 0) {
    errors.password = "パスワードを入力してください";
  }
  if (!/^[a-zA-Z0-9_]*$/.test(normalizedUsername)) {
    errors.username = "ユーザー名に使用できるのは英数字とアンダースコア(_)のみです";
  }
  if (normalizedUsername.length === 0) {
    errors.username = "ユーザー名を入力してください";
  }
  return errors;
};
// EXTERNAL MODULE: ./src/components/foundation/FormInputField.tsx + 1 modules
var FormInputField = __webpack_require__(7190);
// EXTERNAL MODULE: ./src/components/foundation/Link.tsx
var Link = __webpack_require__(2486);
// EXTERNAL MODULE: ./src/components/modal/ModalErrorMessage.tsx
var ModalErrorMessage = __webpack_require__(3226);
// EXTERNAL MODULE: ./src/components/modal/ModalSubmitButton.tsx
var ModalSubmitButton = __webpack_require__(2813);
// EXTERNAL MODULE: ../node_modules/.pnpm/react@19.2.0/node_modules/react/jsx-runtime.js
var jsx_runtime = __webpack_require__(7711);
;// ./src/components/auth_modal/AuthModalPage.tsx







const AuthModalPage = ({
  onRequestCloseModal,
  onSubmit
}) => {
  const [values, setValues] = (0,react.useState)({
    type: "signin",
    username: "",
    name: "",
    password: ""
  });
  const [touched, setTouched] = (0,react.useState)({});
  const [submitting, setSubmitting] = (0,react.useState)(false);
  const [error, setError] = (0,react.useState)(undefined);
  const [fieldErrors, setFieldErrors] = (0,react.useState)({});
  const isEmpty = !values.username.trim() || !values.password.trim() || values.type === "signup" && !values.name.trim();
  const handleChange = (0,react.useCallback)(e => {
    const {
      name,
      value
    } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);
  const handleBlur = (0,react.useCallback)(e => {
    const {
      name
    } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    setFieldErrors(prev => {
      const currentErrors = validate(values);
      return {
        ...prev,
        [name]: currentErrors[name]
      };
    });
  }, [values]);
  const handleToggleType = (0,react.useCallback)(() => {
    setValues(prev => ({
      ...prev,
      type: prev.type === "signin" ? "signup" : "signin"
    }));
  }, []);
  const handleSubmit = (0,react.useCallback)(async e => {
    e.preventDefault();
    // Mark all fields as touched
    setTouched({
      username: true,
      name: true,
      password: true
    });
    const currentErrors = validate(values);
    if (Object.keys(currentErrors).length > 0) {
      setFieldErrors(currentErrors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    setError(undefined);
    try {
      await onSubmit(values);
    } catch (err) {
      if (err && typeof err === "object" && "_error" in err) {
        setError(err._error);
      } else if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [values, onSubmit]);
  return /*#__PURE__*/(0,jsx_runtime.jsxs)("form", {
    className: "grid gap-y-6",
    onSubmit: handleSubmit,
    children: [/*#__PURE__*/(0,jsx_runtime.jsx)("h2", {
      className: "text-center text-2xl font-bold",
      children: values.type === "signin" ? "サインイン" : "新規登録"
    }), /*#__PURE__*/(0,jsx_runtime.jsx)("div", {
      className: "flex justify-center",
      children: /*#__PURE__*/(0,jsx_runtime.jsx)("button", {
        className: "text-cax-brand underline",
        onClick: handleToggleType,
        type: "button",
        children: values.type === "signin" ? "初めての方はこちら" : "サインインはこちら"
      })
    }), /*#__PURE__*/(0,jsx_runtime.jsxs)("div", {
      className: "grid gap-y-2",
      children: [/*#__PURE__*/(0,jsx_runtime.jsx)(FormInputField/* FormInputField */.l, {
        name: "username",
        value: values.username,
        onChange: handleChange,
        onBlur: handleBlur,
        error: fieldErrors.username,
        touched: touched.username,
        label: "\u30E6\u30FC\u30B6\u30FC\u540D",
        leftItem: /*#__PURE__*/(0,jsx_runtime.jsx)("span", {
          className: "text-cax-text-subtle leading-none",
          children: "@"
        }),
        autoComplete: "off"
      }), values.type === "signup" && /*#__PURE__*/(0,jsx_runtime.jsx)(FormInputField/* FormInputField */.l, {
        name: "name",
        value: values.name,
        onChange: handleChange,
        onBlur: handleBlur,
        error: fieldErrors.name,
        touched: touched.name,
        label: "\u540D\u524D",
        autoComplete: "off"
      }), /*#__PURE__*/(0,jsx_runtime.jsx)(FormInputField/* FormInputField */.l, {
        name: "password",
        value: values.password,
        onChange: handleChange,
        onBlur: handleBlur,
        error: fieldErrors.password,
        touched: touched.password,
        label: "\u30D1\u30B9\u30EF\u30FC\u30C9",
        autoComplete: "off"
      })]
    }), values.type === "signup" ? /*#__PURE__*/(0,jsx_runtime.jsxs)("p", {
      children: [/*#__PURE__*/(0,jsx_runtime.jsx)(Link/* Link */.N, {
        className: "text-cax-brand underline",
        onClick: onRequestCloseModal,
        to: "/terms",
        children: "\u5229\u7528\u898F\u7D04"
      }), "\u306B\u540C\u610F\u3057\u3066"]
    }) : null, /*#__PURE__*/(0,jsx_runtime.jsx)(ModalSubmitButton/* ModalSubmitButton */.u, {
      disabled: submitting || isEmpty,
      loading: submitting,
      children: values.type === "signin" ? "サインイン" : "登録する"
    }), /*#__PURE__*/(0,jsx_runtime.jsx)(ModalErrorMessage/* ModalErrorMessage */.L, {
      children: error
    })]
  });
};

/***/ })

};
;