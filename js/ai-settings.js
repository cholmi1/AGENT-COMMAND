/* BYOK secrets stay in the password field and explicit request bodies for this tab only. */
(function () {
  'use strict';
  const byId = (id) => document.getElementById(id);
  const provider = byId('ai-provider'), model = byId('ai-model'), custom = byId('ai-custom-model');
  const key = byId('ai-key'), consent = byId('ai-charge-consent');
  const names = { local: '기본 규칙', openai: 'OpenAI', anthropic: 'Anthropic', deepseek: 'DeepSeek' };
  const models = {
    openai: [['gpt-5.6-terra', 'GPT-5.6 Terra'], ['gpt-4.1-mini', 'GPT-4.1 mini (이전 호환 모델)']],
    anthropic: [['claude-haiku-5-5', 'Claude Haiku 5.5'], ['claude-haiku-4-5-20251001', 'Claude Haiku 4.5 (이전 모델)']],
    deepseek: [['deepseek-flash', 'DeepSeek V4.1 Flash1017'], ['deepseek-v4-pro', 'DeepSeek V4 Pro']]
  };
  const errors = {
    ai_auth_failed: 'API 키 인증에 실패했습니다. 선택한 제공업체의 키인지 확인해 주세요.',
    ai_quota: '외부 AI 계정의 잔액이나 사용 한도가 부족합니다. 제공업체에서 확인해 주세요.',
    ai_rate_limit: '외부 AI 요청이 몰렸습니다. 잠시 후 다시 시도해 주세요.',
    ai_model_invalid: '선택한 모델을 사용할 수 없습니다. 모델 ID와 계정의 접근 권한을 확인해 주세요.',
    ai_unavailable: '외부 AI를 이용할 수 없습니다. 잠시 후 다시 시도하거나 직접 기본 규칙을 선택하세요.',
    ai_timeout: '외부 AI 응답 시간이 초과되었습니다. 이미 처리된 요청에는 요금이 발생할 수 있습니다.',
    ai_invalid_response: '외부 AI 응답을 읽지 못했습니다. 결과를 생성하지 않았습니다. 다시 요청하면 요금이 발생할 수 있습니다.',
    invalid_ai: 'AI 설정이 올바르지 않습니다. 제공업체, 키, 모델을 확인해 주세요.'
  };
  let verified = '';
  const modelId = () => model.value === 'custom' ? custom.value.trim() : model.value;
  function describe(result) {
    if (result.mode === 'local') return '기본 규칙 · 외부 AI 사용 안 함';
    const name = names[result.provider] || '외부 AI';
    const id = typeof result.model === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(result.model) ? result.model : '모델 정보 없음';
    return name + ' · ' + id;
  }
  function paint() {
    const external = provider.value !== 'local';
    byId('modeLabel').textContent = external ? names[provider.value] + ' 선택' : '기본 규칙 모드';
    byId('modeNote').textContent = external ? '지시서·도움말 버튼을 누를 때만 선택한 AI를 사용합니다. 요금은 내 API 계정에 청구됩니다.' : '외부 AI 없이 입력과 템플릿으로 초안을 정리합니다. 도움말은 일반 점검 안내입니다.';
    byId('ai-settings-status').textContent = external && verified ? verified : external ? names[provider.value] + ' · ' + (modelId() || '모델 ID 필요') + ' · ' + (key.value ? '키 입력됨 · 아직 검증되지 않음' : 'API 키를 입력해 주세요.') : '기본 규칙 선택됨 · API 키와 외부 AI 요금 동의가 필요하지 않습니다.';
  }
  function clearKey() {
    key.value = ''; consent.checked = false; verified = '';
    byId('ai-settings-error').textContent = ''; paint();
  }
  function changeProvider() {
    clearKey(); custom.value = '';
    model.replaceChildren();
    (models[provider.value] || []).forEach(([value, label]) => {
      const option = document.createElement('option'); option.value = value; option.textContent = label + ' (' + value + ')'; model.append(option);
    });
    if (provider.value !== 'local') {
      const option = document.createElement('option'); option.value = 'custom'; option.textContent = '모델 ID 직접 입력'; model.append(option);
    }
    byId('ai-external').hidden = byId('ai-model-field').hidden = provider.value === 'local';
    byId('ai-custom-field').hidden = true; paint();
  }
  function request() {
    byId('ai-settings-error').textContent = '';
    if (provider.value === 'local') return { provider: 'local' };
    let message = '', target;
    if (!names[provider.value]) { message = '사용할 제공업체를 다시 선택해 주세요.'; target = provider; }
    else if (!key.value) { message = '선택한 제공업체의 API 키를 입력해 주세요.'; target = key; }
    else if (!/^[\x21-\x7E]{10,512}$/.test(key.value)) { message = 'API 키는 공백 없이 10~512자의 영문·숫자·기호여야 합니다. 앞뒤 공백도 지워 주세요.'; target = key; }
    else if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(modelId())) { message = '올바른 모델 ID를 입력해 주세요. 영문·숫자로 시작하고 허용 문자만 최대 120자까지 사용할 수 있습니다.'; target = model.value === 'custom' ? custom : model; }
    else if (!consent.checked) { message = '외부 AI로의 데이터 전송과 API 사용 요금에 먼저 동의해 주세요.'; target = consent; }
    if (message) { byId('ai-settings-error').textContent = message; target.focus(); return null; }
    return { provider: provider.value, apiKey: key.value, model: modelId() };
  }
  function success(result, selection) {
    // Do not label a newly selected key/model as verified by an older in-flight request.
    if (provider.value === selection.provider && (selection.provider === 'local' || (key.value === selection.apiKey && modelId() === selection.model))) {
      verified = '최근 요청 성공 · 실제 처리: ' + describe(result); paint();
    }
  }
  function errorMessage(error, external) {
    if (errors[error.code]) return errors[error.code];
    if (external && error.code !== 'cancelled') return '요청을 완료하지 못했습니다. AI 설정과 네트워크·이용 한도를 확인해 주세요. 기본 규칙으로 자동 전환하지 않았습니다.';
    return error.message || '요청을 완료하지 못했습니다.';
  }
  provider.addEventListener('change', changeProvider);
  model.addEventListener('change', () => { verified = ''; consent.checked = false; byId('ai-custom-field').hidden = model.value !== 'custom'; byId('ai-settings-error').textContent = ''; paint(); });
  custom.addEventListener('input', () => { verified = ''; consent.checked = false; byId('ai-settings-error').textContent = ''; paint(); });
  key.addEventListener('input', () => { verified = ''; consent.checked = false; byId('ai-settings-error').textContent = ''; paint(); });
  byId('ai-clear-key').addEventListener('click', clearKey);
  window.addEventListener('pagehide', clearKey);
  window.addEventListener('pageshow', (event) => { if (event.persisted) clearKey(); });
  provider.value = 'deepseek'; changeProvider();
  window.WorkroomAI = { request, success, describe, errorMessage, paint, clearKey };
})();
