"use strict";
exports.id = 902;
exports.ids = [902];
exports.modules = {

/***/ 8902:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createTranslator: () => (/* binding */ createTranslator)
/* harmony export */ });
/* harmony import */ var _web_speed_hackathon_2026_client_src_utils_fetchers__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(17);

async function createTranslator(params) {
  return {
    async translate(text) {
      const result = await (0,_web_speed_hackathon_2026_client_src_utils_fetchers__WEBPACK_IMPORTED_MODULE_0__/* .sendJSON */ .$R)("/api/v1/translate", {
        text,
        sourceLanguage: params.sourceLanguage,
        targetLanguage: params.targetLanguage
      });
      return result.translatedText;
    },
    [Symbol.dispose]: () => {}
  };
}

/***/ })

};
;