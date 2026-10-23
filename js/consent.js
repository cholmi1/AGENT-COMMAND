(function () {
  'use strict';
  const ver = '2026-10-24-private-history-1';
  document.querySelectorAll('[data-consent]').forEach((box) => {
    const kind = box.dataset.consent, id = 'consent-' + kind;
    box.className = 'cbox';
    const label = document.createElement('label'); label.className = 'check';
    const input = document.createElement('input'); input.type = 'checkbox'; input.id = id;
    const text = document.createElement('span'); text.textContent = '이번 입력과 결과를 내 기록에 저장합니다 (선택)';
    label.append(input, text);
    const note = document.createElement('p'); note.className = 'foot'; note.textContent = '체크하지 않아도 이용할 수 있습니다. 저장한 내용은 직접 삭제할 때까지 보관하며 공개하지 않습니다. 이용 횟수 정보는 선택과 관계없이 저장됩니다.';
    box.append(label, note);
  });
  window.WorkroomConsent = { ver, on: (kind) => !!document.getElementById('consent-' + kind)?.checked, kept: (id) => id ? ' 내 기록에 저장했습니다.' : '' };
})();
