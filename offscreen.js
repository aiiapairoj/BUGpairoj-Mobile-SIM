/**
 * BUGpairoj Mobile SIM - offscreen recorder.
 * Receives a chrome.tabCapture stream ID and records locally to WebM.
 */

let recorder = null;
let stream = null;
let chunks = [];
let activeTabId = null;
const objectUrls = new Set();

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function bestMimeType() {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

async function start(streamId, tabId) {
  if (recorder?.state === 'recording') await stop();

  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
        maxWidth: 1920,
        maxHeight: 1080,
        maxFrameRate: 30
      }
    }
  });

  chunks = [];
  activeTabId = tabId;
  const mimeType = bestMimeType();
  recorder = mimeType
    ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 })
    : new MediaRecorder(stream, { videoBitsPerSecond: 6_000_000 });

  recorder.addEventListener('dataavailable', (event) => {
    if (event.data?.size) chunks.push(event.data);
  });

  recorder.addEventListener('stop', async () => {
    const blob = new Blob(chunks, { type: recorder?.mimeType || 'video/webm' });
    chunks = [];
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    const url = URL.createObjectURL(blob);
    objectUrls.add(url);
    const filename = `BUGpairoj-Mobile-SIM/recordings/bugpairoj-mobile-sim-${stamp()}.webm`;
    try {
      await chrome.runtime.sendMessage({
        type: 'BUGSIM_RECORDING_READY',
        tabId: activeTabId,
        url,
        filename
      });
    } catch (error) {
      console.error('BUGpairoj Mobile SIM: could not hand off recording', error);
    }
    activeTabId = null;
  });

  stream.getVideoTracks().forEach((track) => {
    track.addEventListener('ended', () => {
      if (recorder?.state === 'recording') recorder.stop();
    });
  });

  recorder.start(1000);
}

async function stop() {
  if (recorder?.state === 'recording') {
    recorder.stop();
  } else {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== 'offscreen') return false;

  if (message.type === 'BUGSIM_START_RECORDING') {
    start(message.streamId, message.tabId)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        console.error('BUGpairoj Mobile SIM recorder start failed', error);
        sendResponse({ ok: false, error: String(error?.message || error) });
      });
    return true;
  }

  if (message.type === 'BUGSIM_STOP_RECORDING') {
    stop().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === 'BUGSIM_REVOKE_URL') {
    if (objectUrls.has(message.url)) {
      URL.revokeObjectURL(message.url);
      objectUrls.delete(message.url);
    }
    sendResponse({ ok: true });
    return false;
  }

  return false;
});
