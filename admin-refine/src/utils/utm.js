// 捕获 URL 中的 UTM 参数和 ref，存 localStorage
export function captureUtm() {
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get('utm_source');
  const utmMedium = params.get('utm_medium');
  const utmCampaign = params.get('utm_campaign');
  const ref = params.get('ref');

  if (utmSource) localStorage.setItem('utm_source', utmSource);
  if (utmMedium) localStorage.setItem('utm_medium', utmMedium);
  if (utmCampaign) localStorage.setItem('utm_campaign', utmCampaign);
  if (ref) localStorage.setItem('utm_ref', ref);
}

export function getUtm() {
  return {
    utmSource: localStorage.getItem('utm_source') || '',
    utmMedium: localStorage.getItem('utm_medium') || '',
    utmCampaign: localStorage.getItem('utm_campaign') || '',
    ref: localStorage.getItem('utm_ref') || '',
  };
}
