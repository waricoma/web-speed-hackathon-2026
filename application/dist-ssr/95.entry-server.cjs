"use strict";
exports.id = 95;
exports.ids = [95];
exports.modules = {

/***/ 95:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  RichMarkdown: () => (/* binding */ RichMarkdown)
});

// EXTERNAL MODULE: ../node_modules/.pnpm/katex@0.16.25/node_modules/katex/dist/katex.min.css
var katex_min = __webpack_require__(9930);
// EXTERNAL MODULE: ../node_modules/.pnpm/react-markdown@10.1.0_@types+react@19.2.2_react@19.2.0/node_modules/react-markdown/lib/index.js + 89 modules
var lib = __webpack_require__(8188);
// EXTERNAL MODULE: ../node_modules/.pnpm/rehype-katex@7.0.1/node_modules/rehype-katex/lib/index.js + 34 modules
var rehype_katex_lib = __webpack_require__(629);
// EXTERNAL MODULE: ../node_modules/.pnpm/remark-gfm@4.0.1/node_modules/remark-gfm/lib/index.js + 55 modules
var remark_gfm_lib = __webpack_require__(476);
// EXTERNAL MODULE: ../node_modules/.pnpm/remark-math@6.0.0/node_modules/remark-math/lib/index.js + 4 modules
var remark_math_lib = __webpack_require__(6671);
// EXTERNAL MODULE: ../node_modules/.pnpm/react@19.2.0/node_modules/react/index.js
var react = __webpack_require__(3303);
// EXTERNAL MODULE: ../node_modules/.pnpm/react-syntax-highlighter@16.1.0_react@19.2.0/node_modules/react-syntax-highlighter/dist/esm/light.js + 3 modules
var light = __webpack_require__(3075);
// EXTERNAL MODULE: ../node_modules/.pnpm/react-syntax-highlighter@16.1.0_react@19.2.0/node_modules/react-syntax-highlighter/dist/esm/languages/hljs/bash.js
var bash = __webpack_require__(3208);
// EXTERNAL MODULE: ../node_modules/.pnpm/react-syntax-highlighter@16.1.0_react@19.2.0/node_modules/react-syntax-highlighter/dist/esm/languages/hljs/json.js
var json = __webpack_require__(6468);
// EXTERNAL MODULE: ../node_modules/.pnpm/react-syntax-highlighter@16.1.0_react@19.2.0/node_modules/react-syntax-highlighter/dist/esm/languages/hljs/python.js
var python = __webpack_require__(5792);
// EXTERNAL MODULE: ../node_modules/.pnpm/react-syntax-highlighter@16.1.0_react@19.2.0/node_modules/react-syntax-highlighter/dist/esm/languages/hljs/rust.js
var rust = __webpack_require__(4816);
// EXTERNAL MODULE: ../node_modules/.pnpm/react-syntax-highlighter@16.1.0_react@19.2.0/node_modules/react-syntax-highlighter/dist/esm/languages/hljs/sql.js
var sql = __webpack_require__(9928);
// EXTERNAL MODULE: ../node_modules/.pnpm/react-syntax-highlighter@16.1.0_react@19.2.0/node_modules/react-syntax-highlighter/dist/esm/languages/hljs/typescript.js
var typescript = __webpack_require__(289);
// EXTERNAL MODULE: ../node_modules/.pnpm/react-syntax-highlighter@16.1.0_react@19.2.0/node_modules/react-syntax-highlighter/dist/esm/styles/hljs/atom-one-light.js
var atom_one_light = __webpack_require__(6020);
// EXTERNAL MODULE: ../node_modules/.pnpm/react@19.2.0/node_modules/react/jsx-runtime.js
var jsx_runtime = __webpack_require__(7711);
;// ./src/components/crok/CodeBlock.tsx










light/* default */.A.registerLanguage("bash", bash/* default */.A);
light/* default */.A.registerLanguage("json", json/* default */.A);
light/* default */.A.registerLanguage("python", python/* default */.A);
light/* default */.A.registerLanguage("rust", rust/* default */.A);
light/* default */.A.registerLanguage("sql", sql/* default */.A);
light/* default */.A.registerLanguage("ts", typescript/* default */.A);
light/* default */.A.registerLanguage("typescript", typescript/* default */.A);
light/* default */.A.registerLanguage("javascript", typescript/* default */.A);
const getLanguage = children => {
  const className = children.props.className;
  if (typeof className === "string") {
    const match = className.match(/language-(\w+)/);
    return match?.[1] ?? "javascript";
  }
  return "javascript";
};
const isCodeElement = children => /*#__PURE__*/(0,react.isValidElement)(children) && children.type === "code";
const CodeBlock = ({
  children
}) => {
  if (!isCodeElement(children)) return /*#__PURE__*/(0,jsx_runtime.jsx)(jsx_runtime.Fragment, {
    children: children
  });
  const language = getLanguage(children);
  const code = children.props.children?.toString() ?? "";
  return /*#__PURE__*/(0,jsx_runtime.jsx)(light/* default */.A, {
    customStyle: {
      fontSize: "14px",
      padding: "24px 16px",
      borderRadius: "8px",
      border: "1px solid var(--color-cax-border)"
    },
    language: language,
    style: atom_one_light/* default */.A,
    children: code
  });
};
;// ./src/components/crok/RichMarkdown.tsx







const RichMarkdown = ({
  content
}) => {
  return /*#__PURE__*/(0,jsx_runtime.jsx)(lib/* Markdown */.oz, {
    components: {
      pre: CodeBlock
    },
    rehypePlugins: [rehype_katex_lib/* default */.A],
    remarkPlugins: [remark_math_lib/* default */.A, remark_gfm_lib/* default */.A],
    children: content
  });
};

/***/ })

};
;