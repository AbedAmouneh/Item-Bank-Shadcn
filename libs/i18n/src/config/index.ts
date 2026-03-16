import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";

const savedLang = localStorage.getItem("lang") || "en";


i18n
.use(HttpBackend)
.use(initReactI18next)
.init({
    lng: savedLang,
    fallbackLng: "en",
    supportedLngs: ["en", "ar"],
    ns: ["common", "auth", "questions"],
    defaultNS: "common",
    interpolation: { 
        escapeValue: false
    },
    backend: {
        loadPath: "/locales/{{lng}}/{{ns}}.json"
    }
})

document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
  document.dir = lng === "ar" ? "rtl" : "ltr";
});

export default i18n