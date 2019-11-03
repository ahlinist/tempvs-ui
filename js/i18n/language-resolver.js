export const langResolver = {
  resolve: function(response) {
    const langCookieName = 'TEMPVS_LANG';

    if (response) {
        const userInfo = JSON.parse(response.headers.get("User-Info"));
        if (userInfo) {
          const userLang = userInfo.lang;
          document.cookie = `${langCookieName}=${userLang}`;
          return userLang;
        }
    }

    const cookieMatcher = document.cookie.match('(^|;) ?' + langCookieName + '=([^;]*)(;|$)');
    const rawLang = cookieMatcher ? cookieMatcher[2] : window.navigator.language;
    return retrieveLang(rawLang);

    function retrieveLang(rawLang) {
      const parts = rawLang.split('-');
      return (parts.length === 1) ? rawLang : parts[0];
    }
  }
};
