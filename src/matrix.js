// Matrix channel: a terminal that types a message using the visitor's IP address and local time.
const msPerLetter = 45;

export function createMatrixChannel(element) {
  const text = element.querySelector('#matrix-text');
  let identityPromise;
  let message = '';
  let startedAt;
  let active = false;

  function lookUpIdentity() {
    identityPromise ??= fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(3000),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    }).then((response) => {
      if (!response.ok) throw new Error('IP lookup failed');
      return response.json();
    }).then((data) => typeof data.ip === 'string' && /^[\d.a-f:]+$/i.test(data.ip) ? data.ip : 'visitor')
      .catch(() => 'visitor');
    return identityPromise;
  }

  return {
    element,
    async enter() {
      active = true;
      message = '';
      text.textContent = '';
      startedAt = undefined;
      const identity = await lookUpIdentity();
      if (!active) return;
      const localTime = new Intl.DateTimeFormat(undefined, {
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).format(new Date());
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      message = `Connection established.\nLocal time: ${localTime}\nTimezone: ${timezone}\n\nWake up, ${identity}...\nThe Matrix has you...\nFollow the white rabbit.\nKnock, knock, ${identity}.`;
      startedAt = undefined;
    },
    leave() {
      active = false;
    },
    update(time) {
      if (!message) return;
      if (startedAt === undefined) startedAt = time;
      const typed = message.slice(0, Math.floor((time - startedAt) / msPerLetter));
      if (text.textContent !== typed) text.textContent = typed;
    },
  };
}
