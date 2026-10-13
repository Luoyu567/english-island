const AudioManager = {
  muted: false,
  currentAudios: [],
  audioCtx: null,

  stopAll() {
    this.currentAudios.forEach(a => {
      try {
        a.pause();
        a.currentTime = 0;
      } catch (e) {}
    });
    this.currentAudios = [];
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  },

  // 单词：走有道
  speak(text, lang = "en-US") {
    if (this.muted) return;

    this.stopAll();

    const content = String(text).trim();
    if (!content) return;

    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(content)}&type=2`;
    const audio = new Audio(url);
    this.currentAudios.push(audio);

    audio.play().catch(() => {
      this.speakNative(content, lang);
    });
  },

  // 句子：走本地 mp3
  playSentence(sentence) {
    if (this.muted) return;
    this.stopAll();
    if (!sentence) return;

    if (sentence.audio) {
      const audio = new Audio(sentence.audio);
      this.currentAudios.push(audio);
      audio.play().catch(() => {
        // 本地音频失败，回退原生
        this.speakNative(sentence.words.join(" "), "en-US");
      });
    } else {
      this.speakNative(sentence.words.join(" "), "en-US");
    }
  },

  speakNative(content, lang) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;

    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(content);
      utter.lang = lang;
      utter.rate = 0.85;
      utter.pitch = 1;
      utter.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length) {
        const enVoice = voices.find(v => /^en(-|_)?/i.test(v.lang));
        if (enVoice) utter.voice = enVoice;
      }

      window.speechSynthesis.speak(utter);
    } catch (e) {}
  },

  getCtx() {
    if (!this.audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.audioCtx = new Ctx();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  },

  playTone(type) {
    if (this.muted) return;

    const ctx = this.getCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes =
      type === "correct"
        ? [{ f: 523.25, t: 0 }, { f: 659.25, t: 0.12 }]
        : [{ f: 220.0, t: 0 }, { f: 164.81, t: 0.14 }];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.f;
      gain.gain.setValueAtTime(0.0001, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.25, now + n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + 0.24);
    });
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopAll();
    return this.muted;
  },

  stop() {
    this.stopAll();
  }
};