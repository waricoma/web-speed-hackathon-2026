"use strict";
exports.id = 6;
exports.ids = [6];
exports.modules = {

/***/ 3006:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   analyzeSentiment: () => (/* binding */ analyzeSentiment)
/* harmony export */ });
/* harmony import */ var _web_speed_hackathon_2026_client_src_utils_fetchers__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(17);

async function analyzeSentiment(text) {
  return await (0,_web_speed_hackathon_2026_client_src_utils_fetchers__WEBPACK_IMPORTED_MODULE_0__/* .fetchJSON */ .hI)(`/api/v1/sentiment?text=${encodeURIComponent(text)}`);
}

/***/ })

};
;